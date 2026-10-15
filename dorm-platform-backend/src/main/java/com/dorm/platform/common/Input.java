package com.dorm.platform.common;
import java.time.*;
import java.util.*;
public final class Input {
 private Input(){}
 public static String text(Map<String,?> b,String k){return Objects.toString(b.get(k),"").trim();}
 public static String required(Map<String,?> b,String k){String v=text(b,k);BizException.require(!v.isBlank(),k+"不能为空");return v;}
 public static long id(Object v){try{return Long.parseLong(Objects.toString(v,""));}catch(Exception e){throw new BizException(400,"编号格式无效");}}
 public static boolean flag(Map<String,?> b,String k){Object v=b.get(k);return Boolean.TRUE.equals(v)||"1".equals(Objects.toString(v))||"true".equals(Objects.toString(v));}
 public static LocalDateTime time(Object v){try{var parsed=java.time.format.DateTimeFormatter.ISO_DATE_TIME.parseBest(Objects.toString(v,"").replace(' ','T'),OffsetDateTime::from,LocalDateTime::from);return parsed instanceof OffsetDateTime offset?offset.atZoneSameInstant(ZoneId.of("Asia/Shanghai")).toLocalDateTime():(LocalDateTime)parsed;}catch(Exception e){throw new BizException(400,"日期时间格式无效");}}
 public static LocalDate date(Object v){try{return LocalDate.parse(Objects.toString(v,""));}catch(Exception e){throw new BizException(400,"日期格式无效");}}
 public static void role(com.dorm.platform.security.CurrentUser u,String... roles){if(u==null||Arrays.stream(roles).noneMatch(u.role()::equals))throw BizException.forbidden();}
}
