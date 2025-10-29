import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../services/api';

export default function Home() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    const results = await searchMovies(query);
    setMovies(results);
  };

  return (
    <div>
      <h1>Buscador de Filmes</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome do filme..."/>
        <button type="submit">Buscar</button>
      </form>

      <div>
        {movies.map((movie) => (
          <div key={movie.imdbID} onClick={() => navigate(`/movie/${movie.imdbID}`)}>
            <h3>{movie.Title}</h3>
            <img src={movie.Poster} alt={movie.Title} width="100" />
          </div>))}
      </div>
    </div>);
}