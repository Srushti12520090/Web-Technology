package com.cricket.live.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class Match {
    public final String id;
    public final String venue;
    public final Team teamA;
    public final Team teamB;
    public final int overs;
    public final Instant createdAt = Instant.now();

    public volatile MatchStatus status = MatchStatus.UPCOMING;
    public Team tossWinner;
    public boolean tossWinnerBats;
    public Team battingFirst;
    public final List<Innings> innings = new ArrayList<>();
    public String result;
    public Team winner;                 // null for tie / no result
    public volatile boolean autoSimulate;
    public long version;
    public Instant updatedAt = Instant.now();
    /** Highest ball sequence number issued so far. */
    public int ballSeq;

    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

    public Match(String id, String venue, Team teamA, Team teamB, int overs, boolean autoSimulate) {
        this.id = id;
        this.venue = venue;
        this.teamA = teamA;
        this.teamB = teamB;
        this.overs = overs;
        this.autoSimulate = autoSimulate;
    }

    public ReentrantReadWriteLock lock() { return lock; }

    public String title() { return teamA.name() + " vs " + teamB.name(); }

    public Innings current() {
        return innings.isEmpty() ? null : innings.get(innings.size() - 1);
    }

    public Team other(Team t) { return t == teamA ? teamB : teamA; }

    public void touch() {
        version++;
        updatedAt = Instant.now();
    }
}
