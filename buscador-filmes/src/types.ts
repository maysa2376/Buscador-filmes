export interface Movie {
  Title: string;
  Year: string;
  imdbID: string;
  Poster?: string; // some responses use "N/A"
  Director?: string;
  Plot?: string;
  Rated?: string;
  Genre?: string; // Gêneros separados por vírgula (ex: "Action, Adventure, Sci-Fi")
}