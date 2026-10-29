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
 public void attach(CurrentUser u,long order,String purpose,Object raw,boolean required){List<?> ids=raw instanceof List<?> list?list:List.of();BizException.require(!required||!ids.isEmpty(),"请上传现场照片");BizException.require(ids.size()<=8,"最多上传8张图片");for(Object v:ids){long fid=Input.id(v);if(db.count("SELECT COUNT(*) FROM file_resource WHERE file_id=? AND uploader_user_id=?",fid,u.id())==0)throw BizException.forbidden();db.update("INSERT IGNORE INTO repair_attachment(order_id,file_id,purpose) VALUES(?,?,?)",order,fid,purpose);}}
 public Map<String,Object> get(CurrentUser u,long fid){Map<String,Object> f=db.one("SELECT * FROM file_resource WHERE file_id=?",fid);if(Input.id(f.get("uploader_user_id"))!=u.id()&&!u.role().equals("ADMIN")){String rule=switch(u.role()){case "STUDENT"->"o.student_id="+u.id();case "DORM_MANAGER"->"r.building_id IN (SELECT building_id FROM manager_building_scope WHERE manager_user_id="+u.id()+")";case "REPAIRER"->"EXISTS(SELECT 1 FROM repair_dispatch d WHERE d.order_id=o.order_id AND d.repairer_user_id="+u.id()+")";default->"1=0";};if(db.count("SELECT COUNT(*) FROM repair_attachment a JOIN repair_order o ON o.order_id=a.order_id JOIN dorm_room r ON r.room_id=o.room_id WHERE a.file_id=? AND ("+rule+")",fid)==0)throw BizException.forbidden();}return f;}
 public byte[] bytes(Map<String,Object> file)throws IOException{return Files.readAllBytes(root.resolve(file.get("storage_name").toString()));}
}
