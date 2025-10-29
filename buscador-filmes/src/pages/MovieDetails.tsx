import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMovieDetails } from '../services/api';

export default function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      const data = await getMovieDetails(id);
      setMovie(data);
    };
    fetchMovie();
  }, [id]);

  if (!movie) return <div>Carregando...</div>;

  return (
    <div>
      <h1>{movie.Title}</h1>
      <img src={movie.Poster} alt={movie.Title} />
      <p><strong>Ano:</strong> {movie.Year}</p>
      <p><strong>Diretor:</strong> {movie.Director}</p>
      <p><strong>Enredo:</strong> {movie.Plot}</p>
    </div>);
}