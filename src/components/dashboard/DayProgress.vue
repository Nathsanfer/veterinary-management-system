<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  total: { type: Number, required: true },
  done: { type: Number, required: true },
  pending: { type: Number, required: true }
})

// Circunferência do anel (raio 44 no viewBox 100x100)
const CIRCUMFERENCE = 2 * Math.PI * 44

// O anel começa vazio e preenche ao montar, para a animação aparecer
const mounted = ref(false)
onMounted(() => requestAnimationFrame(() => (mounted.value = true)))

const percent = computed(() => (props.total ? Math.round((props.done / props.total) * 100) : 0))
const offset = computed(() =>
  mounted.value ? CIRCUMFERENCE * (1 - percent.value / 100) : CIRCUMFERENCE
)
</script>

<template>
  <section class="dash-panel dash-progress" aria-labelledby="progress-title">
    <p class="dash-eyebrow">Andamento do dia</p>
    <h2 id="progress-title" class="dash-panel__title">Atendimentos concluídos</h2>

    <div class="dash-progress__body">
      <div class="dash-ring" role="img" :aria-label="`${percent}% dos atendimentos de hoje concluídos`">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle class="dash-ring__track" cx="50" cy="50" r="44" />
          <circle
            class="dash-ring__value"
            cx="50"
            cy="50"
            r="44"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="offset"
          />
        </svg>
        <strong>{{ percent }}%</strong>
      </div>

      <ul class="dash-legend">
        <li><i class="dash-dot dash-dot--done"></i>Concluídos <b>{{ done }}</b></li>
        <li><i class="dash-dot dash-dot--pending"></i>A atender <b>{{ pending }}</b></li>
        <li><i class="dash-dot dash-dot--total"></i>Total no dia <b>{{ total }}</b></li>
      </ul>
    </div>
  </section>
</template>
