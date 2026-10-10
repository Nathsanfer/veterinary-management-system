<script setup>
import { computed, ref, onMounted } from "vue";
import TopBar from "../components/TopBar.vue";
import { supabase } from "../lib/supabase";
import { getServiceIcon, SERVICE_ICON_OPTIONS } from "../lib/serviceIcons";

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
  <div class="services-page">
    <TopBar />

    <main class="services-content">
      <header class="services-heading">
        <div>
          <p class="eyebrow">CATÁLOGO DA CLÍNICA</p>
          <h1>Serviços oferecidos</h1>
          <p class="heading-description">
            Cuidados pensados para acompanhar cada fase da vida do seu pet.
          </p>
        </div>
        <div class="services-heading__actions">
          <span class="service-count"
            >{{ activeServicesCount }} serviços ativos</span
          >
          <button class="primary-button" type="button" @click="openServiceModal">
            Novo serviço
          </button>
        </div>
      </header>

      <p
        v-if="loadError"
        class="state-message state-message--error"
        role="alert"
      >
        {{ loadError }}
      </p>
      <p v-else-if="loading && !services.length" class="state-message">
        Carregando serviços...
      </p>

      <section
        class="services-grid"
        aria-label="Serviços oferecidos pela clínica"
      >
        <article
          v-for="service in services"
          :key="service.id"
          class="service-card"
          :class="{ 'service-card--inactive': !service.active }"
          role="button"
          tabindex="0"
          @click="editService(service)"
          @keydown.enter="editService(service)"
          @keydown.space.prevent="editService(service)"
        >
          <div
            class="service-icon"
            :style="{ backgroundColor: service.color }"
            aria-hidden="true"
          >
            <i :class="getServiceIcon(service.icon)" />
          </div>

          <div class="service-card__body">
            <div class="service-card__topline">
              <h2>{{ service.name }}</h2>
              <span v-if="!service.active" class="service-status">Inativo</span>
            </div>
            <p>{{ service.description }}</p>

            <div class="service-card__footer">
              <div>
                <span class="footer-label">Valor</span>
                <strong>{{ formatPrice(service.price) }}</strong>
              </div>
              <div class="footer-unit">
                <span class="footer-label">Unidade</span>
                <strong>{{ service.unit }}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>

    <div
      v-if="isModalOpen"
      class="modal-backdrop"
      @click.self="closeServiceModal"
    >
      <form class="modal" @submit.prevent="salvarServico">
        <button
          class="modal-close"
          type="button"
          aria-label="Fechar"
          @click="closeServiceModal"
        >
          ×
        </button>
        <p class="eyebrow">CATÁLOGO DA CLÍNICA</p>
        <h2>{{ editingServiceId ? "Editar serviço" : "Novo serviço" }}</h2>

        <label>
          Nome do serviço
          <input
            v-model="serviceForm.name"
            required
            maxlength="120"
            placeholder="Ex.: Consulta veterinária"
          />
        </label>

        <label>
          Descrição
          <textarea
            v-model="serviceForm.description"
            maxlength="300"
            placeholder="Descreva brevemente o serviço"
          />
        </label>

        <div class="form-row">
          <label>
            Valor (R$)
            <input
              v-model="serviceForm.price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0,00"
            />
          </label>
          <label>
            Unidade
            <input v-model="serviceForm.unit" required placeholder="por serviço" />
          </label>
        </div>

        <fieldset class="choice-group">
          <legend>Cor do serviço</legend>
          <div class="color-options">
            <button
              v-for="color in serviceColors"
              :key="color"
              class="color-option"
              :class="{ selected: serviceForm.color === color }"
              :style="{ backgroundColor: color }"
              type="button"
              :aria-label="`Selecionar cor ${color}`"
              :aria-pressed="serviceForm.color === color"
              @click="serviceForm.color = color"
            >
              <span v-if="serviceForm.color === color">✓</span>
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
              :class="{ selected: serviceForm.icon === icon.name }"
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
          <span>Serviço ativo</span>
        </label>

        <p v-if="saveError" class="modal-error" role="alert">{{ saveError }}</p>
        <button class="primary-button modal-submit" type="submit" :disabled="saving">
          {{
            saving
              ? "Salvando..."
              : editingServiceId
                ? "Salvar alterações"
                : "Criar serviço"
          }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.services-page {
  min-height: 100vh;
  color: #183b3a;
  background: #f3f5f1;
}

.services-content {
  width: min(100% - 48px, 1380px);
  margin: 0 auto;
  padding: 48px 0 64px;
}

.services-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 34px;
}

.services-heading__actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.primary-button {
  border: 0;
  border-radius: 9px;
  padding: 12px 17px;
  color: #f7f8f3;
  background: #2f7d73;
  box-shadow: 0 8px 16px rgba(47, 125, 115, 0.18);
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  transition: transform 180ms ease, background 180ms ease;
}

.primary-button:hover {
  background: #24665e;
  transform: translateY(-2px);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.eyebrow {
  margin: 0 0 10px;
  color: #789575;
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.services-heading h1 {
  margin: 0;
  color: #1d1f1fd0;
  font-size: clamp(1.9rem, 3vw, 2rem);
  font-weight: 800;
  line-height: 1;
}

.heading-description {
  max-width: 550px;
  margin: 10px 0 0;
  color: #728682;
  font-size: 0.82rem;
  line-height: 1.6;
}

.service-count {
  padding-bottom: 5px;
  color: #789575;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
}

.state-message {
  margin: 0 0 20px;
  color: var(--muted, #728682);
  font-size: 0.8rem;
  font-weight: 600;
}

.state-message--error {
  color: #b9533d;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px 28px;
  margin: -10px 0;
}

.service-card {
  position: relative;
  height: 180px;
  display: flex;
  align-items: stretch;
  border: 1px solid rgba(24, 59, 58, 0.07);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(24, 59, 58, 0.07);
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.service-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 34px rgba(24, 59, 58, 0.11);
}

.service-card--inactive {
  opacity: 0.72;
  filter: grayscale(0.2);
}

.service-card--inactive:hover {
  opacity: 0.9;
}

.service-icon {
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  align-self: center;
  margin-left: -22px;
  display: grid;
  place-items: center;
  border: 7px solid #f3f5f1;
  border-radius: 50%;
  color: #f7f8f3;
  box-shadow: 0 6px 14px rgba(24, 59, 58, 0.12);
}

.service-icon i {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 1.65rem;
  font-weight: 300;
}

.service-icon--mint {
  background: #2f7d73;
}
.service-icon--aqua {
  background: #3f8f8a;
}
.service-icon--lemon {
  background: #789b5a;
}
.service-icon--peach {
  background: #b9785d;
}
.service-icon--lilac {
  background: #6e7399;
}
.service-icon--blue {
  background: #5c8193;
}

.service-card__body {
  min-width: 0;
  flex: 1;
  padding: 25px 24px 22px 16px;
  display: flex;
  flex-direction: column;
}

.service-card__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.service-status {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: #f5e4e0;
  color: #ad5d4e;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.service-card h2 {
  min-width: 0;
  margin: 0;
  color: #252929d0;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.25;
}

.service-card__body > p {
  display: -webkit-box;
  min-height: 48px;
  margin: 9px 0 17px;
  overflow: hidden;
  color: #6c7d7a;
  font-size: 0.76rem;
  line-height: 1.55;
  -webkit-box-orient: vertical;
}

.service-card__footer {
  margin-top: -1rem;
  padding-top: 15px;
  display: flex;
  align-items: end;
  gap: 27px;
  border-top: 1px solid #edf1ec;
}

.service-card__footer > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.footer-unit {
  padding-left: 27px;
  border-left: 1px solid #1eb8ad;
}

.footer-label {
  color: #7e908c;
  font-size: 0.62rem;
  font-weight: 600;
}

.service-card__footer strong {
  color: #31572cbc;
  font-size: 0.79rem;
  font-weight: 800;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgba(24, 59, 58, 0.35);
  backdrop-filter: blur(3px);
}

.modal {
  position: relative;
  width: min(100%, 570px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: auto;
  padding: 30px;
  border-radius: 16px;
  background: #f7f8f3;
  box-shadow: 0 24px 60px rgba(24, 59, 58, 0.25);
}

.modal h2 {
  margin: 0 0 4px;
  color: #183b3a;
  font-size: 1.3rem;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 16px;
  border: 0;
  background: none;
  color: #728682;
  cursor: pointer;
  font-size: 1.6rem;
}

.modal label,
.choice-group legend {
  color: #728682;
  font-size: 0.68rem;
  font-weight: 700;
}

.modal label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.modal input,
.modal textarea {
  border: 1px solid #dce5dd;
  border-radius: 9px;
  padding: 11px 12px;
  color: #183b3a;
  background: #fff;
  font: inherit;
  font-size: 0.78rem;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.modal input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #2f7d73;
}

.modal textarea {
  min-height: 62px;
}

.modal input:focus,
.modal textarea:focus {
  border-color: #99b55f;
  box-shadow: 0 0 0 3px rgba(153, 181, 95, 0.2);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.choice-group {
  margin: 0;
  padding: 0;
  border: 0;
}

.choice-group legend {
  margin-bottom: 9px;
}

.active-toggle {
  flex-direction: row !important;
  align-items: center;
  gap: 8px !important;
  cursor: pointer;
}

.color-options {
  display: flex;
  gap: 10px;
}

.color-option {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 3px solid transparent;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  font-size: 0.75rem;
  transition: transform 180ms ease, border-color 180ms ease;
}

.color-option:hover,
.color-option.selected {
  border-color: #183b3a;
  transform: scale(1.12);
}

.icon-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.icon-option {
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #dce5dd;
  border-radius: 9px;
  color: #31572c;
  background: #fff;
  cursor: pointer;
  font: inherit;
  transition: border-color 180ms ease, background 180ms ease;
}

.icon-option:hover,
.icon-option.selected {
  border-color: #2f7d73;
  background: #e5f0df;
}

.icon-option i {
  font-size: 1.3rem;
}

.icon-option span {
  color: #728682;
  font-size: 0.55rem;
  font-weight: 700;
}

.modal-error {
  margin: 0;
  color: #b9533d;
  font-size: 0.74rem;
  font-weight: 700;
}

.modal-submit {
  width: 100%;
  margin-top: 3px;
}

@media (max-width: 760px) {
  .services-content {
    width: min(100% - 32px, 1220px);
    padding-top: 36px;
  }

  .services-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 27px;
  }

  .services-heading__actions {
    width: 100%;
    justify-content: space-between;
  }

  .services-grid {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .icon-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .modal {
    padding: 25px 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .color-options {
    justify-content: space-between;
  }

  .service-card__body {
    padding-right: 16px;
  }

  .service-icon {
    width: 64px;
    height: 64px;
    flex-basis: 64px;
    margin-left: -18px;
    border-width: 5px;
  }

  .service-card__footer {
    gap: 16px;
  }

  .footer-unit {
    padding-left: 16px;
  }
}
</style>
