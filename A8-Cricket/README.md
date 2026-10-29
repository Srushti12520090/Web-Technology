# Cricket Live

Real-time cricket score management on Spring Boot 3.3 / Java 21. A rules engine scores matches ball by ball
(simulated feed or manual entry), REST APIs expose scores, scorecards, commentary, stats and match reports, and a
dashboard follows matches live over Server-Sent Events.

    mvn spring-boot:run        # http://localhost:8080
    mvn test

## Architecture
- `engine/` – framework-free cricket rules (`ScoringEngine`), delivery generator (`BallGenerator`), input validation (`BallInput`).
- `model/` – mutable match state; one read/write lock per match, so matches never contend.
- `service/` – `MatchService` (orchestration + notifications), `StatsService` (cached aggregates), `SimulationScheduler`
  (one ball per live match per tick), `MatchRepository` (in-memory; swap for JPA/Redis).
- `stream/StreamHub` – SSE fan-out with a bounded per-client queue on virtual threads; slow clients are dropped, never block scoring.
- `web/` – controllers + RFC 7807 errors. `static/` – dashboard (no build step, no CDN).
- Micrometer metrics: `cricket.balls.processed`, `cricket.matches.live`, `cricket.sse.subscribers` (`/actuator/metrics`).

## REST API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/matches?status=LIVE` | list match summaries |
| POST | `/api/matches` | `{teamA, teamB, overs, startNow, autoSimulate}` |
| GET | `/api/matches/{id}` | live state, scorecards, recent balls |
| GET | `/api/matches/{id}/scorecard` · `/commentary?after=&limit=` · `/report` | scorecard, ball-by-ball, summary (player of the match, key moments, run progression) |
| POST | `/api/matches/{id}/start` | toss + start an upcoming match |
| POST | `/api/matches/{id}/balls` | manual delivery `{runs, extra, wicket, dismissal}` (pause simulation first) |
| PUT | `/api/matches/{id}/simulation` | `{enabled}` |
| GET | `/api/stream` · `/api/matches/{id}/stream` | SSE: `snapshot`/`summary`, `detail` |
| GET | `/api/teams` · `/api/players/{id}` · `/api/stats/leaders` | squads, player stats, leaderboards |

Set `cricket.admin-key` to require an `X-API-Key` header on write endpoints. Simulator settings are under `cricket.simulator.*`
in `application.yml`. Teams and players are fictional.
