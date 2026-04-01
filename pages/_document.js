import { Html, Head, Main, NextScript } from 'next/document';

const SITE_URL  = 'https://deeptradescan.com';
const SITE_NAME = 'DeepTradeScan';
const SITE_TITLE = 'DeepTradeScan — Kripto & BIST Borsa Kurumsal Analiz Motoru | SMC ICT Wyckoff';
const SITE_DESC  = 'Kripto ve BIST borsa için kurumsal analiz platformu. 9 katmanlı SMC, ICT, Wyckoff motoru ile 50+ coin ve BIST hisseleri için giriş bölgesi, ATR stop-loss ve %82-91 win rate sinyali. Binance/OKX canlı veri. Ücretsiz başla.';
const OG_IMAGE   = `${SITE_URL}/og-image.svg`;

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'DeepTradeScan',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: SITE_DESC,
  offers: [
    { '@type': 'Offer', price: '0',   priceCurrency: 'USD', name: 'Starter — Ücretsiz' },
    { '@type': 'Offer', price: '99',  priceCurrency: 'USD', name: 'Pro — Aylık' },
    { '@type': 'Offer', price: '299', priceCurrency: 'USD', name: 'Elite — Aylık' },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8', reviewCount: '312', bestRating: '5', worstRating: '1',
  },
  featureList: [
    'SMC Smart Money Concepts Kripto Analizi',
    'ICT Inner Circle Trader Metodolojisi',
    'Wyckoff Faz Analizi',
    'Multi-Timeframe Confluence',
    'ATR Stop-Loss Hesabı',
    'RSI Divergans Tespiti',
    'Fibonacci & Pivot Seviyeleri',
    'Binance / OKX Canlı Veri',
    'BIST Hisse Analizi',
    'BIST100 Order Block Tespiti',
    'BIST Quantum Borsa Engine',
    'Türev Piyasa Sinyalleri',
    'Futures Funding Rate Analizi',
    'CoinGlass Açık Pozisyon Verisi',
    '50+ Kripto Coin Desteği',
    'BIST Tüm Hisseler',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESC,
  inLanguage: 'tr-TR',
  potentialAction: [
    {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/app?coin={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
    {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/borsa?hisse={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  ],
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description: 'Kripto ve BIST borsa için kurumsal analiz platformu. ICT, SMC, Wyckoff metodolojisi ile hem kripto hem hisse analizi.',
  sameAs: ['https://t.me/deeptradescan'],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Kripto teknik analiz nedir?',
      acceptedAnswer: { '@type': 'Answer', text: 'Kripto teknik analiz, geçmiş fiyat ve hacim verilerini kullanarak gelecekteki fiyat hareketlerini tahmin etme yöntemidir. SMC (Smart Money Concepts), ICT ve Wyckoff gibi kurumsal metodolojiler büyük oyuncuların izini sürerek yüksek kaliteli giriş bölgeleri tespit eder.' },
    },
    {
      '@type': 'Question',
      name: 'BIST borsa analizi nasıl yapılır?',
      acceptedAnswer: { '@type': 'Answer', text: 'BIST hisse analizi için DeepTradeScan\'in Quantum Borsa Engine\'i ICT Order Block, destek-direnç seviyeleri, EMA trendleri ve ATR tabanlı stop-loss hesaplar. Güncel BIST verilerini çekerek AL/SAT yönü, giriş bölgesi ve hedef fiyat üretir. BIST100 ve tüm hisse senetlerini kapsar.' },
    },
    {
      '@type': 'Question',
      name: 'DeepTradeScan nasıl çalışır?',
      acceptedAnswer: { '@type': 'Answer', text: 'Binance ve OKX API\'sinden anlık kline verisi çekerek 9 analitik katmanda 30+ faktörü paralel hesaplar. 4 zaman diliminde (4H, 1D, 1W, 1M) SMC, ICT, Wyckoff, RSI, MACD, Fibonacci ve türev piyasa verilerini birleştirerek giriş bölgesi, ATR tabanlı stop-loss ve hedef fiyatlar üretir. BIST hisseleri için de aynı kurumsal motor çalışır.' },
    },
    {
      '@type': 'Question',
      name: 'SMC ve ICT analizi ne işe yarar?',
      acceptedAnswer: { '@type': 'Answer', text: 'SMC (Smart Money Concepts) ve ICT (Inner Circle Trader) metodolojisi kurumsal yatırımcıların fiyatı nasıl yönlendirdiğini analiz eder. Order Block, Fair Value Gap, BOS, CHoCH gibi yapılar tespit edilerek kurumsal giriş ve çıkış bölgeleri belirlenir. Hem kripto hem de BIST hisselerinde geçerlidir.' },
    },
    {
      '@type': 'Question',
      name: 'Bitcoin teknik analizi ücretsiz mi yapılabilir?',
      acceptedAnswer: { '@type': 'Answer', text: 'DeepTradeScan\'de günde 5 analiz tamamen ücretsizdir. Kredi kartı gerekmez. Ücretsiz planda SMC sinyalleri, ICT analizi, ATR tabanlı stop-loss ve portfolio takibi kullanılabilir. BIST borsa analizi de ücretsiz planda mevcuttur.' },
    },
    {
      '@type': 'Question',
      name: 'Kripto analizde win rate ne anlama gelir?',
      acceptedAnswer: { '@type': 'Answer', text: '4 zaman dilimi uyumu, zone kalitesi, momentum ve kurumsal akış verilerinin ağırlıklı ortalamasından üretilen istatistiksel tahmindir. 4/4 TF uyumu ve 85+ confluence skoru %82-91 tarihsel sinyal kalitesine karşılık gelir.' },
    },
    {
      '@type': 'Question',
      name: 'BIST hisseleri için hangi teknik analiz araçları kullanılıyor?',
      acceptedAnswer: { '@type': 'Answer', text: 'BIST hisseleri için DeepTradeScan ICT Order Block, EMA 20/50/200 trend analizi, destek-direnç seviyeleri, ATR tabanlı stop-loss, RSI momentum ve hacim profili analizlerini birleştirir. BIST100, BIST30 ve tüm hisse senetleri desteklenir.' },
    },
    {
      '@type': 'Question',
      name: 'Kripto ve borsa analizini aynı platformda yapabilir miyim?',
      acceptedAnswer: { '@type': 'Answer', text: 'Evet. DeepTradeScan iki ayrı motor sunar: Kripto için 9 katmanlı SMC/ICT/Wyckoff motoru, BIST için Quantum Borsa Engine. Her iki motor da aynı platformda tek hesapla kullanılabilir.' },
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Ana Sayfa',    item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Kripto Analiz', item: `${SITE_URL}/app` },
    { '@type': 'ListItem', position: 3, name: 'Borsa Analiz', item: `${SITE_URL}/borsa` },
  ],
};

/* ─── Product Schema — Kripto ─────────────────────────────────────────── */
const productKriptoSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'DeepTradeScan Kripto Analiz Motoru',
  description: '9 katmanlı SMC, ICT, Wyckoff kripto teknik analiz motoru. 50+ coin için giriş bölgesi, ATR stop-loss, %82-91 win rate sinyali.',
  url: `${SITE_URL}/app`,
  brand: { '@type': 'Brand', name: 'DeepTradeScan' },
  category: 'Kripto Teknik Analiz Yazılımı',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '299',
    priceCurrency: 'USD',
    offerCount: '3',
  },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '312', bestRating: '5' },
};

/* ─── Product Schema — Borsa ──────────────────────────────────────────── */
const productBorsaSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'DeepTradeScan BIST Borsa Analiz Motoru',
  description: 'BIST hisseleri için Quantum Borsa Engine. ICT Order Block, EMA trend, ATR stop-loss ile kurumsal seviye BIST analizi.',
  url: `${SITE_URL}/borsa`,
  brand: { '@type': 'Brand', name: 'DeepTradeScan' },
  category: 'Borsa Teknik Analiz Yazılımı',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '299',
    priceCurrency: 'USD',
    offerCount: '3',
  },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.7', reviewCount: '198', bestRating: '5' },
};

export default function Document() {
  return (
    <Html lang="tr" prefix="og: https://ogp.me/ns#">
      <Head>
        <meta charSet="UTF-8" />

        {/* ── FAVICON ── */}
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <link rel="shortcut icon" href="/logo.svg" />
        <meta name="msapplication-TileImage" content="/logo.svg" />
        <meta name="msapplication-TileColor" content="#05080f" />

        {/* ── FONTS ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

        {/* ── CORE SEO ── */}
        <meta name="description" content={SITE_DESC} />
        <meta name="keywords" content="kripto analiz, kripto teknik analiz, bitcoin teknik analiz, ethereum analiz, kripto trading, SMC analiz, ICT analiz, Smart Money Concepts, Inner Circle Trader, Wyckoff analiz, kripto sinyal, bitcoin sinyal, BTC analiz, ETH analiz, SOL analiz, altcoin analiz, order block, fair value gap, multi timeframe analiz, Binance analiz, OKX analiz, kripto stop loss, fibonacci kripto, borsa analiz, BIST analiz, BIST hisse analizi, BIST100 analiz, BIST teknik analiz, hisse senedi analizi, borsa teknik analiz, Türk borsa analiz, BIST sinyal, Garanti analiz, THYAO analiz, ASELS analiz, hisse stop loss, borsa ICT analiz, borsa order block, BIST100 sinyal, Türkiye borsa, kripto portfolio takibi, teknik analiz platformu, futures analiz" />
        <meta name="author" content="DeepTradeScan" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="theme-color" content="#05080f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DeepTradeScan" />
        <meta name="application-name" content="DeepTradeScan" />
        <meta name="rating" content="general" />
        <meta name="revisit-after" content="3 days" />
        <meta name="language" content="Turkish" />
        <meta name="geo.region" content="TR" />
        <meta name="geo.placename" content="Turkey" />

        {/* ── CANONICAL & HREFLANG ── */}
        <link rel="canonical" href={SITE_URL} />
        <link rel="alternate" hrefLang="tr" href={SITE_URL} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

        {/* ── OPEN GRAPH ── */}
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content={SITE_NAME} />
        <meta property="og:url"         content={SITE_URL} />
        <meta property="og:title"       content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESC} />
        <meta property="og:image"       content={OG_IMAGE} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"   content="DeepTradeScan — Kripto & BIST Borsa Kurumsal Analiz Motoru" />
        <meta property="og:locale"      content="tr_TR" />

        {/* ── TWITTER CARD ── */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@deeptradescan" />
        <meta name="twitter:creator"     content="@deeptradescan" />
        <meta name="twitter:title"       content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESC} />
        <meta name="twitter:image"       content={OG_IMAGE} />

        {/* ── JSON-LD STRUCTURED DATA ── */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productKriptoSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productBorsaSchema) }} />

        {/* ── PERFORMANCE ── */}
        <link rel="dns-prefetch" href="https://api.binance.com" />
        <link rel="dns-prefetch" href="https://www.okx.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
