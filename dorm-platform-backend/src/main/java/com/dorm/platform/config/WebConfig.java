package com.dorm.platform.config;
import com.dorm.platform.security.AuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
@Configuration public class WebConfig implements WebMvcConfigurer {
  @org.springframework.beans.factory.annotation.Value("${app.frontend-origin:http://localhost:5173}") private String frontendOrigin;
  private final AuthInterceptor interceptor; public WebConfig(AuthInterceptor interceptor){this.interceptor=interceptor;}
  @Override public void addInterceptors(InterceptorRegistry r){r.addInterceptor(interceptor).addPathPatterns("/api/**");}
  @Override public void addCorsMappings(CorsRegistry r){r.addMapping("/api/**").allowedOrigins(frontendOrigin).allowedMethods("GET","POST","PUT","DELETE","OPTIONS").allowedHeaders("*");}
}
