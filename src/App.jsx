// Top-level routing + auth context.
// `user` is persisted in localStorage (set by Login.jsx on a successful
// sign-in) so a page refresh keeps the session instead of forcing a re-login.
import React, { createContext, useContext, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SurveyForm from './pages/SurveyForm';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import Admin from './pages/Admin';
import DropdownOptions from './pages/DropdownOptions';
import wordmark from './assets/map-wordmark.png';

export const Auth = createContext(null);
export const useAuth = () => useContext(Auth);

// Header + nav shown on every authenticated page. The nav collapses into a
// toggleable dropdown below the `sm` breakpoint — five links plus the
// wordmark has no room to stay inline on a phone-width screen.
function Shell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Close the mobile menu automatically on navigation, so tapping a link
  // doesn't leave the dropdown open over the new page.
  React.useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  return (
    <>
      <header className="top">
        <Link to="/dashboard" className="brand">
          <img src={wordmark} alt="Mohalla Adoption Program — Zakat Centre India Initiative" className="brand-wordmark" />
        </Link>
        <button
          type="button"
          className="nav-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <nav className={menuOpen ? 'nav-open' : ''}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/surveys">Surveys</Link>
          <Link to="/survey/new">New Survey</Link>
          {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
          <button className="link" onClick={logout}>Logout</button>
        </nav>
      </header>
      <main className="container">{children}</main>
    </>
  );
}

// Route guard: redirects to /login when signed out, and to /dashboard when
// signed in but missing one of the required `roles`.
function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('map_user') || 'null'));

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <Auth.Provider value={{ user, setUser, logout }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/surveys" element={<Protected><Surveys /></Protected>} />
        <Route path="/survey/new" element={<Protected><SurveyForm /></Protected>} />
        <Route path="/survey/:id" element={<Protected><SurveyForm /></Protected>} />
        <Route path="/admin" element={<Protected roles={['ADMIN']}><Admin /></Protected>} />
        <Route path="/admin/dropdown-options" element={<Protected roles={['ADMIN']}><DropdownOptions /></Protected>} />
      </Routes>
    </Auth.Provider>
  );
}
