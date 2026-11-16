package com.flamehaus.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Turns on @Scheduled. Without this the SLA check never runs. Safe to have twice. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
