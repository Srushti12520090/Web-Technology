package com.cricket.live;

import com.cricket.live.engine.BallGenerator;
import com.cricket.live.engine.BallInput;
import com.cricket.live.engine.ScoringEngine;
import com.cricket.live.model.*;
import com.cricket.live.service.TeamCatalog;
import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

class ScoringEngineTest {

    private final TeamCatalog catalog = new TeamCatalog();
    private final ScoringEngine engine = new ScoringEngine();

    private Match liveMatch(int overs) {
        Match m = new Match("T1", "Test Ground", catalog.all().get(0), catalog.all().get(1), overs, false);
        engine.start(m, new Random(7));
        return m;
    }

    @Test
    void wideAddsPenaltyAndIsNotALegalBall() {
        Match m = liveMatch(5);
        Innings i = m.current();
        String striker = i.strikerId;
        engine.apply(m, new BallInput(0, ExtraType.WIDE, false, null));
        assertEquals(1, i.runs);
        assertEquals(0, i.legalBalls);
        assertEquals(0, i.batters.get(striker).balls);
        assertEquals(1, i.wides);
    }

    @Test
    void noBallCreditsBatterPlusPenaltyToBowler() {
        Match m = liveMatch(5);
        Innings i = m.current();
        String striker = i.strikerId;
        engine.apply(m, new BallInput(4, ExtraType.NO_BALL, false, null));
        assertEquals(5, i.runs);
        assertEquals(4, i.batters.get(striker).runs);
        assertEquals(1, i.batters.get(striker).balls);
        assertEquals(5, i.bowlers.get(i.bowlerId).runs);
        assertEquals(0, i.legalBalls);
    }

    @Test
    void oddRunsRotateStrikeAndOverEndRotatesAgain() {
        Match m = liveMatch(5);
        Innings i = m.current();
        String first = i.strikerId;
        engine.apply(m, BallInput.runs(1));
        assertNotEquals(first, i.strikerId);
        for (int b = 0; b < 5; b++) engine.apply(m, BallInput.runs(0));
        // 6 legal balls: single swapped once, end of over swaps back
        assertEquals(first, i.strikerId);
        assertEquals(6, i.legalBalls);
    }

    @Test
    void bowlerCannotBowlConsecutiveOversAndOversAreCapped() {
        Match m = liveMatch(10);
        Innings i = m.current();
        String previous = null;
        for (int over = 0; over < 10; over++) {
            String bowler = i.bowlerId;
            if (previous != null) assertNotEquals(previous, bowler);
            for (int b = 0; b < 6 && !i.complete; b++) engine.apply(m, BallInput.runs(0));
            previous = bowler;
        }
        i.bowlers.values().forEach(b -> assertTrue(b.completedOvers() <= 2, b.name + " bowled too many overs"));
    }

    @Test
    void maidenAndWicketAreRecorded() {
        Match m = liveMatch(5);
        Innings i = m.current();
        String bowler = i.bowlerId;
        for (int b = 0; b < 5; b++) engine.apply(m, BallInput.runs(0));
        engine.apply(m, new BallInput(0, ExtraType.NONE, true, DismissalType.BOWLED));
        assertEquals(1, i.bowlers.get(bowler).maidens);
        assertEquals(1, i.bowlers.get(bowler).wickets);
        assertEquals(1, i.wickets);
        assertEquals(1, i.fallOfWickets.size());
        assertTrue(i.batters.size() >= 3, "a new batter should have come in");
    }

    @Test
    void runOutIsNotCreditedToBowler() {
        Match m = liveMatch(5);
        Innings i = m.current();
        engine.apply(m, new BallInput(1, ExtraType.NONE, true, DismissalType.RUN_OUT));
        assertEquals(0, i.bowlers.get(i.bowlerId).wickets);
        assertEquals(1, i.wickets);
    }

    @Test
    void inningsEndsWhenOversAreDoneAndSecondInningsGetsTarget() {
        Match m = liveMatch(1);
        for (int b = 0; b < 6; b++) engine.apply(m, BallInput.runs(2));
        assertTrue(m.innings.get(0).complete);
        assertEquals(2, m.innings.size());
        assertEquals(13, m.current().target);
        assertEquals(MatchStatus.LIVE, m.status);
    }

    @Test
    void chasingTeamWinsAsSoonAsTargetIsPassed() {
        Match m = liveMatch(1);
        for (int b = 0; b < 6; b++) engine.apply(m, BallInput.runs(1)); // 6 -> target 7
        for (int b = 0; b < 2; b++) engine.apply(m, BallInput.runs(4)); // 8 >= 7
        assertEquals(MatchStatus.COMPLETED, m.status);
        assertEquals(m.innings.get(1).batting, m.winner);
        assertTrue(m.result.contains("won by 10 wickets"), m.result);
    }

    @Test
    void tiedMatchHasNoWinner() {
        Match m = liveMatch(1);
        for (int b = 0; b < 6; b++) engine.apply(m, BallInput.runs(1));
        for (int b = 0; b < 6; b++) engine.apply(m, BallInput.runs(1));
        assertEquals(MatchStatus.COMPLETED, m.status);
        assertNull(m.winner);
        assertEquals("Match tied", m.result);
    }

    @Test
    void rejectsImpossibleDeliveriesAndScoringAfterTheEnd() {
        assertThrows(IllegalArgumentException.class, () -> new BallInput(0, ExtraType.NO_BALL, true, DismissalType.BOWLED));
        assertThrows(IllegalArgumentException.class, () -> new BallInput(8, ExtraType.NONE, false, null));
        assertThrows(IllegalArgumentException.class, () -> new BallInput(0, ExtraType.NONE, true, null));
        Match m = liveMatch(1);
        while (m.status == MatchStatus.LIVE) engine.apply(m, BallInput.runs(0));
        assertThrows(IllegalStateException.class, () -> engine.apply(m, BallInput.runs(1)));
    }

    @Test
    void simulatedMatchesAlwaysReconcile() {
        BallGenerator gen = new BallGenerator();
        Random rnd = new Random(2024);
        int[] formats = {1, 5, 10, 20};
        for (int n = 0; n < 400; n++) {
            Match m = new Match("S" + n, "V", catalog.all().get(n % 3), catalog.all().get(3 + n % 3), formats[n % 4], true);
            engine.start(m, rnd);
            while (m.status == MatchStatus.LIVE) engine.apply(m, gen.next(m, rnd));
            for (Innings i : m.innings) {
                int bat = i.batters.values().stream().mapToInt(b -> b.runs).sum();
                assertEquals(i.runs, bat + i.extrasTotal());
                assertEquals(i.legalBalls, i.bowlers.values().stream().mapToInt(b -> b.legalBalls).sum());
                assertEquals(i.runs, i.balls.stream().mapToInt(BallEvent::runs).sum());
                assertTrue(i.wickets <= 10);
            }
            assertNotNull(m.result);
        }
    }
}
