/** Janela usada em "Próximos atendimentos". */
export const NEXT_DAYS = 7

export const formatCurrency = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Soma dias a uma data yyyy-mm-dd, no fuso local. */
export function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Data curta para listas: 23/10. */
export const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Horário atual no formato HH:MM, para comparar com os atendimentos. */
export const hhmm = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

/** Converte HH:MM em minutos desde meia-noite. */
export const minutesOf = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '—'

/** Texto de quando um atendimento acontece em relação a agora: "em 25 min", "agora", "atrasado". */
export function etaLabel(time, nowTime) {
  const diff = minutesOf(time) - minutesOf(nowTime)
  if (diff < 0) return 'atrasado'
  if (diff === 0) return 'agora'
  if (diff < 60) return `em ${diff} min`
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  return minutes ? `em ${hours}h ${minutes}min` : `em ${hours}h`
}
