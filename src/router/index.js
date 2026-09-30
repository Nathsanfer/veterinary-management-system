import {createRouter, createWebHistory} from 'vue-router'

// Importação das páginas

import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Calendar from '../views/Calendar.vue'
import Appointments from '../views/Appointments.vue'
import Services from '../views/Services.vue'
import Finances from '../views/Finances.vue'
import Profile from '../views/Profile.vue'

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