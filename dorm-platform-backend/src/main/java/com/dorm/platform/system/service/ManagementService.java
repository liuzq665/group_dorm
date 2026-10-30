package com.dorm.platform.system.service;

import com.dorm.platform.common.*;
import com.dorm.platform.security.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.dorm.platform.common.Input.*;
import static com.dorm.platform.common.BizException.require;

@Service
public class ManagementService {
 private final SqlStore db;
 private final DataScope scope;
 public ManagementService(SqlStore db,DataScope scope){
  this.db=db;
  this.scope=scope;
 }
 public List<Map<String,Object>> homes(CurrentUser u,boolean history){role(u,"STUDENT","DORM_MANAGER","ADMIN");String filter=u.role().equals("STUDENT")?"a.student_id="+u.id():scope.buildingFilter(u,"r.building_id");return db.rows("SELECT a.*,s.student_name,s.student_no,s.login_account,s.phone,s.gender,sc.class_id,sc.class_name,sc.enrollment_year,m.major_id,m.major_name,d.department_id,d.department_name,b.building_id,b.building_name,r.room_id,r.room_no,bd.bed_no FROM accommodation_assignment a JOIN student s ON s.student_id=a.student_id LEFT JOIN student_class sc ON sc.class_id=s.class_id LEFT JOIN major m ON m.major_id=sc.major_id LEFT JOIN department d ON d.department_id=m.department_id JOIN bed bd ON bd.bed_id=a.bed_id JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id WHERE "+filter+(history?"":" AND a.check_in_date<=CURRENT_DATE() AND (a.check_out_date IS NULL OR a.check_out_date>CURRENT_DATE())")+" ORDER BY a.assignment_id DESC");}
 public List<Map<String,Object>> roommates(CurrentUser u){role(u,"STUDENT");return db.rows("SELECT student_name,bed_no FROM v_accommodation_current WHERE room_id IN (SELECT room_id FROM v_accommodation_current WHERE student_id=?) AND student_id<>?",u.id(),u.id());}
 public List<Map<String,Object>> buildings(CurrentUser u){
  role(u,"STUDENT","DORM_MANAGER","ADMIN");
  String filter=u.role().equals("STUDENT")?"b.building_id IN (SELECT building_id FROM v_accommodation_current WHERE student_id="+u.id()+")":scope.buildingFilter(u,"b.building_id");
  return db.rows("SELECT b.*,COALESCE(r.room_count,0) room_count,COALESCE(bs.bed_count,0) bed_count,COALESCE(bs.available_bed_count,0) available_bed_count,COALESCE(o.occupied_count,0) occupied_count FROM building b LEFT JOIN (SELECT building_id,COUNT(*) room_count FROM dorm_room GROUP BY building_id) r ON r.building_id=b.building_id LEFT JOIN (SELECT r.building_id,COUNT(DISTINCT bd.bed_id) bed_count,COUNT(DISTINCT CASE WHEN bd.management_status='AVAILABLE' AND a.bed_id IS NULL THEN bd.bed_id END) available_bed_count FROM dorm_room r LEFT JOIN bed bd ON bd.room_id=r.room_id LEFT JOIN (SELECT DISTINCT bed_id FROM v_accommodation_current) a ON a.bed_id=bd.bed_id GROUP BY r.building_id) bs ON bs.building_id=b.building_id LEFT JOIN (SELECT building_id,COUNT(DISTINCT student_id) occupied_count FROM v_accommodation_current GROUP BY building_id) o ON o.building_id=b.building_id WHERE "+filter+" ORDER BY b.building_code");
 }
 public List<Map<String,Object>> rooms(CurrentUser u){role(u,"DORM_MANAGER","ADMIN");return db.rows("SELECT r.*,b.building_name,b.gender_limit building_gender_limit,COUNT(DISTINCT bd.bed_id) bed_count,COUNT(DISTINCT CASE WHEN bd.management_status='AVAILABLE' AND a.bed_id IS NULL THEN bd.bed_id END) available_bed_count FROM dorm_room r JOIN building b ON b.building_id=r.building_id LEFT JOIN bed bd ON bd.room_id=r.room_id LEFT JOIN (SELECT DISTINCT bed_id FROM v_accommodation_current) a ON a.bed_id=bd.bed_id WHERE "+scope.buildingFilter(u,"r.building_id")+" GROUP BY r.room_id ORDER BY r.building_id,r.room_no");}
 public List<Map<String,Object>> beds(CurrentUser u){role(u,"DORM_MANAGER","ADMIN");return db.rows("SELECT bd.*,r.building_id,r.room_no,r.floor_no,r.gender_limit,r.gender_limit room_gender_limit,b.building_name,b.gender_limit building_gender_limit,a.student_name,a.student_id,s.student_no,s.gender student_gender,s.birth_date student_birth_date,s.phone student_phone,s.enrollment_status,sc.class_name,sc.enrollment_year grade,m.major_name,d.department_name FROM bed bd JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id LEFT JOIN v_accommodation_current a ON a.bed_id=bd.bed_id LEFT JOIN student s ON s.student_id=a.student_id LEFT JOIN student_class sc ON sc.class_id=s.class_id LEFT JOIN major m ON m.major_id=sc.major_id LEFT JOIN department d ON d.department_id=m.department_id WHERE "+scope.buildingFilter(u,"r.building_id")+" ORDER BY b.building_id,r.floor_no,r.room_no,bd.bed_no");}
 public List<Map<String,Object>> users(CurrentUser u){return users(u,Map.of());}
 public List<Map<String,Object>> users(CurrentUser u,Map<String,String> filters){
  role(u,"ADMIN");
  StringBuilder sql=new StringBuilder("SELECT u.user_id,u.login_account,u.student_no,u.real_name,u.gender,u.birth_date,u.employee_no,u.hire_date,u.phone,u.role_code,u.enabled,u.created_at,u.updated_at,sp.department_id,sp.department_name,sp.major_id,sp.major_name,sp.class_id,sp.class_code,sp.class_name,sp.enrollment_year,sp.grade,sp.enrollment_status,ac.building_name current_building,ac.room_no current_room,ac.bed_id current_bed_id,ac.bed_no current_bed,mp.manager_buildings,mp.on_duty manager_on_duty,rp.on_duty,rp.max_active_orders,rp.repairer_buildings,rp.work_types,rp.active_orders FROM v_user_identity u LEFT JOIN v_student_profile sp ON sp.student_id=u.user_id LEFT JOIN v_accommodation_current ac ON ac.student_id=u.user_id LEFT JOIN v_dorm_manager_profile mp ON mp.manager_user_id=u.user_id LEFT JOIN v_repairer_profile rp ON rp.repairer_user_id=u.user_id WHERE 1=1");
  List<Object> args=new ArrayList<>();
  String roleCode=filters.getOrDefault("roleCode","").trim();
  if(!roleCode.isEmpty()){
   require(Set.of("STUDENT","DORM_MANAGER","REPAIRER","ADMIN").contains(roleCode),"角色无效");
   sql.append(" AND u.role_code=?");args.add(roleCode);
  }
  addLike(sql,args,"u.login_account",filters.get("account"));
  addLike(sql,args,"u.real_name",filters.get("realName"));
  addLike(sql,args,"u.student_no",filters.get("studentNo"));
  addLike(sql,args,"u.employee_no",filters.get("employeeNo"));
  addLike(sql,args,"sp.department_name",filters.get("departmentName"));
  addLike(sql,args,"sp.major_name",filters.get("majorName"));
  addLike(sql,args,"sp.class_name",filters.get("className"));
  String grade=filters.getOrDefault("grade","").trim().replace("级","");
  addLike(sql,args,"CAST(sp.enrollment_year AS CHAR)",grade);
  addLike(sql,args,"ac.building_name",filters.get("buildingName"));
  addLike(sql,args,"ac.room_no",filters.get("roomNo"));
  exact(sql,args,"sp.department_id",filters.get("departmentId"));
  exact(sql,args,"sp.major_id",filters.get("majorId"));
  exact(sql,args,"sp.class_id",filters.get("classId"));
  exact(sql,args,"u.enrollment_status",filters.get("enrollmentStatus"));
  exact(sql,args,"u.gender",filters.get("gender"));
  String enabled=filters.getOrDefault("enabled","").trim();
  if(!enabled.isEmpty()){
   require(Set.of("true","false","1","0").contains(enabled),"账号状态筛选无效");
   sql.append(" AND u.enabled=?");args.add(enabled.equals("true")||enabled.equals("1")?1:0);
  }
  String accommodation=filters.getOrDefault("accommodation","").trim();
  if(!accommodation.isEmpty()){
   require(Set.of("ASSIGNED","UNASSIGNED").contains(accommodation),"住宿状态筛选无效");
   sql.append(accommodation.equals("ASSIGNED")?" AND ac.student_id IS NOT NULL":" AND ac.student_id IS NULL");
   sql.append(" AND u.role_code='STUDENT'");
  }
  String onDuty=filters.getOrDefault("onDuty","").trim();
  if(!onDuty.isEmpty()){
   require(Set.of("DORM_MANAGER","REPAIRER").contains(roleCode),"在岗状态筛选需要指定宿管或维修人员角色");
   require(Set.of("true","false","1","0").contains(onDuty),"在岗状态筛选无效");
   sql.append(" AND ").append("REPAIRER".equals(roleCode)?"rp.on_duty":"mp.on_duty").append("=?");
   args.add(onDuty.equals("true")||onDuty.equals("1")?1:0);
  }
  addScopedName(sql,args,filters.get("managerBuildingName"),"SELECT 1 FROM manager_building_scope s JOIN building b ON b.building_id=s.building_id WHERE s.manager_user_id=u.user_id AND b.building_name LIKE ?");
  addScopedName(sql,args,filters.get("workTypeName"),"SELECT 1 FROM repairer_work_type rw JOIN repair_work_type w ON w.work_type_id=rw.work_type_id WHERE rw.repairer_user_id=u.user_id AND w.work_type_name LIKE ?");
  addScopedName(sql,args,filters.get("repairBuildingName"),"SELECT 1 FROM repairer_building_scope s JOIN building b ON b.building_id=s.building_id WHERE s.repairer_user_id=u.user_id AND b.building_name LIKE ?");
  sql.append(" ORDER BY u.user_id");
  return db.rows(sql.toString(),args.toArray());
 }
 private void addLike(StringBuilder sql,List<Object> args,String column,String raw){
  String value=Objects.toString(raw,"").trim();
  if(!value.isEmpty()){sql.append(" AND ").append(column).append(" LIKE ?");args.add("%"+value+"%");}
 }
 private void addScopedName(StringBuilder sql,List<Object> args,String raw,String existsSql){String value=Objects.toString(raw,"").trim();if(!value.isEmpty()){sql.append(" AND EXISTS(").append(existsSql).append(")");args.add("%"+value+"%");}}
 private void exact(StringBuilder sql,List<Object> args,String column,String raw){String value=Objects.toString(raw,"").trim();if(!value.isEmpty()){sql.append(" AND ").append(column).append("=?");args.add(value);}}
 public Map<String,Object> userDetail(CurrentUser u,long userId){
  role(u,"ADMIN");
  Map<String,Object> result=new LinkedHashMap<>(db.one("SELECT user_id,login_account,student_no,real_name,gender,birth_date,employee_no,hire_date,phone,role_code,enabled,created_at,updated_at FROM v_user_identity WHERE user_id=?",userId));
  switch(Objects.toString(result.get("role_code"),"")){
   case "STUDENT"->{
    result.putAll(db.one("SELECT * FROM v_student_profile WHERE student_id=?",userId));
    result.put("currentAccommodation",db.rows("SELECT * FROM v_accommodation_current WHERE student_id=? ORDER BY assignment_id DESC LIMIT 1",userId));
    result.put("accommodationHistory",db.rows("SELECT a.assignment_id,a.assignment_type,a.check_in_date,a.check_out_date,b.building_name,r.room_no,bd.bed_no FROM accommodation_assignment a JOIN bed bd ON bd.bed_id=a.bed_id JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id WHERE a.student_id=? ORDER BY a.assignment_id DESC",userId));
    result.put("repairSummary",db.one("SELECT COUNT(*) total,SUM(current_status IN ('PENDING_REVIEW','PENDING_ASSIGN','PENDING_MANUAL','PENDING_ACCEPT')) pending,SUM(current_status IN ('ACCEPTED','DELAYED','REPAIRED')) processing,SUM(current_status IN ('CONFIRMED','ARCHIVED','CLOSED')) closed FROM repair_order WHERE student_id=?",userId));
    result.put("repairs",db.rows("SELECT order_id,order_no,title,current_status,created_at,repairer_name,score FROM v_repair_order_dashboard WHERE student_id=? ORDER BY created_at DESC LIMIT 30",userId));
    result.put("staySummary",db.rows("SELECT current_status,COUNT(*) total FROM stay_application WHERE student_id=? GROUP BY current_status ORDER BY current_status",userId));
    result.put("stays",db.rows("SELECT application_id,batch_name,current_status,start_date,end_date,updated_at FROM v_stay_application WHERE student_id=? ORDER BY updated_at DESC LIMIT 30",userId));
   }
   case "DORM_MANAGER"->{
    result.putAll(db.one("SELECT * FROM v_dorm_manager_profile WHERE manager_user_id=?",userId));
    result.put("buildingIds",db.rows("SELECT building_id FROM manager_building_scope WHERE manager_user_id=? ORDER BY building_id",userId).stream().map(x->x.get("building_id")).toList());
    result.put("buildings",db.rows("SELECT b.building_id,b.building_code,b.building_name FROM manager_building_scope s JOIN building b ON b.building_id=s.building_id WHERE s.manager_user_id=? ORDER BY b.building_code",userId));
    result.put("pendingRepairCount",db.count("SELECT COUNT(*) FROM repair_order ro JOIN dorm_room r ON r.room_id=ro.room_id JOIN manager_building_scope s ON s.building_id=r.building_id WHERE s.manager_user_id=? AND ro.current_status IN ('PENDING_REVIEW','PENDING_MANUAL','PENDING_ASSIGN')",userId));
    result.put("pendingStayCount",db.count("SELECT COUNT(*) FROM stay_application a JOIN manager_building_scope s ON s.building_id=a.building_id WHERE s.manager_user_id=? AND a.current_status IN ('PENDING_REVIEW','UNDER_REVIEW')",userId));
   }
   case "REPAIRER"->{
    result.putAll(db.one("SELECT * FROM v_repairer_profile WHERE repairer_user_id=?",userId));
    var profiles=db.rows("SELECT on_duty,max_active_orders FROM repairer_profile WHERE repairer_user_id=?",userId);
    Map<String,Object> profile=new LinkedHashMap<>();profile.put("on_duty",false);profile.put("max_active_orders",null);
    if(!profiles.isEmpty())profile.putAll(profiles.get(0));
    result.put("profile",profile);
    result.put("workTypes",db.rows("SELECT w.work_type_id,w.work_type_code,w.work_type_name FROM repairer_work_type rw JOIN repair_work_type w ON w.work_type_id=rw.work_type_id WHERE rw.repairer_user_id=? ORDER BY w.work_type_name",userId));
    result.put("buildings",db.rows("SELECT b.building_id,b.building_code,b.building_name FROM repairer_building_scope s JOIN building b ON b.building_id=s.building_id WHERE s.repairer_user_id=? ORDER BY b.building_code",userId));
    result.put("repairSummary",db.one("SELECT COUNT(DISTINCT ro.order_id) total,SUM(ro.current_status IN ('PENDING_ACCEPT','ACCEPTED','DELAYED')) active,COUNT(DISTINCT ev.order_id) evaluated,AVG(ev.score) average_score FROM repair_dispatch rd JOIN repair_order ro ON ro.order_id=rd.order_id LEFT JOIN repair_evaluation ev ON ev.order_id=ro.order_id WHERE rd.repairer_user_id=?",userId));
    result.put("repairs",db.rows("SELECT ro.order_id,ro.order_no,ro.title,ro.current_status,ro.created_at,rd.dispatch_status,ev.score,ev.comment FROM repair_dispatch rd JOIN repair_order ro ON ro.order_id=rd.order_id LEFT JOIN repair_evaluation ev ON ev.order_id=ro.order_id WHERE rd.repairer_user_id=? ORDER BY rd.dispatch_id DESC LIMIT 30",userId));
   }
   case "ADMIN"->result.putAll(db.one("SELECT * FROM v_system_admin_profile WHERE admin_user_id=?",userId));
   default->{ }
  }
  return result;
 }
 public Map<String,Object> profile(CurrentUser u){
  var result=new LinkedHashMap<>(db.one("SELECT user_id,login_account,real_name,phone,role_code,enabled,created_at,updated_at,student_no,gender,birth_date,employee_no,hire_date,enrollment_status FROM v_user_identity WHERE user_id=?",u.id()));
  switch(u.role()){
   case "STUDENT"->result.putAll(db.one("SELECT * FROM v_student_profile WHERE student_id=?",u.id()));
   case "DORM_MANAGER"->result.putAll(db.one("SELECT * FROM v_dorm_manager_profile WHERE manager_user_id=?",u.id()));
   case "REPAIRER"->result.putAll(db.one("SELECT * FROM v_repairer_profile WHERE repairer_user_id=?",u.id()));
   case "ADMIN"->result.putAll(db.one("SELECT * FROM v_system_admin_profile WHERE admin_user_id=?",u.id()));
   default->throw BizException.forbidden();
  }
  return result;
 }
 @Transactional public void profile(CurrentUser u,Map<String,Object>b){
  Map<String,Object> current=profile(u);
  String phone=text(b,"phone");require(phone.isBlank()||phone.matches("[+0-9 -]{5,30}"),"联系方式格式不正确");
  String name=text(b,"realName");if(name.isBlank())name=Objects.toString(current.get("real_name"),"");
  String gender=b.containsKey("gender")?text(b,"gender"):Objects.toString(current.get("gender"),"");
  require(gender.isBlank()||Set.of("MALE","FEMALE","OTHER").contains(gender),"性别无效");
  Object birthDate=b.containsKey("birthDate")?nullableDate(b,"birthDate"):current.get("birth_date");
  switch(u.role()){
   case "STUDENT"->db.update("UPDATE student SET phone=?,student_name=?,gender=?,birth_date=? WHERE student_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,u.id());
   case "DORM_MANAGER"->db.update("UPDATE dorm_manager_profile SET phone=?,manager_name=?,gender=?,birth_date=? WHERE manager_user_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,u.id());
   case "REPAIRER"->db.update("UPDATE repairer_profile SET phone=?,repairer_name=?,gender=?,birth_date=? WHERE repairer_user_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,u.id());
   case "ADMIN"->{
    String employeeNo=b.containsKey("employeeNo")?text(b,"employeeNo"):Objects.toString(current.get("employee_no"),"");
    Object hireDate=b.containsKey("hireDate")?nullableDate(b,"hireDate"):current.get("hire_date");
    require(employeeNo.matches("SA\\d{6}"),"管理员工号格式为SA加6位数字");
    require(employeeNo.isBlank()||employeeNumberAvailable("ADMIN",employeeNo,u.id()),"工号已存在");
    db.update("UPDATE system_admin_profile SET phone=?,admin_name=?,gender=?,birth_date=?,employee_no=?,hire_date=? WHERE admin_user_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,emptyNull(employeeNo),hireDate,u.id());
   }
   default->throw BizException.forbidden();
  }
  db.log(u.id(),"auth","profile",u.id());
 }
 @Transactional public void password(CurrentUser u,Map<String,Object>b){String old=required(b,"oldPassword"),next=required(b,"newPassword");require(next.length()>=6&&next.length()<=100,"密码长度必须为6到100位");String table=identityTable(u.role()),key=identityKey(u.role());require(db.count("SELECT COUNT(*) FROM "+table+" WHERE "+key+"=? AND password_hash=?",u.id(),AuthService.sha256(old))==1,"原密码错误");db.update("UPDATE "+table+" SET password_hash=? WHERE "+key+"=?",AuthService.sha256(next),u.id());db.log(u.id(),"auth","password",u.id());}
  @Transactional public long saveUser(CurrentUser u,Long userId,Map<String,Object>b){
   role(u,"ADMIN");
   String roleCode=required(b,"roleCode");
   require(Set.of("STUDENT","DORM_MANAGER","REPAIRER","ADMIN").contains(roleCode),"角色无效");
   String name=required(b,"realName"),studentNo=roleCode.equals("STUDENT")?text(b,"studentNo"):null;
   String employeeNo=roleCode.equals("STUDENT")?"":text(b,"employeeNo"),gender=text(b,"gender");
   require(gender.isBlank()||Set.of("MALE","FEMALE","OTHER").contains(gender),"性别无效");
   require(studentNo==null||studentNo.isBlank()||studentNo.matches("\\d{10}"),"学号必须为10位数字");
   String employeePattern=switch(roleCode){case "DORM_MANAGER"->"DM\\d{6}";case "REPAIRER"->"RP\\d{6}";case "ADMIN"->"SA\\d{6}";default->"";};
   require(employeeNo.isBlank()||employeePattern.isEmpty()||employeeNo.matches(employeePattern),roleCode.equals("DORM_MANAGER")?"宿管工号格式为DM加6位数字":roleCode.equals("REPAIRER")?"维修人员工号格式为RP加6位数字":"管理员工号格式为SA加6位数字");
   String enrollmentStatus=text(b,"enrollmentStatus");
   if(roleCode.equals("STUDENT")){
    require(!studentNo.isBlank(),"学号不能为空");
    if(enrollmentStatus.isBlank())enrollmentStatus="ENROLLED";
    require(Set.of("ENROLLED","SUSPENDED","GRADUATED","WITHDRAWN","UNKNOWN").contains(enrollmentStatus),"学籍状态无效");
   }
   String phone=text(b,"phone"),account=required(b,"account");
   require(phone.isBlank()||phone.matches("[+0-9 -]{5,30}"),"联系方式格式不正确");
   require(account.length()<=60,"账号最多60位");
   Object birthDate=nullableDate(b,"birthDate");
   long user;
   if(userId==null){
    String password=required(b,"password");
    require(password.length()>=6&&password.length()<=100,"密码长度必须为6到100位");
    if(!roleCode.equals("STUDENT"))require(!employeeNo.isBlank(),"工号不能为空");
    require(db.count("SELECT COUNT(*) FROM v_user_identity WHERE login_account=?",account)==0,"账号已存在");
    if(studentNo!=null)require(db.count("SELECT COUNT(*) FROM student WHERE student_no=?",studentNo)==0,"学号已存在");
    require(employeeNo.isBlank()||employeeNumberAvailable(roleCode,employeeNo,null),"工号已存在");
    user=db.insert("INSERT INTO person() VALUES ()");
    createRoleProfile(roleCode,user,b,name,studentNo,employeeNo,gender,birthDate,enrollmentStatus,account,AuthService.sha256(password),emptyNull(phone));
   }else{
    user=userId;
    db.one("SELECT person_id FROM person WHERE person_id=? FOR UPDATE",user);
    var old=db.one("SELECT * FROM v_user_identity WHERE user_id=?",user);
    require(roleCode.equals(old.get("role_code")),"不能通过角色资料修改人员角色");
    Map<String,Object> oldProfile=profileByRole(roleCode,user);
    if(account.isBlank())account=text(old,"login_account");
    require(db.count("SELECT COUNT(*) FROM v_user_identity WHERE login_account=? AND user_id<>?",account,user)==0,"账号已存在");
    require(studentNo==null||studentNo.isBlank()||db.count("SELECT COUNT(*) FROM student WHERE student_no=? AND student_id<>?",studentNo,user)==0,"学号已存在");
    require(employeeNo.isBlank()||employeeNumberAvailable(roleCode,employeeNo,user),"工号已存在");
    String profileGender=b.containsKey("gender")?gender:Objects.toString(oldProfile.get("gender"),"");
    Object profileBirthDate=b.containsKey("birthDate")?birthDate:oldProfile.get("birth_date");
    switch(roleCode){
     case "STUDENT"->{
      String number=studentNo.isBlank()?Objects.toString(oldProfile.get("student_no"),""):studentNo;
      require(!number.isBlank(),"学号不能为空");
      Object classId=b.containsKey("classId")?nullableId(b,"classId"):oldProfile.get("class_id");
      validateClass(classId,oldProfile.get("class_id"));
      if(enrollmentStatus.isBlank())enrollmentStatus=Objects.toString(oldProfile.get("enrollment_status"),"UNKNOWN");
      require(Set.of("ENROLLED","SUSPENDED","GRADUATED","WITHDRAWN","UNKNOWN").contains(enrollmentStatus),"学籍状态无效");
      db.update("UPDATE student SET login_account=?,phone=?,student_no=?,student_name=?,gender=?,birth_date=?,class_id=?,enrollment_status=? WHERE student_id=?",account,emptyNull(phone),number,name,emptyNull(profileGender),profileBirthDate,classId,enrollmentStatus,user);
     }
     case "DORM_MANAGER"->db.update("UPDATE dorm_manager_profile SET login_account=?,phone=?,employee_no=?,manager_name=?,gender=?,birth_date=?,hire_date=?,on_duty=? WHERE manager_user_id=?",account,emptyNull(phone),employeeNo.isBlank()?oldProfile.get("employee_no"):employeeNo,name,emptyNull(profileGender),profileBirthDate,b.containsKey("hireDate")?nullableDate(b,"hireDate"):oldProfile.get("hire_date"),b.containsKey("onDuty")?flag(b,"onDuty"):oldProfile.get("on_duty"),user);
     case "REPAIRER"->db.update("UPDATE repairer_profile SET login_account=?,phone=?,employee_no=?,repairer_name=?,gender=?,birth_date=?,hire_date=? WHERE repairer_user_id=?",account,emptyNull(phone),employeeNo.isBlank()?oldProfile.get("employee_no"):employeeNo,name,emptyNull(profileGender),profileBirthDate,b.containsKey("hireDate")?nullableDate(b,"hireDate"):oldProfile.get("hire_date"),user);
     case "ADMIN"->db.update("UPDATE system_admin_profile SET login_account=?,phone=?,employee_no=?,admin_name=?,gender=?,birth_date=?,hire_date=? WHERE admin_user_id=?",account,emptyNull(phone),employeeNo.isBlank()?oldProfile.get("employee_no"):employeeNo,name,emptyNull(profileGender),profileBirthDate,b.containsKey("hireDate")?nullableDate(b,"hireDate"):oldProfile.get("hire_date"),user);
    }
    if(!text(b,"password").isBlank()){
     require(text(b,"password").length()>=6&&text(b,"password").length()<=100,"密码长度必须为6到100位");
     db.update("UPDATE "+identityTable(roleCode)+" SET password_hash=? WHERE "+identityKey(roleCode)+"=?",AuthService.sha256(text(b,"password")),user);
    }
   }
   if(roleCode.equals("STUDENT")&&!text(b,"bedId").isBlank())assign(u,Map.of("studentId",user,"bedId",id(b.get("bedId"))));
   if(roleCode.equals("DORM_MANAGER")&&b.containsKey("buildingId"))managerScope(u,user,Map.of("buildingId",b.get("buildingId")));
   if(roleCode.equals("REPAIRER")&&(b.containsKey("buildingIds")||b.containsKey("workTypeIds"))){var settings=new HashMap<String,Object>(b);if(!settings.containsKey("onDuty"))settings.put("onDuty",true);worker(u,user,settings);}
   db.log(u.id(),"auth",userId==null?"create":"update",user);
   return user;
  }
  private void createRoleProfile(String roleCode,long user,Map<String,Object>b,String name,String studentNo,String employeeNo,String gender,Object birthDate,String enrollmentStatus,String account,String passwordHash,Object phone){
   switch(roleCode){
    case "STUDENT"->{Object classId=nullableId(b,"classId");validateClass(classId);db.update("INSERT INTO student(student_id,login_account,password_hash,phone,enabled,student_no,student_name,gender,birth_date,class_id,enrollment_status) VALUES(?,?,?,?,1,?,?,?,?,?,?)",user,account,passwordHash,phone,studentNo,name,emptyNull(gender),birthDate,classId,enrollmentStatus);}
    case "DORM_MANAGER"->db.update("INSERT INTO dorm_manager_profile(manager_user_id,login_account,password_hash,phone,enabled,employee_no,manager_name,gender,birth_date,hire_date,on_duty) VALUES(?,?,?,?,1,?,?,?,?,?,?)",user,account,passwordHash,phone,emptyNull(employeeNo),name,emptyNull(gender),nullableDate(b,"birthDate"),nullableDate(b,"hireDate"),b.containsKey("onDuty")?flag(b,"onDuty"):true);
    case "REPAIRER"->db.update("INSERT INTO repairer_profile(repairer_user_id,login_account,password_hash,phone,enabled,employee_no,repairer_name,gender,birth_date,hire_date,on_duty) VALUES(?,?,?,?,1,?,?,?,?,?,?)",user,account,passwordHash,phone,emptyNull(employeeNo),name,emptyNull(gender),nullableDate(b,"birthDate"),nullableDate(b,"hireDate"),b.containsKey("onDuty")?flag(b,"onDuty"):true);
    case "ADMIN"->db.update("INSERT INTO system_admin_profile(admin_user_id,login_account,password_hash,phone,enabled,employee_no,admin_name,gender,birth_date,hire_date) VALUES(?,?,?,?,1,?,?,?,?,?)",user,account,passwordHash,phone,emptyNull(employeeNo),name,emptyNull(gender),nullableDate(b,"birthDate"),nullableDate(b,"hireDate"));
   }
  }
 private Map<String,Object> profileByRole(String roleCode,long user){return switch(roleCode){case "STUDENT"->db.one("SELECT * FROM student WHERE student_id=?",user);case "DORM_MANAGER"->db.one("SELECT * FROM dorm_manager_profile WHERE manager_user_id=?",user);case "REPAIRER"->db.one("SELECT * FROM repairer_profile WHERE repairer_user_id=?",user);case "ADMIN"->db.one("SELECT * FROM system_admin_profile WHERE admin_user_id=?",user);default->throw BizException.forbidden();};}
 private boolean employeeNumberAvailable(String roleCode,String employeeNo,Long user){
  long excluded=user==null?0:user;
  long managerExcluded=roleCode.equals("DORM_MANAGER")?excluded:-1;
  long repairerExcluded=roleCode.equals("REPAIRER")?excluded:-1;
  long adminExcluded=roleCode.equals("ADMIN")?excluded:-1;
  return db.count("SELECT (SELECT COUNT(*) FROM dorm_manager_profile WHERE employee_no=? AND manager_user_id<>?)+(SELECT COUNT(*) FROM repairer_profile WHERE employee_no=? AND repairer_user_id<>?)+(SELECT COUNT(*) FROM system_admin_profile WHERE employee_no=? AND admin_user_id<>?)",employeeNo,managerExcluded,employeeNo,repairerExcluded,employeeNo,adminExcluded)==0;
 }
  private String identityTable(String roleCode){return switch(roleCode){case "STUDENT"->"student";case "DORM_MANAGER"->"dorm_manager_profile";case "REPAIRER"->"repairer_profile";case "ADMIN"->"system_admin_profile";default->throw BizException.forbidden();};}
  private String identityKey(String roleCode){return switch(roleCode){case "STUDENT"->"student_id";case "DORM_MANAGER"->"manager_user_id";case "REPAIRER"->"repairer_user_id";case "ADMIN"->"admin_user_id";default->throw BizException.forbidden();};}
 private String identityTableByUser(long user){return identityTable(Objects.toString(db.one("SELECT role_code FROM v_user_identity WHERE user_id=?",user).get("role_code"),""));}
 private String identityKeyByUser(long user){return identityKey(Objects.toString(db.one("SELECT role_code FROM v_user_identity WHERE user_id=?",user).get("role_code"),""));}
  private Object nullableDate(Map<String,?> b,String key){String value=text(b,key);return value.isBlank()?null:date(value);}
 private Object nullableId(Map<String,?> b,String key){String value=text(b,key);return value.isBlank()?null:id(value);}
 private Object emptyNull(String value){return value==null||value.isBlank()?null:value;}
 private void validateClass(Object classId){if(classId!=null)require(db.count("SELECT COUNT(*) FROM student_class WHERE class_id=? AND enabled=1",classId)==1,"所选班级不存在或已停用");}
 private void validateClass(Object classId,Object existingClassId){if(classId!=null&&!Objects.equals(Objects.toString(classId),Objects.toString(existingClassId)))validateClass(classId);}
 @Transactional public void enabled(CurrentUser u,long user,boolean enabled){role(u,"ADMIN");require(user!=u.id()||enabled,"不能禁用自己的账号");String table=identityTableByUser(user),key=identityKeyByUser(user);db.one("SELECT "+key+" FROM "+table+" WHERE "+key+"=? FOR UPDATE",user);db.update("UPDATE "+table+" SET enabled=? WHERE "+key+"=?",enabled,user);db.log(u.id(),"auth",enabled?"enable":"disable",user);}
 private boolean hasBusinessHistory(long user){
  return db.count("SELECT (SELECT COUNT(*) FROM repair_order WHERE student_id=?)+(SELECT COUNT(*) FROM repair_dispatch WHERE repairer_user_id=?)+(SELECT COUNT(*) FROM repair_result WHERE repairer_user_id=?)+(SELECT COUNT(*) FROM repair_audit WHERE reviewer_user_id=?)+(SELECT COUNT(*) FROM repair_delay_request WHERE repairer_user_id=?)+(SELECT COUNT(*) FROM repair_delay_request WHERE reviewer_user_id=?)+(SELECT COUNT(*) FROM accommodation_assignment WHERE student_id=?)+(SELECT COUNT(*) FROM stay_application WHERE student_id=?)+(SELECT COUNT(*) FROM stay_application WHERE reviewer_user_id=?)+(SELECT COUNT(*) FROM stay_review WHERE reviewer_user_id=?)+(SELECT COUNT(*) FROM file_resource WHERE uploader_user_id=?)+(SELECT COUNT(*) FROM backup_task WHERE initiated_by_user_id=?)+(SELECT COUNT(*) FROM import_export_task WHERE initiated_by_user_id=?)+(SELECT COUNT(*) FROM site_message WHERE publisher_user_id=?)",user,user,user,user,user,user,user,user,user,user,user,user,user,user)>0;
 }
 @Transactional public boolean deleteUser(CurrentUser u,long user){
  role(u,"ADMIN");require(user!=u.id(),"不能删除自己的账号");
  var account=db.one("SELECT role_code FROM v_user_identity WHERE user_id=? FOR UPDATE",user);
  if(hasBusinessHistory(user)){
   String table=identityTable(Objects.toString(account.get("role_code"),"")),key=identityKey(Objects.toString(account.get("role_code"),""));
   db.update("UPDATE "+table+" SET enabled=0 WHERE "+key+"=?",user);
   if("REPAIRER".equals(account.get("role_code")))db.update("UPDATE repairer_profile SET on_duty=0 WHERE repairer_user_id=?",user);
   db.log(u.id(),"auth","disable_keep_history",user);
   return false;
  }
  db.update("DELETE FROM manager_building_scope WHERE manager_user_id=?",user);
  db.update("DELETE FROM repairer_work_type WHERE repairer_user_id=?",user);
  db.update("DELETE FROM repairer_building_scope WHERE repairer_user_id=?",user);
   db.update("DELETE FROM repairer_profile WHERE repairer_user_id=?",user);
   db.update("DELETE FROM dorm_manager_profile WHERE manager_user_id=?",user);
   db.update("DELETE FROM system_admin_profile WHERE admin_user_id=?",user);
  db.update("DELETE FROM message_receipt WHERE user_id=?",user);
  db.update("DELETE FROM message_target WHERE user_id=?",user);
  db.update("DELETE FROM student WHERE student_id=?",user);
  db.update("DELETE FROM person WHERE person_id=?",user);
  db.log(u.id(),"auth","delete",user);
  return true;
 }
 @Transactional public Map<String,Object> deleteUsers(CurrentUser u,List<Long> users){
  role(u,"ADMIN");require(!users.isEmpty()&&new HashSet<>(users).size()==users.size(),"请选择要删除的账号");
  int deleted=0,disabled=0;
  for(long user:users){if(deleteUser(u,user))deleted++;else disabled++;}
  return Map.of("deletedCount",deleted,"disabledCount",disabled);
 }
 @Transactional public long resource(CurrentUser u,String type,Long resourceId,Map<String,Object>b){
  role(u,"ADMIN");long n;
  switch(type){
   case "buildings"->{
    String gender=required(b,"genderLimit");require(Set.of("男生","女生","混合").contains(gender),"楼栋性别限制无效");
    if(resourceId==null)n=db.insert("INSERT INTO building(building_code,building_name,address,gender_limit) VALUES(?,?,?,?)",required(b,"buildingCode"),required(b,"buildingName"),required(b,"address"),gender);
    else{
     n=resourceId;db.one("SELECT building_id FROM building WHERE building_id=? FOR UPDATE",n);
     if(!gender.equals("混合")){
      String opposite=gender.equals("男生")?"FEMALE":"MALE";
      require(db.count("SELECT COUNT(*) FROM v_accommodation_current a JOIN student s ON s.student_id=a.student_id WHERE a.building_id=? AND s.gender=?",n,opposite)==0,gender.equals("男生")?"该楼已有女生入住，不能改为男生楼":"该楼已有男生入住，不能改为女生楼");
      db.update("UPDATE dorm_room SET gender_limit=? WHERE building_id=?",gender,n);
     }
     db.update("UPDATE building SET building_code=?,building_name=?,address=?,gender_limit=? WHERE building_id=?",required(b,"buildingCode"),required(b,"buildingName"),required(b,"address"),gender,n);
    }
   }
   case "rooms"->{
    long capacity=id(b.get("designCapacity"));require(capacity>0,"房间容量必须大于0");String roomGender=required(b,"genderLimit");require(Set.of("男生","女生").contains(roomGender),"宿舍性别必须选择男生或女生");
    if(resourceId==null){long building=id(b.get("buildingId"));var parent=db.one("SELECT gender_limit FROM building WHERE building_id=?",building);require("混合".equals(parent.get("gender_limit"))||roomGender.equals(parent.get("gender_limit")),"宿舍性别必须与楼栋性别一致");require(db.count("SELECT COUNT(*) FROM dorm_room WHERE building_id=? AND room_no=?",building,required(b,"roomNo"))==0,"该楼栋已存在同名宿舍");n=db.insert("INSERT INTO dorm_room(building_id,room_no,floor_no,design_capacity,gender_limit) VALUES(?,?,?,?,?)",building,required(b,"roomNo"),id(b.get("floorNo")),capacity,roomGender);}
    else{n=resourceId;var old=db.one("SELECT r.building_id,b.gender_limit FROM dorm_room r JOIN building b ON b.building_id=r.building_id WHERE r.room_id=? FOR UPDATE",n);require("混合".equals(old.get("gender_limit"))||roomGender.equals(old.get("gender_limit")),"宿舍性别必须与楼栋性别一致");require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=?",n)<=capacity,"容量不能少于已建床位数");String opposite=roomGender.equals("男生")?"FEMALE":"MALE";require(db.count("SELECT COUNT(*) FROM v_accommodation_current a JOIN student s ON s.student_id=a.student_id JOIN bed bd ON bd.bed_id=a.bed_id WHERE bd.room_id=? AND s.gender=?",n,opposite)==0,"宿舍已有异性学生入住，不能修改宿舍性别");require(db.count("SELECT COUNT(*) FROM dorm_room WHERE building_id=? AND room_no=? AND room_id<>?",old.get("building_id"),required(b,"roomNo"),n)==0,"该楼栋已存在同名宿舍");db.update("UPDATE dorm_room SET room_no=?,floor_no=?,design_capacity=?,gender_limit=? WHERE room_id=?",required(b,"roomNo"),id(b.get("floorNo")),capacity,roomGender,n);}
   }
   case "beds"->{
    long room=id(b.get("roomId"));var targetRoom=db.one("SELECT * FROM dorm_room WHERE room_id=? FOR UPDATE",room);String status=required(b,"managementStatus");require(Set.of("AVAILABLE","DISABLED").contains(status),"床位状态无效");String bedNo=required(b,"bedNo");
    if(resourceId==null){require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=?",room)<id(targetRoom.get("design_capacity")),"床位数已达到房间容量");require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=? AND bed_no=?",room,bedNo)==0,"该宿舍已存在同名床位");n=db.insert("INSERT INTO bed(room_id,bed_no,management_status) VALUES(?,?,?)",room,bedNo,status);}
    else{n=resourceId;var old=db.one("SELECT * FROM bed WHERE bed_id=? FOR UPDATE",n);if(status.equals("DISABLED")&&b.containsKey("studentId")&&text(b,"studentId").isBlank())setBedOccupant(u,n,b);if(id(old.get("room_id"))!=room){require(db.count("SELECT COUNT(*) FROM accommodation_assignment WHERE bed_id=?",n)==0,"存在住宿历史的床位不能移动到其他宿舍");require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=?",room)<id(targetRoom.get("design_capacity")),"目标宿舍床位数已达到容量");}require(!status.equals("DISABLED")||db.count("SELECT COUNT(*) FROM v_accommodation_current WHERE bed_id=?",n)==0,"已分配床位不能停用");require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=? AND bed_no=? AND bed_id<>?",room,bedNo,n)==0,"该宿舍已存在同名床位");db.update("UPDATE bed SET room_id=?,bed_no=?,management_status=? WHERE bed_id=?",room,bedNo,status,n);}
   }
   default->throw new BizException(404,"未知资源");
  }
  if(type.equals("rooms")&&resourceId!=null&&b.containsKey("occupants"))setRoomOccupants(u,n,b);
  if(type.equals("beds")&&resourceId!=null&&b.containsKey("studentId")&&!"DISABLED".equals(b.get("managementStatus")))setBedOccupant(u,n,b);
  db.log(u.id(),"dorm",type,n);return n;
 }
 @Transactional public void deleteResources(CurrentUser u,String type,List<Long> ids){
  role(u,"ADMIN");require(!ids.isEmpty()&&new HashSet<>(ids).size()==ids.size(),"请选择要删除的记录");
  for(long id:ids){
   switch(type){
    case "buildings"->{db.one("SELECT building_id FROM building WHERE building_id=? FOR UPDATE",id);require(db.count("SELECT COUNT(*) FROM dorm_room WHERE building_id=?",id)==0&&db.count("SELECT COUNT(*) FROM manager_building_scope WHERE building_id=?",id)==0&&db.count("SELECT COUNT(*) FROM repairer_building_scope WHERE building_id=?",id)==0&&db.count("SELECT COUNT(*) FROM stay_building_rule WHERE building_id=?",id)==0,"楼栋仍有关联宿舍、宿管、维修范围或留宿规则，不能删除");}
    case "rooms"->{db.one("SELECT room_id FROM dorm_room WHERE room_id=? FOR UPDATE",id);require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=?",id)==0&&db.count("SELECT COUNT(*) FROM repair_order WHERE room_id=?",id)==0,"宿舍仍有关联床位或报修记录，不能删除");}
    case "beds"->{db.one("SELECT bed_id FROM bed WHERE bed_id=? FOR UPDATE",id);require(db.count("SELECT COUNT(*) FROM accommodation_assignment WHERE bed_id=?",id)==0,"床位存在住宿历史，不能删除");}
    default->throw new BizException(404,"未知资源");
   }
  }
  String table=switch(type){case "buildings"->"building";case "rooms"->"dorm_room";case "beds"->"bed";default->throw new BizException(404,"未知资源");};
  String idColumn=switch(type){case "buildings"->"building_id";case "rooms"->"room_id";default->"bed_id";};
  for(long id:ids){db.update("DELETE FROM "+table+" WHERE "+idColumn+"=?",id);db.log(u.id(),"dorm",type+"_delete",id);}
 }
 @Transactional public void setRoomOccupants(CurrentUser u,long roomId,Map<String,Object>b){
  role(u,"ADMIN");var room=db.one("SELECT r.*,b.gender_limit building_gender FROM dorm_room r JOIN building b ON b.building_id=r.building_id WHERE r.room_id=? FOR UPDATE",roomId);
  var beds=db.rows("SELECT bed_id,management_status FROM bed WHERE room_id=? ORDER BY bed_no FOR UPDATE",roomId);require(!beds.isEmpty(),"该宿舍尚未建立床位");
  Object raw=b.get("occupants");require(raw instanceof List<?> entries&&entries.size()==beds.size(),"请为宿舍内每个床位提交入住选择");
  Map<Long,Long> requested=new LinkedHashMap<>();Set<Long> selectedStudents=new HashSet<>();
  for(Object item:(List<?>)raw){require(item instanceof Map<?,?>,"床位入住数据无效");Map<?,?> row=(Map<?,?>)item;long bed=id(row.get("bedId"));require(beds.stream().anyMatch(x->id(x.get("bed_id"))==bed),"床位不属于当前宿舍");Object rawStudent=row.get("studentId");Long student=rawStudent==null||Objects.toString(rawStudent,"").isBlank()?null:id(rawStudent);require(!requested.containsKey(bed),"床位重复");requested.put(bed,student);if(student!=null)require(selectedStudents.add(student),"同一学生不能选择多个床位");}
  require(requested.size()==beds.size(),"请为宿舍内每个床位提交入住选择");
  var current=db.rows("SELECT a.assignment_id,a.student_id,a.bed_id FROM accommodation_assignment a JOIN bed bd ON bd.bed_id=a.bed_id WHERE bd.room_id=? AND a.check_in_date<=CURRENT_DATE() AND (a.check_out_date IS NULL OR a.check_out_date>CURRENT_DATE()) FOR UPDATE",roomId);
  Map<Long,Long> currentByStudent=new HashMap<>();for(var row:current){long student=id(row.get("student_id"));currentByStudent.put(student,id(row.get("bed_id")));}
  String roomGender=Objects.toString(room.get("gender_limit"),"");
  for(var entry:requested.entrySet()){
   if(entry.getValue()==null)continue;long student=entry.getValue();
   var targetBed=beds.stream().filter(x->id(x.get("bed_id"))==entry.getKey()).findFirst().orElseThrow();
   require("AVAILABLE".equals(targetBed.get("management_status"))||Objects.equals(currentByStudent.get(student),entry.getKey()),"停用床位不能安排新的入住学生");
   var person=db.one("SELECT student_id,gender,enabled,enrollment_status FROM student WHERE student_id=? FOR UPDATE",student);
   boolean existing=currentByStudent.containsKey(student);require(existing||(Input.flag(person,"enabled")&&"ENROLLED".equals(person.get("enrollment_status"))),"只能选择当前宿舍学生或已启用的在读未分配学生");
   var other=db.rows("SELECT room_id FROM v_accommodation_current WHERE student_id=?",student);require(other.isEmpty()||Objects.equals(id(other.get(0).get("room_id")),roomId),"所选学生已分配在其他宿舍");
   require(genderMatchesRoom(Objects.toString(person.get("gender"),""),roomGender),"学生性别与宿舍性别不一致");
  }
  for(var row:current){long student=id(row.get("student_id")),bed=id(row.get("bed_id"));Long target=requested.get(bed);if(!Objects.equals(target,student))db.update("UPDATE accommodation_assignment SET check_out_date=CURRENT_DATE() WHERE assignment_id=?",id(row.get("assignment_id")));}
  for(var entry:requested.entrySet()){Long student=entry.getValue();if(student==null||Objects.equals(currentByStudent.get(student),entry.getKey()))continue;db.update("INSERT INTO accommodation_assignment(student_id,bed_id,check_in_date,assignment_type) VALUES(?,?,CURRENT_DATE(),'ASSIGN')",student,entry.getKey());}
  db.log(u.id(),"dorm","room_occupants",roomId);
 }
 @Transactional public void setBedOccupant(CurrentUser u,long bedId,Map<String,Object>b){
  role(u,"ADMIN");db.one("SELECT bed_id FROM bed WHERE bed_id=? FOR UPDATE",bedId);
  String raw=text(b,"studentId").trim();Long student=raw.isEmpty()?null:id(raw);
  var current=db.rows("SELECT assignment_id,student_id FROM accommodation_assignment WHERE bed_id=? AND check_in_date<=CURRENT_DATE() AND (check_out_date IS NULL OR check_out_date>CURRENT_DATE()) FOR UPDATE",bedId);
  if(student!=null&&current.size()==1&&id(current.get(0).get("student_id"))==student)return;
  for(var row:current)db.update("UPDATE accommodation_assignment SET check_out_date=CURRENT_DATE() WHERE assignment_id=?",id(row.get("assignment_id")));
  if(student!=null)assign(u,Map.of("studentId",student,"bedId",bedId));
  else db.log(u.id(),"dorm","bed_occupant",bedId);
 }
 @Transactional public void assign(CurrentUser u,Map<String,Object>b){
  role(u,"ADMIN");long student=id(b.get("studentId")),bed=id(b.get("bedId"));
  var studentRecord=db.one("SELECT s.student_id,s.gender FROM student s WHERE s.student_id=? AND s.enabled=1 FOR UPDATE",student);
  var target=db.one("SELECT bd.*,r.gender_limit room_gender_limit,b.gender_limit FROM bed bd JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id WHERE bd.bed_id=? FOR UPDATE",bed);
  require("AVAILABLE".equals(target.get("management_status")),"床位已停用");
  String gender=Objects.toString(studentRecord.get("gender"),"OTHER");
  String genderLimit=Objects.toString(target.get("room_gender_limit"),"");
  require(genderMatchesRoom(gender,genderLimit),"学生性别与宿舍性别限制不匹配");
  var current=db.rows("SELECT assignment_id,bed_id FROM accommodation_assignment WHERE student_id=? AND check_in_date<=CURRENT_DATE() AND (check_out_date IS NULL OR check_out_date>CURRENT_DATE()) ORDER BY assignment_id DESC LIMIT 1 FOR UPDATE",student);
  if(!current.isEmpty()&&id(current.get(0).get("bed_id"))==bed)return;
  require(db.count("SELECT COUNT(*) FROM v_accommodation_current WHERE bed_id=? AND student_id<>?",bed,student)==0,"床位已占用");
  db.update("UPDATE accommodation_assignment SET check_out_date=CURRENT_DATE() WHERE student_id=? AND check_out_date IS NULL",student);
  long assignment=db.insert("INSERT INTO accommodation_assignment(student_id,bed_id,check_in_date,assignment_type) VALUES(?,?,CURRENT_DATE(),'ASSIGN')",student,bed);
  db.log(u.id(),"dorm","assign",assignment);
 }
 @Transactional public void checkout(CurrentUser u,long assignment){role(u,"ADMIN");require(db.update("UPDATE accommodation_assignment SET check_out_date=CURRENT_DATE() WHERE assignment_id=? AND check_out_date IS NULL",assignment)==1,"当前记录已退宿");db.log(u.id(),"dorm","checkout",assignment);}
 private boolean genderMatchesRoom(String studentGender,String roomGender){return ("MALE".equals(studentGender)&&"男生".equals(roomGender))||("FEMALE".equals(studentGender)&&"女生".equals(roomGender));}
 public Map<String,Object> academicStructure(CurrentUser u){
  role(u,"ADMIN");
  return Map.of("departments",db.rows("SELECT * FROM department ORDER BY department_name"),"majors",db.rows("SELECT m.*,d.department_name FROM major m JOIN department d ON d.department_id=m.department_id ORDER BY d.department_name,m.major_name"),"classes",db.rows("SELECT c.*,m.major_name,d.department_name FROM student_class c JOIN major m ON m.major_id=c.major_id JOIN department d ON d.department_id=m.department_id ORDER BY c.enrollment_year DESC,c.class_name"));
 }
 @Transactional public long academicResource(CurrentUser u,String type,Long resourceId,Map<String,Object>b){
  role(u,"ADMIN");long result;boolean enabled=b.containsKey("enabled")?flag(b,"enabled"):true;
  switch(type){
   case "departments"->{String code=required(b,"code"),name=required(b,"name");if(resourceId==null)result=db.insert("INSERT INTO department(department_code,department_name,enabled) VALUES(?,?,?)",code,name,enabled);else{result=resourceId;db.update("UPDATE department SET department_code=?,department_name=?,enabled=? WHERE department_id=?",code,name,enabled,result);}}
   case "majors"->{long department=id(b.get("departmentId"));db.one("SELECT department_id FROM department WHERE department_id=?",department);String code=required(b,"code"),name=required(b,"name");if(resourceId==null)result=db.insert("INSERT INTO major(department_id,major_code,major_name,enabled) VALUES(?,?,?,?)",department,code,name,enabled);else{result=resourceId;db.update("UPDATE major SET department_id=?,major_code=?,major_name=?,enabled=? WHERE major_id=?",department,code,name,enabled,result);}}
   case "classes"->{long major=id(b.get("majorId"));db.one("SELECT major_id FROM major WHERE major_id=?",major);String code=required(b,"code"),name=required(b,"name"),year=text(b,"enrollmentYear");Object enrollmentYear=null;if(!year.isBlank()){int parsed;try{parsed=Integer.parseInt(year);}catch(NumberFormatException e){throw new BizException(400,"入学年份格式无效");}require(parsed>=1900&&parsed<=2200,"入学年份无效");enrollmentYear=parsed;}if(resourceId==null)result=db.insert("INSERT INTO student_class(major_id,class_code,class_name,enrollment_year,enabled) VALUES(?,?,?,?,?)",major,code,name,enrollmentYear,enabled);else{result=resourceId;db.update("UPDATE student_class SET major_id=?,class_code=?,class_name=?,enrollment_year=?,enabled=? WHERE class_id=?",major,code,name,enrollmentYear,enabled,result);}}
   default->throw new BizException(404,"未知学籍字典");
  }
  db.log(u.id(),"student",resourceId==null?"academic_create":"academic_update",result);return result;
 }
 public Map<String,Object> config(CurrentUser u){role(u,"ADMIN");var workers=db.rows("SELECT repairer_user_id,employee_no,repairer_name real_name,on_duty,max_active_orders FROM v_repairer_profile ORDER BY repairer_user_id");for(var w:workers){w.put("workTypeIds",db.rows("SELECT work_type_id FROM repairer_work_type WHERE repairer_user_id=?",w.get("repairer_user_id")).stream().map(x->x.get("work_type_id")).toList());w.put("buildingIds",db.rows("SELECT building_id FROM repairer_building_scope WHERE repairer_user_id=?",w.get("repairer_user_id")).stream().map(x->x.get("building_id")).toList());}return Map.of("rule",db.one("SELECT * FROM repair_rule ORDER BY rule_id DESC LIMIT 1"),"workers",workers,"categories",db.rows("SELECT * FROM fault_category"),"workTypes",db.rows("SELECT * FROM repair_work_type"));}
 @Transactional public void saveRule(CurrentUser u,Map<String,Object>b){role(u,"ADMIN");for(String key:List.of("accept_minutes","normal_minutes","urgent_minutes","confirm_days"))require(id(b.get(key))>0,"时限必须大于0");long confirmDays=id(b.get("confirm_days"));Object max=text(b,"max_rework_count").isBlank()?null:id(b.get("max_rework_count"));require(max==null||id(max)>=0,"重修次数不能小于0");long n=db.insert("INSERT INTO repair_rule(accept_minutes,normal_minutes,urgent_minutes,confirm_days,edit_days,max_rework_count) VALUES(?,?,?,?,?,?)",id(b.get("accept_minutes")),id(b.get("normal_minutes")),id(b.get("urgent_minutes")),confirmDays,confirmDays,max);db.log(u.id(),"repair","rule_version",n);}
  @Transactional public void managerScope(CurrentUser u,long manager,Map<String,Object>b){
   role(u,"ADMIN");db.one("SELECT manager_user_id FROM dorm_manager_profile WHERE manager_user_id=? FOR UPDATE",manager);
   String raw=text(b,"buildingId").trim();Long building=raw.isEmpty()?null:id(raw);
   if(building!=null){
    require(db.count("SELECT COUNT(*) FROM building WHERE building_id=?",building)==1,"楼栋不存在");
    require(db.count("SELECT COUNT(*) FROM manager_building_scope WHERE building_id=? AND manager_user_id<>?",building,manager)==0,"该楼栋已由其他宿管负责");
   }
   db.update("DELETE FROM manager_building_scope WHERE manager_user_id=?",manager);
   if(building!=null)db.update("INSERT INTO manager_building_scope(manager_user_id,building_id) VALUES(?,?)",manager,building);
   db.log(u.id(),"dorm","manager_scope",manager);
  }
 @Transactional public void worker(CurrentUser u,long worker,Map<String,Object>b){role(u,"ADMIN");db.one("SELECT repairer_user_id FROM repairer_profile WHERE repairer_user_id=? FOR UPDATE",worker);Object max=text(b,"maxActiveOrders").isBlank()?null:id(b.get("maxActiveOrders"));require(max==null||id(max)>0,"最大在办数必须大于0");db.update("UPDATE repairer_profile SET on_duty=?,max_active_orders=? WHERE repairer_user_id=?",flag(b,"onDuty"),max,worker);db.update("DELETE FROM repairer_work_type WHERE repairer_user_id=?",worker);db.update("DELETE FROM repairer_building_scope WHERE repairer_user_id=?",worker);for(Object v:(b.get("workTypeIds") instanceof List<?> a?a:List.of()))db.update("INSERT INTO repairer_work_type(repairer_user_id,work_type_id) VALUES(?,?)",worker,id(v));for(Object v:(b.get("buildingIds") instanceof List<?> a?a:List.of()))db.update("INSERT INTO repairer_building_scope(repairer_user_id,building_id) VALUES(?,?)",worker,id(v));db.log(u.id(),"repair","worker_scope",worker);}
 @Transactional public void dictionary(CurrentUser u,String type,Long n,Map<String,Object>b){role(u,"ADMIN");if(type.equals("work-types")){if(n==null)db.update("INSERT INTO repair_work_type(work_type_code,work_type_name) VALUES(?,?)",required(b,"code"),required(b,"name"));else db.update("UPDATE repair_work_type SET work_type_name=?,enabled=? WHERE work_type_id=?",required(b,"name"),flag(b,"enabled"),n);}else if(type.equals("categories")){if(n==null)db.update("INSERT INTO fault_category(work_type_id,category_name) VALUES(?,?)",id(b.get("workTypeId")),required(b,"name"));else db.update("UPDATE fault_category SET category_name=?,work_type_id=?,enabled=? WHERE category_id=?",required(b,"name"),id(b.get("workTypeId")),flag(b,"enabled"),n);}else throw new BizException(404,"未知字典");db.log(u.id(),"repair",type,n==null?0:n);}
 public List<Map<String,Object>> logs(CurrentUser u,Map<String,String> filters){role(u,"ADMIN");StringBuilder sql=new StringBuilder("SELECT l.*,u.real_name FROM operation_log l LEFT JOIN v_user_identity u ON u.user_id=l.operator_user_id WHERE 1=1");List<Object> args=new ArrayList<>();addLike(sql,args,"u.real_name",filters.get("operator"));addLike(sql,args,"l.module",filters.get("module"));String from=Objects.toString(filters.get("from"),"").trim(),to=Objects.toString(filters.get("to"),"").trim();if(!from.isEmpty()){sql.append(" AND l.occurred_at>=?");args.add(from+" 00:00:00");}if(!to.isEmpty()){sql.append(" AND l.occurred_at<DATE_ADD(?,INTERVAL 1 DAY)");args.add(to);}sql.append(" ORDER BY l.log_id DESC LIMIT 500");return db.rows(sql.toString(),args.toArray());}
 @Transactional public void importRows(CurrentUser u,String type,List<Map<String,Object>>rows){role(u,"ADMIN");require(!rows.isEmpty()&&rows.size()<=1000,"单次导入1到1000条");for(int i=0;i<rows.size();i++){try{switch(type){case "users":saveUser(u,null,rows.get(i));break;case "assignments":assign(u,rows.get(i));break;case "buildings":case "rooms":case "beds":resource(u,type,null,rows.get(i));break;default:throw new BizException(400,"不支持该导入类型");}}catch(RuntimeException e){throw new BizException(400,"第"+(i+1)+"条导入失败，整批未保存："+e.getMessage());}}}
}
