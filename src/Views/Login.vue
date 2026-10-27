<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signIn } from '../stores/auth'
import { resolvedTheme, toggleTheme } from '../stores/theme'
import { notify } from '../stores/toast'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const remember = ref(true)
const submitting = ref(false)
const errorMessage = ref('')

async function submit() {
    errorMessage.value = ''
    submitting.value = true
    try {
        await signIn(email.value.trim(), password.value)
        notify('Login realizado. Bem-vindo de volta!')
        router.push('/dashboard')
    } catch (error) {
        errorMessage.value =
            error.message === 'Invalid login credentials'
                ? 'E-mail ou senha incorretos.'
                : 'Não foi possível entrar. Tente novamente.'
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <main class="login">
        <button
            class="login__theme icon-btn"
            type="button"
            :aria-label="resolvedTheme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
            @click="toggleTheme"
        >
            <svg v-if="resolvedTheme === 'dark'" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
            </svg>
        </button>

        <div class="login__shell">
            <section class="login__brand" aria-label="Sobre o VetFlow">
                <div class="login__orb login__orb--one" aria-hidden="true"></div>
                <div class="login__orb login__orb--two" aria-hidden="true"></div>

                <div class="login__brand-top">
                    <span class="login__mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <ellipse cx="6.5" cy="9" rx="2" ry="2.6" />
                            <ellipse cx="10.5" cy="5.4" rx="2" ry="2.6" />
                            <ellipse cx="14.5" cy="5.4" rx="2" ry="2.6" />
                            <ellipse cx="18.5" cy="9" rx="2" ry="2.6" />
                            <path d="M12 11.2c-2.9 0-5.6 3.6-5.6 6.2 0 1.9 1.5 2.8 3.1 2.8 1.1 0 1.7-.5 2.5-.5s1.4.5 2.5.5c1.6 0 3.1-.9 3.1-2.8 0-2.6-2.7-6.2-5.6-6.2z" />
                        </svg>
                    </span>
                    <strong>VetFlow</strong>
                </div>

                <div class="login__brand-copy">
                    <p class="login__kicker">GESTÃO VETERINÁRIA, SEM COMPLICAÇÃO</p>
                    <h1>Sua clínica, organizada.</h1>
                    <p>Organize sua agenda, seus atendimentos e o faturamento com mais clareza.</p>
                </div>

                <ul class="login__highlights">
                    <li><span>✳</span>Agenda por veterinário</li>
                    <li><span>✳</span>Atendimento do tutor à conclusão</li>
                    <li><span>✳</span>Financeiro em tempo real</li>
                </ul>
            </section>

            <section class="login__form-side">
                <form class="login__form" @submit.prevent="submit">
                    <p class="eyebrow">ACESSO À CLÍNICA</p>
                    <h2>Bem-vindo de volta!</h2>
                    <p class="login__intro">Entre para acompanhar a agenda, os atendimentos e os resultados da equipe.</p>

                    <label class="field" for="email">
                        E-mail
                        <input
                            id="email"
                            v-model="email"
                            class="input"
                            name="email"
                            type="email"
                            autocomplete="email"
                            placeholder="seu@email.com"
                            required
                        />
                    </label>

                    <label class="field" for="password">
                        Senha
                        <span class="password-field">
                            <input
                                id="password"
                                v-model="password"
                                class="input"
                                name="password"
                                :type="showPassword ? 'text' : 'password'"
                                autocomplete="current-password"
                                placeholder="Digite sua senha"
                                required
                            />
                            <button
                                class="password-toggle"
                                type="button"
                                :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                                @click="showPassword = !showPassword"
                            >
                                {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                            </button>
                        </span>
                    </label>

                    <div class="login__options">
                        <label class="remember">
                            <input v-model="remember" type="checkbox" name="remember" />
                            <span class="remember__box" aria-hidden="true"></span>
                            Lembrar de mim
                        </label>
                        <a class="login__forgot" href="#">Esqueci a senha</a>
                    </div>

                    <p v-if="errorMessage" class="login__error" role="alert">{{ errorMessage }}</p>

                    <button class="btn btn--primary btn--block login__submit" type="submit" :disabled="submitting">
                        <span v-if="submitting" class="spinner" aria-hidden="true"></span>
                        {{ submitting ? 'Entrando...' : 'Acessar sistema' }}
                        <span v-if="!submitting" aria-hidden="true">→</span>
                    </button>
                </form>
            </section>
        </div>
    </main>
</template>

<style scoped>
.login {
    position: relative;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 28px;
    background:
        radial-gradient(900px 500px at 10% -10%, var(--accent-soft), transparent 60%),
        var(--bg);
}

.login__theme {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 2;
}

.login__shell {
    width: min(100%, 1040px);
    min-height: 580px;
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 26px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    animation: rise 0.7s var(--ease) both;
}

/* Painel de marca: verde escuro nos dois temas */

.login__brand {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 40px;
    padding: 40px 44px;
    overflow: hidden;
    color: #e7f0de;
    background: linear-gradient(150deg, #3a6532 0%, #26461f 70%, #1d3819 100%);
}

.login__orb {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(170, 214, 140, 0.28), transparent 65%);
    pointer-events: none;
    animation: drift 14s ease-in-out infinite alternate;
}

.login__orb--one {
    top: -90px;
    right: -70px;
    width: 280px;
    height: 280px;
}

.login__orb--two {
    bottom: -120px;
    left: -60px;
    width: 300px;
    height: 300px;
    animation-delay: -6s;
}

@keyframes drift {
    to {
        transform: translate(18px, -14px) scale(1.06);
    }
}

.login__brand-top {
    position: relative;
    display: flex;
    align-items: center;
    gap: 11px;
    font-size: 1rem;
    letter-spacing: -0.02em;
}

.login__mark {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px 12px 12px 4px;
    color: #26461f;
    background: #e7f0de;
}

.login__brand-copy {
    position: relative;
}

.login__kicker {
    margin: 0 0 14px;
    color: #b4d99a;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.16em;
}

.login__brand h1 {
    margin: 0 0 14px;
    color: #fff;
    font-size: clamp(1.9rem, 3.2vw, 2.6rem);
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.05em;
}

.login__brand-copy p:last-child {
    max-width: 330px;
    margin: 0;
    color: #cfe2c2;
    font-size: 0.8rem;
    line-height: 1.7;
}

.login__highlights {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.login__highlights li {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #e1edd6;
    font-size: 0.72rem;
    font-weight: 600;
}

.login__highlights span {
    color: #b4d99a;
    font-size: 0.8rem;
}

/* Formulário */

.login__form-side {
    display: grid;
    place-items: center;
    padding: 40px 44px;
}

.login__form {
    width: 100%;
    max-width: 360px;
}

@keyframes shake {
    0%,
    100% {
        transform: translateX(0);
    }
    20% {
        transform: translateX(-7px);
    }
    40% {
        transform: translateX(6px);
    }
    60% {
        transform: translateX(-4px);
    }
    80% {
        transform: translateX(2px);
    }
}

.login__form h2 {
    margin: 0 0 10px;
    color: var(--ink);
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -0.05em;
}

.login__intro {
    margin: 0 0 28px;
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.6;
}

.login__form .field {
    margin-bottom: 18px;
}

.password-field {
    position: relative;
    display: block;
}

.password-field .input {
    padding-right: 84px;
}

.password-toggle {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    padding: 6px 10px;
    border: 0;
    border-radius: 8px;
    color: var(--accent-soft-ink);
    background: transparent;
    font-size: 0.64rem;
    font-weight: 800;
    transition: background-color 0.2s;
}

.password-toggle:hover {
    background: var(--accent-soft);
}

.login__options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 4px 0 24px;
}

.remember {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--ink-2);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
}

.remember input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.remember__box {
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border: 1.5px solid var(--line-strong);
    border-radius: 5px;
    transition: background-color 0.2s, border-color 0.2s;
}

.remember input:checked + .remember__box {
    border-color: var(--accent);
    background: var(--accent);
}

.remember input:checked + .remember__box::after {
    width: 5px;
    height: 9px;
    margin-top: -2px;
    border: solid var(--accent-ink);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    content: '';
}

.remember input:focus-visible + .remember__box {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.login__forgot {
    color: var(--accent-soft-ink);
    font-size: 0.7rem;
    font-weight: 700;
    text-decoration: none;
}

.login__forgot:hover {
    text-decoration: underline;
}

.login__error {
    margin: -6px 0 16px;
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--danger);
    background: var(--danger-soft);
    font-size: 0.72rem;
    font-weight: 700;
    animation: shake 0.45s var(--ease);
}

.login__submit {
    min-height: 48px;
    font-size: 0.8rem;
}

.spinner {
    width: 15px;
    height: 15px;
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

@media (max-width: 820px) {
    .login__shell {
        grid-template-columns: 1fr;
        min-height: 0;
    }

    .login__brand {
        gap: 26px;
        padding: 28px 26px;
    }

    .login__highlights {
        display: none;
    }

    .login__form-side {
        padding: 30px 26px 36px;
    }
}

@media (max-width: 480px) {
    .login {
        padding: 14px;
    }

    .login__brand-copy p:last-child {
        display: none;
    }
}
</style>
