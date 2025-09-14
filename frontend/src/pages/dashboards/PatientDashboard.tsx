import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../styles/patient-dashboard.css";
import {
  listDoctors, myAppointments, bookAppointment, cancelAppointment, myReportsList,
  type DoctorLite, type PatientAppointment, type PatientReport
} from "../../lib/patientApi";
import { api } from "../../lib/api"; // 👈 for optional /patient/slots endpoint
import { useAuth } from "../../state/AuthContext";
import { isAxiosError } from "axios";

// Use the same order JS Date uses (0=Sun..6=Sat)
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function dayOf(dateStr: string) {
  const d = new Date(dateStr);
  return DOW[d.getDay()];
}
function withinSlot(dateStr: string, slots: DoctorLite["availability"]) {
  const d = new Date(dateStr);
  const day = dayOf(dateStr);
  const hhmm = d.toTimeString().slice(0,5);
  return slots.some(s => s.day === day && s.start <= hhmm && hhmm < s.end);
}

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) return err.response?.data?.message ?? err.message ?? "Request failed";
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

/** Local fallback slot generator (30-min steps) from weekly availability */
function generateSlotsFromAvailability(date: string, availability: DoctorLite["availability"]): string[] {
  if (!date) return [];
  const day = dayOf(`${date}T00:00:00`);
  const windows = availability.filter(s => s.day === day);
  if (!windows.length) return [];

  const isToday = new Date(date).toDateString() === new Date().toDateString();
  const nowHHMM = new Date().toTimeString().slice(0,5);

  const slots: string[] = [];
  for (const w of windows) {
    let cur = toMinutes(w.start);
    const end = toMinutes(w.end);
    while (cur + 30 <= end) { // end-exclusive
      const hhmm = fromMinutes(cur);
      if (!isToday || hhmm > nowHHMM) slots.push(hhmm);
      cur += 30;
    }
  }
  return slots;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}`;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"book"|"appointments"|"reports">("book");

  // query param (doctorId)
  const [searchParams] = useSearchParams();
  const doctorIdFromQuery = searchParams.get("doctorId");

  // doctors
  const [doctors, setDoctors] = useState<DoctorLite[]>([]);
  const [docLoading, setDocLoading] = useState(true);

  // booking form
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [date, setDate] = useState<string>(""); // yyyy-mm-dd
  const [time, setTime] = useState<string>(""); // HH:MM (chosen from slots)
  const [reason, setReason] = useState<string>("");
  const [bookMsg, setBookMsg] = useState<string | null>(null);
  const chosenDoctor = useMemo(() => doctors.find(d => d._id === selectedDoctor), [doctors, selectedDoctor]);

  // dynamic slots
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsErr, setSlotsErr] = useState<string | null>(null);

  // appointments
  const [appts, setAppts] = useState<PatientAppointment[]>([]);
  const [apptLoading, setApptLoading] = useState(true);

  // reports
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [repLoading, setRepLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setDocLoading(true);
        const ds = await listDoctors();
        setDoctors(ds);
      } finally { setDocLoading(false); }
    })();
    (async () => {
      try {
        setApptLoading(true);
        const a = await myAppointments();
        setAppts(a);
      } finally { setApptLoading(false); }
    })();
    (async () => {
      try {
        setRepLoading(true);
        const r = await myReportsList();
        setReports(r);
      } finally { setRepLoading(false); }
    })();
  }, []);

  // preselect doctor via ?doctorId=
  useEffect(() => {
    if (!docLoading && doctorIdFromQuery && doctors.length) {
      const exists = doctors.find(d => d._id === doctorIdFromQuery);
      if (exists) {
        setSelectedDoctor(doctorIdFromQuery);
        setTab("book");
      }
    }
  }, [docLoading, doctors, doctorIdFromQuery]);

  // fetch/generate slots whenever doctor or date changes
  useEffect(() => {
    setSlotsErr(null);
    setTime("");
    if (!selectedDoctor || !date) { setSlots([]); return; }

    (async () => {
      setSlotsLoading(true);
      try {
        // ✅ Try server-provided free slots (respects maxPatientsPerDay & booked times)
        // Expected shape: { slots: string[] }
        const res = await api.get("/patient/slots", { params: { doctorId: selectedDoctor, date } });
        const serverSlots: string[] = Array.isArray(res.data?.slots) ? res.data.slots : [];
        if (serverSlots.length) {
          setSlots(serverSlots);
        } else {
          // fallback to local generation if server returns empty or unknown
          const local = chosenDoctor ? generateSlotsFromAvailability(date, chosenDoctor.availability) : [];
          setSlots(local);
        }
      } catch (e) {
        // If endpoint not implemented (404) or any error -> graceful fallback
        const local = chosenDoctor ? generateSlotsFromAvailability(date, chosenDoctor.availability) : [];
        setSlots(local);
        const msg = extractErrorMessage(e);
        // show a soft hint only if we got nothing locally
        if (local.length === 0) setSlotsErr(msg);
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, [selectedDoctor, date, chosenDoctor]);

  async function onBook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBookMsg(null);

    if (!selectedDoctor || !date || !time) {
      setBookMsg("Please choose doctor, date and a time slot.");
      return;
    }

    const dt = new Date(`${date}T${time}:00`);
    if (isNaN(+dt)) {
      setBookMsg("Invalid date/time.");
      return;
    }

    // client-side availability check as extra guard (server will re-validate)
    if (chosenDoctor && !withinSlot(dt.toISOString(), chosenDoctor.availability)) {
      setBookMsg("Selected time is outside the doctor's availability.");
      return;
    }

    try {
      const appt = await bookAppointment({
        doctorId: selectedDoctor,
        datetime: dt.toISOString(),
        reason: reason.trim() || undefined
      });
      setAppts(prev => [...prev, appt].sort((a,b)=>+new Date(a.datetime)-+new Date(b.datetime)));
      setBookMsg("Appointment requested! Status will appear as pending until doctor responds.");
      // Keep doctor/date selection; reset time & reason
      setReason("");
      setTime("");
      // Refetch slots to reflect the newly taken one (esp. if server limits by capacity)
      if (date && selectedDoctor) {
        try {
          const res = await api.get("/patient/slots", { params: { doctorId: selectedDoctor, date } });
          const serverSlots: string[] = Array.isArray(res.data?.slots) ? res.data.slots : [];
          setSlots(serverSlots.length ? serverSlots : (chosenDoctor ? generateSlotsFromAvailability(date, chosenDoctor.availability) : []));
        } catch {
          setSlots(chosenDoctor ? generateSlotsFromAvailability(date, chosenDoctor.availability) : []);
        }
      }
    } catch (e: unknown) {
      setBookMsg(extractErrorMessage(e));
    }
  }

  async function onCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    await cancelAppointment(id);
    setAppts(prev => prev.filter(a => a._id !== id));
  }

  return (
    <div className="patient-dashboard">
      <div className="patient-dashboard__toolbar">
        <div>
          <strong className="patient-dashboard__title">Patient Dashboard</strong>
          <div className="patient-dashboard__help">Logged in as {user?.name} • {user?.email}</div>
        </div>
        <div className="patient-dashboard__btnrow">
          <button className={`patient-dashboard__btn ${tab==="book"?"": "is-ghost"}`} onClick={()=>setTab("book")}>Book</button>
          <button className={`patient-dashboard__btn ${tab==="appointments"?"": "is-ghost"}`} onClick={()=>setTab("appointments")}>My Appointments</button>
          <button className={`patient-dashboard__btn ${tab==="reports"?"": "is-ghost"}`} onClick={()=>setTab("reports")}>My Reports</button>
        </div>
      </div>

      {/* BOOK */}
      {tab === "book" && (
        <div className="patient-dashboard__grid cols-2">
          {/* Form */}
          <div className="patient-dashboard__card">
            <h3 className="patient-dashboard__h3">Book Appointment</h3>
            <form className="patient-dashboard__form" onSubmit={onBook}>
              <div className="patient-dashboard__form-row">
                <label className="patient-dashboard__label">Doctor</label>
                <select
                  aria-label="doctor"
                  className="patient-dashboard__select"
                  value={selectedDoctor}
                  onChange={e=>setSelectedDoctor(e.target.value)}
                >
                  <option className="select-doctor" value="">Select a doctor</option>
                  {doctors.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.specialty ? `• ${d.specialty}` : ""} {d.fee ? `• PKR ${d.fee}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="patient-dashboard__form-cols">
                <div className="patient-dashboard__form-row">
                  <label className="patient-dashboard__label">Date</label>
                  <input
                    aria-label="date"
                    type="date"
                    className="patient-dashboard__input"
                    value={date}
                    onChange={e=>setDate(e.target.value)}
                  />
                </div>
                <div className="patient-dashboard__form-row">
                  <label className="patient-dashboard__label">Time</label>
                  {slotsLoading ? (
                    <div className="patient-dashboard__help">Checking free slots…</div>
                  ) : slots.length > 0 ? (
                    <select
                      aria-label="time"
                      className="patient-dashboard__select"
                      value={time}
                      onChange={(e)=>setTime(e.target.value)}
                    >
                      <option value="">Select a time</option>
                      {slots.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <div className="patient-dashboard__note">
                      {selectedDoctor && date
                        ? "Please select a date according to the availability."
                        : "Select a doctor and date to see available times."}
                    </div>
                  )}
                </div>
              </div>

              <div className="patient-dashboard__form-row">
                <label className="patient-dashboard__label">Reason (optional)</label>
                <input
                  className="patient-dashboard__input"
                  placeholder="e.g., skin consultation"
                  value={reason}
                  onChange={e=>setReason(e.target.value)}
                />
              </div>

              {slotsErr && (
                <div className="patient-dashboard__note">
                  {slotsErr}
                </div>
              )}
              {bookMsg && (
                <div className="patient-dashboard__note patient-dashboard__note--ok">
                  {bookMsg}
                </div>
              )}

              <div>
                <button className="patient-dashboard__btn" disabled={!selectedDoctor || !date || !slots.length}>
                  Request Appointment
                </button>
              </div>
            </form>
          </div>

          {/* Doctor details + availability */}
          <div className="patient-dashboard__card">
            <h3 className="patient-dashboard__h3">Doctor Details</h3>
            {docLoading ? (
              <div>Loading doctors…</div>
            ) : (
              <>
                {!chosenDoctor ? (
                  <div className="patient-dashboard__help">
                    Select a doctor to see specialty, fee, and weekly availability.
                  </div>
                ) : (
                  <div className="patient-dashboard__details">
                    <div>
                      <strong>{chosenDoctor.name}</strong>
                      <span className="patient-dashboard__help"> ({chosenDoctor.email})</span>
                    </div>
                    <div>Specialty: <strong>{chosenDoctor.specialty || "—"}</strong></div>
                    <div>Fee: <strong>{chosenDoctor.fee != null ? `PKR ${chosenDoctor.fee}` : "—"}</strong></div>

                    <div className="patient-dashboard__help">Availability</div>
                    <table className="patient-dashboard__table">
                      <thead><tr><th>Day</th><th>Start</th><th>End</th></tr></thead>
                      <tbody>
                        {chosenDoctor.availability.map((s,i)=>(
                          <tr key={i}><td>{s.day}</td><td>{s.start}</td><td>{s.end}</td></tr>
                        ))}
                        {chosenDoctor.availability.length === 0 && (
                          <tr><td colSpan={3} className="patient-dashboard__empty">No slots yet.</td></tr>
                        )}
                      </tbody>
                    </table>

                    {date && time && (
                      <div className="patient-dashboard__help">
                        Selected {date} {time} • {withinSlot(`${date}T${time}:00`, chosenDoctor.availability) ? "inside availability ✅" : "outside availability ❌"}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* APPOINTMENTS */}
      {tab === "appointments" && (
        <div className="patient-dashboard__card">
          {apptLoading ? (
            <div>Loading appointments…</div>
          ) : (
            <table className="patient-dashboard__table">
              <thead>
                <tr>
                  <th>Doctor</th><th>Date & Time</th><th>Reason</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appts.map(a => (
                  <tr key={a._id}>
                    <td>{a.doctor.name} <span className="patient-dashboard__help">({a.doctor.email})</span></td>
                    <td>{new Date(a.datetime).toLocaleString()}</td>
                    <td>{a.reason || "-"}</td>
                    <td><span className={`patient-dashboard__badge status-${a.status}`}>{a.status}</span></td>
                    <td>
                      {a.status !== "confirmed" && (
                        <button className="patient-dashboard__btn is-danger" onClick={()=>onCancel(a._id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
                {appts.length === 0 && (
                  <tr><td colSpan={5} className="patient-dashboard__empty">No appointments yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* REPORTS */}
      {tab === "reports" && (
        <div className="patient-dashboard__card">
          {repLoading ? (
            <div>Loading reports…</div>
          ) : (
            <table className="patient-dashboard__table">
              <thead>
                <tr>
                  <th>Doctor</th><th>Title</th><th>Notes</th><th>File</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r._id}>
                    <td>{r.doctor.name} <span className="patient-dashboard__help">({r.doctor.email})</span></td>
                    <td>{r.title}</td>
                    <td>{r.notes || "-"}</td>
                    <td>{r.fileUrl ? <a className="patient-dashboard__link" href={r.fileUrl} target="_blank">Open</a> : "-"}</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan={5} className="patient-dashboard__empty">No reports yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
