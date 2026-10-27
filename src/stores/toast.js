import { reactive } from 'vue'

/*
 * Notificações discretas no canto da tela, no lugar de window.alert.
 * Uso: notify('Atendimento concluído'), notify('Falhou', 'error')
 */

export const toasts = reactive([])

let nextId = 1

export function dismiss(id) {
  const index = toasts.findIndex((toast) => toast.id === id)
  if (index >= 0) toasts.splice(index, 1)
}

export function notify(message, type = 'success', duration = 3800) {
  const id = nextId++
  toasts.push({ id, message, type })
  setTimeout(() => dismiss(id), duration)
  return id
}
