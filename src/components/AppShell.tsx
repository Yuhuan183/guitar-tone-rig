import { Cable, Gauge, Library, RadioTower, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Kicker } from './primitives'

interface NavigationItem {
  to: string
  label: string
  shortLabel: string
  icon: LucideIcon
}

const primaryNavigation: NavigationItem[] = [
  { to: '/', label: '總覽', shortLabel: '總覽', icon: RadioTower },
  { to: '/presets', label: '音色工作台', shortLabel: '工作台', icon: SlidersHorizontal },
  { to: '/signal-chain', label: '訊號鏈與 Gate', shortLabel: '訊號鏈', icon: Cable },
  { to: '/library', label: '效果器知識庫', shortLabel: '知識庫', icon: Library },
]

function BrandLockup() {
  return (
    <NavLink to="/" className="brand-lockup">
      <span className="brand-mark">
        <Gauge aria-hidden="true" size={19} />
      </span>
      <span>
        <span className="brand-kicker">YUHUAN RIG</span>
        <span className="brand-title">Control Console</span>
      </span>
    </NavLink>
  )
}

export function AppShell() {
  const bottomNavStyle = { '--bottom-nav-count': primaryNavigation.length } as CSSProperties

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a className="skip-link" href="#main-content">
        跳到主要內容
      </a>

      <aside className="sidebar hidden lg:flex" aria-label="桌面導覽">
        <BrandLockup />
        <Kicker tone="muted" size="sm" className="mt-9 px-3">
          Workspace
        </Kicker>
        <nav className="mt-3 grid gap-1" aria-label="主要導覽">
          {primaryNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'nav-link ' + (isActive ? 'nav-link-active' : '')}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-5">
          <div className="status-pill">
            <span className="status-dot" /> Draft rig
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">本機調整會自動保存；實機驗證後再回寫 JSON。</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="mobile-header lg:hidden">
          <BrandLockup />
          <span className="status-pill">
            <span className="status-dot" /> Draft
          </span>
        </header>
        <main id="main-content" tabIndex={-1} className="workspace-shell">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav lg:hidden" style={bottomNavStyle} aria-label="手機主要導覽">
        {primaryNavigation.map(({ to, shortLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => 'bottom-nav-link ' + (isActive ? 'bottom-nav-link-active' : '')}
          >
            <Icon aria-hidden="true" size={19} />
            <span>{shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
