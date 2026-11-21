import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import {
    extractFontSubsets,
    isValidWoff2Buffer,
    verifyDistOfflineBundle,
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

    it('planSpriteReleases rejeita mode all-unreleased com action unrelease', () => {
        expect(() =>
            planSpriteReleases(sampleCatalog, {
                mode: 'all-unreleased',
                action: 'unrelease',
            })
        ).toThrow(/all-unreleased/);
    });

    it('planSpriteReleases no modo clear-new com ids valida notFound e limpa apenas alvos casados', () => {
        const withValidId = planSpriteReleases(sampleCatalog, {
            mode: 'clear-new',
            ids: 'water_basic',
        });
        expect(withValidId.notFound).toEqual([]);
        expect(withValidId.clearedNew).toEqual(['water_basic']);
        expect(withValidId.updatedText).not.toContain('isNew');

        const withTypoId = planSpriteReleases(sampleCatalog, {
            mode: 'clear-new',
            ids: 'water_basic,id_inexistente',
        });
        expect(withTypoId.notFound).toEqual(['id_inexistente']);
    });
});

describe('Assets offline e integridade do repositório (scripts/download-offline-assets.js)', () => {
    it('extractFontSubsets isola somente o bloco latin por padrão e aceita lista customizada', () => {
        const mockCss = [
            '/* cyrillic */',
            '@font-face { font-family: "Roboto"; src: url(https://fonts.gstatic.com/s/roboto/v47/cyr.woff2) format("woff2"); }',
            '/* latin-ext */',
            '@font-face { font-family: "Roboto"; src: url(https://fonts.gstatic.com/s/roboto/v47/latin-ext.woff2) format("woff2"); }',
            '/* latin */',
            '@font-face { font-family: "Roboto"; src: url(https://fonts.gstatic.com/s/roboto/v47/latin.woff2) format("woff2"); }',
        ].join('\n');

        const defaultSubsets = extractFontSubsets(mockCss);
        expect(defaultSubsets.map(s => s.subset)).toEqual(['latin']);
        expect(defaultSubsets[0].remoteUrl).toContain('latin.woff2');

        const customSubsets = extractFontSubsets(mockCss, ['latin-ext', 'latin']);
        expect(customSubsets.map(s => s.subset)).toEqual(['latin-ext', 'latin']);
    });

    it('isValidWoff2Buffer valida assinatura binária wOF2', () => {
        expect(isValidWoff2Buffer(Buffer.from('wOF2test'))).toBe(true);
        expect(isValidWoff2Buffer(Buffer.from('<html>'))).toBe(false);
    });

    it('todos os sprites lançados, ícones PWA e fonte local Roboto (latin) existem para modo offline', async () => {
        const audit = await verifySourceAssets(ROOT_DIR);
        expect(audit.missingReleased).toEqual([]);
        expect(audit.missingStatic).toEqual([]);
        expect(audit.ok).toBe(true);

        const fontsCss = fs.readFileSync(path.join(ROOT_DIR, 'src/assets/fonts/roboto.css'), 'utf8');
        expect(fontsCss).toContain('./roboto-latin.woff2');
        expect(fontsCss).not.toContain('./roboto-latin-ext.woff2');
        expect(fs.existsSync(path.join(ROOT_DIR, 'src/assets/fonts/roboto-latin-ext.woff2'))).toBe(false);
    });

    it('verifyDistOfflineBundle valida bundle offline completo e detecta falhas de integridade', () => {
        const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fnpituchinhu-dist-'));
        try {
            const distDir = path.join(tmpRoot, 'dist');
            const assetsDir = path.join(distDir, 'assets');
            fs.mkdirSync(assetsDir, { recursive: true });

            const writeFixture = ({ html, swEntries }) => {
                fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
                fs.writeFileSync(path.join(distDir, 'manifest.webmanifest'), '{}', 'utf8');
                fs.writeFileSync(path.join(distDir, 'pwa-192x192.png'), 'png', 'utf8');
                fs.writeFileSync(path.join(assetsDir, 'index-abc.js'), 'console.log(1);', 'utf8');
                fs.writeFileSync(path.join(assetsDir, 'index-abc.css'), 'body{}', 'utf8');
                fs.writeFileSync(path.join(assetsDir, 'roboto-latin-abc.woff2'), 'wOF2font', 'utf8');
                fs.writeFileSync(path.join(assetsDir, 'water_basic-abc.webp'), 'webp', 'utf8');
                fs.writeFileSync(
                    path.join(distDir, 'sw.js'),
                    `self.__WB_MANIFEST=[${swEntries.join(',')}];`,
                    'utf8'
                );
            };

            const validEntries = [
                `{ url: 'index.html', revision: '1' }`,
                `{url:"pwa-192x192.png",revision:"1"}`,
                `{url:"assets/index-abc.js",revision:null}`,
                `{url:"assets/index-abc.css",revision:null}`,
                `{url:"assets/roboto-latin-abc.woff2",revision:null}`,
                `{url:"assets/water_basic-abc.webp",revision:null}`,
            ];

            // 1. Bundle válido
            writeFixture({
                html: '<!doctype html><html><head><link rel="preload" as="font" href="./assets/roboto-latin-abc.woff2" crossorigin></head><body></body></html>',
                swEntries: validEntries,
            });
            const okAudit = verifyDistOfflineBundle(tmpRoot);
            expect(okAudit.ok).toBe(true);
            expect(okAudit.errors).toEqual([]);
            expect(okAudit.precacheCount).toBe(6);
            expect(okAudit.precachedFonts).toBe(1);
            expect(okAudit.precachedWebps).toBe(1);

            // 2. HTML com URL externa do Google Fonts
            writeFixture({
                html: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto">',
                swEntries: validEntries,
            });
            const fontsErr = verifyDistOfflineBundle(tmpRoot);
            expect(fontsErr.ok).toBe(false);
            expect(fontsErr.errors.some(e => /Google Fonts/.test(e))).toBe(true);

            // 3. Entrada duplicada no manifesto Workbox
            writeFixture({
                html: '<!doctype html><html></html>',
                swEntries: [...validEntries, `{url:"pwa-192x192.png",revision:"2"}`],
            });
            const dupErr = verifyDistOfflineBundle(tmpRoot);
            expect(dupErr.ok).toBe(false);
            expect(dupErr.errors.some(e => /duplicadas/.test(e))).toBe(true);

            // 4. Asset .webp ausente do pré-cache
            writeFixture({
                html: '<!doctype html><html></html>',
                swEntries: validEntries.filter(entry => !entry.includes('water_basic')),
            });
            const missingErr = verifyDistOfflineBundle(tmpRoot);
            expect(missingErr.ok).toBe(false);
            expect(missingErr.errors.some(e => /ausentes no pré-cache/.test(e))).toBe(true);
            expect(missingErr.errors.some(e => /Cobertura incompleta/.test(e))).toBe(true);
        } finally {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        }
    });
});
