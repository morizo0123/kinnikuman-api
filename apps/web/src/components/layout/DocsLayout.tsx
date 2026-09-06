import { NavLink, Outlet } from 'react-router-dom';

export function DocsLayout() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <nav className="sticky top-20 space-y-6">
            <SidebarSection title="Choujin">
              <SidebarLink to="/docs/choujin">超人 API</SidebarLink>
            </SidebarSection>
            <SidebarSection title="Faction">
              <SidebarLink to="/docs/faction">軍団 API</SidebarLink>
            </SidebarSection>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function SidebarLink({
  to,
  children
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `block px-3 py-1.5 rounded-md text-sm transition-colors ${
            isActive
              ? 'bg-accent text-accent-foreground font-medium'
              : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
          }`
        }
      >
        {children}
      </NavLink>
    </li>
  );
}
