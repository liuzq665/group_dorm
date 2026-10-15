package com.dorm.platform.security;
public record CurrentUser(long id, String account, String name, String role) {}
