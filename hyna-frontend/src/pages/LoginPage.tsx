import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { usePWA } from '@/hooks/usePWA';
import { InstallAppModal } from '@/components/common/InstallAppModal';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
.su *{box-sizing:border-box;margin:0}
.su{min-height:100vh;background:#111;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'Manrope',system-ui,sans-serif;color:#f2f2f2;position:relative}
.su-wrap{display:grid;grid-template-columns:367px 1fr;gap:11px;width:100%;max-width:940px;height:590px}
.su-card{background:#161616;border:1px solid #232323;border-radius:16px;display:flex;flex-direction:column;align-items:center;padding:36px 40px 28px;position:relative;overflow-y:auto}
.su-card::-webkit-scrollbar{width:4px}
.su-card::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:4px}
.su-top-bar{position:absolute;top:16px;right:16px;display:flex;gap:8px}
.su-pwa-btn{background:#1f1f1f;border:1px solid #2b2b2b;color:#a0a0a0;border-radius:8px;padding:4px 8px;font:400 7.5px 'JetBrains Mono',monospace;display:flex;align-items:center;gap:4px;cursor:pointer;transition:all .15s}
.su-pwa-btn:hover{background:#282828;color:#f2f2f2}
.su-logo{width:22px;height:22px;margin-bottom:44px;color:#e8e8e8}
.su-badge{font:400 8px 'JetBrains Mono',monospace;background:#262626;color:#bdbdbd;padding:8px 8px;border-radius:9px;margin-bottom:14px}
.su h1{font-size:23px;font-weight:500;letter-spacing:-.4px;margin-bottom:8px;white-space:nowrap}
.su-sub{font-size:8.5px;color:#8a8a8a;margin-bottom:28px;white-space:nowrap}
.su-err{width:211px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);color:#fca5a5;padding:6px 8px;border-radius:8px;margin-bottom:12px;font:400 8px 'JetBrains Mono',monospace;line-height:1.3;text-align:center}
.su-field{position:relative;width:211px;height:37px;margin-bottom:7px}
.su-field input, .su-field select{width:100%;height:100%;background:#191919;border:1px solid #2c2c2c;border-radius:12px;padding:0 34px 0 11px;font:400 8.5px 'Manrope',sans-serif;color:#f2f2f2;outline:none;transition:border-color .15s}
.su-field select{padding-right:12px;cursor:pointer}
.su-field input::placeholder{color:#8a8a8a}
.su-field input:focus-visible, .su-field select:focus-visible{border-color:#7a7a7a}
.su-eye{position:absolute;right:9px;top:50%;transform:translateY(-50%);background:none;border:0;color:#8a8a8a;cursor:pointer;display:grid;place-items:center;padding:2px}
.su-row{display:flex;align-items:center;justify-content:space-between;width:211px;margin-top:2px;font:400 8px 'JetBrains Mono',monospace;color:#8a8a8a}
.su-chk{display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
.su-chk input{cursor:pointer;accent-color:#14f58c;width:10px;height:10px}
.su-link{color:#8a8a8a;text-decoration:none;cursor:pointer;background:none;border:none;padding:0;font:inherit;transition:color .15s}
.su-link:hover{color:#f2f2f2}
.su-submit{width:211px;height:37px;margin-top:20px;border:0;border-radius:12px;background:#e9e9e9;color:#111;font:500 9px 'Manrope',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:background .15s}
.su-submit:hover:not(:disabled){background:#fff}
.su-submit:disabled{opacity:0.6;cursor:not-allowed}
.su-login{margin-top:14px;display:flex;align-items:center;gap:6px;font:400 8px 'JetBrains Mono',monospace;color:#6f6f6f}
.su-login button{background:#1c1c1c;border:1px solid #2c2c2c;color:#e0e0e0;border-radius:6px;padding:5px 7px;font:400 8px 'Manrope',sans-serif;cursor:pointer;transition:background .15s}
.su-login button:hover{background:#2a2a2a}
.su-grid{display:grid;grid-template-columns:80px 1fr 1fr 80px;grid-template-rows:100px 190px 190px 1fr;gap:7px}
.su-t{border-radius:16px;overflow:hidden;position:relative}
.su-img{background:
 radial-gradient(ellipse 60% 45% at 30% 25%,#a6b52a 0 35%,transparent 70%),
 radial-gradient(ellipse 50% 60% at 75% 60%,#7f8f22 0 30%,transparent 70%),
 linear-gradient(160deg,#c9cdb8,#dfe1d2 60%,#b9bea6)}
.su-img.b{background:
 radial-gradient(ellipse 55% 55% at 45% 30%,#93a325 0 35%,transparent 72%),
 radial-gradient(ellipse 45% 30% at 55% 88%,#3f4436 0 50%,transparent 75%),
 linear-gradient(180deg,#d6d9c6,#c4c8b0)}
.su-img.c{background:
 radial-gradient(ellipse 45% 65% at 80% 40%,#8a9a24 0 35%,transparent 72%),
 linear-gradient(200deg,#dfe2d3,#d0d4c0)}
.su-img.d{background:linear-gradient(150deg,#b9c0a4,#8e9678 60%,#a9b08f)}
.su-img.e{background:radial-gradient(ellipse 60% 50% at 40% 40%,#e5e7db 0 40%,transparent 75%),linear-gradient(180deg,#a5ab92,#7c8468)}
.su-dark{background:#151515;display:flex;flex-direction:column;justify-content:flex-end;padding:16px 15px 20px}
.su-chips{position:absolute;top:0;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.su-chip{font:400 8px 'JetBrains Mono',monospace;background:#b4b4b0;color:#222;border-radius:12px;padding:8px 12px;display:flex;align-items:center;gap:6px;width:min-content;white-space:nowrap}
.su-chip.m{width:97px;height:26px;opacity:.75;transform:translateY(-12px)}
.su-chip.n{width:98px;height:26px;font-size:8.5px;background:#a8a8a4}
.su-chip.a{width:120px;height:31px;background:#f3f3f0;color:#111;font-size:9px}
.su-spin{width:9px;height:9px;border:1.5px solid #999;border-top-color:#111;border-radius:50%;animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.su-spin{animation:none}}
.su-dark h3{font-size:14px;font-weight:500;margin-bottom:6px}
.su-dark p{font-size:8.5px;color:#b0b0b0}
.su-yellow{background:#ecff3d;color:#111;padding:20px 16px}
.su-yellow h3{font-size:15px;font-weight:500;line-height:1.2;margin-bottom:8px;letter-spacing:-.2px}
.su-yellow p{font-size:8.5px;line-height:1.35;max-width:135px}
.su-shape{position:absolute;right:16px;bottom:14px;width:32px;height:32px}
.su-green{background:#14f58c;display:grid;place-items:center}
.su-black{background:#050505}
@media (max-width:820px){.su-wrap{grid-template-columns:1fr;height:auto;max-width:440px}.su-grid{display:none}.su-card{padding:28px 24px 32px}}
`;

const Logo = () => (
  <svg className="su-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3c1.2 0 2 .6 2.6 1.6l6 10.2c.7 1.2.1 3.2-1.9 3.2H5.3c-2 0-2.6-2-1.9-3.2l6-10.2C10 3.6 10.8 3 12 3Z" />
    <path d="M8.5 15.5c1-1 2-1.4 3.5-1.4s2.5.4 3.5 1.4" />
  </svg>
);



const Eye = ({ off }: { off: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.500 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.800" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const Check = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

export function LoginPage() {
  const navigate = useNavigate();
  const { login, signUp } = useAuthStore();
  const { isInstallable, isInstalled, showModal, setShowModal, promptInstall } = usePWA();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Form states
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    department: 'Engineering',
    employeeId: '',
  });

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginIdentifier = form.email.trim() || form.username.trim();

    if (!loginIdentifier || !form.password) {
      setErrorMessage('Please enter your email or username and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await login(loginIdentifier, form.password);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = form.username.trim();
    let regEmail = form.email.trim();

    if (!displayName || !regEmail || !form.password) {
      setErrorMessage('Please fill in all required registration fields.');
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!regEmail.includes('@')) {
      regEmail = `${regEmail.toLowerCase()}@hynastudio.com`;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      let userDesignation = 'Software Engineer';
      let userDepartment = form.department.trim();
      const nameLower = displayName.toLowerCase();
      const emailLower = regEmail.toLowerCase();
      let userEmployeeId = form.employeeId.trim() || undefined;

      if (nameLower.includes('dharshan') || emailLower.includes('dharshan')) {
        userDesignation = 'Admin';
        userDepartment = 'Executive';
        userEmployeeId = userEmployeeId || 'EMP-003';
      } else if (nameLower.includes('vignesh') || emailLower.includes('vignesh')) {
        userDesignation = 'CEO';
        userDepartment = 'Executive';
        userEmployeeId = userEmployeeId || 'EMP-001';
      } else if (nameLower.includes('jashwin') || emailLower.includes('jashwin')) {
        userDesignation = 'COO';
        userDepartment = 'Executive';
        userEmployeeId = userEmployeeId || 'EMP-002';
      } else if (nameLower.includes('asthamil') || emailLower.includes('asthamil') || userEmployeeId?.toUpperCase() === 'EMP-004') {
        userDesignation = 'Engineering Manager';
        userDepartment = 'Engineering';
        userEmployeeId = 'EMP-004';
      }

      const result = await signUp({
        name: displayName,
        email: regEmail,
        password: form.password,
        department: userDepartment,
        designation: userDesignation,
        employeeId: userEmployeeId,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed.');
        toast.error(result.error || 'Could not register account');
        setIsLoading(false);
        return;
      }

      toast.info('Account registered! Automatically signing you in...');
      const loginResult = await login(regEmail, form.password);

      if (loginResult.success) {
        toast.success('Authenticated successfully! Loading your dashboard...');
        const targetRoute =
          loginResult.role === 'admin'
            ? '/admin/dashboard'
            : loginResult.role === 'manager'
            ? '/manager/dashboard'
            : '/member/dashboard';

        navigate(targetRoute, { replace: true });
      } else {
        setMode('login');
        setErrorMessage('Registration successful. Please log in.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration error');
      toast.error('Could not complete registration');
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrorMessage('');
  };

  return (
    <div className="su">
      <style>{css}</style>
      <div className="su-wrap">
        <section className="su-card">
          {/* Optional subtle PWA install link */}
          <div className="su-top-bar">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="su-pwa-btn"
              title="Install App"
            >
              <Download size={10} />
              <span>{isInstalled ? 'App Ready' : 'Install'}</span>
            </button>
          </div>

          <Logo />

          <span className="su-badge">
            {mode === 'login' ? 'Welcome back to studio' : 'Create your unique design'}
          </span>

          <h1>{mode === 'login' ? 'Sign in account' : 'Sign up account'}</h1>

          <p className="su-sub">
            {mode === 'login'
              ? 'Enter your credentials to access your account'
              : 'Enter your personal data to create your account'}
          </p>

          {errorMessage && <div className="su-err">{errorMessage}</div>}

          <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {mode === 'signup' && (
              <>
                <div className="su-field">
                  <input
                    placeholder="Full name"
                    value={form.username}
                    onChange={setField('username')}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="su-field">
                  <select
                    value={form.department}
                    onChange={setField('department')}
                    aria-label="Select Department"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </>
            )}

            <div className="su-field">
              <input
                type={mode === 'login' ? 'text' : 'email'}
                placeholder={mode === 'login' ? 'Email or Username' : 'Email address'}
                value={form.email}
                onChange={setField('email')}
                autoComplete={mode === 'login' ? 'username' : 'email'}
                required
              />
            </div>

            <div className="su-field">
              <input
                type={show ? 'text' : 'password'}
                placeholder={mode === 'login' ? 'Password' : 'Enter your password'}
                value={form.password}
                onChange={setField('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

            {mode === 'login' && (
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
            )}

            <button type="submit" className="su-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="su-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign in' : 'Sign up'}</span>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 12h16M14 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="su-login">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
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
              {mode === 'login' ? (
                <>
                  <div className="su-chip m"><Check />verify_session</div>
                  <div className="su-chip n"><Check />decrypt_vault</div>
                  <div className="su-chip a"><span className="su-spin" />sync_workspace..</div>
                </>
              ) : (
                <>
                  <div className="su-chip m"><Check />choose_template</div>
                  <div className="su-chip n"><Check />setup_scene</div>
                  <div className="su-chip a"><span className="su-spin" />generate_3d_object..</div>
                </>
              )}
            </div>
            <h3>{mode === 'login' ? 'Fast Access' : 'Fast Generation'}</h3>
            <p>{mode === 'login' ? 'Secure session access in milliseconds' : 'Create unique 3D objects in seconds'}</p>
          </div>
          <div className="su-t su-yellow">
            <h3>{mode === 'login' ? <>Encrypted<br />Workspace</> : <>Maximum<br />Customization</>}</h3>
            <p>{mode === 'login' ? 'End-to-end encrypted session with database role enforcement' : 'Tailor every aspect of your 3D object to your specifications'}</p>
            <svg className="su-shape" viewBox="0 0 32 32" fill="#111"><circle cx="11" cy="11" r="9" /><path d="M14 16h13a3 3 0 0 1 3 3v9H17a3 3 0 0 1-3-3v-9Z" /></svg>
          </div>
          <div className="su-t su-green">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinejoin="round" style={{ transform: "translateX(18px)" }}>
              <path d="M12 3c1.200 0 2 .6 2.600 1.600l6 10.200c.7 1.200.1 3.200-1.900 3.200H5.300c-2 0-2.600-2-1.900-3.200l6-10.200C10 3.600 10.800 3 12 3Z" />
            </svg>
          </div>

          <div className="su-t su-img e" />
          <div className="su-t su-black" />
          <div className="su-t su-img e" />
          <div className="su-t su-img d" />
        </section>
      </div>

      {/* PWA Install Modal */}
      <InstallAppModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onInstallPrompt={promptInstall}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </div>
  );
}

export default LoginPage;
