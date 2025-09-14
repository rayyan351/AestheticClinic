// src/components/Navbar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { api } from "../lib/api";
import "../styles/navbar.css";

export default function Navbar() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const { pathname, hash } = useLocation();

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll shadow + close drawer on route change
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname, hash]);

  const onRestrictedAuthRoute =
    pathname.startsWith("/admin/login") || pathname.startsWith("/doctor/login");

  async function onLogout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed", err);
    } finally {
      setUser(null);
      nav("/", { replace: true });
    }
  }

  const dashRoute =
    user?.role === "admin" ? "/admin"
    : user?.role === "doctor" ? "/doctor"
    : user ? "/patient"
    : "/";

  const isActive = (to: string) =>
    pathname === to ||
    (to.startsWith("#") && hash === to) ||
    (to !== "/" && pathname.startsWith(to));

  // CTA: Book Now
  function onBookNow() {
    const target = user?.role === "patient" ? "/patient" : "/patient/login";
    nav(target);
  }

  return (
    <header className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
      <div className="navbar__inner">
        {/* Brand */}
        <Link to="/" className="navbar__brand" aria-label="Aesthetic Clinic Home">
          <span className="navbar__logo">◈</span>
          <span className="navbar__brand-main">Aesthetic</span>
        <span className="navbar__brand-accent">Clinic</span>
        </Link>

        {/* Desktop menu */}
        <nav className="navbar__menu" aria-label="Main">
          <Link to="/" className={`navbar__link ${isActive("/") ? "navbar__link--active" : ""}`}>Home</Link>
          <a href="#about" className="navbar__link">About</a>
          <Link to="/doctors" className={`navbar__link ${isActive("/doctors") ? "navbar__link--active" : ""}`}>Doctors</Link>
          <a href="#contact" className="navbar__link">Contact</a>

          {user ? (
            <>
              <Link
                to={dashRoute}
                className={`navbar__link ${isActive(dashRoute) ? "navbar__link--active" : ""}`}
              >
                Dashboard
              </Link>
              <button className="navbar__button navbar__button--outline" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : onRestrictedAuthRoute ? null : (
            <>
              <Link
                to="/patient/login"
                className={`navbar__link ${isActive("/patient/login") ? "navbar__link--active" : ""}`}
              >
                Login
              </Link>
              <Link
                to="/patient/signup"
                className={`navbar__button ${isActive("/patient/signup") ? "navbar__button--active" : ""}`}
              >
                Signup
              </Link>
            </>
          )}

          <button className="navbar__button navbar__button--cta" onClick={onBookNow}>
            Book Now
          </button>
        </nav>

        {/* Mobile toggle */}
        <button
          className="navbar__burger"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`navbar__drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <a href="#home" className="navbar__drawer-link">Home</a>
        <a href="#about" className="navbar__drawer-link">About</a>
        <Link to="/doctors" className="navbar__drawer-link">Doctors</Link>
        <a href="#contact" className="navbar__drawer-link">Contact</a>

        {user ? (
          <>
            <Link to={dashRoute} className="navbar__drawer-link">Dashboard</Link>
            <button className="navbar__drawer-btn" onClick={onLogout}>Logout</button>
          </>
        ) : onRestrictedAuthRoute ? null : (
          <>
            <Link to="/patient/login" className="navbar__drawer-link">Login</Link>
            <Link to="/patient/signup" className="navbar__drawer-btn">Signup</Link>
          </>
        )}

        <button className="navbar__drawer-cta" onClick={onBookNow}>Book Now</button>
      </div>
    </header>
  );
}
