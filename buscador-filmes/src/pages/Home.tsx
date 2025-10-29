import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../services/api';
import { type Movie } from '../types';


export default function Home() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const results = await searchMovies(query);
    setMovies(results);
  };

  return (
    <div className="container">
      <h1>Buscador de Filmes</h1>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome do filme..."
        />
        <button type="submit">Buscar</button>
      </form>

      <div className="movies-grid">
        {movies.map((movie) => (
          <div 
            key={movie.imdbID} 
            className="movie-card"
            onClick={() => navigate(`/movie/${movie.imdbID}`)}
          >
            <img src={movie.Poster} alt={movie.Title} />
            <h3>{movie.Title}</h3>
          </div>
        ))}
      </div>
    </div>);
}