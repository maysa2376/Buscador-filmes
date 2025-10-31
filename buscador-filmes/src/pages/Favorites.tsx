import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';
import moviePlaceholder from '../assets/movie-placeholder.svg';

export default function Favorites() {
  const { favorites, removeFavorite, addFavorite } = useFavorites();
  const navigate = useNavigate();

  useEffect(() => {
    // opcional: título da página
    document.title = `Minha lista de favoritos (${favorites.length})`;
  }, [favorites.length]);

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} className="btn secondary" style={{ padding: '8px 16px' }}>← Voltar</button>
        <h1 style={{ margin: 0 }}>Meus Favoritos</h1>
        <span style={{ color: 'var(--muted)' }}>{favorites.length} {favorites.length === 1 ? 'filme' : 'filmes'}</span>
      </div>

      {favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--muted)' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>Você ainda não tem favoritos</p>
          <small>Adicione filmes clicando no coração nos cards ou na página de detalhes</small>
        </div>
      ) : (
        <div className="movies-grid">
          {favorites.map((movie) => {
            // aqui todos são favoritos por definição, mas mantemos toggle
            const isFav = true;
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
                  <button onClick={() => navigate(`/movie/${movie.imdbID}`)} className="btn">Ver detalhes</button>
                  <button onClick={() => removeFavorite(movie.imdbID)} className="btn secondary" style={{ marginLeft: 8 }}>Remover</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
