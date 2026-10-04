import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import './OtpVerificationPage.css';

export function PhoneNumberPage() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fade, setFade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const cardRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Shards background generation
    const NS = "http://www.w3.org/2000/svg";
    const svg = svgRef.current;
    if (svg) {
      svg.innerHTML = '';
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
      inputRef.current?.focus();
    }, 500);

    return () => {
      if (fine) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerleave", handlePointerLeave);
      }
      if (reqId) cancelAnimationFrame(reqId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 5 || busy) return;
    
    setBusy(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber
    });

    if (error) {
      console.error(error.message);
      setErrorMsg(error.message);
      setBusy(false);
      return;
    }
    
    setFade(true);
    
    setTimeout(() => {
      sessionStorage.setItem('phone_entered', phoneNumber);
      navigate('/otp');
    }, 400);
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
            <h1 id="title" className={fade ? 'fade' : ''}>Enter phone number</h1>
            <p className={`sub ${fade ? 'fade' : ''}`} id="sub">We will send a 6-digit code to verify your identity.</p>
            
            <div className={`zone ${fade ? 'fade' : ''}`} style={{ marginTop: '20px' }}>
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <div className="phone-input-wrapper">
                  <input
                    ref={inputRef}
                    type="tel"
                    className="phone-input"
                    placeholder="+919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                {errorMsg && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '10px' }}>{errorMsg}</p>}
                <button type="submit" className="action-btn" disabled={phoneNumber.length < 5 || busy}>
                  {busy ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <div className="hint">Enter a valid phone number with country code</div>
    </div>
  );
}
