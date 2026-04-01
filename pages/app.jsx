import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const COINS = [
  'BTC','ETH','BNB','SOL','XRP','ADA','AVAX','DOGE','TRX','DOT','LINK','LTC','BCH','ETC','XMR','XLM','VET',
  'MATIC','ARB','OP','IMX','STRK','KAVA','METIS','ZRO',
  'NEAR','APT','SUI','SEI','INJ','TIA','TON','KAS','HBAR','STX','FTM','EGLD','ATOM','ICP','ALGO','FLOW','MINA','XTZ','RUNE',
  'AAVE','CRV','MKR','SNX','COMP','DYDX','GMX','PENDLE','LDO','GRT','SUSHI','YFI','1INCH','UNI','CAKE',
  'FET','RENDER','TAO','WLD','OCEAN','ARKM','AR','FIL','THETA','VIRTUAL','AI16Z',
  'ORDI','JUP','PYTH','JTO','W','RAY','BONK',
  'SAND','MANA','AXS','ENJ','GALA','MAGIC',
  'ENA','ETHFI','ONDO','BLUR',
  'SHIB','PEPE','WIF','FLOKI','TRUMP','POPCAT','BRETT','MEME','BOME','TURBO','NOT',
  'CHZ','ENS','MASK','APE','CRO','ANKR','BAT',
];

const CATS = {
  ALL:   { label:'ALL',   color:'#94A3B8' },
  MAJOR: { label:'MAJOR', color:'#38BDF8', coins:['BTC','ETH','BNB','SOL','XRP','ADA','AVAX','DOGE','TRX','DOT','LINK','LTC','BCH','ETC'] },
  LAYER2:{ label:'L2',    color:'#A78BFA', coins:['MATIC','ARB','OP','IMX','STRK','KAVA','METIS','ZRO'] },
  DEFI:  { label:'DeFi',  color:'#34D399', coins:['AAVE','CRV','MKR','SNX','COMP','DYDX','GMX','PENDLE','LDO','GRT','SUSHI','YFI','1INCH','UNI','CAKE'] },
  L1ALT: { label:'ALT',   color:'#FBBF24', coins:['NEAR','APT','SUI','SEI','INJ','TIA','TON','KAS','HBAR','STX','FTM','EGLD','ATOM','ICP','ALGO','FLOW','MINA','XTZ','RUNE'] },
  AI:    { label:'AI',    color:'#60A5FA', coins:['FET','RENDER','TAO','WLD','OCEAN','ARKM','AR','FIL','THETA','VIRTUAL','AI16Z'] },
  MEME:  { label:'MEME',  color:'#FB923C', coins:['SHIB','PEPE','WIF','FLOKI','TRUMP','POPCAT','BRETT','MEME','BOME','TURBO','NOT','BONK'] },
};

const STEPS = [
  '00 // DATA_MODEL — Spot + Futures + OKX 4H/1D/1W/1M',
  '01 // REGIME_ENGINE — k-means + Bayesian HMM',
  '02 // MICROSTRUCTURE — VPVR + CVD + OFI + VPIN',
  '03 // DERIVATIVES_ENGINE — OI + Funding + Squeeze',
  '04 // WYCKOFF_ICT_SMC — Phases + OB + FVG + OTE',
  '05 // ON_CHAIN_PROXY — Netflow + Whale + MVRV',
  '06 // SCENARIO_ENGINE — Game Theory + Probability',
  '07 // TRADE_DESIGN — Sniper Entry + Kelly + TP',
  '08 // META_ANALYSIS — Self-Critique + Sensitivity',
  '09 // EXECUTIVE_SUMMARY — Institutional Action Plan',
];

const SEC_RE = /^\[(MM-SCAN|MM-DESK|AKUMULASYON|LİKİDİTE|LIKIDITE|HACIM|MM TUZAK|SMC|SENARYO|RİSK|RISK|DeepTrade|DEEPTRADE|CHARTOS|CONFLUENCE|MULTI-TF|MARKET|KURUMSAL|ICT|SETUP|TÜREV|TUREV|UYARI|BEKLEME|FİBONACCİ|FIBONACCI|HARMONIK|HARMONİK|WYCKOFF|MANIPULASYON|MANİPÜLASYON|ON-CHAIN|ONCHAIN|MAKRO|KONFLUENS|12-KATMAN|PIYASA|MOMENTUM|BÖLGE|BOLGE|VOLUME|MTF|MULTI|PROFESYONEL|MM LİKİDİTE|MM|NİCEL|VERI-MODELI|VERI|MAKRO-REJIM|MIKROYAPI|MIKRO|TUREV-MOTOR|WYCKOFF-ICT|TRADE-TASARIMI|TRADE|META-ANALIZ|META|YONETICI-OZETI|YONETICI|OZET)\S*.*\]$/i;
const KV_RE  = /^([^:\n]{2,60}):\s*(.+)$/;

function parse(raw) {
  if (!raw) return [];
  const lines = raw.replace(/\*\*/g,'').replace(/\*/g,'').replace(/#{1,6}\s*/g,'').split('\n').map(l=>l.trim()).filter(l=>l.length>1);
  const blocks=[]; let cur=null;
  for (const line of lines) {
    const sm = line.match(SEC_RE);
    if (sm) { if(cur) blocks.push(cur); cur={type:'section', id:sm[1].toUpperCase(), raw:line.replace(/[\[\]]/g,''), items:[]}; continue; }
    if (!cur) cur={type:'section', id:'HEADER', raw:'OVERVIEW', items:[]};
    const kvm = line.match(KV_RE);
    if (kvm) cur.items.push({t:'kv', k:kvm[1].trim(), v:kvm[2].trim()});
    else if (line.length>3) cur.items.push({t:'txt', v:line});
  }
  if (cur) blocks.push(cur);
  return blocks;
}

const SEC_CFG = {
  // ── Wall Street HFT 10-Section Framework (0-9) ────────────────────────────
  'VERI-MODELI':    {icon:'◉', label:'0 · VERİ MODELİ & KISITLAR',             color:'#64748B', accent:'rgba(100,116,139,.08)'},
  'VERI':           {icon:'◉', label:'0 · VERİ MODELİ & KISITLAR',             color:'#64748B', accent:'rgba(100,116,139,.08)'},
  'MAKRO-REJIM':    {icon:'◉', label:'1 · MAKRO REJİM SINIFLANDIRMASI',         color:'#38BDF8', accent:'rgba(56,189,248,.09)'},
  'MIKROYAPI':      {icon:'▤', label:'2 · MİKROYAPI & EMİR AKIŞI',             color:'#F97316', accent:'rgba(249,115,22,.09)'},
  'MIKRO':          {icon:'▤', label:'2 · MİKROYAPI & EMİR AKIŞI',             color:'#F97316', accent:'rgba(249,115,22,.09)'},
  'TUREV-MOTOR':    {icon:'◐', label:'3 · TÜREV MOTORU',                        color:'#A78BFA', accent:'rgba(167,139,250,.09)'},
  'WYCKOFF-ICT':    {icon:'◎', label:'4 · WYCKOFF + ICT/SMC HİBRİT',           color:'#C084FC', accent:'rgba(192,132,252,.09)'},
  'ON-CHAIN':       {icon:'⛓', label:'5 · ON-CHAIN & KANTİTATİF',             color:'#818CF8', accent:'rgba(129,140,248,.09)'},
  'ONCHAIN':        {icon:'⛓', label:'5 · ON-CHAIN & KANTİTATİF',             color:'#818CF8', accent:'rgba(129,140,248,.09)'},
  'SENARYO':        {icon:'◉', label:'6 · SENARYO MATRİSİ (GAME THEORY)',        color:'#60A5FA', accent:'rgba(96,165,250,.09)'},
  'SINYAL':         {icon:'⚡', label:'7 · TRADE SİNYALİ — KURUMSAL SETUP',      color:'#10B981', accent:'rgba(16,185,129,.13)'},
  'TRADE-TASARIMI': {icon:'⚡', label:'7 · TRADE TASARIMI — KURUMSAL EXECUTİON',color:'#10B981', accent:'rgba(16,185,129,.10)'},
  'TRADE':          {icon:'⚡', label:'7 · TRADE TASARIMI',                     color:'#10B981', accent:'rgba(16,185,129,.09)'},
  'META-ANALIZ':    {icon:'◈', label:'8 · META-ANALİZ (SELF-CRİTİQUE)',        color:'#6366F1', accent:'rgba(99,102,241,.09)'},
  'META':           {icon:'◈', label:'8 · META-ANALİZ',                        color:'#6366F1', accent:'rgba(99,102,241,.09)'},
  'YONETICI-OZETI': {icon:'✦', label:'9 · YÖNETİCİ ÖZETİ — EXECUTİVE SUMMARY',color:'#00FFB2', accent:'rgba(0,255,178,.13)'},
  'YONETICI':       {icon:'✦', label:'9 · YÖNETİCİ ÖZETİ',                    color:'#00FFB2', accent:'rgba(0,255,178,.12)'},
  'OZET':           {icon:'✦', label:'9 · YÖNETİCİ ÖZETİ',                    color:'#00FFB2', accent:'rgba(0,255,178,.12)'},
  'MM-DESK':        {icon:'◈', label:'MARKET MAKER MASASI — 50 YIL TECRÜBE',    color:'#FFD700', accent:'rgba(255,215,0,.10)'},
  // ── Legacy 12-layer + other recognized headers ────────────────────────────
  'MM-SCAN':        {icon:'◈', label:'MM-SCAN — ÖZET SİNYAL',                  color:'#00D4FF', accent:'rgba(0,212,255,.10)'},
  'WYCKOFF':        {icon:'◎', label:'WYCKOFF & YAPISAL ANALİZ',                color:'#C084FC', accent:'rgba(192,132,252,.09)'},
  'HARMONIK':       {icon:'◌', label:'HARMONİK & FİBONACCİ',                   color:'#FBBF24', accent:'rgba(251,191,36,.09)'},
  'HARMONİK':       {icon:'◌', label:'HARMONİK & FİBONACCİ',                   color:'#FBBF24', accent:'rgba(251,191,36,.09)'},
  'FİBONACCİ':      {icon:'◌', label:'FİBONACCİ',                              color:'#FBBF24', accent:'rgba(251,191,36,.08)'},
  'FIBONACCI':      {icon:'◌', label:'FİBONACCİ',                              color:'#FBBF24', accent:'rgba(251,191,36,.08)'},
  'LİKİDİTE':       {icon:'◆', label:'LİKİDİTE MÜHENDİSLİĞİ',                  color:'#F43F5E', accent:'rgba(244,63,94,.08)'},
  'LIKIDITE':       {icon:'◆', label:'LİKİDİTE MÜHENDİSLİĞİ',                  color:'#F43F5E', accent:'rgba(244,63,94,.08)'},
  'HACIM':          {icon:'▤', label:'HACİM & ORDER FLOW',                      color:'#F97316', accent:'rgba(249,115,22,.08)'},
  'SMC':            {icon:'◆', label:'SMC YAPISI — SMART MONEY / ICT',           color:'#34D399', accent:'rgba(52,211,153,.08)'},
  'MANIPULASYON':   {icon:'⚠', label:'MANİPÜLASYON & MM TUZAK',               color:'#EF4444', accent:'rgba(239,68,68,.10)'},
  'MANİPÜLASYON':   {icon:'⚠', label:'MANİPÜLASYON & MM TUZAK',               color:'#EF4444', accent:'rgba(239,68,68,.10)'},
  'MM TUZAK':       {icon:'⚠', label:'MM TUZAK SENARYOLARI',                    color:'#EF4444', accent:'rgba(239,68,68,.09)'},
  'MAKRO':          {icon:'◉', label:'MAKRO & ÇAPRAZ PİYASA KORELASYONu',       color:'#38BDF8', accent:'rgba(56,189,248,.09)'},
  'RİSK':           {icon:'△', label:'RİSK MATRİSİ & POZİSYON',               color:'#FBBF24', accent:'rgba(251,191,36,.08)'},
  'RISK':           {icon:'△', label:'RİSK MATRİSİ & POZİSYON',               color:'#FBBF24', accent:'rgba(251,191,36,.08)'},
  'KONFLUENS':      {icon:'✦', label:'KONFLUENS — KARAR MATRİSİ',              color:'#00FFB2', accent:'rgba(0,255,178,.12)'},
  '12-KATMAN':      {icon:'✦', label:'12-KATMAN KONFLUENS',                     color:'#00FFB2', accent:'rgba(0,255,178,.12)'},
  'AKUMULASYON':    {icon:'◎', label:'AKÜMÜLASYON & DİSTRİBÜSYON',              color:'#C084FC', accent:'rgba(192,132,252,.07)'},
  'MM':             {icon:'◈', label:'MM LİKİDİTE',                             color:'#00D4FF', accent:'rgba(0,212,255,.07)'},
  'DEEPTRADE':      {icon:'◈', label:'DEEPTRADE SCAN',                          color:'#00D4FF', accent:'rgba(0,212,255,.07)'},
  'CHARTOS':        {icon:'◈', label:'CHARTOS ANALİZ',                          color:'#00D4FF', accent:'rgba(0,212,255,.07)'},
  'KURUMSAL':       {icon:'◆', label:'KURUMSAL BÖLGE',                          color:'#34D399', accent:'rgba(52,211,153,.06)'},
  'ICT':            {icon:'◆', label:'ICT KEY LEVELS',                          color:'#34D399', accent:'rgba(52,211,153,.06)'},
  'SETUP':          {icon:'⚡', label:'KURUMSAL GİRİŞ SETUP',                   color:'#10B981', accent:'rgba(16,185,129,.07)'},
  'TÜREV':          {icon:'◐', label:'TÜREV PİYASA',                            color:'#F97316', accent:'rgba(249,115,22,.06)'},
  'TUREV':          {icon:'◐', label:'TÜREV PİYASA',                            color:'#F97316', accent:'rgba(249,115,22,.06)'},
  'UYARI':          {icon:'△', label:'RİSK UYARISI',                            color:'#EF4444', accent:'rgba(239,68,68,.05)'},
  'BEKLEME':        {icon:'◷', label:'BEKLEME',                                 color:'#F59E0B', accent:'rgba(245,158,11,.05)'},
  'MOMENTUM':       {icon:'⚡', label:'MOMENTUM',                               color:'#A78BFA', accent:'rgba(167,139,250,.07)'},
  'MTF':            {icon:'▤', label:'MTF UYUM',                                color:'#38BDF8', accent:'rgba(56,189,248,.06)'},
  'DEFAULT':        {icon:'▸', label:'DATA',                                    color:'#94A3B8', accent:'rgba(148,163,184,.04)'},
};

function secCfg(id='') {
  for (const [k,v] of Object.entries(SEC_CFG)) { if (id.startsWith(k)) return v; }
  return SEC_CFG.DEFAULT;
}

// Only these block IDs are shown in the UI — others are computed internally
const VISIBLE_IDS = new Set(['SENARYO','SINYAL','MM-DESK','YONETICI-OZETI','YONETICI','OZET']);

function kvColor(k) {
  const l = k.toLowerCase();
  // ── HFT 10-Section framework keys ────────────────────────────────────────
  if (l === 'rejim' || l.startsWith('rejim:') || l === 'makro rejim') return '#38BDF8';
  if (l.includes('guven skoru') || l === 'güven skoru')     return '#00D4FF';
  if (l === 'bias' || l === 'net aksiyon')                  return '#00FFB2';
  if (l === 'risk notu')                                     return '#FBBF24';
  if (l.includes('en yuksek olasilikli') || l.includes('en yüksek olası')) return '#60A5FA';
  if (l.includes('vpin') || l.includes('ofi bias') || l.includes('order flow imbalance')) return '#F97316';
  if (l.includes('short squeeze') || l.includes('long squeeze')) return '#EF4444';
  if (l.includes('max pain') || l.includes('gex bias') || l.includes('gamma')) return '#A78BFA';
  if (l.includes('perp basis'))                             return '#F97316';
  if (l.includes('sniper giris') || l.includes('sniper entry')) return '#00FFB2';
  if (l.includes('low confidence flag') || l.includes('low conf')) return '#F59E0B';
  if (l.includes('underpriced') || l.includes('en zayif varsayim')) return '#6366F1';
  if (l.includes('volatilite duyarlilik') || l.includes('sensitivity')) return '#6366F1';
  if (l.includes('kritik veri eksikligi'))                  return '#EF4444';
  if (l.includes('vpvr') || l.includes('likidite bosluğu') || l.includes('likidite bosluğu')) return '#F43F5E';
  if (l.includes('oi delta') || l.includes('oi:') || l === 'oi') return '#F97316';
  if (l.includes('btc beta') || l.includes('korelasyon'))   return '#38BDF8';
  if (l.includes('senaryo a') || l.startsWith('senaryo a')) return '#10B981';
  if (l.includes('senaryo b') || l.startsWith('senaryo b')) return '#F59E0B';
  if (l.includes('senaryo c') || l.startsWith('senaryo c')) return '#EF4444';
  // ── 12-KATMAN KONFLUENS table rows ──────────────────────────────────────
  if (l.includes('nihai karar'))                            return '#00FFB2';
  if (l.includes('konfluens skoru'))                        return '#00D4FF';
  if (l.includes('toplam') && (l.includes('long') || l.includes('short') || l.includes('notr'))) return '#00D4FF';
  if (l.includes('kritik metrik'))                          return '#F59E0B';
  if (l === 'ta sinyal' || l.startsWith('ta sinyal'))       return '#00D4FF';
  if (l.includes('wyckoff sinyal'))                         return '#C084FC';
  if (l.includes('harmonik sinyal'))                        return '#FBBF24';
  if (l.includes('likidite sinyal'))                        return '#F43F5E';
  if (l.includes('hacim sinyal'))                           return '#F97316';
  if (l.includes('smc sinyal'))                             return '#34D399';
  if (l.includes('manipülasyon sinyal') || l.includes('manipulasyon sinyal')) return '#EF4444';
  if (l.includes('on-chain sinyal') || l.includes('onchain sinyal')) return '#A78BFA';
  if (l.includes('türev sinyal') || l.includes('turev sinyal')) return '#F97316';
  if (l.includes('makro sinyal'))                           return '#38BDF8';
  if (l.includes('döngü sinyal') || l.includes('dongu sinyal')) return '#F59E0B';
  if (l.includes('risk sinyal'))                            return '#FBBF24';
  // ── Setup / trade levels ─────────────────────────────────────────────────
  if (l.includes('giriş') || l.includes('entry'))          return '#10B981';
  if (l.includes('stop'))                                   return '#EF4444';
  if (l.includes('tp1') || l.includes('hedef 1'))          return '#34D399';
  if (l.includes('tp2') || l.includes('hedef 2'))          return '#3B82F6';
  if (l.includes('tp3') || l.includes('hedef 3'))          return '#818CF8';
  if (l.includes('r:r') || l.includes('risk/reward') || l.includes('risk/ödül')) return '#A78BFA';
  if (l.includes('kaldıraç') || l.includes('leverage') || l.includes('kaldiraç')) return '#F59E0B';
  if (l.includes('dca'))                                    return '#60A5FA';
  if (l.includes('invalidasyon'))                           return '#EF4444';
  // ── Elliott / Harmonik / Fibonacci ──────────────────────────────────────
  if (l.includes('elliott') || l.includes('dalga') || l.includes('impulse') || l.includes('corrective')) return '#A78BFA';
  if (l.includes('harmonik') || l.includes('prz') || l.includes('gartley') || l.includes('bat ') || l.includes('butterfly') || l.includes('crab') || l.includes('cypher')) return '#FBBF24';
  if (l.includes('fibonacci') || l.includes('fib') || l.includes('ote') || l.includes('golden pocket') || l.includes('retracement')) return '#FBBF24';
  if (l.includes('extension'))                              return '#F59E0B';
  // ── On-Chain ────────────────────────────────────────────────────────────
  if (l.includes('on-chain') || l.includes('mvrv') || l.includes('nupl') || l.includes('sopr') || l.includes('realized')) return '#A78BFA';
  if (l.includes('exchange flow') || l.includes('exchange reserve'))         return '#A78BFA';
  if (l.includes('accumulation') || l.includes('akümülasyon'))              return '#C084FC';
  if (l.includes('distribution') || l.includes('distribüsyon'))             return '#EF4444';
  // ── Macro / Cycle ────────────────────────────────────────────────────────
  if (l.includes('halving') || l.includes('döngü') || l.includes('dongu') || l.includes('mevsimsel')) return '#F59E0B';
  if (l.includes('makro') || l.includes('dxy') || l.includes('fed') || l.includes('vix'))     return '#38BDF8';
  if (l.includes('dominance') || l.includes('btc.d') || l.includes('altseason'))              return '#38BDF8';
  if (l.includes('sektör') || l.includes('rotasyon'))      return '#60A5FA';
  // ── Derivatives ──────────────────────────────────────────────────────────
  if (l.includes('funding'))                                return '#F97316';
  if (l.includes('long/short') || l.includes('l/s') || l.includes('taker')) return '#60A5FA';
  if (l.includes('oi') || l.includes('open interest'))     return '#F97316';
  if (l.includes('basis') || l.includes('contango') || l.includes('backwardation')) return '#F97316';
  if (l.includes('cascade') || l.includes('likidas'))      return '#EF4444';
  // ── SMC / ICT ────────────────────────────────────────────────────────────
  if (l.includes('order block') || l.includes('ob:') || l.startsWith('ob ')) return '#34D399';
  if (l.includes('fvg') || l.includes('fair value gap') || l.includes('imbalance')) return '#C084FC';
  if (l.includes('bos') || l.includes('choch') || l.includes('change of character')) return '#C084FC';
  if (l.includes('breaker block'))                          return '#10B981';
  if (l.includes('absorption'))                             return '#F97316';
  if (l.includes('sweep') || l.includes('stop hunt') || l.includes('judas')) return '#F43F5E';
  // ── Wyckoff ──────────────────────────────────────────────────────────────
  if (l.includes('wyckoff') || l.includes('spring') || l.includes('utad') || l.includes('sos') || l.includes('lps')) return '#A78BFA';
  if (l.includes('dow theory') || l.includes('hh-hl') || l.includes('lh-ll')) return '#C084FC';
  // ── Volatility / Volume ───────────────────────────────────────────────────
  if (l.includes('cvd') || l.includes('obv') || l.includes('volume delta')) return '#F97316';
  if (l.includes('vwap') || l.includes('poc') || l.includes('volume profile') || l.includes('vah') || l.includes('val')) return '#F97316';
  if (l.includes('premium/discount') || l.includes('p/d zone'))             return '#F97316';
  if (l.includes('bollinger') || l.includes('squeeze'))    return '#60A5FA';
  if (l.includes('ichimoku') || l.includes('cloud') || l.includes('kumo')) return '#60A5FA';
  if (l.includes('supertrend'))                             return '#10B981';
  // ── Liquidity ─────────────────────────────────────────────────────────────
  if (l.includes('bsl') || l.includes('buy side'))         return '#10B981';
  if (l.includes('ssl') || l.includes('sell side'))        return '#EF4444';
  if (l.includes('iceberg') || l.includes('spoofing') || l.includes('spoof')) return '#EF4444';
  if (l.includes('likidite') || l.includes('liquidity'))   return '#F43F5E';
  // ── Signals / momentum ────────────────────────────────────────────────────
  if (l.includes('sinyal') || l.includes('signal'))        return '#00D4FF';
  if (l.includes('divergence') || l.includes('div:') || l.includes('diverjans')) return '#C084FC';
  if (l.includes('macd') || l.includes('rsi') || l.includes('cci') || l.includes('stoch')) return '#60A5FA';
  if (l.includes('atr'))                                    return '#F59E0B';
  // ── Scenario ──────────────────────────────────────────────────────────────
  if (l.startsWith('senaryo a') || l.includes('senaryo a ') || l.includes('a-boğa') || l.includes('a-boga')) return '#10B981';
  if (l.startsWith('senaryo b') || l.includes('senaryo b ') || l.includes('b-ayı'))  return '#F59E0B';
  if (l.startsWith('senaryo c') || l.includes('senaryo c ') || l.includes('c-tuzak')) return '#EF4444';
  // ── Directional ────────────────────────────────────────────────────────────
  if (l.includes('bull') || l.includes('boğa') || l.includes('yukari') || l.includes('yukarı')) return '#10B981';
  if (l.includes('bear') || l.includes('ayı') || l.includes('asagi') || l.includes('aşağı'))    return '#EF4444';
  // ── Risk / smart money ────────────────────────────────────────────────────
  if (l.includes('risk'))                                   return '#FBBF24';
  if (l.includes('smart money') || l.includes('kurumsal'))  return '#C084FC';
  if (l.includes('composite man'))                          return '#C084FC';
  if (l.includes('yapı') || l.includes('structure'))       return '#60A5FA';
  if (l.includes('rejim') || l.includes('regime'))         return '#94A3B8';
  return null;
}

async function apiAuth(action, body={}, token='') {
  try {
    const r = await fetch(`/api/auth?action=${action}`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization': token ? `Bearer ${token}` : ''},
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch { return { error: 'Bağlantı hatası' }; }
}

const VERDICT_META = {
  PRIME_BUY:   { label:'PRIME APEX BUY',  color:'#00FFB2', glow:'rgba(0,255,178,.40)', bg:'rgba(0,255,178,.10)', icon:'▲▲▲', tagline:'S+ SİNYAL — 5x | PRIME APEX ENTRY — En Yüksek Kalite Kurumsal Setup' },
  STRONG_BUY:  { label:'STRONG BUY',      color:'#10B981', glow:'rgba(16,185,129,.35)', bg:'rgba(16,185,129,.10)', icon:'▲▲', tagline:'S SİNYAL — 5x | KURUMSAL ALIM — Market Maker long pozisyon açıyor' },
  BUY:         { label:'BUY',             color:'#34D399', glow:'rgba(52,211,153,.25)', bg:'rgba(52,211,153,.08)', icon:'▲',  tagline:'A SİNYAL — 5x | ALIM BÖLGE — Confluence onaylı long setup' },
  NEUTRAL:     { label:'NEUTRAL',         color:'#F59E0B', glow:'rgba(245,158,11,.20)', bg:'rgba(245,158,11,.08)', icon:'◆',  tagline:'SIKIŞ — Kırılım yönü için bekle — 5x ile dikkatli ol' },
  SELL:        { label:'SELL',            color:'#F97316', glow:'rgba(249,115,22,.25)', bg:'rgba(249,115,22,.08)', icon:'▼',  tagline:'A SİNYAL — 5x | SATIM BÖLGE — Confluence onaylı short setup' },
  STRONG_SELL: { label:'STRONG SELL',     color:'#EF4444', glow:'rgba(239,68,68,.35)',  bg:'rgba(239,68,68,.10)',  icon:'▼▼', tagline:'S SİNYAL — 5x | KURUMSAL SATIM — Market Maker dağıtım yapıyor' },
  PRIME_SELL:  { label:'PRIME APEX SELL', color:'#FF4B6E', glow:'rgba(255,75,110,.40)', bg:'rgba(255,75,110,.10)', icon:'▼▼▼', tagline:'S+ SİNYAL — 5x | PRIME APEX ENTRY — En Yüksek Kalite Kurumsal Setup' },
};

// ── PRICE LEVEL COMPONENT ─────────────────────────────────────
function PriceLevel({ label, price, current, color, sub }) {
  if (!price || !current) return null;
  const diff = ((parseFloat(price.replace(/[$,]/g,'')) - parseFloat(current.replace(/[$,]/g,''))) / parseFloat(current.replace(/[$,]/g,'')) * 100);
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 18px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
      <div>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', letterSpacing:.5, marginBottom:3 }}>{label}</div>
        {sub && <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:800, color }}>{price}</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color: diff > 0 ? '#34D399' : diff < 0 ? '#EF4444' : 'var(--t3)', marginTop:2 }}>
          {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

// ── MINI GAUGE ────────────────────────────────────────────────
function ConfGauge({ bull, bear }) {
  const total = (bull || 0) + (bear || 0) + 0.01;
  const bullPct = Math.round((bull || 0) / total * 100);
  const bearPct = 100 - bullPct;
  return (
    <div style={{ padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', letterSpacing:.5 }}>BULL SIGNALS</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:800, color:'#10B981', marginTop:2 }}>{bull}</div>
        </div>
        <div style={{ textAlign:'center', alignSelf:'center' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginBottom:4 }}>BIAS</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color: bullPct > 55 ? '#10B981' : bullPct < 45 ? '#EF4444' : '#F59E0B' }}>
            {bullPct}% / {bearPct}%
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', letterSpacing:.5 }}>BEAR SIGNALS</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:800, color:'#EF4444', marginTop:2 }}>{bear}</div>
        </div>
      </div>
      <div style={{ height:10, background:'var(--card)', borderRadius:5, overflow:'hidden', position:'relative', border:'1px solid var(--border)' }}>
        <div style={{
          position:'absolute', left:0, top:0, bottom:0,
          width:`${bullPct}%`,
          background:'linear-gradient(90deg, #059669, #10B981, #34D399)',
          borderRadius:'5px 0 0 5px', minWidth:4, transition:'width .6s ease'
        }} />
        <div style={{
          position:'absolute', right:0, top:0, bottom:0,
          width:`${bearPct}%`,
          background:'linear-gradient(90deg, #DC2626, #EF4444)',
          borderRadius:'0 5px 5px 0', transition:'width .6s ease'
        }} />
      </div>
    </div>
  );
}

// ── INDICATOR CHIP ────────────────────────────────────────────
function IndChip({ label, val, color, sub }) {
  return (
    <div style={{ background:'var(--card2)', borderRadius:6, padding:'10px 12px', border:'1px solid var(--border)' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:.5, marginBottom:4, textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color: color || 'var(--t1)' }}>{val}</div>
      {sub && <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ── CHART MODAL ───────────────────────────────────────────────
function ChartModal({ coin, setup, onClose }) {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);
  const overlayRef    = useRef(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError]     = useState('');

  useEffect(() => {
    let chart = null;
    async function init() {
      try {
        const res = await fetch(`/api/chart-data?coin=${coin}&interval=4H&limit=200`);
        const data = await res.json();
        if (!data.candles || data.candles.length === 0) throw new Error('Veri boş');

        const { createChart } = await import('lightweight-charts');
        const width = Math.min((window.innerWidth || 900) - 48, 900);

        chart = createChart(chartRef.current, {
          layout:          { background: { color: '#0D1117' }, textColor: '#8B949E' },
          grid:            { vertLines: { color: '#1C2128' }, horzLines: { color: '#1C2128' } },
          crosshair:       { mode: 1 },
          rightPriceScale: { borderColor: '#21262D' },
          timeScale:       { borderColor: '#21262D', timeVisible: true },
          width,
          height: 420,
        });
        chartInstance.current = chart;

        const series = chart.addCandlestickSeries({
          upColor:        '#26a69a', downColor:        '#ef5350',
          borderUpColor:  '#26a69a', borderDownColor:  '#ef5350',
          wickUpColor:    '#26a69a', wickDownColor:    '#ef5350',
        });
        series.setData(data.candles);

        const LINE = { lineStyle: 0 };
        if (setup?.entry) series.createPriceLine({ ...LINE, price: setup.entry, color: '#00D4FF', lineWidth: 2, title: 'ENTRY' });
        if (setup?.stop)  series.createPriceLine({ ...LINE, price: setup.stop,  color: '#EF4444', lineWidth: 2, title: 'SL'    });
        if (setup?.tp1)   series.createPriceLine({ ...LINE, price: setup.tp1,   color: '#6EE7B7', lineWidth: 1, title: 'TP1', lineStyle: 2 });
        if (setup?.tp2)   series.createPriceLine({ ...LINE, price: setup.tp2,   color: '#34D399', lineWidth: 1, title: 'TP2', lineStyle: 2 });
        if (setup?.tp3)   series.createPriceLine({ ...LINE, price: setup.tp3,   color: '#10B981', lineWidth: 2, title: 'TP3', lineStyle: 2 });

        chart.timeScale().scrollToPosition(-20, false);
        setChartLoading(false);
      } catch(e) {
        setChartError(e.message || 'Grafik yüklenemedi');
        setChartLoading(false);
      }
    }
    init();
    return () => { chart?.remove(); chartInstance.current = null; };
  }, [coin, setup?.entry]);

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
    >
      <div style={{ background:'#0D1117', border:'1px solid #21262D', borderRadius:10, overflow:'hidden', width:'min(900px, 100%)', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 18px', borderBottom:'1px solid #21262D', background:'#161B22', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:13, color:'#E8EEF8' }}>📊 {coin}/USDT — 4H Chart</div>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid #30363D', color:'#8B949E', padding:'4px 10px', borderRadius:5, cursor:'pointer', fontFamily:'var(--mono)', fontSize:10, letterSpacing:.5 }}>✕ KAPAT</button>
        </div>
        {/* Level legend */}
        <div style={{ display:'flex', gap:14, padding:'7px 18px', background:'#0D1117', borderBottom:'1px solid #1C2128', flexWrap:'wrap', flexShrink:0 }}>
          {[
            { label:'ENTRY', color:'#00D4FF' },
            { label:'SL',    color:'#EF4444' },
            { label:'TP1',   color:'#6EE7B7' },
            { label:'TP2',   color:'#34D399' },
            { label:'TP3',   color:'#10B981' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:9, color }}>
              <div style={{ width:18, height:2, background:color, borderRadius:1 }} />{label}
            </div>
          ))}
        </div>
        {/* Chart container */}
        <div style={{ position:'relative', height:420, flexShrink:0 }}>
          {chartLoading && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#0D1117' }}>
              <div className="spinner" style={{ width:24, height:24, borderWidth:3 }}/>
            </div>
          )}
          {chartError && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#0D1117', color:'#EF4444', fontFamily:'var(--mono)', fontSize:12 }}>
              ⚠ {chartError}
            </div>
          )}
          <div ref={chartRef} style={{ width:'100%', height:'100%' }} />
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&display=swap');

:root {
  --bg:     #060c18;
  --panel:  #091220;
  --card:   #0c1829;
  --card2:  #111f35;
  --border: #1a2e4a;
  --blt:    rgba(59,130,246,.1);
  --t1:     #d8e8f8;
  --t2:     #6e89ae;
  --t3:     #324d6a;
  --accent: #3b82f6;
  --green:  #10b981;
  --red:    #ef4444;
  --gold:   #f59e0b;
  --mono:   'JetBrains Mono', monospace;
  --sans:   'Inter', -apple-system, sans-serif;
}

*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html { font-family:var(--sans); background:var(--bg); color:var(--t1); -webkit-font-smoothing:antialiased; }
::-webkit-scrollbar { width:4px; height:4px; }
::-webkit-scrollbar-track { background:var(--bg); }
::-webkit-scrollbar-thumb { background:#1a3050; border-radius:4px; }
::-webkit-scrollbar-thumb:hover { background:#2a4a72; }

@keyframes spin      { to { transform:rotate(360deg); } }
@keyframes glow-pulse { 0%,100% { opacity:.8; } 50% { opacity:1; } }
@keyframes slide-up  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes scan-line { 0% { transform:translateX(-100%); } 100% { transform:translateX(400%); } }

.spinner { width:14px; height:14px; border:2px solid #e2e8f0; border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; }

/* LAYOUT */
.layout { display:flex; flex-direction:column; height:100vh; overflow:hidden; }
.topbar {
  height:52px;
  background: linear-gradient(90deg, #09142a 0%, #0d1e38 40%, #091428 100%);
  border-bottom: 1px solid rgba(59,130,246,.22);
  display:flex; align-items:center; justify-content:space-between; padding:0 20px;
  flex-shrink:0; box-shadow: 0 2px 24px rgba(0,0,0,.5), 0 0 0 0 transparent;
  position:relative;
}
.topbar::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, transparent, rgba(59,130,246,.5), rgba(139,92,246,.4), rgba(59,130,246,.5), transparent);
}
.workspace { display:flex; flex:1; overflow:hidden; }
.sidebar-l { width:260px; background:linear-gradient(180deg,#091220 0%,#060c18 100%); border-right:1px solid rgba(26,46,74,.9); display:flex; flex-direction:column; flex-shrink:0; }
.sidebar-r { width:360px; background:linear-gradient(180deg,#091220 0%,#060c18 100%); border-left:1px solid rgba(26,46,74,.9); display:flex; flex-direction:column; flex-shrink:0; overflow-y:auto; }
.main { flex:1; overflow-y:auto; background:var(--bg); background-image:radial-gradient(rgba(59,130,246,.035) 1px, transparent 1px); background-size:28px 28px; padding:20px; }

/* HEADER */
.ph { padding:10px 16px; border-bottom:1px solid var(--border); font-family:var(--mono); font-size:9px; font-weight:700; color:var(--t3); letter-spacing:1.8px; text-transform:uppercase; background:var(--card2); }

/* SIDEBAR */
.search-inp {
  width:100%; background:rgba(6,12,24,.8); border:1.5px solid var(--border); color:var(--t1);
  padding:9px 13px; font-family:var(--sans); font-size:13px; outline:none; border-radius:8px; transition:.15s;
}
.search-inp:focus { border-color:rgba(59,130,246,.6); background:rgba(9,18,32,.9); box-shadow:0 0 0 3px rgba(59,130,246,.08); }
.pill {
  background:rgba(17,31,53,.8); border:1px solid var(--border); color:var(--t2);
  padding:4px 10px; font-size:10px; font-family:var(--mono); cursor:pointer; border-radius:20px;
  transition:.15s; white-space:nowrap; letter-spacing:.3px;
}
.pill:hover, .pill.on { background:rgba(59,130,246,.18); color:var(--accent); border-color:rgba(59,130,246,.45); }
.coin-row {
  padding:9px 16px; border-bottom:1px solid rgba(26,46,74,.5); cursor:pointer;
  display:flex; justify-content:space-between; align-items:center; transition:background .1s;
}
.coin-row:hover { background:rgba(59,130,246,.06); }
.coin-row.on { background:rgba(59,130,246,.14); border-left:3px solid var(--accent); padding-left:13px; }

/* BUTTONS */
.btn-exec {
  background:linear-gradient(135deg, #1e40af, #2563eb, #3b82f6); border:none; color:#fff;
  padding:12px 24px; font-family:var(--mono); font-size:11px; font-weight:700;
  cursor:pointer; border-radius:9px; letter-spacing:.8px;
  display:flex; align-items:center; justify-content:center; gap:10px;
  transition:.2s; box-shadow:0 2px 8px rgba(37,99,235,.3);
  position:relative; overflow:hidden;
}
.btn-exec::after {
  content:''; position:absolute; top:0; left:0; right:0; bottom:0;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent);
  animation:scan-line 3s linear infinite;
}
.btn-exec:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(37,99,235,.4); }
.btn-exec:disabled { opacity:.5; cursor:not-allowed; }
.btn-sm { padding:5px 12px; font-size:10px; background:rgba(17,31,53,.8); border:1px solid var(--border); color:var(--t2); border-radius:6px; cursor:pointer; transition:.15s; font-family:var(--mono); letter-spacing:.3px; }
.btn-sm:hover { border-color:rgba(59,130,246,.5); color:var(--accent); background:rgba(59,130,246,.1); }

/* VERDICT */
.verdict-banner {
  border-radius:12px; overflow:hidden; margin-bottom:20px;
  animation:slide-up .4s ease; box-shadow:0 8px 40px rgba(0,0,0,.4);
}

/* TICKET */
.ticket-grid { display:grid; grid-template-columns:1fr 1fr; background:var(--border); gap:1px; border-radius:0 0 10px 10px; overflow:hidden; }
.tc { padding:14px 18px; background:var(--card); }
.tc.full { grid-column:1/-1; }
.tc-label { font-family:var(--mono); font-size:8px; color:var(--t3); margin-bottom:6px; letter-spacing:.8px; text-transform:uppercase; }
.tc-val { font-family:var(--mono); font-size:17px; font-weight:800; color:var(--t1); line-height:1; }
.tc-sub { font-family:var(--mono); font-size:9px; color:var(--t3); margin-top:5px; }

/* ══ ANALYSIS REPORT — PROFESSIONAL TRADER PANELS ══════════════ */
.analysis-report {
  background:var(--card); border:1px solid var(--border); border-radius:10px;
  overflow:hidden; animation:slide-up .4s ease; box-shadow:0 8px 32px rgba(0,0,0,.4);
  margin-bottom:14px;
}
/* Top meta-header */
.report-header {
  padding:10px 16px;
  background:linear-gradient(135deg,rgba(0,212,255,.07),rgba(124,58,237,.04),rgba(16,185,129,.03));
  border-bottom:1px solid rgba(0,212,255,.15);
  display:flex; align-items:center; gap:8px;
}
.report-header-icon { font-size:15px; color:#00D4FF; }
.report-header-title {
  font-family:var(--mono); font-size:9.5px; font-weight:900; color:#00D4FF;
  letter-spacing:1px; text-transform:uppercase; flex:1;
}
/* Each section card — colored left border */
.ablock {
  margin:8px 10px 0;
  border-radius:7px; overflow:hidden;
  border:1px solid var(--border);
  box-shadow:0 1px 8px rgba(0,0,0,.2);
}
.ablock:last-child { margin-bottom:10px; }
/* Section header row */
.ablock-head {
  display:flex; align-items:center; gap:7px;
  padding:7px 12px 6px;
  border-bottom:1px solid rgba(255,255,255,.04);
}
.ablock-icon {
  width:22px; height:22px; border-radius:5px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; border:1px solid; font-weight:900;
}
.ablock-label {
  font-family:var(--mono); font-size:9px; font-weight:800;
  letter-spacing:.8px; text-transform:uppercase; flex:1;
}
/* KV rows */
.kv-row {
  display:flex; justify-content:space-between; align-items:baseline;
  padding:5px 12px; gap:10px;
  border-bottom:1px solid rgba(255,255,255,.025);
  transition:background .1s;
}
.kv-row:last-child { border-bottom:none; }
.kv-row:hover { background:rgba(255,255,255,.02); }
.kv-k {
  font-family:var(--mono); font-size:8.5px; color:var(--t3);
  flex-shrink:0; letter-spacing:.2px; max-width:48%;
}
.kv-v {
  font-family:var(--mono); font-size:10px; text-align:right;
  font-weight:800; max-width:55%; line-height:1.4; word-break:break-word;
}
/* Text (narrative) rows */
.txt-row {
  padding:6px 12px; border-bottom:1px solid rgba(255,255,255,.02);
  display:flex; gap:8px; align-items:flex-start;
}
.txt-row:last-child { border-bottom:none; }
.txt-bar { width:2px; border-radius:2px; flex-shrink:0; min-height:14px; align-self:stretch; opacity:.5; margin-top:3px; }
.txt-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size:11.5px; color:var(--t1); line-height:1.7; opacity:.88;
}

/* SMC GRID */
.smc-cell { padding:13px 16px; }
.smc-lbl { font-family:var(--mono); font-size:8px; color:var(--t3); margin-bottom:6px; letter-spacing:.5px; text-transform:uppercase; }
.smc-val { font-family:var(--mono); font-size:13px; font-weight:800; }
.smc-lvl { font-family:var(--mono); font-size:10px; color:var(--t3); margin-top:4px; }

/* PROGRESS */
.progress-wrap { background:linear-gradient(135deg,rgba(9,18,32,.95),rgba(13,26,48,.95)); border:1.5px solid rgba(59,130,246,.4); border-radius:10px; padding:18px 20px; margin-bottom:20px; box-shadow:0 4px 28px rgba(59,130,246,.15), inset 0 1px 0 rgba(255,255,255,.04); }
.progress-bar { height:5px; background:rgba(6,12,24,.8); border-radius:3px; overflow:hidden; margin-top:12px; border:1px solid rgba(26,46,74,.8); }
.progress-fill { height:100%; background:linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa, #93c5fd); border-radius:3px; transition:width .5s ease; animation:glow-pulse 1.5s ease infinite; box-shadow: 0 0 12px rgba(59,130,246,.6); }

/* PORTFOLIO TRACKER */
.pt-card { padding:14px 16px; border-bottom:1px solid rgba(26,46,74,.5); cursor:default; transition:background .1s; }
.pt-card:hover { background:rgba(59,130,246,.04); }
.dir-badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:20px; font-family:var(--mono); font-size:9px; font-weight:800; }
.dir-badge.long  { background:rgba(16,185,129,.15); color:#34D399; border:1px solid rgba(16,185,129,.35); }
.dir-badge.short { background:rgba(239,68,68,.15); color:#F87171; border:1px solid rgba(239,68,68,.35); }
.pt-pill { background:rgba(17,31,53,.8); border:1px solid var(--border); color:var(--t3); padding:3px 10px; font-size:9px; font-family:var(--mono); cursor:pointer; border-radius:20px; transition:.12s; letter-spacing:.3px; white-space:nowrap; }
.pt-pill:hover,.pt-pill.on { background:rgba(59,130,246,.18); color:var(--accent); border-color:rgba(59,130,246,.45); }

/* INDICATOR GRID */
.ind-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }

/* QUANTUM PANEL v3 — GOD MODE DARK PREMIUM */
@keyframes glow-ring { 0%,100%{box-shadow:0 0 12px rgba(99,102,241,.4),0 0 24px rgba(139,92,246,.2);} 50%{box-shadow:0 0 20px rgba(99,102,241,.7),0 0 40px rgba(139,92,246,.35);} }
@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.7;transform:scale(1.4);} }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.65;} }
@keyframes gradient-shift { 0%{background-position:0% 50%;} 50%{background-position:100% 50%;} 100%{background-position:0% 50%;} }
@keyframes slide-in-right { from{opacity:0;transform:translateX(8px);} to{opacity:1;transform:translateX(0);} }

.q-panel {
  background:linear-gradient(160deg,#0f172a 0%,#1a1035 45%,#0f1f3a 100%);
  border:1px solid rgba(139,92,246,.3); border-radius:16px;
  overflow:hidden; margin-bottom:20px; animation:slide-up .4s ease;
  position:relative; box-shadow:0 12px 40px rgba(0,0,0,.45),0 0 0 1px rgba(139,92,246,.15),inset 0 1px 0 rgba(255,255,255,.05);
}
.q-panel::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7,#06b6d4,#10b981,#f59e0b,#ef4444,#6366f1);
  background-size:300% 100%; animation:gradient-shift 6s ease infinite;
}
.q-header {
  padding:16px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  background:rgba(0,0,0,.25); border-bottom:1px solid rgba(139,92,246,.15);
}
.q-badge {
  display:inline-flex; align-items:center; gap:7px;
  background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15));
  border:1px solid rgba(139,92,246,.4); border-radius:20px; padding:5px 14px;
  font-family:var(--mono); font-size:9px; font-weight:800; color:#a78bfa; letter-spacing:1.5px;
  box-shadow:0 0 16px rgba(139,92,246,.2),inset 0 1px 0 rgba(255,255,255,.05);
}
.q-tabs {
  display:flex; background:rgba(0,0,0,.3); padding:4px 16px; gap:3px;
  border-bottom:1px solid rgba(139,92,246,.12); overflow-x:auto; scrollbar-width:none;
}
.q-tabs::-webkit-scrollbar { display:none; }
.q-tab {
  flex:1; background:transparent; border:none; cursor:pointer;
  font-family:var(--mono); font-size:9px; font-weight:700;
  padding:8px 8px; border-radius:7px; transition:.18s; letter-spacing:.6px;
  color:rgba(255,255,255,.35); white-space:nowrap; min-width:fit-content;
}
.q-tab.on {
  background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff;
  box-shadow:0 2px 12px rgba(79,70,229,.45),0 0 0 1px rgba(139,92,246,.3);
}
.q-tab:hover:not(.on) { color:rgba(255,255,255,.65); background:rgba(255,255,255,.06); }

/* LAYER ROWS */
.q-layer {
  padding:12px 18px; border-bottom:1px solid rgba(139,92,246,.08);
  display:flex; align-items:flex-start; gap:13px; transition:background .15s;
}
.q-layer:hover { background:rgba(255,255,255,.025); }
.q-layer:last-child { border-bottom:none; }
.q-layer-id {
  width:36px; height:36px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-family:var(--mono); font-size:10px; font-weight:900; letter-spacing:.3px;
}
.q-layer-info { flex:1; min-width:0; padding-top:1px; }
.q-layer-name {
  font-family:var(--mono); font-size:10px; font-weight:700;
  letter-spacing:.4px; margin-bottom:4px; color:rgba(255,255,255,.88);
}
.q-layer-sum { font-size:10px; color:rgba(255,255,255,.45); line-height:1.55; }
.q-layer-right { text-align:right; flex-shrink:0; min-width:52px; }
.q-layer-score { font-family:var(--mono); font-size:18px; font-weight:900; line-height:1; }
.q-layer-bias { font-family:var(--mono); font-size:8px; font-weight:800; margin-top:3px; letter-spacing:1.2px; }
.q-layer-bar { height:3px; border-radius:3px; overflow:hidden; margin-top:7px; background:rgba(255,255,255,.07); }
.q-layer-bar-fill { height:100%; border-radius:3px; transition:width .8s cubic-bezier(.4,0,.2,1); }

/* SIGNAL GRID */
.q-signal-grid { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:rgba(139,92,246,.15); }
.q-signal-cell { padding:14px 16px; background:rgba(0,0,0,.35); }
.q-signal-cell.full { grid-column:1/-1; }
.q-signal-lbl { font-family:var(--mono); font-size:8px; color:rgba(255,255,255,.35); letter-spacing:1px; margin-bottom:7px; text-transform:uppercase; }
.q-signal-val { font-family:var(--mono); font-size:18px; font-weight:900; line-height:1; }
.q-signal-sub { font-family:var(--mono); font-size:9px; color:rgba(255,255,255,.35); margin-top:4px; }

/* SCENARIO */
.q-scenario { padding:14px 18px; border-bottom:1px solid rgba(139,92,246,.1); }
.q-scenario:last-child { border-bottom:none; }
.q-scenario-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
.q-scenario-label { font-family:var(--mono); font-size:10px; font-weight:800; letter-spacing:.6px; }
.q-scenario-prob { font-family:var(--mono); font-size:14px; font-weight:900; }
.q-scenario-desc { font-size:11px; color:rgba(255,255,255,.5); line-height:1.65; }
.q-prob-bar { height:5px; background:rgba(255,255,255,.06); border-radius:4px; overflow:hidden; margin-top:9px; }
.q-prob-fill { height:100%; border-radius:4px; transition:width .9s cubic-bezier(.4,0,.2,1); }

/* TRAIL */
.q-trail-item {
  padding:8px 18px; display:flex; align-items:center; gap:9px;
  font-family:var(--mono); font-size:10px; color:rgba(255,255,255,.45);
  border-bottom:1px solid rgba(139,92,246,.08);
}
.q-trail-item::before { content:'›'; color:#8b5cf6; font-size:14px; font-weight:800; }
.q-exec-summary {
  padding:16px 18px; background:rgba(0,0,0,.3); border-top:1px solid rgba(139,92,246,.15);
  font-size:11.5px; color:rgba(255,255,255,.5); line-height:1.8; font-style:italic;
}

/* FUSION STATUS BAR */
.q-fusion-bar {
  display:flex; align-items:center; gap:8px; padding:8px 18px;
  background:rgba(0,0,0,.2); border-bottom:1px solid rgba(139,92,246,.1); flex-wrap:wrap;
}
.q-fusion-chip {
  display:inline-flex; align-items:center; gap:5px; padding:3px 10px;
  border-radius:20px; font-family:var(--mono); font-size:8px; font-weight:800; letter-spacing:.8px;
}

/* LAYER DETAILS EXPAND */
.q-layer-det {
  margin-top:6px; padding:8px 10px; border-radius:7px;
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06);
  display:grid; grid-template-columns:1fr 1fr; gap:4px 12px;
}
.q-layer-det-item { font-family:var(--mono); font-size:8px; color:rgba(255,255,255,.4); line-height:1.7; }
.q-layer-det-item span { color:rgba(255,255,255,.7); font-weight:700; }

/* CONF DISPLAY */
.q-conf-display { display:flex; align-items:center; gap:16px; }
.q-conf-num { font-family:var(--mono); font-size:36px; font-weight:900; letter-spacing:-2px; line-height:1; }
.q-conf-label { font-family:var(--mono); font-size:8px; color:rgba(255,255,255,.35); letter-spacing:1.5px; margin-top:4px; }

/* RR LADDER */
.q-rr-ladder { display:flex; flex-direction:column; gap:1px; }
.q-rr-row { display:flex; align-items:center; gap:10px; padding:11px 18px; border-bottom:1px solid rgba(139,92,246,.08); }
.q-rr-badge { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-size:10px; font-weight:900; flex-shrink:0; }
.q-rr-info { flex:1; }
.q-rr-price { font-family:var(--mono); font-size:16px; font-weight:900; line-height:1; }
.q-rr-meta { font-family:var(--mono); font-size:9px; color:rgba(255,255,255,.4); margin-top:3px; }
.q-rr-right { text-align:right; }
.q-rr-ratio { font-family:var(--mono); font-size:13px; font-weight:800; }
.q-rr-close { font-family:var(--mono); font-size:8px; color:rgba(255,255,255,.35); margin-top:2px; }

/* MOBILE */
.desk { display:flex; }
.mob  { display:none; }
.mob-nav { display:none; }
.mob-blk { display:none; }
.mob-ticker-sel { display:none; }

@media(max-width:1100px) {
  .layout { display:block; overflow:visible; height:auto; }
  .workspace { flex-direction:column; overflow:visible; display:block; }
  .sidebar-l, .sidebar-r { display:none; }
  .main { overflow:visible; padding:12px; padding-bottom:80px; background-image:none; }
  .desk { display:none; }
  .mob  { display:flex; }
  .mob-bar { display:flex; overflow-x:auto; gap:6px; padding-bottom:8px; scrollbar-width:none; }
  .mob-bar::-webkit-scrollbar { display:none; }
  .mob-nav {
    display:flex; position:fixed; bottom:0; left:0; right:0; z-index:200;
    background:rgba(6,12,24,.97); backdrop-filter:blur(20px);
    border-top:1px solid rgba(26,46,74,.9); height:60px;
    box-shadow:0 -4px 28px rgba(0,0,0,.6), 0 -1px 0 rgba(59,130,246,.15);
  }
  .mob-btn {
    flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:4px; border:none; background:transparent; cursor:pointer;
    font-family:var(--mono); font-size:8px; font-weight:700; letter-spacing:.8px;
    color:var(--t3); transition:.15s; text-transform:uppercase;
  }
  .mob-btn.on { color:var(--accent); }
  .mob-btn.on svg { filter:drop-shadow(0 0 5px rgba(59,130,246,.7)); }
  .ticket-grid { grid-template-columns:1fr 1fr; }
  .tc { border-right:none; }
  .ind-grid { grid-template-columns:1fr 1fr !important; }
}

@media(max-width:640px) {
  .main { padding:10px; padding-bottom:72px; }
  .topbar { padding:0 12px; }
  .btn-exec { padding:10px 14px; font-size:10px; }
  .ticket-grid { grid-template-columns:1fr; }
  .ind-grid { grid-template-columns:1fr 1fr; }
  .mob-btn { min-width: 0; }
  .mob-nav { height: 56px; }
  .mob-blk  { display: block; }
  .mob-hide { display: none !important; }
  .mob-ticker-sel {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    background: rgba(0,212,255,.05); border: 1px solid rgba(0,212,255,.20);
    border-radius: 9px; padding: 9px 14px; margin-bottom: 12px;
    -webkit-tap-highlight-color: transparent;
  }
  .mob-ticker-sel:active { background: rgba(0,212,255,.10); }
  .mob-coins-sticky {
    position: sticky; top: 0; z-index: 50; background: var(--bg); padding: 10px 0 6px;
  }
  .mob-coin-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,.04);
    cursor: pointer; transition: background .12s; -webkit-tap-highlight-color: transparent;
  }
  .mob-coin-item:active { background: rgba(0,212,255,.05); }
  .mob-coin-item.sel { background: rgba(0,212,255,.06); border-left: 2px solid var(--accent); padding-left: 12px; }
  .mob-cat-bar { display: flex; overflow-x: auto; gap: 6px; padding-bottom: 8px; scrollbar-width: none; }
  .mob-cat-bar::-webkit-scrollbar { display: none; }
  .ph { padding:8px 12px; }
  .q-tabs { padding:3px 10px; }
  .q-tab { padding:6px 6px; font-size:8px; }
}

/* ═══ MOBILE PROFILE PAGE ══════════════════════════════════════════ */
.mob-profile { display:none; flex-direction:column; }
@media(max-width:1100px) { .mob-profile { display:flex; } }

/* avatar glow animation */
@keyframes avatar-glow { 0%,100%{box-shadow:0 0 20px var(--av-glow);} 50%{box-shadow:0 0 35px var(--av-glow), 0 0 60px var(--av-glow-outer);} }

/* plan tier feature items */
.mp-feature { display:flex; align-items:center; gap:8px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,.04); }
.mp-feature:last-child { border-bottom:none; }

/* ═══ MARKET MAKER PANEL ═══════════════════════════════════════════ */
.mm-panel { border-bottom:1px solid var(--border); }
.mm-top   { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 18px 8px; flex-wrap:wrap; }
.mm-phase-badge { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.mm-chips4 { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--border); }
.mm-chip   { background:var(--panel); padding:9px 12px; }
.mm-detail { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); }
.mm-col    { background:var(--card); padding:10px 14px; }
.mm-prob   { padding:10px 18px; border-top:1px solid var(--border); }
.mm-prob-bars { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-top:6px; }
.mm-l7row  { display:flex; align-items:center; justify-content:space-between; padding:8px 18px; border-top:1px solid var(--border); flex-wrap:wrap; gap:6px; }

@media(max-width:900px) {
  .mm-chips4 { grid-template-columns:1fr 1fr; }
  .mm-detail { grid-template-columns:1fr; }
  .mm-prob-bars { grid-template-columns:1fr 1fr; }
}
@media(max-width:600px) {
  .mm-top    { padding:9px 13px 7px; }
  .mm-col    { padding:9px 12px; }
  .mm-prob   { padding:9px 13px; }
  .mm-l7row  { padding:7px 13px; }
  .mm-prob-bars { grid-template-columns:1fr 1fr; }
}

/* ═══ ANALYSIS PANEL — PROFESSIONAL MOBILE RESPONSIVE ═══════════════ */

/* Ana iki kolon (katmanlar + setup) */
.ua-main-grid {
  display:grid; grid-template-columns:1fr 1fr;
  border-bottom:1px solid var(--border);
}
.ua-left-col  { padding:14px 18px; border-right:1px solid var(--border); }
.ua-right-col { padding:14px 18px; }

/* Market data satırı */
.ua-market-row {
  padding:12px 18px;
  display:grid;
  grid-template-columns:minmax(90px,auto) 1fr 1fr auto;
  gap:8px; align-items:start;
}
.ua-futures-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px; }

/* R:R mini grid */
.ua-rr-mini {
  display:grid; grid-template-columns:repeat(4,1fr);
  gap:1px; background:var(--border);
  margin-top:8px; border-radius:5px; overflow:hidden;
}

/* Meta quantum chips */
.ua-meta-grid {
  padding:12px 18px;
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
  gap:5px;
}

/* Kurumsal bölge kartları */
.ua-zones-grid {
  padding:10px 18px;
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
  gap:6px;
}

/* Market chips (3-kolon) */
.ua-mkt-chips { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }

/* Entry zone LOW·MID·HIGH */
.ua-entry-zone {
  background:rgba(16,185,129,.06); border:1px solid rgba(16,185,129,.2);
  border-radius:6px; padding:8px 12px; margin-bottom:8px;
}
.ua-entry-lmh { display:flex; justify-content:space-between; align-items:baseline; gap:4px; }

/* ── TABLET (≤900px) ── */
@media(max-width:900px) {
  .ua-main-grid { grid-template-columns:1fr; }
  .ua-left-col  { border-right:none; border-bottom:1px solid var(--border); }
  .ua-market-row { grid-template-columns:1fr 1fr; row-gap:10px; }
  .ua-mkt-chips  { grid-template-columns:1fr 1fr; }
}

/* ── MOBILE (≤600px) ── */
@media(max-width:600px) {
  .ua-left-col, .ua-right-col { padding:10px 12px; }
  .ua-market-row { grid-template-columns:1fr 1fr; padding:9px 12px; }
  .ua-zones-grid { grid-template-columns:1fr; padding:8px 12px; }
  .ua-rr-mini    { grid-template-columns:1fr 1fr; }
  .ua-mkt-chips  { grid-template-columns:1fr 1fr; }
  .ua-entry-lmh  { flex-direction:column; gap:6px; }

  /* KV satırları — mobilde üst-alta */
  .kv-row { flex-direction:column; gap:2px; padding:6px 11px; }
  .kv-k   { font-size:8px; flex-shrink:1; white-space:normal; }
  .kv-v   { max-width:100%; text-align:left; font-size:9px; }
  .txt-row { padding:5px 10px; }
  .txt-content { font-size:11px; line-height:1.65; }
  .ablock-head { padding:6px 10px 5px; }
  .ablock { margin:6px 8px 0; }
  .report-header { padding:9px 12px; }
}

/* SMC 3-col grid rows */
.ua-smc-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:1px; background:var(--border); }

/* 2-col optional layout (PA patterns / manipulation / timing / futures) */
.ua-dual-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
.ua-dual-grid.ua-single { grid-template-columns:1fr; }

/* Bottom stats 4-col */
.ua-stats4-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--border); }

/* Header panel */
.ua-header      { padding:14px 18px; border-bottom:1px solid var(--border); }
.ua-header-top  { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
.ua-verdict     { font-family:var(--mono); font-size:28px; font-weight:900; letter-spacing:-.5px; line-height:1; }
.ua-metric-chips{ display:flex; gap:6px; flex-wrap:wrap; align-items:flex-start; }

/* ── RESPONSIVE BREAKPOINTS ── */
@media(max-width:900px) {
  .ua-header-top  { gap:8px; }
  .ua-dual-grid   { grid-template-columns:1fr !important; }
  .ua-smc-grid    { grid-template-columns:1fr 1fr; }
}
@media(max-width:600px) {
  .ua-header      { padding:12px 13px; }
  .ua-verdict     { font-size:20px; }
  .ua-metric-chips{ gap:4px; }
  .ua-smc-grid    { grid-template-columns:1fr; }
  .ua-stats4-grid { grid-template-columns:1fr 1fr; }
}
@media(max-width:400px) {
  .ua-verdict     { font-size:17px; }
  .ua-market-row  { grid-template-columns:1fr; }
  .ua-rr-mini     { grid-template-columns:1fr 1fr; }
  .ua-stats4-grid { grid-template-columns:1fr 1fr; }
}
/* ═══ GLOBAL MOBILE POLISH ════════════════════════════════════════ */
@media(max-width:1100px) {
  .topbar { padding:0 14px; min-height:52px; }
}
@media(max-width:640px) {
  .topbar { padding:0 10px; min-height:48px; gap:6px !important; }
  .main { padding:8px 8px 72px; }
  .q-header { padding:10px 14px; }
  .ua-header-top { padding:10px 13px; }
  .ua-left-col, .ua-right-col { padding:12px 13px; }
  .ua-market-row { padding:10px 13px; }
  .mm-top { padding:8px 12px; }
}
@media(max-width:380px) {
  .topbar { padding:0 8px; }
  .main { padding:6px 6px 70px; }
  .ua-entry-lmh { grid-template-columns:1fr !important; }
}
`;

// ── INSTITUTIONAL ALPHA PANEL ──────────────────────────────────
function InstitutionalAlphaPanel({ apiData }) {
  const ia  = apiData.institutionalAlpha || {};
  const orth = ia.orthogonalScore || {};
  const bay  = ia.bayesianRegime  || {};
  const alph = ia.alphaModel      || {};
  const dyn  = ia.dynamicSizing   || {};
  const strat = ia.adaptiveStrategy || {};
  const ms   = apiData.microstructure || {};
  const vr   = ms.volatilityRegime || {};
  const of_  = ms.orderFlowImbalance || {};
  const vwap = ms.vwapDeviation || {};
  const ou   = (apiData.stochasticModels || {}).ouProcess || {};
  const ar   = apiData.advancedRisk || {};
  const cv   = ar.cvar || {};
  const sent = ar.sentiment || {};

  if (!ia.orthogonalScore && !ia.bayesianRegime) return null;

  const C = { green:'#10B981', red:'#EF4444', gold:'#F59E0B', blue:'#38BDF8', purple:'#A78BFA', cyan:'#00FFB2', orange:'#F97316' };
  const pUp = alph.probabilityUp || 50;
  const pCol = pUp > 62 ? C.green : pUp < 38 ? C.red : C.gold;
  const edgeCol = alph.edge?.includes('STRONG') ? C.cyan : alph.edge?.includes('MODERATE') ? C.gold : '#6B7280';
  const bayColor = bay.dominant === 'BULL_TREND' ? C.green : bay.dominant === 'BEAR_TREND' ? C.red : bay.dominant === 'BREAKOUT' ? C.gold : C.blue;
  const sentColor = sent.regime === 'EXTREME_GREED' ? C.red : sent.regime === 'EXTREME_FEAR' ? C.green : sent.regime === 'GREED' ? C.orange : sent.regime === 'FEAR' ? C.blue : C.gold;
  const vrColor = vr.regime === 'EXTREME' ? C.red : vr.regime === 'HIGH' ? C.orange : vr.regime === 'LOW' ? C.cyan : C.gold;
  const domScores = orth.domainScores || {};

  return (
    <div style={{ borderBottom:'1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderBottom:'1px solid var(--border)', background:'rgba(0,255,178,.03)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:C.cyan, fontWeight:900 }}>◆</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:7.5, fontWeight:800, color:C.cyan, letterSpacing:1.2 }}>INSTITUTIONAL ALPHA ENGINE v2.0</span>
        </div>
        {alph.edge && (
          <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:edgeCol, background:`${edgeCol}12`, border:`1px solid ${edgeCol}30`, borderRadius:4, padding:'2px 9px' }}>
            {alph.edge?.replace(/_/g,' ')}
          </span>
        )}
      </div>

      {/* Row 1: Alpha Model + Bayesian */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'var(--border)' }}>
        {/* Alpha Factor Model */}
        <div style={{ background:'var(--panel)', padding:'10px 14px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)', letterSpacing:.8, marginBottom:6 }}>ALPHA FACTOR MODEL — P(↑/↓)</div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)' }}>P(YUKARI)</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:900, color:pCol, lineHeight:1 }}>{pUp}%</div>
            </div>
            <div style={{ flex:1, height:6, background:'var(--bg)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pUp}%`, background:`linear-gradient(90deg,${pUp>50?C.green:C.red}60,${pUp>50?C.green:C.red})`, borderRadius:3, transition:'width .6s' }} />
            </div>
            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)' }}>P(AŞAĞI)</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:800, color:C.red }}>{alph.probabilityDn||0}%</div>
            </div>
          </div>
          {alph.contributions?.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {alph.contributions.map((c, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:7 }}>
                  <span style={{ color:'var(--t3)' }}>{c.name}</span>
                  <span style={{ color: c.value > 0 ? C.green : C.red, fontWeight:700 }}>{c.value > 0 ? '+' : ''}{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bayesian Regime */}
        <div style={{ background:'var(--panel)', padding:'10px 14px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)', letterSpacing:.8, marginBottom:6 }}>BAYESIAN REJİM SINIFLANDIRICI</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:900, color:bayColor, marginBottom:4 }}>
            {(bay.dominant||'?').replace(/_/g,' ')}
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', marginBottom:6 }}>
            Güven: {bay.confidence||0} puan
          </div>
          {bay.probabilities && Object.entries(bay.probabilities).map(([k, v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)', width:80, flexShrink:0 }}>{k.replace(/_/g,' ')}</div>
              <div style={{ flex:1, height:3, background:'var(--bg)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${v}%`, background: k === bay.dominant ? bayColor : 'var(--t4)', borderRadius:2 }} />
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color: k === bay.dominant ? bayColor : 'var(--t3)', fontWeight: k === bay.dominant ? 800 : 400, width:28, textAlign:'right' }}>{v}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Orthogonal Score + Dynamic Sizing */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'var(--border)' }}>
        {/* Orthogonal Signal Score */}
        <div style={{ background:'var(--card)', padding:'10px 14px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)', letterSpacing:.8, marginBottom:6 }}>ORTOGONAl SİNYAL SKORU — bağımsız alanlar</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:900, color: (orth.independentConfirmations||0) >= 4 ? C.green : (orth.independentConfirmations||0) >= 3 ? C.gold : C.red }}>
              {orth.independentConfirmations||0}<span style={{ fontSize:10, color:'var(--t3)' }}>/5</span>
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>bağımsız<br/>alan</div>
          </div>
          {Object.entries(domScores).map(([k, v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)', width:55, flexShrink:0, textTransform:'uppercase' }}>{k}</div>
              <div style={{ flex:1, height:3, background:'var(--bg)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(100, v/25*100)}%`, background:C.cyan, borderRadius:2 }} />
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:C.cyan, width:18, textAlign:'right', fontWeight:700 }}>{v}</div>
            </div>
          ))}
          {orth.conflictPenalty > 0 && (
            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:C.red, marginTop:4 }}>Çakışma cezası: -{orth.conflictPenalty}</div>
          )}
        </div>

        {/* Dynamic Sizing */}
        <div style={{ background:'var(--card)', padding:'10px 14px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)', letterSpacing:.8, marginBottom:6 }}>DİNAMİK POZİSYON BOYUTU — CVaR×Rejim×Edge</div>
          <div style={{ display:'flex', gap:6, marginBottom:6 }}>
            <div style={{ background:`${C.cyan}10`, border:`1px solid ${C.cyan}25`, borderRadius:5, padding:'5px 10px' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)' }}>RİSK</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:900, color:C.cyan }}>%{dyn.recommendedSizePct||0}</div>
            </div>
            <div style={{ background:`${C.gold}10`, border:`1px solid ${C.gold}25`, borderRadius:5, padding:'5px 10px' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)' }}>KALDIRAÇ</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:900, color:C.gold }}>{dyn.recommendedLeverage||5}x</div>
            </div>
            <div style={{ background:`${C.red}10`, border:`1px solid ${C.red}25`, borderRadius:5, padding:'5px 10px' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)' }}>MAX DD</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:900, color:C.red }}>%{dyn.maxDrawdown||0}</div>
            </div>
          </div>
          {dyn.multipliers && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
              {Object.entries(dyn.multipliers).map(([k,v]) => (
                <div key={k} style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)' }}>
                  {k.toUpperCase()}: <span style={{ color: v >= 1 ? C.green : C.red }}>{v}×</span>
                </div>
              ))}
            </div>
          )}
          {strat.optimalStrategy && (
            <div style={{ marginTop:5, fontFamily:'var(--mono)', fontSize:7, color:C.cyan, background:`${C.cyan}08`, padding:'3px 6px', borderRadius:3 }}>
              ⚡ {strat.optimalStrategy?.replace(/_/g,' ')}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Microstructure chips */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'var(--border)' }}>
        {[
          { lbl:'VOL REJİM',    val:vr.regime||'—',                col:vrColor,   sub:`${vr.percentile||0}lik · ${vr.trend||'—'}` },
          { lbl:'ORDER FLOW',   val:of_.dominantSide||'—',          col: of_.dominantSide==='BUY'?C.green:of_.dominantSide==='SELL'?C.red:C.gold, sub:`${of_.absorbed?'ABSORPTION ⚡':`${Math.abs(of_.imbalance||0).toFixed(1)}% imb`}` },
          { lbl:'VWAP SAPMA',   val:vwap.signal?.replace(/_/g,' ')||'—', col:vwap.zScore>2?C.red:vwap.zScore<-2?C.green:C.gold, sub:`Z=${vwap.zScore||0}σ ${vwap.deviationPct||0}%` },
          { lbl:'OU REVERSION', val:ou.reversionSignal?'AKTİF ⚡':'Yok', col:ou.reversionSignal?C.cyan:'#6B7280', sub:`HL=${ou.halfLife||'—'} Z=${ou.zScore||0}` },
          { lbl:'CVaR 95%',     val:`%${cv.cvar95||0}`,             col: (cv.cvar95||0)>6?C.red:(cv.cvar95||0)>3?C.orange:C.green, sub:cv.risk||'LOW' },
          { lbl:'SENTİMENT',    val:sent.regime?.replace(/_/g,' ')||'—', col:sentColor, sub:sent.contrarianSignal||`skor:${sent.score||0}` },
          { lbl:'STRATEJİ',     val:strat.optimalStrategy?.replace(/_/g,' ')||'—', col:C.purple, sub:strat.targetHoldingPeriod||'—' },
          { lbl:'FLOW HİZA',    val:strat.flowAligned?'UYUMLU ✓':'ÇAKIŞMIYOR ✗', col:strat.flowAligned?C.green:C.red, sub:`Güven:${bay.confidence||0}p` },
        ].map(({ lbl, val, col, sub }) => (
          <div key={lbl} style={{ background:'var(--panel)', padding:'8px 10px' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)', letterSpacing:.4, marginBottom:2 }}>{lbl}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:col, marginBottom:1 }}>{val}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Adaptive Strategy details */}
      {strat.optimalStrategy && strat.optimalStrategy !== 'WAIT_FOR_SIGNAL' && (
        <div style={{ padding:'8px 16px', borderTop:'1px solid var(--border)', background:'rgba(0,255,178,.02)' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:7, color:C.cyan, fontWeight:800, marginBottom:3 }}>⚡ {strat.optimalStrategy?.replace(/_/g,' ')} — {strat.entryStyle}</div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>Tutma: <span style={{ color:'var(--t2)' }}>{strat.targetHoldingPeriod}</span></div>
            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>Stop: <span style={{ color:'var(--t2)' }}>{strat.stopType}</span></div>
          </div>
          {strat.notes && <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:2 }}>{strat.notes}</div>}
        </div>
      )}
    </div>
  );
}

// ── MARKET MAKER PANEL ─────────────────────────────────────────
function MarketMakerPanel({ apiData, isLong, vm }) {
  const iflow = apiData.layers?.institutionalFlow || {};
  const wyc   = apiData.layers?.wyckoffContext    || {};
  const liq   = apiData.layers?.liquiditySMC      || {};
  const pv    = apiData.probabilityVector || {};
  const clp   = apiData.clp      || {};
  const smfi  = apiData.smfi     || {};
  const fh    = apiData.fractalHarmony || {};
  const kelly = apiData.adaptiveKelly  || {};
  const manip = apiData.manipulation   || {};
  const q     = apiData.quantum  || {};
  const C     = { green:'#10B981', red:'#EF4444', blue:'#38BDF8', purple:'#A78BFA', gold:'#FBBF24', orange:'#F97316', cyan:'#00D4FF' };

  // Derive MM Model Phase
  const mmPhase = (() => {
    const spring   = wyc.spring;
    const upthrust = wyc.upthrust;
    const disp     = iflow.dispBullish || iflow.dispBearish;
    const wPhase   = wyc.phase || '';
    if (spring)   return { label:'SPRING — ALIM BÖLGE', color:C.green,  icon:'⚡', model:'MARKET MAKER BUY MODEL',  desc:'Kurumsal birikim tamamlanıyor — stop hunt altı gerçekleşti' };
    if (upthrust) return { label:'UPTHRUST — DAĞITIM', color:C.red,    icon:'⚠', model:'MARKET MAKER SELL MODEL', desc:'Kurumsal dağıtım aktif — stop hunt üstü gerçekleşti' };
    if (iflow.dispBullish && isLong) return { label:'BULL DİSPLASMAN', color:C.green, icon:'◈', model:'MARKET MAKER BUY MODEL',  desc:'Kurumsal alım displasmanı — güçlü momentum onayı' };
    if (iflow.dispBearish && !isLong) return { label:'BEAR DİSPLASMAN', color:C.red,  icon:'◈', model:'MARKET MAKER SELL MODEL', desc:'Kurumsal satım displasmanı — güçlü momentum onayı' };
    if (wPhase.includes('ACCUMULATION')) return { label:'WYCKOFF BIRIKIM', color:C.blue, icon:'◎', model:'MARKET MAKER BUY MODEL', desc:'Birikim fazı — kurumsal alım tespiti' };
    if (wPhase.includes('DISTRIBUTION')) return { label:'WYCKOFF DAĞITIM', color:C.orange, icon:'◎', model:'MARKET MAKER SELL MODEL', desc:'Dağıtım fazı — kurumsal satım tespiti' };
    if (wPhase.includes('MARKUP'))  return { label:'MARKUP TREND',   color:C.green,  icon:'▲', model:'MARKET MAKER BUY MODEL',  desc:'Kurumsal fiyat yükseltme fazı aktif' };
    if (wPhase.includes('MARKDOWN')) return { label:'MARKDOWN TREND', color:C.red,   icon:'▼', model:'MARKET MAKER SELL MODEL', desc:'Kurumsal fiyat düşürme fazı aktif' };
    return { label:'RANGING — BEKLEME', color:C.gold, icon:'◆', model:'MM MODEL BELİRSİZ', desc:'Net kurumsal yön henüz oluşmadı — kırılım için bekle' };
  })();

  // PO3 (Power of 3) phase
  const po3Phase = (() => {
    if (wyc.spring || iflow.optimalBuy)   return { label:'MANİPÜLASYON → DAĞITIM', color:C.green,  pct:70 };
    if (wyc.upthrust || iflow.optimalSell) return { label:'MANİPÜLASYON → DAĞITIM', color:C.red,    pct:70 };
    const score = q.score || 50;
    if (score >= 75) return { label:'BIRIKIM TAMAMLANDI', color:C.blue,  pct:85 };
    if (score >= 55) return { label:'MANİPÜLASYON FAZINDA', color:C.gold, pct:50 };
    return { label:'BİRİKİM DEVAM', color:'#6B7280', pct:30 };
  })();

  // SMD interpretation
  const smdLabel = iflow.smd4hBull ? 'AKILLI PARA BİRİKİYOR (4H)' :
                   iflow.smd4hBear ? 'AKILLI PARA DAĞITIYOR (4H)' :
                   iflow.smd1dBull ? 'AKILLI PARA BİRİKİYOR (1D)' :
                   iflow.smd1dBear ? 'AKILLI PARA DAĞITIYOR (1D)' : 'NÖTR — NET SINYAL YOK';
  const smdColor = (iflow.smd4hBull || iflow.smd1dBull) ? C.green :
                   (iflow.smd4hBear || iflow.smd1dBear) ? C.red : '#6B7280';

  // CLP bars
  const bCLP = clp.bullCLP || 0;
  const eCLP = clp.bearCLP || 0;

  // Prob bars
  const probBars = [
    { lbl:'TREND YÜKSELİŞ', val:pv.trendUp||0,      col:C.green },
    { lbl:'TREND DÜŞÜŞ',    val:pv.trendDown||0,     col:C.red },
    { lbl:'MEAN REV',       val:pv.meanReversion||0,  col:C.gold },
    { lbl:'VOL PATLAMA',    val:pv.volExpansion||0,   col:C.purple },
  ];

  const smfiColor = (smfi.value||50) >= 65 ? C.green : (smfi.value||50) <= 35 ? C.red : C.gold;
  const clpColor  = (clp.score||0) >= 65 ? C.red : (clp.score||0) >= 40 ? C.orange : C.green;
  const fhPct     = Math.round((fh.score||0) * 100);
  const fhColor   = fhPct >= 70 ? C.green : fhPct >= 45 ? C.gold : C.red;
  const kellyPct  = kelly.adaptiveKelly || 0;
  const kellyColor= kellyPct >= 6 ? C.green : kellyPct >= 3 ? C.gold : C.red;

  return (
    <div className="mm-panel">
      {/* ── TOP: MM Model + PO3 + Wyckoff Phase ── */}
      <div className="mm-top">
        <div className="mm-phase-badge">
          <span style={{ fontFamily:'var(--mono)', fontSize:20, color:mmPhase.color }}>{mmPhase.icon}</span>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:1.2, marginBottom:2, textTransform:'uppercase' }}>Market Maker Model</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:900, color:mmPhase.color, letterSpacing:.3 }}>{mmPhase.model}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', marginTop:2, lineHeight:1.4 }}>{mmPhase.desc}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:800, color:mmPhase.color, background:`${mmPhase.color}12`, border:`1px solid ${mmPhase.color}28`, borderRadius:5, padding:'3px 10px' }}>{mmPhase.label}</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:po3Phase.color, background:`${po3Phase.color}08`, border:`1px solid ${po3Phase.color}20`, borderRadius:4, padding:'2px 8px' }}>PO3 · {po3Phase.label}</div>
        </div>
      </div>

      {/* ── 4 KPI Chips: SMFI, CLP, Fractal, Kelly ── */}
      <div className="mm-chips4">
        {[
          { lbl:'SMFI', val:`${smfi.value||'—'}/100`, sub: smfi.interpretation||'—', col:smfiColor },
          { lbl:'CLP',  val:`${clp.score||'—'}/100`,  sub: clp.risk||'—',            col:clpColor  },
          { lbl:'FRAKTAL', val:`${fhPct}%`,            sub: fh.metaEdgeActive?'META-EDGE ⚡':fh.interpretation||'—', col:fhColor },
          { lbl:'KELLY',   val:`%${kellyPct}`,         sub:`Risk/Trade: %${kelly.recommendedRiskPct||2}`, col:kellyColor },
        ].map(({ lbl, val, sub, col }) => (
          <div key={lbl} className="mm-chip">
            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.8, marginBottom:3, textTransform:'uppercase' }}>{lbl}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:900, color:col, lineHeight:1.1 }}>{val}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:3, lineHeight:1.3 }}>{sub}</div>
          </div>
        ))}
      </div>


      {/* ── PROBABILITY VECTOR ── */}
      {(pv.trendUp || pv.trendDown) ? (
        <div className="mm-prob">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:7.5, fontWeight:700, color:'var(--t2)', letterSpacing:.8 }}>◉ OLASILIK VEKTÖRÜ — 4 SENARYO</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:vm.color }}>
              DOM: {pv.dominant||'—'}
            </span>
          </div>
          <div className="mm-prob-bars">
            {probBars.map(({ lbl, val, col }) => (
              <div key={lbl}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)' }}>{lbl}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:col }}>%{val}</span>
                </div>
                <div style={{ height:4, background:'var(--bg)', borderRadius:2, overflow:'hidden', border:`1px solid ${col}20` }}>
                  <div style={{ height:'100%', width:`${val}%`, background:`linear-gradient(90deg,${col}50,${col})`, borderRadius:2, transition:'width .6s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── L7 Summary row ── */}
      <div className="mm-l7row">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { lbl:'WYCKOFF',   val: wyc.phase||'—',   col:'#C084FC' },
            { lbl:'SWEEP',     val: liq.liquiditySweep ? '⚡ TESPİT EDİLDİ' : '— YOK', col: liq.liquiditySweep ? C.gold : '#6B7280' },
            { lbl:'HTF BİAS',  val: apiData.layers?.marketStructure?.htfBias||'—', col:C.blue },
          ].map(({ lbl, val, col }) => (
            <div key={lbl} style={{ background:`${col}10`, border:`1px solid ${col}25`, borderRadius:4, padding:'3px 9px' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t3)', marginRight:5 }}>{lbl}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:col }}>{val}</span>
            </div>
          ))}
        </div>
        {fh.metaEdgeActive && (
          <div style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:C.cyan, background:'rgba(0,212,255,.08)', border:'1px solid rgba(0,212,255,.25)', borderRadius:4, padding:'3px 10px', animation:'pulse 1.5s infinite' }}>
            ◈ META-EDGE AKTİF
          </div>
        )}
      </div>
    </div>
  );
}

// ── UNIFIED ANALYSIS PANEL ─────────────────────────────────────
function UnifiedAnalysisPanel({ apiData, coin, blocks, isLong, vm, onChartOpen }) {
  if (!apiData) return null;

  const q   = apiData.quantum  || {};
  const s   = apiData.setup    || {};
  const lay = apiData.layers   || {};
  const lev = apiData.leverage || {};
  const cur = parseFloat((apiData.current_price || '').replace(/[$,]/g, '')) || 0;
  const diffPct = (v) => {
    const n = parseFloat(String(v || '').replace(/[$,]/g, ''));
    if (!n || !cur) return '';
    const d = ((n - cur) / cur * 100);
    return `${d > 0 ? '+' : ''}${d.toFixed(2)}%`;
  };
  const C = { green:'#10B981', red:'#EF4444', gold:'#F59E0B', blue:'#3B82F6', purple:'#A78BFA', cyan:'#00D4FF', orange:'#F97316' };

  const wr = q.winRate ?? apiData.engine?.winRate ?? 0;
  const wrCol = wr >= 80 ? C.green : wr >= 68 ? C.blue : '#6b7280';
  const dirCol = apiData.trade_direction === 'LONG' ? C.green : apiData.trade_direction === 'SHORT' ? C.red : '#f59e0b';
  const dirLabel = apiData.trade_direction === 'WAIT' ? 'BEKLE' : apiData.trade_direction || 'NEUTRAL';

  const SectionHeader = ({ icon, label, color }) => (
    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderBottom:'1px solid var(--border)', background:`${color}05` }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:10, color, fontWeight:900 }}>{icon}</span>
      <span style={{ fontFamily:'var(--mono)', fontSize:7.5, fontWeight:800, color, letterSpacing:1.2 }}>{label}</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}25,transparent)` }} />
    </div>
  );

  const Chip = ({ lbl, val, col }) => (
    <div style={{ background:'var(--card2)', borderRadius:5, padding:'7px 10px', border:'1px solid var(--border)' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:3, letterSpacing:.4 }}>{lbl}</div>
      <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:800, color:col||'var(--t1)' }}>{val}</div>
    </div>
  );

  return (
    <div style={{ background:'var(--card)', border:`1px solid ${vm.color}20`, borderRadius:12, overflow:'hidden', marginBottom:16, animation:'slide-up .35s ease', boxShadow:`0 8px 40px rgba(0,0,0,.35), 0 0 0 1px ${vm.color}10` }}>

      {/* ═══ RAINBOW BAR ════════════════════════════════════════════ */}
      <div style={{ height:3, background:`linear-gradient(90deg,${vm.color},#7C3AED,#00D4FF,#10B981,#F59E0B)` }} />

      {/* ═══ HEADER — Sinyal + Metrik Bar ═══════════════════════════ */}
      <div className="ua-header" style={{ background:vm.bg }}>
        <div className="ua-header-top">
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:1.5, marginBottom:5 }}>
              DEEP TRADE SCAN v5.0 · META QUANTUM ENGINE v12 · {coin}/USDT
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div className="ua-verdict" style={{ color:vm.color }}>
                {vm.icon} {vm.label}
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:900, padding:'4px 14px', borderRadius:6,
                background:`${dirCol}18`, color:dirCol, border:`1px solid ${dirCol}40`, letterSpacing:.5 }}>
                {dirLabel === 'LONG' ? '▲' : dirLabel === 'SHORT' ? '▼' : '◆'} {dirLabel}
              </div>
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', marginTop:5 }}>{vm.tagline}</div>
          </div>
          <div className="ua-metric-chips">
            {[
              { lbl:'SCORE',    val:`${apiData.confidence_score}/100`, col:vm.color },
              { lbl:'GRADE',    val:`${apiData.engine?.grade||'—'}`,   col: apiData.engine?.grade==='S+'?'#00FFB2':apiData.engine?.grade==='S'?C.green:'#FBBF24' },
              { lbl:'WIN RATE', val:`${wr}%`,                           col:wrCol },
              { lbl:'KALDIRAÇ', val: lev?.moderate ? `${lev.moderate}x` : '5x', col:'#F59E0B' },
            ].map(({ lbl, val, col }) => (
              <div key={lbl} style={{ textAlign:'center', background:`${col}10`, border:`1px solid ${col}30`, borderRadius:7, padding:'6px 11px', minWidth:58 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:3 }}>{lbl}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:17, fontWeight:900, color:col, lineHeight:1 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Confluence bar */}
        <div style={{ marginTop:8 }}>
          <div style={{ height:4, background:'var(--bg)', borderRadius:2, overflow:'hidden', border:'1px solid var(--border)' }}>
            <div style={{ height:'100%', width:`${apiData.confidence_score}%`, background:`linear-gradient(90deg,${vm.color}70,${vm.color})`, borderRadius:2, transition:'width .7s ease' }} />
          </div>
        </div>
      </div>

      {/* ═══ MARKET MAKER ANALİZİ — hidden per user request ═══════════ */}
      {/* <MarketMakerPanel apiData={apiData} isLong={isLong} vm={vm} /> */}

      {/* ═══ INSTITUTIONAL ALPHA ENGINE v2.0 — hidden from UI, data flows to setup ═══ */}
      {/* <InstitutionalAlphaPanel apiData={apiData} /> */}

      {/* ═══ GRID: Kurumsal Setup ═══════════════════════════════════ */}
      <div className="ua-main-grid" style={{ gridTemplateColumns:'1fr' }}>

        {/* SOL — 4 Katman bar — hidden per user request */}
        {false && <div className="ua-left-col">
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:1, marginBottom:10 }}>7-KATMAN CONFLUENCE ANALİZİ</div>
          {[
            { id:'L1', lbl:'PIYASA YAPISI',  key:'marketStructure', col:C.blue,   max:25,
              detail: lay.marketStructure ? `EMA:${lay.marketStructure.emaAligned?'✓':'✗'} · ADX:${(lay.marketStructure.adxStrength||0).toFixed(0)} · ${(lay.marketStructure.bosType||'NONE').replace(/_/g,' ')}` : '' },
            { id:'L2', lbl:'LİKİDİTE/SMC',   key:'liquiditySMC',    col:C.purple, max:30,
              detail: lay.liquiditySMC ? `${lay.liquiditySMC.inOB?'OB İçinde':'OB Dışı'} · FVG+OB:${lay.liquiditySMC.fvgOBOverlap?'✓':'✗'} · ${lay.liquiditySMC.liquiditySweep?'LiqSweep ⚡':''}` : '' },
            { id:'L3', lbl:'MOMENTUM',        key:'momentum',        col:C.gold,   max:25,
              detail: lay.momentum ? `RSI:${(lay.momentum.rsi4h||50).toFixed(0)} · MACD:${lay.momentum.macdBullish?'Bull':'Bear'} · ${lay.momentum.squeeze?'BB SQZ⚡':'BB Normal'}` : '' },
            { id:'L4', lbl:'MTF UYUM',        key:'mtfAlignment',    col:C.green,  max:20,
              detail: lay.mtfAlignment ? `4H:${lay.mtfAlignment['4h']||'?'} · 1D:${lay.mtfAlignment['1d']||'?'} · 1W:${lay.mtfAlignment['1w']||'?'} · 1M:${lay.mtfAlignment['1m']||'?'}` : '' },
          ].map(({ id, lbl, key, col, max, detail }) => {
            const score = lay[key]?.score || 0;
            const pct = Math.min(100, Math.round(score/max*100));
            return (
              <div key={id} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
                <div style={{ width:24, height:24, borderRadius:4, background:`${col}12`, border:`1px solid ${col}30`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:col, flexShrink:0 }}>{id}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'var(--t1)' }}>{lbl}</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:col }}>{score}/{max}</span>
                  </div>
                  <div style={{ height:4, background:'var(--bg)', borderRadius:2, overflow:'hidden', border:'1px solid var(--border)', marginBottom:2 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col}60,${col})`, borderRadius:2, transition:'width .6s ease' }} />
                  </div>
                  {detail && <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', lineHeight:1.3 }}>{detail}</div>}
                </div>
              </div>
            );
          })}
        </div>}

        {/* SAĞ — Entry Setup */}
        <div className="ua-right-col" style={{ borderRight:'none' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:1 }}>KURUMSAL GİRİŞ SETUP</div>
            <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:900, padding:'3px 10px', borderRadius:5,
              background: isLong?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',
              color: isLong?C.green:C.red, border:`1px solid ${isLong?C.green:C.red}40` }}>
              {isLong ? '▲ LONG' : '▼ SHORT'}
            </span>
          </div>

          {/* Entry zone */}
          {s.entryLow && s.entryHigh ? (
            <div className="ua-entry-zone">
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:C.green, letterSpacing:.5, marginBottom:4 }}>GİRİŞ BÖLGE — LIMIT ORDER</div>
              <div className="ua-entry-lmh">
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>LOW</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:900, color:C.green }}>${parseFloat(s.entryLow).toLocaleString('en-US',{maximumFractionDigits:4})}</div>
                </div>
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>MID</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:900, color:'var(--t1)' }}>{apiData.entry_sniper||'—'}</div>
                </div>
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>HIGH</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:900, color:C.green }}>${parseFloat(s.entryHigh).toLocaleString('en-US',{maximumFractionDigits:4})}</div>
                </div>
              </div>
              {s.entryMethod && <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:3 }}>{s.entryMethod}</div>}
            </div>
          ) : (
            <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:900, color:C.green, marginBottom:8 }}>{apiData.entry_sniper||'—'}</div>
          )}

          {/* SL / TPs */}
          {[
            { lbl:'STOP LOSS', sub:s.stopLabel||'Zone İnvalidasyonu', price:apiData.stop_loss, col:C.red },
            { lbl:`TP1 · 40%${s.tp1Pct?` +${s.tp1Pct}%`:''}`, sub:'İlk Likidite / BSL', price:apiData.tp1, col:'#34D399' },
            { lbl:`TP2 · 35%${s.tp2Pct?` +${s.tp2Pct}%`:''}`, sub:'Ana Hedef / Fib Ext.', price:apiData.tp2, col:C.blue },
            { lbl:`TP3 · 25%${s.tp3Pct?` +${s.tp3Pct}%`:''}`, sub:'Uzun Vade / Extension', price:apiData.tp3, col:C.purple },
          ].filter(l=>l.price).map(({ lbl, sub, price, col }) => (
            <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
              <div>
                <div style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:col }}>{lbl}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>{sub}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:800, color:col }}>{price}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>{diffPct(price)}</div>
              </div>
            </div>
          ))}

          {/* R:R / Risk / Lev row */}
          <div className="ua-rr-mini">
            {[
              { lbl:'R:R',     val:apiData.risk_reward||'—',           col:'var(--t1)' },
              { lbl:'RİSK %',  val:`${apiData.risk_pct||'—'}%`,        col:C.orange },
              { lbl:'KALDIRAÇ',val:lev.moderate?`${lev.moderate}x`:'5x',  col:C.gold },
              { lbl:'WIN RATE',val:`${wr}%`,                            col:wrCol },
            ].map(({ lbl, val, col }) => (
              <div key={lbl} style={{ background:'var(--panel)', padding:'7px 8px' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)', letterSpacing:.4, marginBottom:3 }}>{lbl}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:col }}>{val}</div>
              </div>
            ))}
          </div>

          {s.entryMid && (
            <div style={{ marginTop:8, display:'flex', justifyContent:'flex-end', gap:6 }}>
              {/* Tweet butonu */}
              {(() => {
                const dir   = isLong ? 'LONG' : 'SHORT';
                const emoji = isLong ? '🟢' : '🔴';
                const arrow = isLong ? '▲' : '▼';
                const f4    = v => v ? `$${parseFloat(v).toLocaleString('en-US',{maximumFractionDigits:4})}` : '—';
                const pct   = v => v ? ` (${parseFloat(v)>0?'+':''}${v}%)` : '';
                const lvTxt = lev.moderate ? `${lev.moderate}x` : '5x';
                const tags  = `#${coin} #crypto #bitcoin #btc #ethereum #eth #blockchain #cryptonews #cryptotrading #trading #defi #binance #altcoin #cryptomarket #bitcoinnews #investing`;
                const site  = `🔗 deeptradescan.com — ücretsiz profesyonel analiz`;
                const body  = [
                  `${emoji} ${coin}/USDT ${arrow} ${dir} SİNYALİ`,
                  `📍 Giriş: ${f4(s.entryLow)} – ${f4(s.entryHigh)}`,
                  `🛑 Stop: ${f4(s.stop)}${s.riskPct ? ` (%${s.riskPct})` : ''}`,
                  `🎯 TP1: ${f4(s.tp1)}${pct(s.tp1Pct)} | TP2: ${f4(s.tp2)}${pct(s.tp2Pct)}`,
                  `📊 R:R ${apiData.risk_reward||'—'} | ${lvTxt} Kaldıraç | WR %${wr}`,
                  ``,
                  site,
                  ``,
                  tags,
                ].join('\n');
                // Twitter counts t.co links as 23 chars; keep total safe
                const encoded = encodeURIComponent(body);
                // intent URL — works in both browser and mobile app hand-off
                const intentUrl = `https://twitter.com/intent/tweet?text=${encoded}`;

                const handleShare = () => {
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile) {
                    // On mobile: navigate directly so the browser properly
                    // hands off to the X app with the compose screen pre-filled
                    const a = document.createElement('a');
                    a.href = intentUrl;
                    a.rel  = 'noopener noreferrer';
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  } else {
                    // Desktop: popup window
                    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=600,height=560');
                  }
                };

                return (
                  <button
                    onClick={handleShare}
                    style={{
                      background:'linear-gradient(135deg,#0f0f0f,#1a1a1a)',
                      border:'1px solid rgba(255,255,255,.22)',
                      color:'#fff',
                      padding:'6px 14px',
                      fontFamily:'var(--mono)',
                      fontSize:9,
                      fontWeight:700,
                      cursor:'pointer',
                      borderRadius:5,
                      display:'flex',
                      alignItems:'center',
                      gap:5,
                      letterSpacing:.4,
                      transition:'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='#222'; e.currentTarget.style.borderColor='rgba(255,255,255,.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='linear-gradient(135deg,#0f0f0f,#1a1a1a)'; e.currentTarget.style.borderColor='rgba(255,255,255,.22)'; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X'te Paylaş
                  </button>
                );
              })()}
              <button onClick={() => onChartOpen(coin, { entry:s.entryMid, stop:s.stop, tp1:s.tp1, tp2:s.tp2, tp3:s.tp3 })}
                style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', color:'#60A5FA',
                  padding:'5px 12px', fontFamily:'var(--mono)', fontSize:9, cursor:'pointer', borderRadius:5 }}>
                📊 Grafikte Gör
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ROW: Market Veri + Futures + Seans ════════════════════ */}
      <div style={{ borderBottom:'1px solid var(--border)' }}>
        <SectionHeader icon="▤" label="PİYASA VERİSİ · FUTURES · SEANS" color={C.cyan} />
        <div className="ua-market-row">
          {/* Fiyat blok */}
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:900, color:'var(--t1)', lineHeight:1 }}>{apiData.current_price}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, marginTop:3,
              color:apiData.price_change_24h?.startsWith('+')?C.green:C.red }}>{apiData.price_change_24h}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:2 }}>Vol {apiData.volume_24h}</div>
          </div>
          {/* Market chips */}
          <div className="ua-mkt-chips" style={{ gridColumn:'span 1' }}>
            {[
              { lbl:'TREND 1D', val:apiData.trend_daily||'—',  col:apiData.trend_daily==='BULLISH'?C.green:C.red },
              { lbl:'TREND 1W', val:apiData.trend_weekly||'—', col:apiData.trend_weekly==='BULLISH'?C.green:C.red },
              { lbl:'RSI 14',   val:`${apiData.technical_indicators?.rsi_14||'—'}`, col:(apiData.technical_indicators?.rsi_14||50)<35?C.green:(apiData.technical_indicators?.rsi_14||50)>65?C.red:'var(--t1)' },
              { lbl:'ADX',      val:`${apiData.regime?.adx||0}`, col:(apiData.regime?.adx||0)>25?C.gold:'var(--t2)' },
              { lbl:'BB SQZ',   val:apiData.technical_indicators?.bollinger_bands?.squeeze?'ACTIVE ⚡':'NORMAL', col:apiData.technical_indicators?.bollinger_bands?.squeeze?C.gold:'var(--t2)' },
              { lbl:'REGIME',   val:(apiData.regime?.regime||'—').replace(/_/g,' '), col:'var(--t1)' },
            ].map(({ lbl, val, col }) => (
              <Chip key={lbl} lbl={lbl} val={val} col={col} />
            ))}
          </div>
          {/* Futures */}
          {apiData.futures && (() => {
            const f = apiData.futures;
            const fr = f.fundingRate;
            const frPct = fr != null ? (fr*100).toFixed(4) : null;
            const frCol = fr > 0.0005 ? C.red : fr < -0.0005 ? C.green : C.gold;
            const sc = apiData.timing ? ({ LONDON_NY_OVERLAP:C.green, NY_OPEN:C.blue, LONDON_OPEN:'#60A5FA', ASIAN:C.gold, LONDON_CLOSE:C.orange, OFF_HOURS:'#6B7280' }[apiData.timing.killZone] || '#94A3B8') : null;
            return (
              <div className="ua-futures-grid">
                <div style={{ gridColumn:'span 2', fontFamily:'var(--mono)', fontSize:7, color:C.orange, fontWeight:800, letterSpacing:.8, marginBottom:2 }}>FUTURES · {frPct ? (fr>0?'LONG AĞIR':'SHORT AĞIR') : 'NEUTRAL'}</div>
                <Chip lbl="FUNDING" val={frPct?`${fr>0?'+':''}${frPct}%`:'N/A'} col={frPct?frCol:'var(--t3)'} />
                <Chip lbl="OPEN INT." val={f.openInterest?(f.openInterest/1e6).toFixed(1)+'M':'N/A'} col="var(--t1)" />
                <Chip lbl="L/S RATIO" val={f.longShortRatio?parseFloat(f.longShortRatio).toFixed(2):'N/A'} col="var(--t1)" />
                {sc && apiData.timing && (
                  <div style={{ background:'var(--card2)', borderRadius:5, padding:'7px 10px', border:'1px solid var(--border)', gridColumn:'span 1' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:3, letterSpacing:.4 }}>SEANS</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:sc, boxShadow:`0 0 5px ${sc}`, flexShrink:0 }} />
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:sc }}>{apiData.timing.killZone?.replace(/_/g,' ')}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>


      {/* ═══ ROW: Kurumsal Bölge Haritası ═══════════════════════════ */}
      {apiData.quantumZones?.length > 0 && (
        <div style={{ borderBottom:'1px solid var(--border)' }}>
          <SectionHeader icon="◆" label={`KURUMSAL BÖLGE HARİTASI · ${apiData.quantumZones.length} BÖLGE`} color={C.purple} />
          <div className="ua-zones-grid">
            {apiData.quantumZones.slice(0,4).map((z,i) => {
              const isDemand = z.type === 'DEMAND';
              const zc = isDemand ? C.green : C.red;
              const q2 = z.qualityScore || z.confluenceScore || 0;
              return (
                <div key={i} style={{ background:'var(--card2)', border:`1px solid ${zc}20`, borderRadius:6, padding:'8px 11px',
                  borderLeft:`3px solid ${zc}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:900, color:zc }}>{isDemand?'▲ DEMAND':'▼ SUPPLY'} · {z.timeframe}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#FBBF24', fontWeight:700 }}>Q:{q2}</div>
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'var(--t1)' }}>
                    ${parseFloat(z.lowPrice).toLocaleString('en-US',{maximumFractionDigits:4})} — ${parseFloat(z.highPrice).toLocaleString('en-US',{maximumFractionDigits:4})}
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:2 }}>{z.freshness} · {z.type2||''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ RISK UYARILARI — hidden, MM-DESK içinde işleniyor ══════ */}

      {/* ═══ AI RAPORU ═══════════════════════════════════════════════ */}
      {blocks.length > 0 && (
        <div style={{ paddingBottom:4 }}>
          {blocks.filter(b => VISIBLE_IDS.has(b.id)).map((block, idx) => {
            const cfg = secCfg(block.id || '');
            const isMM = block.id === 'MM-DESK';
            const isSinyal = block.id === 'SINYAL';
            const is12K = block.id.startsWith('12-KATMAN') || block.id.startsWith('KONFLUENS') || block.id.startsWith('YONETICI') || block.id.startsWith('OZET');
            return (
              <div key={idx} className="ablock" style={{
                borderLeft: isMM ? `3px solid #FFD700` : `3px solid ${cfg.color}`,
                borderColor: isMM ? 'rgba(255,215,0,.30)' : `${cfg.color}30`,
                borderLeftColor: isMM ? '#FFD700' : cfg.color,
                background: isMM ? 'linear-gradient(135deg,rgba(255,215,0,.04),rgba(255,180,0,.02))' : undefined,
                boxShadow: isMM ? '0 2px 16px rgba(255,215,0,.06)' : undefined,
              }}>
                <div className="ablock-head" style={{ background: isMM ? 'linear-gradient(90deg,rgba(255,215,0,.12),rgba(255,215,0,.02))' : `linear-gradient(90deg,${cfg.color}10,${cfg.color}03)` }}>
                  <div className="ablock-icon" style={{ color: isMM ? '#FFD700' : cfg.color, borderColor:`${isMM?'#FFD700':cfg.color}50`, background:`${isMM?'rgba(255,215,0,.18)':cfg.color+'15'}` }}>{isMM ? '◈' : cfg.icon}</div>
                  <span className="ablock-label" style={{ color: isMM ? '#FFD700' : cfg.color }}>{cfg.label}</span>
                  {isMM && <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'rgba(255,215,0,.6)', marginLeft:8, background:'rgba(255,215,0,.08)', padding:'2px 7px', borderRadius:3, border:'1px solid rgba(255,215,0,.20)', letterSpacing:.5 }}>KURUMSAL PREMİUM</span>}
                  <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${isMM?'rgba(255,215,0,.30)':cfg.color+'30'},transparent)` }} />
                </div>
                <div>
                  {block.items.map((item, ii) => {
                    if (is12K && item.t === 'kv') {
                      const kl = item.k.toLowerCase().trim();
                      const val = item.v || '';
                      const isSignalRow = kl.includes('sinyal');
                      const isToplamRow = kl === 'toplam';
                      const isKonfRow   = kl === 'konfluens skoru';
                      const isNihaiRow  = kl === 'nihai karar';
                      const isKritikRow = kl === 'kritik metrik';
                      const isBiasRow   = kl === 'bias';
                      const isNetRow    = kl === 'net aksiyon';

                      if (isBiasRow) {
                        const d = val.match(/\b(BULLISH|BEARISH|NEUTRAL)\b/i)?.[1]?.toUpperCase() || 'NEUTRAL';
                        const dc = d==='BULLISH'?'#00FFB2':d==='BEARISH'?'#EF4444':'#F59E0B';
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:`${dc}06` }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, marginBottom:5, textTransform:'uppercase' }}>Kurumsal Bias</div>
                            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:900, color:dc, padding:'4px 14px', background:`${dc}18`, borderRadius:6, border:`1.5px solid ${dc}50`, letterSpacing:1 }}>{d}</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', flex:1 }}>{val.replace(/\b(BULLISH|BEARISH|NEUTRAL)\b\s*\|?\s*/i,'').trim()}</div>
                            </div>
                          </div>
                        );
                      }
                      if (isNetRow) {
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:'rgba(16,185,129,.04)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'#10B981', letterSpacing:.8, marginBottom:5, textTransform:'uppercase' }}>Net Aksiyon Planı</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t1)', lineHeight:1.7 }}>{val}</div>
                          </div>
                        );
                      }
                      if (isNihaiRow) {
                        const d = val.match(/\b(LONG|SHORT|BEKLE|HEDGE)\b/i)?.[1]?.toUpperCase() || 'BEKLE';
                        const dc = d==='LONG'?'#00FFB2':d==='SHORT'?'#EF4444':d==='HEDGE'?'#A78BFA':'#F59E0B';
                        return (
                          <div key={ii} style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:`${dc}08` }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, marginBottom:7, textTransform:'uppercase' }}>Nihai Karar — Sentez</div>
                            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:17, fontWeight:900, color:dc, padding:'5px 16px', background:`${dc}18`, borderRadius:7, border:`1.5px solid ${dc}50`, letterSpacing:1 }}>{d}</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', flex:1, lineHeight:1.5 }}>{val.replace(/\b(LONG|SHORT|BEKLE|HEDGE)\b\s*\|?\s*/i,'').trim()}</div>
                            </div>
                          </div>
                        );
                      }
                      if (isKonfRow) {
                        const pctM = val.match(/(%\d+|\d+%)/);
                        const pct = pctM ? parseInt(pctM[0]) : 0;
                        const cc = pct>=70?'#00FFB2':pct>=50?'#F59E0B':'#EF4444';
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, textTransform:'uppercase' }}>Konfluens Skoru</span>
                              <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:900, color:cc }}>%{pct}</span>
                            </div>
                            <div style={{ height:7, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden', marginBottom:5 }}>
                              <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:`linear-gradient(90deg,${pct>=70?'#059669,#00FFB2':pct>=50?'#B45309,#F59E0B':'#B91C1C,#EF4444'})`, borderRadius:4, transition:'width .6s ease' }} />
                            </div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>{pct>=70?'YUKSEK GUVENİLİRLİK (>%70)':pct>=50?'ORTA GUVENİLİRLİK (%50-70)':'DUSUK GUVENİLİRLİK (<%50)'}</div>
                          </div>
                        );
                      }
                      if (isToplamRow) {
                        const lM = val.match(/(\d+)\/12\s*LONG/i);
                        const sM = val.match(/(\d+)\/12\s*SHORT/i);
                        const nM = val.match(/(\d+)\/12\s*NOTR/i);
                        const lc = parseInt(lM?.[1]||0), sc2 = parseInt(sM?.[1]||0), nc = parseInt(nM?.[1]||0);
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:'rgba(255,255,255,.02)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, marginBottom:7, textTransform:'uppercase' }}>12-Katman Sinyal Dağılımı</div>
                            <div style={{ display:'flex', gap:6 }}>
                              <div style={{ flex:lc, minWidth:lc?20:0, background:'linear-gradient(90deg,#059669,#10B981)', borderRadius:4, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:9, fontWeight:900, color:'#fff', overflow:'hidden' }}>{lc>0?`LONG ${lc}`:''}</div>
                              <div style={{ flex:nc, minWidth:nc?16:0, background:'rgba(148,163,184,.25)', borderRadius:4, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'#94A3B8', overflow:'hidden' }}>{nc>0?`NOTR ${nc}`:''}</div>
                              <div style={{ flex:sc2, minWidth:sc2?20:0, background:'linear-gradient(90deg,#DC2626,#EF4444)', borderRadius:4, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:9, fontWeight:900, color:'#fff', overflow:'hidden' }}>{sc2>0?`SHORT ${sc2}`:''}</div>
                            </div>
                          </div>
                        );
                      }
                      if (isKritikRow) {
                        return (
                          <div key={ii} style={{ padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,.025)', background:'rgba(245,158,11,.04)' }}>
                            <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'#F59E0B', letterSpacing:.5, textTransform:'uppercase', display:'block', marginBottom:4 }}>Kritik Metrik</span>
                            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', lineHeight:1.6 }}>{val}</span>
                          </div>
                        );
                      }
                      if (isSignalRow) {
                        const dirM = val.match(/\b(LONG|SHORT|NOTR)\s*$/i);
                        const gucM = val.match(/Guc:\s*(\d+)\/5/i);
                        const dir3 = dirM?.[1]?.toUpperCase() || 'NOTR';
                        const guc = parseInt(gucM?.[1]||0);
                        const d3c = dir3==='LONG'?'#00FFB2':dir3==='SHORT'?'#EF4444':'#64748B';
                        const kc  = kvColor(item.k) || cfg.color;
                        const desc= val.replace(/—?\s*Guc:\s*\d+\/5\s*—?\s*(LONG|SHORT|NOTR)?\s*$/i,'').replace(/\s*—\s*$/,'').trim();
                        return (
                          <div key={ii} style={{ display:'flex', alignItems:'center', padding:'6px 12px', gap:7, borderBottom:'1px solid rgba(255,255,255,.022)', minHeight:32 }}>
                            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:kc, width:130, flexShrink:0, lineHeight:1.3 }}>{item.k}</span>
                            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }} title={desc}>{desc}</span>
                            <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                              {[1,2,3,4,5].map(n=><div key={n} style={{ width:5, height:8, borderRadius:2, background:n<=guc?kc:'rgba(255,255,255,.10)' }}/>)}
                            </div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:d3c, padding:'2px 9px', background:`${d3c}18`, borderRadius:4, border:`1px solid ${d3c}40`, flexShrink:0, minWidth:46, textAlign:'center', letterSpacing:.3 }}>{dir3}</div>
                          </div>
                        );
                      }
                    }
                    // SINYAL — Trade Setup special rendering
                    if (isSinyal && item.t === 'kv') {
                      const sinyalKeyColors = {
                        'yön':             item.v.includes('LONG') ? '#10B981' : item.v.includes('SHORT') ? '#EF4444' : '#F59E0B',
                        'setup kodu':      '#00D4FF',
                        'entry türü':      '#60A5FA',
                        'entry zone':      '#10B981',
                        'stop-loss':       '#EF4444',
                        'tp1':             '#34D399',
                        'tp2':             '#6EE7B7',
                        'tp3':             '#A7F3D0',
                        'kaldıraç':        '#F5A623',
                        'r:r':             '#00FFB2',
                        'win rate':        '#A78BFA',
                        'likidasyon':      '#EF4444',
                        'pozisyon riski':  '#FBBF24',
                      };
                      const kLow = item.k.toLowerCase();
                      const sCol = sinyalKeyColors[kLow] || '#10B981';
                      const isYon = kLow === 'yön';
                      const isEntry = kLow === 'entry zone';
                      const isSL = kLow === 'stop-loss';
                      return (
                        <div key={ii} style={{ padding: (isYon||isEntry) ? '9px 14px 7px' : '6px 14px', borderBottom:'1px solid rgba(16,185,129,.07)', background: isYon ? 'rgba(16,185,129,.05)' : isSL ? 'rgba(239,68,68,.03)' : undefined }}>
                          <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                            <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:sCol, letterSpacing:.6, textTransform:'uppercase', flexShrink:0, marginTop:1, minWidth:88 }}>{item.k}</span>
                            <span style={{ fontFamily:'var(--mono)', fontSize: isYon ? 11 : 9, color: isYon ? '#fff' : 'var(--t1)', lineHeight:1.6, fontWeight: isYon ? 800 : 500 }}>{item.v}</span>
                          </div>
                        </div>
                      );
                    }
                    if (isSinyal && item.t === 'txt') {
                      return (
                        <div key={ii} style={{ padding:'6px 14px', borderBottom:'1px solid rgba(16,185,129,.05)' }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', lineHeight:1.6 }}>{item.v}</span>
                        </div>
                      );
                    }
                    // ── MM-DESK Ultra-Professional Rendering ─────────────────
                    if (isMM && item.t === 'kv') {
                      const kl = item.k.toLowerCase().trim();
                      const val = item.v || '';

                      // MM Pozisyon — color-coded institutional direction
                      if (kl === 'mm pozisyon' || kl === 'kurumsal pozisyon') {
                        const dir = val.match(/\b(LONG|SHORT|NÖTR|HEDGE)\b/i)?.[1]?.toUpperCase() || '';
                        const dc  = dir==='LONG'?'#00FFB2':dir==='SHORT'?'#EF4444':dir==='HEDGE'?'#A78BFA':'#FFD700';
                        return (
                          <div key={ii} style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,215,0,.07)', background:`${dc}06` }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:'rgba(255,215,0,.5)', letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 }}>◈ MM POZİSYON</div>
                            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                              {dir && <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:900, color:dc, padding:'3px 12px', background:`${dc}14`, borderRadius:5, border:`1.5px solid ${dc}40`, letterSpacing:.8 }}>{dir}</div>}
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t1)', lineHeight:1.6, flex:1 }}>{val.replace(/\b(LONG|SHORT|NÖTR|HEDGE)\b\s*—?\s*/i,'').trim()}</div>
                            </div>
                          </div>
                        );
                      }

                      // Likidasyon Tuzağı — danger styling
                      if (kl === 'likidasyon tuzağı' || kl === 'stop avı') {
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(239,68,68,.1)', background:'rgba(239,68,68,.04)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:'#EF4444', letterSpacing:1.2, textTransform:'uppercase', marginBottom:5 }}>⚡ {item.k.toUpperCase()}</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'#FCA5A5', lineHeight:1.65 }}>{val}</div>
                          </div>
                        );
                      }

                      // Retail Yanılgısı
                      if (kl === 'retail yanılgısı' || kl === 'retail tuzağı') {
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(249,115,22,.08)', background:'rgba(249,115,22,.03)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:'#F97316', letterSpacing:1.2, textTransform:'uppercase', marginBottom:5 }}>◎ RETAIL YANILGISI</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'#FDBA74', lineHeight:1.65 }}>{val}</div>
                          </div>
                        );
                      }

                      // Smart Money Hareketi — blue
                      if (kl.includes('smart money') || kl === '48-72h oyun') {
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(96,165,250,.08)', background:'rgba(96,165,250,.03)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:'#60A5FA', letterSpacing:1.2, textTransform:'uppercase', marginBottom:5 }}>▶ SMART MONEY · 48–72H</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'#BAD4F9', lineHeight:1.65 }}>{val}</div>
                          </div>
                        );
                      }

                      // Kritik Bölge — gold
                      if (kl === 'kritik bölge' || kl === 'kritik bölgesi') {
                        return (
                          <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,215,0,.1)', background:'rgba(255,215,0,.04)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:'#FFD700', letterSpacing:1.2, textTransform:'uppercase', marginBottom:5 }}>◆ KRİTİK BÖLGE</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'#FFE566', lineHeight:1.5 }}>{val}</div>
                          </div>
                        );
                      }

                      // MM Edge — purple, last field
                      if (kl === 'mm edge' || kl === 'edge') {
                        return (
                          <div key={ii} style={{ padding:'11px 14px', background:'rgba(167,139,250,.04)', borderTop:'1px solid rgba(167,139,250,.1)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:'#A78BFA', letterSpacing:1.2, textTransform:'uppercase', marginBottom:5 }}>✦ KURUMSAL EDGE</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'#C4B5FD', lineHeight:1.65, fontStyle:'italic' }}>{val}</div>
                          </div>
                        );
                      }

                      // Key Signal — top highlighted field
                      const isKey = kl === 'key signal';
                      return (
                        <div key={ii} style={{ padding: isKey ? '11px 14px 9px' : '8px 14px', borderBottom:'1px solid rgba(255,215,0,.06)', background: isKey ? 'rgba(255,215,0,.06)' : undefined }}>
                          <div style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:isKey?'#FFD700':'rgba(255,215,0,.45)', letterSpacing:1, textTransform:'uppercase', marginBottom: isKey ? 5 : 2 }}>{item.k.toUpperCase()}</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize: isKey ? 10 : 9, color: isKey ? '#FFF9C4' : 'var(--t2)', lineHeight:1.65, fontWeight: isKey ? 600 : 400 }}>{val}</div>
                        </div>
                      );
                    }
                    if (isMM && item.t === 'txt') {
                      return (
                        <div key={ii} style={{ padding:'7px 14px', borderBottom:'1px solid rgba(255,215,0,.04)' }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', lineHeight:1.6 }}>{item.v}</span>
                        </div>
                      );
                    }
                    return item.t === 'kv' ? (
                      <div key={ii} className="kv-row">
                        <span className="kv-k">{item.k}</span>
                        <span className="kv-v" style={{ color:kvColor(item.k)||cfg.color }}>{item.v}</span>
                      </div>
                    ) : (
                      <div key={ii} className="txt-row">
                        <div className="txt-bar" style={{ background:cfg.color }} />
                        <span className="txt-content">{item.v}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── API Response Normalizer ────────────────────────────────────
// Transforms new analyze.js format → legacy field names expected by UI
function normalizeApiData(d) {
  if (!d || !d.coin) return d;

  const m   = d.market   || {};
  const q   = d.quantum  || {};
  const s   = d.setup    || {};
  const lay = d.layers   || {};
  const mtf = lay.mtfAlignment || {};
  const mom = lay.momentum     || {};
  const ms  = lay.marketStructure || {};

  const priceNum = parseFloat(m.price) || 0;
  const priceDec = priceNum > 1000 ? 2 : priceNum > 1 ? 4 : 6;

  const fmtPrice = (n) => {
    if (n === null || n === undefined || isNaN(parseFloat(n))) return null;
    const num = parseFloat(n);
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: priceDec, maximumFractionDigits: priceDec })}`;
  };

  const verdictMap = {
    LONG:    q.score >= 90 ? 'PRIME_BUY'   : q.score >= 85 ? 'STRONG_BUY'  : q.score >= 60 ? 'BUY' : 'NEUTRAL',
    SHORT:   q.score >= 90 ? 'PRIME_SELL'  : q.score >= 85 ? 'STRONG_SELL' : q.score >= 60 ? 'SELL' : 'NEUTRAL',
    NEUTRAL: 'NEUTRAL',
  };

  const bullSignals = Math.round((q.score || 50) * 0.30);
  const bearSignals = Math.round((100 - (q.score || 50)) * 0.30);

  return {
    ...d,
    // ── Price display ──────────────────────────────────────────
    current_price:   fmtPrice(priceNum),
    price_change_24h: m.change24h != null
      ? `${m.change24h >= 0 ? '+' : ''}${parseFloat(m.change24h).toFixed(2)}%`
      : null,
    volume_24h: m.volume24h != null
      ? `$${(m.volume24h / 1e9 >= 1 ? (m.volume24h / 1e9).toFixed(2) + 'B' : (m.volume24h / 1e6).toFixed(1) + 'M')}`
      : null,
    source: 'OKX',
    // ── Verdict & direction ────────────────────────────────────
    confidence_score: q.score   || 0,
    overall_verdict:  verdictMap[q.direction] || 'NEUTRAL',
    trade_direction:  q.direction || 'NEUTRAL',
    overall_score:    q.score   || 0,
    // ── Trend ──────────────────────────────────────────────────
    trend_daily:  mtf['1d'] === 'BULL' ? 'BULLISH' : 'BEARISH',
    trend_weekly: mtf['1w'] === 'BULL' ? 'BULLISH' : 'BEARISH',
    // ── Engine ─────────────────────────────────────────────────
    engine: { grade: q.grade || 'C', winRate: q.winRate || 55 },
    // ── Execution levels ───────────────────────────────────────
    entry_sniper:  fmtPrice(s.entryMid),
    stop_loss:     fmtPrice(s.stop),
    tp1:           fmtPrice(s.tp1),
    tp2:           fmtPrice(s.tp2),
    tp3:           fmtPrice(s.tp3),
    risk_reward:   s.rr      || '—',
    risk_pct:      s.riskPct != null ? String(s.riskPct) : null,
    position_size: d.leverage?.moderate ? `${d.leverage.moderate}x` : '5x',
    // ── SMC data ───────────────────────────────────────────────
    smc_data: {
      strength:  Math.round((lay.liquiditySMC?.score || 0) / 3.75),
      fvg:       mtf['4h'] === 'BULL' ? 'BULLISH' : 'BEARISH',
      fvgLevel:  s.entryMid || 0,
      ob:        mtf['1d'] === 'BULL' ? 'BULLISH' : 'BEARISH',
      obLevel:   s.entryMid || 0,
      bos:       ms.bosType || 'NONE',
      choch:     'NONE',
      liquidity: lay.liquiditySMC?.liquiditySweep ? 'SWEEP_DETECTED' : 'INTACT',
    },
    // ── Confluence signals ─────────────────────────────────────
    signals: {
      bull: bullSignals,
      bear: bearSignals,
      net:  bullSignals - bearSignals,
    },
    // ── Market regime ──────────────────────────────────────────
    regime: {
      regime: q.direction === 'LONG' ? 'BULL_TREND' : q.direction === 'SHORT' ? 'BEAR_TREND' : 'RANGING',
      adx:    ms.adxStrength || 25,
    },
    // ── New engine data ────────────────────────────────────────
    srLevels:   d.srLevels   || [],
    paPatterns: d.paPatterns || [],
    manipulation: d.manipulation || null,
    // ── Technical indicators ───────────────────────────────────
    technical_indicators: {
      rsi_14:     mom.rsi4h  || 50,
      stoch_rsi:  { k: mom.stochK || 50, d: mom.stochD || 50 },
      macd: {
        cross:     mom.macdCross ? (q.direction === 'LONG' ? 'GOLDEN' : 'DEATH') : 'NONE',
        histogram: mom.macdBullish ? 1 : -1,
      },
      bollinger_bands: {
        squeeze:   mom.squeeze || false,
        percent_b: 0.5,
        bandwidth: mom.bbBandwidth || 0.05,
      },
      williams_r: mom.rsi4h ? -(100 - mom.rsi4h) : -50,
      obv:        { trend: mtf['1d'] === 'BULL' ? 'BULLISH' : 'BEARISH' },
      ichimoku:   { cloud: mtf['1d'] === 'BULL' ? 'ABOVE_CLOUD' : 'BELOW_CLOUD' },
    },
  };
}

export default function App() {
  const [session, setSession]     = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const s = localStorage.getItem('dts_s');
      if (!s) return null;
      const sess = JSON.parse(s);
      if (!sess?.access_token) return null;
      // Don't restore expired sessions
      const expiresAt = sess.expires_at;
      if (expiresAt && Date.now() / 1000 > expiresAt) {
        localStorage.removeItem('dts_s');
        return null;
      }
      return sess;
    } catch {}
    return null;
  });
  const [authLoad, setAuthLoad]   = useState(false);
  const [authErr, setAuthErr]     = useState('');
  const [authMode, setAuthMode]   = useState('login'); // 'login' | 'register'
  const [authOk, setAuthOk]       = useState('');
  const [form, setForm]           = useState({ email:'', password:'', name:'' });
  const [coin, setCoin]           = useState('BTC');
  const [search, setSearch]       = useState('');
  const [result, setResult]       = useState('');
  const [apiData, setApiData]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState(0);
  const [error, setError]         = useState('');
  const [activeCat, setActiveCat] = useState('ALL');
  const [history, setHistory]     = useState([]);
  const [histStats, setHistStats] = useState(null);
  const [histLoad, setHistLoad]   = useState(false);
  const [histLastUpdate, setHistLastUpdate] = useState(null);
  const [histDbError, setHistDbError] = useState(null); // DB error message from server
  const [saveErr, setSaveErr]     = useState(null);     // backtest save error
  const [mobTab, setMobTab]       = useState('analyze');
  const [chartModal, setChartModal] = useState(null); // { coin, setup: {entry,stop,tp1,tp2,tp3} }
  const [profile, setProfile]     = useState(null);

  const timer = useRef(null);
  const lastHistoryFetch = useRef(0); // timestamp of last loadHistory call
  const blocks = result ? parse(result) : [];

  async function loadProfile(token) {
    if (!token) return;
    try {
      const r = await fetch('/api/auth?action=get-profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.profile) setProfile({ ...d.profile, email: d.email, full_name: d.full_name || d.profile.full_name });
    } catch {}
  }

  async function sendNotify(type, extras = {}) {
    try {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, email: session?.user?.email, ...extras }),
      });
    } catch {}
  }

  useEffect(() => {
    const s = localStorage.getItem('dts_s');
    if (s) { try { const p = JSON.parse(s); setSession(p); loadHistory(p.access_token); loadProfile(p.access_token); } catch {} }
  }, []);

  // Auto-refresh trade log every 30 seconds when session active
  useEffect(() => {
    if (!session?.access_token) return;
    const interval = setInterval(() => {
      loadHistory(session.access_token, true); // silent refresh
    }, 60000); // 60 seconds — balances freshness with server load
    return () => clearInterval(interval);
  }, [session?.access_token]);

  async function doLogin(e) {
    e?.preventDefault();
    if (!form.email || !form.password) return setAuthErr('Email ve şifre girin.');
    setAuthLoad(true); setAuthErr(''); setAuthOk('');
    const d = await apiAuth('login', { email:form.email, password:form.password });
    setAuthLoad(false);
    if (d.error) return setAuthErr(d.error);
    const sess = d.session || d;
    localStorage.setItem('dts_s', JSON.stringify(sess));
    setSession(sess); loadHistory(sess.access_token); loadProfile(sess.access_token);
  }

  async function doRegister(e) {
    e?.preventDefault();
    if (!form.email || !form.password) return setAuthErr('Email ve şifre girin.');
    if (form.password.length < 6) return setAuthErr('Şifre en az 6 karakter olmalı.');
    setAuthLoad(true); setAuthErr(''); setAuthOk('');
    const d = await apiAuth('register', { email:form.email, password:form.password, full_name: form.name });
    setAuthLoad(false);
    if (d.error) return setAuthErr(d.error);
    // If session returned directly, log in
    if (d.session?.access_token) {
      localStorage.setItem('dts_s', JSON.stringify(d.session));
      setSession(d.session); loadHistory(d.session.access_token);
    } else {
      setAuthOk('Kayıt başarılı! Email doğrulama gerekmeyebilir — giriş yapmayı dene.');
      setAuthMode('login');
    }
  }

  function doLogout() {
    localStorage.removeItem('dts_s');
    setSession(null); setResult(''); setApiData(null); setHistory([]); setProfile(null);
  }

  async function loadHistory(token, silent = false) {
    if (!token) return;
    // Throttle: min 5s between silent refreshes to avoid hammering the API
    const now = Date.now();
    if (silent && now - lastHistoryFetch.current < 5000) return;
    lastHistoryFetch.current = now;
    if (!silent) setHistLoad(true);
    try {
      const r = await fetch('/api/backtest?page=1', { headers: { Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (d.db_error) {
        setHistDbError(d.db_error);
      } else {
        setHistDbError(null);
      }
      if (d.analyses_log !== undefined) {
        setHistory(d.analyses_log);
        setHistStats(d.portfolio_stats);
        setHistLastUpdate(new Date());
      }
    } catch (e) {
      setHistDbError('Ağ hatası: ' + e.message);
    }
    if (!silent) setHistLoad(false);
  }

  async function deleteTrade(id, token) {
    try {
      const r = await fetch(`/api/backtest?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) loadHistory(token, true);
    } catch {}
  }

  // TEK ANALİZ MODU — CHARTOS APEX QUANTUM v2.0 GOD MODE
  async function analyze(sym) {
    const s = sym || coin;
    setError(''); setLoading(true); setStep(0);
    clearInterval(timer.current);

    // Check daily limit & increment counter before running analysis
    if (session?.access_token) {
      try {
        const chk = await fetch('/api/auth?action=check-analysis', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const chkData = await chk.json();
        if (!chkData.allowed) {
          setError(chkData.error || 'Günlük analiz limitine ulaştınız.');
          setLoading(false);
          loadProfile(session.access_token); // refresh count display
          return;
        }
      } catch {
        // If check fails (network), let the analysis proceed
      }
    }

    timer.current = setInterval(() => setStep(p => Math.min(p + 1, 9)), 800);
    try {
      const r = await fetch('/api/analyze', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ coin:s })
      });
      const data = await r.json();
      // expired token → force re-login
      if (data.error?.includes('süresi dolmuş') || data.error?.includes('Geçersiz oturum')) {
        localStorage.removeItem('dts_s'); setSession(null); return;
      }
      if (data.coin && !data.error) {
        const normalized = normalizeApiData(data);
        setResult(normalized.analysis || '');
        setApiData(normalized);
        // Refresh profile (daily count updated on server by check-analysis)
        if (session?.access_token) loadProfile(session.access_token);
        // Auto-save trade signal to portfolio log
        // Only save if: logged in, has valid setup (entry+stop), direction is not NEUTRAL
        if (session) {
          const tok = session.access_token;
          const setup = normalized.setup || {};
          const direction = setup.direction || normalized.trade_direction || 'NEUTRAL';
          const entryMid = parseFloat(setup.entryMid) || 0;
          const stop = parseFloat(setup.stop) || 0;
          const hasSetup = entryMid > 0 && stop > 0 && direction !== 'NEUTRAL';
          if (hasSetup) {
            // Dedup: skip if same coin+direction+entry (±1%) already waiting
            const alreadyWaiting = history.some(t =>
              t.coin === s &&
              t.direction === direction &&
              t.performance?.state === 'PENDING' &&
              t.entry_mid > 0 &&
              Math.abs((t.entry_mid - entryMid) / entryMid) < 0.01
            );
            if (!alreadyWaiting) {
              fetch('/api/backtest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                body: JSON.stringify({
                  coin: s,
                  direction,
                  entry_mid: entryMid,
                  stop,
                  tp1: parseFloat(setup.tp1) || 0,
                  tp2: parseFloat(setup.tp2) || 0,
                  tp3: parseFloat(setup.tp3) || 0,
                  grade: normalized.engine?.grade || 'B',
                  win_rate: normalized.engine?.winRate || 70,
                  confluence_score: normalized.confidence_score || 0,
                  rr: parseFloat(setup.rr) || setup.rrRaw || 2,
                  entry_method: setup.entryMethod || 'SMC Zone',
                })
              })
                .then(async r => {
                  const j = await r.json().catch(() => ({}));
                  if (!r.ok || j.error) setSaveErr(j.error || `HTTP ${r.status}`);
                  else setSaveErr(null);
                })
                .catch(e => setSaveErr('Ağ hatası: ' + e.message))
                .finally(() => loadHistory(tok));
            } else {
              // Same setup already pending — just refresh history without saving
              loadHistory(tok, true);
            }
          } else {
            // No valid setup (NEUTRAL/missing levels) — refresh history only
            loadHistory(tok, true);
          }
        }
      } else {
        const errMsg = data.error || 'Analiz başarısız.';
        setError(errMsg);
        if (r.status === 429) {
          sendNotify('limit', { coin: s });
        }
      }
    } catch { setError('Sunucu bağlantı hatası.'); }
    clearInterval(timer.current);
    setLoading(false); setStep(0);
  }

  const filteredCoins = activeCat === 'ALL'
    ? COINS.filter(c => c.includes(search.toUpperCase()))
    : (CATS[activeCat]?.coins || []).filter(c => c.includes(search.toUpperCase()));

  // ── LOGIN ─────────────────────────────────────────────────────
  if (!session) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #060c18 0%, #091428 50%, #06101e 100%)',
      backgroundImage:'radial-gradient(rgba(59,130,246,.04) 1px, transparent 1px)',
      backgroundSize:'28px 28px',
      padding:20, fontFamily:'Inter, sans-serif' }}>
      <style>{CSS}</style>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');`}</style>
      <div style={{ width:'100%', maxWidth:440 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <div style={{ width:42, height:42, borderRadius:11,
              background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
              boxShadow:'0 0 20px rgba(59,130,246,.4)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:22, fontWeight:900 }}>D</div>
            <span style={{ fontSize:22, fontWeight:800, color:'#d8e8f8', letterSpacing:'-0.5px' }}>DeepTrade<span style={{ color:'#3b82f6' }}>Scan</span></span>
          </a>
          <div style={{ fontSize:13, color:'#324d6a', marginTop:8, fontFamily:'JetBrains Mono, monospace', letterSpacing:1 }}>INSTITUTIONAL CRYPTO ANALYSIS</div>
        </div>

        {/* Card */}
        <div style={{
          background:'linear-gradient(135deg,#0c1829 0%,#0e1d33 100%)',
          border:'1px solid rgba(26,46,74,.9)',
          borderRadius:16, padding:'32px 28px',
          boxShadow:'0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(59,130,246,.08), inset 0 1px 0 rgba(255,255,255,.04)'
        }}>

          {/* Tabs */}
          <div style={{ display:'flex', background:'rgba(6,12,24,.7)', border:'1px solid rgba(26,46,74,.7)', borderRadius:10, padding:4, marginBottom:28 }}>
            {[['login','Giriş Yap'],['register','Kayıt Ol']].map(([m, label]) => (
              <button key={m} onClick={() => { setAuthMode(m); setAuthErr(''); setAuthOk(''); }}
                style={{ flex:1, padding:'9px', borderRadius:7, border:'none', cursor:'pointer',
                  fontFamily:'Inter, sans-serif', fontSize:14, fontWeight:600, transition:'all .2s',
                  background: authMode===m ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'transparent',
                  color: authMode===m ? '#fff' : '#4a6484',
                  boxShadow: authMode===m ? '0 2px 12px rgba(37,99,235,.4)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={authMode==='login' ? doLogin : doRegister}>
            {authMode==='register' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#7e94b8', marginBottom:6 }}>Ad Soyad</label>
                <input
                  style={{ width:'100%', background:'rgba(6,12,24,.8)', border:'1.5px solid rgba(26,46,74,.8)', color:'#d8e8f8', padding:'10px 14px', borderRadius:9, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color .2s, box-shadow .2s' }}
                  type="text" placeholder="Adınız Soyadınız" autoComplete="name"
                  value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  onFocus={e=>{ e.target.style.borderColor='rgba(59,130,246,.6)'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,.1)'; }}
                  onBlur={e=>{ e.target.style.borderColor='rgba(26,46,74,.8)'; e.target.style.boxShadow='none'; }} />
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#7e94b8', marginBottom:6 }}>E-posta</label>
              <input
                style={{ width:'100%', background:'rgba(6,12,24,.8)', border:'1.5px solid rgba(26,46,74,.8)', color:'#d8e8f8', padding:'10px 14px', borderRadius:9, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color .2s, box-shadow .2s' }}
                type="email" placeholder="ornek@email.com" autoComplete="email"
                value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                onFocus={e=>{ e.target.style.borderColor='rgba(59,130,246,.6)'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,.1)'; }}
                onBlur={e=>{ e.target.style.borderColor='rgba(26,46,74,.8)'; e.target.style.boxShadow='none'; }} />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#7e94b8', marginBottom:6 }}>
                Şifre{authMode==='register' ? <span style={{ color:'#324d6a', fontWeight:400 }}> (min. 6 karakter)</span> : ''}
              </label>
              <input
                style={{ width:'100%', background:'rgba(6,12,24,.8)', border:'1.5px solid rgba(26,46,74,.8)', color:'#d8e8f8', padding:'10px 14px', borderRadius:9, fontSize:14, outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color .2s, box-shadow .2s' }}
                type="password" placeholder="••••••••"
                autoComplete={authMode==='login' ? 'current-password' : 'new-password'}
                value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                onFocus={e=>{ e.target.style.borderColor='rgba(59,130,246,.6)'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,.1)'; }}
                onBlur={e=>{ e.target.style.borderColor='rgba(26,46,74,.8)'; e.target.style.boxShadow='none'; }} />
            </div>
            {authErr && (
              <div style={{ color:'#f87171', fontSize:13, marginBottom:14, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'10px 14px' }}>{authErr}</div>
            )}
            {authOk && (
              <div style={{ color:'#34d399', fontSize:13, marginBottom:14, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', borderRadius:8, padding:'10px 14px' }}>{authOk}</div>
            )}
            <button
              type="submit" disabled={authLoad}
              style={{ width:'100%', padding:'12px',
                background: authLoad ? 'rgba(59,130,246,.4)' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700,
                cursor: authLoad ? 'not-allowed' : 'pointer', fontFamily:'Inter,sans-serif', transition:'all .2s',
                boxShadow: authLoad ? 'none' : '0 4px 20px rgba(59,130,246,.35)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {authLoad
                ? <><div className="spinner" style={{ borderColor:'rgba(255,255,255,.3)', borderTopColor:'#fff' }}/> Bekleniyor...</>
                : authMode==='login' ? 'Giriş Yap' : 'Hesap Oluştur'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#4a6484' }}>
            {authMode==='login'
              ? <span>Hesabın yok mu? <button onClick={() => { setAuthMode('register'); setAuthErr(''); }} style={{ background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:12, fontWeight:600 }}>Kayıt ol</button></span>
              : <span>Zaten hesabın var mı? <button onClick={() => { setAuthMode('login'); setAuthErr(''); }} style={{ background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:12, fontWeight:600 }}>Giriş yap</button></span>
            }
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:'#324d6a', fontFamily:'JetBrains Mono, monospace', letterSpacing:.5 }}>
          Kripto ticareti risk içerir · Yalnızca teknik analiz
        </div>
      </div>
    </div>
  );

  const vm  = VERDICT_META[apiData?.overall_verdict] || VERDICT_META.NEUTRAL;
  const isLong = apiData?.trade_direction === 'LONG';
  const smc = apiData?.smc_data;
  const sig = apiData?.signals;
  const reg = apiData?.regime;
  const ind = apiData?.technical_indicators;

  // ── PORTFOLIO PANEL ───────────────────────────────────────────
  const HistPanel = () => {
    const [ptFilter, setPtFilter] = useState('ALL');
    const [delConfirm, setDelConfirm] = useState(null); // id being confirmed for delete
    const [expanded, setExpanded] = useState(null);     // expanded trade id

    const filtered = history.filter(t => {
      const p = t.performance || {};
      if (ptFilter === 'ACTIVE')  return p.state === 'ACTIVE';
      if (ptFilter === 'CLOSED')  return p.state === 'CLOSED';
      if (ptFilter === 'PENDING') return p.state === 'PENDING';
      if (ptFilter === 'WIN')     return (p.rr || 0) > 0 && p.state === 'CLOSED';
      if (ptFilter === 'LOSS')    return (p.rr || 0) <= 0 && p.state === 'CLOSED';
      return true;
    });

    const st = histStats;
    const lastUpd = histLastUpdate
      ? histLastUpdate.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
      : '—';

    // Equity curve: cumulative R from closed trades (oldest → newest)
    const equityCurve = (() => {
      const closed = [...history]
        .filter(t => t.performance?.state === 'CLOSED' && typeof t.performance?.rr === 'number')
        .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
      let cum = 0;
      const pts = [0];
      for (const t of closed) { cum += t.performance.rr; pts.push(parseFloat(cum.toFixed(3))); }
      return pts;
    })();

    // Build SVG polyline path for the equity curve
    const buildEquityPath = (pts, w, h) => {
      if (pts.length < 2) return '';
      const minV = Math.min(...pts);
      const maxV = Math.max(...pts);
      const range = maxV - minV || 1;
      const pad = 4;
      return pts.map((v, i) => {
        const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - minV) / range) * (h - pad * 2);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    };

    const eqPath   = buildEquityPath(equityCurve, 280, 56);
    const eqFinal  = equityCurve[equityCurve.length - 1] ?? 0;
    const eqColor  = eqFinal >= 0 ? '#10b981' : '#ef4444';

    return (
      <>
        {/* MOBİL KULLANICI KARTI */}
        {(() => {
          const plan = profile?.plan || 'free';
          const userName = profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Kullanıcı';
          const email = session?.user?.email || '';
          const avatarChar = userName[0]?.toUpperCase() || 'U';
          const dailyUsed = profile?.daily_analyses || 0;
          const dailyLimit = plan === 'free' ? 5 : null;
          const pm = {
            free:  { label:'STARTER', color:'#64748b', bg:'rgba(100,116,139,.1)', border:'rgba(100,116,139,.2)', avatarGrad:'linear-gradient(135deg,#334155,#475569)', icon:'◈' },
            pro:   { label:'PRO',     color:'#3b82f6', bg:'rgba(59,130,246,.1)',  border:'rgba(59,130,246,.25)', avatarGrad:'linear-gradient(135deg,#1d4ed8,#3b82f6)', icon:'⚡' },
            elite: { label:'ELITE',   color:'#a855f7', bg:'rgba(168,85,247,.1)', border:'rgba(168,85,247,.25)', avatarGrad:'linear-gradient(135deg,#7c3aed,#a855f7)', icon:'◆' },
          }[plan] || { label:'STARTER', color:'#64748b', bg:'rgba(100,116,139,.1)', border:'rgba(100,116,139,.2)', avatarGrad:'linear-gradient(135deg,#334155,#475569)', icon:'◈' };
          return (
            <div className="mob" style={{
              flexDirection:'column', gap:0,
              background:'linear-gradient(135deg,rgba(9,18,32,.95),rgba(6,12,24,.98))',
              borderBottom:'1px solid rgba(26,46,74,.8)', padding:'12px 14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:pm.avatarGrad, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:900, color:'#fff',
                  boxShadow:`0 0 14px ${pm.color}40` }}>
                  {avatarChar}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{userName}</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:pm.color,
                      background:pm.bg, border:`1px solid ${pm.border}`, borderRadius:4, padding:'1px 7px', letterSpacing:.8 }}>
                      {pm.icon} {pm.label}
                    </span>
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginBottom:2 }}>GÜNLÜK</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:800, color:pm.color }}>
                    {dailyUsed}{dailyLimit ? `/${dailyLimit}` : '/∞'}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* HEADER */}
        <div className="ph" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'linear-gradient(90deg,rgba(9,18,32,.6),transparent)' }}>
          <div>
            <span style={{ letterSpacing:.8 }}>PORTFOLIO TRACKER</span>
            <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)', marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background: histLoad ? '#f59e0b' : '#10b981', display:'inline-block', boxShadow: histLoad ? '0 0 4px #f59e0b' : '0 0 4px #10b981' }} />
              {histLoad ? 'YENİLENİYOR...' : `SON: ${lastUpd}`}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button
              onClick={() => loadHistory(session?.access_token)}
              disabled={histLoad}
              style={{ background: histLoad ? 'rgba(59,130,246,.05)' : 'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', color:'var(--accent)', padding:'4px 10px', fontFamily:'var(--mono)', fontSize:9, cursor: histLoad ? 'not-allowed' : 'pointer', borderRadius:4, letterSpacing:.3, transition:'.15s', opacity: histLoad ? .5 : 1 }}
            >↻ YENİLE</button>
          </div>
        </div>

        {/* DB / SAVE ERROR BANNER */}
        {(histDbError || saveErr) && (
          <div style={{
            margin:'8px 12px', padding:'10px 12px', borderRadius:6,
            background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.3)',
            fontFamily:'var(--mono)', fontSize:9, color:'#fca5a5', lineHeight:1.6,
          }}>
            <div style={{ fontWeight:700, color:'#ef4444', marginBottom:4 }}>⚠ VERİTABANI HATASI</div>
            {histDbError && <div>OKUMA: {histDbError}</div>}
            {saveErr && <div>KAYIT: {saveErr}</div>}
            <div style={{ color:'#6b7280', marginTop:6, fontSize:8 }}>
              Supabase Dashboard → SQL Editor → supabase-schema.sql dosyasını çalıştır
            </div>
          </div>
        )}

        {/* STATS DASHBOARD */}
        {st && (
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.15)' }}>
            {/* Row 1: Net R + Win Rate */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:7 }}>
              <div style={{ background: (st.net_r||0) > 0
                  ? 'linear-gradient(135deg,rgba(16,185,129,.08),rgba(5,150,105,.04))'
                  : 'linear-gradient(135deg,rgba(239,68,68,.08),rgba(185,28,28,.04))',
                borderRadius:8, padding:'11px 12px',
                border:`1px solid ${(st.net_r||0) > 0 ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
                boxShadow:`inset 0 1px 0 ${(st.net_r||0) > 0 ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)'}` }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.8, marginBottom:3, textTransform:'uppercase' }}>NET R-MULTIPLE</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:900, color: (st.net_r||0) > 0 ? '#10b981' : '#ef4444', lineHeight:1, letterSpacing:-1 }}>
                  {(st.net_r||0) > 0 ? '+' : ''}{st.net_r ?? '0'}R
                </div>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:4, display:'flex', gap:6 }}>
                  <span style={{ color:'#10b981' }}>{st.closed_positions}K</span>
                  <span>·</span>
                  <span style={{ color:'var(--accent)' }}>{st.active_positions}A</span>
                  <span>·</span>
                  <span>{st.pending_positions}B</span>
                </div>
              </div>
              <div style={{ background: (st.win_rate_pct||0) >= 50
                  ? 'linear-gradient(135deg,rgba(16,185,129,.08),rgba(5,150,105,.04))'
                  : 'linear-gradient(135deg,rgba(245,158,11,.08),rgba(217,119,6,.04))',
                borderRadius:8, padding:'11px 12px',
                border:`1px solid ${(st.win_rate_pct||0) >= 50 ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)'}`,
                boxShadow:`inset 0 1px 0 ${(st.win_rate_pct||0) >= 50 ? 'rgba(16,185,129,.08)' : 'rgba(245,158,11,.08)'}` }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.8, marginBottom:3, textTransform:'uppercase' }}>WIN RATE</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:900, color: (st.win_rate_pct||0) >= 50 ? '#10b981' : '#f59e0b', lineHeight:1, letterSpacing:-1 }}>
                  {st.win_rate_pct ?? '0'}%
                </div>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:4 }}>
                  <span style={{ color:'#10b981' }}>{st.win_count}W</span>{' / '}
                  <span style={{ color:'#ef4444' }}>{st.loss_count}L</span>
                  {' — '}{st.total_signals} sinyal
                </div>
              </div>
            </div>
            {/* Row 2: 6-metric grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginBottom:5 }}>
              {[
                { label:'PROF.FACTOR', val: st.profit_factor != null ? st.profit_factor : '—', color: (st.profit_factor||0) > 1.5 ? '#10b981' : (st.profit_factor||0) > 1 ? '#f59e0b' : '#ef4444' },
                { label:'SHARPE',      val: st.sharpe_ratio  != null ? st.sharpe_ratio  : '—', color: (st.sharpe_ratio||0)  > 1   ? '#10b981' : (st.sharpe_ratio||0)  > 0.5 ? '#f59e0b' : 'var(--t2)' },
                { label:'MAX DD',      val: `-${st.max_drawdown_r ?? 0}R`,                      color: '#ef4444' },
                { label:'CALMAR',      val: st.calmar_ratio  != null ? st.calmar_ratio  : '—', color: (st.calmar_ratio||0)  > 1   ? '#10b981' : 'var(--t2)' },
                { label:'STREAK',      val: st.consecutive_wins > 0 ? `${st.consecutive_wins}W🔥` : st.consecutive_losses > 0 ? `${st.consecutive_losses}L` : '—',
                  color: (st.consecutive_wins||0) > 0 ? '#10b981' : (st.consecutive_losses||0) > 0 ? '#ef4444' : 'var(--t2)' },
                { label:'EXPECTANCY',  val: st.expectancy_r != null ? `${(st.expectancy_r||0) > 0 ? '+' : ''}${st.expectancy_r}R` : '—',
                  color: (st.expectancy_r||0) > 0 ? '#10b981' : '#ef4444' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background:'linear-gradient(135deg,var(--card2),rgba(11,22,40,.6))', borderRadius:6, padding:'6px 7px', border:'1px solid var(--border)', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, right:0, width:24, height:24, borderRadius:'0 6px 0 24px', background:`${color}10` }} />
                  <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)', letterSpacing:.5, textTransform:'uppercase' }}>{label}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:800, marginTop:3, color }}>{val}</div>
                </div>
              ))}
            </div>
            {/* Row 3: avg win/loss R + visual PF bar */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:6 }}>
              <div style={{ background:'linear-gradient(135deg,rgba(16,185,129,.07),rgba(5,150,105,.03))', borderRadius:6, padding:'6px 9px', border:'1px solid rgba(16,185,129,.15)' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'#6ee7b7', letterSpacing:.5, marginBottom:2 }}>ORT. KAZANÇ</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'#10b981' }}>+{st.avg_win_r ?? 0}R</div>
              </div>
              <div style={{ background:'linear-gradient(135deg,rgba(239,68,68,.07),rgba(185,28,28,.03))', borderRadius:6, padding:'6px 9px', border:'1px solid rgba(239,68,68,.15)' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:6, color:'#fca5a5', letterSpacing:.5, marginBottom:2 }}>ORT. KAYIP</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'#ef4444' }}>-{st.avg_loss_r ?? 0}R</div>
              </div>
            </div>
            {/* Win/Loss proportion bar */}
            {(st.win_count + st.loss_count) > 0 && (() => {
              const winPct = (st.win_count / (st.win_count + st.loss_count)) * 100;
              return (
                <div>
                  <div style={{ height:4, borderRadius:2, background:'rgba(239,68,68,.3)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${winPct.toFixed(1)}%`, background:'linear-gradient(90deg,#10b981,#34d399)', borderRadius:2, transition:'width .6s ease' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:2, fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)' }}>
                    <span style={{ color:'#10b981' }}>WIN {winPct.toFixed(0)}%</span>
                    <span style={{ color:'#ef4444' }}>LOSS {(100 - winPct).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* EQUITY CURVE */}
        {equityCurve.length >= 2 && (
          <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.18)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.8 }}>EQUİTY CURVE (R Kümülatif)</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:800, color: eqColor }}>
                {eqFinal >= 0 ? '+' : ''}{eqFinal}R
              </span>
            </div>
            <svg width="100%" viewBox="0 0 280 56" preserveAspectRatio="none" style={{ display:'block', height:48 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={eqColor} stopOpacity="0.25"/>
                  <stop offset="100%" stopColor={eqColor} stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* Fill area */}
              <path d={`${eqPath} L${(280-4).toFixed(1)},56 L4,56 Z`} fill="url(#eqGrad)" />
              {/* Line */}
              <path d={eqPath} fill="none" stroke={eqColor} strokeWidth="1.5" strokeLinejoin="round" />
              {/* Zero line */}
              {equityCurve.some(v => v < 0) && (() => {
                const minV = Math.min(...equityCurve), maxV = Math.max(...equityCurve);
                const range = maxV - minV || 1;
                const zeroY = 56 - 4 - ((0 - minV) / range) * (56 - 8);
                return <line x1="4" y1={zeroY.toFixed(1)} x2="276" y2={zeroY.toFixed(1)} stroke="rgba(255,255,255,.12)" strokeWidth="1" strokeDasharray="3 3" />;
              })()}
            </svg>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:6, color:'var(--t3)', marginTop:2 }}>
              <span>{equityCurve.length - 1} işlem</span>
              <span>{st?.closed_positions ?? 0} kapandı</span>
            </div>
          </div>
        )}

        {/* FILTER BAR */}
        <div style={{ display:'flex', gap:4, padding:'7px 12px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', alignItems:'center' }}>
          {[
            { f:'ALL',     label:`Tümü (${history.length})` },
            { f:'ACTIVE',  label:`Açık (${history.filter(t=>t.performance?.state==='ACTIVE').length})` },
            { f:'PENDING', label:`Bekliyor (${history.filter(t=>t.performance?.state==='PENDING').length})` },
            { f:'CLOSED',  label:`Kapandı (${history.filter(t=>t.performance?.state==='CLOSED').length})` },
            { f:'WIN',     label:`Kazandı` },
            { f:'LOSS',    label:`Kaybetti` },
          ].map(({ f, label }) => (
            <button key={f} className={`pt-pill ${ptFilter===f?'on':''}`} onClick={() => setPtFilter(f)}>{label}</button>
          ))}
        </div>

        {/* TRADE LIST */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {histLoad && <div style={{ padding:20, display:'flex', justifyContent:'center' }}><div className="spinner" /></div>}
          {!histLoad && filtered.length === 0 && (
            <div style={{ padding:'36px 20px', textAlign:'center' }}>
              {history.length === 0 ? (
                <>
                  <div style={{ fontFamily:'var(--mono)', fontSize:28, color:'rgba(59,130,246,.25)', marginBottom:10 }}>◈</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'var(--t2)', marginBottom:6 }}>Portfolio Boş</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', lineHeight:1.8 }}>
                    İlk sinyal analizini çalıştırınca<br/>burada izlemeye başlarsın.
                  </div>
                  <div style={{ marginTop:16, padding:'8px 14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.15)', borderRadius:6, display:'inline-block', fontFamily:'var(--mono)', fontSize:8, color:'var(--accent)' }}>
                    ↑ Analiz panelinden başla
                  </div>
                </>
              ) : (
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>Bu filtre için kayıt yok.</div>
              )}
            </div>
          )}

          {filtered.map((t, i) => {
            const p = t.performance || {};
            const isLong = t.direction === 'LONG';

            // Parse raw numbers for progress bar
            const toNum = v => parseFloat(String(v || '').replace(/[$,]/g, '')) || 0;
            const nEntry   = toNum(t.entry);
            const nStop    = toNum(t.stop);
            const nTp1     = toNum(t.targets?.tp1);
            const nTp2     = toNum(t.targets?.tp2);
            const nTp3     = toNum(t.targets?.tp3) || (nEntry * (isLong ? 1.08 : 0.92));
            const nCurrent = toNum(t.currentPrice);

            let progress = 50;
            if (nEntry && nStop && nTp3 && nCurrent) {
              const range = Math.abs(isLong ? (nTp3 - nStop) : (nStop - nTp3));
              const pos   = isLong ? (nCurrent - nStop) : (nStop - nCurrent);
              progress = Math.max(0, Math.min(100, (pos / range) * 100));
            }
            const entryPct = nEntry && nStop && nTp3
              ? Math.max(0, Math.min(100, (isLong ? (nEntry - nStop) : (nStop - nEntry)) / Math.abs(isLong ? nTp3 - nStop : nStop - nTp3) * 100))
              : 33;

            const progressColor = progress >= entryPct
              ? `linear-gradient(90deg, #dc2626 0%, #d97706 ${entryPct}%, #16a34a 100%)`
              : `linear-gradient(90deg, #dc2626 0%, #d97706 ${progress}%, #e2e8f0 ${progress}%)`;

            return (
              <div key={t.id || i} className="pt-card">

                {/* ROW 1: dir + coin + grade + status */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span className={`dir-badge ${isLong ? 'long' : 'short'}`}>{isLong ? '▲ LONG' : '▼ SHORT'}</span>
                    <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:14 }}>{t.coin}</span>
                    {t.grade && (
                      <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:20, padding:'2px 7px' }}>
                        {t.grade}
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{
                      fontFamily:'var(--mono)', fontSize:8, fontWeight:700,
                      color: p.uiColor || 'var(--t3)',
                      background: `${p.uiColor || '#9CA3AF'}18`,
                      border: `1px solid ${p.uiColor || '#9CA3AF'}35`,
                      borderRadius:3, padding:'2px 6px', whiteSpace:'nowrap'
                    }}>{p.badge || '—'}</span>
                  </div>
                </div>

                {/* ROW 2: ENTRY / STOP / CURRENT */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, marginBottom:6 }}>
                  <div style={{ background:'rgba(16,185,129,.05)', borderRadius:4, padding:'5px 7px', border:'1px solid rgba(16,185,129,.15)' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'#34D399', marginBottom:2 }}>ENTRY</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'var(--t1)' }}>{t.entry || '—'}</div>
                  </div>
                  <div style={{ background:'rgba(239,68,68,.05)', borderRadius:4, padding:'5px 7px', border:'1px solid rgba(239,68,68,.15)' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'#EF4444', marginBottom:2 }}>STOP</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'var(--t1)' }}>{t.stop || '—'}</div>
                  </div>
                  <div style={{ background:'rgba(59,130,246,.05)', borderRadius:4, padding:'5px 7px', border:`1px solid ${p.pnlPct > 0 ? 'rgba(16,185,129,.2)' : p.pnlPct < 0 ? 'rgba(239,68,68,.2)' : 'rgba(59,130,246,.15)'}` }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'#60A5FA', marginBottom:2 }}>CURRENT</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color: p.pnlPct > 0 ? 'var(--green)' : p.pnlPct < 0 ? 'var(--red)' : 'var(--t1)' }}>
                      {t.currentPrice || '—'}
                    </div>
                  </div>
                </div>

                {/* ROW 3: TP1 / TP2 / TP3 */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, marginBottom:8 }}>
                  {[
                    { label:'TP1', val: t.targets?.tp1, color:'#34D399', bg:'rgba(52,211,153,.05)', border:'rgba(52,211,153,.15)' },
                    { label:'TP2', val: t.targets?.tp2, color:'#3B82F6', bg:'rgba(59,130,246,.05)', border:'rgba(59,130,246,.15)' },
                    { label:'TP3', val: t.targets?.tp3, color:'#A78BFA', bg:'rgba(167,139,250,.05)', border:'rgba(167,139,250,.15)' },
                  ].map(({ label, val, color, bg, border }) => (
                    <div key={label} style={{ background: bg, borderRadius:4, padding:'5px 7px', border:`1px solid ${border}` }}>
                      <div style={{ fontFamily:'var(--mono)', fontSize:7, color, marginBottom:2 }}>{label}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:'var(--t2)' }}>{val || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* PRICE PROGRESS BAR: SL → Entry → TP3 */}
                {p.level === 'ENTRY_WAITING' ? (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ height:5, background:'var(--card2)', borderRadius:3, border:'1px solid var(--border)' }} />
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>
                      <span>SL</span>
                      <span style={{ color: p.distanceToEntry ? '#60A5FA' : '#9CA3AF' }}>
                        {p.distanceToEntry ? `entry ${p.distanceToEntry} uzakta` : 'entry bekleniyor'}
                        {t.currentPrice && t.currentPrice !== '—' ? ` · şimdi ${t.currentPrice}` : ''}
                      </span>
                      <span>TP3</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ height:5, background:'var(--card2)', borderRadius:3, overflow:'visible', position:'relative', border:'1px solid var(--border)' }}>
                      <div style={{ height:'100%', borderRadius:3, width:`${progress}%`, background: progressColor, transition:'width .5s ease' }} />
                      <div style={{
                        position:'absolute', top:-3, height:11, width:2, background:'rgba(232,238,248,.6)', borderRadius:1,
                        left:`${entryPct}%`, transform:'translateX(-50%)'
                      }} />
                      {nCurrent > 0 && (
                        <div style={{
                          position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
                          width:8, height:8, borderRadius:'50%',
                          background: p.pnlPct > 0 ? 'var(--green)' : p.pnlPct < 0 ? 'var(--red)' : '#F59E0B',
                          border:'2px solid var(--bg)', boxShadow:'0 0 6px currentColor',
                          left:`${progress}%`
                        }} />
                      )}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>
                      <span>SL</span><span>ENTRY</span><span>TP3</span>
                    </div>
                  </div>
                )}

                {/* ROW 4: close info if closed */}
                {p.state === 'CLOSED' && p.closePrice && (
                  <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <div style={{ background:'rgba(100,116,139,.08)', borderRadius:4, padding:'4px 8px', border:'1px solid rgba(100,116,139,.2)' }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>KAPANIŞ FİYATI: </span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'var(--t1)' }}>${parseFloat(p.closePrice).toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                    </div>
                    {t.closedDate && (
                      <div style={{ background:'rgba(100,116,139,.08)', borderRadius:4, padding:'4px 8px', border:'1px solid rgba(100,116,139,.2)' }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>KAPANIŞ: </span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'var(--t2)' }}>{t.closedDate}</span>
                      </div>
                    )}
                    {p.tpHit?.length > 0 && (
                      <div style={{ background:'rgba(16,185,129,.08)', borderRadius:4, padding:'4px 8px', border:'1px solid rgba(16,185,129,.15)' }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#34D399' }}>TP HIT: </span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'var(--green)' }}>{p.tpHit.join(' → ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ROW 5: P&L + R:R + date + chart button */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    {p.level !== 'ENTRY_WAITING' ? (
                      <>
                        <div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:2 }}>P&L</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:800, color: p.pnlPct > 0 ? 'var(--green)' : p.pnlPct < 0 ? 'var(--red)' : 'var(--t2)' }}>
                            {p.pnlFormatted || '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:2 }}>R ÇARPANI</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:800, color: p.rr > 0 ? 'var(--green)' : p.rr < 0 ? 'var(--red)' : 'var(--t2)' }}>
                            {p.rrFormatted || '—'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#6B7280', fontStyle:'italic' }}>Entry bölgesi bekleniyor...</div>
                        {p.distanceToEntry && (
                          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>
                            Uzaklık: <span style={{ color:'var(--accent)' }}>{p.distanceToEntry}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>{t.date}</div>
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    {t.rawSetup && (
                      <button
                        onClick={() => setChartModal({ coin: t.coin, setup: t.rawSetup })}
                        style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--t2)', padding:'3px 8px', fontFamily:'var(--mono)', fontSize:8, cursor:'pointer', borderRadius:3, letterSpacing:.3, transition:'.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background='var(--blt)'; e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; }}
                      >
                        📊 Grafik
                      </button>
                    )}
                    {/* Delete button */}
                    {delConfirm === t.id ? (
                      <div style={{ display:'flex', gap:3 }}>
                        <button
                          onClick={() => { deleteTrade(t.id, session?.access_token); setDelConfirm(null); }}
                          style={{ background:'#EF4444', border:'none', color:'#fff', padding:'3px 7px', fontFamily:'var(--mono)', fontSize:8, cursor:'pointer', borderRadius:3 }}
                        >✓ SİL</button>
                        <button
                          onClick={() => setDelConfirm(null)}
                          style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--t3)', padding:'3px 7px', fontFamily:'var(--mono)', fontSize:8, cursor:'pointer', borderRadius:3 }}
                        >✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDelConfirm(t.id)}
                        style={{ background:'transparent', border:'1px solid rgba(239,68,68,.25)', color:'rgba(239,68,68,.6)', padding:'3px 7px', fontFamily:'var(--mono)', fontSize:8, cursor:'pointer', borderRadius:3, transition:'.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='#EF4444'; e.currentTarget.style.color='#EF4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(239,68,68,.25)'; e.currentTarget.style.color='rgba(239,68,68,.6)'; }}
                        title="Sinyali sil"
                      >🗑</button>
                    )}
                    </div>{/* /buttons-row */}
                  </div>{/* /column */}
                </div>{/* /ROW5 */}

              </div>
            );
          })}
        </div>
      </>
    );
  };

  // ── MARKET PANEL ─────────────────────────────────────────────
  const MarketPanel = () => {
    const [mktPrices, setMktPrices]   = useState([]);
    const [mktLoading, setMktLoading] = useState(false);
    const [mktErr, setMktErr]         = useState('');
    const [mktCat, setMktCat]         = useState('ALL');
    const [mktSort, setMktSort]       = useState('volume');
    const [mktAsc, setMktAsc]         = useState(false);
    const [mktTs, setMktTs]           = useState(null);
    const mktTimerRef = useRef(null);

    const loadPrices = async () => {
      setMktLoading(true);
      setMktErr('');
      try {
        const r = await fetch('/api/prices');
        const d = await r.json();
        if (Array.isArray(d.prices)) {
          setMktPrices(d.prices);
          setMktTs(new Date(d.ts));
        } else {
          setMktErr(d.error || 'Fiyat verisi alınamadı');
        }
      } catch {
        setMktErr('Bağlantı hatası');
      } finally {
        setMktLoading(false);
      }
    };

    useEffect(() => {
      loadPrices();
      mktTimerRef.current = setInterval(loadPrices, 30_000);
      return () => clearInterval(mktTimerRef.current);
    }, []);

    // Kategori filtresi
    const catCoins = mktCat === 'ALL' ? null : (CATS[mktCat]?.coins || []);
    let visible = catCoins ? mktPrices.filter(p => catCoins.includes(p.coin)) : [...mktPrices];

    // Sıralama
    visible.sort((a, b) => {
      let d = 0;
      if (mktSort === 'volume') d = b.volume - a.volume;
      else if (mktSort === 'change') d = b.change24h - a.change24h;
      else if (mktSort === 'price')  d = b.price - a.price;
      else if (mktSort === 'name')   d = a.coin.localeCompare(b.coin);
      return mktAsc ? -d : d;
    });

    const gainers  = mktPrices.filter(p => p.change24h > 0).length;
    const losers   = mktPrices.filter(p => p.change24h < 0).length;
    const totalVol = mktPrices.reduce((s, p) => s + (p.volume || 0), 0);

    const fmtPrice = (v) => {
      if (!v && v !== 0) return '—';
      if (v >= 10000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      if (v >= 1)     return `$${v.toFixed(4)}`;
      if (v >= 0.001) return `$${v.toFixed(6)}`;
      return `$${v.toFixed(8)}`;
    };

    const fmtVol = (v) => {
      if (!v) return '—';
      if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
      return `$${(v / 1e3).toFixed(0)}K`;
    };

    const handleSort = (key) => {
      if (mktSort === key) setMktAsc(a => !a);
      else { setMktSort(key); setMktAsc(false); }
    };

    const sortBtn = (key, label) => {
      const on = mktSort === key;
      return (
        <button key={key} onClick={() => handleSort(key)} style={{
          fontFamily:'var(--mono)', fontSize:8.5, fontWeight:700, padding:'5px 10px',
          borderRadius:6, cursor:'pointer', transition:'all .15s',
          border:`1px solid ${on ? 'rgba(0,212,255,.45)' : 'var(--border)'}`,
          background: on ? 'rgba(0,212,255,.09)' : 'transparent',
          color: on ? '#00D4FF' : 'var(--t3)',
        }}>
          {label}{on ? (mktAsc ? ' ↑' : ' ↓') : ''}
        </button>
      );
    };

    return (
      <div style={{ paddingBottom:80 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:17, letterSpacing:-.5 }}>
              MARKET<span style={{ color:'var(--accent)' }}>OVERVIEW</span>
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:3, letterSpacing:.3 }}>
              {mktTs
                ? `Son güncelleme: ${mktTs.toLocaleTimeString('tr-TR')} · Otomatik 30s`
                : 'Binance anlık verisi yükleniyor...'}
            </div>
          </div>
          <button onClick={loadPrices} disabled={mktLoading} style={{
            background:'rgba(0,212,255,.08)', border:'1px solid rgba(0,212,255,.22)',
            borderRadius:8, padding:'7px 14px', cursor:'pointer',
            fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:'#00D4FF',
            display:'flex', alignItems:'center', gap:6,
            opacity: mktLoading ? .6 : 1,
          }}>
            {mktLoading && mktPrices.length > 0
              ? <><div className="spinner" style={{ width:10, height:10, borderWidth:2 }}/> GÜNCELLEME</>
              : '↺  YENİLE'}
          </button>
        </div>

        {/* ── Stats ── */}
        {mktPrices.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {[
              { lbl:'YÜKSELENler', val:gainers,         col:'#10B981' },
              { lbl:'DÜŞENLER',    val:losers,           col:'#EF4444' },
              { lbl:'TOPLAM VOL',  val:fmtVol(totalVol), col:'#60A5FA' },
            ].map(s => (
              <div key={s.lbl} style={{ background:'var(--card)', borderRadius:8, padding:'10px', textAlign:'center', border:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:1, marginBottom:4 }}>{s.lbl}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:900, color:s.col }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Kategori filtresi ── */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10, overflowX:'auto', paddingBottom:2 }}>
          {Object.entries(CATS).map(([k, v]) => (
            <button key={k} onClick={() => setMktCat(k)} style={{
              fontFamily:'var(--mono)', fontSize:9, fontWeight:700,
              padding:'5px 11px', borderRadius:20, cursor:'pointer', transition:'all .15s',
              border:`1px solid ${mktCat===k ? v.color : 'var(--border)'}`,
              background: mktCat===k ? `${v.color}18` : 'transparent',
              color: mktCat===k ? v.color : 'var(--t3)',
              whiteSpace:'nowrap',
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Sıralama ── */}
        <div style={{ display:'flex', gap:5, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', flexShrink:0 }}>SIRALA:</span>
          {sortBtn('volume', 'HACİM')}
          {sortBtn('change', 'DEĞİŞİM')}
          {sortBtn('price',  'FİYAT')}
          {sortBtn('name',   'A-Z')}
        </div>

        {/* ── Hata ── */}
        {mktErr && (
          <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'12px 16px', marginBottom:12, fontFamily:'var(--mono)', fontSize:11, color:'var(--red)' }}>
            ⚠ {mktErr}
          </div>
        )}

        {/* ── İskelet yükleyici ── */}
        {mktLoading && mktPrices.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{
                height:54, background:'var(--card)', borderRadius:8, border:'1px solid var(--border)',
                opacity: 1 - i * 0.08, animation:'pulse 1.5s ease infinite',
              }} />
            ))}
          </div>
        )}

        {/* ── Coin listesi ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {visible.map((p, idx) => {
            const isPos = p.change24h >= 0;
            const chCol = isPos ? '#10B981' : '#EF4444';
            const chBg  = isPos ? 'rgba(16,185,129,.09)' : 'rgba(239,68,68,.07)';
            return (
              <div key={p.coin}
                onClick={() => { setCoin(p.coin); setMobTab('analyze'); }}
                style={{ display:'flex', alignItems:'center', background:'var(--card)', borderRadius:8, border:'1px solid var(--border)', padding:'9px 12px', cursor:'pointer', transition:'border-color .15s, background .15s', gap:8 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,212,255,.3)'; e.currentTarget.style.background='rgba(0,212,255,.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--card)'; }}
              >
                {/* Sıra */}
                <div style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--t3)', width:20, textAlign:'right', flexShrink:0 }}>{idx + 1}</div>

                {/* Coin */}
                <div style={{ flex:'0 0 54px' }}>
                  <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:13, letterSpacing:.5 }}>{p.coin}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', marginTop:1 }}>USDT</div>
                </div>

                {/* Fiyat */}
                <div style={{ flex:'1 1 auto', minWidth:0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {fmtPrice(p.price)}
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    H {fmtPrice(p.high)} · L {fmtPrice(p.low)}
                  </div>
                </div>

                {/* 24h değişim */}
                <div style={{ flex:'0 0 auto' }}>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:11, color:chCol, background:chBg, borderRadius:5, padding:'3px 7px', display:'inline-block', minWidth:62, textAlign:'center' }}>
                    {isPos ? '+' : ''}{p.change24h.toFixed(2)}%
                  </span>
                </div>

                {/* Hacim */}
                <div style={{ flex:'0 0 52px', textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)' }}>VOL</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color:'#60A5FA' }}>{fmtVol(p.volume)}</div>
                </div>

                {/* SCAN butonu */}
                <div style={{ flex:'0 0 auto' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setCoin(p.coin); setMobTab('analyze'); analyze(p.coin); }}
                    style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, padding:'5px 9px', borderRadius:5, border:'1px solid rgba(0,212,255,.28)', background:'rgba(0,212,255,.07)', color:'#00D4FF', cursor:'pointer', whiteSpace:'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(0,212,255,.16)'; e.currentTarget.style.borderColor='rgba(0,212,255,.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(0,212,255,.07)'; e.currentTarget.style.borderColor='rgba(0,212,255,.28)'; }}
                  >
                    SCAN
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {visible.length === 0 && !mktLoading && (
          <div style={{ textAlign:'center', padding:'48px 0', fontFamily:'var(--mono)', fontSize:12, color:'var(--t3)' }}>
            Bu kategoride coin bulunamadı
          </div>
        )}

      </div>
    );
  };

  // ── MAIN APP ─────────────────────────────────────────────────
  return (
    <div className="layout">
      <style>{CSS}</style>
      <Head><title>DeepTradeScan — Market Maker Terminal</title></Head>

      {/* TOPBAR */}
      <div className="topbar">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:14, letterSpacing:.5 }}>
            DEEPTRADE<span style={{ color:'var(--accent)' }}>SCAN</span>
          </div>
          <span className="desk" style={{
            padding:'2px 8px', borderRadius:3, fontFamily:'var(--mono)', fontSize:8, fontWeight:700,
            background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', color:'var(--accent)', letterSpacing:1
          }}>MM ENGINE v12</span>
          <button className="desk" onClick={() => setMobTab(t => t === 'market' ? 'analyze' : 'market')} style={{
            fontFamily:'var(--mono)', fontSize:9, fontWeight:700, padding:'3px 12px', borderRadius:5, cursor:'pointer',
            border:`1px solid ${mobTab==='market' ? 'rgba(0,212,255,.55)' : 'rgba(0,212,255,.25)'}`,
            background: mobTab==='market' ? 'rgba(0,212,255,.14)' : 'rgba(0,212,255,.05)',
            color:'#00D4FF', letterSpacing:.6, transition:'all .15s',
          }}>
            ▦ MARKET
          </button>
          {apiData && (
            <span className="desk" style={{
              padding:'2px 9px', borderRadius:3, fontFamily:'var(--mono)', fontSize:9, fontWeight:700,
              background: vm.bg, color: vm.color, border:`1px solid ${vm.color}40`, letterSpacing:.5
            }}>
              {vm.icon} {vm.label} — {coin}/USDT
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {apiData && (
            <span className="desk" style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t2)' }}>
              {apiData.current_price}
              <span style={{ color: apiData.price_change_24h?.startsWith('+') ? 'var(--green)' : 'var(--red)', marginLeft:8, fontSize:11 }}>
                {apiData.price_change_24h}
              </span>
            </span>
          )}
          {/* Plan badge — topbar */}
          {(() => {
            const plan = profile?.plan || 'free';
            const pm = { free:{label:'STARTER',color:'#64748b',bg:'rgba(100,116,139,.12)',border:'rgba(100,116,139,.25)'}, pro:{label:'PRO',color:'#3b82f6',bg:'rgba(59,130,246,.15)',border:'rgba(59,130,246,.35)'}, elite:{label:'ELITE',color:'#a855f7',bg:'rgba(168,85,247,.15)',border:'rgba(168,85,247,.35)'} }[plan] || {label:'FREE',color:'#64748b',bg:'rgba(100,116,139,.12)',border:'rgba(100,116,139,.25)'};
            return (
              <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, padding:'3px 9px', borderRadius:4,
                background:pm.bg, color:pm.color, border:`1px solid ${pm.border}`, letterSpacing:1 }}>
                {pm.label}
              </span>
            );
          })()}
          <button className="btn-exec btn-sm" onClick={doLogout} style={{ letterSpacing:.5 }}>ÇIKIŞ</button>
        </div>
      </div>

      <div className="workspace">
        {/* LEFT SIDEBAR */}
        <div className="sidebar-l">
          <div className="ph">ASSET SCREENER</div>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
            <input className="search-inp" placeholder="Coin ara..." value={search} onChange={e=>setSearch(e.target.value)} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
              {Object.entries(CATS).map(([k,v]) => (
                <button key={k} className={`pill ${activeCat===k?'on':''}`}
                  style={{ color: activeCat===k ? v.color : undefined, borderColor: activeCat===k ? v.color+'44' : undefined }}
                  onClick={() => setActiveCat(k)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filteredCoins.map(c => (
              <div key={c} className={`coin-row ${coin===c?'on':''}`} onClick={() => setCoin(c)}>
                <div>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12 }}>{c}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginLeft:4 }}>/USDT</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── USER PROFILE PANEL ── */}
          {(() => {
            const plan = profile?.plan || 'free';
            const userName = profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Kullanıcı';
            const email    = session?.user?.email || '';
            const avatarChar = userName[0]?.toUpperCase() || 'U';
            const dailyUsed  = profile?.daily_analyses || 0;
            const dailyLimit = plan === 'free' ? 5 : null;
            const usagePct   = dailyLimit ? Math.min(100, (dailyUsed / dailyLimit) * 100) : 100;
            const pm = {
              free:  { label:'STARTER', color:'#64748b', glow:'rgba(100,116,139,.2)',  bg:'rgba(100,116,139,.08)', border:'rgba(100,116,139,.2)',  icon:'◈', avatarGrad:'linear-gradient(135deg,#334155,#475569)' },
              pro:   { label:'PRO',     color:'#3b82f6', glow:'rgba(59,130,246,.3)',   bg:'rgba(59,130,246,.08)',  border:'rgba(59,130,246,.3)',   icon:'⚡', avatarGrad:'linear-gradient(135deg,#1d4ed8,#3b82f6)' },
              elite: { label:'ELITE',   color:'#a855f7', glow:'rgba(168,85,247,.35)',  bg:'rgba(168,85,247,.08)', border:'rgba(168,85,247,.3)',   icon:'◆', avatarGrad:'linear-gradient(135deg,#7c3aed,#a855f7)' },
            }[plan] || { label:'STARTER', color:'#64748b', glow:'rgba(100,116,139,.2)', bg:'rgba(100,116,139,.08)', border:'rgba(100,116,139,.2)', icon:'◈', avatarGrad:'linear-gradient(135deg,#334155,#475569)' };

            return (
              <div style={{
                borderTop:`1px solid rgba(26,46,74,.8)`,
                padding:'14px 14px 12px',
                background:`linear-gradient(135deg,rgba(9,18,32,.9),rgba(6,12,24,.95))`,
                flexShrink:0,
                position:'relative',
              }}>
                {/* Üst accent çizgisi */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px',
                  background:`linear-gradient(90deg, transparent, ${pm.color}50, transparent)` }} />

                {/* Avatar + İsim + Email */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{
                    width:38, height:38, borderRadius:11, flexShrink:0,
                    background: pm.avatarGrad,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:16, fontWeight:900, color:'#fff',
                    boxShadow:`0 0 14px ${pm.glow}`,
                  }}>
                    {avatarChar}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'var(--t1)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {userName}
                    </div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>
                      {email}
                    </div>
                  </div>
                </div>

                {/* Plan badge */}
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background: pm.bg, border:`1px solid ${pm.border}`,
                  borderRadius:8, padding:'7px 10px', marginBottom:10,
                  boxShadow:`inset 0 1px 0 rgba(255,255,255,.04)`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:13, color:pm.color }}>{pm.icon}</span>
                    <div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:pm.color, letterSpacing:1.2 }}>
                        {pm.label} MEMBER
                      </div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:1 }}>
                        {plan === 'free' ? 'Ücretsiz Plan' : plan === 'pro' ? '$99/ay' : '$299/ay'}
                      </div>
                    </div>
                  </div>
                  {plan === 'free' && (
                    <a href="https://t.me/DeepTradeScanner" target="_blank" rel="noopener noreferrer"
                      onClick={() => sendNotify('upgrade', { plan: 'pro' })}
                      style={{
                        fontFamily:'var(--mono)', fontSize:7, fontWeight:800,
                        color:'#f59e0b', background:'rgba(245,158,11,.1)',
                        border:'1px solid rgba(245,158,11,.25)', borderRadius:4,
                        padding:'2px 7px', textDecoration:'none', letterSpacing:.5,
                        transition:'.15s', whiteSpace:'nowrap',
                      }}>↑ UPGRADE</a>
                  )}
                </div>

                {/* Günlük kullanım */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.5 }}>GÜNLÜK ANALİZ</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700,
                      color: dailyLimit && dailyUsed >= dailyLimit ? '#ef4444' : pm.color }}>
                      {dailyUsed}{dailyLimit ? `/${dailyLimit}` : ' / ∞'}
                    </span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,.05)', borderRadius:2, overflow:'hidden', border:'1px solid rgba(26,46,74,.5)' }}>
                    <div style={{
                      height:'100%', borderRadius:2, transition:'width .5s ease',
                      width: dailyLimit ? `${usagePct}%` : '100%',
                      background: dailyLimit
                        ? `linear-gradient(90deg, ${pm.color}, ${usagePct >= 80 ? '#ef4444' : pm.color}cc)`
                        : `linear-gradient(90deg, #059669, #10b981)`,
                      boxShadow: `0 0 6px ${pm.color}60`,
                    }} />
                  </div>
                </div>

                {/* Logout */}
                <button onClick={doLogout} style={{
                  width:'100%', padding:'7px', borderRadius:6, cursor:'pointer',
                  fontFamily:'var(--mono)', fontSize:8, fontWeight:700, letterSpacing:.8,
                  background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.18)',
                  color:'rgba(239,68,68,.65)', transition:'all .15s',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.15)';e.currentTarget.style.color='#f87171';e.currentTarget.style.borderColor='rgba(239,68,68,.4)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,.07)';e.currentTarget.style.color='rgba(239,68,68,.65)';e.currentTarget.style.borderColor='rgba(239,68,68,.18)';}}
                >
                  ⎋ OTURUM KAPAT
                </button>
              </div>
            );
          })()}
        </div>

        {/* MAIN */}
        <div className="main">
          {/* Mobile COINS Tab — borsa/hisseler ile aynı mantık */}
          {mobTab === 'coins' && (
            <div style={{ paddingBottom: 16 }}>
              <div className="mob-coins-sticky">
                <input className="search-inp" style={{ marginBottom: 8 }} placeholder="Coin ara..." value={search} onChange={e => setSearch(e.target.value)} />
                <div className="mob-cat-bar">
                  {Object.entries(CATS).map(([key, cat]) => (
                    <button key={key}
                      onClick={() => setActiveCat(key)}
                      style={{
                        fontFamily:'var(--mono)', fontSize:9, fontWeight:800, letterSpacing:.5,
                        padding:'4px 12px', borderRadius:20, border:'1px solid', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                        background: activeCat===key ? `${cat.color}20` : 'transparent',
                        color: activeCat===key ? cat.color : 'var(--t3)',
                        borderColor: activeCat===key ? `${cat.color}50` : 'rgba(255,255,255,.08)',
                      }}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                {filteredCoins.map(c => (
                  <div key={c} className={`mob-coin-item ${coin===c?'sel':''}`}
                    onClick={() => { setCoin(c); setMobTab('analyze'); }}>
                    <div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:900,
                        color: coin===c ? 'var(--accent)' : 'var(--t1)', lineHeight:1.2 }}>{c}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:2 }}>/ USDT</div>
                    </div>
                    {coin === c ? (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:'var(--accent)',
                        background:'rgba(0,212,255,.10)', border:'1px solid rgba(0,212,255,.25)',
                        borderRadius:4, padding:'2px 8px' }}>✓ SEÇİLİ</div>
                    ) : (
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>›</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyze Tab */}
          <div style={{ display: mobTab==='analyze' ? 'block' : 'none' }}>

            {/* Mobile: SEÇİLİ COİN chip (sadece mobilde görünür) */}
            <div className="mob-ticker-sel">
              <div>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:1, marginBottom:3 }}>SEÇİLİ COİN</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:900, color:'var(--accent)' }}>
                  {coin} <span style={{ color:'var(--t3)', fontSize:10, fontWeight:400 }}>/USDT</span>
                </div>
              </div>
              <button onClick={() => setMobTab('coins')}
                style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:'var(--accent)',
                  background:'rgba(0,212,255,.10)', border:'1px solid rgba(0,212,255,.30)',
                  borderRadius:6, padding:'6px 13px', cursor:'pointer', letterSpacing:.3 }}>
                DEĞİŞTİR ›
              </button>
            </div>

            {/* COIN HEADER + EXECUTE */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:28, lineHeight:1, letterSpacing:-1 }}>
                    {coin}<span style={{ color:'var(--t3)', fontSize:18 }}>/USDT</span>
                  </div>
                  {apiData ? (
                    <div style={{ marginTop:4, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700 }}>{apiData.current_price}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, color: apiData.price_change_24h?.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>{apiData.price_change_24h}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>Vol {apiData.volume_24h}</span>
                    </div>
                  ) : (
                    <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginTop:4, letterSpacing:.5 }}>MARKET MAKER INTELLIGENCE</div>
                  )}
                </div>
              </div>
              <button className="btn-exec" onClick={() => analyze(coin)} disabled={loading} style={{ background: loading ? 'rgba(0,212,255,.2)' : 'linear-gradient(135deg, #0ea5e9, #00D4FF, #7C3AED)', boxShadow:'0 4px 20px rgba(0,212,255,.3)' }}>
                {loading
                  ? <><div className="spinner"/> SCANNING...</>
                  : <><span style={{ fontSize:14 }}>◈</span> DEEP SCAN</>
                }
              </button>
            </div>

            {/* PROGRESS */}
            {loading && (
              <div className="progress-wrap">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', fontWeight:700, letterSpacing:.5 }}>{STEPS[step]}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t3)' }}>{Math.round(step/9*100)}%</div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${Math.round(step/9*100)}%` }} />
                </div>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginTop:10, display:'flex', gap:16, flexWrap:'wrap' }}>
                  <span>META QUANTUM v12 — 7 LAYER</span>
                  <span>4H/1D/1W/1M MTF + ICT/SMC + OB/FVG</span>
                  <span>WR≥70% SETUP — KURUMSAL BÖLGE</span>
                </div>
              </div>
            )}

            {/* ERROR */}
            {error && !loading && (
              <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'14px 18px', marginBottom:16, fontFamily:'var(--mono)', fontSize:12, color:'var(--red)' }}>
                ⚠ {error}
                {error.includes('limit') || error.includes('Limit') || error.includes('ulaştınız') ? (
                  <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid rgba(239,68,68,.2)' }}>
                    <a href="https://t.me/DeepTradeScanner" target="_blank" rel="noopener noreferrer"
                      onClick={() => sendNotify('limit', { coin })}
                      style={{ fontFamily:'var(--mono)', fontSize:11, color:'#f59e0b', textDecoration:'none', fontWeight:800 }}>
                      ↑ Telegram'dan Upgrade İçin Yaz: @DeepTradeScanner
                    </a>
                  </div>
                ) : null}
              </div>
            )}


            {/* RESULTS — Unified Panel */}
            {apiData && !loading && (
              <UnifiedAnalysisPanel
                apiData={apiData}
                coin={coin}
                blocks={blocks}
                isLong={isLong}
                vm={vm}
                onChartOpen={(c, s) => setChartModal({ coin: c, setup: s })}
              />
            )}

            {false && (() => {
              const curRaw = parseFloat(apiData?.current_price?.replace(/[$,]/g,'') || 0);
              const diffPct = (v) => {
                const n = parseFloat(String(v || '').replace(/[$,]/g,''));
                if (!n || !curRaw) return '';
                const d = ((n - curRaw) / curRaw * 100);
                return `${d > 0 ? '+' : ''}${d.toFixed(2)}%`;
              };

              return (
                <>
                  {/* ── VERDICT BANNER ── */}
                  <div className="verdict-banner" style={{ border:`1px solid ${vm.color}35` }}>
                    {/* Glow bar */}
                    <div style={{ height:3, background:`linear-gradient(90deg, transparent, ${vm.color}, transparent)`, opacity:.8 }} />
                    <div style={{ padding:'18px 22px', background: vm.bg }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                          <div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', letterSpacing:1.5, marginBottom:6 }}>DEEP TRADE SCAN — META QUANTUM v12</div>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:26, fontWeight:800, color:vm.color, letterSpacing:1 }}>
                                {vm.icon} {vm.label}
                              </div>
                              <div style={{ background:`${vm.color}20`, border:`1px solid ${vm.color}40`, borderRadius:5, padding:'4px 12px' }}>
                                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t3)', marginBottom:2 }}>CONFIDENCE</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:800, color:vm.color }}>
                                  {apiData.confidence_score}%
                                </div>
                              </div>
                            </div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t2)', marginTop:8 }}>{vm.tagline}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6, textAlign:'right' }}>
                          <div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:.5 }}>MARKET REGIME</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:'var(--t1)', marginTop:2 }}>{reg?.regime?.replace(/_/g,' ') || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:.5 }}>TREND</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t2)', marginTop:2 }}>
                              D: <span style={{ color: apiData.trend_daily==='BULLISH' ? 'var(--green)' : 'var(--red)' }}>{apiData.trend_daily}</span>
                              {' · '}
                              W: <span style={{ color: apiData.trend_weekly==='BULLISH' ? 'var(--green)' : 'var(--red)' }}>{apiData.trend_weekly}</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>QUANTUM GRADE</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:800, color:'#FBBF24', marginTop:2 }}>
                              {apiData.engine?.grade} — {apiData.overall_score}/100
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── SMC ENGINE PANEL ── */}
                  <div style={{ background:'var(--card)', border:'1px solid rgba(167,139,250,.2)', borderRadius:8, overflow:'hidden', marginBottom:16, animation:'slide-up .35s ease' }}>
                    <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(167,139,250,.15)', background:'rgba(167,139,250,.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:10, color:'#A78BFA', letterSpacing:.8 }}>◆ SMART MONEY CONCEPTS — ICT ENGINE</span>
                      {smc && <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', background:'rgba(167,139,250,.1)', padding:'2px 8px', borderRadius:3, border:'1px solid rgba(167,139,250,.2)' }}>
                        SMC SCORE {smc.strength}/8
                      </span>}
                    </div>
                    {/* Top row: FVG, OB, BOS/CHoCH */}
                    <div className="ua-smc-grid">
                      {[
                        { lbl:'FAIR VALUE GAP', val: smc?.fvg || 'NONE', lvl: smc?.fvgLevel > 0 ? apiData.entry_sniper : '', color: smc?.fvg==='BULLISH' ? '#10B981' : smc?.fvg==='BEARISH' ? '#EF4444' : 'var(--t3)' },
                        { lbl:'ORDER BLOCK',    val: smc?.ob  || 'NONE', lvl: smc?.obLevel > 0 ? '' : '', color: smc?.ob==='BULLISH' ? '#10B981' : smc?.ob==='BEARISH' ? '#EF4444' : 'var(--t3)' },
                        { lbl:'BOS / CHoCH',   val: smc?.bos !== 'NONE' ? `BOS ${smc?.bos}` : smc?.choch !== 'NONE' ? `CHoCH ${smc?.choch}` : 'INTACT',
                          color: (smc?.bos==='BULLISH'||smc?.choch==='BULLISH') ? '#10B981' : (smc?.bos==='BEARISH'||smc?.choch==='BEARISH') ? '#EF4444' : '#F59E0B' },
                      ].map(({ lbl, val, lvl, color }) => (
                        <div key={lbl} className="smc-cell" style={{ background:'var(--panel)' }}>
                          <div className="smc-lbl">{lbl}</div>
                          <div className="smc-val" style={{ color }}>{val}</div>
                          {lvl && <div className="smc-lvl">{lvl}</div>}
                        </div>
                      ))}
                    </div>
                    {/* Bottom row: Liquidity, OBV, Ichimoku */}
                    <div className="ua-smc-grid">
                      {[
                        { lbl:'LIQUIDITY ZONE', val: smc?.liquidity?.replace(/_/g,' ') || 'NONE', color:'#C084FC' },
                        { lbl:'OBV — ORDER FLOW', val: ind?.obv?.trend || '—', color: ind?.obv?.trend==='BULLISH' ? '#10B981' : ind?.obv?.trend==='BEARISH' ? '#EF4444' : 'var(--t2)' },
                        { lbl:'ICHIMOKU CLOUD',   val: ind?.ichimoku?.cloud?.replace(/_/g,' ') || '—',
                          color: ind?.ichimoku?.cloud==='ABOVE_CLOUD' ? '#10B981' : ind?.ichimoku?.cloud==='BELOW_CLOUD' ? '#EF4444' : '#F59E0B' },
                      ].map(({ lbl, val, color }) => (
                        <div key={lbl} className="smc-cell" style={{ background:'var(--card)' }}>
                          <div className="smc-lbl">{lbl}</div>
                          <div className="smc-val" style={{ color, fontSize:12 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── CONFLUENCE METER ── */}
                  {sig && (
                    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:16, animation:'slide-up .4s ease' }}>
                      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:10, letterSpacing:.8 }}>◎ CONFLUENCE METER — 30 FACTOR</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:800, color: sig.net > 0 ? 'var(--green)' : sig.net < 0 ? 'var(--red)' : 'var(--gold)' }}>
                          NET {sig.net > 0 ? '+' : ''}{sig.net}
                        </span>
                      </div>
                      <ConfGauge bull={sig.bull} bear={sig.bear} />
                      {/* Indicator chips */}
                      <div style={{ padding:'0 14px 14px' }}>
                        <div className="ind-grid">
                          <IndChip label="RSI 14"   val={ind?.rsi_14 || '—'} color={(ind?.rsi_14||50)<35?'#10B981':(ind?.rsi_14||50)>65?'#EF4444':'var(--t1)'} sub={(ind?.rsi_14||50)<35?'Aşırı Satış':(ind?.rsi_14||50)>65?'Aşırı Alış':'Nötr'} />
                          <IndChip label="StochRSI K" val={ind?.stoch_rsi?.k||'—'} color={(ind?.stoch_rsi?.k||50)<25?'#10B981':(ind?.stoch_rsi?.k||50)>75?'#EF4444':'var(--t1)'} sub={`D: ${ind?.stoch_rsi?.d||'—'}`} />
                          <IndChip label="MACD CROSS" val={ind?.macd?.cross||'NONE'} color={ind?.macd?.cross==='GOLDEN'?'#10B981':ind?.macd?.cross==='DEATH'?'#EF4444':'var(--t2)'} sub={ind?.macd?.histogram>0?'▲ Pozitif':'▼ Negatif'} />
                          <IndChip label="BB SQUEEZE" val={ind?.bollinger_bands?.squeeze?'AKTİF ⚡':'NORMAL'} color={ind?.bollinger_bands?.squeeze?'#F59E0B':'var(--t2)'} sub={`%B: ${(ind?.bollinger_bands?.percent_b||0).toFixed(2)}`} />
                          <IndChip label="WILLIAMS %R" val={ind?.williams_r||'—'} color={(ind?.williams_r||-50)<-80?'#10B981':(ind?.williams_r||-50)>-20?'#EF4444':'var(--t1)'} />
                          <IndChip label="ADX GÜÇ"    val={`${reg?.adx||0}`} color={reg?.adx>25?'#F59E0B':'var(--t2)'} sub={reg?.adx>25?'Trend Aktif':'Trend Zayıf'} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── EXECUTION TICKET — INSTITUTIONAL SETUP ── */}
                  {(() => {
                    const setup = apiData.setup;
                    const lev = apiData.leverage;
                    const entryMethod = setup?.entryMethod || apiData.entry_sniper ? 'SMC ZONE' : '—';
                    const zoneQuality = setup?.zoneQuality;
                    const zoneWinRate = setup?.zoneWinRate;
                    return (
                      <div style={{ background:'var(--card)', border:`2px solid ${isLong?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`, borderRadius:10, overflow:'hidden', marginBottom:16, animation:'slide-up .45s ease' }}>
                        {/* Header */}
                        <div style={{ padding:'12px 18px', borderBottom:`1px solid ${isLong?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)'}`, background:isLong?'rgba(16,185,129,.07)':'rgba(239,68,68,.07)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:11, letterSpacing:.8 }}>⚡ KURUMSAL EXECUTION SETUP</span>
                            {zoneQuality && (
                              <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'#FBBF24', background:'rgba(251,191,36,.1)', border:'1px solid rgba(251,191,36,.25)', borderRadius:3, padding:'2px 7px' }}>
                                ZONE Q:{zoneQuality}/100{zoneWinRate ? ` WR:%${zoneWinRate}` : ''}
                              </span>
                            )}
                          </div>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            {lev && (
                              <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:'#F59E0B', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:4, padding:'3px 9px' }}>
                                CON:{lev.conservative}x / MOD:{lev.moderate}x / AGR:{lev.aggressive}x
                              </span>
                            )}
                            <span style={{ padding:'4px 14px', borderRadius:5, fontFamily:'var(--mono)', fontSize:12, fontWeight:900,
                              background:isLong?'rgba(16,185,129,.18)':'rgba(239,68,68,.18)',
                              color:isLong?'var(--green)':'var(--red)',
                              border:`1px solid ${isLong?'rgba(16,185,129,.5)':'rgba(239,68,68,.5)'}` }}>
                              {isLong ? '▲ LONG' : '▼ SHORT'}
                            </span>
                          </div>
                        </div>

                        {/* Entry Method */}
                        {entryMethod && (
                          <div style={{ padding:'8px 18px', background:'rgba(59,130,246,.04)', borderBottom:'1px solid rgba(59,130,246,.1)', display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:.5 }}>ENTRY METHOD</span>
                            <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'#60A5FA' }}>{entryMethod}</span>
                          </div>
                        )}

                        {/* Entry Zone Range */}
                        {setup?.entryLow && setup?.entryHigh && (
                          <div style={{ padding:'12px 18px', background:'rgba(16,185,129,.03)', borderBottom:'1px solid rgba(16,185,129,.08)' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', letterSpacing:.5, marginBottom:6 }}>ENTRY ZONE — LIMIT ORDER BÖLGE</div>
                            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                              <div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginBottom:2 }}>ZONE LOW</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:800, color:'#34D399' }}>{apiData.entry_sniper?.replace(/\.\d+/, '') === apiData.entry_sniper ? apiData.entry_sniper : `$${parseFloat(setup.entryLow).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:4})}`}</div>
                              </div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t3)' }}>—</div>
                              <div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginBottom:2 }}>ZONE HIGH</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:800, color:'#10B981' }}>${parseFloat(setup.entryHigh).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:4})}</div>
                              </div>
                              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginBottom:2 }}>ENTRY MID</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:800, color:'#E8EEF8' }}>{apiData.entry_sniper || '—'}</div>
                              </div>
                            </div>
                            {/* Zone distance bar */}
                            {(() => {
                              const cur = parseFloat(String(apiData.current_price||'').replace(/[$,]/g,''))||0;
                              const emid = setup.entryMid||0;
                              const dist = cur && emid ? ((emid - cur) / cur * 100).toFixed(2) : null;
                              if (!dist) return null;
                              const d = parseFloat(dist);
                              const dAbs = Math.abs(d);
                              const distColor = dAbs < 2 ? '#FBBF24' : dAbs < 5 ? '#34D399' : dAbs < 10 ? '#F97316' : '#EF4444';
                              const distTag   = dAbs < 2 ? '⚡ BÖLGE İÇİNDE — GİRİŞ HAZIr' : dAbs < 5 ? '▲ YAKLAŞIYOR' : dAbs < 10 ? '○ Bölge bekle' : '⚠ UZAK — Bölgeye çekilme bekle';
                              return (
                                <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>Mevcut → Bölge mesafesi</span>
                                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:900, color:distColor }}>{d > 0 ? '-' : '+'}{dAbs}%</span>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:7.5, fontWeight:700, color:distColor, background:`${distColor}15`, border:`1px solid ${distColor}35`, borderRadius:4, padding:'2px 7px' }}>{distTag}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Price Levels */}
                        <div>
                          <PriceLevel label="STOP LOSS — YAPISAL" price={apiData.stop_loss} current={apiData.current_price} color="#EF4444" sub={setup?.stopLabel || 'Yapısal İnvalidasyon'} />
                          <div style={{ height:'1px', background:`linear-gradient(90deg, transparent, ${isLong?'rgba(52,211,153,.25)':'rgba(239,68,68,.25)'}, transparent)`, margin:'2px 0' }} />
                          <PriceLevel label={`TP1 — 40% KAPAT${setup?.tp1Pct ? ` (+%${setup.tp1Pct})` : ''}`} price={apiData.tp1} current={apiData.current_price} color="#34D399" sub="İlk Likidite Havuzu / BSL" />
                          <PriceLevel label={`TP2 — 35% KAPAT${setup?.tp2Pct ? ` (+%${setup.tp2Pct})` : ''}`} price={apiData.tp2} current={apiData.current_price} color="#3B82F6" sub="Ana Hedef / Fibonacci Extension" />
                          <PriceLevel label={`TP3 — 25% KAPAT${setup?.tp3Pct ? ` (+%${setup.tp3Pct})` : ''}`} price={apiData.tp3} current={apiData.current_price} color="#A78BFA" sub="Tam Extension / Uzun Vade" />
                        </div>
                        {/* Bottom stats */}
                        <div className="ua-stats4-grid">
                          {[
                            { lbl:'R:R ORANI', val: apiData.risk_reward, color:'var(--t1)' },
                            { lbl:'RİSK %', val: `${apiData.risk_pct}%`, color:'#F97316' },
                            { lbl:'POZİSYON', val: apiData.position_size, color:'#FBBF24' },
                            { lbl:'KALDIRAÇ (MOD)', val: lev && typeof lev==='object' ? `${lev.moderate}x` : '5x', color:'#F59E0B' },
                          ].map(({ lbl, val, color }) => (
                            <div key={lbl} style={{ background:'var(--panel)', padding:'10px 12px' }}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.4, marginBottom:4 }}>{lbl}</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:800, color }}>{val||'—'}</div>
                            </div>
                          ))}
                        </div>
                        {/* Chart button */}
                        {setup && (
                          <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', background:'rgba(0,0,0,.15)', display:'flex', justifyContent:'flex-end' }}>
                            <button
                              onClick={() => setChartModal({ coin, setup: { entry: setup.entryMid, stop: setup.stop, tp1: setup.tp1, tp2: setup.tp2, tp3: setup.tp3 } })}
                              style={{ background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.25)', color:'#60A5FA', padding:'6px 14px', fontFamily:'var(--mono)', fontSize:10, fontWeight:700, cursor:'pointer', borderRadius:5, letterSpacing:.5, display:'flex', alignItems:'center', gap:6, transition:'.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background='rgba(59,130,246,.2)'; e.currentTarget.style.borderColor='var(--accent)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background='rgba(59,130,246,.1)'; e.currentTarget.style.borderColor='rgba(59,130,246,.25)'; }}
                            >
                              📊 Grafikte Gör
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── TAKE PROFIT MODEL ── */}
                  {(() => {
                    const setup = apiData.setup;
                    if (!setup?.tp1) return null;
                    const curRaw   = parseFloat(String(apiData.current_price||'').replace(/[$,]/g,''))||0;
                    const entryMid = setup.entryMid||0;
                    const stopRaw  = setup.stop||0;
                    const riskDist = Math.abs(entryMid - stopRaw) || 1;

                    const tpRows = [
                      { label:'TP1', raw:setup.tp1, price:apiData.tp1, close:40, pct:setup.tp1Pct, color:'#34D399', reason:'İlk Likidite / BSL Cluster' },
                      { label:'TP2', raw:setup.tp2, price:apiData.tp2, close:35, pct:setup.tp2Pct, color:'#60A5FA', reason:'Fib Extension / Ana Hedef' },
                      { label:'TP3', raw:setup.tp3, price:apiData.tp3, close:25, pct:setup.tp3Pct, color:'#A78BFA', reason:'Yapısal Uzun Vade Hedef' },
                    ].filter(t => t.raw);
                    if (!tpRows.length) return null;

                    const borderC = isLong ? 'rgba(52,211,153,.28)' : 'rgba(239,68,68,.28)';
                    const headBg  = isLong ? 'rgba(52,211,153,.06)' : 'rgba(239,68,68,.06)';

                    return (
                      <div style={{ background:'var(--card)', border:`1px solid ${borderC}`, borderRadius:10, overflow:'hidden', marginBottom:16, animation:'slide-up .47s ease' }}>
                        {/* Header */}
                        <div style={{ padding:'10px 18px', borderBottom:`1px solid ${borderC}`, background:headBg, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:900, fontSize:11, letterSpacing:.8, color: isLong?'#34D399':'#EF4444' }}>◉</span>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:10, letterSpacing:.6 }}>TAKE PROFIT MODEL — ÇIKIŞ STRATEJİSİ</span>
                          </div>
                          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>R:R</span>
                            <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:900, color: isLong?'#34D399':'#EF4444' }}>{setup.rr||'—'}</span>
                          </div>
                        </div>

                        {/* Entry / Stop reference bar */}
                        <div style={{ padding:'8px 18px', background:'rgba(251,191,36,.04)', borderBottom:'1px solid rgba(251,191,36,.09)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                          <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                            <div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.5, marginBottom:1 }}>GİRİŞ ORT.</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'#FBBF24' }}>{apiData.entry_sniper||'—'}</div>
                            </div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>→</div>
                            <div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.5, marginBottom:1 }}>STOP LOSS</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'#EF4444' }}>{apiData.stop_loss||'—'}</div>
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.5, marginBottom:1 }}>MEVCUT FİYAT</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'var(--t1)' }}>{apiData.current_price||'—'}</div>
                          </div>
                        </div>

                        {/* TP rows */}
                        {tpRows.map((tp, i) => {
                          const targetRaw  = parseFloat(tp.raw)||0;
                          const totalMove  = isLong ? targetRaw - entryMid : entryMid - targetRaw;
                          const curMove    = isLong ? curRaw - entryMid    : entryMid - curRaw;
                          const progress   = totalMove > 0 ? Math.min(100, Math.max(0, curMove / totalMove * 100)) : 0;
                          const isHit      = isLong ? curRaw >= targetRaw * 0.999 : curRaw <= targetRaw * 1.001;
                          const isNear     = !isHit && progress >= 70;
                          const rrThis     = (totalMove / riskDist).toFixed(1);

                          return (
                            <div key={i} style={{ borderBottom: i < tpRows.length-1 ? '1px solid rgba(255,255,255,.042)' : 'none', padding:'11px 18px' }}>
                              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                                {/* Label circle */}
                                <div style={{ width:34, height:34, borderRadius:8, background:`${tp.color}12`, border:`1.5px solid ${tp.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:900, color:tp.color }}>{tp.label}</span>
                                </div>
                                {/* Content */}
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                    <div>
                                      <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:'var(--t1)' }}>
                                        %{tp.close} KAPAT
                                      </span>
                                      <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', marginLeft:8 }}>{tp.reason}</span>
                                    </div>
                                    <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                                      <span style={{ fontFamily:'var(--mono)', fontSize:8, color:tp.color, fontWeight:800 }}>1:{rrThis}</span>
                                      <span style={{
                                        fontFamily:'var(--mono)', fontSize:7.5, fontWeight:800, padding:'2px 9px', borderRadius:4,
                                        background: isHit ? 'rgba(16,185,129,.18)' : isNear ? 'rgba(251,191,36,.14)' : 'rgba(255,255,255,.06)',
                                        border:`1px solid ${isHit?'rgba(16,185,129,.45)':isNear?'rgba(251,191,36,.35)':'rgba(255,255,255,.10)'}`,
                                        color: isHit ? '#10B981' : isNear ? '#FBBF24' : 'var(--t3)',
                                      }}>
                                        {isHit ? '✓ HIT' : isNear ? '⚡ YAKLAŞIYOR' : 'BEKLE'}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Price + pct row */}
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:900, color: isHit ? '#10B981' : tp.color }}>
                                      {tp.price||'—'}
                                    </span>
                                    {tp.pct != null && (
                                      <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:800, color: isHit ? '#10B981' : tp.color }}>
                                        {tp.pct > 0 ? '+' : ''}{tp.pct}%
                                      </span>
                                    )}
                                  </div>
                                  {/* Progress bar */}
                                  <div style={{ height:5, background:'rgba(255,255,255,.07)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                                    <div style={{
                                      height:'100%',
                                      width:`${progress}%`,
                                      background: isHit
                                        ? 'linear-gradient(90deg,#059669,#10B981)'
                                        : `linear-gradient(90deg,${tp.color}70,${tp.color})`,
                                      borderRadius:3,
                                      transition:'width .9s cubic-bezier(.4,0,.2,1)',
                                      boxShadow: isHit ? '0 0 8px rgba(16,185,129,.5)' : `0 0 6px ${tp.color}40`,
                                    }}/>
                                  </div>
                                  <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)' }}>
                                    {isHit
                                      ? `HEDEF AŞILDI — +%${tp.pct||0} realizasyon`
                                      : `İlerleme: %${progress.toFixed(0)} — %${(100-progress).toFixed(0)} kaldı (${isLong?'▲':'▼'} ${Math.abs(targetRaw - curRaw).toFixed(curRaw>100?2:4)} uzakta)`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Bottom stats */}
                        <div style={{ padding:'9px 18px', background:'rgba(0,0,0,.18)', borderTop:'1px solid rgba(255,255,255,.05)', display:'flex', flexWrap:'wrap', gap:0 }}>
                          {[
                            { lbl:'BE SEVİYESİ', val: apiData.entry_sniper||'—' },
                            { lbl:'POZ. RİSKİ', val: setup.riskPct != null ? `%${setup.riskPct}` : '—' },
                            { lbl:'KAPANIŞ PLANI', val: '%40 / %35 / %25' },
                            { lbl:'DCA GİRİŞ', val: setup.entryLow && setup.entryHigh ? `$${parseFloat(setup.entryLow).toLocaleString('en-US',{maximumFractionDigits:2})} — $${parseFloat(setup.entryHigh).toLocaleString('en-US',{maximumFractionDigits:2})}` : '—' },
                          ].map(({ lbl, val }) => (
                            <div key={lbl} style={{ flex:'1 1 25%', minWidth:80, padding:'5px 8px', textAlign:'center', borderRight:'1px solid rgba(255,255,255,.04)' }}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.4, marginBottom:3 }}>{lbl}</div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9.5, fontWeight:800, color:'var(--t1)' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── 4-LAYER CONFLUENCE BREAKDOWN ── */}
                  {apiData.layers && (() => {
                    const lay = apiData.layers;
                    const layerDefs = [
                      { id:'L1', label:'PIYASA YAPISI', key:'marketStructure', color:'#3B82F6', max:25,
                        detail: `EMA:${lay.marketStructure?.emaAligned?'UYUMLU':'UYUMSUZ'} | ADX:${lay.marketStructure?.adxStrength?.toFixed(0)||0} | BOS:${(lay.marketStructure?.bosType||'NONE').replace(/_/g,' ')}` },
                      { id:'L2', label:'LİKİDİTE / SMC', key:'liquiditySMC', color:'#A78BFA', max:30,
                        detail: `${lay.liquiditySMC?.inOB?'OB İçinde':'OB Dışı'} | ${lay.liquiditySMC?.fvgOBOverlap?'FVG+OB Örtüşme':'Örtüşme Yok'} | ${lay.liquiditySMC?.liquiditySweep?'Liq Sweep':'Sweep Yok'}` },
                      { id:'L3', label:'MOMENTUM', key:'momentum', color:'#FBBF24', max:25,
                        detail: `RSI:${lay.momentum?.rsi4h?.toFixed(0)||50} | MACD:${lay.momentum?.macdBullish?'Bull':'Bear'}${lay.momentum?.macdCross?' CROSS':''} | BB:${lay.momentum?.squeeze?'SQUEEZE':'Normal'}` },
                      { id:'L4', label:'MTF UYUM', key:'mtfAlignment', color:'#10B981', max:20,
                        detail: `4H:${lay.mtfAlignment?.['4h']||'—'} 1D:${lay.mtfAlignment?.['1d']||'—'} 1W:${lay.mtfAlignment?.['1w']||'—'} 1M:${lay.mtfAlignment?.['1m']||'—'}` },
                    ];
                    const total = layerDefs.reduce((s, l) => s + (lay[l.key]?.score||0), 0);
                    return (
                      <div style={{ background:'var(--card)', border:'1px solid rgba(59,130,246,.2)', borderRadius:8, overflow:'hidden', marginBottom:16, animation:'slide-up .5s ease' }}>
                        <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(59,130,246,.15)', background:'rgba(59,130,246,.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:10, color:'#60A5FA', letterSpacing:.8 }}>▤ 4-KATMAN CONFLUENCE BREAKDOWN</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color: total>=70?'#10B981':total>=50?'#F59E0B':'#EF4444' }}>
                            {total}/100 — {apiData.engine?.grade||'?'}
                          </span>
                        </div>
                        <div>
                          {layerDefs.map(({ id, label, key, color, max, detail }) => {
                            const score = lay[key]?.score || 0;
                            const pct   = Math.round(score / max * 100);
                            return (
                              <div key={id} style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ width:32, height:32, borderRadius:7, background:`${color}18`, border:`1px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color, flexShrink:0 }}>{id}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:'var(--t1)' }}>{label}</span>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color }}>{score}/{max}</span>
                                  </div>
                                  <div style={{ height:5, background:'rgba(255,255,255,.05)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                                    <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, ${color}aa, ${color})`, borderRadius:3, transition:'width .6s ease' }}/>
                                  </div>
                                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>{detail}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── QUANTUM ZONES PANEL ── */}
                  {apiData.quantumZones && apiData.quantumZones.length > 0 && (() => {
                    const zones = apiData.quantumZones;
                    const curRaw2 = parseFloat(String(apiData.current_price||'').replace(/[$,]/g,''))||0;
                    return (
                      <div style={{ background:'var(--card)', border:'1px solid rgba(167,139,250,.2)', borderRadius:8, overflow:'hidden', marginBottom:16, animation:'slide-up .55s ease' }}>
                        <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(167,139,250,.15)', background:'rgba(167,139,250,.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:10, color:'#C084FC', letterSpacing:.8 }}>◈ KURUMSAL BÖLGE HARİTASI</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>{zones.length} bölge tespit edildi</span>
                        </div>
                        {zones.slice(0,4).map((z, i) => {
                          const isDemand = z.type === 'DEMAND';
                          const zc = isDemand ? '#10B981' : '#EF4444';
                          const distPct = z.distanceFromPrice?.toFixed(1);
                          const qScore = z.qualityScore || z.confluenceScore || 0;
                          return (
                            <div key={i} style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:28, height:28, borderRadius:5, background:`${zc}15`, border:`1px solid ${zc}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:zc }}>{isDemand?'D':'S'}</span>
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                                  <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:zc }}>{isDemand?'DEMAND':'SUPPLY'} — {z.timeframe}</span>
                                  <div style={{ display:'flex', gap:5 }}>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#FBBF24', background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.2)', borderRadius:2, padding:'1px 5px' }}>Q:{qScore}</span>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:2, padding:'1px 5px' }}>{z.freshness}</span>
                                  </div>
                                </div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'var(--t1)', marginBottom:2 }}>
                                  ${parseFloat(z.lowPrice).toLocaleString('en-US',{maximumFractionDigits:4})} — ${parseFloat(z.highPrice).toLocaleString('en-US',{maximumFractionDigits:4})}
                                </div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>
                                  {(z.sources||[]).slice(0,2).join(' + ')} {distPct ? `· ${distPct}% uzakta` : ''}
                                </div>
                              </div>
                              <div style={{ textAlign:'right', flexShrink:0 }}>
                                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginBottom:2 }}>İNVALİDASYON</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:'#F97316' }}>${parseFloat(z.invalidation||z.lowPrice).toLocaleString('en-US',{maximumFractionDigits:4})}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* ── HORIZONTAL S/R LEVEL MAP ── */}
                  {apiData.srLevels && apiData.srLevels.length > 0 && (() => {
                    const cur2 = parseFloat(String(apiData.current_price||'').replace(/[$,]/g,''))||0;
                    const fmtP = (n) => {
                      const num = parseFloat(n);
                      if (!num) return '—';
                      return num >= 100 ? `$${num.toLocaleString('en-US',{maximumFractionDigits:2})}` : `$${num.toFixed(num >= 1 ? 4 : 6)}`;
                    };
                    const supLevels = apiData.srLevels.filter(l => l.type==='SUPPORT').sort((a,b) => b.price - a.price);
                    const resLevels = apiData.srLevels.filter(l => l.type==='RESISTANCE').sort((a,b) => a.price - b.price);
                    const qualityColor = (q2) => q2==='STRONG' ? '#10B981' : q2==='MODERATE' ? '#F59E0B' : '#94A3B8';
                    return (
                      <div style={{ background:'var(--card)', border:'1px solid rgba(59,130,246,.2)', borderRadius:8, overflow:'hidden', marginBottom:16, animation:'slide-up .52s ease' }}>
                        <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(59,130,246,.15)', background:'rgba(59,130,246,.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:10, color:'#60A5FA', letterSpacing:.8 }}>▬ YATAY DESTEK / DİRENÇ HARİTASI</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>Multi-Touch Swing Clustering</span>
                        </div>
                        {/* Current price reference bar */}
                        <div style={{ padding:'6px 16px', background:'rgba(255,255,255,.025)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#FBBF24', boxShadow:'0 0 6px #FBBF24', flexShrink:0 }}/>
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'#FBBF24', fontWeight:700 }}>MEVCUT FİYAT: {apiData.current_price}</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginLeft:'auto' }}>{apiData.srLevels.length} seviye tespit</span>
                        </div>
                        {/* Resistance levels (above price) */}
                        {resLevels.length > 0 && (
                          <>
                            <div style={{ padding:'5px 16px', background:'rgba(239,68,68,.04)', borderBottom:'1px solid rgba(239,68,68,.1)' }}>
                              <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'#EF4444', letterSpacing:1, fontWeight:700 }}>DİRENÇ SEVİYELERİ (RESISTANCE)</span>
                            </div>
                            {resLevels.slice(0,4).map((lvl, i) => {
                              const distPct = cur2 ? ((lvl.price - cur2) / cur2 * 100).toFixed(2) : null;
                              return (
                                <div key={i} style={{ padding:'8px 16px', borderBottom:'1px solid rgba(255,255,255,.03)', display:'flex', alignItems:'center', gap:10 }}>
                                  <div style={{ width:4, height:32, borderRadius:2, background:`${qualityColor(lvl.quality)}60`, flexShrink:0 }}/>
                                  <div style={{ flex:1 }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                      <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'#F87171' }}>{fmtP(lvl.price)}</span>
                                      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:qualityColor(lvl.quality), background:`${qualityColor(lvl.quality)}15`, border:`1px solid ${qualityColor(lvl.quality)}40`, borderRadius:3, padding:'1px 6px' }}>{lvl.quality}</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', background:'rgba(255,255,255,.04)', borderRadius:3, padding:'1px 6px' }}>{lvl.timeframe}</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#EF4444', fontWeight:700 }}>{distPct ? `+${distPct}%` : ''}</span>
                                      </div>
                                    </div>
                                    <div style={{ height:3, background:'rgba(255,255,255,.04)', borderRadius:2, overflow:'hidden', marginTop:4 }}>
                                      <div style={{ height:'100%', width:`${lvl.strength}%`, background:'linear-gradient(90deg, #DC2626, #EF4444)', borderRadius:2 }}/>
                                    </div>
                                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:2 }}>{lvl.touches} dokunuş · Güç: {lvl.strength}/100</div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                        {/* Support levels (below price) */}
                        {supLevels.length > 0 && (
                          <>
                            <div style={{ padding:'5px 16px', background:'rgba(16,185,129,.04)', borderTop:'1px solid rgba(16,185,129,.1)', borderBottom:'1px solid rgba(16,185,129,.1)' }}>
                              <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'#10B981', letterSpacing:1, fontWeight:700 }}>DESTEK SEVİYELERİ (SUPPORT)</span>
                            </div>
                            {supLevels.slice(0,4).map((lvl, i) => {
                              const distPct = cur2 ? ((lvl.price - cur2) / cur2 * 100).toFixed(2) : null;
                              return (
                                <div key={i} style={{ padding:'8px 16px', borderBottom:'1px solid rgba(255,255,255,.03)', display:'flex', alignItems:'center', gap:10 }}>
                                  <div style={{ width:4, height:32, borderRadius:2, background:`${qualityColor(lvl.quality)}60`, flexShrink:0 }}/>
                                  <div style={{ flex:1 }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                      <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'#34D399' }}>{fmtP(lvl.price)}</span>
                                      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:qualityColor(lvl.quality), background:`${qualityColor(lvl.quality)}15`, border:`1px solid ${qualityColor(lvl.quality)}40`, borderRadius:3, padding:'1px 6px' }}>{lvl.quality}</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', background:'rgba(255,255,255,.04)', borderRadius:3, padding:'1px 6px' }}>{lvl.timeframe}</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'#34D399', fontWeight:700 }}>{distPct}</span>
                                      </div>
                                    </div>
                                    <div style={{ height:3, background:'rgba(255,255,255,.04)', borderRadius:2, overflow:'hidden', marginTop:4 }}>
                                      <div style={{ height:'100%', width:`${lvl.strength}%`, background:'linear-gradient(90deg, #059669, #10B981)', borderRadius:2 }}/>
                                    </div>
                                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginTop:2 }}>{lvl.touches} dokunuş · Güç: {lvl.strength}/100</div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── PRICE ACTION PATTERNS + MANIPULATION ROW ── */}
                  {(apiData.paPatterns?.length > 0 || apiData.manipulation) && (
                    <div className={`ua-dual-grid${!(apiData.paPatterns?.length > 0 && apiData.manipulation) ? ' ua-single' : ''}`}>

                      {/* Price Action Patterns */}
                      {apiData.paPatterns?.length > 0 && (
                        <div style={{ background:'var(--card)', border:'1px solid rgba(251,191,36,.2)', borderRadius:8, overflow:'hidden', animation:'slide-up .53s ease' }}>
                          <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(251,191,36,.15)', background:'rgba(251,191,36,.05)' }}>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:9, color:'#FBBF24', letterSpacing:.8 }}>◆ PRICE ACTION PATTERNS</span>
                          </div>
                          {apiData.paPatterns.map((pat, i) => {
                            const pc = pat.direction==='BULLISH' ? '#10B981' : pat.direction==='BEARISH' ? '#EF4444' : '#F59E0B';
                            const icon = pat.direction==='BULLISH' ? '▲' : pat.direction==='BEARISH' ? '▼' : '◆';
                            return (
                              <div key={i} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:pc }}>{icon}</span>
                                    <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:'var(--t1)' }}>{pat.label}</span>
                                  </div>
                                  <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:pc, background:`${pc}15`, border:`1px solid ${pc}35`, borderRadius:3, padding:'1px 6px' }}>GÜÇ {pat.strength}</span>
                                </div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', lineHeight:1.5 }}>{pat.desc}</div>
                                <div style={{ height:2, background:'rgba(255,255,255,.04)', borderRadius:1, overflow:'hidden', marginTop:5 }}>
                                  <div style={{ height:'100%', width:`${pat.strength}%`, background:pc, borderRadius:1, opacity:.7 }}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Manipulation Risk */}
                      {apiData.manipulation && (
                        <div style={{ background:'var(--card)', border:`1px solid ${apiData.manipulation.riskLevel==='HIGH'?'rgba(239,68,68,.3)':apiData.manipulation.riskLevel==='MEDIUM'?'rgba(249,115,22,.25)':'rgba(16,185,129,.2)'}`, borderRadius:8, overflow:'hidden', animation:'slide-up .54s ease' }}>
                          <div style={{ padding:'10px 14px', borderBottom:`1px solid ${apiData.manipulation.riskLevel==='HIGH'?'rgba(239,68,68,.2)':apiData.manipulation.riskLevel==='MEDIUM'?'rgba(249,115,22,.15)':'rgba(16,185,129,.15)'}`, background:apiData.manipulation.riskLevel==='HIGH'?'rgba(239,68,68,.07)':apiData.manipulation.riskLevel==='MEDIUM'?'rgba(249,115,22,.06)':'rgba(16,185,129,.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:9, color:apiData.manipulation.riskLevel==='HIGH'?'#EF4444':apiData.manipulation.riskLevel==='MEDIUM'?'#FB923C':'#10B981', letterSpacing:.8 }}>⚠ MANİPÜLASYON TARAMA</span>
                            <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:800, color:apiData.manipulation.riskLevel==='HIGH'?'#EF4444':apiData.manipulation.riskLevel==='MEDIUM'?'#FB923C':'#10B981' }}>
                              {apiData.manipulation.riskLevel} {apiData.manipulation.riskScore}/100
                            </span>
                          </div>
                          {apiData.manipulation.signals.length === 0 ? (
                            <div style={{ padding:'14px', textAlign:'center', fontFamily:'var(--mono)', fontSize:9, color:'#10B981' }}>
                              ✓ Temiz ortam<br/><span style={{ color:'var(--t3)', fontSize:8 }}>Belirgin manipülasyon sinyali yok</span>
                            </div>
                          ) : apiData.manipulation.signals.map((sig2, i) => (
                            <div key={i} style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                                <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:sig2.severity==='HIGH'?'#EF4444':'#F59E0B' }}>{sig2.label}</span>
                                <span style={{ fontFamily:'var(--mono)', fontSize:7, color:sig2.severity==='HIGH'?'#EF4444':'#F59E0B', background:sig2.severity==='HIGH'?'rgba(239,68,68,.1)':'rgba(245,158,11,.1)', border:`1px solid ${sig2.severity==='HIGH'?'rgba(239,68,68,.3)':'rgba(245,158,11,.3)'}`, borderRadius:3, padding:'1px 5px' }}>{sig2.severity}</span>
                              </div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', lineHeight:1.5 }}>{sig2.desc}</div>
                            </div>
                          ))}
                          {apiData.manipulation.signals.length > 0 && (
                            <div style={{ padding:'7px 14px', background:'rgba(0,0,0,.15)', fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', borderTop:'1px solid rgba(255,255,255,.04)' }}>
                              {apiData.manipulation.summary}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TIMING + FUTURES ROW ── */}
                  <div className={`ua-dual-grid${!apiData.futures ? ' ua-single' : ''}`}>

                    {/* Timing Panel */}
                    {apiData.timing && (() => {
                      const t = apiData.timing;
                      const sessionColors = {
                        LONDON_NY_OVERLAP: '#10B981', NY_OPEN: '#3B82F6',
                        LONDON_OPEN: '#60A5FA', ASIAN: '#F59E0B',
                        LONDON_CLOSE: '#F97316', OFF_HOURS: '#6B7280',
                      };
                      const sc = sessionColors[t.killZone] || '#94A3B8';
                      return (
                        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', animation:'slide-up .6s ease' }}>
                          <div style={{ padding:'9px 14px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.2)' }}>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:9, color:'var(--t2)', letterSpacing:.8 }}>⏱ SEANS & TİMİNG</span>
                          </div>
                          <div style={{ padding:'12px 14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:sc, boxShadow:`0 0 8px ${sc}` }}/>
                              <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:800, color:sc }}>{t.killZone?.replace(/_/g,' ')}</span>
                            </div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', marginBottom:8, lineHeight:1.5 }}>{t.description}</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                              <div style={{ background:'var(--card2)', borderRadius:4, padding:'6px 8px', border:'1px solid var(--border)' }}>
                                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:2 }}>OPTIMAL GÜN</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color: t.isOptimalDay?'#10B981':'#F59E0B' }}>{t.isOptimalDay?'✓ EVET':'✗ HAYIR'}</div>
                              </div>
                              <div style={{ background:'var(--card2)', borderRadius:4, padding:'6px 8px', border:'1px solid var(--border)' }}>
                                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:2 }}>OPT. SEANS</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color: t.isOptimalSession?'#10B981':'#F59E0B' }}>{t.isOptimalSession?'✓ AKTİF':'✗ BEKLİYOR'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Futures Panel */}
                    {apiData.futures && (() => {
                      const f = apiData.futures;
                      const fr = f.fundingRate;
                      const frPct = fr !== null ? (fr * 100).toFixed(4) : null;
                      const frColor = fr > 0.0005 ? '#EF4444' : fr < -0.0005 ? '#10B981' : '#F59E0B';
                      return (
                        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', animation:'slide-up .6s ease' }}>
                          <div style={{ padding:'9px 14px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.2)' }}>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:9, color:'var(--t2)', letterSpacing:.8 }}>◎ FUTURES VERİSİ</span>
                          </div>
                          <div style={{ padding:'12px 14px' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                              <div style={{ background:'var(--card2)', borderRadius:4, padding:'8px 10px', border:'1px solid var(--border)' }}>
                                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:3 }}>FUNDING RATE</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:800, color: frPct ? frColor : 'var(--t3)' }}>
                                  {frPct ? `${fr > 0 ? '+' : ''}${frPct}%` : 'N/A'}
                                </div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:2 }}>
                                  {fr > 0.0005 ? 'Long ağır — squeeze riski' : fr < -0.0005 ? 'Short ağır — long squeeze' : fr !== null ? 'Normal' : ''}
                                </div>
                              </div>
                              <div style={{ background:'var(--card2)', borderRadius:4, padding:'8px 10px', border:'1px solid var(--border)' }}>
                                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', marginBottom:3 }}>OPEN INTEREST</div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'var(--t1)' }}>
                                  {f.openInterest ? (f.openInterest/1e6).toFixed(2)+'M' : 'N/A'}
                                </div>
                                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:2 }}>
                                  {f.longShortRatio ? `L/S: ${parseFloat(f.longShortRatio).toFixed(2)}` : ''}
                                </div>
                              </div>
                            </div>
                            {apiData.riskFilter?.warnings?.length > 0 && (
                              <div style={{ marginTop:8, padding:'6px 8px', background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:4 }}>
                                {apiData.riskFilter.warnings.map((w, i) => (
                                  <div key={i} style={{ fontFamily:'var(--mono)', fontSize:8, color:'#F87171', marginBottom:i < apiData.riskFilter.warnings.length-1 ? 3 : 0 }}>⚠ {w}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── TRAP DETECTION ── */}
                  {apiData.traps && apiData.traps.length > 0 && (
                    <div style={{ background:'var(--card)', border:'1px solid rgba(249,115,22,.2)', borderRadius:8, overflow:'hidden', marginBottom:16, animation:'slide-up .65s ease' }}>
                      <div style={{ padding:'9px 16px', borderBottom:'1px solid rgba(249,115,22,.15)', background:'rgba(249,115,22,.05)' }}>
                        <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:10, color:'#FB923C', letterSpacing:.8 }}>△ TRAP DETECTION — STOP HUNT ANALİZİ</span>
                      </div>
                      <div>
                        {apiData.traps.slice(0,3).map((trap, i) => (
                          <div key={i} style={{ padding:'8px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div>
                              <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color: trap.type==='BULL_TRAP'?'#EF4444':'#10B981', marginRight:8 }}>
                                {trap.type==='BULL_TRAP' ? '▲ BULL TRAP' : '▼ BEAR TRAP'}
                              </span>
                              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)' }}>{trap.description}</span>
                            </div>
                            <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:'#F59E0B', flexShrink:0, marginLeft:8 }}>Güç: {trap.strength}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── DEEP ANALYSIS REPORT (unified) ── */}
                  {blocks.length > 0 && (
                    <div className="analysis-report">
                      <div className="report-header">
                        <span className="report-header-icon">◈</span>
                        <span className="report-header-title">KURUMSAL ANALİZ — MM MASASI & YÖNETİCİ ÖZETİ</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:8.5, fontWeight:700, color:'#FFD700', background:'rgba(255,215,0,.08)', padding:'3px 10px', borderRadius:4, border:'1px solid rgba(255,215,0,.2)' }}>
                          {blocks.filter(b=>VISIBLE_IDS.has(b.id)).length} BÖLÜM
                        </span>
                      </div>
                      {blocks.filter(b => VISIBLE_IDS.has(b.id)).map((block, idx) => {
                        const cfg = secCfg(block.id || '');
                        const isMM2 = block.id === 'MM-DESK';
                        const isSinyal2 = block.id === 'SINYAL';
                        const is12K = block.id.startsWith('12-KATMAN') || block.id.startsWith('KONFLUENS') || block.id.startsWith('YONETICI') || block.id.startsWith('OZET');
                        return (
                          <div key={idx} className="ablock" style={{
                            borderLeft: isMM2 ? '3px solid #FFD700' : isSinyal2 ? '3px solid #10B981' : `3px solid ${cfg.color}`,
                            borderColor: isMM2 ? 'rgba(255,215,0,.30)' : isSinyal2 ? 'rgba(16,185,129,.30)' : `${cfg.color}30`,
                            borderLeftColor: isMM2 ? '#FFD700' : isSinyal2 ? '#10B981' : cfg.color,
                            background: isMM2 ? 'linear-gradient(135deg,rgba(255,215,0,.04),rgba(255,180,0,.02))' : isSinyal2 ? 'linear-gradient(135deg,rgba(16,185,129,.04),rgba(0,212,255,.02))' : undefined,
                            boxShadow: isMM2 ? '0 2px 16px rgba(255,215,0,.06)' : isSinyal2 ? '0 2px 16px rgba(16,185,129,.08)' : undefined,
                          }}>
                            <div className="ablock-head" style={{ background: isMM2 ? 'linear-gradient(90deg,rgba(255,215,0,.12),rgba(255,215,0,.02))' : isSinyal2 ? 'linear-gradient(90deg,rgba(16,185,129,.12),rgba(16,185,129,.02))' : `linear-gradient(90deg,${cfg.color}10,${cfg.color}03)` }}>
                              <div className="ablock-icon" style={{ color: isMM2 ? '#FFD700' : isSinyal2 ? '#10B981' : cfg.color, borderColor:`${isMM2?'#FFD700':isSinyal2?'#10B981':cfg.color}50`, background: isMM2 ? 'rgba(255,215,0,.18)' : isSinyal2 ? 'rgba(16,185,129,.18)' : `${cfg.color}15` }}>{isMM2 ? '◈' : isSinyal2 ? '⚡' : cfg.icon}</div>
                              <span className="ablock-label" style={{ color: isMM2 ? '#FFD700' : isSinyal2 ? '#10B981' : cfg.color }}>{cfg.label}</span>
                              {isMM2 && <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'rgba(255,215,0,.6)', marginLeft:8, background:'rgba(255,215,0,.08)', padding:'2px 7px', borderRadius:3, border:'1px solid rgba(255,215,0,.20)', letterSpacing:.5 }}>KURUMSAL PREMİUM</span>}
                              <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${isMM2?'rgba(255,215,0,.30)':cfg.color+'30'},transparent)` }} />
                            </div>
                            <div>
                              {block.items.map((item, ii) => {
                                // SINYAL special rendering
                                if (isSinyal2 && item.t === 'kv') {
                                  const sinyalKeyColors2 = {
                                    'yön':             item.v.includes('LONG') ? '#10B981' : item.v.includes('SHORT') ? '#EF4444' : '#F59E0B',
                                    'setup kodu':      '#00D4FF',
                                    'entry türü':      '#60A5FA',
                                    'entry zone':      '#10B981',
                                    'stop-loss':       '#EF4444',
                                    'tp1':             '#34D399',
                                    'tp2':             '#6EE7B7',
                                    'tp3':             '#A7F3D0',
                                    'kaldıraç':        '#F5A623',
                                    'r:r':             '#00FFB2',
                                    'win rate':        '#A78BFA',
                                    'likidasyon':      '#EF4444',
                                    'pozisyon riski':  '#FBBF24',
                                  };
                                  const kLow2 = item.k.toLowerCase();
                                  const sCol2 = sinyalKeyColors2[kLow2] || '#10B981';
                                  const isYon2 = kLow2 === 'yön';
                                  const isSL2 = kLow2 === 'stop-loss';
                                  return (
                                    <div key={ii} style={{ padding: isYon2 ? '10px 14px 8px' : '6px 14px', borderBottom:'1px solid rgba(16,185,129,.07)', background: isYon2 ? 'rgba(16,185,129,.06)' : isSL2 ? 'rgba(239,68,68,.03)' : undefined }}>
                                      <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:sCol2, letterSpacing:.6, textTransform:'uppercase', flexShrink:0, marginTop:1, minWidth:88 }}>{item.k}</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize: isYon2 ? 11 : 9, color: isYon2 ? '#fff' : 'var(--t1)', lineHeight:1.6, fontWeight: isYon2 ? 800 : 500 }}>{item.v}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                if (isSinyal2 && item.t === 'txt') {
                                  return (
                                    <div key={ii} style={{ padding:'6px 14px', borderBottom:'1px solid rgba(16,185,129,.05)' }}>
                                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', lineHeight:1.6 }}>{item.v}</span>
                                    </div>
                                  );
                                }
                                // MM-DESK special rendering
                                if (isMM2 && item.t === 'kv') {
                                  const mmKeyColors2 = { 'key signal':'#FFD700','stop avı':'#EF4444','kurumsal pozisyon':'#00FFB2','retail tuzağı':'#F97316','48-72h oyun':'#60A5FA','edge':'#A78BFA' };
                                  const mmCol2 = mmKeyColors2[item.k.toLowerCase()] || '#FFD700';
                                  const isKey2 = item.k.toLowerCase().includes('key signal');
                                  return (
                                    <div key={ii} style={{ padding: isKey2 ? '10px 14px 8px' : '7px 14px', borderBottom:'1px solid rgba(255,215,0,.06)', background: isKey2 ? 'rgba(255,215,0,.04)' : undefined }}>
                                      <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:800, color:mmCol2, letterSpacing:.6, textTransform:'uppercase', flexShrink:0, marginTop:1, minWidth:80 }}>{item.k}</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize: isKey2 ? 10 : 9, color: isKey2 ? '#fff' : 'var(--t2)', lineHeight:1.6, fontWeight: isKey2 ? 700 : 400 }}>{item.v}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                if (isMM2 && item.t === 'txt') {
                                  return (
                                    <div key={ii} style={{ padding:'7px 14px', borderBottom:'1px solid rgba(255,215,0,.05)' }}>
                                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', lineHeight:1.6 }}>{item.v}</span>
                                    </div>
                                  );
                                }
                                if (is12K && item.t === 'kv') {
                                  const kl = item.k.toLowerCase().trim();
                                  const val = item.v || '';
                                  const isSignalRow = kl.includes('sinyal');
                                  const isToplamRow = kl === 'toplam';
                                  const isKonfRow   = kl === 'konfluens skoru';
                                  const isNihaiRow  = kl === 'nihai karar';
                                  const isKritikRow = kl === 'kritik metrik';
                                  const isBiasRow2  = kl === 'bias';
                                  const isNetRow2   = kl === 'net aksiyon';
                                  if (isBiasRow2) {
                                    const d=val.match(/\b(BULLISH|BEARISH|NEUTRAL)\b/i)?.[1]?.toUpperCase()||'NEUTRAL';
                                    const dc=d==='BULLISH'?'#00FFB2':d==='BEARISH'?'#EF4444':'#F59E0B';
                                    return (
                                      <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:`${dc}06` }}>
                                        <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, marginBottom:5, textTransform:'uppercase' }}>Kurumsal Bias</div>
                                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                                          <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:900, color:dc, padding:'4px 14px', background:`${dc}18`, borderRadius:6, border:`1.5px solid ${dc}50`, letterSpacing:1 }}>{d}</div>
                                          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', flex:1 }}>{val.replace(/\b(BULLISH|BEARISH|NEUTRAL)\b\s*\|?\s*/i,'').trim()}</div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  if (isNetRow2) {
                                    return (
                                      <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:'rgba(16,185,129,.04)' }}>
                                        <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'#10B981', letterSpacing:.8, marginBottom:5, textTransform:'uppercase' }}>Net Aksiyon Planı</div>
                                        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t1)', lineHeight:1.7 }}>{val}</div>
                                      </div>
                                    );
                                  }
                                  if (isNihaiRow) {
                                    const d = val.match(/\b(LONG|SHORT|BEKLE|HEDGE)\b/i)?.[1]?.toUpperCase()||'BEKLE';
                                    const dc = d==='LONG'?'#00FFB2':d==='SHORT'?'#EF4444':d==='HEDGE'?'#A78BFA':'#F59E0B';
                                    return (
                                      <div key={ii} style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:`${dc}08` }}>
                                        <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, marginBottom:7, textTransform:'uppercase' }}>Nihai Karar — Sentez</div>
                                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                                          <div style={{ fontFamily:'var(--mono)', fontSize:17, fontWeight:900, color:dc, padding:'5px 16px', background:`${dc}18`, borderRadius:7, border:`1.5px solid ${dc}50`, letterSpacing:1 }}>{d}</div>
                                          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', flex:1, lineHeight:1.5 }}>{val.replace(/\b(LONG|SHORT|BEKLE|HEDGE)\b\s*\|?\s*/i,'').trim()}</div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  if (isKonfRow) {
                                    const pctM = val.match(/(%\d+|\d+%)/);
                                    const pct = pctM?parseInt(pctM[0]):0;
                                    const cc = pct>=70?'#00FFB2':pct>=50?'#F59E0B':'#EF4444';
                                    return (
                                      <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                                          <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, textTransform:'uppercase' }}>Konfluens Skoru</span>
                                          <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:900, color:cc }}>%{pct}</span>
                                        </div>
                                        <div style={{ height:7, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden', marginBottom:5 }}>
                                          <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:`linear-gradient(90deg,${pct>=70?'#059669,#00FFB2':pct>=50?'#B45309,#F59E0B':'#B91C1C,#EF4444'})`, borderRadius:4, transition:'width .6s ease' }} />
                                        </div>
                                        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)' }}>{pct>=70?'YUKSEK GUVENİLİRLİK (>%70)':pct>=50?'ORTA GUVENİLİRLİK (%50-70)':'DUSUK GUVENİLİRLİK (<%50)'}</div>
                                      </div>
                                    );
                                  }
                                  if (isToplamRow) {
                                    const lM=val.match(/(\d+)\/12\s*LONG/i), sM2=val.match(/(\d+)\/12\s*SHORT/i), nM=val.match(/(\d+)\/12\s*NOTR/i);
                                    const lc=parseInt(lM?.[1]||0),sc3=parseInt(sM2?.[1]||0),nc=parseInt(nM?.[1]||0);
                                    return (
                                      <div key={ii} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.04)', background:'rgba(255,255,255,.02)' }}>
                                        <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)', letterSpacing:.8, marginBottom:7, textTransform:'uppercase' }}>12-Katman Sinyal Dağılımı</div>
                                        <div style={{ display:'flex', gap:6 }}>
                                          <div style={{ flex:lc, minWidth:lc?20:0, background:'linear-gradient(90deg,#059669,#10B981)', borderRadius:4, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:9, fontWeight:900, color:'#fff', overflow:'hidden' }}>{lc>0?`LONG ${lc}`:''}</div>
                                          <div style={{ flex:nc, minWidth:nc?16:0, background:'rgba(148,163,184,.25)', borderRadius:4, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'#94A3B8', overflow:'hidden' }}>{nc>0?`NOTR ${nc}`:''}</div>
                                          <div style={{ flex:sc3, minWidth:sc3?20:0, background:'linear-gradient(90deg,#DC2626,#EF4444)', borderRadius:4, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:9, fontWeight:900, color:'#fff', overflow:'hidden' }}>{sc3>0?`SHORT ${sc3}`:''}</div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  if (isKritikRow) {
                                    return (
                                      <div key={ii} style={{ padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,.025)', background:'rgba(245,158,11,.04)' }}>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'#F59E0B', letterSpacing:.5, textTransform:'uppercase', display:'block', marginBottom:4 }}>Kritik Metrik</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', lineHeight:1.6 }}>{val}</span>
                                      </div>
                                    );
                                  }
                                  if (isSignalRow) {
                                    const dirM=val.match(/\b(LONG|SHORT|NOTR)\s*$/i), gucM=val.match(/Guc:\s*(\d+)\/5/i);
                                    const dir4=dirM?.[1]?.toUpperCase()||'NOTR', guc=parseInt(gucM?.[1]||0);
                                    const d4c=dir4==='LONG'?'#00FFB2':dir4==='SHORT'?'#EF4444':'#64748B';
                                    const kc=kvColor(item.k)||cfg.color;
                                    const desc2=val.replace(/—?\s*Guc:\s*\d+\/5\s*—?\s*(LONG|SHORT|NOTR)?\s*$/i,'').replace(/\s*—\s*$/,'').trim();
                                    return (
                                      <div key={ii} style={{ display:'flex', alignItems:'center', padding:'6px 12px', gap:7, borderBottom:'1px solid rgba(255,255,255,.022)', minHeight:32 }}>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:8, color:kc, width:130, flexShrink:0, lineHeight:1.3 }}>{item.k}</span>
                                        <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }} title={desc2}>{desc2}</span>
                                        <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                                          {[1,2,3,4,5].map(n=><div key={n} style={{ width:5, height:8, borderRadius:2, background:n<=guc?kc:'rgba(255,255,255,.10)' }}/>)}
                                        </div>
                                        <div style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:800, color:d4c, padding:'2px 9px', background:`${d4c}18`, borderRadius:4, border:`1px solid ${d4c}40`, flexShrink:0, minWidth:46, textAlign:'center', letterSpacing:.3 }}>{dir4}</div>
                                      </div>
                                    );
                                  }
                                }
                                return item.t === 'kv' ? (
                                  <div key={ii} className="kv-row">
                                    <span className="kv-k">{item.k}</span>
                                    <span className="kv-v" style={{ color: kvColor(item.k) || cfg.color }}>{item.v}</span>
                                  </div>
                                ) : (
                                  <div key={ii} className="txt-row">
                                    <div className="txt-bar" style={{ background:cfg.color }} />
                                    <span className="txt-content">{item.v}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}

            {!apiData && !loading && !error && (
              <div style={{ textAlign:'center', marginTop:'15vh' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:48, color:'var(--border)', marginBottom:16, lineHeight:1 }}>◈</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t3)', letterSpacing:2, marginBottom:6 }}>
                  SYSTEM STANDBY
                </div>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', letterSpacing:1.5, marginBottom:32 }}>
                  VARLIK SEÇ · ALGO ÇALIŞTIR
                </div>
                {/* Mobilde COİN SEÇ butonu */}
                <button className="mob-blk"
                  onClick={() => setMobTab('coins')}
                  style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:800, color:'var(--accent)',
                    background:'rgba(0,212,255,.07)', border:'1px solid rgba(0,212,255,.30)',
                    borderRadius:10, padding:'14px 28px', cursor:'pointer', letterSpacing:.5,
                    width:'100%', maxWidth:300, marginBottom:14, display:'block' }}>
                  ◈ COİN SEÇ
                </button>
                <div className="mob-blk" style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)' }}>
                  <span style={{ color:'var(--accent)', fontWeight:800 }}>{coin}</span> seçili · <strong style={{ color:'var(--accent)' }}>DEEP SCAN</strong> butonuna basın
                </div>
              </div>
            )}
          </div>

          {/* History tab (mobile) */}
          <div className="mob" style={{ display: mobTab==='history' ? 'flex' : 'none', flexDirection:'column' }}>
            <HistPanel />
          </div>

          {/* Market tab */}
          <div style={{ display: mobTab==='market' ? 'block' : 'none', padding:'16px 16px 0' }}>
            <MarketPanel />
          </div>

          {/* Profile tab (mobile) */}
          <div className="mob-profile" style={{ display: mobTab==='profile' ? 'flex' : 'none' }}>
            {(() => {
              const plan = profile?.plan || 'free';
              const userName = profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Kullanıcı';
              const email    = session?.user?.email || '';
              const avatarChar = userName[0]?.toUpperCase() || 'U';
              const dailyUsed  = profile?.daily_analyses || 0;
              const totalUsed  = profile?.total_analyses || 0;
              const dailyLimit = plan === 'free' ? 5 : null;
              const usagePct   = dailyLimit ? Math.min(100, dailyUsed / dailyLimit * 100) : 100;
              const memberSince = profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('tr-TR', { year:'numeric', month:'long' })
                : '—';

              const pm = {
                free:  {
                  label:'STARTER', color:'#64748b', glow:'rgba(100,116,139,.5)', glowOuter:'rgba(100,116,139,.15)',
                  bg:'rgba(100,116,139,.08)', border:'rgba(100,116,139,.25)', icon:'◈',
                  grad:'linear-gradient(135deg,#334155,#475569)',
                  headerGrad:'linear-gradient(135deg,rgba(100,116,139,.12),rgba(71,85,105,.06))',
                  features:[
                    { ok:true,  txt:'Günde 5 analiz hakkı' },
                    { ok:true,  txt:'Temel ICT/SMC analiz' },
                    { ok:true,  txt:'4H + 1D zaman dilimleri' },
                    { ok:false, txt:'Sınırsız günlük analiz' },
                    { ok:false, txt:'7-Katman Quantum Engine' },
                    { ok:false, txt:'1W + 1M + MTF analiz' },
                    { ok:false, txt:'Market Maker modeli' },
                    { ok:false, txt:'Öncelikli destek' },
                  ],
                  price:'Ücretsiz',
                  cta:true,
                },
                pro: {
                  label:'PRO', color:'#3b82f6', glow:'rgba(59,130,246,.6)', glowOuter:'rgba(59,130,246,.15)',
                  bg:'rgba(59,130,246,.08)', border:'rgba(59,130,246,.3)', icon:'⚡',
                  grad:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                  headerGrad:'linear-gradient(135deg,rgba(59,130,246,.14),rgba(29,78,216,.06))',
                  features:[
                    { ok:true, txt:'Sınırsız günlük analiz' },
                    { ok:true, txt:'7-Katman Quantum Engine' },
                    { ok:true, txt:'4H · 1D · 1W · 1M tüm TF' },
                    { ok:true, txt:'Market Maker modeli' },
                    { ok:true, txt:'ICT/SMC + Wyckoff + Elliott' },
                    { ok:true, txt:'Futures & CoinGlass verileri' },
                    { ok:true, txt:'5x leverage optimizasyonu' },
                    { ok:false,txt:'Özel analiz botu (soon)' },
                  ],
                  price:'$99/ay',
                  cta:false,
                },
                elite: {
                  label:'ELITE', color:'#a855f7', glow:'rgba(168,85,247,.65)', glowOuter:'rgba(168,85,247,.18)',
                  bg:'rgba(168,85,247,.08)', border:'rgba(168,85,247,.3)', icon:'◆',
                  grad:'linear-gradient(135deg,#7c3aed,#a855f7)',
                  headerGrad:'linear-gradient(135deg,rgba(168,85,247,.16),rgba(124,58,237,.06))',
                  features:[
                    { ok:true, txt:'Sınırsız günlük analiz' },
                    { ok:true, txt:'Tüm PRO özellikler' },
                    { ok:true, txt:'PRIME APEX sinyal erişimi' },
                    { ok:true, txt:'Monte Carlo risk simülasyonu' },
                    { ok:true, txt:'Adaptive Kelly + CLP' },
                    { ok:true, txt:'Özel analiz botu' },
                    { ok:true, txt:'VIP Telegram grubu' },
                    { ok:true, txt:'1-1 mentor desteği' },
                  ],
                  price:'$299/ay',
                  cta:false,
                },
              }[plan] || {};

              return (
                <div style={{ minHeight:'100vh', paddingBottom:80 }}>

                  {/* ── HERO CARD ── */}
                  <div style={{
                    background: pm.headerGrad,
                    borderBottom:`1px solid ${pm.border}`,
                    padding:'28px 20px 24px',
                    position:'relative', overflow:'hidden',
                    textAlign:'center',
                  }}>
                    {/* decorative bg glow */}
                    <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)',
                      width:200, height:200, borderRadius:'50%',
                      background:`radial-gradient(circle,${pm.bg},transparent 70%)`,
                      pointerEvents:'none' }} />

                    {/* Avatar */}
                    <div style={{
                      width:76, height:76, borderRadius:22, margin:'0 auto 14px',
                      background: pm.grad,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:30, fontWeight:900, color:'#fff',
                      boxShadow:`0 0 0 3px ${pm.border}, 0 0 28px ${pm.glow}`,
                      position:'relative', zIndex:1,
                      '--av-glow': pm.glow, '--av-glow-outer': pm.glowOuter,
                      animation:'avatar-glow 3s ease-in-out infinite',
                    }}>
                      {avatarChar}
                    </div>

                    {/* Name */}
                    <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:900, color:'var(--t1)', letterSpacing:-.3, marginBottom:4 }}>
                      {userName}
                    </div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:9.5, color:'var(--t3)', marginBottom:14 }}>
                      {email}
                    </div>

                    {/* Plan badge */}
                    <div style={{ display:'inline-flex', alignItems:'center', gap:7,
                      background: pm.bg, border:`1px solid ${pm.border}`,
                      borderRadius:10, padding:'8px 18px',
                      boxShadow:`0 0 20px ${pm.glow}40`,
                    }}>
                      <span style={{ fontSize:16, color:pm.color }}>{pm.icon}</span>
                      <div style={{ textAlign:'left' }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:900, color:pm.color, letterSpacing:1 }}>{pm.label} MEMBER</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:1 }}>{pm.price}</div>
                      </div>
                    </div>

                    {/* Member since */}
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t3)', marginTop:10 }}>
                      ÜYELİK BAŞLANGIÇ · {memberSince}
                    </div>
                  </div>

                  {/* ── USAGE STATS ── */}
                  <div style={{ margin:'14px 16px 0', background:'var(--card)', border:`1px solid ${pm.border}`, borderRadius:12, padding:'14px 16px', borderLeft:`3px solid ${pm.color}` }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'var(--t3)', letterSpacing:1.2, marginBottom:12 }}>KULLANIM İSTATİSTİKLERİ</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                      {[
                        { lbl:'BUGÜN', val: dailyLimit ? `${dailyUsed}/${dailyLimit}` : `${dailyUsed}/∞`, col: dailyLimit && dailyUsed >= dailyLimit ? '#ef4444' : pm.color },
                        { lbl:'TOPLAM', val: totalUsed || '—', col: pm.color },
                      ].map(({ lbl, val, col }) => (
                        <div key={lbl} style={{ background:'var(--panel)', borderRadius:8, padding:'10px 12px', textAlign:'center', border:`1px solid ${col}20` }}>
                          <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', letterSpacing:.8, marginBottom:5 }}>{lbl} ANALİZ</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:900, color:col }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {dailyLimit && (
                      <>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t3)' }}>GÜNLÜK KOTA</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color: usagePct>=80?'#ef4444':pm.color }}>{usagePct.toFixed(0)}%</span>
                        </div>
                        <div style={{ height:6, background:'rgba(255,255,255,.05)', borderRadius:3, overflow:'hidden', border:'1px solid rgba(255,255,255,.06)' }}>
                          <div style={{ height:'100%', borderRadius:3, transition:'width .6s ease',
                            width:`${usagePct}%`,
                            background:`linear-gradient(90deg,${pm.color},${usagePct>=80?'#ef4444':pm.color}cc)`,
                            boxShadow:`0 0 8px ${pm.color}60`,
                          }} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── PLAN FEATURES ── */}
                  <div style={{ margin:'12px 16px 0', background:'var(--card)', border:`1px solid ${pm.border}`, borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:'var(--t3)', letterSpacing:1.2 }}>PLAN KAPSAMI</div>
                      <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:900, color:pm.color, background:pm.bg, border:`1px solid ${pm.border}`, borderRadius:5, padding:'2px 10px' }}>{pm.label}</span>
                    </div>
                    {pm.features?.map((f, i) => (
                      <div key={i} className="mp-feature">
                        <span style={{ fontSize:13, flexShrink:0, color: f.ok ? '#10b981' : '#374151' }}>{f.ok ? '✓' : '✕'}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:10.5, color: f.ok ? 'var(--t1)' : 'var(--t3)', lineHeight:1.4 }}>{f.txt}</span>
                      </div>
                    ))}
                  </div>

                  {/* ── UPGRADE CTA (free only) ── */}
                  {pm.cta && (
                    <div style={{ margin:'12px 16px 0', borderRadius:12, overflow:'hidden', border:'1px solid rgba(245,158,11,.3)' }}>
                      <div style={{ background:'linear-gradient(135deg,rgba(245,158,11,.14),rgba(234,88,12,.08))', padding:'16px' }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:900, color:'#f59e0b', marginBottom:5, letterSpacing:.5 }}>⚡ PRO'YA YÜKSELTİN</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:9.5, color:'var(--t2)', lineHeight:1.65, marginBottom:12 }}>
                          Sınırsız analiz, 7-Katman Quantum Engine, Market Maker modeli ve daha fazlası.
                        </div>
                        <a href="https://t.me/DeepTradeScanner" target="_blank" rel="noopener noreferrer"
                          onClick={() => sendNotify('upgrade', { plan: 'pro' })}
                          style={{
                            display:'block', textAlign:'center',
                            background:'linear-gradient(135deg,#d97706,#f59e0b)',
                            color:'#000', fontFamily:'var(--mono)', fontSize:10, fontWeight:900,
                            padding:'11px', borderRadius:8, textDecoration:'none', letterSpacing:1,
                            boxShadow:'0 4px 20px rgba(245,158,11,.35)',
                          }}>
                          UPGRADE İÇİN TELEGRAM →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* ── LOGOUT ── */}
                  <div style={{ margin:'12px 16px 0' }}>
                    <button onClick={doLogout} style={{
                      width:'100%', padding:'13px', borderRadius:10, cursor:'pointer',
                      fontFamily:'var(--mono)', fontSize:10, fontWeight:700, letterSpacing:.8,
                      background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.18)',
                      color:'rgba(239,68,68,.7)', transition:'all .15s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.14)';e.currentTarget.style.color='#f87171';e.currentTarget.style.borderColor='rgba(239,68,68,.45)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,.06)';e.currentTarget.style.color='rgba(239,68,68,.7)';e.currentTarget.style.borderColor='rgba(239,68,68,.18)';}}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                      OTURUM KAPAT
                    </button>
                  </div>

                </div>
              );
            })()}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="sidebar-r">
          <HistPanel />
        </div>
      </div>

      {/* CHART MODAL */}
      {chartModal && (
        <ChartModal
          coin={chartModal.coin}
          setup={chartModal.setup}
          onClose={() => setChartModal(null)}
        />
      )}

      {/* MOBILE NAV */}
      <nav className="mob-nav">
        <button className={`mob-btn ${mobTab==='analyze'?'on':''}`} onClick={() => setMobTab('analyze')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          ANALYZE
        </button>
        <button className={`mob-btn ${mobTab==='market'?'on':''}`} onClick={() => setMobTab('market')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          MARKET
        </button>
        <button className={`mob-btn ${mobTab==='history'?'on':''}`} onClick={() => { setMobTab('history'); if(!history.length) loadHistory(session?.access_token); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          HISTORY
        </button>
        <button className={`mob-btn ${mobTab==='coins'?'on':''}`} onClick={() => setMobTab('coins')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          COİNS
        </button>
        <button className={`mob-btn ${mobTab==='profile'?'on':''}`} onClick={() => setMobTab('profile')}
          style={mobTab==='profile' ? {
            color: profile?.plan==='elite' ? '#a855f7' : profile?.plan==='pro' ? '#3b82f6' : '#64748b',
          } : {}}>
          {(() => {
            const avatarChar = (profile?.full_name || session?.user?.email || 'U')[0]?.toUpperCase();
            const plan = profile?.plan || 'free';
            const col = plan==='elite'?'#a855f7':plan==='pro'?'#3b82f6':'#64748b';
            const grad = plan==='elite'?'linear-gradient(135deg,#7c3aed,#a855f7)':plan==='pro'?'linear-gradient(135deg,#1d4ed8,#3b82f6)':'linear-gradient(135deg,#334155,#475569)';
            return mobTab==='profile' ? (
              <div style={{ width:20, height:20, borderRadius:6, background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#fff', boxShadow:`0 0 8px ${col}80` }}>
                {avatarChar}
              </div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
            );
          })()}
          PROFİL
        </button>
      </nav>
    </div>
  );
}
