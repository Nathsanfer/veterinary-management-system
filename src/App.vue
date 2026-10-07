<script setup>
import { watch } from 'vue'
import { session } from './stores/auth'
import { clearData, loadAll } from './stores/clinic'

// Carrega os dados do banco ao entrar e limpa ao sair
watch(
    () => session.value?.user?.id,
    (userId) => (userId ? loadAll() : clearData()),
    { immediate: true }
)
</script>

<template>
    <router-view />
</template>
