// ============================================================
// scoring.js — Netflix-Level Scoring Engine for The Great Movie Vault
// ============================================================
// Implements: Bayesian Weighted Rating, Multi-Signal Relevance,
// Levenshtein Fuzzy Matching, MMR Diversity, Weighted Shuffle
// ============================================================

// ─── LEVENSHTEIN DISTANCE (edit-distance for fuzzy matching) ───

export function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Optimise: single-row DP
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

/**
 * Fuzzy similarity score (0–1). 1 = exact match, 0 = completely different.
 * Uses normalised Levenshtein distance.
 */
export function fuzzySimilarity(query, target) {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = target.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (q === t) return 1;
  if (t.startsWith(q) || q.startsWith(t)) return 0.9;
  if (t.includes(q)) return 0.8;

  const dist = levenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);
  return maxLen === 0 ? 1 : Math.max(0, 1 - dist / maxLen);
}

// ─── BAYESIAN WEIGHTED RATING (IMDB Top-250 formula) ───
// WR = (v / (v + m)) × R + (m / (v + m)) × C
//   v = vote count for this movie
//   m = minimum votes required to be listed
//   R = movie's average rating
//   C = mean rating across the candidate pool

/**
 * Compute the mean rating C across a pool of movies.
 */
export function computeMeanRating(movies) {
  if (!movies || movies.length === 0) return 6.5; // sensible default
  const sum = movies.reduce((s, m) => s + (m.vote_average || 0), 0);
  return sum / movies.length;
}

/**
 * Bayesian Weighted Rating for a single movie.
 * @param {object} movie   - must have vote_count, vote_average
 * @param {number} m       - minimum vote threshold
 * @param {number} C       - mean rating of the pool
 * @returns {number}       - weighted rating
 */
export function bayesianRating(movie, m = 200, C = 6.5) {
  const v = movie.vote_count || 0;
  const R = movie.vote_average || 0;
  return (v / (v + m)) * R + (m / (v + m)) * C;
}

// ─── MULTI-SIGNAL COMPOSITE RELEVANCE SCORE ───
// Score = w₁·titleMatch + w₂·bayesianRating + w₃·popularityNorm
//       + w₄·freshnessDecay + w₅·genreBoost

const WEIGHTS = {
  titleMatch:      0.35,
  bayesianRating:  0.25,
  popularity:      0.15,
  freshness:       0.10,
  genreBoost:      0.15,
};

/**
 * Exponential freshness decay.
 * Movies from 2024 score ~1.0, 2014 ~0.6, 2000 ~0.3
 * @param {string} releaseDate - ISO date string
 * @param {number} lambda      - decay rate (default 0.05)
 */
export function freshnessDecay(releaseDate, lambda = 0.05) {
  if (!releaseDate) return 0.3; // unknown date → moderate penalty
  const year = parseInt(releaseDate.split('-')[0], 10);
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - year);
  return Math.exp(-lambda * age);
}

/**
 * Score a movie against a search context.
 * @param {object} movie
 * @param {object} ctx - { query, maxPopularity, meanRating, minVotes, targetGenres }
 * @returns {number} composite score (0–10 scale)
 */
export function compositeScore(movie, ctx) {
  const {
    query = '',
    maxPopularity = 100,
    meanRating = 6.5,
    minVotes = 200,
    targetGenres = [],
  } = ctx;

  // 1. Title match (0–1)
  const titleSim = query
    ? fuzzySimilarity(query, movie.title || '')
    : 0.5; // no query = neutral

  // 2. Bayesian rating normalised to 0–1 (assuming 0–10 scale)
  const bRating = bayesianRating(movie, minVotes, meanRating) / 10;

  // 3. Popularity (log-normalised)
  const pop = movie.popularity || 1;
  const popNorm = maxPopularity > 1
    ? Math.log10(pop + 1) / Math.log10(maxPopularity + 1)
    : 0.5;

  // 4. Freshness
  const fresh = freshnessDecay(movie.release_date);

  // 5. Genre boost
  let gBoost = 0;
  if (targetGenres.length > 0 && movie.genre_ids) {
    const movieGenres = new Set(movie.genre_ids);
    const matches = targetGenres.filter(g => movieGenres.has(g)).length;
    gBoost = matches / targetGenres.length; // 0–1
  } else {
    gBoost = 0.5; // neutral when no genre filter
  }

  // Weighted sum → scale to 0–10
  const raw =
    WEIGHTS.titleMatch     * titleSim +
    WEIGHTS.bayesianRating * bRating +
    WEIGHTS.popularity     * popNorm +
    WEIGHTS.freshness      * fresh +
    WEIGHTS.genreBoost     * gBoost;

  return raw * 10; // 0–10
}

// ─── GENRE JACCARD SIMILARITY ───

/**
 * Jaccard similarity between two movies' genre sets.
 * Returns 0–1. Used by MMR to measure redundancy.
 */
export function genreJaccard(movieA, movieB) {
  const a = new Set(movieA.genre_ids || []);
  const b = new Set(movieB.genre_ids || []);
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter(g => b.has(g)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── MAXIMAL MARGINAL RELEVANCE (MMR) ───
// Selects items that are both relevant AND diverse.
// MMR(dᵢ) = λ · Score(dᵢ) − (1−λ) · max( Sim(dᵢ, dⱼ) )  ∀ dⱼ ∈ selected

/**
 * Re-rank movies using Maximal Marginal Relevance.
 * @param {Array} movies  - pre-scored movie objects with ._score
 * @param {number} lambda - trade-off: 1.0 = pure relevance, 0.0 = max diversity
 * @param {number} count  - how many to select
 * @returns {Array} re-ranked subset
 */
export function mmrRerank(movies, lambda = 0.7, count = 20) {
  if (movies.length <= 1) return movies;
  count = Math.min(count, movies.length);

  const selected = [];
  const remaining = [...movies];

  // Pick the top-scored first
  remaining.sort((a, b) => (b._score || 0) - (a._score || 0));
  selected.push(remaining.shift());

  while (selected.length < count && remaining.length > 0) {
    let bestIdx = 0;
    let bestMMR = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = candidate._score || 0;

      // max similarity to any already-selected item
      let maxSim = 0;
      for (const sel of selected) {
        const sim = genreJaccard(candidate, sel);
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim * 10;
      if (mmrScore > bestMMR) {
        bestMMR = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0]);
  }

  return selected;
}

// ─── FISHER-YATES WEIGHTED SHUFFLE ───

/**
 * Shuffle with bias toward higher-scored items.
 * Uses softmax-style probability weighting.
 */
export function weightedShuffle(movies, temperature = 1.0) {
  const arr = [...movies];
  const n = arr.length;

  for (let i = n - 1; i > 0; i--) {
    // Compute softmax weights for remaining items
    const scores = arr.slice(0, i + 1).map(m => (m._score || 0) / temperature);
    const maxScore = Math.max(...scores);
    const exps = scores.map(s => Math.exp(s - maxScore)); // numerical stability
    const sumExp = exps.reduce((a, b) => a + b, 0);

    // Pick index based on weighted probability
    let rand = Math.random() * sumExp;
    let j = 0;
    for (; j < i; j++) {
      rand -= exps[j];
      if (rand <= 0) break;
    }

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// ─── MAIN RANKING PIPELINE ───

/**
 * Full pipeline: score → MMR re-rank → weighted shuffle.
 * @param {Array} movies      - raw movie objects from API
 * @param {object} ctx        - scoring context (query, genres, etc.)
 * @param {object} opts       - { mmrLambda, count, shuffle, temperature }
 * @returns {Array} ranked + diversified movies
 */
export function rankMovies(movies, ctx = {}, opts = {}) {
  const {
    mmrLambda = 0.7,
    count = 20,
    shuffle = false,
    temperature = 1.0,
  } = opts;

  if (!movies || movies.length === 0) return [];

  // Compute pool stats
  const meanRating = computeMeanRating(movies);
  const maxPopularity = Math.max(...movies.map(m => m.popularity || 0), 1);
  const enrichedCtx = { ...ctx, meanRating, maxPopularity };

  // Score each movie
  const scored = movies.map(m => ({
    ...m,
    _score: compositeScore(m, enrichedCtx),
  }));

  // Filter out very low quality (score < 2 out of 10)
  const viable = scored.filter(m => m._score >= 2);
  const pool = viable.length > 0 ? viable : scored;

  // MMR re-rank for diversity
  const reranked = mmrRerank(pool, mmrLambda, count);

  // Optional weighted shuffle (for recommendations)
  return shuffle ? weightedShuffle(reranked, temperature) : reranked;
}
