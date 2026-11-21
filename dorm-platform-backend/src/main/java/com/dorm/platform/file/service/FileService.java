package com.dorm.platform.file.service;
import com.dorm.platform.common.*;
import com.dorm.platform.security.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
@Service
public class FileService {
 private static final Logger log=LoggerFactory.getLogger(FileService.class);
 private static final String DEFAULT_NAME="attachment";
 private final SqlStore db;
 private final Path root;
 public FileService(SqlStore db,@Value("${dorm.file.storage-dir:uploads}")String configuredDir){this.db=db;this.root=storageRoot(configuredDir);}
 static Path storageRoot(String configuredDir){
  try{
   Path location=Path.of(FileService.class.getProtectionDomain().getCodeSource().getLocation().toURI()).toAbsolutePath().normalize();String configured=System.getProperty("file.storage-root");if(configured==null||configured.isBlank())configured=System.getenv("FILE_STORAGE_ROOT");if(configured==null||configured.isBlank())configured=configuredDir;
   return resolveStorageRoot(location,configured,Path.of(System.getProperty("user.dir")));
  }catch(Exception e){log.warn("Cannot determine backend module directory; using process working directory",e);return Path.of(System.getProperty("user.dir"),"uploads").toAbsolutePath().normalize();}
 }
 static Path resolveStorageRoot(Path codeLocation,String configured,Path workingDirectory){
  Path current=Files.isDirectory(codeLocation)?codeLocation:codeLocation.getParent();Path module=moduleRoot(current,workingDirectory);
  Path path=configured==null||configured.isBlank()?module.resolve("uploads"):Path.of(configured);
  return (path.isAbsolute()?path:module.resolve(path)).toAbsolutePath().normalize();
 }
 private static Path moduleRoot(Path current,Path workingDirectory){
  Path module=workingDirectory.toAbsolutePath().normalize();
  for(Path path=current;path!=null;path=path.getParent())if(Files.isRegularFile(path.resolve("pom.xml"))){module=path;break;}
  return module;
 }
 public long data(CurrentUser u,String name,String type,byte[] bytes)throws IOException{Input.role(u,"ADMIN");Files.createDirectories(root);String stored=UUID.randomUUID().toString();Files.write(root.resolve(stored),bytes);return db.insert("INSERT INTO file_resource(uploader_user_id,original_name,storage_name,content_type,size_bytes) VALUES(?,?,?,?,?)",u.id(),name,stored,type,bytes.length);}
 public Map<String,Object> upload(CurrentUser u,MultipartFile f)throws IOException{BizException.require(!f.isEmpty()&&f.getSize()<=5*1024*1024,"图片不能为空且不能超过5MB");String original=safeName(f.getOriginalFilename(),"photo"),type=typeFor(original,Map.of("png","image/png","jpg","image/jpeg","jpeg","image/jpeg"));byte[] bytes=f.getBytes();verifyContent(original,type,bytes);return save(u,original,type,bytes);}
 public Map<String,Object> uploadStayMaterial(CurrentUser u,MultipartFile f)throws IOException{
  Input.role(u,"ADMIN","STUDENT");BizException.require(!f.isEmpty()&&f.getSize()<=5*1024*1024,"材料文件不能为空且不能超过5MB");
  String original=safeName(f.getOriginalFilename(),"material");
  Map<String,String> allowed=Map.of("pdf","application/pdf","doc","application/msword","docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document","png","image/png","jpg","image/jpeg","jpeg","image/jpeg");
  String type=typeFor(original,allowed);byte[] bytes=f.getBytes();verifyContent(original,type,bytes);Map<String,Object> saved=save(u,original,type,bytes);return Map.of("fileId",saved.get("fileId"),"originalName",original);
 }
 public Map<String,Object> uploadMessageAttachment(CurrentUser u,MultipartFile f)throws IOException{
  Input.role(u,"ADMIN","DORM_MANAGER");BizException.require(!f.isEmpty()&&f.getSize()<=5*1024*1024,"附件不能为空且不能超过5MB");
  String original=safeName(f.getOriginalFilename(),"attachment");
  Map<String,String> allowed=Map.ofEntries(Map.entry("pdf","application/pdf"),Map.entry("doc","application/msword"),Map.entry("docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"),Map.entry("xls","application/vnd.ms-excel"),Map.entry("xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),Map.entry("ppt","application/vnd.ms-powerpoint"),Map.entry("pptx","application/vnd.openxmlformats-officedocument.presentationml.presentation"),Map.entry("txt","text/plain"),Map.entry("csv","text/csv"),Map.entry("png","image/png"),Map.entry("jpg","image/jpeg"),Map.entry("jpeg","image/jpeg"));
  String type=typeFor(original,allowed);byte[] bytes=f.getBytes();verifyContent(original,type,bytes);Map<String,Object> saved=save(u,original,type,bytes);return Map.of("fileId",saved.get("fileId"),"originalName",original);
 }
 public Map<String,Object> uploadStayApplication(CurrentUser u,MultipartFile f)throws IOException{
  Input.role(u,"STUDENT");BizException.require(!f.isEmpty()&&f.getSize()<=5*1024*1024,"留宿申请附件不能为空且不能超过5MB");
  String original=safeName(f.getOriginalFilename(),"stay-material");
  Map<String,String> allowed=Map.of("pdf","application/pdf","doc","application/msword","docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document","png","image/png","jpg","image/jpeg","jpeg","image/jpeg");
  String type=typeFor(original,allowed);byte[] bytes=f.getBytes();verifyContent(original,type,bytes);return save(u,original,type,bytes);
 }
 static String safeName(String raw,String fallback){
  String fallbackName=fallback==null||fallback.isBlank()?DEFAULT_NAME:fallback;
  String name=raw==null||raw.isBlank()?fallbackName:raw;
  int slash=Math.max(name.lastIndexOf('/'),name.lastIndexOf('\\'));
  if(slash>=0)name=name.substring(slash+1);
  name=name.replaceAll("[\\x00-\\x1f\\\\/:*?\"<>|]","_").replaceAll("^[.\\s]+","").replaceAll("[.\\s]+$","");
  if(name.isEmpty())name=DEFAULT_NAME;
  if(name.length()>120){int dot=name.lastIndexOf('.');String extension=dot>0&&name.length()-dot<=10?name.substring(dot):"";int keep=Math.min(dot>0?dot:name.length(),120-extension.length());name=name.substring(0,keep)+extension;}
  return name;
 }
 private String typeFor(String name,Map<String,String> allowed){String extension=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);String type=allowed.get(extension);BizException.require(type!=null,"文件格式不受支持");return type;}
 private void verifyContent(String name,String type,byte[] bytes)throws IOException{
  if(type.startsWith("image/")){BizException.require(ImageIO.read(new ByteArrayInputStream(bytes))!=null,"图片内容无效");return;}
  String extension=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
  if(type.equals("application/pdf"))BizException.require(starts(bytes,new byte[]{'%', 'P', 'D', 'F', '-'}),"PDF文件内容无效");
  else if(Set.of("docx","xlsx","pptx").contains(extension))BizException.require(starts(bytes,new byte[]{'P','K',3,4}),"Office文件内容无效");
  else if(Set.of("doc","xls","ppt").contains(extension))BizException.require(starts(bytes,new byte[]{(byte)0xd0,(byte)0xcf,0x11,(byte)0xe0}),"Office文件内容无效");
 }
 private boolean starts(byte[] content,byte[] prefix){if(content.length<prefix.length)return false;for(int i=0;i<prefix.length;i++)if(content[i]!=prefix[i])return false;return true;}
 private Map<String,Object> save(CurrentUser u,String original,String type,byte[] bytes)throws IOException{Files.createDirectories(root);String stored=UUID.randomUUID().toString();Files.write(root.resolve(stored),bytes);long id=db.insert("INSERT INTO file_resource(uploader_user_id,original_name,storage_name,content_type,size_bytes) VALUES(?,?,?,?,?)",u.id(),original,stored,type,bytes.length);return Map.of("fileId",id);}
 public void attach(CurrentUser u,long order,String purpose,Object raw,boolean required){List<?> ids=raw instanceof List<?> list?list:List.of();BizException.require(!required||!ids.isEmpty(),"请上传现场照片");BizException.require(ids.size()<=8,"最多上传8张图片");for(Object v:ids){long fid=Input.id(v);if(db.count("SELECT COUNT(*) FROM file_resource WHERE file_id=? AND uploader_user_id=?",fid,u.id())==0)throw BizException.forbidden();db.update("INSERT IGNORE INTO repair_attachment(order_id,file_id,purpose) VALUES(?,?,?)",order,fid,purpose);}}
 public Map<String,Object> get(CurrentUser u,long fid){
  Map<String,Object> file=db.one("SELECT * FROM file_resource WHERE file_id=?",fid);
  if(Input.id(file.get("uploader_user_id"))!=u.id()&&!u.role().equals("ADMIN")){
   boolean messageAccess=db.count("SELECT COUNT(*) FROM message_attachment a JOIN site_message m ON m.message_id=a.message_id JOIN message_target t ON t.message_id=m.message_id JOIN message_receipt r ON r.message_id=m.message_id AND r.user_id=t.user_id WHERE a.file_id=? AND t.user_id=? AND m.delivered_at IS NOT NULL AND r.deleted_at IS NULL",fid,u.id())>0;
   boolean stayAccess=switch(u.role()){
    case "STUDENT"->db.count("SELECT COUNT(*) FROM stay_batch_material m JOIN stay_batch b ON b.batch_id=m.batch_id JOIN stay_building_rule r ON r.batch_id=b.batch_id JOIN v_accommodation_current a ON a.building_id=r.building_id WHERE m.file_id=? AND a.student_id=? AND b.current_status='OPEN'",fid,u.id())>0||db.count("SELECT COUNT(*) FROM stay_version_attachment x JOIN stay_version v ON v.version_id=x.version_id JOIN stay_application a ON a.application_id=v.application_id WHERE x.file_id=? AND a.student_id=?",fid,u.id())>0;
    case "DORM_MANAGER"->db.count("SELECT COUNT(*) FROM stay_batch_material m JOIN stay_building_rule r ON r.batch_id=m.batch_id JOIN manager_building_scope s ON s.building_id=r.building_id WHERE m.file_id=? AND s.manager_user_id=?",fid,u.id())>0||db.count("SELECT COUNT(*) FROM stay_version_attachment x JOIN stay_version v ON v.version_id=x.version_id JOIN stay_application a ON a.application_id=v.application_id JOIN manager_building_scope s ON s.building_id=a.building_id WHERE x.file_id=? AND s.manager_user_id=? AND v.submitted_at IS NOT NULL",fid,u.id())>0;
    default->false;
   };
   String repairScope=switch(u.role()){
    case "STUDENT"->"o.student_id="+u.id();
    case "DORM_MANAGER"->"r.building_id IN (SELECT building_id FROM manager_building_scope WHERE manager_user_id="+u.id()+")";
    case "REPAIRER"->"EXISTS(SELECT 1 FROM repair_dispatch d WHERE d.order_id=o.order_id AND d.repairer_user_id="+u.id()+")";
    default->"1=0";
   };
   boolean repairAccess=db.count("SELECT COUNT(*) FROM repair_attachment a JOIN repair_order o ON o.order_id=a.order_id JOIN dorm_room r ON r.room_id=o.room_id WHERE a.file_id=? AND ("+repairScope+")",fid)>0;
   if(!messageAccess&&!stayAccess&&!repairAccess)throw BizException.forbidden();
  }
  return file;
 }
 private Path storagePath(String storageName){
  Path relative=Path.of(storageName).getFileName();
  Path project=root.getParent()==null?null:root.getParent().getParent();
  List<Path> candidates=project==null?List.of(root,Path.of("uploads").toAbsolutePath().normalize(),Path.of("..","uploads").toAbsolutePath().normalize()):List.of(root,Path.of("uploads").toAbsolutePath().normalize(),Path.of("..","uploads").toAbsolutePath().normalize(),project.resolve("uploads").toAbsolutePath().normalize());
  for(Path base:candidates){Path candidate=base.resolve(relative).normalize();if(candidate.startsWith(base)&&Files.isRegularFile(candidate))return candidate;}
  return root.resolve(relative).normalize();
 }
 public byte[] bytes(Map<String,Object> file)throws IOException{
  String storageName=file.get("storage_name").toString();Path path=storagePath(storageName);
  if(!Files.isRegularFile(path)){log.error("附件文件不存在: fileId={}, storageName={}, storageRoot={}",file.get("file_id"),storageName,root);throw new BizException(404,"附件文件已不在服务器磁盘上，请重新上传");}
  return Files.readAllBytes(path);
 }
 public void deleteBackupOutput(CurrentUser u,long fileId)throws IOException{Input.role(u,"ADMIN");var file=db.one("SELECT storage_name FROM file_resource WHERE file_id=?",fileId);BizException.require(db.count("SELECT COUNT(*) FROM backup_task_file WHERE file_id=?",fileId)==0,"备份文件仍被任务引用，不能删除");db.update("DELETE FROM file_resource WHERE file_id=?",fileId);Files.deleteIfExists(root.resolve(file.get("storage_name").toString()));}
}
