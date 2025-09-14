import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin-dashboard.css";
import { useAuth } from "../../state/AuthContext";
import {
  fetchStats,
  fetchUsers,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  logout,
  fetchInquiries,
  markInquiryRead as apiMarkInquiryRead,
  deleteInquiry as apiDeleteInquiry,
  type Inquiry,
  type UserRow,
  type Stats,
  fetchPatients,
  deletePatient as apiDeletePatient,
} from "../../lib/adminApi";
import { exportToCSV } from "../../lib/csv";
import { isAxiosError } from "axios";

type DoctorFormState = {
  id?: string;
  name: string;
  email: string;
  password?: string;
  specialty?: string;
  fee?: string;
};

type SortDir = "asc" | "desc";
type SortKey = "name" | "email" | "createdAt";

function toggleDir(dir: SortDir): SortDir {
  return dir === "asc" ? "desc" : "asc";
}

function sortRows<T extends { name: string; email: string; createdAt: string }>(
  rows: T[],
  key: SortKey,
  dir: SortDir
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    if (key === "createdAt") {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sign * (diff === 0 ? 0 : diff > 0 ? 1 : -1);
    }
    const cmp = a[key].localeCompare(b[key]);
    return sign * cmp;
  });
}

function withinRange(createdAt: string, from: string, to: string) {
  const t = new Date(createdAt).getTime();
  if (from) {
    const tf = new Date(from + "T00:00:00").getTime();
    if (t < tf) return false;
  }
  if (to) {
    const tt = new Date(to + "T23:59:59").getTime();
    if (t > tt) return false;
  }
  return true;
}

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) return err.response?.data?.message ?? err.message ?? "Request failed";
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export default function AdminDashboard() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();

  const [stats, setStats] = useState<Stats["users"] | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<
    "overview" | "doctors" | "patients" | "users" | "inquiries"
  >("overview");

  const [patients, setPatients] = useState<UserRow[]>([]);

  const [doctorQuery, setDoctorQuery] = useState("");
  const [patientQuery, setPatientQuery] = useState("");

  const [doctorFrom, setDoctorFrom] = useState<string>("");
  const [doctorTo, setDoctorTo] = useState<string>("");
  const [doctorSortKey, setDoctorSortKey] = useState<SortKey>("createdAt");
  const [doctorSortDir, setDoctorSortDir] = useState<SortDir>("desc");

  const [patientFrom, setPatientFrom] = useState<string>("");
  const [patientTo, setPatientTo] = useState<string>("");
  const [patientSortKey, setPatientSortKey] = useState<SortKey>("createdAt");
  const [patientSortDir, setPatientSortDir] = useState<SortDir>("desc");

  // Inquiries state
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inqLoading, setInqLoading] = useState(true);

  // Doctor modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DoctorFormState>({
    name: "",
    email: "",
    password: "",
    specialty: "",
    fee: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editing = !!form.id;

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchStats();
        const u = await fetchUsers();
        setStats(s.users);
        setUsers(u);
        const p = await fetchPatients();
        setPatients(p);
      } catch (e: unknown) {
        console.error(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load inquiries
  useEffect(() => {
    (async () => {
      try {
        setInqLoading(true);
        const list = await fetchInquiries();
        setInquiries(list);
      } catch (e) {
        console.error("Failed to load inquiries", e);
      } finally {
        setInqLoading(false);
      }
    })();
  }, []);

  const doctors = useMemo(() => users.filter((u) => u.role === "doctor"), [users]);

  async function onLogout() {
    await logout();
    setUser(null);
    nav("/admin/login", { replace: true });
  }

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    const base = doctors.filter(d => {
      const matchesQ = !q || d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q);
      const matchesDate = withinRange(d.createdAt, doctorFrom, doctorTo);
      return matchesQ && matchesDate;
    });
    return sortRows(base, doctorSortKey, doctorSortDir);
  }, [doctors, doctorQuery, doctorFrom, doctorTo, doctorSortKey, doctorSortDir]);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    const base = patients.filter(p => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
      const matchesDate = withinRange(p.createdAt, patientFrom, patientTo);
      return matchesQ && matchesDate;
    });
    return sortRows(base, patientSortKey, patientSortDir);
  }, [patients, patientQuery, patientFrom, patientTo, patientSortKey, patientSortDir]);

  function openCreate() {
    setErr(null);
    setForm({ name: "", email: "", password: "", specialty: "", fee: "" });
    setShowModal(true);
  }

  function openEdit(row: UserRow) {
    setErr(null);
    setForm({
      id: row._id,
      name: row.name,
      email: row.email,
      password: "",
      specialty: "",
      fee: "",
    });
    setShowModal(true);
  }

  async function onSaveDoctor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: (form.password || "").trim() || undefined,
        specialty: form.specialty?.trim() || undefined,
        fee: form.fee ? Number(form.fee) : undefined,
      };

      if (!payload.name || !payload.email || (!editing && !payload.password)) {
        throw new Error(
          editing ? "Name and email are required" : "Name, email and password are required"
        );
      }

      if (editing && form.id) {
        await updateDoctor({ id: form.id, ...payload });
      } else {
        await createDoctor(payload as Parameters<typeof createDoctor>[0]);
      }

      const u = await fetchUsers();
      const s = await fetchStats();
      setUsers(u);
      setStats(s.users);
      setShowModal(false);
    } catch (e: unknown) {
      setErr(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteDoctor(id: string) {
    if (!confirm("Delete this doctor? This cannot be undone.")) return;
    try {
      await deleteDoctor(id);
      setUsers(prev => prev.filter(u => u._id !== id));
      setStats(s => s ? { ...s, doctors: Math.max(0, s.doctors - 1), total: Math.max(0, s.total - 1) } : s);
    } catch (e: unknown) {
      alert(extractErrorMessage(e));
    }
  }

  if (loading) return <div className="admin-dashboard">Loading…</div>;

  return (
    <div className="admin-dashboard">
      {/* Toolbar */}
      <div className="admin-dashboard__toolbar">
        <div>
          <strong className="admin-dashboard__title">Admin Dashboard</strong>
          <div className="admin-dashboard__help">
            Logged in as {user?.name} • {user?.email}
          </div>
        </div>
        <div className="admin-dashboard__btnrow">
          <button className={`admin-dashboard__btn ${tab === "overview" ? "" : "is-ghost"}`} onClick={() => setTab("overview")}>Overview</button>
          <button className={`admin-dashboard__btn ${tab === "doctors" ? "" : "is-ghost"}`} onClick={() => setTab("doctors")}>Doctors</button>
          <button className={`admin-dashboard__btn ${tab === "patients" ? "" : "is-ghost"}`} onClick={() => setTab("patients")}>Patients</button>
          <button className={`admin-dashboard__btn ${tab === "users" ? "" : "is-ghost"}`} onClick={() => setTab("users")}>All Users</button>
          <button className={`admin-dashboard__btn ${tab === "inquiries" ? "" : "is-ghost"}`} onClick={() => setTab("inquiries")}>Inquiries</button>
          <button className="admin-dashboard__btn is-ghost" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="admin-dashboard__grid cols-3">
          <div className="admin-dashboard__card"><h3>Total Users</h3><div className="big">{stats?.total ?? 0}</div></div>
          <div className="admin-dashboard__card"><h3>Doctors</h3><div className="big">{stats?.doctors ?? 0}</div></div>
          <div className="admin-dashboard__card"><h3>Patients</h3><div className="big">{stats?.patients ?? 0}</div></div>
          <div className="admin-dashboard__card"><h3>Admins</h3><div className="big">{stats?.admins ?? 0}</div></div>
        </div>
      )}

      {/* Doctors */}
      {tab === "doctors" && (
        <div className="admin-dashboard__section">
          <div className="admin-dashboard__toolbar">
            <h2>Manage Doctors</h2>
            <div className="admin-dashboard__searchbar">
              <input className="admin-dashboard__search-input" placeholder="Search doctors…" value={doctorQuery} onChange={(e) => setDoctorQuery(e.target.value)} />
              <input aria-label="date1" type="date" className="admin-dashboard__search-input" value={doctorFrom} onChange={(e) => setDoctorFrom(e.target.value)} />
              <input aria-label="date2" type="date" className="admin-dashboard__search-input" value={doctorTo} onChange={(e) => setDoctorTo(e.target.value)} />
              <button
                className="admin-dashboard__btn is-ghost"
                onClick={() =>
                  exportToCSV(
                    filteredDoctors.map(d => ({
                      Name: d.name,
                      Email: d.email,
                      Role: d.role,
                      Joined: new Date(d.createdAt).toISOString(),
                    })),
                    "doctors.csv"
                  )
                }
              >
                Export CSV
              </button>
              <button className="admin-dashboard__btn" onClick={openCreate}>+ New Doctor</button>
            </div>
          </div>
          <div className="admin-dashboard__card">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th
                    className="admin-dashboard__th-sort"
                    onClick={() => {
                      setDoctorSortKey("name");
                      setDoctorSortDir(prev => (doctorSortKey === "name" ? toggleDir(prev) : "asc"));
                    }}
                  >
                    Name <span className="arrow">{doctorSortKey === "name" ? (doctorSortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th
                    className="admin-dashboard__th-sort"
                    onClick={() => {
                      setDoctorSortKey("email");
                      setDoctorSortDir(prev => (doctorSortKey === "email" ? toggleDir(prev) : "asc"));
                    }}
                  >
                    Email <span className="arrow">{doctorSortKey === "email" ? (doctorSortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th>Role</th>
                  <th
                    className="admin-dashboard__th-sort"
                    onClick={() => {
                      setDoctorSortKey("createdAt");
                      setDoctorSortDir(prev => (doctorSortKey === "createdAt" ? toggleDir(prev) : "desc"));
                    }}
                  >
                    Joined <span className="arrow">{doctorSortKey === "createdAt" ? (doctorSortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th className="admin-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map(d => (
                  <tr key={d._id}>
                    <td>{d.name}</td>
                    <td>{d.email}</td>
                    <td><span className="admin-dashboard__badge doctor">doctor</span></td>
                    <td>{new Date(d.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="admin-dashboard__actions">
                        <button className="admin-dashboard__btn is-ghost" onClick={() => openEdit(d)}>Edit</button>
                        <button className="admin-dashboard__btn is-danger" onClick={() => onDeleteDoctor(d._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDoctors.length === 0 && <tr><td className="empty" colSpan={5}>No matching doctors.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patients */}
      {tab === "patients" && (
        <div className="admin-dashboard__section">
          <div className="admin-dashboard__toolbar">
            <h2>Patients</h2>
            <div className="admin-dashboard__searchbar">
              <input className="admin-dashboard__search-input" placeholder="Search patients…" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
              <input aria-label="date 1" type="date" className="admin-dashboard__search-input" value={patientFrom} onChange={(e) => setPatientFrom(e.target.value)} />
              <input aria-label="date 2" type="date" className="admin-dashboard__search-input" value={patientTo} onChange={(e) => setPatientTo(e.target.value)} />
              <button
                className="admin-dashboard__btn is-ghost"
                onClick={() =>
                  exportToCSV(
                    filteredPatients.map(p => ({
                      Name: p.name,
                      Email: p.email,
                      Role: p.role,
                      Joined: new Date(p.createdAt).toISOString(),
                    })),
                    "patients.csv"
                  )
                }
              >
                Export CSV
              </button>
            </div>
          </div>
          <div className="admin-dashboard__card">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th
                    className="admin-dashboard__th-sort"
                    onClick={() => {
                      setPatientSortKey("name");
                      setPatientSortDir(prev => (patientSortKey === "name" ? toggleDir(prev) : "asc"));
                    }}
                  >
                    Name <span className="arrow">{patientSortKey === "name" ? (patientSortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th
                    className="admin-dashboard__th-sort"
                    onClick={() => {
                      setPatientSortKey("email");
                      setPatientSortDir(prev => (patientSortKey === "email" ? toggleDir(prev) : "asc"));
                    }}
                  >
                    Email <span className="arrow">{patientSortKey === "email" ? (patientSortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th>Role</th>
                  <th
                    className="admin-dashboard__th-sort"
                    onClick={() => {
                      setPatientSortKey("createdAt");
                      setPatientSortDir(prev => (patientSortKey === "createdAt" ? toggleDir(prev) : "desc"));
                    }}
                  >
                    Joined <span className="arrow">{patientSortKey === "createdAt" ? (patientSortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th className="admin-actions2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td><span className="admin-dashboard__badge patient">patient</span></td>
                    <td>{new Date(p.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="admin-dashboard__btn is-danger"
                        onClick={async () => {
                          if (!confirm("Delete this patient? Their appointments and reports will be removed.")) return;
                          try {
                            await apiDeletePatient(p._id);
                            setPatients(prev => prev.filter(x => x._id !== p._id));
                            setUsers(prev => prev.filter(x => x._id !== p._id));
                            setStats(s =>
                              s ? { ...s, patients: Math.max(0, s.patients - 1), total: Math.max(0, s.total - 1) } : s
                            );
                          } catch (e: unknown) {
                            alert(extractErrorMessage(e));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && <tr><td className="empty" colSpan={5}>No matching patients.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="admin-dashboard__section">
          <div className="admin-dashboard__card">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`admin-dashboard__badge ${u.role}`}>{u.role}</span></td>
                    <td>{new Date(u.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td className="empty" colSpan={4}>No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inquiries */}
      {tab === "inquiries" && (
        <div className="admin-dashboard__section">
          <div className="admin-dashboard__card">
            <h3 style={{ margin: 0, marginBottom: 12 }}>Contact Inquiries</h3>
            {inqLoading ? (
              <div>Loading…</div>
            ) : (
              <table className="admin-dashboard__table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Message</th>
                    <th className="admin-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((q) => (
                    <tr key={q._id}>
                      <td>{new Date(q.createdAt).toLocaleString()}</td>
                      <td>{q.name}</td>
                      <td>{q.email}</td>
                      <td style={{ maxWidth: 480, whiteSpace: "pre-wrap" }}>{q.message}</td>
                      <td>
                        <div className="admin-dashboard__actions">
                          <button
                            className="admin-dashboard__btn is-ghost"
                            onClick={async () => {
                              try {
                                const updated = await apiMarkInquiryRead(q._id, !q.read);
                                setInquiries(prev => prev.map(x => (x._id === q._id ? updated : x)));
                              } catch (e) {
                                alert(extractErrorMessage(e));
                              }
                            }}
                          >
                            {q.read ? "Mark Unread" : "Mark Read"}
                          </button>
                          <button
                            className="admin-dashboard__btn is-danger"
                            onClick={async () => {
                              if (!confirm("Delete this inquiry?")) return;
                              try {
                                await apiDeleteInquiry(q._id);
                                setInquiries(prev => prev.filter(x => x._id !== q._id));
                              } catch (e) {
                                alert(extractErrorMessage(e));
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inquiries.length === 0 && (
                    <tr>
                      <td className="empty" colSpan={5}>No inquiries yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-dashboard__modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="admin-dashboard__modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-dashboard__modal-title">{editing ? "Edit Doctor" : "Create Doctor"}</div>
            <form onSubmit={onSaveDoctor}>
              <div className="admin-dashboard__form-row">
                <label className="admin-dashboard__label">Full Name</label>
                <input
                  aria-label="name"
                  className="admin-dashboard__input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="admin-dashboard__form-row">
                <label className="admin-dashboard__label">Email</label>
                <input
                  aria-label="email"
                  type="email"
                  className="admin-dashboard__input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="admin-dashboard__form-row">
                <label className="admin-dashboard__label">
                  {editing ? "New Password (optional)" : "Password"}
                </label>
                <input
                  aria-label="password"
                  type="password"
                  className="admin-dashboard__input"
                  value={form.password || ""}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="admin-dashboard__form-row">
                <label className="admin-dashboard__label">Specialty (optional)</label>
                <input
                  aria-label="speciality"
                  className="admin-dashboard__input"
                  value={form.specialty || ""}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                />
              </div>
              <div className="admin-dashboard__form-row">
                <label className="admin-dashboard__label">Consultation Fee (optional)</label>
                <input
                  aria-label="fee"
                  className="admin-dashboard__input"
                  value={form.fee || ""}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })}
                />
              </div>
              {err && <div className="admin-dashboard__error">{err}</div>}
              <div className="admin-dashboard__modal-actions">
                <button type="button" className="admin-dashboard__btn is-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="admin-dashboard__btn" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
