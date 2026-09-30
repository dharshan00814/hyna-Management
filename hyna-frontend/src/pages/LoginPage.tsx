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
  background-color: #08090c;
  background-image: 
    radial-gradient(ellipse at 50% 0%, #11141a 0%, transparent 60%),
    radial-gradient(ellipse at 50% 100%, #0c0f14 0%, transparent 70%),
    linear-gradient(180deg, #090a0d 0%, #050608 100%);
}

/* Glowing Ambient Lime Bubbles */
.su-bubbles-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.su-bubble {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform, opacity;
}

/* Core backlight glow directly behind login card */
.su-bubble-center {
  width: 540px;
  height: 540px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(193, 242, 103, 0.28) 0%, rgba(160, 230, 60, 0.12) 48%, transparent 70%);
  filter: blur(65px);
  animation: pulseCoreGlow 8s ease-in-out infinite alternate;
}

/* Top-left vibrant lime bubble */
.su-bubble-1 {
  width: 460px;
  height: 460px;
  top: -80px;
  left: -80px;
  background: radial-gradient(circle, rgba(200, 246, 115, 0.42) 0%, rgba(180, 235, 75, 0.18) 50%, transparent 70%);
  filter: blur(60px);
  animation: floatBubble1 13s ease-in-out infinite;
}

/* Bottom-right vibrant lime bubble */
.su-bubble-2 {
  width: 480px;
  height: 480px;
  bottom: -110px;
  right: -90px;
  background: radial-gradient(circle, rgba(193, 242, 103, 0.38) 0%, rgba(165, 230, 55, 0.16) 52%, transparent 70%);
  filter: blur(65px);
  animation: floatBubble2 15s ease-in-out infinite;
}

/* Top-right floating lime bubble */
.su-bubble-3 {
  width: 340px;
  height: 340px;
  top: 12%;
  right: 8%;
  background: radial-gradient(circle, rgba(220, 248, 140, 0.32) 0%, rgba(193, 242, 103, 0.12) 50%, transparent 70%);
  filter: blur(52px);
  animation: floatBubble3 11s ease-in-out infinite;
}

/* Bottom-left floating lime bubble */
.su-bubble-4 {
  width: 380px;
  height: 380px;
  bottom: 8%;
  left: 6%;
  background: radial-gradient(circle, rgba(185, 240, 80, 0.34) 0%, rgba(160, 225, 50, 0.14) 50%, transparent 70%);
  filter: blur(58px);
  animation: floatBubble1 17s ease-in-out infinite reverse;
}

/* Subtle top-center floating lime bubble */
.su-bubble-5 {
  width: 260px;
  height: 260px;
  top: 5%;
  left: 45%;
  background: radial-gradient(circle, rgba(210, 250, 130, 0.28) 0%, transparent 70%);
  filter: blur(48px);
  animation: floatBubble2 9s ease-in-out infinite;
}

@keyframes floatBubble1 {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(55px, -40px) scale(1.08);
  }
  66% {
    transform: translate(-35px, 30px) scale(0.96);
  }
}

@keyframes floatBubble2 {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(-65px, -45px) scale(1.1);
  }
  80% {
    transform: translate(40px, 25px) scale(0.94);
  }
}

@keyframes floatBubble3 {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(45px, 50px) scale(1.12);
  }
}

@keyframes pulseCoreGlow {
  0%, 100% {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.65;
    transform: translate(-50%, -50%) scale(1.15);
  }
}

/* Main Login Card */
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
  background: rgba(18, 19, 23, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 38px 44px;
  position: relative;
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  box-shadow: 
    0 36px 90px -18px rgba(0, 0, 0, 0.8),
    0 0 50px -15px rgba(193, 242, 103, 0.18),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.12);
  transition: all 0.3s ease;
}

/* Header & Typography */
.su-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  margin-bottom: 24px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}
.su-badge {
  font: 500 13px 'JetBrains Mono', monospace;
  background: rgba(34, 34, 38, 0.9);
  color: #c4c4cd;
  padding: 8px 18px;
  border-radius: 12px;
  margin-bottom: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  letter-spacing: -0.2px;
  white-space: nowrap;
}
.su-card h1,
.su h1 {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.8px;
  margin-bottom: 10px;
  color: #ffffff;
  text-align: center;
  line-height: 1.2;
}
.su-sub {
  font-size: 15px;
  color: #9da0aa;
  margin-bottom: 30px;
  text-align: center;
  font-weight: 400;
  line-height: 1.45;
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
  background: rgba(28, 28, 33, 0.85);
  border: 1px solid #2d2d35;
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
  background: #202026;
  box-shadow: 0 0 0 3px rgba(193, 242, 103, 0.18);
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

/* Submit Button - Satin Gloss Lime Theme matching reference */
.su-submit {
  width: 100%;
  height: 50px;
  margin-top: 24px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 14px;
  background: 
    radial-gradient(circle at 40% 46%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.35) 28%, transparent 64%),
    linear-gradient(132deg, #d8f8a2 0%, #ebfcd2 22%, #fdfffa 46%, #daf79b 72%, #cbf584 100%);
  color: #000000;
  font: 600 16px 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.35px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 8px 24px -4px rgba(193, 242, 103, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.18),
    inset 0 1px 2px rgba(255, 255, 255, 0.95),
    inset 0 -1px 2px rgba(150, 215, 45, 0.35);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.su-submit::before {
  content: '';
  position: absolute;
  top: 0;
  left: -120%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
  transform: skewX(-20deg);
  transition: left 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
.su-submit:hover:not(:disabled)::before {
  left: 140%;
}
.su-submit:hover:not(:disabled) {
  transform: translateY(-1.5px);
  filter: brightness(1.03);
  box-shadow: 
    0 12px 30px -4px rgba(193, 242, 103, 0.6),
    0 0 24px rgba(225, 255, 140, 0.45),
    inset 0 1px 2.5px #ffffff,
    inset 0 -1px 2px rgba(150, 215, 45, 0.35);
}
.su-submit:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
  filter: brightness(0.98);
}
.su-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.2);
}

/* Spinner */
.su-spin {
  width: 16px;
  height: 16px;
  border: 2.2px solid rgba(0, 0, 0, 0.22);
  border-top-color: #000000;
  border-radius: 50%;
  animation: suSpin 0.8s linear infinite;
}
@keyframes suSpin {
  to { transform: rotate(360deg); }
}


@media (max-width: 480px) {
  .su-card {
    padding: 38px 24px 34px;
    border-radius: 28px;
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

            <button type="submit" className="su-submit" disabled={isLoading} id="login-submit-button">
              {isLoading ? (
                <>
                  <span className="su-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

        </section>
      </div>
    </div>
  );
}

export default LoginPage;
