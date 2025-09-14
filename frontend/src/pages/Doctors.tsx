import { useEffect, useMemo, useState } from "react";
import "../styles/landing.css";
import { listDoctorsPublic, type PublicDoctor } from "../lib/publicApi";
import { Link } from "react-router-dom";

type Avail = { day: string; start: string; end: string };
type Profile = {
  specialty?: string;
  fee?: number;
  availability?: Avail[];
  experienceYears?: number;
  bio?: string;
};
type DoctorBrief = PublicDoctor & { profile?: Profile };

export default function Doctors() {
  const [docs, setDocs] = useState<DoctorBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<DoctorBrief | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("");
  const [minFee, setMinFee] = useState<string>("");
  const [maxFee, setMaxFee] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listDoctorsPublic();
        // Filter out totally malformed entries so UI never breaks
        const safe = (Array.isArray(data) ? data : []).filter(Boolean) as DoctorBrief[];
        setDocs(safe);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // unique specialties from data
  const specialties = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => {
      const s = d?.profile?.specialty?.trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [docs]);

  // filtered list
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const min = minFee ? Number(minFee) : undefined;
    const max = maxFee ? Number(maxFee) : undefined;

    return docs.filter((d) => {
      const name = (d?.name || "").toLowerCase();
      const sp = d?.profile?.specialty?.toLowerCase() || "";
      const fee = d?.profile?.fee;

      // text search (name or specialty)
      const matchQ = !ql || name.includes(ql) || sp.includes(ql);

      // specialty
      const matchSpec = !spec || d?.profile?.specialty === spec;

      // fee range
      const matchFee =
        (min === undefined || (typeof fee === "number" && fee >= min)) &&
        (max === undefined || (typeof fee === "number" && fee <= max));

      return matchQ && matchSpec && matchFee;
    });
  }, [docs, q, spec, minFee, maxFee]);

  return (
    <main className="landing">
      <section className="landing__section">
        <div className="landing__container">
          <div className="landing__section-head">
            <h2 className="landing__h2">All Doctors</h2>
            <p className="landing__muted">Browse our full team and filter by specialty or fee.</p>
          </div>

          {/* Filters */}
          <div className="doctors__filters">
            <input
              className="doctors__input"
              placeholder="Search by name or specialty…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search doctors by name or specialty"
            />
            <select
              aria-label="Filter by specialty"
              className="doctors__select"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            >
              <option value="">All specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="doctors__fee">
              <input
                className="doctors__input"
                type="number"
                inputMode="numeric"
                placeholder="Min fee"
                value={minFee}
                onChange={(e) => setMinFee(e.target.value)}
                aria-label="Minimum fee"
              />
              <span className="doctors__fee-sep">–</span>
              <input
                className="doctors__input"
                type="number"
                inputMode="numeric"
                placeholder="Max fee"
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value)}
                aria-label="Maximum fee"
              />
            </div>
            {(q || spec || minFee || maxFee) && (
              <button
                className="landing__btn landing__btn--ghost"
                onClick={() => {
                  setQ("");
                  setSpec("");
                  setMinFee("");
                  setMaxFee("");
                }}
              >
                Reset
              </button>
            )}
          </div>

          {loading ? (
            <div className="landing__muted">Loading…</div>
          ) : (
            <div className="landing__cards">
              {filtered.map((d, idx) => (
                <article key={d?._id ?? idx} className="landing__card landing__doctor-card">
                  <div className="landing__avatar" aria-hidden="true">
                    {getInitials(d?.name)}
                  </div>
                  <h3 className="landing__h3">{d?.name || "Doctor"}</h3>
                  <p className="landing__muted">
                    {d?.profile?.specialty || "Aesthetic Medicine"}
                    {typeof d?.profile?.fee === "number" ? ` • PKR ${d.profile.fee}` : ""}
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
              {filtered.length === 0 && (
                <div className="landing__muted">No doctors match your filters.</div>
              )}
            </div>
          )}

          <div className="landing__section-cta">
            <Link to="/patient/login" className="landing__btn">
              Book an Appointment
            </Link>
          </div>
        </div>
      </section>

      {active && (
        <div className="landing__modal-backdrop" onClick={() => setActive(null)}>
          <div className="landing__modal" onClick={(e) => e.stopPropagation()}>
            <div className="landing__modal-title">{active?.name || "Doctor"}</div>
            <div className="landing__modal-sub">
              {active?.profile?.specialty || "Aesthetic Medicine"}
              {typeof active?.profile?.fee === "number" ? ` • PKR ${active.profile.fee}` : ""}
            </div>
            {active?.profile?.bio && <p className="landing__muted">{active.profile.bio}</p>}
            {active?.profile?.experienceYears != null && (
              <div className="landing__stat">
                Experience: <strong>{active.profile.experienceYears} years</strong>
              </div>
            )}
            <div className="landing__modal-block">
              <div className="landing__label">Weekly Timing</div>
              <table className="landing__mini-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  {active?.profile?.availability?.length
                    ? active.profile.availability.map((s, i) => (
                        <tr key={i}>
                          <td>{s.day}</td>
                          <td>{s.start}</td>
                          <td>{s.end}</td>
                        </tr>
                      ))
                    : (
                      <tr>
                        <td colSpan={3} className="landing__empty">
                          No availability set.
                        </td>
                      </tr>
                      )}
                </tbody>
              </table>
            </div>
            <div className="landing__modal-actions">
              <button className="landing__btn landing__btn--ghost" onClick={() => setActive(null)}>
                Close
              </button>
              <Link className="landing__btn" to="/patient/login" onClick={() => setActive(null)}>
                {`Book with ${getFirstName(active?.name)}`}
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** Safe helpers shared with Landing.tsx */
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
