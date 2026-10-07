import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
    console.error(
        '[Supabase] Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example) e reinicie o "npm run dev".'
    )
}

// Valores provisórios evitam que o app quebre na inicialização sem o .env
export const supabase = createClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder-key'
)

