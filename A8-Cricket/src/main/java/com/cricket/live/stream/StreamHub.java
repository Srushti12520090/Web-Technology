package com.cricket.live.stream;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Server-Sent Events fan-out.
 *
 * Every subscriber owns a bounded queue that is drained on a virtual thread, so (a) events reach each client in
 * order, (b) a slow client can never block the scoring path or other clients, and (c) a client that falls too far
 * behind is dropped and simply reconnects (the browser's EventSource does this automatically).
 */
@Component
public class StreamHub {

    private static final int MAX_QUEUE = 256;
    public static final String GLOBAL = "*";

    private static final class Subscriber {
        final SseEmitter emitter = new SseEmitter(0L); // no timeout; heartbeat keeps proxies open
        final Queue<SseEmitter.SseEventBuilder> queue = new ConcurrentLinkedQueue<>();
        final AtomicBoolean draining = new AtomicBoolean();
        volatile boolean closed;
        final String topic;
        Subscriber(String topic) { this.topic = topic; }
    }

    private final Map<String, Set<Subscriber>> topics = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public StreamHub(MeterRegistry registry) {
        Gauge.builder("cricket.sse.subscribers", this, StreamHub::subscriberCount).register(registry);
    }

    /** Subscribes to a topic ({@link #GLOBAL} or a match id) and immediately sends the initial event. */
    public SseEmitter subscribe(String topic, String initialEvent, Object initialPayload) {
        Subscriber s = new Subscriber(topic);
        topics.computeIfAbsent(topic, k -> ConcurrentHashMap.newKeySet()).add(s);
        Runnable cleanup = () -> close(s);
        s.emitter.onCompletion(cleanup);
        s.emitter.onTimeout(cleanup);
        s.emitter.onError(e -> cleanup.run());
        enqueue(s, event(initialEvent, initialPayload));
        return s.emitter;
    }

    public void publish(String topic, String eventName, Object payload) {
        Set<Subscriber> subs = topics.get(topic);
        if (subs == null || subs.isEmpty()) return;
        for (Subscriber s : subs) enqueue(s, event(eventName, payload));
    }

    public int subscriberCount() {
        return topics.values().stream().mapToInt(Set::size).sum();
    }

    @Scheduled(fixedRate = 15_000)
    void heartbeat() {
        topics.values().forEach(set -> set.forEach(s -> enqueue(s, SseEmitter.event().comment("hb"))));
    }

    private static SseEmitter.SseEventBuilder event(String name, Object payload) {
        return SseEmitter.event().name(name).data(payload, MediaType.APPLICATION_JSON);
    }

    private void enqueue(Subscriber s, SseEmitter.SseEventBuilder event) {
        if (s.closed) return;
        if (s.queue.size() >= MAX_QUEUE) { // slow consumer: drop it, client will reconnect and resync
            close(s);
            s.emitter.complete();
            return;
        }
        s.queue.add(event);
        if (s.draining.compareAndSet(false, true)) executor.execute(() -> drain(s));
    }

    private void drain(Subscriber s) {
        try {
            SseEmitter.SseEventBuilder e;
            while (!s.closed && (e = s.queue.poll()) != null) s.emitter.send(e);
        } catch (Exception ex) {
            close(s);
        } finally {
            s.draining.set(false);
            if (!s.closed && !s.queue.isEmpty() && s.draining.compareAndSet(false, true)) {
                executor.execute(() -> drain(s));
            }
        }
    }

    private void close(Subscriber s) {
        s.closed = true;
        s.queue.clear();
        Set<Subscriber> set = topics.get(s.topic);
        if (set != null) set.remove(s);
    }
}
