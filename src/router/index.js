import {createRouter, createWebHistory} from 'vue-router'
import { initAuth, session } from '../stores/auth'

// Importação das páginas

import Login from '../Views/Login.vue'
import Dashboard from '../Views/Dashboard.vue'
import Calendar from '../Views/Calendar.vue'
import Appointments from '../Views/Appointments.vue'
import Services from '../Views/Services.vue'
import Finances from '../Views/Finances.vue'
import Profile from '../Views/Profile.vue'

// Definição das rotas

const routes = [
    { path: '/', component: Login },
    { path: '/dashboard', component: Dashboard },
    { path: '/calendar', component: Calendar },
    { path: '/appointments', component: Appointments },
    { path: '/services', component: Services },
    { path: '/finances', component: Finances },
    { path: '/profile', component: Profile }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Proteção de rotas: só usuários logados acessam as telas internas
router.beforeEach(async (to) => {
    await initAuth()
    if (!session.value && to.path !== '/') return '/'
    if (session.value && to.path === '/') return '/dashboard'
})

export default router