package com.cricket.live.service;

import com.cricket.live.model.Match;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryMatchRepository implements MatchRepository {
    private final Map<String, Match> store = new ConcurrentHashMap<>();

    @Override public Match save(Match match) { store.put(match.id, match); return match; }
    @Override public Optional<Match> find(String id) { return Optional.ofNullable(id == null ? null : store.get(id)); }
    @Override public List<Match> findAll() { return List.copyOf(store.values()); }
    @Override public int count() { return store.size(); }
    @Override public void delete(String id) { store.remove(id); }
}
