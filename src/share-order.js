/* ===================================================
   Constantes de Persistência, Layout e Ordenação
   ===================================================
   Temas e raridades (ordem, rótulos, cores) vivem em taxonomy.js.
   =================================================== */

export { THEME_ORDER, RARITY_ORDER } from './taxonomy.js';

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

export const STATUS_FILTERS = ['all', 'owned', 'missing'];

export const SORT_METHODS = ['theme', 'sprite', 'name', 'rarity'];

export const TRACKER_URL = 'https://joaopedro-chaves.github.io/fnpituchinhubr/';

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
