/* ===================================================
   Sprite Querying, Filtering & Sorting
   =================================================== */

import { THEME_ORDER, RARITY_ORDER } from './share-order.js';
import { THEME, RARITIES } from './taxonomy.js';

const defaultCollator = new Intl.Collator();
const THEME_INDEX_MAP = new Map(THEME_ORDER.map((name, idx) => [name, idx]));
const RARITY_INDEX_MAP = new Map(RARITY_ORDER.map((name, idx) => [name, idx]));

function getThemeOrder(theme) {
    return THEME_INDEX_MAP.get(theme) ?? Infinity;
}

function getRarityOrder(rarity) {
    return RARITY_INDEX_MAP.get(rarity) ?? Infinity;
}

function compareRank(rankA, rankB) {
    if (rankA === rankB) return 0;
    return rankA - rankB;
}

function buildCollatorRankMap(values) {
    const unique = [...new Set(values)].sort(defaultCollator.compare);
    const ranks = new Map();
    let rank = 0;
    for (let i = 0; i < unique.length; i++) {
        if (i > 0 && defaultCollator.compare(unique[i - 1], unique[i]) !== 0) {
            rank += 1;
        }
        ranks.set(unique[i], rank);
    }
    return ranks;
}

export const NEW_THEME_FILTER = '__new__';

export function hasNewSprites(sprites = []) {
    return sprites.some(sprite => Boolean(sprite.isNew) && !sprite.unreleased);
}

export function getFamilyKey(sprite) {
    const idx = sprite.id.lastIndexOf('_');
    return idx === -1 ? sprite.id : sprite.id.slice(0, idx);
}

export function getSpriteIdSet(sprites = []) {
    return new Set(sprites.map(sprite => sprite.id));
}

const SEASON_CODE_RE = /^C\d+T\d+$/i;

export function isKnownSeason(season) {
    return typeof season === 'string' && SEASON_CODE_RE.test(season.trim());
}

export function getSeasonData(season) {
    const normalized = typeof season === 'string' ? season.trim() : '';
    if (SEASON_CODE_RE.test(normalized)) {
        return { name: normalized.toUpperCase() };
    }
    return { name: 'none' };
}

/**
 * Retorna temporadas distintas presentes nos dados em ordem cronológica.
 * @param {Array} sprites
 * @returns {string[]}
 */
export function getActiveSeasons(sprites = []) {
    const seen = new Set();
    for (const s of sprites) {
        if (isKnownSeason(s?.season)) {
            seen.add(s.season.trim().toUpperCase());
        }
    }
    return Array.from(seen).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
}

export function getReleasedSprites(
    sprites = [],
    seasonFilter = 'all'
) {
    return sprites.filter(sprite => {
        if (sprite.unreleased) return false;
        if (seasonFilter !== 'all' && (sprite.season || 'none') !== seasonFilter) return false;
        return true;
    });
}

export function getFamilyKeys(sprites) {
    const seen = new Set();
    const keys = [];
    for (const sprite of sprites) {
        const key = getFamilyKey(sprite);
        if (!seen.has(key)) {
            seen.add(key);
            keys.push(key);
        }
    }
    return keys;
}

export function getActiveThemes(sprites) {
    const seen = new Set();
    for (const sprite of sprites) {
        seen.add(sprite.theme);
    }
    return [...seen].sort((a, b) => compareRank(getThemeOrder(a), getThemeOrder(b)));
}

function formatFallbackCharName(charKey) {
    return charKey.charAt(0).toUpperCase() + charKey.slice(1);
}

/**
 * Pré-computa índice O(1) de família -> nome do sprite `_basic` em uma única varredura.
 * @param {Array<{ id: string, name?: string }>} [sprites]
 * @returns {Map<string, string>}
 */
export function getCharNameMap(sprites = []) {
    const names = new Map();
    for (const sprite of sprites) {
        if (typeof sprite?.id !== 'string' || !sprite.id.endsWith('_basic')) continue;
        const familyKey = sprite.id.slice(0, -6);
        if (!names.has(familyKey) && sprite.name !== undefined) {
            names.set(familyKey, sprite.name);
        }
    }
    return names;
}

/**
 * Resolve o nome exibido de uma família usando o índice pré-computado.
 * @param {Map<string, string>} charNameMap
 * @param {string} charKey
 * @returns {string}
 */
export function resolveCharName(charNameMap, charKey) {
    const match = charNameMap.get(charKey);
    return match !== undefined ? match : formatFallbackCharName(charKey);
}

export function getCharName(charKey, sprites = []) {
    const basicSprite = sprites.find(sprite => sprite.id === `${charKey}_basic`);
    return basicSprite ? basicSprite.name : formatFallbackCharName(charKey);
}

export function getDisplayName(name) {
    return name === 'Burnt Peanut' ? name : `${name} Sprite`;
}

export function getUiThemeLabel(theme) {
    return theme;
}

export function getExportThemeLabel(theme) {
    return THEME[theme]?.exportLabel || theme.toUpperCase();
}

export function getTradeThemeLabel(theme) {
    return THEME[theme]?.tradeLabel || theme;
}

/**
 * Valida os dados de sprites e devolve uma lista de problemas legíveis.
 * Sprites lançados precisam de nome, tema e raridade conhecidos
 * (sprites `unreleased` podem ser placeholders incompletos).
 */
export function getSpriteDataIssues(sprites) {
    const issues = [];
    const seen = new Set();

    sprites.forEach(sprite => {
        if (!sprite.id) {
            issues.push('Sprite sem id');
            return;
        }
        if (seen.has(sprite.id)) {
            issues.push(`${sprite.id}: id duplicado`);
        }
        seen.add(sprite.id);

        if (sprite.unreleased) return;
        if (!sprite.name) issues.push(`${sprite.id}: nome vazio`);
        if (!THEME[sprite.theme]) issues.push(`${sprite.id}: tema desconhecido "${sprite.theme}"`);
        if (!RARITIES[sprite.rarity]) issues.push(`${sprite.id}: raridade desconhecida "${sprite.rarity}"`);
    });

    return issues;
}

export function isObtained(state, id) {
    return (state?.obtained || []).includes(id);
}

export function isMastered(state, id) {
    return (state?.mastered || []).includes(id);
}

export function getCollectionCounts(sprites, state) {
    const obtainedSet = new Set(state?.obtained || []);
    const masteredSet = new Set(state?.mastered || []);
    let collected = 0;
    let mastered = 0;

    for (const sprite of sprites) {
        if (obtainedSet.has(sprite.id)) collected += 1;
        if (masteredSet.has(sprite.id)) mastered += 1;
    }

    return {
        total: sprites.length,
        collected,
        mastered,
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
    const obtainedSet = new Set(state?.obtained || []);
    const masteredSet = new Set(state?.mastered || []);

    return sprites.filter(sprite => {
        if (state.settings.hideMastered && masteredSet.has(sprite.id)) return false;
        if (!state.settings.showUnreleased && sprite.unreleased) return false;
        if (state.viewMode && (!obtainedSet.has(sprite.id) || sprite.unreleased)) return false;

        const matchesSearch = !search || sprite.name.toLowerCase().includes(search);
        const themeFilter = state.filters.theme;
        const matchesTheme =
            themeFilter === 'all' ||
            (themeFilter === NEW_THEME_FILTER ? Boolean(sprite.isNew) : sprite.theme === themeFilter);
        const matchesSeason = state.filters.season === 'all' || (sprite.season || 'none') === state.filters.season;

        let matchesStatus = true;
        if (!state.viewMode) {
            const isOwned = obtainedSet.has(sprite.id);
            if (state.filters.status === 'owned') matchesStatus = isOwned;
            if (state.filters.status === 'missing') matchesStatus = !isOwned;
        }

        return matchesSearch && matchesTheme && matchesSeason && matchesStatus;
    });
}

export function sortSprites(items, method) {
    if (method === 'theme') {
        const decorated = items.map(item => ({
            item,
            themeRank: getThemeOrder(item.theme),
        }));
        decorated.sort((a, b) => compareRank(a.themeRank, b.themeRank));
        return decorated.map(entry => entry.item);
    }
    if (method === 'sprite') {
        const families = items.map(getFamilyKey);
        const familyRanks = buildCollatorRankMap(families);
        const decorated = items.map((item, idx) => ({
            item,
            familyRank: familyRanks.get(families[idx]) ?? 0,
            themeRank: getThemeOrder(item.theme),
        }));
        decorated.sort((a, b) => {
            if (a.familyRank !== b.familyRank) return a.familyRank - b.familyRank;
            return compareRank(a.themeRank, b.themeRank);
        });
        return decorated.map(entry => entry.item);
    }
    if (method === 'name') {
        return [...items].sort((a, b) =>
            a.name === b.name ? 0 : defaultCollator.compare(a.name, b.name)
        );
    }
    if (method === 'rarity') {
        const decorated = items.map(item => ({
            item,
            rarityRank: getRarityOrder(item.rarity),
        }));
        decorated.sort((a, b) => {
            const rankDiff = compareRank(a.rarityRank, b.rarityRank);
            if (rankDiff !== 0) return rankDiff;
            return a.item.name === b.item.name
                ? 0
                : defaultCollator.compare(a.item.name, b.item.name);
        });
        return decorated.map(entry => entry.item);
    }
    return [...items];
}

/**
 * Aplica uma ação em lote à coleção garantindo a invariante mastered ⊆ obtained.
 * @param {{ obtained: string[], mastered: string[] }} collection
 * @param {string[]} targetIds
 * @param {'collect' | 'master' | 'unmaster' | 'uncollect'} action
 * @param {Set<string>} [validIds]
 * @returns {{ collection: { obtained: string[], mastered: string[] }, changed: boolean, changedCount: number }}
 */
export function applyCollectionBatch(collection, targetIds, action, validIds) {
    const cleanTargets = validIds
        ? uniqueValidIds(targetIds, validIds)
        : [...new Set(targetIds)].filter(id => typeof id === 'string');

    if (cleanTargets.length === 0) {
        return { collection, changed: false, changedCount: 0 };
    }

    const prevObtained = collection?.obtained || [];
    const prevMastered = collection?.mastered || [];
    const targetSet = new Set(cleanTargets);
    const obtainedSet = new Set(prevObtained);
    const masteredSet = new Set(prevMastered);

    let nextObtained = prevObtained;
    let nextMastered = prevMastered;
    let changedCount = 0;

    if (action === 'collect') {
        const added = cleanTargets.filter(id => !obtainedSet.has(id));
        changedCount = added.length;
        if (changedCount > 0) {
            nextObtained = [...prevObtained, ...added];
        }
    } else if (action === 'master') {
        const addedObtained = cleanTargets.filter(id => !obtainedSet.has(id));
        const addedMastered = cleanTargets.filter(id => !masteredSet.has(id));
        changedCount = new Set([...addedObtained, ...addedMastered]).size;
        if (addedObtained.length > 0) {
            nextObtained = [...prevObtained, ...addedObtained];
        }
        if (addedMastered.length > 0) {
            nextMastered = [...prevMastered, ...addedMastered];
        }
    } else if (action === 'unmaster') {
        changedCount = cleanTargets.filter(id => masteredSet.has(id)).length;
        if (changedCount > 0) {
            nextMastered = prevMastered.filter(id => !targetSet.has(id));
        }
    } else if (action === 'uncollect') {
        changedCount = cleanTargets.filter(id => obtainedSet.has(id) || masteredSet.has(id)).length;
        if (changedCount > 0) {
            nextObtained = prevObtained.filter(id => !targetSet.has(id));
            nextMastered = prevMastered.filter(id => !targetSet.has(id));
        }
    }

    if (changedCount === 0) {
        return { collection, changed: false, changedCount: 0 };
    }

    return {
        collection: { obtained: nextObtained, mastered: nextMastered },
        changed: true,
        changedCount,
    };
}
