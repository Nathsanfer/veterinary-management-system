<script setup>
import { nextTick, ref, watch } from 'vue'
import { answerConfirm, confirmState } from '../stores/confirm'

const confirmButton = ref(null)

// Foco no botão de ação ao abrir, para o teclado funcionar sem o mouse
watch(
  () => confirmState.open,
  async (open) => {
    if (open) {
      await nextTick()
      confirmButton.value?.focus()
    }
  }
)

function onKeydown(event) {
  if (event.key === 'Escape') answerConfirm(false)
}
</script>

<template>
  <Transition name="overlay">
    <div
      v-if="confirmState.open"
      class="overlay"
      @click.self="answerConfirm(false)"
      @keydown="onKeydown"
    >
      <div class="modal-panel confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <span class="confirm__icon" :class="{ 'confirm__icon--danger': confirmState.danger }" aria-hidden="true">
          {{ confirmState.danger ? '!' : '?' }}
        </span>
        <h2 id="confirm-title" class="confirm__title">{{ confirmState.title }}</h2>
        <p v-if="confirmState.message" id="confirm-message" class="confirm__message">{{ confirmState.message }}</p>

        <div class="confirm__actions">
          <button class="btn btn--secondary" type="button" @click="answerConfirm(false)">
            {{ confirmState.cancelLabel }}
          </button>
          <button
            ref="confirmButton"
            class="btn"
            :class="confirmState.danger ? 'btn--danger-solid' : 'btn--primary'"
            type="button"
            @click="answerConfirm(true)"
          >
            {{ confirmState.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm {
  width: min(100%, 390px);
  padding: 30px 28px 24px;
  text-align: center;
}

.confirm__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin: 0 auto 16px;
  border-radius: 50%;
  color: var(--accent-soft-ink);
  background: var(--accent-soft);
  font-size: 1.2rem;
  font-weight: 800;
}

.confirm__icon--danger {
  color: var(--danger);
  background: var(--danger-soft);
}

.confirm__title {
  color: var(--ink);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.confirm__message {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.6;
}

.confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 24px;
}

.confirm__actions .btn {
  width: 100%;
}

.btn--danger-solid {
  color: #fff;
  background: var(--danger);
  box-shadow: 0 10px 20px -12px var(--danger);
}

.btn--danger-solid:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
}
</style>
