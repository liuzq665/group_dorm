package com.dorm.platform.system.controller;
import com.dorm.platform.common.*;
import com.dorm.platform.security.CurrentUser;
import com.dorm.platform.system.service.SystemTaskService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.*;
@RestController @RequestMapping("/api/v1/admin")
public class SystemTaskController {
 private final SystemTaskService service;
 public SystemTaskController(SystemTaskService service){this.service=service;}
 @PostMapping("/task-files") public ApiResponse<?> upload(@RequestAttribute CurrentUser currentUser,@RequestParam MultipartFile file)throws Exception{return ApiResponse.ok(Map.of("fileId",service.upload(currentUser,file.getBytes())));}
 @PostMapping("/data-tasks") public ResponseEntity<?> create(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){return ResponseEntity.accepted().body(ApiResponse.ok(service.create(currentUser,b)));}
 @GetMapping("/data-tasks") public ApiResponse<?> list(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(service.dataTasks(currentUser));}
 @GetMapping("/data-tasks/{id}") public ApiResponse<?> detail(@RequestAttribute CurrentUser currentUser,@PathVariable long id){return ApiResponse.ok(service.dataTask(currentUser,id));}
 @DeleteMapping("/data-tasks/{id}") public ApiResponse<?> cancel(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.cancel(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/backup-tasks") public ResponseEntity<?> backup(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){BizException.require("BACKUP".equals(Input.text(b,"taskType")),"当前接口仅提供数据库备份");return ResponseEntity.accepted().body(ApiResponse.ok(service.backupTask(currentUser,Input.text(b,"businessType"))));}
 @GetMapping("/backup-tasks") public ApiResponse<?> backups(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(service.backups(currentUser));}
 @DeleteMapping("/backup-tasks") public ApiResponse<?> deleteBackups(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){Object raw=b.get("ids");if(!(raw instanceof List<?> ids))throw new BizException(400,"请选择要删除的备份记录");service.deleteBackups(currentUser,ids.stream().map(Input::id).toList());return ApiResponse.ok();}
 @PostMapping("/backup-tasks/download") public ResponseEntity<byte[]> downloadBackups(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b)throws Exception{Object raw=b.get("ids");if(!(raw instanceof List<?> ids))throw new BizException(400,"请选择要下载的备份记录");return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=database-backups.zip").contentType(MediaType.APPLICATION_OCTET_STREAM).body(service.downloadBackups(currentUser,ids.stream().map(Input::id).toList()));}
}
