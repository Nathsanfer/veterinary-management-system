<script setup>
import { computed } from 'vue'
import AppointmentList from './AppointmentList.vue'
import DashboardHero from './DashboardHero.vue'
import DayProgress from './DayProgress.vue'
import StatCard from './StatCard.vue'
import { formatCurrency, hhmm, initialsOf } from './dashboardUtils'
import { useNow } from './useNow'
import {
  TODAY,
  calendarEvents,
  catalogServices,
  transactions,
  veterinarians
} from '../../stores/clinic'

const now = useNow()
const nowTime = computed(() => hhmm(now.value))

const todayAppointments = computed(() =>
  calendarEvents.value.filter((appointment) => appointment.date === TODAY)
)

const completedToday = computed(() =>
  todayAppointments.value.filter((appointment) => appointment.status === 'completed').length
)

// Quantos atendimentos de hoje cada veterinário tem
const teamToday = computed(() =>
  veterinarians.value.map((vet) => ({
    id: vet.id,
    name: vet.nome,
    count: todayAppointments.value.filter((appointment) => appointment.vetId === vet.id).length
  }))
)

const monthTransactions = computed(() =>
  transactions.value.filter((transaction) => transaction.date?.startsWith(TODAY.slice(0, 7)))
)

const monthlyIncome = computed(() =>
  monthTransactions.value
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0)
)

const pendingTransactions = computed(() =>
  monthTransactions.value.filter((transaction) => transaction.status !== 'paid')
)

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const monthlyFinancials = computed(() => {
  const [year, month] = TODAY.split('-').map(Number)

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 - (5 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthItems = transactions.value.filter((transaction) => transaction.date?.startsWith(key))

    return {
      key,
      label: monthLabels[date.getMonth()],
      income: monthItems
        .filter((transaction) => transaction.type === 'income')
        .reduce((total, transaction) => total + transaction.amount, 0),
      expense: monthItems
        .filter((transaction) => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amount, 0)
    }
  })
})

const chartMax = computed(() =>
  Math.max(1, ...monthlyFinancials.value.flatMap(({ income, expense }) => [income, expense]))
)

const barHeight = (value) => `${Math.round((value / chartMax.value) * 100)}%`

const newAppointment = { to: '/appointments', label: 'Novo agendamento', icon: '+' }
</script>

<template>
  <div class="dash-view">
    <DashboardHero
      eyebrow="PAINEL DA CLÍNICA"
      description="Este é o resumo geral da clínica."
      :action="newAppointment"
    />

    <section class="dash-stats" aria-label="Resumo da clínica">
      <StatCard icon="◷" label="Atendimentos hoje" :value="todayAppointments.length" note="na agenda de hoje" tone="sage" />
      <StatCard icon="✳" label="Serviços ativos" :value="catalogServices.length" note="disponíveis no catálogo" tone="lime" />
      <StatCard icon="↗" label="Receita no mês" :value="formatCurrency(monthlyIncome)" note="receitas registradas neste mês" tone="blue" currency />
      <StatCard icon="!" label="Pendências" :value="pendingTransactions.length" note="lançamentos em aberto no mês" tone="sand" />
    </section>

    <div class="dash-grid">
      <section class="dash-panel" aria-labelledby="schedule-title">
        <header class="dash-panel__head">
          <div>
            <p class="dash-eyebrow">ACOMPANHAMENTO</p>
            <h2 id="schedule-title">Agenda de hoje</h2>
          </div>
          <router-link class="dash-link" to="/calendar">Ver agenda <span aria-hidden="true">→</span></router-link>
        </header>
        <AppointmentList
          :items="todayAppointments.slice(0, 5)"
          show-vet
          :now-time="nowTime"
          empty-title="Nenhum atendimento agendado para hoje"
          empty-text="Quando houver novos horários, eles aparecerão aqui."
        />
        <router-link v-if="todayAppointments.length > 5" class="dash-more" to="/calendar">
          Ver os {{ todayAppointments.length - 5 }} atendimentos restantes
        </router-link>
      </section>

      <div class="dash-stack">
      <aside class="focus-panel" aria-labelledby="finance-title">
        <div class="focus-panel__icon" aria-hidden="true">↗</div>
        <p class="focus-eyebrow">VISÃO FINANCEIRA</p>
        <h2 id="finance-title">Receita registrada</h2>
        <strong class="focus-value">{{ formatCurrency(monthlyIncome) }}</strong>
        <p class="focus-description">
          Total de receitas lançadas neste mês. Consulte o fluxo de caixa para ver os detalhes.
        </p>
        <router-link class="focus-link" to="/finances">
          Acessar finanças <span aria-hidden="true">→</span>
        </router-link>
      </aside>
        <DayProgress
          :total="todayAppointments.length"
          :done="completedToday"
          :pending="todayAppointments.length - completedToday"
        />
      </div>
    </div>

    <section v-if="teamToday.length" class="dash-panel dash-panel--team" aria-labelledby="team-title">
      <header class="dash-panel__head">
        <div>
          <p class="dash-eyebrow">Equipe</p>
          <h2 id="team-title" class="dash-panel__title">Atendimentos de hoje por veterinário</h2>
        </div>
      </header>
      <ul class="dash-team">
        <li v-for="vet in teamToday" :key="vet.id" class="dash-team__row">
          <span class="dash-team__avatar" aria-hidden="true">{{ initialsOf(vet.name) }}</span>
          <strong>{{ vet.name }}</strong>
          <span class="dash-team__count">{{ vet.count }} {{ vet.count === 1 ? 'atendimento' : 'atendimentos' }}</span>
        </li>
      </ul>
    </section>

    <section class="chart-panel" aria-labelledby="chart-title">
      <header class="chart-heading">
        <div>
          <p class="dash-eyebrow">VISÃO FINANCEIRA</p>
          <h2 id="chart-title">Receitas e despesas</h2>
          <p class="chart-subtitle">Comparativo dos últimos seis meses</p>
        </div>
        <router-link class="dash-link" to="/finances">Ver detalhes <span aria-hidden="true">→</span></router-link>
      </header>
      <div class="chart-legend" aria-label="Legenda do gráfico">
        <span><i class="legend-dot legend-dot--income"></i>Receitas</span>
        <span><i class="legend-dot legend-dot--expense"></i>Despesas</span>
      </div>
      <div class="bar-chart" role="img" aria-label="Gráfico de barras comparando receitas e despesas dos últimos seis meses">
        <div class="chart-gridlines" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div
          v-for="month in monthlyFinancials"
          :key="month.key"
          class="chart-month"
          :aria-label="`${month.label}: receitas ${formatCurrency(month.income)}, despesas ${formatCurrency(month.expense)}`"
        >
          <div class="chart-bars">
            <span
              class="chart-bar chart-bar--income"
              :style="{ height: barHeight(month.income) }"
              :title="`Receitas: ${formatCurrency(month.income)}`"
            ></span>
            <span
              class="chart-bar chart-bar--expense"
              :style="{ height: barHeight(month.expense) }"
              :title="`Despesas: ${formatCurrency(month.expense)}`"
            ></span>
          </div>
          <span class="chart-month__label">{{ month.label }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Cartão financeiro: mantém a identidade verde nos dois temas */

.focus-panel {
  position: relative;
  overflow: hidden;
  padding: 26px 26px;
  border: 1px solid #31572c;
  border-radius: 18px;
  background: linear-gradient(150deg, #3a6532 0%, #26461f 75%, #1d3819 100%);
  color: #f7f8f3;
  box-shadow: var(--shadow-md);
  transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease);
}

.focus-panel:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.focus-panel::after {
  position: absolute;
  right: -52px;
  bottom: -88px;
  width: 200px;
  height: 200px;
  border: 1px solid rgba(235, 242, 226, 0.14);
  border-radius: 50%;
  content: '';
}

.focus-panel__icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  margin-bottom: 21px;
  border: 1px solid rgba(245, 248, 237, 0.22);
  border-radius: 12px;
  color: #d7e9b7;
  background: rgba(246, 248, 238, 0.1);
  font-size: 1.15rem;
}

.focus-eyebrow {
  margin: 0 0 8px;
  color: #c6d6a5;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.focus-panel h2 {
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
}

.focus-value {
  display: block;
  margin-top: 15px;
  color: #f4f6e8;
  font-size: clamp(1.55rem, 2.4vw, 2.05rem);
  font-weight: 700;
  letter-spacing: -0.055em;
}

.focus-description {
  max-width: 250px;
  margin: 10px 0 22px;
  color: #d0ddca;
  font-size: 0.68rem;
  line-height: 1.65;
}

.focus-link {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #e2edc8;
  font-size: 0.68rem;
  font-weight: 700;
  text-decoration: none;
  transition: gap 0.25s var(--ease), color 0.2s;
}

.focus-link:hover {
  gap: 12px;
  color: #fff;
}

/* Gráfico de receitas e despesas */

.chart-panel {
  margin-top: 18px;
  padding: 24px 26px 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: background-color 0.35s, border-color 0.35s;
}

.chart-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.chart-heading h2 {
  color: var(--ink);
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.035em;
}

.chart-subtitle {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 0.68rem;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 22px;
  color: var(--muted);
  font-size: 0.67rem;
  font-weight: 600;
}

.chart-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.legend-dot {
  width: 9px;
  height: 9px;
  display: inline-block;
  border-radius: 3px;
}

.legend-dot--income {
  background: var(--tone-green-bar);
}

.legend-dot--expense {
  background: #d5a078;
}

.bar-chart {
  position: relative;
  height: 210px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
  padding: 0 5px;
}

.chart-gridlines {
  position: absolute;
  inset: 0 0 26px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.chart-gridlines span {
  border-top: 1px dashed var(--line);
}

.chart-month {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.chart-bars {
  width: 100%;
  height: 184px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(4px, 1vw, 10px);
}

.chart-bar {
  width: min(24px, 34%);
  min-height: 4px;
  display: block;
  border-radius: 6px 6px 3px 3px;
  transition: height 0.9s var(--ease), filter 0.2s;
}

.chart-bar:hover {
  filter: brightness(1.1);
}

.chart-bar--income {
  background: linear-gradient(180deg, var(--tone-green-bar), var(--accent));
}

.chart-bar--expense {
  background: linear-gradient(180deg, #e5b58d, #c98d66);
}

.chart-month__label {
  margin-top: 10px;
  color: var(--muted);
  font-size: 0.63rem;
  font-weight: 600;
}

@media (max-width: 760px) {
  .chart-panel {
    padding: 20px 17px 17px;
  }

  .chart-heading {
    flex-direction: column;
  }
}
</style>
