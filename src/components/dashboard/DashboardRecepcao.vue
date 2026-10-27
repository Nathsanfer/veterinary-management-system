<script setup>
import { computed } from 'vue'
import AppointmentList from './AppointmentList.vue'
import DashboardHero from './DashboardHero.vue'
import DayProgress from './DayProgress.vue'
import StatCard from './StatCard.vue'
import { NEXT_DAYS, addDays, hhmm } from './dashboardUtils'
import { useNow } from './useNow'
import { TODAY, calendarEvents } from '../../stores/clinic'

const now = useNow()
const nowTime = computed(() => hhmm(now.value))

const weekEnd = addDays(TODAY, NEXT_DAYS)

const todayList = computed(() => calendarEvents.value.filter((a) => a.date === TODAY))
const waiting = computed(() => todayList.value.filter((a) => a.status === 'scheduled'))
const finished = computed(() => todayList.value.filter((a) => a.status === 'completed'))
const upcoming = computed(() =>
  calendarEvents.value.filter((a) => a.date > TODAY && a.date <= weekEnd)
)

const share = (part) =>
  todayList.value.length ? Math.round((part / todayList.value.length) * 100) : 0
</script>

<template>
  <div class="dash-view">
    <DashboardHero
      eyebrow="Recepção"
      description="Acompanhe a agenda de todos os veterinários e encaixe novos atendimentos."
      :action="{ to: '/appointments', label: 'Novo agendamento', icon: '+' }"
    />

    <section class="dash-stats" aria-label="Resumo da recepção">
      <StatCard icon="◷" label="Atendimentos hoje" :value="todayList.length" note="na agenda de hoje" tone="sage" />
      <StatCard icon="!" label="Aguardando" :value="waiting.length" note="ainda não concluídos" tone="sand" :progress="share(waiting.length)" />
      <StatCard icon="✓" label="Concluídos hoje" :value="finished.length" note="atendimentos finalizados" tone="lime" :progress="share(finished.length)" />
      <StatCard icon="→" label="Próximos 7 dias" :value="upcoming.length" note="atendimentos futuros" tone="blue" />
    </section>

    <div class="dash-grid dash-grid--split">
      <section class="dash-panel" aria-labelledby="today-title">
        <header class="dash-panel__head">
          <div>
            <p class="dash-eyebrow">Acompanhamento</p>
            <h2 id="today-title" class="dash-panel__title">Agenda de hoje</h2>
          </div>
          <router-link class="dash-link" to="/calendar">Ver agenda <span aria-hidden="true">→</span></router-link>
        </header>
        <AppointmentList
          :items="todayList"
          show-vet
          :now-time="nowTime"
          empty-title="Nenhum atendimento para hoje"
          empty-text="Os novos agendamentos aparecerão aqui."
        />
      </section>

      <div class="dash-stack">
        <DayProgress :total="todayList.length" :done="finished.length" :pending="waiting.length" />

        <section class="dash-panel" aria-labelledby="upcoming-title">
          <header class="dash-panel__head">
            <div>
              <p class="dash-eyebrow">Próximos dias</p>
              <h2 id="upcoming-title" class="dash-panel__title">Próximos atendimentos</h2>
            </div>
            <router-link class="dash-link" to="/appointments">Atendimentos <span aria-hidden="true">→</span></router-link>
          </header>
          <AppointmentList
            :items="upcoming.slice(0, 5)"
            show-date
            show-vet
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
