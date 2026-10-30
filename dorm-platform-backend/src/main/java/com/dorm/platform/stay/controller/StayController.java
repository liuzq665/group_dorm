package com.dorm.platform.stay.controller;
import com.dorm.platform.common.*;
import com.dorm.platform.security.CurrentUser;
import com.dorm.platform.stay.service.StayService;
import com.dorm.platform.file.service.FileService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.io.IOException;
@RestController @RequestMapping("/api/v1/stay")
public class StayController {
 private final StayService service; private final FileService files;
 public StayController(StayService service,FileService files){this.service=service;this.files=files;}
 @PostMapping("/batches/{id}/lock") public ApiResponse<?> lockBatch(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.lockBatch(currentUser,id);return ApiResponse.ok();}
 @GetMapping("/current") public ApiResponse<?> batches(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(service.batches(currentUser));}
 @GetMapping("/applications") public ApiResponse<?> list(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(service.list(currentUser));}
 @PostMapping("/applications") public ApiResponse<?> save(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.save(currentUser,b));}
 @PostMapping("/applications/{id}/submit") public ApiResponse<?> submit(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.submit(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/applications/{id}/withdraw") public ApiResponse<?> withdraw(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.withdraw(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/applications/{id}/lock") public ApiResponse<?> lock(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.lock(currentUser,id,Input.flag(b,"locked"));return ApiResponse.ok();}
 @PostMapping("/applications/{id}/review") public ApiResponse<?> review(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.review(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/supplements") public ApiResponse<?> supplement(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.supplement(currentUser,b));}
 @PostMapping("/batches") public ApiResponse<?> create(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.configure(currentUser,null,b));}
 @PutMapping("/batches/{id}") public ApiResponse<?> configure(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.configure(currentUser,id,b));}
 @PostMapping("/batches/{id}/publish") public ApiResponse<?> publish(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.publish(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/batches/{id}/materials") public ApiResponse<?> uploadMaterial(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestParam MultipartFile file)throws IOException{var uploaded=files.uploadStayMaterial(currentUser,file);service.attachMaterial(currentUser,id,((Number)uploaded.get("fileId")).longValue());return ApiResponse.ok(uploaded);}
 @DeleteMapping("/batches/{id}/materials/{fileId}") public ApiResponse<?> removeMaterial(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@PathVariable long fileId){service.removeMaterial(currentUser,id,fileId);return ApiResponse.ok();}
}
