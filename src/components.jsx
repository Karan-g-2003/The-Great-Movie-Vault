import React from 'react';

const CIRCUMFERENCE = 2 * Math.PI * 18;

export function RatingRing({ rating = 0, size = 48 }) {
  const pct = Math.min(rating / 10, 1);
  const offset = CIRCUMFERENCE * (1 - pct);
  const color = rating >= 7.5 ? '#08DB89' : rating >= 5.5 ? '#eab308' : '#ef4444';
  return (
    <div className="rating-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" className="rating-ring-circle-bg" />
        <circle cx="20" cy="20" r="18" className="rating-ring-circle"
          style={{ stroke: color, strokeDasharray: CIRCUMFERENCE, strokeDashoffset: offset }} />
      </svg>
      <div className="rating-ring-text" style={{ color }}>{rating?.toFixed(1)}</div>
    </div>
  );
}

export function SkeletonGrid({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stagger-enter" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="skeleton aspect-[2/3] rounded-xl mb-3" />
          <div className="skeleton h-4 w-3/4 mb-2" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function MovieCard({ movie, onClick, onRemove, index = 0, imageBase }) {
  return (
    <div className="movie-card cursor-pointer stagger-enter relative"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={() => onClick?.(movie, index)}>
      <div className="movie-card-inner aspect-[2/3] mb-3 border border-white/5 hover:border-[#08DB89]/50">
        {movie.poster_path ? (
          <img src={`${imageBase}${movie.poster_path}`} alt="" className="w-full h-full object-cover card-img-zoom" />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">No Poster</div>
        )}
        {onRemove && (
          <button onClick={e => { e.stopPropagation(); onRemove(movie.id); }}
            className="absolute top-2 right-2 p-2 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 z-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>
      <h4 className="text-sm font-semibold text-gray-300 group-hover:text-[#08DB89] truncate">{movie.title}</h4>
      <p className="text-xs text-gray-600">{movie.release_date?.split('-')[0]}</p>
    </div>
  );
}
