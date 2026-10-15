package com.dorm.platform.security;
import com.dorm.platform.common.*;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class DataScope {
 private final SqlStore db;
 public DataScope(SqlStore db){this.db=db;}
 public void building(CurrentUser u,long id){if(u.role().equals("ADMIN"))return;if(!u.role().equals("DORM_MANAGER")||db.count("SELECT COUNT(*) FROM manager_building_scope WHERE manager_user_id=? AND building_id=?",u.id(),id)==0)throw BizException.forbidden();}
 public Map<String,Object> accommodation(long student){return db.one("SELECT * FROM v_accommodation_current WHERE student_user_id=?",student);}
 public String buildingFilter(CurrentUser u,String column){if(u.role().equals("ADMIN"))return "1=1";Input.role(u,"DORM_MANAGER");return column+" IN (SELECT building_id FROM manager_building_scope WHERE manager_user_id="+u.id()+")";}
}
