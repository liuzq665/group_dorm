package com.dorm.platform;

import com.dorm.platform.common.*;
import com.dorm.platform.security.*;
import com.dorm.platform.notice.service.NoticeService;
import com.dorm.platform.stay.service.StayService;
import java.time.*;
import java.util.*;

/** Database-free regression check; run main with application dependencies. */
public class StayBatchReviewRegression {
 public static void main(String[] args) {
  check(true,false,"请在重交截止后统一复审");
  check(false,true,"每个留宿时间段必须完全位于开放区间内");
  check(false,false,null);
  System.out.println("PASS: batch review rejects early re-review and out-of-range dates; accepts valid dates");
 }
 private static void check(boolean early,boolean outside,String error) {
  FakeStore db=new FakeStore(early,outside);
  DataScope scope=new DataScope(db);
  NoticeService notice=new NoticeService(db,scope){
   @Override public void send(Collection<Long> users,String title,String content) {}
  };
  StayService service=new StayService(db,scope,notice);
  try {
   service.reviewBatch(new CurrentUser(1,"test","test","ADMIN"),2,Map.of("pass",true));
   if(error!=null)throw new AssertionError("Expected rejection: "+error);
   if(db.writes!=2)throw new AssertionError("Expected review and application updates");
  } catch(BizException e) {
   if(!Objects.equals(e.getMessage(),error))throw new AssertionError(e);
   if(db.writes!=0)throw new AssertionError("Rejected application was modified");
  }
 }
 private static class FakeStore extends SqlStore {
  final boolean early,outside; int writes;
  FakeStore(boolean early,boolean outside){super(null);this.early=early;this.outside=outside;}
  @Override public List<Map<String,Object>> rows(String sql,Object...args){
   if(sql.startsWith("SELECT application_id FROM stay_application")){
    if(!sql.endsWith("ORDER BY application_id FOR UPDATE"))throw new AssertionError("Missing batch row locks");
    return List.of(Map.of("application_id",3L));
   }
   if(sql.startsWith("SELECT start_date"))return List.of(Map.of("startDate",LocalDate.of(2030,1,outside?1:10),"endDate",LocalDate.of(2030,1,15)));
   throw new AssertionError(sql);
  }
  @Override public Map<String,Object> one(String sql,Object...args){
   if(sql.startsWith("SELECT * FROM stay_application")){
    if(!sql.endsWith("FOR UPDATE"))throw new AssertionError("Missing application lock");
    var a=new HashMap<String,Object>(Map.of("current_status","UNDER_REVIEW","building_id",1L,"student_id",4L,"batch_id",2L));
    if(early)a.put("resubmit_deadline",LocalDateTime.now().plusDays(1));
    return a;
   }
   if(sql.startsWith("SELECT version_id"))return Map.of("version_id",5L);
   if(sql.startsWith("SELECT * FROM stay_batch"))return Map.of("open_start_date",LocalDate.of(2030,1,10),"open_end_date",LocalDate.of(2030,1,20));
   throw new AssertionError(sql);
  }
  @Override public int update(String sql,Object...args){writes++;return 1;}
  @Override public void log(Long actor,String module,String action,long id) {}
 }
}
