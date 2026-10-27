import {portalRequest} from '../auth/api.js';
import { Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login-redesign.css";

const roles = [
  ["Teacher", "/teacher/dashboard"],
  ["Invigilator", "/dashboard/invigilator"],
  ["Examiner", "/examiner/dashboard"],
  ["Admin", "/dashboard/admin"],
  ["Super Admin", "/dashboard/super-admin"],
];
export default function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [portal, setPortal] = useState(false);
  const [error,setError]=useState('');
  return (
    <main className="candidate-login candidate-login-split staff-modern">
      <aside className="candidate-login-art" aria-label="Music photography"><img src="/home-subjects/login-golden-tabla.png" alt="Hands playing a drum in warm golden light"/></aside>
      <section className="candidate-login-panel">
        <div className="candidate-card staff-form-wrap">
          <h1>
            Staff Login
          </h1>
          <p>
            Please verify your credentials to manage the academic curriculum and
            examination boards.
          </p>
          <form autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              setPortal(true);
            }}
          >
            <label>
              EMAIL ADDRESS
              <input
                type="text" inputMode="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              PASSWORD
              <div className="password-line">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label="Show password"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="staff-submit candidate-submit">Sign in securely →</button>
          </form>
        </div>
      </section>
      {portal && (
        <div className="portal-overlay" role="dialog" aria-modal="true">
          <div className="portal-modal">
            <button className="portal-close" onClick={() => setPortal(false)}>
              <X />
            </button>
            <h2>Select Portal</h2>
            <p>PROTOTYPE: CHOOSE A ROLE TO CONTINUE</p>
            {error&&<p role="alert">{error}</p>}
            <div>
              {roles.map(([name, path]) => (
                <button
                  key={name}
                  onClick={async () => {
                    if(name === "Examiner" || name === "Admin") {try {let r;if(name==='Admin'){try{r=await portalRequest("preview-admin-login",{email,password});}catch{r=await portalRequest("staff-login",{email,password});}}else{r=await portalRequest("staff-login",{email,password});}const requiredRole=name==='Admin'?'admin':'examiner';if(r.user?.role!==requiredRole)throw Error("Use a valid "+name.toLowerCase()+" account.");}catch(e){setError(e.message);return;}}
                    if (name === "Teacher")
                      sessionStorage.setItem("teacher-demo-auth", "active");
                    navigate(path);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <footer>
              Please ensure you select the correct role for your current tasks.
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
