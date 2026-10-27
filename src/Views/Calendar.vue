<script setup>
import { computed, ref, watch } from 'vue'
import TopBar from '../components/TopBar.vue'
import { canCreateAppointment } from '../stores/auth'
import {
  TODAY,
  addAppointment,
  cancelAppointment,
  calendarEvents,
  catalogServices,
  completeAppointment,
  loadError,
  veterinarians
} from '../stores/clinic'
import { askConfirm } from '../stores/confirm'
import { notify } from '../stores/toast'

/* ------------------------------ Utilidades ------------------------------ */

const pad = (n) => String(n).padStart(2, '0')
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]
const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

const longDate = (key) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

const formatCurrency = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const hourOf = (event) => Number(event.time.slice(0, 2))

const petInfo = (event) =>
  [event.petSpecies, event.petBreed].filter(Boolean).join(' · ') || 'Espécie não informada'

function startOfWeek(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - result.getDay())
  return result
}

/* -------------------------------- Estado -------------------------------- */

const currentDate = ref(new Date())
const viewMode = ref('month')
const vetFilter = ref('')

const selectedKey = ref(TODAY)
const dayOpen = ref(false)
const createOpen = ref(false)
const detailId = ref(null)

const saving = ref(false)
const saveError = ref('')
const actionBusy = ref(false)
const actionError = ref('')

const emptyForm = () => ({
  pet: '',
  owner: '',
  serviceId: catalogServices.value[0]?.id ?? null,
  veterinarioId: '',
  time: '09:00'
})
const form = ref(emptyForm())

// Pré-seleciona o primeiro serviço assim que o catálogo carregar
watch(
  catalogServices,
  (list) => {
    if (!form.value.serviceId) form.value.serviceId = list[0]?.id ?? null
  },
  { immediate: true }
)

/* ------------------------------ Eventos -------------------------------- */

// O filtro por veterinário vale para as duas visualizações
const events = computed(() =>
  calendarEvents.value.filter((e) => !vetFilter.value || e.vetId === vetFilter.value)
)

const eventsByDate = computed(() => {
  const map = {}
  for (const event of events.value) (map[event.date] ||= []).push(event)
  return map
})

const eventsOn = (key) => eventsByDate.value[key] ?? []

/* ------------------------------ Período -------------------------------- */

const monthPrefix = computed(
  () => `${currentDate.value.getFullYear()}-${pad(currentDate.value.getMonth() + 1)}`
)

const weekDaysWithDates = computed(() => {
  const start = startOfWeek(currentDate.value)
  return weekLabels.map((label, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { label, date, key: toKey(date) }
  })
})

const weekKeys = computed(() => weekDaysWithDates.value.map((d) => d.key))

const periodEvents = computed(() =>
  events.value.filter((e) =>
    viewMode.value === 'month' ? e.date.startsWith(monthPrefix.value) : weekKeys.value.includes(e.date)
  )
)

const periodTitle = computed(() => {
  if (viewMode.value === 'month') {
    return `${monthNames[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`
  }
  const start = weekDaysWithDates.value[0].date
  const end = weekDaysWithDates.value[6].date
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} – ${end.getDate()} de ${monthNames[end.getMonth()]}`
    : `${start.getDate()} de ${monthNames[start.getMonth()]} – ${end.getDate()} de ${monthNames[end.getMonth()]}`
})

const periodSummary = computed(() => {
  const total = periodEvents.value.length
  const done = periodEvents.value.filter((e) => e.status === 'completed').length
  return `${total} ${total === 1 ? 'atendimento' : 'atendimentos'} · ${done} ${done === 1 ? 'concluído' : 'concluídos'} no período`
})

const calendarDays = computed(() => {
  const first = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      key: toKey(date),
      day: date.getDate(),
      outside: date.getMonth() !== currentDate.value.getMonth()
    }
  })
})

// Horas da semana: 08h–18h, ampliadas se houver atendimento fora dessa faixa
const weekHours = computed(() => {
  const hours = periodEvents.value.map(hourOf)
  const start = Math.min(8, ...hours)
  const end = Math.max(18, ...hours)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const eventsAt = (key, hour) => eventsOn(key).filter((e) => hourOf(e) === hour)

function movePeriod(amount) {
  const date = new Date(currentDate.value)
  if (viewMode.value === 'month') {
    date.setDate(1)
    date.setMonth(date.getMonth() + amount)
  } else {
    date.setDate(date.getDate() + 7 * amount)
  }
  currentDate.value = date
}

const goToday = () => (currentDate.value = new Date())

/* ------------------------------ Ações ---------------------------------- */

function handleDayClick(date) {
  const key = toKey(date)
  selectedKey.value = key
  if (eventsOn(key).length) {
    dayOpen.value = true
  } else if (canCreateAppointment.value) {
    openCreate(key)
  }
}

function openCreate(key = TODAY) {
  selectedKey.value = key
  form.value = emptyForm()
  saveError.value = ''
  dayOpen.value = false
  createOpen.value = true
}

async function createAppointment() {
  saveError.value = ''
  saving.value = true
  try {
    await addAppointment({ ...form.value, date: selectedKey.value })
    createOpen.value = false
    notify('Agendamento salvo na agenda.')
  } catch (error) {
    saveError.value = error.message ?? 'Não foi possível salvar o agendamento.'
  } finally {
    saving.value = false
  }
}

const dayEvents = computed(() => eventsOn(selectedKey.value))

// Lido direto da store: reflete conclusões e cancelamentos em tempo real
const detailEvent = computed(
  () => calendarEvents.value.find((e) => e.id === detailId.value) ?? null
)

function openDetail(event) {
  actionError.value = ''
  detailId.value = event.id
}

async function runAction(action, successMessage, fallback) {
  actionError.value = ''
  actionBusy.value = true
  try {
    await action()
    notify(successMessage)
  } catch (error) {
    actionError.value = error.message ?? fallback
  } finally {
    actionBusy.value = false
  }
}

const finishAppointment = (id) =>
  runAction(
    () => completeAppointment(id),
    'Atendimento concluído. A receita foi lançada no financeiro.',
    'Não foi possível concluir o atendimento.'
  )

async function cancelDetail(id) {
  const confirmed = await askConfirm({
    title: 'Cancelar este atendimento?',
    message: 'O horário será liberado na agenda. Esta ação pode ser refeita apenas criando um novo agendamento.',
    confirmLabel: 'Sim, cancelar',
    cancelLabel: 'Manter',
    danger: true
  })
  if (!confirmed) return
  runAction(() => cancelAppointment(id), 'Atendimento cancelado.', 'Não foi possível cancelar o atendimento.')
}
</script>

<template>
  <TopBar />

  <main class="page calendar-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Agenda</p>
        <h1 class="page-title">Agenda da clínica</h1>
        <p class="page-subtitle">{{ periodSummary }}</p>
      </div>
      <button v-if="canCreateAppointment" class="btn btn--primary" type="button" @click="openCreate(TODAY)">
        <span aria-hidden="true">+</span> Novo agendamento
      </button>
    </header>

    <p v-if="loadError" class="text-error" role="alert">{{ loadError }}</p>

    <section class="card calendar-card" aria-label="Calendário de atendimentos">
      <div class="calendar-toolbar">
        <div class="period-nav">
          <button class="icon-btn" type="button" aria-label="Período anterior" @click="movePeriod(-1)">‹</button>
          <button class="btn btn--secondary btn--sm" type="button" @click="goToday">Hoje</button>
          <button class="icon-btn" type="button" aria-label="Próximo período" @click="movePeriod(1)">›</button>
          <Transition name="fade-swap" mode="out-in">
            <h2 :key="periodTitle" class="period-title">{{ periodTitle }}</h2>
          </Transition>
        </div>

        <div class="toolbar-actions">
          <label class="vet-filter">
            <span>Veterinário</span>
            <select v-model="vetFilter" class="input input--sm">
              <option value="">Todos</option>
              <option v-for="vet in veterinarians" :key="vet.id" :value="vet.id">{{ vet.nome }}</option>
            </select>
          </label>

          <div class="segmented" role="group" aria-label="Modo de visualização">
            <button
              type="button"
              :class="{ 'is-active': viewMode === 'month' }"
              :aria-pressed="viewMode === 'month'"
              @click="viewMode = 'month'"
            >
              Mês
            </button>
            <button
              type="button"
              :class="{ 'is-active': viewMode === 'week' }"
              :aria-pressed="viewMode === 'week'"
              @click="viewMode = 'week'"
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      <!-- Visão mensal -->
      <Transition name="fade-swap" mode="out-in">
        <div v-if="viewMode === 'month'" :key="`m-${monthPrefix}-${vetFilter}`" class="month-grid">
          <div v-for="label in weekLabels" :key="label" class="weekday">{{ label }}</div>

          <div
            v-for="day in calendarDays"
            :key="day.key"
            class="month-day"
            :class="{ outside: day.outside, today: day.key === TODAY }"
            role="button"
            tabindex="0"
            @click="handleDayClick(new Date(day.key + 'T12:00:00'))"
            @keydown.enter.self="handleDayClick(new Date(day.key + 'T12:00:00'))"
          >
            <span class="day-number">{{ day.day }}</span>

            <button
              v-for="event in eventsOn(day.key).slice(0, 3)"
              :key="event.id"
              class="chip"
              :class="[`tone-${event.tone}`, { 'is-done': event.status === 'completed' }]"
              type="button"
              :title="`${event.time} · ${event.pet} · ${event.vetName || 'Sem veterinário'}`"
              @click.stop="openDetail(event)"
            >
              <b>{{ event.time }}</b>
              <span class="chip__pet">{{ event.pet }}</span>
              <span class="chip__vet" aria-hidden="true">{{ event.vetName ? initials(event.vetName) : '—' }}</span>
            </button>

            <span v-if="eventsOn(day.key).length > 3" class="more-events">
              +{{ eventsOn(day.key).length - 3 }} mais
            </span>
          </div>
        </div>

        <!-- Visão semanal: uma linha por horário -->
        <div v-else :key="`w-${weekKeys[0]}-${vetFilter}`" class="week-scroll">
          <div class="week">
            <div class="week-row week-row--head">
              <span class="week-corner"></span>
              <div
                v-for="day in weekDaysWithDates"
                :key="day.key"
                class="week-heading"
                :class="{ 'is-today': day.key === TODAY }"
              >
                <span>{{ day.label }}</span>
                <strong>{{ day.date.getDate() }}</strong>
              </div>
            </div>

            <div v-for="hour in weekHours" :key="hour" class="week-row">
              <span class="week-time">{{ pad(hour) }}:00</span>
              <div
                v-for="day in weekDaysWithDates"
                :key="day.key"
                class="week-cell"
                :class="{ 'is-today': day.key === TODAY }"
              >
                <button
                  v-for="event in eventsAt(day.key, hour)"
                  :key="event.id"
                  class="week-card"
                  :class="[`tone-${event.tone}`, { 'is-done': event.status === 'completed' }]"
                  type="button"
                  @click="openDetail(event)"
                >
                  <span class="week-card__time">{{ event.time }}</span>
                  <strong>{{ event.pet }}</strong>
                  <span class="week-card__service">{{ event.service }}</span>
                  <span class="week-card__vet">
                    <i class="avatar avatar--xs" aria-hidden="true">{{ event.vetName ? initials(event.vetName) : '—' }}</i>
                    {{ event.vetName || 'Sem veterinário' }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <footer class="calendar-legend">
        <span><i class="legend-swatch legend-swatch--scheduled"></i>Agendado</span>
        <span><i class="legend-swatch legend-swatch--done"></i>Concluído</span>
        <span class="legend-tip">Clique em um atendimento para ver os detalhes</span>
      </footer>
    </section>
  </main>

  <!-- Agenda do dia -->
  <Transition name="overlay">
    <div v-if="dayOpen" class="overlay" @click.self="dayOpen = false">
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="day-title">
        <button class="modal-close" type="button" aria-label="Fechar" @click="dayOpen = false">×</button>
        <p class="eyebrow">Agenda do dia</p>
        <h2 id="day-title" class="modal-title">Atendimentos</h2>
        <p class="modal-date">{{ longDate(selectedKey) }}</p>

        <ul class="day-list">
          <li v-for="event in dayEvents" :key="event.id">
            <button class="day-item" :class="`tone-${event.tone}`" type="button" @click="openDetail(event)">
              <time>{{ event.time }}</time>
              <div class="day-item__info">
                <strong>{{ event.pet }}</strong>
                <span>{{ event.service }} · {{ event.owner }}</span>
              </div>
              <span class="vet-chip" :title="event.vetName || 'Sem veterinário'">
                <i class="avatar avatar--xs" aria-hidden="true">{{ event.vetName ? initials(event.vetName) : '—' }}</i>
                {{ event.vetName || 'Sem vet.' }}
              </span>
            </button>
          </li>
        </ul>

        <button v-if="canCreateAppointment" class="btn btn--secondary btn--block add-day" type="button" @click="openCreate(selectedKey)">
          <span aria-hidden="true">+</span> Novo agendamento neste dia
        </button>
      </div>
    </div>
  </Transition>

  <!-- Detalhes do atendimento -->
  <Transition name="overlay">
    <div v-if="detailEvent" class="overlay" @click.self="detailId = null">
      <article class="modal-panel modal-panel--detail" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button class="modal-close" type="button" aria-label="Fechar" @click="detailId = null">×</button>

        <div class="detail-head">
          <span class="badge" :class="detailEvent.status === 'completed' ? 'badge--success' : 'badge--accent'">
            {{ detailEvent.status === 'completed' ? 'Concluído' : 'Agendado' }}
          </span>
          <span class="detail-when">{{ longDate(detailEvent.date) }} · {{ detailEvent.time }}</span>
        </div>

        <h2 id="detail-title" class="modal-title">{{ detailEvent.pet }}</h2>
        <p class="detail-species">{{ petInfo(detailEvent) }}</p>

        <dl class="detail-grid">
          <div>
            <dt>Tutor</dt>
            <dd>{{ detailEvent.owner }}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{{ detailEvent.ownerPhone || '—' }}</dd>
          </div>
          <div class="detail-grid__wide">
            <dt>Veterinário(a) responsável</dt>
            <dd class="vet-row">
              <i class="avatar" aria-hidden="true">{{ detailEvent.vetName ? initials(detailEvent.vetName) : '—' }}</i>
              <span>
                {{ detailEvent.vetName || 'Não definido' }}
                <small v-if="detailEvent.vetCrmv">CRMV {{ detailEvent.vetCrmv }}</small>
              </span>
            </dd>
          </div>
          <div>
            <dt>Serviço</dt>
            <dd>{{ detailEvent.service }}</dd>
          </div>
          <div>
            <dt>Valor previsto</dt>
            <dd>{{ formatCurrency(detailEvent.price) }}</dd>
          </div>
          <div class="detail-grid__wide">
            <dt>Motivo da visita</dt>
            <dd>{{ detailEvent.reason || '—' }}</dd>
          </div>
        </dl>

        <p v-if="actionError" class="text-error action-error" role="alert">{{ actionError }}</p>

        <footer class="detail-actions">
          <template v-if="detailEvent.status === 'scheduled'">
            <button class="btn btn--primary" type="button" :disabled="actionBusy" @click="finishAppointment(detailEvent.id)">
              {{ actionBusy ? 'Salvando...' : 'Concluir atendimento' }}
            </button>
            <button
              v-if="canCreateAppointment"
              class="btn btn--danger"
              type="button"
              :disabled="actionBusy"
              @click="cancelDetail(detailEvent.id)"
            >
              Cancelar
            </button>
          </template>
          <span v-else class="done-note">✓ Atendimento concluído</span>
        </footer>
      </article>
    </div>
  </Transition>

  <!-- Novo agendamento -->
  <Transition name="overlay">
    <div v-if="createOpen" class="overlay" @click.self="createOpen = false">
      <form class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="create-title" @submit.prevent="createAppointment">
        <button class="modal-close" type="button" aria-label="Fechar" @click="createOpen = false">×</button>
        <p class="eyebrow">Novo compromisso</p>
        <h2 id="create-title" class="modal-title">Agendar atendimento</h2>
        <p class="modal-date">Para {{ longDate(selectedKey) }}</p>

        <div class="form-stack">
          <label class="field">
            Nome do pet
            <input v-model="form.pet" class="input" required placeholder="Ex.: Lola" />
          </label>
          <label class="field">
            Tutor
            <input v-model="form.owner" class="input" required placeholder="Nome do tutor" />
          </label>

          <div class="form-row">
            <label class="field">
              Serviço
              <select v-model="form.serviceId" class="input">
                <option v-for="service in catalogServices" :key="service.id" :value="service.id">
                  {{ service.name }}
                </option>
              </select>
            </label>
            <label class="field">
              Horário
              <input v-model="form.time" class="input" type="time" required />
            </label>
          </div>

          <label class="field">
            Veterinário(a) responsável
            <select v-model="form.veterinarioId" class="input">
              <option value="">A definir</option>
              <option v-for="vet in veterinarians" :key="vet.id" :value="vet.id">
                {{ vet.nome }}<template v-if="vet.crmv"> · CRMV {{ vet.crmv }}</template>
              </option>
            </select>
          </label>
        </div>

        <p v-if="saveError" class="text-error" role="alert">{{ saveError }}</p>

        <button class="btn btn--primary btn--block submit" type="submit" :disabled="saving || !form.serviceId">
          <span v-if="saving" class="spinner" aria-hidden="true"></span>
          {{ saving ? 'Salvando...' : 'Salvar agendamento' }}
        </button>
      </form>
    </div>
  </Transition>
</template>

<style scoped>
.calendar-page {
  padding-bottom: 72px;
}

.calendar-card {
  overflow: hidden;
}

/* Barra superior */

.calendar-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 20px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
}

.period-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.period-title {
  min-width: 230px;
  margin: 0 10px;
  color: var(--ink);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  text-align: center;
  text-transform: capitalize;
}

.fade-swap-enter-active,
.fade-swap-leave-active {
  transition: opacity 0.22s var(--ease), transform 0.22s var(--ease);
}

.fade-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.vet-filter {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font-size: 0.66rem;
  font-weight: 700;
}

.input--sm {
  min-height: 36px;
  width: auto;
  min-width: 170px;
  padding: 0 10px;
  font-size: 0.7rem;
  font-weight: 600;
}

.avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--accent-soft-ink);
  background: var(--accent-soft);
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 800;
}

.avatar--xs {
  width: 18px;
  height: 18px;
  border: 0;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.5rem;
}

:root[data-theme='dark'] .avatar--xs {
  background: rgba(255, 255, 255, 0.12);
}

/* Tons por cor do serviço */

.tone-green { --tone-bg: var(--tone-green-bg); --tone-ink: var(--tone-green-ink); --tone-bar: var(--tone-green-bar); }
.tone-blue { --tone-bg: var(--tone-blue-bg); --tone-ink: var(--tone-blue-ink); --tone-bar: var(--tone-blue-bar); }
.tone-yellow { --tone-bg: var(--tone-yellow-bg); --tone-ink: var(--tone-yellow-ink); --tone-bar: var(--tone-yellow-bar); }
.tone-purple { --tone-bg: var(--tone-purple-bg); --tone-ink: var(--tone-purple-ink); --tone-bar: var(--tone-purple-bar); }

/* Visão mensal */

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.weekday {
  padding: 13px 10px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--muted);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
}

.month-day {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 118px;
  padding: 9px 8px;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background-color 0.2s;
}

.month-day:nth-child(7n) {
  border-right: 0;
}

.month-day:hover {
  background: var(--surface-2);
}

.month-day:focus-visible {
  outline-offset: -2px;
}

.month-day.outside {
  background: var(--surface-2);
}

.month-day.outside .day-number {
  color: var(--muted);
  opacity: 0.5;
}

.day-number {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  margin-bottom: 2px;
  border-radius: 50%;
  color: var(--ink);
  font-size: 0.72rem;
  font-weight: 700;
  transition: transform 0.2s var(--ease);
}

.month-day:hover .day-number {
  transform: scale(1.08);
}

.month-day.today .day-number {
  color: var(--accent-ink);
  background: var(--accent);
}

.chip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 6px 4px 8px;
  border: 0;
  border-left: 3px solid var(--tone-bar);
  border-radius: 7px;
  color: var(--tone-ink);
  background: var(--tone-bg);
  font-size: 0.6rem;
  text-align: left;
  transition: transform 0.2s var(--ease), filter 0.2s, opacity 0.2s;
}

.chip:hover {
  transform: translateX(2px);
  filter: brightness(0.97);
}

.chip b {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.chip__pet {
  min-width: 0;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip__vet {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  font-size: 0.5rem;
  font-weight: 800;
}

:root[data-theme='dark'] .chip__vet {
  background: rgba(255, 255, 255, 0.12);
}

.chip.is-done {
  opacity: 0.55;
}

.more-events {
  padding-left: 4px;
  color: var(--muted);
  font-size: 0.58rem;
  font-weight: 700;
}

/* Visão semanal */

.week-scroll {
  overflow-x: auto;
}

.week {
  min-width: 940px;
}

.week-row {
  display: grid;
  grid-template-columns: 64px repeat(7, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.week-row--head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface-2);
}

.week-corner {
  border-right: 1px solid var(--line);
}

.week-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 58px;
  border-right: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.week-heading strong {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--ink);
  font-size: 0.78rem;
  letter-spacing: 0;
}

.week-heading.is-today strong {
  color: var(--accent-ink);
  background: var(--accent);
}

.week-time {
  padding: 10px 10px 0 0;
  border-right: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.6rem;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.week-cell {
  min-height: 86px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border-right: 1px solid var(--line);
}

.week-cell:last-child {
  border-right: 0;
}

.week-cell.is-today {
  background: var(--accent-soft);
}

.week-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 9px;
  border: 0;
  border-left: 3px solid var(--tone-bar);
  border-radius: 9px;
  color: var(--tone-ink);
  background: var(--tone-bg);
  text-align: left;
  transition: transform 0.25s var(--ease), box-shadow 0.25s var(--ease), opacity 0.2s;
}

.week-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.week-card.is-done {
  opacity: 0.6;
}

.week-card__time {
  font-size: 0.56rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.week-card strong {
  overflow: hidden;
  color: inherit;
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-card__service {
  overflow: hidden;
  font-size: 0.56rem;
  font-weight: 600;
  opacity: 0.85;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-card__vet {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  overflow: hidden;
  font-size: 0.56rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Legenda */

.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  padding: 14px 24px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.62rem;
  font-weight: 600;
}

.calendar-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend-swatch--scheduled {
  background: var(--tone-green-bar);
}

.legend-swatch--done {
  background: var(--line-strong);
}

.legend-tip {
  margin-left: auto;
}

/* Modais */

.modal-title {
  margin: 0 0 6px;
  padding-right: 28px;
  color: var(--ink);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.05em;
}

.modal-date {
  margin: 0 0 22px;
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: capitalize;
}

.day-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 340px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.day-item {
  width: 100%;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border: 0;
  border-left: 3px solid var(--tone-bar);
  border-radius: 11px;
  color: var(--tone-ink);
  background: var(--tone-bg);
  text-align: left;
  transition: transform 0.2s var(--ease), filter 0.2s;
}

.day-item:hover {
  transform: translateX(3px);
  filter: brightness(0.98);
}

.day-item time {
  font-size: 0.74rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.day-item__info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.day-item__info strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 0.74rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-item__info span {
  overflow: hidden;
  color: var(--muted);
  font-size: 0.6rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vet-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--tone-ink);
  font-size: 0.58rem;
  font-weight: 700;
  white-space: nowrap;
}

.add-day {
  margin-top: 16px;
  border-style: dashed;
}

.detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-right: 28px;
}

.detail-when {
  color: var(--muted);
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: capitalize;
}

.detail-species {
  margin: 0 0 20px;
  color: var(--muted);
  font-size: 0.72rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 18px;
  margin: 0;
  padding: 18px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.detail-grid > div {
  min-width: 0;
}

.detail-grid__wide {
  grid-column: 1 / -1;
}

.detail-grid dt {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.detail-grid dd {
  margin: 0;
  color: var(--ink);
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.5;
}

.vet-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vet-row small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.6rem;
  font-weight: 600;
}

.action-error {
  margin: 14px 0 0;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.detail-actions .btn--primary {
  flex: 1;
}

.done-note {
  color: var(--success);
  font-size: 0.74rem;
  font-weight: 700;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.submit {
  margin-top: 22px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsivo */

@media (max-width: 1000px) {
  .legend-tip {
    display: none;
  }
}

@media (max-width: 760px) {
  .calendar-toolbar {
    padding: 16px;
  }

  .period-nav {
    width: 100%;
    flex-wrap: wrap;
  }

  .period-title {
    order: 4;
    width: 100%;
    min-width: 0;
    margin: 4px 0 0;
  }

  .toolbar-actions {
    width: 100%;
  }

  .vet-filter {
    flex: 1;
  }

  .input--sm {
    min-width: 0;
    flex: 1;
  }

  .segmented {
    flex: 1;
  }

  .segmented button {
    flex: 1;
  }

  .month-day {
    min-height: 84px;
    padding: 6px 4px;
  }

  .chip {
    grid-template-columns: minmax(0, 1fr);
    padding: 3px 4px;
  }

  .chip b,
  .chip__pet,
  .chip__vet {
    display: none;
  }

  .weekday {
    padding: 10px 2px;
    font-size: 0.5rem;
  }

  .form-row,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
