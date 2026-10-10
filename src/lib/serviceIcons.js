export const SERVICE_ICONS = {
    home: 'fi fi-ts-home',
    house: 'fi fi-ts-house-chimney',
    'home-visit': 'fi fi-ts-house-chimney',
    'consulta-domiciliar': 'fi fi-ts-house-chimney',
    consulta_domiciliar: 'fi fi-ts-house-chimney',
    'consulta domiciliar': 'fi fi-ts-house-chimney',
    boarding: 'fi fi-ts-bed',
    hotel: 'fi fi-ts-bed',
    stethoscope: 'fi fi-ts-stethoscope',
    bath: 'fi fi-ts-bath',
    shield: 'fi fi-ts-shield-check',
    paw: 'fi fi-ts-paw',
    syringe: 'fi fi-ts-syringe',
    flask: 'fi fi-ts-flask',
    heart: 'fi fi-ts-heart',
}

export const SERVICE_ICON_OPTIONS = [
    { name: 'paw', label: 'Pata' },
    { name: 'stethoscope', label: 'Estetoscópio' },
    { name: 'bath', label: 'Banho' },
    { name: 'shield', label: 'Proteção' },
    { name: 'house', label: 'Casa' },
    { name: 'home-visit', label: 'Domiciliar' },
    { name: 'syringe', label: 'Seringa' },
    { name: 'flask', label: 'Exame' },
    { name: 'heart', label: 'Coração' },
]

export const getServiceIcon = (name) => {
    const normalizedName = String(name ?? '').trim().toLowerCase()
    return SERVICE_ICONS[normalizedName] ?? SERVICE_ICONS.paw
}
