<template>
  <TopBar />
  <main class="appointments-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">CLÍNICA VETERINÁRIA</p>
        <h1>Agendamentos</h1>
        <p class="page-subtitle">Cadastre tutores e pacientes e organize os atendimentos da clínica.</p>
      </div>
      <button class="btn btn-light" type="button" @click="novoAgendamento">
        <span aria-hidden="true">＋</span> Novo agendamento
      </button>
    </header>

    <div v-if="mensagem.texto" class="notice" :class="mensagem.tipo" role="status">
      {{ mensagem.texto }}
      <button type="button" aria-label="Fechar aviso" @click="mensagem.texto = ''">×</button>
    </div>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>{{ editandoId ? 'Editar agendamento' : 'Novo agendamento' }}</h2>
          <p>Preencha os dados do tutor, do pet e do atendimento.</p>
        </div>
        <span class="step-tag">1 · Cadastro</span>
      </div>

      <form @submit.prevent="salvarAgendamento">
        <div class="section-title">
          <span class="section-icon">♙</span>
          <div>
            <h3>Dados do tutor</h3>
            <p>Selecione um tutor cadastrado ou informe os dados de um novo.</p>
          </div>
        </div>

        <div class="form-grid">
          <label class="field field-wide">
            <span>Tutor cadastrado</span>
            <select v-model="tutorSelecionadoId" @change="selecionarTutor">
              <option value="">＋ Cadastrar novo tutor</option>
              <option v-for="tutor in tutores" :key="tutor.id" :value="tutor.id">
                {{ tutor.nome }}{{ tutor.cpf ? ` — ${tutor.cpf}` : '' }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Nome completo *</span>
            <input v-model.trim="formTutor.nome" required maxlength="150" placeholder="Nome do tutor" />
          </label>
          <label class="field">
            <span>CPF</span>
            <input v-model.trim="formTutor.cpf" inputmode="numeric" placeholder="000.000.000-00" />
          </label>
          <label class="field">
            <span>Telefone</span>
            <input v-model.trim="formTutor.telefone" type="tel" placeholder="(00) 00000-0000" />
          </label>
          <label class="field">
            <span>E-mail</span>
            <input v-model.trim="formTutor.email" type="email" placeholder="email@exemplo.com" />
          </label>
        </div>

        <div class="section-title section-spaced">
          <span class="section-icon">♡</span>
          <div>
            <h3>Dados do paciente (pet)</h3>
            <p>O paciente será vinculado ao tutor informado acima.</p>
          </div>
        </div>

        <div class="form-grid">
          <label class="field field-wide">
            <span>Pet cadastrado</span>
            <select v-model="pacienteSelecionadoId" :disabled="!tutorSelecionadoId" @change="selecionarPaciente">
              <option value="">＋ Cadastrar novo pet</option>
              <option v-for="pet in pacientesDoTutor" :key="pet.id" :value="pet.id">
                {{ pet.nome }}{{ pet.especie ? ` — ${pet.especie}` : '' }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Nome do pet *</span>
            <input v-model.trim="formPaciente.nome" required maxlength="120" placeholder="Nome do animal" />
          </label>
          <label class="field">
            <span>Espécie</span>
            <select v-model="formPaciente.especie">
              <option value="">Selecione</option>
              <option>Cão</option>
              <option>Gato</option>
              <option> Ave </option>
              <option>Roedor</option>
              <option>Réptil</option>
              <option>Outro</option>
            </select>
          </label>
          <label class="field">
            <span>Raça</span>
            <input v-model.trim="formPaciente.raca" placeholder="Raça do pet" />
          </label>
          <label class="field">
            <span>Data de nascimento</span>
            <input v-model="formPaciente.data_nascimento" type="date" />
          </label>
          <label class="field">
            <span>Sexo</span>
            <select v-model="formPaciente.sexo">
              <option value="">Não informado</option>
              <option value="Macho">Macho</option>
              <option value="Fêmea">Fêmea</option>
            </select>
          </label>
          <label class="field">
            <span>Peso atual (kg)</span>
            <input v-model="formPaciente.peso_atual" type="number" min="0" step="0.01" placeholder="0,00" />
          </label>
          <label class="field checkbox-field">
            <input v-model="formPaciente.castrado" type="checkbox" />
            <span>Castrado(a)</span>
          </label>
          <label class="field field-full">
            <span>Alergias e observações importantes</span>
            <textarea v-model.trim="formPaciente.alergias" rows="2" placeholder="Informe alergias conhecidas ou observações"></textarea>
          </label>
        </div>

        <div class="section-title section-spaced">
          <span class="section-icon">▦</span>
          <div>
            <h3>Informações do agendamento</h3>
            <p>Defina quando o atendimento acontecerá e o motivo da visita.</p>
          </div>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Data *</span>
            <input v-model="formAtendimento.data" type="date" required />
          </label>
          <label class="field">
            <span>Horário *</span>
            <input v-model="formAtendimento.horario" type="time" required />
          </label>
          <label class="field">
            <span>Veterinário responsável</span>
            <select v-model="formAtendimento.veterinario_id">
              <option value="">A definir</option>
              <option v-for="vet in veterinarios" :key="vet.id" :value="vet.id">
                {{ vet.nome }} — CRMV {{ vet.crmv }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Status</span>
            <select v-model="formAtendimento.status">
              <option>Agendado</option>
              <option>Em andamento</option>
              <option>Concluído</option>
              <option>Cancelado</option>
            </select>
          </label>
          <label class="field field-full">
            <span>Motivo da visita</span>
            <textarea v-model.trim="formAtendimento.motivo_visita" rows="2" placeholder="Ex.: consulta de rotina, vacinação, retorno..."></textarea>
          </label>
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" @click="limparFormulario">Limpar</button>
          <button class="btn btn-primary" type="submit" :disabled="salvando">
            {{ salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar agendamento' }}
          </button>
        </div>
      </form>
    </section>

    <section class="panel list-panel">
      <div class="panel-heading list-heading">
        <div>
          <h2>Agendamentos realizados</h2>
          <p>Consulte, edite ou exclua os atendimentos cadastrados.</p>
        </div>
        <span class="count-pill">{{ atendimentosFiltrados.length }} registro(s)</span>
      </div>

      <div class="filters">
        <label class="field">
          <span>Buscar tutor ou pet</span>
          <input v-model.trim="filtroTexto" placeholder="Digite um nome..." />
        </label>
        <label class="field">
          <span>Data</span>
          <input v-model="filtroData" type="date" />
        </label>
        <label class="field">
          <span>Status</span>
          <select v-model="filtroStatus">
            <option value="">Todos os status</option>
            <option>Agendado</option>
            <option>Em andamento</option>
            <option>Concluído</option>
            <option>Cancelado</option>
          </select>
        </label>
        <button class="btn btn-secondary filter-clear" type="button" @click="limparFiltros">Limpar filtros</button>
      </div>

      <div v-if="carregando" class="empty-state">Carregando agendamentos...</div>
      <div v-else-if="!atendimentosFiltrados.length" class="empty-state">
        <span class="empty-icon">♡</span>
        <strong>Nenhum agendamento encontrado</strong>
        <span>Cadastre um atendimento ou altere os filtros da busca.</span>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data e horário</th>
              <th>Pet</th>
              <th>Tutor</th>
              <th>Veterinário</th>
              <th>Status</th>
              <th class="actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in atendimentosFiltrados" :key="item.id">
              <td>
                <strong>{{ formatarData(item.data_entrada) }}</strong>
                <small>{{ formatarHora(item.data_entrada) }}</small>
              </td>
              <td>
                <strong>{{ item.paciente?.nome || 'Paciente não encontrado' }}</strong>
                <small>{{ item.paciente?.especie || 'Espécie não informada' }}</small>
              </td>
              <td>{{ item.paciente?.tutor?.nome || 'Tutor não encontrado' }}</td>
              <td>{{ item.veterinario?.nome || 'A definir' }}</td>
              <td><span class="status" :class="classeStatus(item.status)">{{ item.status }}</span></td>
              <td class="row-actions">
                <button class="icon-btn" type="button" title="Editar atendimento" @click="editarAgendamento(item)">✎</button>
                <button class="icon-btn danger" type="button" title="Excluir atendimento" @click="excluirAgendamento(item)">⌫</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import TopBar from "../components/TopBar.vue";
import { supabase } from "../lib/supabase";

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
const mensagem = reactive({ texto: '', tipo: 'success' })

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

function avisar(texto, tipo = 'success') {
  mensagem.texto = texto
  mensagem.tipo = tipo
}

function dataHoraLocal(data, horario) {
  // Cria a data usando o fuso local, evitando deslocamento de dia no campo datetime-local.
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

function classeStatus(status) {
  return {
    'status-scheduled': status === 'Agendado',
    'status-progress': status === 'Em andamento',
    'status-done': status === 'Concluído',
    'status-cancelled': status === 'Cancelado'
  }
}

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
  const confirmado = window.confirm(`Deseja excluir o atendimento de ${item.paciente?.nome || 'este paciente'}? Os dados do tutor e do pet serão mantidos.`)
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

<style scoped>
.appointments-page {
  --primary: #2f7d73;
  --primary-dark: #24665e;
  --ink: #183b3a;
  --muted: #728682;
  --line: #e5ebe8;
  --surface: #ffffff;
  width: min(100% - 48px, 1380px);
  margin: 0 auto;
  padding: 32px 0 64px;
  color: var(--ink);
  background: #f3f5f1;
  min-height: 100vh;
  font-family: 'Montserrat Alternates', sans-serif;
}
.page-header, .panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.page-header { margin-bottom: 26px; }
.eyebrow {
  margin: 0 0 7px;
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .13em;
}
h1 { margin: 0; font-size: clamp(26px, 3vw, 34px); letter-spacing: -.04em; }
.page-subtitle, .panel-heading p, .section-title p {
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.panel {
  margin-bottom: 24px;
  padding: 26px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 5px 20px rgba(32, 63, 52, .035);
}
.panel-heading { margin-bottom: 25px; }
.panel-heading h2 { margin: 0; font-size: 19px; letter-spacing: -.02em; }
.step-tag, .count-pill {
  padding: 8px 12px;
  border-radius: 999px;
  color: var(--primary-dark);
  background: #e9f5f0;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.section-title { display: flex; align-items: center; gap: 12px; margin-bottom: 17px; }
.section-title h3 { margin: 0; font-size: 15px; }
.section-title p { margin-top: 4px; font-size: 12px; }
.section-icon {
  display: grid; place-items: center; flex: 0 0 38px; height: 38px;
  border-radius: 11px; color: var(--primary); background: #eaf5f1; font-size: 20px;
}
.section-spaced { margin-top: 30px; }
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px 20px;
}
.field { display: flex; min-width: 0; flex-direction: column; gap: 7px; }
.field > span { color: #44534e; font-size: 12px; font-weight: 700; }
.field input, .field select, .field textarea {
  box-sizing: border-box; width: 100%; min-height: 43px; padding: 10px 12px;
  border: 1px solid #dce5e0; border-radius: 9px; outline: none;
  color: #263630; background: #fff; font: inherit; font-size: 13px;
  transition: border-color .15s, box-shadow .15s;
}
.field textarea { resize: vertical; min-height: 70px; }
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: var(--primary); box-shadow: 0 0 0 3px rgba(40, 124, 104, .1);
}
.field input::placeholder, .field textarea::placeholder { color: #a1ada7; }
.field-wide, .field-full { grid-column: 1 / -1; }
.checkbox-field { flex-direction: row; align-items: center; gap: 10px; align-self: end; min-height: 43px; }
.checkbox-field input { width: 17px; min-height: 17px; accent-color: var(--primary); }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line); }
.btn {
  display: inline-flex; justify-content: center; align-items: center; gap: 8px;
  min-height: 41px; padding: 0 16px; border: 1px solid transparent;
  border-radius: 9px; font: inherit; font-size: 12px; font-weight: 750;
  cursor: pointer; transition: background .15s, transform .15s;
}
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: .6; cursor: wait; transform: none; }
.btn-primary { color: #fff; background: var(--primary); }
.btn-primary:hover { background: var(--primary-dark); }
.btn-secondary { color: #465650; background: #fff; border-color: #dce5e0; }
.btn-secondary:hover, .btn-light:hover { background: #f0f5f2; }
.btn-light { color: var(--primary-dark); background: #e9f5f0; }
.list-panel { padding-bottom: 12px; }
.list-heading { margin-bottom: 20px; }
.filters {
  display: grid; grid-template-columns: minmax(180px, 1.5fr) minmax(150px, 1fr) minmax(150px, 1fr) auto;
  gap: 12px; align-items: end; margin-bottom: 20px; padding: 16px;
  border-radius: 12px; background: #f3f5f1;
}
.filter-clear { min-height: 43px; }
.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
th { padding: 13px 14px; color: #7e908c; background: #f7f8f3; font-size: 10px; text-transform: uppercase; letter-spacing: .07em; }
td { padding: 15px 14px; border-bottom: 1px solid #edf1ef; font-size: 12px; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: #fbfdfc; }
td strong, td small { display: block; }
td strong { font-size: 12px; font-weight: 750; }
td small { margin-top: 5px; color: var(--muted); font-size: 11px; }
.status { display: inline-flex; padding: 6px 9px; border-radius: 999px; font-size: 10px; font-weight: 750; }
.status-scheduled { color: #8a6514; background: #fff4d6; }
.status-progress { color: #245da5; background: #e5f0ff; }
.status-done { color: #20704d; background: #e0f5e9; }
.status-cancelled { color: #a33c3c; background: #ffebeb; }
.actions-column { text-align: center; }
.row-actions { display: flex; justify-content: center; gap: 6px; }
.icon-btn {
  display: grid; place-items: center; width: 31px; height: 31px;
  border: 1px solid #e0e8e3; border-radius: 8px; color: var(--primary);
  background: white; cursor: pointer; font-size: 15px;
}
.icon-btn:hover { background: #eaf5f1; }
.icon-btn.danger { color: #b74646; }
.icon-btn.danger:hover { background: #fff0f0; }
.empty-state { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; padding: 45px 15px; color: var(--muted); font-size: 12px; text-align: center; }
.empty-state strong { color: var(--ink); font-size: 14px; }
.empty-icon { color: #91b8a8; font-size: 30px; }
.notice { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 18px; padding: 12px 15px; border: 1px solid; border-radius: 10px; font-size: 13px; }
.notice button { border: 0; background: transparent; font-size: 18px; cursor: pointer; }
.notice.success { color: #216548; border-color: #c5e8d4; background: #edfaf2; }
.notice.error { color: #963b3b; border-color: #f0cccc; background: #fff2f2; }
@media (max-width: 900px) {
  .appointments-page { width: calc(100% - 32px); padding: 22px 0 48px; }
  .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-clear { width: 100%; }
}
@media (max-width: 600px) {
  .page-header, .panel-heading { align-items: flex-start; flex-direction: column; }
  .page-header .btn { width: 100%; }
  .panel { padding: 19px 15px; }
  .form-grid, .filters { grid-template-columns: 1fr; }
  .field-wide, .field-full { grid-column: auto; }
  .form-actions { flex-direction: column-reverse; }
  .form-actions .btn { width: 100%; }
  .step-tag { align-self: flex-start; }
}
</style>
