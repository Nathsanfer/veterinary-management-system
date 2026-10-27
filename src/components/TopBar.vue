<script setup>
import { useRouter } from 'vue-router'
import { canAccess, displayName, displayRole, initials, signOut } from '../stores/auth'
import { resolvedTheme, toggleTheme } from '../stores/theme'
import { notify } from '../stores/toast'

const router = useRouter()

const navLinks = [
  { to: '/dashboard', label: 'Visão geral' },
  { to: '/calendar', label: 'Agenda' },
  { to: '/appointments', label: 'Atendimentos' },
  { to: '/services', label: 'Serviços' },
  { to: '/finances', label: 'Finanças' }
]

async function logout() {
  await signOut()
  notify('Você saiu da sua conta.', 'info')
  router.push('/')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__inner">
      <router-link class="brand" to="/dashboard" aria-label="Ir para o painel VetFlow">
        <span class="brand__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <ellipse cx="6.5" cy="9" rx="2" ry="2.6" />
            <ellipse cx="10.5" cy="5.4" rx="2" ry="2.6" />
            <ellipse cx="14.5" cy="5.4" rx="2" ry="2.6" />
            <ellipse cx="18.5" cy="9" rx="2" ry="2.6" />
            <path d="M12 11.2c-2.9 0-5.6 3.6-5.6 6.2 0 1.9 1.5 2.8 3.1 2.8 1.1 0 1.7-.5 2.5-.5s1.4.5 2.5.5c1.6 0 3.1-.9 3.1-2.8 0-2.6-2.7-6.2-5.6-6.2z" />
          </svg>
        </span>
        <span class="brand__copy">
          <strong>VetFlow</strong>
          <small>Clínica veterinária</small>
        </span>
      </router-link>

      <nav class="main-nav" aria-label="Navegação principal">
        <template v-for="link in navLinks" :key="link.to">
          <router-link v-if="canAccess(link.to)" :to="link.to" class="main-nav__link">
            {{ link.label }}
          </router-link>
        </template>
      </nav>

      <div class="topbar__actions">
        <button
          class="theme-toggle"
          type="button"
          :aria-label="resolvedTheme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
          :title="resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'"
          @click="toggleTheme"
        >
          <svg v-if="resolvedTheme === 'dark'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
          </svg>
        </button>

        <router-link class="profile-chip" to="/profile" aria-label="Abrir perfil">
          <span class="profile-chip__avatar" aria-hidden="true">{{ initials }}</span>
          <span class="profile-chip__text">
            <strong>{{ displayName }}</strong>
            <small>{{ displayRole }}</small>
          </span>
        </router-link>

        <button class="logout-button" type="button" @click="logout">Sair</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--line);
  background: var(--glass);
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  transition: background-color 0.35s, border-color 0.35s;
}

.topbar__inner {
  width: min(100% - 48px, 1280px);
  min-height: 74px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 24px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
  text-decoration: none;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px 12px 12px 4px;
  color: var(--accent-ink);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  box-shadow: 0 8px 18px -8px var(--accent);
  transition: transform 0.4s var(--ease);
}

.brand:hover .brand__mark {
  transform: rotate(-8deg) scale(1.05);
}

.brand__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1;
}

.brand__copy strong {
  font-size: 1.02rem;
  letter-spacing: -0.02em;
}

.brand__copy small {
  color: var(--muted);
  font-size: 0.56rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-3);
  transition: background-color 0.35s;
}

.main-nav__link {
  padding: 9px 14px;
  border-radius: 10px;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.2s, background-color 0.25s, box-shadow 0.25s, transform 0.2s var(--ease);
}

.main-nav__link:hover {
  color: var(--ink);
}

.main-nav__link:active {
  transform: scale(0.97);
}

.main-nav__link.router-link-active {
  color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.topbar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
}

.theme-toggle {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--ink-2);
  background: var(--surface);
  transition: transform 0.25s var(--ease), color 0.2s, background-color 0.2s, border-color 0.2s;
}

.theme-toggle:hover {
  color: var(--accent-soft-ink);
  border-color: var(--line-strong);
  transform: rotate(18deg);
}

.theme-toggle:active {
  transform: scale(0.92);
}

.theme-toggle svg {
  animation: spin-in 0.5s var(--ease);
}

@keyframes spin-in {
  from {
    opacity: 0;
    transform: rotate(-60deg) scale(0.6);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.profile-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  color: var(--ink);
  text-decoration: none;
  transition: background-color 0.2s;
}

.profile-chip:hover {
  background: var(--surface-3);
}

.profile-chip__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--accent-soft-ink);
  background: var(--accent-soft);
  font-size: 0.64rem;
  font-weight: 800;
}

.profile-chip__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  line-height: 1.1;
}

.profile-chip__text strong {
  overflow: hidden;
  max-width: 150px;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-chip__text small {
  color: var(--muted);
  font-size: 0.58rem;
  font-weight: 600;
}

.logout-button {
  padding: 9px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--muted);
  background: var(--surface);
  font-size: 0.7rem;
  font-weight: 700;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s, transform 0.2s var(--ease);
}

.logout-button:hover {
  color: var(--danger);
  border-color: var(--danger-soft);
  background: var(--danger-soft);
}

.logout-button:active {
  transform: scale(0.96);
}

@media (max-width: 1080px) {
  .topbar__inner {
    gap: 16px;
  }

  .profile-chip__text {
    display: none;
  }
}

@media (max-width: 860px) {
  .topbar__inner {
    width: min(100% - 28px, 1280px);
    grid-template-columns: 1fr auto;
    row-gap: 0;
    padding: 12px 0 0;
    min-height: 0;
  }

  .main-nav {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: stretch;
    overflow-x: auto;
    scrollbar-width: none;
    margin: 12px 0;
  }

  .main-nav::-webkit-scrollbar {
    display: none;
  }

  .main-nav__link {
    flex: 0 0 auto;
  }

  .topbar__actions {
    grid-row: 1;
    grid-column: 2;
  }

  .topbar__inner .brand {
    grid-row: 1;
  }
}

@media (max-width: 520px) {
  .logout-button {
    padding: 8px 10px;
  }
}
</style>
