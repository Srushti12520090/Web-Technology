package com.cricket.live.api;

import com.cricket.live.model.BallEvent;
import com.cricket.live.model.MatchStatus;

import java.time.Instant;
import java.util.List;

/** Read models returned by the REST API and pushed over SSE. All immutable snapshots. */
public final class Dtos {
    private Dtos() {}

    public record InningsLine(int number, String teamCode, String teamName, int runs, int wickets, String overs, boolean current) {}

    public record MatchSummary(String id, String title, String venue, MatchStatus status, int totalOvers,
                               String toss, List<InningsLine> innings, String statusLine, String result,
                               boolean simulating, long version, Instant updatedAt) {}

    public record BatterRow(String id, String name, int runs, int balls, int fours, int sixes, double strikeRate,
                            String howOut, boolean out, boolean onStrike) {}

    public record BowlerRow(String id, String name, String overs, int maidens, int runs, int wickets, double economy,
                            int wides, int noBalls) {}

    public record FowRow(int wicketNo, int score, String batter, String over) {}

    public record InningsCard(int number, String teamCode, String teamName, int runs, int wickets, String overs,
                              double runRate, String extras, List<BatterRow> batting, List<String> yetToBat,
                              List<BowlerRow> bowling, List<FowRow> fallOfWickets) {}

    public record LiveState(int inningsNo, String battingTeam, BatterRow striker, BatterRow nonStriker, BowlerRow bowler,
                            double runRate, Double requiredRate, Integer target, Integer runsNeeded, Integer ballsRemaining,
                            Integer projectedScore, String partnership, List<String> thisOver) {}

    public record MatchDetail(MatchSummary summary, LiveState live, List<InningsCard> scorecards, List<BallEvent> recent) {}

    public record Performer(String playerId, String name, String team, String line, int points) {}

    public record KeyMoment(String over, int innings, String text) {}

    public record OverRuns(int innings, List<Integer> runsPerOver, List<Integer> cumulative) {}

    public record MatchReport(MatchSummary summary, Performer playerOfTheMatch, List<Performer> topBatters,
                              List<Performer> topBowlers, List<KeyMoment> keyMoments, List<OverRuns> progression,
                              int totalFours, int totalSixes, int totalExtras) {}

    public record PlayerStats(String playerId, String name, String team, String role, int matches, int innings,
                              int runs, int balls, int highestScore, int fours, int sixes, double strikeRate,
                              int wickets, int runsConceded, int ballsBowled, double economy, int bestFiguresWickets,
                              int bestFiguresRuns) {}

    public record Leaders(List<PlayerStats> runs, List<PlayerStats> wickets, List<PlayerStats> sixes) {}

    public record TeamInfo(String code, String name, List<PlayerInfo> players) {}

    public record PlayerInfo(String id, String name, String role) {}
}
