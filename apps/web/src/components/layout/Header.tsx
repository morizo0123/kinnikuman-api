import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="border-b sticky top-0 bg-background z-10">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-6">
        <Link
          to="/"
          className="font-bold text-lg text-primary hover:opacity-80"
        >
          🦸 KinnikumanAPI
        </Link>

        <div className="flex items-center gap-1 ml-auto">
          <NavItem to="/">Home</NavItem>
          <NavItem to="/docs">Docs</NavItem>
          <NavItem to="/about">About</NavItem>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'hover:bg-accent/50'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
