<template>
    <main class="login-page">
        <div class="login-shell">
            <section class="welcome-panel" aria-label="Sobre o VetFlow">

                <p class="panel-kicker">GESTÃO VETERINÁRIA, SEM COMPLICAÇÃO</p>
                <h1>Sua clínica, organizada.</h1>
                <p class="panel-description">Organize sua agenda, seus atendimentos e o faturamento com mais clareza.</p>
                <div class="panel-rule" aria-hidden="true"></div>
                <p class="panel-note">Do tutor ao atendimento finalizado, acompanhe cada etapa da operação.</p>
            </section>

            <section class="login-content" aria-label="Acesso à conta">
                <form class="login-card" @submit.prevent="$router.push('/dashboard')">
                <p class="eyebrow">ACESSO À CLÍNICA</p>
                <h2>Bem-vindo de volta!</h2>
                <p class="card-introduction">Entre para acompanhar a agenda, os atendimentos e os resultados da sua equipe.</p>

                <label for="email">EMAIL</label>
                <input id="email" name="email" type="email" autocomplete="email" placeholder="seu@email.com" />

                <label for="password">SENHA</label>
                <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" />

                <div class="login-options">
                    <label class="remember-option" for="remember">
                        <input id="remember" name="remember" type="checkbox" />
                        <span>Lembre de mim</span>
                    </label>
                    <a class="forgot-link" href="#">Esqueci a senha</a>
                </div>

                <button type="submit">
                    Acessar sistema
                    <span aria-hidden="true">→</span>
                </button>

                </form>
            </section>
        </div>
    </main>
</template>

<style scoped>
:global(*) {
    box-sizing: border-box;
}

:global(body) {
    margin: 0;
}

.login-page {
    min-height: 100vh;
    padding: 30px;
    overflow: hidden;
    color: var(--ink);
    background: #f1f3ed;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-shell {
    width: min(100%, 1080px);
    height: 550px;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(300px, 0.92fr) minmax(420px, 1.08fr);
    border: 1px solid rgba(40, 75, 80, 0.1);
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 24px 70px rgba(40, 75, 80, 0.13);
}

.back-link,
.forgot-link,
.register-prompt a {
    color: #557174;
    text-decoration: none;
    transition: color 180ms ease;
}

.back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(247, 248, 243, 0.72);
    font-size: 0.69rem;
}

.back-link span {
    font-size: 1.1rem;
    transition: transform 180ms ease;
}

.back-link:hover span {
    transform: translateX(-3px);
}

.back-link:hover,
.forgot-link:hover,
.register-prompt a:hover {
    color: var(--ink);
}

.back-link:hover {
    color: #fff;
}

.welcome-panel {
    position: relative;
    min-height: 660px;
    padding: 124px 56px 52px;
    overflow: hidden;
    color: #95b991;
    background: #31572C;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.welcome-panel::before,
.welcome-panel::after {
    position: absolute;
    content: '';
    border: 1px solid rgba(214, 230, 213, 0.16);
    border-radius: 50%;
}

.welcome-panel::before {
    width: 380px;
    height: 380px;
    right: -170px;
    top: -110px;
}

.welcome-panel::after {
    width: 540px;
    height: 540px;
    right: -260px;
    top: -190px;
}

.brand-mark {
    width: 42px;
    height: 42px;
    margin: 0 0 28px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--accent);
    background: #dbe9dc;
    box-shadow: 0 8px 18px rgba(9, 39, 43, 0.18);
    font-size: 1.2rem;
    font-weight: 800;
}

.panel-kicker {
    margin-top: -10rem;
    color: #accba7;
    font-size: 0.61rem;
    font-weight: 800;
    letter-spacing: 0.17em;
}

.welcome-panel h1 {
    max-width: 330px;
    margin: 0;
    color: #f7f8f3;
    font-size: clamp(2.7rem, 5vw, 4.35rem);
    font-weight: 800;
    letter-spacing: -0.055em;
    line-height: 0.98;
}

.panel-description {
    max-width: 280px;
    margin: 24px 0 0;
    color: rgba(247, 248, 243, 0.75);
    font-size: 0.91rem;
    line-height: 1.7;
}

.panel-rule {
    width: 46px;
    height: 2px;
    margin: 20px 0 20px;
    background: #a6c7ba;
}

.panel-note {
    max-width: 245px;
    margin: 0;
    color: rgba(247, 248, 243, 0.52);
    font-size: 0.7rem;
    line-height: 1.7;
}

.login-content {
    padding: 72px clamp(34px, 7vw, 88px);
    display: flex;
    align-items: center;
    margin-top: -5rem;
}

.login-card {
    width: 100%;
    max-width: 410px;
}

.eyebrow {
    margin: 0 0 10px;
    color: #accba7;
    font-size: 0.59rem;
    font-weight: 800;
    letter-spacing: 0.14em;
}

.login-card h2 {
    margin: 0;
    font-size: 1.55rem;
    font-weight: 650;
}

.card-introduction {
    margin: 10px 0 28px;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.6;
}

.login-card label {
    display: block;
    margin-bottom: 7px;
    color: #132A13;
    font-size: 0.68rem;
    font-weight: 800;
}

.login-card input[type='email'],
.login-card input[type='password'] {
    width: 100%;
    height: 46px;
    margin-bottom: 20px;
    padding: 0 13px;
    border: 1px solid #d4dfda;
    border-radius: 8px;
    outline: none;
    color: #132A13;
    background: #fbfcf9;
    font: inherit;
    font-size: 0.85rem;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    box-sizing: border-box;
}

.login-card input::placeholder {
    color: #9aa8a5;
}

.login-card input[type='email']:focus,
.login-card input[type='password']:focus {
    border-color: #31572C;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(102, 139, 99, 0.16);
}

.login-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: -3px;
}

.login-card .remember-option {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
}

.remember-option input {
    width: 14px;
    height: 14px;
    margin: 0;
    accent-color: #31572C;
}

.forgot-link {
    font-size: 0.72rem;
}

.login-card button {
    width: 100%;
    height: 46px;
    margin-top: 28px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: #31572C;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 800;
    cursor: pointer;
    transition: background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.login-card button:hover {
    background: #274623;
    box-shadow: 0 8px 18px rgba(40, 75, 80, 0.18);
    transform: translateY(-1px);
}

.login-card button span {
    font-size: 1.2rem;
}

.register-prompt {
    margin: 24px 0 0;
    color: #31572C;
    font-size: 0.72rem;
    text-align: center;
}

.register-prompt a {
    font-weight: 800;
}

@media (max-width: 480px) {
    .login-page {
        padding: 0;
    }

    .login-shell {
        min-height: 100vh;
        border: 0;
        border-radius: 0;
        display: block;
    }

    .welcome-panel {
        min-height: 340px;
        padding: 104px 28px 42px;
    }

    .welcome-panel h1 {
        max-width: 280px;
        font-size: 3rem;
    }

    .panel-description,
    .panel-rule,
    .panel-note {
        display: none;
    }

    .login-navigation {
        top: 24px;
        left: 28px;
    }

    .login-content {
        padding: 42px 24px 48px;
    }
}

@media (min-width: 481px) and (max-width: 820px) {
    .login-page {
        padding: 16px;
    }

    .login-shell {
        grid-template-columns: minmax(250px, 0.8fr) minmax(360px, 1.2fr);
    }

    .welcome-panel {
        padding-right: 32px;
        padding-left: 32px;
    }

    .login-content {
        padding-right: 38px;
        padding-left: 38px;
    }
}
</style>