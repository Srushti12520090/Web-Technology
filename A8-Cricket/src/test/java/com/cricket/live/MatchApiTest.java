package com.cricket.live;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"cricket.demo-data=false", "cricket.simulator.enabled=false"})
@AutoConfigureMockMvc
class MatchApiTest {

    @Autowired MockMvc mvc;

    private String createMatch(boolean auto) throws Exception {
        MvcResult r = mvc.perform(post("/api/matches").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamA\":\"THK\",\"teamB\":\"RFL\",\"overs\":5,\"autoSimulate\":" + auto + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("LIVE"))
                .andReturn();
        String body = r.getResponse().getContentAsString();
        return body.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");
    }

    @Test
    void createListAndFetchMatch() throws Exception {
        String id = createMatch(false);
        mvc.perform(get("/api/matches?status=LIVE")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(id)));
        mvc.perform(get("/api/matches/" + id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalOvers").value(5))
                .andExpect(jsonPath("$.live.striker.name").isNotEmpty())
                .andExpect(jsonPath("$.scorecards", hasSize(1)));
    }

    @Test
    void manualScoringUpdatesTheScore() throws Exception {
        String id = createMatch(false);
        mvc.perform(post("/api/matches/" + id + "/balls").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"runs\":4}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.scoreAfter").value(4))
                .andExpect(jsonPath("$.label").value("4"));
        mvc.perform(get("/api/matches/" + id + "/commentary")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/matches/" + id + "/commentary?after=0")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void manualScoringIsRefusedWhileSimulating() throws Exception {
        String id = createMatch(true);
        mvc.perform(post("/api/matches/" + id + "/balls").contentType(MediaType.APPLICATION_JSON).content("{\"runs\":1}"))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/matches/" + id + "/simulation").contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.simulating").value(false));
        mvc.perform(post("/api/matches/" + id + "/balls").contentType(MediaType.APPLICATION_JSON).content("{\"runs\":1}"))
                .andExpect(status().isCreated());
    }

    @Test
    void validationAndNotFoundUseProblemDetails() throws Exception {
        mvc.perform(get("/api/matches/NOPE")).andExpect(status().isNotFound());
        mvc.perform(post("/api/matches").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamA\":\"THK\",\"teamB\":\"THK\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/matches").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamA\":\"THK\",\"teamB\":\"RFL\",\"overs\":99}"))
                .andExpect(status().isBadRequest());
        String id = createMatch(false);
        mvc.perform(post("/api/matches/" + id + "/balls").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"runs\":0,\"extra\":\"NO_BALL\",\"wicket\":true,\"dismissal\":\"BOWLED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void teamsAndLeadersAreServed() throws Exception {
        mvc.perform(get("/api/teams")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[0].players", hasSize(11)));
        mvc.perform(get("/api/stats/leaders?limit=3")).andExpect(status().isOk())
                .andExpect(jsonPath("$.runs").isArray());
        mvc.perform(get("/api/players/THK-01")).andExpect(status().isOk());
        mvc.perform(get("/api/players/XXX-99")).andExpect(status().isNotFound());
    }

    @Test
    void streamEndpointOpensAsEventStream() throws Exception {
        String id = createMatch(false);
        mvc.perform(get("/api/matches/" + id + "/stream").accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(request().asyncStarted());
        mvc.perform(get("/api/matches/NOPE/stream").accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isNotFound());
    }
}
