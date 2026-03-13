// ============================================================
// db.js — Storage Layer for The Great Movie Vault
// ============================================================
// localStorage-based persistence with:
// - Movie object slimming (save only essential fields)
// - QuotaExceededError handling
// - Capped search history
// - User taste profile tracking
// ============================================================

const DB_KEYS = {
  WATCHLIST: 'cine_gpt_watchlist',
  LIBRARIES: 'cine_gpt_libraries',
  HISTORY: 'vault_history',
  TASTE: 'cine_gpt_taste_profile',
};

const MAX_HISTORY = 50;

// ─── HELPERS ───

/**
 * Generate a unique ID.
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Strip a movie object to only the fields we need for display + scoring.
 * Saves ~70% storage per movie.
 */
export const slimMovie = (movie) => {
  if (!movie) return movie;
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    genre_ids: movie.genre_ids || [],
    overview: movie.overview,
  };
};

/**
 * Safe localStorage write with QuotaExceededError handling.
 * Returns { success, message }.
 */
const safeSetItem = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    if (error instanceof DOMException &&
        (error.code === 22 || error.code === 1014 ||
         error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      return { success: false, message: 'Storage full! Try removing some items to free space.' };
    }
    console.error('Storage error:', error);
    return { success: false, message: 'Failed to save data.' };
  }
};

/**
 * Safe localStorage read.
 */
const safeGetItem = (key, fallback = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return fallback;
  }
};

// ─── WATCHLIST ───

export const loadWatchlist = () => safeGetItem(DB_KEYS.WATCHLIST, []);

export const saveWatchlist = (watchlist) => {
  return safeSetItem(DB_KEYS.WATCHLIST, watchlist);
};

export const addToWatchlist = (movie) => {
  const watchlist = loadWatchlist();
  if (watchlist.some(m => m.id === movie.id)) {
    return { success: false, message: 'Already in watchlist' };
  }
  watchlist.unshift(slimMovie(movie));
  const result = saveWatchlist(watchlist);
  if (!result.success) return result;
  return { success: true, message: 'Added to watchlist' };
};

export const removeFromWatchlist = (movieId) => {
  const watchlist = loadWatchlist();
  const filtered = watchlist.filter(m => m.id !== movieId);
  saveWatchlist(filtered);
  return { success: true, message: 'Removed from watchlist' };
};

export const isInWatchlist = (movieId) => {
  const watchlist = loadWatchlist();
  return watchlist.some(m => m.id === movieId);
};

export const clearWatchlist = () => {
  saveWatchlist([]);
  return { success: true, message: 'Watchlist cleared' };
};

// ─── LIBRARIES ───

export const loadLibraries = () => safeGetItem(DB_KEYS.LIBRARIES, []);

export const saveLibraries = (libraries) => {
  return safeSetItem(DB_KEYS.LIBRARIES, libraries);
};

export const createLibrary = (name, description = '', privacy = 'private') => {
  const libraries = loadLibraries();
  if (libraries.some(lib => lib.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, message: 'Library name already exists' };
  }

  const newLibrary = {
    id: generateId(),
    name,
    description,
    privacy,
    movies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  libraries.push(newLibrary);
  const result = saveLibraries(libraries);
  if (!result.success) return result;
  return { success: true, message: 'Library created', library: newLibrary };
};

export const addToLibrary = (libraryId, movie) => {
  const libraries = loadLibraries();
  const library = libraries.find(lib => lib.id === libraryId);

  if (!library) return { success: false, message: 'Library not found' };
  if (library.movies.some(m => m.id === movie.id)) {
    return { success: false, message: 'Movie already in this library' };
  }

  library.movies.unshift(slimMovie(movie));
  library.updatedAt = new Date().toISOString();
  const result = saveLibraries(libraries);
  if (!result.success) return result;
  return { success: true, message: `Added to ${library.name}` };
};

export const removeFromLibrary = (libraryId, movieId) => {
  const libraries = loadLibraries();
  const library = libraries.find(lib => lib.id === libraryId);
  if (!library) return { success: false, message: 'Library not found' };

  library.movies = library.movies.filter(m => m.id !== movieId);
  library.updatedAt = new Date().toISOString();
  saveLibraries(libraries);
  return { success: true, message: 'Removed from library' };
};

export const updateLibrary = (libraryId, updates) => {
  const libraries = loadLibraries();
  const library = libraries.find(lib => lib.id === libraryId);
  if (!library) return { success: false, message: 'Library not found' };

  Object.assign(library, updates, { updatedAt: new Date().toISOString() });
  saveLibraries(libraries);
  return { success: true, message: 'Library updated', library };
};

export const deleteLibrary = (libraryId) => {
  const libraries = loadLibraries();
  const filtered = libraries.filter(lib => lib.id !== libraryId);
  saveLibraries(filtered);
  return { success: true, message: 'Library deleted' };
};

export const getLibrary = (libraryId) => {
  const libraries = loadLibraries();
  return libraries.find(lib => lib.id === libraryId);
};

export const isInLibrary = (libraryId, movieId) => {
  const library = getLibrary(libraryId);
  if (!library) return false;
  return library.movies.some(m => m.id === movieId);
};

export const getLibrariesWithMovie = (movieId) => {
  const libraries = loadLibraries();
  return libraries.filter(lib => lib.movies.some(m => m.id === movieId));
};

// ─── SEARCH HISTORY (capped) ───

export const loadHistory = () => {
  const history = safeGetItem(DB_KEYS.HISTORY, []);
  // Enforce cap on read too (migration safety)
  return history.slice(0, MAX_HISTORY);
};

export const saveHistory = (history) => {
  const capped = (history || []).slice(0, MAX_HISTORY);
  return safeSetItem(DB_KEYS.HISTORY, capped);
};

export const addHistoryEntry = (entry) => {
  const history = loadHistory();
  history.unshift(entry);
  return saveHistory(history);
};

// ─── USER TASTE PROFILE ───
// Tracks genre/region/decade preferences from search behaviour.
// Shape: { genres: { 28: 5, 35: 12 }, regions: { hi: 3 }, decades: { "90s": 8 } }

export const loadTasteProfile = () => {
  return safeGetItem(DB_KEYS.TASTE, { genres: {}, regions: {}, decades: {} });
};

export const saveTasteProfile = (profile) => {
  return safeSetItem(DB_KEYS.TASTE, profile);
};

/**
 * Record a search event into the taste profile.
 * @param {object} signals - { genres: [28, 35], region: "hi", decade: "90s" }
 */
export const recordTaste = (signals = {}) => {
  const profile = loadTasteProfile();

  if (signals.genres) {
    signals.genres.forEach(g => {
      profile.genres[g] = (profile.genres[g] || 0) + 1;
    });
  }
  if (signals.region) {
    profile.regions[signals.region] = (profile.regions[signals.region] || 0) + 1;
  }
  if (signals.decade) {
    profile.decades[signals.decade] = (profile.decades[signals.decade] || 0) + 1;
  }

  saveTasteProfile(profile);
  return profile;
};
