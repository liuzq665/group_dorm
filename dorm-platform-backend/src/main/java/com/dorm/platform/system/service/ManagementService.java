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
 public List<Map<String,Object>> homes(CurrentUser u,boolean history){role(u,"STUDENT","DORM_MANAGER","ADMIN");String filter=u.role().equals("STUDENT")?"a.student_id="+u.id():scope.buildingFilter(u,"r.building_id");return db.rows("SELECT a.*,s.student_name,s.phone,b.building_id,b.building_name,r.room_id,r.room_no,bd.bed_no FROM accommodation_assignment a JOIN student s ON s.student_id=a.student_id JOIN bed bd ON bd.bed_id=a.bed_id JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id WHERE "+filter+(history?"":" AND a.check_in_date<=CURRENT_DATE() AND (a.check_out_date IS NULL OR a.check_out_date>CURRENT_DATE())")+" ORDER BY a.assignment_id DESC");}
 public List<Map<String,Object>> roommates(CurrentUser u){role(u,"STUDENT");return db.rows("SELECT student_name,bed_no FROM v_accommodation_current WHERE room_id IN (SELECT room_id FROM v_accommodation_current WHERE student_id=?) AND student_id<>?",u.id(),u.id());}
 public List<Map<String,Object>> buildings(CurrentUser u){
  role(u,"STUDENT","DORM_MANAGER","ADMIN");
  String filter=u.role().equals("STUDENT")?"b.building_id IN (SELECT building_id FROM v_accommodation_current WHERE student_id="+u.id()+")":scope.buildingFilter(u,"b.building_id");
  return db.rows("SELECT b.*,COUNT(DISTINCT r.room_id) room_count,COUNT(bd.bed_id) bed_count,(SELECT COUNT(*) FROM v_accommodation_current a WHERE a.building_id=b.building_id) occupied_count FROM building b LEFT JOIN dorm_room r ON r.building_id=b.building_id LEFT JOIN bed bd ON bd.room_id=r.room_id WHERE "+filter+" GROUP BY b.building_id ORDER BY b.building_code");
 }
 public List<Map<String,Object>> rooms(CurrentUser u){role(u,"DORM_MANAGER","ADMIN");return db.rows("SELECT r.*,b.building_name FROM dorm_room r JOIN building b ON b.building_id=r.building_id WHERE "+scope.buildingFilter(u,"r.building_id")+" ORDER BY r.building_id,r.room_no");}
 public List<Map<String,Object>> beds(CurrentUser u){role(u,"DORM_MANAGER","ADMIN");return db.rows("SELECT bd.*,r.building_id,r.room_no,b.building_name,b.gender_limit,a.student_name,a.student_id FROM bed bd JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id LEFT JOIN v_accommodation_current a ON a.bed_id=bd.bed_id WHERE "+scope.buildingFilter(u,"r.building_id")+" ORDER BY b.building_id,r.room_no,bd.bed_no");}
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
  String phone=contact(b,"phone");
  String name=text(b,"realName");if(name.isBlank())name=Objects.toString(current.get("real_name"),"");
  String gender=b.containsKey("gender")?text(b,"gender"):Objects.toString(current.get("gender"),"");
  require(gender.isBlank()||Set.of("MALE","FEMALE").contains(gender),"性别无效");
  Object birthDate=b.containsKey("birthDate")?nullableDate(b,"birthDate"):current.get("birth_date");
  switch(u.role()){
   case "STUDENT"->db.update("UPDATE student SET phone=?,student_name=?,gender=?,birth_date=? WHERE student_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,u.id());
   case "DORM_MANAGER"->db.update("UPDATE dorm_manager_profile SET phone=?,manager_name=?,gender=?,birth_date=? WHERE manager_user_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,u.id());
   case "REPAIRER"->db.update("UPDATE repairer_profile SET phone=?,repairer_name=?,gender=?,birth_date=? WHERE repairer_user_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,u.id());
   case "ADMIN"->{
    Object hireDate=b.containsKey("hireDate")?nullableDate(b,"hireDate"):current.get("hire_date");
    db.update("UPDATE system_admin_profile SET phone=?,admin_name=?,gender=?,birth_date=?,hire_date=? WHERE admin_user_id=?",phone.isBlank()?null:phone,name,emptyNull(gender),birthDate,hireDate,u.id());
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
   String name=required(b,"realName"),gender=text(b,"gender");
   require(gender.isBlank()||Set.of("MALE","FEMALE").contains(gender),"性别无效");
   String enrollmentStatus=text(b,"enrollmentStatus");
   if(roleCode.equals("STUDENT")){
    if(enrollmentStatus.isBlank())enrollmentStatus="ENROLLED";
    require(Set.of("ENROLLED","SUSPENDED","GRADUATED","WITHDRAWN","UNKNOWN").contains(enrollmentStatus),"学籍状态无效");
   }
   String phone=contact(b,"phone"),account=required(b,"account");
   require(account.length()<=60,"账号最多60位");
   Object birthDate=nullableDate(b,"birthDate");
   long user;
   if(userId==null){
    String password=required(b,"password");
    require(password.length()>=6&&password.length()<=100,"密码长度必须为6到100位");
    require(db.count("SELECT COUNT(*) FROM v_user_identity WHERE login_account=?",account)==0,"账号已存在");
    user=db.insert("INSERT INTO person() VALUES ()");
    String identityNo=generatedIdentityNumber(roleCode,user,b.get("classId"));
    require(identityNumberAvailable(roleCode,identityNo),"编号生成冲突，请重试");
    createRoleProfile(roleCode,user,b,name,identityNo,gender,birthDate,enrollmentStatus,account,AuthService.sha256(password),emptyNull(phone));
   }else{
    user=userId;
    db.one("SELECT person_id FROM person WHERE person_id=? FOR UPDATE",user);
    var old=db.one("SELECT * FROM v_user_identity WHERE user_id=?",user);
    require(roleCode.equals(old.get("role_code")),"不能通过角色资料修改人员角色");
    Map<String,Object> oldProfile=profileByRole(roleCode,user);
    String identityNo=Objects.toString(roleCode.equals("STUDENT")?oldProfile.get("student_no"):oldProfile.get("employee_no"),"").trim();
    require(!identityNo.isBlank(),"编号缺失，请联系系统维护人员");
    requireIdentityUnchanged(b,roleCode,identityNo);
    if(account.isBlank())account=text(old,"login_account");
    require(db.count("SELECT COUNT(*) FROM v_user_identity WHERE login_account=? AND user_id<>?",account,user)==0,"账号已存在");
    String profileGender=b.containsKey("gender")?gender:Objects.toString(oldProfile.get("gender"),"");
    Object profileBirthDate=b.containsKey("birthDate")?birthDate:oldProfile.get("birth_date");
    switch(roleCode){
     case "STUDENT"->{
      Object classId=b.containsKey("classId")?nullableId(b,"classId"):oldProfile.get("class_id");
      validateClass(classId,oldProfile.get("class_id"));
      if(enrollmentStatus.isBlank())enrollmentStatus=Objects.toString(oldProfile.get("enrollment_status"),"UNKNOWN");
      require(Set.of("ENROLLED","SUSPENDED","GRADUATED","WITHDRAWN","UNKNOWN").contains(enrollmentStatus),"学籍状态无效");
      db.update("UPDATE student SET login_account=?,phone=?,student_no=?,student_name=?,gender=?,birth_date=?,class_id=?,enrollment_status=? WHERE student_id=?",account,emptyNull(phone),identityNo,name,emptyNull(profileGender),profileBirthDate,classId,enrollmentStatus,user);
     }
     case "DORM_MANAGER"->db.update("UPDATE dorm_manager_profile SET login_account=?,phone=?,employee_no=?,manager_name=?,gender=?,birth_date=?,hire_date=?,on_duty=? WHERE manager_user_id=?",account,emptyNull(phone),identityNo,name,emptyNull(profileGender),profileBirthDate,b.containsKey("hireDate")?nullableDate(b,"hireDate"):oldProfile.get("hire_date"),b.containsKey("onDuty")?flag(b,"onDuty"):oldProfile.get("on_duty"),user);
     case "REPAIRER"->db.update("UPDATE repairer_profile SET login_account=?,phone=?,employee_no=?,repairer_name=?,gender=?,birth_date=?,hire_date=? WHERE repairer_user_id=?",account,emptyNull(phone),identityNo,name,emptyNull(profileGender),profileBirthDate,b.containsKey("hireDate")?nullableDate(b,"hireDate"):oldProfile.get("hire_date"),user);
     case "ADMIN"->db.update("UPDATE system_admin_profile SET login_account=?,phone=?,employee_no=?,admin_name=?,gender=?,birth_date=?,hire_date=? WHERE admin_user_id=?",account,emptyNull(phone),identityNo,name,emptyNull(profileGender),profileBirthDate,b.containsKey("hireDate")?nullableDate(b,"hireDate"):oldProfile.get("hire_date"),user);
    }
    if(!text(b,"password").isBlank()){
     require(text(b,"password").length()>=6&&text(b,"password").length()<=100,"密码长度必须为6到100位");
     db.update("UPDATE "+identityTable(roleCode)+" SET password_hash=? WHERE "+identityKey(roleCode)+"=?",AuthService.sha256(text(b,"password")),user);
    }
   }
   if(roleCode.equals("STUDENT")&&!text(b,"bedId").isBlank())assign(u,Map.of("studentId",user,"bedId",id(b.get("bedId"))));
   if(roleCode.equals("DORM_MANAGER")&&b.containsKey("buildingIds"))managerScope(u,user,Map.of("buildingIds",b.get("buildingIds")));
   if(roleCode.equals("REPAIRER")&&(b.containsKey("buildingIds")||b.containsKey("workTypeIds"))){var settings=new HashMap<String,Object>(b);if(!settings.containsKey("onDuty"))settings.put("onDuty",true);worker(u,user,settings);}
   db.log(u.id(),"auth",userId==null?"create":"update",user);
   return user;
  }
  private void createRoleProfile(String roleCode,long user,Map<String,Object>b,String name,String identityNo,String gender,Object birthDate,String enrollmentStatus,String account,String passwordHash,Object phone){
   switch(roleCode){
    case "STUDENT"->{Object classId=nullableId(b,"classId");validateClass(classId);db.update("INSERT INTO student(student_id,login_account,password_hash,phone,enabled,student_no,student_name,gender,birth_date,class_id,enrollment_status) VALUES(?,?,?,?,1,?,?,?,?,?,?)",user,account,passwordHash,phone,identityNo,name,emptyNull(gender),birthDate,classId,enrollmentStatus);}
    case "DORM_MANAGER"->db.update("INSERT INTO dorm_manager_profile(manager_user_id,login_account,password_hash,phone,enabled,employee_no,manager_name,gender,birth_date,hire_date,on_duty) VALUES(?,?,?,?,1,?,?,?,?,?,?)",user,account,passwordHash,phone,identityNo,name,emptyNull(gender),nullableDate(b,"birthDate"),nullableDate(b,"hireDate"),b.containsKey("onDuty")?flag(b,"onDuty"):true);
    case "REPAIRER"->db.update("INSERT INTO repairer_profile(repairer_user_id,login_account,password_hash,phone,enabled,employee_no,repairer_name,gender,birth_date,hire_date,on_duty) VALUES(?,?,?,?,1,?,?,?,?,?,?)",user,account,passwordHash,phone,identityNo,name,emptyNull(gender),nullableDate(b,"birthDate"),nullableDate(b,"hireDate"),b.containsKey("onDuty")?flag(b,"onDuty"):true);
    case "ADMIN"->db.update("INSERT INTO system_admin_profile(admin_user_id,login_account,password_hash,phone,enabled,employee_no,admin_name,gender,birth_date,hire_date) VALUES(?,?,?,?,1,?,?,?,?,?)",user,account,passwordHash,phone,identityNo,name,emptyNull(gender),nullableDate(b,"birthDate"),nullableDate(b,"hireDate"));
   }
  }
 private Map<String,Object> profileByRole(String roleCode,long user){return switch(roleCode){case "STUDENT"->db.one("SELECT * FROM student WHERE student_id=?",user);case "DORM_MANAGER"->db.one("SELECT * FROM dorm_manager_profile WHERE manager_user_id=?",user);case "REPAIRER"->db.one("SELECT * FROM repairer_profile WHERE repairer_user_id=?",user);case "ADMIN"->db.one("SELECT * FROM system_admin_profile WHERE admin_user_id=?",user);default->throw BizException.forbidden();};}
 /** 学号/工号预览：按库内人员主键自增值生成固定格式编号，供新增页面只读展示。 */
 public Map<String,Object> nextIdentityNumber(CurrentUser u,String roleCode,String classId){
  role(u,"ADMIN");
  require(Set.of("STUDENT","DORM_MANAGER","REPAIRER","ADMIN").contains(roleCode),"角色无效");
  long next=nextPersonId();
  String number=generatedIdentityNumber(roleCode,next,classId);
  return Map.of("roleCode",roleCode,"number",number,"label",roleCode.equals("STUDENT")?"学号":"工号");
 }
 private long nextPersonId(){
  var rows=db.rows("SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='person'");
  Object auto=rows.isEmpty()?null:rows.get(0).get("AUTO_INCREMENT");
  if(auto instanceof Number number&&number.longValue()>0)return number.longValue();
  return db.count("SELECT COALESCE(MAX(person_id),0)+1 FROM person");
 }
 /** 硬格式：学生为“入学年份+6位人员序号”，教职工为“角色前缀(DM/RP/SA)+6位人员序号”。 */
 private String generatedIdentityNumber(String roleCode,long user,Object classId){
  if(roleCode.equals("STUDENT"))return String.format("%d%06d",enrollmentYear(classId),user);
  return employeePrefix(roleCode)+String.format("%06d",user);
 }
 private String employeePrefix(String roleCode){return switch(roleCode){case "DORM_MANAGER"->"DM";case "REPAIRER"->"RP";case "ADMIN"->"SA";default->throw new BizException(400,"角色无效");};}
 private int enrollmentYear(Object classId){
  if(classId==null||Objects.toString(classId,"").isBlank())return Year.now().getValue();
  var rows=db.rows("SELECT enrollment_year FROM student_class WHERE class_id=?",id(classId));
  Object year=rows.isEmpty()?null:rows.get(0).get("enrollment_year");
  return year instanceof Number number?number.intValue():Year.now().getValue();
 }
 private boolean identityNumberAvailable(String roleCode,String number){
  return db.count(roleCode.equals("STUDENT")?"SELECT COUNT(*) FROM student WHERE student_no=?":"SELECT COUNT(*) FROM "+identityTable(roleCode)+" WHERE employee_no=?",number)==0;
 }
 private void requireIdentityUnchanged(Map<String,Object>b,String roleCode,String current){
  String submitted=text(b,roleCode.equals("STUDENT")?"studentNo":"employeeNo");
  require(submitted.isBlank()||submitted.equals(current),"学号/工号由系统自动生成，不可修改");
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
 @Transactional public long resource(CurrentUser u,String type,Long resourceId,Map<String,Object>b){role(u,"ADMIN");long n;switch(type){case "buildings":if(resourceId==null)n=db.insert("INSERT INTO building(building_code,building_name,address,gender_limit) VALUES(?,?,?,?)",required(b,"buildingCode"),required(b,"buildingName"),required(b,"address"),required(b,"genderLimit"));else{n=resourceId;db.update("UPDATE building SET building_code=?,building_name=?,address=?,gender_limit=? WHERE building_id=?",required(b,"buildingCode"),required(b,"buildingName"),required(b,"address"),required(b,"genderLimit"),n);}break;case "rooms":long capacity=id(b.get("designCapacity"));require(capacity>0,"房间容量必须大于0");if(resourceId==null)n=db.insert("INSERT INTO dorm_room(building_id,room_no,floor_no,design_capacity) VALUES(?,?,?,?)",id(b.get("buildingId")),required(b,"roomNo"),id(b.get("floorNo")),capacity);else{n=resourceId;require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=?",n)<=capacity,"容量不能少于已建床位数");db.update("UPDATE dorm_room SET room_no=?,floor_no=?,design_capacity=? WHERE room_id=?",required(b,"roomNo"),id(b.get("floorNo")),capacity,n);}break;case "beds":long room=id(b.get("roomId"));var r=db.one("SELECT * FROM dorm_room WHERE room_id=? FOR UPDATE",room);String status=required(b,"managementStatus");require(Set.of("AVAILABLE","DISABLED").contains(status),"床位状态无效");if(resourceId==null){require(db.count("SELECT COUNT(*) FROM bed WHERE room_id=?",room)<id(r.get("design_capacity")),"床位数已达到房间容量");n=db.insert("INSERT INTO bed(room_id,bed_no,management_status) VALUES(?,?,?)",room,required(b,"bedNo"),status);}else{n=resourceId;require(!status.equals("DISABLED")||db.count("SELECT COUNT(*) FROM v_accommodation_current WHERE bed_id=?",n)==0,"已分配床位不能停用");db.update("UPDATE bed SET bed_no=?,management_status=? WHERE bed_id=?",required(b,"bedNo"),status,n);}break;default:throw new BizException(404,"未知资源");}db.log(u.id(),"dorm",type,n);return n;}
 @Transactional public void assign(CurrentUser u,Map<String,Object>b){
  role(u,"ADMIN");long student=id(b.get("studentId")),bed=id(b.get("bedId"));
  var studentRecord=db.one("SELECT s.student_id,s.gender FROM student s WHERE s.student_id=? AND s.enabled=1 FOR UPDATE",student);
  var target=db.one("SELECT bd.*,b.gender_limit FROM bed bd JOIN dorm_room r ON r.room_id=bd.room_id JOIN building b ON b.building_id=r.building_id WHERE bd.bed_id=? FOR UPDATE",bed);
  require("AVAILABLE".equals(target.get("management_status")),"床位已停用");
  String gender=Objects.toString(studentRecord.get("gender"),"");
  String genderLimit=Objects.toString(target.get("gender_limit"),"");
  require("混合".equals(genderLimit)||("MALE".equals(gender)&&"男生".equals(genderLimit))||("FEMALE".equals(gender)&&"女生".equals(genderLimit)),"学生性别与宿舍楼栋性别限制不匹配");
  var current=db.rows("SELECT assignment_id,bed_id FROM accommodation_assignment WHERE student_id=? AND check_in_date<=CURRENT_DATE() AND (check_out_date IS NULL OR check_out_date>CURRENT_DATE()) ORDER BY assignment_id DESC LIMIT 1 FOR UPDATE",student);
  if(!current.isEmpty()&&id(current.get(0).get("bed_id"))==bed)return;
  require(db.count("SELECT COUNT(*) FROM v_accommodation_current WHERE bed_id=? AND student_id<>?",bed,student)==0,"床位已占用");
  db.update("UPDATE accommodation_assignment SET check_out_date=CURRENT_DATE() WHERE student_id=? AND check_out_date IS NULL",student);
  long assignment=db.insert("INSERT INTO accommodation_assignment(student_id,bed_id,check_in_date,assignment_type) VALUES(?,?,CURRENT_DATE(),'ASSIGN')",student,bed);
  db.log(u.id(),"dorm","assign",assignment);
 }
 @Transactional public void checkout(CurrentUser u,long assignment){role(u,"ADMIN");require(db.update("UPDATE accommodation_assignment SET check_out_date=CURRENT_DATE() WHERE assignment_id=? AND check_out_date IS NULL",assignment)==1,"当前记录已退宿");db.log(u.id(),"dorm","checkout",assignment);}
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
 @Transactional public void saveRule(CurrentUser u,Map<String,Object>b){role(u,"ADMIN");for(String key:List.of("accept_minutes","normal_minutes","urgent_minutes","confirm_days","edit_days"))require(id(b.get(key))>0,"时限必须大于0");Object max=text(b,"max_rework_count").isBlank()?null:id(b.get("max_rework_count"));require(max==null||id(max)>=0,"重修次数不能小于0");long n=db.insert("INSERT INTO repair_rule(accept_minutes,normal_minutes,urgent_minutes,confirm_days,edit_days,max_rework_count) VALUES(?,?,?,?,?,?)",id(b.get("accept_minutes")),id(b.get("normal_minutes")),id(b.get("urgent_minutes")),id(b.get("confirm_days")),id(b.get("edit_days")),max);db.log(u.id(),"repair","rule_version",n);}
 @Transactional public void managerScope(CurrentUser u,long manager,Map<String,Object>b){
  role(u,"ADMIN");db.one("SELECT manager_user_id FROM dorm_manager_profile WHERE manager_user_id=? FOR UPDATE",manager);
  db.update("DELETE FROM manager_building_scope WHERE manager_user_id=?",manager);
  for(Object v:(b.get("buildingIds") instanceof List<?> a?a:List.of()))db.update("INSERT INTO manager_building_scope(manager_user_id,building_id) VALUES(?,?)",manager,id(v));
  db.log(u.id(),"dorm","manager_scope",manager);
 }
 @Transactional public void worker(CurrentUser u,long worker,Map<String,Object>b){role(u,"ADMIN");db.one("SELECT repairer_user_id FROM repairer_profile WHERE repairer_user_id=? FOR UPDATE",worker);Object max=text(b,"maxActiveOrders").isBlank()?null:id(b.get("maxActiveOrders"));require(max==null||id(max)>0,"最大在办数必须大于0");db.update("UPDATE repairer_profile SET on_duty=?,max_active_orders=? WHERE repairer_user_id=?",flag(b,"onDuty"),max,worker);db.update("DELETE FROM repairer_work_type WHERE repairer_user_id=?",worker);db.update("DELETE FROM repairer_building_scope WHERE repairer_user_id=?",worker);for(Object v:(b.get("workTypeIds") instanceof List<?> a?a:List.of()))db.update("INSERT INTO repairer_work_type(repairer_user_id,work_type_id) VALUES(?,?)",worker,id(v));for(Object v:(b.get("buildingIds") instanceof List<?> a?a:List.of()))db.update("INSERT INTO repairer_building_scope(repairer_user_id,building_id) VALUES(?,?)",worker,id(v));db.log(u.id(),"repair","worker_scope",worker);}
 @Transactional public void dictionary(CurrentUser u,String type,Long n,Map<String,Object>b){role(u,"ADMIN");if(type.equals("work-types")){if(n==null)db.update("INSERT INTO repair_work_type(work_type_code,work_type_name) VALUES(?,?)",required(b,"code"),required(b,"name"));else db.update("UPDATE repair_work_type SET work_type_name=?,enabled=? WHERE work_type_id=?",required(b,"name"),flag(b,"enabled"),n);}else if(type.equals("categories")){if(n==null)db.update("INSERT INTO fault_category(work_type_id,category_name) VALUES(?,?)",id(b.get("workTypeId")),required(b,"name"));else db.update("UPDATE fault_category SET category_name=?,work_type_id=?,enabled=? WHERE category_id=?",required(b,"name"),id(b.get("workTypeId")),flag(b,"enabled"),n);}else throw new BizException(404,"未知字典");db.log(u.id(),"repair",type,n==null?0:n);}
 public List<Map<String,Object>> logs(CurrentUser u){role(u,"ADMIN");return db.rows("SELECT l.*,u.real_name FROM operation_log l LEFT JOIN v_user_identity u ON u.user_id=l.operator_user_id ORDER BY log_id DESC LIMIT 500");}
 @Transactional public void importRows(CurrentUser u,String type,List<Map<String,Object>>rows){role(u,"ADMIN");require(!rows.isEmpty()&&rows.size()<=1000,"单次导入1到1000条");for(int i=0;i<rows.size();i++){try{switch(type){case "users":saveUser(u,null,rows.get(i));break;case "assignments":assign(u,rows.get(i));break;case "buildings":case "rooms":case "beds":resource(u,type,null,rows.get(i));break;default:throw new BizException(400,"不支持该导入类型");}}catch(RuntimeException e){throw new BizException(400,"第"+(i+1)+"条导入失败，整批未保存："+e.getMessage());}}}
}
