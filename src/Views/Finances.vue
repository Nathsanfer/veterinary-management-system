<script setup>
import { computed, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import { addDays } from '../components/dashboard/dashboardUtils'
import {
    TODAY,
    addManualTransaction,
    forecastRevenue,
    loadError,
    markAsPaid,
    transactions
} from '../stores/clinic'
import { notify } from '../stores/toast'

const brl = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/* ---------- Período ---------- */
const periods = ['Semana', 'Mês', 'Ano']
const activePeriod = ref('Mês')

// Intervalo [start, end] do período ativo, tomando TODAY como referência
const range = computed(() => {
    if (activePeriod.value === 'Semana') return { start: addDays(TODAY, -6), end: TODAY }
    if (activePeriod.value === 'Ano') return { start: `${TODAY.slice(0, 4)}-01-01`, end: TODAY }
    return { start: `${TODAY.slice(0, 7)}-01`, end: TODAY }
})

const periodTransactions = computed(() =>
    transactions.value.filter((t) => t.date >= range.value.start && t.date <= range.value.end)
)

/* ---------- Fluxo de caixa (últimos 6 meses) ---------- */
const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const monthly = computed(() => {
    const [year, month] = TODAY.split('-').map(Number)
    return Array.from({ length: 6 }, (_, i) => {
        const date = new Date(year, month - 1 - (5 - i), 1)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const items = transactions.value.filter((t) => t.date.startsWith(key))
        const sum = (type) => items.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)
        return { label: monthLabels[date.getMonth()], income: sum('income'), expense: sum('expense') }
    })
})

const chartMax = computed(() => Math.max(1, ...monthly.value.flatMap((m) => [m.income, m.expense])))
const barHeight = (value) => `${Math.round((value / chartMax.value) * 100)}%`

/* ---------- Lançamentos ---------- */
const filter = ref('all')
const filters = [
    { key: 'all', label: 'Todas' },
    { key: 'income', label: 'Receitas' },
    { key: 'expense', label: 'Despesas' }
]

const filteredTransactions = computed(() =>
    periodTransactions.value.filter((t) => filter.value === 'all' || t.type === filter.value)
)

const sumBy = (predicate) =>
    periodTransactions.value.filter(predicate).reduce((sum, t) => sum + t.amount, 0)

const totalIncome = computed(() => sumBy((t) => t.type === 'income'))
const totalExpense = computed(() => sumBy((t) => t.type === 'expense'))
const pendingItems = computed(() => periodTransactions.value.filter((t) => t.status !== 'paid'))
const pendingTotal = computed(() => pendingItems.value.reduce((sum, t) => sum + t.amount, 0))

const summaryCards = computed(() => [
    { label: 'Receitas', value: brl(totalIncome.value), hint: 'Atendimentos concluídos e avulsos', tone: 'green', icon: '↗' },
    { label: 'Despesas', value: brl(totalExpense.value), hint: 'Lançamentos avulsos', tone: 'peach', icon: '↘' },
    { label: 'Saldo', value: brl(totalIncome.value - totalExpense.value), hint: 'Receitas − despesas', tone: 'blue', icon: '＝' },
    { label: 'Pendente', value: brl(pendingTotal.value), hint: `${pendingItems.value.length} lançamento(s) em aberto`, tone: 'yellow', icon: '!' },
    { label: 'Previsto na agenda', value: brl(forecastRevenue.value), hint: 'Atendimentos ainda agendados', tone: 'aqua', icon: '◷' }
])

const categories = computed(() => {
    const grouped = periodTransactions.value
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount
            return acc
        }, {})
    const total = totalIncome.value || 1
    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value, percent: Math.round((value / total) * 100) }))
        .sort((a, b) => b.value - a.value)
})

const formatDate = (iso) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

/* ---------- Modal ---------- */
const isModalOpen = ref(false)
const blankForm = () => ({
    description: '',
    type: 'expense',
    category: 'Insumos',
    method: 'Pix',
    amount: '',
    date: TODAY
})
const form = ref(blankForm())

const saving = ref(false)
const saveError = ref('')

/* Máscara de moeda: os dígitos entram pelos centavos (estilo maquininha).
   Ex.: digitar 1, 2, 5, 0 -> 0,01 -> 0,12 -> 1,25 -> 12,50 */
const MAX_CENTS = 99999999 // R$ 999.999,99
const amountCents = computed(() => Number(String(form.value.amount).replace(/\D/g, '')) || 0)
const formatCents = (cents) =>
    (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function onAmountInput(event) {
    const digits = event.target.value.replace(/\D/g, '').replace(/^0+/, '')
    const cents = Math.min(Number(digits) || 0, MAX_CENTS)
    form.value.amount = cents ? formatCents(cents) : ''
    event.target.value = form.value.amount
}

function onAmountKeydown(event) {
    // Permite apenas dígitos e teclas de controle/navegação
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']
    if (event.ctrlKey || event.metaKey || allowed.includes(event.key)) return
    if (!/^\d$/.test(event.key)) event.preventDefault()
}

function openModal() {
    saveError.value = ''
    isModalOpen.value = true
}

async function saveTransaction() {
    saveError.value = ''
    if (amountCents.value <= 0) {
        saveError.value = 'Informe um valor maior que zero.'
        return
    }
    saving.value = true
    try {
        await addManualTransaction({
            description: form.value.description,
            type: form.value.type,
            category: form.value.category,
            method: form.value.method,
            date: form.value.date,
            amount: amountCents.value / 100
        })
        isModalOpen.value = false
        form.value = blankForm()
        notify('Lançamento registrado.')
    } catch (error) {
        saveError.value = error.message ?? 'Não foi possível salvar o lançamento.'
    } finally {
        saving.value = false
    }
}

const statusLabels = { paid: 'Pago', pending: 'Pendente', overdue: 'Atrasado' }

async function payTransaction(item) {
    try {
        await markAsPaid(item.id, item.method !== '—' ? item.method : 'Pix')
        notify('Lançamento marcado como pago.')
    } catch (error) {
        notify(error.message ?? 'Não foi possível atualizar o lançamento.', 'error')
    }
}
</script>

<template>
    <TopBar />

    <main class="page finances-page">
        <header class="page-header">
            <div>
                <p class="eyebrow">Controle financeiro</p>
                <h1 class="page-title">Finanças</h1>
                <p class="page-subtitle">Acompanhe receitas, despesas e o desempenho financeiro da clínica.</p>
            </div>
            <div class="header-actions">
                <div class="segmented" role="group" aria-label="Período">
                    <button
                        v-for="period in periods"
                        :key="period"
                        type="button"
                        :class="{ 'is-active': activePeriod === period }"
                        :aria-pressed="activePeriod === period"
                        @click="activePeriod = period"
                    >
                        {{ period }}
                    </button>
                </div>
                <button class="btn btn--primary" type="button" @click="openModal">
                    <span aria-hidden="true">+</span> Novo lançamento
                </button>
            </div>
        </header>

        <p v-if="loadError" class="text-error" role="alert">{{ loadError }}</p>

        <section class="summary-grid stagger" aria-label="Resumo financeiro">
            <article
                v-for="(card, index) in summaryCards"
                :key="card.label"
                class="card summary-card"
                :class="`summary-card--${card.tone}`"
                :style="{ '--i': index }"
            >
                <div class="summary-card__top">
                    <span class="summary-card__icon" aria-hidden="true">{{ card.icon }}</span>
                    <span class="summary-card__label">{{ card.label }}</span>
                </div>
                <strong class="summary-card__value">{{ card.value }}</strong>
                <small class="summary-card__hint">{{ card.hint }}</small>
            </article>
        </section>

        <section class="panels">
            <article class="card panel chart-panel">
                <div class="panel__header">
                    <div>
                        <h2>Fluxo de caixa</h2>
                        <p>Últimos 6 meses</p>
                    </div>
                    <div class="legend">
                        <span><i class="legend__dot legend__dot--income"></i>Receitas</span>
                        <span><i class="legend__dot legend__dot--expense"></i>Despesas</span>
                    </div>
                </div>
                <div class="chart" role="img" aria-label="Gráfico de receitas e despesas por mês">
                    <div v-for="month in monthly" :key="month.label" class="chart__group">
                        <div class="chart__bars">
                            <span class="bar bar--income" :style="{ height: barHeight(month.income) }" :title="brl(month.income)"></span>
                            <span class="bar bar--expense" :style="{ height: barHeight(month.expense) }" :title="brl(month.expense)"></span>
                        </div>
                        <span class="chart__label">{{ month.label }}</span>
                    </div>
                </div>
            </article>

            <article class="card panel">
                <div class="panel__header">
                    <div>
                        <h2>Receitas por categoria</h2>
                        <p>Distribuição do período</p>
                    </div>
                </div>
                <div v-if="!categories.length" class="empty-state empty-state--compact">
                    <span class="empty-state__icon" aria-hidden="true">◌</span>
                    <strong>Sem receitas no período</strong>
                </div>
                <ul v-else class="category-list">
                    <li v-for="(category, index) in categories" :key="category.name" :style="{ '--i': index }">
                        <div class="category-list__row">
                            <span>{{ category.name }}</span>
                            <strong>{{ brl(category.value) }}</strong>
                        </div>
                        <div class="progress"><span :style="{ width: `${category.percent}%` }"></span></div>
                    </li>
                </ul>
            </article>
        </section>

        <section class="card panel">
            <div class="panel__header">
                <div>
                    <h2>Lançamentos recentes</h2>
                    <p>{{ filteredTransactions.length }} {{ filteredTransactions.length === 1 ? 'registro' : 'registros' }}</p>
                </div>
                <div class="segmented" role="group" aria-label="Filtrar lançamentos">
                    <button
                        v-for="item in filters"
                        :key="item.key"
                        type="button"
                        :class="{ 'is-active': filter === item.key }"
                        :aria-pressed="filter === item.key"
                        @click="filter = item.key"
                    >
                        {{ item.label }}
                    </button>
                </div>
            </div>

            <div v-if="!filteredTransactions.length" class="empty-state">
                <span class="empty-state__icon" aria-hidden="true">✳</span>
                <strong>Nenhum lançamento neste período</strong>
                <span>Registre uma receita ou despesa avulsa para vê-la aqui.</span>
            </div>

            <div v-else class="table-wrap">
                <table class="table transactions-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Pagamento</th>
                            <th>Status</th>
                            <th class="align-right">Valor</th>
                        </tr>
                    </thead>
                    <TransitionGroup name="list" tag="tbody">
                        <tr v-for="item in filteredTransactions" :key="item.id">
                            <td class="muted-cell">{{ formatDate(item.date) }}</td>
                            <td>
                                <span class="description">{{ item.description }}</span>
                                <span v-if="item.source === 'agenda'" class="origin">Agenda</span>
                            </td>
                            <td><span class="badge badge--neutral">{{ item.category }}</span></td>
                            <td class="muted-cell">{{ item.method }}</td>
                            <td>
                                <span class="badge" :class="`badge--${item.status === 'paid' ? 'success' : item.status === 'overdue' ? 'danger' : 'warn'}`">
                                    {{ statusLabels[item.status] }}
                                </span>
                                <button
                                    v-if="item.status !== 'paid'"
                                    class="btn btn--ghost btn--sm pay-button"
                                    type="button"
                                    @click="payTransaction(item)"
                                >
                                    Marcar pago
                                </button>
                            </td>
                            <td class="align-right amount" :class="`amount--${item.type}`">
                                {{ item.type === 'income' ? '+' : '−' }} {{ brl(item.amount) }}
                            </td>
                        </tr>
                    </TransitionGroup>
                </table>
            </div>
        </section>
    </main>

    <Transition name="overlay">
        <div v-if="isModalOpen" class="overlay" @click.self="isModalOpen = false">
            <form class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="entry-title" @submit.prevent="saveTransaction">
                <button class="modal-close" type="button" aria-label="Fechar" @click="isModalOpen = false">×</button>
                <p class="eyebrow">Novo registro</p>
                <h2 id="entry-title" class="modal-title">Adicionar lançamento</h2>

                <div class="type-toggle" role="group" aria-label="Tipo de lançamento">
                    <button type="button" :class="{ 'is-income': form.type === 'income', 'is-expense': form.type === 'expense' }" :aria-pressed="form.type === 'income'" @click="form.type = 'income'">
                        <span class="type-toggle__dot type-toggle__dot--income"></span>Receita
                    </button>
                    <button type="button" :class="{ 'is-income': form.type === 'income', 'is-expense': form.type === 'expense' }" :aria-pressed="form.type === 'expense'" @click="form.type = 'expense'">
                        <span class="type-toggle__dot type-toggle__dot--expense"></span>Despesa
                    </button>
                </div>

                <div class="form-stack">
                    <label class="field">
                        Descrição
                        <input v-model="form.description" class="input" required placeholder="Ex.: Consulta clínica — Thor" />
                    </label>

                    <div class="form-row">
                        <label class="field">
                            Valor (R$)
                            <input
                                :value="form.amount"
                                class="input amount-input"
                                type="text"
                                inputmode="numeric"
                                maxlength="10"
                                autocomplete="off"
                                required
                                placeholder="0,00"
                                @keydown="onAmountKeydown"
                                @input="onAmountInput"
                            />
                        </label>
                        <label class="field">
                            Data
                            <input v-model="form.date" class="input" type="date" required />
                        </label>
                    </div>

                    <div class="form-row">
                        <label class="field">
                            Categoria
                            <select v-model="form.category" class="input">
                                <option>Consultas</option>
                                <option>Vacinação</option>
                                <option>Banho e tosa</option>
                                <option>Cirurgias</option>
                                <option>Exames</option>
                                <option>Hospedagem</option>
                                <option>Insumos</option>
                                <option>Despesas fixas</option>
                            </select>
                        </label>
                        <label class="field">
                            Pagamento
                            <select v-model="form.method" class="input">
                                <option>Pix</option>
                                <option>Cartão</option>
                                <option>Dinheiro</option>
                                <option>Boleto</option>
                                <option>Transferência</option>
                            </select>
                        </label>
                    </div>
                </div>

                <p v-if="saveError" class="text-error save-error" role="alert">{{ saveError }}</p>

                <button class="btn btn--primary btn--block submit" type="submit" :disabled="saving">
                    <span v-if="saving" class="spinner" aria-hidden="true"></span>
                    {{ saving ? 'Salvando...' : 'Salvar lançamento' }}
                </button>
            </form>
        </div>
    </Transition>
</template>

<style scoped>
.finances-page {
    display: flex;
    flex-direction: column;
    gap: 22px;
}

.finances-page > * {
    animation: rise 0.55s var(--ease) backwards;
}

.finances-page > :nth-child(2) { animation-delay: 60ms; }
.finances-page > :nth-child(3) { animation-delay: 120ms; }
.finances-page > :nth-child(4) { animation-delay: 180ms; }

.page-header {
    margin-bottom: 0;
}

.header-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}

.card {
    transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), background-color 0.35s, border-color 0.35s;
}

/* Resumo */

.summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
}

.summary-card {
    position: relative;
    overflow: hidden;
    padding: 18px 18px 16px;
}

.summary-card::before {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 3px;
    background: var(--tone-bar);
    content: '';
}

.summary-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
}

.summary-card--green { --tone-bar: var(--tone-green-bar); --tone-bg: var(--tone-green-bg); --tone-ink: var(--tone-green-ink); }
.summary-card--peach { --tone-bar: #d5a078; --tone-bg: rgba(213, 160, 120, 0.18); --tone-ink: #9a6a44; }
.summary-card--blue { --tone-bar: var(--tone-blue-bar); --tone-bg: var(--tone-blue-bg); --tone-ink: var(--tone-blue-ink); }
.summary-card--yellow { --tone-bar: var(--tone-yellow-bar); --tone-bg: var(--tone-yellow-bg); --tone-ink: var(--tone-yellow-ink); }
.summary-card--aqua { --tone-bar: #6ab3a3; --tone-bg: rgba(106, 179, 163, 0.16); --tone-ink: #2f7a66; }

.summary-card__top {
    display: flex;
    align-items: center;
    gap: 10px;
}

.summary-card__icon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    color: var(--tone-ink);
    background: var(--tone-bg);
    font-size: 0.9rem;
    font-weight: 700;
}

.summary-card__label {
    color: var(--muted);
    font-size: 0.66rem;
    font-weight: 700;
}

.summary-card__value {
    display: block;
    margin-top: 16px;
    color: var(--ink);
    font-size: clamp(1.05rem, 1.6vw, 1.35rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
}

.summary-card__hint {
    display: block;
    margin-top: 6px;
    color: var(--muted);
    font-size: 0.6rem;
    font-weight: 500;
}

/* Painéis */

.panels {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr);
    gap: 18px;
}

.panel {
    padding: 24px 26px;
}

.panel__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px 16px;
    margin-bottom: 20px;
}

.panel h2 {
    color: var(--ink);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.03em;
}

.panel__header p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 0.68rem;
}

.legend {
    display: flex;
    gap: 16px;
    color: var(--muted);
    font-size: 0.66rem;
    font-weight: 600;
}

.legend span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}

.legend__dot {
    width: 9px;
    height: 9px;
    border-radius: 3px;
}

.legend__dot--income { background: var(--tone-green-bar); }
.legend__dot--expense { background: #d5a078; }

/* Gráfico */

.chart {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    height: 240px;
    padding: 0 6px;
    border-bottom: 1px dashed var(--line);
}

.chart__group {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
}

.chart__bars {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: clamp(4px, 1vw, 9px);
    width: 100%;
    height: 200px;
}

.bar {
    width: min(26px, 36%);
    min-height: 4px;
    border-radius: 7px 7px 3px 3px;
    transition: height 0.9s var(--ease), filter 0.2s;
}

.bar:hover {
    filter: brightness(1.12);
}

.bar--income { background: linear-gradient(180deg, var(--tone-green-bar), var(--accent)); }
.bar--expense { background: linear-gradient(180deg, #e5b58d, #c98d66); }

.chart__label {
    margin-top: 10px;
    color: var(--muted);
    font-size: 0.64rem;
    font-weight: 600;
}

/* Categorias */

.category-list {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.category-list li {
    animation: rise 0.5s var(--ease) both;
    animation-delay: calc(var(--i, 0) * 80ms);
}

.category-list__row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 9px;
    color: var(--ink-2);
    font-size: 0.72rem;
}

.category-list__row strong {
    color: var(--ink);
    font-variant-numeric: tabular-nums;
}

.progress {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--surface-3);
}

.progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--tone-green-bar), var(--accent));
    transition: width 1s var(--ease);
}

.empty-state--compact {
    min-height: 140px;
}

/* Tabela */

.transactions-table td {
    font-size: 0.72rem;
}

.muted-cell {
    color: var(--muted);
    white-space: nowrap;
}

.description {
    display: inline-block;
    margin-right: 8px;
    color: var(--ink);
    font-weight: 600;
}

.origin {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 6px;
    color: var(--accent-soft-ink);
    background: var(--accent-soft);
    font-size: 0.56rem;
    font-weight: 700;
}

.amount {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.amount--income {
    color: var(--success);
}

.amount--expense {
    color: var(--danger);
}

.pay-button {
    margin-left: 8px;
    color: var(--accent-soft-ink);
}

/* Modal */

.modal-title {
    margin: 0 0 22px;
    padding-right: 28px;
    color: var(--ink);
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: -0.05em;
}

.type-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 4px;
    margin-bottom: 20px;
    border-radius: 12px;
    background: var(--surface-3);
}

.type-toggle button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    border: 0;
    border-radius: 9px;
    color: var(--muted);
    background: transparent;
    font-size: 0.74rem;
    font-weight: 700;
    transition: background-color 0.25s, color 0.25s, box-shadow 0.25s;
}

.type-toggle button.is-income,
.type-toggle button.is-expense {
    color: var(--ink);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
}

.type-toggle__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.type-toggle__dot--income { background: var(--tone-green-bar); }
.type-toggle__dot--expense { background: #d5a078; }

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

.amount-input {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
}

.save-error {
    margin: 14px 0 0;
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

@media (max-width: 1200px) {
    .summary-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 1000px) {
    .panels {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 680px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .summary-card {
        padding: 14px 13px;
    }

    .summary-card__top {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .panel {
        padding: 20px 17px;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .header-actions {
        width: 100%;
    }

    .header-actions .segmented {
        flex: 1;
    }

    .header-actions .segmented button {
        flex: 1;
    }

    .header-actions .btn {
        flex: 1;
    }
}
</style>
