package com.cricket.live.model;

public class BattingEntry {
    public final String playerId;
    public final String name;
    public int runs, balls, fours, sixes;
    public boolean out;
    public String howOut = "not out";

    public BattingEntry(String playerId, String name) {
        this.playerId = playerId;
        this.name = name;
    }
}
