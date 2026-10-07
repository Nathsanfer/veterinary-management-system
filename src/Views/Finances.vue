<script setup>
import { computed, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import {
    TODAY,
    addManualTransaction,
    forecastRevenue,
    loadError,
    markAsPaid,
    transactions
} from '../stores/clinic'

const brl = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/* ---------- Período ---------- */
const periods = ['Semana', 'Mês', 'Ano']
const activePeriod = ref('Mês')

const addDays = (iso, days) => {
    const d = new Date(`${iso}T12:00:00`)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
}

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
    { label: 'Receitas', value: brl(totalIncome.value), hint: 'Atendimentos concluídos e avulsos', tone: 'mint', trend: 'up' },
    { label: 'Despesas', value: brl(totalExpense.value), hint: 'Lançamentos avulsos', tone: 'peach', trend: 'down' },
    { label: 'Saldo', value: brl(totalIncome.value - totalExpense.value), hint: 'Receitas − despesas', tone: 'blue', trend: 'up' },
    { label: 'Pendente', value: brl(pendingTotal.value), hint: `${pendingItems.value.length} lançamento(s) em aberto`, tone: 'lemon', trend: 'flat' },
    { label: 'Previsto na agenda', value: brl(forecastRevenue.value), hint: 'Atendimentos ainda agendados', tone: 'aqua', trend: 'flat' }
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

async function saveTransaction() {
    saveError.value = ''
    saving.value = true
    try {
        await addManualTransaction({
            description: form.value.description,
            type: form.value.type,
            category: form.value.category,
            method: form.value.method,
            date: form.value.date,
            amount: Number(form.value.amount)
        })
        isModalOpen.value = false
        form.value = blankForm()
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
    } catch (error) {
        window.alert(error.message ?? 'Não foi possível atualizar o lançamento.')
    }
}
</script>

<template>
    <div class="finances-page">
        <TopBar />

        <main class="finances-content">
            <p v-if="loadError" class="load-error" role="alert">{{ loadError }}</p>
            <header class="finances-heading">
                <div>
                    <p class="eyebrow">CONTROLE FINANCEIRO</p>
                    <h1>Finanças</h1>
                    <p class="heading-description">Acompanhe receitas, despesas e o desempenho financeiro da clínica.</p>
                </div>
                <div class="heading-actions">
                    <div class="period-switcher" role="group" aria-label="Período">
                        <button
                            v-for="period in periods"
                            :key="period"
                            type="button"
                            :class="{ active: activePeriod === period }"
                            @click="activePeriod = period"
                        >
                            {{ period }}
                        </button>
                    </div>
                    <button class="primary-button" type="button" @click="isModalOpen = true">
                        <span class="plus">+</span>Novo lançamento
                    </button>
                </div>
            </header>

            <section class="summary-grid" aria-label="Resumo financeiro">
                <article v-for="card in summaryCards" :key="card.label" class="summary-card">
                    <span class="summary-card__dot" :class="`tone--${card.tone}`" aria-hidden="true"></span>
                    <span class="footer-label">{{ card.label }}</span>
                    <strong class="summary-card__value">{{ card.value }}</strong>
                    <small class="summary-card__hint" :class="`trend--${card.trend}`">{{ card.hint }}</small>
                </article>
            </section>

            <section class="panels">
                <article class="panel chart-panel">
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

                <article class="panel">
                    <div class="panel__header">
                        <div>
                            <h2>Receitas por categoria</h2>
                            <p>Distribuição do período</p>
                        </div>
                    </div>
                    <ul class="category-list">
                        <li v-for="category in categories" :key="category.name">
                            <div class="category-list__row">
                                <span>{{ category.name }}</span>
                                <strong>{{ brl(category.value) }}</strong>
                            </div>
                            <div class="progress"><span :style="{ width: `${category.percent}%` }"></span></div>
                        </li>
                    </ul>
                </article>
            </section>

            <section class="panel transactions-panel">
                <div class="panel__header">
                    <div>
                        <h2>Lançamentos recentes</h2>
                        <p>{{ filteredTransactions.length }} registros</p>
                    </div>
                    <div class="period-switcher" role="group" aria-label="Filtrar lançamentos">
                        <button
                            v-for="item in filters"
                            :key="item.key"
                            type="button"
                            :class="{ active: filter === item.key }"
                            @click="filter = item.key"
                        >
                            {{ item.label }}
                        </button>
                    </div>
                </div>

                <div class="table-scroll">
                    <table class="transactions-table">
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
                        <tbody>
                            <tr v-for="item in filteredTransactions" :key="item.id">
                                <td>{{ formatDate(item.date) }}</td>
                                <td class="description-cell">{{ item.description }}<span v-if="item.source === 'agenda'" class="origin">Agenda</span></td>
                                <td><span class="tag">{{ item.category }}</span></td>
                                <td>{{ item.method }}</td>
                                <td>
                                    <span class="status" :class="`status--${item.status}`">
                                        {{ statusLabels[item.status] }}
                                    </span>
                                    <button
                                        v-if="item.status !== 'paid'"
                                        class="pay-button"
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
                        </tbody>
                    </table>
                </div>
            </section>
        </main>

        <div v-if="isModalOpen" class="modal-backdrop" @click.self="isModalOpen = false">
            <form class="modal" @submit.prevent="saveTransaction">
                <button class="modal-close" type="button" aria-label="Fechar" @click="isModalOpen = false">×</button>
                <p class="eyebrow">Novo registro</p>
                <h2>Adicionar lançamento</h2>

                <div class="type-toggle" role="group" aria-label="Tipo de lançamento">
                    <button type="button" :class="{ active: form.type === 'income' }" @click="form.type = 'income'">Receita</button>
                    <button type="button" :class="{ active: form.type === 'expense' }" @click="form.type = 'expense'">Despesa</button>
                </div>

                <label>
                    Descrição
                    <input v-model="form.description" required placeholder="Ex.: Consulta clínica — Thor" />
                </label>
                <div class="form-row">
                    <label>
                        Valor (R$)
                        <input v-model="form.amount" type="number" min="0" step="0.01" required placeholder="0,00" />
                    </label>
                    <label>
                        Data
                        <input v-model="form.date" type="date" required />
                    </label>
                </div>
                <div class="form-row">
                    <label>
                        Categoria
                        <select v-model="form.category">
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
                    <label>
                        Pagamento
                        <select v-model="form.method">
                            <option>Pix</option>
                            <option>Cartão</option>
                            <option>Dinheiro</option>
                            <option>Boleto</option>
                            <option>Transferência</option>
                        </select>
                    </label>
                </div>
                <p v-if="saveError" class="modal-error" role="alert">{{ saveError }}</p>
                <button class="primary-button modal-submit" type="submit" :disabled="saving">
                    {{ saving ? 'Salvando...' : 'Salvar lançamento' }}
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.finances-page {
    --ink: #183b3a;
    --muted: #728682;
    --line: #e0e9e1;
    --cream: #fffefa;
    min-height: 100vh;
    color: var(--ink);
    background: #f3f5f1;
}

.finances-content {
    width: min(100% - 48px, 1220px);
    margin: 0 auto;
    padding: 32px 0 48px;
}

.finances-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 32px;
    margin-bottom: 34px;
}

.eyebrow {
    margin: 0 0 10px;
    color: #789575;
    font-size: 0.55rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
}

.finances-heading h1 {
    margin: 0;
    color: #1d1f1fd0;
    font-size: clamp(1.9rem, 3vw, 2rem);
    font-weight: 800;
    line-height: 1;
}

.heading-description {
    max-width: 550px;
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.6;
}

.heading-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.primary-button {
    border: 0;
    border-radius: 10px;
    padding: 10px 20px;
    color: #fff;
    background: #31572c;
    box-shadow: 0 9px 20px #31572c24;
    cursor: pointer;
    font: inherit;
    font-size: 0.74rem;
    font-weight: 800;
    white-space: nowrap;
    transition: transform 0.2s, background 0.2s;
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

.period-switcher,
.type-toggle {
    display: flex;
    padding: 3px;
    border-radius: 9px;
    background: #eef3ed;
}

.period-switcher button,
.type-toggle button {
    border: 0;
    border-radius: 7px;
    padding: 9px 18px;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 0.68rem;
    font-weight: 800;
    transition: background 0.2s, color 0.2s;
}

.period-switcher button.active,
.type-toggle button.active {
    color: var(--ink);
    background: #fff;
    box-shadow: 0 2px 6px rgba(24, 59, 58, 0.1);
}

/* Summary cards */
.summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 20px;
    margin-bottom: 28px;
}

.summary-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 22px 24px;
    border: 1px solid rgba(24, 59, 58, 0.07);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 14px 30px rgba(24, 59, 58, 0.07);
    transition: transform 180ms ease, box-shadow 180ms ease;
}

.summary-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 34px rgba(24, 59, 58, 0.11);
}

.summary-card__dot {
    position: absolute;
    top: 22px;
    right: 22px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.tone--mint { background: #2f7d73; }
.tone--peach { background: #b9785d; }
.tone--blue { background: #5c8193; }
.tone--lemon { background: #789b5a; }
.tone--aqua { background: #3f8f8a; }
.origin {
    margin-left: 8px;
    padding: 2px 7px;
    border-radius: 20px;
    color: #3f8f8a;
    background: #e3f1ef;
    font-size: 0.58rem;
    font-weight: 800;
}

.footer-label {
    color: #7e908c;
    font-size: 0.62rem;
    font-weight: 600;
}

.summary-card__value {
    color: #252929d0;
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
}

.summary-card__hint {
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--muted);
}

.trend--up { color: #2f7d73; }
.trend--down { color: #b9785d; }

/* Panels */
.panels {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
    gap: 28px;
    margin-bottom: 28px;
}

.panel {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--cream);
    box-shadow: 0 12px 35px #1a554a09;
    padding: 24px 26px;
}

.panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 22px;
}

.panel__header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: #252929d0;
}

.panel__header p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 0.7rem;
}

.legend {
    display: flex;
    gap: 16px;
    color: var(--muted);
    font-size: 0.65rem;
    font-weight: 700;
}

.legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.legend__dot {
    width: 9px;
    height: 9px;
    border-radius: 3px;
}

.legend__dot--income, .bar--income { background: #2f7d73; }
.legend__dot--expense, .bar--expense { background: #b9785d; }

/* Chart */
.chart {
    height: 220px;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 14px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line);
    background-image: linear-gradient(to bottom, var(--line) 1px, transparent 1px);
    background-size: 100% 25%;
}

.chart__group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.chart__bars {
    width: 100%;
    flex: 1;
    display: flex;
    align-items: end;
    justify-content: center;
    gap: 6px;
}

.bar {
    width: 22px;
    max-width: 38%;
    border-radius: 5px 5px 0 0;
    transition: opacity 0.2s;
}

.bar:hover { opacity: 0.75; }

.chart__label {
    margin-bottom: -26px;
    color: var(--muted);
    font-size: 0.65rem;
    font-weight: 700;
}

.chart-panel .chart { margin-bottom: 30px; }

/* Category list */
.category-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.category-list__row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.74rem;
    color: #6c7d7a;
    font-weight: 600;
}

.category-list__row strong {
    color: #31572cbc;
    font-weight: 800;
}

.progress {
    height: 7px;
    border-radius: 7px;
    background: #edf1ec;
    overflow: hidden;
}

.progress span {
    display: block;
    height: 100%;
    border-radius: 7px;
    background: linear-gradient(90deg, #3f8f8a, #99b55f);
}

/* Table */
.table-scroll { overflow-x: auto; }

.transactions-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.74rem;
}

.transactions-table th {
    padding: 0 12px 12px;
    border-bottom: 1px solid var(--line);
    color: #7e908c;
    font-size: 0.62rem;
    font-weight: 700;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.transactions-table td {
    padding: 15px 12px;
    border-bottom: 1px solid #edf1ec;
    color: #6c7d7a;
    white-space: nowrap;
}

.transactions-table tbody tr { transition: background 0.2s; }
.transactions-table tbody tr:hover { background: #f7f9f5; }
.transactions-table tbody tr:last-child td { border-bottom: 0; }

.description-cell { color: #252929d0 !important; font-weight: 700; }
.align-right { text-align: right !important; }

.tag {
    padding: 4px 10px;
    border-radius: 20px;
    background: #eef3ed;
    color: #31572c;
    font-size: 0.64rem;
    font-weight: 700;
}

.status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.66rem;
    font-weight: 800;
}

.status::before {
    width: 7px;
    height: 7px;
    content: '';
    border-radius: 50%;
    background: currentColor;
}

.status--paid { color: #2f7d73; }
.status--pending { color: #b9785d; }
.status--overdue { color: #b9533d; }

.pay-button {
    margin-left: 10px;
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 4px 9px;
    color: #31572c;
    background: #fff;
    cursor: pointer;
    font: inherit;
    font-size: 0.6rem;
    font-weight: 800;
}

.pay-button:hover { background: #eef3ed; }

.load-error,
.modal-error {
    color: #b9533d;
    font-size: 0.74rem;
    font-weight: 700;
}

.primary-button:disabled { opacity: 0.6; cursor: not-allowed; }

.amount { font-weight: 800; }
.amount--income { color: #2f7d73 !important; }
.amount--expense { color: #b9785d !important; }

/* Modal */
.modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(24, 59, 58, 0.35);
    backdrop-filter: blur(3px);
}

.modal {
    position: relative;
    width: min(100%, 440px);
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 30px;
    border-radius: 16px;
    background: var(--cream);
    box-shadow: 0 24px 60px rgba(24, 59, 58, 0.25);
}

.modal h2 { margin: 0 0 4px; font-size: 1.3rem; }

.modal-close {
    position: absolute;
    top: 14px;
    right: 16px;
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 1.6rem;
}

.modal label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 700;
}

.modal input,
.modal select {
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 11px 12px;
    color: var(--ink);
    background: #fff;
    font: inherit;
    font-size: 0.78rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.modal input:focus,
.modal select:focus {
    border-color: #99b55f;
    box-shadow: 0 0 0 3px rgba(153, 181, 95, 0.2);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.type-toggle button { flex: 1; }
.modal-submit { margin-top: 6px; padding: 13px; }

@media (max-width: 1000px) {
    .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .panels { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
    .finances-content { width: min(100% - 32px, 1220px); padding-top: 36px; }

    .finances-heading,
    .heading-actions {
        align-items: flex-start;
        flex-direction: column;
        gap: 14px;
    }

    .finances-heading { margin-bottom: 27px; }
}

@media (max-width: 480px) {
    .summary-grid { grid-template-columns: 1fr; }
    .form-row { grid-template-columns: 1fr; }
    .panel { padding: 20px 18px; }
}
</style>