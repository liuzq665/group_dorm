package com.dorm.platform.system.controller;
import com.dorm.platform.common.*;
import com.dorm.platform.security.CurrentUser;
import com.dorm.platform.system.service.SystemTaskService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
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
 @PostMapping("/backup-tasks") public ResponseEntity<?> backup(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){BizException.require("BACKUP".equals(Input.text(b,"taskType")),"当前接口仅提供数据库备份");return ResponseEntity.accepted().body(ApiResponse.ok(service.backupTask(currentUser)));}
 @GetMapping("/backup-tasks") public ApiResponse<?> backups(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(service.backups(currentUser));}
}
