// src/pages/auth/PatientLogin.tsx
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { z, ZodError } from "zod";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import { parseZod, emailSchema, passwordSchema } from "../../lib/form";
import { useAuth } from "../../state/AuthContext";
import "../../styles/patient-login.css";

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export default function PatientLogin() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctorId") || "";

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  function extractErrorMessage(err: unknown): string {
    if (isAxiosError(err)) {
      return err.response?.data?.message ?? err.message ?? "Request failed";
    }
    if (err instanceof ZodError) {
      return err.issues?.[0]?.message ?? "Invalid input";
    }
    if (err instanceof Error) {
      return err.message;
    }
    return "Something went wrong";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    try {
      parseZod(schema, form);
      setLoading(true);

      await api.post("/auth/patient/login", form);
      const me = await api.get("/auth/me");

      setUser(me.data.user);
      setMsg({ type: "ok", text: "Welcome back! Redirecting…" });

      const suffix = doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : "";
      setTimeout(() => nav(`/patient${suffix}`, { replace: true }), 400);
    } catch (err: unknown) {
      setMsg({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="patient-login">
      <div className="patient-login__card">
        <h1 className="patient-login__title">Patient Login</h1>
        <p className="patient-login__subtitle">
          Use your patient credentials to continue.
        </p>

        {msg && (
          <div className={`patient-login__message patient-login__message--${msg.type}`}>
            {msg.text}
          </div>
        )}

        <form className="patient-login__form" onSubmit={onSubmit}>
          <div className="patient-login__field">
            <label className="patient-login__label">Email</label>
            <input
              type="email"
              className="patient-login__input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="patient-login__field">
            <label className="patient-login__label">Password</label>
            <input
              type="password"
              className="patient-login__input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button className="patient-login__button" disabled={loading}>
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        <div className="patient-login__linkrow">
          <span className="patient-login__note">New here?</span>
          <Link
            to={`/patient/signup${doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : ""}`}
            className="patient-login__link"
          >
            Create patient account
          </Link>
        </div>
      </div>
    </div>
  );
}
