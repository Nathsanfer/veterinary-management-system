<script setup>
import { computed } from 'vue'
import { displayName, displayRole } from '../../stores/auth'
import { TODAY } from '../../stores/clinic'
import { greetingFor } from './dashboardUtils'
import { useNow } from './useNow'

const props = defineProps({
  eyebrow: { type: String, required: true },
  description: { type: String, default: '' },
  // { to, label, icon? } — botão de ação exibido à direita
  action: { type: Object, default: null }
})

const now = useNow()

const firstName = computed(() => displayName.value.split(' ')[0])
const greeting = computed(() => greetingFor(now.value))

// A data vem de TODAY, a mesma usada para filtrar os atendimentos
const formattedDate = computed(() =>
  new Date(`${TODAY}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
)
</script>

<template>
  <section class="dash-hero" aria-labelledby="dash-hero-title">
    <div class="dash-hero__copy">
      <div class="dash-hero__meta">
        <span class="dash-eyebrow">{{ eyebrow }}</span>
        <span v-if="displayRole" class="dash-hero__role">{{ displayRole }}</span>
      </div>
      <h1 id="dash-hero-title">{{ greeting }}<span v-if="firstName">, {{ firstName }}</span>!</h1>
      <p class="dash-hero__text">
        <span class="dash-hero__date">{{ formattedDate }}</span>
        <template v-if="description"> · {{ description }}</template>
      </p>
    </div>

    <router-link v-if="action" class="dash-hero__action" :to="action.to">
      <span v-if="action.icon" aria-hidden="true">{{ action.icon }}</span>
      {{ action.label }}
    </router-link>

    <div class="dash-hero__art" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </section>
</template>
