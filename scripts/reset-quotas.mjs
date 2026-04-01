// Render Cron Job — Her gün 00:00 UTC'de çalışır
// Quantum günlük kotaları sıfırlar
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetQuotas() {
  const { error } = await supabase
    .from('profiles')
    .update({ quantum_analyses_today: 0 })
    .gte('quantum_analyses_today', 1);

  if (error) {
    console.error('Quota reset hatası:', error);
    process.exit(1);
  }

  console.log(`✅ Günlük quantum kotaları sıfırlandı — ${new Date().toISOString()}`);
  process.exit(0);
}

resetQuotas();
