package com.dorm.platform.file.service;
import com.dorm.platform.common.*;
import com.dorm.platform.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.nio.file.*;
import java.io.*;
import java.util.*;
@Service
public class FileService {
 private final SqlStore db; private final Path root=Path.of("uploads").toAbsolutePath().normalize();
 public FileService(SqlStore db){this.db=db;}
 public long data(CurrentUser u,String name,String type,byte[] bytes)throws IOException{Input.role(u,"ADMIN");Files.createDirectories(root);String stored=UUID.randomUUID().toString();Files.write(root.resolve(stored),bytes);return db.insert("INSERT INTO file_resource(uploader_user_id,original_name,storage_name,content_type,size_bytes) VALUES(?,?,?,?,?)",u.id(),name,stored,type,bytes.length);}
 public Map<String,Object> upload(CurrentUser u,MultipartFile f)throws IOException{BizException.require(!f.isEmpty()&&f.getSize()<=5*1024*1024,"图片不能为空且不能超过5MB");String type=Objects.toString(f.getContentType(),"");BizException.require(Set.of("image/png","image/jpeg").contains(type),"仅支持PNG和JPEG图片");try(var in=f.getInputStream()){BizException.require(ImageIO.read(in)!=null,"图片内容无效");}Files.createDirectories(root);String name=UUID.randomUUID().toString();f.transferTo(root.resolve(name));long id=db.insert("INSERT INTO file_resource(uploader_user_id,original_name,storage_name,content_type,size_bytes) VALUES(?,?,?,?,?)",u.id(),Path.of(Objects.requireNonNullElse(f.getOriginalFilename(),"photo")).getFileName().toString(),name,type,f.getSize());return Map.of("fileId",id);}
 public Map<String,Object> uploadStayMaterial(CurrentUser u,MultipartFile f)throws IOException{
  Input.role(u,"ADMIN");BizException.require(!f.isEmpty()&&f.getSize()<=5*1024*1024,"材料文件不能为空且不能超过5MB");
  String original=Path.of(Objects.requireNonNullElse(f.getOriginalFilename(),"material")).getFileName().toString();String extension=original.substring(original.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);String type=Objects.toString(f.getContentType(),"");
  Map<String,String> allowed=Map.of("pdf","application/pdf","doc","application/msword","docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document","png","image/png","jpg","image/jpeg","jpeg","image/jpeg");
  BizException.require(Objects.equals(allowed.get(extension),type),"材料仅支持PDF、Word、PNG或JPEG文件");
  if(type.startsWith("image/"))try(var in=f.getInputStream()){BizException.require(ImageIO.read(in)!=null,"图片内容无效");}
  Files.createDirectories(root);String stored=UUID.randomUUID().toString();f.transferTo(root.resolve(stored));long id=db.insert("INSERT INTO file_resource(uploader_user_id,original_name,storage_name,content_type,size_bytes) VALUES(?,?,?,?,?)",u.id(),original,stored,type,f.getSize());return Map.of("fileId",id,"originalName",original);
 }
 public void attach(CurrentUser u,long order,String purpose,Object raw,boolean required){List<?> ids=raw instanceof List<?> list?list:List.of();BizException.require(!required||!ids.isEmpty(),"请上传现场照片");BizException.require(ids.size()<=8,"最多上传8张图片");for(Object v:ids){long fid=Input.id(v);if(db.count("SELECT COUNT(*) FROM file_resource WHERE file_id=? AND uploader_user_id=?",fid,u.id())==0)throw BizException.forbidden();db.update("INSERT IGNORE INTO repair_attachment(order_id,file_id,purpose) VALUES(?,?,?)",order,fid,purpose);}}
 public Map<String,Object> get(CurrentUser u,long fid){Map<String,Object> f=db.one("SELECT * FROM file_resource WHERE file_id=?",fid);if(Input.id(f.get("uploader_user_id"))!=u.id()&&!u.role().equals("ADMIN")){boolean stayAccess=switch(u.role()){case "STUDENT"->db.count("SELECT COUNT(*) FROM stay_batch_material m JOIN stay_batch b ON b.batch_id=m.batch_id JOIN stay_building_rule r ON r.batch_id=b.batch_id JOIN v_accommodation_current a ON a.building_id=r.building_id WHERE m.file_id=? AND a.student_id=? AND b.current_status='OPEN'",fid,u.id())>0;case "DORM_MANAGER"->db.count("SELECT COUNT(*) FROM stay_batch_material m JOIN stay_building_rule r ON r.batch_id=m.batch_id JOIN manager_building_scope s ON s.building_id=r.building_id WHERE m.file_id=? AND s.manager_user_id=?",fid,u.id())>0;default->false;};String rule=switch(u.role()){case "STUDENT"->"o.student_id="+u.id();case "DORM_MANAGER"->"r.building_id IN (SELECT building_id FROM manager_building_scope WHERE manager_user_id="+u.id()+")";case "REPAIRER"->"EXISTS(SELECT 1 FROM repair_dispatch d WHERE d.order_id=o.order_id AND d.repairer_user_id="+u.id()+")";default->"1=0";};if(!stayAccess&&db.count("SELECT COUNT(*) FROM repair_attachment a JOIN repair_order o ON o.order_id=a.order_id JOIN dorm_room r ON r.room_id=o.room_id WHERE a.file_id=? AND ("+rule+")",fid)==0)throw BizException.forbidden();}return f;}
 public byte[] bytes(Map<String,Object> file)throws IOException{return Files.readAllBytes(root.resolve(file.get("storage_name").toString()));}
}
