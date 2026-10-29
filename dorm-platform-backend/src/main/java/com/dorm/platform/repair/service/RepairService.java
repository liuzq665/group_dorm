package com.dorm.platform.repair.service;

import com.dorm.platform.common.*;
import com.dorm.platform.security.*;
import com.dorm.platform.notice.service.NoticeService;
import com.dorm.platform.file.service.FileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.dorm.platform.common.Input.*;
import static com.dorm.platform.common.BizException.require;

@Service
public class RepairService {
    private final SqlStore db;
    private final DataScope scope;
    private final NoticeService notice;
    private final FileService files;
    public RepairService(SqlStore db,DataScope scope,NoticeService notice,FileService files){this.db=db;this.scope=scope;this.notice=notice;this.files=files;}
    public List<Map<String,Object>> list(CurrentUser u){
        String filter=switch(u.role()){
            case "STUDENT" -> "o.student_id="+u.id();
            case "REPAIRER" -> "EXISTS(SELECT 1 FROM repair_dispatch d WHERE d.order_id=o.order_id AND d.repairer_user_id="+u.id()+")";
            default -> scope.buildingFilter(u,"o.building_id");
        };
        return db.rows("SELECT o.* FROM v_repair_order_dashboard o WHERE "+filter+" ORDER BY o.created_at DESC");
    }
    private Map<String,Object> locked(long order){db.one("SELECT order_id FROM repair_order WHERE order_id=? FOR UPDATE",order);return db.one("SELECT * FROM v_repair_order_dashboard WHERE order_id=?",order);}
    private void access(CurrentUser u,Map<String,Object> o){
        switch(u.role()){case "STUDENT":if(id(o.get("student_id"))!=u.id())throw BizException.forbidden();break;
            case "REPAIRER":if(db.count("SELECT COUNT(*) FROM repair_dispatch WHERE order_id=? AND repairer_user_id=?",o.get("order_id"),u.id())==0)throw BizException.forbidden();break;
            default:scope.building(u,id(o.get("building_id")));}
    }
    public Map<String,Object> detail(CurrentUser u,long order){
        var o=db.one("SELECT * FROM v_repair_order_dashboard WHERE order_id=?",order);access(u,o);
        o.put("dispatches",db.rows("SELECT d.*,p.repairer_name FROM repair_dispatch d JOIN v_repairer_profile p ON p.repairer_user_id=d.repairer_user_id WHERE d.order_id=? ORDER BY d.dispatch_id",order));
        o.put("audits",db.rows("SELECT * FROM repair_audit WHERE order_id=? ORDER BY audit_id",order));
        o.put("delays",db.rows("SELECT * FROM repair_delay_request WHERE order_id=? ORDER BY request_id",order));
        o.put("exceptions",db.rows("SELECT * FROM repair_exception WHERE order_id=? ORDER BY exception_id",order));
        o.put("files",db.rows("SELECT f.file_id,f.original_name,a.purpose FROM repair_attachment a JOIN file_resource f ON f.file_id=a.file_id WHERE a.order_id=?",order));
        o.put("versions",db.rows("SELECT * FROM repair_submission_version WHERE order_id=? ORDER BY version_id",order));
        return o;
    }
    public Map<String,Object> catalog(){return Map.of("workTypes",db.rows("SELECT work_type_id id,work_type_name name FROM repair_work_type WHERE enabled=1"),"categories",db.rows("SELECT category_id id,category_name name,work_type_id workTypeId FROM fault_category WHERE enabled=1"));}
    private void state(Map<String,Object> o,String... allowed){require(Arrays.asList(allowed).contains(o.get("current_status")),"当前工单状态不允许此操作");}
    private Map<String,Object> rule(Map<String,Object> o){return db.one("SELECT * FROM repair_rule WHERE rule_id=?",o.get("rule_id"));}
    private void studentNotice(Map<String,Object> o,String message){notice.send(List.of(id(o.get("student_id"))),"报修进度",o.get("order_no")+"："+message);}
    private void content(Map<String,Object>b){required(b,"title");required(b,"description");require(text(b,"title").length()<=120,"标题最多120字");require(db.count("SELECT COUNT(*) FROM fault_category c JOIN repair_work_type w ON w.work_type_id=c.work_type_id WHERE c.category_id=? AND c.enabled=1 AND w.enabled=1",id(b.get("categoryId")))==1,"故障分类无效");}
    @Transactional public Map<String,Object> create(CurrentUser u,Map<String,Object>b){
        role(u,"STUDENT");content(b);var home=scope.accommodation(u.id());
        long rule=db.count("SELECT MAX(rule_id) FROM repair_rule");
        String no="WX"+UUID.randomUUID().toString().replace("-","").substring(0,20);
        long order=db.insert("INSERT INTO repair_order(order_no,student_id,room_id,category_id,title,description,current_status,rule_id) VALUES(?,?,?,?,?,?,'DRAFT',?)",no,u.id(),home.get("room_id"),id(b.get("categoryId")),text(b,"title"),text(b,"description"),rule);
        files.attach(u,order,"FAULT",b.get("fileIds"),false);db.log(u.id(),"repair","create",order);return Map.of("orderId",order,"orderNo",no);
    }
    @Transactional public void edit(CurrentUser u,long order,Map<String,Object>b){role(u,"STUDENT");var o=locked(order);access(u,o);state(o,"DRAFT","PENDING_EDIT");content(b);editDeadline(o);db.update("UPDATE repair_order SET title=?,description=?,category_id=? WHERE order_id=?",text(b,"title"),text(b,"description"),id(b.get("categoryId")),order);files.attach(u,order,"FAULT",b.get("fileIds"),false);}
    private void editDeadline(Map<String,Object> o){if("PENDING_EDIT".equals(o.get("current_status"))){var last=db.one("SELECT created_at FROM repair_audit WHERE order_id=? AND result='RETURNED' ORDER BY audit_id DESC LIMIT 1",o.get("order_id"));require(LocalDateTime.now().isBefore(time(last.get("created_at")).plusDays(id(rule(o).get("edit_days")))),"已超过修改期限");}}
    private void version(long order){db.update("INSERT INTO repair_submission_version(order_id,title,description,category_id) SELECT order_id,title,description,category_id FROM repair_order WHERE order_id=?",order);}
    @Transactional public void submit(CurrentUser u,long order){role(u,"STUDENT");var o=locked(order);access(u,o);state(o,"DRAFT","PENDING_EDIT");editDeadline(o);version(order);db.update("UPDATE repair_order SET current_status='PENDING_REVIEW',reject_reason=NULL WHERE order_id=?",order);notice.managers(id(o.get("building_id")),"报修待审核",o.get("order_no").toString());db.log(u.id(),"repair","submit",order);}
    @Transactional public void cancel(CurrentUser u,long order){role(u,"STUDENT");var o=locked(order);access(u,o);state(o,"DRAFT","PENDING_EDIT","PENDING_REVIEW","PENDING_ASSIGN","PENDING_MANUAL");require(db.count("SELECT COUNT(*) FROM repair_dispatch WHERE order_id=?",order)==0,"已派单工单不可撤销");db.update("UPDATE repair_order SET current_status='CANCELLED',archived_at=NOW(),archive_reason='STUDENT_CANCELLED' WHERE order_id=?",order);db.log(u.id(),"repair","cancel",order);}
    @Transactional public void review(CurrentUser u,long order,Map<String,Object>b){
        role(u,"DORM_MANAGER");var o=locked(order);scope.building(u,id(o.get("building_id")));boolean pass=flag(b,"pass");
        if(pass)state(o,"PENDING_REVIEW");else state(o,"PENDING_REVIEW","PENDING_MANUAL","PENDING_ASSIGN");
        String reason=pass?text(b,"reason"):required(b,"reason");boolean urgent=b.containsKey("urgent")?flag(b,"urgent"):flag(o,"urgent");
        db.update("UPDATE repair_order SET current_status=?,urgent=?,reject_reason=? WHERE order_id=?",pass?"PENDING_ASSIGN":"PENDING_EDIT",urgent,reason,order);
        db.update("INSERT INTO repair_audit(order_id,reviewer_user_id,result,reason) VALUES(?,?,?,?)",order,u.id(),pass?"APPROVED":"RETURNED",reason);
        studentNotice(o,pass?"审核通过":"请修改："+reason);if(pass)autoDispatch(order);db.log(u.id(),"repair","review",order);
    }
    public List<Map<String,Object>> candidates(CurrentUser u,long order){role(u,"DORM_MANAGER","ADMIN");var o=db.one("SELECT * FROM v_repair_order_dashboard WHERE order_id=?",order);scope.building(u,id(o.get("building_id")));return eligible(o);}
    private List<Map<String,Object>> eligible(Map<String,Object>o){return db.rows("SELECT p.repairer_user_id,p.repairer_name real_name,p.max_active_orders,(SELECT COUNT(*) FROM repair_dispatch d JOIN repair_order x ON x.order_id=d.order_id WHERE d.repairer_user_id=p.repairer_user_id AND d.dispatch_status IN ('PENDING','ACCEPTED') AND x.current_status IN ('PENDING_ACCEPT','ACCEPTED','DELAYED')) active_orders FROM repairer_profile p WHERE p.on_duty=1 AND p.enabled=1 AND EXISTS(SELECT 1 FROM repairer_work_type q WHERE q.repairer_user_id=p.repairer_user_id AND q.work_type_id=?) AND EXISTS(SELECT 1 FROM repairer_building_scope s WHERE s.repairer_user_id=p.repairer_user_id AND s.building_id=?) ORDER BY active_orders,p.repairer_user_id",o.get("work_type_id"),o.get("building_id"));}
    private void autoDispatch(long order){
        var o=locked(order);state(o,"PENDING_ASSIGN");
        if(flag(o,"urgent")||flag(o,"abnormal")||o.get("parent_order_id")!=null){db.update("UPDATE repair_order SET current_status='PENDING_MANUAL' WHERE order_id=?",order);return;}
        // Lock candidate profiles in stable order before checking aggregate workload.
        db.rows("SELECT repairer_user_id FROM repairer_profile ORDER BY repairer_user_id FOR UPDATE");
        for(var w:eligible(o)){long worker=id(w.get("repairer_user_id"));if(w.get("max_active_orders")!=null&&id(w.get("active_orders"))>=id(w.get("max_active_orders")))continue;
            if(db.count("SELECT COUNT(*) FROM repair_dispatch WHERE order_id=? AND repairer_user_id=?",order,worker)>0)continue;
            assign(o,worker,false);return;
        }
        db.update("UPDATE repair_order SET current_status='PENDING_MANUAL' WHERE order_id=?",order);notice.managers(id(o.get("building_id")),"暂无可派维修人员",o.get("order_no").toString());
    }
    private void assign(Map<String,Object>o,long worker,boolean manual){
        var r=rule(o);LocalDateTime now=LocalDateTime.now();long order=id(o.get("order_id"));
        db.update("INSERT INTO repair_dispatch(order_id,repairer_user_id,dispatch_mode,dispatch_status,decided_at,accept_deadline,repair_deadline) VALUES(?,?,?,?,?,?,?)",order,worker,manual?"MANUAL":"AUTO",manual?"ACCEPTED":"PENDING",manual?now:null,manual?null:now.plusMinutes(id(r.get("accept_minutes"))),manual?now.plusMinutes(id(r.get(flag(o,"urgent")?"urgent_minutes":"normal_minutes"))):null);
        db.update("UPDATE repair_order SET current_status=? WHERE order_id=?",manual?"ACCEPTED":"PENDING_ACCEPT",order);notice.send(List.of(worker),manual?"强制派单已接单":"新的维修派单",o.get("order_no").toString());
    }
    @Transactional public void dispatch(CurrentUser u,long order,Map<String,Object>b){role(u,"DORM_MANAGER");var o=locked(order);scope.building(u,id(o.get("building_id")));state(o,"PENDING_ASSIGN","PENDING_MANUAL");long worker=id(b.get("repairerUserId"));db.one("SELECT repairer_user_id FROM repairer_profile WHERE repairer_user_id=? FOR UPDATE",worker);require(eligible(o).stream().anyMatch(w->id(w.get("repairer_user_id"))==worker),"维修人员不具备当前工种或楼栋资质");assign(o,worker,true);db.log(u.id(),"repair","force_dispatch",order);}
    @Transactional public void retry(CurrentUser u,long order){role(u,"ADMIN","DORM_MANAGER");var o=locked(order);access(u,o);state(o,"PENDING_MANUAL");require(!flag(o,"abnormal")&&!flag(o,"urgent")&&o.get("parent_order_id")==null,"紧急、异常和重修工单只能强制派单");db.update("UPDATE repair_order SET current_status='PENDING_ASSIGN' WHERE order_id=?",order);autoDispatch(order);}
    private Map<String,Object> responsible(CurrentUser u,Map<String,Object>o){role(u,"REPAIRER");if(o.get("repairer_user_id")==null||id(o.get("repairer_user_id"))!=u.id())throw BizException.forbidden();return db.one("SELECT * FROM repair_dispatch WHERE dispatch_id=?",o.get("dispatch_id"));}
    @Transactional public void decision(CurrentUser u,long order,Map<String,Object>b){var o=locked(order);var d=responsible(u,o);state(o,"PENDING_ACCEPT");require("AUTO".equals(d.get("dispatch_mode")),"强制派单无需接单或拒单");require(LocalDateTime.now().isBefore(time(d.get("accept_deadline"))),"接单期限已过");boolean accept=flag(b,"accept");String reason=accept?"":required(b,"reason");db.update("UPDATE repair_dispatch SET dispatch_status=?,decision_reason=?,decided_at=NOW(),repair_deadline=? WHERE dispatch_id=?",accept?"ACCEPTED":"REJECTED",reason,accept?LocalDateTime.now().plusMinutes(id(rule(o).get("normal_minutes"))):null,d.get("dispatch_id"));if(accept){db.update("UPDATE repair_order SET current_status='ACCEPTED' WHERE order_id=?",order);studentNotice(o,"维修人员已接单");}else reroute(order);db.log(u.id(),"repair",accept?"accept":"reject",order);}
    private void reroute(long order){long failures=db.count("SELECT COUNT(*) FROM repair_dispatch WHERE order_id=? AND dispatch_status IN ('REJECTED','TIMEOUT')",order);db.update("UPDATE repair_order SET current_status=?,abnormal=CASE WHEN ?>2 THEN 1 ELSE abnormal END WHERE order_id=?",failures>2?"PENDING_MANUAL":"PENDING_ASSIGN",failures,order);if(failures<=2)autoDispatch(order);else{var o=locked(order);notice.managers(id(o.get("building_id")),"异常工单待强制派单",o.get("order_no").toString());}}
    @Transactional public void result(CurrentUser u,long order,Map<String,Object>b){var o=locked(order);var d=responsible(u,o);state(o,"ACCEPTED","DELAYED");require(db.count("SELECT COUNT(*) FROM repair_delay_request WHERE order_id=? AND current_status='PENDING'",order)==0,"延期申请审核完成后才可提交结果");require(LocalDateTime.now().isBefore(time(d.get("repair_deadline"))),"维修期限已过");String result=required(b,"result");files.attach(u,order,"RESULT",b.get("fileIds"),true);db.update("INSERT INTO repair_result(order_id,repairer_user_id,result_text) VALUES(?,?,?)",order,u.id(),result);db.update("UPDATE repair_order SET current_status='REPAIRED' WHERE order_id=?",order);studentNotice(o,"维修完成，请确认或申请重修");db.log(u.id(),"repair","result",order);}
    @Transactional public void delay(CurrentUser u,long order,Map<String,Object>b){var o=locked(order);var d=responsible(u,o);state(o,"ACCEPTED","DELAYED");require(db.count("SELECT COUNT(*) FROM repair_delay_request WHERE order_id=? AND current_status='PENDING'",order)==0,"已有待审核延期申请");require(LocalDateTime.now().isBefore(time(d.get("repair_deadline"))),"维修期限已过");LocalDateTime expected=time(b.get("expectedFinishAt"));require(expected.isAfter(time(d.get("repair_deadline"))),"预计修好时间必须晚于当前维修期限");files.attach(u,order,"DELAY",b.get("fileIds"),true);long request=db.insert("INSERT INTO repair_delay_request(order_id,repairer_user_id,reason,expected_finish_at) VALUES(?,?,?,?)",order,u.id(),required(b,"reason"),expected);for(Object f:(List<?>)b.get("fileIds"))db.update("INSERT INTO repair_delay_attachment(request_id,file_id) VALUES(?,?)",request,id(f));db.update("UPDATE repair_order SET current_status='DELAYED' WHERE order_id=?",order);notice.managers(id(o.get("building_id")),"延期申请待审核",o.get("order_no").toString());db.log(u.id(),"repair","delay",order);}
    @Transactional public void reviewDelay(CurrentUser u,long order,Map<String,Object>b){role(u,"DORM_MANAGER");var o=locked(order);scope.building(u,id(o.get("building_id")));state(o,"DELAYED");var d=db.one("SELECT * FROM repair_delay_request WHERE order_id=? AND current_status='PENDING' FOR UPDATE",order);boolean pass=flag(b,"pass");String reason=pass?text(b,"reason"):required(b,"reason");if(pass)require(time(d.get("expected_finish_at")).isAfter(LocalDateTime.now()),"预计时间已过，不能通过");db.update("UPDATE repair_delay_request SET current_status=?,reviewer_user_id=?,review_reason=?,reviewed_at=NOW() WHERE request_id=?",pass?"APPROVED":"REJECTED",u.id(),reason,d.get("request_id"));if(pass){db.update("UPDATE repair_dispatch SET repair_deadline=? WHERE dispatch_id=?",d.get("expected_finish_at"),o.get("dispatch_id"));studentNotice(o,"延期通过，预计完成："+d.get("expected_finish_at"));}else{db.update("UPDATE repair_order SET current_status='ACCEPTED' WHERE order_id=?",order);if(!time(o.get("repair_deadline")).isAfter(LocalDateTime.now()))repairTimeout(o);}notice.send(List.of(id(d.get("repairer_user_id"))),"延期审核结果",pass?"已通过":"未通过："+reason);db.log(u.id(),"repair","delay_review",order);}
    @Transactional public void confirm(CurrentUser u,long order){role(u,"STUDENT");var o=locked(order);access(u,o);state(o,"REPAIRED");require(db.count("SELECT COUNT(*) FROM repair_order WHERE parent_order_id=? AND current_status NOT IN ('CLOSED','CANCELLED')",order)==0,"已发起重修，请处理关联工单");confirmOrder(o,"STUDENT");}
    private void confirmOrder(Map<String,Object>o,String mode){long order=id(o.get("order_id"));db.update("INSERT INTO repair_confirmation(order_id,confirmation_mode) VALUES(?,?)",order,mode);db.update("UPDATE repair_order SET current_status=?,archived_at=? WHERE order_id=?",mode.equals("AUTO")?"ARCHIVED":"CONFIRMED",mode.equals("AUTO")?LocalDateTime.now():null,order);studentNotice(o,mode.equals("AUTO")?"已自动确认并归档":"已确认维修，可提交评价");Object parent=o.get("parent_order_id");while(parent!=null){var p=locked(id(parent));db.update("UPDATE repair_order SET current_status='ARCHIVED',archived_at=NOW(),archive_reason='REWORK_COMPLETED' WHERE order_id=?",parent);parent=p.get("parent_order_id");}}
    @Transactional public void evaluate(CurrentUser u,long order,Map<String,Object>b){role(u,"STUDENT");var o=locked(order);access(u,o);state(o,"CONFIRMED");long score=id(b.get("score"));require(score>=1&&score<=5,"评分必须为1到5分");db.update("INSERT INTO repair_evaluation(order_id,score,comment) VALUES(?,?,?)",order,score,text(b,"comment"));db.update("UPDATE repair_order SET current_status='ARCHIVED',archived_at=NOW(),archive_reason='EVALUATED' WHERE order_id=?",order);if(o.get("repairer_user_id")!=null)notice.send(List.of(id(o.get("repairer_user_id"))),"收到维修评价",o.get("order_no")+"："+score+"分");db.log(u.id(),"repair","evaluate",order);}
    @Transactional public Map<String,Object> rework(CurrentUser u,long order,Map<String,Object>b){role(u,"STUDENT");var o=locked(order);access(u,o);state(o,"REPAIRED");require(db.count("SELECT COUNT(*) FROM repair_order WHERE parent_order_id=? AND current_status NOT IN ('CLOSED','CANCELLED')",order)==0,"已有重修工单");var root=o;while(root.get("parent_order_id")!=null)root=locked(id(root.get("parent_order_id")));Object max=rule(o).get("max_rework_count");long count=db.count("WITH RECURSIVE chain AS (SELECT order_id FROM repair_order WHERE order_id=? UNION ALL SELECT r.order_id FROM repair_order r JOIN chain c ON r.parent_order_id=c.order_id) SELECT COUNT(*)-1 FROM chain",root.get("order_id"));require(max==null||count<id(max),"已达到重修次数上限，请新建普通报修");String no="WX"+UUID.randomUUID().toString().replace("-","").substring(0,20);long child=db.insert("INSERT INTO repair_order(order_no,student_id,room_id,category_id,title,description,current_status,parent_order_id,rule_id) VALUES(?,?,?,?,?,?,'PENDING_REVIEW',?,?)",no,u.id(),o.get("room_id"),o.get("category_id"),o.get("title"),required(b,"reason"),order,o.get("rule_id"));db.update("INSERT INTO repair_order_relation(parent_order_id,child_order_id,relation_type) VALUES(?,?,'REWORK')",order,child);files.attach(u,child,"FAULT",b.get("fileIds"),false);version(child);notice.managers(id(o.get("building_id")),"重修待审核",no);return Map.of("orderId",child);}
    private void repairTimeout(Map<String,Object>o){db.update("INSERT INTO repair_exception(order_id,dispatch_id,exception_type,reason) VALUES(?,?,'REPAIR_TIMEOUT','超过维修截止时间未完工')",o.get("order_id"),o.get("dispatch_id"));db.update("UPDATE repair_dispatch SET dispatch_status='REPAIR_TIMEOUT' WHERE dispatch_id=?",o.get("dispatch_id"));db.update("UPDATE repair_order SET current_status='PENDING_MANUAL',abnormal=1 WHERE order_id=?",o.get("order_id"));notice.managers(id(o.get("building_id")),"维修超时待强制派单",o.get("order_no").toString());notice.send(List.of(id(o.get("repairer_user_id"))),"维修超时",o.get("order_no")+"已解除负责关系");}
    @Transactional public void tick(){
        for(var row:db.rows("SELECT order_id FROM repair_order WHERE current_status IN ('PENDING_ACCEPT','ACCEPTED','DELAYED','REPAIRED','PENDING_EDIT') ORDER BY order_id")){
            var o=locked(id(row.get("order_id")));long order=id(o.get("order_id"));String s=text(o,"current_status");var r=rule(o);LocalDateTime now=LocalDateTime.now();
            if(s.equals("PENDING_ACCEPT")&&o.get("accept_deadline")!=null&&!time(o.get("accept_deadline")).isAfter(now)){db.update("UPDATE repair_dispatch SET dispatch_status='TIMEOUT',decided_at=NOW() WHERE dispatch_id=?",o.get("dispatch_id"));notice.send(List.of(id(o.get("repairer_user_id"))),"接单超时",o.get("order_no").toString());reroute(order);}
            else if(Set.of("ACCEPTED","DELAYED").contains(s)&&o.get("repair_deadline")!=null&&!time(o.get("repair_deadline")).isAfter(now)&&db.count("SELECT COUNT(*) FROM repair_delay_request WHERE order_id=? AND current_status='PENDING'",order)==0)repairTimeout(o);
            else if(s.equals("REPAIRED")&&db.count("SELECT COUNT(*) FROM repair_order WHERE parent_order_id=? AND current_status NOT IN ('CLOSED','CANCELLED')",order)==0){var result=db.one("SELECT created_at FROM repair_result WHERE order_id=?",order);if(!time(result.get("created_at")).plusDays(id(r.get("confirm_days"))).isAfter(now))confirmOrder(o,"AUTO");}
            else if(s.equals("PENDING_EDIT")){var audits=db.rows("SELECT created_at FROM repair_audit WHERE order_id=? AND result='RETURNED' ORDER BY audit_id DESC LIMIT 1",order);if(!audits.isEmpty()&&!time(audits.get(0).get("created_at")).plusDays(id(r.get("edit_days"))).isAfter(now)){db.update("UPDATE repair_order SET current_status='CLOSED',archived_at=NOW(),archive_reason='EDIT_EXPIRED' WHERE order_id=?",order);studentNotice(o,"未按期修改，已关闭归档");}}
        }
    }
}
