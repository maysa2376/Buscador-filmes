import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../services/api';
import { type Movie } from '../types';
import { PLACEHOLDER_IMAGE } from '../utils/images';
import { GENRES, GENRE_MAP, type Genre } from '../constants/genres';
import { useFavorites } from '../contexts/FavoritesContext';


export default function Home() {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<Genre | ''>('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [fullList, setFullList] = useState<Movie[]>([]);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  const LAST_SEARCH_KEY = 'last_search_v1';
  const [selectedLetter, setSelectedLetter] = useState<string>('Todos');
  const ALPHABET = ['Todos', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  useEffect(() => {
    // Carregar lista inicial: todos os filmes (A-Z) usando query='*'
    (async () => {
      setIsLoading(true);
      try {
        const initial = await searchMovies({ query: '*', maxResults: 200 });
        setMovies(initial);
        setFullList(initial);
      } catch (err) {
        console.error('Erro ao carregar lista inicial:', err);
      } finally {
        setIsLoading(false);
      }
    })();

    // Recuperar última busca se estiver voltando do MovieDetails
    const lastSearch = JSON.parse(localStorage.getItem(LAST_SEARCH_KEY) || '{}');
    if (document.referrer.includes('/movie/')) {
      setQuery(lastSearch.query || '');
      setMovies(lastSearch.results || []);
    }

    // Fechar sugestões ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce para buscar enquanto digita
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (q) {
        // Pegar mais resultados e priorizar títulos que comecem com o texto digitado
        const results = await searchMovies({
          query: q,
          genre: selectedGenre ? GENRE_MAP[selectedGenre] : undefined,
          maxResults: 30
        });

        const qLower = q.toLowerCase();

        // Remover duplicatas por imdbID
        const uniqMap = new Map<string, typeof results[number]>();
        results.forEach(r => uniqMap.set(r.imdbID, r));
        const uniq = Array.from(uniqMap.values());

        // Reordenar: primeiros os títulos que começam com a query (ou alguma palavra começa), depois os que incluem, depois os demais
        const ranked = uniq.map(m => {
          const title = (m.Title || '').toLowerCase();
          const starts = title.startsWith(qLower) || title.split(/\s+/).some(w => w.startsWith(qLower));
          const includes = title.includes(qLower);
          let rank = 2;
          if (starts) rank = 0;
          else if (includes) rank = 1;
          return { movie: m, rank };
        })
        .sort((a, b) => a.rank - b.rank || a.movie.Title.localeCompare(b.movie.Title))
        .slice(0, 5)
        .map(r => r.movie);

        setSuggestions(ranked);
        setShowSuggestions(ranked.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // espera 300ms após parar de digitar

    return () => clearTimeout(timer);
  }, [query, selectedGenre]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setIsLoading(true);
    try {
      const results = await searchMovies({
        query,
        genre: selectedGenre ? GENRE_MAP[selectedGenre] : undefined,
        maxResults: 100 // mais resultados na busca completa
      });
      setMovies(results);
      
      // Salvar busca atual no localStorage
      localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify({
        query,
        results,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erro na busca:', error);
      alert('Erro ao buscar filmes. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterByLetter = async (letter: string) => {
    setSelectedLetter(letter);
    // Filtrar localmente usando fullList para garantir startsWith
    if (letter === 'Todos') {
      setMovies(fullList);
      return;
    }

    const filtered = fullList.filter(m => (m.Title || '').toUpperCase().startsWith(letter));
    if (filtered.length > 0) {
      setMovies(filtered);
      return;
    }

    // Se não houver no cache local, buscar exaustivamente por prefixos (letter, letterA..Z, letter0..9)
    const cacheKey = `letter_full_${letter}`;
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null') as Movie[] | null;
    if (cached && cached.length > 0) {
      setMovies(cached);
      setFullList(prev => Array.from(new Map([...prev, ...cached].map(m => [m.imdbID, m])).values()));
      return;
    }

    // construir prefixos: letter + letter[A-Z0-9]
    const suffixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const prefixes = [letter, ...suffixChars.map(c => `${letter}${c}`)];

    // função auxiliar para processar com concorrência limitada
    const batchSize = 6;
    const aggregated = new Map<string, Movie>();
    try {
      setIsLoading(true);
      for (let i = 0; i < prefixes.length; i += batchSize) {
        const batch = prefixes.slice(i, i + batchSize);
        // buscar cada prefixo usando searchMovies (o serviço faz paginação interna até maxResults)
        const promises = batch.map(p => searchMovies({ query: p, maxResults: 200 }).catch(() => []));
        const resultsArr = await Promise.all(promises);
        // agregar e filtrar titles que realmente começam com the letter
        for (const list of resultsArr) {
          for (const m of list) {
            if ((m.Title || '').toUpperCase().startsWith(letter)) {
              aggregated.set(m.imdbID, m);
            }
          }
        }
        // opcional: salvar progresso parcial no localStorage para não perder tudo se interromper
        const interim = Array.from(aggregated.values()).sort((a, b) => a.Title.localeCompare(b.Title));
        localStorage.setItem(`${cacheKey}_partial`, JSON.stringify(interim));
      }

      const finalList = Array.from(aggregated.values()).sort((a, b) => a.Title.localeCompare(b.Title));
      setMovies(finalList);
      setFullList(prev => Array.from(new Map([...prev, ...finalList].map(m => [m.imdbID, m])).values()));
      localStorage.setItem(cacheKey, JSON.stringify(finalList));
      // limpar parcial
      localStorage.removeItem(`${cacheKey}_partial`);
    } catch (err) {
      console.error('Erro ao montar lista exaustiva para letra', letter, err);
      // tentar usar parcial se existir
      const partial = JSON.parse(localStorage.getItem(`${cacheKey}_partial`) || 'null') as Movie[] | null;
      if (partial && partial.length > 0) {
        setMovies(partial);
        setFullList(prev => Array.from(new Map([...prev, ...partial].map(m => [m.imdbID, m])).values()));
      } else {
        alert('Erro ao carregar filmes para a letra. Tente novamente mais tarde.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (movie: Movie) => {
    // Salvar estado atual antes de navegar
    localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify({
      query,
      results: movies,
      timestamp: new Date().toISOString()
    }));
    
    navigate(`/movie/${movie.imdbID}`);
    setShowSuggestions(false);
  };

  return (
    <div className="container">
      <h1>PRIMIKY</h1>
      <div className="alphabet-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
        {ALPHABET.map(letter => (
          <button
            key={letter}
            onClick={() => handleFilterByLetter(letter)}
            className={`btn ${selectedLetter === letter ? '' : 'secondary'}`}
            style={{ padding: '6px 10px', minWidth: 36 }}
          >
            {letter}
          </button>
        ))}
      </div>
      <form ref={formRef} onSubmit={handleSearch} className="search-form">
        <div className="search-controls">
          <div className="search-input-wrapper">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Digite o nome do filme..."
            />
          </div>
          
          <select 
            value={selectedGenre}
            onChange={async (e) => {
              const genre = e.target.value as Genre | '';
              setSelectedGenre(genre);
              setIsLoading(true);
              try {
                // Busca todos os filmes do gênero
                const results = await searchMovies({
                  query: '*', // busca qualquer filme
                  genre: genre ? GENRE_MAP[genre] : undefined,
                  maxResults: 100
                });
                setMovies(results);
              } catch (error) {
                console.error('Erro na busca:', error);
                alert('Erro ao buscar filmes. Por favor, tente novamente.');
              } finally {
                setIsLoading(false);
              }
            }}
            className="genre-select"
          >
            <option value="">Todos os gêneros</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>

          <button type="submit">Buscar</button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((movie) => (
              <div
                key={movie.imdbID}
                className="search-suggestion-item"
                onClick={() => handleSelectSuggestion(movie)}
              >
                <img
                  src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : PLACEHOLDER_IMAGE}
                  alt={movie.Title}
                />
                <div className="info">
                  <div className="title">{movie.Title}</div>
                  <div className="year">{movie.Year}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>
          Buscando filmes...
        </div>
      ) : movies.length > 0 ? (
        <>
          {selectedGenre && (
            <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
              Filmes de {selectedGenre}
            </h2>
          )}
          <div className="movies-grid">
            {movies.map((movie) => {
              const isFav = favorites.some(f => f.imdbID === movie.imdbID);
              return (
                <div 
                  key={movie.imdbID} 
                  className="movie-card"
                  onClick={() => navigate(`/movie/${movie.imdbID}`)}
                >
                  <img src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : PLACEHOLDER_IMAGE} alt={movie.Title} />
                  <button
                    className={`fav-btn ${isFav ? 'favorited' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFav) removeFavorite(movie.imdbID);
                      else addFavorite(movie);
                    }}
                    aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    {isFav ? '♥' : '♡'}
                  </button>
                  <h3>{movie.Title}</h3>
                </div>
              );
            })}
          </div>
        </>
      ) : (selectedGenre || query) && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>
          {selectedGenre 
            ? `Nenhum filme de ${selectedGenre} encontrado para "${query}"`
            : `Nenhum filme encontrado para "${query}"`}
        </div>
      )}
    </div>);
}