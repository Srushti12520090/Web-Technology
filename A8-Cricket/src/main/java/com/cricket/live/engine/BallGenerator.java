package com.cricket.live.engine;

import com.cricket.live.model.DismissalType;
import com.cricket.live.model.ExtraType;
import com.cricket.live.model.Innings;
import com.cricket.live.model.Match;

import java.util.Random;

/**
 * Situation-aware delivery generator that stands in for a real data feed.
 * Aggression rises in the powerplay and death overs and with the required run rate when chasing.
 */
public class BallGenerator {

    public BallInput next(Match m, Random rnd) {
        Innings inn = m.current();
        double aggression = aggression(m, inn);

        double r = rnd.nextDouble();
        if (r < 0.030) return new BallInput(rnd.nextDouble() < 0.12 ? 1 : 0, ExtraType.WIDE, false, null);
        r -= 0.030;
        if (r < 0.012) return new BallInput(pick(rnd, new double[]{0.55, 0.15, 0.02, 0, 0.18, 0, 0.10}) , ExtraType.NO_BALL, false, null);
        r -= 0.012;
        if (r < 0.008) return new BallInput(1 + rnd.nextInt(2), ExtraType.BYE, false, null);
        r -= 0.008;
        if (r < 0.015) return new BallInput(1 + rnd.nextInt(2), ExtraType.LEG_BYE, false, null);

        double wicketP = 0.042 * Math.min(1.8, 0.75 + 0.35 * aggression);
        if (rnd.nextDouble() < wicketP) {
            DismissalType d = dismissal(rnd);
            int runs = d == DismissalType.RUN_OUT ? rnd.nextInt(3) : 0;
            return new BallInput(runs, ExtraType.NONE, true, d);
        }

        // Runs off the bat: 0,1,2,3,4,5,6 — boundaries scale with aggression, dots shrink.
        double[] w = {0.36 / aggression, 0.31, 0.085, 0.010, 0.115 * aggression, 0.0, 0.060 * aggression * aggression};
        return BallInput.runs(pick(rnd, w));
    }

    private static double aggression(Match m, Innings inn) {
        double progress = (double) inn.legalBalls / (m.overs * 6.0);
        double phase = progress < 0.30 ? 1.15 : progress > 0.80 ? 1.35 : 0.92;
        double pressure = 1.0;
        if (inn.target != null && inn.legalBalls > 0) {
            int ballsLeft = Math.max(1, m.overs * 6 - inn.legalBalls);
            double rrr = (inn.target - inn.runs) * 6.0 / ballsLeft;
            pressure = Math.max(0.7, Math.min(1.7, rrr / 8.0));
        }
        // Wickets in hand temper aggression slightly.
        double tail = inn.wickets >= 7 ? 0.9 : 1.0;
        return Math.max(0.6, Math.min(2.0, phase * pressure * tail));
    }

    private static DismissalType dismissal(Random rnd) {
        double x = rnd.nextDouble();
        if (x < 0.50) return DismissalType.CAUGHT;
        if (x < 0.70) return DismissalType.BOWLED;
        if (x < 0.82) return DismissalType.LBW;
        if (x < 0.92) return DismissalType.RUN_OUT;
        return DismissalType.STUMPED;
    }

    private static int pick(Random rnd, double[] weights) {
        double total = 0;
        for (double w : weights) total += w;
        double x = rnd.nextDouble() * total;
        for (int i = 0; i < weights.length; i++) {
            x -= weights[i];
            if (x < 0) return i;
        }
        return 0;
    }
}
