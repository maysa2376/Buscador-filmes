import axios from 'axios';
import type { Movie } from '../types';

const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = import.meta.env.VITE_BASE_API;

interface SearchOptions {
  query: string;
  genre?: string;
  maxResults?: number;
}

interface OmdbSearchResponse {
  Search?: Movie[];
  Response: 'True' | 'False';
  Error?: string;
  totalResults?: string;
}

interface OmdbDetailResponse extends Movie {
  Response: 'True' | 'False';
  Error?: string;
}

export const searchMovies = async ({ query, genre, maxResults = 5 }: SearchOptions): Promise<Movie[]> => {
  if (!API_KEY || !BASE_URL) {
    throw new Error('Variáveis de ambiente da API não estão configuradas.');
  }
  
  try {
    const url = new URL(BASE_URL);
    url.searchParams.append('apikey', API_KEY);
    url.searchParams.append('type', 'movie');
    
    // Se query for '*', vamos buscar filmes usando termos populares (útil para carregar "todos")
    if (query === '*') {
      // Uma lista de termos populares para buscar filmes
      const popularTerms = ['movie', 'the', 'a', 'e', 'love', 'man', 'world', 'life', 'time'];
      const searchPromises = popularTerms.map(term => {
        const searchUrl = new URL(BASE_URL);
        searchUrl.searchParams.append('apikey', API_KEY);
        searchUrl.searchParams.append('s', term);
        searchUrl.searchParams.append('type', 'movie');
        return axios.get<OmdbSearchResponse>(searchUrl.toString());
      });

      const responses = await Promise.all(searchPromises);
      const allMovies: Movie[] = [];
      
      for (const response of responses) {
        if (response.data.Response === 'True' && response.data.Search) {
          allMovies.push(...response.data.Search);
        }
      }

      // Remove duplicatas pelo imdbID
      const uniqueMovies = Array.from(
        new Map(allMovies.map(movie => [movie.imdbID, movie])).values()
      );

      // Busca detalhes e (se genre definido) filtra por gênero
      const detailedMovies = await Promise.all(
        uniqueMovies.map(async (movie): Promise<Movie | null> => {
          try {
            const details = await getMovieDetails(movie.imdbID);
            if (genre) {
              if (details.Genre?.toLowerCase().includes(genre.toLowerCase())) {
                return { ...movie, ...details };
              }
              return null;
            }
            return { ...movie, ...details };
          } catch {
            return null;
          }
        })
      );

      return detailedMovies
        .filter((movie): movie is Movie => movie !== null)
        .sort((a, b) => a.Title.localeCompare(b.Title))
        .slice(0, maxResults);
    }

    // Busca normal por query
    if (!query.trim()) {
      return [];
    }
    
    url.searchParams.append('s', query);
    // Primeiro busca os filmes pelo título (página 1)
    const response = await axios.get<OmdbSearchResponse>(url.toString());

    if (response.data.Response === 'False' || !response.data.Search) {
      console.info('Nenhum filme encontrado:', response.data.Error);
      return [];
    }

    let movies = response.data.Search || [];

    // Paginação: se quisermos mais resultados que os 10 padrão da OMDb, buscar páginas adicionais
    const totalAvailable = Number(response.data.totalResults || String(movies.length));
    const desired = Math.min(maxResults || 10, 500); // cap seguro em 500 resultados
    if (desired > movies.length && totalAvailable > movies.length) {
      const perPage = 10;
      const maxPages = Math.min(Math.ceil(desired / perPage), Math.ceil(totalAvailable / perPage));
      const pagesToFetch = [];
      for (let p = 2; p <= maxPages; p++) pagesToFetch.push(p);

      const pagePromises = pagesToFetch.map(p => {
        const pageUrl = new URL(BASE_URL);
        pageUrl.searchParams.append('apikey', API_KEY);
        pageUrl.searchParams.append('s', query);
        pageUrl.searchParams.append('type', 'movie');
        pageUrl.searchParams.append('page', String(p));
        return axios.get<OmdbSearchResponse>(pageUrl.toString()).catch(() => null);
      });

      const pageResponses = await Promise.all(pagePromises);
      for (const pr of pageResponses) {
        if (pr && pr.data && pr.data.Response === 'True' && pr.data.Search) {
          movies.push(...pr.data.Search);
        }
      }
    }

    // Se um gênero foi especificado, busca detalhes de cada filme para filtrar
    if (genre && movies.length > 0) {
      const detailedMovies = await Promise.all(
        movies.map(async (movie): Promise<Movie | null> => {
          try {
            const details = await getMovieDetails(movie.imdbID);
            // Só retorna o filme se ele pertencer ao gênero buscado
            if (details.Genre?.toLowerCase().includes(genre.toLowerCase())) {
              return { ...movie, ...details };
            }
            return null;
          } catch (err) {
            console.warn(`Erro ao buscar detalhes do filme ${movie.Title}:`, err);
            return null;
          }
        })
      );

      // Remove os filmes null (que não são do gênero) e ordena alfabeticamente
      movies = detailedMovies
        .filter((movie): movie is Movie => movie !== null)
        .sort((a, b) => a.Title.localeCompare(b.Title));
    } else {
      // Se não tem filtro de gênero, apenas ordena
      movies = movies.sort((a, b) => a.Title.localeCompare(b.Title));
    }

    return movies.slice(0, maxResults);
  } catch (err) {
    console.error('Erro ao buscar filmes:', err);
    throw new Error('Não foi possível buscar os filmes. Tente novamente mais tarde.');
  }
};

export const getMovieDetails = async (id: string): Promise<Movie> => {
  if (!API_KEY || !BASE_URL) {
    throw new Error('Variáveis de ambiente da API não estão configuradas.');
  }

  try {
    const response = await axios.get<OmdbDetailResponse>(
      `${BASE_URL}?apikey=${API_KEY}&i=${id}`
    );

    if (response.data.Response === 'False') {
      throw new Error(response.data.Error || 'Filme não encontrado');
    }

    return response.data;
  } catch (err) {
    console.error('Erro ao buscar detalhes do filme:', err);
    throw new Error('Não foi possível carregar os detalhes do filme. Tente novamente mais tarde.');
  }
};