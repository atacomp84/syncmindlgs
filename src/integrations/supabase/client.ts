import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hata ayıklama için konsola log ekliyoruz
console.log("Supabase URL from env:", supabaseUrl);
console.log("Supabase Anon Key from env:", supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : 'BULUNAMADI');

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL ortam değişkeni gereklidir. Lütfen .env dosyanızı kontrol edin.");
}
if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY ortam değişkeni gereklidir. Lütfen .env dosyanızı kontrol edin.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);