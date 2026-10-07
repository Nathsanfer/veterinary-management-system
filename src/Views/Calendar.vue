<script setup>
import { computed, ref, watch } from "vue";
import TopBar from "../components/TopBar.vue";
import {
  TODAY,
  addAppointment,
  calendarEvents,
  catalogServices,
  completeAppointment,
  loadError,
} from "../stores/clinic";

const currentDate = ref(new Date());
const viewMode = ref("month");
const isModalOpen = ref(false);
const selectedDate = ref("");
const selectedKey = ref("");
const saving = ref(false);
const saveError = ref("");
const newAppointment = ref({
  pet: "",
  owner: "",
  serviceId: null,
  time: "09:00",
});

// Pré-seleciona o primeiro serviço assim que o catálogo carregar
watch(
  catalogServices,
  (list) => {
    if (!newAppointment.value.serviceId) {
      newAppointment.value.serviceId = list[0]?.id ?? null;
    }
  },
  { immediate: true },
);

const monthNames = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const weekDays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const monthEvents = calendarEvents;


const dateKey = (date) => date.toISOString().slice(0, 10);
const displayMonth = computed(
  () =>
    `${monthNames[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`,
);
const displayPeriod = computed(() => {
  if (viewMode.value === "month") return displayMonth.value;
  const start = startOfWeek(currentDate.value);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} – ${end.getDate()} de ${monthNames[end.getMonth()]}`
    : `${start.getDate()} de ${monthNames[start.getMonth()]} – ${end.getDate()} de ${monthNames[end.getMonth()]}`;
});

function startOfWeek(date) {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

const calendarDays = computed(() => {
  const first = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    1,
  );
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: dateKey(date),
      day: date.getDate(),
      outside: date.getMonth() !== currentDate.value.getMonth(),
    };
  });
});

const weekDaysWithDates = computed(() => {
  const start = startOfWeek(currentDate.value);
  return weekDays.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { label, date, key: dateKey(date) };
  });
});

const visibleEvents = computed(() =>
  monthEvents.value.filter((event) => {
    if (viewMode.value === "month") return true;
    return weekDaysWithDates.value.some((day) => day.key === event.date);
  }),
);

const eventForDate = (key) => monthEvents.value.filter((event) => event.date === key);
const isToday = (date) => dateKey(date) === TODAY;
const formatDate = (date) =>
  date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

function movePeriod(amount) {
  const date = new Date(currentDate.value);
  date.setDate(viewMode.value === "month" ? 1 : 7);
  date.setMonth(date.getMonth() + amount);
  currentDate.value = date;
}

function goToday() {
  currentDate.value = new Date();
}

function openModal(date = currentDate.value) {
  selectedDate.value = formatDate(date);
  selectedKey.value = dateKey(date);
  isModalOpen.value = true;
}

async function createAppointment() {
  saveError.value = "";
  saving.value = true;
  try {
    await addAppointment({ ...newAppointment.value, date: selectedKey.value });
    isModalOpen.value = false;
    newAppointment.value = {
      pet: "",
      owner: "",
      serviceId: catalogServices.value[0]?.id ?? null,
      time: "09:00",
    };
  } catch (error) {
    saveError.value = error.message ?? "Não foi possível salvar o agendamento.";
  } finally {
    saving.value = false;
  }
}

async function finishAppointment(id) {
  try {
    await completeAppointment(id);
  } catch (error) {
    window.alert(error.message ?? "Não foi possível concluir o atendimento.");
  }
}
</script>

<template>
  <TopBar />
  <main class="calendar-page">
    <p v-if="loadError" class="load-error" role="alert">{{ loadError }}</p>
    <section class="agenda-summary">
      <div class="summary-title">
        <div class="section-icon">✦</div>
        <div>
          <h2>Próximos agendamentos</h2>
          <p>Seus compromissos mais recentes</p>
        </div>
      </div>
      <div class="appointment-list">
        <article
          v-for="event in visibleEvents.slice(0, 4)"
          :key="event.date + event.time"
          class="appointment-item"
        >
          <div class="appointment-date">
            <strong>{{ event.date.slice(8) }}</strong
            ><span>{{
              monthNames[Number(event.date.slice(5, 7)) - 1].slice(0, 3)
            }}</span>
          </div>
          <div class="appointment-info">
            <strong>{{ event.pet }}</strong
            ><span>{{ event.service }} · {{ event.owner }}</span>
          </div>
          <time>{{ event.time }}</time
          ><span class="status-dot"></span>
          <button
            v-if="event.status === 'scheduled'"
            class="finish-button"
            type="button"
            @click="finishAppointment(event.id)"
          >
            Concluir
          </button>
          <span v-else class="done-badge">Concluído</span>
        </article>
      </div>
    </section>

    <section class="calendar-card">
      <div class="calendar-toolbar">
        <div class="period-navigation">
          <button
            class="icon-button"
            aria-label="Período anterior"
            @click="movePeriod(-1)"
          >
            ‹
          </button>
          <button class="today-button" @click="goToday">Hoje</button>
          <button
            class="icon-button"
            aria-label="Próximo período"
            @click="movePeriod(1)"
          >
            ›
          </button>
          <h2>{{ displayPeriod }}</h2>
        </div>
        <div class="toolbar-actions">
          <div
            class="view-switcher"
            role="group"
            aria-label="Modo de visualização"
          >
            <button
              :class="{ active: viewMode === 'month' }"
              @click="viewMode = 'month'"
            >
              Mês
            </button>
            <button
              :class="{ active: viewMode === 'week' }"
              @click="viewMode = 'week'"
            >
              Semana
            </button>
          </div>
          <button class="primary-button" type="button" @click="openModal()">
            <span class="plus">+</span>
            Novo agendamento
          </button>
        </div>
      </div>

      <div v-if="viewMode === 'month'" class="month-grid">
        <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
        <button
          v-for="day in calendarDays"
          :key="day.key"
          class="month-day"
          :class="{ outside: day.outside, today: isToday(day.date) }"
          @click="openModal(day.date)"
        >
          <span class="day-number">{{ day.day }}</span>
          <span
            v-for="event in eventForDate(day.key).slice(0, 2)"
            :key="event.time + event.pet"
            class="event-pill"
            :class="event.tone"
          >
            <b>{{ event.time }}</b> {{ event.pet }}
          </span>
          <span v-if="eventForDate(day.key).length > 2" class="more-events"
            >+{{ eventForDate(day.key).length - 2 }} mais</span
          >
        </button>
      </div>

      <div v-else class="week-grid">
        <div class="week-time-column">
          <span>HORÁRIO</span
          ><span v-for="hour in 10" :key="hour">{{
            `${String(hour + 7).padStart(2, "0")}:00`
          }}</span>
        </div>
        <div
          v-for="day in weekDaysWithDates"
          :key="day.key"
          class="week-column"
        >
          <div
            class="week-heading"
            :class="{ 'current-day': isToday(day.date) }"
          >
            <span>{{ day.label }}</span
            ><strong>{{ day.date.getDate() }}</strong>
          </div>
          <div class="week-hours">
            <span v-for="hour in 10" :key="hour" class="hour-line"></span>
            <button
              v-for="event in visibleEvents.filter(
                (item) => item.date === day.key,
              )"
              :key="event.time + event.pet"
              class="week-event"
              :class="event.tone"
              @click.stop="openModal(day.date)"
            >
              <b>{{ event.time }}</b
              ><span>{{ event.pet }} · {{ event.service }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div
    v-if="isModalOpen"
    class="modal-backdrop"
    @click.self="isModalOpen = false"
  >
    <form class="modal" @submit.prevent="createAppointment">
      <button
        class="modal-close"
        type="button"
        aria-label="Fechar"
        @click="isModalOpen = false"
      >
        ×
      </button>
      <p class="eyebrow">Novo compromisso</p>
      <h2>Agendar atendimento</h2>
      <p class="modal-date">Para {{ selectedDate }}</p>
      <label
        >Nome do pet<input
          v-model="newAppointment.pet"
          required
          placeholder="Ex.: Lola"
      /></label>
      <label
        >Tutor<input
          v-model="newAppointment.owner"
          required
          placeholder="Nome do tutor"
      /></label>
      <div class="form-row">
        <label
          >Serviço<select v-model="newAppointment.serviceId">
            <option
              v-for="service in catalogServices"
              :key="service.id"
              :value="service.id"
            >
              {{ service.name }}
            </option>
          </select></label
        ><label
          >Horário<input v-model="newAppointment.time" type="time" required
        /></label>
      </div>
      <p v-if="saveError" class="modal-error" role="alert">{{ saveError }}</p>
      <button
        class="primary-button modal-submit"
        type="submit"
        :disabled="saving || !newAppointment.serviceId"
      >
        {{ saving ? "Salvando..." : "Salvar agendamento" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.calendar-page {
  --ink: #183b3a;
  --muted: #718580;
  --line: #e0e9e1;
  --cream: #fffefa;
  width: min(100% - 48px, 1380px);
  margin: 0 auto;
  padding: 48px 0 64px;
  color: var(--ink);
}
.page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 34px;
}
.eyebrow {
  margin: 0 0 10px;
  color: #88a057;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
h1,
h2,
p {
  margin-top: 0;
}
h1 {
  margin-bottom: 10px;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.07em;
}
.subtitle {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.82rem;
}
.primary-button {
  border: 0;
  border-radius: 10px;
  padding: 6px 20px;
  color: #fff;
  background: #31572c;
  box-shadow: 0 9px 20px #31572c24;
  cursor: pointer;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 800;
  transition:
    transform 0.2s,
    background 0.2s;
}
.load-error,
.modal-error {
  color: #b9533d;
  font-size: 0.74rem;
  font-weight: 700;
}
.finish-button {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 11px;
  color: #31572c;
  background: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.64rem;
  font-weight: 800;
}
.finish-button:hover {
  background: #eef3ed;
}
.done-badge {
  color: #2f7d73;
  font-size: 0.64rem;
  font-weight: 800;
}
.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.primary-button:hover {
  background: #264a24;
  transform: translateY(-2px);
}
.plus {
  margin-right: 8px;
  font-size: 1.2rem;
  vertical-align: -1px;
}
.calendar-card,
.agenda-summary {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--cream);
  box-shadow: 0 12px 35px #1a554a09;
  overflow: hidden;
}
.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 26px;
  border-bottom: 1px solid var(--line);
}
.period-navigation {
  display: flex;
  align-items: center;
  gap: 9px;
}
.period-navigation h2 {
  min-width: 245px;
  margin: 0 12px;
  font-size: 1.12rem;
  text-transform: capitalize;
  letter-spacing: -0.04em;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon-button,
.today-button,
.view-switcher button {
  border: 1px solid var(--line);
  color: var(--ink);
  background: #fff;
  cursor: pointer;
  font: inherit;
}
.icon-button {
  width: 31px;
  height: 31px;
  border-radius: 8px;
  font-size: 1.3rem;
  line-height: 20px;
}
.today-button {
  border-radius: 8px;
  padding: 8px 13px;
  font-size: 0.68rem;
  font-weight: 800;
}
.view-switcher {
  display: flex;
  padding: 3px;
  border-radius: 9px;
  background: #eef3ed;
}
.view-switcher button {
  border: 0;
  border-radius: 7px;
  padding: 9px 18px;
  color: var(--muted);
  background: transparent;
  font-size: 0.68rem;
  font-weight: 800;
}
.view-switcher button.active {
  color: var(--ink);
  background: #fff;
  box-shadow: 0 2px 8px #183b3a12;
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.weekday {
  padding: 15px 12px;
  border-bottom: 1px solid var(--line);
  color: #9aac9e;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.month-day {
  min-height: 112px;
  padding: 11px 9px;
  border: 0;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  text-align: left;
  background: transparent;
  cursor: pointer;
  transition: background 0.18s;
}
.month-day:nth-child(7n) {
  border-right: 0;
}
.month-day:hover {
  background: #f5f8f2;
}
.month-day.outside {
  background: #fafbf8;
}
.day-number {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 25px;
  height: 25px;
  margin-bottom: 6px;
  border-radius: 50%;
  color: var(--ink);
  font-size: 0.72rem;
  font-weight: 700;
}
.outside .day-number {
  color: #b5c1ba;
}
.today .day-number {
  color: #fff;
  background: #31572c;
}
.event-pill {
  display: block;
  overflow: hidden;
  margin: 4px 0;
  padding: 4px 6px;
  border-radius: 4px;
  color: #31572c;
  background: #e5f0df;
  font-size: 0.59rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-pill b {
  margin-right: 3px;
  font-size: 0.54rem;
}
.event-pill.yellow {
  color: #87620e;
  background: #fcf0c9;
}
.event-pill.blue {
  color: #34637a;
  background: #dceef3;
}
.event-pill.purple {
  color: #76507f;
  background: #eee1f1;
}
.more-events {
  color: var(--muted);
  font-size: 0.56rem;
  font-weight: 700;
}
.week-grid {
  display: grid;
  grid-template-columns: 66px repeat(7, 1fr);
  min-width: 850px;
  overflow-x: auto;
}
.week-time-column {
  display: flex;
  flex-direction: column;
  padding-top: 21px;
  border-right: 1px solid var(--line);
  color: #9aac9e;
  font-size: 0.56rem;
  text-align: right;
}
.week-time-column span {
  height: 62px;
  padding-right: 8px;
  box-sizing: border-box;
}
.week-time-column span:first-child {
  height: 37px;
  font-size: 0.5rem;
  font-weight: 800;
}
.week-column {
  border-right: 1px solid var(--line);
}
.week-heading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 58px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.57rem;
}
.week-heading strong {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  color: var(--ink);
  font-size: 0.74rem;
}
.week-heading.current-day strong {
  color: #fff;
  background: #31572c;
}
.week-hours {
  position: relative;
  height: 620px;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 61px,
    var(--line) 62px
  );
}
.week-event {
  position: absolute;
  left: 5px;
  right: 5px;
  top: 124px;
  min-height: 51px;
  padding: 7px;
  border: 0;
  border-left: 3px solid #6d9a59;
  border-radius: 5px;
  color: #31572c;
  background: #e5f0df;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.week-event + .week-event {
  top: 279px;
}
.week-event b,
.week-event span {
  display: block;
  font-size: 0.55rem;
}
.week-event span {
  margin-top: 4px;
  font-weight: 700;
}
.week-event.yellow {
  border-color: #d2a830;
  color: #87620e;
  background: #fcf0c9;
}
.week-event.blue {
  border-color: #5c9db1;
  color: #34637a;
  background: #dceef3;
}
.week-event.purple {
  border-color: #ad7ab8;
  color: #76507f;
  background: #eee1f1;
}
.agenda-summary {
  display: flex;
  gap: 30px;
  padding: 24px 28px;
  margin-bottom: 34px;
}
.summary-title {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 260px;
}
.section-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: #648146;
  background: #e5efe1;
}
.summary-title h2 {
  margin-bottom: 6px;
  font-size: 0.94rem;
}
.summary-title p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.65rem;
}
.appointment-list {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 28px;
}
.appointment-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 0;
  border-bottom: 1px solid #edf1ed;
}
.appointment-date {
  width: 32px;
  text-align: center;
}
.appointment-date strong,
.appointment-date span {
  display: block;
}
.appointment-date strong {
  font-size: 1rem;
}
.appointment-date span {
  color: #9aac9e;
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
}
.appointment-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}
.appointment-info strong {
  font-size: 0.68rem;
}
.appointment-info span,
time {
  color: var(--muted);
  font-size: 0.58rem;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8aae61;
}
.modal-backdrop {
  position: fixed;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #173a35a8;
}
.modal {
  position: relative;
  width: min(100%, 430px);
  box-sizing: border-box;
  padding: 32px;
  border-radius: 18px;
  background: #fffefa;
  box-shadow: 0 20px 60px #183b3a40;
}
.modal h2 {
  margin-bottom: 5px;
  font-size: 1.45rem;
  letter-spacing: -0.05em;
}
.modal-date {
  margin-bottom: 25px;
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: capitalize;
}
.modal-close {
  position: absolute;
  top: 16px;
  right: 19px;
  border: 0;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  font-size: 1.5rem;
}
.modal label {
  display: block;
  margin: 15px 0;
  color: var(--ink);
  font-size: 0.65rem;
  font-weight: 800;
}
.modal input,
.modal select {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-top: 7px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 7px;
  outline: none;
  color: var(--ink);
  background: #fff;
  font: inherit;
  font-size: 0.72rem;
}
.modal input:focus,
.modal select:focus {
  border-color: #88a057;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
.modal-submit {
  width: 100%;
  margin-top: 10px;
}
@media (max-width: 760px) {
  .calendar-page {
    width: min(100% - 28px, 1380px);
    padding-top: 32px;
  }
  .page-heading,
  .calendar-toolbar,
  .agenda-summary {
    align-items: flex-start;
    flex-direction: column;
  }
  .page-heading {
    gap: 20px;
  }
  .toolbar-actions {
    width: 100%;
    align-items: stretch;
  }
  .toolbar-actions .primary-button {
    flex: 1;
  }
  .calendar-toolbar {
    padding: 18px;
  }
  .period-navigation {
    flex-wrap: wrap;
  }
  .period-navigation h2 {
    order: 2;
    width: 100%;
    min-width: 0;
    margin: 8px 0 0;
  }
  .view-switcher {
    align-self: stretch;
  }
  .view-switcher button {
    flex: 1;
  }
  .month-day {
    min-height: 90px;
    padding: 7px 4px;
  }
  .event-pill {
    padding: 3px;
    font-size: 0.48rem;
  }
  .event-pill b {
    display: none;
  }
  .weekday {
    padding: 12px 3px;
    font-size: 0.5rem;
  }
  .appointment-list {
    width: 100%;
    grid-template-columns: 1fr;
  }
  .summary-title {
    min-width: 0;
  }
}
</style>
