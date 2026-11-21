import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import {
    extractFontSubsets,
    isValidWoff2Buffer,
    verifySourceAssets,
} from './download-offline-assets.js';
import {
    parseArgs,
    planSpriteReleases,
} from './release-sprites.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Automação de lançamento (scripts/release-sprites.js)', () => {
    const sampleCatalog = [
        'export const baseSprites = [',
        '    { id: "water_basic", name: "Água", theme: "Básico", rarity: "Raro", unreleased: false, isNew: true, season: "C7T4" },',
        '    { id: "squiplash_basic", name: "Mô Lusco", theme: "Básico", rarity: "Épico", unreleased: true, season: "C7T5" },',
        '    { id: "squiplash_gold", name: "Mô Lusco Dourado", theme: "Dourado", rarity: "Especial", unreleased: true, season: "C7T5" },',
        '    { id: "missing_img", name: "Sem Imagem", theme: "Básico", rarity: "Raro", unreleased: true, season: "C7T5" },',
        '];',
    ].join('\n');

    it('parseArgs aceita formatos --flag=valor e --flag valor mantendo compatibilidade', () => {
        const parsed = parseArgs([
            '--ids=water_basic,squiplash_*',
            '--action=release',
            '--require-asset',
            '--dry-run',
        ]);
        expect(parsed.mode).toBe('ids');
        expect(parsed.ids).toBe('water_basic,squiplash_*');
        expect(parsed.action).toBe('release');
        expect(parsed.requireAsset).toBe(true);
        expect(parsed.markNew).toBe(true);
        expect(parsed.dryRun).toBe(true);
    });

    it('planSpriteReleases no modo all-unreleased com requireAsset pula sprites sem .webp, marca isNew e limpa anteriores', () => {
        const result = planSpriteReleases(sampleCatalog, {
            mode: 'all-unreleased',
            action: 'release',
            requireAsset: true,
            hasAssetFn: id => id !== 'missing_img',
        });

        expect(result.changed).toEqual(['squiplash_basic', 'squiplash_gold']);
        expect(result.skippedMissingAsset).toEqual(['missing_img']);
        expect(result.markedNew).toEqual(['squiplash_basic', 'squiplash_gold']);
        expect(result.clearedNew).toEqual(['water_basic']);
        expect(result.pendingUnreleasedCount).toBe(1);
        expect(result.updatedText).toContain(
            'id: "water_basic", name: "Água", theme: "Básico", rarity: "Raro", unreleased: false, season: "C7T4"'
        );
        expect(result.updatedText).toContain(
            'id: "squiplash_basic", name: "Mô Lusco", theme: "Básico", rarity: "Épico", unreleased: false, isNew: true, season: "C7T5"'
        );
        expect(result.updatedText).toContain(
            'id: "missing_img", name: "Sem Imagem", theme: "Básico", rarity: "Raro", unreleased: true, season: "C7T5"'
        );
    });

    it('planSpriteReleases respeita keepPreviousNew, unrelease e modo clear-new', () => {
        const kept = planSpriteReleases(sampleCatalog, {
            mode: 'ids',
            ids: 'squiplash_basic',
            action: 'release',
            keepPreviousNew: true,
        });
        expect(kept.markedNew).toEqual(['squiplash_basic']);
        expect(kept.clearedNew).toEqual([]);
        expect(kept.updatedText).toContain('id: "water_basic", name: "Água", theme: "Básico", rarity: "Raro", unreleased: false, isNew: true');

        const unreleased = planSpriteReleases(sampleCatalog, {
            mode: 'ids',
            ids: 'water_basic',
            action: 'unrelease',
        });
        expect(unreleased.changed).toEqual(['water_basic']);
        expect(unreleased.clearedNew).toEqual(['water_basic']);
        expect(unreleased.updatedText).toContain('id: "water_basic", name: "Água", theme: "Básico", rarity: "Raro", unreleased: true, season: "C7T4"');

        const cleared = planSpriteReleases(sampleCatalog, { mode: 'clear-new' });
        expect(cleared.changed).toEqual([]);
        expect(cleared.clearedNew).toEqual(['water_basic']);
        expect(cleared.updatedText).not.toContain('isNew');
    });

    it('planSpriteReleases no modo season filtra exatamente pela temporada alvo', () => {
        const result = planSpriteReleases(sampleCatalog, {
            mode: 'season',
            season: 'C7T5',
            action: 'release',
            requireAsset: false,
        });

        expect(result.changed).toEqual(['squiplash_basic', 'squiplash_gold', 'missing_img']);
        expect(result.pendingUnreleasedCount).toBe(0);
    });

    it('planSpriteReleases rejeita caracteres inválidos em ids', () => {
        expect(() =>
            planSpriteReleases(sampleCatalog, {
                mode: 'ids',
                ids: 'water_basic,$(whoami)',
            })
        ).toThrow(/IDs com caracteres inválidos/);
    });
});

describe('Assets offline e integridade do repositório (scripts/download-offline-assets.js)', () => {
    it('extractFontSubsets isola somente blocos latin-ext e latin válidos', () => {
        const mockCss = [
            '/* cyrillic */',
            '@font-face { font-family: "Roboto"; src: url(https://fonts.gstatic.com/s/roboto/v47/cyr.woff2) format("woff2"); }',
            '/* latin-ext */',
            '@font-face { font-family: "Roboto"; src: url(https://fonts.gstatic.com/s/roboto/v47/latin-ext.woff2) format("woff2"); }',
            '/* latin */',
            '@font-face { font-family: "Roboto"; src: url(https://fonts.gstatic.com/s/roboto/v47/latin.woff2) format("woff2"); }',
        ].join('\n');

        const subsets = extractFontSubsets(mockCss);
        expect(subsets.map(s => s.subset)).toEqual(['latin-ext', 'latin']);
        expect(subsets[0].remoteUrl).toContain('latin-ext.woff2');
    });

    it('isValidWoff2Buffer valida assinatura binária wOF2', () => {
        expect(isValidWoff2Buffer(Buffer.from('wOF2test'))).toBe(true);
        expect(isValidWoff2Buffer(Buffer.from('<html>'))).toBe(false);
    });

    it('todos os sprites lançados, ícones PWA e fontes locais Roboto existem para modo offline', async () => {
        const audit = await verifySourceAssets(ROOT_DIR);
        expect(audit.missingReleased).toEqual([]);
        expect(audit.missingStatic).toEqual([]);
        expect(audit.ok).toBe(true);

        const fontsCss = fs.readFileSync(path.join(ROOT_DIR, 'src/assets/fonts/roboto.css'), 'utf8');
        expect(fontsCss).toContain('./roboto-latin.woff2');
        expect(fontsCss).toContain('./roboto-latin-ext.woff2');
    });
});
