import axios from 'axios';

const API_KEY = 'SUA_CHAVE';// Substitua pela sua chaveconst BASE_URL = 'https://www.omdbapi.com/';

export const searchMovies = async (query) => {
  const response = await axios.get(
    `${BASE_URL}?apikey=${API_KEY}&s=${query}`);
  return response.data.Search || [];
};

export const getMovieDetails = async (id) => {
  const response = await axios.get(
    `${BASE_URL}?apikey=${API_KEY}&i=${id}`);
  return response.data;
};