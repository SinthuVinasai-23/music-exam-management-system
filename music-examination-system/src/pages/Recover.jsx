import { useState } from "react";
import { Link } from "react-router-dom";
import { portalRequest } from "../auth/api.js";
export default function Recover() {
  const [step, setStep] = useState("request"),
    [identifier, setIdentifier] = useState(""),
    [role, setRole] = useState("student"),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [grant, setGrant] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (step === "request") {
        const data = await portalRequest("recovery/request", {
          identifier,
          role,
        });
        setChallenge(data.challenge);
        setStep("verify");
      } else if (step === "verify") {
        const data = await portalRequest("recovery/verify", {
          challenge,
          code,
        });
        setGrant(data.grant);
        setStep("reset");
      } else {
        await portalRequest("recovery/reset", {
          challenge,
          grant,
          password,
          confirmPassword,
        });
        setStep("done");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="candidate-login">
      <section className="candidate-card recovery-card">
        
        <span className="candidate-kicker">ACCOUNT RECOVERY</span>
        <h1>
          {
            {
              request: "Forgot your password?",
              verify: "Verify your account",
              reset: "Choose a new password",
              done: "Password reset successfully",
            }[step]
          }
        </h1>
        <p>
          {
            {
              request:
                "Recover your existing account. Your permanent Student ID, examinations and learning progress stay with you.",
              verify:
                "Enter the six-digit account recovery code. Parent-managed candidates recover their parent’s login account.",
              reset: "Use a strong password with letters and numbers.",
              done: "Your account and history are unchanged. Sign in using your new password.",
            }[step]
          }
        </p>
        {step !== "done" ? (
          <form onSubmit={submit}>
            {step === "request" && (
              <>
                <div className="candidate-role">
                  <button
                    type="button"
                    className={role === "student" ? "active" : ""}
                    onClick={() => setRole("student")}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    className={role === "parent" ? "active" : ""}
                    onClick={() => setRole("parent")}
                  >
                    Parent
                  </button>
                </div>
                <label>
                  {role === "parent"
                    ? "Registered Email"
                    : "Registered Email or Student ID"}
                  <input
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </label>
              </>
            )}
            {step === "verify" && (
              <label>
                Verification Code
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
            )}
            {step === "reset" && (
              <>
                <label>
                  New Password
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  Confirm New Password
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>
              </>
            )}
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <button className="candidate-submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : {
                    request: "Continue to Verification",
                    verify: "Verify Code",
                    reset: "Reset Password",
                  }[step]}
            </button>
            {step !== "request" && (
              <button
                type="button"
                className="recovery-restart"
                disabled={busy}
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setGrant("");
                  setError("");
                }}
              >
                Start again
              </button>
            )}
          </form>
        ) : (
          <Link className="candidate-submit" to="/login">
            Return to Login
          </Link>
        )}
        <div className="candidate-links">
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
