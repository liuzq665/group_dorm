package com.dorm.platform.assistant;

import com.dorm.platform.common.BizException;
import com.dorm.platform.security.CurrentUser;
import com.dorm.platform.system.service.ManagementService;
import com.dorm.platform.repair.service.RepairService;
import com.dorm.platform.stay.service.StayService;
import com.dorm.platform.notice.service.NoticeService;
import com.dorm.platform.system.service.SystemTaskService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AssistantService {
    private static final int MAX_MESSAGE_LENGTH = 4000;
    private static final int MAX_HISTORY_MESSAGES = 40;
    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String SYSTEM_PROMPT = "你是宿舍事务平台的业务对话助手。理解用户真实意图和上下文，不要只按关键词匹配。复杂问题先拆成独立任务并逐项回答；不同措辞表达同一意思时仍应识别。信息不足、范围不明或有多种可能时，先简短澄清，不要猜测。回答面向普通用户，使用简洁自然的中文；长回答使用明确的小标题、短段落和编号/项目符号。不要输出内部JSON、意图代码、数据库字段名或实现术语。查询结果先概括数量和状态，再列少量必要明细；明细较多时只展示代表记录并说明总数。\n"
            + "报修业务：学生提交维修类型、故障分类、标题、故障位置与说明，可上传现场照片；宿管审核通过后系统按维修人员当前在办负荷自动派单，需人工处理时宿管或系统管理员手动派单；维修人员接单、处理并提交结果；学生确认时填写评分和文字评价，未解决可在确认前申请重修。\n"
            + "留宿业务：系统管理员建立并开放批次；宿管设置负责楼栋的申请截止时间并通知学生；学生按开放区间填写日期和原因、上传至少一份材料后提交；宿管审核，退回后学生按意见在期限内修改重提。\n"
            + "只回答有项目规则依据的内容。个人记录必须由后端查询结果提供；不得编造记录或声称已执行平台操作。助手仅提供咨询，不代替用户执行审批、派单或修改操作。";

    @Value("${assistant.api-key:}") private String apiKey;
    @Value("${assistant.base-url:}") private String baseUrl;
    @Value("${assistant.protocol:ANTHROPIC_MESSAGES}") private String protocol;
    @Value("${assistant.model:}") private String model;
    @Value("${assistant.max-tokens:1200}") private int maxTokens;
    @Value("${assistant.actor-authorization:local-image-extension}") private String actorAuthorization;

    private final RestClient http = createHttpClient();
    private final Map<String, Conversation> conversations = new ConcurrentHashMap<>();
    private final ManagementService management;
    private final RepairService repairs;
    private final StayService stays;
    private final NoticeService notices;
    private final SystemTaskService systemTasks;

    public AssistantService(ManagementService management, RepairService repairs, StayService stays,
                            NoticeService notices, SystemTaskService systemTasks) {
        this.management = management;
        this.repairs = repairs;
        this.stays = stays;
        this.notices = notices;
        this.systemTasks = systemTasks;
    }

    public Map<String, Object> send(CurrentUser user, Map<String, Object> body) {
        requireSupportedRole(user);
        String text = body.get("content") instanceof String value ? value.trim() : "";
        BizException.require(!text.isBlank(), "请输入问题");
        BizException.require(text.length() <= MAX_MESSAGE_LENGTH, "单条消息不能超过 4000 个字符");
        String requestedId = body.get("conversationId") instanceof String value ? value : "";
        String id = requestedId.isBlank() ? UUID.randomUUID().toString() : requestedId;
        Conversation conversation = conversations.computeIfAbsent(user.id() + ":" + id, ignored -> new Conversation());
        String dataAnswer = "STUDENT".equals(user.role()) && !isCompoundDataQuestion(text)
                ? answerStudentQuery(user, text)
                : "DORM_MANAGER".equals(user.role()) && !isCompoundDataQuestion(text)
                && !isRepairerDirectoryQuestion(text) && isCurrentBuildingScopeQuestion(text)
                ? answerCurrentBuildingScope(user) : null;
        synchronized (conversation) {
            restoreHistory(conversation, body.get("history"));
            if (dataAnswer != null) {
                conversation.messages.add(Map.of("role", "user", "content", text));
                conversation.messages.add(Map.of("role", "assistant", "content", dataAnswer));
                trimHistory(conversation);
                return Map.of("conversationId", id, "reply", dataAnswer);
            }
            requireConfiguration();
            conversation.messages.add(Map.of("role", "user", "content", text));
            trimHistory(conversation);
            try {
                String answer = requestAgent(user, conversation.messages);
                conversation.messages.add(Map.of("role", "assistant", "content", answer));
                trimHistory(conversation);
                return Map.of("conversationId", id, "reply", answer);
            } catch (RuntimeException error) {
                conversation.messages.remove(conversation.messages.size() - 1);
                throw error;
            }
        }
    }

    private static void trimHistory(Conversation conversation) {
        if (conversation.messages.size() > MAX_HISTORY_MESSAGES) {
            conversation.messages.subList(0, conversation.messages.size() - MAX_HISTORY_MESSAGES).clear();
        }
    }

    private static void restoreHistory(Conversation conversation, Object rawHistory) {
        if (!conversation.messages.isEmpty() || !(rawHistory instanceof List<?> history)) return;
        int start = Math.max(0, history.size() - (MAX_HISTORY_MESSAGES - 2));
        for (int i = start; i < history.size(); i++) {
            Object item = history.get(i);
            if (!(item instanceof Map<?, ?> message)) continue;
            Object rawRole = message.get("role");
            Object rawContent = message.get("content");
            if (!(rawRole instanceof String role) || !(rawContent instanceof String content)) continue;
            String normalized = content.trim();
            if (!("user".equals(role) || "assistant".equals(role)) || normalized.isBlank() || normalized.length() > MAX_MESSAGE_LENGTH) continue;
            conversation.messages.add(Map.of("role", role, "content", normalized));
        }
        trimHistory(conversation);
    }

    private String rolePrompt(CurrentUser user) {
        String roleContext = switch (user.role()) {
            case "ADMIN" -> "当前角色：系统管理员。可解释全校报修、留宿、住宿和学生管理业务，并查询全校范围的对应数据。留宿批次由管理员配置并开放；各楼栋申请截止时间由宿管设置。报修审核通过后系统按维修人员在办负荷派单，需人工处理时由宿管或管理员手动派单。";
            case "DORM_MANAGER" -> "当前角色：宿管。可解释负责楼栋的住宿、留宿审核和报修审核派单业务；查询必须限于当前账号负责楼栋。管理员开放留宿批次后，宿管设置本楼申请截止时间并审核；报修审核通过后系统按维修人员负荷派单，必要时可人工指定维修人员。当前账号负责楼栋由系统资料确定，查询楼栋相关记录或维修人员时直接使用该范围，不要向用户重复询问。";
            case "REPAIRER" -> "当前角色：维修人员。可解释本人维修任务、接单/拒单、维修结果、延期和重修业务；个人任务与统计只限当前登录维修人员。待接单任务可接单或拒单，拒单需填写原因；接单后提交维修结果，维修中可按规则申请延期。";
            default -> "当前角色：学生。可解释个人住宿、留宿申请和报修业务；个人记录只限当前登录学生。";
        };
        String scopeContext = "";
        if ("DORM_MANAGER".equals(user.role())) {
            String buildings = management.buildings(user).stream().map(row -> Objects.toString(row.get("building_name"), ""))
                    .filter(name -> !name.isBlank()).distinct().collect(java.util.stream.Collectors.joining("、"));
            scopeContext = " 当前账号负责楼栋：" + (buildings.isBlank() ? "暂无配置" : buildings) + "。";
        }
        return SYSTEM_PROMPT + "\n" + roleContext + scopeContext;
    }

    private Map<String, String> dataIntents(String role) {
        LinkedHashMap<String, String> intents = new LinkedHashMap<>();
        intents.put("PROFILE", "个人资料");
        switch (role) {
            case "STUDENT" -> {
                intents.put("ROOMMATES", "我的舍友");
                intents.put("ACCOMMODATION_CURRENT", "我的当前住宿");
                intents.put("ACCOMMODATION_HISTORY", "我的住宿历史");
                intents.put("STAY_APPLICATIONS", "我的留宿申请状态");
                intents.put("REPAIR_ACTIVE", "我的报修单状态");
                intents.put("REPAIR_HISTORY", "我的报修历史");
                intents.put("MESSAGES", "我的消息中心");
                intents.put("REPAIR_EVALUATIONS", "我的维修评价");
                intents.put("REPAIR_CATALOG", "报修类型和故障分类");
                intents.put("STAY_BATCHES", "当前可申请留宿批次");
            }
            case "ADMIN" -> {
                intents.put("SCHOOL_REPAIRS", "全校报修工单");
                intents.put("SCHOOL_REPAIR_HISTORY", "全校报修历史");
                intents.put("SCHOOL_STAYS", "全校留宿申请");
                intents.put("SCHOOL_STAY_HISTORY", "全校留宿历史");
                intents.put("STAY_BATCHES", "留宿批次配置");
                intents.put("SCHOOL_ACCOMMODATION", "全校住宿");
                intents.put("SCHOOL_ACCOMMODATION_HISTORY", "全校住宿历史");
                intents.put("SCHOOL_STUDENT_SUMMARY", "全校学生概况");
                intents.put("STUDENT_DETAIL", "指定学生个人资料");
                intents.put("SCHOOL_REPAIRERS", "全校维修人员");
                intents.put("BUILDING_STAFF", "指定楼栋负责宿管和维修人员");
                intents.put("BUILDINGS", "全校楼栋");
                intents.put("ROOMS", "全校宿舍");
                intents.put("BEDS", "全校床位");
                intents.put("ROLE_SUMMARY", "角色账号统计");
                intents.put("REPAIR_RULES", "维修规则");
                intents.put("OPERATION_LOGS", "操作日志");
                intents.put("SYSTEM_BACKUPS", "数据库备份任务");
                intents.put("DATA_TASKS", "数据导入导出任务");
                intents.put("MESSAGES", "消息中心");
                intents.put("DASHBOARD", "系统工作台统计");
                intents.put("REPAIR_EVALUATION_STATS", "全校维修评价统计");
                intents.put("ACCOUNT_DETAIL", "指定角色账号资料");
                intents.put("ACCOUNT_DIRECTORY", "按角色查询账号目录");
                intents.put("ACADEMIC_STRUCTURE", "院系专业班级目录");
                intents.put("REPAIR_CATALOG", "维修类型和故障分类");
            }
            case "DORM_MANAGER" -> {
                intents.put("BUILDING_REPAIRS", "负责楼栋报修工单");
                intents.put("BUILDING_REPAIR_HISTORY", "负责楼栋报修历史");
                intents.put("BUILDING_STAYS", "负责楼栋留宿申请");
                intents.put("BUILDING_STAY_HISTORY", "负责楼栋留宿历史");
                intents.put("STAY_BATCHES", "负责楼栋开放留宿批次");
                intents.put("BUILDING_ACCOMMODATION", "负责楼栋住宿");
                intents.put("BUILDING_ACCOMMODATION_HISTORY", "负责楼栋住宿历史");
                intents.put("BUILDING_STUDENT_SUMMARY", "负责楼栋学生概况");
                intents.put("STUDENT_DETAIL", "负责楼栋内指定学生个人资料");
                intents.put("BUILDING_REPAIRERS", "负责楼栋维修人员");
                intents.put("BUILDING_STAFF", "负责楼栋的宿管和维修人员");
                intents.put("BUILDINGS", "负责楼栋");
                intents.put("ROOMS", "负责楼栋宿舍");
                intents.put("BEDS", "负责楼栋床位");
                intents.put("MESSAGES", "我的消息中心");
                intents.put("DASHBOARD", "负责楼栋工作台统计");
                intents.put("REPAIR_EVALUATION_STATS", "负责楼栋维修评价统计");
                intents.put("REPAIR_CATALOG", "维修类型和故障分类");
            }
            case "REPAIRER" -> {
                intents.put("MY_REPAIR_TASKS", "我的维修任务");
                intents.put("MY_REPAIR_HISTORY", "我的维修历史");
                intents.put("MY_REPAIR_STATS", "我的维修统计");
                intents.put("MY_REJECT_RECORDS", "我的拒单记录");
                intents.put("MY_ACCEPT_TIMEOUT_RECORDS", "我的接单超时记录");
                intents.put("MY_REPAIR_TIMEOUT_RECORDS", "我的超时未修好记录");
                intents.put("MY_DELAY_RECORDS", "我的延期记录");
                intents.put("MY_REWORK_RECORDS", "我的重修工单记录");
                intents.put("MESSAGES", "我的消息中心");
                intents.put("DASHBOARD", "个人维修工作台统计");
                intents.put("REPAIR_CATALOG", "维修类型和故障分类");
            }
            default -> throw BizException.forbidden();
        }
        return intents;
    }

    private String answerDataIntent(CurrentUser user, String intent, String question, JsonNode parameters) {
        if ("PROFILE".equals(intent)) return "STUDENT".equals(user.role())
                ? answerStudentQuery(user, "我的个人信息") : formatProfile(management.profile(user));
        if ("STUDENT".equals(user.role())) {
            return switch (intent) {
                case "REPAIR_ACTIVE" -> formatRepairs(repairRows(user, parameters, false), "你的报修工单");
                case "REPAIR_HISTORY" -> formatRepairs(repairRows(user, parameters, true), "你的报修历史");
                case "STAY_APPLICATIONS" -> formatStays(stayRows(user, parameters));
                case "ACCOMMODATION_CURRENT" -> formatHomes(homeRows(user, parameters, false), false);
                case "ACCOMMODATION_HISTORY" -> formatHomes(homeRows(user, parameters, true), true);
                case "MESSAGES" -> formatMessages(messageRows(user, parameters));
                case "REPAIR_EVALUATIONS" -> formatGenericRows(repairs.evaluations(user), "你的维修评价", List.of("order_no", "title", "score", "comment", "created_at"));
                case "REPAIR_CATALOG" -> formatRepairCatalog(repairs.catalog(user));
                case "STAY_BATCHES" -> formatStayBatches(user);
                default -> answerStudentQuery(user, question);
            };
        }
        if ("STUDENT_DETAIL".equals(intent)) return answerStudentDetail(user, parameters);
        if ("REPAIRER".equals(user.role())) {
            return switch (intent) {
                case "MY_REPAIR_TASKS" -> formatRepairs(repairRows(user, parameters, false), "你的维修任务");
                case "MY_REPAIR_HISTORY" -> formatRepairs(repairRows(user, parameters, true), "你的维修历史");
                case "MY_REPAIR_STATS" -> formatRepairerStats(repairs.repairerStats(user,
                        parameter(parameters, "eventYear"), parameter(parameters, "eventMonth"),
                        parameter(parameters, "ratingYear"), parameter(parameters, "ratingMonth")));
                case "MY_REJECT_RECORDS" -> formatRepairerRecords(user, parameters, "rejectRecords", "拒单记录");
                case "MY_ACCEPT_TIMEOUT_RECORDS" -> formatRepairerRecords(user, parameters, "acceptTimeoutRecords", "接单超时记录");
                case "MY_REPAIR_TIMEOUT_RECORDS" -> formatRepairerRecords(user, parameters, "repairTimeoutRecords", "超时未修好记录");
                case "MY_DELAY_RECORDS" -> formatRepairerRecords(user, parameters, "delayRecords", "延期记录");
                case "MY_REWORK_RECORDS" -> formatRepairerRecords(user, parameters, "reworkRecords", "重修工单记录");
                case "MESSAGES" -> formatMessages(messageRows(user, parameters));
                case "DASHBOARD" -> formatDashboard(user);
                case "REPAIR_CATALOG" -> formatRepairCatalog(repairs.catalog(user));
                default -> "当前角色没有该项数据查询权限。";
            };
        }
        return switch (intent) {
            case "SCHOOL_REPAIRS", "BUILDING_REPAIRS" -> formatRepairs(repairRows(user, parameters, false), "查询范围内报修工单");
            case "SCHOOL_REPAIR_HISTORY", "BUILDING_REPAIR_HISTORY" -> formatRepairs(repairRows(user, parameters, true), "查询范围内报修历史");
            case "SCHOOL_STAYS", "BUILDING_STAYS" -> formatStays(stayRows(user, parameters));
            case "SCHOOL_STAY_HISTORY", "BUILDING_STAY_HISTORY" -> formatStays(stayHistoryRows(user, parameters));
            case "STAY_BATCHES" -> formatStayBatches(user);
            case "SCHOOL_ACCOMMODATION", "BUILDING_ACCOMMODATION" -> formatHomes(homeRows(user, parameters, false), false);
            case "SCHOOL_ACCOMMODATION_HISTORY", "BUILDING_ACCOMMODATION_HISTORY" -> formatHomes(homeRows(user, parameters, true), true);
            case "SCHOOL_STUDENT_SUMMARY", "BUILDING_STUDENT_SUMMARY" -> formatStudentSummary(management.users(user, Map.of("roleCode", "STUDENT")));
            case "SCHOOL_REPAIRERS", "BUILDING_REPAIRERS" -> formatRepairers(user, repairs.repairersByBuilding(user, parameter(parameters, "buildingName")));
            case "BUILDING_STAFF" -> formatBuildingStaff(user, parameter(parameters, "buildingName"));
            case "BUILDINGS" -> formatBuildings(filterDirectoryRows(management.buildings(user), parameters));
            case "ROOMS" -> formatRooms(filterDirectoryRows(management.rooms(user), parameters));
            case "BEDS" -> formatBeds(filterDirectoryRows(management.beds(user), parameters));
            case "ROLE_SUMMARY" -> formatRoleSummary(user, parameters);
            case "REPAIR_RULES" -> formatRepairRules(management.config(user));
            case "OPERATION_LOGS" -> formatLogs(management.logs(user, logFilters(parameters)));
            case "SYSTEM_BACKUPS" -> formatGenericRows(systemTasks.backups(user), "数据库备份任务", List.of("task_id", "backup_domain", "task_status", "started_at", "finished_at", "file_name"));
            case "DATA_TASKS" -> formatGenericRows(systemTasks.dataTasks(user), "数据导入导出任务", List.of("task_id", "task_type", "business_type", "task_status", "created_at", "finished_at"));
            case "MESSAGES" -> formatMessages(messageRows(user, parameters));
            case "DASHBOARD" -> formatDashboard(user);
            case "REPAIR_EVALUATION_STATS" -> formatEvaluationStats(user);
            case "ACCOUNT_DETAIL" -> answerAccountDetail(user, parameters);
            case "ACCOUNT_DIRECTORY" -> formatAccountDirectory(management.users(user, accountFilters(parameters)));
            case "ACADEMIC_STRUCTURE" -> formatAcademicStructure(management.academicStructure(user));
            case "REPAIR_CATALOG" -> formatRepairCatalog(repairs.catalog(user));
            default -> "当前角色没有该项数据查询权限。";
        };
    }

    private String answerAccountDetail(CurrentUser user, JsonNode parameters) {
        LinkedHashMap<String, String> filters = new LinkedHashMap<>();
        for (String key : List.of("roleCode", "realName", "studentNo", "employeeNo", "account")) {
            String value = parameter(parameters, key);
            if (!value.isBlank()) filters.put(key, value);
        }
        normalizeRoleFilter(filters);
        boolean uniqueKey = filters.containsKey("studentNo") || filters.containsKey("employeeNo") || filters.containsKey("account");
        if (filters.isEmpty() || !uniqueKey && !(filters.containsKey("realName") && filters.containsKey("roleCode"))) {
            return "请提供登录账号、学号或工号；也可以同时提供姓名和角色，以便准确查询账号资料。";
        }
        List<Map<String, Object>> rows = management.users(user, filters);
        if (rows.isEmpty()) return "未查询到符合条件的账号资料。";
        Map<String, String> roleLabels = Map.of("STUDENT", "学生", "DORM_MANAGER", "宿管", "REPAIRER", "维修人员", "ADMIN", "系统管理员");
        List<String> entries = rows.stream().limit(8).map(row -> {
            List<String> fields = new ArrayList<>();
            fields.add(roleLabels.getOrDefault(Objects.toString(row.get("role_code"), ""), "账号"));
            fields.add("账号 " + value(row, "login_account"));
            fields.add("学号/工号 " + Objects.toString(row.get("student_no"), Objects.toString(row.get("employee_no"), "-")));
            if (row.get("phone") != null) fields.add("电话 " + value(row, "phone"));
            if (row.get("department_name") != null) fields.add("院系 " + value(row, "department_name"));
            if (row.get("major_name") != null) fields.add("专业 " + value(row, "major_name"));
            if (row.get("class_name") != null) fields.add("班级 " + value(row, "class_name"));
            if (row.get("current_building") != null) fields.add("住宿 " + value(row, "current_building") + " " + value(row, "current_room") + "室");
            fields.add(Boolean.TRUE.equals(row.get("enabled")) || "1".equals(Objects.toString(row.get("enabled"))) ? "账号启用" : "账号停用");
            return value(row, "real_name") + "（" + String.join("；", fields) + "）";
        }).toList();
        return "查询到 " + rows.size() + " 个账号：" + String.join("；", entries)
                + (rows.size() > entries.size() ? "；请增加筛选条件缩小范围" : "") + "。";
    }

    private void normalizeRoleFilter(Map<String, String> filters) {
        String role = filters.get("roleCode");
        if (role == null) return;
        filters.put("roleCode", Map.of("学生", "STUDENT", "宿管", "DORM_MANAGER", "维修人员", "REPAIRER", "维修工", "REPAIRER", "维修师傅", "REPAIRER", "系统管理员", "ADMIN", "管理员", "ADMIN")
                .getOrDefault(role.trim(), role.trim().toUpperCase()));
    }

    private Map<String, String> accountFilters(JsonNode parameters) {
        LinkedHashMap<String, String> filters = new LinkedHashMap<>();
        for (String key : List.of("roleCode", "account", "realName", "studentNo", "employeeNo", "departmentName",
                "majorName", "className", "grade", "buildingName", "roomNo", "departmentId", "majorId", "classId",
                "enrollmentStatus", "gender", "enabled", "accommodation", "onDuty", "managerBuildingName",
                "workTypeName", "repairBuildingName")) {
            String value = parameter(parameters, key);
            if (!value.isBlank()) filters.put(key, value);
        }
        normalizeRoleFilter(filters);
        normalizeFilter(filters, "gender", Map.of("男", "MALE", "男性", "MALE", "男生", "MALE", "女", "FEMALE", "女性", "FEMALE", "女生", "FEMALE"));
        normalizeFilter(filters, "enabled", Map.of("启用", "true", "已启用", "true", "正常", "true", "停用", "false", "禁用", "false", "已停用", "false"));
        normalizeFilter(filters, "onDuty", Map.of("在岗", "true", "上班", "true", "离岗", "false", "不在岗", "false"));
        normalizeFilter(filters, "accommodation", Map.of("已住宿", "ASSIGNED", "已入住", "ASSIGNED", "有住宿", "ASSIGNED", "未住宿", "UNASSIGNED", "未入住", "UNASSIGNED", "无住宿", "UNASSIGNED"));
        normalizeFilter(filters, "enrollmentStatus", Map.of("在读", "ENROLLED", "休学", "SUSPENDED", "毕业", "GRADUATED", "退学", "WITHDRAWN", "未知", "UNKNOWN"));
        return filters;
    }

    private void normalizeFilter(Map<String, String> filters, String key, Map<String, String> aliases) {
        String value = filters.get(key);
        if (value == null) return;
        String normalized = aliases.get(value.trim());
        if (normalized == null) {
            normalized = value.trim().toUpperCase();
            if (("enabled".equals(key) || "onDuty".equals(key)) && Set.of("TRUE", "FALSE").contains(normalized)) {
                normalized = normalized.toLowerCase();
            }
        }
        filters.put(key, normalized);
    }

    private String formatAccountDirectory(List<Map<String, Object>> rows) {
        Map<String, String> roleLabels = Map.of("STUDENT", "学生", "DORM_MANAGER", "宿管", "REPAIRER", "维修人员", "ADMIN", "系统管理员");
        if (rows.isEmpty()) return "账号目录：没有找到符合条件的账号。";
        List<String> entries = rows.stream().limit(12).map(row -> {
            String role = Objects.toString(row.get("role_code"), "");
            String identity = "STUDENT".equals(role) ? "学号 " + value(row, "student_no") : "工号 " + value(row, "employee_no");
            List<String> details = new ArrayList<>();
            if (row.get("current_building") != null) details.add(value(row, "current_building") + " " + value(row, "current_room") + "室");
            if (row.get("manager_buildings") != null) details.add("负责楼栋 " + value(row, "manager_buildings"));
            if (row.get("repairer_buildings") != null) details.add("负责楼栋 " + value(row, "repairer_buildings"));
            if (row.get("work_types") != null) details.add("工种 " + value(row, "work_types"));
            Object onDuty = "DORM_MANAGER".equals(role) ? row.get("manager_on_duty") : row.get("on_duty");
            if (onDuty != null && !"STUDENT".equals(role)) details.add(Boolean.TRUE.equals(onDuty) || "1".equals(Objects.toString(onDuty)) ? "在岗" : "离岗");
            details.add(Boolean.TRUE.equals(row.get("enabled")) || "1".equals(Objects.toString(row.get("enabled"))) ? "账号启用" : "账号停用");
            return value(row, "real_name") + "（" + roleLabels.getOrDefault(role, role) + "，" + identity + "，账号 "
                    + value(row, "login_account") + (details.isEmpty() ? "" : "；" + String.join("；", details)) + "）";
        }).toList();
        Map<String, Long> counts = rows.stream().collect(java.util.stream.Collectors.groupingBy(
                row -> roleLabels.getOrDefault(Objects.toString(row.get("role_code"), ""), "其他角色"), LinkedHashMap::new,
                java.util.stream.Collectors.counting()));
        String summary = String.join("，", counts.entrySet().stream().map(entry -> entry.getKey() + " " + entry.getValue() + " 个").toList());
        return "账号目录共 " + rows.size() + " 个（" + summary + "）。\n\n- " + String.join("\n- ", entries)
                + (rows.size() > entries.size() ? "\n- 其余 " + (rows.size() - entries.size()) + " 个账号未逐条展开" : "");
    }

    private String formatAcademicStructure(Map<String, Object> structure) {
        List<String> sections = new ArrayList<>();
        for (String key : List.of("departments", "majors", "classes")) {
            Object raw = structure.get(key);
            List<?> rows = raw instanceof List<?> list ? list : List.of();
            String label = switch (key) { case "departments" -> "院系"; case "majors" -> "专业"; default -> "班级"; };
            List<String> names = rows.stream().limit(12).filter(Map.class::isInstance).map(Map.class::cast)
                    .map(row -> Objects.toString(row.get(switch (key) { case "departments" -> "department_name"; case "majors" -> "major_name"; default -> "class_name"; }), ""))
                    .filter(name -> !name.isBlank()).distinct().toList();
            sections.add(label + " " + rows.size() + " 个" + (names.isEmpty() ? "" : "：" + String.join("、", names)
                    + (rows.size() > names.size() ? "等" : "")));
        }
        return "学籍目录：" + String.join("；", sections) + "。";
    }

    private String formatDashboard(CurrentUser user) {
        if ("REPAIRER".equals(user.role())) return formatRepairerStats(repairs.repairerStats(user, "", "", "", ""));
        String repairsSummary = formatStatusCounts(repairs.dashboardStats(user), "报修工单");
        String staysSummary = formatStatusCounts(stays.dashboardStats(user), "留宿申请");
        Map<String, Object> beds = management.accommodationStats(user);
        return repairsSummary + " " + staysSummary + " 当前住宿床位：已占 " + beds.get("occupiedBeds")
                + " 张，空闲 " + beds.get("availableBeds") + " 张。未读消息 " + notices.unreadCount(user) + " 条。";
    }

    private String formatEvaluationStats(CurrentUser user) {
        Map<String, Object> stats = "DORM_MANAGER".equals(user.role())
                ? repairs.managerEvaluationAnalysis(user, "year1") : repairs.evaluationStats(user);
        Object average = stats.getOrDefault("averageScore", stats.getOrDefault("currentYearAverage", 0));
        Object monthly = stats.get("monthly");
        Object annual = stats.get("annual");
        Object countRows = monthly instanceof List<?> ? monthly : annual;
        int evaluationCount = countRows instanceof List<?> list ? list.stream().filter(Map.class::isInstance).map(Map.class::cast)
                .mapToInt(row -> row.get("total") instanceof Number n ? n.intValue() : 0).sum() : 0;
        return "当前统计范围内综合平均评分 " + average + " / 5，共 " + evaluationCount + " 条历史评价。";
    }

    private String formatStayBatches(CurrentUser user) {
        List<Map<String, Object>> rows = "ADMIN".equals(user.role()) ? stays.allBatches(user) : stays.batches(user);
        return formatGenericRows(rows, "留宿批次", List.of("batch_name", "academic_year", "vacation_type", "current_status",
                "building_name", "open_start_date", "open_end_date", "application_deadline", "student_deadline"));
    }

    private String formatStatusCounts(List<Map<String, Object>> rows, String label) {
        if (rows.isEmpty()) return label + "：暂无记录。";
        return label + "状态：" + String.join("，", rows.stream()
                .map(row -> statusLabel(Objects.toString(row.get("status"), "")) + " " + row.get("total"))
                .toList()) + "。";
    }

    private String formatRepairCatalog(Map<String, Object> catalog) {
        Object rawWorkTypes = catalog.get("workTypes"), rawCategories = catalog.get("categories");
        List<String> workTypes = rawWorkTypes instanceof List<?> list ? list.stream().filter(Map.class::isInstance)
                .map(Map.class::cast).map(row -> Objects.toString(row.get("name"), "")).filter(s -> !s.isBlank()).toList() : List.of();
        List<String> categories = rawCategories instanceof List<?> list ? list.stream().filter(Map.class::isInstance)
                .map(Map.class::cast).map(row -> Objects.toString(row.get("name"), "")).filter(s -> !s.isBlank()).toList() : List.of();
        return "可选维修类型：" + (workTypes.isEmpty() ? "暂无" : String.join("、", workTypes))
                + "。可选故障分类：" + (categories.isEmpty() ? "暂无" : String.join("、", categories)) + "。";
    }

    private String formatRepairerRecords(CurrentUser user, JsonNode parameters, String recordKey, String label) {
        Map<String, Object> stats = repairs.repairerStats(user, parameter(parameters, "eventYear"), parameter(parameters, "eventMonth"),
                parameter(parameters, "ratingYear"), parameter(parameters, "ratingMonth"));
        Object raw = stats.get(recordKey);
        return formatGenericRows(raw instanceof List<?> list ? list : List.of(), label, List.of("order_no", "title", "reason", "decision_reason", "expected_finish_at", "request_status", "created_at", "decided_at"));
    }

    private List<Map<String, Object>> messageRows(CurrentUser user, JsonNode parameters) {
        Map<String, String> filters = new LinkedHashMap<>();
        String read = switch (parameter(parameters, "read").trim()) {
            case "已读", "已阅读" -> "read";
            case "未读", "未阅读" -> "unread";
            default -> parameter(parameters, "read").toLowerCase();
        };
        if (Set.of("read", "unread").contains(read)) filters.put("read", read);
        String sender = switch (parameter(parameters, "sender").trim()) {
            case "系统", "系统通知" -> "SYSTEM";
            case "系统管理员", "系统管理员发布" -> "ADMIN";
            case "宿管", "宿管发布" -> "DORM_MANAGER";
            case "我发布的", "我发布" -> "MINE";
            default -> parameter(parameters, "sender").toUpperCase();
        };
        if (Set.of("SYSTEM", "ADMIN", "DORM_MANAGER", "MINE").contains(sender)) filters.put("sender", sender);
        String from = parameter(parameters, "from"), to = parameter(parameters, "to");
        if (from.matches("\\d{4}-\\d{2}-\\d{2}")) filters.put("from", from);
        if (to.matches("\\d{4}-\\d{2}-\\d{2}")) filters.put("to", to);
        return notices.list(user, filters);
    }

    private String formatMessages(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) return "消息中心：没有找到符合条件的消息。";
        List<String> entries = rows.stream().limit(8).map(row -> {
            String content = Objects.toString(row.get("content"), "").replaceAll("\\s+", " ").trim();
            if (content.length() > 140) content = content.substring(0, 140) + "…";
            return value(row, "title") + "（" + value(row, "source_label") + "，发布人 " + value(row, "publisher_name")
                    + "，" + value(row, "created_at") + (content.isBlank() ? "" : "）\n  内容：" + content) + (content.isBlank() ? "）" : "");
        }).toList();
        return "消息中心共 " + rows.size() + " 条。\n\n- " + String.join("\n- ", entries)
                + (rows.size() > entries.size() ? "\n- 其余 " + (rows.size() - entries.size()) + " 条未逐条展开" : "");
    }

    private String formatRepairers(CurrentUser user, List<Map<String, Object>> rows) {
        if (rows.isEmpty()) return "当前" + ("ADMIN".equals(user.role()) ? "全校" : "授权楼栋范围内") + "未配置维修人员。";
        List<String> entries = rows.stream().limit(12).map(row -> value(row, "repairer_name") + "（工号 " + value(row, "employee_no")
                + "），负责 " + value(row, "building_name") + "，工种：" + Objects.toString(row.get("work_types"), "未配置")
                + "，状态：" + (Boolean.TRUE.equals(row.get("on_duty")) || "1".equals(Objects.toString(row.get("on_duty"))) ? "在岗" : "离岗")
                + "，在办 " + value(row, "active_orders") + "/" + Objects.toString(row.get("max_active_orders"), "不限") + " 单").toList();
        return "查询到 " + rows.size() + " 条楼栋-维修人员配置：" + String.join("；", entries)
                + (rows.size() > entries.size() ? "；仅展示前 " + entries.size() + " 条" : "") + "。";
    }

    private String formatBuildingStaff(CurrentUser user, String buildingName) {
        List<Map<String, Object>> managers = management.buildingManagers(user, buildingName);
        List<Map<String, Object>> repairers = repairs.repairersByBuilding(user, buildingName);
        if (managers.isEmpty() && repairers.isEmpty()) return "当前账号授权范围内没有找到该楼栋的宿管或维修人员配置。请核对楼栋名称或人员配置。";
        List<String> sections = new ArrayList<>();
        if (!managers.isEmpty()) {
            List<String> entries = managers.stream().limit(8).map(row -> value(row, "building_name") + "：" + value(row, "manager_name")
                    + "（工号 " + value(row, "employee_no") + (Boolean.TRUE.equals(row.get("on_duty")) || "1".equals(Objects.toString(row.get("on_duty"))) ? "，在岗" : "，离岗") + "）").toList();
            sections.add("负责宿管（" + managers.size() + " 个楼栋配置）\n- " + String.join("\n- ", entries));
        } else sections.add("负责宿管：当前授权范围内未查询到配置");
        if (!repairers.isEmpty()) {
            List<String> entries = repairers.stream().limit(10).map(row -> value(row, "repairer_name") + "（工号 " + value(row, "employee_no")
                    + "；负责 " + value(row, "building_name") + "；工种 " + Objects.toString(row.get("work_types"), "未配置")
                    + "；" + (Boolean.TRUE.equals(row.get("on_duty")) || "1".equals(Objects.toString(row.get("on_duty"))) ? "在岗" : "离岗")
                    + "；在办 " + value(row, "active_orders") + "/" + Objects.toString(row.get("max_active_orders"), "不限") + " 单）").toList();
            sections.add("负责维修人员（" + repairers.size() + " 条楼栋配置）\n- " + String.join("\n- ", entries));
        } else sections.add("负责维修人员：当前授权范围内未查询到配置");
        return (buildingName == null || buildingName.isBlank() ? "当前授权楼栋人员信息：" : buildingName + "人员信息：") + "\n\n" + String.join("\n\n", sections);
    }

    private String formatBuildings(List<Map<String, Object>> rows) {
        return formatGenericRows(rows, "楼栋", List.of("building_name", "room_count", "bed_count", "occupied_count", "available_bed_count"));
    }

    private String formatRooms(List<Map<String, Object>> rows) {
        return formatGenericRows(rows, "宿舍", List.of("building_name", "room_no", "floor_no", "bed_count", "available_bed_count"));
    }

    private String formatBeds(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) return "床位：暂无记录。";
        Map<String, Long> counts = rows.stream().collect(java.util.stream.Collectors.groupingBy(row ->
                row.get("student_id") != null || row.get("student_name") != null ? "已入住" : bedStatusLabel(Objects.toString(row.get("management_status"), "")),
                LinkedHashMap::new, java.util.stream.Collectors.counting()));
        List<String> latest = rows.stream().limit(8).map(row -> {
            String location = value(row, "building_name") + " " + value(row, "room_no") + "室 " + value(row, "bed_no") + "号床";
            return row.get("student_name") == null ? location + "（" + bedStatusLabel(Objects.toString(row.get("management_status"), "")) + "）"
                    : location + "（入住：" + value(row, "student_name") + "，学号 " + value(row, "student_no") + "）";
        }).toList();
        String summary = String.join("，", counts.entrySet().stream().map(entry -> entry.getKey() + " " + entry.getValue() + " 张").toList());
        return "床位查询结果：共 " + rows.size() + " 张；" + summary + "。\n\n最近记录：\n- " + String.join("\n- ", latest)
                + (rows.size() > latest.size() ? "\n- 其余 " + (rows.size() - latest.size()) + " 张未逐条展开" : "");
    }

    private static String bedStatusLabel(String status) {
        return switch (status) {
            case "AVAILABLE" -> "空闲";
            case "OCCUPIED" -> "已入住";
            case "DISABLED" -> "停用";
            case "MAINTENANCE" -> "维修中";
            default -> status.isBlank() ? "状态未知" : status;
        };
    }

    private String formatRoleSummary(CurrentUser user, JsonNode parameters) {
        Map<String, String> roleParameter = new LinkedHashMap<>();
        roleParameter.put("roleCode", parameter(parameters, "roleCode"));
        normalizeRoleFilter(roleParameter);
        String roleCode = roleParameter.get("roleCode");
        if (!Set.of("STUDENT", "DORM_MANAGER", "REPAIRER", "ADMIN").contains(roleCode)) return "请说明要统计学生、宿管、维修人员还是系统管理员账号。";
        List<Map<String, Object>> rows = management.users(user, Map.of("roleCode", roleCode));
        return Map.of("STUDENT", "学生", "DORM_MANAGER", "宿管", "REPAIRER", "维修人员", "ADMIN", "系统管理员").get(roleCode)
                + "账号共 " + rows.size() + " 个。";
    }

    private String formatRepairRules(Map<String, Object> config) {
        Object rule = config.get("rule");
        if (!(rule instanceof Map<?, ?> values)) return "暂未配置报修规则。";
        return "当前报修规则：接单时限 " + Objects.toString(values.get("accept_minutes"), "未设置")
                + " 分钟，普通维修时限 " + Objects.toString(values.get("normal_minutes"), "未设置")
                + " 分钟，紧急维修时限 " + Objects.toString(values.get("urgent_minutes"), "未设置")
                + " 分钟，学生确认时限 " + Objects.toString(values.get("confirm_days"), "未设置") + " 天，重修上限 "
                + Objects.toString(values.get("max_rework_count"), "不限") + " 次。";
    }

    private String formatLogs(List<Map<String, Object>> rows) {
        return formatGenericRows(rows, "操作日志", List.of("occurred_at", "real_name", "role_label", "module_label", "action", "business_id"));
    }

    private String formatGenericRows(List<?> rawRows, String heading, List<String> fields) {
        if (rawRows.isEmpty()) return heading + "：暂无记录。";
        List<String> rows = rawRows.stream().limit(10).filter(Map.class::isInstance).map(Map.class::cast).map(row -> {
            List<String> values = new ArrayList<>();
            for (String field : fields) {
                Object value = row.get(field);
                if (value != null && !value.toString().isBlank()) values.add(fieldLabel(field) + "：" + displayValue(field, value));
            }
            return String.join("，", values);
        }).filter(value -> !value.isBlank()).toList();
        return heading + "共 " + rawRows.size() + " 条。\n\n" + String.join("\n- ", rows.stream().map(row -> "- " + row).toList())
                + (rawRows.size() > rows.size() ? "\n- 其余 " + (rawRows.size() - rows.size()) + " 条未逐条展开" : "");
    }

    private static String fieldLabel(String field) {
        return switch (field) {
            case "building_name" -> "楼栋";
            case "room_count" -> "宿舍数";
            case "bed_count" -> "床位数";
            case "occupied_count" -> "已入住床位";
            case "available_bed_count" -> "空闲床位";
            case "room_no" -> "宿舍号";
            case "floor_no" -> "楼层";
            case "bed_no" -> "床位号";
            case "management_status" -> "床位状态";
            case "student_name", "real_name" -> "姓名";
            case "student_no" -> "学号";
            case "employee_no" -> "工号";
            case "order_no" -> "工单号";
            case "title" -> "标题";
            case "current_status", "request_status", "task_status" -> "状态";
            case "score" -> "评分";
            case "comment" -> "评价";
            case "created_at" -> "提交时间";
            case "occurred_at" -> "发生时间";
            case "started_at" -> "开始时间";
            case "decided_at" -> "处理时间";
            case "expected_finish_at" -> "预计完成时间";
            case "batch_name" -> "留宿批次";
            case "academic_year" -> "学年";
            case "vacation_type" -> "假期类型";
            case "application_deadline", "student_deadline" -> "申请截止时间";
            case "open_start_date" -> "开放开始日期";
            case "open_end_date" -> "开放结束日期";
            case "publisher_name" -> "发布人";
            case "source_label" -> "消息来源";
            case "read_label" -> "阅读状态";
            case "task_id" -> "任务编号";
            case "backup_domain" -> "备份范围";
            case "role_label" -> "角色";
            case "module_label" -> "业务模块";
            case "action" -> "操作";
            case "business_id" -> "业务编号";
            case "averageScore" -> "平均评分";
            case "total" -> "数量";
            case "file_name" -> "文件名";
            case "task_type" -> "任务类型";
            case "business_type" -> "数据类型";
            case "finished_at" -> "完成时间";
            case "reason", "decision_reason" -> "原因";
            default -> field;
        };
    }

    private static String displayValue(String field, Object value) {
        String text = Objects.toString(value, "");
        if (Set.of("current_status", "request_status", "task_status").contains(field)) return statusLabel(text);
        if ("management_status".equals(field)) return bedStatusLabel(text);
        return text;
    }

    private Map<String, String> logFilters(JsonNode parameters) {
        LinkedHashMap<String, String> filters = new LinkedHashMap<>();
        for (String key : List.of("operator", "module", "from", "to")) {
            String value = parameter(parameters, key);
            if (!value.isBlank()) filters.put(key, value);
        }
        String role = parameter(parameters, "role");
        Map<String, String> labels = Map.of("学生", "STUDENT", "宿管", "DORM_MANAGER", "维修人员", "REPAIRER", "维修工", "REPAIRER", "系统管理员", "ADMIN");
        if (!role.isBlank()) filters.put("role", labels.getOrDefault(role, role));
        return filters;
    }

    private String answerStudentDetail(CurrentUser user, JsonNode parameters) {
        String studentName = parameter(parameters, "studentName");
        if (studentName.isBlank()) studentName = parameter(parameters, "targetName");
        String studentNo = parameters.path("studentNo").asText("").trim();
        if (studentName.isBlank() && studentNo.isBlank()) return "请提供学生姓名或学号，我才能查询具体学生资料。";
        Map<String, String> filters = new LinkedHashMap<>();
        filters.put("roleCode", "STUDENT");
        if (!studentName.isBlank()) filters.put("realName", studentName);
        if (!studentNo.isBlank()) filters.put("studentNo", studentNo);
        List<Map<String, Object>> matches = management.users(user, filters);
        if (matches.isEmpty()) return user.role().equals("DORM_MANAGER")
                ? "未查询到负责楼栋范围内符合条件的学生资料。"
                : "未查询到符合条件的学生资料。请核对姓名或学号。";
        if (matches.size() > 1) {
            return "查询到多名同名学生，请提供学号以确认对象：" + String.join("；", matches.stream().limit(8)
                    .map(row -> value(row, "real_name") + "（" + value(row, "student_no") + "）").toList()) + "。";
        }
        Map<String, Object> row = matches.get(0);
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        put(fields, "姓名", row, "real_name");
        put(fields, "学号", row, "student_no");
        put(fields, "性别", row, "gender");
        put(fields, "联系电话", row, "phone");
        put(fields, "院系", row, "department_name");
        put(fields, "专业", row, "major_name");
        put(fields, "班级", row, "class_name");
        put(fields, "楼栋", row, "current_building");
        put(fields, "宿舍", row, "current_room");
        put(fields, "床位", row, "current_bed");
        return "学生资料：" + joinFields(fields) + "。";
    }

    private List<Map<String, Object>> repairRows(CurrentUser user, JsonNode parameters, boolean archived) {
        LinkedHashMap<String, String> filters = new LinkedHashMap<>();
        String status = normalizeRepairStatus(parameter(parameters, "status"));
        if (Set.of("PENDING_REVIEW", "PENDING_MANUAL", "PENDING_ASSIGN", "PENDING_ACCEPT", "ACCEPTED", "DELAYED", "REPAIRED", "CONFIRMED", "ARCHIVED", "CLOSED", "CANCELLED", "IN_REPAIR", "PENDING_CONFIRM").contains(status)) {
            filters.put("status", status);
        }
        String orderNo = parameter(parameters, "orderNo");
        if (!orderNo.isBlank()) filters.put("orderNo", orderNo);
        String repairer = parameter(parameters, "repairer");
        if (!repairer.isBlank()) filters.put(repairer.matches("\\d+") ? "repairer" : "repairerName", repairer);
        String building = parameter(parameters, "building");
        if (!building.isBlank()) filters.put(building.matches("\\d+") ? "building" : "buildingName", building);
        String room = parameter(parameters, "room");
        if (!room.isBlank()) filters.put(room.matches("\\d+") ? "room" : "roomNo", room);
        String category = parameter(parameters, "category");
        if (!category.isBlank()) filters.put(category.matches("\\d+") ? "category" : "categoryName", category);
        for (String key : List.of("completedFrom", "completedTo")) {
            String value = parameter(parameters, key);
            if (!value.isBlank()) filters.put(key, value);
        }
        if (!"STUDENT".equals(user.role())) {
            String studentName = parameter(parameters, "studentName");
            if (!studentName.isBlank()) filters.put("student", studentName);
        }
        return repairs.list(user, filters, archived);
    }

    private String normalizeRepairStatus(String raw) {
        String status = raw.trim().toUpperCase();
        return switch (status) {
            case "待审核" -> "PENDING_REVIEW";
            case "待派单", "待分配" -> "PENDING_ASSIGN";
            case "待人工处理", "转人工处理" -> "PENDING_MANUAL";
            case "待接单" -> "PENDING_ACCEPT";
            case "已接单" -> "ACCEPTED";
            case "维修中" -> "IN_REPAIR";
            case "延期" , "延期中" -> "DELAYED";
            case "待确认", "已维修待确认" -> "REPAIRED";
            case "已确认" -> "CONFIRMED";
            case "已归档", "报修历史" -> "ARCHIVED";
            case "已关闭" -> "CLOSED";
            case "已撤销" -> "CANCELLED";
            default -> status;
        };
    }

    private List<Map<String, Object>> stayRows(CurrentUser user, JsonNode parameters) {
        String status = normalizeStayStatus(parameter(parameters, "status"));
        String batch = parameter(parameters, "batchName");
        String studentName = parameter(parameters, "studentName");
        String studentNo = parameter(parameters, "studentNo");
        String buildingName = parameter(parameters, "buildingName");
        String majorName = parameter(parameters, "majorName");
        return stays.list(user).stream()
                .filter(row -> status.isBlank() || status.equals(Objects.toString(row.get("current_status"), "").toUpperCase()))
                .filter(row -> batch.isBlank() || Objects.toString(row.get("batch_name"), "").contains(batch))
                .filter(row -> studentName.isBlank() || Objects.toString(row.get("student_name"), "").contains(studentName))
                .filter(row -> studentNo.isBlank() || Objects.toString(row.get("student_no"), "").contains(studentNo))
                .filter(row -> buildingName.isBlank() || Objects.toString(row.get("building_name"), "").contains(buildingName))
                .filter(row -> majorName.isBlank() || Objects.toString(row.get("major_name"), "").contains(majorName))
                .toList();
    }

    private List<Map<String, Object>> stayHistoryRows(CurrentUser user, JsonNode parameters) {
        return stayRows(user, parameters).stream()
                .filter(row -> Set.of("COMPLETED", "ARCHIVED").contains(Objects.toString(row.get("current_status"), "").toUpperCase()))
                .toList();
    }

    private String normalizeStayStatus(String raw) {
        String status = raw.trim().toUpperCase();
        return switch (status) {
            case "待审核" -> "PENDING_REVIEW";
            case "审核通过", "已通过" -> "APPROVED";
            case "待修改", "退回修改" -> "PENDING_EDIT";
            case "待处理", "已锁定" -> "UNDER_REVIEW";
            case "已完成" -> "COMPLETED";
            case "已归档" -> "ARCHIVED";
            case "草稿" -> "DRAFT";
            default -> status;
        };
    }

    private List<Map<String, Object>> homeRows(CurrentUser user, JsonNode parameters, boolean history) {
        String studentName = parameter(parameters, "studentName");
        String studentNo = parameter(parameters, "studentNo"), buildingName = parameter(parameters, "buildingName"), roomNo = parameter(parameters, "roomNo");
        return management.homes(user, history).stream()
                .filter(row -> studentName.isBlank() || Objects.toString(row.get("student_name"), "").contains(studentName))
                .filter(row -> studentNo.isBlank() || Objects.toString(row.get("student_no"), "").contains(studentNo))
                .filter(row -> buildingName.isBlank() || Objects.toString(row.get("building_name"), "").contains(buildingName))
                .filter(row -> roomNo.isBlank() || Objects.toString(row.get("room_no"), "").contains(roomNo))
                .toList();
    }

    private List<Map<String, Object>> filterDirectoryRows(List<Map<String, Object>> rows, JsonNode parameters) {
        String building = parameter(parameters, "buildingName"), room = parameter(parameters, "roomNo");
        String student = parameter(parameters, "studentName"), studentNo = parameter(parameters, "studentNo");
        String floor = parameter(parameters, "floorNo"), bed = parameter(parameters, "bedNo"), status = parameter(parameters, "status").toUpperCase();
        String genderLimit = parameter(parameters, "genderLimit");
        String keyword = parameter(parameters, "keyword");
        String roomId = parameter(parameters, "roomId"), buildingId = parameter(parameters, "buildingId");
        Integer minBeds = integerParameter(parameters, "minBeds"), maxBeds = integerParameter(parameters, "maxBeds");
        Integer minFreeBeds = integerParameter(parameters, "minFreeBeds"), maxFreeBeds = integerParameter(parameters, "maxFreeBeds");
        String gender = switch (genderLimit) { case "男", "男生" -> "男生"; case "女", "女生" -> "女生"; default -> genderLimit; };
        String normalizedStatus = switch (status) {
            case "空闲", "可用", "未占用" -> "AVAILABLE";
            case "已占用", "已入住", "有人" -> "OCCUPIED";
            case "停用", "禁用" -> "DISABLED";
            case "维修中" -> "MAINTENANCE";
            default -> status;
        };
        return rows.stream()
                .filter(row -> building.isBlank() || Objects.toString(row.get("building_name"), "").contains(building))
                .filter(row -> room.isBlank() || Objects.toString(row.get("room_no"), "").contains(room))
                .filter(row -> floor.isBlank() || Objects.toString(row.get("floor_no"), "").equals(floor))
                .filter(row -> bed.isBlank() || Objects.toString(row.get("bed_no"), "").equals(bed))
                .filter(row -> student.isBlank() || Objects.toString(row.get("student_name"), "").contains(student))
                .filter(row -> studentNo.isBlank() || Objects.toString(row.get("student_no"), "").contains(studentNo))
                .filter(row -> gender.isBlank() || gender.equals(Objects.toString(row.get("gender_limit"), ""))
                        || gender.equals(Objects.toString(row.get("room_gender_limit"), ""))
                        || gender.equals(Objects.toString(row.get("building_gender_limit"), "")))
                .filter(row -> buildingId.isBlank() || buildingId.equals(Objects.toString(row.get("building_id"), "")))
                .filter(row -> roomId.isBlank() || roomId.equals(Objects.toString(row.get("room_id"), "")))
                .filter(row -> keyword.isBlank() || List.of("building_code", "building_name", "room_no", "bed_no")
                        .stream().anyMatch(key -> Objects.toString(row.get(key), "").contains(keyword)))
                .filter(row -> minBeds == null || number(row.get("bed_count")) >= minBeds)
                .filter(row -> maxBeds == null || number(row.get("bed_count")) <= maxBeds)
                .filter(row -> minFreeBeds == null || number(row.get("available_bed_count")) >= minFreeBeds)
                .filter(row -> maxFreeBeds == null || number(row.get("available_bed_count")) <= maxFreeBeds)
                .filter(row -> normalizedStatus.isBlank()
                        || "OCCUPIED".equals(normalizedStatus) && row.get("student_id") != null
                        || "AVAILABLE".equals(normalizedStatus) && "AVAILABLE".equals(Objects.toString(row.get("management_status"), "").toUpperCase()) && row.get("student_id") == null
                        || Set.of("DISABLED", "MAINTENANCE").contains(normalizedStatus) && normalizedStatus.equals(Objects.toString(row.get("management_status"), "").toUpperCase())
                        || normalizedStatus.equals(Objects.toString(row.get("management_status"), "").toUpperCase()))
                .toList();
    }

    private Integer integerParameter(JsonNode parameters, String key) {
        String raw = parameter(parameters, key);
        if (raw.isBlank()) return null;
        try { return Integer.valueOf(raw); } catch (NumberFormatException ignored) { return null; }
    }

    private long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0;
    }

    private static String parameter(JsonNode parameters, String name) {
        return parameters == null ? "" : parameters.path(name).asText("").trim();
    }

    private String formatProfile(Map<String, Object> profile) {
        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        put(fields, "姓名", profile, "student_name", "manager_name", "repairer_name", "admin_name", "real_name");
        put(fields, "账号", profile, "login_account");
        put(fields, "工号", profile, "employee_no");
        put(fields, "学号", profile, "student_no");
        put(fields, "联系电话", profile, "phone");
        put(fields, "负责楼栋", profile, "manager_buildings", "repairer_buildings");
        return fields.isEmpty() ? "暂未查询到个人资料。" : "你的个人资料：" + joinFields(fields) + "。";
    }

    private String formatRepairs(List<Map<String, Object>> rows, String heading) {
        if (rows.isEmpty()) return heading + "：暂无记录。";
        Map<String, Long> counts = rows.stream().collect(java.util.stream.Collectors.groupingBy(
                row -> statusLabel(value(row, "current_status")), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        String summary = String.join("，", counts.entrySet().stream().map(e -> e.getKey() + " " + e.getValue() + " 单").toList());
        List<String> latest = rows.stream().limit(8).map(row -> value(row, "order_no") + "《" + value(row, "title") + "》" + statusLabel(value(row, "current_status"))).toList();
        return heading + "共 " + rows.size() + " 单；状态分布：" + summary + "。最近记录：" + String.join("；", latest)
                + (rows.size() > latest.size() ? "；仅展示最近 " + latest.size() + " 单" : "") + "。";
    }

    private String formatStays(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) return "查询范围内暂无留宿申请。";
        Map<String, Long> counts = rows.stream().collect(java.util.stream.Collectors.groupingBy(
                row -> statusLabel(value(row, "current_status")), LinkedHashMap::new, java.util.stream.Collectors.counting()));
        List<String> latest = rows.stream().limit(8).map(row -> value(row, "student_name") + " " + value(row, "batch_name")
                + "：" + statusLabel(value(row, "current_status")) + dateSpan(row.get("start_date"), row.get("end_date"))).toList();
        return "查询范围内留宿申请共 " + rows.size() + " 份；状态分布：" + String.join("，", counts.entrySet().stream()
                .map(e -> e.getKey() + " " + e.getValue() + " 份").toList()) + "。最近记录：" + String.join("；", latest)
                + (rows.size() > latest.size() ? "；仅展示最近 " + latest.size() + " 份" : "") + "。";
    }

    private String formatHomes(List<Map<String, Object>> rows, boolean history) {
        if (rows.isEmpty()) return history ? "查询范围内暂无住宿历史。" : "查询范围内暂无当前住宿记录。";
        List<String> latest = rows.stream().limit(8).map(row -> value(row, "student_name") + "：" + value(row, "building_name")
                + value(row, "room_no") + "室" + value(row, "bed_no") + "号床").toList();
        return (history ? "查询范围内住宿历史" : "查询范围内当前住宿") + "共 " + rows.size() + " 条。"
                + "记录示例：" + String.join("；", latest) + (rows.size() > latest.size() ? "；仅展示前 " + latest.size() + " 条" : "") + "。";
    }

    private String formatStudentSummary(List<Map<String, Object>> rows) {
        long assigned = rows.stream().filter(row -> row.get("current_building") != null).count();
        return "当前查询范围内共 " + rows.size() + " 名学生，其中有住宿记录 " + assigned + " 人。";
    }

    private String formatRepairerStats(Map<String, Object> stats) {
        return "你的维修统计：待接单 " + stats.get("pendingAccept") + " 单，维修中 " + stats.get("inRepair")
                + " 单，延期 " + stats.get("delayedOrders") + " 单，待确认 " + stats.get("pendingConfirm")
                + " 单；拒单 " + stats.get("rejected") + " 次，接单超时 " + stats.get("acceptTimeout")
                + " 次，维修超时 " + stats.get("repairTimeout") + " 次，延期申请 " + stats.get("delays")
                + " 次，重修 " + stats.get("reworks") + " 次；收到评价 " + stats.get("evaluations")
                + " 条，平均评分 " + stats.get("averageScore") + "。";
    }

    private String requestAgent(CurrentUser user, List<Map<String, String>> history) {
        String raw = requestModel(history, rolePrompt(user) + "\n\n"
                + "输出结构仅供系统内部路由。最终回答面向普通用户，使用自然中文；不要输出内部JSON、意图代码、数据库字段名或代码围栏。长回答用小标题、短段落和列表；数据查询先给结论，再列少量必要明细。"
                + "先把用户本轮消息拆解成所有独立子任务，保留用户提出的先后顺序；逗号、问号、顿号、‘和/还有/另外’以及编号都可能分隔子任务。不可漏掉复合问题中的任何一问。"
                + "输出且只输出一个JSON对象，不要代码围栏，格式：{\"tasks\":[{\"type\":\"DATA|ANSWER|CLARIFY\",\"intent\":\"数据意图或空字符串\",\"parameters\":{\"studentName\":\"姓名\",\"targetName\":\"上下文中的查询对象\",\"studentNo\":\"学号\",\"employeeNo\":\"工号\",\"account\":\"登录账号\",\"orderNo\":\"工单号\",\"status\":\"状态代码或中文状态\",\"batchName\":\"批次名\",\"buildingName\":\"楼栋名\",\"roomNo\":\"宿舍号\",\"floorNo\":\"楼层\",\"bedNo\":\"床位号\",\"roleCode\":\"角色或角色代码\",\"gender\":\"性别或性别代码\",\"enabled\":\"账号启用状态\",\"onDuty\":\"在岗状态\",\"departmentName\":\"院系\",\"majorName\":\"专业\",\"className\":\"班级\",\"accommodation\":\"住宿状态\",\"repairer\":\"维修人员姓名或ID\",\"building\":\"楼栋名称或ID\",\"room\":\"宿舍号或ID\",\"category\":\"维修分类名称或ID\",\"genderLimit\":\"宿舍性别限制\",\"buildingId\":\"楼栋ID\",\"roomId\":\"宿舍ID\",\"keyword\":\"目录关键词\",\"minBeds\":\"最少床位数\",\"maxBeds\":\"最多床位数\",\"minFreeBeds\":\"最少空闲床位数\",\"maxFreeBeds\":\"最多空闲床位数\",\"completedFrom\":\"维修完成开始日期\",\"completedTo\":\"维修完成结束日期\",\"operator\":\"操作人\",\"module\":\"模块\",\"from\":\"起始日期\",\"to\":\"结束日期\",\"read\":\"read/unread或已读/未读\",\"sender\":\"消息来源\",\"eventYear\":\"年份\",\"eventMonth\":\"月份\",\"ratingYear\":\"年份\",\"ratingMonth\":\"月份\"},\"answer\":\"该子任务的答复或澄清问题\"}]}。"
                + "当前角色允许的数据意图仅为：" + String.join("、", dataIntents(user.role()).keySet()) + "。可用数据意图必须严格遵守该列表；数据任务answer留空，后端会按当前登录角色安全查询。"
                + "管理员端数据模块映射：工作台用DASHBOARD；消息中心用MESSAGES（来源、已读状态、日期）；全校报修和报修历史分别用SCHOOL_REPAIRS、SCHOOL_REPAIR_HISTORY；报修规则用REPAIR_RULES；全校留宿申请和留宿历史分别用SCHOOL_STAYS、SCHOOL_STAY_HISTORY；留宿批次配置用STAY_BATCHES；当前住宿、住宿历史分别用SCHOOL_ACCOMMODATION和SCHOOL_ACCOMMODATION_HISTORY；楼栋/宿舍/床位分别用BUILDINGS、ROOMS、BEDS；学生/宿管/维修人员目录用ACCOUNT_DIRECTORY并设置roleCode；账号总数用ROLE_SUMMARY；指定学生资料用STUDENT_DETAIL；院系专业班级用ACADEMIC_STRUCTURE；维修人员名册用SCHOOL_REPAIRERS；某楼栋宿管和维修人员用BUILDING_STAFF；操作日志用OPERATION_LOGS；备份任务用SYSTEM_BACKUPS；导入导出任务用DATA_TASKS；维修评价统计用REPAIR_EVALUATION_STATS；维修类型和故障分类用REPAIR_CATALOG。管理员查询学生、宿管、维修人员账号名单或按性别/启用/在岗/楼栋/专业筛选账号，使用ACCOUNT_DIRECTORY并将条件放入parameters；查询床位、宿舍或楼栋时，将楼栋、宿舍、楼层、床位、学生姓名/学号作为筛选参数。报修记录应传工单号、状态、学生、维修人员姓名或ID、楼栋名称或ID、宿舍号或ID、分类名称或ID和完成时间范围；留宿记录应传批次、状态、学生姓名/学号、楼栋和专业；住宿记录应传学生姓名/学号、楼栋和宿舍。多轮对话中，必须结合前文解析省略的查询对象和条件。若助手刚询问要查哪位学生/哪类信息，用户随后补充‘学号这些个人信息’等内容，应沿用前文学生姓名并创建STUDENT_DETAIL任务；将姓名和学号分别填入parameters。用户补充的状态、工单号、批次或时间也必须放入对应任务parameters。指定学生个人资料不得误判为学生概况统计。"
                + "短答‘是的/对/就这个/查吧’通常是在确认上一条澄清，应继续执行前文待办查询，不要把它当成新话题。‘维修工/维修人员/维修师傅’指人员列表，管理员选择SCHOOL_REPAIRERS，宿管选择BUILDING_REPAIRERS；‘维修工单/报修工单’才指工单，绝不能混淆。宿管查询负责楼栋时，优先使用系统提供的当前负责楼栋范围，楼栋名称未指定也可查询该范围全部结果，不要反问用户已由账号资料确定的信息。"
                + "流程/规则/操作说明使用ANSWER，并在该任务自己的answer字段完整作答。信息不清楚时只将需要澄清的子任务标为CLARIFY，并在answer中询问。"
                + "如果问题包含两个数据查询和一个流程咨询，必须输出三个有序task，流程答案放在对应ANSWER task中。不能把流程答案合并到单一总answer，也不能省略任何子任务。"
                + "理解不同措辞，不要把流程问题误判为个人记录查询，不要编造个人数据或平台操作结果。");
        try {
            String normalized = extractJsonObject(raw);
            JsonNode result = JSON.readTree(normalized);
            Map<String, String> dataQuestions = dataIntents(user.role());
            List<String> answers = new ArrayList<>();
            List<Map<String, String>> evidence = new ArrayList<>();
            JsonNode tasks = result.path("tasks");
            if (tasks.isArray()) {
                String latestQuestion = latestUserMessage(history);
                boolean buildingStaffRequested = ("ADMIN".equals(user.role()) || "DORM_MANAGER".equals(user.role()))
                        && isBuildingStaffQuestion(latestQuestion);
                boolean repairerDirectoryRequested = !buildingStaffRequested
                        && ("ADMIN".equals(user.role()) || "DORM_MANAGER".equals(user.role()))
                        && isRepairerDirectoryQuestion(latestQuestion);
                boolean buildingStaffHandled = false;
                boolean repairerDirectoryHandled = false;
                for (JsonNode task : tasks) {
                    String type = task.path("type").asText("").toUpperCase();
                    String intent = task.path("intent").asText("").toUpperCase();
                    String taskAnswer = task.path("answer").asText("").trim();
                    boolean relatedStaffIntent = Set.of("BUILDING_STAFF", "BUILDING_REPAIRERS", "SCHOOL_REPAIRERS", "ACCOUNT_DETAIL", "STUDENT_DETAIL", "BUILDINGS", "PROFILE").contains(intent)
                            || ("ANSWER".equals(type) || "CLARIFY".equals(type)) && containsAny(taskAnswer, "维修工", "维修人员", "宿管", "楼栋负责人");
                    if (buildingStaffRequested && (tasks.size() == 1 || relatedStaffIntent)) {
                        if (!buildingStaffHandled) {
                            ObjectNode parameters = resolveBuildingParameter(user, task.path("parameters"), latestQuestion);
                            String output = queryBuildingStaffSafely(user, parameters, dataQuestions.get("BUILDING_STAFF"));
                            answers.add(output);
                            evidence.add(Map.of("task", "BUILDING_STAFF", "result", output));
                            buildingStaffHandled = true;
                        }
                        continue;
                    }
                    if (repairerDirectoryRequested && tasks.size() == 1) {
                        type = "DATA";
                        intent = "ADMIN".equals(user.role()) ? "SCHOOL_REPAIRERS" : "BUILDING_REPAIRERS";
                    }
                    try {
                        if ("DATA".equals(type)) {
                            String dataQuestion = dataQuestions.get(intent);
                            if (dataQuestion != null) {
                                String dataAnswer = answerDataIntent(user, intent, dataQuestion, task.path("parameters"));
                                String output = dataAnswer == null ? "暂未查询到当前角色授权范围内的对应记录。" : dataAnswer;
                                answers.add(output);
                                evidence.add(Map.of("task", intent, "result", output));
                                if ("SCHOOL_REPAIRERS".equals(intent) || "BUILDING_REPAIRERS".equals(intent)) repairerDirectoryHandled = true;
                            } else {
                                String output = "该数据查询不属于当前角色的授权范围。请说明你要查询的业务，我会按当前角色权限协助。";
                                answers.add(output);
                                evidence.add(Map.of("task", intent, "result", output));
                            }
                        } else if (("ANSWER".equals(type) || "CLARIFY".equals(type)) && !taskAnswer.isBlank()) {
                            answers.add(taskAnswer);
                            evidence.add(Map.of("task", type, "result", taskAnswer));
                        }
                    } catch (RuntimeException taskError) {
                        log.warn("Assistant query task failed: role={}, intent={}, cause={}, detail={}", user.role(), intent,
                                taskError.getClass().getSimpleName(), Objects.toString(taskError.getMessage(), ""));
                        String output = "“" + dataQuestions.getOrDefault(intent, "一项数据查询") + "”暂时查询失败；其他子问题的结果会继续保留。";
                        answers.add(output);
                        evidence.add(Map.of("task", intent, "result", output));
                    }
                }
                if (buildingStaffRequested && !buildingStaffHandled) {
                    ObjectNode parameters = resolveBuildingParameter(user, JSON.createObjectNode(), latestQuestion);
                    String output = queryBuildingStaffSafely(user, parameters, dataQuestions.get("BUILDING_STAFF"));
                    answers.add(output);
                    evidence.add(Map.of("task", "BUILDING_STAFF", "result", output));
                }
                if (repairerDirectoryRequested && !repairerDirectoryHandled) {
                    String intent = "ADMIN".equals(user.role()) ? "SCHOOL_REPAIRERS" : "BUILDING_REPAIRERS";
                    String output = answerDataIntent(user, intent, dataQuestions.get(intent), JSON.createObjectNode());
                    answers.add(output);
                    evidence.add(Map.of("task", intent, "result", output));
                }
            } else {
                // Accept the previous router response shape during a gradual model/config rollout.
                if (result.path("intents").isArray()) {
                    result.path("intents").forEach(node -> {
                        String dataQuestion = dataQuestions.get(node.asText().toUpperCase());
                        if (dataQuestion != null) {
                            String dataAnswer = answerDataIntent(user, node.asText().toUpperCase(), dataQuestion, JSON.createObjectNode());
                            answers.add(dataAnswer == null ? "暂未查询到对应的个人记录。" : dataAnswer);
                        }
                    });
                } else {
                    String dataQuestion = dataQuestions.get(result.path("intent").asText("").toUpperCase());
                    if (dataQuestion != null) {
                        String dataAnswer = answerDataIntent(user, result.path("intent").asText("").toUpperCase(), dataQuestion, JSON.createObjectNode());
                        answers.add(dataAnswer == null ? "暂未查询到对应的个人记录。" : dataAnswer);
                    }
                }
                String fallbackAnswer = result.path("answer").asText("").trim();
                if (!fallbackAnswer.isBlank()) answers.add(fallbackAnswer);
            }
            if (!answers.isEmpty()) {
                if (tasks.isArray() && tasks.size() > 1) return synthesizeAgentAnswer(user, history, evidence, answers);
                return String.join("\n", answers);
            }
        } catch (Exception error) {
            if (looksLikeInternalPlan(raw)) {
                log.warn("Assistant plan processing failed: {}", error.getClass().getSimpleName());
                return "这次查询没有成功整理结果，请稍后重试；内部处理内容不会显示。";
            }
            log.debug("Assistant semantic routing returned non-JSON content");
        }
        return raw;
    }

    private static String extractJsonObject(String raw) {
        String value = raw.trim().replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "").trim();
        int start = value.indexOf('{');
        int end = value.lastIndexOf('}');
        return start >= 0 && end >= start ? value.substring(start, end + 1) : value;
    }

    private static boolean looksLikeInternalPlan(String raw) {
        String text = raw.trim().toLowerCase();
        return text.startsWith("```") || (text.contains("\"tasks\"") && (text.contains("\"intent\"") || text.contains("\"type\"")));
    }

    private static String latestUserMessage(List<Map<String, String>> history) {
        for (int i = history.size() - 1; i >= 0; i--) {
            if ("user".equals(history.get(i).get("role"))) return history.get(i).getOrDefault("content", "");
        }
        return "";
    }

    private ObjectNode resolveBuildingParameter(CurrentUser user, JsonNode modelParameters, String question) {
        ObjectNode parameters = JSON.createObjectNode();
        if (modelParameters != null && modelParameters.isObject()) modelParameters.fields().forEachRemaining(entry -> parameters.set(entry.getKey(), entry.getValue()));
        List<String> authorizedNames = management.buildings(user).stream().map(row -> Objects.toString(row.get("building_name"), ""))
                .filter(name -> !name.isBlank()).distinct().sorted((a, b) -> Integer.compare(b.length(), a.length())).toList();
        String matched = authorizedNames.stream().filter(question::contains).findFirst().orElse("");
        if (!matched.isBlank()) {
            parameters.put("buildingName", matched);
            return parameters;
        }
        String requested = parameter(modelParameters, "buildingName");
        if (!requested.isBlank()) parameters.put("buildingName", requested);
        return parameters;
    }

    private String queryBuildingStaffSafely(CurrentUser user, JsonNode parameters, String question) {
        try {
            return answerDataIntent(user, "BUILDING_STAFF", question, parameters);
        } catch (RuntimeException error) {
            log.warn("Assistant building staff query failed: role={}, cause={}, detail={}", user.role(), error.getClass().getSimpleName(),
                    Objects.toString(error.getMessage(), ""));
            return "楼栋人员信息暂时查询失败；本轮其他问题的结果仍可正常查看。";
        }
    }

    private static boolean isBuildingStaffQuestion(String question) {
        boolean asksWorkers = containsAny(question, "维修工", "维修人员", "维修师傅", "维修员", "维修技师");
        boolean asksManager = containsAny(question, "宿管", "宿舍管理员", "负责管理人员");
        boolean asksIdentity = containsAny(question, "谁", "哪些", "名单", "工号", "负责", "管辖", "有谁");
        return asksWorkers && asksManager && asksIdentity;
    }

    private static boolean isRepairerDirectoryQuestion(String question) {
        String q = question.toLowerCase();
        boolean personnel = containsAny(q, "维修工", "维修人员", "维修师傅", "维修员", "维修技师");
        boolean workOrder = containsAny(q, "维修工单", "报修工单", "工单", "报修单", "工单号");
        boolean asksForDirectory = containsAny(q, "谁", "哪些", "哪几个", "名单", "人员", "师傅", "工号", "联系方式", "联系电话", "在岗", "负责", "管辖", "有多少", "有谁");
        return personnel && !workOrder && asksForDirectory;
    }

    private static boolean isCurrentBuildingScopeQuestion(String question) {
        boolean asksCurrentScope = containsAny(question, "我负责", "我的管辖", "当前账号", "这个账号", "本账号", "我管辖", "名下楼栋");
        boolean asksWhich = containsAny(question, "哪个", "哪些", "什么楼", "几栋", "哪栋", "楼栋范围");
        return asksCurrentScope && asksWhich;
    }

    private String answerCurrentBuildingScope(CurrentUser user) {
        List<String> buildings = management.buildings(user).stream()
                .map(row -> Objects.toString(row.get("building_name"), ""))
                .filter(name -> !name.isBlank()).distinct().toList();
        return buildings.isEmpty() ? "当前账号没有配置负责楼栋。"
                : "当前账号负责的楼栋：" + String.join("、", buildings) + "。";
    }

    private String synthesizeAgentAnswer(CurrentUser user, List<Map<String, String>> history,
                                         List<Map<String, String>> evidence, List<String> fallback) {
        try {
            List<Map<String, String>> synthesisHistory = new ArrayList<>(history);
            synthesisHistory.add(Map.of("role", "user", "content", "已按当前账号权限逐项执行查询。以下是可信工具结果JSON："
                    + JSON.writeValueAsString(evidence) + "。请按用户原问题顺序完整作答，结合结果进行必要比较或归纳。数字和事实必须与结果一致，不要补造，不要遗漏子任务。"));
            return requestModel(synthesisHistory, rolePrompt(user)
                    + "\n当前处于最终整合阶段。依据已执行的只读查询结果回答用户所有子问题，保持任务顺序；可作简单归纳和比较，但不得虚构记录、范围或原因。对话中的权限范围由后端工具执行结果决定，不要再向用户询问已从账号资料确定的信息。");
        } catch (RuntimeException | java.io.IOException error) {
            log.warn("Assistant answer synthesis failed; returning verified tool results: {}", error.getClass().getSimpleName());
            return String.join("\n", fallback);
        }
    }

    private String answerStudentQuery(CurrentUser user, String question) {
        String q = question.toLowerCase();
        if (isRepairProcessQuestion(q)) {
            return "学生报修流程：1. 在“报修管理-我的报修”新建报修，填写维修类型、故障分类、标题、故障位置与说明，并按需上传现场照片；2. 提交后由宿管审核，通过后系统按维修人员在办负荷自动派单，需人工处理的由宿管或系统管理员派单；3. 维修人员接单并处理；4. 维修完成后，你在工单中确认完成并填写评分和文字评价。如问题仍未解决，可在确认前申请重修。";
        }
        if (containsAny(q, "舍友", "室友", "同寝", "同宿舍")) {
            if (!isPersonalReference(q)) return null;
            List<Map<String, Object>> roommates = management.roommates(user);
            if (roommates.isEmpty()) return "暂未查询到与你同寝的其他学生。";
            return "你的舍友有：" + String.join("；", roommates.stream()
                    .map(row -> value(row, "student_name") + "（" + value(row, "bed_no") + "号床）")
                    .toList()) + "。";
        }
        if (containsAny(q, "个人信息", "个人资料", "我的信息", "我的资料", "学号", "我叫什么", "我的姓名")) {
            if (!isPersonalReference(q)) return null;
            Map<String, Object> profile = management.profile(user);
            LinkedHashMap<String, String> fields = new LinkedHashMap<>();
            put(fields, "姓名", profile, "student_name", "real_name");
            put(fields, "学号", profile, "student_no");
            put(fields, "性别", profile, "gender");
            put(fields, "院系", profile, "department_name");
            put(fields, "专业", profile, "major_name");
            put(fields, "班级", profile, "class_name");
            put(fields, "联系电话", profile, "phone");
            return fields.isEmpty() ? "暂未查询到你的个人资料。" : "你的个人信息：" + joinFields(fields) + "。";
        }
        if (containsAny(q, "住宿", "宿舍", "床位", "寝室")) {
            if (!isPersonalReference(q)) return null;
            boolean history = containsAny(q, "历史", "以前", "曾经", "换宿");
            List<Map<String, Object>> homes = management.homes(user, history);
            if (homes.isEmpty()) return history ? "暂未查询到住宿历史记录。" : "目前没有查询到有效住宿信息。";
            List<String> entries = homes.stream().limit(10).map(row -> {
                String location = value(row, "building_name") + "" + value(row, "room_no") + "室，" + value(row, "bed_no") + "号床";
                String dates = value(row, "check_in_date") + (row.get("check_out_date") == null ? "至今" : "至" + value(row, "check_out_date"));
                return location + "（" + dates + "）";
            }).toList();
            return (history ? "你的住宿历史：" : "你的当前住宿：") + String.join("；", entries)
                    + (homes.size() > entries.size() ? "；其余记录请在住宿历史中查看" : "") + "。";
        }
        if (containsAny(q, "留宿", "假期住宿", "假期留宿")) {
            if (isStayProcessQuestion(q)) {
                return "假期留宿申请流程：1. 在“住宿管理-假期留宿”查看当前开放批次的留宿通知，确认开放日期、你所在楼栋的申请截止时间、注意事项和材料要求；2. 点击填写申请，选择开放区间内的留宿日期，填写留宿原因并上传要求的材料（至少一份）；3. 保存并提交后等待宿管审核；4. 若申请被退回，按审核意见在规定时间内修改并重新提交；审核通过后可在假期留宿页面查看申请状态和留宿日期。";
            }
            if (!containsAny(q, "我的", "我有", "我提交", "我的申请", "我的留宿", "申请状态", "申请进度", "申请历史", "申请记录", "审核结果")) {
                return null;
            }
            List<Map<String, Object>> applications = stays.list(user);
            if (applications.isEmpty()) return "暂未查询到你的留宿申请。";
            List<String> entries = applications.stream().limit(10).map(row -> value(row, "batch_name") + "："
                    + statusLabel(value(row, "current_status")) + dateSpan(row.get("start_date"), row.get("end_date")))
                    .toList();
            return "你的留宿申请：" + String.join("；", entries)
                    + (applications.size() > entries.size() ? "；其余申请可在假期留宿页面查看" : "") + "。";
        }
        if (containsAny(q, "报修", "维修工单", "维修单")) {
            if (!containsAny(q, "我的", "我有", "我提交", "我的工单", "我的报修", "工单状态", "工单进度", "报修状态", "报修进度", "报修历史", "工单历史", "单号")) {
                return null;
            }
            boolean history = containsAny(q, "历史", "已完成", "已确认", "以前");
            List<Map<String, Object>> orders = repairs.list(user, Map.of(), history);
            if (orders.isEmpty()) return history ? "暂未查询到已归档的报修记录。" : "暂未查询到你的报修工单。";
            List<String> entries = orders.stream().limit(10).map(row -> value(row, "order_no") + "《"
                    + value(row, "title") + "》：" + statusLabel(value(row, "current_status"))).toList();
            return (history ? "你的报修历史：" : "你的报修工单：") + String.join("；", entries)
                    + (orders.size() > entries.size() ? "；其余记录可在报修列表查看" : "") + "。";
        }
        return null;
    }

    private static boolean isRepairProcessQuestion(String question) {
        boolean repairTopic = containsAny(question, "报修", "维修");
        boolean processIntent = containsAny(question, "流程", "步骤", "怎么报修", "如何报修", "怎样报修", "怎么申请报修", "如何申请报修", "怎么样报修");
        boolean specificOrderIntent = containsAny(question, "我的工单", "我的报修单", "工单状态", "工单进度", "单号");
        return repairTopic && processIntent && !specificOrderIntent;
    }

    private static boolean isStayProcessQuestion(String question) {
        boolean topic = containsAny(question, "留宿", "假期住宿", "假期留宿");
        boolean processIntent = containsAny(question, "流程", "步骤", "怎么申请", "如何申请", "怎样申请", "怎么操作", "如何操作", "怎么办", "怎么提交", "如何提交");
        boolean personalStatusIntent = containsAny(question, "我的申请状态", "我的留宿状态", "申请进度", "申请历史");
        return topic && processIntent && !personalStatusIntent;
    }

    private static boolean containsAny(String text, String... words) {
        for (String word : words) if (text.contains(word)) return true;
        return false;
    }

    private static boolean isPersonalReference(String question) {
        return containsAny(question, "我", "本人", "自己的", "自己");
    }

    private static boolean isCompoundDataQuestion(String question) {
        String q = question.toLowerCase();
        if (containsAny(q, "？", "?", "；", ";", "、", "和", "并且", "另外", "以及", "同时", "再问", "还有")) return true;
        int domains = 0;
        if (containsAny(q, "个人信息", "个人资料", "学号", "姓名", "联系电话")) domains++;
        if (containsAny(q, "舍友", "室友", "同寝", "同宿舍")) domains++;
        if (containsAny(q, "住宿", "宿舍", "床位", "寝室")) domains++;
        if (containsAny(q, "留宿", "假期住宿", "假期留宿")) domains++;
        if (containsAny(q, "报修", "维修工单", "维修单", "工单")) domains++;
        return domains > 1;
    }

    private static void put(Map<String, String> fields, String label, Map<String, Object> source, String... keys) {
        for (String key : keys) {
            Object value = source.get(key);
            if (value != null && !value.toString().isBlank()) {
                fields.put(label, value.toString());
                return;
            }
        }
    }

    private static String joinFields(Map<String, String> fields) {
        return String.join("，", fields.entrySet().stream().map(e -> e.getKey() + "：" + e.getValue()).toList());
    }

    private static String value(Map<String, Object> row, String key) {
        return Objects.toString(row.get(key), "未知");
    }

    private static String dateSpan(Object start, Object end) {
        return start == null && end == null ? "" : "（" + Objects.toString(start, "") + "至" + Objects.toString(end, "") + "）";
    }

    private static String statusLabel(String status) {
        return switch (status) {
            case "DRAFT" -> "草稿";
            case "PENDING_REVIEW" -> "待审核";
            case "UNDER_REVIEW" -> "审核中";
            case "PENDING_EDIT" -> "待修改";
            case "APPROVED" -> "审核通过";
            case "COMPLETED" -> "已完成";
            case "PENDING_ASSIGN", "PENDING_MANUAL" -> "待人工派单";
            case "PENDING_ACCEPT" -> "待接单";
            case "ACCEPTED" -> "维修中";
            case "DELAYED" -> "延期维修";
            case "REPAIRED" -> "待确认";
            case "CONFIRMED" -> "已确认";
            case "ARCHIVED" -> "已归档";
            case "CLOSED" -> "已关闭";
            case "CANCELLED" -> "已取消";
            default -> status.isBlank() ? "未知状态" : status;
        };
    }

    public void clear(CurrentUser user, String conversationId) {
        requireSupportedRole(user);
        conversations.remove(user.id() + ":" + conversationId);
    }

    private String requestModel(List<Map<String, String>> history, String systemPrompt) {
        String mode = protocol.trim().toUpperCase();
        try {
            if ("OPENAI_RESPONSES".equals(mode)) return requestOpenAiResponses(history, systemPrompt);
            if ("OPENAI_CHAT".equals(mode)) return requestOpenAi(history, systemPrompt);
            if ("ANTHROPIC_MESSAGES".equals(mode)) return requestAnthropic(history, systemPrompt);
            throw new BizException(500, "ASSISTANT_PROTOCOL 只支持 OPENAI_RESPONSES、OPENAI_CHAT 或 ANTHROPIC_MESSAGES");
        } catch (RestClientResponseException error) {
            int status = error.getStatusCode().value();
            if (status == 401 || status == 403) {
                throw new BizException(502, "模型中转站鉴权失败（HTTP " + status + "），请检查 API Key 是否有效且属于当前中转站");
            }
            String detail = safeErrorDetail(error.getResponseBodyAsString());
            log.warn("Assistant provider HTTP error: protocol={}, model={}, endpoint={}, status={}, response={}",
                    mode, model, endpoint(mode.equals("OPENAI_RESPONSES") ? "/responses" : "/chat/completions"), status, detail);
            throw new BizException(502, "模型中转站请求失败（HTTP " + status + "）"
                    + (detail.isBlank() ? "，请检查模型 ID、接口协议和 Base URL" : "：" + detail));
        } catch (ResourceAccessException error) {
            log.warn("Assistant provider connection failed: protocol={}, model={}, baseUrl={}, cause={}",
                    mode, model, baseUrl, error.getMostSpecificCause().getClass().getSimpleName());
            throw new BizException(504, "连接模型中转站失败或等待响应超时，请检查本机网络和中转站状态");
        }
    }

    private static RestClient createHttpClient() {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(60));
        return RestClient.builder().requestFactory(factory).build();
    }

    private static String safeErrorDetail(String responseBody) {
        String detail = responseBody.replaceAll("sk-[A-Za-z0-9_-]+", "sk-[REDACTED]")
                .replaceAll("(?i)(\\\"?(?:api[_-]?key|authorization)\\\"?\\s*:\\s*\\\")[^\\\"]*\\\"", "$1[REDACTED]\\\"")
                .replaceAll("\\s+", " ").trim();
        return detail.length() > 240 ? detail.substring(0, 240) + "..." : detail;
    }

    private String requestOpenAiResponses(List<Map<String, String>> history, String systemPrompt) {
        Map<?, ?> response = http.post().uri(endpoint("/responses"))
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + apiKey)
                .header("x-openai-actor-authorization", actorAuthorization)
                .body(Map.of(
                        "model", model,
                        "instructions", systemPrompt,
                        "input", history,
                        "max_output_tokens", maxTokens,
                        "store", false))
                .retrieve().body(Map.class);
        if (response == null) throw new BizException(502, "模型服务返回格式异常");
        Object outputText = response.get("output_text");
        if (outputText instanceof String text && !text.isBlank()) return text.trim();
        if (!(response.get("output") instanceof List<?> output)) throw new BizException(502, "模型服务返回格式异常");
        String answer = output.stream().filter(Map.class::isInstance).map(Map.class::cast)
                .filter(item -> "message".equals(item.get("type")) && "assistant".equals(item.get("role")))
                .filter(item -> item.get("content") instanceof List<?>).flatMap(item -> ((List<?>) item.get("content")).stream())
                .filter(Map.class::isInstance).map(Map.class::cast)
                .filter(item -> "output_text".equals(item.get("type"))).map(item -> String.valueOf(item.get("text")))
                .reduce("", String::concat).trim();
        if (answer.isBlank()) throw new BizException(502, "模型服务没有返回文本");
        return answer;
    }

    private String requestAnthropic(List<Map<String, String>> history, String systemPrompt) {
        Map<?, ?> response = http.post().uri(endpoint("/v1/messages"))
                .contentType(MediaType.APPLICATION_JSON)
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .body(Map.of("model", model, "max_tokens", maxTokens,
                        "system", systemPrompt,
                        "messages", history))
                .retrieve().body(Map.class);
        if (response == null || !(response.get("content") instanceof List<?> content)) throw new BizException(502, "模型服务返回格式异常");
        String answer = content.stream().filter(Map.class::isInstance).map(Map.class::cast)
                .filter(item -> "text".equals(item.get("type"))).map(item -> String.valueOf(item.get("text")))
                .reduce("", String::concat).trim();
        if (answer.isBlank()) throw new BizException(502, "模型服务没有返回文本");
        return answer;
    }

    private String requestOpenAi(List<Map<String, String>> history, String systemPrompt) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.addAll(history);
        Map<?, ?> response = http.post().uri(endpoint("/chat/completions"))
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + apiKey)
                .header("x-openai-actor-authorization", actorAuthorization)
                .body(Map.of("model", model, "max_tokens", maxTokens, "messages", messages))
                .retrieve().body(Map.class);
        if (response == null || !(response.get("choices") instanceof List<?> choices) || choices.isEmpty()) throw new BizException(502, "模型服务返回格式异常");
        Object message = ((Map<?, ?>) choices.get(0)).get("message");
        Object content = message instanceof Map<?, ?> map ? map.get("content") : null;
        String answer = content instanceof String value ? value.trim() : "";
        if (answer.isBlank()) throw new BizException(502, "模型服务没有返回文本");
        return answer;
    }

    private String endpoint(String suffix) {
        String base = baseUrl.trim().replaceAll("/+$", "");
        if (base.isBlank()) throw new BizException(503, "尚未配置 ASSISTANT_BASE_URL");
        if (base.endsWith("/v1") && suffix.startsWith("/v1/")) suffix = suffix.substring(3);
        return base + suffix;
    }

    private void requireConfiguration() {
        if (apiKey.isBlank()) throw new BizException(503, "尚未配置后端环境变量 ASSISTANT_API_KEY");
        if (baseUrl.isBlank()) throw new BizException(503, "尚未配置 ASSISTANT_BASE_URL");
        if (model.isBlank()) throw new BizException(503, "尚未配置 ASSISTANT_MODEL");
        if (maxTokens < 1 || maxTokens > 8192) throw new BizException(500, "ASSISTANT_MAX_TOKENS 必须在 1 到 8192 之间");
    }

    private void requireSupportedRole(CurrentUser user) {
        if (user == null || !Set.of("STUDENT", "ADMIN", "DORM_MANAGER", "REPAIRER").contains(user.role())) throw BizException.forbidden();
    }

    private static final class Conversation {
        private final List<Map<String, String>> messages = new ArrayList<>();
    }
}
