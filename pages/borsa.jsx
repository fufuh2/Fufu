import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

// ── Hisse Listesi & Kategoriler ────────────────────────────────────────────────
const BIST_STOCKS = {
  // Bankacılık
  GARAN:'Garanti BBVA', AKBNK:'Akbank', ISCTR:'İş Bankası C', HALKB:'Halkbank',
  VAKBN:'Vakıfbank', YKBNK:'Yapı Kredi', QNBFB:'QNB Finansbank', TSKB:'TSKB', ALBRK:'Albaraka Türk',
  // Holding
  KCHOL:'Koç Holding', SAHOL:'Sabancı Holding', DOHOL:'Doğan Holding', EKGYO:'Emlak Konut GYO',
  ENKAI:'Enka İnşaat', BERA:'Bera Holding', GLYHO:'Global Yatırım Holding',
  // Enerji
  TUPRS:'Tüpraş', PETKM:'Petkim', AKENR:'Akenerji', AKSEN:'Aksa Enerji',
  ZOREN:'Zorlu Enerji', ODAS:'Odaş Elektrik',
  // Sanayi & Çelik
  EREGL:'Ereğli Demir', KRDMD:'Kardemir', SASA:'Sasa Polyester', SISE:'Şişe Cam',
  GUBRF:'Gübre Fab.', TRKCM:'Trakya Cam', ALKIM:'Alkim Kimya',
  // Otomotiv & Makine
  FROTO:'Ford Otosan', TOASO:'Tofaş', ARCLK:'Arçelik', DOAS:'Doğuş Otomotiv',
  BRISA:'Brisa', TTRAK:'Türk Traktör', OTKAR:'Otokar',
  // Teknoloji & Savunma
  ASELS:'Aselsan', LOGO:'Logo Yazılım', VESTL:'Vestel', KAREL:'Karel Elektronik',
  NETAS:'Netaş Telekomünikasyon', RODRG:'Roketsan', INDES:'İndeks Bilgisayar', DGATE:'Datagate',
  // Perakende & Gıda
  BIMAS:'BİM', MGROS:'Migros', SOKM:'Şok Market', ULKER:'Ülker', MAVI:'Mavi',
  TATGD:'Tat Gıda', BANVT:'Banvit', PNSUT:'Pınar Süt', CCOLA:'Coca-Cola İçecek',
  AEFES:'Anadolu Efes', CRFSA:'CarrefourSA', BIZIM:'Bizim Toptan',
  // Havacılık & Ulaşım
  THYAO:'Türk Hava Yolları', PGSUS:'Pegasus', TAVHL:'TAV Havalimanları', CLEBI:'Çelebi Havacılık',
  // İletişim
  TCELL:'Turkcell', TTKOM:'Türk Telekom',
  // Altın & Madencilik
  KOZAL:'Koza Altın', KOZAA:'Koza Anadolu Metal', IPEKE:'İpek Doğal Enerji',
  // Gayrimenkul (GYO)
  ISGYO:'İş GYO', SNGYO:'Sinpaş GYO', TRGYO:'Torunlar GYO', DGGYO:'Doğuş GYO',
  // Çimento & İnşaat
  CIMSA:'Çimsa Çimento', AKCNS:'Akçansa', ADANA:'Adana Çimento', BOLUC:'Bolu Çimento', MRDIN:'Mardin Çimento',
  // Sigorta & Finans
  ANHYT:'Anadolu Hayat', RAYSG:'Ray Sigorta', AKGRT:'Aksigorta',
};

const SEKTORLER = {
  ALL:      { label:'TÜMÜ',       color:'#94A3B8', tickers: null },
  BANKA:    { label:'BANKA',      color:'#38BDF8', tickers:['GARAN','AKBNK','ISCTR','HALKB','VAKBN','YKBNK','QNBFB','TSKB','ALBRK'] },
  HOLDING:  { label:'HOLDİNG',    color:'#A78BFA', tickers:['KCHOL','SAHOL','DOHOL','EKGYO','ENKAI','BERA','GLYHO'] },
  ENERJI:   { label:'ENERJİ',     color:'#FBBF24', tickers:['TUPRS','PETKM','AKENR','AKSEN','ZOREN','ODAS'] },
  SANAYI:   { label:'SANAYİ',     color:'#F97316', tickers:['EREGL','KRDMD','SASA','SISE','GUBRF','TRKCM','ALKIM'] },
  OTOMOTIV: { label:'OTOMOTİV',   color:'#34D399', tickers:['FROTO','TOASO','ARCLK','DOAS','BRISA','TTRAK','OTKAR'] },
  TEKNOLOJI:{ label:'TEKNOLOJİ',  color:'#60A5FA', tickers:['ASELS','LOGO','VESTL','KAREL','NETAS','RODRG','INDES','DGATE'] },
  PERAKENDE:{ label:'PERAKENDE',  color:'#FB923C', tickers:['BIMAS','MGROS','SOKM','ULKER','MAVI','TATGD','BANVT','PNSUT','CCOLA','AEFES','CRFSA','BIZIM'] },
  HAVACILIK:{ label:'HAVAYOLU',   color:'#C084FC', tickers:['THYAO','PGSUS','TAVHL','CLEBI'] },
  ILETISIM: { label:'İLETİŞİM',   color:'#22D3EE', tickers:['TCELL','TTKOM'] },
  ALTIN:    { label:'ALTIN',      color:'#FDE047', tickers:['KOZAL','KOZAA','IPEKE'] },
  GYO:      { label:'GYO',        color:'#F472B6', tickers:['ISGYO','SNGYO','TRGYO','DGGYO'] },
  CIMENTO:  { label:'ÇİMENTO',    color:'#A8A29E', tickers:['CIMSA','AKCNS','ADANA','BOLUC','MRDIN'] },
  SIGORTA:  { label:'SİGORTA',    color:'#4ADE80', tickers:['ANHYT','RAYSG','AKGRT'] },
};

const STEPS = [
  '00 // VERİ_MODELİ — Yahoo Finance Günlük OHLCV',
  '01 // MAKRO_BORSA — BIST100 + USD/TRY Analizi',
  '02 // TEKNİK_ANALİZ — EMA/RSI/MACD/Bollinger',
  '03 // SEKTÖR — Sektör Trendi & Göreli Güç',
  '04 // HACİM — Volume Delta + Smart Money',
  '05 // KURUMSAL — Yabancı Akış + Wyckoff',
  '06 // SENARYO — Boğa / Ayı / MM Tuzak',
  '07 // TRADE_TASARIMI — Giriş/SL/TP (TL)',
  '08 // RİSK_MATRİSİ — Pozisyon & Kayıp Limiti',
  '09 // YÖNETİCİ_ÖZETİ — Kurumsal Karar Planı',
];

const SEC_RE = /^\[(VERİ-MODELİ|MAKRO-BORSA|TEKNİK-ANALİZ|SEKTÖR|HACİM|KURUMSAL|SENARYO|TRADE|RİSK|YONETICI-OZETI|YÖNETICI-ÖZETİ|OZET|MM-DESK)\S*.*\]$/i;
const KV_RE  = /^([^:\n]{2,60}):\s*(.+)$/;

function parse(raw) {
  if (!raw) return [];
  const lines = raw.replace(/\*\*/g,'').replace(/\*/g,'').replace(/#{1,6}\s*/g,'').split('\n').map(l=>l.trim()).filter(l=>l.length>1);
  const blocks=[]; let cur=null;
  for (const line of lines) {
    const sm = line.match(SEC_RE);
    if (sm) { if(cur) blocks.push(cur); cur={type:'section',id:sm[1].toUpperCase().replace('Ö','O').replace('İ','I'),raw:line.replace(/[\[\]]/g,''),items:[]}; continue; }
    if (!cur) cur={type:'section',id:'HEADER',raw:'GENEL',items:[]};
    const kvm = line.match(KV_RE);
    if (kvm) cur.items.push({t:'kv',k:kvm[1].trim(),v:kvm[2].trim()});
    else if (line.length>3) cur.items.push({t:'txt',v:line});
  }
  if (cur) blocks.push(cur);
  return blocks;
}

const SEC_CFG = {
  'VERI-MODELI':    {icon:'◉',label:'0 · VERİ MODELİ & KISITLAR',          color:'#64748B',accent:'rgba(100,116,139,.08)'},
  'MAKRO-BORSA':    {icon:'◉',label:'1 · MAKRO BORSA & USD/TRY',             color:'#38BDF8',accent:'rgba(56,189,248,.09)'},
  'TEKNIK-ANALIZ':  {icon:'▤',label:'2 · TEKNİK ANALİZ — ICT/SMC',          color:'#F97316',accent:'rgba(249,115,22,.09)'},
  'SEKTOR':         {icon:'◎',label:'3 · SEKTÖR ANALİZİ',                    color:'#A78BFA',accent:'rgba(167,139,250,.09)'},
  'HACIM':          {icon:'▤',label:'4 · HACİM & SMART MONEY',               color:'#FBBF24',accent:'rgba(251,191,36,.09)'},
  'KURUMSAL':       {icon:'◆',label:'5 · KURUMSAL & YABANCILAR',             color:'#818CF8',accent:'rgba(129,140,248,.09)'},
  'SENARYO':        {icon:'◉',label:'6 · SENARYO MOTORU',                    color:'#60A5FA',accent:'rgba(96,165,250,.09)'},
  'TRADE':          {icon:'⚡',label:'7 · TRADE TASARIMI — GİRİŞ/SL/TP',    color:'#10B981',accent:'rgba(16,185,129,.10)'},
  'RISK':           {icon:'△',label:'8 · RİSK MATRİSİ',                     color:'#FBBF24',accent:'rgba(251,191,36,.08)'},
  'YONETICI-OZETI': {icon:'✦',label:'9 · YÖNETİCİ ÖZETİ — KURUMSAL KARAR', color:'#00FFB2',accent:'rgba(0,255,178,.13)'},
  'MM-DESK':        {icon:'◈',label:'MARKET MAKER MASASI — 20 YIL BIST TECRÜBESİ', color:'#FFD700',accent:'rgba(255,215,0,.10)'},
  'DEFAULT':        {icon:'▸',label:'VERİ',                                  color:'#94A3B8',accent:'rgba(148,163,184,.04)'},
};

function secCfg(id='') {
  for (const [k,v] of Object.entries(SEC_CFG)) { if(id.startsWith(k)) return v; }
  return SEC_CFG.DEFAULT;
}

const VISIBLE_IDS = new Set(['MM-DESK','YONETICI-OZETI','YONETICI','OZET','SENARYO']);

const VERDICT_META = {
  PRIME_AL:  {label:'PRIME APEX AL',  color:'#00FFB2',glow:'rgba(0,255,178,.40)',bg:'rgba(0,255,178,.10)',icon:'▲▲▲',tagline:'S+ SİNYAL — PRIME APEX GİRİŞ — En Yüksek Kalite Kurumsal Setup'},
  GUCLU_AL:  {label:'GÜÇLÜ AL',       color:'#10B981',glow:'rgba(16,185,129,.35)',bg:'rgba(16,185,129,.10)',icon:'▲▲', tagline:'S SİNYAL — KURUMSAL ALIM — Yabancı fon uzun pozisyon açıyor'},
  AL:        {label:'AL',             color:'#34D399',glow:'rgba(52,211,153,.25)',bg:'rgba(52,211,153,.08)',icon:'▲',  tagline:'A SİNYAL — ALIM BÖLGESİ — Konfluens onaylı uzun setup'},
  BEKLE:     {label:'BEKLE',          color:'#F59E0B',glow:'rgba(245,158,11,.20)',bg:'rgba(245,158,11,.08)',icon:'◆',  tagline:'SIKIŞ — Kırılım yönü için bekle'},
  SAT:       {label:'SAT',            color:'#F97316',glow:'rgba(249,115,22,.25)',bg:'rgba(249,115,22,.08)',icon:'▼',  tagline:'A SİNYAL — SATIM BÖLGESİ — Konfluens onaylı kısa setup'},
  GUCLU_SAT: {label:'GÜÇLÜ SAT',      color:'#EF4444',glow:'rgba(239,68,68,.35)', bg:'rgba(239,68,68,.10)', icon:'▼▼', tagline:'S SİNYAL — KURUMSAL SATIM — Dağıtım aşaması'},
  PRIME_SAT: {label:'PRIME APEX SAT', color:'#FF4B6E',glow:'rgba(255,75,110,.40)',bg:'rgba(255,75,110,.10)',icon:'▼▼▼',tagline:'S+ SİNYAL — PRIME APEX ÇIKIŞ — En Yüksek Kalite Kısa Setup'},
};

function fmtTL(v) {
  if (v == null || isNaN(v)) return '—';
  const n = parseFloat(v);
  if (n >= 1000) return '₺' + n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if (n >= 1)    return '₺' + n.toFixed(4);
  return '₺' + n.toFixed(6);
}
function fmtPct(v) {
  if (v == null || isNaN(v)) return '—';
  return (v>0?'+':'')+parseFloat(v).toFixed(2)+'%';
}
function fmtVol(v) {
  if (!v) return '—';
  if (v>=1e9) return (v/1e9).toFixed(1)+'B lot';
  if (v>=1e6) return (v/1e6).toFixed(0)+'M lot';
  if (v>=1e3) return (v/1e3).toFixed(0)+'K lot';
  return v+' lot';
}
function fmtMktCap(v) {
  if (!v) return '—';
  if (v>=1e12) return '₺'+(v/1e12).toFixed(2)+'T';
  if (v>=1e9)  return '₺'+(v/1e9).toFixed(1)+'Mrd';
  if (v>=1e6)  return '₺'+(v/1e6).toFixed(0)+'Mn';
  return '₺'+v;
}

async function apiAuth(action,body={},token='') {
  try {
    const r = await fetch(`/api/auth?action=${action}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':token?`Bearer ${token}`:''},body:JSON.stringify(body)});
    return await r.json();
  } catch { return {error:'Bağlantı hatası'}; }
}


// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
:root {
  --bg:#060c18; --panel:#091220; --card:#0d1a2d; --card2:#111f33;
  --border:rgba(30,60,100,.45); --accent:#00D4FF; --green:#10B981; --red:#EF4444;
  --t1:#E2EAF4; --t2:#7A9BBF; --t3:#3A5A7A;
  --mono:'JetBrains Mono',monospace;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--t1);font-family:Inter,sans-serif;overflow-x:hidden;}
.layout{display:flex;flex-direction:column;min-height:100vh;max-width:1400px;margin:0 auto;}
.topbar{display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-bottom:1px solid var(--border);background:rgba(6,12,24,.95);backdrop-filter:blur(12px);position:sticky;top:0;z-index:100;}
.workspace{display:flex;flex:1;overflow:hidden;}
.sidebar-l{width:220px;flex-shrink:0;border-right:1px solid var(--border);background:var(--panel);display:flex;flex-direction:column;overflow:hidden;}
.sidebar-r{width:300px;flex-shrink:0;border-left:1px solid var(--border);background:var(--panel);overflow-y:auto;}
.main-panel{flex:1;overflow-y:auto;padding:20px;}
.ph{padding:10px 14px;font-family:var(--mono);font-size:9px;font-weight:700;color:var(--t3);letter-spacing:1.5px;border-bottom:1px solid var(--border);background:rgba(0,0,0,.2);}
.search-inp{width:100%;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:7px 10px;color:var(--t1);font-family:var(--mono);font-size:11px;outline:none;}
.search-inp:focus{border-color:rgba(0,212,255,.4);box-shadow:0 0 0 2px rgba(0,212,255,.08);}
.pill{padding:3px 9px;border-radius:12px;font-family:var(--mono);font-size:8px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--t3);transition:all .15s;}
.pill.on{background:rgba(0,212,255,.1);border-color:rgba(0,212,255,.3);color:var(--accent);}
.hisse-row{padding:8px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.03);transition:background .1s;display:flex;align-items:center;justify-content:space-between;gap:6px;}
.hisse-row:hover{background:rgba(0,212,255,.04);}
.hisse-row.on{background:rgba(0,212,255,.08);border-left:2px solid var(--accent);}
.btn-exec{background:linear-gradient(135deg,#0ea5e9,#00D4FF,#7C3AED);color:#fff;border:none;border-radius:8px;padding:10px 22px;font-family:var(--mono);font-size:11px;font-weight:800;cursor:pointer;letter-spacing:.8px;display:flex;align-items:center;gap:8px;transition:all .2s;box-shadow:0 4px 20px rgba(0,212,255,.3);}
.btn-exec:disabled{opacity:.5;cursor:not-allowed;}
.btn-sm{padding:5px 12px;font-size:9px;}
.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes slide-up{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.6;}}
@keyframes glow-pulse{0%,100%{opacity:.8;}50%{opacity:1;}}
.progress-wrap{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:16px;}
.progress-bar{height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;margin-top:8px;}
.progress-fill{height:100%;background:linear-gradient(90deg,#059669,#10B981,#00FFB2);border-radius:3px;transition:width .5s ease;animation:glow-pulse 1.5s infinite;}
/* Analysis Report */
.analysis-report{display:flex;flex-direction:column;gap:8px;animation:slide-up .5s ease;}
.report-header{display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.15);border-radius:8px;margin-bottom:4px;}
.report-header-icon{font-size:16px;color:var(--accent);}
.report-header-title{font-family:var(--mono);font-size:10px;font-weight:800;color:var(--accent);letter-spacing:.8px;flex:1;}
.ablock{background:var(--card);border:1px solid var(--border);border-radius:8px;overflow:hidden;border-left-width:3px;}
.ablock-head{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--border);}
.ablock-icon{font-size:13px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid;flex-shrink:0;}
.ablock-label{font-family:var(--mono);font-size:9px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;}
.kv-row{display:flex;justify-content:space-between;align-items:flex-start;padding:6px 14px;border-bottom:1px solid rgba(255,255,255,.03);gap:12px;}
.kv-key{font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.3px;flex-shrink:0;max-width:50%;}
.kv-val{font-family:var(--mono);font-size:9.5px;font-weight:600;color:var(--t1);text-align:right;word-break:break-word;}
.txt-row{padding:6px 14px;font-family:var(--mono);font-size:9px;color:var(--t2);line-height:1.6;border-bottom:1px solid rgba(255,255,255,.02);}
/* Verdict Banner */
.verdict-banner{border-radius:10px;overflow:hidden;animation:slide-up .5s ease;margin-bottom:16px;}
/* Mob Nav */
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(6,12,24,.97);border-top:1px solid var(--border);backdrop-filter:blur(16px);z-index:200;padding:6px 0 max(env(safe-area-inset-bottom),6px);}
.mob-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:transparent;border:none;color:var(--t3);font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:.5px;cursor:pointer;padding:4px 2px;transition:color .15s;}
.mob-btn.on{color:var(--accent);}
.mob{display:none;}
/* Auth — Professional Split Layout */
.borsa-auth-page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;background:var(--bg);position:relative;overflow:hidden;}
.borsa-auth-page::before{content:'';position:absolute;top:-200px;left:-200px;width:700px;height:700px;background:radial-gradient(circle,rgba(251,191,36,.04) 0%,transparent 65%);pointer-events:none;}
.borsa-auth-page::after{content:'';position:absolute;bottom:-150px;right:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(0,212,255,.05) 0%,transparent 65%);pointer-events:none;}
.bal-left{padding:52px 56px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid var(--border);position:relative;z-index:1;gap:0;}
.bal-right{padding:52px 56px;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;z-index:1;}
/* left — logo & brand */
.bal-logo{display:flex;align-items:center;gap:10px;margin-bottom:40px;}
.bal-logo-mark{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#FBBF24,#F97316);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:14px;font-weight:900;color:#000;box-shadow:0 0 20px rgba(251,191,36,.3);flex-shrink:0;}
.bal-logo-name{font-family:var(--mono);font-size:15px;font-weight:900;letter-spacing:-.3px;color:var(--t1);}
.bal-logo-name span{color:#FBBF24;}
/* left — headline */
.bal-eyebrow{display:inline-flex;align-items:center;gap:7px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);color:#FBBF24;padding:4px 13px;border-radius:100px;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:18px;}
.bal-h1{font-size:clamp(24px,3vw,38px);font-weight:900;line-height:1.1;letter-spacing:-1.5px;color:var(--t1);margin-bottom:14px;}
.bal-h1 .yg{color:#FBBF24;}
.bal-sub{font-size:14px;color:var(--t3);line-height:1.75;margin-bottom:32px;max-width:400px;}
/* free badge */
.bal-free-badge{display:flex;align-items:center;gap:12px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);border-radius:12px;padding:14px 18px;margin-bottom:28px;}
.bal-free-icon{width:36px;height:36px;border-radius:9px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.bal-free-title{font-family:var(--mono);font-size:11px;font-weight:800;color:#10B981;letter-spacing:.3px;margin-bottom:2px;}
.bal-free-desc{font-size:12px;color:var(--t3);line-height:1.45;}
/* features */
.bal-feats{display:flex;flex-direction:column;gap:9px;}
.bal-feat{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--t2);}
.bal-feat-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
/* right — form card */
.bal-card{width:100%;max-width:420px;background:rgba(9,18,32,.9);border:1px solid var(--border);border-radius:20px;padding:36px;backdrop-filter:blur(20px);}
.bal-tabs{display:flex;background:rgba(0,0,0,.4);border-radius:10px;padding:4px;margin-bottom:28px;border:1px solid rgba(255,255,255,.05);}
.bal-tab{flex:1;padding:9px;border:none;background:none;border-radius:7px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.5px;color:var(--t3);cursor:pointer;transition:all .15s;}
.bal-tab.on{background:rgba(251,191,36,.12);color:#FBBF24;box-shadow:0 1px 6px rgba(251,191,36,.15);}
.bal-field{margin-bottom:12px;}
.bal-field label{display:block;font-family:var(--mono);font-size:9px;font-weight:700;color:var(--t3);letter-spacing:.8px;text-transform:uppercase;margin-bottom:6px;}
.bal-input{width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:9px;padding:11px 14px;color:var(--t1);font-family:var(--mono);font-size:12px;outline:none;transition:border-color .15s;}
.bal-input:focus{border-color:rgba(251,191,36,.5);box-shadow:0 0 0 3px rgba(251,191,36,.06);}
.bal-input::placeholder{color:var(--t3);}
.bal-submit{width:100%;padding:13px;background:linear-gradient(135deg,#FBBF24,#F97316);color:#000;border:none;border-radius:10px;font-family:var(--mono);font-size:12px;font-weight:800;letter-spacing:.8px;cursor:pointer;transition:all .2s;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(251,191,36,.25);}
.bal-submit:hover:not(:disabled){opacity:.92;transform:translateY(-1px);box-shadow:0 8px 28px rgba(251,191,36,.35);}
.bal-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.bal-switch{text-align:center;margin-top:14px;font-family:var(--mono);font-size:9px;color:var(--t3);}
.bal-switch button{background:none;border:none;color:#FBBF24;cursor:pointer;font-family:var(--mono);font-size:9px;font-weight:700;padding:0;}
.bal-risk{text-align:center;margin-top:16px;font-family:var(--mono);font-size:8.5px;color:var(--t3);line-height:1.5;padding-top:16px;border-top:1px solid rgba(255,255,255,.04);}
/* responsive */
@media(max-width:860px){
  .borsa-auth-page{grid-template-columns:1fr;}
  .bal-left{padding:32px 24px 24px;border-right:none;border-bottom:1px solid var(--border);}
  .bal-right{padding:28px 24px 40px;}
  .bal-card{max-width:100%;}
  .bal-logo{margin-bottom:24px;}
  .bal-sub{display:none;}
}
@media(max-width:480px){
  .bal-left{padding:24px 20px 20px;}
  .bal-right{padding:20px 20px 36px;}
  .bal-card{padding:26px 20px;}
  .bal-h1{font-size:22px;}
}
/* keep old auth-wrap for potential fallback */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at top,rgba(0,212,255,.06) 0%,transparent 60%),var(--bg);padding:20px;}
.auth-box{width:100%;max-width:400px;background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:32px;}
/* Stat chip */
.stat-chip{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 14px;text-align:center;}
/* Mobile overrides */
@media(max-width:900px){
  .sidebar-l,.sidebar-r{display:none;}
  .main-panel{padding:12px 12px 90px;}
  .mob-nav{display:flex;}
  .mob{display:flex;}
  .topbar{padding:8px 14px;}
}
@media(max-width:640px){
  .main-panel{padding:10px 10px 90px;}
  .topbar{gap:6px;}
}
/* Mobile Hisse Tab */
.mob-pills-scroll{display:flex;gap:4px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;padding-bottom:2px;}
.mob-pills-scroll::-webkit-scrollbar{display:none;}
.mob-hisse-sticky{position:sticky;top:0;z-index:10;background:var(--bg);padding:10px 12px 8px;border-bottom:1px solid var(--border);}
.mob-hisse-item{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;transition:background .12s;}
.mob-hisse-item:active{background:rgba(0,212,255,.07);}
.mob-hisse-item.on{background:rgba(0,212,255,.08);border-left:2px solid var(--accent);}
.mob-btn{flex:1;min-width:0;}
.mob-blk{display:none;}
@media(max-width:900px){.mob-blk{display:block;}}
.mob-hide{display:block;}
@media(max-width:900px){.mob-hide{display:none;}}
/* Ticker seçici chip (mobil header) */
.mob-ticker-sel{display:none;}
@media(max-width:900px){
  .mob-ticker-sel{display:flex;align-items:center;justify-content:space-between;gap:8px;
    margin-top:10px;padding:10px 14px;background:rgba(251,191,36,.06);
    border:1px solid rgba(251,191,36,.2);border-radius:8px;cursor:pointer;
    -webkit-tap-highlight-color:transparent;}
  .mob-ticker-sel:active{background:rgba(251,191,36,.12);}
}
/* ── Quantum Analysis Panel (BistQuantumPanel) ── */
.bq-panel{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px;animation:slide-up .5s ease;}
.bq-header{padding:12px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--border);background:rgba(0,0,0,.15);}
.bq-phase{font-family:var(--mono);font-size:8px;font-weight:800;letter-spacing:1px;padding:4px 10px;border-radius:6px;border:1px solid;}
.bq-chips{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border);}
.bq-chip{padding:12px 14px;text-align:center;border-right:1px solid var(--border);}
.bq-chip:last-child{border-right:none;}
.bq-chip-lbl{font-family:var(--mono);font-size:6.5px;color:var(--t3);letter-spacing:1px;margin-bottom:4px;}
.bq-chip-val{font-family:var(--mono);font-size:18px;font-weight:900;line-height:1;}
.bq-chip-sub{font-family:var(--mono);font-size:7px;color:var(--t3);margin-top:3px;}
.bq-prob{padding:10px 14px;border-top:1px solid var(--border);}
.bq-prob-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.bq-prob-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.bq-prob-bar{display:flex;flex-direction:column;gap:3px;}
.bq-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--border);}
.bq-left{padding:14px 16px;border-right:1px solid var(--border);}
.bq-right{padding:14px 16px;}
.bq-layer{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.03);}
.bq-layer:last-child{border-bottom:none;}
.bq-badge{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid;font-family:var(--mono);font-size:8px;font-weight:800;flex-shrink:0;}
.bq-bar-wrap{height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;flex:1;}
.bq-bar-fill{height:100%;border-radius:2px;transition:width .8s ease;}
.bq-entry-lmh{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border-radius:6px;overflow:hidden;margin-bottom:10px;}
.bq-entry-cell{background:var(--card2);padding:8px 10px;text-align:center;}
.bq-tp-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.03);}
.bq-tp-row:last-child{border-bottom:none;}
.bq-rr-mini{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:10px;background:rgba(0,0,0,.15);padding:8px;border-radius:6px;}
.bq-rr-cell{text-align:center;}
/* Quantum Panel Mobile */
@media(max-width:640px){
  .bq-chips{grid-template-columns:repeat(2,1fr);}
  .bq-chip:nth-child(2){border-right:none;}
  .bq-chip:nth-child(4){border-right:none;}
  .bq-prob-bars{grid-template-columns:repeat(2,1fr);}
  .bq-grid{grid-template-columns:1fr;}
  .bq-left{border-right:none;border-bottom:1px solid var(--border);}
  .bq-rr-mini{grid-template-columns:repeat(2,1fr);}
  .bq-entry-lmh{grid-template-columns:repeat(3,1fr);}
}
@media(max-width:380px){
  .bq-chip-val{font-size:14px;}
  .bq-chips{grid-template-columns:repeat(2,1fr);}
}

/* ══ INSTITUTIONAL ANALYSIS PANEL — kripto ile aynı stil ══════════════ */
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.55;}}
@keyframes scan-line{0%{transform:translateX(-100%);}100%{transform:translateX(400%);}}

.ia-rainbow{height:3px;background:linear-gradient(90deg,#00FFB2,#7C3AED,#00D4FF,#10B981,#F59E0B);}
.ia-header{padding:14px 18px;border-bottom:1px solid var(--border);}
.ia-header-top{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;}
.ia-verdict{font-family:var(--mono);font-size:26px;font-weight:900;letter-spacing:-.5px;line-height:1;}
.ia-metric-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start;}
.ia-confbar{height:4px;background:var(--bg);border-radius:2px;overflow:hidden;border:1px solid var(--border);margin-top:8px;}

/* MM chips row */
.ia-chips4{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);}
.ia-chip{background:var(--panel);padding:9px 12px;}
.ia-prob{padding:10px 18px;border-top:1px solid var(--border);}
.ia-prob-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px;}
.ia-l7row{display:flex;align-items:center;justify-content:space-between;padding:8px 18px;border-top:1px solid var(--border);flex-wrap:wrap;gap:6px;}

/* Main 2-col grid */
.ia-main-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border);}
.ia-left-col{padding:14px 18px;border-right:1px solid var(--border);}
.ia-right-col{padding:14px 18px;}

/* Entry zone */
.ia-entry-zone{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);border-radius:6px;padding:8px 12px;margin-bottom:8px;}
.ia-entry-lmh{display:flex;justify-content:space-between;align-items:baseline;gap:4px;}

/* R:R mini grid */
.ia-rr-mini{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);margin-top:8px;border-radius:5px;overflow:hidden;}

/* Responsive */
@media(max-width:900px){
  .ia-chips4{grid-template-columns:1fr 1fr;}
  .ia-main-grid{grid-template-columns:1fr;}
  .ia-left-col{border-right:none;border-bottom:1px solid var(--border);}
  .ia-prob-bars{grid-template-columns:1fr 1fr;}
}
@media(max-width:600px){
  .ia-left-col,.ia-right-col{padding:10px 12px;}
  .ia-header{padding:10px 14px;}
  .ia-l7row{padding:7px 13px;}
  .ia-prob{padding:9px 13px;}
  .ia-prob-bars{grid-template-columns:1fr 1fr;}
  .ia-rr-mini{grid-template-columns:1fr 1fr;}
  .ia-entry-lmh{flex-direction:column;gap:4px;}
  .ia-metric-chips{gap:4px;}
  .ia-verdict{font-size:20px;}
}
`;


// ── Market Panel (sağ sidebar) ─────────────────────────────────────────────────
function BistMarketPanel({ prices, xu100, usdtry, loading, onSelectTicker }) {
  const fmtPrice = v => v != null ? fmtTL(v) : '—';
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="ph">BIST CANLI FİYATLAR</div>

      {/* BIST100 + USD/TRY */}
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',display:'flex',gap:8}}>
        <div className="stat-chip" style={{flex:1}}>
          <div style={{fontFamily:'var(--mono)',fontSize:7.5,color:'var(--t3)',marginBottom:3}}>BIST100</div>
          <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:800,color: xu100?.change>=0?'var(--green)':'var(--red)'}}>
            {xu100?.price ? xu100.price.toFixed(0) : '—'}
          </div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:xu100?.change>=0?'var(--green)':'var(--red)'}}>
            {xu100?.change != null ? fmtPct(xu100.change) : '—'}
          </div>
        </div>
        <div className="stat-chip" style={{flex:1}}>
          <div style={{fontFamily:'var(--mono)',fontSize:7.5,color:'var(--t3)',marginBottom:3}}>USD/TRY</div>
          <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:800,color:'#FBBF24'}}>
            {usdtry ? usdtry.toFixed(2) : '—'}
          </div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>Dolar/TL</div>
        </div>
      </div>

      {loading && prices.length===0 && (
        <div style={{padding:16,display:'flex',flexDirection:'column',gap:5}}>
          {[...Array(8)].map((_,i)=>(
            <div key={i} style={{height:38,background:'var(--card)',borderRadius:6,border:'1px solid var(--border)',opacity:1-i*.1,animation:'pulse 1.5s infinite'}}/>
          ))}
        </div>
      )}

      <div style={{flex:1,overflowY:'auto'}}>
        {prices.map(s => {
          const pos = (s.change24h||0)>=0;
          const cc  = pos?'var(--green)':'var(--red)';
          return (
            <div key={s.ticker} onClick={()=>onSelectTicker(s.ticker)}
              style={{padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.03)',cursor:'pointer',transition:'background .1s',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,212,255,.05)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <div style={{minWidth:0}}>
                <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:11}}>{s.ticker}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:7.5,color:'var(--t3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:100}}>{s.name}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700}}>
                  {s.price ? fmtTL(s.price) : '—'}
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:cc,fontWeight:700}}>
                  {s.change24h != null ? fmtPct(s.change24h) : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── BistInstitutionalPanel — Kripto ile aynı kalitede kurumsal analiz paneli ──
function BistQuantumPanel({ apiData, vm }) {
  const conf  = apiData.confluenceScore || 0;
  const wr    = apiData.winRate         || 0;
  const ta    = apiData.ta              || {};
  const vol   = apiData.vol             || {};
  const dir   = apiData.direction       || 'BEKLE';
  const xu100 = apiData.xu100           || {};
  const setup = apiData.setup           || {};
  const lay   = apiData.layers          || {};
  const lev   = apiData.leverage        || {};

  const C = {
    green:'#10B981', red:'#EF4444', gold:'#F59E0B',
    blue:'#3B82F6',  purple:'#A78BFA', cyan:'#00D4FF', orange:'#F97316',
  };

  const isLong = dir === 'AL';
  const isShort = dir === 'SAT';
  const dirCol = isLong ? C.green : isShort ? C.red : C.gold;

  // Güvenilir TL diff hesabı
  const diffPct = (tp) => {
    if (!tp || !setup.sniper) return '';
    const d = ((tp - setup.sniper) / setup.sniper * 100);
    return `${d > 0 ? '+' : ''}${d.toFixed(2)}%`;
  };

  // KPI chips
  const fraktalPct = ta.ema9 && ta.ema200 && ta.ema200 > 0
    ? Math.min(200, Math.round(Math.abs((ta.ema9 - ta.ema200) / ta.ema200) * 1000)) : 0;
  const rrRaw = setup.tp1 && setup.sniper && setup.stop && setup.sniper !== setup.stop
    ? Math.abs((setup.tp1 - setup.sniper) / (setup.sniper - setup.stop)) : 2;
  const kellyPct = Math.max(0, Math.min(50,
    Math.round(((wr / 100) - (1 - wr / 100) / rrRaw) * 100)
  ));
  const clpVal = isLong
    ? Math.min(100, Math.round(conf * 0.85 + wr * 0.1))
    : isShort ? Math.min(100, Math.round((100 - conf) * 0.85 + wr * 0.1))
    : Math.round(50 + (conf - 50) * 0.3);

  // Probability bars
  const pBull = isLong  ? Math.max(0, Math.min(85, Math.round(conf * 0.55 + wr * 0.08))) : Math.round((100 - conf) * 0.18);
  const pBear = isShort ? Math.max(0, Math.min(85, Math.round(conf * 0.55 + wr * 0.08))) : Math.round((100 - conf) * 0.18);
  const pRev  = (ta.rsi > 65 || ta.rsi < 35) ? 22 : 14;
  const pBekl = Math.max(0, 100 - pBull - pBear - pRev);
  const probs = [
    { lbl:'TREND YÜKSELİŞ', val:pBull, col:C.green  },
    { lbl:'TREND DÜŞÜŞ',    val:pBear, col:C.red    },
    { lbl:'MEAN REV',       val:pRev,  col:C.gold   },
    { lbl:'VOL PATLAMA',    val:pBekl, col:'#64748B' },
  ];
  const dominant = probs.reduce((a, b) => b.val > a.val ? b : a, probs[0]);

  // Layers from backend (with fallback to computed)
  const layers = [
    { id:'L1', lbl:'PIYASA YAPISI',  col:C.blue,   max:25,
      score: lay.marketStructure?.score || 0,
      detail: lay.marketStructure
        ? `EMA:${lay.marketStructure.emaAligned?'✓':'✗'} · ADX:${Math.round(lay.marketStructure.adxStrength||0)} · ${(lay.marketStructure.bosType||'NONE').replace(/_/g,' ')}`
        : `EMA:${ta.ema9>ta.ema21?'BULL':'BEAR'} · RSI:${ta.rsi||'—'}` },
    { id:'L2', lbl:'LİKİDİTE/SMC',  col:'#A78BFA', max:30,
      score: lay.liquiditySMC?.score || 0,
      detail: lay.liquiditySMC
        ? `${lay.liquiditySMC.inOB?'OB İçinde':'OB Dışı'} · FVG+OB:${lay.liquiditySMC.fvgOBOverlap?'✓':'✗'} · ${lay.liquiditySMC.liquiditySweep?'LiqSweep ⚡':''}`
        : `${vol.highVolume?'YÜK.HACİM':'Normal'} · ${vol.volRatio||'—'}x` },
    { id:'L3', lbl:'MOMENTUM',       col:C.gold,   max:25,
      score: lay.momentum?.score || 0,
      detail: lay.momentum
        ? `RSI:${Math.round(lay.momentum.rsi4h||50)} · MACD:${lay.momentum.macdBullish?'Bull':'Bear'} · ${lay.momentum.squeeze?'BB SQZ⚡':'BB Normal'}`
        : `RSI:${ta.rsi||'—'} · MACD:${ta.macd?.bullish?'BULL':'BEAR'}` },
    { id:'L4', lbl:'MTF UYUM',       col:C.green,  max:20,
      score: lay.mtfAlignment?.score || 0,
      detail: lay.mtfAlignment
        ? `4H:${lay.mtfAlignment['4h']||'?'} · 1D:${lay.mtfAlignment['1d']||'?'} · 1W:${lay.mtfAlignment['1w']||'?'} · 1M:${lay.mtfAlignment['1m']||'?'}`
        : `BIST100:${xu100.change>=0?'▲ POZ':'▼ NEG'} · Sektör Korel.` },
  ];

  const wrCol = wr >= 80 ? C.green : wr >= 68 ? C.blue : '#6b7280';
  const wyc   = apiData.wyckoffPhase || (isLong ? 'MARKUP' : isShort ? 'MARKDOWN' : 'DENGE');
  const sweep = !!apiData.liquiditySweep;
  const meta  = !!apiData.metaEdgeActive;

  return (
    <div style={{
      background:'var(--card)', border:`1px solid ${vm.color}20`, borderRadius:12,
      overflow:'hidden', marginBottom:16, animation:'slide-up .4s ease',
      boxShadow:`0 8px 40px rgba(0,0,0,.35), 0 0 0 1px ${vm.color}10`,
    }}>
      {/* Rainbow bar */}
      <div className="ia-rainbow"/>

      {/* Header */}
      <div className="ia-header" style={{background:vm.bg}}>
        <div className="ia-header-top">
          <div>
            <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',letterSpacing:1.5,marginBottom:5}}>
              DEEPTRADE BIST v2.0 · WR≥70% KURUMSAL MOD · {apiData.ticker}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <div className="ia-verdict" style={{color:vm.color}}>
                {vm.icon} {vm.label}
              </div>
              <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:900,padding:'4px 14px',
                borderRadius:6,background:`${dirCol}18`,color:dirCol,border:`1px solid ${dirCol}40`,letterSpacing:.5}}>
                {isLong ? '▲ LONG' : isShort ? '▼ SHORT' : '◆ BEKLE'}
              </div>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t2)',marginTop:5}}>{vm.tagline}</div>
          </div>
          <div className="ia-metric-chips">
            {[
              { lbl:'SKOR',     val:`${conf}/100`, col:vm.color },
              { lbl:'WIN RATE', val:`${wr}%`,       col:wrCol   },
              { lbl:'KALDIRAÇ', val:`${lev.moderate||2}x`, col:C.gold },
              { lbl:'KELLY',    val:`%${kellyPct}`, col:kellyPct>=20?C.green:C.gold },
            ].map(({lbl,val,col}) => (
              <div key={lbl} style={{textAlign:'center',background:`${col}10`,
                border:`1px solid ${col}30`,borderRadius:7,padding:'6px 11px',minWidth:55}}>
                <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',marginBottom:3}}>{lbl}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:900,color:col,lineHeight:1}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Confluence bar */}
        <div className="ia-confbar">
          <div style={{height:'100%',width:`${conf}%`,
            background:`linear-gradient(90deg,${vm.color}70,${vm.color})`,
            borderRadius:2,transition:'width .7s ease'}}/>
        </div>
      </div>

      {/* KPI Chips */}
      <div className="ia-chips4">
        {[
          { lbl:'SAPI',    val:`${conf}/100`, sub:'Sinyal İndeksi',    col:conf>=70?'#00FFB2':conf>=55?C.gold:C.red },
          { lbl:'CLP',     val:`${clpVal}/100`,sub:'Likidite Baskısı', col:clpVal>=65?C.green:clpVal>=45?C.gold:C.red },
          { lbl:'FRAKTAL', val:`${fraktalPct}%`,sub:'Trend Sapması',   col:fraktalPct>50?'#A78BFA':fraktalPct>20?C.blue:'#64748B' },
          { lbl:'R:R',     val:apiData.riskReward||'—',sub:`Risk: %${apiData.riskPct||'2'}`, col:C.blue },
        ].map(({lbl,val,sub,col}) => (
          <div key={lbl} className="ia-chip">
            <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',letterSpacing:.8,marginBottom:3}}>{lbl}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:900,color:col,lineHeight:1.1}}>{val}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',marginTop:3}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Probability vector */}
      <div className="ia-prob">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <span style={{fontFamily:'var(--mono)',fontSize:7.5,fontWeight:700,color:'var(--t2)',letterSpacing:.8}}>
            ◉ OLASILIK VEKTÖRÜ — 4 SENARYO
          </span>
          <span style={{fontFamily:'var(--mono)',fontSize:8,fontWeight:800,color:dominant.col}}>
            DOM: {dominant.lbl}
          </span>
        </div>
        <div className="ia-prob-bars">
          {probs.map(({lbl,val,col}) => (
            <div key={lbl}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontFamily:'var(--mono)',fontSize:6,color:'var(--t3)'}}>{lbl}</span>
                <span style={{fontFamily:'var(--mono)',fontSize:7,fontWeight:800,color:col}}>%{val}</span>
              </div>
              <div style={{height:4,background:'var(--bg)',borderRadius:2,overflow:'hidden',border:`1px solid ${col}20`}}>
                <div style={{height:'100%',width:`${val}%`,background:`linear-gradient(90deg,${col}50,${col})`,borderRadius:2,transition:'width .6s'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* L7 badges: Wyckoff + Sweep + HTF + Meta-Edge */}
      <div className="ia-l7row">
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[
            { lbl:'WYCKOFF',  val:wyc,                                       col:'#C084FC' },
            { lbl:'SWEEP',    val:sweep?'⚡ TESPİT EDİLDİ':'— YOK',         col:sweep?C.gold:'#6B7280' },
            { lbl:'HTF BİAS', val:apiData.htfBias||lay.marketStructure?.htfBias||'—', col:C.blue },
          ].map(({lbl,val,col}) => (
            <div key={lbl} style={{background:`${col}10`,border:`1px solid ${col}25`,borderRadius:4,padding:'3px 9px'}}>
              <span style={{fontFamily:'var(--mono)',fontSize:6.5,color:'var(--t3)',marginRight:5}}>{lbl}</span>
              <span style={{fontFamily:'var(--mono)',fontSize:8,fontWeight:700,color:col}}>{val}</span>
            </div>
          ))}
        </div>
        {meta && (
          <div style={{fontFamily:'var(--mono)',fontSize:8,fontWeight:800,color:C.cyan,
            background:'rgba(0,212,255,.08)',border:'1px solid rgba(0,212,255,.25)',
            borderRadius:4,padding:'3px 10px',animation:'pulse 1.5s infinite'}}>
            ◈ META-EDGE AKTİF
          </div>
        )}
      </div>

      {/* Main 2-col: Layers + Setup */}
      <div className="ia-main-grid">

        {/* SOL — Katman Skorları */}
        <div className="ia-left-col">
          <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',letterSpacing:1,marginBottom:10}}>
            4-KATMAN CONFLUENCE ANALİZİ
          </div>
          {layers.map(({id,lbl,col,max,score,detail}) => {
            const pct = Math.min(100, Math.round(score / max * 100));
            return (
              <div key={id} style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
                <div style={{width:24,height:24,borderRadius:4,background:`${col}12`,
                  border:`1px solid ${col}30`,display:'flex',alignItems:'center',
                  justifyContent:'center',fontFamily:'var(--mono)',fontSize:8,fontWeight:800,
                  color:col,flexShrink:0}}>{id}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontFamily:'var(--mono)',fontSize:8,fontWeight:700,color:'var(--t1)'}}>{lbl}</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:800,color:col}}>{score}/{max}</span>
                  </div>
                  <div style={{height:4,background:'var(--bg)',borderRadius:2,overflow:'hidden',
                    border:'1px solid var(--border)',marginBottom:2}}>
                    <div style={{height:'100%',width:`${pct}%`,
                      background:`linear-gradient(90deg,${col}60,${col})`,
                      borderRadius:2,transition:'width .6s ease'}}/>
                  </div>
                  {detail && <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',lineHeight:1.3}}>{detail}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* SAĞ — Kurumsal Setup */}
        <div className="ia-right-col">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',letterSpacing:1}}>
              KURUMSAL GİRİŞ SETUP
            </div>
            <span style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:900,padding:'3px 10px',
              borderRadius:5,background:isLong?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',
              color:dirCol,border:`1px solid ${dirCol}40`}}>
              {isLong ? '▲ LONG' : isShort ? '▼ SHORT' : '◆ BEKLE'}
            </span>
          </div>

          {/* Entry zone */}
          {(setup.entryLow || setup.sniper) && (
            <div className="ia-entry-zone">
              <div style={{fontFamily:'var(--mono)',fontSize:7,color:C.green,letterSpacing:.5,marginBottom:4}}>
                GİRİŞ BÖLGE — LIMIT ORDER
              </div>
              <div className="ia-entry-lmh">
                <div>
                  <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)'}}>LOW</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:900,color:C.green}}>
                    {setup.entryLow ? fmtTL(setup.entryLow) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)'}}>MID</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:900,color:'var(--t1)'}}>
                    {setup.sniper ? fmtTL(setup.sniper) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)'}}>HIGH</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:900,color:C.green}}>
                    {setup.entryHigh ? fmtTL(setup.entryHigh) : '—'}
                  </div>
                </div>
              </div>
              {setup.entryMethod && (
                <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',marginTop:3}}>
                  {setup.entryMethod}
                </div>
              )}
            </div>
          )}

          {/* Stop + TPs */}
          {[
            { lbl:'STOP LOSS', sub:setup.stopLabel||'Zone İnvalidasyonu', price:setup.stop, col:C.red },
            { lbl:`TP1 · 40%${setup.tp1Pct?` +${setup.tp1Pct}%`:''}`, sub:'İlk Likidite / BSL', price:setup.tp1, col:'#34D399' },
            { lbl:`TP2 · 35%${setup.tp2Pct?` +${setup.tp2Pct}%`:''}`, sub:'Ana Hedef / Fib Ext.', price:setup.tp2, col:C.blue },
            { lbl:`TP3 · 25%${setup.tp3Pct?` +${setup.tp3Pct}%`:''}`, sub:'Uzun Vade / Extension', price:setup.tp3, col:'#A78BFA' },
          ].filter(l=>l.price).map(({lbl,sub,price,col}) => (
            <div key={lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:8,fontWeight:700,color:col}}>{lbl}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)'}}>{sub}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:800,color:col}}>
                  {fmtTL(price)}
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)'}}>
                  {diffPct(price)}
                </div>
              </div>
            </div>
          ))}

          {/* R:R / Risk / Kaldıraç / Win Rate */}
          <div className="ia-rr-mini">
            {[
              { lbl:'R:R',      val:apiData.riskReward||'—',           col:'var(--t1)' },
              { lbl:'RİSK %',   val:`${apiData.riskPct||'—'}%`,         col:C.orange   },
              { lbl:'KALDIRAÇ', val:`${lev.moderate||2}x`,              col:C.gold     },
              { lbl:'WIN RATE', val:`${wr}%`,                           col:wrCol      },
            ].map(({lbl,val,col}) => (
              <div key={lbl} style={{background:'var(--panel)',padding:'7px 8px'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:6,color:'var(--t3)',letterSpacing:.4,marginBottom:3}}>{lbl}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:800,color:col}}>{val}</div>
              </div>
            ))}
          </div>

          {/* Tweet Paylaş butonu */}
          {setup.sniper && (isLong || isShort) && (
            <div style={{marginTop:8,display:'flex',justifyContent:'flex-end'}}>
              {(() => {
                const ticker = apiData.ticker || '';
                const dirTxt = isLong ? 'LONG' : 'SHORT';
                const emoji  = isLong ? '🟢' : '🔴';
                const arrow  = isLong ? '▲' : '▼';
                const lines = [
                  `${emoji} $${ticker} ${arrow} ${dirTxt} SİNYALİ`,
                  ``,
                  `📍 Giriş: ${setup.entryLow ? fmtTL(setup.entryLow) : '—'} – ${setup.entryHigh ? fmtTL(setup.entryHigh) : '—'}`,
                  `🛑 Stop: ${setup.stop ? fmtTL(setup.stop) : '—'}${setup.riskPct ? ` (Risk: %${setup.riskPct})` : ''}`,
                  `🎯 TP1: ${setup.tp1 ? fmtTL(setup.tp1) : '—'}${setup.tp1Pct ? ` (+%${setup.tp1Pct})` : ''}`,
                  `🎯 TP2: ${setup.tp2 ? fmtTL(setup.tp2) : '—'}${setup.tp2Pct ? ` (+%${setup.tp2Pct})` : ''}`,
                  `🎯 TP3: ${setup.tp3 ? fmtTL(setup.tp3) : '—'}${setup.tp3Pct ? ` (+%${setup.tp3Pct})` : ''}`,
                  ``,
                  `📊 R:R ${apiData.riskReward||'—'} | WR %${wr}`,
                  ``,
                  `#${ticker} #BIST #BorsaAnaliz #DeepTradeScan`,
                ];
                const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(lines.join('\n'))}`;
                return (
                  <button
                    onClick={() => window.open(tweetUrl, '_blank', 'noopener,noreferrer')}
                    style={{
                      display:'flex',alignItems:'center',gap:5,
                      background:'rgba(29,161,242,.10)',
                      border:'1px solid rgba(29,161,242,.30)',
                      color:'#1DA1F2',padding:'5px 12px',borderRadius:6,
                      fontFamily:'var(--mono)',fontSize:10,fontWeight:700,
                      cursor:'pointer',letterSpacing:.3,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X'te Paylaş
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Ana Uygulama ───────────────────────────────────────────────────────────────
export default function BorsaApp() {
  // Auth
  const [session,  setSession]  = useState(null);
  const [authLoad, setAuthLoad] = useState(false);
  const [authErr,  setAuthErr]  = useState('');
  const [authOk,   setAuthOk]   = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [form,     setForm]     = useState({email:'',password:'',name:''});
  const [profile,  setProfile]  = useState(null);

  // Analysis
  const [ticker,   setTicker]   = useState('THYAO');
  const [search,   setSearch]   = useState('');
  const [activeSek,setActiveSek]= useState('ALL');
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [streamText, setStreamText] = useState('');
  const [error,    setError]    = useState('');
  const [apiData,  setApiData]  = useState(null);
  const [blocks,   setBlocks]   = useState([]);
  const streamRef = useRef(null);
  const [mobTab,   setMobTab]   = useState('analyze');

  // Market prices
  const [prices,    setPrices]   = useState([]);
  const [priceLoad, setPriceLoad]= useState(false);
  const [xu100,     setXu100]    = useState(null);
  const [usdtry,    setUsdtry]   = useState(null);
  const priceTimer = useRef(null);

  // Auth init
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('sb_session') : null;
    if (raw) { try { const s = JSON.parse(raw); setSession(s); loadProfile(s.access_token); } catch {} }
  }, []);

  async function loadProfile(token) {
    const d = await apiAuth('profile', {}, token);
    if (d?.profile) setProfile(d.profile);
  }

  async function doLogin(e) {
    e.preventDefault(); setAuthLoad(true); setAuthErr(''); setAuthOk('');
    const d = await apiAuth(authMode==='login'?'login':'register', form);
    setAuthLoad(false);
    if (d?.error) { setAuthErr(d.error); return; }
    if (d?.session) {
      localStorage.setItem('sb_session', JSON.stringify(d.session));
      setSession(d.session); loadProfile(d.session.access_token);
      setAuthOk(authMode==='login'?'Giriş başarılı!':'Kayıt başarılı!');
    }
  }

  async function doLogout() {
    await apiAuth('logout', {}, session?.access_token);
    localStorage.removeItem('sb_session');
    setSession(null); setProfile(null); setApiData(null); setBlocks([]);
  }

  // Market prices
  async function loadPrices() {
    setPriceLoad(true);
    try {
      const r = await fetch('/api/bist-prices');
      const d = await r.json();
      if (d.stocks) {
        setPrices(d.stocks);
        if (d.xu100) setXu100(d.xu100);
        if (d.usdtry) setUsdtry(d.usdtry);
      }
    } catch {}
    setPriceLoad(false);
  }

  useEffect(() => {
    if (session) {
      loadPrices();
      priceTimer.current = setInterval(loadPrices, 60_000);
    }
    return () => clearInterval(priceTimer.current);
  }, [session]);

  // Filtered tickers for sidebar
  const sekTickers = SEKTORLER[activeSek]?.tickers;
  const allTickers = Object.keys(BIST_STOCKS);
  const filteredTickers = allTickers.filter(t => {
    if (search && !t.includes(search.toUpperCase()) && !BIST_STOCKS[t].toUpperCase().includes(search.toUpperCase())) return false;
    if (sekTickers && !sekTickers.includes(t)) return false;
    return true;
  });

  // ── Analiz (SSE Streaming) ───────────────────────────────────────────────────
  async function analyze(sym) {
    if (loading) return;
    setLoading(true); setError(''); setApiData(null); setBlocks([]);
    setStep(0); setStreamText('');

    // Step 0→2 otomatik ilerle (veri çekimi fazı)
    const stepTimer = setInterval(() => setStep(s => (s < 2 ? s + 1 : s)), 900);

    try {
      const resp = await fetch('/api/borsa-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ ticker: sym }),
      });

      // Auth/quota hatası — JSON olarak döner (SSE öncesi)
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('text/event-stream')) {
        clearInterval(stepTimer);
        const d = await resp.json().catch(() => ({ error: 'Sunucu hatası' }));
        setError(d.error || 'Analiz başarısız');
        setLoading(false);
        return;
      }

      // SSE stream okuyucu
      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));

            if (evt.type === 'ta') {
              // Teknik veri geldi — hemen göster
              clearInterval(stepTimer);
              setStep(4);
            } else if (evt.type === 'stream') {
              // Claude çıktısı akıyor
              setStep(s => (s < 7 ? 7 : s));
              setStreamText(prev => prev + evt.text);
              if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
            } else if (evt.type === 'done') {
              clearInterval(stepTimer);
              setStep(9);
              setStreamText('');
              if (evt.ok) {
                setApiData(evt);
                setBlocks(parse(evt.analysis));
              } else {
                setError(evt.error || 'Analiz başarısız');
              }
              setLoading(false);
            } else if (evt.type === 'error') {
              clearInterval(stepTimer);
              setError(evt.error || 'Analiz hatası');
              setLoading(false);
            }
          } catch { /* JSON parse skip */ }
        }
      }
    } catch (e) {
      clearInterval(stepTimer);
      setError('Sunucu bağlantı hatası: ' + e.message);
    } finally {
      clearInterval(stepTimer);
      setLoading(false); // garantili temizlik
    }
  }


  // ── Auth Ekranı ──────────────────────────────────────────────────────────────
  if (!session) return (
    <div className="borsa-auth-page">
      <style>{CSS}</style>
      <Head><title>DeepTradeScan BORSA — BIST Analiz</title></Head>

      {/* ── Sol Panel ── */}
      <div className="bal-left">
        {/* Logo */}
        <div className="bal-logo">
          <div className="bal-logo-mark">B</div>
          <div className="bal-logo-name">DEEP<span>TRADE</span> BORSA</div>
        </div>

        {/* Eyebrow */}
        <div className="bal-eyebrow">
          <span style={{width:6,height:6,borderRadius:'50%',background:'#FBBF24',boxShadow:'0 0 8px rgba(251,191,36,.8)',display:'inline-block',animation:'pulse 1.5s infinite'}}/>
          BIST · CANLI ANALİZ
        </div>

        {/* Headline */}
        <h1 className="bal-h1">
          BIST hisselerinde<br />
          kurumsal düzey<br />
          <span className="yg">teknik analiz.</span>
        </h1>

        <p className="bal-sub">
          Quantum Borsa Engine ile SMC, Wyckoff, Kurumsal Akış analizi.
          Gerçek zamanlı veri · Yahoo Finance entegrasyonu.
        </p>

        {/* Ücretsiz 5 analiz badge */}
        <div className="bal-free-badge">
          <div className="bal-free-icon">🎁</div>
          <div>
            <div className="bal-free-title">GÜNDE 5 ANALİZ ÜCRETSİZ</div>
            <div className="bal-free-desc">Kayıt ol, hemen kullanmaya başla. Kredi kartı gerekmez.</div>
          </div>
        </div>

        {/* Features */}
        <div className="bal-feats">
          {[
            { c:'#38BDF8', t:'10 Sektör · 80+ BIST Hissesi' },
            { c:'#FBBF24', t:'ICT/SMC · EMA · RSI · MACD · Bollinger' },
            { c:'#A78BFA', t:'Wyckoff Faz · Kurumsal & Yabancı Akış' },
            { c:'#10B981', t:'Giriş/SL/TP TL bazlı Trade Tasarımı' },
            { c:'#F97316', t:'BIST100 Makro · USD/TRY Bağıntısı' },
          ].map((f,i) => (
            <div className="bal-feat" key={i}>
              <div className="bal-feat-dot" style={{background:f.c,boxShadow:`0 0 6px ${f.c}`}} />
              {f.t}
            </div>
          ))}
        </div>
      </div>

      {/* ── Sağ Panel — Form ── */}
      <div className="bal-right">
        <div className="bal-card">

          {/* Başlık */}
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:900,color:'var(--t1)',letterSpacing:-.5,marginBottom:4}}>
              {authMode==='login' ? 'Hesabına giriş yap' : 'Ücretsiz hesap aç'}
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
              {authMode==='login' ? 'BIST analizine devam et' : 'Günde 5 analiz · Ücretsiz · Hemen başla'}
            </div>
          </div>

          {/* Tabs */}
          <div className="bal-tabs">
            {[['login','GİRİŞ YAP'],['register','KAYIT OL']].map(([m,label])=>(
              <button key={m} className={`bal-tab${authMode===m?' on':''}`}
                onClick={()=>{setAuthMode(m);setAuthErr('');}}>
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={doLogin}>
            {authMode==='register' && (
              <div className="bal-field">
                <label>Ad Soyad</label>
                <input className="bal-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Adınız Soyadınız" />
              </div>
            )}
            <div className="bal-field">
              <label>E-posta</label>
              <input className="bal-input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="ornek@mail.com" type="email" />
            </div>
            <div className="bal-field" style={{marginBottom:18}}>
              <label>Şifre</label>
              <input className="bal-input" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" type="password" />
            </div>

            {authErr && <div style={{color:'#f87171',fontSize:12,marginBottom:12,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'10px 13px',fontFamily:'var(--mono)'}}>{authErr}</div>}
            {authOk  && <div style={{color:'#34d399',fontSize:12,marginBottom:12,background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.2)',borderRadius:8,padding:'10px 13px',fontFamily:'var(--mono)'}}>{authOk}</div>}

            <button type="submit" className="bal-submit" disabled={authLoad}>
              {authLoad
                ? <><div className="spinner" style={{borderTopColor:'#000',borderColor:'rgba(0,0,0,.2)'}}/>İşleniyor...</>
                : authMode==='login' ? 'Giriş Yap →' : 'Ücretsiz Başla →'
              }
            </button>
          </form>

          <div className="bal-switch">
            {authMode==='login'
              ? <span>Hesabın yok mu? <button onClick={()=>{setAuthMode('register');setAuthErr('');}}>Ücretsiz kayıt ol</button></span>
              : <span>Zaten hesabın var mı? <button onClick={()=>{setAuthMode('login');setAuthErr('');}}>Giriş yap</button></span>
            }
          </div>

          <div className="bal-risk">
            Hisse senedi yatırımı risk içerir · Yalnızca teknik analiz<br />
            Finansal tavsiye değildir
          </div>
        </div>
      </div>
    </div>
  );

  // ── Oturum açık — Ana panel değişkenleri ────────────────────────────────────
  const vm = VERDICT_META[apiData?.verdict] || VERDICT_META.BEKLE;
  const plan = profile?.plan || 'free';
  const dailyUsed  = profile?.daily_analyses || 0;
  const dailyLimit = plan==='free' ? 5 : null;
  const usagePct   = dailyLimit ? Math.min(100, dailyUsed/dailyLimit*100) : 100;


  return (
    <div className="layout">
      <style>{CSS}</style>
      <Head><title>DeepTradeScan BORSA — {ticker} Analiz</title></Head>

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:14,letterSpacing:.5}}>
            DEEP<span style={{color:'var(--accent)'}}>TRADE</span>
            <span style={{color:'#FBBF24'}}>BORSA</span>
          </div>
          <span style={{padding:'2px 8px',borderRadius:3,fontFamily:'var(--mono)',fontSize:8,fontWeight:700,background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.25)',color:'#FBBF24',letterSpacing:1}}>
            BIST v1.0
          </span>
          {xu100?.price && (
            <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t2)'}}>
              BIST100 <span style={{fontWeight:700,color:xu100.change>=0?'var(--green)':'var(--red)'}}>
                {xu100.price.toFixed(0)} {fmtPct(xu100.change)}
              </span>
            </span>
          )}
          {usdtry && (
            <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t2)'}}>
              USD/TRY <span style={{fontWeight:700,color:'#FBBF24'}}>{usdtry.toFixed(2)}</span>
            </span>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <a href="/" style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',textDecoration:'none',padding:'4px 10px',border:'1px solid var(--border)',borderRadius:5}}>
            ← KRİPTO
          </a>
          {(() => {
            const pm={free:{label:'STARTER',color:'#64748b',bg:'rgba(100,116,139,.12)',border:'rgba(100,116,139,.25)'},pro:{label:'PRO',color:'#3b82f6',bg:'rgba(59,130,246,.15)',border:'rgba(59,130,246,.35)'},elite:{label:'ELITE',color:'#a855f7',bg:'rgba(168,85,247,.15)',border:'rgba(168,85,247,.35)'}}[plan]||{label:'FREE',color:'#64748b',bg:'rgba(100,116,139,.12)',border:'rgba(100,116,139,.25)'};
            return <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:4,background:pm.bg,color:pm.color,border:`1px solid ${pm.border}`,letterSpacing:1}}>{pm.label}</span>;
          })()}
          <button onClick={doLogout} style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:700,padding:'5px 12px',borderRadius:5,cursor:'pointer',background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)',color:'rgba(239,68,68,.7)'}}>
            ÇIKIŞ
          </button>
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="workspace">

        {/* LEFT SIDEBAR — Hisse listesi */}
        <div className="sidebar-l">
          <div className="ph">HİSSE TARAYICI</div>
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>
            <input className="search-inp" placeholder="Hisse ara... (THYAO)" value={search} onChange={e=>setSearch(e.target.value)}/>
            <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:8}}>
              {Object.entries(SEKTORLER).map(([k,v])=>(
                <button key={k} className={`pill ${activeSek===k?'on':''}`}
                  style={{color:activeSek===k?v.color:undefined,borderColor:activeSek===k?v.color+'44':undefined}}
                  onClick={()=>setActiveSek(k)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {filteredTickers.map(t => {
              const px = prices.find(p=>p.ticker===t);
              const pos = (px?.change24h||0)>=0;
              return (
                <div key={t} className={`hisse-row ${ticker===t?'on':''}`} onClick={()=>setTicker(t)}>
                  <div style={{minWidth:0}}>
                    <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:11}}>{t}</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100}}>{BIST_STOCKS[t]}</div>
                  </div>
                  {px && (
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:700}}>{fmtTL(px.price)}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:8,color:pos?'var(--green)':'var(--red)',fontWeight:700}}>{fmtPct(px.change24h)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Kota göstergesi */}
          {dailyLimit && (
            <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',background:'rgba(0,0,0,.2)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontFamily:'var(--mono)',fontSize:7.5,color:'var(--t3)'}}>GÜNLÜK KOTA</span>
                <span style={{fontFamily:'var(--mono)',fontSize:8,fontWeight:700,color:usagePct>=80?'#ef4444':'var(--accent)'}}>{dailyUsed}/{dailyLimit}</span>
              </div>
              <div style={{height:4,background:'rgba(255,255,255,.05)',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${usagePct}%`,background:`linear-gradient(90deg,var(--accent),${usagePct>=80?'#ef4444':'var(--accent)'}cc)`,borderRadius:2,transition:'width .6s'}}/>
              </div>
            </div>
          )}
        </div>

        {/* MAIN PANEL */}
        <div className="main-panel">

          {/* Analyze Tab */}
          <div style={{display:mobTab==='analyze'?'block':'none'}}>

            {/* Header */}
            <div style={{marginBottom:16}}>
              {/* Mobil: ticker seçici chip (sidebar olmadığı için) */}
              <div className="mob-ticker-sel" onClick={()=>setMobTab('hisse')}>
                <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:700,
                    color:'rgba(251,191,36,.6)',letterSpacing:.8,flexShrink:0}}>
                    SEÇİLİ HİSSE
                  </span>
                  <span style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:900,color:'#FBBF24'}}>
                    {ticker}
                  </span>
                  <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {BIST_STOCKS[ticker]}
                  </span>
                </div>
                <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:800,
                  color:'rgba(251,191,36,.7)',flexShrink:0,letterSpacing:.5}}>
                  DEĞİŞTİR ›
                </span>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginTop:12}}>
                <div>
                  <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:26,lineHeight:1,letterSpacing:-1}}>
                    {ticker}<span style={{color:'var(--t3)',fontSize:16}}> / BIST</span>
                  </div>
                  {apiData ? (
                    <div style={{marginTop:5,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontFamily:'var(--mono)',fontSize:15,fontWeight:800,color:'#FBBF24'}}>{fmtTL(apiData.price)}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:12,color:(apiData.change24h||0)>=0?'var(--green)':'var(--red)',fontWeight:700}}>{fmtPct(apiData.change24h)}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)'}}>{BIST_STOCKS[ticker]}</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',background:'rgba(255,255,255,.04)',padding:'2px 7px',borderRadius:4,border:'1px solid var(--border)'}}>{apiData.sector}</span>
                    </div>
                  ) : (
                    <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginTop:4}}>{BIST_STOCKS[ticker]} — BIST KURUMSAL ANALİZ</div>
                  )}
                </div>
                <button className="btn-exec" onClick={()=>analyze(ticker)} disabled={loading}
                  style={{background:loading?'rgba(0,212,255,.2)':'linear-gradient(135deg,#d97706,#FBBF24,#f59e0b)',boxShadow:'0 4px 20px rgba(251,191,36,.3)'}}>
                  {loading ? <><div className="spinner"/>ANALİZ EDİLİYOR...</> : <><span style={{fontSize:14}}>◈</span> HİSSEYİ ANALİZ ET</>}
                </button>
              </div>
            </div>

            {/* Progress */}
            {loading && (
              <div className="progress-wrap">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'#FBBF24',fontWeight:700,letterSpacing:.5}}>{STEPS[step]}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>{Math.round(step/9*100)}%</div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${Math.round(step/9*100)}%`,background:'linear-gradient(90deg,#b45309,#d97706,#FBBF24)'}}/>
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginTop:8,display:'flex',gap:14,flexWrap:'wrap'}}>
                  {step < 4 && <><span>Yahoo Finance verileri çekiliyor...</span><span>Teknik göstergeler hesaplanıyor...</span></>}
                  {step >= 4 && step < 7 && <><span>✓ Veri hazır</span><span>◈ QUANTUM AI başlatılıyor...</span></>}
                  {step >= 7 && <><span>✓ Veri hazır</span><span>◈ AI analiz akışı devam ediyor...</span></>}
                </div>
                {/* Claude streaming text — terminal görünümü */}
                {streamText && (
                  <div ref={streamRef} style={{
                    marginTop:10,padding:'10px 12px',
                    background:'rgba(0,0,0,.35)',border:'1px solid rgba(251,191,36,.15)',
                    borderRadius:6,maxHeight:120,overflowY:'auto',
                    fontFamily:'var(--mono)',fontSize:8.5,color:'#FBBF24',
                    lineHeight:1.7,whiteSpace:'pre-wrap',wordBreak:'break-word',
                  }}>
                    {streamText}<span style={{display:'inline-block',width:6,height:10,background:'#FBBF24',marginLeft:2,animation:'pulse .8s infinite'}}/>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,padding:'14px 18px',marginBottom:16,fontFamily:'var(--mono)',fontSize:12,color:'var(--red)'}}>
                ⚠ {error}
                {(error.includes('limit') || error.includes('kota') || error.includes('ulaştınız')) && (
                  <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(239,68,68,.2)'}}>
                    <a href="https://t.me/DeepTradeScanner" target="_blank" rel="noopener noreferrer"
                      style={{fontFamily:'var(--mono)',fontSize:11,color:'#f59e0b',textDecoration:'none',fontWeight:800}}>
                      ↑ Upgrade için Telegram: @DeepTradeScanner
                    </a>
                  </div>
                )}
              </div>
            )}


            {/* ── RESULTS ── */}
            {apiData && !loading && (
              <div style={{animation:'slide-up .5s ease'}}>

                {/* ── Quantum Panel — EN ÜSTTE ── */}
                <BistQuantumPanel apiData={apiData} vm={vm} />

                {/* Verdict Banner */}
                <div className="verdict-banner" style={{border:`1px solid ${vm.color}35`,marginBottom:16}}>
                  <div style={{height:3,background:`linear-gradient(90deg,transparent,${vm.color},transparent)`}}/>
                  <div style={{padding:'16px 20px',background:`linear-gradient(135deg,${vm.bg},transparent)`}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:14}}>
                        <div style={{fontSize:28,color:vm.color,textShadow:`0 0 20px ${vm.glow}`,fontFamily:'var(--mono)',fontWeight:900}}>
                          {vm.icon}
                        </div>
                        <div>
                          <div style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:900,color:vm.color,letterSpacing:1}}>
                            {vm.label}
                          </div>
                          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t2)',marginTop:3}}>{vm.tagline}</div>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))',gap:8,minWidth:0}}>
                        {[
                          {lbl:'FIYAT',    val:fmtTL(apiData.price),              col:'#FBBF24'},
                          {lbl:'DEĞİŞİM',  val:fmtPct(apiData.change24h),         col:(apiData.change24h||0)>=0?'var(--green)':'var(--red)'},
                          {lbl:'KONFLUENS',val:`%${apiData.confluenceScore}`,      col:vm.color},
                          {lbl:'KAZANMA',  val:`%${apiData.winRate}`,              col:'#60A5FA'},
                          {lbl:'GÜVEN',    val:`%${apiData.guvenScore}`,           col:'var(--accent)'},
                        ].map(c=>(
                          <div key={c.lbl} style={{textAlign:'center',background:'rgba(0,0,0,.2)',borderRadius:6,padding:'5px 4px'}}>
                            <div style={{fontFamily:'var(--mono)',fontSize:6.5,color:'var(--t3)',letterSpacing:.8,marginBottom:3}}>{c.lbl}</div>
                            <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:900,color:c.col}}>{c.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Setup Seviyeleri */}
                {apiData.setup && (
                  <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,marginBottom:14,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',background:'rgba(16,185,129,.04)',display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:800,color:'#10B981',letterSpacing:.8}}>⚡ TRADE SETUP — GİRİŞ · STOP · HEDEFLER (TL)</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:700,color:vm.color,background:`${vm.color}15`,padding:'2px 8px',borderRadius:4,border:`1px solid ${vm.color}30`}}>
                        {apiData.direction}
                      </span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))'}}>
                      {[
                        {lbl:'SNİPER GİRİŞ', val:apiData.setup.sniper,   col:'#00FFB2'},
                        {lbl:'GİRİŞ DÜŞÜK',  val:apiData.setup.entryLow, col:'#10B981'},
                        {lbl:'GİRİŞ YÜKSEK', val:apiData.setup.entryHigh,col:'#34D399'},
                        {lbl:'STOP LOSS',     val:apiData.setup.stop,     col:'#EF4444'},
                        {lbl:'TP1 HEDEF',     val:apiData.setup.tp1,      col:'#6EE7B7'},
                        {lbl:'TP2 HEDEF',     val:apiData.setup.tp2,      col:'#10B981'},
                        {lbl:'TP3 HEDEF',     val:apiData.setup.tp3,      col:'#059669'},
                      ].filter(s=>s.val).map(s=>(
                        <div key={s.lbl} style={{padding:'10px 14px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
                          <div style={{fontFamily:'var(--mono)',fontSize:7.5,color:'var(--t3)',marginBottom:4,letterSpacing:.5}}>{s.lbl}</div>
                          <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:800,color:s.col}}>{fmtTL(s.val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teknik Gösterge Özeti */}
                {apiData.ta && (
                  <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,marginBottom:14,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',background:'rgba(249,115,22,.03)'}}>
                      <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:800,color:'#F97316',letterSpacing:.8}}>▤ TEKNİK GÖSTERGELER</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))'}}>
                      {[
                        {lbl:'RSI(14)',  val:apiData.ta.rsi,  col:apiData.ta.rsi>70?'#EF4444':apiData.ta.rsi<30?'#10B981':'#F59E0B'},
                        {lbl:'TREND',   val:apiData.ta.trend, col:apiData.ta.trend?.includes('GÜÇLÜ YÜ')?'#10B981':apiData.ta.trend?.includes('DÜŞÜŞ')?'#EF4444':'#F59E0B'},
                        {lbl:'ATR %',   val:`%${apiData.ta.atrPct}`, col:'#F97316'},
                        {lbl:'EMA9',    val:fmtTL(apiData.ta.ema9),  col:'#60A5FA'},
                        {lbl:'EMA21',   val:fmtTL(apiData.ta.ema21), col:'#818CF8'},
                        {lbl:'EMA50',   val:fmtTL(apiData.ta.ema50), col:'#A78BFA'},
                        {lbl:'EMA200',  val:fmtTL(apiData.ta.ema200),col:'#C084FC'},
                        {lbl:'BB GEN.', val:`%${apiData.ta.bb?.width}`, col:apiData.ta.bb?.squeeze?'#F43F5E':'#94A3B8'},
                        {lbl:'HACIM ORAN',val:`${apiData.vol?.volRatio}x`,col:apiData.vol?.highVolume?'#10B981':apiData.vol?.dryUp?'#EF4444':'#94A3B8'},
                        {lbl:'MACD',    val:apiData.ta.macd?.histogram > 0 ? '▲ YUKARIDA':'▼ AŞAĞIDA', col:apiData.ta.macd?.histogram>0?'#10B981':'#EF4444'},
                      ].map(s=>(
                        <div key={s.lbl} style={{padding:'10px 14px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
                          <div style={{fontFamily:'var(--mono)',fontSize:7.5,color:'var(--t3)',marginBottom:4,letterSpacing:.5}}>{s.lbl}</div>
                          <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,color:s.col}}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 52H Aralık */}
                {apiData.sr && (
                  <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,marginBottom:14,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:800,color:'#A78BFA',letterSpacing:.8}}>◎ 52 HAFTA ARALIK & DESTEK/DİRENÇ</span>
                    </div>
                    <div style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginBottom:6}}>
                        <span>52H DÜŞÜK: <span style={{color:'#EF4444',fontWeight:700}}>{fmtTL(apiData.sr.low52w)}</span></span>
                        <span>52H YÜKSEK: <span style={{color:'#10B981',fontWeight:700}}>{fmtTL(apiData.sr.high52w)}</span></span>
                      </div>
                      {(() => {
                        const low=apiData.sr.low52w, high=apiData.sr.high52w, cur=apiData.price;
                        const pct=high>low ? ((cur-low)/(high-low))*100 : 50;
                        return (
                          <div style={{position:'relative',height:12,background:'rgba(255,255,255,.05)',borderRadius:6,border:'1px solid var(--border)',overflow:'hidden'}}>
                            <div style={{position:'absolute',left:0,top:0,bottom:0,width:`${pct}%`,background:'linear-gradient(90deg,#EF4444,#F59E0B,#10B981)',borderRadius:'6px 0 0 6px',transition:'width .6s'}}/>
                            <div style={{position:'absolute',left:`${pct}%`,top:'50%',transform:'translate(-50%,-50%)',width:8,height:8,background:'#fff',borderRadius:'50%',boxShadow:'0 0 6px rgba(255,255,255,.6)'}}/>
                          </div>
                        );
                      })()}
                      <div style={{display:'flex',justifyContent:'space-between',fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:6}}>
                        <span>DES(20G): {fmtTL(apiData.sr.support1)}</span>
                        <span style={{color:'#FBBF24',fontWeight:700}}>GÜNCEL: {fmtTL(apiData.price)}</span>
                        <span>DIR(20G): {fmtTL(apiData.sr.resistance1)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Analiz Raporu */}
                {blocks.length>0 && (
                  <div className="analysis-report">
                    <div className="report-header">
                      <span className="report-header-icon" style={{color:'#FFD700'}}>◈</span>
                      <span className="report-header-title" style={{color:'#FFD700'}}>KURUMSAL ANALİZ — MM MASASI & YÖNETİCİ ÖZETİ</span>
                      <span style={{fontFamily:'var(--mono)',fontSize:8.5,fontWeight:700,color:'#FFD700',background:'rgba(255,215,0,.08)',padding:'3px 10px',borderRadius:4,border:'1px solid rgba(255,215,0,.25)'}}>
                        KURUMSAL PREMİUM
                      </span>
                    </div>
                    {blocks.filter(b => VISIBLE_IDS.has(b.id)).map((block,idx) => {
                      const cfg = secCfg(block.id||'');
                      const isNihai = block.id.startsWith('YONETICI') || block.id.startsWith('OZET');
                      const isMM = block.id === 'MM-DESK';
                      const mmKeyColors = {
                        'key sinyal':         '#FFD700',
                        'stop avı':           '#EF4444',
                        'kurumsal pozisyon':  '#00FFB2',
                        'retail tuzağı':      '#F97316',
                        '48-72h bist oyunu':  '#60A5FA',
                        'sektörel rotasyon':  '#A78BFA',
                        'edge':               '#A78BFA',
                      };
                      return (
                        <div key={idx} className="ablock" style={{
                          borderLeft: isMM ? '3px solid #FFD700' : `3px solid ${cfg.color}`,
                          borderColor: isMM ? 'rgba(255,215,0,.25)' : `${cfg.color}30`,
                          borderLeftColor: isMM ? '#FFD700' : cfg.color,
                          background: isMM ? 'linear-gradient(135deg,rgba(255,215,0,.04),rgba(255,215,0,.01))' : undefined,
                          boxShadow: isMM ? '0 0 20px rgba(255,215,0,.06)' : undefined,
                        }}>
                          <div className="ablock-head" style={{background: isMM ? 'linear-gradient(90deg,rgba(255,215,0,.12),rgba(255,215,0,.03))' : `linear-gradient(90deg,${cfg.color}10,${cfg.color}03)`}}>
                            <div className="ablock-icon" style={{color:isMM?'#FFD700':cfg.color,borderColor:isMM?'rgba(255,215,0,.5)':undefined,background:isMM?'rgba(255,215,0,.15)':undefined}}>{cfg.icon}</div>
                            <span className="ablock-label" style={{color:isMM?'#FFD700':cfg.color}}>{cfg.label}</span>
                            {isMM && <span style={{fontFamily:'var(--mono)',fontSize:7,fontWeight:800,color:'#FFD700',background:'rgba(255,215,0,.1)',padding:'2px 8px',borderRadius:4,border:'1px solid rgba(255,215,0,.3)',letterSpacing:1,marginLeft:6}}>BIST MM</span>}
                            <div style={{flex:1,height:1,background:`linear-gradient(90deg,${isMM?'rgba(255,215,0,.3)':cfg.color+'30'},transparent)`}}/>
                          </div>
                          <div>
                            {block.items.map((item,ii) => {
                              if (item.t==='kv') {
                                const kl = item.k.toLowerCase();
                                let valCol = null;
                                if (isMM) {
                                  for (const [mk, mc] of Object.entries(mmKeyColors)) {
                                    if (kl.includes(mk)) { valCol = mc; break; }
                                  }
                                  const isKeySignal = kl.includes('key') || kl.includes('sinyal');
                                  return (
                                    <div key={ii} className="kv-row" style={{background:isKeySignal?'rgba(255,215,0,.04)':undefined}}>
                                      <span className="kv-key" style={{color:valCol||'#FFD700',fontWeight:isKeySignal?800:600,fontSize:isKeySignal?9:undefined}}>{item.k}</span>
                                      <span className="kv-val" style={{color:isKeySignal?'#fff':valCol||undefined,fontWeight:isKeySignal?700:undefined,fontSize:isKeySignal?11:undefined}}>{item.v}</span>
                                    </div>
                                  );
                                }
                                valCol =
                                  (kl.includes('nihai') || kl.includes('karar') || kl.includes('bias')) ? (item.v?.includes('AL')||item.v?.includes('ALIŞ')||item.v?.includes('BULL')?'#00FFB2':item.v?.includes('SAT')||item.v?.includes('SATIŞ')||item.v?.includes('BEAR')?'#EF4444':'#F59E0B') :
                                  kl.includes('güven') || kl.includes('confidence') || kl.includes('win') ? '#00D4FF' :
                                  kl.includes('stop') ? '#EF4444' :
                                  kl.includes('giriş') || kl.includes('sniper') ? '#00FFB2' :
                                  (kl.includes('tp1')||kl.includes('tp2')||kl.includes('tp3')||kl.includes('hedef')) ? '#10B981' :
                                  kl.includes('risk') ? '#FBBF24' :
                                  null;
                                return (
                                  <div key={ii} className="kv-row" style={isNihai ? {background:`${cfg.color}06`} : {}}>
                                    <span className="kv-key">{item.k}</span>
                                    <span className="kv-val" style={valCol ? {color:valCol} : {}}>{item.v}</span>
                                  </div>
                                );
                              }
                              return <div key={ii} className="txt-row" style={isMM?{color:'rgba(255,255,255,.8)',fontSize:11,lineHeight:1.7}:{}}>{item.v}</div>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Timestamp */}
                <div style={{marginTop:16,fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',textAlign:'center',paddingBottom:8}}>
                  {apiData._meta?.engine} · {new Date(apiData.timestamp).toLocaleString('tr-TR')}
                </div>
              </div>
            )}

            {/* Boş durum */}
            {!apiData && !loading && !error && (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:280,gap:20}}>
                <div style={{fontFamily:'var(--mono)',fontSize:36,color:'rgba(0,212,255,.15)'}}>◈</div>
                <div style={{fontFamily:'var(--mono)',textAlign:'center',lineHeight:1.9}}>
                  <div style={{fontWeight:800,color:'var(--t2)',fontSize:13,marginBottom:12,letterSpacing:.3}}>
                    BIST KURUMSAL ANALİZ SİSTEMİ
                  </div>
                  {/* Desktop yönlendirme */}
                  <div className="mob-hide" style={{fontSize:11,color:'var(--t3)'}}>
                    Sol panelden hisse seçin, ardından<br/>
                    <span style={{color:'#FBBF24',fontWeight:800}}>HİSSEYİ ANALİZ ET</span> butonuna tıklayın.
                  </div>
                  {/* Mobil yönlendirme */}
                  <div className="mob-blk">
                    <div style={{fontSize:10,color:'var(--t3)',marginBottom:16}}>
                      Analiz etmek istediğiniz hisseyi seçin
                    </div>
                    <button
                      onClick={()=>setMobTab('hisse')}
                      style={{
                        display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                        width:'100%',maxWidth:260,margin:'0 auto 12px',
                        padding:'13px 20px',borderRadius:10,cursor:'pointer',
                        background:'linear-gradient(135deg,rgba(251,191,36,.15),rgba(251,191,36,.08))',
                        border:'1px solid rgba(251,191,36,.35)',
                        fontFamily:'var(--mono)',fontSize:12,fontWeight:800,
                        color:'#FBBF24',letterSpacing:.5,
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                        <rect width="6" height="4" x="9" y="3" rx="1"/>
                        <path d="M9 12h6M9 16h4"/>
                      </svg>
                      HİSSE SEÇ
                    </button>
                    <div style={{fontSize:9,color:'var(--t3)'}}>
                      ya da üstteki <span style={{color:'rgba(251,191,36,.7)',fontWeight:700}}>DEĞİŞTİR ›</span> butonuna tıklayın
                    </div>
                  </div>
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',textAlign:'center',lineHeight:1.7}}>
                  <span style={{color:'#FBBF24',fontWeight:700}}>{ticker}</span> seçili ·{' '}
                  <span style={{color:'#FBBF24',fontWeight:700}}>HİSSEYİ ANALİZ ET</span> butonuna tıklayın
                </div>
              </div>
            )}
          </div>

          {/* Market Tab (mobil) */}
          <div className="mob" style={{display:mobTab==='market'?'flex':'none',flexDirection:'column',paddingTop:8}}>
            <BistMarketPanel prices={prices} xu100={xu100} usdtry={usdtry} loading={priceLoad} onSelectTicker={t=>{setTicker(t);setMobTab('analyze');}}/>
          </div>

          {/* Hisse Tab (mobil) — Hisse Seçici */}
          <div className="mob" style={{display:mobTab==='hisse'?'flex':'none',flexDirection:'column',margin:'0 -10px'}}>
            {/* Sticky arama + sektör pills */}
            <div className="mob-hisse-sticky">
              <input
                className="search-inp"
                placeholder="Hisse ara... (THYAO, Garanti...)"
                value={search}
                onChange={e=>setSearch(e.target.value)}
                style={{marginBottom:8}}
              />
              <div className="mob-pills-scroll">
                {Object.entries(SEKTORLER).map(([k,v])=>(
                  <button key={k}
                    className={`pill ${activeSek===k?'on':''}`}
                    style={{
                      flexShrink:0,
                      color:activeSek===k?v.color:undefined,
                      borderColor:activeSek===k?v.color+'44':undefined,
                    }}
                    onClick={()=>setActiveSek(k)}>
                    {v.label}
                  </button>
                ))}
              </div>
              <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:6,display:'flex',justifyContent:'space-between'}}>
                <span>{filteredTickers.length} HİSSE</span>
                {dailyLimit && <span style={{color:usagePct>=80?'#ef4444':'var(--accent)',fontWeight:700}}>KOTA: {dailyUsed}/{dailyLimit}</span>}
              </div>
            </div>

            {/* Hisse listesi */}
            <div>
              {filteredTickers.length === 0 && (
                <div style={{padding:'32px 16px',textAlign:'center',fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
                  Aramanızla eşleşen hisse bulunamadı.
                </div>
              )}
              {filteredTickers.map(t => {
                const px = prices.find(p=>p.ticker===t);
                const pos = (px?.change24h||0)>=0;
                const isSelected = ticker===t;
                return (
                  <div key={t}
                    className={`mob-hisse-item${isSelected?' on':''}`}
                    onClick={()=>{ setTicker(t); setMobTab('analyze'); }}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:13,color:isSelected?'var(--accent)':'var(--t1)'}}>
                          {t}
                        </span>
                        {isSelected && (
                          <span style={{fontFamily:'var(--mono)',fontSize:7,fontWeight:700,color:'var(--accent)',background:'rgba(0,212,255,.12)',padding:'1px 6px',borderRadius:3,border:'1px solid rgba(0,212,255,.25)'}}>
                            SEÇİLİ
                          </span>
                        )}
                      </div>
                      <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>
                        {BIST_STOCKS[t]}
                      </div>
                    </div>
                    {px ? (
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:800,color:'var(--t1)'}}>
                          {fmtTL(px.price)}
                        </div>
                        <div style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:700,color:pos?'var(--green)':'var(--red)'}}>
                          {fmtPct(px.change24h)}
                        </div>
                      </div>
                    ) : (
                      <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>—</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profil Tab (mobil) */}
          <div className="mob" style={{display:mobTab==='profile'?'flex':'none',flexDirection:'column',padding:'16px 0'}}>
            {(() => {
              const userName = profile?.full_name || session?.user?.email?.split('@')[0] || 'Kullanıcı';
              const avatarChar = userName[0]?.toUpperCase() || 'U';
              const pm={free:{label:'STARTER',color:'#64748b',grad:'linear-gradient(135deg,#334155,#475569)'},pro:{label:'PRO',color:'#3b82f6',grad:'linear-gradient(135deg,#1d4ed8,#3b82f6)'},elite:{label:'ELITE',color:'#a855f7',grad:'linear-gradient(135deg,#7c3aed,#a855f7)'}}[plan]||{label:'STARTER',color:'#64748b',grad:'linear-gradient(135deg,#334155,#475569)'};
              return (
                <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{background:'var(--card)',border:`1px solid ${pm.color}30`,borderRadius:12,padding:16,display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:44,height:44,borderRadius:12,background:pm.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:'#fff',boxShadow:`0 0 16px ${pm.color}50`,flexShrink:0}}>
                      {avatarChar}
                    </div>
                    <div>
                      <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:800}}>{userName}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t3)',marginTop:2}}>{session?.user?.email}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:800,color:pm.color,marginTop:4}}>{pm.label} MEMBER</div>
                    </div>
                  </div>
                  <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
                    <div style={{fontFamily:'var(--mono)',fontSize:7.5,color:'var(--t3)',letterSpacing:1,marginBottom:10}}>KULLANIM İSTATİSTİKLERİ</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[{lbl:'BUGÜN',val:dailyLimit?`${dailyUsed}/${dailyLimit}`:`${dailyUsed}/∞`,col:pm.color},{lbl:'TOPLAM',val:profile?.total_analyses||'—',col:pm.color}].map(s=>(
                        <div key={s.lbl} style={{background:'var(--panel)',borderRadius:7,padding:'10px 12px',textAlign:'center',border:`1px solid ${s.col}20`}}>
                          <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t3)',marginBottom:4}}>{s.lbl} ANALİZ</div>
                          <div style={{fontFamily:'var(--mono)',fontSize:20,fontWeight:900,color:s.col}}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={doLogout} style={{width:'100%',padding:12,borderRadius:10,cursor:'pointer',fontFamily:'var(--mono)',fontSize:10,fontWeight:700,background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.18)',color:'rgba(239,68,68,.7)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    OTURUM KAPAT
                  </button>
                </div>
              );
            })()}
          </div>

        </div>{/* /main-panel */}

        {/* RIGHT SIDEBAR */}
        <div className="sidebar-r">
          <BistMarketPanel prices={prices} xu100={xu100} usdtry={usdtry} loading={priceLoad} onSelectTicker={t=>{setTicker(t);analyze(t);}}/>
        </div>

      </div>{/* /workspace */}

      {/* MOBILE NAV — 4 tab */}
      <nav className="mob-nav">
        <button className={`mob-btn ${mobTab==='hisse'?'on':''}`} onClick={()=>setMobTab('hisse')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="6" height="4" x="9" y="3" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
          HİSSELER
        </button>
        <button className={`mob-btn ${mobTab==='analyze'?'on':''}`} onClick={()=>setMobTab('analyze')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          ANALİZ
        </button>
        <button className={`mob-btn ${mobTab==='market'?'on':''}`} onClick={()=>setMobTab('market')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          PİYASA
        </button>
        <button className={`mob-btn ${mobTab==='profile'?'on':''}`} onClick={()=>setMobTab('profile')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          PROFİL
        </button>
      </nav>

    </div>
  );
}

