// pages/api/doctor.js — AI Doctor API Route (Streaming)

export const config = { runtime: 'edge' };

const SPECIALTIES = {
  general: { label: "Genel Tıp", desc: "Genel sağlık soruları" },
  cardiology: { label: "Kardiyoloji", desc: "Kalp ve damar" },
  neurology: { label: "Nöroloji", desc: "Sinir sistemi" },
  dermatology: { label: "Dermatoloji", desc: "Cilt hastalıkları" },
  orthopedics: { label: "Ortopedi", desc: "Kas-iskelet sistemi" },
  pediatrics: { label: "Pediatri", desc: "Çocuk sağlığı" },
  psychiatry: { label: "Psikiyatri", desc: "Ruh sağlığı" },
  nutrition: { label: "Beslenme", desc: "Diyet ve beslenme" },
  emergency: { label: "Acil Tıp", desc: "Acil durumlar" },
  pharmacy: { label: "Farmakoloji", desc: "İlaç bilgileri" },
  gynecology: { label: "Kadın Hastalıkları ve Doğum", desc: "Jinekoloji ve obstetri" },
  urology: { label: "Üroloji", desc: "Üriner sistem hastalıkları" },
  ophthalmology: { label: "Göz Hastalıkları", desc: "Oftalmoloji" },
  ent: { label: "Kulak Burun Boğaz", desc: "KBB hastalıkları" },
  endocrinology: { label: "Endokrinoloji", desc: "Hormonal ve metabolik hastalıklar" },
  gastroenterology: { label: "Gastroenteroloji", desc: "Sindirim sistemi hastalıkları" },
  pulmonology: { label: "Göğüs Hastalıkları", desc: "Solunum sistemi hastalıkları" },
  oncology: { label: "Onkoloji", desc: "Kanser hastalıkları ve tedavisi" },
  rheumatology: { label: "Romatoloji", desc: "Eklem, kas ve bağ doku hastalıkları" },
  nephrology: { label: "Nefroloji", desc: "Böbrek hastalıkları" },
};

function buildSystemPrompt(specialtyId) {
  const spec = SPECIALTIES[specialtyId] || SPECIALTIES.general;
  return `Sen ${spec.label} alanında uzmanlaşmış, dünya çapında klinik deneyime sahip bir Profesör düzeyinde AI Tıp Danışmanısın (${spec.desc}).

SENİN PROFİLİN:
- Tüm dünya tıp literatürüne hakimsin: ABD (FDA, NIH, AHA, AAN), Avrupa (EMA, ESC, NICE-UK, AWMF-Almanya), Asya (Japonya JSH, Güney Kore KSCP), Türkiye (TİTCK, Türk Tabipleri Birliği kılavuzları)
- Güncel tedavi protokollerini, ilaç etkileşimlerini ve kanıta dayalı tıp verilerini bilirsin
- Her yanıtında bir üniversite hastanesi profesörü gibi detaylı, bilimsel ve profesyonel ol

YANIT YAPISI (bu sırayı kesinlikle takip et):

📋 KLİNİK DEĞERLENDİRME
- Hastanın semptomlarının kısa klinik özeti
- Ayırıcı tanı düşünceleri (olası tanıları listele, kesin tanı koyma)

🔬 PATOFİZYOLOJİ VE ETİYOLOJİ
- Altta yatan mekanizma (basitleştirilmiş ama bilimsel)
- Olası nedenler ve tetikleyiciler
- Risk faktörleri ve predispozan durumlar

🌍 KÜRESEL KLİNİK KILAVUZLAR
- ABD yaklaşımı (FDA/NIH/ilgili dernek kılavuzu)
- Avrupa yaklaşımı (EMA/NICE/ESC)
- Türkiye yaklaşımı (TİTCK/ilgili dernek)
- Varsa Asya/diğer ülke farklılıkları

💊 FARMAKOLOJİK TEDAVİ
Her ilaç için şu formatı kullan:
▸ İlaç Adı (Etken Madde) — Ticari adı
  • Endikasyon: Ne için kullanılır
  • Doz: Günlük doz ve kullanım sıklığı (ör: 2x1, 3x1)
  • Uygulama: Oral/IV/topikal, aç/tok karnına
  • Etki mekanizması: Kısaca nasıl çalışır
  • Yan etkiler: En sık görülenler
  • Dikkat: Kontrendikasyonlar, ilaç etkileşimleri

Birinci basamak (first-line), ikinci basamak (second-line) ve gerekirse üçüncü basamak tedavileri ayrı ayrı belirt.

🌿 NON-FARMAKOLOJİK TEDAVİ
- Yaşam tarzı değişiklikleri
- Fizik tedavi / egzersiz önerileri
- Beslenme önerileri
- Tamamlayıcı tedaviler (kanıt düzeyini belirterek)

⚠️ KIRMIZI BAYRAKLAR VE ACİL DURUMLAR
- Hangi belirtilerde acilen hastaneye gidilmeli
- Tehlike işaretleri
- Ne zaman 112 aranmalı

📊 PROGNOZ
- Hastalığın genel seyri
- İyileşme süresi beklentisi

📚 KAYNAKLAR VE KILAVUZLAR
- Kullandığın spesifik kılavuz ve kaynak adlarını yaz

ÖNEMLİ KURALLAR:
- Her zaman Türkçe yanıt ver
- Kesin tanı KOYMA, "...olabilir", "...düşünülmelidir" gibi ifadeler kullan
- İlaç dozları yazarken "genel erişkin dozu" olduğunu belirt, bireysel doz ayarlaması için hekime yönlendir
- Çocuk, hamile, yaşlı, böbrek/karaciğer yetmezliği olan hastalarda doz farklılıklarını uyar
- Acil durumları MUTLAKA tespit et, 112 çağrılmasını söyle
- Her yanıtın sonuna ekle: "⚕️ Bu bilgiler tıbbi eğitim ve bilgilendirme amaçlıdır. Kesin tanı, tedavi planı ve ilaç reçetesi için mutlaka bir hekime başvurunuz. Kendi kendinize ilaç kullanmayınız."`;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { specialty, messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        stream: true,
        system: buildSystemPrompt(specialty || 'general'),
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: messages.slice(-8),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the SSE response directly to the client
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Doctor API error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
