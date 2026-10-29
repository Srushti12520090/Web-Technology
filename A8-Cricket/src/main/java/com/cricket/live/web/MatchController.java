package com.cricket.live.web;

import com.cricket.live.api.Dtos.*;
import com.cricket.live.model.BallEvent;
import com.cricket.live.model.MatchStatus;
import com.cricket.live.service.MatchService;
import com.cricket.live.stream.StreamHub;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class MatchController {

    private final MatchService matches;
    private final StreamHub hub;
    private final String adminKey;

    public MatchController(MatchService matches, StreamHub hub, @Value("${cricket.admin-key:}") String adminKey) {
        this.matches = matches;
        this.hub = hub;
        this.adminKey = adminKey;
    }

    // ------------------------------------------------------------ reads

    @GetMapping("/matches")
    public List<MatchSummary> list(@RequestParam(required = false) MatchStatus status) {
        return matches.list(Optional.ofNullable(status));
    }

    @GetMapping("/matches/{id}")
    public MatchDetail detail(@PathVariable String id) {
        return matches.detail(id);
    }

    @GetMapping("/matches/{id}/scorecard")
    public List<InningsCard> scorecard(@PathVariable String id) {
        return matches.scorecard(id);
    }

    @GetMapping("/matches/{id}/commentary")
    public List<BallEvent> commentary(@PathVariable String id,
                                      @RequestParam(defaultValue = "-1") int after,
                                      @RequestParam(defaultValue = "30") int limit) {
        return matches.commentary(id, after, limit);
    }

    @GetMapping("/matches/{id}/report")
    public MatchReport report(@PathVariable String id) {
        return matches.report(id);
    }

    // ------------------------------------------------------------ live streams (SSE)

    /** All matches: an initial "snapshot" event, then a "summary" event whenever any match changes. */
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAll() {
        return hub.subscribe(StreamHub.GLOBAL, "snapshot", matches.snapshot());
    }

    /** One match: an initial "detail" event, then a fresh "detail" (live state + scorecards) after every ball. */
    @GetMapping(path = "/matches/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMatch(@PathVariable String id) {
        MatchDetail initial = matches.detail(id); // 404 for unknown ids before opening the stream
        return hub.subscribe(id, "detail", initial);
    }

    // ------------------------------------------------------------ writes (guarded by optional admin key)

    @PostMapping("/matches")
    public ResponseEntity<MatchSummary> create(@Valid @RequestBody Requests.CreateMatch req,
                                               @RequestHeader(value = "X-API-Key", required = false) String key) {
        authorize(key);
        MatchSummary s = matches.create(req.teamA(), req.teamB(),
                req.overs() == null ? 20 : req.overs(),
                req.startNow() == null || req.startNow(),
                req.autoSimulate() == null || req.autoSimulate());
        return ResponseEntity.created(URI.create("/api/matches/" + s.id())).body(s);
    }

    @PostMapping("/matches/{id}/start")
    public MatchSummary start(@PathVariable String id, @RequestHeader(value = "X-API-Key", required = false) String key) {
        authorize(key);
        return matches.start(id);
    }

    /** Manual score update: report one delivery. Requires the simulation to be paused for that match. */
    @PostMapping("/matches/{id}/balls")
    public ResponseEntity<BallEvent> score(@PathVariable String id, @Valid @RequestBody Requests.Ball req,
                                           @RequestHeader(value = "X-API-Key", required = false) String key) {
        authorize(key);
        return ResponseEntity.status(201).body(matches.score(id, req.toInput()));
    }

    @PutMapping("/matches/{id}/simulation")
    public MatchSummary simulation(@PathVariable String id, @RequestBody Requests.Simulation req,
                                   @RequestHeader(value = "X-API-Key", required = false) String key) {
        authorize(key);
        return matches.setSimulation(id, req.enabled());
    }

    private void authorize(String key) {
        if (!adminKey.isBlank() && !adminKey.equals(key)) throw new UnauthorizedException("Missing or invalid X-API-Key");
    }
}
