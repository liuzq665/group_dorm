package com.dorm.platform.common;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;
public final class Input {
 /** 手机号：可带 +86/86 前缀的 11 位中国大陆手机号。 */
 private static final Pattern MOBILE=Pattern.compile("^(?:\\+?86)?1[3-9]\\d{9}$");
 /** 固定电话：区号 0 开头，可带分隔符，7-8 位号码。 */
 private static final Pattern LANDLINE=Pattern.compile("^0\\d{2,3}-?\\d{7,8}$");
 private Input(){}
 public static String text(Map<String,?> b,String k){return Objects.toString(b.get(k),"").trim();}
 public static String required(Map<String,?> b,String k){String v=text(b,k);BizException.require(!v.isBlank(),k+"不能为空");return v;}
 public static long id(Object v){try{return Long.parseLong(Objects.toString(v,""));}catch(Exception e){throw new BizException(400,"编号格式无效");}}
 public static boolean flag(Map<String,?> b,String k){Object v=b.get(k);return Boolean.TRUE.equals(v)||"1".equals(Objects.toString(v))||"true".equals(Objects.toString(v));}
 public static LocalDateTime time(Object v){try{var parsed=java.time.format.DateTimeFormatter.ISO_DATE_TIME.parseBest(Objects.toString(v,"").replace(' ','T'),OffsetDateTime::from,LocalDateTime::from);return parsed instanceof OffsetDateTime offset?offset.atZoneSameInstant(ZoneId.of("Asia/Shanghai")).toLocalDateTime():(LocalDateTime)parsed;}catch(Exception e){throw new BizException(400,"日期时间格式无效");}}
 public static LocalDate date(Object v){try{return LocalDate.parse(Objects.toString(v,""));}catch(Exception e){throw new BizException(400,"日期格式无效");}}
 public static boolean validContact(String value){return value!=null&&(MOBILE.matcher(value).matches()||LANDLINE.matcher(value).matches());}
 /** 联系方式：允许留空，非空时必须是规范的手机号或固定电话。 */
 public static String contact(Map<String,?> b,String k){String value=text(b,k);BizException.require(value.isBlank()||validContact(value),"联系方式格式不正确，请填写11位手机号（如13800000000）或带区号的固定电话（如010-88886666）");return value;}
 public static void role(com.dorm.platform.security.CurrentUser u,String... roles){if(u==null||Arrays.stream(roles).noneMatch(u.role()::equals))throw BizException.forbidden();}
}
