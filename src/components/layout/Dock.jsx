import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, TrendingUp, Globe2, GitCompareArrows, Home } from 'lucide-react'

const ITEMS = [
  { path: '/',             label: 'Home',        icon: Home },
  { path: '/explore',      label: 'Single Wave', icon: BarChart3 },
  { path: '/trends',       label: 'Time Series', icon: TrendingUp },
  { path: '/map',          label: 'Map',          icon: Globe2 },
  { path: '/correlations', label: 'Correlations', icon: GitCompareArrows },
]

export default function Dock() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="dock-wrap" role="navigation" aria-label="Main navigation">
      <div className="dock">
        {ITEMS.map(({ path, label, icon: Icon }) => {
          const active = pathname === path || (path !== '/' && pathname.startsWith(path))
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`dock-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.6} />
              <span className="dock-label">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
