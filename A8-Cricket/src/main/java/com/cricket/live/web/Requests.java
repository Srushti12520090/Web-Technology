package com.cricket.live.web;

import com.cricket.live.engine.BallInput;
import com.cricket.live.model.DismissalType;
import com.cricket.live.model.ExtraType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public final class Requests {
    private Requests() {}

    public record CreateMatch(@NotBlank String teamA, @NotBlank String teamB,
                              @Min(1) @Max(50) Integer overs, Boolean startNow, Boolean autoSimulate) {}

    public record Ball(@Min(0) @Max(7) int runs, ExtraType extra, boolean wicket, DismissalType dismissal) {
        public BallInput toInput() { return new BallInput(runs, extra, wicket, dismissal); }
    }

    public record Simulation(boolean enabled) {}
}
