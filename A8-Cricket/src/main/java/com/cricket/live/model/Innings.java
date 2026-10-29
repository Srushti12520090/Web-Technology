package com.cricket.live.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Innings {
    public final int number;
    public final Team batting;
    public final Team bowling;

    public int runs, wickets, legalBalls;
    public int wides, noBalls, byes, legByes;
    public final Map<String, BattingEntry> batters = new LinkedHashMap<>();
    public final Map<String, BowlingEntry> bowlers = new LinkedHashMap<>();
    public final List<BallEvent> balls = new ArrayList<>();
    public final List<FallOfWicket> fallOfWickets = new ArrayList<>();

    public String strikerId, nonStrikerId, bowlerId, lastBowlerId;
    public int nextBatterIndex;
    public int partnershipRuns, partnershipBalls;
    public Integer target;               // only for the chasing innings
    public boolean complete;

    /** Symbols for the current/last over; cleared when the first ball of the next over is bowled. */
    public final List<String> thisOver = new ArrayList<>();
    public boolean overJustEnded;

    public Innings(int number, Team batting, Team bowling) {
        this.number = number;
        this.batting = batting;
        this.bowling = bowling;
    }

    public int extrasTotal() { return wides + noBalls + byes + legByes; }
}
