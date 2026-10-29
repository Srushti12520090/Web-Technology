package com.cricket.live.service;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Seeds a few matches in different states so the dashboard has something to show on first load. */
@Component
@ConditionalOnProperty(name = "cricket.demo-data", havingValue = "true", matchIfMissing = true)
public class DemoDataLoader implements ApplicationRunner {

    private final MatchService matches;

    public DemoDataLoader(MatchService matches) { this.matches = matches; }

    @Override
    public void run(ApplicationArguments args) {
        var done = matches.create("MLN", "RST", 5, true, false);
        matches.fastForward(done.id());

        var live1 = matches.create("THK", "RFL", 20, true, true);
        matches.advance(live1.id(), 58);
        var live2 = matches.create("DVP", "HSK", 10, true, true);
        matches.advance(live2.id(), 27);

        matches.create("RFL", "MLN", 20, false, true);   // upcoming: start it from the dashboard or API
    }
}
