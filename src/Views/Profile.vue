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
import { askConfirm } from '../stores/confirm'
import { notify } from '../stores/toast'
import { resolvedTheme, themePreference } from '../stores/theme'

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
    notify('Nome atualizado.')
}

const passwordForm = ref({ next: '', confirm: '' })
const passwordSaving = ref(false)
const passwordError = ref('')

async function changePassword() {
    passwordError.value = ''

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
    notify('Senha alterada com sucesso.')
}

/* ---------- Aparência ---------- */
const themeOptions = [
    { key: 'system', label: 'Sistema' },
    { key: 'light', label: 'Claro' },
    { key: 'dark', label: 'Escuro' }
]

/* ---------- CRUD de funcionários (somente admin) ---------- */
const isModalOpen = ref(false)
const editingId = ref(null)
const saving = ref(false)
const saveError = ref('')

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
    const wasEditing = Boolean(editingId.value)
    try {
        const payload = {
            nome: memberForm.value.name.trim(),
            email: memberForm.value.email.trim(),
            cargo: memberForm.value.role,
            crmv: memberForm.value.crmv.trim(),
            telefone: memberForm.value.phone.trim(),
            senha: memberForm.value.password
        }
        if (wasEditing) {
            await callFunction({ acao: 'atualizar', id: editingId.value, ...payload })
        } else {
            await callFunction({ acao: 'criar', ...payload })
        }
        isModalOpen.value = false
        editingId.value = null
        memberForm.value = blankMember()
        notify(wasEditing ? 'Funcionário atualizado.' : 'Funcionário cadastrado.')
        await carregarEquipe()
        await loadProfile()
    } catch (error) {
        saveError.value = error.message
    } finally {
        saving.value = false
    }
}

async function toggleActive(member) {
    const next = !member.active
    if (!next) {
        const confirmed = await askConfirm({
            title: `Desativar ${member.name}?`,
            message: 'Essa pessoa não conseguirá mais entrar no sistema. Você pode reativá-la depois.',
            confirmLabel: 'Desativar',
            danger: true
        })
        if (!confirmed) return
    }
    try {
        await callFunction({ acao: 'definir_ativo', id: member.id, ativo: next })
        notify(next ? `${member.name} foi reativado.` : `${member.name} foi desativado.`)
        await carregarEquipe()
    } catch (error) {
        notify(error.message, 'error')
    }
}

async function removeMember(member) {
    const confirmed = await askConfirm({
        title: `Excluir ${member.name} definitivamente?`,
        message: 'Esta ação não pode ser desfeita. Se a pessoa só vai se afastar, prefira desativar.',
        confirmLabel: 'Excluir',
        danger: true
    })
    if (!confirmed) return
    try {
        const result = await callFunction({ acao: 'excluir', id: member.id })
        notify(
            result?.veterinarioMantido
                ? 'Acesso removido. O cadastro do veterinário foi mantido (inativo) porque há atendimentos ligados a ele.'
                : 'Funcionário excluído.',
            'info'
        )
        await carregarEquipe()
    } catch (error) {
        notify(error.message, 'error')
    }
}

onMounted(carregarEquipe)
</script>

<template>
    <TopBar />

    <main class="page profile-page">
        <header class="page-header">
            <div>
                <p class="eyebrow">Minha conta</p>
                <h1 class="page-title">Perfil</h1>
                <p class="page-subtitle">Seus dados de acesso, preferências e a equipe da clínica.</p>
            </div>
        </header>

        <section class="profile-grid">
            <!-- Meus dados -->
            <div class="stack">
                <article class="card me-card">
                    <div class="me-head">
                        <span class="me-avatar" aria-hidden="true">{{ initials }}</span>
                        <div class="me-identity">
                            <h2>{{ profile?.nome ?? myEmail }}</h2>
                            <span class="badge badge--accent">{{ myRoleLabel }}</span>
                        </div>
                    </div>

                    <dl class="data-list">
                        <div class="data-row">
                            <dt>Nome</dt>
                            <dd v-if="!editingName">
                                <span>{{ profile?.nome ?? '—' }}</span>
                                <button class="btn btn--ghost btn--sm" type="button" @click="startEditName">Editar</button>
                            </dd>
                            <dd v-else class="data-row__edit">
                                <form class="inline-form" @submit.prevent="saveName">
                                    <input v-model="nameDraft" class="input" required maxlength="120" aria-label="Nome" />
                                    <div class="inline-form__actions">
                                        <button class="btn btn--primary btn--sm" type="submit" :disabled="nameSaving">
                                            {{ nameSaving ? 'Salvando...' : 'Salvar' }}
                                        </button>
                                        <button class="btn btn--ghost btn--sm" type="button" :disabled="nameSaving" @click="editingName = false">
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                                <p v-if="nameError" class="text-error" role="alert">{{ nameError }}</p>
                            </dd>
                        </div>
                        <div class="data-row">
                            <dt>E-mail</dt>
                            <dd>{{ myEmail }}</dd>
                        </div>
                        <div class="data-row">
                            <dt>Cargo</dt>
                            <dd>{{ myRoleLabel }}</dd>
                        </div>
                    </dl>
                </article>

                <article class="card panel">
                    <h2 class="panel-title">Aparência</h2>
                    <p class="panel-hint">Escolha como o VetFlow aparece para você. “Sistema” segue o modo do seu computador.</p>

                    <div class="theme-options" role="radiogroup" aria-label="Tema da interface">
                        <button
                            v-for="option in themeOptions"
                            :key="option.key"
                            class="theme-option"
                            :class="[`theme-option--${option.key}`, { 'is-selected': themePreference === option.key }]"
                            type="button"
                            role="radio"
                            :aria-checked="themePreference === option.key"
                            @click="themePreference = option.key"
                        >
                            <span class="theme-option__preview" aria-hidden="true">
                                <span class="theme-option__bar"></span>
                                <span class="theme-option__bar theme-option__bar--short"></span>
                                <span class="theme-option__dot"></span>
                            </span>
                            <span class="theme-option__label">{{ option.label }}</span>
                        </button>
                    </div>
                    <p class="panel-hint panel-hint--small">Tema em uso agora: {{ resolvedTheme === 'dark' ? 'escuro' : 'claro' }}.</p>
                </article>

                <article class="card panel">
                    <h2 class="panel-title">Alterar senha</h2>
                    <form class="password-form" @submit.prevent="changePassword">
                        <label class="field">
                            Nova senha
                            <input v-model="passwordForm.next" class="input" type="password" autocomplete="new-password" placeholder="Mínimo de 6 caracteres" />
                        </label>
                        <label class="field">
                            Confirmar nova senha
                            <input v-model="passwordForm.confirm" class="input" type="password" autocomplete="new-password" placeholder="Repita a senha" />
                        </label>
                        <p v-if="passwordError" class="text-error" role="alert">{{ passwordError }}</p>
                        <button class="btn btn--primary" type="submit" :disabled="passwordSaving">
                            {{ passwordSaving ? 'Salvando...' : 'Atualizar senha' }}
                        </button>
                    </form>
                </article>
            </div>

            <!-- Equipe -->
            <article class="card panel team-panel">
                <div class="panel__header">
                    <div>
                        <h2 class="panel-title">Equipe</h2>
                        <p class="panel-hint">{{ activeCount }} ativos · {{ team.length }} no total</p>
                    </div>
                    <button v-if="isAdmin" class="btn btn--primary btn--sm" type="button" @click="openCreateModal">
                        <span aria-hidden="true">+</span> Novo funcionário
                    </button>
                </div>

                <div class="team-filter">
                    <div class="segmented" role="group" aria-label="Filtrar equipe">
                        <button
                            v-for="item in statusFilters"
                            :key="item.key"
                            type="button"
                            :class="{ 'is-active': statusFilter === item.key }"
                            :aria-pressed="statusFilter === item.key"
                            @click="statusFilter = item.key"
                        >
                            {{ item.label }}
                        </button>
                    </div>
                </div>

                <p v-if="loadError" class="text-error" role="alert">{{ loadError }}</p>

                <div v-if="loading && !team.length" class="skeleton-list">
                    <div v-for="n in 3" :key="n" class="skeleton skeleton-row"></div>
                </div>

                <div v-else-if="!filteredTeam.length" class="empty-state">
                    <span class="empty-state__icon" aria-hidden="true">♡</span>
                    <strong>Nenhum funcionário encontrado</strong>
                    <span>Ajuste o filtro para ver mais pessoas da equipe.</span>
                </div>

                <div v-else class="table-wrap">
                    <table class="table team-table">
                        <thead>
                            <tr>
                                <th>Funcionário</th>
                                <th>Cargo</th>
                                <th>Contato</th>
                                <th>Status</th>
                                <th v-if="isAdmin" class="align-right">Ações</th>
                            </tr>
                        </thead>
                        <TransitionGroup name="list" tag="tbody">
                            <tr v-for="member in filteredTeam" :key="member.id" :class="{ 'is-inactive': !member.active }">
                                <td>
                                    <div class="member-cell">
                                        <span class="member-avatar" aria-hidden="true">{{ memberInitials(member.name) }}</span>
                                        <div class="member-cell__text">
                                            <strong>
                                                {{ member.name }}
                                                <span v-if="member.id === session?.user?.id" class="badge badge--accent badge--mini">Você</span>
                                            </strong>
                                            <small v-if="member.crmv">CRMV {{ member.crmv }}</small>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="badge badge--neutral">{{ cargoLabels[member.role] ?? member.role }}</span></td>
                                <td>
                                    <span class="contact">{{ member.email || '—' }}</span>
                                    <small v-if="member.phone" class="sub-line">{{ member.phone }}</small>
                                </td>
                                <td>
                                    <span class="badge" :class="member.active ? 'badge--success' : 'badge--danger'">
                                        {{ member.active ? 'Ativo' : 'Inativo' }}
                                    </span>
                                </td>
                                <td v-if="isAdmin" class="align-right">
                                    <div class="row-actions">
                                        <button class="btn btn--ghost btn--sm" type="button" @click="openEditModal(member)">Editar</button>
                                        <button
                                            v-if="member.id !== session?.user?.id"
                                            class="btn btn--ghost btn--sm"
                                            type="button"
                                            @click="toggleActive(member)"
                                        >
                                            {{ member.active ? 'Desativar' : 'Ativar' }}
                                        </button>
                                        <button
                                            v-if="member.id !== session?.user?.id"
                                            class="btn btn--danger btn--sm"
                                            type="button"
                                            @click="removeMember(member)"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </TransitionGroup>
                    </table>
                </div>
            </article>
        </section>
    </main>

    <Transition name="overlay">
        <div v-if="isModalOpen" class="overlay" @click.self="closeModal">
            <form class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="member-title" @submit.prevent="saveMember">
                <button class="modal-close" type="button" aria-label="Fechar" @click="closeModal">×</button>
                <p class="eyebrow">Equipe da clínica</p>
                <h2 id="member-title" class="modal-title">{{ editingId ? 'Editar funcionário' : 'Novo funcionário' }}</h2>

                <div class="form-stack">
                    <label class="field">
                        Nome completo
                        <input v-model="memberForm.name" class="input" required maxlength="120" placeholder="Ex.: Ana Souza" />
                    </label>

                    <div class="form-row">
                        <label class="field">
                            E-mail
                            <input v-model="memberForm.email" class="input" type="email" required autocomplete="off" placeholder="nome@clinica.com" />
                        </label>
                        <label class="field">
                            Cargo
                            <select v-model="memberForm.role" class="input">
                                <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                                    {{ option.label }}
                                </option>
                            </select>
                        </label>
                    </div>

                    <label class="field">
                        {{ editingId ? 'Nova senha (opcional)' : 'Senha inicial' }}
                        <input
                            v-model="memberForm.password"
                            class="input"
                            type="password"
                            minlength="6"
                            autocomplete="new-password"
                            :required="!editingId"
                            :placeholder="editingId ? 'Deixe em branco para manter' : 'Mínimo de 6 caracteres'"
                        />
                    </label>

                    <div v-if="memberForm.role === 'veterinario'" class="form-row">
                        <label class="field">
                            CRMV
                            <input v-model="memberForm.crmv" class="input" required placeholder="Ex.: SP-12345" />
                        </label>
                        <label class="field">
                            Telefone
                            <input v-model="memberForm.phone" class="input" placeholder="(19) 99999-9999" />
                        </label>
                    </div>
                </div>

                <p v-if="saveError" class="text-error save-error" role="alert">{{ saveError }}</p>

                <button class="btn btn--primary btn--block submit" type="submit" :disabled="saving">
                    <span v-if="saving" class="spinner" aria-hidden="true"></span>
                    {{ saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar funcionário' }}
                </button>
            </form>
        </div>
    </Transition>
</template>

<style scoped>
.profile-page {
    display: flex;
    flex-direction: column;
    gap: 22px;
}

.page-header {
    margin-bottom: 0;
}

.profile-grid {
    display: grid;
    grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.4fr);
    gap: 18px;
    align-items: start;
}

.stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.panel {
    padding: 24px 26px;
}

.panel-title {
    color: var(--ink);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.03em;
}

.panel-hint {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 0.7rem;
    line-height: 1.55;
}

.panel-hint--small {
    margin-top: 14px;
    font-size: 0.64rem;
}

.panel__header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
}

/* Cartão "Meu perfil" */

.me-card {
    padding: 26px;
    background:
        linear-gradient(160deg, var(--accent-soft), transparent 60%),
        var(--surface);
}

.me-head {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 22px;
}

.me-avatar {
    display: grid;
    place-items: center;
    width: 62px;
    height: 62px;
    flex: 0 0 auto;
    border-radius: 20px;
    color: var(--accent-ink);
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
    box-shadow: 0 12px 24px -12px var(--accent);
    font-size: 1.1rem;
    font-weight: 800;
    transition: transform 0.4s var(--ease);
}

.me-card:hover .me-avatar {
    transform: rotate(-5deg);
}

.me-identity h2 {
    color: var(--ink);
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.035em;
}

.me-identity .badge {
    margin-top: 7px;
}

.data-list {
    margin: 0;
    padding: 0;
}

.data-row {
    display: grid;
    grid-template-columns: 90px minmax(0, 1fr);
    align-items: center;
    gap: 14px;
    padding: 13px 0;
    border-top: 1px solid var(--line);
}

.data-row dt {
    color: var(--muted);
    font-size: 0.64rem;
    font-weight: 700;
}

.data-row dd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 0;
    color: var(--ink);
    font-size: 0.74rem;
    font-weight: 600;
    word-break: break-word;
}

.data-row__edit {
    display: block !important;
}

.inline-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.inline-form__actions {
    display: flex;
    gap: 8px;
}

/* Aparência */

.theme-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 18px;
}

.theme-option {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    border: 1.5px solid var(--line);
    border-radius: 14px;
    background: var(--surface-2);
    text-align: left;
    transition: border-color 0.25s, transform 0.25s var(--ease), box-shadow 0.25s;
}

.theme-option:hover {
    transform: translateY(-2px);
    border-color: var(--line-strong);
}

.theme-option.is-selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
}

.theme-option__label {
    padding: 0 4px 2px;
    color: var(--ink);
    font-size: 0.7rem;
    font-weight: 700;
}

.theme-option__preview {
    position: relative;
    display: block;
    height: 64px;
    border-radius: 9px;
    overflow: hidden;
    background: #f4f6f1;
    box-shadow: inset 0 0 0 1px rgba(24, 59, 58, 0.08);
}

.theme-option__preview::before {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    content: '';
}

.theme-option__bar {
    position: absolute;
    top: 12px;
    left: 10px;
    width: 58%;
    height: 7px;
    border-radius: 4px;
    background: #31572c;
}

.theme-option__bar--short {
    top: 26px;
    width: 38%;
    background: #c9d6c6;
}

.theme-option__dot {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #e5efdf;
}

.theme-option--dark .theme-option__preview {
    background: #0c1615;
}

.theme-option--dark .theme-option__bar {
    background: #8fbd73;
}

.theme-option--dark .theme-option__bar--short {
    background: #35564f;
}

.theme-option--dark .theme-option__dot {
    background: #1c3431;
}

/* Preview "Sistema": metade clara, metade escura */

.theme-option--system .theme-option__preview {
    background: linear-gradient(90deg, #f4f6f1 50%, #0c1615 50%);
}

.theme-option--system .theme-option__bar {
    background: #31572c;
}

.theme-option--system .theme-option__bar--short {
    background: #35564f;
}

.theme-option--system .theme-option__dot {
    background: #1c3431;
}

/* Formulários */

.password-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 18px;
}

.password-form .btn {
    align-self: flex-start;
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

.modal-title {
    margin: 0 0 22px;
    padding-right: 28px;
    color: var(--ink);
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: -0.05em;
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

/* Equipe */

.team-filter {
    margin: 18px 0 6px;
}

.skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 16px;
}

.skeleton-row {
    height: 56px;
}

.team-table {
    margin-top: 6px;
}

.team-table tr.is-inactive td {
    opacity: 0.6;
}

.member-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.member-avatar {
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

.member-cell__text strong {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--ink);
    font-size: 0.74rem;
}

.member-cell__text small,
.sub-line {
    display: block;
    margin-top: 2px;
    color: var(--muted);
    font-size: 0.62rem;
}

.badge--mini {
    padding: 2px 7px;
    font-size: 0.52rem;
}

.contact {
    color: var(--ink-2);
    font-size: 0.72rem;
}

.row-actions {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
}

.table-wrap {
    margin-top: 4px;
}

.list-enter-active,
.list-leave-active {
    transition: opacity 0.3s var(--ease), transform 0.3s var(--ease);
}

@media (max-width: 1080px) {
    .profile-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 680px) {
    .data-row {
        grid-template-columns: 1fr;
        gap: 6px;
    }

    .theme-options {
        gap: 8px;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .panel {
        padding: 20px 17px;
    }
}
</style>
