#!/usr/bin/env node
/**
 * Lança (ou oculta) elementais em src/data/sprites-data.js com suporte a modos manuais e automáticos.
 * Ao lançar novos elementais, marca automaticamente `isNew: true` nos recém-lançados
 * (e remove `isNew` dos lançamentos anteriores, salvo `--keep-previous-new`).
 *
 * Uso:
 *   node scripts/release-sprites.js --ids "bush_basic, jonesy_*" [--action release|unrelease] [--require-asset] [--dry-run]
 *   node scripts/release-sprites.js --mode all-unreleased [--season C7T5] [--require-asset] [--dry-run]
 *   node scripts/release-sprites.js --mode season --season C7T5 [--action release] [--require-asset] [--dry-run]
 *   node scripts/release-sprites.js --mode clear-new [--season C7T5] [--dry-run]
 *
 * - Suporta curinga "*" (ex.: "bush_*", "*_tricktreat").
 * - Edita `unreleased` e `isNew` preservando a formatação de linha do arquivo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DEFAULT_DATA_FILE = path.join(ROOT_DIR, 'src', 'data', 'sprites-data.js');
const DEFAULT_SPRITES_DIR = path.join(ROOT_DIR, 'sprites');

const VALID_ACTIONS = new Set(['release', 'unrelease']);
const VALID_MODES = new Set(['ids', 'all-unreleased', 'season', 'clear-new', 'none']);

export function parseArgs(argv) {
    const args = {
        mode: '',
        ids: '',
        season: '',
        action: 'release',
        requireAsset: false,
        markNew: /** @type {boolean | undefined} */ (undefined),
        keepPreviousNew: false,
        dryRun: false,
        dataFile: DEFAULT_DATA_FILE,
        spritesDir: DEFAULT_SPRITES_DIR,
        help: false,
    };

    const readValue = (arg, i) => {
        const eqIdx = arg.indexOf('=');
        if (eqIdx !== -1) {
            return { key: arg.slice(0, eqIdx), val: arg.slice(eqIdx + 1), consumedNext: false };
        }
        return { key: arg, val: argv[i + 1] || '', consumedNext: true };
    };

    for (let i = 0; i < argv.length; i++) {
        const raw = argv[i];
        if (raw === '-h' || raw === '--help') {
            args.help = true;
            return args;
        }
        if (raw === '--require-asset') {
            args.requireAsset = true;
            continue;
        }
        if (raw === '--no-require-asset') {
            args.requireAsset = false;
            continue;
        }
        if (raw === '--mark-new') {
            args.markNew = true;
            continue;
        }
        if (raw === '--no-mark-new') {
            args.markNew = false;
            continue;
        }
        if (raw === '--keep-previous-new') {
            args.keepPreviousNew = true;
            continue;
        }
        if (raw === '--clear-previous-new') {
            args.keepPreviousNew = false;
            continue;
        }
        if (raw === '--dry-run') {
            args.dryRun = true;
            continue;
        }

        const { key, val, consumedNext } = readValue(raw, i);
        if (consumedNext) i++;

        if (key === '--mode') args.mode = val;
        else if (key === '--ids') args.ids = val;
        else if (key === '--season') args.season = val.trim();
        else if (key === '--action') args.action = val;
        else if (key === '--data-file') args.dataFile = path.resolve(val);
        else if (key === '--sprites-dir') args.spritesDir = path.resolve(val);
        else {
            throw new Error(`Argumento desconhecido: ${raw}`);
        }
    }

    if (!args.mode) {
        if (args.ids.trim()) args.mode = 'ids';
        else if (args.season) args.mode = 'season';
        else args.mode = 'ids';
    }

    if (args.markNew === undefined) {
        args.markNew = args.action === 'release';
    }

    return args;
}

export function toRegex(pattern) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
}

function writeSummary(markdown) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) fs.appendFileSync(summaryFile, `${markdown}\n`);
}

function setOutput(name, value) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) fs.appendFileSync(outputFile, `${name}=${value}\n`);
}

export function parsePatterns(idsInput) {
    const patterns = [...new Set(idsInput.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean))];
    const invalid = patterns.filter(p => !/^[A-Za-z0-9_*-]+$/.test(p));
    if (invalid.length) {
        throw new Error(`IDs com caracteres inválidos: ${invalid.join(', ')}`);
    }
    return patterns;
}

export function extractSpriteLineInfo(line) {
    if (!/unreleased\s*:/.test(line)) return null;
    const lineIds = [...line.matchAll(/\bid\s*:\s*["']([^"']+)["']/g)].map(m => m[1]);
    if (lineIds.length === 0) return null;

    const currentMatch = line.match(/unreleased\s*:\s*(true|false)/);
    if (!currentMatch) return null;

    const seasonMatch = line.match(/\bseason\s*:\s*["']([^"']+)["']/);
    const isNewMatch = line.match(/\bisNew\s*:\s*(true|false)/);
    return {
        primaryId: lineIds[0],
        lineIds,
        current: currentMatch[1],
        isNew: isNewMatch ? isNewMatch[1] === 'true' : false,
        hasIsNewProp: Boolean(isNewMatch),
        season: seasonMatch ? seasonMatch[1] : '',
    };
}

export function updateIsNewOnLine(line, shouldBeNew) {
    if (shouldBeNew) {
        if (/\bisNew\s*:\s*(true|false)/.test(line)) {
            return line.replace(/\bisNew\s*:\s*(true|false)/, 'isNew: true');
        }
        if (/unreleased\s*:\s*(true|false)/.test(line)) {
            return line.replace(/(unreleased\s*:\s*(?:true|false))/, '$1, isNew: true');
        }
        return line;
    }

    return line
        .replace(/,\s*isNew\s*:\s*(true|false)/g, '')
        .replace(/\bisNew\s*:\s*(true|false)\s*,\s*/g, '');
}

function defaultHasAsset(spriteId, spritesDir) {
    const webpPath = path.join(spritesDir, `${spriteId}.webp`);
    try {
        return fs.statSync(webpPath).size > 0;
    } catch {
        return false;
    }
}

/**
 * Calcula alterações planejadas para `src/data/sprites-data.js` de forma pura/testável.
 */
export function planSpriteReleases(sourceText, options = {}) {
    const {
        mode = 'ids',
        ids = '',
        season = '',
        action = 'release',
        requireAsset = false,
        markNew = action === 'release',
        keepPreviousNew = false,
        spritesDir = DEFAULT_SPRITES_DIR,
        hasAssetFn = id => defaultHasAsset(id, spritesDir),
    } = options;

    if (!VALID_ACTIONS.has(action)) {
        throw new Error(`Ação inválida: "${action}". Use "release" ou "unrelease".`);
    }
    if (!VALID_MODES.has(mode)) {
        throw new Error(`Modo inválido: "${mode}". Use "ids", "all-unreleased", "season", "clear-new" ou "none".`);
    }
    if (mode === 'season' && !season) {
        throw new Error('Informe --season ao usar --mode season.');
    }
    if (mode === 'all-unreleased' && action === 'unrelease') {
        throw new Error('O modo "all-unreleased" só pode ser usado com --action release.');
    }

    const patterns = mode === 'ids' ? parsePatterns(ids) : ids.trim() ? parsePatterns(ids) : [];
    if (mode === 'ids' && patterns.length === 0) {
        throw new Error('Nenhum id informado.');
    }

    const matchers = patterns.map(p => ({ pattern: p, regex: toRegex(p), hits: 0 }));
    const targetValue = action === 'release' ? 'false' : 'true';
    const lines = sourceText.split('\n');

    const changed = [];
    const unchanged = [];
    const skippedMissingAsset = [];
    const markedNew = [];
    const clearedNew = [];
    const duplicateIdWarnings = [];
    let pendingUnreleasedCount = 0;

    // Passagem 1: calcula alterações de `unreleased` e valida seleção
    const entries = lines.map(line => {
        const info = extractSpriteLineInfo(line);
        if (!info) return { line, info: null, nextLine: line, selected: false, didChangeUnreleased: false };

        if (info.lineIds.length > 1) {
            duplicateIdWarnings.push({ primaryId: info.primaryId, lineIds: info.lineIds });
        }

        if (info.current === 'true') {
            pendingUnreleasedCount++;
        }

        if (mode === 'none' || mode === 'clear-new') {
            return { line, info, nextLine: line, selected: false, didChangeUnreleased: false };
        }

        const seasonMatches = !season || info.season === season;
        let selected = false;

        if (mode === 'ids') {
            const matchedByPattern = matchers.filter(m => info.lineIds.some(id => m.regex.test(id)));
            if (matchedByPattern.length > 0) {
                matchedByPattern.forEach(m => m.hits++);
                selected = seasonMatches;
            }
        } else if (mode === 'all-unreleased') {
            selected = seasonMatches && info.current === 'true';
        } else if (mode === 'season') {
            selected = seasonMatches;
        }

        if (!selected) {
            return { line, info, nextLine: line, selected: false, didChangeUnreleased: false };
        }

        if (info.current === targetValue) {
            unchanged.push(info.primaryId);
            return { line, info, nextLine: line, selected: true, didChangeUnreleased: false };
        }

        if (action === 'release' && requireAsset && !hasAssetFn(info.primaryId)) {
            skippedMissingAsset.push(info.primaryId);
            return { line, info, nextLine: line, selected: false, didChangeUnreleased: false };
        }

        changed.push(info.primaryId);
        if (action === 'release') {
            pendingUnreleasedCount = Math.max(0, pendingUnreleasedCount - 1);
        } else {
            pendingUnreleasedCount++;
        }

        const nextLine = line.replace(/unreleased\s*:\s*(true|false)/, `unreleased: ${targetValue}`);
        return { line, info, nextLine, selected: true, didChangeUnreleased: true };
    });

    // Passagem 2: aplica ou limpa `isNew` conforme ação/modo
    const shouldClearPreviousNew =
        action === 'release' && markNew && !keepPreviousNew && changed.length > 0;

    const updatedLines = entries.map(entry => {
        if (!entry.info) return entry.nextLine;
        const { info } = entry;

        if (mode === 'clear-new') {
            const matchedByPattern =
                patterns.length === 0
                    ? []
                    : matchers.filter(m => info.lineIds.some(id => m.regex.test(id)));
            if (matchedByPattern.length > 0) {
                matchedByPattern.forEach(m => m.hits++);
            }
            const matchesScope = !season || info.season === season;
            const matchesPattern = patterns.length === 0 || matchedByPattern.length > 0;
            if (matchesScope && matchesPattern && info.hasIsNewProp) {
                clearedNew.push(info.primaryId);
                return updateIsNewOnLine(entry.nextLine, false);
            }
            return entry.nextLine;
        }

        if (action === 'unrelease' && entry.selected && info.hasIsNewProp) {
            clearedNew.push(info.primaryId);
            return updateIsNewOnLine(entry.nextLine, false);
        }

        if (action === 'release') {
            if (entry.didChangeUnreleased && markNew) {
                markedNew.push(info.primaryId);
                return updateIsNewOnLine(entry.nextLine, true);
            }
            if (!entry.didChangeUnreleased && shouldClearPreviousNew && info.hasIsNewProp) {
                clearedNew.push(info.primaryId);
                return updateIsNewOnLine(entry.nextLine, false);
            }
        }

        return entry.nextLine;
    });

    const notFound =
        mode === 'ids' || (mode === 'clear-new' && patterns.length > 0)
            ? matchers.filter(m => m.hits === 0).map(m => m.pattern)
            : [];

    return {
        updatedText: updatedLines.join('\n'),
        changed,
        unchanged,
        skippedMissingAsset,
        markedNew,
        clearedNew,
        notFound,
        duplicateIdWarnings,
        pendingUnreleasedCount,
    };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(
            'Uso: node scripts/release-sprites.js [--mode ids|all-unreleased|season|clear-new|none] [--ids "id1,id2,prefix_*"] [--season C7T5] [--action release|unrelease] [--require-asset] [--keep-previous-new] [--no-mark-new] [--dry-run]'
        );
        process.exit(0);
    }

    const original = fs.readFileSync(args.dataFile, 'utf8');
    const result = planSpriteReleases(original, args);

    for (const warn of result.duplicateIdWarnings) {
        console.warn(
            `[AVISO] Sprite "${warn.primaryId}" possui chave "id" duplicada (${warn.lineIds.join(', ')}). ` +
                'Em JS, o último valor sobrescreve o primeiro.'
        );
    }

    const verb = args.action === 'release' ? 'lançado(s)' : 'marcado(s) como não lançado(s)';
    console.log(`Modo: ${args.mode} | Ação: ${args.action}${args.dryRun ? ' (dry-run)' : ''}`);
    if (args.season) console.log(`Temporada filtrada: ${args.season}`);
    console.log(`Alterados (${result.changed.length}): ${result.changed.join(', ') || '-'}`);
    if (result.markedNew.length) {
        console.log(`Marcados como NOVO (${result.markedNew.length}): ${result.markedNew.join(', ')}`);
    }
    if (result.clearedNew.length) {
        console.log(`Selo NOVO removido (${result.clearedNew.length}): ${result.clearedNew.join(', ')}`);
    }
    console.log(`Já estavam no estado desejado (${result.unchanged.length}): ${result.unchanged.join(', ') || '-'}`);
    if (result.skippedMissingAsset.length) {
        console.log(
            `Ignorados sem .webp (${result.skippedMissingAsset.length}): ${result.skippedMissingAsset.join(', ')}`
        );
    }
    if (result.notFound.length) {
        console.log(`Não encontrados (${result.notFound.length}): ${result.notFound.join(', ')}`);
    }

    writeSummary([
        `## 🚀 Lançamento de elementais${args.dryRun ? ' (dry-run)' : ''}`,
        '',
        `**Modo:** \`${args.mode}\` | **Ação:** \`${args.action}\`${args.season ? ` | **Temporada:** \`${args.season}\`` : ''}`,
        '',
        `### ✅ ${result.changed.length} sprite(s) ${verb}`,
        result.changed.length ? result.changed.map(id => `- \`${id}\``).join('\n') : '_Nenhum_',
        '',
        result.markedNew.length
            ? `### 🆕 Marcados como "Novo" (${result.markedNew.length})\n${result.markedNew.map(id => `- \`${id}\``).join('\n')}\n`
            : '',
        result.clearedNew.length
            ? `### 🧹 Selo "Novo" removido de anteriores (${result.clearedNew.length})\n${result.clearedNew.map(id => `- \`${id}\``).join('\n')}\n`
            : '',
        result.skippedMissingAsset.length
            ? `### ⚠️ Ignorados sem arquivo \`.webp\` (${result.skippedMissingAsset.length})\n${result.skippedMissingAsset.map(id => `- \`${id}\``).join('\n')}\n`
            : '',
        result.unchanged.length
            ? `### ⏭️ Sem alteração (${result.unchanged.length})\n${result.unchanged.map(id => `- \`${id}\``).join('\n')}\n`
            : '',
        result.notFound.length
            ? `### ❌ Não encontrados (${result.notFound.length})\n${result.notFound.map(id => `- \`${id}\``).join('\n')}\n`
            : '',
    ].join('\n'));

    setOutput('changed_count', String(result.changed.length));
    setOutput('changed_ids', result.changed.join(','));
    setOutput('marked_new_count', String(result.markedNew.length));
    setOutput('cleared_new_count', String(result.clearedNew.length));
    setOutput('skipped_count', String(result.skippedMissingAsset.length));
    setOutput('skipped_ids', result.skippedMissingAsset.join(','));
    setOutput('pending_unreleased_count', String(result.pendingUnreleasedCount));

    if (result.notFound.length) {
        console.error('[ERRO] Alguns ids não foram encontrados. Nenhuma alteração foi gravada.');
        process.exit(1);
    }

    if (!args.dryRun && (result.changed.length > 0 || result.markedNew.length > 0 || result.clearedNew.length > 0)) {
        fs.writeFileSync(args.dataFile, result.updatedText, 'utf8');
        console.log(`Arquivo atualizado: ${path.relative(process.cwd(), args.dataFile)}`);
    }
}

const isEntrypoint =
    Boolean(process.argv[1]) &&
    pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url;

if (isEntrypoint) {
    try {
        main();
    } catch (err) {
        console.error(`[ERRO] ${err.message}`);
        process.exit(1);
    }
}
