// pages/api/bist-prices.js
// DeepTradeScan — BIST Canlı Fiyat Motoru v1.0
// Kaynak: Yahoo Finance public API (ücretsiz, auth gerektirmez)
// 35+ BIST hissesi: fiyat (TL), % değişim, hacim, 52h high/low

export const BIST_META = {
  // ── Bankacılık ───────────────────────────────────────────────
  GARAN: { name:'Garanti BBVA',          sector:'BANKA',           emoji:'🏦' },
  AKBNK: { name:'Akbank',               sector:'BANKA',           emoji:'🏦' },
  ISCTR: { name:'İş Bankası C',         sector:'BANKA',           emoji:'🏦' },
  HALKB: { name:'Halkbank',             sector:'BANKA',           emoji:'🏦' },
  VAKBN: { name:'Vakıfbank',            sector:'BANKA',           emoji:'🏦' },
  YKBNK: { name:'Yapı Kredi',           sector:'BANKA',           emoji:'🏦' },
  QNBFB: { name:'QNB Finansbank',       sector:'BANKA',           emoji:'🏦' },
  TSKB:  { name:'TSKB',                 sector:'BANKA',           emoji:'🏦' },
  ALBRK: { name:'Albaraka Türk',        sector:'BANKA',           emoji:'🏦' },
  KLNMA: { name:'Türkiye Kalkınma',     sector:'BANKA',           emoji:'🏦' },
  SKBNK: { name:'Şekerbank',            sector:'BANKA',           emoji:'🏦' },
  // ── Holding ─────────────────────────────────────────────────
  KCHOL: { name:'Koç Holding',          sector:'HOLDİNG',         emoji:'🏢' },
  SAHOL: { name:'Sabancı Holding',      sector:'HOLDİNG',         emoji:'🏢' },
  DOHOL: { name:'Doğan Holding',        sector:'HOLDİNG',         emoji:'🏢' },
  EKGYO: { name:'Emlak Konut GYO',      sector:'HOLDİNG',         emoji:'🏢' },
  ENKAI: { name:'Enka İnşaat',          sector:'HOLDİNG',         emoji:'🏢' },
  BERA:  { name:'Bera Holding',         sector:'HOLDİNG',         emoji:'🏢' },
  GLYHO: { name:'Global Yatırım Holding',sector:'HOLDİNG',        emoji:'🏢' },
  // ── Enerji & Ham Madde ───────────────────────────────────────
  TUPRS: { name:'Tüpraş',               sector:'ENERJİ',          emoji:'⚡' },
  PETKM: { name:'Petkim',               sector:'ENERJİ',          emoji:'⚡' },
  AKENR: { name:'Akenerji',             sector:'ENERJİ',          emoji:'⚡' },
  AKSEN: { name:'Aksa Enerji',          sector:'ENERJİ',          emoji:'⚡' },
  ZOREN: { name:'Zorlu Enerji',         sector:'ENERJİ',          emoji:'⚡' },
  ODAS:  { name:'Odaş Elektrik',        sector:'ENERJİ',          emoji:'⚡' },
  MPARK: { name:'Mega Polaris',         sector:'ENERJİ',          emoji:'⚡' },
  // ── Sanayi & Çelik ───────────────────────────────────────────
  EREGL: { name:'Ereğli Demir Çelik',   sector:'SANAYİ',          emoji:'🏭' },
  KRDMD: { name:'Kardemir',             sector:'SANAYİ',          emoji:'🏭' },
  SASA:  { name:'Sasa Polyester',       sector:'SANAYİ',          emoji:'🏭' },
  SISE:  { name:'Şişe Cam',             sector:'SANAYİ',          emoji:'🏭' },
  GUBRF: { name:'Gübre Fabrikaları',    sector:'SANAYİ',          emoji:'🏭' },
  TRKCM: { name:'Trakya Cam',           sector:'SANAYİ',          emoji:'🏭' },
  ALKIM: { name:'Alkim Kimya',          sector:'SANAYİ',          emoji:'🏭' },
  PRKME: { name:'Park Elektrik',        sector:'SANAYİ',          emoji:'🏭' },
  ITTFK: { name:'İttifak Holding',      sector:'SANAYİ',          emoji:'🏭' },
  // ── Otomotiv & Makine ────────────────────────────────────────
  FROTO: { name:'Ford Otosan',          sector:'OTOMOTİV',        emoji:'🚗' },
  TOASO: { name:'Tofaş',                sector:'OTOMOTİV',        emoji:'🚗' },
  ARCLK: { name:'Arçelik',              sector:'OTOMOTİV',        emoji:'🚗' },
  DOAS:  { name:'Doğuş Otomotiv',       sector:'OTOMOTİV',        emoji:'🚗' },
  BRISA: { name:'Brisa',                sector:'OTOMOTİV',        emoji:'🚗' },
  TTRAK: { name:'Türk Traktör',         sector:'OTOMOTİV',        emoji:'🚗' },
  OTKAR: { name:'Otokar',               sector:'OTOMOTİV',        emoji:'🚗' },
  // ── Teknoloji & Savunma ──────────────────────────────────────
  ASELS: { name:'Aselsan',              sector:'TEKNOLOJİ',       emoji:'🛡️' },
  LOGO:  { name:'Logo Yazılım',         sector:'TEKNOLOJİ',       emoji:'💻' },
  VESTL: { name:'Vestel',               sector:'TEKNOLOJİ',       emoji:'📺' },
  KAREL: { name:'Karel Elektronik',     sector:'TEKNOLOJİ',       emoji:'💻' },
  NETAS: { name:'Netaş Telekomünikasyon',sector:'TEKNOLOJİ',      emoji:'💻' },
  RODRG: { name:'Roketsan',             sector:'TEKNOLOJİ',       emoji:'🛡️' },
  INDES: { name:'İndeks Bilgisayar',    sector:'TEKNOLOJİ',       emoji:'💻' },
  DGATE: { name:'Datagate',             sector:'TEKNOLOJİ',       emoji:'💻' },
  // ── Perakende & Gıda ────────────────────────────────────────
  BIMAS: { name:'BİM Mağazalar',        sector:'PERAKENDECİLİK',  emoji:'🛒' },
  MGROS: { name:'Migros',               sector:'PERAKENDECİLİK',  emoji:'🛒' },
  SOKM:  { name:'Şok Market',           sector:'PERAKENDECİLİK',  emoji:'🛒' },
  ULKER: { name:'Ülker Bisküvi',        sector:'PERAKENDECİLİK',  emoji:'🍪' },
  MAVI:  { name:'Mavi Giyim',           sector:'PERAKENDECİLİK',  emoji:'👕' },
  TATGD: { name:'Tat Gıda',             sector:'PERAKENDECİLİK',  emoji:'🍪' },
  BANVT: { name:'Banvit',               sector:'PERAKENDECİLİK',  emoji:'🍖' },
  PNSUT: { name:'Pınar Süt',            sector:'PERAKENDECİLİK',  emoji:'🥛' },
  CCOLA: { name:'Coca-Cola İçecek',     sector:'PERAKENDECİLİK',  emoji:'🥤' },
  AEFES: { name:'Anadolu Efes',         sector:'PERAKENDECİLİK',  emoji:'🍺' },
  CRFSA: { name:'CarrefourSA',          sector:'PERAKENDECİLİK',  emoji:'🛒' },
  BIZIM: { name:'Bizim Toptan',         sector:'PERAKENDECİLİK',  emoji:'🛒' },
  // ── Havacılık & Ulaşım ──────────────────────────────────────
  THYAO: { name:'Türk Hava Yolları',    sector:'HAVAYOLU',        emoji:'✈️' },
  PGSUS: { name:'Pegasus',              sector:'HAVAYOLU',        emoji:'✈️' },
  TAVHL: { name:'TAV Havalimanları',    sector:'HAVAYOLU',        emoji:'🛫' },
  CLEBI: { name:'Çelebi Havacılık',     sector:'HAVAYOLU',        emoji:'🛫' },
  // ── İletişim ────────────────────────────────────────────────
  TCELL: { name:'Turkcell',             sector:'İLETİŞİM',        emoji:'📡' },
  TTKOM: { name:'Türk Telekom',         sector:'İLETİŞİM',        emoji:'📡' },
  // ── Altın & Madencilik ───────────────────────────────────────
  KOZAL: { name:'Koza Altın',           sector:'ALTIN',           emoji:'🥇' },
  KOZAA: { name:'Koza Anadolu Metal',   sector:'ALTIN',           emoji:'🥇' },
  IPEKE: { name:'İpek Doğal Enerji',    sector:'ALTIN',           emoji:'🥇' },
  // ── Gayrimenkul (GYO) ────────────────────────────────────────
  ISGYO: { name:'İş GYO',               sector:'GYO',             emoji:'🏗️' },
  SNGYO: { name:'Sinpaş GYO',           sector:'GYO',             emoji:'🏗️' },
  TRGYO: { name:'Torunlar GYO',         sector:'GYO',             emoji:'🏗️' },
  DGGYO: { name:'Doğuş GYO',            sector:'GYO',             emoji:'🏗️' },
  MRGYO: { name:'Martı GYO',            sector:'GYO',             emoji:'🏗️' },
  // ── Çimento & İnşaat ─────────────────────────────────────────
  CIMSA: { name:'Çimsa Çimento',        sector:'ÇİMENTO',         emoji:'🧱' },
  AKCNS: { name:'Akçansa',              sector:'ÇİMENTO',         emoji:'🧱' },
  ADANA: { name:'Adana Çimento',        sector:'ÇİMENTO',         emoji:'🧱' },
  BOLUC: { name:'Bolu Çimento',         sector:'ÇİMENTO',         emoji:'🧱' },
  MRDIN: { name:'Mardin Çimento',       sector:'ÇİMENTO',         emoji:'🧱' },
  // ── Sigorta & Finans ─────────────────────────────────────────
  ANHYT: { name:'Anadolu Hayat Emeklilik',sector:'SİGORTA',       emoji:'🛡️' },
  RAYSG: { name:'Ray Sigorta',          sector:'SİGORTA',         emoji:'🛡️' },
  AKGRT: { name:'Aksigorta',            sector:'SİGORTA',         emoji:'🛡️' },
};

// Tüm hisse kodları
const ALL_TICKERS = Object.keys(BIST_META);

// YF sembolü: Hisse.IS
const toYF = (t) => `${t}.IS`;

// Sunucu tarafı cache (60 saniye)
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000;

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    return res.status(200).json(_cache);
  }

  try {
    // Yahoo Finance quote API: tüm hisseler + XU100 + USDTRY tek istekte
    const yfSymbols = [
      ...ALL_TICKERS.map(toYF),
      'XU100.IS',   // BIST100 endeksi
      'USDTRY=X',   // Dolar/TL kuru
    ].join(',');

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yfSymbols)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketDayHigh,regularMarketDayLow,marketCap`;

    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) throw new Error(`Yahoo Finance HTTP ${r.status}`);

    const data = await r.json();
    const quotes = data?.quoteResponse?.result || [];

    if (!quotes.length) throw new Error('Yahoo Finance boş yanıt döndürdü');

    // BIST100 ve USD/TRY'yi ayır
    const xu100Quote = quotes.find(q => q.symbol === 'XU100.IS');
    const usdtryQuote = quotes.find(q => q.symbol === 'USDTRY=X');

    const xu100 = {
      price:     xu100Quote?.regularMarketPrice ?? null,
      change:    xu100Quote?.regularMarketChangePercent ?? null,
    };
    const usdtry = usdtryQuote?.regularMarketPrice ?? null;

    // BIST hisseleri
    const stocks = quotes
      .filter(q => q.symbol !== 'XU100.IS' && q.symbol !== 'USDTRY=X')
      .map(q => {
        const ticker = q.symbol.replace('.IS', '');
        const meta   = BIST_META[ticker] || { name: ticker, sector: 'DİĞER', emoji: '📈' };
        return {
          ticker,
          name:         meta.name,
          sector:       meta.sector,
          emoji:        meta.emoji,
          price:        q.regularMarketPrice         ?? null,
          change24h:    q.regularMarketChangePercent ?? null,
          volume:       q.regularMarketVolume        ?? null,
          high52w:      q.fiftyTwoWeekHigh           ?? null,
          low52w:       q.fiftyTwoWeekLow            ?? null,
          dayHigh:      q.regularMarketDayHigh       ?? null,
          dayLow:       q.regularMarketDayLow        ?? null,
          marketCap:    q.marketCap                  ?? null,
        };
      })
      // Sadece desteklenen hisseleri tut, hacme göre sırala
      .filter(s => BIST_META[s.ticker])
      .sort((a, b) => (b.volume || 0) - (a.volume || 0));

    const result = { ok: true, ts: now, xu100, usdtry, count: stocks.length, stocks };
    _cache = result;
    _cacheTs = now;
    return res.status(200).json(result);

  } catch (e) {
    console.error('[bist-prices]', e.message);
    return res.status(200).json({ ok: false, ts: Date.now(), error: e.message, stocks: [] });
  }
}
