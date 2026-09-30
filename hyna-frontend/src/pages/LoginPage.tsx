import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.su-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.su-root {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
  color: #f2f2f2;
  position: relative;
  overflow: hidden;
  transition: background 0.4s ease;
}

/* 1. Lime Canvas (Default - matching user's lime background image) */
.su-root.theme-lime-canvas {
  background-color: #c1f267;
  background-image: 
    radial-gradient(circle at 18% 18%, #e0faa3 0%, transparent 42%),
    radial-gradient(circle at 82% 28%, #cdf379 0%, transparent 48%),
    radial-gradient(circle at 50% 88%, #b2e646 0%, transparent 55%),
    linear-gradient(140deg, #dcf89d 0%, #c1f267 52%, #b5ea4f 100%);
}

/* 2. Dark Canvas */
.su-root.theme-dark-canvas {
  background-color: #0e0e11;
  background-image: 
    radial-gradient(circle at 50% 20%, #1e1e24 0%, transparent 60%),
    linear-gradient(180deg, #111114 0%, #0a0a0c 100%);
}

/* 3. Lime Card Theme */
.su-root.theme-lime-card {
  background-color: #0d0e12;
  background-image: 
    radial-gradient(circle at 50% 40%, rgba(193, 242, 103, 0.12) 0%, transparent 70%),
    linear-gradient(180deg, #111115 0%, #09090b 100%);
}

/* Background Ambient Elements */
.su-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.su-ambient-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
}
.su-ambient-1 {
  width: 480px;
  height: 480px;
  background: #e4fcab;
  top: -120px;
  left: -80px;
}
.su-ambient-2 {
  width: 420px;
  height: 420px;
  background: #a9e43b;
  bottom: -100px;
  right: -80px;
}

/* Top Theme Switcher Bar */
.su-theme-bar {
  position: absolute;
  top: 20px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(20, 20, 24, 0.25);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px;
  border-radius: 999px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.su-theme-btn {
  font: 500 11px 'JetBrains Mono', monospace;
  padding: 5px 12px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: transparent;
  color: #2c3614;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 5px;
}
.theme-dark-canvas .su-theme-btn,
.theme-lime-card .su-theme-btn {
  color: #9c9ca6;
}
.su-theme-btn.active {
  background: #141417;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.su-theme-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

/* Main Login Card - Faithful to Image 1 */
.su-card-container {
  width: 100%;
  max-width: 450px;
  position: relative;
  z-index: 10;
  animation: suCardFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes suCardFadeUp {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.su-card {
  width: 100%;
  background: #141416;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 38px 44px;
  position: relative;
  box-shadow: 
    0 36px 85px -18px rgba(25, 45, 10, 0.38),
    0 16px 36px -8px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.theme-lime-card .su-card {
  background: #c1f267;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #121214;
  box-shadow: 0 32px 80px -15px rgba(193, 242, 103, 0.3);
}

.theme-lime-card .su-card h1 {
  color: #121214;
}

.theme-lime-card .su-card .su-sub {
  color: #4a5c1e;
}

.theme-lime-card .su-card .su-badge {
  background: #141416;
  color: #c1f267;
}

.theme-lime-card .su-card .su-field input {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.12);
  color: #121214;
}

.theme-lime-card .su-card .su-field input::placeholder {
  color: #7b8863;
}

.theme-lime-card .su-card .su-field input:focus-visible {
  border-color: #121214;
  box-shadow: 0 0 0 3px rgba(18, 18, 20, 0.15);
}

.theme-lime-card .su-card .su-row {
  color: #42521c;
}

.theme-lime-card .su-card .su-link {
  color: #1f270a;
  font-weight: 500;
}

.theme-lime-card .su-card .su-submit {
  background: #141416;
  color: #ffffff;
}

.theme-lime-card .su-card .su-submit:hover:not(:disabled) {
  background: #000000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

/* Header & Typography */
.su-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  margin-bottom: 24px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
}
.su-badge {
  font: 500 11px 'JetBrains Mono', monospace;
  background: #232326;
  color: #b0b0b8;
  padding: 7px 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  letter-spacing: -0.2px;
  white-space: nowrap;
}
.su h1 {
  font-size: 29px;
  font-weight: 600;
  letter-spacing: -0.6px;
  margin-bottom: 8px;
  color: #ffffff;
  text-align: center;
  white-space: nowrap;
}
.su-sub {
  font-size: 13px;
  color: #8a8a94;
  margin-bottom: 30px;
  text-align: center;
  font-weight: 400;
}

/* Error Banner */
.su-err {
  width: 100%;
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 16px;
  font: 400 11.5px 'JetBrains Mono', monospace;
  line-height: 1.4;
  text-align: center;
  animation: suErrShake 0.3s ease;
}

@keyframes suErrShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* Form Fields */
.su-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.su-field {
  position: relative;
  width: 100%;
  height: 48px;
  margin-bottom: 11px;
}
.su-field input {
  width: 100%;
  height: 100%;
  background: #1c1c20;
  border: 1px solid #2d2d34;
  border-radius: 14px;
  padding: 0 46px 0 16px;
  font: 400 13px 'Manrope', sans-serif;
  color: #f5f5f7;
  outline: none;
  transition: all 0.2s ease;
}
.su-field input::placeholder {
  color: #72727e;
}
.su-field input:focus-visible {
  border-color: #c1f267;
  background: #202025;
  box-shadow: 0 0 0 3px rgba(193, 242, 103, 0.16);
}
.su-eye {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: 0;
  color: #72727e;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 4px;
  border-radius: 6px;
  transition: color 0.15s;
}
.su-eye:hover {
  color: #f2f2f2;
}

/* Checkbox & Forgot Password Row */
.su-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 4px;
  margin-bottom: 4px;
  font: 400 11.5px 'JetBrains Mono', monospace;
  color: #8c8c96;
}
.su-chk {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
}
.su-chk input {
  cursor: pointer;
  accent-color: #c1f267;
  width: 14px;
  height: 14px;
  border-radius: 4px;
}
.su-link {
  color: #8c8c96;
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  transition: color 0.15s;
}
.su-link:hover {
  color: #c1f267;
}

/* Submit Button */
.su-submit {
  width: 100%;
  height: 48px;
  margin-top: 24px;
  border: 0;
  border-radius: 14px;
  background: #f0f0f2;
  color: #121214;
  font: 600 14px 'Manrope', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}
.su-submit:hover:not(:disabled) {
  background: #ffffff;
  transform: translateY(-1.5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.su-submit:active:not(:disabled) {
  transform: translateY(0);
}
.su-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Spinner */
.su-spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(18, 18, 20, 0.25);
  border-top-color: #121214;
  border-radius: 50%;
  animation: suSpin 0.8s linear infinite;
}
@keyframes suSpin {
  to { transform: rotate(360deg); }
}

/* Quick Fill Demo Roster (Subtle footer) */
.su-quick-roster {
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.theme-lime-card .su-quick-roster {
  border-top-color: rgba(0, 0, 0, 0.1);
}
.su-roster-title {
  font: 500 10px 'JetBrains Mono', monospace;
  color: #6a6a74;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.theme-lime-card .su-roster-title {
  color: #4a5c1e;
}
.su-roster-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}
.su-roster-btn {
  font: 500 11px 'Manrope', sans-serif;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #a8a8b2;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.su-roster-btn:hover {
  background: rgba(193, 242, 103, 0.15);
  border-color: #c1f267;
  color: #ffffff;
}
.theme-lime-card .su-roster-btn {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.12);
  color: #2b3612;
}
.theme-lime-card .su-roster-btn:hover {
  background: #141416;
  color: #ffffff;
}

@media (max-width: 480px) {
  .su-card {
    padding: 38px 24px 34px;
    border-radius: 28px;
  }
  .su-theme-bar {
    top: 12px;
    right: 12px;
  }
}
`;

const Logo = () => (
  <img src="/logo.png" alt="Hyna Studio" className="su-logo" />
);

const Eye = ({ off }: { off: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.8" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [bgTheme, setBgTheme] = useState<'lime-canvas' | 'dark-canvas' | 'lime-card'>('lime-canvas');
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginIdentifier = identifier.trim();

    if (!loginIdentifier || !password) {
      setErrorMessage('Please enter your email or username and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await login(loginIdentifier, password);

      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials or user not found.');
        toast.error(result.error || 'Authentication failed');
        setIsLoading(false);
        return;
      }

      toast.success('Authenticated successfully. Loading your dashboard...');

      let targetRoute = '/member/dashboard';
      if (result.role === 'admin') {
        targetRoute = '/admin/dashboard';
      } else if (result.role === 'manager') {
        targetRoute = '/manager/dashboard';
      }

      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Unexpected authentication error');
      toast.error('Could not authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (idVal: string, pwVal: string) => {
    setIdentifier(idVal);
    setPassword(pwVal);
    setErrorMessage('');
  };

  return (
    <div className={`su-root theme-${bgTheme}`}>
      <style>{css}</style>

      {/* Ambient background glows */}
      <div className="su-ambient" aria-hidden="true">
        <div className="su-ambient-circle su-ambient-1" />
        <div className="su-ambient-circle su-ambient-2" />
      </div>

      {/* Theme selector */}
      <div className="su-theme-bar">
        <button
          type="button"
          onClick={() => setBgTheme('lime-canvas')}
          className={`su-theme-btn ${bgTheme === 'lime-canvas' ? 'active' : ''}`}
          title="Lime Green Background (Image 2)"
        >
          <span className="su-theme-dot" style={{ background: '#c1f267' }} />
          <span>Lime Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setBgTheme('dark-canvas')}
          className={`su-theme-btn ${bgTheme === 'dark-canvas' ? 'active' : ''}`}
          title="Pure Dark Canvas"
        >
          <span className="su-theme-dot" style={{ background: '#1c1c20' }} />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setBgTheme('lime-card')}
          className={`su-theme-btn ${bgTheme === 'lime-card' ? 'active' : ''}`}
          title="Lime Card Theme"
        >
          <span className="su-theme-dot" style={{ background: '#dcf89d' }} />
          <span>Lime Card</span>
        </button>
      </div>

      <div className="su-card-container">
        <section className="su-card">
          <Logo />

          <span className="su-badge">Welcome to Hyna studio</span>

          <h1>Sign in account</h1>

          <p className="su-sub">Enter your credentials to access your account</p>

          {errorMessage && <div className="su-err">{errorMessage}</div>}

          <form onSubmit={handleSignIn} className="su-form">
            <div className="su-field">
              <input
                type="text"
                placeholder="Email or Username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="username"
                required
              />
            </div>

            <div className="su-field">
              <input
                type={show ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="su-eye"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                <Eye off={!show} />
              </button>
            </div>

            <div className="su-row">
              <label className="su-chk">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="su-link"
                onClick={() => toast.info('Please contact your administrator for password recovery.')}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="su-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="su-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access (Subtle helper) */}
          <div className="su-quick-roster">
            <span className="su-roster-title">Demo Quick Fill</span>
            <div className="su-roster-chips">
              <button
                type="button"
                className="su-roster-btn"
                onClick={() => handleQuickFill('vignesh@hynastudio.com', 'admin123')}
              >
                Vignesh (CEO)
              </button>
              <button
                type="button"
                className="su-roster-btn"
                onClick={() => handleQuickFill('asthamil@hynastudio.com', 'manager123')}
              >
                Asthamil (Manager)
              </button>
              <button
                type="button"
                className="su-roster-btn"
                onClick={() => handleQuickFill('akshaya@hynastudio.com', 'member123')}
              >
                Akshaya (Member)
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
