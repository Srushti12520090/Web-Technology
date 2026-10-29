package com.cricket.live.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Drives the simulated live feed: one delivery per live match per tick, and keeps the demo populated. */
@Component
@ConditionalOnProperty(name = "cricket.simulator.enabled", havingValue = "true", matchIfMissing = true)
public class SimulationScheduler {

    private final MatchService matches;
    private final int minLiveMatches;
    private final int newMatchOvers;

    public SimulationScheduler(MatchService matches,
                               @Value("${cricket.simulator.min-live-matches:2}") int minLiveMatches,
                               @Value("${cricket.simulator.new-match-overs:10}") int newMatchOvers) {
        this.matches = matches;
        this.minLiveMatches = minLiveMatches;
        this.newMatchOvers = newMatchOvers;
    }

    @Scheduled(fixedDelayString = "${cricket.simulator.tick-ms:1500}")
    public void tick() {
        matches.simulateTick();
        if (minLiveMatches > 0 && matches.liveCount() < minLiveMatches) {
            matches.createRandom(newMatchOvers);
        }
    }
}
