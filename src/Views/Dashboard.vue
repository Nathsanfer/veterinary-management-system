<script setup>
import { computed } from 'vue'
import TopBar from '../components/TopBar.vue'
import { displayName } from '../stores/auth'
import {
  TODAY,
  calendarEvents,
  catalogServices,
  loadError,
  loading,
  transactions
} from '../stores/clinic'

const todayAppointments = computed(() =>
  calendarEvents.value.filter((appointment) => appointment.date === TODAY)
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

const formatCurrency = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formattedDate = computed(() =>
  new Date(`${TODAY}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
)

</script>

<template>
  <TopBar />

  <main class="dashboard">
    <section class="welcome-panel" aria-labelledby="welcome-title">
      <div class="welcome-copy">
        <p class="eyebrow">PAINEL DA CLÍNICA</p>
        <h1 id="welcome-title">
          Olá<span v-if="displayName">, {{ displayName.split(' ')[0] }}</span>!
        </h1>
        <p class="welcome-description">
          Aqui está o resumo da sua clínica para
          <span class="date-capitalized">{{ formattedDate }}</span>.
        </p>
      </div>
      <router-link class="primary-action" to="/calendar">
        <span aria-hidden="true">+</span>
        Novo agendamento
      </router-link>
      <div class="welcome-decoration" aria-hidden="true">
        <span class="decoration-circle decoration-circle--one"></span>
        <span class="decoration-circle decoration-circle--two"></span>
        <span class="decoration-leaf">✳</span>
      </div>
    </section>

    <p v-if="loadError" class="dashboard-message dashboard-message--error" role="alert">
      Não foi possível carregar os dados do painel: {{ loadError }}
    </p>
    <p v-else-if="loading" class="dashboard-message" role="status">
      Carregando os dados da clínica...
    </p>

    <section class="metric-grid" aria-label="Resumo da clínica">
      <article class="metric-card">
        <div class="metric-card__top">
          <span class="metric-icon metric-icon--sage" aria-hidden="true">◷</span>
          <span class="metric-label">Atendimentos hoje</span>
        </div>
        <strong class="metric-value">{{ todayAppointments.length }}</strong>
        <span class="metric-note">na agenda de hoje</span>
      </article>
      <article class="metric-card">
        <div class="metric-card__top">
          <span class="metric-icon metric-icon--lime" aria-hidden="true">✳</span>
          <span class="metric-label">Serviços ativos</span>
        </div>
        <strong class="metric-value">{{ catalogServices.length }}</strong>
        <span class="metric-note">disponíveis no catálogo</span>
      </article>
      <article class="metric-card">
        <div class="metric-card__top">
          <span class="metric-icon metric-icon--blue" aria-hidden="true">↗</span>
          <span class="metric-label">Receita no mês</span>
        </div>
        <strong class="metric-value metric-value--currency">{{ formatCurrency(monthlyIncome) }}</strong>
        <span class="metric-note">receitas registradas neste mês</span>
      </article>
      <article class="metric-card">
        <div class="metric-card__top">
          <span class="metric-icon metric-icon--sand" aria-hidden="true">!</span>
          <span class="metric-label">Pendências</span>
        </div>
        <strong class="metric-value">{{ pendingTransactions.length }}</strong>
        <span class="metric-note">lançamentos em aberto no mês</span>
      </article>
    </section>

    <div class="dashboard-content">
      <section class="schedule-panel" aria-labelledby="schedule-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ACOMPANHAMENTO</p>
            <h2 id="schedule-title">Agenda de hoje</h2>
          </div>
          <router-link class="text-link" to="/calendar">Ver agenda <span aria-hidden="true">→</span></router-link>
        </div>

        <div v-if="todayAppointments.length" class="appointment-list">
          <article
            v-for="appointment in todayAppointments.slice(0, 5)"
            :key="appointment.id"
            class="appointment-row"
          >
            <time class="appointment-time">{{ appointment.time }}</time>
            <span class="appointment-marker" aria-hidden="true"></span>
            <div class="appointment-details">
              <strong>{{ appointment.pet }}</strong>
              <span>{{ appointment.service }} · {{ appointment.owner }}</span>
            </div>
            <span
              class="appointment-status"
              :class="appointment.status === 'completed' ? 'appointment-status--done' : ''"
            >
              {{ appointment.status === 'completed' ? 'Concluído' : 'Agendado' }}
            </span>
          </article>
          <router-link
            v-if="todayAppointments.length > 5"
            class="more-link"
            to="/appointments"
          >
            Ver os {{ todayAppointments.length - 5 }} atendimentos restantes
          </router-link>
        </div>
        <div v-else class="empty-schedule">
          <span class="empty-schedule__icon" aria-hidden="true">✳</span>
          <strong>Nenhum atendimento agendado para hoje</strong>
          <span>Quando houver novos horários, eles aparecerão aqui.</span>
          <router-link to="/calendar">Abrir agenda</router-link>
        </div>
      </section>

      <aside class="focus-panel" aria-label="Resumo financeiro">
        <div class="focus-panel__icon" aria-hidden="true">↗</div>
        <p class="eyebrow">VISÃO FINANCEIRA</p>
        <h2>Receita registrada</h2>
        <strong class="focus-value">{{ formatCurrency(monthlyIncome) }}</strong>
        <p class="focus-description">
          Total de receitas lançadas neste mês. Consulte o fluxo de caixa para ver os detalhes.
        </p>
        <router-link class="focus-link" to="/finances">
          Acessar finanças <span aria-hidden="true">→</span>
        </router-link>
      </aside>
    </div>

    <section class="chart-panel" aria-labelledby="chart-title">
      <div class="section-heading chart-heading">
        <div>
          <p class="eyebrow">VISÃO FINANCEIRA</p>
          <h2 id="chart-title">Receitas e despesas</h2>
          <p class="chart-subtitle">Comparativo dos últimos seis meses</p>
        </div>
        <router-link class="text-link" to="/finances">Ver detalhes <span aria-hidden="true">→</span></router-link>
      </div>
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
  </main>
</template>

<style scoped>
.dashboard {
  --ink: #183b3a;
  --muted: #6c8580;
  --line: #e3ebe3;
  --accent: #31572c;
  width: min(100% - 48px, 1280px);
  margin: 0 auto;
  padding: 38px 0 64px;
  color: var(--ink);
}

.welcome-panel {
  position: relative;
  min-height: 192px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 36px 44px;
  border: 1px solid #dce8d9;
  border-radius: 22px;
  background: linear-gradient(112deg, #e9f0e3 0%, #edf2e7 62%, #e1ebdc 100%);
}

.welcome-copy,
.primary-action {
  position: relative;
  z-index: 1;
}

.eyebrow {
  margin: 0 0 10px;
  color: #71836a;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.welcome-copy h1 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(1.8rem, 3vw, 2.45rem);
  font-weight: 700;
  letter-spacing: -0.055em;
}

.welcome-description {
  margin: 11px 0 0;
  color: #60766e;
  font-size: 0.84rem;
  font-weight: 500;
}

.date-capitalized {
  text-transform: lowercase;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: 0 0 auto;
  padding: 13px 18px;
  border: 1px solid #31572c;
  border-radius: 10px;
  color: #fff;
  background: #31572c;
  box-shadow: 0 6px 16px rgba(49, 87, 44, 0.14);
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  transition: transform 160ms ease, background 160ms ease;
}

.primary-action:hover {
  transform: translateY(-2px);
  background: #244622;
}

.primary-action > span {
  font-size: 1.15rem;
  font-weight: 500;
  line-height: 0.8;
}

.welcome-decoration {
  position: absolute;
  top: 0;
  right: 170px;
  width: 220px;
  height: 100%;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  display: block;
  border: 1px solid rgba(90, 120, 78, 0.12);
  border-radius: 50%;
}

.decoration-circle--one {
  top: -70px;
  right: 3px;
  width: 220px;
  height: 220px;
}

.decoration-circle--two {
  top: -35px;
  right: 38px;
  width: 150px;
  height: 150px;
}

.decoration-leaf {
  position: absolute;
  top: 58px;
  right: 91px;
  color: rgba(80, 112, 65, 0.25);
  font-size: 2.4rem;
}

.dashboard-message {
  margin: 18px 0 -4px;
  color: var(--muted);
  font-size: 0.78rem;
}

.dashboard-message--error {
  color: #9d5144;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.metric-card {
  min-width: 0;
  padding: 20px 21px 18px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(24, 59, 58, 0.025);
}

.metric-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-icon {
  width: 32px;
  height: 32px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
}

.metric-icon--sage { color: #41634b; background: #e9f1e8; }
.metric-icon--lime { color: #657d35; background: #f0f3dc; }
.metric-icon--blue { color: #426e7f; background: #e6f0f2; }
.metric-icon--sand { color: #937344; background: #f5efe1; }

.metric-label {
  overflow: hidden;
  color: #738680;
  font-size: 0.68rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  display: block;
  margin-top: 17px;
  color: var(--ink);
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.055em;
  line-height: 1.1;
}

.metric-value--currency {
  font-size: clamp(1.2rem, 1.8vw, 1.65rem);
  letter-spacing: -0.045em;
}

.metric-note {
  display: block;
  margin-top: 7px;
  color: #8a9a95;
  font-size: 0.65rem;
  font-weight: 500;
}

.dashboard-content {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(250px, 0.8fr);
  gap: 18px;
  margin-top: 22px;
}

.schedule-panel,
.focus-panel {
  border: 1px solid var(--line);
  border-radius: 17px;
  background: #fff;
}

.schedule-panel {
  min-width: 0;
  padding: 24px 26px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-heading .eyebrow {
  margin-bottom: 6px;
}

.section-heading h2,
.focus-panel h2 {
  margin: 0;
  color: var(--ink);
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.035em;
}

.text-link,
.focus-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4e7046;
  font-size: 0.68rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.text-link:hover,
.focus-link:hover,
.empty-schedule a:hover,
.more-link:hover {
  color: #213f26;
}

.appointment-list {
  margin-top: 17px;
}

.appointment-row {
  min-height: 66px;
  display: grid;
  grid-template-columns: 48px 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  border-top: 1px solid #edf1ed;
}

.appointment-time {
  color: #54734b;
  font-size: 0.72rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.appointment-marker {
  width: 8px;
  height: 8px;
  border: 2px solid #72945d;
  border-radius: 50%;
  background: #edf4e9;
  box-shadow: 0 0 0 3px #f1f5ee;
}

.appointment-details {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.appointment-details strong {
  overflow: hidden;
  color: #294644;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-details span {
  overflow: hidden;
  color: #82928d;
  font-size: 0.64rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-status {
  padding: 6px 9px;
  border-radius: 20px;
  color: #72854c;
  background: #f0f3e5;
  font-size: 0.58rem;
  font-weight: 700;
  white-space: nowrap;
}

.appointment-status--done {
  color: #4c7767;
  background: #e9f3ed;
}

.more-link {
  display: inline-block;
  margin: 12px 0 0 71px;
  color: #4e7046;
  font-size: 0.67rem;
  font-weight: 700;
  text-decoration: none;
}

.empty-schedule {
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-top: 1px solid #edf1ed;
  text-align: center;
}

.empty-schedule__icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  margin-bottom: 3px;
  border-radius: 50%;
  color: #718d5c;
  background: #edf3e9;
  font-size: 1.1rem;
}

.empty-schedule strong {
  color: #385451;
  font-size: 0.75rem;
}

.empty-schedule > span:not(.empty-schedule__icon) {
  color: #879590;
  font-size: 0.65rem;
}

.empty-schedule a {
  margin-top: 4px;
  color: #4e7046;
  font-size: 0.67rem;
  font-weight: 700;
  text-decoration: none;
}

.focus-panel {
  position: relative;
  overflow: hidden;
  padding: 25px 24px;
  background: linear-gradient(145deg, #31572c, #244a3f);
  border-color: #31572c;
  color: #f7f8f3;
}

.focus-panel::after {
  position: absolute;
  right: -52px;
  bottom: -88px;
  width: 200px;
  height: 200px;
  border: 1px solid rgba(235, 242, 226, 0.13);
  border-radius: 50%;
  content: '';
}

.focus-panel__icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  margin-bottom: 21px;
  border: 1px solid rgba(245, 248, 237, 0.22);
  border-radius: 11px;
  color: #d7e9b7;
  background: rgba(246, 248, 238, 0.1);
  font-size: 1.15rem;
}

.focus-panel .eyebrow {
  color: #c6d6a5;
}

.focus-panel h2 {
  color: #fff;
  font-size: 1rem;
}

.focus-value {
  display: block;
  margin-top: 15px;
  color: #f4f6e8;
  font-size: clamp(1.55rem, 2.4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.055em;
}

.focus-description {
  max-width: 240px;
  margin: 10px 0 20px;
  color: #d0ddca;
  font-size: 0.68rem;
  line-height: 1.65;
}

.focus-link {
  position: relative;
  z-index: 1;
  color: #e2edc8;
}

.focus-link:hover {
  color: #fff;
}

.chart-panel {
  margin-top: 24px;
  padding: 24px 26px 20px;
  border: 1px solid var(--line);
  border-radius: 17px;
  background: #fff;
}

.chart-subtitle {
  margin: 6px 0 0;
  color: #879590;
  font-size: 0.68rem;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 23px;
  color: #71827c;
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
  background: #789563;
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
  border-top: 1px dashed #e8eee8;
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
  min-height: 0;
  display: block;
  border-radius: 5px 5px 2px 2px;
  transition: height 220ms ease;
}

.chart-bar--income {
  background: linear-gradient(180deg, #91aa7c, #6f8c5a);
}

.chart-bar--expense {
  background: linear-gradient(180deg, #e5b58d, #c98d66);
}

.chart-month__label {
  margin-top: 10px;
  color: #7f9089;
  font-size: 0.63rem;
  font-weight: 600;
}

@media (max-width: 1000px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .dashboard {
    width: min(100% - 28px, 1280px);
    padding-top: 24px;
  }

  .welcome-panel {
    min-height: 220px;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: 21px;
    padding: 27px 24px;
  }

  .welcome-decoration {
    right: 15px;
  }

  .welcome-copy {
    max-width: 82%;
  }

  .welcome-description {
    line-height: 1.6;
  }

  .primary-action {
    padding: 11px 14px;
  }

  .dashboard-content {
    grid-template-columns: 1fr;
  }

  .focus-panel {
    min-height: 230px;
  }

  .chart-panel {
    padding: 20px 17px 17px;
  }
}

@media (max-width: 440px) {
  .metric-grid {
    gap: 10px;
  }

  .metric-card {
    padding: 15px 13px;
  }

  .metric-card__top {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .metric-value {
    margin-top: 13px;
    font-size: 1.55rem;
  }

  .metric-value--currency {
    font-size: 1.16rem;
  }

  .schedule-panel {
    padding: 20px 16px;
  }

  .appointment-row {
    grid-template-columns: 39px 8px minmax(0, 1fr);
    gap: 9px;
  }

  .appointment-status {
    display: none;
  }

  .chart-heading {
    align-items: flex-start;
  }
}
</style>
