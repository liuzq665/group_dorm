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
 public synchronized Map<String,Object> create(CurrentUser u,String domain) throws Exception {
  Input.role(u,"ADMIN");List<String> tables=switch(domain){case "roles"->List.of("person","department","major","student_class","student","dorm_manager_profile","repairer_profile","system_admin_profile","manager_building_scope","repairer_work_type","repairer_building_scope");case "repairs"->List.of("person","student","dorm_room","repairer_profile","repairer_work_type","repairer_building_scope","repair_work_type","fault_category","repair_rule","file_resource","repair_order","repair_dispatch","repair_audit","repair_result","repair_confirmation","repair_evaluation","repair_delay_request","repair_delay_attachment","repair_exception","repair_attachment","repair_order_relation","repair_rework_request","repair_submission_version");case "stays"->List.of("person","student","dorm_room","building","stay_batch","stay_building_rule","stay_application","stay_version","stay_date_range","stay_review","file_resource","stay_version_attachment","stay_batch_material");case "dorm"->List.of("person","department","major","student_class","student","building","dorm_room","bed","accommodation_assignment");default->throw new BizException(400,"备份业务类型无效");};
  Path folder=Path.of("backups").toAbsolutePath();Files.createDirectories(folder);String name="dorm-"+domain+"-"+UUID.randomUUID()+".sql";Path dump=folder.resolve(name),error=folder.resolve(name+".log");
  List<String> args=new ArrayList<>(List.of(resolveDump(),"--user="+username,"--host=localhost","--single-transaction","--default-character-set=utf8mb4","--no-tablespaces","--no-create-info","--replace","--complete-insert","--result-file="+dump,database));args.addAll(tables);var command=new ProcessBuilder(args);command.environment().put("MYSQL_PWD",password);command.redirectError(error.toFile());Process process;
   try{process=command.start();}catch(java.io.IOException e){throw new BizException(500,"未找到 mysqldump 工具：请把 MySQL 的 bin 目录加入 PATH，或在配置项 backup.executable 中指定 mysqldump 的完整路径");}

  if(!process.waitFor(60,TimeUnit.SECONDS)){process.destroyForcibly();throw new BizException(500,"备份超时，请检查数据库连接");}
  if(process.exitValue()!=0)throw new BizException(500,"备份失败，请检查备份日志");
  db.log(u.id(),"system","database_backup_"+domain,0);return Map.of("fileName",name,"sql",Files.readString(dump,StandardCharsets.UTF_8));
 }
 /** 依次尝试：配置项 → 环境变量 MYSQL_BIN → PATH 上的 mysqldump → 常见 MySQL 安装目录。 */
 private String resolveDump(){
  String configured=executable==null?"":executable.trim();
  if(!configured.isEmpty()){
   Path direct=Path.of(configured);
   if(Files.isRegularFile(direct))return direct.toAbsolutePath().toString();
   if(!"mysqldump".equals(configured)&&!"mysqldump.exe".equals(configured)){
    String found=searchDump(configured);if(found!=null)return found;
   }
  }
  String bin=System.getenv("MYSQL_BIN");
  if(bin!=null&&!bin.isBlank()){String found=searchDump(bin);if(found!=null)return found;}
  String onPath=searchDump(null);if(onPath!=null)return onPath;
  for(String root:List.of("C:/Program Files/MySQL","C:/Program Files (x86)/MySQL","D:/software")){
   String found=searchDump(root);if(found!=null)return found;
  }
  return "mysqldump";
 }
 /** 查找 mysqldump(.exe)；root 为 null 时交给系统 PATH 解析，其余在目录及其一层子目录中查找。 */
 private String searchDump(String root){
  String file=isWindows()?"mysqldump.exe":"mysqldump";
  if(root==null){try{Process p=new ProcessBuilder(file,"--version").redirectErrorStream(true).start();p.getInputStream().readAllBytes();if(p.waitFor(5,TimeUnit.SECONDS)&&p.exitValue()==0)return file;}catch(Exception ignore){}return null;}
  Path dir=Path.of(root);
  if(!Files.isDirectory(dir))return null;
  Path direct=dir.resolve(file);if(Files.isRegularFile(direct))return direct.toAbsolutePath().toString();
  Path binDir=dir.resolve("bin").resolve(file);if(Files.isRegularFile(binDir))return binDir.toAbsolutePath().toString();
  try(var children=Files.list(dir)){
   for(Path child:children.filter(Files::isDirectory).toList()){
    Path candidate=child.resolve("bin").resolve(file);
    if(Files.isRegularFile(candidate))return candidate.toAbsolutePath().toString();
    Path nested=child.resolve(file);if(Files.isRegularFile(nested))return nested.toAbsolutePath().toString();
   }
  }catch(Exception ignore){}
  return null;
 }
 private boolean isWindows(){return System.getProperty("os.name","").toLowerCase(Locale.ROOT).contains("win");}
}
