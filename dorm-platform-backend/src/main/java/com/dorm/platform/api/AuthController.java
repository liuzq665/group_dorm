package com.dorm.platform.api;
import com.dorm.platform.common.ApiResponse;
import com.dorm.platform.security.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
 private final AuthService auth;
 public AuthController(AuthService auth){this.auth=auth;}
 @PostMapping("/login") public ApiResponse<?> login(@RequestBody Map<String,String>b){return ApiResponse.ok(auth.login(b.get("loginAccount"),b.get("password")));}
 @PostMapping("/logout") public ApiResponse<?> logout(HttpServletRequest r){auth.logout((String)r.getAttribute("authToken"));return ApiResponse.ok();}
 @GetMapping("/me") public ApiResponse<?> me(HttpServletRequest r){return ApiResponse.ok(r.getAttribute("currentUser"));}
}
