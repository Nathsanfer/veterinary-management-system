<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import { canCreateAppointment, canDeleteAppointment } from '../stores/auth'
import { askConfirm } from '../stores/confirm'
import { supabase } from '../lib/supabase'
import { notify } from '../stores/toast'

const tutores = ref([])
const pacientesDoTutor = ref([])
const veterinarios = ref([])
const atendimentos = ref([])
const carregando = ref(false)
const salvando = ref(false)
const editandoId = ref(null)
const tutorSelecionadoId = ref('')
const pacienteSelecionadoId = ref('')
const filtroTexto = ref('')
const filtroData = ref('')
const filtroStatus = ref('')

const tutorVazio = () => ({ nome: '', cpf: '', telefone: '', email: '' })
const pacienteVazio = () => ({
  nome: '', especie: '', raca: '', data_nascimento: '', sexo: '',
  peso_atual: '', castrado: false, alergias: ''
})
const atendimentoVazio = () => ({
  data: '', horario: '', veterinario_id: '', status: 'Agendado', motivo_visita: ''
})
const formTutor = reactive(tutorVazio())
const formPaciente = reactive(pacienteVazio())
const formAtendimento = reactive(atendimentoVazio())

const statusOptions = ['Agendado', 'Em andamento', 'Concluído', 'Cancelado']

const atendimentosFiltrados = computed(() => {
  const termo = filtroTexto.value.toLocaleLowerCase('pt-BR')
  return atendimentos.value.filter((item) => {
    const tutor = item.paciente?.tutor?.nome || ''
    const pet = item.paciente?.nome || ''
    const correspondeTexto = !termo ||
      tutor.toLocaleLowerCase('pt-BR').includes(termo) ||
      pet.toLocaleLowerCase('pt-BR').includes(termo)
    const dataItem = item.data_entrada ? item.data_entrada.slice(0, 10) : ''
    const correspondeData = !filtroData.value || dataItem === filtroData.value
    const correspondeStatus = !filtroStatus.value || item.status === filtroStatus.value
    return correspondeTexto && correspondeData && correspondeStatus
  })
})

const temFiltros = computed(() => Boolean(filtroTexto.value || filtroData.value || filtroStatus.value))

const editandoPet = computed(() => formPaciente.nome || 'este atendimento')

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '—'

// Erros de formulário aparecem como notificação; sucessos também
function avisar(texto, tipo = 'success') {
  notify(texto, tipo === 'error' ? 'error' : 'success')
}

function dataHoraLocal(data, horario) {
  // Cria a data usando o fuso local, evitando deslocamento de dia
  return new Date(`${data}T${horario}:00`).toISOString()
}

function formatarData(valor) {
  if (!valor) return '—'
  const [ano, mes, dia] = valor.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarHora(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  })
}

const statusClass = (status) =>
  ({
    Agendado: 'badge--accent',
    'Em andamento': 'badge--warn',
    'Concluído': 'badge--success',
    Cancelado: 'badge--danger'
  })[status] ?? 'badge--neutral'

async function carregarDados() {
  carregando.value = true
  try {
    const [tutoresRes, vetsRes] = await Promise.all([
      supabase.from('tutores').select('*').order('nome'),
      supabase.from('veterinarios').select('id, nome, crmv').eq('ativo', true).order('nome')
    ])
    if (tutoresRes.error) throw tutoresRes.error
    if (vetsRes.error) throw vetsRes.error
    tutores.value = tutoresRes.data || []
    veterinarios.value = vetsRes.data || []
    await carregarAtendimentos()
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
    avisar(`Não foi possível carregar os dados: ${error.message || 'verifique a conexão e as permissões do Supabase.'}`, 'error')
  } finally {
    carregando.value = false
  }
}

async function carregarAtendimentos() {
  const { data, error } = await supabase
    .from('atendimentos')
    .select(`
      id, paciente_id, veterinario_id, data_entrada, data_saida, status, motivo_visita,
      paciente:pacientes!atendimentos_paciente_id_fkey (
        id, tutor_id, nome, especie, raca, data_nascimento, sexo, peso_atual, castrado, alergias,
        tutor:tutores!pacientes_tutor_id_fkey (id, nome, cpf, telefone, email)
      ),
      veterinario:veterinarios!atendimentos_veterinario_id_fkey (id, nome, crmv)
    `)
    .order('data_entrada', { ascending: false })
  if (error) throw error
  atendimentos.value = data || []
}

async function carregarPacientesDoTutor(tutorId) {
  if (!tutorId) {
    pacientesDoTutor.value = []
    return
  }
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('nome')
  if (error) throw error
  pacientesDoTutor.value = data || []
}

async function selecionarTutor() {
  pacienteSelecionadoId.value = ''
  Object.assign(formPaciente, pacienteVazio())
  if (!tutorSelecionadoId.value) {
    Object.assign(formTutor, tutorVazio())
    pacientesDoTutor.value = []
    return
  }
  const tutor = tutores.value.find((item) => item.id === tutorSelecionadoId.value)
  if (tutor) Object.assign(formTutor, {
    nome: tutor.nome || '', cpf: tutor.cpf || '',
    telefone: tutor.telefone || '', email: tutor.email || ''
  })
  try {
    await carregarPacientesDoTutor(tutorSelecionadoId.value)
  } catch (error) {
    avisar(`Erro ao carregar pets: ${error.message}`, 'error')
  }
}

function selecionarPaciente() {
  if (!pacienteSelecionadoId.value) {
    Object.assign(formPaciente, pacienteVazio())
    return
  }
  const pet = pacientesDoTutor.value.find((item) => item.id === pacienteSelecionadoId.value)
  if (pet) Object.assign(formPaciente, {
    nome: pet.nome || '', especie: pet.especie || '', raca: pet.raca || '',
    data_nascimento: pet.data_nascimento || '', sexo: pet.sexo || '',
    peso_atual: pet.peso_atual == null ? '' : String(pet.peso_atual),
    castrado: Boolean(pet.castrado), alergias: pet.alergias || ''
  })
}

async function salvarTutor() {
  const dados = {
    nome: formTutor.nome,
    cpf: formTutor.cpf || null,
    telefone: formTutor.telefone || null,
    email: formTutor.email || null
  }
  if (tutorSelecionadoId.value) {
    const { data, error } = await supabase.from('tutores').update(dados)
      .eq('id', tutorSelecionadoId.value).select().single()
    if (error) throw error
    return data.id
  }
  const { data, error } = await supabase.from('tutores').insert(dados).select().single()
  if (error) throw error
  tutorSelecionadoId.value = data.id
  return data.id
}

async function salvarPaciente(tutorId) {
  const dados = {
    tutor_id: tutorId,
    nome: formPaciente.nome,
    especie: formPaciente.especie || null,
    raca: formPaciente.raca || null,
    data_nascimento: formPaciente.data_nascimento || null,
    sexo: formPaciente.sexo || null,
    peso_atual: formPaciente.peso_atual === '' ? null : Number(formPaciente.peso_atual),
    castrado: Boolean(formPaciente.castrado),
    alergias: formPaciente.alergias || null
  }
  if (pacienteSelecionadoId.value) {
    const { data, error } = await supabase.from('pacientes').update(dados)
      .eq('id', pacienteSelecionadoId.value).select().single()
    if (error) throw error
    return data.id
  }
  const { data, error } = await supabase.from('pacientes').insert(dados).select().single()
  if (error) throw error
  pacienteSelecionadoId.value = data.id
  return data.id
}

async function salvarAgendamento() {
  if (!formTutor.nome.trim() || !formPaciente.nome.trim()) {
    avisar('Informe o nome do tutor e o nome do pet.', 'error')
    return
  }
  if (!formAtendimento.data || !formAtendimento.horario) {
    avisar('Informe a data e o horário do agendamento.', 'error')
    return
  }
  salvando.value = true
  try {
    const tutorId = await salvarTutor()
    const pacienteId = await salvarPaciente(tutorId)
    const dados = {
      paciente_id: pacienteId,
      veterinario_id: formAtendimento.veterinario_id || null,
      data_entrada: dataHoraLocal(formAtendimento.data, formAtendimento.horario),
      status: formAtendimento.status,
      motivo_visita: formAtendimento.motivo_visita || null
    }
    const resultado = editandoId.value
      ? await supabase.from('atendimentos').update(dados).eq('id', editandoId.value)
      : await supabase.from('atendimentos').insert(dados)
    if (resultado.error) throw resultado.error

    avisar(editandoId.value ? 'Agendamento atualizado com sucesso!' : 'Agendamento cadastrado com sucesso!')
    limparFormulario()
    await carregarDados()
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error)
    avisar(`Não foi possível salvar. ${error.message || 'Verifique os dados e as permissões do banco.'}`, 'error')
  } finally {
    salvando.value = false
  }
}

async function editarAgendamento(item) {
  try {
    editandoId.value = item.id
    tutorSelecionadoId.value = item.paciente?.tutor?.id || ''
    Object.assign(formTutor, {
      nome: item.paciente?.tutor?.nome || '',
      cpf: item.paciente?.tutor?.cpf || '',
      telefone: item.paciente?.tutor?.telefone || '',
      email: item.paciente?.tutor?.email || ''
    })
    await carregarPacientesDoTutor(tutorSelecionadoId.value)
    pacienteSelecionadoId.value = item.paciente?.id || ''
    Object.assign(formPaciente, item.paciente ? {
      nome: item.paciente.nome || '', especie: item.paciente.especie || '',
      raca: item.paciente.raca || '', data_nascimento: item.paciente.data_nascimento || '',
      sexo: item.paciente.sexo || '',
      peso_atual: item.paciente.peso_atual == null ? '' : String(item.paciente.peso_atual),
      castrado: Boolean(item.paciente.castrado), alergias: item.paciente.alergias || ''
    } : pacienteVazio())
    const data = new Date(item.data_entrada)
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(data)
    const horario = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(data)
    Object.assign(formAtendimento, {
      data: partes, horario,
      veterinario_id: item.veterinario_id || '',
      status: item.status || 'Agendado',
      motivo_visita: item.motivo_visita || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    avisar(`Não foi possível abrir o agendamento: ${error.message}`, 'error')
  }
}

async function excluirAgendamento(item) {
  const confirmado = await askConfirm({
    title: 'Excluir este atendimento?',
    message: `O atendimento de ${item.paciente?.nome || 'este paciente'} será removido. Os dados do tutor e do pet serão mantidos.`,
    confirmLabel: 'Excluir',
    cancelLabel: 'Manter',
    danger: true
  })
  if (!confirmado) return
  try {
    const { error } = await supabase.from('atendimentos').delete().eq('id', item.id)
    if (error) throw error
    atendimentos.value = atendimentos.value.filter((registro) => registro.id !== item.id)
    if (editandoId.value === item.id) limparFormulario()
    avisar('Atendimento excluído. Os dados do tutor e do pet foram mantidos.')
  } catch (error) {
    avisar(`Não foi possível excluir o atendimento: ${error.message}`, 'error')
  }
}

function limparFormulario() {
  editandoId.value = null
  tutorSelecionadoId.value = ''
  pacienteSelecionadoId.value = ''
  pacientesDoTutor.value = []
  Object.assign(formTutor, tutorVazio())
  Object.assign(formPaciente, pacienteVazio())
  Object.assign(formAtendimento, atendimentoVazio())
}

function novoAgendamento() {
  limparFormulario()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function limparFiltros() {
  filtroTexto.value = ''
  filtroData.value = ''
  filtroStatus.value = ''
}

onMounted(carregarDados)
</script>

<template>
  <TopBar />

  <main class="page appointments-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Clínica veterinária</p>
        <h1 class="page-title">Atendimentos</h1>
        <p class="page-subtitle">
          {{ canCreateAppointment
            ? 'Cadastre tutores e pacientes e organize os atendimentos da clínica.'
            : 'Consulte os atendimentos registrados na clínica.' }}
        </p>
      </div>
      <button v-if="canCreateAppointment" class="btn btn--primary" type="button" @click="novoAgendamento">
        <span aria-hidden="true">+</span> Novo agendamento
      </button>
    </header>

    <!-- Formulário: somente administração e recepção cadastram -->
    <section v-if="canCreateAppointment" class="card form-card" :class="{ 'is-editing': editandoId }" aria-labelledby="form-title">
      <div class="form-card__head">
        <div>
          <h2 id="form-title">{{ editandoId ? 'Editar agendamento' : 'Novo agendamento' }}</h2>
          <p>Preencha os dados do tutor, do pet e do atendimento.</p>
        </div>
        <span class="badge" :class="editandoId ? 'badge--warn' : 'badge--accent'">
          {{ editandoId ? 'Editando' : 'Cadastro' }}
        </span>
      </div>

      <Transition name="page">
        <div v-if="editandoId" class="editing-banner" role="status">
          <span>Você está editando o atendimento de <strong>{{ editandoPet }}</strong>.</span>
          <button class="btn btn--ghost btn--sm" type="button" @click="limparFormulario">Cancelar edição</button>
        </div>
      </Transition>

      <form class="form-body" @submit.prevent="salvarAgendamento">
        <fieldset class="form-section">
          <legend class="form-section__title">
            <span class="section-icon" aria-hidden="true">♙</span>
            Dados do tutor
          </legend>
          <p class="form-section__hint">Selecione um tutor cadastrado ou informe os dados de um novo.</p>

          <div class="form-grid">
            <label class="field field--wide">
              Tutor cadastrado
              <select v-model="tutorSelecionadoId" class="input" @change="selecionarTutor">
                <option value="">＋ Cadastrar novo tutor</option>
                <option v-for="tutor in tutores" :key="tutor.id" :value="tutor.id">
                  {{ tutor.nome }}{{ tutor.cpf ? ` — ${tutor.cpf}` : '' }}
                </option>
              </select>
            </label>
            <label class="field">
              Nome completo *
              <input v-model.trim="formTutor.nome" class="input" required maxlength="150" placeholder="Nome do tutor" />
            </label>
            <label class="field">
              CPF
              <input v-model.trim="formTutor.cpf" class="input" inputmode="numeric" placeholder="000.000.000-00" />
            </label>
            <label class="field">
              Telefone
              <input v-model.trim="formTutor.telefone" class="input" type="tel" placeholder="(00) 00000-0000" />
            </label>
            <label class="field">
              E-mail
              <input v-model.trim="formTutor.email" class="input" type="email" placeholder="email@exemplo.com" />
            </label>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend class="form-section__title">
            <span class="section-icon" aria-hidden="true">♡</span>
            Dados do paciente (pet)
          </legend>
          <p class="form-section__hint">O paciente será vinculado ao tutor informado acima.</p>

          <div class="form-grid">
            <label class="field field--wide">
              Pet cadastrado
              <select v-model="pacienteSelecionadoId" class="input" :disabled="!tutorSelecionadoId" @change="selecionarPaciente">
                <option value="">＋ Cadastrar novo pet</option>
                <option v-for="pet in pacientesDoTutor" :key="pet.id" :value="pet.id">
                  {{ pet.nome }}{{ pet.especie ? ` — ${pet.especie}` : '' }}
                </option>
              </select>
            </label>
            <label class="field">
              Nome do pet *
              <input v-model.trim="formPaciente.nome" class="input" required maxlength="120" placeholder="Nome do animal" />
            </label>
            <label class="field">
              Espécie
              <select v-model="formPaciente.especie" class="input">
                <option value="">Selecione</option>
                <option>Cão</option>
                <option>Gato</option>
                <option>Ave</option>
                <option>Roedor</option>
                <option>Réptil</option>
                <option>Outro</option>
              </select>
            </label>
            <label class="field">
              Raça
              <input v-model.trim="formPaciente.raca" class="input" placeholder="Raça do pet" />
            </label>
            <label class="field">
              Data de nascimento
              <input v-model="formPaciente.data_nascimento" class="input" type="date" />
            </label>
            <label class="field">
              Sexo
              <select v-model="formPaciente.sexo" class="input">
                <option value="">Não informado</option>
                <option value="Macho">Macho</option>
                <option value="Fêmea">Fêmea</option>
              </select>
            </label>
            <label class="field">
              Peso atual (kg)
              <input v-model="formPaciente.peso_atual" class="input" type="number" min="0" step="0.01" placeholder="0,00" />
            </label>
            <label class="check">
              <input v-model="formPaciente.castrado" type="checkbox" />
              <span class="check__box" aria-hidden="true"></span>
              Castrado(a)
            </label>
            <label class="field field--full">
              Alergias e observações importantes
              <textarea v-model.trim="formPaciente.alergias" class="input input--area" rows="2" placeholder="Informe alergias conhecidas ou observações"></textarea>
            </label>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend class="form-section__title">
            <span class="section-icon" aria-hidden="true">▦</span>
            Informações do agendamento
          </legend>
          <p class="form-section__hint">Defina quando o atendimento acontecerá e o motivo da visita.</p>

          <div class="form-grid">
            <label class="field">
              Data *
              <input v-model="formAtendimento.data" class="input" type="date" required />
            </label>
            <label class="field">
              Horário *
              <input v-model="formAtendimento.horario" class="input" type="time" required />
            </label>
            <label class="field">
              Veterinário responsável
              <select v-model="formAtendimento.veterinario_id" class="input">
                <option value="">A definir</option>
                <option v-for="vet in veterinarios" :key="vet.id" :value="vet.id">
                  {{ vet.nome }} — CRMV {{ vet.crmv }}
                </option>
              </select>
            </label>
            <label class="field">
              Status
              <select v-model="formAtendimento.status" class="input">
                <option v-for="status in statusOptions" :key="status">{{ status }}</option>
              </select>
            </label>
            <label class="field field--full">
              Motivo da visita
              <textarea v-model.trim="formAtendimento.motivo_visita" class="input input--area" rows="2" placeholder="Ex.: consulta de rotina, vacinação, retorno..."></textarea>
            </label>
          </div>
        </fieldset>

        <div class="form-actions">
          <button class="btn btn--secondary" type="button" @click="limparFormulario">Limpar</button>
          <button class="btn btn--primary" type="submit" :disabled="salvando">
            <span v-if="salvando" class="spinner" aria-hidden="true"></span>
            {{ salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar agendamento' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Lista de atendimentos -->
    <section class="card list-card" aria-labelledby="list-title">
      <div class="list-card__head">
        <div>
          <h2 id="list-title">Atendimentos registrados</h2>
          <p>{{ canCreateAppointment ? 'Consulte, edite ou exclua os atendimentos.' : 'Consulte os atendimentos da clínica.' }}</p>
        </div>
        <span class="badge badge--neutral count">{{ atendimentosFiltrados.length }} registro(s)</span>
      </div>

      <div class="filters">
        <label class="field filters__search">
          Buscar tutor ou pet
          <span class="search-input">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input v-model.trim="filtroTexto" class="input input--search" placeholder="Digite um nome..." />
          </span>
        </label>
        <label class="field">
          Data
          <input v-model="filtroData" class="input" type="date" />
        </label>
        <label class="field">
          Status
          <select v-model="filtroStatus" class="input">
            <option value="">Todos os status</option>
            <option v-for="status in statusOptions" :key="status">{{ status }}</option>
          </select>
        </label>
        <button v-if="temFiltros" class="btn btn--ghost btn--sm filters__clear" type="button" @click="limparFiltros">
          Limpar filtros
        </button>
      </div>

      <div v-if="carregando" class="skeleton-list" aria-label="Carregando agendamentos">
        <div v-for="n in 4" :key="n" class="skeleton skeleton-row"></div>
      </div>

      <div v-else-if="!atendimentosFiltrados.length" class="empty-state">
        <span class="empty-state__icon" aria-hidden="true">♡</span>
        <strong>Nenhum atendimento encontrado</strong>
        <span>{{ temFiltros ? 'Ajuste os filtros para ver mais resultados.' : 'Cadastre o primeiro atendimento da clínica.' }}</span>
      </div>

      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Data e horário</th>
              <th>Pet</th>
              <th>Tutor</th>
              <th>Veterinário</th>
              <th>Status</th>
              <th v-if="canCreateAppointment" class="align-right">Ações</th>
            </tr>
          </thead>
          <TransitionGroup name="list" tag="tbody">
            <tr v-for="item in atendimentosFiltrados" :key="item.id">
              <td>
                <strong class="cell-title">{{ formatarData(item.data_entrada) }}</strong>
                <small class="cell-sub">{{ formatarHora(item.data_entrada) }}</small>
              </td>
              <td>
                <div class="person">
                  <span class="avatar" aria-hidden="true">{{ initials(item.paciente?.nome) }}</span>
                  <span>
                    <strong class="cell-title">{{ item.paciente?.nome || 'Paciente não encontrado' }}</strong>
                    <small class="cell-sub">{{ item.paciente?.especie || 'Espécie não informada' }}</small>
                  </span>
                </div>
              </td>
              <td>{{ item.paciente?.tutor?.nome || 'Tutor não encontrado' }}</td>
              <td>
                <span v-if="item.veterinario?.nome" class="person">
                  <span class="avatar avatar--sm" aria-hidden="true">{{ initials(item.veterinario.nome) }}</span>
                  {{ item.veterinario.nome }}
                </span>
                <span v-else class="cell-sub">A definir</span>
              </td>
              <td><span class="badge" :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td v-if="canCreateAppointment" class="align-right">
                <div class="row-actions">
                  <button class="icon-btn" type="button" title="Editar atendimento" aria-label="Editar atendimento" @click="editarAgendamento(item)">✎</button>
                  <button
                    v-if="canDeleteAppointment"
                    class="icon-btn icon-btn--danger"
                    type="button"
                    title="Excluir atendimento"
                    aria-label="Excluir atendimento"
                    @click="excluirAgendamento(item)"
                  >⌫</button>
                </div>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.appointments-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.appointments-page > * {
  animation: rise 0.55s var(--ease) backwards;
}

.appointments-page > :nth-child(2) {
  animation-delay: 90ms;
}

.appointments-page > :nth-child(3) {
  animation-delay: 170ms;
}

.page-header {
  margin-bottom: 0;
}

.card {
  padding: 26px 28px;
}

.form-card {
  transition: box-shadow 0.35s var(--ease), border-color 0.35s;
}

.form-card.is-editing {
  border-color: var(--warn);
  box-shadow: 0 0 0 4px var(--warn-soft), var(--shadow-md);
}

.form-card__head,
.list-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
}

.form-card h2,
.list-card h2 {
  color: var(--ink);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.035em;
}

.form-card__head p,
.list-card__head p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 0.72rem;
}

.editing-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 18px 0 0;
  padding: 12px 14px;
  border-radius: var(--radius);
  color: var(--warn);
  background: var(--warn-soft);
  font-size: 0.74rem;
  font-weight: 600;
}

.editing-banner strong {
  font-weight: 800;
}

.form-body {
  margin-top: 22px;
}

.form-section {
  min-width: 0;
  margin: 0 0 26px;
  padding: 0;
  border: 0;
  border-top: 1px solid var(--line);
  padding-top: 22px;
}

.form-section__title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.form-section__hint {
  margin: 4px 0 18px 38px;
  color: var(--muted);
  font-size: 0.7rem;
}

.section-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  color: var(--accent-soft-ink);
  background: var(--accent-soft);
  font-size: 0.8rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 18px;
}

.field--wide {
  grid-column: span 2;
}

.field--full {
  grid-column: 1 / -1;
}

.input--area {
  min-height: 84px;
  padding: 12px 14px;
  resize: vertical;
  line-height: 1.5;
}

/* Checkbox customizado */

.check {
  position: relative;
  display: inline-flex;
  align-items: center;
  align-self: end;
  gap: 10px;
  min-height: 44px;
  color: var(--ink-2);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.check input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.check__box {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border: 1.5px solid var(--line-strong);
  border-radius: 6px;
  transition: background-color 0.2s, border-color 0.2s, transform 0.2s var(--ease);
}

.check input:checked + .check__box {
  border-color: var(--accent);
  background: var(--accent);
}

.check input:checked + .check__box::after {
  width: 5px;
  height: 9px;
  margin-top: -2px;
  border: solid var(--accent-ink);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  content: '';
}

.check:active .check__box {
  transform: scale(0.9);
}

.check input:focus-visible + .check__box {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.form-actions .btn--primary {
  min-width: 200px;
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

/* Lista */

.count {
  flex: 0 0 auto;
}

.filters {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: 14px;
  margin: 22px 0 6px;
}

.filters .field {
  font-size: 0.64rem;
}

.search-input {
  position: relative;
  display: block;
}

.search-input svg {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}

.input--search {
  padding-left: 40px;
}

.filters__clear {
  align-self: center;
  margin-bottom: 4px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.skeleton-row {
  height: 52px;
}

.table {
  margin-top: 12px;
}

.table tbody {
  position: relative;
}

.cell-title {
  display: block;
  color: var(--ink);
  font-size: 0.76rem;
  font-weight: 700;
}

.cell-sub {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.64rem;
  font-weight: 500;
}

.person {
  display: inline-flex;
  align-items: center;
  gap: 11px;
}

.avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--accent-soft-ink);
  background: var(--accent-soft);
  font-size: 0.66rem;
  font-weight: 800;
}

.avatar--sm {
  width: 26px;
  height: 26px;
  font-size: 0.56rem;
}

.row-actions {
  display: inline-flex;
  gap: 8px;
}

.icon-btn--danger:hover {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: transparent;
}

.list-enter-active,
.list-leave-active {
  transition: opacity 0.3s var(--ease), transform 0.3s var(--ease);
}

.list-leave-active {
  position: absolute;
}

.list-move {
  transition: transform 0.35s var(--ease);
}

@media (max-width: 1080px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field--wide {
    grid-column: 1 / -1;
  }

  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .card {
    padding: 20px 18px;
  }

  .form-grid,
  .filters {
    grid-template-columns: 1fr;
  }

  .form-section__hint {
    margin-left: 0;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .btn {
    width: 100%;
  }

  .form-actions .btn--primary {
    min-width: 0;
  }

  .filters__clear {
    justify-self: start;
  }
}
</style>
