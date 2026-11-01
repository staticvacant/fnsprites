/* ===================================================
   Constants & Ordering Definitions
   =================================================== */

export const KEYS = {
    obtained: 'fn_obtained_sprites',
    mastered: 'fn_mastered_sprites',
    search: 'fn_state_search',
    theme: 'fn_state_theme',
    status: 'fn_state_status_filter',
    hideMastered: 'fn_state_hide_mastered',
    sortOrder: 'fn_state_sort_order',
    showUnreleased: 'fn_state_unreleased',
    lowFidelity: 'fn_state_low_fidelity',
    openExports: 'fn_state_open_exports',
    season: 'fn_state_season',
};

export const THEME_ORDER = [
    'Básico',
    'Dourado',
    'Doce',
    'Galáctico',
    'Gema',
    'Metálico',
    'Cubo',
    'Rift',
    'Pato',
    'Trapaceiro',
    'Trapaça',
    'Hacker de Saque',
    'Hacker',
    'Caçador de Recompensas',
    'Doce ou Travessura',
    'Valioso',
    'Amaldiçoado',
];

export const RARITY_ORDER = ['Mítico', 'Lendário', 'Épico', 'Raro', 'Especial'];

export const STATUS_FILTERS = ['all', 'owned', 'missing'];

export const SORT_METHODS = ['theme', 'sprite', 'name', 'rarity'];

export const UI_THEME_LABELS = { Doce: 'Doce' };

export const EXPORT_THEME_LABELS = {
    Básico: 'NORMAL',
    Doce: 'DOCE',
    Trapaceiro: 'TRAPACEIRO',
    Trapaça: 'TRAPAÇA',
    'Hacker de Saque': 'HACKER',
    Hacker: 'HACKER',
    'Caçador de Recompensas': 'CAÇADOR',
    'Doce ou Travessura': 'DOCE OU TRAVESSURA',
    Valioso: 'VALIOSO',
    Amaldiçoado: 'AMALDIÇOADO',
};

export const TRADE_THEME_LABELS = {
    Básico: 'Base',
    Doce: 'Doce',
    Trapaceiro: 'Trapaceiro',
    Trapaça: 'Trapaça',
    'Hacker de Saque': 'Hacker de Saque',
    Hacker: 'Hacker',
    'Caçador de Recompensas': 'Caçador de Recompensas',
    'Doce ou Travessura': 'Doce ou Travessura',
    Valioso: 'Valioso',
    Amaldiçoado: 'Amaldiçoado',
};

export const TRACKER_URL = 'https://joaopedro-chaves.github.io/fnpituchinhubr/';

export const CROWN_ICON =
    '<svg class="crown-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 19h20v2H2v-2zM2 5l5 3.5L12 2l5 6.5L22 5v12H2V5z"/></svg>';

export const EXPORT_LAYOUT = {
    border: 8,
    sidePad: 20,
    minCanvasW: 360,
    compactHeaderW: 760,
    headerH: 80,
    compactHeaderH: 132,
    colHeaderH: 35,
    cardW: 80,
    cardH: 100,
    rowGap: 12,
    cardGap: 8,
    labelW: 120,
    colGap: 60,
    footerH: 60,
    maxSingleColumnRows: 6,
};

export function getOrderedIndex(order, value) {
    const index = order.indexOf(value);
    return index === -1 ? Infinity : index;
}
