package com.dorm.platform.common;
public record ApiResponse<T>(int code, String message, T data) {
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(0, "success", data); }
    public static ApiResponse<Void> ok() { return new ApiResponse<>(0, "success", null); }
    public static <T> ApiResponse<T> error(String message) { return new ApiResponse<>(40001, message, null); }
}
