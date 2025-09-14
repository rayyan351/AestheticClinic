import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z, ZodError } from "zod";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import { parseZod, emailSchema, passwordSchema } from "../../lib/form";
import { useAuth } from "../../state/AuthContext";
import "../../styles/doctor-login.css"; // ⬅️ unique stylesheet

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export default function DoctorLogin() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

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

      await api.post("/auth/doctor/login", form);
      const me = await api.get("/auth/me");
      if (me.data?.user?.role !== "doctor") throw new Error("Not a doctor account");

      setUser(me.data.user);
      setMsg({ type: "ok", text: "Doctor verified. Redirecting…" });
      setTimeout(() => nav("/doctor", { replace: true }), 400);
    } catch (err) {
      setMsg({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="doctor-login">
      <div className="doctor-login__card">
        <h1 className="doctor-login__title">Doctor Login</h1>
        <p className="doctor-login__subtitle">Use credentials provided by the Admin.</p>

        {msg && (
          <div className={`doctor-login__message doctor-login__message--${msg.type}`}>
            {msg.text}
          </div>
        )}

        <form className="doctor-login__form" onSubmit={onSubmit}>
          <div className="doctor-login__field">
            <label className="doctor-login__label">Email</label>
            <input
              type="email"
              className="doctor-login__input"
              placeholder="doctor@clinic.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="doctor-login__field">
            <label className="doctor-login__label">Password</label>
            <input
              type="password"
              className="doctor-login__input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button className="doctor-login__button" disabled={loading}>
            {loading ? "Verifying…" : "Log In"}
          </button>
        </form>

        <div className="doctor-login__linkrow">
          <Link to="/" className="doctor-login__link">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
