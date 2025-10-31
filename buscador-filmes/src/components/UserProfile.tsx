import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';

interface UserData {
  name: string;
  email: string;
}

export default function UserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [watchLaterCount, setWatchLaterCount] = useState(0);
  const navigate = useNavigate();
  const { favorites } = useFavorites();

  useEffect(() => {
    // Definir dados do usuário padrão se não existir
    const defaultUser = {
      name: 'Joana',
      email: 'joana123@blabla54'
    };
    
    // Salvar no localStorage se não existir
    if (!localStorage.getItem('user_data')) {
      localStorage.setItem('user_data', JSON.stringify(defaultUser));
    }

    // Carregar dados do usuário (seja o padrão ou um personalizado)
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      setUserData(JSON.parse(savedUser));
    }

    // Carregar contagem da lista de assistir mais tarde
    const watchLater = JSON.parse(localStorage.getItem('watch_later_v1') || '[]');
    setWatchLaterCount(watchLater.length);

    // Atualizar contagem quando a lista mudar.
    // O evento 'storage' só é disparado em outras abas; para atualizar na MESMA aba
    // também escutamos um evento customizado 'watchlater:update' que é disparado
    // por quem altera a lista localmente (vide MovieDetails.saveWatchLater).
    const updateCountFromStorage = () => {
      const list = JSON.parse(localStorage.getItem('watch_later_v1') || '[]');
      setWatchLaterCount(Array.isArray(list) ? list.length : 0);
    };

    const handleStorageChange = () => updateCountFromStorage();
    const handleCustomEvent = (ev?: Event) => {
      try {
        // se o evento trouxe um detail.count, usamos diretamente
        const anyEv = ev as CustomEvent | undefined;
        const cnt = anyEv?.detail?.count;
        if (typeof cnt === 'number') {
          setWatchLaterCount(cnt);
          return;
        }
      } catch (err) {
        void err;
      }
      updateCountFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('watchlater:update', handleCustomEvent);

    // BroadcastChannel listener for cross-window/tab notifications (fallback)
    let ch: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        ch = new BroadcastChannel('watch_later_channel');
        ch.addEventListener('message', (ev) => {
          try {
            if (ev?.data?.type === 'update') {
              if (typeof ev.data.count === 'number') {
                setWatchLaterCount(ev.data.count);
              } else {
                updateCountFromStorage();
              }
            }
          } catch (err) {
            void err;
          }
        });
      }
    } catch (err) {
      void err;
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('watchlater:update', handleCustomEvent);
      try {
        if (ch) {
          ch.close();
        }
      } catch (err) {
        void err;
      }
    };
  }, []);

  const handleLogin = () => {
    const name = prompt('Digite seu nome:');
    if (!name) return;
    
    const email = prompt('Digite seu email:');
    if (!email) return;

    const userData = { name, email };
    localStorage.setItem('user_data', JSON.stringify(userData));
    setUserData(userData);
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair?')) {
      localStorage.removeItem('user_data');
      setUserData(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="user-profile">
      {userData ? (
        <>
          <button 
            className="user-button"
            onClick={() => setIsOpen(!isOpen)}
            title={userData.name}
          >
            <div className="user-avatar">
              {userData.name.charAt(0).toUpperCase()}
            </div>
          </button>

          {isOpen && (
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar large">
                  {userData.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{userData.name}</h3>
                  <p className="user-email">{userData.email}</p>
                </div>
              </div>

              <div className="user-stats">
                <div className="stat">
                  <span className="stat-label">Lista Assistir mais tarde:</span>
                  <span className="stat-value">{watchLaterCount} filmes</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Favoritos:</span>
                  <span className="stat-value">{favorites.length} filmes</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/watch-later');
                }}
                className="btn primary full-width"
                style={{ marginBottom: '8px' }}
              >
                Ver minha lista completa
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/favorites');
                }}
                className="btn primary full-width"
                style={{ marginBottom: '8px' }}
              >
                Ver meus favoritos
              </button>

              <button 
                onClick={handleLogout} 
                className="btn secondary full-width"
              >
                Sair
              </button>
            </div>
          )}
        </>
      ) : (
        <button onClick={handleLogin} className="btn">
          Entrar
        </button>
      )}
    </div>
  );
}