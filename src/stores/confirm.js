import { reactive } from 'vue'

/*
 * Confirmação em forma de diálogo, no lugar de window.confirm.
 * Uso: if (await askConfirm({ title, message, confirmLabel, danger: true })) { ... }
 */

export const confirmState = reactive({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Voltar',
  danger: false
})

let resolver = null

export function askConfirm({
  title,
  message = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  danger = false
}) {
  // Se já havia uma pergunta aberta, ela é respondida como "não"
  resolver?.(false)
  Object.assign(confirmState, { open: true, title, message, confirmLabel, cancelLabel, danger })
  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function answerConfirm(value) {
  confirmState.open = false
  const resolve = resolver
  resolver = null
  resolve?.(value)
}
