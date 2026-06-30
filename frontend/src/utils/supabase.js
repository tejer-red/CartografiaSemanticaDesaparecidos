import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "⚠️ Supabase URL or Publishable Key is missing!\n" +
    "Make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in your environment variables.\n" +
    "If using Vercel, check the 'Environment Variables' settings and trigger a NEW DEPLOYMENT (Re-deploy)."
  );
}

// Fallback seguro para evitar que createClient lance una excepción fatal al evaluar el módulo
const safeUrl = supabaseUrl || "https://vkvonszkyzfktjxobqmp.placeholder.co";
const safeKey = supabaseKey || "sb_publishable_placeholder";

export const supabase = createClient(safeUrl, safeKey);
