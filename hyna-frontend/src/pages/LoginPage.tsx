import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.su * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.su {
  height: 100vh;
  width: 100vw;
  background: #0d0e12;
  background-image: 
    radial-gradient(at 10% 10%, rgba(32, 65, 240, 0.08) 0px, transparent 50%),
    radial-gradient(at 90% 90%, rgba(20, 245, 140, 0.05) 0px, transparent 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
  color: #f2f2f2;
  position: relative;
  overflow: hidden;
}

.su-wrap {
  display: grid;
  grid-template-columns: minmax(420px, 470px) 1fr;
  gap: 16px;
  width: 100%;
  height: 100%;
  max-width: 1600px;
}

.su-card {
  background: #14151a;
  border: 1px solid #22232a;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 36px 32px;
  position: relative;
  overflow-y: auto;
  box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
}

.su-card::-webkit-scrollbar {
  width: 4px;
}
.su-card::-webkit-scrollbar-thumb {
  background: #2a2a32;
  border-radius: 4px;
}

.su-card-inner {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto 0;
}

.su-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
  transition: transform 0.2s ease;
}
.su-logo:hover {
  transform: scale(1.05);
}

.su-badge {
  font: 500 11px 'JetBrains Mono', monospace;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #a1a1aa;
  padding: 6px 14px;
  border-radius: 20px;
  margin-bottom: 16px;
  letter-spacing: 0.2px;
}

.su h1 {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
  color: #ffffff;
  text-align: center;
}

.su-sub {
  font-size: 13.5px;
  color: #8e8e98;
  margin-bottom: 28px;
  text-align: center;
}

.su-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.su-err {
  width: 100%;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 16px;
  font: 400 12px 'JetBrains Mono', monospace;
  line-height: 1.4;
  text-align: center;
}

.su-field {
  position: relative;
  width: 100%;
  height: 46px;
  margin-bottom: 14px;
}

.su-field input {
  width: 100%;
  height: 100%;
  background: #1a1b22;
  border: 1px solid #282933;
  border-radius: 12px;
  padding: 0 42px 0 16px;
  font: 400 14px 'Manrope', sans-serif;
  color: #f2f2f2;
  outline: none;
  transition: all 0.15s ease;
}

.su-field input::placeholder {
  color: #6c6d78;
}

.su-field input:focus {
  border-color: #3b82f6;
  background: #1e1f28;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.su-eye {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: 0;
  color: #71717a;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 6px;
  border-radius: 6px;
  transition: color 0.15s;
}
.su-eye:hover {
  color: #e4e4e7;
}

.su-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 2px;
  font-size: 13px;
  color: #8e8e98;
}

.su-chk {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.su-chk input {
  cursor: pointer;
  accent-color: #14f58c;
  width: 15px;
  height: 15px;
  border-radius: 4px;
}

.su-link {
  color: #8e8e98;
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  transition: color 0.15s;
}
.su-link:hover {
  color: #ffffff;
}

.su-submit {
  width: 100%;
  height: 46px;
  margin-top: 22px;
  border: 0;
  border-radius: 12px;
  background: #f4f4f6;
  color: #0d0e12;
  font: 600 14px 'Manrope', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.08);
}
.su-submit:hover:not(:disabled) {
  background: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(255, 255, 255, 0.15);
}
.su-submit:active:not(:disabled) {
  transform: translateY(0);
}
.su-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.su-footer {
  font: 400 11.5px 'JetBrains Mono', monospace;
  color: #555562;
  text-align: center;
  margin-top: 20px;
}

.su-grid {
  display: grid;
  grid-template-columns: minmax(70px, 90px) 1fr 1fr minmax(70px, 90px);
  grid-template-rows: 1fr 1.6fr 1.6fr 1fr;
  gap: 12px;
  height: 100%;
  width: 100%;
}

.su-t {
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.su-t:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
}

.su-img {
  background:
    radial-gradient(ellipse 60% 45% at 30% 25%, #a6b52a 0 35%, transparent 70%),
    radial-gradient(ellipse 50% 60% at 75% 60%, #7f8f22 0 30%, transparent 70%),
    linear-gradient(160deg, #c9cdb8, #dfe1d2 60%, #b9bea6);
}
.su-img.b {
  background:
    radial-gradient(ellipse 55% 55% at 45% 30%, #93a325 0 35%, transparent 72%),
    radial-gradient(ellipse 45% 30% at 55% 88%, #3f4436 0 50%, transparent 75%),
    linear-gradient(180deg, #d6d9c6, #c4c8b0);
}
.su-img.c {
  background:
    radial-gradient(ellipse 45% 65% at 80% 40%, #8a9a24 0 35%, transparent 72%),
    linear-gradient(200deg, #dfe2d3, #d0d4c0);
}
.su-img.d {
  background: linear-gradient(150deg, #b9c0a4, #8e9678 60%, #a9b08f);
}
.su-img.e {
  background: radial-gradient(ellipse 60% 50% at 40% 40%, #e5e7db 0 40%, transparent 75%), linear-gradient(180deg, #a5ab92, #7c8468);
}

.su-dark {
  background: #14151a;
  border: 1px solid #22232a;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24px 22px;
  position: relative;
}

.su-chips {
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.su-chip {
  font: 500 11px 'JetBrains Mono', monospace;
  background: #272832;
  color: #e4e4e7;
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.su-chip.m {
  opacity: 0.7;
  transform: translateY(-4px) scale(0.95);
}
.su-chip.n {
  background: #323340;
  opacity: 0.9;
}
.su-chip.a {
  background: #f4f4f6;
  color: #111;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(0,0,0,0.35);
}

.su-spin {
  width: 12px;
  height: 12px;
  border: 2px solid #888;
  border-top-color: #111;
  border-radius: 50%;
  animation: sp 1s linear infinite;
}
@keyframes sp {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .su-spin { animation: none; }
}

.su-dark h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
  letter-spacing: -0.3px;
  color: #ffffff;
}
.su-dark p {
  font-size: 12.5px;
  color: #9e9ea8;
  line-height: 1.4;
}

.su-yellow {
  background: #ebff38;
  color: #111;
  padding: 24px 22px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
}
.su-yellow h3 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
  color: #0d0e12;
}
.su-yellow p {
  font-size: 12px;
  line-height: 1.45;
  max-width: 180px;
  color: #27272a;
  font-weight: 500;
}
.su-shape {
  position: absolute;
  right: 20px;
  bottom: 18px;
  width: 44px;
  height: 44px;
}

.su-green {
  background: #14f58c;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.su-black {
  background: #0d0e12;
  border: 1px solid #1c1d24;
}

@media (max-width: 1024px) {
  .su-wrap {
    grid-template-columns: 1fr;
    max-width: 480px;
    height: auto;
    min-height: 100%;
  }
  .su-grid {
    display: none;
  }
  .su-card {
    padding: 40px 24px;
    min-height: 100%;
  }
}

@media (max-height: 680px) {
  .su {
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }
  .su-card {
    padding: 24px;
  }
  .su-card-inner {
    margin: 12px 0;
  }
}
`;

const Logo = () => (
  <img src="/logo.png" alt="Hyna Studio" className="su-logo" />
);

const Eye = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.500 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.800" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

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


  return (
    <div className="su-root">
      <style>{css}</style>

      {/* Dark background with glowing floating lime bubbles */}
      <div className="su-bubbles-container" aria-hidden="true">
        <div className="su-bubble su-bubble-center" />
        <div className="su-bubble su-bubble-1" />
        <div className="su-bubble su-bubble-2" />
        <div className="su-bubble su-bubble-3" />
        <div className="su-bubble su-bubble-4" />
        <div className="su-bubble su-bubble-5" />
      </div>

      <div className="su-card-container">
        <section className="su-card">
          <div className="su-card-inner">
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
                      width="15"
                      height="15"
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
          </div>

          <div className="su-footer">
            End-to-end encrypted session • Hyna Studio
          </div>
        </section>

        <section className="su-grid" aria-hidden="true">
          <div className="su-t su-img" />
          <div className="su-t su-img b" />
          <div className="su-t su-img c" />
          <div className="su-t su-img d" />

          <div className="su-t su-img e" />
          <div className="su-t su-img b" />
          <div className="su-t su-img c" />
          <div className="su-t su-img d" />

          <div className="su-t su-img d" />
          <div className="su-t su-dark">
            <div className="su-chips">
              <div className="su-chip m"><Check />verify_session</div>
              <div className="su-chip n"><Check />decrypt_vault</div>
              <div className="su-chip a"><span className="su-spin" />sync_workspace..</div>
            </div>
            <h3>Fast Access</h3>
            <p>Secure session access in milliseconds</p>
          </div>
          <div className="su-t su-yellow">
            <h3>Encrypted<br />Workspace</h3>
            <p>End-to-end encrypted session with database role enforcement</p>
            <svg className="su-shape" viewBox="0 0 32 32" fill="#111"><circle cx="11" cy="11" r="9" /><path d="M14 16h13a3 3 0 0 1 3 3v9H17a3 3 0 0 1-3-3v-9Z" /></svg>
          </div>
          <div className="su-t su-green">
            <img
              src="/logo.png"
              alt="Hyna Studio Glyph"
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                filter: 'brightness(0)',
              }}
            />
          </div>

          <div className="su-t su-img e" />
          <div className="su-t su-black" />
          <div className="su-t su-img e" />
          <div className="su-t su-img d" />
        </section>
      </div>
    </div>
  );
}

export default LoginPage;

