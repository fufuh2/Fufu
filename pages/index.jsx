import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#05080f;color:#e2e8f0;font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}

/* ── NOISE OVERLAY ── */
body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:.4}

/* ── NAV ── */
.nav{position:sticky;top:0;z-index:100;background:rgba(5,8,15,0.92);backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid rgba(255,255,255,.06);padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:58px}
.nav-logo{display:flex;align-items:center;gap:9px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;letter-spacing:-0.4px;white-space:nowrap}
.logo-mark{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#00d4ff,#0066ff);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;box-shadow:0 0 16px rgba(0,212,255,.35),0 0 32px rgba(0,102,255,.15);flex-shrink:0}
.nav-links{display:flex;gap:30px;list-style:none}
.nav-links a{color:#64748b;font-size:13.5px;font-weight:500;text-decoration:none;transition:color .15s}
.nav-links a:hover{color:#e2e8f0}
.nav-right{display:flex;align-items:center;gap:8px}
.btn-ghost-nav{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:#94a3b8;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.btn-ghost-nav:hover{background:rgba(255,255,255,.09);color:#fff}
.btn-cta-nav{background:linear-gradient(135deg,#00d4ff,#0066ff);color:#fff;border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 0 16px rgba(0,180,255,.3);transition:all .15s;white-space:nowrap}
.btn-cta-nav:hover{opacity:.9;transform:translateY(-1px)}
.btn-cta-nav-borsa{background:linear-gradient(135deg,#00d25a,#00962e);color:#fff;border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 0 16px rgba(0,180,90,.3);transition:all .15s;white-space:nowrap}
.btn-cta-nav-borsa:hover{opacity:.9;transform:translateY(-1px)}
@media(max-width:600px){
  .nav{padding:0 14px;height:52px}
  .nav-logo{font-size:14px;gap:7px}
  .logo-mark{width:26px;height:26px;font-size:10px}
  .nav-right{gap:6px}
  .btn-cta-nav{padding:7px 11px;font-size:11px;border-radius:7px;box-shadow:none}
  .btn-cta-nav-borsa{padding:7px 11px;font-size:11px;border-radius:7px;box-shadow:none}
}
@media(max-width:360px){
  .btn-cta-nav{padding:6px 9px;font-size:10px}
  .btn-cta-nav-borsa{padding:6px 9px;font-size:10px}
}

/* ── DUAL PRODUCT HERO ── */
.products-hero{padding:80px 6% 60px;max-width:1320px;margin:0 auto;position:relative;z-index:1}
.products-hero::after{content:'';position:absolute;top:-140px;left:-200px;width:900px;height:700px;background:radial-gradient(circle,rgba(0,212,255,.04) 0%,transparent 60%);pointer-events:none}
.products-hero-top{text-align:center;margin-bottom:56px}
.products-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.prod-card{border-radius:24px;overflow:hidden;position:relative;transition:transform .25s,box-shadow .25s;display:flex;flex-direction:column}
.prod-card:hover{transform:translateY(-5px)}
.prod-card-crypto{background:linear-gradient(160deg,#060f28 0%,#050d22 100%);border:1px solid rgba(0,212,255,.18);box-shadow:0 0 50px rgba(0,180,255,.05),0 32px 80px rgba(0,0,0,.5)}
.prod-card-crypto:hover{box-shadow:0 0 90px rgba(0,180,255,.11),0 40px 100px rgba(0,0,0,.6);border-color:rgba(0,212,255,.32)}
.prod-card-borsa{background:linear-gradient(160deg,#051508 0%,#030d05 100%);border:1px solid rgba(0,210,90,.18);box-shadow:0 0 50px rgba(0,180,90,.05),0 32px 80px rgba(0,0,0,.5)}
.prod-card-borsa:hover{box-shadow:0 0 90px rgba(0,180,90,.11),0 40px 100px rgba(0,0,0,.6);border-color:rgba(0,210,90,.32)}
.prod-header{padding:28px 28px 20px}
.prod-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px}
.prod-badge-crypto{background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.22);color:#00d4ff}
.prod-badge-borsa{background:rgba(0,210,90,.08);border:1px solid rgba(0,210,90,.22);color:#00d25a}
.prod-title{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.9px;margin-bottom:8px;line-height:1.1}
.prod-title .acc-c{color:#00d4ff}
.prod-title .acc-g{color:#00d25a}
.prod-desc{font-size:13.5px;color:#475569;line-height:1.65;margin-bottom:18px;max-width:380px}
.prod-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.prod-tag{font-size:10.5px;color:#475569;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);padding:3px 9px;border-radius:5px}
.prod-mock{padding:0 28px 0;flex:1}
.prod-footer{padding:18px 28px 28px}
.btn-prod{width:100%;padding:15px;border:none;border-radius:12px;font-size:15.5px;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.btn-prod-crypto{background:linear-gradient(135deg,#00d4ff,#0066ff);color:#fff;box-shadow:0 4px 28px rgba(0,180,255,.35)}
.btn-prod-crypto:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 8px 40px rgba(0,180,255,.45)}
.btn-prod-borsa{background:linear-gradient(135deg,#00d25a,#009f44);color:#fff;box-shadow:0 4px 28px rgba(0,180,90,.35)}
.btn-prod-borsa:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 8px 40px rgba(0,180,90,.45)}
.prod-stats{display:flex;gap:18px;margin-top:14px;flex-wrap:wrap}
.prod-stat{font-size:11.5px;color:#334155;display:flex;align-items:center;gap:5px}
.prod-stat-ok-c{color:#00d4ff;font-size:10px}
.prod-stat-ok-g{color:#00d25a;font-size:10px}
/* Borsa mock overrides */
.mock-g{background:linear-gradient(160deg,#051a0d 0%,#030f07 100%);border-color:rgba(0,210,90,.15)}
.mock-bar-g{background:linear-gradient(90deg,#051a0d,#041208)}
.mock-dir-al{display:inline-flex;align-items:center;gap:4px;background:rgba(0,210,90,.1);color:#00d25a;border:1px solid rgba(0,210,90,.25);font-size:10px;font-weight:800;padding:4px 11px;border-radius:6px;letter-spacing:.5px}
.mock-dir-sat{display:inline-flex;align-items:center;gap:4px;background:rgba(248,113,113,.1);color:#f87171;border:1px solid rgba(248,113,113,.25);font-size:10px;font-weight:800;padding:4px 11px;border-radius:6px;letter-spacing:.5px}
.mc-v.gold{color:#f59e0b}
@media(max-width:900px){.products-grid{grid-template-columns:1fr}.prod-card:hover{transform:none}}
@media(max-width:600px){.products-hero{padding:52px 4% 40px}.prod-header{padding:22px 20px 14px}.prod-footer{padding:14px 20px 22px}.prod-mock{padding:0 20px}}

/* ── HERO ── */
.hero{padding:100px 6% 80px;max-width:1260px;margin:0 auto;display:flex;align-items:center;gap:70px;position:relative;z-index:1}
.hero::after{content:'';position:absolute;top:-120px;left:-200px;width:800px;height:800px;background:radial-gradient(circle,rgba(0,212,255,.05) 0%,transparent 65%);pointer-events:none}
.hero-left{flex:1;max-width:580px}
.badge{display:inline-flex;align-items:center;gap:7px;background:rgba(0,212,255,.07);border:1px solid rgba(0,212,255,.2);color:#00d4ff;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-bottom:28px}
.pulse{width:6px;height:6px;border-radius:50%;background:#00ff9d;box-shadow:0 0 10px rgba(0,255,157,.8);animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
.hero-h1{font-size:clamp(38px,5vw,62px);font-weight:900;line-height:1.06;letter-spacing:-2.5px;color:#fff;margin-bottom:24px}
.hero-h1 .grad{background:linear-gradient(135deg,#00d4ff 0%,#4080ff 50%,#a855f7 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-p{font-size:17px;color:#475569;line-height:1.75;margin-bottom:38px;max-width:490px}
.hero-p strong{color:#94a3b8;font-weight:600}
.cta-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}
.btn-main{background:linear-gradient(135deg,#00d4ff,#0066ff);color:#fff;border:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 0 40px rgba(0,180,255,.4),0 4px 20px rgba(0,100,255,.3);transition:all .2s;display:inline-flex;align-items:center;gap:8px}
.btn-main:hover{transform:translateY(-2px);box-shadow:0 0 60px rgba(0,180,255,.5),0 8px 32px rgba(0,100,255,.4)}
.btn-sec{background:transparent;border:1px solid rgba(255,255,255,.12);color:#94a3b8;padding:15px 24px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px}
.btn-sec:hover{background:rgba(255,255,255,.06);color:#e2e8f0;border-color:rgba(255,255,255,.2)}
.trust-row{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.trust-item{font-size:12.5px;color:#334155;display:flex;align-items:center;gap:5px}
.trust-ok{color:#00ff9d;font-size:11px}

/* ── MOCKUP ── */
.hero-right{flex:1;max-width:480px;position:relative}
.mock-wrapper{position:relative}
.mock-glow{position:absolute;inset:-30px;background:radial-gradient(circle,rgba(0,180,255,.08) 0%,transparent 70%);pointer-events:none}
.mock{background:linear-gradient(160deg,#0b1628 0%,#080d1a 100%);border:1px solid rgba(0,212,255,.15);border-radius:20px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,212,255,.05),0 32px 80px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06)}
.mock-bar{background:linear-gradient(90deg,#0c1e3a,#0a1628);padding:13px 18px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between}
.mock-dots{display:flex;gap:5px}
.mock-dot{width:9px;height:9px;border-radius:50%}
.mock-title{font-size:11px;font-weight:700;color:#334155;letter-spacing:.5px}
.mock-body{padding:18px}
.mock-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.mock-coin{font-size:17px;font-weight:800;color:#fff;letter-spacing:-.3px}
.mock-dir-long{display:inline-flex;align-items:center;gap:4px;background:rgba(0,255,157,.1);color:#00ff9d;border:1px solid rgba(0,255,157,.25);font-size:10px;font-weight:800;padding:4px 11px;border-radius:6px;letter-spacing:.5px}
.mock-ring{width:46px;height:46px;position:relative;display:flex;align-items:center;justify-content:center}
.mock-ring svg{position:absolute;inset:0;transform:rotate(-90deg)}
.mock-ring-val{font-size:13px;font-weight:900;color:#00d4ff;position:relative;z-index:1}
.mock-grade{font-size:9px;color:#334155;font-weight:700;margin-left:6px}
.mock-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px}
.mock-cell{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:10px 12px}
.mc-lbl{font-size:8px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
.mc-v{font-size:13px;font-weight:700}
.mc-v.c{color:#00d4ff}.mc-v.r{color:#f87171}.mc-v.g{color:#00ff9d}.mc-v.w{color:#e2e8f0}
.mock-sep{height:1px;background:rgba(255,255,255,.04);margin:10px 0}
.mock-tps{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px}
.mock-tp{border-radius:8px;padding:8px 6px;text-align:center;font-size:9.5px;font-weight:700}
.tp1{background:rgba(0,255,157,.07);color:#00ff9d;border:1px solid rgba(0,255,157,.18)}
.tp2{background:rgba(0,180,255,.07);color:#38bdf8;border:1px solid rgba(0,180,255,.18)}
.tp3{background:rgba(168,85,247,.07);color:#c084fc;border:1px solid rgba(168,85,247,.18)}
.mock-layers{display:flex;gap:4px}
.lbar{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.05);overflow:hidden}
.lfill{height:100%;border-radius:2px;opacity:.8}
.mock-foot{border-top:1px solid rgba(255,255,255,.04);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,.15)}
.mock-foot-l{font-size:8.5px;color:#1e293b;font-weight:600}
.mock-foot-r{font-size:8.5px;color:#00d4ff;font-weight:800;letter-spacing:.5px}

/* ── TICKER ── */
.ticker-wrap{border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.01);overflow:hidden;padding:12px 0}
.ticker-track{display:flex;gap:48px;animation:ticker 28s linear infinite;width:max-content}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ticker-item{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;white-space:nowrap}
.ticker-sym{color:#64748b}.ticker-price{color:#e2e8f0}.ticker-up{color:#00ff9d}.ticker-dn{color:#f87171}

/* ── SOCIAL PROOF ── */
.proof-bar{background:rgba(0,0,0,.2);border-top:1px solid rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.04);padding:30px 6%}
.proof-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-around;flex-wrap:wrap;gap:20px}
.proof-item{text-align:center}
.proof-num{font-size:30px;font-weight:900;background:linear-gradient(135deg,#00d4ff,#4080ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1.5px}
.proof-lbl{font-size:10px;color:#334155;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-top:4px}
.proof-sep{width:1px;height:36px;background:rgba(255,255,255,.06)}

/* ── WHY SECTION ── */
.why-wrap{padding:70px 6%;position:relative;z-index:1}
.why-inner{max-width:1180px;margin:0 auto}
.sec-tag{font-size:10.5px;font-weight:800;color:#00d4ff;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px}
.sec-h2{font-size:clamp(26px,3.5vw,44px);font-weight:900;color:#fff;letter-spacing:-1.5px;line-height:1.12;margin-bottom:16px}
.sec-p{font-size:16px;color:#475569;line-height:1.7;max-width:520px}
.why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);border-radius:18px;overflow:hidden;margin-top:40px}
.why-card{background:#05080f;padding:22px 22px;transition:background .2s;position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:14px}
.why-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c);opacity:0;transition:opacity .2s}
.why-card:hover{background:rgba(255,255,255,.02)}
.why-card:hover::before{opacity:1}
.why-icon{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;margin-top:1px}
.why-body{flex:1;min-width:0}
.why-t{font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:4px}
.why-d{font-size:12px;color:#475569;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:860px){.why-grid{grid-template-columns:1fr 1fr}}
@media(max-width:540px){.why-grid{grid-template-columns:1fr}}

/* ── HOW IT WORKS ── */
.how-wrap{background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.04);padding:60px 6%}
.how-inner{max-width:1000px;margin:0 auto}
.how-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:50px;margin-top:48px;position:relative}
.how-steps::before{content:'';position:absolute;top:24px;left:16.5%;right:16.5%;height:1px;background:linear-gradient(90deg,rgba(0,212,255,.2),rgba(0,102,255,.2));pointer-events:none}
.how-step{text-align:center;position:relative}
.step-n{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,rgba(0,212,255,.15),rgba(0,102,255,.15));border:1px solid rgba(0,212,255,.3);color:#00d4ff;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;position:relative;z-index:1}
.step-t{font-size:16px;font-weight:700;color:#e2e8f0;margin-bottom:10px}
.step-d{font-size:13.5px;color:#475569;line-height:1.65}
@media(max-width:700px){.how-steps{grid-template-columns:1fr;gap:30px}.how-steps::before{display:none}}

/* ── LAYERS ── */
.layers-wrap{padding:70px 6%;position:relative;z-index:1}
.layers-inner{max-width:900px;margin:0 auto}
.layers-list{display:flex;flex-direction:column;gap:8px;margin-top:40px}
.lrow{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:11px;transition:all .15s}
.lrow:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)}
.lrow-id{font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;width:24px;flex-shrink:0}
.lrow-name{font-size:14px;font-weight:700;color:#e2e8f0;width:160px;flex-shrink:0}
.lrow-bar{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden}
.lrow-fill{height:100%;border-radius:2px;opacity:.75}
.lrow-score{font-size:11px;font-weight:800;width:36px;text-align:right;flex-shrink:0}
.lrow-tags{display:flex;gap:5px;flex-wrap:wrap;flex:2}
.lrow-tag{font-size:10px;color:#334155;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);padding:2px 7px;border-radius:4px;white-space:nowrap}
.layers-note{margin-top:24px;padding:16px 22px;background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.15);border-radius:12px;font-size:13px;color:#475569;text-align:center;line-height:1.6}
.layers-note strong{color:#00d4ff}
@media(max-width:600px){.lrow-tags{display:none}.lrow-name{width:120px}}


/* ── COMPARE ── */
.compare-wrap{padding:70px 6%;position:relative;z-index:1}
.compare-inner{max-width:900px;margin:0 auto}
.compare-table{display:grid;grid-template-columns:2fr 1fr 1fr;gap:0;margin-top:56px;border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden}
.ct-header{background:rgba(255,255,255,.03);padding:16px 20px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid rgba(255,255,255,.06)}
.ct-header.hl{background:rgba(0,212,255,.07);color:#00d4ff;border-bottom-color:rgba(0,212,255,.15)}
.ct-row{display:contents}
.ct-cell{padding:14px 20px;font-size:13.5px;color:#64748b;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center}
.ct-cell.feat{color:#94a3b8;font-weight:500}
.ct-cell.hl{background:rgba(0,212,255,.03)}
.ct-yes{color:#00ff9d;font-size:13px;font-weight:700}
.ct-no{color:#334155;font-size:13px}

/* ── PLANS ── */
.plans-wrap{background:rgba(0,0,0,.2);border-top:1px solid rgba(255,255,255,.04);padding:70px 6%}
.plans-inner{max-width:1000px;margin:0 auto}
.plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:56px}
.plan-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:30px 26px;position:relative;transition:all .2s}
.plan-card:hover{background:rgba(255,255,255,.04)}
.plan-card.pop{background:rgba(0,212,255,.05);border-color:rgba(0,212,255,.3);box-shadow:0 0 50px rgba(0,180,255,.08)}
.plan-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#00d4ff,#0066ff);color:#fff;font-size:10px;font-weight:800;padding:4px 16px;border-radius:100px;white-space:nowrap}
.plan-name{font-size:11px;font-weight:800;color:#00d4ff;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
.plan-price{font-size:46px;font-weight:900;color:#fff;letter-spacing:-2.5px;display:flex;align-items:baseline;gap:3px;margin-bottom:6px}
.plan-per{font-size:14px;font-weight:500;color:#475569;letter-spacing:0}
.plan-desc{font-size:13px;color:#475569;margin-bottom:22px}
.plan-div{height:1px;background:rgba(255,255,255,.06);margin-bottom:20px}
.plan-feats{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:26px}
.plan-feat{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:#94a3b8}
.feat-ok{color:#00ff9d;flex-shrink:0;font-size:12px;margin-top:2px}
.btn-plan{width:100%;padding:14px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e2e8f0}
.btn-plan:hover{background:rgba(255,255,255,.09)}
.btn-plan.pop{background:linear-gradient(135deg,#00d4ff,#0066ff);color:#fff;border:none;box-shadow:0 0 30px rgba(0,180,255,.3)}
.btn-plan.pop:hover{opacity:.9;transform:translateY(-1px)}
@media(max-width:860px){.plans-grid{grid-template-columns:1fr;max-width:420px;margin-left:auto;margin-right:auto}}

/* ── PROFESSIONAL CTA SECTION ── */
.cta-section{position:relative;z-index:1;padding:100px 6% 90px;overflow:hidden}
.cta-section::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 15% 60%,rgba(0,212,255,.055) 0%,transparent 55%),radial-gradient(ellipse 50% 70% at 85% 40%,rgba(0,210,90,.04) 0%,transparent 55%);pointer-events:none}
.cta-section::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:64px 64px;pointer-events:none;mask-image:radial-gradient(ellipse 75% 75% at 50% 50%,black 20%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 75% 75% at 50% 50%,black 20%,transparent 75%)}
.cta-inner{max-width:1160px;margin:0 auto;position:relative;z-index:1}
/* metrics strip */
.cta-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;margin-bottom:72px}
.cta-metric{background:#05080f;padding:22px 26px;display:flex;flex-direction:column;gap:5px;transition:background .2s;position:relative}
.cta-metric::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--mc);opacity:0;transition:opacity .2s}
.cta-metric:hover{background:rgba(255,255,255,.025)}
.cta-metric:hover::after{opacity:1}
.cta-m-val{font-size:30px;font-weight:900;letter-spacing:-1.8px;line-height:1}
.cta-m-lbl{font-size:11px;font-weight:600;color:#334155;letter-spacing:.4px;text-transform:uppercase}
.cta-m-sub{font-size:10.5px;font-weight:600;margin-top:1px}
/* main layout */
.cta-main{display:grid;grid-template-columns:1.1fr 1fr;gap:80px;align-items:center}
.cta-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(0,255,157,.06);border:1px solid rgba(0,255,157,.18);color:#00ff9d;padding:5px 15px;border-radius:100px;font-size:10.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:26px}
.cta-h2{font-size:clamp(30px,4vw,54px);font-weight:900;line-height:1.05;letter-spacing:-2.2px;color:#fff;margin-bottom:22px}
.cta-h2 .grad-c{background:linear-gradient(135deg,#00d4ff 0%,#4080ff 60%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cta-h2 .grad-g{background:linear-gradient(135deg,#00d25a 0%,#009f44 60%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cta-sub{font-size:15.5px;color:#4b5a6e;line-height:1.78;margin-bottom:36px;max-width:460px}
.cta-sub strong{color:#64748b;font-weight:600}
.cta-actions{display:flex;gap:12px;flex-wrap:wrap}
.cta-note{font-size:12px;color:#283548;margin-top:16px;display:flex;align-items:center;gap:6px}
.cta-note button{background:none;border:none;color:#00d4ff;cursor:pointer;font-size:inherit;font-weight:600;padding:0;transition:color .15s}
.cta-note button:hover{color:#38bdf8}
/* feature cards */
.cta-right{display:flex;flex-direction:column;gap:10px}
.cta-card{background:rgba(255,255,255,.022);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:14px;transition:all .2s;position:relative;overflow:hidden;cursor:default}
.cta-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--cc);border-radius:0 2px 2px 0;opacity:.55;transition:opacity .2s}
.cta-card:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);transform:translateX(5px)}
.cta-card:hover::before{opacity:1}
.cta-card-icon{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.cta-card-title{font-size:13.5px;font-weight:700;color:#e2e8f0;margin-bottom:2px}
.cta-card-desc{font-size:11.5px;color:#475569;line-height:1.4}
.cta-card-wr{font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0}
@media(max-width:960px){.cta-main{grid-template-columns:1fr;gap:48px}.cta-right{display:grid;grid-template-columns:1fr 1fr}}
@media(max-width:600px){.cta-section{padding:70px 5% 60px}.cta-metrics{grid-template-columns:1fr 1fr}.cta-right{grid-template-columns:1fr}}
@media(max-width:380px){.cta-metrics{grid-template-columns:1fr}}

/* ── FAQ ── */
.faq-wrap{padding:100px 6%}
.faq-inner{max-width:700px;margin:0 auto}
.faq-list{display:flex;flex-direction:column;gap:4px;margin-top:56px}
.faq-item{border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden;transition:border-color .15s}
.faq-item.open{border-color:rgba(0,212,255,.3)}
.faq-q{width:100%;text-align:left;background:rgba(255,255,255,.02);border:none;padding:18px 22px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:15px;font-weight:600;color:#e2e8f0;transition:background .15s}
.faq-q:hover{background:rgba(255,255,255,.04)}
.faq-ch{font-size:11px;color:#475569;transition:transform .2s;flex-shrink:0}
.faq-item.open .faq-ch{transform:rotate(180deg);color:#00d4ff}
.faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease}
.faq-item.open .faq-a{max-height:200px}
.faq-ai{padding:0 22px 18px;font-size:14px;color:#475569;line-height:1.75}

/* ── AUTH ── */
.auth-section{padding:100px 6%;border-top:1px solid rgba(255,255,255,.05)}
.auth-wrap{display:flex;align-items:flex-start;gap:80px;max-width:920px;margin:0 auto}
.auth-left{flex:1;padding-top:10px}
.auth-tag{font-size:10.5px;font-weight:800;color:#00d4ff;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px}
.auth-h2{font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;margin-bottom:14px;line-height:1.18}
.auth-p{font-size:14.5px;color:#475569;line-height:1.75;margin-bottom:28px}
.auth-pts{list-style:none;display:flex;flex-direction:column;gap:12px}
.auth-pt{display:flex;gap:11px;align-items:flex-start;font-size:13.5px;color:#64748b}
.apt-ok{color:#00ff9d;font-size:11px;margin-top:2px;flex-shrink:0}
.auth-right{flex:1;min-width:320px;max-width:400px}
.auth-card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;box-shadow:0 4px 60px rgba(0,0,0,.4)}
.auth-tabs{display:flex;background:rgba(0,0,0,.4);border-radius:10px;padding:4px;margin-bottom:26px;border:1px solid rgba(255,255,255,.06)}
.auth-tab{flex:1;padding:10px;border:none;background:none;border-radius:7px;font-size:13.5px;font-weight:600;color:#475569;cursor:pointer;transition:all .15s}
.auth-tab.on{background:rgba(0,212,255,.12);color:#00d4ff}
.auth-field{margin-bottom:13px}
.auth-field label{display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px}
.auth-field input{width:100%;padding:12px 15px;border:1px solid rgba(255,255,255,.09);border-radius:9px;font-size:14px;color:#e2e8f0;background:rgba(0,0,0,.35);transition:border-color .15s;outline:none}
.auth-field input:focus{border-color:rgba(0,212,255,.45)}
.auth-field input::placeholder{color:#1e293b}
.auth-btn{width:100%;padding:14px;background:linear-gradient(135deg,#00d4ff,#0066ff);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:4px;box-shadow:0 4px 20px rgba(0,180,255,.25)}
.auth-btn:hover{opacity:.9;transform:translateY(-1px)}
.auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.auth-msg{font-size:12.5px;margin-top:10px;text-align:center;padding:10px 14px;border-radius:8px}
.auth-msg.err{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
.auth-msg.ok{background:rgba(0,255,157,.07);color:#00ff9d;border:1px solid rgba(0,255,157,.2)}
@media(max-width:768px){.auth-wrap{flex-direction:column;gap:40px}.auth-right{min-width:unset;width:100%;max-width:100%}}

/* ── FOOTER ── */
.footer{background:rgba(0,0,0,.3);border-top:1px solid rgba(255,255,255,.05);padding:50px 6% 30px}
.footer-inner{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;gap:40px;margin-bottom:36px;flex-wrap:wrap}
.footer-logo{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:800;color:#fff;text-decoration:none;margin-bottom:12px}
.footer-desc{font-size:12.5px;color:#1e293b;line-height:1.6;max-width:230px}
.footer-col h5{font-size:10.5px;font-weight:700;color:#334155;letter-spacing:.8px;text-transform:uppercase;margin-bottom:14px}
.footer-col ul{list-style:none;display:flex;flex-direction:column;gap:8px}
.footer-col a{font-size:13px;color:#1e293b;text-decoration:none;transition:color .15s}
.footer-col a:hover{color:#e2e8f0}
.footer-bottom{max-width:1200px;margin:0 auto;border-top:1px solid rgba(255,255,255,.04);padding-top:22px;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
.footer-copy{font-size:12px;color:#1e293b}
.footer-risk{font-size:11px;color:#1e293b;max-width:600px;line-height:1.6}

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .nav-links{display:none}
  .hero{flex-direction:column;padding:70px 6% 50px;gap:50px}
  .hero-right{width:100%;max-width:100%}
  .compare-table{grid-template-columns:2fr 1fr}
  .ct-cell:nth-child(3n),.ct-header:nth-child(3){display:none}
  .plans-inner{padding:0 16px}
  .hero-h{font-size:clamp(30px,6vw,52px)}
  .proof-inner{gap:12px}
}
@media(max-width:600px){
  .hero{padding:52px 5% 40px}
  .hero-h{font-size:clamp(26px,8vw,40px)}
  .hero-p{font-size:15px}
  .hero-right{display:none}
  .urgency-wrap{margin:0 3%}
  .urgency-bg{padding:50px 24px}
  .sec-title{font-size:clamp(22px,6vw,32px)}
  .why-inner,.how-inner,.layers-inner,.compare-inner,.plans-inner,.faq-inner{padding:0 16px}
  .proof-inner{flex-direction:column;align-items:center;gap:10px}
  .footer-inner{padding:0 16px}
  nav{padding:0 16px}
}
@media(max-width:380px){
  .hero{padding:42px 4% 30px}
  .hero-h{font-size:24px}
  .hero-p{font-size:14px}
  .hero-ctas{flex-direction:column;align-items:stretch}
  .hero-ctas a,.hero-ctas button{text-align:center}
}
`;

const TICKERS = [
  { sym: 'BTC/USDT', price: '$84,215', chg: '+2.34%', up: true },
  { sym: 'ETH/USDT', price: '$3,218', chg: '+1.87%', up: true },
  { sym: 'THYAO', price: '₺58.40', chg: '+1.92%', up: true, bist: true },
  { sym: 'SOL/USDT', price: '$148.6', chg: '-0.42%', up: false },
  { sym: 'ASELS', price: '₺94.60', chg: '+3.11%', up: true, bist: true },
  { sym: 'BNB/USDT', price: '$612.4', chg: '+1.12%', up: true },
  { sym: 'GARAN', price: '₺121.20', chg: '-0.65%', up: false, bist: true },
  { sym: 'XRP/USDT', price: '$0.5841', chg: '+3.21%', up: true },
  { sym: 'SASA', price: '₺32.80', chg: '+2.44%', up: true, bist: true },
  { sym: 'ADA/USDT', price: '$0.4523', chg: '-1.05%', up: false },
  { sym: 'EREGL', price: '₺47.90', chg: '+1.78%', up: true, bist: true },
  { sym: 'AVAX/USDT', price: '$38.72', chg: '+2.88%', up: true },
  { sym: 'BIMAS', price: '₺316.50', chg: '-0.31%', up: false, bist: true },
  { sym: 'LINK/USDT', price: '$14.23', chg: '+1.55%', up: true },
];

const WHY = [
  { icon: '◈', title: 'SMC & ICT Motoru', desc: 'Order Block · FVG · BOS · CHoCH · 4H/1D/1W/1M', c: '#00d4ff' },
  { icon: '⊞', title: 'Multi-TF Confluence', desc: '4/4 uyum = %88-91 WR · Ichimoku 1D+1W teyidi', c: '#4080ff' },
  { icon: '◉', title: 'ATR Risk Yönetimi', desc: 'Dinamik SL · Kelly Criterion · 5x kaldıraç optimize', c: '#a855f7' },
  { icon: '◧', title: 'RSI & Diverjans', desc: 'Hidden + Regular diverjans · Tersine dönüş tespiti', c: '#00ff9d' },
  { icon: '▦', title: 'Fibonacci & Wyckoff', desc: 'Golden Pocket · OTE bölgesi · Accum/Dist faz', c: '#f59e0b' },
  { icon: '◌', title: 'Türev Sinyalleri', desc: 'Funding Rate · Open Interest · Long/Short oranı', c: '#f87171' },
];

const LAYERS = [
  { id: 'L1', name: 'Piyasa Yapısı', max: 22, color: '#0066ff', tags: ['BOS', 'CHoCH', 'EMA', 'ADX', 'Ichimoku'] },
  { id: 'L2', name: 'Kurumsal Bölgeler', max: 22, color: '#7c3aed', tags: ['Order Block', 'FVG', 'Fibonacci', 'Pivot'] },
  { id: 'L3', name: 'Momentum', max: 20, color: '#059669', tags: ['RSI', 'MACD', 'StochRSI', 'Bollinger', 'OBV'] },
  { id: 'L4', name: 'Multi-TF Uyum', max: 18, color: '#dc2626', tags: ['4H', '1D', '1W', '1M', 'Ichimoku teyidi'] },
  { id: 'L5', name: 'Wyckoff', max: 12, color: '#d97706', tags: ['Accum/Dist', 'Spring', 'Upthrust', 'VWAP'] },
  { id: 'L6', name: 'Hacim Zekası', max: 6, color: '#0891b2', tags: ['OBV', 'CVD', 'POC/VAH/VAL', 'Spike'] },
];


const COMPARE = [
  { feat: 'SMC / ICT Analizi', us: true, other: false },
  { feat: 'Multi-TF Confluence (4 TF)', us: true, other: false },
  { feat: 'ATR Stop-Loss Hesabı', us: true, other: 'Kısmi' },
  { feat: 'RSI Hidden Diverjans', us: true, other: false },
  { feat: 'Wyckoff Faz Tespiti', us: true, other: false },
  { feat: 'Futures Verisi (OI, FR)', us: true, other: 'Ücretli' },
  { feat: 'Portfolio Backtest Takibi', us: true, other: false },
  { feat: 'Ücretsiz Plan', us: true, other: 'Sınırlı' },
];

const PLANS = [
  { name: 'Starter', price: '$0', per: '/ay', desc: 'Sistemi keşfetmek için', feats: ['Günde 5 analiz', 'SMC & ICT sinyalleri', 'ATR tabanlı stop hesabı', 'Portfolio takibi'], cta: 'Ücretsiz Başla', cls: '' },
  { name: 'Pro', price: '$99', per: '/ay', desc: 'Düzenli trade edenler için', feats: ['Sınırsız analiz', '9 katman tam rapor', 'RSI Diverjans tespiti', 'Gelişmiş analytics', 'Fibonacci & Ichimoku matrisi', 'Futures sinyal paketi', 'Öncelikli destek'], cta: "Pro'ya Geç", cls: 'pop', badge: 'En Çok Tercih' },
  { name: 'Elite', price: '$299', per: '/ay', desc: 'Aktif kaldıraçlı trade için', feats: ["Pro'daki her şey", '5x kaldıraç kurulumu', 'Özel API erişimi', 'VIP Telegram grubu', '1:1 destek'], cta: "Elite'e Geç", cls: '' },
];

const FAQS = [
  { q: 'Bu platform finansal tavsiye veriyor mu?', a: 'Hayır. DeepTradeScan yalnızca teknik analiz hesapları sunar. Her yatırım kararı tamamen kullanıcının sorumluluğundadır. Kripto para ticareti yüksek risk içerir.' },
  { q: 'Veri kaynağı nedir?', a: 'Birincil kaynak Binance Spot & Futures API, yedek kaynak OKX API\'dir. Tüm veriler anlık olarak çekilir, önbellek kullanılmaz.' },
  { q: 'Win rate tahmini nasıl hesaplanıyor?', a: '4 zaman dilimi uyumu, zone kalitesi, momentum ve kurumsal akış verilerinin ağırlıklı ortalamasıdır. 4/4 TF uyumu + 85+ skor = %82-91 tarihsel sinyal kalitesi. Geçmiş performans geleceği garanti etmez.' },
  { q: 'Stop-loss nasıl belirleniyor?', a: 'ATR(14) tabanlı dinamik hesaplamayla — minimum 1.2x ATR buffer ile yapısal zone invalidasyonu birleştirilir. Anlık stop hunt\'lardan korunmak için tasarlanmıştır.' },
  { q: 'Aboneliği iptal edebilir miyim?', a: 'Evet, istediğiniz zaman, herhangi bir ceza olmadan iptal edebilirsiniz. İptal sonrası dönem sonuna kadar erişiminiz devam eder.' },
];

function BorsaMockCard() {
  const [score] = useState(79);
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="mock-wrapper">
      <div className="mock-glow" style={{ background: 'radial-gradient(circle,rgba(0,180,90,.07) 0%,transparent 70%)' }} />
      <div className="mock mock-g">
        <div className="mock-bar mock-bar-g">
          <div className="mock-dots">
            <div className="mock-dot" style={{ background: '#ff5f57' }} />
            <div className="mock-dot" style={{ background: '#ffbd2e' }} />
            <div className="mock-dot" style={{ background: '#28c940' }} />
          </div>
          <span className="mock-title">QUANTUM BORSA ENGINE v5</span>
          <span style={{ fontSize: 9, color: '#1e293b' }}>BIST LIVE</span>
        </div>
        <div className="mock-body">
          <div className="mock-top">
            <div>
              <div className="mock-coin" style={{ color: '#00d25a' }}>THYAO <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>BIST</span></div>
              <div className="mock-dir-al" style={{ marginTop: 5 }}>▲ LONG · PRIME AL</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="mock-grade">GRADE A</span>
              <div className="mock-ring">
                <svg width="46" height="46" viewBox="0 0 46 46">
                  <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
                  <circle cx="23" cy="23" r={r} fill="none" stroke="#00d25a" strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(0,210,90,.6))' }} />
                </svg>
                <span className="mock-ring-val" style={{ color: '#00d25a' }}>{score}</span>
              </div>
            </div>
          </div>
          <div className="mock-grid">
            <div className="mock-cell"><div className="mc-lbl">Sniper Giriş</div><div className="mc-v" style={{ color: '#00d25a' }}>₺58.40 – ₺59.20</div></div>
            <div className="mock-cell"><div className="mc-lbl">Stop Loss</div><div className="mc-v r">₺56.80</div></div>
            <div className="mock-cell"><div className="mc-lbl">Risk / Ödül</div><div className="mc-v w">1 : 3.4</div></div>
            <div className="mock-cell"><div className="mc-lbl">Win Rate</div><div className="mc-v" style={{ color: '#00d25a' }}>%74</div></div>
          </div>
          <div className="mock-sep" />
          <div className="mock-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: 12 }}>
            <div className="mock-cell"><div className="mc-lbl">Wyckoff Faz</div><div className="mc-v gold">Akümülasyon C</div></div>
            <div className="mock-cell"><div className="mc-lbl">Bias</div><div className="mc-v" style={{ color: '#00d25a' }}>GÜÇLÜ ALIŞ</div></div>
          </div>
          <div className="mock-tps">
            <div className="mock-tp" style={{ background: 'rgba(0,210,90,.07)', color: '#00d25a', border: '1px solid rgba(0,210,90,.18)' }}>TP1<br />₺62.50</div>
            <div className="mock-tp tp2">TP2<br />₺67.80</div>
            <div className="mock-tp tp3">TP3<br />₺74.20</div>
          </div>
          <div className="mock-layers">
            {[['#00962e', 81], ['#7c3aed', 74], ['#059669', 79], ['#dc2626', 76], ['#d97706', 71], ['#0891b2', 78]].map(([c, p], i) => (
              <div className="lbar" key={i}><div className="lfill" style={{ width: `${p}%`, background: c }} /></div>
            ))}
          </div>
        </div>
        <div className="mock-foot" style={{ borderTopColor: 'rgba(0,210,90,.08)' }}>
          <span className="mock-foot-l">BIST · ICT + Wyckoff · 6 Katman · Canlı</span>
          <span className="mock-foot-r" style={{ color: '#00d25a' }}>QUANTUM BORSA ◈</span>
        </div>
      </div>
    </div>
  );
}

function MockCard() {
  const [score] = useState(83);
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="mock-wrapper">
      <div className="mock-glow" />
      <div className="mock">
        <div className="mock-bar">
          <div className="mock-dots">
            <div className="mock-dot" style={{ background: '#ff5f57' }} />
            <div className="mock-dot" style={{ background: '#ffbd2e' }} />
            <div className="mock-dot" style={{ background: '#28c940' }} />
          </div>
          <span className="mock-title">DEEPTRADESCAN QUANTUM</span>
          <span style={{ fontSize: 9, color: '#1e293b' }}>LIVE</span>
        </div>
        <div className="mock-body">
          <div className="mock-top">
            <div>
              <div className="mock-coin">BTC / USDT</div>
              <div className="mock-dir-long" style={{ marginTop: 5 }}>▲ LONG</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="mock-grade">GRADE A+</span>
              <div className="mock-ring">
                <svg width="46" height="46" viewBox="0 0 46 46">
                  <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
                  <circle cx="23" cy="23" r={r} fill="none" stroke="#00d4ff" strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,.6))' }} />
                </svg>
                <span className="mock-ring-val">{score}</span>
              </div>
            </div>
          </div>
          <div className="mock-grid">
            <div className="mock-cell"><div className="mc-lbl">Giriş Bölgesi</div><div className="mc-v c">$81.400 – $82.100</div></div>
            <div className="mock-cell"><div className="mc-lbl">Stop Loss</div><div className="mc-v r">$79.250</div></div>
            <div className="mock-cell"><div className="mc-lbl">Risk / Ödül</div><div className="mc-v w">1 : 4.2</div></div>
            <div className="mock-cell"><div className="mc-lbl">Win Rate</div><div className="mc-v g">%86</div></div>
          </div>
          <div className="mock-sep" />
          <div className="mock-tps">
            <div className="mock-tp tp1">TP1<br />$85.500</div>
            <div className="mock-tp tp2">TP2<br />$90.200</div>
            <div className="mock-tp tp3">TP3<br />$96.800</div>
          </div>
          <div className="mock-layers">
            {[['#0066ff', 82], ['#7c3aed', 77], ['#059669', 75], ['#dc2626', 78], ['#d97706', 67], ['#0891b2', 83]].map(([c, p], i) => (
              <div className="lbar" key={i}><div className="lfill" style={{ width: `${p}%`, background: c }} /></div>
            ))}
          </div>
        </div>
        <div className="mock-foot">
          <span className="mock-foot-l">9 Katman · 30+ Faktör · Binance / OKX Canlı</span>
          <span className="mock-foot-r">QUANTUM APEX ◈</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const authRef = useRef(null);

  // Redirect immediately if already logged in with a VALID (non-expired) session
  const [redirecting] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const s = localStorage.getItem('dts_s');
      if (!s) return false;
      const sess = JSON.parse(s);
      if (!sess?.access_token) return false;
      // Only redirect if token is NOT expired (expires_at is Unix seconds)
      const expiresAt = sess.expires_at;
      if (expiresAt && Date.now() / 1000 > expiresAt) {
        localStorage.removeItem('dts_s'); // clean up stale token
        return false;
      }
      return true;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (redirecting) router.replace('/app');
  }, [redirecting]);

  async function handleAuth(e) {
    e.preventDefault();
    if (!email || !pass || (tab === 'register' && !name)) { setMsg({ type: 'err', text: 'Tüm alanları doldurun.' }); return; }
    setLoading(true); setMsg(null);
    try {
      const action = tab === 'login' ? 'login' : 'register';
      const body = tab === 'login' ? { email, password: pass } : { email, password: pass, full_name: name };
      const r = await fetch(`/api/auth?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (data.error) { setMsg({ type: 'err', text: data.error }); return; }
      if (tab === 'register') {
        if (data.session?.access_token) { localStorage.setItem('dts_s', JSON.stringify(data.session)); router.push('/app'); }
        else { setMsg({ type: 'ok', text: 'Hesabınız oluşturuldu. Giriş yapabilirsiniz.' }); setTab('login'); }
      } else {
        const sess = data.session || data;
        if (sess?.access_token) { localStorage.setItem('dts_s', JSON.stringify(sess)); router.push('/app'); }
      }
    } catch { setMsg({ type: 'err', text: 'Bir hata oluştu. Tekrar deneyin.' }); }
    finally { setLoading(false); }
  }

  const scrollToAuth = () => authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (redirecting) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#05080f',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(0,212,255,.15)',
        borderTopColor: '#00d4ff',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ color: '#334155', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Yükleniyor...</span>
    </div>
  );

  return (
    <>
      <Head>
        <title>DeepTradeScan — Kripto & BIST Borsa Kurumsal Analiz Motoru | SMC ICT Wyckoff</title>
        <meta name="description" content="Kripto ve BIST borsa için kurumsal analiz platformu. 9 katmanlı SMC, ICT, Wyckoff motoru ile 50+ coin ve BIST hisseleri için giriş bölgesi, ATR stop-loss ve %82-91 win rate sinyali. Binance/OKX canlı veri. Ücretsiz başla." />
        <meta name="keywords" content="kripto analiz, BIST borsa analiz, bitcoin teknik analiz, hisse senedi analiz, SMC ICT Wyckoff, kripto sinyal, BIST100 analiz, borsa teknik analiz, kripto stop loss, order block, fair value gap" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://deeptradescan.com/" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </Head>
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <img src="/logo.svg" alt="DeepTradeScan" width="32" height="32" style={{ borderRadius: 9 }} />
          DeepTradeScan
        </a>
        <ul className="nav-links">
          {[['Özellikler', '#why'], ['Motor', '#layers'], ['Planlar', '#plans'], ['SSS', '#faq']].map(([l, h]) => (
            <li key={l}><a href={h}>{l}</a></li>
          ))}
        </ul>
        <div className="nav-right">
          <button className="btn-cta-nav-borsa" onClick={() => router.push('/borsa')}>
            Borsa → Başla
          </button>
          <button className="btn-cta-nav" onClick={scrollToAuth}>Kripto → Başla</button>
        </div>
      </nav>

      {/* DUAL PRODUCT HERO */}
      <section className="products-hero">
        <div className="products-hero-top">
          <div className="badge" style={{ margin: '0 auto 20px', display: 'inline-flex' }}>
            <span className="pulse" />
            Kurumsal Sinyal Motoru · Canlı
          </div>
          <h1 className="hero-h1" style={{ margin: '0 auto 18px', maxWidth: 640 }}>
            Kripto & Borsa'da<br /><span className="grad">kurumsal analiz gücü</span>
          </h1>
          <p className="hero-p" style={{ margin: '0 auto', textAlign: 'center', maxWidth: 520 }}>
            İki ayrı motor, tek platform. <strong>Kripto</strong> için SMC/ICT/Wyckoff,{' '}
            <strong>BIST</strong> için Quantum Borsa Engine — her ikisi de kurumsal seviyede.
          </p>
        </div>

        <div className="products-grid">
          {/* ─── KRİPTO CARD ─── */}
          <div className="prod-card prod-card-crypto">
            <div className="prod-header">
              <div className="prod-badge prod-badge-crypto">
                <span className="pulse" style={{ width: 5, height: 5 }} />
                KRİPTO ANALİZ · LIVE
              </div>
              <div className="prod-title">
                Kripto <span className="acc-c">Quantum</span><br />Analiz Motoru
              </div>
              <p className="prod-desc">
                9 katmanlı SMC, ICT ve Wyckoff motoru. Binance/OKX canlı veri ile 50+ coin için
                kurumsal giriş bölgesi, ATR stop-loss ve %82-91 win rate sinyali.
              </p>
              <div className="prod-tags">
                {['SMC · ICT', 'Order Block', 'FVG', 'Wyckoff', 'Multi-TF', 'ATR Stop', 'RSI Div', '50+ Coin'].map(t => (
                  <span className="prod-tag" key={t}>{t}</span>
                ))}
              </div>
            </div>
            <div className="prod-mock"><MockCard /></div>
            <div className="prod-footer">
              <button className="btn-prod btn-prod-crypto" onClick={scrollToAuth}>
                KRİPTO ANALİZİ BAŞLAT →
              </button>
              <div className="prod-stats">
                <span className="prod-stat"><span className="prod-stat-ok-c">✓</span> 50+ USDT paritesi</span>
                <span className="prod-stat"><span className="prod-stat-ok-c">✓</span> 9 katman · 100 puan</span>
                <span className="prod-stat"><span className="prod-stat-ok-c">✓</span> Ücretsiz 5 analiz/gün</span>
              </div>
            </div>
          </div>

          {/* ─── BORSA CARD ─── */}
          <div className="prod-card prod-card-borsa">
            <div className="prod-header">
              <div className="prod-badge prod-badge-borsa">
                <span className="pulse" style={{ width: 5, height: 5, background: '#00d25a', boxShadow: '0 0 8px rgba(0,210,90,.8)' }} />
                BORSA ANALİZ · LIVE
              </div>
              <div className="prod-title">
                BIST <span className="acc-g">Quantum</span><br />Borsa Motoru
              </div>
              <p className="prod-desc">
                BIST100 hisseleri için özel tasarlanmış kurumsal analiz sistemi. ICT Order Block,
                Wyckoff fazları ve ₺ bazlı sniper giriş bölgesi ile AL/SAT setup üretimi.
              </p>
              <div className="prod-tags">
                {['ICT BIST', 'Wyckoff Faz', 'Order Block', 'FVG', 'Sniper Entry', 'SL/TP ₺', 'Confluence', '100+ Hisse'].map(t => (
                  <span className="prod-tag" key={t} style={{ borderColor: 'rgba(0,210,90,.12)', color: '#334155' }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="prod-mock"><BorsaMockCard /></div>
            <div className="prod-footer">
              <button className="btn-prod btn-prod-borsa" onClick={() => router.push('/borsa')}>
                BORSA ANALİZİ BAŞLAT →
              </button>
              <div className="prod-stats">
                <span className="prod-stat"><span className="prod-stat-ok-g">✓</span> BIST100 + tüm hisseler</span>
                <span className="prod-stat"><span className="prod-stat-ok-g">✓</span> Kurumsal Wyckoff motoru</span>
                <span className="prod-stat"><span className="prod-stat-ok-g">✓</span> ₺ bazlı SL/TP hesabı</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <div className="ticker-item" key={i}>
              <span className="ticker-sym" style={t.bist ? { color: '#00d25a' } : {}}>{t.sym}</span>
              {t.bist && <span style={{ fontSize: 8, color: '#1e4a2a', fontWeight: 700, letterSpacing: .5 }}>BIST</span>}
              <span className="ticker-price">{t.price}</span>
              <span className={t.up ? 'ticker-up' : 'ticker-dn'}>{t.chg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PROOF BAR */}
      <div className="proof-bar">
        <div className="proof-inner">
          {[
            { n: '9', l: 'Analiz Katmanı' },
            { n: '30+', l: 'Teknik Faktör' },
            { n: '4', l: 'Zaman Dilimi' },
            { n: '%91', l: 'Maks Win Rate' },
            { n: '50+', l: 'Desteklenen Coin' },
            { n: '<3s', l: 'Analiz Süresi' },
          ].map((s, i, a) => (
            <>
              <div className="proof-item" key={i}>
                <div className="proof-num">{s.n}</div>
                <div className="proof-lbl">{s.l}</div>
              </div>
              {i < a.length - 1 && <div className="proof-sep" key={`s${i}`} />}
            </>
          ))}
        </div>
      </div>

      {/* WHY */}
      <div className="why-wrap" id="why">
        <div className="why-inner">
          <div className="sec-tag">Özellikler</div>
          <h2 className="sec-h2">Her şeyi tek analizde</h2>
          <p className="sec-p">30+ faktörü 4 zaman diliminde birleştiren kurumsal metodoloji. Saatler süren araştırmayı saniyeye indiriyoruz.</p>
          <div className="why-grid">
            {WHY.map((w, i) => (
              <div className="why-card" key={i} style={{ '--c': w.c }}>
                <div className="why-icon" style={{ background: `${w.c}10`, borderColor: `${w.c}20` }}>
                  <span style={{ color: w.c }}>{w.icon}</span>
                </div>
                <div className="why-body">
                  <div className="why-t">{w.title}</div>
                  <div className="why-d">{w.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW */}
      <div className="how-wrap">
        <div className="how-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="sec-tag" style={{ textAlign: 'center' }}>Nasıl Çalışır</div>
            <h2 className="sec-h2" style={{ textAlign: 'center', margin: '0 auto', maxWidth: 520 }}>Üç adımda kurumsal sinyal</h2>
          </div>
          <div className="how-steps">
            {[
              { n: '01', t: 'Coin Seçin', d: "BTC, ETH ve 50'den fazla USDT paritesinden analiz etmek istediğinizi seçin." },
              { n: '02', t: 'Motor Çalışır', d: 'Binance/OKX\'ten anlık kline çekilir, 9 katman paralel hesaplanır, 30+ faktör değerlendirilir.' },
              { n: '03', t: 'Planı Uygulayın', d: 'ATR tabanlı giriş bölgesi, stop-loss ve üç hedef fiyat hazır. Karar her zaman sizin.' },
            ].map((s, i) => (
              <div className="how-step" key={i}>
                <div className="step-n">{s.n}</div>
                <div className="step-t">{s.t}</div>
                <div className="step-d">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LAYERS */}
      <div className="layers-wrap" id="layers">
        <div className="layers-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="sec-tag" style={{ textAlign: 'center' }}>Analiz Motoru</div>
            <h2 className="sec-h2" style={{ textAlign: 'center', margin: '0 auto', maxWidth: 500 }}>6-Katman · 100 Puan Sistemi</h2>
            <p className="sec-p" style={{ textAlign: 'center', margin: '10px auto 0', maxWidth: 480 }}>85+ puan = <strong style={{ color: '#00d4ff' }}>APEX ENTRY</strong> — %82-91 win rate tahmini</p>
          </div>
          <div className="layers-list">
            {LAYERS.map((l, i) => (
              <div className="lrow" key={i}>
                <span className="lrow-id" style={{ color: l.color }}>{l.id}</span>
                <span className="lrow-name">{l.name}</span>
                <div className="lrow-bar"><div className="lrow-fill" style={{ width: `${(l.max / 22) * 100}%`, background: l.color }} /></div>
                <div className="lrow-tags">
                  {l.tags.map((t, j) => <span className="lrow-tag" key={j}>{t}</span>)}
                </div>
                <span className="lrow-score" style={{ color: l.color }}>{l.max}pt</span>
              </div>
            ))}
          </div>
          <div className="layers-note">
            <strong>Toplam 100 puan</strong> · Funding Rate · Open Interest · Long/Short oranı · Binance/OKX canlı veri
          </div>
        </div>
      </div>

      {/* COMPARE */}
      <div className="compare-wrap">
        <div className="compare-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="sec-tag" style={{ textAlign: 'center' }}>Karşılaştırma</div>
            <h2 className="sec-h2" style={{ textAlign: 'center', margin: '0 auto', maxWidth: 500 }}>DeepTradeScan vs Diğerleri</h2>
          </div>
          <div className="compare-table" style={{ marginTop: 36 }}>
            <div className="ct-header">Özellik</div>
            <div className="ct-header hl">◈ DeepTradeScan</div>
            <div className="ct-header">Diğer Araçlar</div>
            {COMPARE.map((c, i) => (
              <div className="ct-row" key={i}>
                <div className="ct-cell feat">{c.feat}</div>
                <div className="ct-cell hl"><span className="ct-yes">✓ Dahil</span></div>
                <div className="ct-cell"><span className={c.other === true ? 'ct-yes' : 'ct-no'}>{c.other === true ? '✓' : c.other === false ? '✗ Yok' : c.other}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLANS */}
      <div className="plans-wrap" id="plans">
        <div className="plans-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="sec-tag" style={{ textAlign: 'center' }}>Fiyatlandırma</div>
            <h2 className="sec-h2" style={{ textAlign: 'center', margin: '0 auto', maxWidth: 440 }}>İhtiyacınıza uygun plan</h2>
            <p className="sec-p" style={{ textAlign: 'center', margin: '14px auto 0' }}>Ücretsiz başlayın, büyüdükçe yükseltin</p>
          </div>
          <div className="plans-grid">
            {PLANS.map((p, i) => (
              <div className={`plan-card ${p.cls}`} key={i}>
                {p.badge && <div className="plan-badge">{p.badge}</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">{p.price}<span className="plan-per">{p.per}</span></div>
                <div className="plan-desc">{p.desc}</div>
                <div className="plan-div" />
                <ul className="plan-feats">
                  {p.feats.map((f, j) => <li className="plan-feat" key={j}><span className="feat-ok">✓</span>{f}</li>)}
                </ul>
                <button className={`btn-plan ${p.cls}`} onClick={scrollToAuth}>{p.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROFESSIONAL CTA SECTION */}
      <div className="cta-section" style={{ marginTop: 60 }}>
        <div className="cta-inner">

          {/* Metrics strip */}
          <div className="cta-metrics">
            <div className="cta-metric" style={{ '--mc': '#00d4ff' }}>
              <div className="cta-m-val" style={{ color: '#00d4ff' }}>9</div>
              <div className="cta-m-lbl">Analiz Katmanı</div>
              <div className="cta-m-sub" style={{ color: '#64748b' }}>SMC · ICT · Wyckoff</div>
            </div>
            <div className="cta-metric" style={{ '--mc': '#a855f7' }}>
              <div className="cta-m-val" style={{ color: '#a855f7' }}>4 TF</div>
              <div className="cta-m-lbl">Multi-Timeframe</div>
              <div className="cta-m-sub" style={{ color: '#64748b' }}>15m · 1H · 4H · 1D</div>
            </div>
            <div className="cta-metric" style={{ '--mc': '#00ff9d' }}>
              <div className="cta-m-val" style={{ color: '#00ff9d' }}>%70–80</div>
              <div className="cta-m-lbl">Win Rate Hedefi</div>
              <div className="cta-m-sub" style={{ color: '#64748b' }}>hedef · garanti değil</div>
            </div>
            <div className="cta-metric" style={{ '--mc': '#f59e0b' }}>
              <div className="cta-m-val" style={{ color: '#f59e0b' }}>M1–M8</div>
              <div className="cta-m-lbl">Quantum Modüller</div>
              <div className="cta-m-sub" style={{ color: '#f59e0b' }}>Regime · Entry · Risk</div>
            </div>
          </div>

          {/* Main content */}
          <div className="cta-main">
            <div className="cta-left">
              <div className="cta-eyebrow"><span className="pulse" /> Kripto &amp; Borsa · Canlı</div>
              <h2 className="cta-h2">
                Hangi piyasada<br />
                olursan ol,<br />
                kurumsal analiz<br />
                <span className="grad-c">burada.</span>
              </h2>
              <p className="cta-sub">
                Kripto için <strong>SMC/ICT</strong> · BIST için <strong>Quantum Borsa Engine</strong><br />
                9 katmanlı kurumsal analiz · Win rate hedef %70–80 · Ücretsiz başla
              </p>
              <div className="cta-actions">
                <button className="btn-main" onClick={scrollToAuth}>Kripto Analizi Başlat →</button>
                <button className="btn-sec" onClick={() => router.push('/borsa')} style={{ borderColor: 'rgba(0,210,90,.3)', color: '#00d25a' }}>
                  Borsa Analizi →
                </button>
              </div>
              <div className="cta-note">
                Zaten hesabınız var mı?
                <button onClick={scrollToAuth}>Giriş yapın</button>
              </div>
            </div>

            <div className="cta-right">
              {[
                { icon: '◈', title: 'DeepTradeScan Kripto', desc: 'SMC · ICT · Multi-TF Confluence · 9 Katman', wr: 'WR %70–80', wrc: 'rgba(0,255,157,.08)', wrt: '#00ff9d', wrb: 'rgba(0,255,157,.2)', c: '#00d4ff' },
                { icon: '⊞', title: 'Quantum Borsa Engine', desc: 'BIST hisse analizi · Teknik + Temel katman', wr: 'BIST Uzmanı', wrc: 'rgba(0,210,90,.08)', wrt: '#00d25a', wrb: 'rgba(0,210,90,.2)', c: '#00d25a' },
                { icon: '◉', title: 'Quantum Meta System v2', desc: 'M1–M8 modüller · Kurumsal sinyal motoru', wr: '9 Modül', wrc: 'rgba(168,85,247,.08)', wrt: '#c084fc', wrb: 'rgba(168,85,247,.2)', c: '#a855f7' },
                { icon: '◧', title: 'Dinamik Risk Yönetimi', desc: 'ATR tabanlı SL · Kelly Criterion · TP yönetimi', wr: 'R:R ≥ 2.5×', wrc: 'rgba(245,158,11,.08)', wrt: '#f59e0b', wrb: 'rgba(245,158,11,.2)', c: '#f59e0b' },
              ].map((card, i) => (
                <div className="cta-card" key={i} style={{ '--cc': card.c }}>
                  <div className="cta-card-icon" style={{ borderColor: `${card.c}22`, color: card.c }}>{card.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                      <div className="cta-card-title">{card.title}</div>
                      <div className="cta-card-wr" style={{ background: card.wrc, color: card.wrt, border: `1px solid ${card.wrb}` }}>{card.wr}</div>
                    </div>
                    <div className="cta-card-desc">{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* FAQ */}
      <div className="faq-wrap" id="faq">
        <div className="faq-inner">
          <div style={{ textAlign: 'center', marginBottom: 0 }}>
            <div className="sec-tag" style={{ textAlign: 'center' }}>SSS</div>
            <h2 className="sec-h2" style={{ textAlign: 'center', margin: '0 auto', maxWidth: 400 }}>Sık sorulan sorular</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((f, i) => (
              <div className={`faq-item${openFaq === i ? ' open' : ''}`} key={i}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {f.q}<span className="faq-ch">▼</span>
                </button>
                <div className="faq-a"><div className="faq-ai">{f.a}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AUTH */}
      <div className="auth-section" ref={authRef} id="auth">
        <div className="auth-wrap">
          <div className="auth-left">
            <div className="auth-tag">Hemen Başlayın</div>
            <h2 className="auth-h2">Ücretsiz hesap açın,<br />anında analiz yapın</h2>
            <p className="auth-p">Kayıt olmak 60 saniye sürer. Kredi kartı bilgisi gerekmez. İlk analizinizi bugün yapın.</p>
            <ul className="auth-pts">
              <li className="auth-pt"><span className="apt-ok">✓</span>Günde 5 analiz tamamen ücretsiz</li>
              <li className="auth-pt"><span className="apt-ok">✓</span>9 katman: SMC, ICT, Wyckoff, Fibonacci, Ichimoku</li>
              <li className="auth-pt"><span className="apt-ok">✓</span>ATR tabanlı stop-loss ve üç hedef hesabı</li>
              <li className="auth-pt"><span className="apt-ok">✓</span>Portfolio backtest ve gerçek zamanlı P&L</li>
            </ul>
          </div>
          <div className="auth-right">
            <div className="auth-card">
              <div className="auth-tabs">
                <button className={`auth-tab${tab === 'login' ? ' on' : ''}`} onClick={() => { setTab('login'); setMsg(null); }}>Giriş Yap</button>
                <button className={`auth-tab${tab === 'register' ? ' on' : ''}`} onClick={() => { setTab('register'); setMsg(null); }}>Kayıt Ol</button>
              </div>
              <form onSubmit={handleAuth}>
                {tab === 'register' && (
                  <div className="auth-field">
                    <label>Ad Soyad</label>
                    <input type="text" placeholder="Adınız Soyadınız" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
                  </div>
                )}
                <div className="auth-field">
                  <label>E-posta</label>
                  <input type="email" placeholder="ornek@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="auth-field">
                  <label>Şifre</label>
                  <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
                </div>
                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? 'Bekleniyor...' : tab === 'login' ? 'Giriş Yap →' : 'Hesap Oluştur →'}
                </button>
              </form>
              {msg && <div className={`auth-msg ${msg.type}`}>{msg.text}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <a href="/" className="footer-logo">
              <img src="/logo.svg" alt="DeepTradeScan" width="28" height="28" style={{ borderRadius: 8 }} />
              DeepTradeScan
            </a>
            <p className="footer-desc">Kurumsal düzeyde kripto teknik analiz platformu. ICT, SMC, Wyckoff metodolojisi.</p>
          </div>
          <div className="footer-col">
            <h5>Platform</h5>
            <ul>
              {[['Özellikler', '#why'], ['Motor', '#layers'], ['Planlar', '#plans'], ['SSS', '#faq'], ['Giriş Yap', '#auth']].map(([l, h]) => (
                <li key={l}><a href={h}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h5>Uygulamalar</h5>
            <ul>
              <li><a href="/app">Kripto Analiz</a></li>
              <li><a href="/borsa">Borsa Analiz</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Bağlantılar</h5>
            <ul>
              <li><a href="https://t.me/deeptradescan" target="_blank" rel="noreferrer">Telegram</a></li>
              <li><a href="#faq">SSS</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© {new Date().getFullYear()} DeepTradeScan. Tüm hakları saklıdır.</div>
          <div className="footer-risk">Kripto para ticareti yüksek risk içerir. Bu platform finansal tavsiye vermez; analizler yalnızca teknik bilgi amaçlıdır. Yatırım kararlarınızın sorumluluğu size aittir.</div>
        </div>
      </footer>
    </>
  );
}
