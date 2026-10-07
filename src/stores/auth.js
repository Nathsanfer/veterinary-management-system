import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

export const session = ref(null)
export const profile = ref(null)
export const authReady = ref(false)

const cargoLabels = {
    admin: 'Administração',
    recepcao: 'Recepção',
    veterinario: 'Veterinário(a)'
}

export const displayName = computed(() => profile.value?.nome ?? session.value?.user?.email ?? '')
export const displayRole = computed(() => cargoLabels[profile.value?.cargo] ?? '')
export const initials = computed(() =>
    displayName.value
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
)

async function loadProfile() {
    if (!session.value) {
        profile.value = null
        return
    }
    const { data } = await supabase
        .from('perfis')
        .select('nome, cargo')
        .eq('id', session.value.user.id)
        .maybeSingle()
    profile.value = data
}

let initPromise = null

/** Restaura a sessão salva e passa a acompanhar login/logout. Roda uma única vez. */
export function initAuth() {
    if (!initPromise) {
        initPromise = (async () => {
            const { data } = await supabase.auth.getSession()
            session.value = data.session
            await loadProfile()
            authReady.value = true

            supabase.auth.onAuthStateChange((_event, newSession) => {
                session.value = newSession
                // adiado para fora do callback, como recomenda o Supabase
                setTimeout(loadProfile, 0)
            })
        })()
    }
    return initPromise
}

export async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
}

export async function signOut() {
    await supabase.auth.signOut()
}

