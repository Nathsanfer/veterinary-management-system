<script setup>
import { computed, ref, onMounted } from "vue";
import TopBar from "../components/TopBar.vue";
import { supabase } from "../lib/supabase";
import { getServiceIcon, SERVICE_ICON_OPTIONS } from "../lib/serviceIcons";
import { notify } from "../stores/toast";

const services = ref([]);
const loading = ref(false);
const loadError = ref("");
const isModalOpen = ref(false);
const saving = ref(false);
const saveError = ref("");
const editingServiceId = ref(null);

const serviceColors = [
  "#2F7D73",
  "#366A8A",
  "#A38C46",
  "#AD5D4E",
  "#7D5367",
  "#705E8C",
];

const blankService = () => ({
  name: "",
  description: "",
  price: "",
  unit: "por serviço",
  icon: "paw",
  color: serviceColors[0],
  active: true,
});

const serviceForm = ref(blankService());

const carregarServicos = async () => {
  loading.value = true;
  loadError.value = "";

  const { data, error } = await supabase
    .from("servicos")
    .select("*")
    .eq("visivel_catalogo", true)
    .order("nome");

  if (error) {
    console.error("Erro ao carregar serviços:", error);
    loadError.value = "Não foi possível carregar os serviços.";
    loading.value = false;
    return;
  }

  services.value = data
    .map((service) => ({
      id: service.id,
      name: service.nome,
      description: service.descricao ?? "",
      price: Number(service.valor_base),
      unit: service.unidade ?? "",
      icon: service.icone ?? "paw",
      color: service.cor ?? "#E5F0DF",
      active: service.ativo !== false,
    }))
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  loading.value = false;
};

const activeServicesCount = computed(
  () => services.value.filter((service) => service.active).length,
);

const openServiceModal = () => {
  saveError.value = "";
  editingServiceId.value = null;
  serviceForm.value = blankService();
  isModalOpen.value = true;
};

const editService = (service) => {
  saveError.value = "";
  editingServiceId.value = service.id;
  serviceForm.value = {
    name: service.name,
    description: service.description,
    price: service.price,
    unit: service.unit,
    icon: service.icon,
    color: service.color,
    active: service.active,
  };
  isModalOpen.value = true;
};

const closeServiceModal = () => {
  if (!saving.value) isModalOpen.value = false;
};

const salvarServico = async () => {
  saveError.value = "";
  saving.value = true;

  const serviceData = {
    nome: serviceForm.value.name.trim(),
    descricao: serviceForm.value.description.trim() || null,
    valor_base: Number(serviceForm.value.price),
    unidade: serviceForm.value.unit.trim() || null,
    ativo: serviceForm.value.active,
    icone: serviceForm.value.icon,
    cor: serviceForm.value.color,
    visivel_catalogo: true,
  };

  const query = editingServiceId.value
    ? supabase
        .from("servicos")
        .update(serviceData)
        .eq("id", editingServiceId.value)
    : supabase.from("servicos").insert(serviceData);
  const { error } = await query;

  if (error) {
    console.error(
      editingServiceId.value
        ? "Erro ao editar serviço:"
        : "Erro ao criar serviço:",
      error,
    );
    saveError.value =
      error.message ??
      (editingServiceId.value
        ? "Não foi possível editar o serviço."
        : "Não foi possível criar o serviço.");
    saving.value = false;
    return;
  }

  notify(editingServiceId.value ? "Serviço atualizado." : "Serviço criado no catálogo.");
  isModalOpen.value = false;
  editingServiceId.value = null;
  serviceForm.value = blankService();
  saving.value = false;
  await carregarServicos();
};

const formatPrice = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

onMounted(() => {
  carregarServicos();
});
</script>

<template>
  <TopBar />

  <main class="page services-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Catálogo da clínica</p>
        <h1 class="page-title">Serviços oferecidos</h1>
        <p class="page-subtitle">Cuidados pensados para acompanhar cada fase da vida do seu pet.</p>
      </div>
      <div class="header-actions">
        <span class="badge badge--accent">{{ activeServicesCount }} serviços ativos</span>
        <button class="btn btn--primary" type="button" @click="openServiceModal">
          <span aria-hidden="true">+</span> Novo serviço
        </button>
      </div>
    </header>

    <p v-if="loadError" class="text-error" role="alert">{{ loadError }}</p>

    <div v-if="loading && !services.length" class="services-grid">
      <div v-for="n in 6" :key="n" class="skeleton service-skeleton"></div>
    </div>

    <div v-else-if="!services.length" class="card empty-state">
      <span class="empty-state__icon" aria-hidden="true">✳</span>
      <strong>Nenhum serviço cadastrado</strong>
      <span>Crie o primeiro serviço para que ele apareça no catálogo e na agenda.</span>
    </div>

    <section v-else class="services-grid stagger" aria-label="Serviços oferecidos pela clínica">
      <article
        v-for="(service, index) in services"
        :key="service.id"
        class="card service-card"
        :class="{ 'is-inactive': !service.active }"
        :style="{ '--i': index }"
        role="button"
        tabindex="0"
        :aria-label="`Editar serviço ${service.name}`"
        @click="editService(service)"
        @keydown.enter="editService(service)"
        @keydown.space.prevent="editService(service)"
      >
        <div class="service-card__top">
          <div class="service-icon" :style="{ backgroundColor: service.color }" aria-hidden="true">
            <i :class="getServiceIcon(service.icon)" />
          </div>
          <span v-if="!service.active" class="badge badge--neutral">Inativo</span>
          <span v-else class="edit-hint" aria-hidden="true">Editar</span>
        </div>

        <h2 class="service-card__name">{{ service.name }}</h2>
        <p class="service-card__desc">{{ service.description || 'Sem descrição.' }}</p>

        <div class="service-card__footer">
          <div>
            <span class="footer-label">Valor</span>
            <strong class="price">{{ formatPrice(service.price) }}</strong>
          </div>
          <div class="footer-unit">
            <span class="footer-label">Unidade</span>
            <strong>{{ service.unit || '—' }}</strong>
          </div>
        </div>
      </article>
    </section>
  </main>

  <Transition name="overlay">
    <div v-if="isModalOpen" class="overlay" @click.self="closeServiceModal">
      <form class="modal-panel modal-panel--wide" role="dialog" aria-modal="true" aria-labelledby="service-title" @submit.prevent="salvarServico">
        <button class="modal-close" type="button" aria-label="Fechar" @click="closeServiceModal">×</button>
        <p class="eyebrow">Catálogo da clínica</p>
        <h2 id="service-title" class="modal-title">{{ editingServiceId ? "Editar serviço" : "Novo serviço" }}</h2>

        <div class="form-stack">
          <label class="field">
            Nome do serviço
            <input v-model="serviceForm.name" class="input" required maxlength="120" placeholder="Ex.: Consulta veterinária" />
          </label>

          <label class="field">
            Descrição
            <textarea v-model="serviceForm.description" class="input input--area" maxlength="300" placeholder="Descreva brevemente o serviço"></textarea>
          </label>

          <div class="form-row">
            <label class="field">
              Valor (R$)
              <input v-model="serviceForm.price" class="input" type="number" min="0" step="0.01" required placeholder="0,00" />
            </label>
            <label class="field">
              Unidade
              <input v-model="serviceForm.unit" class="input" required placeholder="por serviço" />
            </label>
          </div>

          <fieldset class="choice-group">
            <legend>Cor do serviço</legend>
            <div class="color-options">
              <button
                v-for="color in serviceColors"
                :key="color"
                class="color-option"
                :class="{ 'is-selected': serviceForm.color === color }"
                :style="{ backgroundColor: color }"
                type="button"
                :aria-label="`Selecionar cor ${color}`"
                :aria-pressed="serviceForm.color === color"
                @click="serviceForm.color = color"
              >
                <span v-if="serviceForm.color === color" aria-hidden="true">✓</span>
              </button>
            </div>
          </fieldset>

          <fieldset class="choice-group">
            <legend>Ícone do serviço</legend>
            <div class="icon-options">
              <button
                v-for="icon in SERVICE_ICON_OPTIONS"
                :key="icon.name"
                class="icon-option"
                :class="{ 'is-selected': serviceForm.icon === icon.name }"
                type="button"
                :aria-label="`Selecionar ícone ${icon.label}`"
                :aria-pressed="serviceForm.icon === icon.name"
                @click="serviceForm.icon = icon.name"
              >
                <i :class="getServiceIcon(icon.name)" aria-hidden="true" />
                <span>{{ icon.label }}</span>
              </button>
            </div>
          </fieldset>

          <label class="active-toggle">
            <input v-model="serviceForm.active" type="checkbox" />
            <span class="switch" aria-hidden="true"></span>
            <span>Serviço ativo no catálogo</span>
          </label>
        </div>

        <p v-if="saveError" class="text-error save-error" role="alert">{{ saveError }}</p>

        <button class="btn btn--primary btn--block submit" type="submit" :disabled="saving">
          <span v-if="saving" class="spinner" aria-hidden="true"></span>
          {{ saving ? "Salvando..." : editingServiceId ? "Salvar alterações" : "Criar serviço" }}
        </button>
      </form>
    </div>
  </Transition>
</template>

<style scoped>
.services-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  margin-bottom: 0;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 22px;
  cursor: pointer;
  transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s, opacity 0.3s;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--line-strong);
}

.service-card:active {
  transform: translateY(-1px) scale(0.99);
}

.service-card.is-inactive {
  opacity: 0.62;
}

.service-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.service-icon {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border-radius: 16px;
  color: #fff;
  font-size: 1.25rem;
  box-shadow: 0 10px 20px -12px currentColor;
  transition: transform 0.4s var(--ease);
}

.service-card:hover .service-icon {
  transform: rotate(-6deg) scale(1.06);
}

.edit-hint {
  color: var(--muted);
  font-size: 0.62rem;
  font-weight: 700;
  opacity: 0;
  transform: translateX(4px);
  transition: opacity 0.25s, transform 0.25s var(--ease);
}

.service-card:hover .edit-hint,
.service-card:focus-visible .edit-hint {
  opacity: 1;
  transform: none;
}

.service-card__name {
  margin-top: 18px;
  color: var(--ink);
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.service-card__desc {
  flex: 1;
  margin: 8px 0 18px;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}

.service-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.footer-label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.price {
  color: var(--ink);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.footer-unit {
  text-align: right;
}

.footer-unit strong {
  color: var(--ink-2);
  font-size: 0.7rem;
}

.service-skeleton {
  height: 230px;
  border-radius: var(--radius-lg);
}

/* Modal */

.modal-panel--wide {
  width: min(100%, 520px);
}

.modal-title {
  margin: 0 0 22px;
  padding-right: 28px;
  color: var(--ink);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.05em;
}

.input--area {
  min-height: 84px;
  padding: 12px 14px;
  resize: vertical;
  line-height: 1.5;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.choice-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.choice-group legend {
  margin-bottom: 9px;
  padding: 0;
  color: var(--ink-2);
  font-size: 0.68rem;
  font-weight: 700;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-option {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  border-radius: 50%;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 800;
  transition: transform 0.25s var(--ease), box-shadow 0.25s;
}

.color-option:hover {
  transform: scale(1.08);
}

.color-option.is-selected {
  box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px currentColor;
}

.icon-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.icon-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--muted);
  background: var(--surface-2);
  font-size: 0.56rem;
  font-weight: 700;
  transition: border-color 0.2s, background-color 0.2s, color 0.2s, transform 0.2s var(--ease);
}

.icon-option i {
  font-size: 1.05rem;
  color: var(--ink-2);
}

.icon-option:hover {
  border-color: var(--line-strong);
  color: var(--ink);
  transform: translateY(-2px);
}

.icon-option.is-selected {
  border-color: var(--accent);
  color: var(--accent-soft-ink);
  background: var(--accent-soft);
}

.icon-option.is-selected i {
  color: var(--accent-soft-ink);
}

.active-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ink-2);
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.active-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch {
  position: relative;
  width: 40px;
  height: 22px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--line-strong);
  transition: background-color 0.25s;
}

.switch::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s var(--ease);
  content: '';
}

.active-toggle input:checked + .switch {
  background: var(--accent);
}

.active-toggle input:checked + .switch::after {
  transform: translateX(18px);
}

.active-toggle input:focus-visible + .switch {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.save-error {
  margin: 14px 0 0;
}

.submit {
  margin-top: 22px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 680px) {
  .services-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
  }
}
</style>
