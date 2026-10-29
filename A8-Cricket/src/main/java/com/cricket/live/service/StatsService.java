package com.cricket.live.service;

import com.cricket.live.api.Dtos.Leaders;
import com.cricket.live.api.Dtos.PlayerStats;
import com.cricket.live.model.*;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Career-style player statistics aggregated across every stored match (live innings included).
 * Results are cached and rebuilt at most twice a second, and only when something has changed.
 */
@Service
public class StatsService {

    private static final long MIN_REBUILD_MS = 500;

    private static final class Acc {
        final Set<String> matches = new HashSet<>();
        int innings, runs, balls, highest, fours, sixes, wickets, conceded, ballsBowled, bestW, bestR = Integer.MAX_VALUE;
    }

    private record Cache(long version, long builtAt, Map<String, PlayerStats> stats) {}

    private final MatchService matches;
    private final TeamCatalog catalog;
    private volatile Cache cache = new Cache(-1, 0, Map.of());

    public StatsService(MatchService matches, TeamCatalog catalog) {
        this.matches = matches;
        this.catalog = catalog;
    }

    public Optional<PlayerStats> player(String id) {
        Player p = catalog.player(id).orElseThrow(() -> new NotFoundException("Player " + id + " not found"));
        PlayerStats s = stats().get(id);
        return Optional.of(s != null ? s : empty(p));
    }

    public Leaders leaders(int limit) {
        int n = Math.max(1, Math.min(limit, 25));
        Collection<PlayerStats> all = stats().values();
        return new Leaders(
                all.stream().filter(s -> s.runs() > 0).sorted(Comparator.comparingInt(PlayerStats::runs).reversed()
                        .thenComparing(Comparator.comparingDouble(PlayerStats::strikeRate).reversed())).limit(n).toList(),
                all.stream().filter(s -> s.wickets() > 0).sorted(Comparator.comparingInt(PlayerStats::wickets).reversed()
                        .thenComparingDouble(PlayerStats::economy)).limit(n).toList(),
                all.stream().filter(s -> s.sixes() > 0).sorted(Comparator.comparingInt(PlayerStats::sixes).reversed()
                        .thenComparing(Comparator.comparingInt(PlayerStats::runs).reversed())).limit(n).toList());
    }

    private Map<String, PlayerStats> stats() {
        Cache c = cache;
        long v = matches.globalVersion();
        long now = System.currentTimeMillis();
        if (c.version == v || (now - c.builtAt) < MIN_REBUILD_MS && c.version >= 0) return c.stats;
        Map<String, PlayerStats> built = build();
        cache = new Cache(v, now, built);
        return built;
    }

    private Map<String, PlayerStats> build() {
        Map<String, Acc> acc = new HashMap<>();
        for (Match m : matches.allMatches()) {
            matches.readMatch(m, mm -> {
                for (Innings i : mm.innings) {
                    for (BattingEntry b : i.batters.values()) {
                        Acc a = acc.computeIfAbsent(b.playerId, k -> new Acc());
                        a.matches.add(mm.id);
                        a.innings++;
                        a.runs += b.runs; a.balls += b.balls; a.fours += b.fours; a.sixes += b.sixes;
                        a.highest = Math.max(a.highest, b.runs);
                    }
                    for (BowlingEntry b : i.bowlers.values()) {
                        Acc a = acc.computeIfAbsent(b.playerId, k -> new Acc());
                        a.matches.add(mm.id);
                        a.wickets += b.wickets; a.conceded += b.runs; a.ballsBowled += b.legalBalls;
                        if (b.wickets > a.bestW || (b.wickets == a.bestW && b.runs < a.bestR)) { a.bestW = b.wickets; a.bestR = b.runs; }
                    }
                }
                return null;
            });
        }
        Map<String, PlayerStats> out = new HashMap<>();
        acc.forEach((id, a) -> catalog.player(id).ifPresent(p -> out.put(id, new PlayerStats(
                id, p.name(), p.teamCode(), p.role().name(), a.matches.size(), a.innings, a.runs, a.balls, a.highest,
                a.fours, a.sixes, a.balls == 0 ? 0 : round2(a.runs * 100.0 / a.balls), a.wickets, a.conceded, a.ballsBowled,
                a.ballsBowled == 0 ? 0 : round2(a.conceded * 6.0 / a.ballsBowled), a.bestW,
                a.bestR == Integer.MAX_VALUE ? 0 : a.bestR))));
        return out;
    }

    private static PlayerStats empty(Player p) {
        return new PlayerStats(p.id(), p.name(), p.teamCode(), p.role().name(), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    private static double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
