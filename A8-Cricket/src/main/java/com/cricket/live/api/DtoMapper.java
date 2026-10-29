package com.cricket.live.api;

import com.cricket.live.api.Dtos.*;
import com.cricket.live.engine.ScoringEngine;
import com.cricket.live.model.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/** Converts mutable domain objects into immutable DTOs. Callers must hold at least the match read lock. */
public class DtoMapper {

    private static final int RECENT_BALLS = 36;

    public MatchSummary summary(Match m) {
        List<InningsLine> lines = new ArrayList<>();
        for (Innings i : m.innings) {
            lines.add(new InningsLine(i.number, i.batting.code(), i.batting.name(), i.runs, i.wickets,
                    ScoringEngine.overLabel(i.legalBalls), i == m.current() && m.status == MatchStatus.LIVE));
        }
        String toss = m.tossWinner == null ? null
                : m.tossWinner.name() + " won the toss and chose to " + (m.tossWinnerBats ? "bat" : "bowl");
        return new MatchSummary(m.id, m.title(), m.venue, m.status, m.overs, toss, lines, statusLine(m), m.result,
                m.autoSimulate, m.version, m.updatedAt);
    }

    private String statusLine(Match m) {
        return switch (m.status) {
            case UPCOMING -> "Match yet to start";
            case COMPLETED -> m.result;
            case LIVE -> {
                Innings i = m.current();
                if (i.target != null) {
                    int need = i.target - i.runs;
                    int left = m.overs * 6 - i.legalBalls;
                    yield i.batting.name() + " need " + need + " run" + (need == 1 ? "" : "s") + " from " + left + " ball" + (left == 1 ? "" : "s");
                }
                yield i.batting.name() + " batting first";
            }
        };
    }

    public MatchDetail detail(Match m) {
        List<InningsCard> cards = m.innings.stream().map(this::card).toList();
        List<BallEvent> recent = new ArrayList<>();
        Innings cur = m.current();
        if (cur != null) {
            List<BallEvent> b = cur.balls;
            for (int k = b.size() - 1; k >= 0 && recent.size() < RECENT_BALLS; k--) recent.add(b.get(k));
        }
        return new MatchDetail(summary(m), live(m), cards, recent);
    }

    public LiveState live(Match m) {
        Innings i = m.current();
        if (i == null) return null;
        BatterRow striker = null, non = null;
        BowlerRow bowler = null;
        if (m.status == MatchStatus.LIVE) {
            striker = batter(i.batters.get(i.strikerId), true);
            non = batter(i.batters.get(i.nonStrikerId), false);
            bowler = bowler(i.bowlers.get(i.bowlerId));
        }
        double crr = rate(i.runs, i.legalBalls);
        Double rrr = null;
        Integer need = null, left = null, projected = null;
        if (i.target != null) {
            need = Math.max(0, i.target - i.runs);
            left = Math.max(0, m.overs * 6 - i.legalBalls);
            rrr = left == 0 ? null : round2(need * 6.0 / left);
        } else if (i.legalBalls > 0) {
            projected = (int) Math.round(crr * m.overs);
        }
        String partnership = i.partnershipRuns + " (" + i.partnershipBalls + ")";
        return new LiveState(i.number, i.batting.name(), striker, non, bowler, crr, rrr, i.target, need, left, projected,
                partnership, List.copyOf(i.thisOver));
    }

    public InningsCard card(Innings i) {
        List<BatterRow> rows = i.batters.values().stream()
                .map(b -> batter(b, !i.complete && b.playerId.equals(i.strikerId))).toList();
        Set<String> seen = i.batters.keySet();
        List<String> yet = i.batting.players().stream().filter(p -> !seen.contains(p.id())).map(Player::name).toList();
        List<BowlerRow> bowl = i.bowlers.values().stream().map(this::bowler).toList();
        List<FowRow> fow = i.fallOfWickets.stream()
                .map(f -> new FowRow(f.wicketNo(), f.score(), f.batterName(), f.overLabel())).toList();
        String extras = i.extrasTotal() + " (b " + i.byes + ", lb " + i.legByes + ", w " + i.wides + ", nb " + i.noBalls + ")";
        return new InningsCard(i.number, i.batting.code(), i.batting.name(), i.runs, i.wickets,
                ScoringEngine.overLabel(i.legalBalls), rate(i.runs, i.legalBalls), extras, rows, yet, bowl, fow);
    }

    private BatterRow batter(BattingEntry b, boolean onStrike) {
        return new BatterRow(b.playerId, b.name, b.runs, b.balls, b.fours, b.sixes,
                b.balls == 0 ? 0 : round2(b.runs * 100.0 / b.balls), b.howOut, b.out, onStrike && !b.out);
    }

    private BowlerRow bowler(BowlingEntry b) {
        return new BowlerRow(b.playerId, b.name, ScoringEngine.overLabel(b.legalBalls), b.maidens, b.runs, b.wickets,
                b.legalBalls == 0 ? 0 : round2(b.runs * 6.0 / b.legalBalls), b.wides, b.noBalls);
    }

    public MatchReport report(Match m) {
        List<Performer> bats = new ArrayList<>();
        List<Performer> bowls = new ArrayList<>();
        List<KeyMoment> moments = new ArrayList<>();
        List<OverRuns> progression = new ArrayList<>();
        int fours = 0, sixes = 0, extras = 0;

        for (Innings i : m.innings) {
            fours += i.batters.values().stream().mapToInt(b -> b.fours).sum();
            sixes += i.batters.values().stream().mapToInt(b -> b.sixes).sum();
            extras += i.extrasTotal();
            for (BattingEntry b : i.batters.values()) {
                bats.add(new Performer(b.playerId, b.name, i.batting.code(),
                        b.runs + (b.out ? "" : "*") + " (" + b.balls + ")", b.runs));
            }
            for (BowlingEntry b : i.bowlers.values()) {
                bowls.add(new Performer(b.playerId, b.name, i.bowling.code(),
                        b.wickets + "/" + b.runs + " (" + ScoringEngine.overLabel(b.legalBalls) + ")",
                        b.wickets * 25 + Math.max(0, 30 - b.runs)));
            }
            // Over-by-over progression and key moments.
            int[] perOver = new int[Math.max(1, (i.legalBalls + 5) / 6)];
            int legal = 0;
            for (BallEvent e : i.balls) {
                int ov = Math.min(perOver.length - 1, legal / 6);
                perOver[ov] += e.runs();
                if (e.extra() != ExtraType.WIDE && e.extra() != ExtraType.NO_BALL) legal++;
                if (e.wicket()) {
                    moments.add(new KeyMoment(e.overLabel(), i.number, "Wicket: " + e.dismissedName() + " ("
                            + e.dismissal().label() + ") — " + e.scoreAfter() + "/" + e.wicketsAfter()));
                } else if (e.runs() == 6 && e.extra() == ExtraType.NONE) {
                    moments.add(new KeyMoment(e.overLabel(), i.number, "Six by " + e.batterName() + " off " + e.bowlerName()));
                }
            }
            List<Integer> per = new ArrayList<>();
            List<Integer> cum = new ArrayList<>();
            int run = 0;
            for (int r : perOver) { per.add(r); run += r; cum.add(run); }
            progression.add(new OverRuns(i.number, per, cum));
        }

        bats.sort(Comparator.comparingInt(Performer::points).reversed());
        bowls.sort(Comparator.comparingInt(Performer::points).reversed());
        // Fifties are milestones too.
        for (Innings i : m.innings) {
            for (BattingEntry b : i.batters.values()) {
                if (b.runs >= 50) moments.add(new KeyMoment("", i.number, (b.runs >= 100 ? "Century" : "Fifty") + ": " + b.name + " " + b.runs + " off " + b.balls));
            }
        }
        moments.sort(Comparator.comparingInt(KeyMoment::innings).thenComparing(k -> overKey(k.over())));

        // Player of the match: simple impact score (runs + 25 per wicket), winners preferred on ties.
        Performer pom = null;
        double best = -1;
        for (Innings i : m.innings) {
            for (BattingEntry b : i.batters.values()) {
                double s = impact(m, b.playerId);
                if (s > best) { best = s; pom = new Performer(b.playerId, b.name, i.batting.code(), summaryLine(m, b.playerId), (int) s); }
            }
            for (BowlingEntry b : i.bowlers.values()) {
                double s = impact(m, b.playerId);
                if (s > best) { best = s; pom = new Performer(b.playerId, b.name, i.bowling.code(), summaryLine(m, b.playerId), (int) s); }
            }
        }
        return new MatchReport(summary(m), m.status == MatchStatus.COMPLETED ? pom : null,
                bats.stream().limit(3).toList(), bowls.stream().filter(p -> p.points() > 0).limit(3).toList(),
                moments.stream().limit(40).toList(), progression, fours, sixes, extras);
    }

    private double impact(Match m, String playerId) {
        double s = 0;
        for (Innings i : m.innings) {
            BattingEntry b = i.batters.get(playerId);
            if (b != null) s += b.runs + 0.5 * b.sixes;
            BowlingEntry w = i.bowlers.get(playerId);
            if (w != null) s += w.wickets * 25 + Math.max(0, 12 - rate(w.runs, w.legalBalls)) ;
        }
        if (m.winner != null && playerId.startsWith(m.winner.code() + "-")) s += 5;
        return s;
    }

    private String summaryLine(Match m, String playerId) {
        StringBuilder sb = new StringBuilder();
        for (Innings i : m.innings) {
            BattingEntry b = i.batters.get(playerId);
            if (b != null) sb.append(b.runs).append(b.out ? "" : "*").append(" (").append(b.balls).append(")");
            BowlingEntry w = i.bowlers.get(playerId);
            if (w != null) {
                if (sb.length() > 0) sb.append(" & ");
                sb.append(w.wickets).append("/").append(w.runs);
            }
        }
        return sb.toString();
    }

    private static double overKey(String over) {
        if (over == null || over.isEmpty()) return 999;
        try { return Double.parseDouble(over.replace("*", "")); } catch (NumberFormatException e) { return 999; }
    }

    private static double rate(int runs, int balls) {
        return balls == 0 ? 0 : round2(runs * 6.0 / balls);
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
