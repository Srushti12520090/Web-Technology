package com.cricket.live.model;

public enum DismissalType {
    BOWLED("b"), CAUGHT("c"), LBW("lbw"), RUN_OUT("run out"), STUMPED("st");

    private final String label;
    DismissalType(String label) { this.label = label; }
    public String label() { return label; }
    /** Whether the wicket is credited to the bowler. */
    public boolean creditsBowler() { return this != RUN_OUT; }
}
