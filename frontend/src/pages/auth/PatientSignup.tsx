// src/pages/auth/PatientSignup.tsx
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { z, ZodError } from "zod";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import { parseZod, nameSchema, emailSchema, passwordSchema } from "../../lib/form";
import { useAuth } from "../../state/AuthContext";
import "../../styles/patient-signup.css";

const schema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

type Msg = { type: "error" | "ok"; text: string } | null;
type FormState = { name: string; email: string; password: string };

export default function PatientSignup() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctorId") || "";

  const [form, setForm] = useState<FormState>({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  function extractErrorMessage(err: unknown): string {
    if (isAxiosError(err)) return err.response?.data?.message ?? err.message ?? "Request failed";
    if (err instanceof ZodError) return err.issues?.[0]?.message ?? "Invalid input";
    if (err instanceof Error) return err.message;
    return "Something went wrong";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    try {
      parseZod(schema, form);
      setLoading(true);
      await api.post("/auth/patient/register", form);
      const me = await api.get("/auth/me");
      setUser(me.data.user);
      setMsg({ type: "ok", text: "Account created! Redirecting…" });

      const suffix = doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : "";
      setTimeout(() => nav(`/patient${suffix}`, { replace: true }), 500);
    } catch (err) {
      setMsg({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="patient-signup">
      <div className="patient-signup__card">
        <h1 className="patient-signup__title">Create Patient Account</h1>
        <p className="patient-signup__subtitle">
          Sign up to book appointments and access your reports.
        </p>

        {msg && (
          <div className={`patient-signup__message patient-signup__message--${msg.type}`}>
            {msg.text}
          </div>
        )}

        <form className="patient-signup__form" onSubmit={onSubmit}>
          <div className="patient-signup__field">
            <label className="patient-signup__label">Full Name</label>
            <input
              className="patient-signup__input"
              placeholder="Ayesha Khan"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="patient-signup__field">
            <label className="patient-signup__label">Email</label>
            <input
              type="email"
              className="patient-signup__input"
              placeholder="ayesha@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="patient-signup__field">
            <label className="patient-signup__label">
              Password <span className="patient-signup__hint">min 6 chars</span>
            </label>
            <input
              type="password"
              className="patient-signup__input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button className="patient-signup__button" disabled={loading}>
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>

        <div className="patient-signup__linkrow">
          <span className="patient-signup__note">Already have an account?</span>
          <Link
            to={`/patient/login${doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : ""}`}
            className="patient-signup__link"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
