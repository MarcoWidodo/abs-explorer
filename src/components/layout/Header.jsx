import { Sun, Moon, Mail } from 'lucide-react'
import { useTheme } from '../../context/ThemeProvider'

export default function Header() {
  const { isDark, toggle } = useTheme()

  return (
    <header className="app-header">
      <h1>Asian Barometer Survey Explorer</h1>
      <div className="header-actions">
        <a
          href="mailto:widodomarco@gmail.com?subject=ABS%20Explorer%20—%20Issue%20Report"
          className="theme-btn"
          aria-label="Report an issue"
          title="Report an issue"
        >
          <Mail size={17} />
        </a>
        <button onClick={toggle} className="theme-btn" aria-label={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  )
}
