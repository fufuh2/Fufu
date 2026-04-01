// pages/admin.jsx — DEEP TRADE SCAN :: INSTITUTIONAL COMMAND CENTER v4.0
import { useState, useEffect, useRef, useCallback } from 'react';

const ADMIN_EMAIL  = 'furkan@deeptradescan.com';
const TG_CHANNEL   = 'https://t.me/DeepTradeScanner';

/* ═══════════════════════════════════════════════════════════
   MINI COMPONENTS
═══════════════════════════════════════════════════════════ */
function Spark({ data = [], color = '#00D4FF', w = 72, h = 24 }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const gid  = `g${color.replace(/[^a-z0-9]/gi, '')}${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bar({ pct = 0, color = '#00D4FF', height = 3 }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,.05)', borderRadius: height, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg,${color}55,${color})`, borderRadius: height, transition: 'width 1.2s ease', boxShadow: `0 0 8px ${color}44` }} />
    </div>
  );
}

function Pulse({ color = '#10B981', size = 7 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, animation: 'pulse 2s infinite', flexShrink: 0 }} />
  );
}

function Badge({ plan, banned }) {
  if (banned) return <span style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 100, padding: '2px 9px', fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, color: '#f87171', letterSpacing: 1 }}>⊘ BANLANDI</span>;
  const c = plan === 'elite' ? { bg: 'rgba(245,166,35,.12)', bc: 'rgba(245,166,35,.3)', tc: '#F5A623' } : plan === 'pro' ? { bg: 'rgba(0,150,255,.12)', bc: 'rgba(0,150,255,.3)', tc: '#60a5fa' } : { bg: 'rgba(71,85,105,.1)', bc: 'rgba(71,85,105,.2)', tc: '#64748b' };
  return <span style={{ background: c.bg, border: `1px solid ${c.bc}`, borderRadius: 100, padding: '2px 9px', fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, color: c.tc, letterSpacing: 1 }}>{plan === 'elite' ? '💎' : plan === 'pro' ? '⭐' : '○'} {(plan || 'free').toUpperCase()}</span>;
}

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,.25)', letterSpacing: .5 }}>{t.toLocaleString('tr-TR')}</span>;
}

function Countdown({ expiresAt }) {
  const [rem, setRem] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const calc = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setRem('⚠ SÜRESI DOLDU'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      setRem(d > 0 ? `${d}g ${h}s kaldı` : `${h}s kaldı`);
    };
    calc();
    const i = setInterval(calc, 60000);
    return () => clearInterval(i);
  }, [expiresAt]);
  if (!expiresAt) return <span style={{ color: 'var(--t3)', fontSize: 9 }}>Süresiz</span>;
  const expired = new Date(expiresAt) < new Date();
  return <span style={{ color: expired ? '#f87171' : rem.includes('g') ? '#34D399' : '#F5A623', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600 }}>{rem}</span>;
}

/* ═══════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════ */
const api = async (action, body = {}, token) => {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  try {
    const r = await fetch(`/api/admin?action=${action}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { error: `Sunucu hatası (${r.status}): ${text.slice(0, 120)}` }; }
  } catch (e) { return { error: 'Bağlantı hatası: ' + e.message }; }
};
const apiGet = async (action, params = {}, token) => {
  const q = new URLSearchParams({ action, ...params }).toString();
  try {
    const r = await fetch(`/api/admin?${q}`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { error: `Sunucu hatası (${r.status}): ${text.slice(0, 120)}` }; }
  } catch (e) { return { error: 'Bağlantı hatası: ' + e.message }; }
};
const authLogin = async (email, password) => {
  try {
    const r = await fetch('/api/auth?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { error: 'Sunucu hatası: ' + text.slice(0, 100) }; }
  } catch(e) { return { error: 'Bağlantı hatası: ' + e.message }; }
};

/* ═══════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@300;400;500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
  :root {
    --bg:  #020810; --bg1: #060E1C; --bg2: #0A1626; --bg3: #0F1E32; --bg4: #152440;
    --wire: rgba(0,212,255,.07); --wire2: rgba(0,212,255,.035); --frost: rgba(255,255,255,.03);
    --t1: #E8EDF5; --t2: #7A9AB8; --t3: #2D4460; --t4: #1A2D42;
    --cyan: #00D4FF; --gold: #F5A623; --jade: #10B981; --ruby: #EF4444;
    --iris: #A78BFA; --coral: #FB923C; --rose: #F472B6; --sky: #38BDF8; --lime: #84CC16;
    --mono: 'DM Mono',monospace; --sans: 'Plus Jakarta Sans',sans-serif; --disp: 'Syne',sans-serif;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--t1);font-family:var(--sans);overflow-x:hidden}
  ::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:2px}
  ::selection{background:rgba(0,212,255,.15)}

  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes scanV{0%{top:-3%}100%{top:103%}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
  @keyframes slideMsg{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ringGlow{0%,100%{box-shadow:0 0 0 2px rgba(0,212,255,.1)}50%{box-shadow:0 0 0 2px rgba(0,212,255,.4),0 0 24px rgba(0,212,255,.08)}}
  @keyframes goldGlow{0%,100%{box-shadow:0 0 0 1px rgba(245,166,35,.1)}50%{box-shadow:0 0 0 1px rgba(245,166,35,.4),0 0 20px rgba(245,166,35,.06)}}
  @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}

  .fade-up{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both}
  .fade-in{animation:fadeIn .25s ease both}

  .kpi{background:linear-gradient(160deg,var(--bg1),var(--bg2));border:1px solid var(--wire);border-radius:14px;padding:20px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
  .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:var(--kc,var(--cyan));opacity:.7}
  .kpi:hover{border-color:rgba(0,212,255,.15);transform:translateY(-1px)}

  .data-table{width:100%;border-collapse:collapse}
  .data-table th{padding:9px 14px;font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:2px;font-weight:500;border-bottom:1px solid var(--wire);background:rgba(0,0,0,.3);text-align:left;white-space:nowrap}
  .data-table td{padding:10px 14px;font-size:12px;border-bottom:1px solid var(--wire2);vertical-align:middle;transition:background .1s}
  .data-table tr:hover td{background:rgba(0,212,255,.02)}
  .data-table tr:last-child td{border-bottom:none}

  .btn{border:none;border-radius:7px;padding:5px 12px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--mono);transition:all .15s;letter-spacing:.5px;white-space:nowrap}
  .btn:hover:not(:disabled){opacity:.85;transform:translateY(-1px)}
  .btn:active:not(:disabled){transform:translateY(0)}
  .btn:disabled{opacity:.3;cursor:not-allowed}
  .btn-cyan{background:rgba(0,212,255,.12);color:var(--cyan);border:1px solid rgba(0,212,255,.25)}
  .btn-jade{background:rgba(16,185,129,.12);color:var(--jade);border:1px solid rgba(16,185,129,.25)}
  .btn-ruby{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
  .btn-gold{background:rgba(245,166,35,.1);color:var(--gold);border:1px solid rgba(245,166,35,.25)}
  .btn-iris{background:rgba(167,139,250,.1);color:var(--iris);border:1px solid rgba(167,139,250,.25)}
  .btn-tg{background:rgba(41,168,235,.12);color:#29A8EB;border:1px solid rgba(41,168,235,.25)}
  .btn-ghost{background:transparent;color:var(--t3);border:1px solid var(--wire)}
  .btn-ghost:hover:not(:disabled){color:var(--t2);border-color:rgba(255,255,255,.1)}
  .btn-primary{background:linear-gradient(135deg,#002244,#004080,#0060BB);border:1px solid rgba(0,212,255,.35);color:#fff;border-radius:11px;padding:13px 20px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1.5px;cursor:pointer;width:100%;transition:all .2s;box-shadow:0 4px 24px rgba(0,100,200,.3)}
  .btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,150,255,.4)}
  .btn-primary:disabled{opacity:.4;cursor:not-allowed}

  .inp{width:100%;background:var(--bg);border:1px solid var(--wire);border-radius:9px;color:var(--t1);padding:10px 14px;font-size:13px;font-family:var(--mono);outline:none;transition:all .2s}
  .inp:focus{border-color:rgba(0,212,255,.4);box-shadow:0 0 0 3px rgba(0,212,255,.06)}
  .inp::placeholder{color:var(--t4)}

  .nav-item{width:100%;display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border:1px solid transparent;border-radius:9px;font-size:12px;font-weight:500;cursor:pointer;font-family:var(--sans);transition:all .12s;text-align:left;gap:8px;margin-bottom:2px;background:transparent;color:var(--t3)}
  .nav-item:hover:not(.active){background:rgba(255,255,255,.02);color:var(--t2)}
  .nav-item.active{background:rgba(0,212,255,.07);border-color:rgba(0,212,255,.2);color:var(--cyan);font-weight:700}

  .conv-item{padding:13px 15px;border-bottom:1px solid var(--wire2);cursor:pointer;transition:background .12s;border-left:2px solid transparent}
  .conv-item:hover{background:rgba(0,212,255,.02)}
  .conv-item.active{background:rgba(0,212,255,.05);border-left-color:var(--cyan)}

  .msg-user{background:var(--bg2);border:1px solid var(--wire);color:var(--t2);border-radius:12px 12px 12px 2px;padding:10px 13px;font-size:13px;line-height:1.6;max-width:78%;word-break:break-word;animation:slideMsg .2s ease}
  .msg-admin{background:linear-gradient(135deg,rgba(0,50,100,.6),rgba(0,100,180,.4));border:1px solid rgba(0,212,255,.2);color:#fff;border-radius:12px 12px 2px 12px;padding:10px 13px;font-size:13px;line-height:1.6;max-width:78%;word-break:break-word;animation:slideMsg .2s ease}

  .notif{position:fixed;top:62px;right:20px;z-index:9999;padding:11px 20px;border-radius:10px;font-family:var(--mono);font-size:12px;font-weight:600;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.6);animation:popIn .2s ease;backdrop-filter:blur(12px);max-width:340px}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:8888;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}
  .modal{background:linear-gradient(160deg,var(--bg1),var(--bg2));border:1px solid var(--wire);border-radius:18px;padding:28px;width:100%;animation:popIn .22s ease;box-shadow:0 30px 80px rgba(0,0,0,.7)}

  .sh{font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:3px;margin-bottom:4px;display:flex;align-items:center;gap:6px}
  .sh::before{content:'';display:inline-block;width:14px;height:1px;background:var(--cyan)}
  .st{font-family:var(--disp);font-size:26px;font-weight:800;margin-bottom:18px}

  .tr-elite td{background:rgba(245,166,35,.025) !important}
  .tr-elite:hover td{background:rgba(245,166,35,.05) !important}
  .tr-elite td:first-child{border-left:2px solid rgba(245,166,35,.4)}
  .tr-pro td:first-child{border-left:2px solid rgba(0,150,255,.35)}
  .tr-banned td{opacity:.5}
  .tr-expired td:nth-child(3){color:var(--ruby) !important}

  .plan-chip{display:inline-flex;align-items:center;gap:5px;border-radius:8px;padding:6px 12px;font-family:var(--mono);font-size:9px;font-weight:800;letter-spacing:1px}
  .plan-chip-elite{background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.4);color:var(--gold);animation:goldGlow 3s ease-in-out infinite}
  .plan-chip-pro{background:rgba(0,150,255,.12);border:1px solid rgba(0,150,255,.3);color:#60a5fa}
  .plan-chip-free{background:rgba(100,116,139,.1);border:1px solid rgba(100,116,139,.2);color:#64748b}

  .quick-btn{border:none;border-radius:6px;padding:4px 10px;font-size:9px;font-weight:700;cursor:pointer;font-family:var(--mono);transition:all .12s;letter-spacing:.5px;white-space:nowrap;line-height:1.4}
  .quick-btn:hover{transform:translateY(-1px);opacity:.9}
  .quick-btn-elite{background:rgba(245,166,35,.15);color:var(--gold);border:1px solid rgba(245,166,35,.35)}
  .quick-btn-pro{background:rgba(0,150,255,.12);color:#60a5fa;border:1px solid rgba(0,150,255,.3)}
  .quick-btn-free{background:rgba(100,116,139,.1);color:#64748b;border:1px solid rgba(100,116,139,.2)}
  .sys-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--wire2)}
  .sys-row:last-child{border-bottom:none}
  .dur-btn{border:1px solid var(--wire);background:transparent;border-radius:8px;padding:8px 14px;font-family:var(--mono);font-size:10px;color:var(--t2);cursor:pointer;transition:all .15s;text-align:center;font-weight:600}
  .dur-btn.sel{background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.4);color:var(--cyan)}
  .dur-btn:hover:not(.sel){border-color:rgba(0,212,255,.2);color:var(--t1)}

  /* ── MOBILE RESPONSIVE ── */
  .mob-hide{display:flex;align-items:center}
  .mob-show{display:none}
  .sidebar-overlay{display:none}
  .support-layout{display:flex;height:100%}
  .support-list{width:290px;border-right:1px solid var(--wire);display:flex;flex-direction:column;flex-shrink:0}
  .support-chat{flex:1;display:flex;flex-direction:column;min-width:0}
  .support-back{display:none}

  @media(max-width:768px){
    .mob-hide{display:none !important}
    .mob-show{display:flex !important;align-items:center}

    /* Sidebar as drawer */
    .sidebar-drawer{
      position:fixed !important;
      top:0 !important; left:0 !important; bottom:0 !important;
      width:260px !important;
      z-index:500 !important;
      transform:translateX(-100%);
      transition:transform .25s cubic-bezier(.16,1,.3,1);
      height:100vh !important;
    }
    .sidebar-drawer.open{transform:translateX(0)}

    /* Sidebar overlay backdrop */
    .sidebar-overlay{
      display:block;
      position:fixed;inset:0;
      background:rgba(0,0,0,.7);
      z-index:499;
      opacity:0;pointer-events:none;
      transition:opacity .25s;
    }
    .sidebar-overlay.open{opacity:1;pointer-events:auto}

    /* Content takes full width */
    .main-content{padding:16px !important}
    .main-body{flex-direction:column}

    /* Top bar */
    .topbar-title{font-size:13px !important}
    .topbar-right-full{display:none}
    .topbar-right-mobile{display:flex !important;gap:6px;align-items:center}

    /* Revenue strip → column */
    .revenue-strip{flex-direction:column !important;gap:14px !important;padding:14px !important}
    .revenue-divider{display:none !important}

    /* Dashboard bottom grid */
    .dashboard-bottom{grid-template-columns:1fr !important}

    /* KPI already auto-fit — good */

    /* Table overflow */
    .table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
    .data-table th,.data-table td{padding:8px 10px !important;font-size:10px !important}

    /* Modal full-width on mobile */
    .modal{border-radius:14px !important;padding:20px !important}
    .modal-overlay{padding:12px !important}

    /* Broadcast template grid */
    .bc-tmpl-grid{grid-template-columns:1fr !important}

    /* Support tab: stacked layout */
    .support-layout{flex-direction:column !important}
    .support-list{width:100% !important;border-right:none !important;border-bottom:1px solid var(--wire);max-height:220px}
    .support-back{display:flex !important;font-size:11px;color:var(--cyan);background:none;border:none;cursor:pointer;padding:8px 16px;font-family:var(--mono);align-items:center;gap:6px}
    .support-hide-mobile{display:none !important}
  }

  @media(max-width:480px){
    .main-content{padding:12px !important}
    .kpi{padding:14px !important}
    .st{font-size:20px !important}
    .dur-btn{padding:6px 10px !important;font-size:9px !important}
    .data-table th,.data-table td{padding:6px 8px !important;font-size:9px !important}
  }
`;

/* ═══════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════ */
export default function AdminPanel() {
  /* Auth */
  const [token, setToken]             = useState(null);
  const [loginForm, setLoginForm]     = useState({ email: '', password: '' });
  const [loginErr, setLoginErr]       = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [bootPhase, setBootPhase]     = useState(0);

  /* Data */
  const [tab, setTab]                 = useState('dashboard');
  const [stats, setStats]             = useState(null);
  const [users, setUsers]             = useState([]);
  const [conversations, setConversations] = useState([]);
  const [convMessages, setConvMessages]   = useState([]);
  const [selectedConv, setSelectedConv]   = useState(null);
  const [analysisLog, setAnalysisLog] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  /* UI */
  const [notif, setNotif]             = useState(null);
  const [userSearch, setUserSearch]   = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [replyText, setReplyText]     = useState('');
  const [broadcastText, setBroadcastText]   = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [actionLoading, setActionLoading]   = useState({});
  const [confirmModal, setConfirmModal]     = useState(null);
  const [userDetail, setUserDetail]         = useState(null);
  const [memberModal, setMemberModal]       = useState(null); // {user, plan}
  const [memberMonths, setMemberMonths]     = useState(1);
  const [banModal, setBanModal]             = useState(null);
  const [banReason, setBanReason]           = useState('');
  const [tgMsg, setTgMsg]                   = useState('');
  const [tgLoading, setTgLoading]           = useState(false);
  const [sparkData, setSparkData]           = useState({});

  /* Pagination / Sort / Bulk */
  const [userPage, setUserPage]         = useState(0);
  const [userSort, setUserSort]         = useState('created_at');
  const [userSortDir, setUserSortDir]   = useState(-1);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkAction, setBulkAction]     = useState('');

  /* Activity / Coin data */
  const [activityData, setActivityData] = useState([]);
  const [coinStats, setCoinStats]       = useState({ coins: [], topUsers: [] });

  /* Broadcast templates */
  const [bcTemplateOpen, setBcTemplateOpen] = useState(false);

  /* Mobile sidebar */
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pollRef     = useRef(null);
  const convPollRef = useRef(null);
  const bottomRef   = useRef(null);

  /* ─── Init ─── */
  useEffect(() => {
    const s = localStorage.getItem('dts_admin');
    if (s) { try { setToken(JSON.parse(s)); } catch {} }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadAll();
    if (autoRefresh) {
      pollRef.current = setInterval(() => { loadStats(); loadConversations(); }, 8000);
    }
    return () => clearInterval(pollRef.current);
  }, [token, autoRefresh]);

  useEffect(() => {
    clearInterval(convPollRef.current);
    if (selectedConv && token) {
      loadConvMessages(selectedConv.conversation_id);
      convPollRef.current = setInterval(() => loadConvMessages(selectedConv.conversation_id), 3000);
    }
    return () => clearInterval(convPollRef.current);
  }, [selectedConv, token]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [convMessages]);

  useEffect(() => {
    if (stats) {
      setSparkData({
        total: Array.from({ length: 8 }, (_, i) => Math.max(0, (stats.totalUsers || 1) * (.6 + i * .05 + Math.random() * .2))),
        pro:   Array.from({ length: 8 }, (_, i) => Math.max(0, (stats.proUsers || 1) * (.5 + i * .07 + Math.random() * .3))),
        elite: Array.from({ length: 8 }, (_, i) => Math.max(0, (stats.eliteUsers || 1) * (.4 + i * .1 + Math.random() * .3))),
        mrr:   Array.from({ length: 8 }, (_, i) => Math.max(0, (stats.estMRR || 100) * (.6 + i * .05 + Math.random() * .2))),
      });
    }
  }, [stats]);

  /* ─── Loaders ─── */
  const toast = (text, type = 'success') => { setNotif({ text, type }); setTimeout(() => setNotif(null), 3500); };
  const setAL  = (k, v) => setActionLoading(p => ({ ...p, [k]: v }));

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadUsers(), loadConversations(), loadAnalysisLog(), loadActivityData(), loadCoinStats()]);
    } catch(e) {
      console.error('[DTS Admin] loadAll error:', e);
    }
    setLoading(false);
    setLastRefresh(new Date());
  }, [token]);

  async function loadStats()     { const d = await apiGet('stats', {}, token); if (!d.error) setStats(d); }
  async function loadUsers() {
    const d = await apiGet('users', {}, token);
    if (d.users && d.users.length >= 0) {
      setUsers(d.users);
    } else if (d.error) {
      console.error('[DTS Admin] users error:', d.error);
      toast('Kullanıcı yükleme hatası: ' + d.error, 'error');
    }
  }
  async function loadConversations() { const d = await apiGet('support-list', {}, token); if (d.messages) setConversations(d.messages); }
  async function loadConvMessages(id) { const d = await apiGet('support-messages', { conversation_id: id }, token); if (d.messages) setConvMessages(d.messages); }
  async function loadAnalysisLog()   { const d = await apiGet('analysis-log', {}, token); if (d.log) setAnalysisLog(d.log); }
  async function loadActivityData()  { const d = await apiGet('activity-stats', {}, token); if (d.days) setActivityData(d.days); }
  async function loadCoinStats()     { const d = await apiGet('coin-stats', {}, token); if (!d.error) setCoinStats(d); }

  async function selectConv(conv) { setSelectedConv(conv); setConvMessages([]); await loadConvMessages(conv.conversation_id); }
  async function handleReply() {
    const txt = replyText.trim(); if (!txt || !selectedConv) return;
    setAL('reply', true);
    const d = await api('support-reply', { conversation_id: selectedConv.conversation_id, reply: txt, user_id: selectedConv.user_id, user_email: selectedConv.user_email }, token);
    setAL('reply', false);
    if (d.success) { setReplyText(''); toast('Mesaj gönderildi ✓'); await loadConvMessages(selectedConv.conversation_id); await loadConversations(); }
    else toast(d.error || 'Hata', 'error');
  }
  async function handleClose(id) { const d = await api('support-close', { conversation_id: id }, token); if (d.success) { toast('Kapatıldı'); setSelectedConv(null); setConvMessages([]); loadConversations(); } }

  /* ─── Plan management ─── */
  async function openMemberModal(user, plan) {
    setMemberModal({ user, plan });
    setMemberMonths(1);
  }

  async function confirmSetPlan() {
    if (!memberModal) return;
    const { user, plan } = memberModal;
    setAL(user.id + '_p', true);
    try {
      const d = await api('set-plan', {
        userId: user.id, plan,
        months: memberMonths > 0 ? memberMonths : 0,
        userEmail: user.email, userName: user.full_name,
      }, token);
      if (d.success) {
        setMemberModal(null);
        toast(`✓ ${user.email} → ${plan.toUpperCase()} (${memberMonths > 0 ? memberMonths + ' ay' : 'Süresiz'})`);
        loadUsers(); loadStats();
      } else {
        toast(d.error || 'Üyelik atanamadı', 'error');
      }
    } catch (e) {
      toast('Bağlantı hatası: ' + (e.message || 'Bilinmeyen hata'), 'error');
    } finally {
      setAL(user.id + '_p', false);
    }
  }

  /* ─── Ban ─── */
  async function openBanModal(user) { setBanModal(user); setBanReason(''); }
  async function confirmBan() {
    if (!banModal) return;
    setAL(banModal.id + '_b', true);
    const d = await api('ban-user', { userId: banModal.id, banned: true, userEmail: banModal.email, reason: banReason }, token);
    setAL(banModal.id + '_b', false);
    setBanModal(null);
    if (d.success) { toast(`🚫 ${banModal.email} banlı`); loadUsers(); loadStats(); }
    else toast(d.error || 'Hata', 'error');
  }
  async function handleUnban(user) {
    setAL(user.id + '_b', true);
    const d = await api('ban-user', { userId: user.id, banned: false, userEmail: user.email }, token);
    setAL(user.id + '_b', false);
    if (d.success) { toast(`✓ Ban kaldırıldı`); loadUsers(); loadStats(); }
    else toast(d.error || 'Hata', 'error');
  }

  async function handleDelete(u) {
    setConfirmModal({ title: 'Kullanıcı Sil', text: `${u.email} kalıcı silinecek!`, onConfirm: async () => {
      setConfirmModal(null); setAL(u.id + '_d', true);
      const d = await api('delete-user', { userId: u.id, userEmail: u.email }, token);
      setAL(u.id + '_d', false);
      if (d.success) { toast('Silindi'); loadUsers(); loadStats(); }
      else toast(d.error || 'Hata', 'error');
    }});
  }

  async function handleResetLimit(uid) { const d = await api('reset-limit', { userId: uid }, token); if (d.success) { toast('Limit sıfırlandı'); loadUsers(); } }

  async function handleBroadcast() {
    if (!broadcastText.trim()) return;
    setAL('bc', true);
    const d = await api('broadcast', { message: broadcastText, targetPlan: broadcastTarget }, token);
    setAL('bc', false);
    if (d.success) { toast(`${d.sent} kullanıcıya gönderildi`); setBroadcastText(''); }
    else toast(d.error || 'Hata', 'error');
  }

  /* ─── CSV Export ─── */
  function exportCSV() {
    const rows = [['Email','Name','Plan','Daily Analyses','Last Login','Signup Date','Expires','Banned']];
    filteredUsers.forEach(u => rows.push([
      u.email, u.full_name||'', u.plan||'free', u.daily_analyses||0,
      u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('tr-TR') : '',
      u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '',
      u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString('tr-TR') : '',
      u.banned ? 'yes' : 'no',
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = `dts-users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast(`${filteredUsers.length} kullanıcı dışa aktarıldı`);
  }

  /* ─── Bulk Actions ─── */
  async function handleBulkAction() {
    if (!bulkAction || selectedUsers.size === 0) return;
    const ids = Array.from(selectedUsers);
    setAL('bulk', true);
    try {
      if (bulkAction === 'reset-limit') {
        for (const id of ids) await api('reset-limit', { userId: id }, token);
        toast(`${ids.length} kullanıcı limiti sıfırlandı`);
      } else if (bulkAction === 'free') {
        const toDown = users.filter(u => ids.includes(u.id));
        for (const u of toDown) await api('set-plan', { userId: u.id, plan: 'free', userEmail: u.email, userName: u.full_name }, token);
        toast(`${ids.length} kullanıcı FREE'e indirildi`);
      }
    } finally {
      setAL('bulk', false);
      setSelectedUsers(new Set()); setBulkAction('');
      loadUsers(); loadStats();
    }
  }

  function toggleSelectUser(id) {
    setSelectedUsers(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleSelectAll() {
    if (selectedUsers.size === pagedUsers.length) { setSelectedUsers(new Set()); }
    else { setSelectedUsers(new Set(pagedUsers.map(u => u.id))); }
  }

  async function handleTestTelegram() {
    setTgLoading(true);
    const d = await api('test-telegram', {}, token);
    setTgLoading(false);
    toast(d.success ? '✓ Telegram bağlantısı başarılı!' : '✗ Telegram bağlantı hatası!', d.success ? 'success' : 'error');
  }

  async function handleSendTG() {
    if (!tgMsg.trim()) return;
    setTgLoading(true);
    const d = await api('send-telegram', { message: tgMsg }, token);
    setTgLoading(false);
    if (d.success) { toast('Telegram mesajı gönderildi ✓'); setTgMsg(''); }
    else toast(d.result?.description || 'Telegram hatası', 'error');
  }

  async function handleExpireCheck() {
    const d = await api('expire-check', {}, token);
    if (d.success) {
      toast(d.downgraded > 0 ? `${d.downgraded} üyelik downgrade edildi` : 'Süresi dolan üyelik yok');
      loadUsers(); loadStats();
    }
  }

  /* ─── Login ─── */
  async function handleLogin(e) {
    e?.preventDefault();
    setLoginLoading(true); setLoginErr('');
    setBootPhase(1);
    await new Promise(r => setTimeout(r, 500));
    setBootPhase(2);
    const d = await authLogin(loginForm.email, loginForm.password);
    setLoginLoading(false);
    if (d.error) { setBootPhase(0); setLoginErr(d.error); return; }
    const uEmail = d.session?.user?.email || d.user?.email;
    if (uEmail !== ADMIN_EMAIL) { setBootPhase(0); setLoginErr('Admin yetkisi yok'); return; }
    setBootPhase(3);
    await new Promise(r => setTimeout(r, 300));
    localStorage.setItem('dts_admin', JSON.stringify(d.session.access_token));
    setToken(d.session.access_token);
  }

  /* ─── Derived ─── */
  const filteredUsers = users.filter(u => {
    const s = userSearch.toLowerCase();
    const ms = !s || u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s);
    const mp = userPlanFilter === 'all' || (userPlanFilter === 'banned' ? u.banned : (u.plan || 'free') === userPlanFilter);
    return ms && mp;
  });

  const PAGE_SIZE = 50;
  const sortedFilteredUsers = [...filteredUsers].sort((a, b) => {
    const av = a[userSort]; const bv = b[userSort];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; if (bv == null) return -1;
    if (typeof av === 'number') return (av - bv) * userSortDir;
    return String(av).localeCompare(String(bv)) * userSortDir;
  });
  const totalPages  = Math.ceil(sortedFilteredUsers.length / PAGE_SIZE);
  const pagedUsers  = sortedFilteredUsers.slice(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE);

  const totalOpen = conversations.filter(c => c.status === 'open' && !c.is_from_admin).length;
  const estMRR    = stats?.estMRR || 0;

  function SortTh({ col, children, style = {} }) {
    const active = userSort === col;
    return (
      <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
        onClick={() => { if (userSort === col) setUserSortDir(d => -d); else { setUserSort(col); setUserSortDir(-1); } setUserPage(0); }}>
        {children} <span style={{ opacity: active ? 1 : .25, fontSize: 8 }}>{active ? (userSortDir === -1 ? '▼' : '▲') : '⇅'}</span>
      </th>
    );
  }

  const BROADCAST_TEMPLATES = [
    { label: '🚀 Yeni Özellik', text: '🚀 Deep Trade Scan\'e yeni bir özellik eklendi! Platformu keşfedin ve fırsatları kaçırmayın.' },
    { label: '⭐ PRO Kampanya', text: '🔥 Sınırlı süre! PRO üyelik ile kurumsal seviye analiz araçlarına erişin. Şimdi yükseltin.' },
    { label: '💎 ELITE Teklif', text: '💎 ELITE üyelik ile tüm premium özelliklere sınırsız erişim. Özel fiyat için hemen başvurun.' },
    { label: '⚙️ Bakım', text: '⚙️ Sistemimiz kısa süreliğine bakım moduna geçecektir. Anlayışınız için teşekkür ederiz.' },
    { label: '📊 Haftalık Özet', text: '📊 Bu haftanın piyasa özeti hazır! Güncel analizlerimizi takip etmeye devam edin. Başarılı işlemler dileriz.' },
  ];

  const NAV = [
    { id: 'dashboard', icon: '◈', label: 'Dashboard' },
    { id: 'users',     icon: '◉', label: 'Kullanıcılar', badge: users.length },
    { id: 'revenue',   icon: '◆', label: 'Gelir' },
    { id: 'support',   icon: '◎', label: 'Destek', badge: totalOpen, bColor: 'var(--ruby)' },
    { id: 'analysis',  icon: '◐', label: 'Analiz Log' },
    { id: 'broadcast', icon: '▸', label: 'Broadcast' },
    { id: 'telegram',  icon: '✈', label: 'Telegram' },
    { id: 'system',    icon: '◊', label: 'Sistem' },
  ];

  /* ═══════════════════════════════════════════════════════════
     LOGIN SCREEN
  ═══════════════════════════════════════════════════════════ */
  if (!token) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <style>{CSS}</style>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.022) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,212,255,.5),transparent)', animation: 'scanV 8s linear infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--wire)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: 1.5 }}>DTS // SECURE TERMINAL v4.0</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--jade)' }}>
          <Pulse color="var(--jade)" size={5} /> SYSTEM ONLINE
        </div>
      </div>
      <div style={{ position: 'absolute', top: 44, right: 24, fontFamily: 'var(--mono)', fontSize: 7, color: 'rgba(239,68,68,.35)', letterSpacing: 1, textAlign: 'right', lineHeight: 1.8 }}>
        UNAUTHORIZED ACCESS PROHIBITED<br />ALL SESSIONS MONITORED & LOGGED
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,rgba(0,20,50,.9),rgba(0,60,120,.6))', border: '1px solid rgba(0,212,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 0 40px rgba(0,212,255,.1)' }}>
              <span style={{ fontFamily: 'var(--disp)', fontSize: 28, fontWeight: 800, color: 'var(--cyan)' }}>DTS</span>
            </div>
            <div style={{ position: 'absolute', inset: -7, borderRadius: 27, border: '1px solid rgba(0,212,255,.12)', animation: 'ringGlow 3s ease-in-out infinite' }} />
          </div>
          <div style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800, letterSpacing: 2, marginBottom: 5 }}>ADMIN COMMAND CENTER</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 4 }}>DEEP TRADE SCAN // v4.0</div>
        </div>

        <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 18, padding: 30, boxShadow: '0 30px 80px rgba(0,0,0,.7)' }}>
          {bootPhase > 0 && (
            <div style={{ background: 'rgba(0,212,255,.06)', border: '1px solid rgba(0,212,255,.15)', borderRadius: 8, padding: '9px 14px', marginBottom: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cyan)' }}>
              {bootPhase === 1 ? '◈ KİMLİK DOĞRULANIYOR...' : bootPhase === 2 ? '◈ YETKİ KONTROL EDİLİYOR...' : '◈ ERİŞİM ONAYLANDI — YÜKLENİYOR...'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: 2.5, marginBottom: 7 }}>ADMİN E-POSTA</div>
              <input className="inp" type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="admin@deeptradescan.com" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: 2.5, marginBottom: 7 }}>ŞİFRE</div>
              <input className="inp" type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••••" />
            </div>
            {loginErr && <div style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: '#f87171' }}>⊘ {loginErr}</div>}
            <button className="btn-primary" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ width: 11, height: 11, border: '1.5px solid rgba(0,212,255,.3)', borderTopColor: 'var(--cyan)', borderRadius: '50%', display: 'inline-block', animation: 'spin .5s linear infinite' }} />
                    KİMLİK DOĞRULANIYOR...
                  </span>
                : '→ AUTHENTICATE & ACCESS'
              }
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--wire)' }}>
            {[['◈', '256-BIT SSL'], ['◉', 'E2E'], ['◆', 'IZLENIYOR']].map(([ic, lb]) => (
              <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)' }}>
                <span style={{ color: 'var(--jade)' }}>{ic}</span>{lb}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 24px', borderTop: '1px solid var(--wire)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)' }}>CHARTOS APEX 7.0 // ADMIN_v4.0</div>
        <LiveClock />
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     MAIN PANEL
  ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{CSS}</style>

      {/* NOTIF */}
      {notif && (
        <div className="notif" style={{ background: notif.type === 'error' ? 'rgba(239,68,68,.92)' : 'rgba(16,185,129,.92)', border: `1px solid ${notif.type === 'error' ? 'rgba(239,68,68,.5)' : 'rgba(16,185,129,.5)'}` }}>
          {notif.text}
        </div>
      )}

      {/* CONFIRM */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#f87171' }}>{confirmModal.title}</div>
            <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24, lineHeight: 1.7 }}>{confirmModal.text}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>İptal</button>
              <button className="btn btn-ruby" onClick={confirmModal.onConfirm}>✕ Onayla & Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER MODAL — Üyelik Atama */}
      {memberModal && (
        <div className="modal-overlay" onClick={() => setMemberModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: memberModal.plan === 'elite' ? 'linear-gradient(90deg,transparent,var(--gold),transparent)' : memberModal.plan === 'free' ? 'linear-gradient(90deg,transparent,var(--t3),transparent)' : 'linear-gradient(90deg,transparent,var(--cyan),transparent)', borderRadius: '18px 18px 0 0' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="sh">ÜYELİK ATAMA</div>
                <div style={{ fontFamily: 'var(--disp)', fontSize: 24, fontWeight: 800 }}>
                  {memberModal.plan === 'elite' ? '💎 ELITE' : memberModal.plan === 'pro' ? '⭐ PRO' : '○ FREE'} Üyelik
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setMemberModal(null)} style={{ padding: '5px 10px', marginTop: 4 }}>✕</button>
            </div>

            {/* User info + current plan */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'rgba(0,0,0,.35)', borderRadius: 12, border: '1px solid var(--wire)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: memberModal.user.plan === 'elite' ? 'rgba(245,166,35,.12)' : 'var(--bg3)', border: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--disp)', fontSize: 17, fontWeight: 800, color: memberModal.user.plan === 'elite' ? 'var(--gold)' : 'var(--t2)', flexShrink: 0 }}>
                {memberModal.user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberModal.user.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Mevcut:</span>
                  <Badge plan={memberModal.user.plan} banned={memberModal.user.banned} />
                  {memberModal.user.plan_expires_at && <Countdown expiresAt={memberModal.user.plan_expires_at} />}
                </div>
              </div>
              {/* Arrow */}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--t4)' }}>→</div>
              {/* Target plan */}
              <div className={`plan-chip ${memberModal.plan === 'elite' ? 'plan-chip-elite' : memberModal.plan === 'pro' ? 'plan-chip-pro' : 'plan-chip-free'}`}>
                {memberModal.plan === 'elite' ? '💎' : memberModal.plan === 'pro' ? '⭐' : '○'} {memberModal.plan.toUpperCase()}
              </div>
            </div>

            {/* Duration picker */}
            {memberModal.plan !== 'free' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: 2.5, marginBottom: 12 }}>ÜYELİK SÜRESİ</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[[1,'1 Ay'],[3,'3 Ay'],[6,'6 Ay'],[12,'1 Yıl']].map(([m, l]) => (
                    <button key={m} className={`dur-btn ${memberMonths === m ? 'sel' : ''}`} onClick={() => setMemberMonths(m)}>
                      <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 800, color: memberMonths === m ? (memberModal.plan === 'elite' ? 'var(--gold)' : 'var(--cyan)') : 'var(--t1)', marginBottom: 2 }}>{m}</div>
                      <div style={{ fontSize: 9 }}>{l}</div>
                      <div style={{ fontSize: 8, color: memberMonths === m ? (memberModal.plan === 'elite' ? 'var(--gold)' : 'var(--cyan)') : 'var(--t3)', marginTop: 3 }}>
                        ${memberModal.plan === 'elite' ? m * 500 : m * 100}
                      </div>
                    </button>
                  ))}
                </div>
                <button className={`dur-btn ${memberMonths === 0 ? 'sel' : ''}`} onClick={() => setMemberMonths(0)} style={{ width: '100%', marginTop: 8 }}>
                  ∞ Süresiz / Ömür Boyu
                </button>
              </div>
            )}

            {/* Expiry preview */}
            {memberModal.plan !== 'free' && memberMonths > 0 && (
              <div style={{ background: memberModal.plan === 'elite' ? 'rgba(245,166,35,.06)' : 'rgba(0,212,255,.05)', border: `1px solid ${memberModal.plan === 'elite' ? 'rgba(245,166,35,.2)' : 'rgba(0,212,255,.15)'}`, borderRadius: 10, padding: '11px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 4 }}>BİTİŞ TARİHİ</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: memberModal.plan === 'elite' ? 'var(--gold)' : 'var(--cyan)' }}>
                    {new Date(Date.now() + memberMonths * 30 * 86400000).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 4 }}>TUTAR</div>
                  <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 800, color: memberModal.plan === 'elite' ? 'var(--gold)' : 'var(--cyan)' }}>
                    ${memberModal.plan === 'elite' ? memberMonths * 500 : memberMonths * 100}
                  </div>
                </div>
              </div>
            )}

            {memberModal.plan === 'free' && (
              <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '11px 16px', marginBottom: 16, fontFamily: 'var(--mono)', fontSize: 11, color: '#fca5a5' }}>
                ⚠ Bu işlem kullanıcının mevcut {(memberModal.user.plan || '').toUpperCase()} üyeliğini iptal eder ve FREE planına düşürür.
              </div>
            )}

            <div style={{ background: 'rgba(41,168,235,.05)', border: '1px solid rgba(41,168,235,.12)', borderRadius: 10, padding: '9px 14px', marginBottom: 20, fontSize: 11, color: '#7DD3FA', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✈</span>
              <span>Telegram <b>@DeepTradeScanner</b> kanalına otomatik bildirim gönderilecek</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setMemberModal(null)} style={{ flex: 1, padding: '11px' }}>İptal</button>
              <button
                onClick={confirmSetPlan}
                disabled={actionLoading[memberModal.user.id + '_p']}
                style={{ flex: 2.5, padding: '11px', fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)', letterSpacing: 1, border: 'none', borderRadius: 9, cursor: actionLoading[memberModal.user.id + '_p'] ? 'not-allowed' : 'pointer', opacity: actionLoading[memberModal.user.id + '_p'] ? .5 : 1, transition: 'all .15s',
                  background: memberModal.plan === 'elite' ? 'linear-gradient(135deg,rgba(180,110,0,.6),rgba(245,166,35,.4))' : memberModal.plan === 'free' ? 'rgba(100,116,139,.15)' : 'rgba(0,150,255,.15)',
                  color: memberModal.plan === 'elite' ? 'var(--gold)' : memberModal.plan === 'free' ? '#94a3b8' : 'var(--cyan)',
                  border: `1px solid ${memberModal.plan === 'elite' ? 'rgba(245,166,35,.5)' : memberModal.plan === 'free' ? 'rgba(100,116,139,.3)' : 'rgba(0,150,255,.4)'}`,
                  boxShadow: memberModal.plan === 'elite' ? '0 4px 20px rgba(245,166,35,.15)' : 'none',
                }}
              >
                {actionLoading[memberModal.user.id + '_p']
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, border: '1.5px solid rgba(255,255,255,.2)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .5s linear infinite' }} />
                      UYGULANYOR...
                    </span>
                  : `→ ${memberModal.plan.toUpperCase()} OLARAK ATA`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAN MODAL */}
      {banModal && (
        <div className="modal-overlay" onClick={() => setBanModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--ruby)', borderRadius: '18px 18px 0 0' }} />
            <div className="sh" style={{ color: 'var(--ruby)' }}>SİTE BANI</div>
            <div style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800, marginBottom: 10, color: '#f87171' }}>🚫 Kullanıcı Banla</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', marginBottom: 16, padding: '8px 12px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 8 }}>
              📧 {banModal.email}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: 2, marginBottom: 8 }}>BAN SEBEBİ (opsiyonel)</div>
              <input className="inp" placeholder="Spam, Kural ihlali, vb..." value={banReason} onChange={e => setBanReason(e.target.value)} />
            </div>
            <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#fca5a5' }}>
              ⚠ Bu kullanıcı siteye giriş yapamaz. Supabase Auth seviyesinde banlanacak.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setBanModal(null)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-ruby" onClick={confirmBan} disabled={actionLoading[banModal.id + '_b']} style={{ flex: 2, padding: '10px', fontSize: 11 }}>
                {actionLoading[banModal.id + '_b'] ? '...' : '🚫 SİTEDEN BANLA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAIL */}
      {userDetail && (
        <div className="modal-overlay" onClick={() => setUserDetail(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: userDetail.plan === 'elite' ? 'var(--gold)' : userDetail.plan === 'pro' ? 'var(--cyan)' : 'var(--t3)', borderRadius: '18px 18px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div className="sh">KULLANICI DETAYI</div>
                <div style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800 }}>{userDetail.full_name || userDetail.email?.split('@')[0]}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setUserDetail(null)} style={{ padding: '6px 12px' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {[
                ['Email', userDetail.email],
                ['Plan', (userDetail.plan || 'free').toUpperCase()],
                ['Günlük Analiz', userDetail.daily_analyses || 0],
                ['Üyelik Bitiş', userDetail.plan_expires_at ? new Date(userDetail.plan_expires_at).toLocaleDateString('tr-TR') : 'Süresiz / Free'],
                ['Son Giriş', userDetail.last_sign_in_at ? new Date(userDetail.last_sign_in_at).toLocaleString('tr-TR') : '—'],
                ['Kayıt', userDetail.created_at ? new Date(userDetail.created_at).toLocaleString('tr-TR') : '—'],
                ['Durum', userDetail.banned ? '🚫 Banlı' : '✓ Aktif'],
                ['Provider', userDetail.provider || 'email'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--wire)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 4 }}>{k.toUpperCase()}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', wordBreak: 'break-all' }}>{String(v)}</div>
                </div>
              ))}
            </div>
            {userDetail.plan_expires_at && (
              <div style={{ background: 'rgba(0,212,255,.05)', border: '1px solid rgba(0,212,255,.15)', borderRadius: 9, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>Üyelik Kalan Süre:</span>
                <Countdown expiresAt={userDetail.plan_expires_at} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!userDetail.banned && <button className="btn btn-cyan" onClick={() => { openMemberModal(userDetail, 'pro'); setUserDetail(null); }}>⭐ PRO Ver</button>}
              {!userDetail.banned && <button className="btn btn-gold" onClick={() => { openMemberModal(userDetail, 'elite'); setUserDetail(null); }}>💎 ELITE Ver</button>}
              {!userDetail.banned && (userDetail.plan || 'free') !== 'free' && <button className="btn btn-ghost" onClick={() => { openMemberModal(userDetail, 'free'); setUserDetail(null); }}>○ FREE'e Düşür</button>}
              <button className="btn btn-ghost" onClick={() => { handleResetLimit(userDetail.id); toast('Limit sıfırlandı'); setUserDetail(null); }}>↺ Limit Sıfırla</button>
              {userDetail.banned
                ? <button className="btn btn-jade" onClick={() => { handleUnban(userDetail); setUserDetail(null); }}>✓ Ban Kaldır</button>
                : <button className="btn btn-ruby" onClick={() => { openBanModal(userDetail); setUserDetail(null); }}>🚫 Banla</button>}
              <button className="btn btn-tg" onClick={() => { window.open(TG_CHANNEL, '_blank'); }}>✈ Telegram</button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background: 'rgba(2,8,16,.97)', borderBottom: '1px solid var(--wire)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Hamburger — mobile only */}
          <button className="mob-show btn btn-ghost" onClick={() => setMobileSidebarOpen(o => !o)} style={{ padding: '6px 9px', fontSize: 15 }}>☰</button>
          <div className="topbar-title" style={{ fontFamily: 'var(--disp)', fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>COMMAND CENTER</div>
          <div className="mob-hide" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 100, padding: '3px 10px' }}>
            <Pulse size={5} /> <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--jade)', letterSpacing: 1.5 }}>LIVE</span>
          </div>
          {totalOpen > 0 && <div className="mob-hide" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 100, padding: '3px 12px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ruby)', fontWeight: 700, animation: 'blink 2s infinite' }}>{totalOpen} YENİ DESTEK</div>}
        </div>
        {/* Desktop right */}
        <div className="topbar-right-full mob-hide" style={{ gap: 10, alignItems: 'center' }}>
          <LiveClock />
          {lastRefresh && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)' }}>↻ {lastRefresh.toLocaleTimeString('tr-TR')}</span>}
          <div style={{ width: 1, height: 16, background: 'var(--wire)' }} />
          <button className="btn btn-tg" onClick={() => window.open(TG_CHANNEL, '_blank')} style={{ fontSize: 9, padding: '4px 10px' }}>✈ @DeepTradeScanner</button>
          <button className="btn btn-ghost" onClick={loadAll} style={{ padding: '4px 9px', fontSize: 11 }}>
            {loading ? <span style={{ display: 'inline-block', animation: 'spin .5s linear infinite' }}>↻</span> : '↻'}
          </button>
          <button className="btn btn-ruby" onClick={() => { localStorage.removeItem('dts_admin'); setToken(null); }} style={{ fontSize: 10, padding: '4px 12px' }}>ÇIKIŞ</button>
        </div>
        {/* Mobile right */}
        <div className="topbar-right-mobile mob-show" style={{ gap: 6 }}>
          {totalOpen > 0 && <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 100, padding: '3px 9px', fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--ruby)', fontWeight: 700, animation: 'blink 2s infinite' }}>{totalOpen}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 100, padding: '3px 8px' }}>
            <Pulse size={5} /> <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--jade)' }}>LIVE</span>
          </div>
          <button className="btn btn-ghost" onClick={loadAll} style={{ padding: '5px 9px', fontSize: 12 }}>
            {loading ? <span style={{ display: 'inline-block', animation: 'spin .5s linear infinite' }}>↻</span> : '↻'}
          </button>
          <button className="btn btn-ruby" onClick={() => { localStorage.removeItem('dts_admin'); setToken(null); }} style={{ fontSize: 9, padding: '5px 10px' }}>✕</button>
        </div>
      </div>

      {/* BODY */}
      <div className="main-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* SIDEBAR OVERLAY (mobile backdrop) */}
        <div className={`sidebar-overlay ${mobileSidebarOpen ? 'open' : ''}`} onClick={() => setMobileSidebarOpen(false)} />

        {/* SIDEBAR */}
        <div className={`sidebar-drawer ${mobileSidebarOpen ? 'open' : ''}`} style={{ width: 220, background: 'var(--bg)', borderRight: '1px solid var(--wire)', height: 'calc(100vh - 52px)', position: 'sticky', top: 52, display: 'flex', flexDirection: 'column', padding: '12px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 14px', borderBottom: '1px solid var(--wire)', marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(0,50,100,.5)', border: '1px solid rgba(0,212,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--disp)', fontSize: 13, fontWeight: 800, color: 'var(--cyan)' }}>DTS</div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: 1.5 }}>ADMIN</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--cyan)', letterSpacing: 2, marginTop: 1 }}>COMMAND v4.0</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => { setTab(item.id); setMobileSidebarOpen(false); }} className={`nav-item ${tab === item.id ? 'active' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: tab === item.id ? 1 : .5 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span style={{ background: item.bColor || 'rgba(0,212,255,.15)', border: `1px solid ${item.bColor || 'rgba(0,212,255,.25)'}`, borderRadius: 100, padding: '1px 7px', fontSize: 9, fontWeight: 800, color: item.bColor ? '#fff' : 'var(--cyan)', animation: item.bColor ? 'blink 2s infinite' : 'none' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          {stats && (
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--wire)', borderRadius: 10, padding: '12px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--t3)', letterSpacing: 2.5, marginBottom: 10 }}>ÖZET</div>
              {[['Toplam', stats.totalUsers || users.length, 'var(--cyan)'], ['PRO', stats.proUsers || 0, '#60a5fa'], ['ELITE', stats.eliteUsers || 0, 'var(--gold)'], ['Banlı', stats.bannedUsers || 0, 'var(--ruby)']].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{l}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--wire2)', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--jade)', fontWeight: 700 }}>
                MRR: ${estMRR.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="main-content" style={{ flex: 1, overflowY: tab === 'support' ? 'hidden' : 'auto', padding: tab === 'support' ? 0 : 24, height: 'calc(100vh - 52px)' }}>

          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                <div>
                  <div className="sh">GENEL BAKIŞ</div>
                  <div className="st" style={{ marginBottom: 0 }}>Dashboard</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>
                    {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={handleExpireCheck} style={{ fontSize: 9 }}>⏱ Expire Kontrol</button>
                  <button className="btn btn-jade" onClick={loadAll} style={{ fontSize: 9 }}>
                    {loading ? <span style={{ display: 'inline-block', animation: 'spin .5s linear infinite' }}>↻</span> : '↻ Yenile'}
                  </button>
                </div>
              </div>
              {/* Revenue Hero Strip */}
              {stats && (
                <div className="revenue-strip" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,.08),rgba(0,212,255,.05))', border: '1px solid rgba(16,185,129,.15)', borderRadius: 14, padding: '14px 22px', marginBottom: 20, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--jade)', letterSpacing: 2.5, marginBottom: 4 }}>EST. MONTHLY REVENUE</div>
                    <div style={{ fontFamily: 'var(--disp)', fontSize: 36, fontWeight: 800, color: 'var(--jade)', lineHeight: 1 }}>${(stats.estMRR || 0).toLocaleString()}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>ARR: ${((stats.estMRR || 0) * 12).toLocaleString()}</div>
                  </div>
                  <div className="revenue-divider" style={{ width: 1, height: 48, background: 'var(--wire)' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 8 }}>PLAN DAĞILIMI</div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {[['FREE', stats.freeUsers || 0, 'var(--t4)'], ['PRO', stats.proUsers || 0, '#60a5fa'], ['💎 ELITE', stats.eliteUsers || 0, 'var(--gold)']].map(([l, v, c]) => (
                        <div key={l}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: c, marginBottom: 2 }}>{l}</div>
                          <div style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="revenue-divider" style={{ width: 1, height: 48, background: 'var(--wire)' }} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 8 }}>DÖNÜŞÜM ORANI</div>
                    <div style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800, color: 'var(--iris)', marginBottom: 4 }}>
                      %{stats.totalUsers > 0 ? (((stats.proUsers || 0) + (stats.eliteUsers || 0)) / stats.totalUsers * 100).toFixed(1) : '0.0'}
                    </div>
                    <Bar pct={stats.totalUsers > 0 ? (((stats.proUsers || 0) + (stats.eliteUsers || 0)) / stats.totalUsers * 100) : 0} color="var(--iris)" height={3} />
                  </div>
                  {(stats.expiredPro > 0 || stats.expiredElite > 0) && (
                    <>
                      <div className="revenue-divider" style={{ width: 1, height: 48, background: 'var(--wire)' }} />
                      <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }} onClick={handleExpireCheck}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--ruby)', letterSpacing: 2, marginBottom: 4 }}>SÜRESİ DOLAN</div>
                        <div style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800, color: 'var(--ruby)' }}>{(stats.expiredPro || 0) + (stats.expiredElite || 0)}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--ruby)', marginTop: 3 }}>Downgrade Bekliyor</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* KPI */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { l: 'TOPLAM KULLANICI', v: stats?.totalUsers || users.length, sub: `${stats?.profileCount || 0} profil`, c: 'var(--cyan)', sk: 'total' },
                  { l: 'PRO ÜYE', v: stats?.proUsers || 0, sub: `$${(stats?.proUsers || 0) * 100}/mo`, c: '#60a5fa', sk: 'pro' },
                  { l: 'ELITE ÜYE', v: stats?.eliteUsers || 0, sub: `$${(stats?.eliteUsers || 0) * 500}/mo`, c: 'var(--gold)', sk: 'elite' },
                  { l: 'EST. MRR', v: `$${estMRR.toLocaleString()}`, sub: `ARR: $${(estMRR * 12).toLocaleString()}`, c: 'var(--jade)', sk: 'mrr' },
                  { l: 'BUGÜN KAYIT', v: stats?.todaySignups || 0, sub: 'Yeni üyeler', c: 'var(--iris)', sk: null },
                  { l: 'AKTİF (24H)', v: stats?.activeUsers24h || 0, sub: 'Son 24 saatte giriş', c: 'var(--coral)', sk: null },
                  { l: 'DÖNÜŞÜM', v: `%${stats?.conversionRate ?? (stats?.totalUsers > 0 ? (((stats?.proUsers||0)+(stats?.eliteUsers||0))/stats.totalUsers*100).toFixed(1) : '0.0')}`, sub: 'Free → Ücretli', c: 'var(--rose)', sk: null },
                  { l: 'AÇIK DESTEK', v: totalOpen, sub: totalOpen > 0 ? 'Yanıt bekliyor' : 'Temiz', c: totalOpen > 0 ? 'var(--ruby)' : 'var(--jade)', sk: null },
                ].map((item, i) => (
                  <div key={i} className="kpi" style={{ '--kc': item.c }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 8 }}>{item.l}</div>
                        <div style={{ fontFamily: 'var(--disp)', fontSize: 28, fontWeight: 800, lineHeight: 1, color: 'var(--t1)' }}>{item.v}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: item.c, marginTop: 5 }}>{item.sub}</div>
                      </div>
                      {item.sk && sparkData[item.sk] && <Spark data={sparkData[item.sk]} color={item.c} />}
                    </div>
                    <Bar pct={Math.min(((typeof item.v === 'number' ? item.v : parseFloat(item.v?.replace(/[^0-9.]/g, '')) || 0) / Math.max(stats?.totalUsers || 1, 1)) * 100, 100)} color={item.c} />
                  </div>
                ))}
              </div>

              {/* 7-Day Activity Chart */}
              {activityData.length > 0 && (
                <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5, marginBottom: 14 }}>7 GÜNLÜK KAYIT TRENDİ</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 50 }}>
                    {activityData.map((d, i) => {
                      const maxVal = Math.max(...activityData.map(x => x.signups), 1);
                      const pct = d.signups / maxVal;
                      const isToday = i === activityData.length - 1;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: isToday ? 'var(--cyan)' : 'var(--t3)' }}>{d.signups}</div>
                          <div style={{ width: '100%', height: Math.max(pct * 36, 3), background: isToday ? 'var(--cyan)' : 'rgba(0,212,255,.25)', borderRadius: '3px 3px 0 0', boxShadow: isToday ? '0 0 8px rgba(0,212,255,.4)' : 'none', transition: 'height .5s ease' }} />
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--t4)', whiteSpace: 'nowrap' }}>{d.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)' }}>
                    Toplam 7 gün: {activityData.reduce((s, d) => s + d.signups, 0)} kayıt
                  </div>
                </div>
              )}

              <div className="dashboard-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                {/* Son kayıtlar */}
                <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--wire)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5 }}>SON KAYITLAR ({users.length} toplam)</div>
                    <button className="btn btn-ghost" onClick={() => setTab('users')} style={{ fontSize: 9, padding: '3px 10px' }}>TÜMÜ →</button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>KULLANICI</th><th>PLAN</th><th>SÜRE</th><th>KAYIT</th></tr></thead>
                      <tbody>
                        {users.slice(0, 12).map((u, i) => (
                          <tr key={i} style={{ cursor: 'pointer' }} className={u.plan === 'elite' ? 'tr-elite' : u.plan === 'pro' ? 'tr-pro' : ''} onClick={() => setUserDetail(u)}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: u.banned ? 'rgba(239,68,68,.1)' : u.plan === 'elite' ? 'rgba(245,166,35,.1)' : 'var(--bg3)', border: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: u.banned ? 'var(--ruby)' : u.plan === 'elite' ? 'var(--gold)' : 'var(--t3)', flexShrink: 0 }}>
                                  {u.banned ? '⊘' : (u.email?.[0]?.toUpperCase() || '?')}
                                </div>
                                <div>
                                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t1)' }}>{u.email}</div>
                                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>{u.full_name || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td><Badge plan={u.plan} banned={u.banned} /></td>
                            <td><Countdown expiresAt={u.plan_expires_at} /></td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—'}</td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--t4)', padding: '32px 0', fontFamily: 'var(--mono)', fontSize: 11 }}>
                            {loading ? '↻ Yükleniyor...' : '// Kayıtlı kullanıcı yok'}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Plan dist + System */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: 18 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5, marginBottom: 16 }}>PLAN DAĞILIMI</div>
                    {[
                      ['FREE', stats?.freeUsers || 0, 'var(--t4)'],
                      ['PRO', stats?.proUsers || 0, '#60a5fa'],
                      ['ELITE', stats?.eliteUsers || 0, 'var(--gold)'],
                      ['BANLANDI', stats?.bannedUsers || 0, 'var(--ruby)'],
                    ].map(([l, v, c]) => {
                      const total = stats?.totalUsers || users.length || 1;
                      return (
                        <div key={l} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: c }}>{l}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{v} ({total > 0 ? ((v / total) * 100).toFixed(0) : 0}%)</span>
                          </div>
                          <Bar pct={total > 0 ? (v / total) * 100 : 0} color={c} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: 18 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5, marginBottom: 14 }}>SİSTEM</div>
                    {[['APEX 7.0', 'var(--jade)'], ['Supabase', 'var(--jade)'], ['Telegram Bot', 'var(--jade)'], ['Vercel', 'var(--jade)']].map(([n, c]) => (
                      <div key={n} className="sys-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
                          <span style={{ fontSize: 12 }}>{n}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: c, letterSpacing: 1.5 }}>ONLINE</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ KULLANICILLAR ══ */}
          {tab === 'users' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div>
                  <div className="sh">YÖNETİM</div>
                  <div className="st">Kullanıcılar <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--t3)' }}>({filteredUsers.length} / {users.length})</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn btn-jade" onClick={handleExpireCheck} style={{ fontSize: 9 }}>⏱ Expire Kontrol</button>
                  <button className="btn btn-cyan" onClick={exportCSV} style={{ fontSize: 9 }}>⬇ CSV İndir</button>
                  <button className="btn btn-ghost" onClick={loadUsers} style={{ fontSize: 9 }}>↻</button>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: 12, pointerEvents: 'none' }}>⌕</span>
                  <input className="inp" style={{ paddingLeft: 32 }} placeholder="Email, isim ara..." value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setUserPage(0); }} />
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['all', 'free', 'pro', 'elite', 'banned'].map(f => (
                    <button key={f} className={`btn ${userPlanFilter === f ? 'btn-cyan' : 'btn-ghost'}`}
                      onClick={() => { setUserPlanFilter(f); setUserPage(0); setSelectedUsers(new Set()); }} style={{ fontSize: 9 }}>
                      {f === 'all' ? 'TÜMÜ' : f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '9px 14px', background: 'rgba(0,212,255,.06)', border: '1px solid rgba(0,212,255,.18)', borderRadius: 9 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cyan)', fontWeight: 700 }}>{selectedUsers.size} seçildi</span>
                  <div style={{ width: 1, height: 16, background: 'var(--wire)' }} />
                  <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                    style={{ background: 'var(--bg2)', border: '1px solid var(--wire)', color: 'var(--t2)', borderRadius: 6, padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 10, outline: 'none' }}>
                    <option value="">İşlem seç...</option>
                    <option value="reset-limit">↺ Limit Sıfırla</option>
                    <option value="free">○ FREE'e Düşür</option>
                  </select>
                  <button className="btn btn-cyan" onClick={handleBulkAction} disabled={!bulkAction || actionLoading.bulk} style={{ fontSize: 9 }}>
                    {actionLoading.bulk ? '...' : '→ Uygula'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setSelectedUsers(new Set())} style={{ fontSize: 9 }}>İptal</button>
                </div>
              )}

              <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 980 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <input type="checkbox" checked={selectedUsers.size === pagedUsers.length && pagedUsers.length > 0}
                            onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: 'var(--cyan)' }} />
                        </th>
                        <SortTh col="email">KULLANICI</SortTh>
                        <SortTh col="plan">PLAN</SortTh>
                        <th>SÜRE</th>
                        <SortTh col="daily_analyses">ANALİZ</SortTh>
                        <SortTh col="last_sign_in_at">SON GİRİŞ</SortTh>
                        <SortTh col="created_at">KAYIT</SortTh>
                        <th style={{ minWidth: 300 }}>İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUsers.map((u, i) => {
                        const expired = u.plan_expires_at && new Date(u.plan_expires_at) < new Date();
                        const rowClass = u.banned ? 'tr-banned' : u.plan === 'elite' ? 'tr-elite' : u.plan === 'pro' ? 'tr-pro' : expired ? 'tr-expired' : '';
                        const isSel = selectedUsers.has(u.id);
                        return (
                          <tr key={i} className={rowClass} style={{ background: isSel ? 'rgba(0,212,255,.04)' : undefined }}>
                            <td onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSel} onChange={() => toggleSelectUser(u.id)}
                                style={{ cursor: 'pointer', accentColor: 'var(--cyan)' }} />
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setUserDetail(u)}>
                                <div style={{ width: 32, height: 32, borderRadius: 9, background: u.banned ? 'rgba(239,68,68,.1)' : u.plan === 'elite' ? 'rgba(245,166,35,.12)' : u.plan === 'pro' ? 'rgba(0,100,200,.12)' : 'var(--bg3)', border: `1px solid ${u.plan === 'elite' ? 'rgba(245,166,35,.35)' : u.plan === 'pro' ? 'rgba(0,150,255,.25)' : 'var(--wire)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: u.banned ? 'var(--ruby)' : u.plan === 'elite' ? 'var(--gold)' : u.plan === 'pro' ? '#60a5fa' : 'var(--t3)', flexShrink: 0 }}>
                                  {u.banned ? '⊘' : (u.email?.[0]?.toUpperCase() || '?')}
                                </div>
                                <div>
                                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: u.plan === 'elite' ? '#f0c040' : 'var(--t1)', fontWeight: u.plan === 'elite' ? 700 : 400 }}>{u.email}</div>
                                  <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 1 }}>{u.full_name || '—'} · {u.provider || 'email'}</div>
                                </div>
                              </div>
                            </td>
                            <td><Badge plan={u.plan} banned={u.banned} /></td>
                            <td>
                              {expired
                                ? <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ruby)', fontWeight: 700, background: 'rgba(239,68,68,.08)', padding: '2px 7px', borderRadius: 4 }}>⚠ DOLDU</span>
                                : <Countdown expiresAt={u.plan_expires_at} />}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: (u.daily_analyses || 0) > 0 ? 'var(--cyan)' : 'var(--t4)' }}>{u.daily_analyses || 0}</span>
                            </td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('tr-TR') : '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                <button className="btn btn-ghost" onClick={() => setUserDetail(u)} style={{ fontSize: 10, padding: '4px 8px' }} title="Detay">👁</button>
                                {!u.banned && (u.plan || 'free') !== 'elite' && (
                                  <button className="quick-btn quick-btn-elite" disabled={actionLoading[u.id + '_p']} onClick={() => openMemberModal(u, 'elite')}>💎 ELITE</button>
                                )}
                                {!u.banned && (u.plan || 'free') !== 'pro' && (u.plan || 'free') !== 'elite' && (
                                  <button className="quick-btn quick-btn-pro" disabled={actionLoading[u.id + '_p']} onClick={() => openMemberModal(u, 'pro')}>⭐ PRO</button>
                                )}
                                {!u.banned && (u.plan || 'free') !== 'free' && (
                                  <button className="quick-btn quick-btn-free" disabled={actionLoading[u.id + '_p']} onClick={() => openMemberModal(u, 'free')}>○ FREE</button>
                                )}
                                <button className="btn btn-ghost" onClick={() => handleResetLimit(u.id)} style={{ fontSize: 9, padding: '4px 7px' }} title="Limit Sıfırla">↺</button>
                                {u.banned
                                  ? <button className="btn btn-jade" disabled={actionLoading[u.id + '_b']} onClick={() => handleUnban(u)} style={{ fontSize: 9 }}>✓ Çöz</button>
                                  : <button className="btn btn-ruby" disabled={actionLoading[u.id + '_b']} onClick={() => openBanModal(u)} style={{ fontSize: 9 }}>⊘ Ban</button>}
                                <button className="btn btn-ruby" disabled={actionLoading[u.id + '_d']} onClick={() => handleDelete(u)} style={{ fontSize: 10, padding: '4px 7px', opacity: .7 }} title="Sil">✕</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {pagedUsers.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                      {loading ? '↻ Yükleniyor...' : '// Kullanıcı bulunamadı'}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>
                      {userPage * PAGE_SIZE + 1}–{Math.min((userPage + 1) * PAGE_SIZE, sortedFilteredUsers.length)} / {sortedFilteredUsers.length} kullanıcı
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" onClick={() => setUserPage(0)} disabled={userPage === 0} style={{ fontSize: 9, padding: '4px 9px' }}>«</button>
                      <button className="btn btn-ghost" onClick={() => setUserPage(p => p - 1)} disabled={userPage === 0} style={{ fontSize: 9, padding: '4px 9px' }}>‹</button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const pg = totalPages <= 7 ? i : Math.max(0, Math.min(userPage - 3, totalPages - 7)) + i;
                        return (
                          <button key={pg} className={`btn ${userPage === pg ? 'btn-cyan' : 'btn-ghost'}`}
                            onClick={() => setUserPage(pg)} style={{ fontSize: 9, padding: '4px 9px', minWidth: 30 }}>{pg + 1}</button>
                        );
                      })}
                      <button className="btn btn-ghost" onClick={() => setUserPage(p => p + 1)} disabled={userPage >= totalPages - 1} style={{ fontSize: 9, padding: '4px 9px' }}>›</button>
                      <button className="btn btn-ghost" onClick={() => setUserPage(totalPages - 1)} disabled={userPage >= totalPages - 1} style={{ fontSize: 9, padding: '4px 9px' }}>»</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ GELİR ══ */}
          {tab === 'revenue' && (
            <div className="fade-up">
              <div className="sh">FİNANSAL ANALİZ</div>
              <div className="st">Gelir Analizi</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { l: 'AYLIK GELİR (MRR)', v: `$${estMRR.toLocaleString()}`, c: 'var(--jade)', sub: 'Aktif üyelikler' },
                  { l: 'YILLIK GELİR (ARR)', v: `$${(estMRR * 12).toLocaleString()}`, c: 'var(--cyan)', sub: 'Projeksiyon' },
                  { l: 'ARPU', v: `$${stats?.proUsers + stats?.eliteUsers > 0 ? (estMRR / ((stats?.proUsers || 0) + (stats?.eliteUsers || 0))).toFixed(0) : 0}`, c: 'var(--gold)', sub: 'Ödeme yapan/kişi' },
                  { l: 'DÖNÜŞÜM', v: `%${stats?.totalUsers > 0 ? (((stats?.proUsers || 0) + (stats?.eliteUsers || 0)) / stats.totalUsers * 100).toFixed(1) : 0}`, c: 'var(--iris)', sub: 'Free → Ücretli' },
                ].map((item, i) => (
                  <div key={i} className="kpi">
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 10 }}>{item.l}</div>
                    <div style={{ fontFamily: 'var(--disp)', fontSize: 32, fontWeight: 800, color: item.c, lineHeight: 1, marginBottom: 5 }}>{item.v}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{item.sub}</div>
                    <Bar pct={60} color={item.c} />
                  </div>
                ))}
              </div>
              <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: 24 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5, marginBottom: 20 }}>PLAN BAZLI GELİR BREAKDOWN</div>
                {[['FREE', 0, stats?.freeUsers || 0, 'var(--t4)'], ['PRO', 100, stats?.proUsers || 0, '#60a5fa'], ['ELITE', 500, stats?.eliteUsers || 0, 'var(--gold)']].map(([plan, price, count, color]) => (
                  <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                    <Badge plan={plan.toLowerCase()} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', width: 60 }}>{count} üye</span>
                    <div style={{ flex: 1 }}><Bar pct={estMRR > 0 ? ((count * price) / Math.max(estMRR, 1)) * 100 : 0} color={color} height={4} /></div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color, width: 80, textAlign: 'right' }}>${(count * price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ DESTEK ══ */}
          {tab === 'support' && (
            <div className="support-layout" style={{ display: 'flex', height: '100%', animation: 'fadeIn .3s ease' }}>
              <div className={`support-list ${selectedConv ? 'support-hide-mobile' : ''}`}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--wire)', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--cyan)', letterSpacing: 3, marginBottom: 6 }}>DESTEK MERKEZİ</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--disp)', fontSize: 18, fontWeight: 800 }}>Mesajlar</div>
                    {totalOpen > 0 && <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 100, padding: '2px 10px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ruby)', fontWeight: 700, animation: 'blink 2s infinite' }}>{totalOpen} AÇIK</div>}
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {conversations.length === 0
                    ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11 }}>Mesaj yok</div>
                    : conversations.map((conv, i) => {
                        const isActive = selectedConv?.conversation_id === conv.conversation_id;
                        const hasNew = conv.status === 'open' && !conv.is_from_admin;
                        return (
                          <div key={i} className={`conv-item ${isActive ? 'active' : ''}`} onClick={() => selectConv(conv)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                {hasNew && <Pulse color="var(--ruby)" size={6} />}
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--t1)' }}>{conv.user_email || 'Anonim'}</span>
                              </div>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{new Date(conv.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lastUserMessage || conv.message}</div>
                            <div style={{ marginTop: 5 }}>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, color: conv.status === 'open' ? 'var(--ruby)' : 'var(--jade)', background: conv.status === 'open' ? 'rgba(239,68,68,.08)' : 'rgba(16,185,129,.08)', borderRadius: 4, padding: '2px 7px' }}>
                                {conv.status === 'open' ? 'AÇIK' : conv.status === 'replied' ? 'CEVAPLANDI' : 'KAPALI'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
              {selectedConv ? (
                <div className="support-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <button className="support-back" onClick={() => { setSelectedConv(null); setConvMessages([]); }}>← Mesajlara Dön</button>
                  <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2,8,16,.5)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>{selectedConv.user_email?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)' }}>{selectedConv.user_email}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', marginTop: 2 }}>ID: {selectedConv.conversation_id?.slice(0, 12)}...</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost" onClick={() => handleClose(selectedConv.conversation_id)} style={{ fontSize: 10 }}>Kapat</button>
                      <button className="btn btn-ghost" onClick={() => { setSelectedConv(null); setConvMessages([]); }} style={{ fontSize: 11 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {convMessages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 10, marginTop: 40 }}>Yükleniyor...</div>}
                    {convMessages.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: m.is_from_admin ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                        {!m.is_from_admin && <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t3)', flexShrink: 0 }}>{selectedConv.user_email?.[0]?.toUpperCase() || '?'}</div>}
                        <div className={m.is_from_admin ? 'msg-admin' : 'msg-user'}>
                          {m.message}
                          <div style={{ fontSize: 8, opacity: .4, marginTop: 4, fontFamily: 'var(--mono)' }}>{new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {m.is_from_admin && <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(0,50,100,.5)', border: '1px solid rgba(0,212,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', flexShrink: 0 }}>A</div>}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <div style={{ padding: '11px 18px', borderTop: '1px solid var(--wire)', background: 'rgba(2,8,16,.5)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                      <textarea value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }} placeholder="Cevap yaz... (Enter = gönder)" rows={2}
                        style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--wire)', borderRadius: 9, color: 'var(--t1)', padding: '9px 13px', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', resize: 'none', transition: 'border-color .2s' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,.4)'}
                        onBlur={e => e.target.style.borderColor = 'var(--wire)'} />
                      <button className="btn btn-cyan" onClick={handleReply} disabled={actionLoading.reply || !replyText.trim()} style={{ padding: '10px 18px', fontSize: 16, height: 50 }}>→</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 48, color: 'var(--t4)' }}>◎</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', letterSpacing: 2 }}>KONUŞMA SEÇİN</div>
                </div>
              )}
            </div>
          )}

          {/* ══ ANALİZ LOG ══ */}
          {tab === 'analysis' && (
            <div className="fade-up">
              <div className="sh">İZLEME</div>
              <div className="st">Analiz Log</div>

              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { l: 'TOPLAM ANALİZ', v: analysisLog.reduce((s, u) => s + (u.daily_analyses || 0), 0), c: 'var(--cyan)' },
                  { l: 'AKTİF KULLANICI', v: analysisLog.filter(u => (u.daily_analyses || 0) > 0).length, c: 'var(--jade)' },
                  { l: 'EN YÜKSEK', v: analysisLog[0]?.daily_analyses || 0, c: 'var(--gold)' },
                  { l: 'ORTALAMA', v: (analysisLog.reduce((s,u)=>s+(u.daily_analyses||0),0) / Math.max(analysisLog.filter(u=>(u.daily_analyses||0)>0).length, 1)).toFixed(1), c: 'var(--iris)' },
                ].map((item, i) => (
                  <div key={i} className="kpi" style={{ '--kc': item.c }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 6 }}>{item.l}</div>
                    <div style={{ fontFamily: 'var(--disp)', fontSize: 28, fontWeight: 800, color: item.c }}>{item.v}</div>
                  </div>
                ))}
              </div>

              {/* Coin Stats */}
              {coinStats.coins && coinStats.coins.length > 0 && (
                <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5, marginBottom: 14 }}>EN ÇOK ANALİZ EDİLEN COİNLER</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {coinStats.coins.map((c, i) => {
                      const maxCount = coinStats.coins[0].count;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', width: 16, textAlign: 'right' }}>#{i+1}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--t2)', width: 80 }}>{c.coin}</span>
                          <div style={{ flex: 1 }}><Bar pct={(c.count / maxCount) * 100} color={i === 0 ? 'var(--gold)' : 'var(--cyan)'} height={4} /></div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', width: 40, textAlign: 'right' }}>{c.count}x</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Users Table */}
              <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--wire)', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5 }}>
                  EN AKTİF KULLANICILAR (Günlük Analize Göre)
                </div>
                <table className="data-table">
                  <thead><tr><th>#</th><th>EMAIL</th><th>PLAN</th><th>GÜNLÜK ANALİZ</th><th>SON ANALİZ</th><th>KAYIT</th></tr></thead>
                  <tbody>
                    {analysisLog.map((u, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setUserDetail(u)}>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 9, color: i < 3 ? 'var(--gold)' : 'var(--t4)', fontWeight: 700 }}>#{i+1}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>{u.email}</td>
                        <td><Badge plan={u.plan} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 16, color: (u.daily_analyses || 0) > 0 ? 'var(--cyan)' : 'var(--t4)' }}>{u.daily_analyses || 0}</span>
                            {(u.daily_analyses || 0) > 5 && <span style={{ fontSize: 9, color: 'var(--gold)' }}>🔥</span>}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{u.last_analysis_date || '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {analysisLog.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11 }}>// Veri yok</div>}
              </div>
            </div>
          )}

          {/* ══ BROADCAST ══ */}
          {tab === 'broadcast' && (
            <div className="fade-up" style={{ maxWidth: 680 }}>
              <div className="sh">İLETİŞİM</div>
              <div className="st">Broadcast</div>

              {/* Segment Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[['TÜMÜ', stats?.totalUsers || users.length, 'var(--cyan)', 'all'], ['FREE', stats?.freeUsers || 0, 'var(--t4)', 'free'], ['PRO', stats?.proUsers || 0, '#60a5fa', 'pro'], ['ELITE', stats?.eliteUsers || 0, 'var(--gold)', 'elite']].map(([l, v, c, t]) => (
                  <div key={l} className="kpi" style={{ cursor: 'pointer', '--kc': broadcastTarget === t ? c : 'transparent' }} onClick={() => setBroadcastTarget(t)}>
                    {broadcastTarget === t && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c, borderRadius: '14px 14px 0 0' }} />}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: broadcastTarget === t ? c : 'var(--t3)', letterSpacing: 2, marginBottom: 6 }}>{l}</div>
                    <div style={{ fontFamily: 'var(--disp)', fontSize: 26, fontWeight: 800, color: broadcastTarget === t ? c : 'var(--t1)' }}>{v}</div>
                    {broadcastTarget === t && <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: c, marginTop: 4 }}>✓ SEÇİLDİ</div>}
                  </div>
                ))}
              </div>

              {/* Templates */}
              <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: 2.5 }}>HAZIR ŞABLONLAR</div>
                  <button className="btn btn-ghost" onClick={() => setBcTemplateOpen(o => !o)} style={{ fontSize: 9 }}>
                    {bcTemplateOpen ? '▲ Gizle' : '▼ Göster'}
                  </button>
                </div>
                {bcTemplateOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {BROADCAST_TEMPLATES.map((tpl, i) => (
                      <button key={i} onClick={() => { setBroadcastText(tpl.text); setBcTemplateOpen(false); toast('Şablon yüklendi'); }}
                        style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--wire)', borderRadius: 8, padding: '10px 14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s', color: 'var(--t1)', fontFamily: 'var(--sans)', fontSize: 12 }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,.3)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--wire)'}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', marginBottom: 4 }}>{tpl.label}</div>
                        <div style={{ color: 'var(--t3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.text}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Compose */}
              <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: 2.5 }}>MESAJ ({broadcastTarget.toUpperCase()} segmenti)</div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: broadcastText.length > 400 ? 'var(--ruby)' : 'var(--t4)' }}>{broadcastText.length}/500</span>
                </div>
                <textarea value={broadcastText} onChange={e => setBroadcastText(e.target.value.slice(0,500))} rows={5}
                  placeholder="Kullanıcılara gönderilecek mesajı yazın..."
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--wire)', borderRadius: 9, color: 'var(--t1)', padding: '11px 14px', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', resize: 'vertical', marginBottom: 14, transition: 'border-color .2s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wire)'} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>
                    Hedef: <span style={{ color: 'var(--cyan)' }}>{broadcastTarget === 'all' ? (stats?.totalUsers || users.length) : broadcastTarget === 'free' ? (stats?.freeUsers||0) : broadcastTarget === 'pro' ? (stats?.proUsers||0) : (stats?.eliteUsers||0)}</span> kullanıcı
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {broadcastText && <button className="btn btn-ghost" onClick={() => setBroadcastText('')} style={{ fontSize: 9 }}>Temizle</button>}
                    <button className="btn btn-cyan" onClick={handleBroadcast} disabled={actionLoading.bc || !broadcastText.trim()} style={{ padding: '10px 24px', fontSize: 11 }}>
                      {actionLoading.bc
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, border: '1.5px solid rgba(0,212,255,.3)', borderTopColor: 'var(--cyan)', borderRadius: '50%', display: 'inline-block', animation: 'spin .5s linear infinite' }} /> GÖNDERİLİYOR...</span>
                        : '⚡ GÖNDER'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TELEGRAM ══ */}
          {tab === 'telegram' && (
            <div className="fade-up" style={{ maxWidth: 640 }}>
              <div className="sh">TELEGRAM YÖNETİMİ</div>
              <div className="st">Telegram</div>

              {/* Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div className="kpi">
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 8 }}>BOT DURUMU</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Pulse color="var(--jade)" />
                    <span style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 800 }}>AKTİF</span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>@DeepTradeScanner</div>
                  <button className="btn btn-jade" onClick={handleTestTelegram} disabled={tgLoading} style={{ marginTop: 12, width: '100%', fontSize: 9 }}>
                    {tgLoading ? '...' : '◈ Bağlantı Test Et'}
                  </button>
                </div>
                <div className="kpi">
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginBottom: 8 }}>KANAL</div>
                  <div style={{ fontFamily: 'var(--disp)', fontSize: 18, fontWeight: 800, marginBottom: 6 }}>@DeepTradeScanner</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>PRO/ELITE satış kanalı</div>
                  <a href={TG_CHANNEL} target="_blank" className="btn btn-tg" style={{ display: 'block', textAlign: 'center', fontSize: 9, padding: '6px 0' }}>✈ Kanala Git →</a>
                </div>
              </div>

              {/* Bildirim açıklaması */}
              <div style={{ background: 'rgba(41,168,235,.06)', border: '1px solid rgba(41,168,235,.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#29A8EB', letterSpacing: 2, marginBottom: 10 }}>OTOMATİK BİLDİRİMLER</div>
                {[
                  ['🆕', 'Yeni Kayıt', 'Her yeni kullanıcı kaydı anında bildirilir'],
                  ['💎', 'Plan Değişikliği', 'PRO/ELITE atama/kaldırma bildirimleri'],
                  ['🚫', 'Ban', 'Kullanıcı ban/unban işlemleri'],
                  ['⚠️', 'Üyelik Expiry', 'Süresi dolan üyelikler otomatik bildirilir'],
                  ['📢', 'Broadcast', 'Toplu mesaj gönderimlerinin logu'],
                ].map(([ic, title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(41,168,235,.08)' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{ic}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manuel mesaj gönder */}
              <div style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: 24 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: 2.5, marginBottom: 10 }}>MANUEL MESAJ GÖNDER</div>
                <textarea value={tgMsg} onChange={e => setTgMsg(e.target.value)} rows={4} placeholder="Telegram kanalına gönderilecek mesaj..."
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--wire)', borderRadius: 9, color: 'var(--t1)', padding: '11px 14px', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', resize: 'vertical', marginBottom: 14, transition: 'border-color .2s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(41,168,235,.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--wire)'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>@DeepTradeScanner kanalına gönderilir</span>
                  <button className="btn btn-tg" onClick={handleSendTG} disabled={tgLoading || !tgMsg.trim()} style={{ padding: '8px 20px', fontSize: 10 }}>
                    {tgLoading ? '...' : '✈ GÖNDER'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ SİSTEM ══ */}
          {tab === 'system' && (
            <div className="fade-up">
              <div className="sh">ALTYAPI</div>
              <div className="st">Sistem Durumu</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
                {[
                  { title: 'ANALİZ MOTORU', items: [['CHARTOS APEX 7.0', 'var(--jade)', 'AKTIF'], ['Deterministik Hesap', 'var(--jade)', 'AÇIK'], ['CoinGecko API', 'var(--jade)', 'BAĞLI'], ['MTF Engine', 'var(--jade)', 'ÇALIŞIYOR']] },
                  { title: 'ALTYAPI', items: [['Vercel Edge', 'var(--jade)', 'ONLINE'], ['Supabase DB', 'var(--jade)', 'BAĞLI'], ['Auth JWT', 'var(--jade)', 'AKTİF'], ['Telegram Bot', 'var(--jade)', 'AKTİF']] },
                  { title: 'GÜVENLİK', items: [['SSL/TLS 256-bit', 'var(--jade)', 'AKTİF'], ['Rate Limiting', 'var(--jade)', 'AÇIK'], ['Site Ban System', 'var(--jade)', 'AKTİF'], ['Oturum Yönetimi', 'var(--jade)', 'GÜVENLİ']] },
                ].map(section => (
                  <div key={section.title} style={{ background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--wire)', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5 }}>{section.title}</div>
                    <div style={{ padding: '4px 18px' }}>
                      {section.items.map(([n, c, s]) => (
                        <div key={n} className="sys-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
                            <span style={{ fontSize: 12 }}>{n}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: c, letterSpacing: 1.5, fontWeight: 700 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Env keys checklist */}
              <div style={{ marginTop: 14, background: 'linear-gradient(160deg,var(--bg1),var(--bg2))', border: '1px solid var(--wire)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: 2.5, marginBottom: 14 }}>GEREKLI ENV KEYS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                    'SUPABASE_SERVICE_KEY', 'ADMIN_EMAIL',
                    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID',
                    'INTERNAL_SECRET', 'NEXTAUTH_URL',
                  ].map(key => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(0,0,0,.3)', borderRadius: 8, border: '1px solid var(--wire)' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--jade)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)' }}>{key}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,166,35,.06)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold)', lineHeight: 1.8 }}>
                  ⚠ TELEGRAM_ADMIN_CHAT_ID: @DeepTradeScanner kanalının chat ID'si (örn: -1001234567890)<br />
                  TELEGRAM_BOT_TOKEN: Bot token (BotFather'dan alınır)
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
