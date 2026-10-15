import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

export const session = ref(null)
export const profile = ref(null)
export const authReady = ref(false)

export const cargoLabels = {
    admin: 'Administração',
    recepcao: 'Recepção',
    veterinario: 'Veterinário(a)'
}

export const displayName = computed(() => profile.value?.nome ?? session.value?.user?.email ?? '')
export const displayRole = computed(() => cargoLabels[profile.value?.cargo] ?? '')
export const isAdmin = computed(() => profile.value?.cargo === 'admin' && profile.value?.ativo !== false)
export const isVeterinario = computed(() => profile.value?.cargo === 'veterinario')
export const isRecepcao = computed(() => profile.value?.cargo === 'recepcao')

/* ------------------------- Regras de acesso ------------------------- */

// Telas liberadas por cargo ('*' = todas). O perfil é sempre acessível.
const routesByCargo = {
    admin: ['*'],
    recepcao: ['/dashboard', '/appointments', '/calendar'],
    veterinario: ['/dashboard', '/appointments', '/calendar']
}
const ALWAYS_ALLOWED = ['/dashboard', '/profile']

/** Indica se o usuário logado pode abrir a rota informada. */
export function canAccess(path) {
    if (ALWAYS_ALLOWED.includes(path)) return true
    const allowed = routesByCargo[profile.value?.cargo] ?? []
    return allowed.includes('*') || allowed.includes(path)
}

// Ações na tela de Atendimentos: veterinário apenas consulta/atende
export const canCreateAppointment = computed(() => isAdmin.value || isRecepcao.value)
export const canDeleteAppointment = computed(() => isAdmin.value || isRecepcao.value)
export const initials = computed(() =>
    displayName.value
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
)

export async function loadProfile() {
    if (!session.value) {
        profile.value = null
        return
    }
    const { data } = await supabase
        .from('perfis')
        .select('id, nome, cargo, email, ativo, veterinario_id')
        .eq('id', session.value.user.id)
        .maybeSingle()
    profile.value = data

    // conta desativada por um administrador: encerra a sessão
    if (data && data.ativo === false) {
        await supabase.auth.signOut()
    }
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
    await loadProfile()
}

export async function signOut() {
    await supabase.auth.signOut()
}