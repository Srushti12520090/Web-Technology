(() => {
  'use strict';

  // ------------------------------------------------------------------ helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 2) => (n == null ? '–' : Number(n).toFixed(d));

  const state = {
    matches: new Map(),     // id -> summary
    selected: null,         // match id
    detail: null,           // latest MatchDetail for selected match
    tab: 'live',
    commentary: [],         // newest first
    report: null,
    reportAt: 0,
    teams: [],
    globalES: null,
    matchES: null,
  };

  const api = async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const key = safeGet('adminKey');
    if (key) headers['X-API-Key'] = key;
    const res = await fetch(path, { ...opts, headers });
    if (res.status === 401) {
      const entered = prompt('This server requires an API key for changes:');
      if (entered) { safeSet('adminKey', entered); return api(path, opts); }
    }
    if (!res.ok) {
      let detail = res.statusText;
      try { detail = (await res.json()).detail || detail; } catch (_) { /* ignore */ }
      throw new Error(detail);
    }
    return res.status === 204 ? null : res.json();
  };
  function safeGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } }

  // ------------------------------------------------------------------ connection status
  function setConn(stateName, text) {
    const el = $('#conn');
    el.dataset.state = stateName;
    $('span', el).textContent = text;
  }

  // ------------------------------------------------------------------ match list
  function inningsLine(m, idx) {
    const i = m.innings[idx];
    return i ? `${i.runs}/${i.wickets} <small>(${esc(i.overs)})</small>` : '<small>yet to bat</small>';
  }

  function renderList() {
    const groups = { LIVE: [], UPCOMING: [], COMPLETED: [] };
    [...state.matches.values()].forEach((m) => groups[m.status].push(m));
    const html = [];
    const titles = { LIVE: 'Live now', UPCOMING: 'Upcoming', COMPLETED: 'Completed' };
    for (const k of ['LIVE', 'UPCOMING', 'COMPLETED']) {
      if (!groups[k].length) continue;
      groups[k].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      html.push(`<h2 class="group-title">${titles[k]}</h2>`);
      for (const m of groups[k]) {
        const [a, b] = m.title.split(' vs ');
        const first = m.innings[0], second = m.innings[1];
        const teamA = first ? first.teamName : a, teamB = first ? (second ? second.teamName : (first.teamName === a ? b : a)) : b;
        html.push(`
          <button class="match-card" data-id="${esc(m.id)}" aria-current="${m.id === state.selected}">
            <div class="row"><span class="team">${esc(teamA)}</span><span class="score num">${first ? inningsLine(m, 0) : ''}</span></div>
            <div class="row"><span class="team">${esc(teamB)}</span><span class="score num">${first ? inningsLine(m, 1) : ''}</span></div>
            <div class="meta">
              ${m.status === 'LIVE' ? '<span class="badge live">LIVE</span>' : `<span class="badge">${m.status === 'UPCOMING' ? 'UPCOMING' : 'RESULT'}</span>`}
              <span>${esc(m.statusLine)}</span>
            </div>
          </button>`);
      }
    }
    $('#matchList').innerHTML = html.join('') || '<p class="muted">No matches yet.</p>';
  }

  $('#matchList').addEventListener('click', (e) => {
    const card = e.target.closest('.match-card');
    if (card) selectMatch(card.dataset.id);
  });

  // ------------------------------------------------------------------ global stream
  function openGlobalStream() {
    if (state.globalES) state.globalES.close();
    const es = new EventSource('/api/stream');
    state.globalES = es;
    es.onopen = () => setConn('open', 'Live');
    es.onerror = () => setConn(es.readyState === EventSource.CLOSED ? 'closed' : 'connecting', 'Reconnecting…');
    es.addEventListener('snapshot', (ev) => {
      state.matches.clear();
      JSON.parse(ev.data).forEach((m) => state.matches.set(m.id, m));
      renderList();
      if (!state.selected) {
        const firstLive = [...state.matches.values()].find((m) => m.status === 'LIVE') || [...state.matches.values()][0];
        if (firstLive) selectMatch(firstLive.id);
      }
    });
    es.addEventListener('summary', (ev) => {
      const m = JSON.parse(ev.data);
      const prev = state.matches.get(m.id);
      if (prev && prev.version > m.version) return;       // stale event
      state.matches.set(m.id, m);
      renderList();
    });
  }

  // ------------------------------------------------------------------ selecting a match
  async function selectMatch(id) {
    if (!id) return;
    state.selected = id;
    state.detail = null;
    state.commentary = [];
    state.report = null;
    history.replaceState(null, '', '#' + id);
    renderList();
    $('#empty').hidden = true;
    $('#match').hidden = false;
    if (state.matchES) state.matchES.close();
    const es = new EventSource(`/api/matches/${encodeURIComponent(id)}/stream`);
    state.matchES = es;
    es.addEventListener('detail', (ev) => onDetail(JSON.parse(ev.data)));
    try {
      state.commentary = await api(`/api/matches/${encodeURIComponent(id)}/commentary?limit=120`);
    } catch (_) { /* shown once the stream delivers */ }
    renderTab();
  }

  function onDetail(d) {
    if (d.summary.id !== state.selected) return;
    if (state.detail && state.detail.summary.version > d.summary.version) return;
    const prev = state.detail;
    state.detail = d;
    // merge new balls into the commentary list (newest first, dedup by seq)
    const known = new Set(state.commentary.map((e) => e.seq));
    const fresh = d.recent.filter((e) => !known.has(e.seq));
    if (fresh.length) {
      state.commentary = [...fresh.map((e) => ({ ...e, _new: true })), ...state.commentary].sort((a, b) => b.seq - a.seq).slice(0, 400);
    }
    renderScoreboard(prev);
    renderTab();
  }

  // ------------------------------------------------------------------ scoreboard
  function renderScoreboard(prev) {
    const d = state.detail;
    if (!d) return;
    const s = d.summary;
    const [nameA, nameB] = s.title.split(' vs ');
    const byTeam = {};
    s.innings.forEach((i) => { byTeam[i.teamName] = i; });
    const cell = (name) => {
      const i = byTeam[name];
      const prevI = prev && prev.summary.innings.find((x) => x.teamName === name);
      const changed = prevI && i && (prevI.runs !== i.runs || prevI.wickets !== i.wickets);
      return `<div class="sb-team ${i && i.current ? 'batting' : ''}">
        <div class="name">${esc(name)}</div>
        <div class="big-score ${changed ? 'flash' : ''}">${i ? `${i.runs}/${i.wickets}<small>${esc(i.overs)} ov</small>` : '<small>Yet to bat</small>'}</div>
      </div>`;
    };
    const order = s.innings.length ? [s.innings[0].teamName, s.innings.length > 1 ? s.innings[1].teamName : (s.innings[0].teamName === nameA ? nameB : nameA)] : [nameA, nameB];
    $('#scoreboard').innerHTML = `
      <div class="sb-head">
        ${s.status === 'LIVE' ? '<span class="badge live">LIVE</span>' : `<span class="badge">${esc(s.status)}</span>`}
        <span>${esc(s.venue)}</span><span>·</span><span>${s.totalOvers} overs a side</span>
        ${s.status === 'LIVE' && !s.simulating ? '<span class="badge">PAUSED</span>' : ''}
      </div>
      <div class="sb-teams">${order.map(cell).join('')}</div>
      <div class="sb-status ${s.status === 'COMPLETED' ? 'done' : ''}" aria-live="polite">${esc(s.statusLine)}</div>
      ${s.toss ? `<div class="sb-toss">${esc(s.toss)}</div>` : ''}`;
  }

  // ------------------------------------------------------------------ tabs
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    state.tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    renderTab();
  }));

  function renderTab() {
    ['live', 'scorecard', 'commentary', 'summary'].forEach((t) => { $('#tab-' + t).hidden = t !== state.tab; });
    if (!state.detail) return;
    ({ live: renderLive, scorecard: renderScorecard, commentary: renderCommentary, summary: renderSummary })[state.tab]();
  }

  const ballClass = (label) => {
    if (label === '4') return 'b four';
    if (label === '6') return 'b six';
    if (label.startsWith('W')) return 'b w';
    if (/[a-z]/i.test(label)) return 'b x';
    return 'b';
  };

  function batterRow(b) {
    return `<tr><td class="${b.onStrike ? 'striker' : ''}">${esc(b.name)}</td><td class="n">${b.runs}</td><td class="n">${b.balls}</td><td class="n">${b.fours}</td><td class="n">${b.sixes}</td><td class="n">${fmt(b.strikeRate)}</td></tr>`;
  }

  // ---- live
  function renderLive() {
    const d = state.detail, l = d.live, s = d.summary;
    const el = $('#tab-live');
    if (!l) { el.innerHTML = '<div class="card muted">The match has not started yet.</div>' + controlsHtml(s); return; }
    const tiles = [
      ['Run rate', fmt(l.runRate)],
      l.target != null ? ['Target', l.target] : ['Projected', l.projectedScore ?? '–'],
      l.target != null ? ['Required rate', l.requiredRate != null ? fmt(l.requiredRate) : '–'] : ['Partnership', l.partnership],
      l.target != null ? ['Need', `${l.runsNeeded} off ${l.ballsRemaining}`] : ['Extras', d.scorecards[d.scorecards.length - 1].extras.split(' ')[0]],
    ];
    const live = s.status === 'LIVE';
    el.innerHTML = `
      <div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join('')}</div>
      ${live ? `
      <div class="card"><h3>At the crease</h3><div class="table-wrap"><table>
        <thead><tr><th>Batter</th><th class="n">R</th><th class="n">B</th><th class="n">4s</th><th class="n">6s</th><th class="n">SR</th></tr></thead>
        <tbody>${batterRow(l.striker)}${batterRow(l.nonStriker)}</tbody></table></div>
        <p class="small muted" style="margin:8px 0 0">Partnership ${esc(l.partnership)}</p>
      </div>
      <div class="card"><h3>Bowling</h3><div class="table-wrap"><table>
        <thead><tr><th>Bowler</th><th class="n">O</th><th class="n">M</th><th class="n">R</th><th class="n">W</th><th class="n">Econ</th></tr></thead>
        <tbody><tr><td>${esc(l.bowler.name)}</td><td class="n">${esc(l.bowler.overs)}</td><td class="n">${l.bowler.maidens}</td><td class="n">${l.bowler.runs}</td><td class="n">${l.bowler.wickets}</td><td class="n">${fmt(l.bowler.economy)}</td></tr></tbody></table></div>
      </div>
      <div class="card"><h3>This over</h3><div class="over">${l.thisOver.length ? l.thisOver.map((x) => `<span class="${ballClass(x)}">${esc(x)}</span>`).join('') : '<span class="muted small">New over</span>'}</div></div>` : ''}
      ${controlsHtml(s)}
      <div class="card"><h3>Latest</h3>${d.recent.slice(0, 5).map(ballRow).join('') || '<span class="muted">No deliveries yet.</span>'}</div>`;
    wireControls();
  }

  // ---- manual scoring + simulation controls
  function controlsHtml(s) {
    if (s.status === 'COMPLETED') return '';
    if (s.status === 'UPCOMING') return `<div class="card"><h3>Match control</h3><button class="btn primary" id="startBtn">Start match (toss)</button></div>`;
    const pad = s.simulating ? '' : `
      <div class="pad" id="scorePad">
        ${[0, 1, 2, 3, 4, 6].map((r) => `<button class="btn" data-runs="${r}">${r}</button>`).join('')}
        <button class="btn" data-extra="WIDE">Wd</button>
        <button class="btn" data-extra="NO_BALL">Nb</button>
        <button class="btn" data-extra="BYE" data-runs="1">1 Bye</button>
        <button class="btn" data-extra="LEG_BYE" data-runs="1">1 Lb</button>
        <select id="dismissal" aria-label="Dismissal type">
          <option value="BOWLED">Bowled</option><option value="CAUGHT">Caught</option><option value="LBW">LBW</option>
          <option value="RUN_OUT">Run out</option><option value="STUMPED">Stumped</option>
        </select>
        <button class="btn w" id="wicketBtn">Wicket</button>
      </div>`;
    return `<div class="card"><h3>Match control</h3>
      <div class="controls">
        <button class="btn" id="simBtn">${s.simulating ? 'Pause simulation' : 'Resume simulation'}</button>
        <span class="small muted">${s.simulating ? 'Pause to score ball-by-ball yourself.' : 'Manual scoring: tap the outcome of each delivery.'}</span>
      </div>${pad}<p id="ctlError" class="error" hidden></p></div>`;
  }

  function ctlError(msg) { const e = $('#ctlError'); if (e) { e.textContent = msg; e.hidden = !msg; } }

  function wireControls() {
    const id = state.selected;
    const s = state.detail.summary;
    const start = $('#startBtn');
    if (start) start.onclick = () => api(`/api/matches/${id}/start`, { method: 'POST' }).catch((e) => alert(e.message));
    const sim = $('#simBtn');
    if (sim) sim.onclick = () => api(`/api/matches/${id}/simulation`, { method: 'PUT', body: JSON.stringify({ enabled: !s.simulating }) }).catch((e) => ctlError(e.message));
    const pad = $('#scorePad');
    if (pad) {
      pad.onclick = (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        let body;
        if (b.id === 'wicketBtn') body = { runs: 0, wicket: true, dismissal: $('#dismissal').value };
        else if (b.dataset.extra) body = { runs: Number(b.dataset.runs || 0), extra: b.dataset.extra };
        else if (b.dataset.runs != null) body = { runs: Number(b.dataset.runs) };
        else return;
        api(`/api/matches/${id}/balls`, { method: 'POST', body: JSON.stringify(body) })
          .then(() => ctlError('')).catch((err) => ctlError(err.message));
      };
    }
  }

  // ---- scorecard
  function renderScorecard() {
    $('#tab-scorecard').innerHTML = state.detail.scorecards.map((c) => `
      <div class="card">
        <h3>${esc(c.teamName)} — ${c.runs}/${c.wickets} (${esc(c.overs)} ov) · RR ${fmt(c.runRate)}</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Batter</th><th class="n">R</th><th class="n">B</th><th class="n">4s</th><th class="n">6s</th><th class="n">SR</th></tr></thead>
          <tbody>${c.batting.map((b) => `<tr><td class="${b.onStrike ? 'striker' : ''}">${esc(b.name)}<span class="sub">${esc(b.howOut)}</span></td><td class="n"><b>${b.runs}</b></td><td class="n">${b.balls}</td><td class="n">${b.fours}</td><td class="n">${b.sixes}</td><td class="n">${fmt(b.strikeRate)}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="small" style="margin:10px 0 0">Extras <b>${esc(c.extras)}</b></p>
        ${c.yetToBat.length ? `<p class="small muted" style="margin:4px 0 0">Yet to bat: ${c.yetToBat.map(esc).join(', ')}</p>` : ''}
        <div class="table-wrap" style="margin-top:12px"><table>
          <thead><tr><th>Bowler</th><th class="n">O</th><th class="n">M</th><th class="n">R</th><th class="n">W</th><th class="n">Econ</th><th class="n">Wd</th><th class="n">Nb</th></tr></thead>
          <tbody>${c.bowling.map((b) => `<tr><td>${esc(b.name)}</td><td class="n">${esc(b.overs)}</td><td class="n">${b.maidens}</td><td class="n">${b.runs}</td><td class="n"><b>${b.wickets}</b></td><td class="n">${fmt(b.economy)}</td><td class="n">${b.wides}</td><td class="n">${b.noBalls}</td></tr>`).join('')}</tbody>
        </table></div>
        ${c.fallOfWickets.length ? `<p class="small muted" style="margin:10px 0 0">Fall of wickets: ${c.fallOfWickets.map((f) => `${f.wicketNo}-${f.score} (${esc(f.batter)}, ${esc(f.over)})`).join(' · ')}</p>` : ''}
      </div>`).join('') || '<div class="card muted">Scorecard appears once the match starts.</div>';
  }

  // ---- commentary
  function ballRow(e) {
    return `<div class="ball-row ${e._new ? 'new' : ''}"><span class="ov">${esc(e.overLabel)}</span><span class="${ballClass(e.label)}">${esc(e.label)}</span><span class="txt">${esc(e.commentary)}</span></div>`;
  }
  function renderCommentary() {
    const el = $('#tab-commentary');
    el.innerHTML = `<div class="card">${state.commentary.slice(0, 150).map(ballRow).join('') || '<span class="muted">No deliveries yet.</span>'}</div>`;
    state.commentary.forEach((e) => { delete e._new; });
  }

  // ---- summary
  async function renderSummary() {
    const el = $('#tab-summary');
    const s = state.detail.summary;
    const stale = Date.now() - state.reportAt > (s.status === 'LIVE' ? 4000 : 60000);
    if (!state.report || stale) {
      state.reportAt = Date.now();
      try { state.report = await api(`/api/matches/${encodeURIComponent(state.selected)}/report`); } catch (_) { /* keep old */ }
    }
    const r = state.report;
    if (!r || state.tab !== 'summary') return;
    const perf = (p) => `<div class="perf"><span><b>${esc(p.name)}</b> <span class="muted small">${esc(p.team)}</span></span><span class="num">${esc(p.line)}</span></div>`;
    el.innerHTML = `
      ${r.summary.status === 'COMPLETED' ? `<div class="result-banner">${esc(r.summary.result)}${r.playerOfTheMatch ? `<small>Player of the match: ${esc(r.playerOfTheMatch.name)} (${esc(r.playerOfTheMatch.team)}) — ${esc(r.playerOfTheMatch.line)}</small>` : ''}</div>` : `<div class="card"><b>${esc(r.summary.statusLine)}</b></div>`}
      <div class="tiles">
        <div class="tile"><div class="k">Fours</div><div class="v">${r.totalFours}</div></div>
        <div class="tile"><div class="k">Sixes</div><div class="v">${r.totalSixes}</div></div>
        <div class="tile"><div class="k">Extras</div><div class="v">${r.totalExtras}</div></div>
      </div>
      <div class="card"><h3>Run progression</h3>${progressionChart(r)}</div>
      <div class="two-col">
        <div class="card"><h3>Top batters</h3>${r.topBatters.map(perf).join('') || '<span class="muted">–</span>'}</div>
        <div class="card"><h3>Top bowlers</h3>${r.topBowlers.map(perf).join('') || '<span class="muted">–</span>'}</div>
      </div>
      <div class="card"><h3>Key moments</h3>${r.keyMoments.map((k) => `<div class="moment"><span class="ov">${k.over ? esc(k.over) : '·'}</span><span>${esc(k.text)} <span class="muted small">(inn ${k.innings})</span></span></div>`).join('') || '<span class="muted">Nothing yet.</span>'}</div>`;
  }

  function progressionChart(r) {
    const series = r.progression.filter((p) => p.cumulative.length && p.cumulative[p.cumulative.length - 1] > 0);
    if (!series.length) return '<span class="muted">Waiting for runs…</span>';
    const W = 640, H = 220, L = 34, B = 24, T = 10, R = 12;
    const overs = r.summary.totalOvers;
    const maxRuns = Math.max(10, ...series.map((p) => p.cumulative[p.cumulative.length - 1]));
    const niceMax = Math.ceil(maxRuns / 20) * 20;
    const x = (o) => L + (o / overs) * (W - L - R);
    const y = (v) => H - B - (v / niceMax) * (H - B - T);
    const colors = ['var(--accent)', 'var(--four)'];
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const v = Math.round(niceMax * f);
      return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }).join('');
    const ticks = Array.from({ length: Math.min(overs, 10) + 1 }, (_, k) => Math.round((k * overs) / Math.min(overs, 10)))
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((o) => `<text x="${x(o)}" y="${H - 6}" text-anchor="middle">${o}</text>`).join('');
    const lines = series.map((p, idx) => {
      const pts = [[0, 0], ...p.cumulative.map((v, i) => [i + 1, v])];
      const d = pts.map(([o, v], i) => `${i ? 'L' : 'M'}${x(o).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      const [lo, lv] = pts[pts.length - 1];
      return `<path d="${d}" fill="none" stroke="${colors[idx % 2]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(lo)}" cy="${y(lv)}" r="4" fill="${colors[idx % 2]}"/>`;
    }).join('');
    const legend = series.map((p, idx) => {
      const name = (r.summary.innings.find((i) => i.number === p.innings) || {}).teamName || `Innings ${p.innings}`;
      return `<span><i style="background:${colors[idx % 2]}"></i>${esc(name)}</span>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative runs by over">${grid}${ticks}${lines}</svg><div class="legend">${legend}<span>Overs →</span></div>`;
  }

  // ------------------------------------------------------------------ leaders
  async function loadLeaders() {
    if (document.hidden) return;
    try {
      const l = await api('/api/stats/leaders?limit=5');
      const block = (title, rows, val) => `<div class="card"><h3>${title}</h3>${rows.map((p) => `
        <div class="leader"><span class="who">${esc(p.name)}<small>${esc(p.team)}</small></span><span class="val">${val(p)}</span></div>`).join('') || '<span class="muted small">No data yet</span>'}</div>`;
      $('#leaders').innerHTML =
        block('Top run scorers', l.runs, (p) => `${p.runs}`) +
        block('Top wicket takers', l.wickets, (p) => `${p.wickets}`) +
        block('Most sixes', l.sixes, (p) => `${p.sixes}`);
    } catch (_) { /* transient */ }
  }

  // ------------------------------------------------------------------ new match dialog
  const dlg = $('#newMatchDialog');
  $('#newMatchBtn').addEventListener('click', async () => {
    if (!state.teams.length) state.teams = await api('/api/teams');
    const opts = state.teams.map((t) => `<option value="${esc(t.code)}">${esc(t.name)}</option>`).join('');
    $('#teamA').innerHTML = opts; $('#teamB').innerHTML = opts;
    $('#teamB').selectedIndex = 1;
    $('#formError').hidden = true;
    dlg.showModal();
  });
  $('#newMatchForm').addEventListener('submit', async (e) => {
    if (e.submitter && e.submitter.value !== 'ok') return;
    e.preventDefault();
    try {
      const m = await api('/api/matches', {
        method: 'POST',
        body: JSON.stringify({ teamA: $('#teamA').value, teamB: $('#teamB').value, overs: Number($('#overs').value), autoSimulate: $('#autoSim').checked }),
      });
      dlg.close();
      selectMatch(m.id);
    } catch (err) {
      const f = $('#formError'); f.textContent = err.message; f.hidden = false;
    }
  });

  // ------------------------------------------------------------------ boot
  const hash = location.hash.slice(1);
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && id !== state.selected) selectMatch(id);
  });
  openGlobalStream();
  if (hash) selectMatch(hash);
  loadLeaders();
  setInterval(loadLeaders, 5000);
})();
