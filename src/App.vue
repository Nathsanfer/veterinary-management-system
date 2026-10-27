<script setup>
import { watch } from 'vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastStack from './components/ToastStack.vue'
import { profile, session } from './stores/auth'
import { clearData, loadAll } from './stores/clinic'

// Carrega os dados do banco ao entrar e limpa ao sair.
// O cargo também entra no gatilho: o perfil chega depois da sessão e
// define quais dados (ex.: financeiro) podem ser carregados.
watch(
    () => [session.value?.user?.id, profile.value?.cargo],
    ([userId]) => (userId ? loadAll() : clearData()),
    { immediate: true }
)
</script>

<template>
    <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
            <component :is="Component" />
        </Transition>
    </router-view>
    <ToastStack />
    <ConfirmDialog />
</template>
