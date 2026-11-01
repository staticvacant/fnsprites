/* ===================================================
   Sprite Querying, Filtering & Sorting
   =================================================== */

import {
    THEME_ORDER,
    RARITY_ORDER,
    UI_THEME_LABELS,
    EXPORT_THEME_LABELS,
    TRADE_THEME_LABELS,
    getOrderedIndex,
} from './share-order.js';

export function getFamilyKey(sprite) {
    return sprite.id.split('_')[0];
}

export function getSpriteIdSet(sprites = (typeof baseSprites !== 'undefined' ? baseSprites : [])) {
    return new Set(sprites.map(sprite => sprite.id));
}

export function getSeasonData(season) {
    if (season === 'C7T3') return { name: 'C7T3' };
    if (season === 'C7T4') return { name: 'C7T4' };
    if (season === 'C7T5') return { name: 'C7T5' };
    return { name: 'none' };
}

export function getReleasedSprites(
    sprites = (typeof baseSprites !== 'undefined' ? baseSprites : []),
    seasonFilter = 'all'
) {
    return sprites.filter(sprite => {
        if (sprite.unreleased) return false;
        if (seasonFilter !== 'all' && (sprite.season || 'none') !== seasonFilter) return false;
        return true;
    });
}

export function getFamilyKeys(sprites) {
    return sprites.reduce((keys, sprite) => {
        const key = getFamilyKey(sprite);
        if (!keys.includes(key)) keys.push(key);
        return keys;
    }, []);
}

export function getActiveThemes(sprites) {
    return sprites
        .reduce((themes, sprite) => {
            if (!themes.includes(sprite.theme)) themes.push(sprite.theme);
            return themes;
        }, [])
        .sort((a, b) => getOrderedIndex(THEME_ORDER, a) - getOrderedIndex(THEME_ORDER, b));
}

export function getCharName(charKey, sprites = (typeof baseSprites !== 'undefined' ? baseSprites : [])) {
    const basicSprite = sprites.find(sprite => sprite.id === `${charKey}_basic`);
    return basicSprite ? basicSprite.name : charKey.charAt(0).toUpperCase() + charKey.slice(1);
}

export function getDisplayName(name) {
    return name === 'Burnt Peanut' ? name : `${name} Sprite`;
}

export function getUiThemeLabel(theme) {
    return UI_THEME_LABELS[theme] || theme;
}

export function getExportThemeLabel(theme) {
    return EXPORT_THEME_LABELS[theme] || theme.toUpperCase();
}

export function getTradeThemeLabel(theme) {
    return TRADE_THEME_LABELS[theme] || theme;
}

export function isObtained(state, id) {
    return (state?.obtained || []).includes(id);
}

export function isMastered(state, id) {
    return (state?.mastered || []).includes(id);
}

export function getCollectionCounts(sprites, state) {
    return {
        total: sprites.length,
        collected: sprites.filter(sprite => isObtained(state, sprite.id)).length,
        mastered: sprites.filter(sprite => isMastered(state, sprite.id)).length,
    };
}

export function getFamilyThemeMap(sprites) {
    return sprites.reduce((map, sprite) => {
        const familyKey = getFamilyKey(sprite);
        if (!map.has(familyKey)) map.set(familyKey, new Map());
        map.get(familyKey).set(sprite.theme, sprite);
        return map;
    }, new Map());
}

export function uniqueValidIds(ids, validIds) {
    return [...new Set(ids)].filter(id => validIds.has(id));
}

export function filterSprites(sprites, state) {
    const search = state.filters.search.trim().toLowerCase();

    return sprites.filter(sprite => {
        if (state.settings.hideMastered && isMastered(state, sprite.id)) return false;
        if (!state.settings.showUnreleased && sprite.unreleased) return false;
        if (state.viewMode && (!isObtained(state, sprite.id) || sprite.unreleased)) return false;

        const matchesSearch = !search || sprite.name.toLowerCase().includes(search);
        const matchesTheme = state.filters.theme === 'all' || sprite.theme === state.filters.theme;
        const matchesSeason = state.filters.season === 'all' || (sprite.season || 'none') === state.filters.season;

        let matchesStatus = true;
        if (!state.viewMode) {
            const isOwned = isObtained(state, sprite.id);
            if (state.filters.status === 'owned') matchesStatus = isOwned;
            if (state.filters.status === 'missing') matchesStatus = !isOwned;
        }

        return matchesSearch && matchesTheme && matchesSeason && matchesStatus;
    });
}

export function sortSprites(items, method) {
    const sorted = [...items];
    if (method === 'theme') {
        return sorted.sort((a, b) => {
            const idxA = getOrderedIndex(THEME_ORDER, a.theme);
            const idxB = getOrderedIndex(THEME_ORDER, b.theme);
            if (idxA !== idxB) return idxA - idxB;
            return 0;
        });
    }
    if (method === 'sprite') {
        return sorted.sort((a, b) => {
            const familyA = getFamilyKey(a);
            const familyB = getFamilyKey(b);
            if (familyA !== familyB) return familyA.localeCompare(familyB);
            return getOrderedIndex(THEME_ORDER, a.theme) - getOrderedIndex(THEME_ORDER, b.theme);
        });
    }
    if (method === 'name') {
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (method === 'rarity') {
        return sorted.sort((a, b) => {
            const idxA = getOrderedIndex(RARITY_ORDER, a.rarity);
            const idxB = getOrderedIndex(RARITY_ORDER, b.rarity);
            if (idxA !== idxB) return idxA - idxB;
            return a.name.localeCompare(b.name);
        });
    }
    return sorted;
}
