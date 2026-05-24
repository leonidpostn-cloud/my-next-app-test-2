import { NavLink, Route, Routes } from 'react-router-dom'
import { useAppState } from './state/AppState'
import MapPage from './pages/MapPage'
import RewardsPage from './pages/RewardsPage'
import DiscoverPage from './pages/DiscoverPage'
import NotesPage from './pages/NotesPage'
import ProfilePage from './pages/ProfilePage'

const navItems = [
  { to: '/', label: 'Карта' },
  { to: '/rewards', label: 'Призы' },
  { to: '/discover', label: 'Открывайка' },
  { to: '/notes', label: 'Заметки' },
  { to: '/profile', label: 'Профиль' }
]

export default function App() {
  const { state, appStats } = useAppState()

  return (
    <div className="app-shell">
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/rewards" element={<div>
            <header className="topbar">
              <div>
                <div className="eyebrow">Test Mode MVP</div>
                <h1>Открывайка</h1>
                <p className="topbar-copy">
                  Городской companion для посещений, наград и новых мест в {state.profile.city}.
                </p>
              </div>
            </header>
            <RewardsPage />
          </div>} />
          <Route path="/discover" element={<div>
            <header className="topbar">
              <div>
                <div className="eyebrow">Test Mode MVP</div>
                <h1>Открывайка</h1>
                <p className="topbar-copy">
                  Городской companion для посещений, наград и новых мест в {state.profile.city}.
                </p>
              </div>
            </header>
            <DiscoverPage />
          </div>} />
          <Route path="/notes" element={<div>
            <header className="topbar">
              <div>
                <div className="eyebrow">Test Mode MVP</div>
                <h1>Открывайка</h1>
                <p className="topbar-copy">
                  Городской companion для посещений, наград и новых мест в {state.profile.city}.
                </p>
              </div>
            </header>
            <NotesPage />
          </div>} />
          <Route path="/profile" element={<div>
            <header className="topbar">
              <div>
                <div className="eyebrow">Test Mode MVP</div>
                <h1>Открывайка</h1>
                <p className="topbar-copy">
                  Городской companion для посещений, наград и новых мест в {state.profile.city}.
                </p>
              </div>
            </header>
            <ProfilePage />
          </div>} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'bottom-nav-link active' : 'bottom-nav-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
