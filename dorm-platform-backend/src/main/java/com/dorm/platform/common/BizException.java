package com.dorm.platform.common;

public class BizException extends RuntimeException {
    private final int status;
    public BizException(int status, String message) { super(message); this.status = status; }
    public int status() { return status; }
    public static BizException forbidden() { return new BizException(403, "无权访问该数据或执行此操作"); }
    public static void require(boolean condition, String message) { if (!condition) throw new BizException(400, message); }
}
