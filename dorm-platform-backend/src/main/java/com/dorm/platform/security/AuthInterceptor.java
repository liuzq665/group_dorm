package com.dorm.platform.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final AuthService auth;
    public AuthInterceptor(AuthService auth) { this.auth=auth; }
    @Override public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if (req.getMethod().equals("OPTIONS")) return true;
        if (req.getRequestURI().equals("/api/v1/auth/login") || req.getRequestURI().startsWith("/error")) return true;
        String token=req.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) token=token.substring(7);
        req.setAttribute("authToken", token);
        CurrentUser user=auth.current(token);
        if(user==null){res.setStatus(401);res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"code\":401,\"message\":\"请先登录\",\"data\":null}");return false;}
        req.setAttribute("currentUser",user); return true;
    }
}
