<script setup>
import TopBar from '../components/TopBar.vue'
import { catalogServices, loadError, loading } from '../stores/clinic'

const services = catalogServices

const formatPrice = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
</script>

<template>
    <div class="services-page">
        <TopBar />

        <main class="services-content">
            <header class="services-heading">
                <div>
                    <p class="eyebrow">CATÁLOGO DA CLÍNICA</p>
                    <h1>Serviços oferecidos</h1>
                    <p class="heading-description">Cuidados pensados para acompanhar cada fase da vida do seu pet.</p>
                </div>
                <span class="service-count">{{ services.length }} serviços ativos</span>
            </header>

            <p v-if="loadError" class="state-message state-message--error" role="alert">{{ loadError }}</p>
            <p v-else-if="loading && !services.length" class="state-message">Carregando serviços...</p>

            <section class="services-grid" aria-label="Serviços oferecidos pela clínica">
                <article v-for="service in services" :key="service.id" class="service-card">
                    <div class="service-icon" :class="`service-icon--${service.tone}`" aria-hidden="true">
                        <svg viewBox="0 0 32 32" focusable="false">
                            <path v-if="service.icon === 'stethoscope'" d="M8 5v7a5 5 0 0 0 10 0V5M5 5h6M15 5h6M13 17v3a6 6 0 0 0 12 0v-2a3 3 0 1 0-3-3" />
                            <path v-else-if="service.icon === 'bath'" d="M5 16h22M7 16V9a3 3 0 0 1 6-1l1 2M5 16v3a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4v-3M10 23v2M23 23v2M20 6v3M18 8h4" />
                            <path v-else-if="service.icon === 'shield'" d="M16 4 26 8v7c0 6-4.3 10.2-10 13-5.7-2.8-10-7-10-13V8l10-4Z M11 15l3 3 7-7" />
                            <path v-else-if="service.icon === 'house'" d="m4 15 12-10 12 10M7 13v13h18V13M12 26v-7h8v7M21 9V5h3v6" />
                            <path v-else-if="service.icon === 'home-visit'" d="m4 15 12-10 12 10M7 13v13h18V13M12 26v-7h8v7M23 19h6M26 16v6" />
                            <path v-else d="M12 5h8l-1 5 5 14H8l5-14-1-5ZM11 10h10M9 20h14" />
                        </svg>
                    </div>

                    <div class="service-card__body">
                        <div class="service-card__topline">
                            <h2>{{ service.name }}</h2>
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
    </div>
</template>

<style scoped>

.services-page {
    min-height: 100vh;
    color: #183b3a;
    background: #f3f5f1;
}

.services-content {
    width: min(100% - 48px, 1220px);
    margin: 0 auto;
    padding: 32px 0 18px;
}

.services-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 32px;
    margin-bottom: 34px;
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
    transition: transform 180ms ease, box-shadow 180ms ease;
}

.service-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 34px rgba(24, 59, 58, 0.11);
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

.service-icon svg {
    width: 32px;
    height: 32px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
}

.service-icon--mint { background: #2f7d73; }
.service-icon--aqua { background: #3f8f8a; }
.service-icon--lemon { background: #789b5a; }
.service-icon--peach { background: #b9785d; }
.service-icon--lilac { background: #6e7399; }
.service-icon--blue { background: #5c8193; }

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
    gap: 12px;
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

    .services-grid {
        grid-template-columns: 1fr;
        gap: 22px;
    }
}

@media (max-width: 420px) {
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