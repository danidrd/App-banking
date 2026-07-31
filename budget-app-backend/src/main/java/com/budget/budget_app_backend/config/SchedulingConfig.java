package com.budget.budget_app_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Abilita i job schedulati (es. BankSyncScheduler) senza toccare la classe principale dell'applicazione. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}