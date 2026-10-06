package com.app.api.controller.system;

import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.HealthContributorRegistry;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.NamedContributor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/system")
public class SystemController {

    private final HealthContributorRegistry healthContributorRegistry;

    public SystemController(HealthContributorRegistry healthContributorRegistry) {
        this.healthContributorRegistry = healthContributorRegistry;
    }

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("status", "UP", "message", "pong");
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> stats = new HashMap<>();
        for (NamedContributor<?> contributor : healthContributorRegistry) {
            if (contributor.getContributor() instanceof HealthIndicator) {
                HealthIndicator indicator = (HealthIndicator) contributor.getContributor();
                try {
                    Health health = indicator.health();
                    Map<String, Object> component = new HashMap<>();
                    component.put("status", health.getStatus().getCode());
                    component.put("details", health.getDetails());
                    stats.put(contributor.getName(), component);
                } catch (Exception e) {
                    stats.put(contributor.getName(), Map.of("status", "DOWN", "error", e.getMessage()));
                }
            }
        }
        return Map.of("status", "UP", "components", stats);
    }
}
