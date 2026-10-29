package com.cricket.live.model;

import java.time.Instant;

/** One delivery (legal or not) as recorded in the ball-by-ball log. Immutable. */
public record BallEvent(
        int seq,               // 1-based, per match, strictly increasing
        int inningsNo,
        String overLabel,      // e.g. "14.3"
        String bowlerId,
        String bowlerName,
        String batterId,
        String batterName,
        int runs,              // total runs added to the score on this delivery (incl. penalties)
        ExtraType extra,
        boolean wicket,
        DismissalType dismissal,
        String dismissedName,
        String label,          // short symbol used in the "this over" strip: 0 1 4 6 W Wd Nb ...
        String commentary,
        int scoreAfter,
        int wicketsAfter,
        Instant at) {
}
