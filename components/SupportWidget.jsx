// components/SupportWidget.jsx
import { useState, useEffect, useRef } from 'react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
  @keyframes sw-popIn{from{opacity:0;transform:scale(.88) translateY(14px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes sw-fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sw-pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes sw-scan{0%{transform:translateX(-100%)}100%{transform:translateX(500%)}}
  @keyframes sw-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  .sw-fab{transition:all .25s cubic-bezier(.34,1.56,.64,1)}
  .sw-fab:hover{transform:scale(1.08) translateY(-2px)!important;box-shadow:0 16px 40px rgba(29,78,216,.65)!important}
  .sw-user{background:#0d1829;border:1px solid #1e293b;border-radius:14px 14px 14px 2px;padding:10px 14px;font-size:13px;line-height:1.5;color:#94a3b8;max-width:82%;word-break:break-word;animation:sw-fadeUp .2s ease;font-family:'Space Grotesk',sans-serif}
  .sw-admin{background:linear-gradient(135deg,#1d4ed8,#6d28d9);border-radius:14px 14px 2px 14px;padding:10px 14px;font-size:13px;line-height:1.5;color:#fff;max-width:82%;word-break:break-word;animation:sw-fadeUp .2s ease;font-family:'Space Grotesk',sans-serif;box-shadow:0 4px 16px rgba(29,78,216,.3)}
  .sw-inp{background:#060d1a;border:1px solid #1e293b;border-radius:10px;color:#e2e8f0;padding:10px 14px;font-size:13px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s}
  .sw-inp:focus{border-color:rgba(59,130,246,.5)}
  .sw-inp::placeholder{color:#1e293b}
  .sw-send{transition:all .15s}
  .sw-send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(29,78,216,.4)}
  .sw-qbtn{background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);border-radius:8px;padding:6px 11px;font-size:11px;color:#60a5fa;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all .15s;text-align:left}
  .sw-qbtn:hover{background:rgba(59,130,246,.14);border-color:rgba(59,130,246,.35)}
`;

export default function SupportWidget({ session }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const [hasNew, setHasNew] = useState(false);
  const [typingDots, setTypingDots] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgTime = useRef(null);

  // Sayfa açılışında kaydedilmiş konuşmayı yükle
  useEffect(() => {
    const stored = localStorage.getItem('dts_conv_id');
    if (stored) {
      setConvId(stored);
      loadMessages(stored);
    }
  }, []);

  // Chat açık olduğunda polling başlat
  useEffect(() => {
    clearInterval(pollRef.current);
    if (open && convId) {
      setHasNew(false);
      loadMessages(convId);
      pollRef.current = setInterval(() => loadMessages(convId), 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [open, convId]);

  // Yeni mesaj geldiğinde scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages(id) {
    if (!id) return;
    try {
      const r = await fetch(`/api/support?action=get&conversation_id=${id}`);
      const d = await r.json();
      if (Array.isArray(d.messages)) {
        const newMsgs = d.messages;
        // Yeni admin mesajı var mı?
        if (newMsgs.length > messages.length) {
          const newest = newMsgs[newMsgs.length - 1];
          if (newest.is_from_admin && !open) setHasNew(true);
        }
        setMessages(newMsgs);
        if (newMsgs.length > 0) {
          lastMsgTime.current = newMsgs[newMsgs.length - 1].created_at;
        }
      }
    } catch {}
  }

  async function sendMessage() {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    setInput('');

    const token = session?.access_token || null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = {
      message: txt,
      conversation_id: convId || undefined,
    };
    if (!token && email) body.email = email;

    try {
      const r = await fetch('/api/support?action=send', {
        method: 'POST', headers, body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        const newId = d.conversation_id || d.id;
        if (!convId) {
          setConvId(newId);
          localStorage.setItem('dts_conv_id', newId);
        }
        // Anlık mesajı göster
        await loadMessages(newId || convId);
      }
    } catch {}
    setSending(false);
  }

  const userMsgs = messages.filter(m => !m.is_from_admin);
  const openCount = userMsgs.length;

  return (
    <>
      <style>{CSS}</style>

      {/* FAB */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999 }}>
        {hasNew && !open && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', animation: 'sw-bounce 1s infinite', zIndex: 1 }}>!</div>
        )}
        <button className="sw-fab" onClick={() => setOpen(o => !o)}
          style={{ width: 56, height: 56, borderRadius: '50%', background: open ? 'linear-gradient(135deg,#1e293b,#0f1923)' : 'linear-gradient(135deg,#1d4ed8,#6d28d9)', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(29,78,216,0.5)', fontSize: open ? 18 : 22 }}>
          {open ? '✕' : '💬'}
        </button>
      </div>

      {/* CHAT PENCERESI */}
      {open && (
        <div style={{ position: 'fixed', bottom: 96, right: 28, zIndex: 9998, width: 340, background: '#06101e', border: '1px solid #0f1923', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,.75), 0 0 0 1px rgba(59,130,246,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'sw-popIn .25s ease', maxHeight: 530, fontFamily: "'Space Grotesk',sans-serif" }}>

          {/* HEADER */}
          <div style={{ background: 'linear-gradient(135deg,#080f20,#0d1935)', padding: '14px 18px', borderBottom: '1px solid #0a1220', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 2, top: 0, background: 'linear-gradient(90deg,#1d4ed8,#6d28d9,#1d4ed8)', backgroundSize: '200%', animation: 'sw-scan 3s linear infinite' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: '0 4px 16px rgba(29,78,216,.4)' }}>🛡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Deep Trade Scan</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'sw-pulse 2s infinite' }} />
                  <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>Destek Ekibi Çevrimiçi</span>
                </div>
              </div>
              <div style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 6, padding: '3px 8px' }}>
                <div style={{ fontSize: 8, color: '#60a5fa', fontWeight: 700, letterSpacing: 1 }}>CANLI</div>
              </div>
            </div>
          </div>

          {/* MESAJLAR */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 220, maxHeight: 320 }}>

            {/* Karşılama */}
            {messages.length === 0 && (
              <div style={{ animation: 'sw-fadeUp .3s ease' }}>
                <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)', borderRadius: '14px 14px 2px 14px', padding: '12px 14px', marginBottom: 12, boxShadow: '0 4px 16px rgba(29,78,216,.25)' }}>
                  <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.6 }}>Merhaba! 👋 Deep Trade Scan destek ekibine hoş geldiniz. Size nasıl yardımcı olabilirim?</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>Şimdi</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'Üyelik planları hakkında bilgi almak istiyorum',
                    'Analiz nasıl çalışıyor?',
                    'Telegram kanalına nasıl katılırım?',
                    'Teknik bir sorun yaşıyorum',
                  ].map((q, i) => (
                    <button key={i} className="sw-qbtn" onClick={() => setInput(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Mesajlar */}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.is_from_admin ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 7 }}>
                {!m.is_from_admin && (
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: '#0d1829', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                    {m.user_email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className={m.is_from_admin ? 'sw-admin' : 'sw-user'}>
                  {m.message}
                  <div style={{ fontSize: 9, opacity: .4, marginTop: 3 }}>
                    {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {m.is_from_admin && (
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🛡</div>
                )}
              </div>
            ))}

            {/* Gönderiliyor */}
            {sending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 7 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: '#0d1829', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>?</div>
                <div style={{ background: '#0d1829', border: '1px solid #1e293b', borderRadius: '14px 14px 14px 2px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#334155', animation: `sw-pulse 1.2s ${i * 0.18}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* EMAIL — anonim ve yeni konuşma */}
          {!session && !convId && (
            <div style={{ padding: '0 14px 8px', flexShrink: 0 }}>
              <input className="sw-inp" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="E-posta (yanıt almak için)" style={{ width: '100%', fontSize: 12 }} />
            </div>
          )}

          {/* INPUT */}
          <div style={{ padding: '10px 14px 14px', borderTop: '1px solid #0a1220', flexShrink: 0, display: 'flex', gap: 8 }}>
            <input className="sw-inp" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !sending) { e.preventDefault(); sendMessage(); } }}
              placeholder="Mesajınızı yazın..."
              style={{ flex: 1 }} />
            <button className="sw-send" onClick={sendMessage} disabled={sending || !input.trim()}
              style={{ background: (!sending && input.trim()) ? 'linear-gradient(135deg,#1d4ed8,#6d28d9)' : '#0d1829', border: 'none', borderRadius: 10, padding: '10px 16px', color: (!sending && input.trim()) ? '#fff' : '#334155', cursor: (!sending && input.trim()) ? 'pointer' : 'not-allowed', fontSize: 16, flexShrink: 0, fontWeight: 700 }}>
              {sending ? '···' : '→'}
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '6px 14px 10px', borderTop: '1px solid #060d18' }}>
            <span style={{ fontSize: 9, color: '#1e293b', letterSpacing: 1 }}>DEEP TRADE SCAN · GÜVENLİ ŞIFRELI BAĞLANTI</span>
          </div>
        </div>
      )}
    </>
  );
}
