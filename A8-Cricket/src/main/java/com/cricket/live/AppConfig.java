package com.cricket.live;

import com.cricket.live.api.DtoMapper;
import com.cricket.live.engine.BallGenerator;
import com.cricket.live.engine.ScoringEngine;
import com.cricket.live.service.TeamCatalog;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Wires the framework-free core (rules engine, generator, mapper, catalog) into the Spring context. */
@Configuration
public class AppConfig {
    @Bean ScoringEngine scoringEngine() { return new ScoringEngine(); }
    @Bean BallGenerator ballGenerator() { return new BallGenerator(); }
    @Bean DtoMapper dtoMapper() { return new DtoMapper(); }
    @Bean TeamCatalog teamCatalog() { return new TeamCatalog(); }
}
