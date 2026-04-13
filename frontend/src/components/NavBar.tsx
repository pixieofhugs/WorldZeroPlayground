import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { loginWithGoogle, logout } from '../api/auth'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/submissions', label: 'Praxis' },
  { to: '/leaderboard', label: 'Players' },
  { to: '/factions', label: 'Factions' },
  { to: '/updates', label: 'Updates' },
]

export default function NavBar() {
  const { user, refetch } = useAuth()

  const handleLogout = async () => {
    await logout()
    await refetch()
  }

  return (
    <nav className="bg-card border-b-2 border-border shadow-[0_3px_0_#3d3734] sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <NavLink to="/" className="font-display text-2xl font-bold shrink-0 leading-none">
          World Zero
        </NavLink>

        <ul className="flex gap-5 flex-1 list-none">
          {links.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `font-body text-sm pb-0.5 border-b-2 transition-colors ${
                    isActive ? 'border-ink' : 'border-transparent hover:border-ink'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
          {user?.is_admin && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `font-body text-sm pb-0.5 border-b-2 transition-colors ${
                    isActive ? 'border-ink' : 'border-transparent hover:border-ink'
                  }`
                }
              >
                Admin
              </NavLink>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              {user.character ? (
                <NavLink
                  to={`/characters/${user.character.id}/edit`}
                  className="font-body text-sm text-muted hover:text-ink transition-colors"
                >
                  {user.character.display_name}
                </NavLink>
              ) : (
                <NavLink
                  to="/characters/create"
                  className="font-body text-sm text-muted hover:text-ink transition-colors"
                >
                  create character →
                </NavLink>
              )}
              <button onClick={handleLogout} className="btn-outline text-xs py-1 px-3">
                logout
              </button>
            </>
          ) : (
            <button onClick={loginWithGoogle} className="btn-primary">
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
