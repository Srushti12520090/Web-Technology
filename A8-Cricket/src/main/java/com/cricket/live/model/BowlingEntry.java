package com.cricket.live.model;

public class BowlingEntry {
    public final String playerId;
    public final String name;
    public int legalBalls, runs, wickets, maidens, wides, noBalls;
    /** Runs charged to the bowler in the over currently in progress (for maiden detection). */
    public int currentOverRuns;

    public BowlingEntry(String playerId, String name) {
        this.playerId = playerId;
        this.name = name;
    }

    public int completedOvers() { return legalBalls / 6; }
}
