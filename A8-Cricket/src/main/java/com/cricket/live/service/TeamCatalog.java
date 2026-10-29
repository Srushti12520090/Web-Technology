package com.cricket.live.service;

import com.cricket.live.model.Player;
import com.cricket.live.model.Role;
import com.cricket.live.model.Team;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Fictional franchises and players used by the simulator. */
public class TeamCatalog {

    private static final String[][] TEAMS = {
            {"THK", "Thunder Hawks"}, {"RFL", "Royal Falcons"}, {"DVP", "Desert Vipers"},
            {"HSK", "Harbor Sharks"}, {"MLN", "Mountain Lions"}, {"RST", "River Stallions"}};
    private static final String[] FIRST = {"Arjun", "Rohan", "Kabir", "Dev", "Ishaan", "Vikram", "Neil", "Sameer", "Aman", "Tarun",
            "Yash", "Zane", "Liam", "Owen", "Ethan", "Mateo", "Jonah", "Caleb", "Finn", "Hugo"};
    private static final String[] LAST = {"Rao", "Khanna", "Mehta", "Sethi", "Bose", "Kulkarni", "Iyer", "Naidu", "Grewal", "Pillai",
            "Hart", "Cole", "Reed", "Voss", "Lowe", "Marsh", "Quinn", "Shaw", "Frost", "Blake"};
    private static final Role[] ROLES = {Role.BATTER, Role.BATTER, Role.BATTER, Role.WICKET_KEEPER, Role.ALL_ROUNDER,
            Role.ALL_ROUNDER, Role.ALL_ROUNDER, Role.BOWLER, Role.BOWLER, Role.BOWLER, Role.BOWLER};

    private final Map<String, Team> teams = new LinkedHashMap<>();
    private final Map<String, Player> players = new LinkedHashMap<>();

    public TeamCatalog() {
        for (int t = 0; t < TEAMS.length; t++) {
            String code = TEAMS[t][0];
            List<Player> squad = new ArrayList<>();
            for (int i = 0; i < 11; i++) {
                String name = FIRST[(t * 5 + i * 3) % FIRST.length] + " " + LAST[(t * 3 + i * 7) % LAST.length];
                Player p = new Player(code + "-" + String.format("%02d", i + 1), name, ROLES[i], code);
                squad.add(p);
                players.put(p.id(), p);
            }
            teams.put(code, new Team(code, TEAMS[t][1], squad));
        }
    }

    public List<Team> all() { return List.copyOf(teams.values()); }
    public Optional<Team> team(String code) { return Optional.ofNullable(teams.get(code == null ? null : code.toUpperCase())); }
    public Optional<Player> player(String id) { return Optional.ofNullable(players.get(id)); }
}
