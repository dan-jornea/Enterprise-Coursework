"use client";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import Avatar from "@/components/Avatar";
import { ALLOWED_DOMAINS, UNIVERSITY, YEARS } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

export default function Account() {
  const { user, profile, loading } = useAuth(true);
  const [personal, setPersonal] = useState({ name: "", course: "", year: "" });
  const [savedPersonal, setSavedPersonal] = useState<{ name: string; course: string; year: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (profile) {
      const current = {
        name: profile.display_name ?? "",
        course: profile.course ?? "",
        year: profile.year ?? "",
      };
      setPersonal(current);
      setSavedPersonal(current);
    }
  }, [profile]);
  useEffect(() => { if (user?.email) setEmail(user.email); }, [user]);

  async function savePersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: personal.name.trim(),
        course: personal.course.trim() || null,
        year: personal.year || null,
      })
      .eq("id", user.id)
      .select("id")
      .single();
    setProfileBusy(false);
    if (error) return setProfileError(error.message);
    if (!data) return setProfileError("Your profile could not be found.");
    const updated = {
      name: personal.name.trim(),
      course: personal.course.trim(),
      year: personal.year,
    };
    setPersonal(updated);
    setSavedPersonal(updated);
    setProfileMessage("Your personal information has been saved.");
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setEmailError("");
    setEmailMessage("");
    const newEmail = email.trim().toLowerCase();
    const domain = newEmail.split("@")[1] ?? "";
    if (!ALLOWED_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))) {
      return setEmailError(`Use your university email address (ending in @${UNIVERSITY.domain}).`);
    }
    if (newEmail === user.email?.toLowerCase()) {
      return setEmailError("Enter a different email address.");
    }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailBusy(false);
    if (error) return setEmailError(error.message);
    setEmailMessage("Check your inbox to confirm the new address. Your current email may remain active until confirmation.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (password.length < 8) return setPasswordError("Use a password with at least 8 characters.");
    if (password !== confirmPassword) return setPasswordError("The passwords do not match.");
    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordBusy(false);
    if (error) return setPasswordError(error.message);
    setPassword("");
    setConfirmPassword("");
    setPasswordMessage("Your password has been changed.");
  }

  if (!user) return null;
  const displayName = savedPersonal?.name ?? profile?.display_name ?? user.email;
  const displayCourse = savedPersonal ? savedPersonal.course : profile?.course;
  const displayYear = savedPersonal ? savedPersonal.year : profile?.year;
  return (
    <>
      <section className="panel seller-card" style={{ marginBottom: 24 }}>
        <Avatar name={displayName} size={64} />
        <div style={{ flex: 1 }}>
          <h1 className="row" style={{ fontSize: 24 }}>
            {displayName}
            <span className="badge"><BadgeCheck size={13} /> Verified student</span>
          </h1>
          <p className="muted">{[displayYear, displayCourse, UNIVERSITY.name].filter(Boolean).join(" · ")}</p>
          <p className="muted small">{user.email}</p>
        </div>
      </section>

      <section className="panel stack" style={{ marginBottom: 24 }}>
        <div>
          <h2>Personal information</h2>
          <p className="muted small" style={{ marginTop: 5 }}>Update the information shown on your profile and listings.</p>
        </div>
        <form className="stack" onSubmit={savePersonal}>
          <label className="field">
            <span>Name</span>
            <input
              className="input"
              required
              value={personal.name}
              onChange={(e) => setPersonal((current) => ({ ...current, name: e.target.value }))}
            />
          </label>
          <div className="two">
            <label className="field">
              <span>Course</span>
              <input
                className="input"
                value={personal.course}
                onChange={(e) => setPersonal((current) => ({ ...current, course: e.target.value }))}
                placeholder="e.g. Computer Science"
              />
            </label>
            <label className="field">
              <span>Year</span>
              <select
                className="input"
                value={personal.year}
                onChange={(e) => setPersonal((current) => ({ ...current, year: e.target.value }))}
              >
                <option value="">Select your year</option>
                {YEARS.map((year) => <option key={year}>{year}</option>)}
              </select>
            </label>
          </div>
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={profileBusy || loading}>
              {profileBusy ? "Saving…" : "Save personal information"}
            </button>
            {profileMessage && <p className="notice green">{profileMessage}</p>}
          </div>
          {profileError && <p className="error">{profileError}</p>}
        </form>
      </section>

      <section className="panel stack" style={{ marginBottom: 24 }}>
        <div>
          <h2>Change email</h2>
          <p className="muted small" style={{ marginTop: 5 }}>Use a supported university email address.</p>
        </div>
        <form className="stack" onSubmit={changeEmail}>
          <label className="field">
            <span>Email address</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={emailBusy}>
              {emailBusy ? "Updating…" : "Update email"}
            </button>
            {emailMessage && <p className="notice green">{emailMessage}</p>}
          </div>
          {emailError && <p className="error">{emailError}</p>}
        </form>
      </section>

      <section className="panel stack" style={{ marginBottom: 32 }}>
        <div>
          <h2>Change password</h2>
          <p className="muted small" style={{ marginTop: 5 }}>Choose a password with at least 8 characters.</p>
        </div>
        <form className="stack" onSubmit={changePassword}>
          <label className="field">
            <span>New password</span>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Update password"}
            </button>
            {passwordMessage && <p className="notice green">{passwordMessage}</p>}
          </div>
          {passwordError && <p className="error">{passwordError}</p>}
        </form>
      </section>

    </>
  );
}
