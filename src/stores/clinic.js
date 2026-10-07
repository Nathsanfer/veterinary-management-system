import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

/**
 * Camada de dados ligada ao Supabase.
 *
 * As telas continuam usando os mesmos nomes de antes (services, calendarEvents,
 * transactions...), mas agora os dados vêm do banco:
 *
 *   servicos                 -> services
 *   atendimentos (+ joins)   -> appointments / calendarEvents
 *   vw_lancamentos           -> transactions
 *
 * A receita de um atendimento é gerada no banco (trigger) quando o status
 * vira "Concluído": o front só atualiza o status e recarrega.
 */

const pad = (n) => String(n).padStart(2, '0')
const toLocalDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Data de hoje (yyyy-mm-dd) no fuso local. */
export const TODAY = toLocalDate(new Date())

export const loading = ref(false)
export const loadError = ref('')

/* ----------------------------- Serviços ----------------------------- */

// Cor do serviço (cards) -> cor do evento na Agenda
const calendarToneByColor = {
    mint: 'green',
    aqua: 'blue',
    lemon: 'yellow',
    peach: 'purple',
    lilac: 'purple',
    blue: 'blue'
}

export const services = ref([])

const mapService = (row) => ({
    id: row.id,
    name: row.nome,
    description: row.descricao ?? '',
    price: Number(row.valor_base),
    unit: row.unidade ?? '',
    icon: row.icone ?? 'paw',
    tone: row.cor ?? 'mint',
    calendarTone: calendarToneByColor[row.cor] ?? 'green',
    active: row.ativo,
    public: row.visivel_catalogo
})

export const catalogServices = computed(() => services.value.filter((s) => s.public && s.active))

export const getService = (id) => services.value.find((s) => s.id === id)

/* ---------------------------- Agendamentos --------------------------- */

const appointments = ref([])

// Status do banco -> status usado pelas telas
const statusMap = {
    Agendado: 'scheduled',
    'Em andamento': 'scheduled',
    'Concluído': 'completed',
    Cancelado: 'cancelled'
}

function mapAppointment(row) {
    const start = new Date(row.data_entrada)
    const items = row.servicos_realizados ?? []
    const names = [...new Set(items.map((i) => i.servicos?.nome).filter(Boolean))]
    return {
        id: row.id,
        date: toLocalDate(start),
        time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        pet: row.pacientes?.nome ?? '—',
        owner: row.pacientes?.tutores?.nome ?? '—',
        service: names.join(', ') || 'Sem serviço',
        serviceId: items[0]?.servico_id ?? null,
        price: items.reduce((sum, i) => sum + Number(i.valor_total ?? 0), 0),
        status: statusMap[row.status] ?? 'scheduled',
        tone: calendarToneByColor[items[0]?.servicos?.cor] ?? 'green'
    }
}

/** Agendamentos no formato que a Agenda desenha (cancelados ficam de fora). */
export const calendarEvents = computed(() =>
    appointments.value
        .filter((a) => a.status !== 'cancelled')
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
)

/** Receita prevista: atendimentos ainda agendados. */
export const forecastRevenue = computed(() =>
    calendarEvents.value
        .filter((a) => a.status === 'scheduled')
        .reduce((sum, a) => sum + a.price, 0)
)

/* ----------------------------- Finanças ------------------------------ */

export const transactions = ref([])

const lancamentoStatus = { Pago: 'paid', Pendente: 'pending', Atrasado: 'overdue' }

const mapTransaction = (row) => ({
    id: row.id,
    date: row.data_referencia,
    description: row.descricao ?? row.categoria ?? 'Lançamento',
    category: row.categoria ?? 'Outros',
    type: row.tipo === 'Receita' ? 'income' : 'expense',
    method: row.forma_pagamento ?? '—',
    status: lancamentoStatus[row.status] ?? 'pending',
    amount: Number(row.valor),
    source: row.origem === 'Agenda' ? 'agenda' : 'manual'
})

/* ------------------------------ Carga -------------------------------- */

async function fetchServices() {
    const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .order('nome')
    if (error) throw error
    services.value = data.map(mapService)
}

async function fetchAppointments() {
    const { data, error } = await supabase
        .from('atendimentos')
        .select(`
            id, data_entrada, status,
            pacientes ( nome, tutores ( nome ) ),
            servicos_realizados ( servico_id, valor_total, servicos ( nome, cor ) )
        `)
        .order('data_entrada')
    if (error) throw error
    appointments.value = data.map(mapAppointment)
}

async function fetchTransactions() {
    const { data, error } = await supabase
        .from('vw_lancamentos')
        .select('*')
        .order('data_referencia', { ascending: false })
    if (error) throw error
    transactions.value = data.map(mapTransaction)
}

/** Carrega (ou recarrega) tudo. Chame após login e após qualquer escrita. */
export async function loadAll() {
    loading.value = true
    loadError.value = ''
    try {
        await Promise.all([fetchServices(), fetchAppointments(), fetchTransactions()])
    } catch (error) {
        loadError.value = error.message ?? 'Não foi possível carregar os dados.'
        console.error(error)
    } finally {
        loading.value = false
    }
}

export function clearData() {
    services.value = []
    appointments.value = []
    transactions.value = []
}

/* ------------------------------ Escritas ------------------------------ */

const check = ({ error }) => {
    if (error) throw error
}

/** Encontra um registro pelo nome (sem diferenciar maiúsculas) ou cria um novo. */
async function findOrCreateTutor(nome) {
    const found = await supabase.from('tutores').select('id').ilike('nome', nome).limit(1).maybeSingle()
    check(found)
    if (found.data) return found.data.id
    const created = await supabase.from('tutores').insert({ nome }).select('id').single()
    check(created)
    return created.data.id
}

async function findOrCreatePatient(nome, tutorId) {
    const found = await supabase
        .from('pacientes')
        .select('id')
        .eq('tutor_id', tutorId)
        .ilike('nome', nome)
        .limit(1)
        .maybeSingle()
    check(found)
    if (found.data) return found.data.id
    const created = await supabase
        .from('pacientes')
        .insert({ nome, tutor_id: tutorId })
        .select('id')
        .single()
    check(created)
    return created.data.id
}

/**
 * Cria o atendimento (status "Agendado") e o serviço previsto.
 * O preço é copiado do serviço para valor_unitario, preservando o histórico.
 */
export async function addAppointment({ date, time, pet, owner, serviceId }) {
    const service = getService(serviceId)
    if (!service) throw new Error('Serviço não encontrado.')

    const tutorId = await findOrCreateTutor(owner.trim())
    const patientId = await findOrCreatePatient(pet.trim(), tutorId)

    const visit = await supabase
        .from('atendimentos')
        .insert({
            paciente_id: patientId,
            data_entrada: new Date(`${date}T${time}:00`).toISOString(),
            status: 'Agendado',
            motivo_visita: service.name
        })
        .select('id')
        .single()
    check(visit)

    check(
        await supabase.from('servicos_realizados').insert({
            atendimento_id: visit.data.id,
            servico_id: service.id,
            quantidade: 1,
            valor_unitario: service.price
        })
    )

    await loadAll()
}

/** Conclui o atendimento: o gatilho do banco gera a receita pendente. */
export async function completeAppointment(id) {
    check(
        await supabase
            .from('atendimentos')
            .update({ status: 'Concluído', data_saida: new Date().toISOString() })
            .eq('id', id)
    )
    await loadAll()
}

export async function cancelAppointment(id) {
    check(await supabase.from('atendimentos').update({ status: 'Cancelado' }).eq('id', id))
    await loadAll()
}

/** Lançamento avulso (despesas ou receitas fora da agenda). */
export async function addManualTransaction({ description, type, category, method, date, amount }) {
    check(
        await supabase.from('lancamentos_financeiros').insert({
            tipo: type === 'income' ? 'Receita' : 'Despesa',
            categoria: category,
            descricao: description,
            valor: amount,
            forma_pagamento: method,
            data_vencimento: date,
            data_pagamento: date,
            status: 'Pago'
        })
    )
    await loadAll()
}

/** Marca um lançamento como pago hoje. */
export async function markAsPaid(id, method = 'Pix') {
    check(
        await supabase
            .from('lancamentos_financeiros')
            .update({ status: 'Pago', data_pagamento: TODAY, forma_pagamento: method })
            .eq('id', id)
    )
    await loadAll()
}
