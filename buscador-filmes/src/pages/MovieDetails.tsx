import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetails } from '../services/api';
import { type Movie } from '../types';

const PLACEHOLDER_SVG = `data:image/svg+xml;utf8,` +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'>` +
      `<rect width='100%' height='100%' fill='%23ddd'/>` +
      `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='20'>Sem imagem</text>` +
    `</svg>`
  );

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchLater, setInWatchLater] = useState<boolean>(false);

  const WATCH_LATER_KEY = 'watch_later_v1';
  const USER_BIRTH_KEY = 'user_birth_year';
  const MIN_AGE = 16; // idade mínima para adicionar à lista

  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) {
        setError('ID do filme inválido.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getMovieDetails(id.toString());
        // API returns an object; if Title is missing it's not a valid movie
        if (!data || !data.Title) {
          setMovie(null);
          setError('Filme não encontrado.');
        } else {
          setMovie(data as Movie);
        }
      } catch (err) {
        const message = (err as Error)?.message ?? 'Erro ao buscar detalhes.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  useEffect(() => {
    if (movie && movie.imdbID) {
      const list = JSON.parse(localStorage.getItem(WATCH_LATER_KEY) || '[]') as Movie[];
      setInWatchLater(list.some((m) => m.imdbID === movie.imdbID));
    }
  }, [movie]);

  const saveWatchLater = (list: Movie[]) => {
    localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(list));
    // Disparar um evento customizado para notificar a aba atual que a lista mudou
    // (o evento 'storage' só dispara em outras abas/janelas)
    try {
      // enviar detalhe com a nova contagem para atualizações imediatas
      const evt = new CustomEvent('watchlater:update', { detail: { count: list.length } });
      window.dispatchEvent(evt);
    } catch {
      // se algo falhar, não impedimos o fluxo principal
      void 0;
    }
    // Fallback: BroadcastChannel (quando disponível) para melhor compatibilidade
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('watch_later_channel');
        ch.postMessage({ type: 'update', count: list.length });
        ch.close();
      }
    } catch (err) {
      void err;
    }
  };

  // Extrai informação de classificação: código curto, rótulo longo e classe CSS
  const getRatingInfo = (rated?: string) => {
    // Valor padrão: Livre
    const defaultRating = { short: 'L', full: 'Livre', cls: 'rating-l' };
    if (!rated || rated === 'N/A') return defaultRating;

    const r = rated.toLowerCase();

    // Priorizar números explícitos
    if (r.includes('18')) {
      return { short: '18', full: '18 anos', cls: 'rating-18' };
    }
    if (r.includes('16')) {
      return { short: '16', full: '16 anos', cls: 'rating-16' };
    }
    if (r.includes('14')) {
      return { short: '14', full: '14 anos', cls: 'rating-14' };
    }
    if (r.includes('12')) {
      return { short: '12', full: '12 anos', cls: 'rating-12' };
    }
    if (r.includes('10')) {
      return { short: '10', full: '10 anos', cls: 'rating-10' };
    }

    // Mapear versões comuns (PG, G, L, Livre)
    if (r === 'l' || r.includes('livre') || r === 'g') {
      return { short: 'L', full: 'Livre', cls: 'rating-l' };
    }
    if (r.includes('pg')) {
      // PG pode corresponder a orientação parental; escolher 10 ou PG visual
      return { short: '10', full: '10 anos (PG)', cls: 'rating-10' };
    }

    // Fallbacks para rótulos com número no formato PG-13, etc.
    const numMatch = rated.match(/(\d{2})/);
    if (numMatch) {
      const num = numMatch[1];
      const cls = `rating-${num}`;
      return { short: num, full: `${num} anos`, cls };
    }
    
    // Se não conseguiu mapear, assume Livre
    return defaultRating;
  };

  const handleToggleWatchLater = () => {
    if (!movie) return;

    const list = JSON.parse(localStorage.getItem(WATCH_LATER_KEY) || '[]') as Movie[];

    if (inWatchLater) {
      const filtered = list.filter((m) => m.imdbID !== movie.imdbID);
      saveWatchLater(filtered);
      setInWatchLater(false);
      return;
    }

    // checar idade mínima
    const savedBirth = localStorage.getItem(USER_BIRTH_KEY);
    let birthYear = savedBirth ? parseInt(savedBirth, 10) : NaN;

    if (!birthYear || Number.isNaN(birthYear)) {
      const answer = window.prompt(`Para adicionar à lista, confirme seu ano de nascimento (mínimo ${MIN_AGE} anos):`);
      if (!answer) return;
      birthYear = parseInt(answer, 10);
      if (Number.isNaN(birthYear)) {
        window.alert('Ano inválido. Operação cancelada.');
        return;
      }
      localStorage.setItem(USER_BIRTH_KEY, String(birthYear));
    }

    const age = new Date().getFullYear() - birthYear;
    if (age < MIN_AGE) {
      window.alert(`Você tem ${age} anos — idade mínima para adicionar é ${MIN_AGE}.`);
      return;
    }

    // Adiciona o filme e ordena alfabeticamente
    list.push(movie);
    const sortedList = list.sort((a, b) => a.Title.localeCompare(b.Title));
    saveWatchLater(sortedList);
    setInWatchLater(true);
  };

  if (loading) return <div>Carregando...</div>;

  const rating = movie ? getRatingInfo(movie.Rated) : null;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Voltar</button>

      {error ? (
        <div style={{ color: 'crimson' }}>{error}</div>
      ) : movie ? (
        <div className="detail-container">
          {/* Badge de classificação no canto superior direito */}
          {/* Badge de classificação sempre visível */}
          <div className={`rating-badge ${rating?.cls ?? 'rating-l'}`}>
            {rating?.short ?? 'L'}
          </div>

          <div className="detail-poster">
            <img
              src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : PLACEHOLDER_SVG}
              alt={movie.Title}
              style={{ width: '100%', borderRadius: 6 }}
            />
          </div>

          <div className="detail-info">
            <h1>{movie.Title}</h1>
            <p><strong>Ano:</strong> {movie.Year}</p>
            <p><strong>Diretor:</strong> {movie.Director ?? '—'}</p>
            <p>
              <strong>Classificação:</strong>{' '}
              {rating ? `${rating.full} (${rating.short})` : (movie.Rated ?? '—')}
            </p>
            <p><strong>Enredo:</strong> {movie.Plot ?? '—'}</p>

            <div className="actions" style={{ marginTop: 12 }}>
              <button onClick={handleToggleWatchLater} className="btn">
                {inWatchLater ? 'Remover de Assistir mais tarde' : 'Adicionar a Assistir mais tarde'}
              </button>
              <button onClick={() => navigate(-1)} className="btn secondary" style={{ marginLeft: 8 }}>Voltar</button>
            </div>
          </div>
        </div>
      ) : (
        <div>Filme não encontrado...</div>
      )}
    </div>
  );
}