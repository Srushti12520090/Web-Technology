package com.cricket.live.web;

import com.cricket.live.api.Dtos.*;
import com.cricket.live.service.StatsService;
import com.cricket.live.service.TeamCatalog;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class StatsController {

    private final StatsService stats;
    private final TeamCatalog catalog;

    public StatsController(StatsService stats, TeamCatalog catalog) {
        this.stats = stats;
        this.catalog = catalog;
    }

    @GetMapping("/teams")
    public List<TeamInfo> teams() {
        return catalog.all().stream().map(t -> new TeamInfo(t.code(), t.name(),
                t.players().stream().map(p -> new PlayerInfo(p.id(), p.name(), p.role().name())).toList())).toList();
    }

    @GetMapping("/players/{id}")
    public PlayerStats player(@PathVariable String id) {
        return stats.player(id).orElseThrow();
    }

    @GetMapping("/stats/leaders")
    public Leaders leaders(@RequestParam(defaultValue = "5") int limit) {
        return stats.leaders(limit);
    }
}
