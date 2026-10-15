package com.dorm.platform.common;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.Statement;
import java.util.*;
@Repository
public class SqlStore {
 private final JdbcTemplate jdbc;
 public SqlStore(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public List<Map<String,Object>> rows(String sql,Object...args){return jdbc.queryForList(sql,args);}
 public Map<String,Object> one(String sql,Object...args){var r=rows(sql,args);if(r.isEmpty())throw new BizException(404,"记录不存在");return r.get(0);}
 public long count(String sql,Object...args){return jdbc.queryForObject(sql,Long.class,args);}
 public int update(String sql,Object...args){return jdbc.update(sql,args);}
 public long insert(String sql,Object...args){var key=new GeneratedKeyHolder();jdbc.update(c->{var s=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return Objects.requireNonNull(key.getKey()).longValue();}
 public void log(Long actor,String module,String action,long id){update("INSERT INTO operation_log(operator_user_id,module,action,business_id,result) VALUES(?,?,?,?,'SUCCESS')",actor,module,action,id);}
}
