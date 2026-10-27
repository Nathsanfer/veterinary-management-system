import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Relógio reativo que atualiza a cada minuto.
 * Usado para saudação, horário atual e destaque do próximo atendimento.
 */
export function useNow() {
  const now = ref(new Date())
  let timer = null

  onMounted(() => {
    timer = setInterval(() => (now.value = new Date()), 60_000)
  })

  onUnmounted(() => clearInterval(timer))

  return now
}
