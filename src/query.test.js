import { describe, it, expect } from 'vitest';
import {
    filterSprites,
    sortSprites,
    getReleasedSprites,
    getCollectionCounts,
    getActiveThemes,
    hasNewSprites,
    NEW_THEME_FILTER,
    getActiveSeasons,
    getExportThemeLabel,
    getTradeThemeLabel,
    getSpriteDataIssues,
    getFamilyKey,
    getSeasonData,
    getFamilyKeys,
    getCharName,
    getCharNameMap,
    resolveCharName,
    getSpriteIdSet,
    getFamilyThemeMap,
    uniqueValidIds,
    isObtained,
    isMastered,
    getDisplayName,
    applyCollectionBatch,
} from './query.js';
import { THEME, THEME_ORDER, getCardStyleVars, getRarityStripStyle } from './taxonomy.js';
import { baseSprites } from './data/sprites-data.js';
import { getSpriteImageUrl } from './assets/spriteImages.js';

const sprites = [
    { id: 'water_basic', name: 'Água', theme: 'Básico', rarity: 'Raro', unreleased: false, season: 'C7T3' },
    { id: 'water_gold', name: 'Água Dourado', theme: 'Dourado', rarity: 'Especial', unreleased: false, season: 'C7T3' },
    { id: 'fire_basic', name: 'Fogo', theme: 'Básico', rarity: 'Raro', unreleased: false, season: 'C7T4' },
    { id: 'onewish_basic', name: 'Desejo', theme: 'Básico', rarity: 'Mítico', unreleased: false, season: 'C7T4' },
    { id: 'soon_basic', name: 'Em breve', theme: 'Básico', rarity: 'Épico', unreleased: true, season: 'C7T4' },
];

function makeState(overrides = {}) {
    return {
        obtained: [],
        mastered: [],
        viewMode: false,
        filters: { search: '', theme: 'all', season: 'all', status: 'all' },
        settings: { hideMastered: false, sortOrder: 'theme', showUnreleased: false },
        ...overrides,
    };
}

describe('filterSprites', () => {
    it('oculta não lançados por padrão e mostra quando habilitado', () => {
        expect(filterSprites(sprites, makeState())).toHaveLength(4);
        const withUnreleased = makeState({
            settings: { hideMastered: false, sortOrder: 'theme', showUnreleased: true },
        });
        expect(filterSprites(sprites, withUnreleased)).toHaveLength(5);
    });

    it('busca por nome ignorando maiúsculas e espaços nas pontas', () => {
        const state = makeState({ filters: { search: '  ÁGUA ', theme: 'all', season: 'all', status: 'all' } });
        expect(filterSprites(sprites, state).map(s => s.id)).toEqual(['water_basic', 'water_gold']);
    });

    it('filtra por tema e temporada', () => {
        const state = makeState({ filters: { search: '', theme: 'Básico', season: 'C7T4', status: 'all' } });
        expect(filterSprites(sprites, state).map(s => s.id)).toEqual(['fire_basic', 'onewish_basic']);
    });

    it('filtra por status coletado/faltando', () => {
        const owned = makeState({
            obtained: ['water_basic'],
            filters: { search: '', theme: 'all', season: 'all', status: 'owned' },
        });
        expect(filterSprites(sprites, owned).map(s => s.id)).toEqual(['water_basic']);

        const missing = { ...owned, filters: { ...owned.filters, status: 'missing' } };
        expect(filterSprites(sprites, missing)).toHaveLength(3);
    });

    it('oculta dominados quando configurado', () => {
        const state = makeState({
            obtained: ['water_basic'],
            mastered: ['water_basic'],
            settings: { hideMastered: true, sortOrder: 'theme', showUnreleased: false },
        });
        expect(filterSprites(sprites, state).map(s => s.id)).not.toContain('water_basic');
    });

    it('em modo somente leitura mostra apenas coletados', () => {
        const state = makeState({ viewMode: true, obtained: ['fire_basic'] });
        expect(filterSprites(sprites, state).map(s => s.id)).toEqual(['fire_basic']);
    });

    it('filtra apenas novos por NEW_THEME_FILTER e hasNewSprites ignora não lançados', () => {
        const list = [
            ...sprites.slice(0, 2),
            { id: 'new_released', name: 'Novo', theme: 'Básico', rarity: 'Épico', unreleased: false, isNew: true, season: 'C7T5' },
            { id: 'new_unreleased', name: 'Novo Oculto', theme: 'Básico', rarity: 'Raro', unreleased: true, isNew: true, season: 'C7T5' },
        ];
        expect(hasNewSprites(list)).toBe(true);
        expect(hasNewSprites([list[0], list[3]])).toBe(false);

        const state = makeState({ filters: { search: '', theme: NEW_THEME_FILTER, season: 'all', status: 'all' } });
        expect(filterSprites(list, state).map(s => s.id)).toEqual(['new_released']);
    });
});

describe('sortSprites', () => {
    it('ordena por raridade (mais rara primeiro) e depois por nome', () => {
        const ids = sortSprites(sprites, 'rarity').map(s => s.id);
        expect(ids.slice(0, 2)).toEqual(['onewish_basic', 'soon_basic']);
        expect(ids.at(-1)).toBe('water_gold');
    });

    it('ordena por tema seguindo a taxonomia', () => {
        const ids = sortSprites(sprites, 'theme').map(s => s.theme);
        expect(ids.at(-1)).toBe('Dourado');
    });

    it('ordena por nome e não muta o array original', () => {
        const copy = [...sprites];
        const names = sortSprites(sprites, 'name').map(s => s.name);
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
        expect(sprites).toEqual(copy);
    });

    it('ordena por sprite (família por localeCompare e desempate por THEME_ORDER)', () => {
        const ids = sortSprites(sprites, 'sprite').map(s => s.id);
        expect(ids).toEqual(['fire_basic', 'onewish_basic', 'soon_basic', 'water_basic', 'water_gold']);
    });

    it('mantém a ordem original quando método de ordenação é desconhecido', () => {
        const ids = sortSprites(sprites, 'desconhecido').map(s => s.id);
        expect(ids).toEqual(sprites.map(s => s.id));
    });

    it('garante paridade de ordenação em todos os métodos sobre baseSprites', () => {
        for (const method of ['theme', 'sprite', 'name', 'rarity']) {
            const result = sortSprites(baseSprites, method);
            expect(result).toHaveLength(baseSprites.length);
            expect(new Set(result.map(s => s.id)).size).toBe(baseSprites.length);
        }
    });
});

describe('contagens e temas', () => {
    it('getReleasedSprites ignora não lançados e respeita a temporada', () => {
        expect(getReleasedSprites(sprites)).toHaveLength(4);
        expect(getReleasedSprites(sprites, 'C7T3')).toHaveLength(2);
    });

    it('getCollectionCounts conta coletados e dominados', () => {
        const state = makeState({ obtained: ['water_basic', 'fire_basic'], mastered: ['fire_basic'] });
        expect(getCollectionCounts(getReleasedSprites(sprites), state)).toEqual({
            total: 4,
            collected: 2,
            mastered: 1,
        });
        expect(getCollectionCounts([], makeState())).toEqual({
            total: 0,
            collected: 0,
            mastered: 0,
        });
    });

    it('getSeasonData retorna objeto de temporada esperado ou none', () => {
        expect(getSeasonData('C7T3')).toEqual({ name: 'C7T3' });
        expect(getSeasonData('C7T4')).toEqual({ name: 'C7T4' });
        expect(getSeasonData('C7T5')).toEqual({ name: 'C7T5' });
        expect(getSeasonData('C7T6')).toEqual({ name: 'C7T6' });
        expect(getSeasonData('outra')).toEqual({ name: 'none' });
        expect(getSeasonData(undefined)).toEqual({ name: 'none' });
    });

    it('getActiveSeasons extrai temporadas ordenadas dinamicamente', () => {
        expect(getActiveSeasons(sprites)).toEqual(['C7T3', 'C7T4']);
        expect(
            getActiveSeasons([
                { season: 'C7T5' },
                { season: 'C7T3' },
                { season: 'C7T6' },
                { season: 'C7T4' },
                { season: 'C7T10' },
                { season: 'none' },
            ])
        ).toEqual(['C7T3', 'C7T4', 'C7T5', 'C7T6', 'C7T10']);
        expect(getActiveSeasons(baseSprites)).toEqual(['C7T3', 'C7T4', 'C7T5']);
    });

    it('getCardStyleVars deriva tokens de cor da fonte única sem divergência no modo simples', () => {
        for (const [themeName, entry] of Object.entries(THEME)) {
            const colors = entry.displayGradient || entry.gradient;
            const vars = getCardStyleVars('Especial', themeName);
            expect(colors).toHaveLength(3);
            expect(vars['--card-display-bg']).toBe(
                `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 75%, ${colors[2]} 100%)`
            );
            expect(vars['--card-low-fidelity-bg']).toBe(entry.lowFidelityBg || colors[0]);
        }

        const rareVars = getCardStyleVars('Raro', 'Básico');
        expect(rareVars['--card-strip-bg']).toContain('#3b82f6');
        expect(rareVars['--rarity-glow']).toBeTruthy();

        expect(getRarityStripStyle('Especial').colors).toEqual([
            '#98f5c9',
            '#8ee3f5',
            '#a3bffa',
            '#d4b8ff',
            '#f9b4d4',
            '#fde08d',
        ]);
    });

    it('getFamilyKeys preserva ordem de primeira aparição sem duplicatas', () => {
        expect(getFamilyKeys(sprites)).toEqual(['water', 'fire', 'onewish', 'soon']);
        expect(getFamilyKeys([])).toEqual([]);
    });

    it('getActiveThemes devolve temas únicos na ordem da taxonomia', () => {
        expect(getActiveThemes(sprites)).toEqual(['Básico', 'Dourado']);
        expect(getActiveThemes(baseSprites)[0]).toBe('Básico');
    });

    it('getCharName usa o nome do sprite _basic quando existe ou capitaliza a chave', () => {
        expect(getCharName('water', sprites)).toBe('Água');
        expect(getCharName('onewish', sprites)).toBe('Desejo');
        expect(getCharName('desconhecido', sprites)).toBe('Desconhecido');
    });

    it('getFamilyThemeMap, getSpriteIdSet, uniqueValidIds e helpers auxiliares mantêm comportamento exato', () => {
        const idSet = getSpriteIdSet(sprites);
        expect(idSet.size).toBe(5);
        expect(uniqueValidIds(['water_basic', 'water_basic', 'invalid'], idSet)).toEqual(['water_basic']);

        const map = getFamilyThemeMap(sprites);
        expect([...map.keys()]).toEqual(['water', 'fire', 'onewish', 'soon']);
        expect(map.get('water').get('Dourado')?.id).toBe('water_gold');

        const state = makeState({ obtained: ['water_basic'], mastered: ['water_basic'] });
        expect(isObtained(state, 'water_basic')).toBe(true);
        expect(isObtained(state, 'fire_basic')).toBe(false);
        expect(isMastered(state, 'water_basic')).toBe(true);
        expect(getDisplayName('Fogo')).toBe('Fogo Sprite');
        expect(getDisplayName('Burnt Peanut')).toBe('Burnt Peanut');
    });

    it('getFamilyKey usa o prefixo do id até o último underscore', () => {
        expect(getFamilyKey({ id: 'water_basic' })).toBe('water');
        expect(getFamilyKey({ id: 'ice_king_basic' })).toBe('ice_king');
        expect(getFamilyKey({ id: 'solo' })).toBe('solo');
    });

    it('rótulos de exportação e troca vêm da taxonomia', () => {
        expect(getExportThemeLabel('Básico')).toBe('NORMAL');
        expect(getExportThemeLabel('Galáctico')).toBe('GALÁCTICO');
        expect(getTradeThemeLabel('Básico')).toBe('Base');
        expect(getTradeThemeLabel('Gema')).toBe('Gema');
        expect(getExportThemeLabel('Desconhecido')).toBe('DESCONHECIDO');
    });
});

describe('integridade dos dados reais (sprites-data.js)', () => {
    it('todos os sprites lançados têm nome, tema e raridade válidos e ids únicos', () => {
        expect(getSpriteDataIssues(baseSprites)).toEqual([]);
    });

    it('detecta problemas em sprites lançados incompletos', () => {
        const issues = getSpriteDataIssues([
            { id: 'a_basic', name: '', theme: 'Inexistente', rarity: 'Raro', unreleased: false },
            { id: 'a_basic', name: 'X', theme: 'Básico', rarity: 'Raro', unreleased: false },
            { id: 'placeholder', name: '', theme: '', rarity: '', unreleased: true },
        ]);
        expect(issues).toEqual([
            'a_basic: nome vazio',
            'a_basic: tema desconhecido "Inexistente"',
            'a_basic: id duplicado',
        ]);
    });

    it('usa sprite_unreal.webp como fallback quando a imagem do id ainda não existe', () => {
        const fallbackUrl = getSpriteImageUrl('__sprite_inexistente_1__');
        const sameFallbackUrl = getSpriteImageUrl('__sprite_inexistente_2__');
        const unrealUrl = getSpriteImageUrl('sprite_unreal');
        const realUrl = getSpriteImageUrl('water_basic');

        expect(fallbackUrl).toBeTruthy();
        expect(fallbackUrl).toBe(sameFallbackUrl);
        expect(fallbackUrl).toBe(unrealUrl);
        expect(fallbackUrl).not.toBe(realUrl);
    });
});

describe('applyCollectionBatch', () => {
    const validIds = getSpriteIdSet(sprites);

    it('marca coletados sem duplicar e sem alterar dominados existentes', () => {
        const initial = { obtained: ['water_basic'], mastered: ['water_basic'] };
        const result = applyCollectionBatch(
            initial,
            ['water_basic', 'water_gold', 'fire_basic'],
            'collect',
            validIds
        );

        expect(result.changed).toBe(true);
        expect(result.changedCount).toBe(2);
        expect(result.collection).toEqual({
            obtained: ['water_basic', 'water_gold', 'fire_basic'],
            mastered: ['water_basic'],
        });
    });

    it('marca dominados garantindo invariante mastered ⊆ obtained', () => {
        const initial = { obtained: ['water_basic'], mastered: [] };
        const result = applyCollectionBatch(
            initial,
            ['water_basic', 'fire_basic'],
            'master',
            validIds
        );

        expect(result.changed).toBe(true);
        expect(result.changedCount).toBe(2);
        expect(result.collection.obtained).toEqual(['water_basic', 'fire_basic']);
        expect(result.collection.mastered).toEqual(['water_basic', 'fire_basic']);
    });

    it('remove domínio sem remover da coleção e remove da coleção limpando domínio', () => {
        const initial = {
            obtained: ['water_basic', 'water_gold', 'fire_basic'],
            mastered: ['water_basic', 'water_gold'],
        };

        const unmastered = applyCollectionBatch(
            initial,
            ['water_basic', 'fire_basic'],
            'unmaster',
            validIds
        );
        expect(unmastered.changed).toBe(true);
        expect(unmastered.changedCount).toBe(1);
        expect(unmastered.collection).toEqual({
            obtained: ['water_basic', 'water_gold', 'fire_basic'],
            mastered: ['water_gold'],
        });

        const uncollected = applyCollectionBatch(
            unmastered.collection,
            ['water_gold', 'fire_basic'],
            'uncollect',
            validIds
        );
        expect(uncollected.changed).toBe(true);
        expect(uncollected.changedCount).toBe(2);
        expect(uncollected.collection).toEqual({
            obtained: ['water_basic'],
            mastered: [],
        });
    });

    it('retorna mesma referência sem alteração para alvos já satisfeitos ou inválidos', () => {
        const initial = { obtained: ['water_basic'], mastered: ['water_basic'] };

        const alreadyMastered = applyCollectionBatch(initial, ['water_basic'], 'master', validIds);
        expect(alreadyMastered.changed).toBe(false);
        expect(alreadyMastered.changedCount).toBe(0);
        expect(alreadyMastered.collection).toBe(initial);

        const unknownOnly = applyCollectionBatch(initial, ['id_desconhecido'], 'collect', validIds);
        expect(unknownOnly.changed).toBe(false);
        expect(unknownOnly.collection).toBe(initial);
    });
});

describe('otimizações de consulta e ordenação', () => {
    it('getCharNameMap + resolveCharName mantêm paridade O(1) com getCharName', () => {
        const list = [
            ...sprites,
            { id: 'empty_basic', name: '', theme: 'Básico', rarity: 'Raro', unreleased: true },
            { id: 'water_basic', name: 'Ignorado', theme: 'Básico', rarity: 'Raro', unreleased: false },
        ];
        const nameMap = getCharNameMap(list);

        for (const key of ['water', 'onewish', 'empty', 'desconhecido']) {
            expect(resolveCharName(nameMap, key)).toBe(getCharName(key, list));
        }
    });

    it('sortSprites("sprite") mantém exatamente a mesma ordem de Intl.Collator + THEME_ORDER', () => {
        const collator = new Intl.Collator();
        const themeIndex = new Map(THEME_ORDER.map((k, i) => [k, i]));
        const expectedIds = [...baseSprites]
            .sort((a, b) => {
                const famA = getFamilyKey(a);
                const famB = getFamilyKey(b);
                const cmp = famA === famB ? 0 : collator.compare(famA, famB);
                if (cmp !== 0) return cmp;
                return (themeIndex.get(a.theme) ?? Infinity) - (themeIndex.get(b.theme) ?? Infinity);
            })
            .map(s => s.id);

        expect(sortSprites(baseSprites, 'sprite').map(s => s.id)).toEqual(expectedIds);
    });
});
