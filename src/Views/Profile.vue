<script setup>
import { computed, onMounted, ref } from 'vue'
import TopBar from '../components/TopBar.vue'
import { supabase } from '../lib/supabase'
import {
    cargoLabels,
    initials,
    isAdmin,
    loadProfile,
    profile,
    session
} from '../stores/auth'

/* ---------- Equipe ---------- */
const team = ref([])
const loading = ref(false)
const loadError = ref('')

const carregarEquipe = async () => {
    loading.value = true
    loadError.value = ''

    const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, cargo, email, ativo, veterinario_id, veterinarios(crmv, telefone)')
        .order('nome')

    if (error) {
        console.error('Erro ao carregar equipe:', error)
        loadError.value = 'Não foi possível carregar a equipe.'
        loading.value = false
        return
    }

    team.value = data
        .map((item) => ({
            id: item.id,
            name: item.nome,
            role: item.cargo,
            email: item.email ?? '',
            active: item.ativo !== false,
            crmv: item.veterinarios?.crmv ?? '',
            phone: item.veterinarios?.telefone ?? ''
        }))
        .sort(
            (a, b) =>
                Number(b.active) - Number(a.active) ||
                a.name.localeCompare(b.name, 'pt-BR')
        )
    loading.value = false
}

const statusFilter = ref('all')
const statusFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'inactive', label: 'Inativos' }
]

const filteredTeam = computed(() =>
    team.value.filter((member) => {
        if (statusFilter.value === 'active') return member.active
        if (statusFilter.value === 'inactive') return !member.active
        return true
    })
)
const activeCount = computed(() => team.value.filter((m) => m.active).length)

const memberInitials = (name) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')

/* ---------- Meu perfil ---------- */
const myEmail = computed(() => session.value?.user?.email ?? profile.value?.email ?? '')
const myRoleLabel = computed(() => cargoLabels[profile.value?.cargo] ?? '—')

const editingName = ref(false)
const nameDraft = ref('')
const nameSaving = ref(false)
const nameError = ref('')

const startEditName = () => {
    nameDraft.value = profile.value?.nome ?? ''
    nameError.value = ''
    editingName.value = true
}

async function saveName() {
    nameError.value = ''
    nameSaving.value = true
    const { error } = await supabase.rpc('atualizar_meu_nome', { p_nome: nameDraft.value })
    if (error) {
        nameError.value = error.message ?? 'Não foi possível salvar o nome.'
        nameSaving.value = false
        return
    }
    await loadProfile()
    await carregarEquipe()
    editingName.value = false
    nameSaving.value = false
}

const passwordForm = ref({ next: '', confirm: '' })
const passwordSaving = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

async function changePassword() {
    passwordError.value = ''
    passwordSuccess.value = ''

    if (passwordForm.value.next.length < 6) {
        passwordError.value = 'A nova senha precisa ter ao menos 6 caracteres.'
        return
    }
    if (passwordForm.value.next !== passwordForm.value.confirm) {
        passwordError.value = 'As senhas não conferem.'
        return
    }

    passwordSaving.value = true
    const { error } = await supabase.auth.updateUser({ password: passwordForm.value.next })
    passwordSaving.value = false

    if (error) {
        passwordError.value = error.message ?? 'Não foi possível alterar a senha.'
        return
    }
    passwordForm.value = { next: '', confirm: '' }
    passwordSuccess.value = 'Senha alterada com sucesso.'
}

/* ---------- CRUD de funcionários (somente admin) ---------- */
const isModalOpen = ref(false)
const editingId = ref(null)
const saving = ref(false)
const saveError = ref('')
const actionError = ref('')
const actionNotice = ref('')

const blankMember = () => ({
    name: '',
    email: '',
    password: '',
    role: 'recepcao',
    crmv: '',
    phone: ''
})
const memberForm = ref(blankMember())

const roleOptions = Object.entries(cargoLabels).map(([value, label]) => ({ value, label }))

// A Edge Function devolve { error } em português nas respostas 4xx
async function callFunction(body) {
    const { data, error } = await supabase.functions.invoke('gerenciar-funcionarios', { body })
    if (error) {
        let message = 'Não foi possível concluir a operação.'
        try {
            const payload = await error.context?.json?.()
            if (payload?.error) message = payload.error
        } catch {
            /* mantém a mensagem padrão */
        }
        throw new Error(message)
    }
    if (data?.error) throw new Error(data.error)
    return data
}

const openCreateModal = () => {
    saveError.value = ''
    editingId.value = null
    memberForm.value = blankMember()
    isModalOpen.value = true
}

const openEditModal = (member) => {
    if (!isAdmin.value) return
    saveError.value = ''
    editingId.value = member.id
    memberForm.value = {
        name: member.name,
        email: member.email,
        password: '',
        role: member.role,
        crmv: member.crmv,
        phone: member.phone
    }
    isModalOpen.value = true
}

const closeModal = () => {
    if (!saving.value) isModalOpen.value = false
}

async function saveMember() {
    saveError.value = ''
    saving.value = true
    try {
        const payload = {
            nome: memberForm.value.name.trim(),
            email: memberForm.value.email.trim(),
            cargo: memberForm.value.role,
            crmv: memberForm.value.crmv.trim(),
            telefone: memberForm.value.phone.trim(),
            senha: memberForm.value.password
        }
        if (editingId.value) {
            await callFunction({ acao: 'atualizar', id: editingId.value, ...payload })
        } else {
            await callFunction({ acao: 'criar', ...payload })
        }
        isModalOpen.value = false
        editingId.value = null
        memberForm.value = blankMember()
        await carregarEquipe()
        await loadProfile()
    } catch (error) {
        saveError.value = error.message
    } finally {
        saving.value = false
    }
}

async function toggleActive(member) {
    actionError.value = ''
    actionNotice.value = ''
    const next = !member.active
    if (
        !next &&
        !window.confirm(`Desativar ${member.name}? Essa pessoa não conseguirá mais entrar no sistema.`)
    ) {
        return
    }
    try {
        await callFunction({ acao: 'definir_ativo', id: member.id, ativo: next })
        await carregarEquipe()
    } catch (error) {
        actionError.value = error.message
    }
}

async function removeMember(member) {
    actionError.value = ''
    actionNotice.value = ''
    if (
        !window.confirm(
            `Excluir ${member.name} definitivamente? Esta ação não pode ser desfeita. Se a pessoa só vai se afastar, prefira desativar.`
        )
    ) {
        return
    }
    try {
        const result = await callFunction({ acao: 'excluir', id: member.id })
        if (result?.veterinarioMantido) {
            actionNotice.value =
                'Acesso removido. O cadastro do veterinário foi mantido (inativo) porque há atendimentos ligados a ele.'
        }
        await carregarEquipe()
    } catch (error) {
        actionError.value = error.message
    }
}

onMounted(carregarEquipe)
</script>

<template>
    <div class="profile-page">
        <TopBar />

        <main class="profile-content">
            <header class="profile-heading">
                <div>
                    <p class="eyebrow">MINHA CONTA</p>
                    <h1>Perfil</h1>
                    <p class="heading-description">
                        Seus dados de acesso e a equipe da clínica.
                    </p>
                </div>
            </header>

            <section class="profile-grid">
                <!-- Meus dados -->
                <article class="panel me-panel">
                    <div class="me-header">
                        <span class="me-avatar" aria-hidden="true">{{ initials }}</span>
                        <div class="me-identity">
                            <h2>{{ profile?.nome ?? myEmail }}</h2>
                            <span class="tag">{{ myRoleLabel }}</span>
                        </div>
                    </div>

                    <dl class="data-list">
                        <div>
                            <dt>Nome</dt>
                            <dd v-if="!editingName">
                                {{ profile?.nome ?? '—' }}
                                <button class="link-button" type="button" @click="startEditName">
                                    Editar
                                </button>
                            </dd>
                            <dd v-else>
                                <form class="inline-form" @submit.prevent="saveName">
                                    <input
                                        v-model="nameDraft"
                                        required
                                        maxlength="120"
                                        aria-label="Nome"
                                    />
                                    <button class="pay-button" type="submit" :disabled="nameSaving">
                                        {{ nameSaving ? 'Salvando...' : 'Salvar' }}
                                    </button>
                                    <button
                                        class="pay-button"
                                        type="button"
                                        :disabled="nameSaving"
                                        @click="editingName = false"
                                    >
                                        Cancelar
                                    </button>
                                </form>
                                <p v-if="nameError" class="modal-error" role="alert">{{ nameError }}</p>
                            </dd>
                        </div>
                        <div>
                            <dt>E-mail</dt>
                            <dd>{{ myEmail }}</dd>
                        </div>
                        <div>
                            <dt>Cargo</dt>
                            <dd>{{ myRoleLabel }}</dd>
                        </div>
                    </dl>

                    <form class="password-form" @submit.prevent="changePassword">
                        <h3>Alterar senha</h3>
                        <label>
                            Nova senha
                            <input
                                v-model="passwordForm.next"
                                type="password"
                                autocomplete="new-password"
                                placeholder="Mínimo de 6 caracteres"
                            />
                        </label>
                        <label>
                            Confirmar nova senha
                            <input
                                v-model="passwordForm.confirm"
                                type="password"
                                autocomplete="new-password"
                                placeholder="Repita a senha"
                            />
                        </label>
                        <p v-if="passwordError" class="modal-error" role="alert">{{ passwordError }}</p>
                        <p v-if="passwordSuccess" class="success-message" role="status">
                            {{ passwordSuccess }}
                        </p>
                        <button class="primary-button" type="submit" :disabled="passwordSaving">
                            {{ passwordSaving ? 'Salvando...' : 'Atualizar senha' }}
                        </button>
                    </form>
                </article>

                <!-- Equipe -->
                <article class="panel team-panel">
                    <div class="panel__header">
                        <div>
                            <h2>Equipe</h2>
                            <p>{{ activeCount }} ativos · {{ team.length }} no total</p>
                        </div>
                        <div class="panel__actions">
                            <div class="period-switcher" role="group" aria-label="Filtrar equipe">
                                <button
                                    v-for="item in statusFilters"
                                    :key="item.key"
                                    type="button"
                                    :class="{ active: statusFilter === item.key }"
                                    @click="statusFilter = item.key"
                                >
                                    {{ item.label }}
                                </button>
                            </div>
                            <button
                                v-if="isAdmin"
                                class="primary-button"
                                type="button"
                                @click="openCreateModal"
                            >
                                <span class="plus">+</span>Novo funcionário
                            </button>
                        </div>
                    </div>

                    <p v-if="loadError" class="modal-error" role="alert">{{ loadError }}</p>
                    <p v-else-if="loading && !team.length" class="state-message">
                        Carregando equipe...
                    </p>
                    <p v-if="actionError" class="modal-error" role="alert">{{ actionError }}</p>
                    <p v-if="actionNotice" class="success-message" role="status">{{ actionNotice }}</p>

                    <div class="table-scroll">
                        <table class="team-table">
                            <thead>
                                <tr>
                                    <th>Funcionário</th>
                                    <th>Cargo</th>
                                    <th>Contato</th>
                                    <th>Status</th>
                                    <th v-if="isAdmin" class="align-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="member in filteredTeam"
                                    :key="member.id"
                                    :class="{ 'row--inactive': !member.active }"
                                >
                                    <td>
                                        <div class="member-cell">
                                            <span class="member-avatar" aria-hidden="true">{{
                                                memberInitials(member.name)
                                            }}</span>
                                            <div>
                                                <strong>{{ member.name }}</strong>
                                                <span v-if="member.id === session?.user?.id" class="origin">Você</span>
                                                <small v-if="member.crmv">CRMV {{ member.crmv }}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="tag">{{ cargoLabels[member.role] ?? member.role }}</span>
                                    </td>
                                    <td>
                                        {{ member.email || '—' }}
                                        <small v-if="member.phone" class="sub-line">{{ member.phone }}</small>
                                    </td>
                                    <td>
                                        <span
                                            class="status"
                                            :class="member.active ? 'status--paid' : 'status--overdue'"
                                        >
                                            {{ member.active ? 'Ativo' : 'Inativo' }}
                                        </span>
                                    </td>
                                    <td v-if="isAdmin" class="align-right actions-cell">
                                        <button class="pay-button" type="button" @click="openEditModal(member)">
                                            Editar
                                        </button>
                                        <button
                                            v-if="member.id !== session?.user?.id"
                                            class="pay-button"
                                            type="button"
                                            @click="toggleActive(member)"
                                        >
                                            {{ member.active ? 'Desativar' : 'Ativar' }}
                                        </button>
                                        <button
                                            v-if="member.id !== session?.user?.id"
                                            class="pay-button pay-button--danger"
                                            type="button"
                                            @click="removeMember(member)"
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                                <tr v-if="!filteredTeam.length && !loading">
                                    <td :colspan="isAdmin ? 5 : 4" class="empty-row">
                                        Nenhum funcionário encontrado.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </article>
            </section>
        </main>

        <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
            <form class="modal" @submit.prevent="saveMember">
                <button class="modal-close" type="button" aria-label="Fechar" @click="closeModal">×</button>
                <p class="eyebrow">EQUIPE DA CLÍNICA</p>
                <h2>{{ editingId ? 'Editar funcionário' : 'Novo funcionário' }}</h2>

                <label>
                    Nome completo
                    <input v-model="memberForm.name" required maxlength="120" placeholder="Ex.: Ana Souza" />
                </label>

                <div class="form-row">
                    <label>
                        E-mail
                        <input
                            v-model="memberForm.email"
                            type="email"
                            required
                            autocomplete="off"
                            placeholder="nome@clinica.com"
                        />
                    </label>
                    <label>
                        Cargo
                        <select v-model="memberForm.role">
                            <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                    </label>
                </div>

                <label>
                    {{ editingId ? 'Nova senha (opcional)' : 'Senha inicial' }}
                    <input
                        v-model="memberForm.password"
                        type="password"
                        minlength="6"
                        autocomplete="new-password"
                        :required="!editingId"
                        :placeholder="editingId ? 'Deixe em branco para manter' : 'Mínimo de 6 caracteres'"
                    />
                </label>

                <div v-if="memberForm.role === 'veterinario'" class="form-row">
                    <label>
                        CRMV
                        <input v-model="memberForm.crmv" required placeholder="Ex.: SP-12345" />
                    </label>
                    <label>
                        Telefone
                        <input v-model="memberForm.phone" placeholder="(19) 99999-9999" />
                    </label>
                </div>

                <p v-if="saveError" class="modal-error" role="alert">{{ saveError }}</p>
                <button class="primary-button modal-submit" type="submit" :disabled="saving">
                    {{
                        saving
                            ? 'Salvando...'
                            : editingId
                              ? 'Salvar alterações'
                              : 'Cadastrar funcionário'
                    }}
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.profile-page {
    --ink: #183b3a;
    --muted: #728682;
    --line: #e0e9e1;
    --cream: #fffefa;
    min-height: 100vh;
    color: var(--ink);
    background: #f3f5f1;
}

.profile-content {
    width: min(100% - 48px, 1380px);
    margin: 0 auto;
    padding: 32px 0 64px;
}

.profile-heading {
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

.profile-heading h1 {
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

.profile-grid {
    display: grid;
    grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
    align-items: start;
    gap: 28px;
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

.panel__actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Botões */
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

.primary-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.plus {
    margin-right: 8px;
    font-size: 1.2rem;
    vertical-align: -1px;
}

.period-switcher {
    display: flex;
    padding: 3px;
    border-radius: 9px;
    background: #eef3ed;
}

.period-switcher button {
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

.period-switcher button.active {
    color: var(--ink);
    background: #fff;
    box-shadow: 0 2px 6px rgba(24, 59, 58, 0.1);
}

.pay-button {
    margin-left: 6px;
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 5px 10px;
    color: #31572c;
    background: #fff;
    cursor: pointer;
    font: inherit;
    font-size: 0.62rem;
    font-weight: 800;
}

.pay-button:hover {
    background: #eef3ed;
}

.pay-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.pay-button--danger {
    color: #b9533d;
}

.pay-button--danger:hover {
    background: #f9ebe7;
}

.link-button {
    margin-left: 8px;
    border: 0;
    padding: 0;
    color: #3f8f8a;
    background: none;
    cursor: pointer;
    font: inherit;
    font-size: 0.66rem;
    font-weight: 800;
}

.link-button:hover {
    text-decoration: underline;
}

/* Meus dados */
.me-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
}

.me-avatar {
    width: 56px;
    height: 56px;
    flex: 0 0 56px;
    display: grid;
    place-items: center;
    border: 1px solid #c3d7cf;
    border-radius: 50%;
    color: #31572c;
    background: #e5efe2;
    font-size: 1rem;
    font-weight: 800;
}

.me-identity {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.me-identity h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: #252929d0;
    overflow-wrap: anywhere;
}

.data-list {
    margin: 0 0 26px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.data-list dt {
    margin-bottom: 5px;
    color: #7e908c;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.data-list dd {
    margin: 0;
    color: #252929d0;
    font-size: 0.8rem;
    font-weight: 700;
    overflow-wrap: anywhere;
}

.inline-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
}

.inline-form input {
    flex: 1 1 140px;
    min-width: 0;
}

.password-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 22px;
    border-top: 1px solid var(--line);
}

.password-form h3 {
    margin: 0;
    font-size: 0.86rem;
    font-weight: 800;
    color: #252929d0;
}

.password-form .primary-button {
    align-self: flex-start;
}

.password-form label,
.modal label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 700;
}

.password-form input,
.inline-form input,
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

.password-form input:focus,
.inline-form input:focus,
.modal input:focus,
.modal select:focus {
    border-color: #99b55f;
    box-shadow: 0 0 0 3px rgba(153, 181, 95, 0.2);
}

/* Tabela da equipe */
.table-scroll {
    overflow-x: auto;
}

.team-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.74rem;
}

.team-table th {
    padding: 0 12px 12px;
    border-bottom: 1px solid var(--line);
    color: #7e908c;
    font-size: 0.62rem;
    font-weight: 700;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.team-table td {
    padding: 14px 12px;
    border-bottom: 1px solid #edf1ec;
    color: #6c7d7a;
    white-space: nowrap;
    vertical-align: middle;
}

.team-table tbody tr {
    transition: background 0.2s;
}

.team-table tbody tr:hover {
    background: #f7f9f5;
}

.team-table tbody tr:last-child td {
    border-bottom: 0;
}

.row--inactive {
    opacity: 0.7;
}

.align-right {
    text-align: right !important;
}

.actions-cell {
    white-space: nowrap;
}

.member-cell {
    display: flex;
    align-items: center;
    gap: 11px;
}

.member-cell strong {
    color: #252929d0;
    font-weight: 700;
}

.member-cell small,
.sub-line {
    display: block;
    margin-top: 3px;
    color: #9aac9e;
    font-size: 0.6rem;
    font-weight: 600;
}

.member-avatar {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #31572c;
    background: #e5efe2;
    font-size: 0.6rem;
    font-weight: 800;
}

.origin {
    margin-left: 8px;
    padding: 2px 7px;
    border-radius: 20px;
    color: #3f8f8a;
    background: #e3f1ef;
    font-size: 0.58rem;
    font-weight: 800;
}

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

.status--paid {
    color: #2f7d73;
}

.status--overdue {
    color: #b9533d;
}

.empty-row {
    padding: 28px 12px !important;
    text-align: center;
    color: var(--muted);
}

.state-message {
    margin: 0 0 16px;
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 600;
}

.modal-error {
    margin: 0;
    color: #b9533d;
    font-size: 0.74rem;
    font-weight: 700;
}

.success-message {
    margin: 0;
    color: #2f7d73;
    font-size: 0.74rem;
    font-weight: 700;
}

/* Modal */
.modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 20px;
    overflow-y: auto;
    background: rgba(24, 59, 58, 0.35);
    backdrop-filter: blur(3px);
}

.modal {
    position: relative;
    width: min(100%, 480px);
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: auto;
    padding: 30px;
    border-radius: 16px;
    background: var(--cream);
    box-shadow: 0 24px 60px rgba(24, 59, 58, 0.25);
}

.modal h2 {
    margin: 0 0 4px;
    font-size: 1.3rem;
}

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

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.modal-submit {
    margin-top: 6px;
    padding: 13px;
}

@media (max-width: 1000px) {
    .profile-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 760px) {
    .profile-content {
        width: min(100% - 32px, 1220px);
        padding-top: 36px;
    }

    .panel__header,
    .panel__actions {
        align-items: flex-start;
        flex-direction: column;
    }

    .panel__actions {
        width: 100%;
    }

    .panel__actions .primary-button {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .form-row {
        grid-template-columns: 1fr;
    }

    .panel {
        padding: 20px 18px;
    }

    .modal {
        padding: 25px 20px;
    }
}
</style>