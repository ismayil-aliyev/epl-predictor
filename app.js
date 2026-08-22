const SEASONS = ["2025-26", "2024-25"];

const state = {
  season: SEASONS[0],
  predictions: [],
  results: null,
  leaderboard: [],
  teams: [],
};

function teamBadge(name) {
  const stripped = name.replace(/&/g, "and");
  const words = stripped.split(" ").filter((w) => w.length > 1 && !["and", "of"].includes(w.toLowerCase()));
  const initials = (words.length >= 2 ? words.slice(0, 2) : [stripped]).map((w) => w[0]).join("");
  return initials.toUpperCase().slice(0, 3);
}

function accuracyClass(accuracy) {
  if (accuracy >= 0.95) return "acc-5";
  if (accuracy >= 0.8) return "acc-4";
  if (accuracy >= 0.6) return "acc-3";
  if (accuracy >= 0.4) return "acc-2";
  if (accuracy >= 0.2) return "acc-1";
  return "acc-0";
}

async function loadSeason(season) {
  const [predRes, resultsRes] = await Promise.all([
    fetch(`data/${season}/predictions.json`),
    fetch(`data/${season}/results.json`),
  ]);
  const predData = await predRes.json();
  const resultsData = await resultsRes.json();

  state.season = season;
  state.predictions = predData.predictions;
  state.results = resultsData;
  state.teams = [...resultsData.teams].sort((a, b) => resultsData.table[a] - resultsData.table[b]);
  state.leaderboard = buildLeaderboard(state.predictions, resultsData.table);

  render();
}

function render() {
  renderSeasonTabs();
  renderHeroStrip();
  renderLeaderboard();
  renderTeamGrid();
  renderCrowdTable();
  document.getElementById("predictor-detail-panel").hidden = true;
  document.getElementById("team-detail-panel").hidden = true;
}

function renderSeasonTabs() {
  const nav = document.getElementById("season-tabs");
  nav.innerHTML = "";
  SEASONS.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "season-tab" + (s === state.season ? " active" : "");
    btn.textContent = s;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", s === state.season);
    btn.addEventListener("click", () => loadSeason(s));
    nav.appendChild(btn);
  });
}

function renderHeroStrip() {
  const el = document.getElementById("hero-strip");
  const top = state.leaderboard[0];
  const n = state.predictions.length;
  const avgScore = state.leaderboard.reduce((a, r) => a + r.score, 0) / n;
  const champion = state.teams[0];

  el.innerHTML = `
    <div class="hero-stat">
      <div class="label">Season</div>
      <div class="value">${state.season}</div>
      <div class="sub">${champion} finished top</div>
    </div>
    <div class="hero-stat">
      <div class="label">Predictors</div>
      <div class="value">${n}</div>
      <div class="sub">submitted tables</div>
    </div>
    <div class="hero-stat">
      <div class="label">Top score</div>
      <div class="value">${(top.score * 100).toFixed(1)}%</div>
      <div class="sub">${top.name}</div>
    </div>
    <div class="hero-stat">
      <div class="label">Average score</div>
      <div class="value">${(avgScore * 100).toFixed(1)}%</div>
      <div class="sub">across all predictors</div>
    </div>
  `;
}

function renderLeaderboard() {
  const el = document.getElementById("leaderboard");
  el.innerHTML = "";
  state.leaderboard.forEach((row) => {
    const div = document.createElement("div");
    div.className = "lb-row";
    div.dataset.name = row.name.toLowerCase();

    const strip = row.perTeam
      .map((t) => `<div class="cell ${accuracyClass(t.accuracy)}" title="${t.team}: predicted ${t.predicted}, finished ${t.actual}"></div>`)
      .join("");

    div.innerHTML = `
      <div class="lb-rank ${row.rank <= 3 ? "top-3" : ""}">${row.rank}</div>
      <div class="lb-name">${row.name}<span class="flags">${row.exactCount} exact · ${row.closeCount} within 1</span></div>
      <div class="lb-strip">${strip}</div>
      <div class="lb-score">${(row.score * 100).toFixed(1)}%</div>
    `;
    div.addEventListener("click", () => showPredictorDetail(row));
    el.appendChild(div);
  });
}

function showPredictorDetail(row) {
  const panel = document.getElementById("predictor-detail-panel");
  document.getElementById("predictor-detail-name").textContent = row.name;

  const sorted = [...row.perTeam].sort((a, b) => a.predicted - b.predicted);
  const rowsHtml = sorted
    .map(
      (t) => `
      <tr>
        <td>${t.team}</td>
        <td class="num">${t.predicted}</td>
        <td class="num">${t.actual}</td>
        <td class="num"><span class="delta-tag ${accuracyClass(t.accuracy)}">${t.delta === 0 ? "exact" : "±" + t.delta}</span></td>
      </tr>`
    )
    .join("");

  document.getElementById("predictor-detail").innerHTML = `
    <div class="summary-row">
      <div class="summary-stat"><div class="label">Overall score</div><div class="value">${(row.score * 100).toFixed(1)}%</div></div>
      <div class="summary-stat"><div class="label">Rank</div><div class="value">${row.rank} / ${state.leaderboard.length}</div></div>
      <div class="summary-stat"><div class="label">Exact calls</div><div class="value">${row.exactCount}</div></div>
      <div class="summary-stat"><div class="label">Within one place</div><div class="value">${row.closeCount}</div></div>
    </div>
    <table class="detail-table">
      <thead><tr><th>Team</th><th>Predicted</th><th>Finished</th><th>Delta</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTeamGrid() {
  const el = document.getElementById("team-grid");
  el.innerHTML = "";
  state.teams.forEach((team) => {
    const pos = state.results.table[team];
    const div = document.createElement("button");
    div.className = "team-card";
    div.innerHTML = `
      <div class="team-badge">${teamBadge(team)}</div>
      <div class="team-info">
        <span class="team-name">${team}</span>
        <span class="team-pos">Finished ${pos}${ordinalSuffix(pos)}</span>
      </div>
    `;
    div.addEventListener("click", () => showTeamDetail(team));
    el.appendChild(div);
  });
}

function ordinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function showTeamDetail(team) {
  const panel = document.getElementById("team-detail-panel");
  const actual = state.results.table[team];
  document.getElementById("team-detail-name").textContent = team;

  const calls = state.predictions
    .map((p) => ({ name: p.name, predicted: p.ranks[team], delta: Math.abs(p.ranks[team] - actual) }))
    .sort((a, b) => a.delta - b.delta);

  const rowsHtml = calls
    .map((c) => {
      const accuracy = (19 - c.delta) / 19;
      return `
      <tr>
        <td>${c.name}</td>
        <td class="num">${c.predicted}</td>
        <td class="num"><span class="delta-tag ${accuracyClass(accuracy)}">${c.delta === 0 ? "exact" : "±" + c.delta}</span></td>
      </tr>`;
    })
    .join("");

  document.getElementById("team-detail").innerHTML = `
    <div class="team-detail-head">
      <div class="big-badge">${teamBadge(team)}</div>
      <div class="actual-pos">Finished ${actual}${ordinalSuffix(actual)}</div>
    </div>
    <table class="detail-table">
      <thead><tr><th>Predictor</th><th>Predicted</th><th>Delta</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCrowdTable() {
  const avg = averagePredictedTable(state.predictions, state.teams);
  const sortedByAvg = [...state.teams].sort((a, b) => avg[a] - avg[b]);

  const rowsHtml = sortedByAvg
    .map((team) => {
      const actual = state.results.table[team];
      const avgPos = avg[team];
      const pct = ((20 - avgPos) / 19) * 100;
      return `
      <tr>
        <td>${team}</td>
        <td class="num">${avgPos.toFixed(1)}</td>
        <td class="num">${actual}</td>
        <td>
          <div class="crowd-bar-wrap">
            <div class="crowd-bar-track"><div class="crowd-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  document.getElementById("crowd-table").innerHTML = `
    <table class="crowd-table">
      <thead><tr><th>Team</th><th>Avg. predicted</th><th>Actual</th><th></th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

document.getElementById("predictor-search").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".lb-row").forEach((row) => {
    row.classList.toggle("hidden", q && !row.dataset.name.includes(q));
  });
});

document.getElementById("close-predictor-detail").addEventListener("click", () => {
  document.getElementById("predictor-detail-panel").hidden = true;
});

document.getElementById("close-team-detail").addEventListener("click", () => {
  document.getElementById("team-detail-panel").hidden = true;
});

document.getElementById("methodology-toggle").addEventListener("click", (e) => {
  const body = document.getElementById("methodology-body");
  const expanded = e.currentTarget.getAttribute("aria-expanded") === "true";
  e.currentTarget.setAttribute("aria-expanded", String(!expanded));
  body.hidden = expanded;
});

loadSeason(state.season);
