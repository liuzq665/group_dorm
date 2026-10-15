package com.dorm.platform.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    private final JdbcTemplate db;
    private record Session(CurrentUser user,String passwordHash,java.time.Instant expiresAt) {}
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    public AuthService(JdbcTemplate db) { this.db = db; }
    public Map<String,Object> login(String account, String password) {
        if(account==null||account.isBlank()||password==null||password.isBlank())throw new com.dorm.platform.common.BizException(400,"账号和密码不能为空");
        String hash = sha256(password);
        var users = db.query("SELECT user_id,login_account,real_name,role_code FROM sys_user WHERE login_account=? AND password_hash=? AND enabled=1", (rs,n)->new CurrentUser(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4)), account, hash);
        if (users.isEmpty()) { db.update("INSERT INTO login_log(account,success) VALUES(?,0)",account); throw new com.dorm.platform.common.BizException(401,"账号、密码错误或账号已停用"); }
        CurrentUser user=users.get(0); String token=UUID.randomUUID().toString(); sessions.entrySet().removeIf(e->e.getValue().expiresAt().isBefore(java.time.Instant.now())); sessions.put(token,new Session(user,hash,java.time.Instant.now().plusSeconds(28800)));
        db.update("INSERT INTO login_log(user_id,account,success) VALUES(?,?,1)",user.id(),account);
        return Map.of("token",token,"user",user);
    }
    public CurrentUser current(String token) {
        Session session=token==null?null:sessions.get(token);
        if(session==null)return null;
        CurrentUser user=session.user();
        if(session.expiresAt().isBefore(java.time.Instant.now()) || db.queryForObject("SELECT COUNT(*) FROM sys_user WHERE user_id=? AND enabled=1 AND role_code=? AND password_hash=?",Integer.class,user.id(),user.role(),session.passwordHash())==0){sessions.remove(token);return null;}
        return user;
    }
    public void logout(String token) { if (token != null) sessions.remove(token); }
    public static String sha256(String text) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); } catch(Exception e){ throw new IllegalStateException(e); } }
}
