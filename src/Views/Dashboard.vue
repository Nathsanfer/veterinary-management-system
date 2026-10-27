<script setup>
import { computed } from 'vue'
import TopBar from '../components/TopBar.vue'
import DashboardAdmin from '../components/dashboard/DashboardAdmin.vue'
import DashboardRecepcao from '../components/dashboard/DashboardRecepcao.vue'
import DashboardVeterinario from '../components/dashboard/DashboardVeterinario.vue'
import '../components/dashboard/dashboard.css'
import '../components/dashboard/dashboard-refinements.css'
import { authReady, profile } from '../stores/auth'
import { loadError, loading } from '../stores/clinic'

// Cada cargo vê apenas o painel que lhe cabe
const panels = {
  admin: DashboardAdmin,
  recepcao: DashboardRecepcao,
  veterinario: DashboardVeterinario
}

const panel = computed(() => panels[profile.value?.cargo] ?? null)
</script>

<template>
  <TopBar />

  <main class="dash">
    <p v-if="loadError" class="dash-message dash-message--error" role="alert">
      Não foi possível carregar os dados do painel: {{ loadError }}
    </p>
    <p v-else-if="loading" class="dash-message" role="status">
      Carregando os dados da clínica...
    </p>

    <component :is="panel" v-if="panel" />
    <p v-else-if="authReady" class="dash-notice" role="status">
      Seu usuário ainda não tem um cargo definido. Fale com a administração para liberar o acesso.
    </p>
  </main>
</template>
