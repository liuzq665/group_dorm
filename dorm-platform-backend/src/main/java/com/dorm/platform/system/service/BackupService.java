package com.dorm.platform.system.service;

import com.dorm.platform.common.*;
import com.dorm.platform.security.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class BackupService {
 private final SqlStore db;
 @Value("${spring.datasource.username}") private String username;
 @Value("${spring.datasource.password}") private String password;
 @Value("${backup.database:dorm_platform}") private String database;
 @Value("${backup.executable:mysqldump}") private String executable;
 public BackupService(SqlStore db){this.db=db;}
 public synchronized Map<String,Object> create(CurrentUser u) throws Exception {
  Input.role(u,"ADMIN");Path folder=Path.of("backups").toAbsolutePath();Files.createDirectories(folder);String name=UUID.randomUUID()+".sql";Path dump=folder.resolve(name),error=folder.resolve(name+".log");
  var command=new ProcessBuilder(executable,"--user="+username,"--host=localhost","--single-transaction","--default-character-set=utf8mb4","--no-tablespaces","--result-file="+dump,database);command.environment().put("MYSQL_PWD",password);command.redirectError(error.toFile());Process process=command.start();
  if(!process.waitFor(60,TimeUnit.SECONDS)){process.destroyForcibly();throw new BizException(500,"备份超时，请检查数据库连接");}
  if(process.exitValue()!=0)throw new BizException(500,"备份失败，请检查备份日志");
  db.log(u.id(),"system","database_backup",0);return Map.of("fileName",name,"sql",Files.readString(dump,StandardCharsets.UTF_8));
 }
}
