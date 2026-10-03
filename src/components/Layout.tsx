import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  const cls = ({ isActive }: { isActive: boolean }) => `link ${isActive ? 'active' : ''}`;
  return (
    <div className="app">
      <nav className="nav">
        <NavLink to="/" className="brand">
          <span>♪</span> Ear Trainer
        </NavLink>
        <NavLink to="/" end className={cls}>
          Home
        </NavLink>
        <NavLink to="/daily" className={cls}>
          Daily session
        </NavLink>
        <NavLink to="/stats" className={cls}>
          Progress
        </NavLink>
        <NavLink to="/reference" className={cls}>
          Reference
        </NavLink>
        <NavLink to="/guide" className={cls}>
          Guide
        </NavLink>
        <NavLink to="/settings" className={cls}>
          Settings
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
