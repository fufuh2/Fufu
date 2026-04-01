import { NextResponse } from "next/server";

export const runtime = "edge";

const SPECIALTIES = {
  general: { label: "Genel Tıp", desc: "Genel sağlık soruları" },
  cardiology: { label: "Kardiyoloji", desc: "Kalp ve damar hastalıkları" },
  neurology: { label: "Nöroloji", desc: "Sinir sistemi hastalıkları" },
  dermatology: { label: "Dermatoloji", desc: "Cilt hastalıkları" },
  orthopedics: { label: "Ortopedi", desc: "Kas-iskelet sistemi" },
  pediatrics: { label: "Pediatri", desc: "Çocuk sağlığı" },
  psychiatry: { label: "Psikiyatri", desc: "Ruh sağlığı" },
  nutrition: { label: "Beslenme", desc: "Diyet ve beslenme" },
  emergency: { label: "Acil Tıp", desc: "Acil durumlar" },
  pharmacy: { label: "Farmakoloji", desc: "İlaç bilgileri" },
};

function buildSystemPrompt(specialty) {
  const spec = SPECIALTIES[specialty] || SPECIALTIES.general;
  return `Sen dünya çapında tıp bilgisine erişen bir AI Tıp Danışmanısın. Uzmanlık alanın: ${spec.label} (${spec.desc}). Türkçe yanıt ver. Tanı koyma. Web araması yap. Sonunda "Bu bilgiler eğitim amaçlıdır, kesin tanı ve tedavi için sağlık profesyoneline başvurunuz" yaz. Acil durumda 112 yönlendir.`;
}

export async function POST(req) {
  try {
    const { messages, specialty = "general" } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key eksik" }, { status: 500 });
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: buildSystemPrompt(specialty),
        messages: messages.slice(-10),
      }),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "AI servisi kullanılamıyor" }, { status: 502 });
    }
    const data = await response.json();
    const textContent = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "";
    return NextResponse.json({ content: textContent });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
