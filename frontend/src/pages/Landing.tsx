import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/landing.css";
import { listDoctorsPublic, type PublicDoctor, submitContact } from "../lib/publicApi";
import { useAuth } from "../state/AuthContext";

type AvailabilitySlot = { day: string; start: string; end: string };

type DoctorBrief = PublicDoctor & {
  profile?: {
    specialty?: string;
    fee?: number;
    availability?: AvailabilitySlot[];
    experienceYears?: number;
    bio?: string;
  };
};

// Reveal hook (unchanged, just with watchKey support)
function useReveal(selector: string, watchKey: number = 0) {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    ).filter((el) => !el.classList.contains("is-revealed"));

    if (!els.length) return;

    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [selector, watchKey]);
}

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();

  // doctors
  const [docs, setDocs] = useState<DoctorBrief[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [active, setActive] = useState<DoctorBrief | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingDocs(true);
        const data = await listDoctorsPublic();
        const safe = (Array.isArray(data) ? data : []).filter(Boolean) as DoctorBrief[];
        setDocs(safe);
      } finally {
        setLoadingDocs(false);
      }
    })();
  }, []);

  // scroll-reveal
  useReveal(".reveal", docs.length);

  // Contact form state
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [contactMsg, setContactMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setContactMsg(null);

    const name = contact.name.trim();
    const email = contact.email.trim();
    const message = contact.message.trim();

    if (!name || !email || !message) {
      setContactMsg({ type: "error", text: "Name, email and message are required." });
      return;
    }

    try {
      setSending(true);
      const res = await submitContact({ name, email, message });
      setContactMsg({ type: "ok", text: res?.message || "Thanks! We’ve received your message." });
      setContact({ name: "", email: "", message: "" });
    } catch (err: any) {
      const text =
        err?.response?.data?.message ||
        err?.message ||
        "Could not send message. Please try again.";
      setContactMsg({ type: "error", text });
    } finally {
      setSending(false);
    }
  }

  // Book button in modal: deep-link to patient dashboard if patient, else to login
  function handleBook() {
    if (!active?._id) return;
    const bookUrl = `/patient?doctorId=${active._id}`;
    const target =
      user?.role === "patient"
        ? bookUrl
        : `/patient/login?next=${encodeURIComponent(bookUrl)}`;
    setActive(null);
    nav(target);
  }

  return (
    <main className="landing">
      {/* HERO */}
      <section className="landing__hero" id="home" aria-label="Hero">
        <div className="landing__container">
          <div className="landing__hero-badge reveal">Modern Aesthetic Clinic</div>
          <h1 className="landing__hero-title reveal">
            Precision skincare, <span className="landing__hero-accent">elevated.</span>
          </h1>
          <p className="landing__hero-sub reveal">
            A dark, sleek experience to book appointments, view reports, and manage care—built with
            real dashboards for patients, doctors, and admins.
          </p>
          <div className="landing__hero-cta reveal">
            <Link to="/patient/login" className="landing__btn">Book an Appointment</Link>
            <a href="#about" className="landing__btn landing__btn--ghost">Explore Clinic</a>
          </div>
        </div>
        <div className="landing__orb landing__orb--a" />
        <div className="landing__orb landing__orb--b" />
        <div className="landing__grid" aria-hidden="true" />
      </section>

      {/* ABOUT */}
      <section className="landing__section" id="about" aria-label="About">
        <div className="landing__container">
          <header className="landing__section-head reveal">
            <h2 className="landing__h2">About the Clinic</h2>
            <p className="landing__muted">
              Dermatology, laser, and non-invasive aesthetics—delivered with medical rigor and modern technology.
            </p>
          </header>

          <div className="landing__features">
            <article className="landing__feature reveal">
              <div className="landing__feature-icon">💎</div>
              <h3 className="landing__h3">Clinical-Grade</h3>
              <p className="landing__muted">Board-certified doctors and evidence-backed protocols.</p>
            </article>
            <article className="landing__feature reveal" style={{ animationDelay: ".05s" }}>
              <div className="landing__feature-icon">⚡</div>
              <h3 className="landing__h3">Same-Day Booking</h3>
              <p className="landing__muted">Seamless scheduling with live doctor availability.</p>
            </article>
            <article className="landing__feature reveal" style={{ animationDelay: ".1s" }}>
              <div className="landing__feature-icon">🔐</div>
              <h3 className="landing__h3">Secure Reports</h3>
              <p className="landing__muted">Access your medical files anytime with secure storage.</p>
            </article>
          </div>
        </div>
      </section>

      {/* DOCTORS (auto from DB, show max 3) */}
      <section className="landing__section" id="doctors" aria-label="Our Doctors">
        <div className="landing__container">
          <header className="landing__section-head reveal">
            <h2 className="landing__h2">Our Doctors</h2>
            <p className="landing__muted">Specialists in dermatology, lasers, and aesthetic medicine.</p>
          </header>

          <div className="landing__cards">
            {loadingDocs && <div className="landing__muted">Loading doctors…</div>}

            {!loadingDocs &&
              docs.slice(0, 3).map((d, i) => (
                <article
                  key={d._id ?? i}
                  className="landing__card landing__doctor-card reveal"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="landing__avatar" aria-hidden="true">
                    {getInitials(d?.name)}
                  </div>
                  <h3 className="landing__h3">{d?.name || "Doctor"}</h3>
                  <p className="landing__muted">
                    {d?.profile?.specialty || "Aesthetic Medicine"}
                  </p>

                  <div className="landing__doctor-overlay">
                    <button
                      className="landing__btn landing__btn--light"
                      onClick={() => setActive(d)}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}

            {!loadingDocs && docs.length === 0 && (
              <div className="landing__muted">No doctors yet. (Add some from the Admin dashboard.)</div>
            )}
          </div>

          <div className="landing__section-cta reveal">
            <button
              className="landing__btn landing__btn--ghost"
              onClick={() => nav("/doctors")}
            >
              See all doctors
            </button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="landing__section" id="contact" aria-label="Contact">
        <div className="landing__container landing__contact">
          <div className="landing__contact-info reveal">
            <h2 className="landing__h2">Get in touch</h2>
            <p className="landing__muted">Questions about treatments or bookings? We’re here to help.</p>
            <ul className="landing__list">
              <li><span>📍</span> Clifton, Karachi</li>
              <li><span>📞</span> +92 300 1234567</li>
              <li><span>✉️</span> hello@aestheticclinic.local</li>
            </ul>
          </div>

          <form className="landing__form reveal" onSubmit={onSubmitContact}>
            <div className="landing__form-row">
              <label className="landing__label">Full Name</label>
              <input
                name="name"
                className="landing__input"
                placeholder="Your name"
                required
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
              />
            </div>
            <div className="landing__form-row">
              <label className="landing__label">Email</label>
              <input
                name="email"
                type="email"
                className="landing__input"
                placeholder="you@example.com"
                required
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
            <div className="landing__form-row">
              <label className="landing__label">Message</label>
              <textarea
                name="message"
                rows={4}
                className="landing__input"
                placeholder="How can we help?"
                required
                value={contact.message}
                onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))}
              />
            </div>

            {contactMsg && (
              <div
                className="landing__note"
                style={{ color: contactMsg.type === "ok" ? "#86efac" : "#fecaca" }}
              >
                {contactMsg.text}
              </div>
            )}

            <button className="landing__btn" disabled={sending}>
              {sending ? "Sending…" : "Send Message"}
            </button>
          </form>
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__container landing__footer-inner">
          <div className="landing__brand">
            Aesthetic<span className="landing__brand-accent"> Clinic</span>
          </div>
          <div className="landing__tiny">© {new Date().getFullYear()} Aesthetic Clinic. All rights reserved.</div>
        </div>
      </footer>

      {/* Doctor Detail Modal */}
      {active && (
        <div className="landing__modal-backdrop" onClick={() => setActive(null)}>
          <div className="landing__modal" onClick={(e) => e.stopPropagation()}>
            <div className="landing__modal-title">{active?.name || "Doctor"}</div>
            <div className="landing__modal-sub">
              {active?.profile?.specialty || "Aesthetic Medicine"}
              {typeof active?.profile?.fee === "number" ? ` • PKR ${active.profile.fee}` : ""}
            </div>

            {active?.profile?.bio && (
              <p className="landing__muted">
                {active.profile.bio}
              </p>
            )}

            {active?.profile?.experienceYears != null && (
              <div className="landing__stat">
                Experience: <strong>{active.profile.experienceYears} years</strong>
              </div>
            )}

            <div className="landing__modal-block">
              <div className="landing__label">Weekly Timing</div>
              <table className="landing__mini-table">
                <thead>
                  <tr><th>Day</th><th>Start</th><th>End</th></tr>
                </thead>
                <tbody>
                  {active?.profile?.availability?.length
                    ? active.profile.availability.map((s: AvailabilitySlot, i: number) => (
                        <tr key={i}><td>{s.day}</td><td>{s.start}</td><td>{s.end}</td></tr>
                      ))
                    : <tr><td colSpan={3} className="landing__empty">No availability set.</td></tr>
                  }
                </tbody>
              </table>
            </div>

            <div className="landing__modal-actions">
              <button className="landing__btn landing__btn--ghost" onClick={() => setActive(null)}>Close</button>
              <button className="landing__btn" onClick={handleBook}>
                {`Book with ${getFirstName(active?.name)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** Safe helpers */
function getInitials(name?: string) {
  if (!name || typeof name !== "string") return "DR";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const pick = (first + second) || name.slice(0, 2);
  return pick.toUpperCase();
}
function getFirstName(name?: string) {
  if (!name || typeof name !== "string") return "Doctor";
  const first = name.trim().split(/\s+/)[0];
  return first || "Doctor";
}
