package com.cricket.live.service;

import com.cricket.live.model.Match;

import java.util.List;
import java.util.Optional;

/** Storage abstraction. The in-memory implementation can be replaced by JPA/Redis without touching services. */
public interface MatchRepository {
    Match save(Match match);
    Optional<Match> find(String id);
    List<Match> findAll();
    int count();
    void delete(String id);
}
