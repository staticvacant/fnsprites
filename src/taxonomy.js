/* ===================================================
   Taxonomia: FONTE ÚNICA de temas e raridades
   ===================================================
   Tudo que depende de tema/raridade (ordenação, rótulos, cores do
   card exportado) é derivado daqui. Para adicionar um tema novo,
   basta incluir uma entrada em THEME (e a classe CSS `theme-<nome>`).
   =================================================== */

export const RARITIES = {
    'Mítico': { order: 0, slug: 'mitico', gradient: ['#70531C', '#2E2107'], tag: ['#80622A', '#fff1A9'] },
    'Lendário': { order: 1, slug: 'lendario', gradient: ['#743e0a', '#301702'], tag: ['#8E4122', '#FBC568'] },
    'Épico': { order: 2, slug: 'epico', gradient: ['#4d1566', '#1e052c'], tag: ['#511D7F', '#ED2BFF'] },
    'Raro': { order: 3, slug: 'raro', gradient: ['#104273', '#081a35'], tag: ['#004A8E', '#00FFFB'] },
    'Especial': { order: 4, slug: 'especial', gradient: null, tag: ['#51f7cc', '#000000'] },
};

export const THEME = {
    'Básico': { order: 0, slug: 'basico', gradient: ['#1c2436', '#0c0f17'], exportLabel: 'NORMAL', tradeLabel: 'Base' },
    'Dourado': { order: 1, slug: 'dourado', gradient: ['#61460b', '#241a02'], exportLabel: 'DOURADO' },
    'Doce': { order: 2, slug: 'doce', gradient: ['#6b183f', '#260514'], exportLabel: 'DOCE' },
    'Galáctico': { order: 3, slug: 'galactico', gradient: ['#1f1145', '#080314'], exportLabel: 'GALÁCTICO' },
    'Gema': { order: 4, slug: 'gema', gradient: ['#114c47', '#041a18'], exportLabel: 'GEMA' },
    'Metálico': { order: 5, slug: 'metalico', gradient: ['#204454', '#09171f'], exportLabel: 'METÁLICO' },
    'Cubo': { order: 6, slug: 'cubo', gradient: ['#4c1d95', '#1e0b3d'], exportLabel: 'CUBO' },
    'Pato': { order: 7, slug: 'pato', gradient: ['#322554', '#12091f'], exportLabel: 'PATO' },
    'Trapaceiro': { order: 8, slug: 'trapaceiro', gradient: ['#441359', '#15051c'], exportLabel: 'TRAPACEIRO' },
    'Hacker de Saque': { order: 9, slug: 'hacker', gradient: ['#114030', '#051b14'], exportLabel: 'HACKER' },
    'Caçador de Recompensas': { order: 10, slug: 'cacador', gradient: ['#3b1c1c', '#170606'], exportLabel: 'CAÇADOR' },
    'Doce ou Travessura': { order: 11, slug: 'doce-ou-travessura', gradient: ['#592510', '#240a02'], exportLabel: 'DOCE OU TRAVESSURA' },
<<<<<<< HEAD
};

const byOrder = table =>
    Object.entries(table)
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([name]) => name);

/** Nomes dos temas na ordem de exibição. */
export const THEME_ORDER = byOrder(THEME);

/** Nomes das raridades da mais rara para a mais comum. */
export const RARITY_ORDER = byOrder(RARITIES);
=======
    'Valioso': { order: 12, slug: 'valioso', gradient: ['#396562', '#240a02'], exportLabel: 'VALIOSO' },
    'Amaldiçoado': { order: 13, slug: 'amaldicoado', gradient: ['#114c47', '#041a18'], exportLabel: 'AMALDIÇOADO' },
}
>>>>>>> origin/main

export function gradientFor(sprite) {
    const rarity = RARITIES[sprite.rarity];
    if (!rarity) throw new Error(`Raridade desconhecida no sprite: ${sprite.id} | ${sprite.rarity}`);
    if (rarity.gradient) return rarity.gradient;

    const theme = THEME[sprite.theme];
    if (!theme) throw new Error(`Tema desconhecido no sprite: ${sprite.id} | ${sprite.theme}`);
    return theme.gradient;
}
