import { Link, NavLink } from 'react-router-dom';

export function Header() {
  return (
    <header className="border-b sticky top-0 bg-background z-10">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-6">
        <Link to="/" className="font-bold text-lg hover:opacity-80">
          🦸 KinnikumanAPI
        </Link>
      </nav>

      <div className="flex gap-4 ml-auto">
        <NavItem to="/">Home</NavItem>
        <NavItem to="/docs">Docs</NavItem>
        <NavItem to="/about">About</NavItem>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
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
