package com.dorm.platform.system.controller;

import com.dorm.platform.common.*;
import com.dorm.platform.security.CurrentUser;
import com.dorm.platform.system.service.ManagementService;
import com.dorm.platform.repair.service.RepairService;
import com.dorm.platform.stay.service.StayService;
import com.dorm.platform.notice.service.NoticeService;
import com.dorm.platform.file.service.FileService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
import java.io.IOException;

@RestController @RequestMapping("/api/v1")
public class ManagementController {
 private final ManagementService management; private final RepairService repair; private final StayService stay; private final NoticeService notice; private final FileService files;
 public ManagementController(ManagementService m,RepairService r,StayService s,NoticeService n,FileService f){management=m;repair=r;stay=s;notice=n;files=f;}
 @GetMapping("/dashboard") public ApiResponse<?> dashboard(@RequestAttribute CurrentUser currentUser){
  var history=repair.list(currentUser);
  var orders=currentUser.role().equals("REPAIRER")?history.stream().filter(x->x.get("repairer_user_id")!=null&&Input.id(x.get("repairer_user_id"))==currentUser.id()).toList():history;
  var counts=new LinkedHashMap<String,Object>();
  counts.put("repairTotal",history.size());
  counts.put("repairPending",orders.stream().filter(x->Set.of("PENDING_REVIEW","PENDING_ASSIGN","PENDING_MANUAL","PENDING_ACCEPT").contains(x.get("current_status"))).count());
  counts.put("repairProcessing",orders.stream().filter(x->Set.of("ACCEPTED","DELAYED","REPAIRED").contains(x.get("current_status"))).count());
  counts.put("repairClosed",orders.stream().filter(x->Set.of("CONFIRMED","ARCHIVED","CLOSED").contains(x.get("current_status"))).count());
  counts.put("unread",notice.list(currentUser).stream().filter(x->x.get("read_at")==null).count());
  counts.put("stayOpen",currentUser.role().equals("REPAIRER")?0:stay.batches(currentUser).size());
  counts.put("averageScore",orders.stream().filter(x->x.get("score")!=null).mapToDouble(x->((Number)x.get("score")).doubleValue()).average().orElse(0));
  if(Set.of("ADMIN","DORM_MANAGER").contains(currentUser.role())){
   counts.put("buildings",management.buildings(currentUser));
   var stays=stay.list(currentUser);
   counts.put("stayApproved",stays.stream().filter(x->"APPROVED".equals(x.get("current_status"))).map(x->x.get("student_id")).distinct().count());
   counts.put("stayCompleted",stays.stream().filter(x->"COMPLETED".equals(x.get("current_status"))).map(x->x.get("student_id")).distinct().count());
  }
  return ApiResponse.ok(counts);
 }
 @GetMapping("/accommodations/current") public ApiResponse<?> homes(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.homes(currentUser,false));}
 @GetMapping("/accommodations/history") public ApiResponse<?> history(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.homes(currentUser,true));}
 @GetMapping("/accommodations/roommates") public ApiResponse<?> roommates(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.roommates(currentUser));}
 @GetMapping("/buildings") public ApiResponse<?> buildings(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.buildings(currentUser));}
 @GetMapping("/rooms") public ApiResponse<?> rooms(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.rooms(currentUser));}
 @GetMapping("/beds") public ApiResponse<?> beds(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.beds(currentUser));}
 @PostMapping("/admin/resources/{type}") public ApiResponse<?> resource(@RequestAttribute CurrentUser currentUser,@PathVariable String type,@RequestBody Map<String,Object>b){return ApiResponse.ok(management.resource(currentUser,type,null,b));}
 @PutMapping("/admin/resources/{type}/{id}") public ApiResponse<?> resource(@RequestAttribute CurrentUser currentUser,@PathVariable String type,@PathVariable long id,@RequestBody Map<String,Object>b){return ApiResponse.ok(management.resource(currentUser,type,id,b));}
 @PostMapping("/admin/assignments") public ApiResponse<?> assign(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){management.assign(currentUser,b);return ApiResponse.ok();}
 @PostMapping("/admin/assignments/{id}/checkout") public ApiResponse<?> checkout(@RequestAttribute CurrentUser currentUser,@PathVariable long id){management.checkout(currentUser,id);return ApiResponse.ok();}
 @GetMapping("/profile") public ApiResponse<?> profile(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.profile(currentUser));}
 @PutMapping("/profile") public ApiResponse<?> profile(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){management.profile(currentUser,b);return ApiResponse.ok(management.profile(currentUser));}
 @PutMapping("/profile/password") public ApiResponse<?> password(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){management.password(currentUser,b);return ApiResponse.ok();}
 @GetMapping("/messages") public ApiResponse<?> messages(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(notice.list(currentUser));}
 @GetMapping("/messages/unread-count") public ApiResponse<?> unreadCount(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(Map.of("count",notice.unread(currentUser)));}
 @PostMapping("/messages") public ApiResponse<?> publish(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){notice.publish(currentUser,b);return ApiResponse.ok();}
 @PostMapping("/messages/{id}/read") public ApiResponse<?> read(@RequestAttribute CurrentUser currentUser,@PathVariable long id){notice.read(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/files") public ApiResponse<?> upload(@RequestAttribute CurrentUser currentUser,@RequestParam MultipartFile file)throws IOException{return ApiResponse.ok(files.upload(currentUser,file));}
 @GetMapping("/files/{id}") public ResponseEntity<byte[]> file(@RequestAttribute CurrentUser currentUser,@PathVariable long id)throws IOException{var file=files.get(currentUser,id);return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.get("content_type").toString())).header("X-Content-Type-Options","nosniff").body(files.bytes(file));}
 @GetMapping("/admin/users") public ApiResponse<?> users(@RequestAttribute CurrentUser currentUser,@RequestParam Map<String,String> filters){return ApiResponse.ok(management.users(currentUser,filters));}
 @GetMapping("/admin/users/next-number") public ApiResponse<?> nextIdentityNumber(@RequestAttribute CurrentUser currentUser,@RequestParam String roleCode,@RequestParam(required=false) String classId){return ApiResponse.ok(management.nextIdentityNumber(currentUser,roleCode,classId));}
 @GetMapping("/admin/users/{id}") public ApiResponse<?> userDetail(@RequestAttribute CurrentUser currentUser,@PathVariable long id){return ApiResponse.ok(management.userDetail(currentUser,id));}
 @GetMapping("/admin/academic-structure") public ApiResponse<?> academicStructure(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.academicStructure(currentUser));}
 @PostMapping("/admin/users") public ApiResponse<?> user(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){return ApiResponse.ok(management.saveUser(currentUser,null,b));}
 @PutMapping("/admin/users/{id}") public ApiResponse<?> user(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){return ApiResponse.ok(management.saveUser(currentUser,id,b));}
 @DeleteMapping("/admin/users/{id}") public ApiResponse<?> deleteUser(@RequestAttribute CurrentUser currentUser,@PathVariable long id){return ApiResponse.ok(management.deleteUser(currentUser,id));}
 @PutMapping("/admin/users/{id}/enabled") public ApiResponse<?> enabled(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){management.enabled(currentUser,id,Input.flag(b,"enabled"));return ApiResponse.ok();}
 @GetMapping("/admin/repair-config") public ApiResponse<?> config(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.config(currentUser));}
 @PostMapping("/admin/repair-rules") public ApiResponse<?> rule(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){management.saveRule(currentUser,b);return ApiResponse.ok();}
 @PutMapping("/admin/repairers/{id}") public ApiResponse<?> worker(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){management.worker(currentUser,id,b);return ApiResponse.ok();}
 @PutMapping("/admin/managers/{id}/buildings") public ApiResponse<?> managerScope(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){management.managerScope(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/admin/dictionaries/{type}") public ApiResponse<?> dictionary(@RequestAttribute CurrentUser currentUser,@PathVariable String type,@RequestBody Map<String,Object>b){management.dictionary(currentUser,type,null,b);return ApiResponse.ok();}
 @PutMapping("/admin/dictionaries/{type}/{id}") public ApiResponse<?> dictionary(@RequestAttribute CurrentUser currentUser,@PathVariable String type,@PathVariable long id,@RequestBody Map<String,Object>b){management.dictionary(currentUser,type,id,b);return ApiResponse.ok();}
 @GetMapping("/admin/logs") public ApiResponse<?> logs(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(management.logs(currentUser));}
}
