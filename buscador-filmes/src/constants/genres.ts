export const GENRES = [
  'Ação',
  'Aventura',
  'Animação',
  'Comédia',
  'Crime',
  'Documentário',
  'Drama',
  'Família',
  'Fantasia',
  'Ficção científica',
  'Guerra',
  'História',
  'Horror',
  'Musical',
  'Mistério',
  'Romance',
  'Suspense',
  'Terror',
] as const;

export type Genre = typeof GENRES[number];

// Mapeamento para termos em inglês (OMDB API usa inglês)
export const GENRE_MAP: Record<Genre, string> = {
  'Ação': 'Action',
  'Aventura': 'Adventure',
  'Animação': 'Animation',
  'Comédia': 'Comedy',
  'Crime': 'Crime',
  'Documentário': 'Documentary',
  'Drama': 'Drama',
  'Família': 'Family',
  'Fantasia': 'Fantasy',
  'Ficção científica': 'Sci-Fi',
  'Guerra': 'War',
  'História': 'History',
  'Horror': 'Horror',
  'Musical': 'Musical',
  'Mistério': 'Mystery',
  'Romance': 'Romance',
  'Suspense': 'Thriller',
  'Terror': 'Horror'
};