import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import WatchLater from './pages/WatchLater';
import Favorites from './pages/Favorites';
import UserProfile from './components/UserProfile';
import './App.css';
import './styles/UserProfile.css';
import { FavoritesProvider } from './contexts/FavoritesContext';

export default function App() {
  return (
    <FavoritesProvider>
      <Router>
        <div className="app-wrapper">
          <UserProfile />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/watch-later" element={<WatchLater />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="*" element={<div>Página não encontrada</div>} />
          </Routes>
        </div>
      </Router>
    </FavoritesProvider>
  );
}