<script setup>
import { computed } from 'vue'
import AppointmentList from './AppointmentList.vue'
import DashboardHero from './DashboardHero.vue'
import DayProgress from './DayProgress.vue'
import StatCard from './StatCard.vue'
import { NEXT_DAYS, addDays, etaLabel, hhmm, minutesOf } from './dashboardUtils'
import { useNow } from './useNow'
import { profile } from '../../stores/auth'
import { TODAY, calendarEvents } from '../../stores/clinic'

const now = useNow()
const nowTime = computed(() => hhmm(now.value))

const weekEnd = addDays(TODAY, NEXT_DAYS)

// Sem vínculo com um cadastro de veterinário não há agenda própria para mostrar
const vetId = computed(() => profile.value?.veterinario_id ?? null)

const mine = computed(() =>
  vetId.value ? calendarEvents.value.filter((a) => a.vetId === vetId.value) : []
)
const todayList = computed(() => mine.value.filter((a) => a.date === TODAY))
const pending = computed(() => todayList.value.filter((a) => a.status === 'scheduled'))
const finished = computed(() => todayList.value.filter((a) => a.status === 'completed'))
const upcoming = computed(() => mine.value.filter((a) => a.date > TODAY && a.date <= weekEnd))

const share = (part) =>
  todayList.value.length ? Math.round((part / todayList.value.length) * 100) : 0

// Próximo paciente: o primeiro pendente a partir de agora; se todos estiverem atrasados, o primeiro pendente
const nextPatient = computed(() => {
  const current = minutesOf(nowTime.value)
  return (
    pending.value.find((a) => minutesOf(a.time) >= current) ?? pending.value[0] ?? null
  )
})

const nextEta = computed(() => (nextPatient.value ? etaLabel(nextPatient.value.time, nowTime.value) : ''))
</script>

<template>
  <div class="dash-view">
    <DashboardHero
      eyebrow="Área veterinária"
      description="Veja os seus atendimentos de hoje e os próximos da sua agenda."
      :action="{ to: '/appointments', label: 'Ver atendimentos', icon: '→' }"
    />

    <p v-if="profile && !vetId" class="dash-notice" role="status">
      Seu usuário ainda não está vinculado a um cadastro de veterinário(a). Peça à administração
      para concluir o seu cadastro: sua agenda aparecerá aqui assim que o vínculo for feito.
    </p>

    <section class="dash-stats" aria-label="Resumo da sua agenda">
      <StatCard icon="◷" label="Meus atendimentos" :value="todayList.length" note="na sua agenda de hoje" tone="sage" />
      <StatCard icon="!" label="Pendentes" :value="pending.length" note="a atender hoje" tone="sand" :progress="share(pending.length)" />
      <StatCard icon="✓" label="Concluídos hoje" :value="finished.length" note="atendimentos finalizados" tone="lime" :progress="share(finished.length)" />
      <StatCard icon="→" label="Próximos 7 dias" :value="upcoming.length" note="atendimentos futuros" tone="blue" />
    </section>

    <div class="dash-grid dash-grid--split">
      <section class="dash-panel" aria-labelledby="today-title">
        <header class="dash-panel__head">
          <div>
            <p class="dash-eyebrow">Acompanhamento</p>
            <h2 id="today-title" class="dash-panel__title">Minha agenda de hoje</h2>
          </div>
          <router-link class="dash-link" to="/calendar">Ver agenda <span aria-hidden="true">→</span></router-link>
        </header>
        <AppointmentList
          :items="todayList"
          :now-time="nowTime"
          empty-title="Nenhum atendimento para hoje"
          empty-text="Aproveite o dia com calma."
        />
      </section>

      <div class="dash-stack">
        <article v-if="nextPatient" class="dash-spotlight" aria-labelledby="spotlight-title">
          <div class="dash-spotlight__top">
            <span class="dash-spotlight__label">Próximo atendimento</span>
            <span class="dash-spotlight__eta">{{ nextEta }}</span>
          </div>
          <h2 id="spotlight-title">{{ nextPatient.pet }}</h2>
          <p>{{ nextPatient.service }} · Tutor: {{ nextPatient.owner }}</p>
          <div class="dash-spotlight__time">{{ nextPatient.time }}</div>
          <router-link class="dash-spotlight__link" to="/calendar">Abrir na agenda <span aria-hidden="true">→</span></router-link>
        </article>

        <article v-else class="dash-spotlight dash-spotlight--empty">
          <span class="dash-spotlight__icon" aria-hidden="true">✓</span>
          <h2>Tudo em dia</h2>
          <p>Não há atendimentos pendentes para você hoje.</p>
        </article>

        <DayProgress :total="todayList.length" :done="finished.length" :pending="pending.length" />

        <section class="dash-panel" aria-labelledby="upcoming-title">
          <header class="dash-panel__head">
            <div>
              <p class="dash-eyebrow">Próximos dias</p>
              <h2 id="upcoming-title" class="dash-panel__title">Próximos atendimentos</h2>
            </div>
          </header>
          <AppointmentList
            :items="upcoming.slice(0, 5)"
            show-date
            empty-title="Sem atendimentos nos próximos dias"
          />
          <router-link v-if="upcoming.length > 5" class="dash-more" to="/appointments">
            Ver os {{ upcoming.length - 5 }} atendimentos restantes
          </router-link>
        </section>
      </div>
    </div>
  </div>
</template>
