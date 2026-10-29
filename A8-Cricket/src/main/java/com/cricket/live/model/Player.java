package com.cricket.live.model;

public record Player(String id, String name, Role role, String teamCode) {
    public boolean canBowl() { return role == Role.BOWLER || role == Role.ALL_ROUNDER; }
}
