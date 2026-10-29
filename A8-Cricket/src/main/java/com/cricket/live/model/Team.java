package com.cricket.live.model;

import java.util.List;

public record Team(String code, String name, List<Player> players) {
    public Team {
        players = List.copyOf(players);
    }
    public Player player(String id) {
        return players.stream().filter(p -> p.id().equals(id)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown player " + id));
    }
}
