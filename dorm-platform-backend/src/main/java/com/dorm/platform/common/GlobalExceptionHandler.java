package com.dorm.platform.common;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestControllerAdvice
public class GlobalExceptionHandler {
 @ExceptionHandler(BizException.class) ResponseEntity<?> business(BizException e){return ResponseEntity.status(e.status()).body(ApiResponse.error(e.getMessage()));}
 @ExceptionHandler({IllegalArgumentException.class,IllegalStateException.class}) ResponseEntity<?> input(RuntimeException e){return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(DataIntegrityViolationException e){return ResponseEntity.status(409).body(ApiResponse.error("数据重复或关联约束不允许此操作"));}
 @ExceptionHandler(Exception.class) ResponseEntity<?> unexpected(Exception e){LoggerFactory.getLogger(getClass()).error("Request failed",e);return ResponseEntity.internalServerError().body(ApiResponse.error("服务处理失败，请查看服务日志"));}
}
