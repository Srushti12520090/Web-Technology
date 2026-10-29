package com.cricket.live.engine;

import com.cricket.live.model.*;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Pure cricket rules: applies one delivery to a match. Not thread-safe by itself;
 * callers hold the match's write lock (see MatchService).
 */
public class ScoringEngine {

    private static final int WICKETS_TO_END = 10;

    /** Performs the toss, sets up innings one. */
    public void start(Match m, Random rnd) {
        if (m.status != MatchStatus.UPCOMING) throw new IllegalStateException("Match already started");
        m.tossWinner = rnd.nextBoolean() ? m.teamA : m.teamB;
        m.tossWinnerBats = rnd.nextBoolean();
        m.battingFirst = m.tossWinnerBats ? m.tossWinner : m.other(m.tossWinner);
        m.status = MatchStatus.LIVE;
        startInnings(m, 1, m.battingFirst, m.other(m.battingFirst), null);
        m.touch();
    }

    private void startInnings(Match m, int no, Team bat, Team bowl, Integer target) {
        Innings inn = new Innings(no, bat, bowl);
        inn.target = target;
        Player p0 = bat.players().get(0), p1 = bat.players().get(1);
        inn.batters.put(p0.id(), new BattingEntry(p0.id(), p0.name()));
        inn.batters.put(p1.id(), new BattingEntry(p1.id(), p1.name()));
        inn.strikerId = p0.id();
        inn.nonStrikerId = p1.id();
        inn.nextBatterIndex = 2;
        m.innings.add(inn);
        selectBowler(m, inn);
    }

    public BallEvent apply(Match m, BallInput in) {
        if (m.status != MatchStatus.LIVE) throw new IllegalStateException("Match is not live (" + m.status + ")");
        Innings inn = m.current();
        if (inn == null || inn.complete) throw new IllegalStateException("No innings in progress");

        BattingEntry striker = inn.batters.get(inn.strikerId);
        BowlingEntry bowler = inn.bowlers.get(inn.bowlerId);

        if (inn.overJustEnded) {
            inn.thisOver.clear();
            inn.overJustEnded = false;
        }

        final boolean legal = in.legal();
        final int penalty = legal ? 0 : 1;
        final int total = in.runs() + penalty;

        inn.runs += total;
        inn.partnershipRuns += total;
        switch (in.extra()) {
            case NONE -> {
                striker.runs += in.runs();
                countBoundary(striker, in.runs());
                bowler.runs += total;
                bowler.currentOverRuns += total;
            }
            case NO_BALL -> {
                inn.noBalls += 1;
                bowler.noBalls += 1;
                striker.runs += in.runs();
                countBoundary(striker, in.runs());
                bowler.runs += total;
                bowler.currentOverRuns += total;
            }
            case WIDE -> {
                inn.wides += total;
                bowler.wides += total;
                bowler.runs += total;
                bowler.currentOverRuns += total;
            }
            case BYE -> inn.byes += in.runs();
            case LEG_BYE -> inn.legByes += in.runs();
        }
        if (in.extra() != ExtraType.WIDE) striker.balls++;
        if (legal) {
            inn.legalBalls++;
            inn.partnershipBalls++;
            bowler.legalBalls++;
        }

        // Wicket: the batter at the striker's end is dismissed.
        String dismissedId = null;
        String dismissedName = null;
        if (in.wicket()) {
            dismissedId = striker.playerId;
            dismissedName = striker.name;
            inn.wickets++;
            striker.out = true;
            DismissalType d = in.dismissal();
            Player bp = inn.bowling.player(bowler.playerId);
            striker.howOut = switch (d) {
                case BOWLED -> "b " + bp.name();
                case LBW -> "lbw b " + bp.name();
                case CAUGHT -> "c b " + bp.name();   // fielder resolved just below
                case STUMPED -> "st b " + bp.name();
                case RUN_OUT -> "run out";
            };
            if (d == DismissalType.CAUGHT) {
                Player fielder = pickFielder(inn, bowler.playerId, inn.runs + inn.wickets);
                striker.howOut = fielder.id().equals(bowler.playerId)
                        ? "c & b " + bp.name()
                        : "c " + fielder.name() + " b " + bp.name();
            }
            if (d.creditsBowler()) bowler.wickets++;
            inn.fallOfWickets.add(new FallOfWicket(inn.wickets, inn.runs, striker.name, overLabel(inn.legalBalls)));
            inn.partnershipRuns = 0;
            inn.partnershipBalls = 0;
        }

        // Strike rotation on odd runs (runs physically run), before replacing a dismissed batter.
        if (in.runs() % 2 == 1) swapStrike(inn);

        if (in.wicket() && inn.wickets < WICKETS_TO_END) {
            Player next = inn.batting.players().get(inn.nextBatterIndex++);
            inn.batters.put(next.id(), new BattingEntry(next.id(), next.name()));
            if (inn.strikerId.equals(dismissedId)) inn.strikerId = next.id();
            else inn.nonStrikerId = next.id();
        }

        // Event record (built before over-end bookkeeping so the label shows the ball just bowled).
        String label = label(in);
        inn.thisOver.add(label);
        m.ballSeq++;
        String ol = legal ? overLabel(inn.legalBalls) : overLabel(inn.legalBalls) + "*";
        BallEvent ev = new BallEvent(m.ballSeq, inn.number, ol, bowler.playerId, bowler.name,
                striker.playerId, striker.name, total, in.extra(), in.wicket(), in.dismissal(), dismissedName,
                label, commentary(in, bowler.name, striker.name, dismissedName, striker.howOut, total),
                inn.runs, inn.wickets, Instant.now());
        inn.balls.add(ev);

        // End of over.
        boolean overEnded = legal && inn.legalBalls % 6 == 0;
        if (overEnded) {
            if (bowler.currentOverRuns == 0) bowler.maidens++;
            bowler.currentOverRuns = 0;
            swapStrike(inn);
            inn.lastBowlerId = bowler.playerId;
            inn.overJustEnded = true;
        }

        // End of innings / match.
        boolean allOut = inn.wickets >= WICKETS_TO_END;
        boolean oversDone = inn.legalBalls >= m.overs * 6;
        boolean chased = inn.target != null && inn.runs >= inn.target;
        if (allOut || oversDone || chased) {
            inn.complete = true;
            if (inn.number == 1) {
                startInnings(m, 2, inn.bowling, inn.batting, inn.runs + 1);
            } else {
                finish(m, inn);
            }
        } else if (overEnded) {
            selectBowler(m, inn);
        }
        m.touch();
        return ev;
    }

    private void finish(Match m, Innings chase) {
        Innings first = m.innings.get(0);
        m.status = MatchStatus.COMPLETED;
        m.autoSimulate = false;
        if (chase.runs >= chase.target) {
            m.winner = chase.batting;
            int wl = WICKETS_TO_END - chase.wickets;
            m.result = chase.batting.name() + " won by " + wl + (wl == 1 ? " wicket" : " wickets");
        } else if (chase.runs == first.runs) {
            m.winner = null;
            m.result = "Match tied";
        } else {
            m.winner = first.batting;
            int margin = first.runs - chase.runs;
            m.result = first.batting.name() + " won by " + margin + (margin == 1 ? " run" : " runs");
        }
    }

    /** Picks the next bowler: not the previous over's bowler, within the per-bowler quota, fewest overs first. */
    void selectBowler(Match m, Innings inn) {
        int cap = Math.max(1, (int) Math.ceil(m.overs / 5.0));
        List<Player> candidates = inn.bowling.players().stream()
                .filter(Player::canBowl)
                .filter(p -> !p.id().equals(inn.lastBowlerId))
                .toList();
        Comparator<Player> byLoad = Comparator
                .comparingInt((Player p) -> overs(inn, p))
                .thenComparing(p -> p.role() == Role.BOWLER ? 0 : 1);
        Player pick = candidates.stream().filter(p -> overs(inn, p) < cap).min(byLoad)
                .orElseGet(() -> candidates.stream().min(byLoad).orElseThrow());
        inn.bowlerId = pick.id();
        inn.bowlers.computeIfAbsent(pick.id(), id -> new BowlingEntry(pick.id(), pick.name()));
    }

    private static int overs(Innings inn, Player p) {
        BowlingEntry e = inn.bowlers.get(p.id());
        return e == null ? 0 : e.completedOvers();
    }

    private static Player pickFielder(Innings inn, String bowlerId, int salt) {
        List<Player> field = inn.bowling.players();
        Player f = field.get(Math.floorMod(salt * 7 + 3, field.size()));
        return f;
    }

    private static void swapStrike(Innings inn) {
        String t = inn.strikerId;
        inn.strikerId = inn.nonStrikerId;
        inn.nonStrikerId = t;
    }

    private static void countBoundary(BattingEntry b, int runs) {
        if (runs == 4) b.fours++;
        else if (runs == 6) b.sixes++;
    }

    public static String overLabel(int legalBalls) {
        return (legalBalls / 6) + "." + (legalBalls % 6);
    }

    static String label(BallInput in) {
        String n = in.runs() == 0 ? "" : String.valueOf(in.runs());
        if (in.wicket()) return in.runs() > 0 ? "W+" + in.runs() : "W";
        return switch (in.extra()) {
            case NONE -> String.valueOf(in.runs());
            case WIDE -> n + "Wd";
            case NO_BALL -> n + "Nb";
            case BYE -> n + "B";
            case LEG_BYE -> n + "Lb";
        };
    }

    static String commentary(BallInput in, String bowler, String batter, String dismissed, String howOut, int total) {
        if (in.wicket()) {
            return switch (in.dismissal()) {
                case BOWLED -> "OUT! " + bowler + " cleans up " + dismissed + ". Timber! (" + howOut + ")";
                case CAUGHT -> "OUT! " + dismissed + " finds the fielder. " + howOut;
                case LBW -> "OUT! " + dismissed + " is trapped in front. " + howOut;
                case STUMPED -> "OUT! " + dismissed + " is out of the crease and gone. " + howOut;
                case RUN_OUT -> "OUT! Mix-up in the middle, " + dismissed + " is run out.";
            };
        }
        return switch (in.extra()) {
            case WIDE -> bowler + " strays down the leg side, wide" + (in.runs() > 0 ? " and they run " + in.runs() + " more" : "") + ". " + total + " to the total.";
            case NO_BALL -> "No-ball from " + bowler + "! " + (in.runs() == 0 ? "Free hit coming up." : batter + " makes it count for " + total + ".");
            case BYE -> in.runs() + (in.runs() == 1 ? " bye" : " byes") + " as the keeper misses it.";
            case LEG_BYE -> in.runs() + (in.runs() == 1 ? " leg bye" : " leg byes") + " off the pads.";
            case NONE -> switch (in.runs()) {
                case 0 -> bowler + " to " + batter + ", no run. Dot ball.";
                case 1 -> batter + " nudges it for a single.";
                case 2 -> batter + " places it in the gap, two runs.";
                case 3 -> batter + " pushes hard and gets three.";
                case 4 -> "FOUR! " + batter + " finds the boundary off " + bowler + ".";
                case 6 -> "SIX! " + batter + " launches " + bowler + " into the stands!";
                default -> batter + " scores " + in.runs() + ".";
            };
        };
    }
}
