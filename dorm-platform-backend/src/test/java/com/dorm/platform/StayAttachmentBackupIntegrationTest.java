package com.dorm.platform;

import com.dorm.platform.common.Input;
import com.dorm.platform.common.SqlStore;
import com.dorm.platform.file.service.FileService;
import com.dorm.platform.security.CurrentUser;
import com.dorm.platform.stay.service.StayService;
import com.dorm.platform.system.service.SystemTaskService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={
 "spring.datasource.url=jdbc:mysql://localhost:3306/dorm_platform_test?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false",
 "workflow.delay-ms=3600000", "system-task.delay-ms=3600000", "backup.database=dorm_platform_test",
 "backup.executable=D:/MySQL Server 8.0/bin/mysqldump.exe"})
class StayAttachmentBackupIntegrationTest {
 @Autowired StayService stay; @Autowired FileService files; @Autowired SystemTaskService tasks; @Autowired SqlStore db;
 private final String marker="SB"+UUID.randomUUID().toString().replace("-","").substring(0,12);
 private CurrentUser admin,student; private long batch,application,version,file,task; private String rawBackupFile;

 @Test void staysBackupContainsCommittedAttachmentRelationAndDownloadsMatch() throws Exception {
  var home=db.one("SELECT a.student_id,a.building_id FROM v_accommodation_current a JOIN v_user_identity u ON u.user_id=a.student_id WHERE u.role_code='STUDENT' AND u.enabled=1 ORDER BY a.student_id LIMIT 1");
  long studentId=Input.id(home.get("student_id")),buildingId=Input.id(home.get("building_id"));
  var adminRow=db.one("SELECT user_id,login_account,real_name FROM v_user_identity WHERE role_code='ADMIN' AND enabled=1 ORDER BY user_id LIMIT 1");
  admin=new CurrentUser(Input.id(adminRow.get("user_id")),String.valueOf(adminRow.get("login_account")),String.valueOf(adminRow.get("real_name")),"ADMIN");
  var studentRow=db.one("SELECT user_id,login_account,real_name FROM v_user_identity WHERE user_id=?",studentId);
  student=new CurrentUser(studentId,String.valueOf(studentRow.get("login_account")),String.valueOf(studentRow.get("real_name")),"STUDENT");
  LocalDate start=LocalDate.now().plusDays(2),end=start.plusDays(5);
  batch=Input.id(stay.configure(admin,null,Map.of("batchCode",marker,"batchName",marker,"academicYear",start.getYear(),"vacationType","SUMMER","openStartDate",start.toString(),"openEndDate",end.toString(),"instructions",marker)).get("batchId"));
  db.update("UPDATE stay_batch SET current_status='OPEN' WHERE batch_id=?",batch);
  db.update("INSERT INTO stay_building_rule(batch_id,building_id,application_deadline,auto_lock) VALUES(?,?,?,0)",batch,buildingId,LocalDateTime.now().plusHours(2));
  file=Input.id(files.uploadStayApplication(student,new MockMultipartFile("file",marker+".pdf","application/pdf","%PDF-1.4\n% backup attachment".getBytes(StandardCharsets.UTF_8))).get("fileId"));
  application=Input.id(stay.save(student,Map.of("batchId",batch,"reason",marker,"dateRanges",List.of(Map.of("startDate",start.toString(),"endDate",end.toString())),"fileIds",List.of(file))).get("applicationId"));
  version=Input.id(db.one("SELECT version_id FROM stay_version WHERE application_id=? ORDER BY version_id DESC LIMIT 1",application).get("version_id"));
  assertEquals(1L,db.count("SELECT COUNT(*) FROM stay_version_attachment WHERE version_id=? AND file_id=?",version,file));
  task=Input.id(tasks.backupTask(admin,"stays").get("taskId"));
  tasks.runWaiting();
  assertEquals("SUCCESS",db.one("SELECT task_status FROM backup_task WHERE task_id=?",task).get("task_status"));
  var output=db.one("SELECT f.file_id,f.original_name FROM backup_task_file t JOIN file_resource f ON f.file_id=t.file_id WHERE t.task_id=? AND t.file_purpose='BACKUP_OUTPUT'",task); long outputFile=Input.id(output.get("file_id")); rawBackupFile=String.valueOf(output.get("original_name"));
  String sql=new String(files.bytes(files.get(admin,outputFile)),StandardCharsets.UTF_8);
  assertTrue(sql.contains("stay_version_attachment")); assertTrue(sql.contains("("+version+","+file+","));
  assertTrue(sql.contains("("+file+",")); assertTrue(sql.contains("("+version+","));
  byte[] zip=tasks.downloadBackups(admin,List.of(task)); byte[] zippedSql;
  try(var input=new ZipInputStream(new java.io.ByteArrayInputStream(zip))){assertNotNull(input.getNextEntry());zippedSql=input.readAllBytes();}
  assertArrayEquals(sql.getBytes(StandardCharsets.UTF_8),zippedSql);
 }

 @AfterEach void cleanup() throws Exception {
  if(rawBackupFile!=null){Path raw=Path.of("backups").toAbsolutePath().resolve(rawBackupFile);Files.deleteIfExists(raw);Files.deleteIfExists(Path.of(raw.toString()+".log"));}
  if(task>0)try{tasks.deleteBackups(admin,List.of(task));}catch(Exception ignored){}
  if(application>0){db.update("DELETE FROM stay_review WHERE application_id=?",application);db.update("DELETE x FROM stay_version_attachment x JOIN stay_version v ON v.version_id=x.version_id WHERE v.application_id=?",application);db.update("DELETE d FROM stay_date_range d JOIN stay_version v ON v.version_id=d.version_id WHERE v.application_id=?",application);db.update("DELETE FROM stay_version WHERE application_id=?",application);db.update("DELETE FROM stay_application WHERE application_id=?",application);}
  if(batch>0){db.update("DELETE FROM stay_building_rule WHERE batch_id=?",batch);db.update("DELETE FROM stay_batch_material WHERE batch_id=?",batch);db.update("DELETE FROM stay_batch WHERE batch_id=?",batch);}
  if(file>0){var rows=db.rows("SELECT storage_name FROM file_resource WHERE file_id=?",file);db.update("DELETE FROM file_resource WHERE file_id=?",file);for(var row:rows)Files.deleteIfExists(Path.of("uploads").toAbsolutePath().resolve(String.valueOf(row.get("storage_name"))));}
 }
}
