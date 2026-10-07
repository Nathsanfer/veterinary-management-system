<script setup>
import { useRouter } from 'vue-router'
import { displayName, displayRole, initials, signOut } from '../stores/auth'

const router = useRouter()

async function logout() {
  await signOut()
  router.push('/')
}
</script>

<template>
  <header class="top-bar">
    <div class="top-bar__inner">
      <router-link class="brand" to="/dashboard" aria-label="Ir para o dashboard VetFlow">
        <span class="brand__copy">
          <strong>Gestão Completa</strong>
          <small>Clínica veterinária</small>
        </span>
      </router-link>

      <nav class="main-nav" aria-label="Navegação principal">
        <router-link to="/dashboard">Visão geral</router-link>
        <router-link to="/calendar">Agenda</router-link>
        <router-link to="/appointments">Atendimentos</router-link>
        <router-link to="/services">Serviços</router-link>
        <router-link to="/finances">Finanças</router-link>
      </nav>

      <div class="top-bar__actions">
        <router-link class="profile-link" to="/profile" aria-label="Abrir perfil">
          <span class="profile-link__avatar" aria-hidden="true">{{ initials }}</span>
          <span class="profile-link__text">
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
.top-bar {
  --topbar-ink: #183b3a;
  --topbar-muted: #6c8580;
  --topbar-line: #dce8df;
  --topbar-accent: #31572c;
  width: 100%;
  min-height: 76px;
  border-bottom: 1px solid var(--topbar-line);
  background: #f3f5f1;
  box-shadow: 0 8px 24px rgba(24, 59, 58, 0.05);
}

.top-bar__inner {
  width: min(100% - 48px, 1380px);
  min-height: 76px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 24px;
}

.brand,
.profile-link,
.main-nav a {
  text-decoration: none;
}

.brand {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--topbar-ink);
}

.brand__mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid #c7ddc5;
  border-radius: 12px 12px 12px 4px;
  color: #f7f8f3;
  background: var(--topbar-accent);
  box-shadow: 0 5px 12px rgba(49, 87, 44, 0.18);
  font-size: 1.05rem;
  font-weight: 800;
}

.brand__copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  line-height: 1;
}

.brand__copy strong {
  font-size: 1.04rem;
  letter-spacing: -0.02em;
}

.brand__copy small,
.profile-link__text small {
  color: var(--topbar-muted);
  font-size: 0.57rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.main-nav {
  min-width: 0;
  justify-self: center;
  display: flex;
  align-items: center;
  gap: 26px;
}

.main-nav a {
  position: relative;
  padding: 29px 12px 26px;
  color: var(--topbar-muted);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  transition: color 180ms ease;
}

.main-nav a::after {
  position: absolute;
  right: 12px;
  bottom: -1px;
  left: 12px;
  height: 3px;
  content: '';
  border-radius: 3px 3px 0 0;
  background: transparent;
  transition: background 180ms ease;
}

.main-nav a:hover,
.main-nav a.router-link-active {
  color: var(--topbar-ink);
}

.main-nav a.router-link-active::after {
  background: #99b55f;
}

.top-bar__actions {
  min-width: 0;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 20px;
}

.profile-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--topbar-ink);
}

.profile-link__avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid #c3d7cf;
  border-radius: 50%;
  color: #31572c;
  background: #e5efe2;
  font-size: 0.63rem;
  font-weight: 800;
}

.profile-link__text {
  display: flex;
  flex-direction: column;
  gap: 8px;
  line-height: 1;
}

.profile-link__text strong {
  font-size: 0.7rem;
}

.logout-button {
  border: 1px solid var(--topbar-line);
  border-radius: 8px;
  padding: 7px 13px;
  color: var(--topbar-muted);
  background: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  transition: color 180ms ease, border-color 180ms ease;
}

.logout-button:hover {
  color: var(--topbar-ink);
  border-color: #c3d7cf;
}

.profile-link__arrow {
  margin-left: 2px;
  color: var(--topbar-muted);
  font-size: 1rem;
}

@media (max-width: 1080px) {
  .top-bar__inner {
    gap: 16px;
  }

  .main-nav a {
    padding-right: 8px;
    padding-left: 8px;
  }

  .main-nav a::after {
    right: 8px;
    left: 8px;
  }

  .status {
    display: none;
  }
}

@media (max-width: 760px) {
  .top-bar__inner {
    width: min(100% - 28px, 1380px);
    min-height: 68px;
    display: flex;
    flex-wrap: wrap;
    gap: 0 18px;
    padding: 12px 0 0;
  }

  .top-bar {
    min-height: 116px;
  }

  .main-nav {
    order: 3;
    width: 100%;
    justify-self: auto;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .main-nav::-webkit-scrollbar {
    display: none;
  }

  .main-nav a {
    padding: 14px 10px 15px;
    font-size: 0.69rem;
  }

  .main-nav a::after {
    right: 10px;
    left: 10px;
  }

  .profile-link__text,
  .profile-link__arrow {
    display: none;
  }
}
</style>
