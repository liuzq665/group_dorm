package com.dorm.platform.repair.controller;
import com.dorm.platform.common.ApiResponse;
import com.dorm.platform.security.CurrentUser;
import com.dorm.platform.repair.service.RepairService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/v1")
public class RepairController {
 private final RepairService service;
 public RepairController(RepairService service){this.service=service;}
 @GetMapping("/repair-catalog") public ApiResponse<?> catalog(@RequestAttribute CurrentUser currentUser){return ApiResponse.ok(service.catalog(currentUser));}
 @GetMapping("/repair-orders") public ApiResponse<?> list(@RequestAttribute CurrentUser currentUser,@RequestParam Map<String,String> filters){return ApiResponse.ok(service.list(currentUser,filters,false));}
 @GetMapping("/repair-history") public ApiResponse<?> history(@RequestAttribute CurrentUser currentUser,@RequestParam Map<String,String> filters){return ApiResponse.ok(service.list(currentUser,filters,true));}
 @GetMapping("/repair-orders/{id}") public ApiResponse<?> detail(@RequestAttribute CurrentUser currentUser,@PathVariable long id){return ApiResponse.ok(service.detail(currentUser,id));}
 @GetMapping("/repair-orders/{id}/candidates") public ApiResponse<?> candidates(@RequestAttribute CurrentUser currentUser,@PathVariable long id){return ApiResponse.ok(service.candidates(currentUser,id));}
 @PostMapping("/repair-orders") public ApiResponse<?> create(@RequestAttribute CurrentUser currentUser,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.create(currentUser,b));}
 @PutMapping("/repair-orders/{id}") public ApiResponse<?> edit(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.edit(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/submit") public ApiResponse<?> submit(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.submit(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/cancel") public ApiResponse<?> cancel(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.cancel(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/review") public ApiResponse<?> review(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.review(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/dispatch") public ApiResponse<?> dispatch(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.dispatch(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/retry") public ApiResponse<?> retry(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.retry(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/decision") public ApiResponse<?> decision(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.decision(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/result") public ApiResponse<?> result(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.result(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/delay") public ApiResponse<?> delay(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.delay(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/delay-review") public ApiResponse<?> delayReview(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.reviewDelay(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/confirm") public ApiResponse<?> confirm(@RequestAttribute CurrentUser currentUser,@PathVariable long id){service.confirm(currentUser,id);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/evaluation") public ApiResponse<?> evaluate(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){service.evaluate(currentUser,id,b);return ApiResponse.ok();}
 @PostMapping("/repair-orders/{id}/rework") public ApiResponse<?> rework(@RequestAttribute CurrentUser currentUser,@PathVariable long id,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.rework(currentUser,id,b));}
}
