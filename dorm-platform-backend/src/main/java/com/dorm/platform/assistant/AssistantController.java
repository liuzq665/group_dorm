package com.dorm.platform.assistant;

import com.dorm.platform.common.ApiResponse;
import com.dorm.platform.security.CurrentUser;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {
    private final AssistantService service;

    public AssistantController(AssistantService service) {
        this.service = service;
    }

    @PostMapping("/messages")
    public ApiResponse<?> send(@RequestAttribute CurrentUser currentUser, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.send(currentUser, body));
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ApiResponse<?> clear(@RequestAttribute CurrentUser currentUser, @PathVariable String conversationId) {
        service.clear(currentUser, conversationId);
        return ApiResponse.ok();
    }
}
