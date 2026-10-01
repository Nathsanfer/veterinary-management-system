import {createRouter, createWebHistory} from 'vue-router'

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

export default router