#!/usr/bin/env node
/**
 * Baixa fontes Roboto locais para uso offline e audita a integridade
 * dos assets (.webp, ícones PWA, fontes e manifesto Workbox em dist/sw.js).
 *
 * Uso:
 *   node scripts/download-offline-assets.js [--sync-fonts] [--skip-if-offline] [--verify] [--verify-dist]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FONTS_CSS_URL = 'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap';
const MODERN_UA =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const REQUIRED_SUBSETS = ['latin'];
const REQUEST_TIMEOUT_MS = 15_000;

export function parseArgs(argv) {
    const args = {
        syncFonts: false,
        skipIfOffline: false,
        verify: false,
        verifyDist: false,
    };

    for (const arg of argv) {
        if (arg === '--sync-fonts') args.syncFonts = true;
        else if (arg === '--skip-if-offline') args.skipIfOffline = true;
        else if (arg === '--verify') args.verify = true;
        else if (arg === '--verify-dist') args.verifyDist = true;
        else if (arg === '-h' || arg === '--help') {
            console.log(
                'Uso: node scripts/download-offline-assets.js [--sync-fonts] [--skip-if-offline] [--verify] [--verify-dist]'
            );
            process.exit(0);
        } else {
            throw new Error(`Argumento desconhecido: ${arg}`);
        }
    }

    if (!args.syncFonts && !args.verify && !args.verifyDist) {
        args.verify = true;
    }

    return args;
}

function appendStepSummary(markdown) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) fs.appendFileSync(summaryFile, `${markdown}\n`);
}

function setOutput(name, value) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) fs.appendFileSync(outputFile, `${name}=${value}\n`);
}

/**
 * Extrai apenas os blocos `@font-face` necessários (`latin`) da folha CSS do Google Fonts.
 * @param {string} cssText
 * @param {string[]} [subsets]
 */
export function extractFontSubsets(cssText, subsets = REQUIRED_SUBSETS) {
    const blocks = [];
    const blockRegex = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*(@font-face\s*\{[\s\S]*?\})/gi;

    for (const match of cssText.matchAll(blockRegex)) {
        const subset = match[1].toLowerCase();
        const block = match[2];
        if (!subsets.includes(subset)) continue;

        const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/i);
        if (!urlMatch) continue;

        blocks.push({
            subset,
            remoteUrl: urlMatch[1],
            block,
        });
    }

    const foundSubsets = new Set(blocks.map(item => item.subset));
    for (const required of subsets) {
        if (!foundSubsets.has(required)) {
            throw new Error(`Subset de fonte obrigatório não encontrado na resposta CSS: "${required}"`);
        }
    }

    return blocks;
}

export function isValidWoff2Buffer(buffer) {
    return (
        buffer.length >= 4 &&
        buffer[0] === 0x77 && // 'w'
        buffer[1] === 0x4f && // 'O'
        buffer[2] === 0x46 && // 'F'
        buffer[3] === 0x32 // '2'
    );
}

async function fetchWithTimeout(url, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ao baixar ${url}`);
        }
        return response;
    } finally {
        clearTimeout(timer);
    }
}

function writeFileIfChanged(filePath, nextContent) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const nextBuf = Buffer.isBuffer(nextContent) ? nextContent : Buffer.from(nextContent, 'utf8');
    if (fs.existsSync(filePath)) {
        const currentBuf = fs.readFileSync(filePath);
        if (currentBuf.equals(nextBuf)) return false;
    }
    fs.writeFileSync(filePath, nextBuf);
    return true;
}

/**
 * Baixa a fonte variável Roboto (`latin`) para `src/assets/fonts/`.
 * Retorna `{ changed, skippedOffline, files }`.
 */
export async function syncLocalFonts(rootDir = ROOT_DIR, { skipIfOffline = false } = {}) {
    const fontsDir = path.join(rootDir, 'src', 'assets', 'fonts');
    const cssPath = path.join(fontsDir, 'roboto.css');

    let cssText;
    try {
        const res = await fetchWithTimeout(FONTS_CSS_URL, {
            headers: {
                'User-Agent': MODERN_UA,
                Accept: 'text/css,*/*;q=0.1',
            },
        });
        cssText = await res.text();
    } catch (err) {
        if (skipIfOffline && fs.existsSync(cssPath)) {
            console.warn(`[AVISO] Sem acesso externo para atualizar Roboto (${err.message}). Usando fontes locais existentes.`);
            return { changed: false, skippedOffline: true, files: [] };
        }
        throw err;
    }

    const subsets = extractFontSubsets(cssText);
    const localCssChunks = [
        '/* Fontes Roboto auto-hospedadas para funcionamento offline (gerado por scripts/download-offline-assets.js) */',
        '',
    ];
    let changed = false;
    const files = [];

    for (const entry of subsets) {
        const filename = `roboto-${entry.subset}.woff2`;
        const targetPath = path.join(fontsDir, filename);
        const fontRes = await fetchWithTimeout(entry.remoteUrl, {
            headers: { 'User-Agent': MODERN_UA },
        });
        const fontBuf = Buffer.from(await fontRes.arrayBuffer());
        if (!isValidWoff2Buffer(fontBuf)) {
            throw new Error(`Arquivo baixado inválido para ${filename} (assinatura wOF2 ausente).`);
        }
        if (writeFileIfChanged(targetPath, fontBuf)) {
            changed = true;
        }
        files.push(path.relative(rootDir, targetPath));

        const localizedBlock = entry.block.replace(
            entry.remoteUrl,
            `./${filename}`
        );
        localCssChunks.push(`/* ${entry.subset} */`, localizedBlock, '');
    }

    if (writeFileIfChanged(cssPath, localCssChunks.join('\n'))) {
        changed = true;
    }
    files.push(path.relative(rootDir, cssPath));

    return { changed, skippedOffline: false, files };
}

async function loadBaseSprites(rootDir) {
    const dataPath = path.join(rootDir, 'src', 'data', 'sprites-data.js');
    const mod = await import(`${pathToFileURL(dataPath).href}?t=${Date.now()}`);
    if (!Array.isArray(mod.baseSprites)) {
        throw new Error('baseSprites inválido em src/data/sprites-data.js');
    }
    return mod.baseSprites;
}

/**
 * Audita se todos os arquivos necessários no código-fonte para uso offline existem e estão íntegros.
 */
export async function verifySourceAssets(rootDir = ROOT_DIR) {
    const baseSprites = await loadBaseSprites(rootDir);
    const missingReleased = [];
    const missingUnreleased = [];

    for (const sprite of baseSprites) {
        const assetPath = path.join(rootDir, 'sprites', `${sprite.id}.webp`);
        const exists = fs.existsSync(assetPath) && fs.statSync(assetPath).size > 0;
        if (!exists) {
            if (sprite.unreleased) missingUnreleased.push(sprite.id);
            else missingReleased.push(sprite.id);
        }
    }

    const requiredStaticFiles = [
        path.join(rootDir, 'sprites', 'sprite_unreal.webp'),
        path.join(rootDir, 'public', 'favicon.webp'),
        path.join(rootDir, 'public', 'pwa-192x192.png'),
        path.join(rootDir, 'public', 'pwa-512x512.png'),
        path.join(rootDir, 'src', 'assets', 'fonts', 'roboto.css'),
        ...REQUIRED_SUBSETS.map(subset =>
            path.join(rootDir, 'src', 'assets', 'fonts', `roboto-${subset}.woff2`)
        ),
    ];

    const missingStatic = [];
    for (const filePath of requiredStaticFiles) {
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            missingStatic.push(path.relative(rootDir, filePath));
            continue;
        }
        if (filePath.endsWith('.woff2') && !isValidWoff2Buffer(fs.readFileSync(filePath))) {
            missingStatic.push(`${path.relative(rootDir, filePath)} (WOFF2 inválido)`);
        }
    }

    return {
        totalSprites: baseSprites.length,
        releasedCount: baseSprites.filter(s => !s.unreleased).length,
        unreleasedCount: baseSprites.filter(s => s.unreleased).length,
        missingReleased,
        missingUnreleased,
        missingStatic,
        ok: missingReleased.length === 0 && missingStatic.length === 0,
    };
}

function collectFilesRecursive(dirPath, baseDir = dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const out = [];
    for (const entry of entries) {
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            out.push(...collectFilesRecursive(full, baseDir));
        } else if (entry.isFile()) {
            out.push(path.relative(baseDir, full).replace(/\\/g, '/'));
        }
    }
    return out;
}

/**
 * Audita o build `dist/` e garante que `dist/sw.js` pré-cacheia fontes Roboto, PNGs, HTML/JS/CSS e todos os WebPs emitidos.
 */
export function verifyDistOfflineBundle(rootDir = ROOT_DIR) {
    const distDir = path.join(rootDir, 'dist');
    const swPath = path.join(distDir, 'sw.js');
    const htmlPath = path.join(distDir, 'index.html');
    const manifestPath = path.join(distDir, 'manifest.webmanifest');

    const errors = [];
    if (!fs.existsSync(swPath)) errors.push('dist/sw.js não encontrado.');
    if (!fs.existsSync(htmlPath)) errors.push('dist/index.html não encontrado.');
    if (!fs.existsSync(manifestPath)) errors.push('dist/manifest.webmanifest não encontrado.');
    if (errors.length) return { ok: false, errors, precacheCount: 0 };

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(htmlContent)) {
        errors.push('dist/index.html ainda referencia URLs externas do Google Fonts.');
    }

    const swContent = fs.readFileSync(swPath, 'utf8');
    const rawUrls = [];
    for (const match of swContent.matchAll(/\{\s*url\s*:\s*["']([^"']+)["']/g)) {
        rawUrls.push(match[1]);
    }
    const precacheUrls = new Set(rawUrls);
    if (precacheUrls.size !== rawUrls.length) {
        errors.push(`Entradas duplicadas no manifesto Workbox (dist/sw.js): ${rawUrls.length - precacheUrls.size} duplicata(s).`);
    }

    const distFiles = collectFilesRecursive(distDir);
    const expectedAssetFiles = distFiles.filter(file =>
        /\.(?:js|css|html|webp|png|woff2)$/i.test(file) &&
        file !== 'sw.js' &&
        file !== 'registerSW.js' &&
        !file.startsWith('workbox-')
    );

    const missingFromPrecache = expectedAssetFiles.filter(file => !precacheUrls.has(file));
    if (missingFromPrecache.length > 0) {
        errors.push(
            `${missingFromPrecache.length} arquivo(s) ausentes no pré-cache de dist/sw.js: ${missingFromPrecache.slice(0, 5).join(', ')}`
        );
    }

    const precachedFonts = [...precacheUrls].filter(u => /roboto-.*\.woff2$/i.test(u));
    if (precachedFonts.length < REQUIRED_SUBSETS.length) {
        errors.push(
            `Esperadas >= ${REQUIRED_SUBSETS.length} fonte(s) Roboto (.woff2) no pré-cache, encontradas: ${precachedFonts.length}`
        );
    }

    const expectedWebps = expectedAssetFiles.filter(file => /\.webp$/i.test(file));
    if (expectedWebps.length === 0) {
        errors.push('Nenhum arquivo .webp emitido em dist/.');
    }
    const precachedWebps = [...precacheUrls].filter(u => /\.webp$/i.test(u));
    if (precachedWebps.length < expectedWebps.length) {
        errors.push(
            `Cobertura incompleta de sprites .webp no pré-cache (${precachedWebps.length}/${expectedWebps.length}).`
        );
    }

    return {
        ok: errors.length === 0,
        errors,
        precacheCount: precacheUrls.size,
        precachedFonts: precachedFonts.length,
        precachedWebps: precachedWebps.length,
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const summaryLines = ['## 📦 Assets Offline'];

    let fontsChanged = false;
    if (args.syncFonts) {
        const fontResult = await syncLocalFonts(ROOT_DIR, { skipIfOffline: args.skipIfOffline });
        fontsChanged = fontResult.changed;
        if (fontResult.skippedOffline) {
            summaryLines.push('- **Fontes Roboto:** sem rede externa, mantidas versões locais.');
        } else {
            summaryLines.push(
                `- **Fontes Roboto:** ${fontResult.changed ? 'atualizadas' : 'já sincronizadas'} (${fontResult.files.length} arquivos).`
            );
        }
        console.log(
            `Fontes Roboto: ${fontResult.skippedOffline ? 'offline (mantidas)' : fontResult.changed ? 'atualizadas' : 'sem alterações'}`
        );
    }

    /** @type {Awaited<ReturnType<typeof verifySourceAssets>> | null} */
    let sourceAudit = null;
    if (args.verify) {
        sourceAudit = await verifySourceAssets(ROOT_DIR);
        summaryLines.push(
            `- **Sprites no repositório:** ${sourceAudit.releasedCount}/${sourceAudit.totalSprites} lançados (${sourceAudit.unreleasedCount} não lançado(s)).`
        );
        if (sourceAudit.missingUnreleased.length > 0) {
            summaryLines.push(
                `- **Não lançados sem \`.webp\` (${sourceAudit.missingUnreleased.length}):** ${sourceAudit.missingUnreleased.map(id => `\`${id}\``).join(', ')}`
            );
        }
        if (!sourceAudit.ok) {
            if (sourceAudit.missingReleased.length > 0) {
                console.error(`[ERRO] Sprites lançados sem imagem .webp: ${sourceAudit.missingReleased.join(', ')}`);
            }
            if (sourceAudit.missingStatic.length > 0) {
                console.error(`[ERRO] Assets estáticos ausentes ou inválidos: ${sourceAudit.missingStatic.join(', ')}`);
            }
            appendStepSummary(summaryLines.join('\n'));
            process.exit(1);
        }
        console.log(`Auditoria de origem OK (${sourceAudit.releasedCount} sprites lançados verificados).`);
    }

    /** @type {ReturnType<typeof verifyDistOfflineBundle> | null} */
    let distAudit = null;
    if (args.verifyDist) {
        distAudit = verifyDistOfflineBundle(ROOT_DIR);
        summaryLines.push(
            `- **Pré-cache PWA (\`dist/sw.js\`):** ${distAudit.precacheCount} entradas (${distAudit.precachedWebps} WebPs, ${distAudit.precachedFonts} fontes WOFF2).`
        );
        if (!distAudit.ok) {
            for (const err of distAudit.errors) {
                console.error(`[ERRO] ${err}`);
            }
            appendStepSummary(summaryLines.join('\n'));
            process.exit(1);
        }
        console.log(
            `Auditoria de build offline OK (${distAudit.precacheCount} entradas em dist/sw.js).`
        );
    }

    setOutput('fonts_changed', String(fontsChanged));
    if (distAudit) {
        setOutput('precache_count', String(distAudit.precacheCount));
        setOutput('precached_webps', String(distAudit.precachedWebps));
    }
    if (sourceAudit) {
        setOutput('unreleased_count', String(sourceAudit.unreleasedCount));
    }
    appendStepSummary(summaryLines.join('\n'));
}

const isEntrypoint =
    Boolean(process.argv[1]) &&
    pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url;

if (isEntrypoint) {
    main().catch(err => {
        console.error(`[ERRO] ${err.message}`);
        process.exit(1);
    });
}
