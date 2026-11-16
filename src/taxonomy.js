/* ===================================================
   Taxonomia: FONTE ÚNICA de temas e raridades
   ===================================================
   Tudo que depende de tema/raridade (ordenação, rótulos, cores do
   card na UI e no Canvas exportado) é derivado daqui. Para adicionar
   um tema novo, basta incluir uma entrada em THEME.
   =================================================== */

export const RARITIES = {
    'Mítico': {
        order: 0,
        slug: 'mitico',
        gradient: ['#70531C', '#2E2107'],
        displayGradient: ['#f59e1d', '#a86408', '#6e3d00'],
        lowFidelityBg: '#ffa726',
        strip: {
            colors: ['#f59e0b', '#fbbf24'],
            glow: 'rgba(245, 158, 11, 0.5)',
        },
        tag: ['#80622A', '#fff1A9'],
    },
    'Lendário': {
        order: 1,
        slug: 'lendario',
        gradient: ['#743e0a', '#301702'],
        displayGradient: ['#f06d42', '#a84220', '#6e260e'],
        lowFidelityBg: '#ff7043',
        strip: {
            colors: ['#f97316', '#fb923c'],
            glow: 'rgba(249, 115, 22, 0.5)',
        },
        tag: ['#8E4122', '#FBC568'],
    },
    'Épico': {
        order: 2,
        slug: 'epico',
        gradient: ['#4d1566', '#1e052c'],
        displayGradient: ['#a844c9', '#6e2587', '#4a155e'],
        lowFidelityBg: '#ab47bc',
        strip: {
            colors: ['#9333ea', '#a855f7'],
            glow: 'rgba(168, 85, 247, 0.5)',
        },
        tag: ['#511D7F', '#ED2BFF'],
    },
    'Raro': {
        order: 3,
        slug: 'raro',
        gradient: ['#104273', '#081a35'],
        displayGradient: ['#4b79c4', '#2b4c85', '#1d3561'],
        lowFidelityBg: '#4f83cc',
        strip: {
            colors: ['#3b82f6', '#4a78b8'],
            glow: 'rgba(59, 130, 246, 0.48)',
        },
        tag: ['#004A8E', '#00FFFB'],
    },
    'Especial': {
        order: 4,
        slug: 'especial',
        gradient: null,
        displayGradient: null,
        lowFidelityBg: null,
        strip: {
            colors: ['#98f5c9', '#8ee3f5', '#a3bffa', '#d4b8ff', '#f9b4d4', '#fde08d'],
            glow: 'rgba(212, 184, 255, 0.45)',
        },
        tag: ['#98f5c9', '#1c1917'],
    },
};

export const THEME = {
    'Básico': {
        order: 0,
        slug: 'basico',
        gradient: ['#4a6185', '#1f2b3d'],
        displayGradient: ['#617aa3', '#3b4e6e', '#1f2b3d'],
        lowFidelityBg: '#617aa3',
        exportLabel: 'NORMAL',
        tradeLabel: 'Base',
    },
    'Dourado': {
        order: 1,
        slug: 'dourado',
        gradient: ['#ca9706', '#614203'],
        displayGradient: ['#eab308', '#a17407', '#614203'],
        lowFidelityBg: '#eab308',
        exportLabel: 'DOURADO',
    },
    'Doce': {
        order: 2,
        slug: 'doce',
        gradient: ['#c4356e', '#661135'],
        displayGradient: ['#e84d8a', '#a32459', '#661135'],
        lowFidelityBg: '#e84d8a',
        exportLabel: 'DOCE',
    },
    'Galáctico': {
        order: 3,
        slug: 'galactico',
        gradient: ['#4a37bf', '#1c115e'],
        displayGradient: ['#5e4ae0', '#3827a3', '#1c115e'],
        lowFidelityBg: '#5e4ae0',
        exportLabel: 'GALÁCTICO',
    },
    'Gema': {
        order: 4,
        slug: 'gema',
        gradient: ['#1eb5a3', '#08524a'],
        displayGradient: ['#2dd4bf', '#0f8c7e', '#08524a'],
        lowFidelityBg: '#2dd4bf',
        exportLabel: 'GEMA',
    },
    'Metálico': {
        order: 5,
        slug: 'metalico',
        gradient: ['#2a8bb8', '#0e4159'],
        displayGradient: ['#38a8d8', '#1d6f96', '#0e4159'],
        lowFidelityBg: '#38a8d8',
        exportLabel: 'METÁLICO',
    },
    'Cubo': {
        order: 6,
        slug: 'cubo',
        gradient: ['#7736c9', '#340e6b'],
        displayGradient: ['#924de8', '#5f24b0', '#340e6b'],
        lowFidelityBg: '#924de8',
        exportLabel: 'CUBO',
    },
    'Pato': {
        order: 7,
        slug: 'pato',
        gradient: ['#4958c7', '#1f2666'],
        displayGradient: ['#5a6ce3', '#3946a8', '#1f2666'],
        lowFidelityBg: '#5a6ce3',
        exportLabel: 'PATO',
    },
    'Trapaceiro': {
        order: 8,
        slug: 'trapaceiro',
        gradient: ['#31a84b', '#104f1e'],
        displayGradient: ['#42c45e', '#208737', '#104f1e'],
        lowFidelityBg: '#42c45e',
        exportLabel: 'TRAPACEIRO',
    },
    'Hacker de Saque': {
        order: 9,
        slug: 'hacker',
        gradient: ['#2978de', '#0e3678'],
        displayGradient: ['#3a8ef6', '#1c5ec2', '#0e3678'],
        lowFidelityBg: '#3a8ef6',
        exportLabel: 'HACKER',
    },
    'Caçador de Recompensas': {
        order: 10,
        slug: 'cacador',
        gradient: ['#b832ba', '#570f5c'],
        displayGradient: ['#d442d4', '#942199', '#570f5c'],
        lowFidelityBg: '#d442d4',
        exportLabel: 'CAÇADOR',
    },
    'Doce ou Travessura': {
        order: 11,
        slug: 'doce-ou-travessura',
        gradient: ['#d96518', '#6b2703'],
        displayGradient: ['#f57c25', '#b54a0b', '#6b2703'],
        lowFidelityBg: '#f57c25',
        exportLabel: 'DOCE OU TRAVESSURA',
    },
    'Valioso': {
        order: 12,
        slug: 'valioso',
        gradient: ['#c43143', '#5e0e18'],
        displayGradient: ['#e04658', '#9e2130', '#5e0e18'],
        lowFidelityBg: '#e04658',
        exportLabel: 'VALIOSO',
    },
    'Amaldiçoado': {
        order: 13,
        slug: 'amaldicoado',
        gradient: ['#26ab7d', '#0c4f37'],
        displayGradient: ['#32c794', '#18855f', '#0c4f37'],
        lowFidelityBg: '#32c794',
        exportLabel: 'AMALDIÇOADO',
    },
};

const byOrder = table =>
    Object.entries(table)
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([name]) => name);

/** Nomes dos temas na ordem de exibição. */
export const THEME_ORDER = byOrder(THEME);

/** Nomes das raridades da mais rara para a mais comum. */
export const RARITY_ORDER = byOrder(RARITIES);

export function gradientFor(sprite) {
    const rarity = RARITIES[sprite.rarity];
    if (!rarity) throw new Error(`Raridade desconhecida no sprite: ${sprite.id} | ${sprite.rarity}`);
    if (rarity.gradient) return rarity.gradient;

    const theme = THEME[sprite.theme];
    if (!theme) throw new Error(`Tema desconhecido no sprite: ${sprite.id} | ${sprite.theme}`);
    return theme.gradient;
}

export function getRarityGradient(rarity, theme) {
    const rarityInfo = RARITIES[rarity];
    if (rarityInfo?.gradient) return rarityInfo.gradient;
    // Raridade "Especial" não tem gradiente próprio: usa o do tema
    if (rarityInfo) return (THEME[theme] || THEME['Básico']).gradient;
    return RARITIES['Raro'].gradient;
}

export function getRarityDisplayGradient(rarity, theme) {
    const rarityInfo = RARITIES[rarity];
    if (rarityInfo?.displayGradient) return rarityInfo.displayGradient;
    if (rarity === 'Especial') {
        const themeInfo = THEME[theme] || THEME['Básico'];
        return themeInfo.displayGradient || themeInfo.gradient;
    }
    return RARITIES['Raro'].displayGradient;
}

export function getRarityStripStyle(rarity) {
    return RARITIES[rarity]?.strip || RARITIES['Raro'].strip;
}

export function getRarityTagColors(rarity) {
    return (RARITIES[rarity] || RARITIES['Raro']).tag;
}

export function getCardStyleVars(rarity, theme) {
    const rarityInfo = RARITIES[rarity] || RARITIES['Raro'];
    const themeInfo = THEME[theme] || THEME['Básico'];
    const colors = getRarityDisplayGradient(rarity, theme);
    const displayBg =
        colors.length >= 3
            ? `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 75%, ${colors[2]} 100%)`
            : `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`;
    const vars = {
        '--card-display-bg': displayBg,
        '--card-low-fidelity-bg': rarityInfo.lowFidelityBg || themeInfo.lowFidelityBg || colors[0],
    };
    if (rarity !== 'Especial') {
        const strip = getRarityStripStyle(rarity);
        vars['--card-strip-bg'] = `linear-gradient(90deg, ${strip.colors.join(', ')})`;
        vars['--rarity-glow'] = strip.glow;
    }
    return vars;
}
