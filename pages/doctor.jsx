import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const SPECIALTIES = [
  { id: "general", icon: "\u{1FA7A}", label: "Genel T\u0131p", desc: "Genel sa\u011fl\u0131k sorular\u0131" },
  { id: "cardiology", icon: "\u2764\uFE0F", label: "Kardiyoloji", desc: "Kalp ve damar" },
  { id: "neurology", icon: "\u{1F9E0}", label: "N\u00F6roloji", desc: "Sinir sistemi" },
  { id: "dermatology", icon: "\u{1F52C}", label: "Dermatoloji", desc: "Cilt hastal\u0131klar\u0131" },
  { id: "orthopedics", icon: "\u{1F9B4}", label: "Ortopedi", desc: "Kas-iskelet sistemi" },
  { id: "pediatrics", icon: "\u{1F476}", label: "Pediatri", desc: "\u00C7ocuk sa\u011fl\u0131\u011f\u0131" },
  { id: "psychiatry", icon: "\u{1F4AD}", label: "Psikiyatri", desc: "Ruh sa\u011fl\u0131\u011f\u0131" },
  { id: "nutrition", icon: "\u{1F957}", label: "Beslenme", desc: "Diyet ve beslenme" },
  { id: "emergency", icon: "\u{1F6A8}", label: "Acil T\u0131p", desc: "Acil durumlar" },
  { id: "pharmacy", icon: "\u{1F48A}", label: "Farmakoloji", desc: "\u0130la\u00E7 bilgileri" },
  { id: "gynecology", icon: "\u{1F930}", label: "Kad\u0131n Hastal\u0131klar\u0131", desc: "Jinekoloji ve do\u011fum" },
  { id: "urology", icon: "\u{1FAC0}", label: "\u00DCroloji", desc: "\u00DCriner sistem" },
  { id: "ophthalmology", icon: "\u{1F441}\uFE0F", label: "G\u00F6z Hastal\u0131klar\u0131", desc: "Oftalmoloji" },
  { id: "ent", icon: "\u{1F442}", label: "Kulak Burun Bo\u011faz", desc: "KBB hastal\u0131klar\u0131" },
  { id: "endocrinology", icon: "\u{1F9EC}", label: "Endokrinoloji", desc: "Hormonal hastal\u0131klar" },
  { id: "gastroenterology", icon: "\u{1FAB4}", label: "Gastroenteroloji", desc: "Sindirim sistemi" },
  { id: "pulmonology", icon: "\u{1FAC1}", label: "G\u00F6\u011f\u00FCs Hastal\u0131klar\u0131", desc: "Solunum sistemi" },
  { id: "oncology", icon: "\u{1F397}\uFE0F", label: "Onkoloji", desc: "Kanser hastal\u0131klar\u0131" },
  { id: "rheumatology", icon: "\u{1F91D}", label: "Romatoloji", desc: "Eklem ve ba\u011f doku" },
  { id: "nephrology", icon: "\u{1FAB8}", label: "Nefroloji", desc: "B\u00F6brek hastal\u0131klar\u0131" },
];

const QUICK_PROMPTS = [
  "Ba\u015F a\u011Fr\u0131s\u0131n\u0131n olas\u0131 nedenleri nelerdir?",
  "Kan tahlili sonu\u00E7lar\u0131m\u0131 nas\u0131l yorumlamal\u0131y\u0131m?",
  "Ba\u011F\u0131\u015F\u0131kl\u0131k sistemimi nas\u0131l g\u00FC\u00E7lendirebilirim?",
  "Uyku bozuklu\u011Fu i\u00E7in ne yapmal\u0131y\u0131m?",
];

const GLOBAL_STYLES = `
  @keyframes doctorPulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1.2); }
  }
  @keyframes doctorFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  textarea::placeholder { color: #64748B !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
`;

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#4ECDC4",
            animation: `doctorPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        padding: "0 12px",
        animation: "doctorFadeIn 0.3s ease",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            borderRadius: 10,
            background: "linear-gradient(135deg, #0D9488, #4ECDC4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            marginRight: 8,
            marginTop: 4,
            boxShadow: "0 2px 8px rgba(13,148,136,0.3)",
          }}
        >
          {"\u{1FA7A}"}
        </div>
      )}
      <div
        style={{
          maxWidth: "80%",
          padding: "12px 16px",
          background: isUser
            ? "linear-gradient(135deg, #0D9488, #0F766E)"
            : "rgba(255,255,255,0.06)",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          color: isUser ? "#fff" : "#E2E8F0",
          fontSize: 14,
          lineHeight: 1.7,
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isUser
            ? "0 4px 12px rgba(13,148,136,0.25)"
            : "0 2px 8px rgba(0,0,0,0.15)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function DoctorPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [specialty, setSpecialty] = useState("general");
  const [showSpecialties, setShowSpecialties] = useState(false);
  const [error, setError] = useState(null);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const activeSpec = SPECIALTIES.find((s) => s.id === specialty);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const conversationHistory = [...messages, userMsg]
        .slice(-8)
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));

      const response = await fetch("/api/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialty,
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("API error: " + response.status);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta"
            ) {
              assistantText += event.delta.text;
              const currentText = assistantText;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: currentText,
                };
                return updated;
              });
            }
          } catch {}
        }
      }

      if (!assistantText.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Yan\u0131t al\u0131namad\u0131.",
          };
          return updated;
        });
      }
    } catch (err) {
      setError("Ba\u011Flant\u0131 hatas\u0131. L\u00FCtfen tekrar deneyin.");
      console.error(err);
      setLoading(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <Head>
        <title>AI T\u0131p Dan\u0131\u015Fman\u0131</title>
        <meta
          name="description"
          content="AI destekli t\u0131p dan\u0131\u015Fmanl\u0131\u011F\u0131 - K\u00FCresel t\u0131p kaynaklar\u0131na eri\u015Fim"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      <div
        style={{
          minHeight: "100vh",
          maxHeight: "100vh",
          background: "#0B1120",
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* BG Effects */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -150,
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <header
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(11,17,32,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #0D9488, #4ECDC4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: "0 4px 16px rgba(13,148,136,0.3)",
                }}
              >
                {"\u2695\uFE0F"}
              </div>
              <div style={{ minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#F1F5F9",
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {"AI T\u0131p Dan\u0131\u015Fman\u0131"}
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "#64748B",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#10B981",
                      display: "inline-block",
                      boxShadow: "0 0 8px rgba(16,185,129,0.5)",
                      flexShrink: 0,
                    }}
                  />
                  {"K\u00FCresel T\u0131p Veritaban\u0131 \u2022 Aktif"}
                </p>
              </div>
            </div>

            {/* Specialty Selector */}
            <button
              onClick={() => setShowSpecialties(!showSpecialties)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(13,148,136,0.15)",
                border: "1px solid rgba(13,148,136,0.3)",
                color: "#4ECDC4",
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span>{activeSpec?.icon}</span>
              <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeSpec?.label}
              </span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>{"\u25BC"}</span>
            </button>
          </div>

          {/* Specialty Dropdown */}
          {showSpecialties && (
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 6,
                animation: "doctorFadeIn 0.2s ease",
              }}
            >
              {SPECIALTIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSpecialty(s.id);
                    setShowSpecialties(false);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background:
                      specialty === s.id
                        ? "linear-gradient(135deg, rgba(13,148,136,0.3), rgba(78,205,196,0.15))"
                        : "rgba(255,255,255,0.03)",
                    border:
                      specialty === s.id
                        ? "1px solid rgba(13,148,136,0.5)"
                        : "1px solid rgba(255,255,255,0.06)",
                    color: specialty === s.id ? "#4ECDC4" : "#94A3B8",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Disclaimer */}
        <div
          style={{
            margin: "8px 12px 0",
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.2)",
            fontSize: 10,
            color: "#EAB308",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>{"\u26A0\uFE0F"}</span>
          <span>
            {"Bu uygulama yaln\u0131zca bilgilendirme ama\u00E7l\u0131d\u0131r. T\u0131bbi tan\u0131/tedavi yerine ge\u00E7mez. Acil durumda 112\u2019yi aray\u0131n."}
          </span>
        </div>

        {/* Chat Area */}
        <div
          ref={chatRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 4px",
            scrollBehavior: "smooth",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "30px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 20,
                  background:
                    "linear-gradient(135deg, rgba(13,148,136,0.15), rgba(78,205,196,0.08))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  marginBottom: 16,
                  border: "1px solid rgba(13,148,136,0.2)",
                }}
              >
                {"\u{1F3E5}"}
              </div>
              <h2
                style={{
                  color: "#E2E8F0",
                  fontSize: 20,
                  fontWeight: 600,
                  marginBottom: 6,
                  marginTop: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {"K\u00FCresel T\u0131p Bilgi Sistemi"}
              </h2>
              <p
                style={{
                  color: "#64748B",
                  fontSize: 12,
                  maxWidth: 360,
                  lineHeight: 1.6,
                  marginBottom: 24,
                  marginTop: 0,
                  padding: "0 8px",
                }}
              >
                {"D\u00FCnya \u00E7ap\u0131ndaki t\u0131p kaynaklar\u0131na (PubMed, WHO, Mayo Clinic, NHS, Harrison's, Merck Manual ve daha fazlas\u0131) eri\u015Ferek sorular\u0131n\u0131z\u0131 yan\u0131tl\u0131yorum."}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  width: "100%",
                  maxWidth: 420,
                  padding: "0 8px",
                }}
              >
                {QUICK_PROMPTS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#94A3B8",
                      fontSize: 11,
                      cursor: "pointer",
                      textAlign: "left",
                      lineHeight: 1.4,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(13,148,136,0.1)";
                      e.currentTarget.style.borderColor = "rgba(13,148,136,0.3)";
                      e.currentTarget.style.color = "#4ECDC4";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "#94A3B8";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Source Badges */}
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 5,
                  justifyContent: "center",
                  padding: "0 8px",
                }}
              >
                {[
                  "PubMed",
                  "WHO",
                  "Mayo Clinic",
                  "NHS",
                  "UpToDate",
                  "Harrison's",
                  "Merck Manual",
                  "Cochrane",
                ].map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#475569",
                      fontSize: 9,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #0D9488, #4ECDC4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                {"\u{1FA7A}"}
              </div>
              <div>
                <div
                  style={{ color: "#64748B", fontSize: 10, marginBottom: 2 }}
                >
                  {"T\u0131bbi kaynaklar taran\u0131yor..."}
                </div>
                <TypingDots />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                margin: "8px 12px",
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#EF4444",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div
          style={{
            padding: "10px 12px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(11,17,32,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                flex: 1,
                position: "relative",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={"Sorunuzu yaz\u0131n..."}
                rows={1}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "transparent",
                  border: "none",
                  color: "#E2E8F0",
                  fontSize: 14,
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  maxHeight: 100,
                  boxSizing: "border-box",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 100) + "px";
                }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: 12,
                background:
                  input.trim() && !loading
                    ? "linear-gradient(135deg, #0D9488, #4ECDC4)"
                    : "rgba(255,255,255,0.05)",
                border: "none",
                cursor:
                  input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "#fff",
                flexShrink: 0,
                transition: "all 0.2s",
                boxShadow:
                  input.trim() && !loading
                    ? "0 4px 12px rgba(13,148,136,0.3)"
                    : "none",
              }}
            >
              {"\u2191"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
