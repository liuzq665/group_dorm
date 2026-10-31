package com.dorm.platform.notice.service;

import com.dorm.platform.common.*;
import com.dorm.platform.security.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.dorm.platform.common.Input.*;

@Service
public class NoticeService {
 private final SqlStore db;
 private final DataScope scope;

 public NoticeService(SqlStore db,DataScope scope){this.db=db;this.scope=scope;}

 @Transactional public void send(Collection<Long> users,String title,String content){
  if(users.isEmpty())return;
  long message=db.insert("INSERT INTO site_message(target_role,title,content,delivered_at) VALUES('DIRECT',?,?,NOW())",title,content);
  for(long user:new HashSet<>(users)){
   db.update("INSERT IGNORE INTO message_target(message_id,user_id) VALUES(?,?)",message,user);
   db.update("INSERT IGNORE INTO message_receipt(message_id,user_id) VALUES(?,?)",message,user);
  }
 }

 public void admins(String title,String content){
  send(db.rows("SELECT user_id FROM v_user_identity WHERE role_code='ADMIN' AND enabled=1").stream().map(x->id(x.get("user_id"))).toList(),title,content);
 }

 public void admins(long building,String title,String content){
  var admins=db.rows("SELECT user_id FROM v_user_identity WHERE role_code='ADMIN' AND enabled=1").stream().map(x->id(x.get("user_id"))).toList();
  if(admins.isEmpty())return;
  long message=db.insert("INSERT INTO site_message(target_role,title,content,delivered_at) VALUES('DIRECT',?,?,NOW())",title,content);
  db.update("INSERT INTO message_building_target(message_id,building_id) VALUES(?,?)",message,building);
  for(long user:new HashSet<>(admins)){
   db.update("INSERT IGNORE INTO message_target(message_id,user_id) VALUES(?,?)",message,user);
   db.update("INSERT IGNORE INTO message_receipt(message_id,user_id) VALUES(?,?)",message,user);
  }
 }

 public void managers(long building,String title,String content){
  send(db.rows("SELECT manager_user_id user_id FROM manager_building_scope WHERE building_id=?",building).stream().map(x->id(x.get("user_id"))).toList(),title,content);
 }

 /** 通知某楼栋的宿管与全部系统管理员（待人工处理等异常场景使用）。 */
 public void managersAndAdmins(long building,String title,String content){
  LinkedHashSet<Long> users=new LinkedHashSet<>();
  db.rows("SELECT manager_user_id user_id FROM manager_building_scope WHERE building_id=?",building).forEach(x->users.add(id(x.get("user_id"))));
  db.rows("SELECT user_id FROM v_user_identity WHERE role_code='ADMIN' AND enabled=1").forEach(x->users.add(id(x.get("user_id"))));
  send(users,title,content);
 }

 public long unreadCount(CurrentUser u){return u.role().equals("ADMIN")?db.count("SELECT COUNT(*) FROM message_receipt r JOIN site_message m ON m.message_id=r.message_id WHERE r.user_id=? AND r.read_at IS NULL AND m.publisher_user_id IS NULL AND EXISTS(SELECT 1 FROM message_target t JOIN v_user_identity i ON i.user_id=t.user_id WHERE t.message_id=m.message_id AND i.role_code='ADMIN')",u.id()):db.count("SELECT COUNT(*) FROM message_receipt WHERE user_id=? AND read_at IS NULL",u.id());}

 public List<Map<String,Object>> list(CurrentUser u,Map<String,String> filters){
  boolean admin=u.role().equals("ADMIN");
  String readLabel=admin?"IF(p.role_code='DORM_MANAGER' OR m.publisher_user_id IS NOT NULL,'已读',IF(r.message_id IS NULL,'已读',IF(r.read_at IS NULL,'未读','已读')))":"IF(r.message_id IS NULL,'发送给他人',IF(r.read_at IS NULL,'未读','已读'))";
  StringBuilder sql=new StringBuilder("SELECT m.message_id,m.title,m.content,m.created_at,r.read_at,"+readLabel+" read_label,IF(r.message_id IS NULL,0,1) is_recipient,m.publisher_user_id,COALESCE(p.real_name,'系统') publisher_name,p.role_code publisher_role,CASE WHEN p.role_code='DORM_MANAGER' THEN '宿管' WHEN m.publisher_user_id=? THEN '我发布的' WHEN m.publisher_user_id IS NULL AND EXISTS(SELECT 1 FROM message_target smt JOIN v_user_identity su ON su.user_id=smt.user_id WHERE smt.message_id=m.message_id AND su.role_code='ADMIN') THEN '系统通知' ELSE '宿管' END source_label");
  if(admin)sql.append(",CASE WHEN COUNT(DISTINCT mbt.building_id)>0 AND COUNT(DISTINCT mbt.building_id)=(SELECT COUNT(*) FROM building) THEN '全部楼栋' ELSE COALESCE(GROUP_CONCAT(DISTINCT target_building.building_name ORDER BY target_building.building_name SEPARATOR '|'),GROUP_CONCAT(DISTINCT resident_building.building_name ORDER BY resident_building.building_name SEPARATOR '|'),GROUP_CONCAT(DISTINCT repair_building.building_name ORDER BY repair_building.building_name SEPARATOR '|'),'未指定') END building_names");
  sql.append(" FROM site_message m ");
  if(admin)sql.append("LEFT JOIN message_receipt r ON r.message_id=m.message_id AND r.user_id=? LEFT JOIN v_user_identity p ON p.user_id=m.publisher_user_id LEFT JOIN message_target mt ON mt.message_id=m.message_id LEFT JOIN v_accommodation_current ac ON ac.student_id=mt.user_id LEFT JOIN building resident_building ON resident_building.building_id=ac.building_id LEFT JOIN message_building_target mbt ON mbt.message_id=m.message_id LEFT JOIN building target_building ON target_building.building_id=mbt.building_id LEFT JOIN repair_order notice_order ON m.publisher_user_id IS NULL AND m.content LIKE CONCAT('%',notice_order.order_no,'%') LEFT JOIN dorm_room notice_room ON notice_room.room_id=notice_order.room_id LEFT JOIN building repair_building ON repair_building.building_id=notice_room.building_id WHERE (p.role_code='DORM_MANAGER' OR m.publisher_user_id=? OR (m.publisher_user_id IS NULL AND EXISTS(SELECT 1 FROM message_target smt JOIN v_user_identity su ON su.user_id=smt.user_id WHERE smt.message_id=m.message_id AND su.role_code='ADMIN'))) AND r.deleted_at IS NULL");
  else sql.append("JOIN message_receipt r ON r.message_id=m.message_id AND r.user_id=? LEFT JOIN v_user_identity p ON p.user_id=m.publisher_user_id WHERE m.delivered_at IS NOT NULL AND r.deleted_at IS NULL");
  List<Object> args=new ArrayList<>();args.add(u.id());args.add(u.id());if(admin)args.add(u.id());
  String sender=Objects.toString(filters.get("sender"),"").trim();
  String read=Objects.toString(filters.get("read"),"").trim();
  if(!(admin&&Set.of("DORM_MANAGER","MINE").contains(sender))){
   if(read.equals("read"))sql.append(" AND (r.read_at IS NOT NULL OR (m.publisher_user_id IS NOT NULL AND "+(admin?"1=1":"1=0")+"))");
   else if(read.equals("unread")){sql.append(" AND r.message_id IS NOT NULL AND r.read_at IS NULL");if(admin)sql.append(" AND m.publisher_user_id IS NULL AND EXISTS(SELECT 1 FROM message_target smt JOIN v_user_identity su ON su.user_id=smt.user_id WHERE smt.message_id=m.message_id AND su.role_code='ADMIN')");}
  }
  String from=Objects.toString(filters.get("from"),"").trim(),to=Objects.toString(filters.get("to"),"").trim();
  if(!from.isEmpty()){sql.append(" AND m.created_at>=?");args.add(from+" 00:00:00");}
  if(!to.isEmpty()){sql.append(" AND m.created_at<DATE_ADD(?,INTERVAL 1 DAY)");args.add(to);}
  if(admin){
   if(sender.equals("SYSTEM"))sql.append(" AND m.publisher_user_id IS NULL AND EXISTS(SELECT 1 FROM message_target smt JOIN v_user_identity su ON su.user_id=smt.user_id WHERE smt.message_id=m.message_id AND su.role_code='ADMIN')");
   else if(sender.equals("DORM_MANAGER"))sql.append(" AND p.role_code='DORM_MANAGER'");
   else if(sender.equals("MINE")){sql.append(" AND m.publisher_user_id=?");args.add(u.id());}
   String publisher=Objects.toString(filters.get("publisher"),"").trim();if(!publisher.isEmpty()){sql.append(" AND p.real_name LIKE ?");args.add("%"+publisher+"%");}
   String building=Objects.toString(filters.get("building"),"").trim();
   if(!building.isEmpty()){
    sql.append(" AND (EXISTS(SELECT 1 FROM message_building_target x WHERE x.message_id=m.message_id AND x.building_id=?) OR m.target_role=CONCAT('BUILDING:',?) OR EXISTS(SELECT 1 FROM message_target x JOIN v_accommodation_current h ON h.student_id=x.user_id WHERE x.message_id=m.message_id AND h.building_id=?) OR EXISTS(SELECT 1 FROM repair_order ro JOIN dorm_room rr ON rr.room_id=ro.room_id WHERE m.content LIKE CONCAT('%',ro.order_no,'%') AND rr.building_id=?))");
    args.add(id(building));args.add(building);args.add(id(building));args.add(id(building));
   }
  }
  sql.append(" GROUP BY m.message_id,r.read_at,r.message_id,p.real_name,p.role_code ORDER BY m.message_id DESC LIMIT 500");
  List<Map<String,Object>> rows=db.rows(sql.toString(),args.toArray());
  for(var row:rows){var attachments=db.rows("SELECT f.file_id,f.original_name,f.content_type,f.size_bytes FROM message_attachment a JOIN file_resource f ON f.file_id=a.file_id WHERE a.message_id=? ORDER BY f.original_name",row.get("message_id"));row.put("attachments",attachments);row.put("attachment_names",String.join("、",attachments.stream().map(x->Objects.toString(x.get("original_name"),"")).toList()));row.computeIfPresent("building_names",(key,value)->Objects.toString(value,"").replace("|","\n"));}
  return rows;
 }

 public List<Map<String,Object>> list(CurrentUser u){return list(u,Map.of());}

 public void read(CurrentUser u,long message){
  if(db.update("UPDATE message_receipt SET read_at=COALESCE(read_at,NOW()) WHERE message_id=? AND user_id=? AND deleted_at IS NULL",message,u.id())==0&&db.count("SELECT COUNT(*) FROM message_receipt WHERE message_id=? AND user_id=? AND deleted_at IS NULL",message,u.id())==0)throw BizException.forbidden();
 }

 @Transactional public void readSelected(CurrentUser u,List<Long> messageIds){
  List<Long> ids=messageIds.stream().distinct().toList();BizException.require(!ids.isEmpty()&&ids.size()<=500,"请选择要标为已读的消息");
  String placeholders=String.join(",",Collections.nCopies(ids.size(),"?"));List<Object> args=new ArrayList<>();args.add(u.id());args.addAll(ids);
  db.update("UPDATE message_receipt SET read_at=COALESCE(read_at,NOW()) WHERE user_id=? AND deleted_at IS NULL AND read_at IS NULL AND message_id IN ("+placeholders+")",args.toArray());
 }

 @Transactional public int deleteSelected(CurrentUser u,List<Long> messageIds){
  List<Long> ids=messageIds.stream().distinct().toList();BizException.require(!ids.isEmpty()&&ids.size()<=500,"请选择要删除的消息");
  boolean admin=u.role().equals("ADMIN");
  for(long message:ids){
   long visible=admin
    ?db.count("SELECT COUNT(*) FROM site_message m LEFT JOIN v_user_identity p ON p.user_id=m.publisher_user_id WHERE m.message_id=? AND (p.role_code='DORM_MANAGER' OR m.publisher_user_id=? OR (m.publisher_user_id IS NULL AND EXISTS(SELECT 1 FROM message_receipt r JOIN message_target t ON t.message_id=r.message_id JOIN v_user_identity i ON i.user_id=t.user_id WHERE r.message_id=m.message_id AND r.user_id=? AND i.role_code='ADMIN')))",message,u.id(),u.id())
    :db.count("SELECT COUNT(*) FROM site_message m JOIN message_receipt r ON r.message_id=m.message_id WHERE m.message_id=? AND m.delivered_at IS NOT NULL AND r.user_id=? AND r.deleted_at IS NULL",message,u.id());
   BizException.require(visible>0,"所选消息不存在或无权操作");
   db.update("INSERT INTO message_receipt(message_id,user_id,read_at,deleted_at) VALUES(?,?,NOW(),NOW()) ON DUPLICATE KEY UPDATE read_at=COALESCE(read_at,NOW()),deleted_at=NOW()",message,u.id());
   db.log(u.id(),"notice","delete",message);
  }
  return ids.size();
 }

 @Transactional public void publish(CurrentUser u,Map<String,Object>b){
  role(u,"ADMIN","DORM_MANAGER");
  String target=text(b,"targetRole");
  Set<String> allowedRoles=u.role().equals("ADMIN")?Set.of("ALL","STUDENT","DORM_MANAGER","REPAIRER","ADMIN"):Set.of("ALL","STUDENT");
  BizException.require(allowedRoles.contains(target),"消息对象无效");
  List<Long> available=(u.role().equals("ADMIN")
    ?db.rows("SELECT building_id FROM building ORDER BY building_id")
    :db.rows("SELECT building_id FROM manager_building_scope WHERE manager_user_id=? ORDER BY building_id",u.id()))
    .stream().map(x->id(x.get("building_id"))).toList();
  LinkedHashSet<Long> selected=new LinkedHashSet<>();
  Object raw=b.get("buildingIds");
  if(raw instanceof List<?> ids)for(Object value:ids)selected.add(id(value));
  else if(b.get("buildingId")!=null&&!text(b,"buildingId").isBlank())selected.add(id(b.get("buildingId")));
  if(selected.isEmpty())selected.addAll(available);
  BizException.require(!selected.isEmpty()&&available.containsAll(selected),"楼栋范围无效或无权限");
  String placeholders=String.join(",",Collections.nCopies(selected.size(),"?"));
  List<Object> buildingArgs=new ArrayList<>(selected);
  LinkedHashSet<Long> recipients=new LinkedHashSet<>();
  if(target.equals("STUDENT")||target.equals("ALL"))
   db.rows("SELECT DISTINCT student_id user_id FROM v_accommodation_current WHERE building_id IN ("+placeholders+")",buildingArgs.toArray()).forEach(x->recipients.add(id(x.get("user_id"))));
  if(target.equals("DORM_MANAGER")||target.equals("ALL"))
   db.rows("SELECT DISTINCT manager_user_id user_id FROM manager_building_scope WHERE building_id IN ("+placeholders+")",buildingArgs.toArray()).forEach(x->recipients.add(id(x.get("user_id"))));
  if(target.equals("REPAIRER")||target.equals("ALL"))
   db.rows("SELECT DISTINCT repairer_user_id user_id FROM repairer_building_scope WHERE building_id IN ("+placeholders+")",buildingArgs.toArray()).forEach(x->recipients.add(id(x.get("user_id"))));
  if(target.equals("ADMIN"))db.rows("SELECT user_id FROM v_user_identity WHERE role_code='ADMIN' AND enabled=1").forEach(x->recipients.add(id(x.get("user_id"))));
  BizException.require(!recipients.isEmpty(),"所选范围没有可接收通知的账号");
  LocalDateTime at=text(b,"publishAt").isBlank()?LocalDateTime.now().withNano(0):time(b.get("publishAt"));
  long message=db.insert("INSERT INTO site_message(target_role,title,content,publisher_user_id,publish_at) VALUES('BUILDINGS',?,?,?,?)",required(b,"title"),required(b,"content"),u.id(),at);
  for(long building:selected)db.update("INSERT INTO message_building_target(message_id,building_id) VALUES(?,?)",message,building);
  for(long user:recipients)db.update("INSERT INTO message_target(message_id,user_id) VALUES(?,?)",message,user);
  Object filesRaw=b.get("attachmentIds");
  List<?> attachmentIds=filesRaw instanceof List<?> files?files:List.of();
  BizException.require(attachmentIds.size()<=8,"最多添加8个附件");
  for(Object value:attachmentIds){long file=id(value);if(db.count("SELECT COUNT(*) FROM file_resource WHERE file_id=? AND uploader_user_id=?",file,u.id())==0)throw BizException.forbidden();db.update("INSERT INTO message_attachment(message_id,file_id) VALUES(?,?)",message,file);}
  deliver();
  db.log(u.id(),"notice","publish",message);
 }

 @Transactional public void deliver(){
  for(var message:db.rows("SELECT message_id FROM site_message WHERE delivered_at IS NULL AND publish_at<=NOW() FOR UPDATE")){
   db.update("INSERT IGNORE INTO message_receipt(message_id,user_id,read_at) SELECT mt.message_id,mt.user_id,IF(i.role_code='ADMIN' AND m.publisher_user_id IS NOT NULL,NOW(),NULL) FROM message_target mt JOIN v_user_identity i ON i.user_id=mt.user_id JOIN site_message m ON m.message_id=mt.message_id WHERE mt.message_id=?",message.get("message_id"));
   db.update("UPDATE site_message SET delivered_at=NOW() WHERE message_id=?",message.get("message_id"));
  }
 }
}
