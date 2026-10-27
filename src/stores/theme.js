import { ref, watch } from 'vue'

/*
 * Tema claro/escuro.
 * Preferência: 'system' (segue o sistema operacional), 'light' ou 'dark'.
 * O tema resolvido vira o atributo data-theme em <html>, usado pelos tokens do style.css.
 */

const STORAGE_KEY = 'vetflow-theme'
const media = window.matchMedia?.('(prefers-color-scheme: dark)')

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

export const themePreference = ref(readStored())
export const resolvedTheme = ref('light')

let animationTimer = null

function apply(animate = false) {
  const dark =
    themePreference.value === 'dark' ||
    (themePreference.value === 'system' && Boolean(media?.matches))
  resolvedTheme.value = dark ? 'dark' : 'light'

  const root = document.documentElement
  root.dataset.theme = resolvedTheme.value

  if (animate) {
    // Anima as cores só durante a troca, sem afetar o restante das transições
    root.classList.add('theme-switching')
    clearTimeout(animationTimer)
    animationTimer = setTimeout(() => root.classList.remove('theme-switching'), 400)
  }
}

watch(themePreference, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // modo privado ou armazenamento bloqueado: a preferência vale só nesta sessão
  }
  apply(true)
})

media?.addEventListener?.('change', () => {
  if (themePreference.value === 'system') apply(true)
})

/** Alterna entre claro e escuro (a partir do tema que está visível agora). */
export function toggleTheme() {
  themePreference.value = resolvedTheme.value === 'dark' ? 'light' : 'dark'
}

apply()
