import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z, ZodError } from "zod";
import { isAxiosError } from "axios";
import { api } from "../../lib/api";
import { parseZod, emailSchema, passwordSchema } from "../../lib/form";
import { useAuth } from "../../state/AuthContext";
import "../../styles/admin-login.css"; // ⬅️ unique stylesheet

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export default function AdminLogin() {
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

      await api.post("/auth/admin/login", form);
      const me = await api.get("/auth/me");
      if (me.data?.user?.role !== "admin") throw new Error("Not an admin account");

      setUser(me.data.user);
      setMsg({ type: "ok", text: "Admin verified. Redirecting…" });
      setTimeout(() => nav("/admin", { replace: true }), 400);
    } catch (err) {
      setMsg({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1 className="admin-login__title">Admin Login</h1>
        <p className="admin-login__subtitle">This page is only for administrators.</p>

        {msg && (
          <div className={`admin-login__message admin-login__message--${msg.type}`}>
            {msg.text}
          </div>
        )}

        <form className="admin-login__form" onSubmit={onSubmit}>
          <div className="admin-login__field">
            <label className="admin-login__label">Admin Email</label>
            <input
              type="email"
              className="admin-login__input"
              placeholder="admin@clinic.local"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="admin-login__field">
            <label className="admin-login__label">Password</label>
            <input
              type="password"
              className="admin-login__input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

        <button className="admin-login__button" disabled={loading}>
            {loading ? "Verifying…" : "Log In"}
          </button>
        </form>

        <div className="admin-login__linkrow">
          <Link to="/" className="admin-login__link">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
