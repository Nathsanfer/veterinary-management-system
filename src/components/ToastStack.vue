<script setup>
import { toasts, dismiss } from '../stores/toast'
</script>

<template>
  <div class="toast-stack" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        role="status"
      >
        <span class="toast__icon" aria-hidden="true">
          {{ toast.type === 'error' ? '!' : toast.type === 'info' ? 'i' : '✓' }}
        </span>
        <span class="toast__message">{{ toast.message }}</span>
        <button class="toast__close" type="button" aria-label="Fechar aviso" @click="dismiss(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--accent-soft-ink);
  background: var(--accent-soft);
  font-size: 0.7rem;
  font-weight: 800;
}

.toast--error .toast__icon {
  color: var(--danger);
  background: var(--danger-soft);
}

.toast--info .toast__icon {
  color: var(--tone-blue-ink);
  background: var(--tone-blue-bg);
}

.toast__message {
  flex: 1;
  min-width: 0;
  line-height: 1.45;
}

.toast__close {
  flex: 0 0 auto;
  border: 0;
  color: var(--muted);
  background: transparent;
  font-size: 1.1rem;
  line-height: 1;
  padding: 2px;
  border-radius: 6px;
  transition: color 0.2s;
}

.toast__close:hover {
  color: var(--ink);
}
</style>
