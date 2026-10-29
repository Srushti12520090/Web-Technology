package com.cricket.live.engine;

import com.cricket.live.model.DismissalType;
import com.cricket.live.model.ExtraType;

/**
 * A single delivery outcome as reported by a feed (simulated or manual).
 *
 * @param runs runs physically run / hit on the delivery, excluding the 1-run penalty for wides and no-balls
 *             (a wide with runs=0 scores 1; a no-ball hit for 4 scores 5)
 */
public record BallInput(int runs, ExtraType extra, boolean wicket, DismissalType dismissal) {

    public BallInput {
        if (extra == null) extra = ExtraType.NONE;
        if (runs < 0 || runs > 7) throw new IllegalArgumentException("runs must be between 0 and 7");
        if (wicket && dismissal == null) throw new IllegalArgumentException("dismissal is required when wicket is true");
        if (!wicket) dismissal = null;
        if (wicket) {
            boolean ok = switch (extra) {
                case NONE -> true;
                case WIDE -> dismissal == DismissalType.STUMPED || dismissal == DismissalType.RUN_OUT;
                case NO_BALL, BYE, LEG_BYE -> dismissal == DismissalType.RUN_OUT;
            };
            if (!ok) throw new IllegalArgumentException("Dismissal " + dismissal + " is not possible on " + extra);
        }
    }

    public boolean legal() { return extra != ExtraType.WIDE && extra != ExtraType.NO_BALL; }

    public static BallInput runs(int r) { return new BallInput(r, ExtraType.NONE, false, null); }
}
