<script setup>
import { computed } from 'vue'
import { initialsOf, minutesOf, shortDate } from './dashboardUtils'

const props = defineProps({
  items: { type: Array, required: true },
  showDate: { type: Boolean, default: false },
  showVet: { type: Boolean, default: false },
  // HH:MM atual: quando informado (lista de hoje), destaca o próximo atendimento
  nowTime: { type: String, default: null },
  emptyTitle: { type: String, default: 'Nenhum atendimento por aqui' },
  emptyText: { type: String, default: '' }
})

const nextId = computed(() => {
  if (!props.nowTime) return null
  const current = minutesOf(props.nowTime)
  const next = props.items.find((item) => item.status === 'scheduled' && minutesOf(item.time) >= current)
  return next?.id ?? null
})

const isWaiting = (item) =>
  Boolean(props.nowTime) && item.status === 'scheduled' && minutesOf(item.time) < minutesOf(props.nowTime)

function statusOf(item) {
  if (item.status === 'completed') return { label: 'Concluído', cls: 'dash-status--done' }
  if (isWaiting(item)) return { label: 'Aguardando', cls: 'dash-status--wait' }
  return { label: 'Agendado', cls: '' }
}
</script>

<template>
  <ol v-if="items.length" class="dash-timeline">
    <li
      v-for="(item, index) in items"
      :key="item.id"
      class="dash-timeline__item"
      :class="[
        `dash-tone--${item.tone}`,
        { 'is-done': item.status === 'completed', 'is-next': item.id === nextId }
      ]"
      :style="{ '--i': index }"
    >
      <time class="dash-timeline__time">
        {{ item.time }}
        <small v-if="showDate">{{ shortDate(item.date) }}</small>
      </time>

      <article class="dash-timeline__card">
        <span v-if="item.id === nextId" class="dash-timeline__next">Próximo</span>

        <div class="dash-timeline__main">
          <strong>{{ item.pet }}</strong>
          <span>{{ item.service }} · {{ item.owner }}</span>
        </div>

        <div class="dash-timeline__meta">
          <span v-if="showVet" class="vet-pill">
            <i class="vet-pill__avatar" aria-hidden="true">{{ initialsOf(item.vetName) }}</i>
            <span>{{ item.vetName || 'Sem veterinário' }}</span>
          </span>
          <span class="dash-status" :class="statusOf(item).cls">{{ statusOf(item).label }}</span>
        </div>
      </article>
    </li>
  </ol>

  <div v-else class="dash-empty">
    <span class="dash-empty__icon" aria-hidden="true">✳</span>
    <strong>{{ emptyTitle }}</strong>
    <span v-if="emptyText">{{ emptyText }}</span>
  </div>
</template>
