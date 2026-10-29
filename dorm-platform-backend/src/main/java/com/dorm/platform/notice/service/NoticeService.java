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
 private final SqlStore db; private final DataScope scope;
 public NoticeService(SqlStore db,DataScope scope){this.db=db;this.scope=scope;}
 public void send(Collection<Long> users,String title,String content){if(users.isEmpty())return;long id=db.insert("INSERT INTO site_message(target_role,title,content,delivered_at) VALUES('DIRECT',?,?,NOW())",title,content);for(long user:new HashSet<>(users))db.update("INSERT INTO message_receipt(message_id,user_id) VALUES(?,?)",id,user);}
 public void managers(long building,String title,String content){send(db.rows("SELECT manager_user_id FROM manager_building_scope WHERE building_id=?",building).stream().map(x->id(x.get("manager_user_id"))).toList(),title,content);}
 public List<Map<String,Object>> list(CurrentUser u){return db.rows("SELECT m.message_id,m.title,m.content,m.created_at,r.read_at,(r.read_at IS NOT NULL) read_flag FROM site_message m JOIN message_receipt r ON r.message_id=m.message_id WHERE r.user_id=? ORDER BY m.message_id DESC",u.id());}
 public void read(CurrentUser u,long id){if(db.update("UPDATE message_receipt SET read_at=COALESCE(read_at,NOW()) WHERE message_id=? AND user_id=?",id,u.id())==0 && db.count("SELECT COUNT(*) FROM message_receipt WHERE message_id=? AND user_id=?",id,u.id())==0)throw BizException.forbidden();}
 @Transactional public void publish(CurrentUser u,Map<String,Object>b){role(u,"ADMIN","DORM_MANAGER");List<Map<String,Object>> recipients;String target=text(b,"targetRole");if(b.get("buildingId")!=null&&!text(b,"buildingId").isBlank()){long building=id(b.get("buildingId"));scope.building(u,building);recipients=db.rows("SELECT student_id user_id FROM v_accommodation_current WHERE building_id=?",building);}else{role(u,"ADMIN");BizException.require(Set.of("ALL","STUDENT","DORM_MANAGER","REPAIRER","ADMIN").contains(target),"消息对象无效");recipients=db.rows("SELECT user_id FROM v_user_identity WHERE enabled=1 AND (?='ALL' OR role_code=?)",target,target);}
 LocalDateTime at=text(b,"publishAt").isBlank()?LocalDateTime.now().withNano(0):time(b.get("publishAt"));long msg=db.insert("INSERT INTO site_message(target_role,title,content,publisher_user_id,publish_at) VALUES('DIRECT',?,?,?,?)",required(b,"title"),required(b,"content"),u.id(),at);for(var r:recipients)db.update("INSERT INTO message_target(message_id,user_id) VALUES(?,?)",msg,r.get("user_id"));deliver();db.log(u.id(),"notice","publish",msg);}
 @Transactional public void deliver(){for(var m:db.rows("SELECT message_id FROM site_message WHERE delivered_at IS NULL AND publish_at<=NOW() FOR UPDATE")){db.update("INSERT IGNORE INTO message_receipt(message_id,user_id) SELECT message_id,user_id FROM message_target WHERE message_id=?",m.get("message_id"));db.update("UPDATE site_message SET delivered_at=NOW() WHERE message_id=?",m.get("message_id"));}}
}
