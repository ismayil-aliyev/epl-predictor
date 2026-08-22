/**
 * Scoring engine for the EPL Table Predictor league.
 *
 * Formula (validated against the legacy 24/25 Excel workbook):
 *   For each team:
 *     delta    = |actualPosition - predictedPosition|
 *     accuracy = (N - 1 - delta) / (N - 1)      // N = number of teams (20)
 *   score = sum(accuracy_team * weight_team) across all teams
 *   weight_team defaults to 1/N (equal weights)
 */

const NUM_TEAMS = 20;

function teamAccuracy(actualPos, predictedPos, n = NUM_TEAMS) {
  const delta = Math.abs(actualPos - predictedPos);
  return (n - 1 - delta) / (n - 1);
}

/**
 * @param {Object} ranks - { teamName: predictedPosition }
 * @param {Object} table - { teamName: actualPosition }
 * @param {Object} [weights] - { teamName: weight }, defaults to equal weights
 * @returns {{ score: number, perTeam: Array<{team, actual, predicted, delta, accuracy, weight}> }}
 */
function scorePrediction(ranks, table, weights = null) {
  const teams = Object.keys(table);
  const n = teams.length;
  const w = weights || Object.fromEntries(teams.map((t) => [t, 1 / n]));

  let score = 0;
  const perTeam = teams.map((team) => {
    const actual = table[team];
    const predicted = ranks[team];
    const delta = Math.abs(actual - predicted);
    const accuracy = teamAccuracy(actual, predicted, n);
    const weight = w[team];
    score += accuracy * weight;
    return { team, actual, predicted, delta, accuracy, weight };
  });

  return { score, perTeam };
}

/**
 * Builds the full leaderboard for a season.
 * @param {Array<{name, ranks}>} predictions
 * @param {Object} table
 * @param {Object} [weights]
 * @returns {Array} sorted descending by score, with exact/±1 counts
 */
function buildLeaderboard(predictions, table, weights = null) {
  const rows = predictions.map((p) => {
    const { score, perTeam } = scorePrediction(p.ranks, table, weights);
    const exactCount = perTeam.filter((t) => t.delta === 0).length;
    const closeCount = perTeam.filter((t) => t.delta <= 1).length;
    return {
      name: p.name,
      score,
      exactCount,
      closeCount,
      perTeam,
    };
  });

  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/**
 * "Wisdom of the crowd": average predicted position per team across all predictions.
 */
function averagePredictedTable(predictions, teams) {
  const sums = Object.fromEntries(teams.map((t) => [t, 0]));
  predictions.forEach((p) => {
    teams.forEach((t) => (sums[t] += p.ranks[t]));
  });
  const n = predictions.length;
  return Object.fromEntries(teams.map((t) => [t, sums[t] / n]));
}

if (typeof module !== "undefined") {
  module.exports = {
    teamAccuracy,
    scorePrediction,
    buildLeaderboard,
    averagePredictedTable,
    NUM_TEAMS,
  };
}
