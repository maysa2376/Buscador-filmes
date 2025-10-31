import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import moviePlaceholder from '../assets/movie-placeholder.svg';
import { useFavorites } from '../contexts/FavoritesContext';

export default function WatchLaterPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const navigate = useNavigate();
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  useEffect(() => {
    const watchLaterList = JSON.parse(localStorage.getItem('watch_later_v1') || '[]') as Movie[];
    // Ordenar por título
    const sorted = [...watchLaterList].sort((a, b) => a.Title.localeCompare(b.Title));
    setMovies(sorted);
  }, []);

  const handleRemove = (movie: Movie) => {
    if (window.confirm(`Remover "${movie.Title}" da sua lista?`)) {
      const filtered = movies.filter(m => m.imdbID !== movie.imdbID);
      localStorage.setItem('watch_later_v1', JSON.stringify(filtered));
      // Notificar a aba atual sobre a atualização (o evento 'storage' não dispara na mesma aba)
      try {
        const evt = new CustomEvent('watchlater:update', { detail: { count: filtered.length } });
        window.dispatchEvent(evt);
      } catch (err) {
        void err;
      }
      // Fallback: BroadcastChannel
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('watch_later_channel');
          ch.postMessage({ type: 'update', count: filtered.length });
          ch.close();
        }
      } catch (err) {
        void err;
      }
      setMovies(filtered);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="btn secondary"
          style={{ padding: '8px 16px' }}
        >
          ← Voltar
        </button>
        <h1 style={{ margin: 0 }}>Minha Lista</h1>
        <span style={{ color: 'var(--muted)' }}>
          {movies.length} {movies.length === 1 ? 'filme' : 'filmes'}
        </span>
      </div>

      {movies.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '64px 16px',
          color: 'var(--muted)',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>
            Sua lista está vazia
          </p>
          <small>
            Adicione filmes clicando no ícone + nos detalhes do filme
          </small>
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => {
            const isFav = favorites.some(f => f.imdbID === movie.imdbID);
            return (
              <div key={movie.imdbID} className="movie-card">
                <img 
                  src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : moviePlaceholder} 
                  alt={movie.Title}
                  onClick={() => navigate(`/movie/${movie.imdbID}`)}
                  style={{ cursor: 'pointer' }}
                />
                <button
                  className={`fav-btn ${isFav ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFav) removeFavorite(movie.imdbID);
                    else addFavorite(movie);
                  }}
                  aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  {isFav ? '♥' : '♡'}
                </button>
                <h3>{movie.Title}</h3>
                <div className="movie-card-footer">
                  <button 
                    onClick={() => navigate(`/movie/${movie.imdbID}`)} 
                    className="btn"
                  >
                    Ver detalhes
                  </button>
                  <button 
                    onClick={() => handleRemove(movie)} 
                    className="btn secondary"
                    style={{ marginLeft: '8px' }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}