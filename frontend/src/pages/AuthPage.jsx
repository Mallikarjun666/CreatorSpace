// frontend/src/pages/AuthPage.jsx
// Sign in / Join screen. Uses useAuth() from AuthContext.
// After a successful login or signup, `user` becomes set and the
// <Navigate> near the top sends the person to /c/home or /b/home.

import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Where to go once logged in: back to the page they tried to open
// (if it belongs to their role), otherwise their home page.
function homeFor(user, from) {
  const prefix = user.role === "creator" ? "/c" : "/b";
  return from && from.startsWith(prefix + "/") ? from : prefix + "/home";
}

// "Midjourney, runway ,Runway" -> ["Midjourney", "runway"]  (trimmed, de-duplicated)
function parseTools(text) {
  const seen = new Set();
  return text
    .split(",")
    .map((t) => t.trim().slice(0, 60))
    .filter((t) => {
      const key = t.toLowerCase();
      if (!t || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function Field({ id, label, hint, error, ...props }) {
  return (
    <>
      <label htmlFor={id}>
        {label}
        {hint && (
          <>
            {" "}
            <span className="mu">{hint}</span>
          </>
        )}
      </label>
      <input id={id} name={id} aria-invalid={Boolean(error)} {...props} />
      {error && <div className="err">{error}</div>}
    </>
  );
}

export default function AuthPage() {
  const { user, login, signup } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [tab, setTab] = useState("in"); // "in" = sign in, "up" = join
  const [role, setRole] = useState("creator");
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "", tools: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user, from)} replace />;

  const joining = tab === "up";
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function switchTab(next) {
    setTab(next);
    setErrors({});
  }

  function validate() {
    const e = {};
    if (joining && !form.name.trim()) e.name = "Enter your full name.";
    if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (!form.password) e.password = "Enter your password.";
    else if (joining && form.password.length < 8) e.password = "Use at least 8 characters.";
    if (joining && role === "brand" && !form.company.trim()) {
      e.company = "Enter your company or brand name.";
    }
    if (joining && role === "creator" && parseTools(form.tools).length > 10) {
      e.tools = "Add at most 10 tools.";
    }
    return e;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const email = form.email.trim().toLowerCase();
    try {
      if (joining) {
        await signup({
          name: form.name.trim(),
          email,
          password: form.password,
          role,
          company: role === "brand" ? form.company.trim() : null,
          tools: role === "creator" ? parseTools(form.tools) : [],
        });
      } else {
        await login(email, form.password);
      }
      // success: `user` is now set, so the <Navigate> above takes over
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="lg" style={{ justifyContent: "center", fontSize: 30 }}>
        <span className="lm">C</span>creator<b>Space</b>
      </div>
      <p className="mu">Where AI creators meet the brands hiring them</p>

      <div className="card">
        <div className="tabs">
          <button type="button" className={joining ? "" : "on"} onClick={() => switchTab("in")}>
            Sign in
          </button>
          <button type="button" className={joining ? "on" : ""} onClick={() => switchTab("up")}>
            Join now
          </button>
        </div>

        <h2 style={{ margin: "10px 0 0" }}>{joining ? "Create your account" : "Welcome back"}</h2>
        <p className="mu">
          {joining ? "It takes a minute. Tell us whether you create or hire." : "Sign in to continue."}
        </p>

        <form onSubmit={onSubmit} noValidate>
          {joining && (
            <>
              <div id="role-label" style={{ fontWeight: 600, fontSize: 13, margin: "12px 0 5px" }}>
                I am joining as
              </div>
              <div className="tabs" role="group" aria-labelledby="role-label">
                <button
                  type="button"
                  className={role === "creator" ? "on" : ""}
                  aria-pressed={role === "creator"}
                  onClick={() => setRole("creator")}
                >
                  📷 Creator
                </button>
                <button
                  type="button"
                  className={role === "brand" ? "on" : ""}
                  aria-pressed={role === "brand"}
                  onClick={() => setRole("brand")}
                >
                  🏢 Brand
                </button>
              </div>

              <Field
                id="name"
                label="Full name"
                value={form.name}
                onChange={set("name")}
                error={errors.name}
                autoComplete="name"
              />
            </>
          )}

          <Field
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
            autoComplete="email"
          />

          <Field
            id="password"
            label="Password"
            hint={joining ? "8 characters or more" : undefined}
            type="password"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            autoComplete={joining ? "new-password" : "current-password"}
            maxLength={128}
          />

          {joining && role === "brand" && (
            <Field
              id="company"
              label="Company or brand name"
              value={form.company}
              onChange={set("company")}
              error={errors.company}
              autoComplete="organization"
            />
          )}

          {joining && role === "creator" && (
            <Field
              id="tools"
              label="AI tools you use"
              hint="optional, separate with commas"
              placeholder="Midjourney, Runway"
              value={form.tools}
              onChange={set("tools")}
              error={errors.tools}
            />
          )}

          {errors.form && (
            <div className="err" role="alert" style={{ marginTop: 12 }}>
              {errors.form}
            </div>
          )}

          <button className="btn" style={{ width: "100%", marginTop: 16, padding: 13 }} disabled={busy}>
            {busy ? "Please wait…" : joining ? "Create account" : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center" }} className="mu">
          {joining ? "Already have an account?" : "New to creatorSpace?"}{" "}
          <button
            type="button"
            onClick={() => switchTab(joining ? "in" : "up")}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              color: "var(--or)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {joining ? "Sign in" : "Join now"}
          </button>
        </p>

        {import.meta.env.DEV && !joining && (
          <p className="mu sm" style={{ textAlign: "center" }}>
            Dev demo logins: creator@demo.com or brand@demo.com, password demo12345
          </p>
        )}
      </div>
    </div>
  );
}