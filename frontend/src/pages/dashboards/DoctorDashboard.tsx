import { useEffect, useMemo, useState } from "react";
import "../../styles/doctor-dashboard.css";
import {
  getDoctorMe, saveDoctorMe,
  getDoctorAppointments, setAppointmentStatus,
  createReport, listReports,
  type Availability, type Appointment, type Report
} from "../../lib/doctorApi";
import { useAuth } from "../../state/AuthContext";
import { isAxiosError } from "axios";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) return err.response?.data?.message ?? err.message ?? "Request failed";
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

type PopulatedPatient = { _id: string; name: string; email: string };

function hasPopulatedPatient(appt: Appointment): appt is Appointment & { patient: PopulatedPatient } {
  const p = (appt as { patient?: unknown }).patient;
  return typeof p === "object" && p !== null && "_id" in p;
}

function getPatientId(appt: Appointment): string {
  if (hasPopulatedPatient(appt)) return appt.patient._id;
  const p = (appt as { patient?: unknown }).patient;
  return typeof p === "string" ? p : "";
}

export default function DoctorDashboard() {
  const { user } = useAuth();

  // tabs
  const [tab, setTab] = useState<"profile"|"appointments"|"reports">("profile");

  // profile
  const [specialty, setSpecialty] = useState("");
  const [fee, setFee] = useState("");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // appointments
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // reports
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState<{ patientId: string; title: string; notes: string; fileUrl: string }>({
    patientId: "",
    title: "",
    notes: "",
    fileUrl: ""
  });

  useEffect(() => {
    (async () => {
      try {
        const me = await getDoctorMe();
        setSpecialty(me.profile?.specialty || "");
        setFee(me.profile?.fee != null ? String(me.profile.fee) : "");
        setAvailability(me.profile?.availability || []);
      } catch (err) {
        console.error(extractErrorMessage(err));
      }
    })();

    (async () => {
      try {
        setLoadingAppts(true);
        const a = await getDoctorAppointments();
        setAppointments(a);
      } catch (err) {
        console.error(extractErrorMessage(err));
      } finally {
        setLoadingAppts(false);
      }
    })();

    (async () => {
      try {
        setLoadingReports(true);
        const r = await listReports();
        setReports(r);
      } catch (err) {
        console.error(extractErrorMessage(err));
      } finally {
        setLoadingReports(false);
      }
    })();
  }, []);

  const upcoming = useMemo(
    () => appointments.slice().sort((a,b)=>+new Date(a.datetime)-+new Date(b.datetime)),
    [appointments]
  );

  function addAvailabilityRow() {
    setAvailability(prev => [...prev, { day: "Mon", start: "09:00", end: "17:00" }]);
  }
  function updateAvailability(i: number, key: keyof Availability, v: string) {
    setAvailability(prev => prev.map((row, idx) => idx === i ? { ...row, [key]: v } : row));
  }
  function removeAvailability(i: number) {
    setAvailability(prev => prev.filter((_, idx) => idx !== i));
  }

  async function onSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const payload = {
        specialty: specialty.trim() || undefined,
        fee: fee ? Number(fee) : undefined,
        availability
      };
      await saveDoctorMe(payload);
      setProfileMsg("Saved!");
      setTimeout(()=>setProfileMsg(null), 1200);
    } catch (err) {
      setProfileMsg(extractErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function onStatusChange(id: string, status: "pending"|"confirmed"|"rejected") {
    await setAppointmentStatus(id, status);
    setAppointments(prev => prev.map(a => a._id === id ? { ...a, status } : a));
  }

  function openReportModal(appt?: Appointment) {
    if (appt) {
      setReportForm({
        patientId: getPatientId(appt),
        title: "",
        notes: "",
        fileUrl: ""
      });
    }
    setShowReportModal(true);
  }

  async function onCreateReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { patientId, title, notes, fileUrl } = reportForm;
    if (!patientId || !title.trim()) return;
    try {
      const report = await createReport({
        patientId,
        title: title.trim(),
        notes: notes.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined
      });
      setReports(prev => [report, ...prev]);
      setShowReportModal(false);
      setReportForm({ patientId: "", title: "", notes: "", fileUrl: "" });
    } catch (err) {
      console.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="doctor-dashboard">
      {/* Toolbar */}
      <div className="doctor-dashboard__toolbar">
        <div>
          <strong className="doctor-dashboard__title">Doctor Dashboard</strong>
          <div className="doctor-dashboard__help">Logged in as {user?.name} • {user?.email}</div>
        </div>
        <div className="doctor-dashboard__btnrow">
          <button className={`doctor-dashboard__btn ${tab==="profile" ? "" : "is-ghost"}`} onClick={()=>setTab("profile")}>Profile</button>
          <button className={`doctor-dashboard__btn ${tab==="appointments" ? "" : "is-ghost"}`} onClick={()=>setTab("appointments")}>Appointments</button>
          <button className={`doctor-dashboard__btn ${tab==="reports" ? "" : "is-ghost"}`} onClick={()=>setTab("reports")}>Reports</button>
        </div>
      </div>

      {/* PROFILE */}
      {tab === "profile" && (
        <form className="doctor-dashboard__card" onSubmit={onSaveProfile}>
          <div className="doctor-dashboard__form-cols">
            <div className="doctor-dashboard__form-row">
              <label className="doctor-dashboard__label">Specialty</label>
              <input className="doctor-dashboard__input" value={specialty} onChange={e=>setSpecialty(e.target.value)} placeholder="Dermatology / Aesthetics" />
            </div>
            <div className="doctor-dashboard__form-row">
              <label className="doctor-dashboard__label">Consultation Fee</label>
              <input className="doctor-dashboard__input" value={fee} onChange={e=>setFee(e.target.value)} placeholder="e.g., 5000" />
            </div>
          </div>

          <div className="doctor-dashboard__form-row">
            <label className="doctor-dashboard__label">Availability</label>
            <div className="doctor-dashboard__hint">Set weekly slots (day + start/end in 24h format).</div>

            <div className="doctor-dashboard__slots">
              {availability.map((row, i) => (
                <div key={i} className="doctor-dashboard__form-cols">
                  <select aria-label="day" className="doctor-dashboard__select" value={row.day} onChange={e=>updateAvailability(i, "day", e.target.value)}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>

                  <div className="doctor-dashboard__form-cols doctor-dashboard__times">
                    <input className="doctor-dashboard__input" value={row.start} onChange={e=>updateAvailability(i, "start", e.target.value)} placeholder="09:00" />
                    <input className="doctor-dashboard__input" value={row.end} onChange={e=>updateAvailability(i, "end", e.target.value)} placeholder="17:00" />
                    <button type="button" className="doctor-dashboard__btn is-danger" onClick={()=>removeAvailability(i)}>Remove</button>
                  </div>
                </div>
              ))}
              <button type="button" className="doctor-dashboard__btn" onClick={addAvailabilityRow}>+ Add Slot</button>
            </div>
          </div>

          <div className="doctor-dashboard__actions">
            <button className="doctor-dashboard__btn" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save Profile"}</button>
            {profileMsg && <div className="doctor-dashboard__help">{profileMsg}</div>}
          </div>
        </form>
      )}

      {/* APPOINTMENTS */}
      {tab === "appointments" && (
        <div className="doctor-dashboard__card">
          {loadingAppts ? (
            <div>Loading appointments…</div>
          ) : (
            <table className="doctor-dashboard__table">
              <thead>
                <tr>
                  <th>Patient</th><th>Email</th><th>Date & Time</th><th>Reason</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(a => {
                  const patientName = hasPopulatedPatient(a) ? a.patient.name : "Unknown";
                  const patientEmail = hasPopulatedPatient(a) ? a.patient.email : "-";
                  return (
                    <tr key={a._id}>
                      <td>{patientName}</td>
                      <td>{patientEmail}</td>
                      <td>{new Date(a.datetime).toLocaleString()}</td>
                      <td>{a.reason || "-"}</td>
                      <td><span className={`doctor-dashboard__badge status-${a.status}`}>{a.status}</span></td>
                      <td>
                        <div className="doctor-dashboard__row-actions">
                          <button className="doctor-dashboard__btn is-ghost" onClick={()=>onStatusChange(a._id, "confirmed")}>Confirm</button>
                          <button className="doctor-dashboard__btn is-danger" onClick={()=>onStatusChange(a._id, "rejected")}>Reject</button>
                          <button className="doctor-dashboard__btn" onClick={()=>openReportModal(a)}>Report</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {upcoming.length === 0 && (
                  <tr><td colSpan={6} className="doctor-dashboard__empty">No appointments yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* REPORTS */}
      {tab === "reports" && (
        <div className="doctor-dashboard__section">
          <div className="doctor-dashboard__toolbar">
            <h2 className="doctor-dashboard__h2">Reports</h2>
            <button className="doctor-dashboard__btn" onClick={()=>{
              setReportForm({ patientId:"", title:"", notes:"", fileUrl:"" });
              setShowReportModal(true);
            }}>+ New Report</button>
          </div>

          <div className="doctor-dashboard__card">
            {loadingReports ? (
              <div>Loading reports…</div>
            ) : (
              <table className="doctor-dashboard__table">
                <thead>
                  <tr>
                    <th>Patient</th><th>Title</th><th>Notes</th><th>File</th><th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r._id}>
                      <td>{r.patient.name} <span className="doctor-dashboard__help">({r.patient.email})</span></td>
                      <td>{r.title}</td>
                      <td>{r.notes || "-"}</td>
                      <td>{r.fileUrl ? <a href={r.fileUrl} className="doctor-dashboard__link" target="_blank">Open</a> : "-"}</td>
                      <td>{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr><td colSpan={5} className="doctor-dashboard__empty">No reports yet.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="doctor-dashboard__modal-backdrop" onClick={()=>setShowReportModal(false)}>
          <div className="doctor-dashboard__modal" onClick={e=>e.stopPropagation()}>
            <div className="doctor-dashboard__modal-title">Create Patient Report</div>
            <form onSubmit={onCreateReport}>
              <div className="doctor-dashboard__form-row">
                <label className="doctor-dashboard__label">Patient ID</label>
                <input className="doctor-dashboard__input" placeholder="Paste patient ID" value={reportForm.patientId} onChange={e=>setReportForm({...reportForm, patientId:e.target.value})} />
                <div className="doctor-dashboard__hint">Tip: Open this from an appointment to auto-fill.</div>
              </div>
              <div className="doctor-dashboard__form-row">
                <label className="doctor-dashboard__label">Title</label>
                <input className="doctor-dashboard__input" value={reportForm.title} onChange={e=>setReportForm({...reportForm, title:e.target.value})} placeholder="e.g., Skin assessment report" />
              </div>
              <div className="doctor-dashboard__form-row">
                <label className="doctor-dashboard__label">Notes (optional)</label>
                <textarea aria-label="notes" className="doctor-dashboard__input" rows={4} value={reportForm.notes} onChange={e=>setReportForm({...reportForm, notes:e.target.value})}/>
              </div>
              <div className="doctor-dashboard__form-row">
                <label className="doctor-dashboard__label">File URL (optional)</label>
                <input className="doctor-dashboard__input" value={reportForm.fileUrl} onChange={e=>setReportForm({...reportForm, fileUrl:e.target.value})} placeholder="https://..." />
              </div>
              <div className="doctor-dashboard__modal-actions">
                <button type="button" className="doctor-dashboard__btn is-ghost" onClick={()=>setShowReportModal(false)}>Cancel</button>
                <button className="doctor-dashboard__btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
