package com.cricket.live.service;

import com.cricket.live.api.DtoMapper;
import com.cricket.live.api.Dtos.*;
import com.cricket.live.engine.BallGenerator;
import com.cricket.live.engine.BallInput;
import com.cricket.live.engine.ScoringEngine;
import com.cricket.live.model.*;
import com.cricket.live.stream.StreamHub;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

/**
 * Orchestrates matches: creation, scoring, simulation and change notification.
 *
 * Concurrency model: every match has its own read/write lock, so unrelated matches never contend and any number of
 * readers can view a match while at most one writer scores it. DTO snapshots are built under the lock and handed to
 * the {@link StreamHub} which delivers them asynchronously.
 */
@Service
public class MatchService {

    private static final String[] VENUES = {"Harbor Oval", "Eden Ridge Stadium", "Sunrise Park", "Northgate Ground",
            "Lakeside Arena", "Fort Maidan", "Bayview Stadium"};

    private final MatchRepository repo;
    private final ScoringEngine engine;
    private final BallGenerator generator;
    private final DtoMapper mapper;
    private final TeamCatalog catalog;
    private final StreamHub hub;
    private final Counter ballsProcessed;
    private final int maxStoredMatches;

    private final AtomicInteger idSeq = new AtomicInteger(1000);
    private final AtomicLong globalVersion = new AtomicLong();

    public MatchService(MatchRepository repo, ScoringEngine engine, BallGenerator generator, DtoMapper mapper,
                        TeamCatalog catalog, StreamHub hub, MeterRegistry registry,
                        @Value("${cricket.max-stored-matches:200}") int maxStoredMatches) {
        this.repo = repo;
        this.engine = engine;
        this.generator = generator;
        this.mapper = mapper;
        this.catalog = catalog;
        this.hub = hub;
        this.maxStoredMatches = maxStoredMatches;
        this.ballsProcessed = registry.counter("cricket.balls.processed");
        Gauge.builder("cricket.matches.live", this, s -> s.countByStatus(MatchStatus.LIVE)).register(registry);
    }

    // ---------------------------------------------------------------- commands

    public MatchSummary create(String teamACode, String teamBCode, int overs, boolean startNow, boolean autoSimulate) {
        Team a = catalog.team(teamACode).orElseThrow(() -> new IllegalArgumentException("Unknown team " + teamACode));
        Team b = catalog.team(teamBCode).orElseThrow(() -> new IllegalArgumentException("Unknown team " + teamBCode));
        if (a.code().equals(b.code())) throw new IllegalArgumentException("A team cannot play itself");
        if (overs < 1 || overs > 50) throw new IllegalArgumentException("overs must be between 1 and 50");

        String id = "M" + idSeq.incrementAndGet();
        String venue = VENUES[ThreadLocalRandom.current().nextInt(VENUES.length)];
        Match m = new Match(id, venue, a, b, overs, autoSimulate);
        repo.save(m);
        evictOldMatches();
        if (startNow) return write(id, mm -> { engine.start(mm, ThreadLocalRandom.current()); return publish(mm); });
        return write(id, this::publish);
    }

    /** Creates a match between two random teams; used by the keep-alive simulator. */
    public MatchSummary createRandom(int overs) {
        List<Team> all = new ArrayList<>(catalog.all());
        java.util.Collections.shuffle(all, ThreadLocalRandom.current());
        return create(all.get(0).code(), all.get(1).code(), overs, true, true);
    }

    public MatchSummary start(String id) {
        return write(id, m -> { engine.start(m, ThreadLocalRandom.current()); return publish(m); });
    }

    /** Applies a manually reported delivery. Refused while the simulator drives the match. */
    public BallEvent score(String id, BallInput in) {
        return write(id, m -> {
            if (m.autoSimulate) throw new IllegalStateException("Match is auto-simulated; pause the simulation before scoring manually");
            BallEvent ev = applyBall(m, in);
            publish(m);
            return ev;
        });
    }

    public MatchSummary setSimulation(String id, boolean enabled) {
        return write(id, m -> {
            if (m.status == MatchStatus.COMPLETED && enabled) throw new IllegalStateException("Match is completed");
            m.autoSimulate = enabled;
            m.touch();
            return publish(m);
        });
    }

    /** One simulator tick: bowls one delivery in every live, auto-simulated match. */
    public int simulateTick() {
        List<Match> live = repo.findAll().stream()
                .filter(m -> m.status == MatchStatus.LIVE && m.autoSimulate).toList();
        live.parallelStream().forEach(m -> {
            var lock = m.lock().writeLock();
            lock.lock();
            try {
                if (m.status == MatchStatus.LIVE && m.autoSimulate) {
                    applyBall(m, generator.next(m, ThreadLocalRandom.current()));
                    publish(m);
                }
            } finally {
                lock.unlock();
            }
        });
        return live.size();
    }

    /** Bowls {@code balls} deliveries (or until the match ends) with a single notification at the end. */
    public void advance(String id, int balls) {
        write(id, m -> {
            for (int i = 0; i < balls && m.status == MatchStatus.LIVE; i++) applyBall(m, generator.next(m, ThreadLocalRandom.current()));
            return publish(m);
        });
    }

    public void fastForward(String id) {
        advance(id, Integer.MAX_VALUE);
    }

    public int liveCount() { return countByStatus(MatchStatus.LIVE); }

    // ---------------------------------------------------------------- queries

    public List<MatchSummary> list(Optional<MatchStatus> status) {
        Comparator<MatchSummary> order = Comparator
                .comparingInt((MatchSummary s) -> switch (s.status()) { case LIVE -> 0; case UPCOMING -> 1; case COMPLETED -> 2; })
                .thenComparing(Comparator.comparing(MatchSummary::updatedAt).reversed());
        return repo.findAll().stream()
                .filter(m -> status.isEmpty() || m.status == status.get())
                .map(m -> read(m, mapper::summary))
                .sorted(order)
                .toList();
    }

    public MatchDetail detail(String id) { return read(id, mapper::detail); }

    public List<InningsCard> scorecard(String id) { return read(id, m -> m.innings.stream().map(mapper::card).toList()); }

    public MatchReport report(String id) { return read(id, mapper::report); }

    /**
     * Ball-by-ball commentary. With {@code after < 0}: the latest {@code limit} balls of the current innings,
     * newest first. Otherwise: balls with seq &gt; after across all innings, oldest first (for incremental polling).
     */
    public List<BallEvent> commentary(String id, int after, int limit) {
        int lim = Math.max(1, Math.min(limit, 500));
        return read(id, m -> {
            List<BallEvent> out = new ArrayList<>();
            if (after < 0) {
                Innings cur = m.current();
                if (cur != null) for (int k = cur.balls.size() - 1; k >= 0 && out.size() < lim; k--) out.add(cur.balls.get(k));
            } else {
                for (Innings i : m.innings) {
                    for (BallEvent e : i.balls) {
                        if (e.seq() > after) { out.add(e); if (out.size() >= lim) return out; }
                    }
                }
            }
            return out;
        });
    }

    public List<Match> allMatches() { return repo.findAll(); }

    public long globalVersion() { return globalVersion.get(); }

    public <T> T readMatch(Match m, Function<Match, T> fn) { return read(m, fn); }

    public Optional<Match> find(String id) { return repo.find(id); }

    public List<MatchSummary> snapshot() { return list(Optional.empty()); }

    // ---------------------------------------------------------------- internals

    private BallEvent applyBall(Match m, BallInput in) {
        BallEvent ev = engine.apply(m, in);
        ballsProcessed.increment();
        return ev;
    }

    /** Must be called while holding the match write lock. */
    private MatchSummary publish(Match m) {
        globalVersion.incrementAndGet();
        MatchSummary s = mapper.summary(m);
        hub.publish(StreamHub.GLOBAL, "summary", s);
        hub.publish(m.id, "detail", mapper.detail(m));
        return s;
    }

    private Match get(String id) {
        return repo.find(id).orElseThrow(() -> new NotFoundException("Match " + id + " not found"));
    }

    private <T> T read(String id, Function<Match, T> fn) { return read(get(id), fn); }

    private <T> T read(Match m, Function<Match, T> fn) {
        var lock = m.lock().readLock();
        lock.lock();
        try { return fn.apply(m); } finally { lock.unlock(); }
    }

    private <T> T write(String id, Function<Match, T> fn) {
        Match m = get(id);
        var lock = m.lock().writeLock();
        lock.lock();
        try { return fn.apply(m); } finally { lock.unlock(); }
    }

    private int countByStatus(MatchStatus s) {
        return (int) repo.findAll().stream().filter(m -> m.status == s).count();
    }

    /** Bounds memory: once over the cap, the oldest completed matches are dropped. */
    private void evictOldMatches() {
        int excess = repo.count() - maxStoredMatches;
        if (excess <= 0) return;
        repo.findAll().stream()
                .filter(m -> m.status == MatchStatus.COMPLETED)
                .sorted(Comparator.comparing((Match m) -> m.createdAt))
                .limit(excess)
                .forEach(m -> repo.delete(m.id));
    }
}
