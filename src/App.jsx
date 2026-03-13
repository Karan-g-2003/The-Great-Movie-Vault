import React, { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, Play, Loader, Monitor, User, Video, Film, Tag, LayoutGrid, ChevronRight, ChevronLeft, Sparkles, Heart, Bookmark, Plus, Library, Trash2, Check } from 'lucide-react';
import './App.css';
import * as db from './db';
import { rankMovies, fuzzySimilarity, bayesianRating, computeMeanRating } from './scoring';
import { RatingRing, SkeletonGrid, MovieCard } from './components';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || "6cf39a7a760d396cc663ddd7dc70b8ba";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/original";
const ACCENT = "#08DB89";

const GENRES = { action:28, adventure:12, animation:16, comedy:35, crime:80, documentary:99, drama:18, family:10751, fantasy:14, history:36, horror:27, music:10402, mystery:9648, romance:10749, scifi:878, "sci-fi":878, thriller:53, war:10752, western:37 };
const MOODS = { sad:18, happy:35, funny:35, scary:27, tense:53, love:10749, "feel-good":35, emotional:18, exciting:28 };
const REGIONS = { bollywood:"hi", hindi:"hi", hollywood:"en", korean:"ko", japanese:"ja", french:"fr", tamil:"ta", telugu:"te", spanish:"es", chinese:"zh", german:"de" };
const DECADES = { "80s":["1980-01-01","1989-12-31"], "90s":["1990-01-01","1999-12-31"], "2000s":["2000-01-01","2009-12-31"], "2010s":["2010-01-01","2019-12-31"], classic:["1950-01-01","1979-12-31"] };
const KEYWORDS = { "mind-bending":"9840", psychological:"9840", "plot twist":"11800", twist:"11800", cyberpunk:"4563", dystopian:"4563", space:"3801", alien:"9951", gangster:"10478", mafia:"10478", whodunit:"10714", "serial killer":"7025", noir:"4565", "time travel":"4379", superhero:"9715", vampire:"3133", zombie:"12377", heist:"10051", cult:"9799", surreal:"10714", revenge:"9748", "martial arts":"1701", sports:"6075", politics:"5923" };
const EMOTION_SYNONYMS = { jolly:[35,10751], joyful:[35,10751], cheerful:[35,10751], lighthearted:[35,10751], uplifting:[35,18], heartwarming:[35,18,10749], envy:[18,53], jealous:[18,53], lonely:[18], nostalgic:[18,10749], rage:[28,53], furious:[28,53], calm:[99] };

const SUGGESTIONS = ["Plot Twist","Underrated Bollywood","90s Crime Thriller","Psychological Horror","Feel-good Comedy","Time Travel","Korean Drama","Cyberpunk"];
const TAG_POOL = ["Cult Classics","Cyberpunk","Award Winning","Indie Gems","Plot Twist","True Story","Visually Stunning","Dystopian","Time Travel","Noir","Space Opera","Martial Arts","Coming of Age","Revenge","Whodunit","Mind-Bending","Heist","Superhero"];

const GENRE_COLORS = { 28:'#ef4444', 12:'#f97316', 16:'#a855f7', 35:'#eab308', 80:'#64748b', 99:'#06b6d4', 18:'#3b82f6', 10751:'#ec4899', 14:'#8b5cf6', 27:'#dc2626', 9648:'#6366f1', 10749:'#f43f5e', 878:'#06b6d4', 53:'#f59e0b' };
const GENRE_NAMES = { 28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western' };

export default function TheGreatMovieVault() {
  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggIdx, setSelectedSuggIdx] = useState(-1);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('home');
  const [movieQueue, setMovieQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueContext, setQueueContext] = useState("");
  const [currentMovie, setCurrentMovie] = useState(null);
  const [collectionData, setCollectionData] = useState({ title:"", movies:[] });
  const [credits, setCredits] = useState(null);
  const [providers, setProviders] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [backgroundPosters, setBackgroundPosters] = useState([]);
  const [displayTags, setDisplayTags] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [currentLibrary, setCurrentLibrary] = useState(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showAddToLibraryMenu, setShowAddToLibraryMenu] = useState(false);
  const [libraryFormData, setLibraryFormData] = useState({ name:'', description:'', privacy:'private' });
  const [notification, setNotification] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const chatEndRef = useRef(null);

  // Derived state — NO localStorage reads during render
  const isInWL = currentMovie ? watchlist.some(m => m.id === currentMovie.id) : false;
  const libraryMembership = currentMovie ? new Set(libraries.filter(l => l.movies.some(m => m.id === currentMovie.id)).map(l => l.id)) : new Set();

  useEffect(() => {
    (async () => {
      try {
        const page = Math.floor(Math.random() * 3) + 1;
        const res = await fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&page=${page}`);
        const data = await res.json();
        if (data.results) setBackgroundPosters(data.results.slice(0, 12));
      } catch (e) {}
    })();
  }, []);

  useEffect(() => { setHistory(db.loadHistory()); }, []);
  useEffect(() => { db.saveHistory(history); }, [history]);
  useEffect(() => {
    setWatchlist(db.loadWatchlist());
    setLibraries(db.loadLibraries());
  }, []);

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddToWatchlist = () => {
    if (!currentMovie) return;
    const result = db.addToWatchlist(currentMovie);
    if (result.success) { setWatchlist(db.loadWatchlist()); showNotif(result.message); }
    else showNotif(result.message, result.message.includes('Storage') ? 'error' : 'info');
  };
  const handleRemoveFromWatchlist = (movieId) => {
    const r = db.removeFromWatchlist(movieId);
    if (r.success) { setWatchlist(db.loadWatchlist()); showNotif(r.message); }
  };
  const handleViewWatchlist = () => { setViewMode('watchlist'); setSidebarOpen(false); setCurrentMovie(null); };

  const handleCreateLibrary = (e) => {
    e.preventDefault();
    if (!libraryFormData.name.trim()) { showNotif('Please enter a library name', 'error'); return; }
    const r = db.createLibrary(libraryFormData.name, libraryFormData.description, libraryFormData.privacy);
    if (r.success) { setLibraries(db.loadLibraries()); setShowLibraryModal(false); setLibraryFormData({name:'',description:'',privacy:'private'}); showNotif(r.message); }
    else showNotif(r.message, 'error');
  };
  const handleAddToLibrary = (libraryId) => {
    if (!currentMovie) return;
    const r = db.addToLibrary(libraryId, currentMovie);
    if (r.success) { setLibraries(db.loadLibraries()); setShowAddToLibraryMenu(false); showNotif(r.message); }
    else showNotif(r.message, r.message.includes('Storage') ? 'error' : 'info');
  };
  const handleRemoveFromLibrary = (libraryId, movieId) => {
    const r = db.removeFromLibrary(libraryId, movieId);
    if (r.success) { setLibraries(db.loadLibraries()); setCurrentLibrary(db.getLibrary(libraryId)); showNotif(r.message); }
  };
  const handleViewLibrary = (lib) => { setCurrentLibrary(lib); setViewMode('library'); setSidebarOpen(false); setCurrentMovie(null); };
  const handleDeleteLibrary = (id) => {
    if (!window.confirm('Delete this library?')) return;
    const r = db.deleteLibrary(id);
    if (r.success) { setLibraries(db.loadLibraries()); if (currentLibrary?.id === id) { setViewMode('home'); setCurrentLibrary(null); } showNotif(r.message); }
  };

  // Autocomplete with fuzzy matching + recent history
  useEffect(() => {
    if (!isTyping || query.length < 2) { setSuggestions([]); setShowSuggestions(false); setSelectedSuggIdx(-1); return; }
    const timer = setTimeout(async () => {
      const lower = query.toLowerCase();
      let matches = [];
      // Recent history matches
      history.slice(0, 20).forEach(h => {
        if (h.query.toLowerCase().includes(lower) && !matches.some(m => m.label === h.query)) {
          matches.push({ type:'history', label: h.query, _sim: fuzzySimilarity(lower, h.query) + 0.1 });
        }
      });
      // Concept matches
      const allConcepts = { ...GENRES, ...MOODS, ...KEYWORDS, ...DECADES, ...EMOTION_SYNONYMS };
      Object.keys(allConcepts).forEach(key => {
        const sim = fuzzySimilarity(lower, key);
        if ((sim > 0.5 || key.includes(lower)) && !matches.some(m => m.label === key)) matches.push({ type:'topic', label:key, _sim: sim });
      });
      // Multi-word concept matching (e.g. "comedy bollywood" matches both)
      const words = lower.split(/\W+/).filter(Boolean);
      if (words.length > 1) {
        const combined = words.map(w => {
          const g = Object.keys(GENRES).find(k => k.includes(w) || fuzzySimilarity(w, k) > 0.7);
          const r = Object.keys(REGIONS).find(k => k.includes(w) || fuzzySimilarity(w, k) > 0.7);
          return g || r || w;
        }).join(' ');
        if (combined !== lower && !matches.some(m => m.label === combined)) {
          matches.push({ type:'topic', label: combined, _sim: 0.85 });
        }
      }
      matches.sort((a, b) => b._sim - a._sim);
      // Movie title matches from API
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1`);
        const data = await res.json();
        if (data.results) {
          const titles = data.results.filter(m => m.poster_path && m.vote_count > 10).slice(0, 4)
            .map(m => ({ type:'movie', label:m.title, id:m.id, year: m.release_date?.split('-')[0], _sim: fuzzySimilarity(lower, m.title) }));
          matches = [...matches.slice(0, 4), ...titles];
        }
      } catch (e) {}
      setSuggestions(matches.slice(0, 8));
      setShowSuggestions(true);
      setSelectedSuggIdx(-1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, isTyping]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false); setSelectedSuggIdx(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for suggestions
  const handleSearchKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggIdx(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggIdx(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        return;
      }
      if (e.key === 'Enter' && selectedSuggIdx >= 0) {
        e.preventDefault();
        const sel = suggestions[selectedSuggIdx];
        handleSearch(sel.label, sel.type);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false); setSelectedSuggIdx(-1);
        return;
      }
      if (e.key === 'Tab' && selectedSuggIdx >= 0) {
        e.preventDefault();
        setQuery(suggestions[selectedSuggIdx].label);
        setShowSuggestions(false); setSelectedSuggIdx(-1);
        return;
      }
    }
    if (e.key === 'Enter') handleSearch();
  };

  const shuffleTags = () => {
    const shuffled = [...TAG_POOL].sort(() => 0.5 - Math.random());
    setDisplayTags(shuffled.slice(0, 8));
  };

  // --- LOAD MOVIE PAGE (multi-source recommendations) ---
  const loadMoviePage = async (movie) => {
    if (!movie) return;
    setFetching(true); setTrailerKey(null); setErrorState(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    shuffleTags();
    try {
      const [creditsRes, providerRes, videosRes, recRes, simRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/recommendations?api_key=${API_KEY}&page=${Math.floor(Math.random()*3)+1}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/similar?api_key=${API_KEY}&page=1`),
      ]);
      const [creditsData, providerData, videosData, recData, simData] = await Promise.all([creditsRes.json(), providerRes.json(), videosRes.json(), recRes.json(), simRes.json()]);
      const director = creditsData.crew?.find(m => m.job === "Director");
      setCredits({ director: director?.name || "Unknown", cast: creditsData.cast?.slice(0, 4) || [] });
      const regionData = providerData.results?.IN || providerData.results?.US;
      setProviders(regionData ? (regionData.flatrate || regionData.buy) : null);
      const trailer = videosData.results?.find(v => (v.type === "Trailer" || v.type === "Teaser") && v.site === "YouTube");
      setTrailerKey(trailer?.key || null);

      // Multi-source blend: recommendations (0.5) + similar (0.3) + score-based ranking
      const recMovies = (recData.results || []).map(m => ({ ...m, _source: 'rec' }));
      const simMovies = (simData.results || []).map(m => ({ ...m, _source: 'sim' }));
      const combined = [...recMovies, ...simMovies];
      const unique = combined.filter((v, i, a) => a.findIndex(v2 => v2.id === v.id) === i && v.poster_path);
      const ranked = rankMovies(unique, { targetGenres: movie.genre_ids || [] }, { count: 10, shuffle: true, temperature: 1.5 });
      setAlternatives(ranked.slice(0, 10));
      setCurrentMovie(movie); setViewMode('movie');
    } catch (e) {
      console.error(e);
      setErrorState('Failed to load movie details. Please try again.');
    } finally { setFetching(false); }
  };

  // --- DISCOVERY SEARCH (for tags/topics) ---
  const executeDiscoverySearch = async (tag) => {
    const lower = tag.toLowerCase();
    let params = `api_key=${API_KEY}&language=en-US&include_adult=false&sort_by=popularity.desc`;
    let minVotes = 100;
    if (KEYWORDS[lower]) params += `&with_keywords=${KEYWORDS[lower]}`;
    if (GENRES[lower]) params += `&with_genres=${GENRES[lower]}`;
    if (EMOTION_SYNONYMS[lower]) params += `&with_genres=${EMOTION_SYNONYMS[lower].join(',')}`;
    // Parse regions + decades in discovery too
    Object.keys(REGIONS).forEach(k => { if (lower.includes(k)) { params += `&with_original_language=${REGIONS[k]}`; minVotes = 30; } });
    Object.keys(DECADES).forEach(k => { if (lower.includes(k)) { params += `&primary_release_date.gte=${DECADES[k][0]}&primary_release_date.lte=${DECADES[k][1]}`; } });
    params += `&vote_count.gte=${minVotes}&page=${Math.floor(Math.random()*3)+1}`;

    const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params}`);
    const data = await res.json();
    if (data.results?.length > 0) {
      const ranked = rankMovies(data.results.filter(m => m.poster_path), { query: tag }, { count: 20, shuffle: true });
      setMovieQueue(ranked); setQueueIndex(0);
      await loadMoviePage(ranked[0]);
      setHistory(prev => [{ query: tag, result: ranked[0].title }, ...prev]);
    }
    setFetching(false);
  };

  // --- MASTER SEARCH (with Bayesian scoring + fallback chain) ---
  const handleSearch = async (overrideQuery = null, type = null) => {
    const searchText = overrideQuery || query;
    if (!searchText) return;
    setIsTyping(false); setShowSuggestions(false); setFetching(true); setErrorState(null);
    setSidebarOpen(false); setQuery(searchText); setCurrentMovie(null);
    setMovieQueue([]); setQueueIndex(0); setQueueContext(searchText);

    if (type === 'topic') { await executeDiscoverySearch(searchText); return; }
    const lowerQuery = searchText.toLowerCase();

    let genreIds = new Set(), keywordIds = new Set(), selectedLang = null, dateRange = null, matchedDecade = null;
    Object.keys(DECADES).forEach(k => { if (lowerQuery.includes(k)) { dateRange = DECADES[k]; matchedDecade = k; } });
    Object.keys(GENRES).forEach(k => { if (lowerQuery.includes(k)) genreIds.add(GENRES[k]); });
    Object.keys(MOODS).forEach(k => { if (lowerQuery.includes(k)) genreIds.add(MOODS[k]); });
    Object.keys(KEYWORDS).forEach(k => { if (lowerQuery.includes(k)) keywordIds.add(KEYWORDS[k]); });
    Object.keys(REGIONS).forEach(k => { if (lowerQuery.includes(k)) selectedLang = REGIONS[k]; });
    lowerQuery.split(/\W+/).filter(Boolean).forEach(w => {
      if (EMOTION_SYNONYMS[w]) EMOTION_SYNONYMS[w].forEach(id => genreIds.add(id));
    });

    const selectedGenres = Array.from(genreIds);
    const selectedKeywords = Array.from(keywordIds);

    // Record taste profile
    db.recordTaste({ genres: selectedGenres, region: selectedLang, decade: matchedDecade });

    try {
      // 1. CONCEPT DISCOVERY (with fallback on empty results)
      if (selectedGenres.length > 0 || selectedLang || dateRange || selectedKeywords.length > 0) {
        let minVotes = selectedLang ? 30 : (dateRange || selectedKeywords.length > 0) ? 100 : 200;
        for (const voteThreshold of [minVotes, Math.floor(minVotes / 3), 10]) {
          let params = `api_key=${API_KEY}&language=en-US&include_adult=false&page=${Math.floor(Math.random()*3)+1}`;
          if (dateRange) params += `&primary_release_date.gte=${dateRange[0]}&primary_release_date.lte=${dateRange[1]}`;
          if (selectedGenres.length > 0) params += `&with_genres=${selectedGenres.join(',')}`;
          if (selectedKeywords.length > 0) params += `&with_keywords=${selectedKeywords.join('|')}`;
          if (selectedLang) params += `&with_original_language=${selectedLang}`;
          params += `&vote_count.gte=${voteThreshold}&sort_by=${voteThreshold > 50 ? 'vote_average.desc' : 'popularity.desc'}`;
          const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params}`);
          const data = await res.json();
          if (data.results?.length > 0) {
            const ranked = rankMovies(data.results.filter(m => m.poster_path), { query: searchText, targetGenres: selectedGenres, minVotes: voteThreshold }, { count: 20, shuffle: true });
            setMovieQueue(ranked); setQueueIndex(0);
            await loadMoviePage(ranked[0]);
            setHistory(prev => [{ query: searchText, result: ranked[0].title }, ...prev]);
            return;
          }
        }
      }
      // 2. PERSON SEARCH
      const personRes = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(searchText)}`);
      const personData = await personRes.json();
      if (personData.results?.length > 0) {
        const person = personData.results[0];
        const creditsRes = await fetch(`https://api.themoviedb.org/3/person/${person.id}/movie_credits?api_key=${API_KEY}`);
        const creditsData = await creditsRes.json();
        const cleanList = [...(creditsData.cast || []), ...(creditsData.crew || [])]
          .filter(m => m.poster_path && m.vote_count > 20)
          .filter((v, i, a) => a.findIndex(v2 => v2.id === v.id) === i);
        if (cleanList.length > 0) {
          const ranked = rankMovies(cleanList, { query: searchText }, { count: 30 });
          setCollectionData({ title: `Filmography: ${person.name}`, movies: ranked });
          setMovieQueue(ranked); setQueueIndex(0); setViewMode('collection');
          setHistory(prev => [{ query: searchText, result: `Collection: ${person.name}` }, ...prev]);
          setFetching(false); return;
        }
      }
      // 3. TITLE SEARCH with fuzzy matching
      const titleRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(searchText)}&page=1&include_adult=false`);
      const titleData = await titleRes.json();
      if (titleData.results?.length > 0) {
        const allResults = titleData.results.filter(m => m.poster_path);
        const strongMatches = allResults.filter(m => fuzzySimilarity(searchText, m.title) > 0.7);
        const bestPool = strongMatches.length > 0 ? strongMatches : allResults;
        const ranked = rankMovies(bestPool, { query: searchText }, { count: 20 });
        if (ranked.length > 1 && strongMatches.length > 1) {
          setCollectionData({ title: `Matches for "${searchText}"`, movies: ranked });
          setMovieQueue(ranked); setQueueIndex(0); setViewMode('collection');
          setHistory(prev => [{ query: searchText, result: `Matches: ${searchText}` }, ...prev]);
          setFetching(false); return;
        }
        const first = ranked[0] || allResults[0];
        const recRes = await fetch(`https://api.themoviedb.org/3/movie/${first.id}/recommendations?api_key=${API_KEY}&page=1`);
        const recData = await recRes.json();
        const recPool = [first, ...(recData.results || [])];
        const reRanked = rankMovies(recPool, { query: searchText }, { count: 20 });
        setMovieQueue(reRanked); setQueueIndex(0);
        await loadMoviePage(first);
        setHistory(prev => [{ query: searchText, result: first.title }, ...prev]);
        return;
      }
      setErrorState(`No results found for "${searchText}". Try a different search.`);
    } catch (e) {
      console.error(e);
      setErrorState('Search failed. Check your connection and try again.');
    } finally { setFetching(false); }
  };

  const handleNext = () => {
    if (!movieQueue?.length || queueIndex >= movieQueue.length - 1) {
      if (currentMovie) handleGridClick(currentMovie); else handleSearch("Underrated Masterpiece");
      return;
    }
    const next = queueIndex + 1; setQueueIndex(next); loadMoviePage(movieQueue[next]);
  };
  const handlePrevious = () => {
    if (!movieQueue?.length || queueIndex <= 0) return;
    const prev = queueIndex - 1; setQueueIndex(prev); loadMoviePage(movieQueue[prev]);
  };
  const handleCollectionClick = (movie, index) => { setQueueIndex(index); loadMoviePage(movie); };

  const handleGridClick = async (movie) => {
    setFetching(true); setTrailerKey(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const [recRes, simRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/recommendations?api_key=${API_KEY}&page=${Math.floor(Math.random()*3)+1}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/similar?api_key=${API_KEY}&page=1`),
      ]);
      const [recData, simData] = await Promise.all([recRes.json(), simRes.json()]);
      const combined = [...(recData.results || []), ...(simData.results || [])].filter((v,i,a) => a.findIndex(v2 => v2.id === v.id) === i);
      const ranked = rankMovies([movie, ...combined], { targetGenres: movie.genre_ids || [] }, { count: 20, shuffle: true });
      setMovieQueue(ranked); setQueueIndex(0); setQueueContext(`Similar to: ${movie.title}`);
      await loadMoviePage(movie);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="h-screen w-screen flex bg-[#050508] text-white overflow-hidden relative font-sans gradient-mesh">
      {/* WALLPAPER */}
      {viewMode === 'home' && (
        <div className="absolute inset-0 overflow-hidden z-0 opacity-15 pointer-events-none">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-8 p-4">
            {backgroundPosters.map((movie, i) => (
              <div key={movie.id} className="floating-poster" style={{ animationDelay:`${i*1.5}s`, marginTop:`${(i%3)*40}px` }}>
                <img src={`${IMG}${movie.poster_path}`} alt="" className="rounded-xl grayscale hover:grayscale-0 transition-all duration-1000" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/90 to-transparent" />
        </div>
      )}

      {/* SIDEBAR */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 glass-strong w-72 transform transition-transform duration-300 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <span className="font-bold tracking-widest text-[#08DB89] text-sm">VAULT MENU</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto h-full pb-32">
          <div className="p-4 border-b border-white/10">
            <button onClick={handleViewWatchlist} className="w-full flex items-center justify-between p-3 rounded-xl glass hover:border-[#08DB89]/50 cursor-pointer transition-all group">
              <div className="flex items-center gap-3"><Heart size={18} className="text-[#08DB89] group-hover:fill-[#08DB89]" /><span className="text-sm font-bold text-gray-200 group-hover:text-[#08DB89]">My Watchlist</span></div>
              {watchlist.length > 0 && <span className="bg-[#08DB89] text-black text-xs font-bold px-2 py-1 rounded-full">{watchlist.length}</span>}
            </button>
          </div>
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Library size={14} /> My Libraries</span>
              <button onClick={() => setShowLibraryModal(true)} className="p-1.5 rounded-full hover:bg-[#08DB89]/10 transition-colors"><Plus size={14} className="text-[#08DB89]" /></button>
            </div>
            {libraries.length > 0 ? (
              <div className="space-y-2">
                {libraries.map(lib => (
                  <div key={lib.id} className="flex items-center justify-between p-3 rounded-xl glass hover:border-[#08DB89]/50 cursor-pointer transition-all group">
                    <div onClick={() => handleViewLibrary(lib)} className="flex-1">
                      <div className="text-sm font-bold text-gray-200 group-hover:text-[#08DB89] truncate">{lib.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{lib.movies.length} {lib.movies.length === 1 ? 'movie':'movies'}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDeleteLibrary(lib.id); }} className="p-1 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} className="text-red-400" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-500 italic">No libraries yet</p>}
          </div>
          <div className="p-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">History</span>
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className="p-3 mb-2 rounded-xl glass hover:border-[#08DB89]/50 cursor-pointer transition-all" onClick={() => handleSearch(h.query)}>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Log #{history.length - i}</div>
                <div className="text-sm font-bold text-gray-200 truncate">{h.result}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col relative z-10 h-full">
        <header className="p-6 flex items-center justify-between relative z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><Menu size={24} /></button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter cursor-pointer" onClick={() => { setViewMode('home'); setCurrentMovie(null); setQuery(""); }}>
              THE GREAT MOVIE <span className="neon-text" style={{ color: ACCENT }}>VAULT</span>
            </h1>
          </div>
          {viewMode === 'movie' && (
            <div className="flex items-center gap-3">
              {queueIndex > 0 && (
                <button onClick={handlePrevious} className="btn-ghost flex items-center gap-2 px-4 py-2">
                  <ChevronLeft size={18} className="text-[#08DB89]" /><span className="text-xs font-bold tracking-widest text-gray-300">PREV</span>
                </button>
              )}
              <button onClick={handleNext} className="btn-ghost flex items-center gap-2 px-5 py-2">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{queueContext.substring(0, 15)}...</span>
                  <span className="text-xs font-bold tracking-widest text-gray-300">NEXT</span>
                </div>
                <ChevronRight size={20} className="text-[#08DB89]" />
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center">
          {/* ERROR STATE */}
          {errorState && !fetching && (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center page-enter">
              <div className="mb-4 p-4 rounded-full bg-red-500/10 border border-red-500/20"><X size={40} className="text-red-400" /></div>
              <p className="text-gray-400 max-w-md">{errorState}</p>
              <button onClick={() => { setErrorState(null); setViewMode('home'); }} className="btn-ghost px-6 py-2 mt-4 text-sm">Go Home</button>
            </div>
          )}

          {/* HOME */}
          {viewMode === 'home' && !fetching && !errorState && (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center page-enter mt-20">
              <div className="mb-6 p-6 rounded-full glass neon-shadow relative">
                <Video size={48} style={{ color: ACCENT }} />
                <div className="sparkle" style={{ top:'-4px', right:'8px', animationDelay:'0s' }} />
                <div className="sparkle" style={{ bottom:'4px', left:'-2px', animationDelay:'0.7s' }} />
                <div className="sparkle" style={{ top:'50%', right:'-6px', animationDelay:'1.4s' }} />
              </div>
              <h2 className="text-4xl font-light text-gray-200 mb-2">Access the <span className="font-bold neon-text" style={{color:ACCENT}}>Archives</span></h2>
              <p className="text-gray-500 mt-2 max-w-md">Try "Plot Twist", "90s Crime", "jolly revenge", or any actor name.</p>
            </div>
          )}

          {/* LOADING */}
          {fetching && (
            <div className="flex flex-col items-center justify-center h-[50vh]">
              <SkeletonGrid count={5} />
              <div className="mt-8 flex items-center gap-3">
                <Loader size={20} className="animate-spin" style={{ color: ACCENT }} />
                <span className="text-xs tracking-[0.3em] text-gray-500">DECRYPTING...</span>
              </div>
            </div>
          )}

          {/* COLLECTION */}
          {viewMode === 'collection' && !fetching && (
            <div className="w-full max-w-6xl page-enter pb-20">
              <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                <LayoutGrid size={32} style={{ color: ACCENT }} />
                <h2 className="text-3xl font-bold">{collectionData.title}</h2>
                <span className="glass px-3 py-1 rounded-full text-xs text-gray-400">{collectionData.movies.length} Archives</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {collectionData.movies.map((m, i) => <MovieCard key={m.id} movie={m} onClick={handleCollectionClick} index={i} imageBase={IMG} />)}
              </div>
            </div>
          )}

          {/* WATCHLIST */}
          {viewMode === 'watchlist' && !fetching && (
            <div className="w-full max-w-6xl page-enter pb-20">
              <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                <Heart size={32} style={{ color: ACCENT }} className="fill-[#08DB89]" />
                <h2 className="text-3xl font-bold">My Watchlist</h2>
                <span className="glass px-3 py-1 rounded-full text-xs text-gray-400">{watchlist.length} {watchlist.length === 1 ? 'Movie':'Movies'}</span>
              </div>
              {watchlist.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {watchlist.map((m, i) => <MovieCard key={m.id} movie={m} onClick={(movie) => handleGridClick(movie)} onRemove={handleRemoveFromWatchlist} index={i} imageBase={IMG} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[40vh] text-center"><Heart size={64} className="text-gray-700 mb-4" /><p className="text-gray-500">Your watchlist is empty</p></div>
              )}
            </div>
          )}

          {/* LIBRARY */}
          {viewMode === 'library' && currentLibrary && !fetching && (
            <div className="w-full max-w-6xl page-enter pb-20">
              <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                <Library size={32} style={{ color: ACCENT }} />
                <div className="flex-1"><h2 className="text-3xl font-bold">{currentLibrary.name}</h2>{currentLibrary.description && <p className="text-sm text-gray-400 mt-1">{currentLibrary.description}</p>}</div>
                <span className="glass px-3 py-1 rounded-full text-xs text-gray-400">{currentLibrary.movies.length} {currentLibrary.movies.length === 1 ? 'Movie':'Movies'}</span>
              </div>
              {currentLibrary.movies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {currentLibrary.movies.map((m, i) => <MovieCard key={m.id} movie={m} onClick={(movie) => handleGridClick(movie)} onRemove={(id) => handleRemoveFromLibrary(currentLibrary.id, id)} index={i} imageBase={IMG} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[40vh] text-center"><Library size={64} className="text-gray-700 mb-4" /><p className="text-gray-500">This library is empty</p></div>
              )}
            </div>
          )}

          {/* MOVIE DETAIL */}
          {viewMode === 'movie' && currentMovie && !fetching && (
            <div className="w-full max-w-6xl page-enter pb-20">
              <div className="parallax-backdrop"><img src={`${BACKDROP}${currentMovie.backdrop_path}`} alt="" /></div>
              <div className="flex flex-col lg:flex-row gap-12 mb-20">
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                  <img src={`${IMG}${currentMovie.poster_path}`} className="w-full rounded-2xl neon-shadow border border-white/10" alt="Poster" />
                  <div className="glass rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Monitor size={14} /> Streaming On</h3>
                    <div className="flex flex-wrap gap-3">
                      {providers?.length > 0 ? providers.map(p => (
                        <div key={p.provider_id} className="flex items-center gap-2 glass px-3 py-2 rounded-lg">
                          {p.logo_path && <img src={`${IMG}${p.logo_path}`} className="w-6 h-6 rounded-full" alt="" />}
                          <span className="text-xs font-semibold">{p.provider_name}</span>
                        </div>
                      )) : <span className="text-xs text-gray-500">No streaming data available.</span>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button onClick={handleAddToWatchlist} disabled={isInWL}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${isInWL ? 'bg-[#08DB89]/20 border border-[#08DB89]/40 text-[#08DB89] cursor-default' : 'glass hover:border-[#08DB89]/50 text-white'}`}>
                      <Heart size={18} className={isInWL ? 'fill-[#08DB89]' : ''} />
                      <span className="text-sm font-bold">{isInWL ? 'In Watchlist' : 'Add to Watchlist'}</span>
                    </button>
                    <div className="relative">
                      <button onClick={() => setShowAddToLibraryMenu(!showAddToLibraryMenu)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass hover:border-[#08DB89]/50 text-white transition-all">
                        <Bookmark size={18} /><span className="text-sm font-bold">Add to Library</span>
                      </button>
                      {showAddToLibraryMenu && (
                        <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto">
                          {libraries.length > 0 ? libraries.map(lib => {
                            const inLib = libraryMembership.has(lib.id);
                            return (
                              <button key={lib.id} onClick={() => handleAddToLibrary(lib.id)} disabled={inLib}
                                className={`w-full px-4 py-3 text-left hover:bg-white/10 border-b border-white/5 transition-colors ${inLib ? 'opacity-50 cursor-default' : ''}`}>
                                <div className="text-sm font-bold text-gray-200 flex items-center justify-between"><span>{lib.name}</span>{inLib && <Check size={14} className="text-[#08DB89]" />}</div>
                                <div className="text-xs text-gray-500 mt-1">{lib.movies.length} {lib.movies.length === 1 ? 'movie':'movies'}</div>
                              </button>
                            );
                          }) : <div className="px-4 py-3 text-sm text-gray-500 text-center">No libraries yet. Create one from the sidebar!</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-8">
                  <div>
                    <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4">{currentMovie.title}</h1>
                    <div className="flex items-center gap-4 text-sm font-mono flex-wrap">
                      <RatingRing rating={currentMovie.vote_average} />
                      <span className="text-gray-400">{currentMovie.release_date?.split("-")[0]}</span>
                      <span onClick={() => handleSearch(credits?.director)} className="cursor-pointer text-[#08DB89] hover:text-white hover:underline underline-offset-4 decoration-[#08DB89]">{credits?.director} (Dir.)</span>
                    </div>
                    {/* Genre pills */}
                    {currentMovie.genre_ids && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {currentMovie.genre_ids.slice(0, 4).map(gid => (
                          <span key={gid} className="genre-pill px-3 py-1 rounded-full text-xs font-semibold cursor-pointer" onClick={() => handleSearch(GENRE_NAMES[gid] || '')}
                            style={{ borderColor: GENRE_COLORS[gid] || ACCENT, color: GENRE_COLORS[gid] || ACCENT }}>
                            {GENRE_NAMES[gid] || `#${gid}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xl text-gray-300 font-light leading-relaxed border-l-2 pl-6" style={{ borderColor: ACCENT }}>{currentMovie.overview}</p>
                  {credits?.cast && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Starring Cast</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {credits.cast.map(actor => (
                          <div key={actor.id} onClick={() => handleSearch(actor.name)} className="flex items-center gap-3 glass p-2 rounded-xl cursor-pointer hover:border-[#08DB89]/50 transition-all group">
                            {actor.profile_path ? <img src={`${IMG}${actor.profile_path}`} className="w-10 h-10 rounded-full object-cover group-hover:scale-110 transition-transform" alt="" />
                            : <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center"><User size={16} /></div>}
                            <div><div className="text-sm font-bold text-gray-200 leading-none group-hover:text-[#08DB89] transition-colors">{actor.name}</div><div className="text-[10px] text-gray-500 mt-1">{actor.character}</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {trailerKey ? (
                    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video bg-black"><iframe className="w-full h-full" src={`https://www.youtube.com/embed/${trailerKey}`} title="Trailer" allowFullScreen /></div>
                  ) : <button className="btn-ghost px-6 py-3 text-sm">Trailer Unavailable</button>}
                </div>
              </div>
              {/* Similar Vibes */}
              <div className="border-t border-white/10 pt-10 mb-20">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Film size={18} style={{ color: ACCENT }} /> Similar Vibes</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {alternatives.map((m, i) => <MovieCard key={m.id} movie={m} onClick={(movie) => handleGridClick(movie)} index={i} imageBase={IMG} />)}
                </div>
              </div>
              {/* Continue Exploration Tags */}
              <div className="flex flex-col items-center justify-center pt-10 border-t border-white/10">
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-6">Continue Exploration</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {displayTags.map((tag, i) => (
                    <button key={i} onClick={() => handleSearch(tag)} className="genre-pill flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold stagger-enter" style={{ animationDelay:`${i*0.1}s` }}>
                      <Tag size={12} /> {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-32" />
        </div>

        {/* SEARCH BAR */}
        <div className="p-4 md:p-6 w-full max-w-4xl mx-auto relative z-20">
          {viewMode === 'home' && !showSuggestions && (
            <div className="flex items-center justify-center gap-3 flex-wrap mb-6 page-enter">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSearch(s)} className="genre-pill px-4 py-2 rounded-full text-xs stagger-enter" style={{ animationDelay:`${i*0.08}s` }}>{s}</button>
              ))}
            </div>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="absolute bottom-full left-0 right-0 mb-2 glass-strong rounded-xl overflow-hidden shadow-2xl z-50">
              {suggestions.map((s, i) => (
                <div key={i} onClick={() => handleSearch(s.label, s.type)}
                  onMouseEnter={() => setSelectedSuggIdx(i)}
                  className={`px-6 py-3 cursor-pointer border-b border-white/5 flex items-center justify-between group transition-colors ${
                    i === selectedSuggIdx ? 'bg-[#08DB89]/10 border-l-2 border-l-[#08DB89]' : 'hover:bg-white/10'
                  }`}>
                  <div className="flex items-center gap-3">
                    {s.type === 'history' && <Search size={12} className="text-gray-500" />}
                    {s.type === 'topic' && <Sparkles size={12} className="text-yellow-500" />}
                    {s.type === 'movie' && <Film size={12} className="text-gray-500" />}
                    <span className={`text-sm transition-colors ${i === selectedSuggIdx ? 'text-[#08DB89] font-semibold' : 'text-gray-200'}`}>{s.label}</span>
                    {s.year && <span className="text-xs text-gray-500">({s.year})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.type === 'history' && <span className="text-[10px] text-gray-600 uppercase">recent</span>}
                    {s.type === 'topic' && <span className="text-[10px] text-gray-600 uppercase">vibe</span>}
                    {s.type === 'movie' && <span className="text-[10px] text-gray-600 uppercase">movie</span>}
                    {i === selectedSuggIdx && <ChevronRight size={12} className="text-[#08DB89]" />}
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600">
                <span>↑↓ navigate</span><span>↵ select</span><span>esc dismiss</span>
              </div>
            </div>
          )}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#08DB89] to-cyan-500 rounded-[2rem] search-glow blur" />
            <div className="relative flex items-center bg-[#0a0a0a] rounded-[2rem] p-2 pr-2 shadow-2xl border border-white/10">
              <input ref={inputRef} type="text" value={query} onChange={e => { setQuery(e.target.value); setIsTyping(true); }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Search movies, vibes, or typos (e.g., 'Incep', 'jolly revenge')..."
                className="flex-1 bg-transparent text-white placeholder-gray-600 px-6 py-3 outline-none text-lg" />
              <button onClick={() => handleSearch()} className="btn-primary p-3 rounded-full">
                {fetching ? <Loader className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </div>
          </div>
          {viewMode === 'home' && <div className="text-center mt-4"><p className="text-[10px] text-gray-600 tracking-widest uppercase">The Great Movie Vault © 2025</p></div>}
        </div>
      </div>

      {/* LIBRARY MODAL */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md shadow-2xl page-enter">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2"><Library size={24} style={{ color: ACCENT }} /> Create Library</h3>
              <button onClick={() => { setShowLibraryModal(false); setLibraryFormData({name:'',description:'',privacy:'private'}); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateLibrary} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Library Name *</label>
                <input type="text" value={libraryFormData.name} onChange={e => setLibraryFormData({...libraryFormData, name:e.target.value})} placeholder="e.g., Sci-Fi Favorites" className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#08DB89] transition-colors" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Description (Optional)</label>
                <textarea value={libraryFormData.description} onChange={e => setLibraryFormData({...libraryFormData, description:e.target.value})} placeholder="What's this library about?" rows={3} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#08DB89] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Privacy</label>
                <div className="flex gap-3">
                  {['private','public'].map(p => (
                    <button key={p} type="button" onClick={() => setLibraryFormData({...libraryFormData, privacy:p})}
                      className={`flex-1 px-4 py-3 rounded-lg border transition-all ${libraryFormData.privacy === p ? 'bg-[#08DB89]/20 border-[#08DB89] text-[#08DB89]' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'}`}>
                      <div className="text-sm font-bold capitalize">{p}</div>
                      <div className="text-xs opacity-70">{p === 'private' ? 'Only you' : 'Shareable'}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowLibraryModal(false); setLibraryFormData({name:'',description:'',privacy:'private'}); }} className="flex-1 btn-ghost px-6 py-3 font-bold">Cancel</button>
                <button type="submit" className="flex-1 btn-primary px-6 py-3">Create Library</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {notification && (
        <div className="fixed bottom-8 right-8 z-[110] toast-enter">
          <div className={`glass px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${notification.type === 'success' ? 'border-[#08DB89] text-[#08DB89]' : notification.type === 'error' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400'}`}>
            {notification.type === 'success' && <Check size={20} />}
            {notification.type === 'error' && <X size={20} />}
            <span className="font-bold text-sm">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
