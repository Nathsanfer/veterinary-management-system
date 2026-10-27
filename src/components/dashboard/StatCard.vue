<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  note: { type: String, default: '' },
  icon: { type: String, default: '' },
  tone: { type: String, default: 'sage' },
  currency: { type: Boolean, default: false },
  // 0–100: quando informado, mostra uma barra de progresso no indicador
  progress: { type: Number, default: null }
})
</script>

<template>
  <article class="dash-stat">
    <div class="dash-stat__top">
      <span class="dash-stat__icon" :class="`dash-stat__icon--${tone}`" aria-hidden="true">{{ icon }}</span>
      <span class="dash-stat__label">{{ label }}</span>
    </div>
    <strong class="dash-stat__value" :class="{ 'dash-stat__value--currency': currency }">{{ value }}</strong>
    <span class="dash-stat__note">{{ note }}</span>

    <span v-if="progress !== null" class="dash-stat__bar" role="presentation">
      <i :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"></i>
    </span>
  </article>
</template>
