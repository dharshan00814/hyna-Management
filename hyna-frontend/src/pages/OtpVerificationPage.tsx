import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import './OtpVerificationPage.css';

export function OtpVerificationPage() {
  const navigate = useNavigate();
  const { effectiveRole } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [stateClass, setStateClass] = useState('zone');
  const [title, setTitle] = useState("Let's verify your number");
  const [sub, setSub] = useState("We've sent a 4-digit code to your phone. It'll auto-verify once entered.");
  const [fade, setFade] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const [resendText, setResendText] = useState('Resend');
  const [resendDisabled, setResendDisabled] = useState(false);
  
  const cardRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Shards background generation
    const NS = "http://www.w3.org/2000/svg";
    const svg = svgRef.current;
    if (svg) {
      svg.innerHTML = ''; // Clear existing
      const W = 1600, H = 1000, cols = 10, rows = 7, cw = W / cols, ch = H / rows;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      let seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      const pts: number[][][] = [];
      for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        for (let c = 0; c <= cols; c++) {
          const jx = (c === 0 || c === cols) ? 0 : (rnd() - .5) * cw * .9;
          const jy = (r === 0 || r === rows) ? 0 : (rnd() - .5) * ch * .9;
          pts[r][c] = [c * cw + jx, r * ch + jy];
        }
      }
      function tri(a: number[], b: number[], c: number[]) {
        const p = document.createElementNS(NS, "polygon");
        const l = 8 + rnd() * 26, l2 = l + 6 + rnd() * 20, ang = Math.floor(rnd() * 360);
        const id = "g" + Math.floor(rnd() * 1e9);
        const g = document.createElementNS(NS, "linearGradient");
        g.setAttribute("id", id);
        g.setAttribute("gradientTransform", `rotate(${ang} .5 .5)`);
        g.innerHTML = `<stop offset="0" stop-color="hsl(240 4% ${l2}%)"/><stop offset="1" stop-color="hsl(240 6% ${l * .45}%)"/>`;
        svg?.appendChild(g);
        p.setAttribute("points", `${a.join(',')} ${b.join(',')} ${c.join(',')}`);
        p.setAttribute("fill", `url(#${id})`);
        p.setAttribute("stroke", "rgba(0,0,0,.85)");
        p.setAttribute("stroke-width", "2.2");
        svg?.appendChild(p);
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = pts[r][c], b = pts[r][c + 1], d = pts[r + 1][c], e = pts[r + 1][c + 1];
          if (rnd() > .5) { tri(a, b, d); tri(b, e, d); } else { tri(a, b, e); tri(a, e, d); }
        }
      }
    }

    const card = cardRef.current;
    const fine = window.matchMedia("(pointer:fine)").matches;
    let t = 0;
    let reqId: number;

    function tilt(x: number, y: number) {
      if (!card || !svg) return;
      const nx = x / window.innerWidth - .5, ny = y / window.innerHeight - .5;
      card.style.transform = `rotateY(${nx * 22}deg) rotateX(${-ny * 18}deg)`;
      svg.style.transform = `translate(${-nx * 26}px,${-ny * 20}px)`;
      const b = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((x - b.left) / b.width * 100) + "%");
      card.style.setProperty("--my", ((y - b.top) / b.height * 100) + "%");
    }

    const handlePointerMove = (e: PointerEvent) => tilt(e.clientX, e.clientY);
    const handlePointerLeave = () => { if (card) card.style.transform = ""; };

    if (fine) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerleave", handlePointerLeave);
    } else {
      const idle = () => {
        t += .012;
        if (card) card.style.transform = `rotateY(${Math.sin(t) * 7}deg) rotateX(${Math.cos(t * .8) * 5}deg)`;
        reqId = requestAnimationFrame(idle);
      };
      idle();
    }

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);

    return () => {
      if (fine) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerleave", handlePointerLeave);
      }
      if (reqId) cancelAnimationFrame(reqId);
    };
  }, []);

  const swap = (h: string, s: string) => {
    setFade(true);
    setTimeout(() => {
      setTitle(h);
      setSub(s);
      setFade(false);
    }, 300);
  };

  const handleComplete = () => {
    setBusy(true);
    setStateClass("zone state-loading");
    inputRefs.current.forEach(i => i?.blur());
    setTimeout(() => {
      setStateClass("zone state-done");
      swap("Verified successfully", "Your phone number has been verified.");
      setTimeout(() => {
        // Proceed to dashboard
        sessionStorage.setItem('otp_verified', 'true');
        const rolePrefix =
          effectiveRole === 'admin'
            ? '/admin'
            : effectiveRole === 'manager'
            ? '/manager'
            : '/member';
        navigate(`${rolePrefix}/dashboard`);
      }, 1500); // 1.5s after verification shows
    }, 1900);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    if (busy) return;
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otpValues];
    newOtp[i] = val;
    setOtpValues(newOtp);

    if (val && i < 3) {
      inputRefs.current[i + 1]?.focus();
    }
    
    // Check if complete
    if (newOtp.every(v => v !== '')) {
      handleComplete();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (busy) return;
    if (e.key === "Backspace" && !otpValues[i] && i > 0) {
      const newOtp = [...otpValues];
      newOtp[i - 1] = "";
      setOtpValues(newOtp);
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 3) inputRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (busy) return;
    const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!d) return;
    e.preventDefault();
    const newOtp = [...otpValues];
    d.split("").forEach((ch, k) => {
      newOtp[k] = ch;
    });
    setOtpValues(newOtp);
    inputRefs.current[Math.min(d.length, 3)]?.focus();
    if (newOtp.slice(0, d.length).every(v => v !== '')) {
      if (d.length === 4) handleComplete();
    }
  };

  const reset = () => {
    setBusy(false);
    setStateClass("zone");
    setOtpValues(['', '', '', '']);
    swap("Let's verify your number", "We've sent a 4-digit code to your phone. It'll auto-verify once entered.");
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 400);
  };

  const handleResend = () => {
    if (resendDisabled) return;
    reset();
    setResendDisabled(true);
    let s = 20;
    setResendText(`Resend (${s})`);
    const iv = setInterval(() => {
      s--;
      if (s <= 0) {
        clearInterval(iv);
        setResendDisabled(false);
        setResendText("Resend");
      } else {
        setResendText(`Resend (${s})`);
      }
    }, 1000);
  };

  return (
    <div className="otp-container">
      <svg id="shards" ref={svgRef} preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
      <div className="vig"></div>

      <main className="stage">
        <section className="card" id="card" ref={cardRef} aria-live="polite">
          <div className="glass"><div className="tint"></div><div className="shine"></div></div>
          <div className="grab"></div>
          <div className="content">
            <h1 id="title" className={fade ? 'fade' : ''}>{title}</h1>
            <p className={`sub ${fade ? 'fade' : ''}`} id="sub">{sub}</p>
            <div className={stateClass} id="zone">
              <div className="otp" id="otp" role="group" aria-label="4-digit code">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    value={otpValues[i]}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onPaste={handlePaste}
                    className={otpValues[i] ? 'filled' : ''}
                  />
                ))}
              </div>
              <div className="loader" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
              <div className="ok" aria-hidden="true"><i><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></i></div>
            </div>
            <div className="resend">
              Didn't receive the code?
              <button id="resend" type="button" onClick={handleResend} disabled={resendDisabled}>
                {resendText}
              </button>
            </div>
          </div>
        </section>
      </main>
      <div className="hint">Enter any 4 digits to see it verify</div>
    </div>
  );
}
