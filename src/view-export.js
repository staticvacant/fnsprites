/* ===================================================
   Canvas Export & Trade Generation (Material Design 3)
   =================================================== */

import { EXPORT_LAYOUT } from './share-order.js';
import { toast, isIOS, drawRoundRect } from './dom-utils.js';
import { getSpriteImageUrl, getMascotImageUrl } from './assets/spriteImages.js';
import { DARK_EXPORT_PALETTE, getExportThemePalette } from './export-palette.js';
import {
    getRarityGradient,
    getRarityDisplayGradient,
    getRarityStripStyle,
    getRarityTagColors,
} from './taxonomy.js';
import {
    getReleasedSprites,
    sortSprites,
    getCollectionCounts,
    getFamilyKeys,
    getFamilyThemeMap,
    getActiveThemes,
    getExportThemeLabel,
    getCharNameMap,
    resolveCharName,
    getDisplayName,
    getSeasonData,
    isObtained,
    isMastered,
} from './query.js';

export {
    getExportThemePalette,
    getRarityGradient,
    getRarityDisplayGradient,
    getRarityStripStyle,
    getRarityTagColors,
};

export function getExportConfig(mode, state, sprites = []) {
    const releasedSprites = getReleasedSprites(sprites, state.filters.season);
    const obtainedSet = new Set(state?.obtained || []);
    const masteredSet = new Set(state?.mastered || []);
    let rawItems = [];

    if (mode === 'collected') rawItems = releasedSprites.filter(sprite => obtainedSet.has(sprite.id));
    else if (mode === 'missing') rawItems = releasedSprites.filter(sprite => !obtainedSet.has(sprite.id));
    else if (mode === 'unmastered')
        rawItems = releasedSprites.filter(sprite => obtainedSet.has(sprite.id) && !masteredSet.has(sprite.id));
    else if (mode === 'mastered')
        rawItems = releasedSprites.filter(sprite => obtainedSet.has(sprite.id) && masteredSet.has(sprite.id));
    else if (mode === 'trade') rawItems = releasedSprites;

    const items = mode === 'trade' ? rawItems : sortSprites(rawItems, state.settings.sortOrder);

    const configs = {
        collected: {
            items,
            titleL1: 'Rastreador de Pituchinhus',
            titleL2: 'Minha coleção',
            color: '#4ade80',
            filename: 'pituchinhus-collection',
            emptyMsg: 'Nenhum pituchinhu para exportar!',
        },
        missing: {
            items,
            titleL1: 'Rastreador de Pituchinhus',
            titleL2: 'Eu procuro estes!',
            color: '#e57373',
            filename: 'pituchinhus-missing',
            emptyMsg: 'Você não está faltando nenhum pituchinhu!',
        },
        unmastered: {
            items,
            titleL1: 'Rastreador de Pituchinhus',
            titleL2: 'Não Dominados',
            color: '#4fc3f7',
            filename: 'pituchinhus-unmastered',
            emptyMsg: 'Você não tem nenhum pituchinhu para exportar!',
        },
        mastered: {
            items,
            titleL1: 'Rastreador de Pituchinhus',
            titleL2: 'Dominados',
            color: '#facc15',
            filename: 'pituchinhus-mastered',
            emptyMsg: 'Você não tem nenhum pituchinhu dominado!',
        },
        trade: {
            items,
            titleL1: 'Rastreador de Pituchinhus',
            titleL2: 'Lista de Trocas',
            color: '#d0bcff',
            filename: 'pituchinhus-trade-card',
            emptyMsg: 'Nenhum pituchinhu para exportar!',
        },
    };

    const config = configs[mode];
    if (!config || config.items.length === 0) {
        toast(config?.emptyMsg || 'Nada para exportar!', 'error');
        return null;
    }
    return config;
}

export function getExportCardState(sprite, mode, state) {
    const isOwned = isObtained(state, sprite.id);
    const mastered = isMastered(state, sprite.id);

    if (mode === 'trade') return isOwned ? (mastered ? 'mastered' : 'owned') : 'missing_gray';
    if (mode === 'collected') return isOwned ? (mastered ? 'mastered' : 'owned') : 'empty';
    if (mode === 'missing') return !isOwned ? 'missing_color' : 'empty';
    if (mode === 'mastered') return mastered ? 'mastered' : 'empty';
    if (mode === 'unmastered') return isOwned && !mastered ? 'unmastered' : 'empty';
    return 'empty';
}

const loadedImageCache = new Map();

export function loadImage(item) {
    if (loadedImageCache.has(item.src)) {
        return Promise.resolve({ id: item.id, img: loadedImageCache.get(item.src), success: true });
    }
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            loadedImageCache.set(item.src, img);
            resolve({ id: item.id, img, success: true });
        };
        img.onerror = () => resolve({ id: item.id, img, success: false });
        img.src = item.src;
    });
}

export function drawCrown(ctx, cx, cy) {
    // Mesma geometria de CrownIcon em SpriteCard.jsx (viewBox 0 0 24 20), inclinada 18°
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((18 * Math.PI) / 180);
    const scale = 0.62;
    ctx.scale(scale, scale);
    ctx.translate(-12, -10);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(2, 5);
    ctx.lineTo(7, 8.5);
    ctx.lineTo(12, 2);
    ctx.lineTo(17, 8.5);
    ctx.lineTo(22, 5);
    ctx.lineTo(22, 17);
    ctx.lineTo(2, 17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function fitTextWithEllipsis(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let trimmed = text;
    while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}…`;
}

export function drawMiniCard(ctx, sprite, x, y, w, h, cardState, imageMap, palette = DARK_EXPORT_PALETTE) {
    const radius = 10;

    if (cardState === 'empty') {
        ctx.save();
        ctx.strokeStyle = palette.emptyCardBorder;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        drawRoundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
        ctx.restore();
        return;
    }

    const rarity = sprite.rarity || 'Raro';
    const theme = sprite.theme || 'Básico';
    const footerH = 26;
    const stripH = 15;
    const displayH = h - footerH;
    const badgeH = 17;

    const isMasteredCard = cardState === 'mastered';
    const isGrayed = cardState === 'missing_gray';
    const isMissingColor = cardState === 'missing_color';

    /* Card elevation shadow */
    ctx.save();
    ctx.shadowColor = palette.cardShadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = palette.cardSurface;
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();

    /* Clip all inner layers to card rounded corners */
    ctx.save();
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h, radius);
    ctx.clip();

    /* Card surface */
    ctx.fillStyle = palette.cardSurface;
    ctx.fillRect(x, y, w, h);

    /* Display background gradient (3-stop CSS match) */
    const displayStops = getRarityDisplayGradient(rarity, theme);
    const grad = ctx.createLinearGradient(x, y, x, y + displayH);
    if (displayStops.length >= 3) {
        grad.addColorStop(0, displayStops[0]);
        grad.addColorStop(0.75, displayStops[1]);
        grad.addColorStop(1, displayStops[2]);
    } else {
        grad.addColorStop(0, displayStops[0]);
        grad.addColorStop(1, displayStops[1]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, displayH);

    /* Special pastel rainbow overlay (135deg) */
    if (rarity === 'Especial') {
        const rainbow = ctx.createLinearGradient(x, y, x + w, y + displayH);
        rainbow.addColorStop(0, 'rgba(152, 245, 201, 0.2)');
        rainbow.addColorStop(0.22, 'rgba(142, 227, 245, 0.18)');
        rainbow.addColorStop(0.44, 'rgba(163, 191, 250, 0.18)');
        rainbow.addColorStop(0.66, 'rgba(212, 184, 255, 0.2)');
        rainbow.addColorStop(0.84, 'rgba(249, 180, 212, 0.2)');
        rainbow.addColorStop(1, 'rgba(253, 224, 141, 0.16)');
        ctx.fillStyle = rainbow;
        ctx.fillRect(x, y, w, displayH);
    }

    /* Top highlight shine (.card-display::before) */
    const shine = ctx.createLinearGradient(x, y, x, y + displayH * 0.6);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shine;
    ctx.fillRect(x, y, w, displayH * 0.6);

    /* Sprite image */
    const img = imageMap?.[sprite.id] || imageMap?.__fallback__;
    const hasTopBanner = isMasteredCard || cardState === 'owned' || cardState === 'unmastered' || isMissingColor;
    const spriteTopOffset = hasTopBanner ? badgeH : 4;
    const spriteAreaH = displayH - stripH * 0.65 - spriteTopOffset;

    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (isGrayed) {
            try {
                ctx.filter = 'brightness(35%) saturate(45%) contrast(95%)';
            } catch {
                /* ctx.filter não suportado neste navegador */
            }
        }
        const maxDim = Math.min(w * 0.78, spriteAreaH * 0.92);
        const ratio = Math.min(maxDim / img.width, maxDim / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        ctx.drawImage(
            img,
            x + (w - nw) / 2,
            y + spriteTopOffset + (spriteAreaH - nh) / 2,
            nw,
            nh
        );
        ctx.restore();
    }

    /* Tilted golden crown inside display area (.card-crown-display) */
    if (isMasteredCard) {
        drawCrown(ctx, x + w - 13, y + badgeH + 9);
    }

    /* Top Header Banner (.card-badge) */
    if (hasTopBanner) {
        let bannerText = 'COLETADO';
        let bannerBg = '#4ade80';
        let bannerFg = '#052e16';

        if (isMasteredCard) {
            bannerText = 'DOMINADO';
            bannerBg = '#facc15';
            bannerFg = '#1c1917';
        } else if (isMissingColor) {
            bannerText = 'FALTANDO';
            bannerBg = '#e57373';
            bannerFg = '#1c1917';
        }

        ctx.fillStyle = bannerBg;
        ctx.fillRect(x, y, w, badgeH);

        ctx.fillStyle = bannerFg;
        ctx.font = '800 8px "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, x + w / 2, y + badgeH / 2 + 0.5);
    }

    /* Upward Rarity Glow Beam (.card-rarity-wrap::before) */
    const stripStyle = getRarityStripStyle(rarity);
    const stripTopY = y + displayH - stripH;
    const glowH = 14;
    const glowGrad = ctx.createLinearGradient(x, stripTopY + 3, x, stripTopY - glowH);
    glowGrad.addColorStop(0, stripStyle.glow);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.moveTo(x, stripTopY + 3);
    ctx.lineTo(x + w, stripTopY);
    ctx.lineTo(x + w, stripTopY - glowH);
    ctx.lineTo(x, stripTopY - glowH);
    ctx.closePath();
    ctx.fill();

    /* Rarity Strip (.card-rarity) with diagonal top cut */
    let stripGrad;
    if (rarity === 'Especial') {
        // Espelha linear-gradient(135deg, ...) do CSS ao longo do eixo diagonal (dx === dy)
        const cx = x + w / 2;
        const cy = stripTopY + stripH / 2;
        const offset = (w + stripH) / 4;
        stripGrad = ctx.createLinearGradient(cx - offset, cy - offset, cx + offset, cy + offset);
    } else {
        stripGrad = ctx.createLinearGradient(x, stripTopY, x + w, stripTopY);
    }
    stripStyle.colors.forEach((col, idx) => {
        stripGrad.addColorStop(idx / Math.max(1, stripStyle.colors.length - 1), col);
    });
    ctx.fillStyle = stripGrad;
    ctx.beginPath();
    ctx.moveTo(x, stripTopY + 3);
    ctx.lineTo(x + w, stripTopY);
    ctx.lineTo(x + w, y + displayH);
    ctx.lineTo(x, y + displayH);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.fillStyle = rarity === 'Especial' ? '#1c1917' : '#ffffff';
    if (rarity === 'Especial') {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 1;
    }
    ctx.font = '800 7.5px "Roboto", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarity.toUpperCase(), x + 6, stripTopY + stripH / 2 + 1);
    ctx.restore();

    /* Card Metadata Footer (.card-name) */
    const footerY = y + displayH;
    ctx.fillStyle = palette.cardSurface;
    ctx.fillRect(x, footerY, w, footerH);

    const seasonName = getSeasonData(sprite.season).name;
    const hasSeason = seasonName !== 'none';
    const padX = 6;
    let titleMaxW = w - padX * 2;

    if (hasSeason) {
        ctx.font = '800 7px "Roboto", sans-serif';
        const pillTextW = ctx.measureText(seasonName).width;
        const pillW = pillTextW + 7;
        const pillH = 12;
        const pillX = x + w - padX - pillW;
        const pillY = footerY + (footerH - pillH) / 2;

        ctx.fillStyle = palette.cardSeasonBg;
        ctx.beginPath();
        drawRoundRect(ctx, pillX, pillY, pillW, pillH, 3.5);
        ctx.fill();

        ctx.fillStyle = palette.cardSeasonColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seasonName, pillX + pillW / 2, pillY + pillH / 2 + 0.5);

        titleMaxW = pillX - (x + padX) - 4;
    }

    ctx.fillStyle = palette.cardTitleColor;
    ctx.font = '500 9.5px "Roboto", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const fittedTitle = fitTextWithEllipsis(ctx, sprite.name || sprite.id, Math.max(12, titleMaxW));
    ctx.fillText(fittedTitle, x + padX, footerY + footerH / 2 + 0.5);

    ctx.restore();

    /* Crisp card outline */
    ctx.save();
    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h, radius);
    ctx.stroke();
    ctx.restore();
}

function drawCircularProgress(ctx, cx, cy, ratio, fillColor, trackColor) {
    const r = 13.5;
    const clamped = Math.max(0, Math.min(1, ratio));
    const startAngle = -Math.PI / 2;

    ctx.save();
    ctx.lineWidth = 4.2;

    // Track
    ctx.strokeStyle = trackColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Fill
    if (clamped > 0) {
        ctx.strokeStyle = fillColor;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, startAngle + Math.PI * 2 * clamped);
        ctx.stroke();
    }
    ctx.restore();
}

function drawProgressCard(ctx, x, y, w, h, label, count, total, ringColor, palette) {
    ctx.save();
    ctx.fillStyle = palette.surfaceContainer;
    ctx.strokeStyle = palette.outlineVariant;
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();

    const padX = 14;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = palette.textSoft;
    ctx.font = '600 11px "Roboto", sans-serif';
    ctx.fillText(label, x + padX, y + 18);

    const countText = String(count);
    ctx.fillStyle = palette.text;
    ctx.font = '700 17px "Roboto", sans-serif';
    ctx.fillText(countText, x + padX, y + 38);
    const countW = ctx.measureText(countText).width;

    ctx.fillStyle = palette.textMuted;
    ctx.font = '600 12.5px "Roboto", sans-serif';
    ctx.fillText(`/${total}`, x + padX + countW + 2, y + 39);

    const ratio = total > 0 ? count / total : 0;
    drawCircularProgress(ctx, x + w - 28, y + h / 2, ratio, ringColor, palette.surfaceContainerHighest);
    ctx.restore();
}

function drawModeChip(ctx, x, y, label, dotColor, palette) {
    ctx.save();
    ctx.font = '600 12px "Roboto", sans-serif';
    const textW = ctx.measureText(label).width;
    const chipH = 26;
    const chipW = 28 + textW + 12;

    ctx.fillStyle = palette.secondaryContainer;
    ctx.beginPath();
    drawRoundRect(ctx, x, y, chipW, chipH, chipH / 2);
    ctx.fill();

    // Dot
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x + 14, y + chipH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = palette.onSecondaryContainer;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 24, y + chipH / 2 + 0.5);
    ctx.restore();
    return chipW;
}

function triggerPngDownload(url, filename, revokeDelayMs = 1000) {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}

function openPreviewTabSync() {
    try {
        const previewTab = window.open('', '_blank');
        if (!previewTab) return null;
        try {
            previewTab.opener = null;
            if (previewTab.document?.body) {
                previewTab.document.title = 'Gerando imagem...';
                previewTab.document.body.textContent = 'Gerando imagem...';
            }
        } catch {
            /* Ignora restrições de acesso ao documento auxiliar */
        }
        return previewTab;
    } catch {
        return null;
    }
}

function closePreviewTab(previewTab) {
    if (!previewTab) return;
    try {
        if (!previewTab.closed) {
            previewTab.close();
        }
    } catch {
        /* Ignora falha ao fechar aba auxiliar */
    }
}

export function exportImage(mode, state, sprites = []) {
    const config = getExportConfig(mode, state, sprites);
    if (!config) return;

    const palette = getExportThemePalette(Boolean(state?.settings?.lightTheme));
    const releasedSprites = getReleasedSprites(sprites, state.filters.season);
    const shouldOpenInNewTab = isIOS() || Boolean(state?.settings?.openExports);
    // Aberta de forma síncrona ainda no clique para preservar o gesto do usuário no Safari/iOS
    const previewTab = shouldOpenInNewTab ? openPreviewTabSync() : null;
    const imagesToLoad = [
        { id: 'mascot', src: getMascotImageUrl() },
        { id: '__fallback__', src: getSpriteImageUrl('sprite_unreal') },
        ...config.items.map(sprite => ({ id: sprite.id, src: getSpriteImageUrl(sprite.id) })),
    ];

    toast('Gerando imagem...', 'info');

    const fontsReady =
        typeof document !== 'undefined' && document.fonts?.ready
            ? document.fonts.ready.catch(() => {})
            : Promise.resolve();

    Promise.all([Promise.all(imagesToLoad.map(loadImage)), fontsReady]).then(([loadedImages]) => {
        const imageMap = {};
        loadedImages.forEach(res => {
            if (res.success) {
                imageMap[res.id] = res.img;
            }
        });

        const layout = EXPORT_LAYOUT;
        let canvasW, canvasH, headerH, useCompactHeader;
        let cols = 0,
            rows = 0,
            startGridY = 0,
            gridWidth = 0;

        // Trade Card Layout Variables
        let charKeys, charNameMap, familyThemeMap, themeColumns, leftColumnKeys, rightColumnKeys, tableColumnCount, colW, tableW;

        if (mode === 'trade') {
            charKeys = getFamilyKeys(releasedSprites);
            charNameMap = getCharNameMap(sprites);
            familyThemeMap = getFamilyThemeMap(releasedSprites);
            themeColumns = getActiveThemes(releasedSprites).map(theme => ({
                name: getExportThemeLabel(theme),
                themeName: theme,
            }));

            const activeCharKeys = charKeys.filter(charKey => {
                return [...familyThemeMap.get(charKey).values()].some(
                    sprite => getExportCardState(sprite, mode, state) !== 'empty'
                );
            });

            themeColumns = themeColumns.filter(t => {
                return activeCharKeys.some(charKey => {
                    const sprite = familyThemeMap.get(charKey).get(t.themeName);
                    return sprite && getExportCardState(sprite, mode, state) !== 'empty';
                });
            });

            tableColumnCount = activeCharKeys.length > layout.maxSingleColumnRows ? 2 : 1;
            const half = tableColumnCount === 1 ? activeCharKeys.length : Math.ceil(activeCharKeys.length / 2);
            leftColumnKeys = activeCharKeys.slice(0, half);
            rightColumnKeys = activeCharKeys.slice(half);

            const maxRows = Math.max(leftColumnKeys.length, rightColumnKeys.length);
            const rowH = layout.cardH + layout.rowGap;
            const rowsH = maxRows * rowH;
            const cardBlockW =
                themeColumns.length * layout.cardW + Math.max(0, themeColumns.length - 1) * layout.cardGap;
            colW = layout.labelW + cardBlockW;
            tableW = colW * tableColumnCount + layout.colGap * Math.max(0, tableColumnCount - 1);
            canvasW = Math.max(layout.minCanvasW, tableW + layout.border * 2 + layout.sidePad * 2);
            useCompactHeader = canvasW < layout.compactHeaderW;
            headerH = useCompactHeader ? layout.compactHeaderH : layout.headerH;
            canvasH = layout.border * 2 + headerH + layout.colHeaderH + rowsH + layout.footerH;
        } else {
            // Square-optimized Compact Layout for non-trade cards
            const totalItems = config.items.length;
            const cardAspect = (layout.cardW + layout.cardGap) / (layout.cardH + layout.rowGap);

            cols = Math.max(1, Math.round(Math.sqrt(totalItems / cardAspect)));
            rows = Math.ceil(totalItems / cols);

            gridWidth = cols * layout.cardW + (cols - 1) * layout.cardGap;
            const gridHeight = rows * layout.cardH + (rows - 1) * layout.rowGap;

            canvasW = Math.max(layout.minCanvasW, gridWidth + layout.border * 2 + layout.sidePad * 2);
            useCompactHeader = canvasW < layout.compactHeaderW;
            headerH = useCompactHeader ? layout.compactHeaderH : layout.headerH;

            canvasH = layout.border * 2 + headerH + layout.sidePad + gridHeight + layout.sidePad + layout.footerH;
            startGridY = layout.border + headerH + layout.sidePad;
        }

        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = canvasW * scale;
        canvas.height = canvasH * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            closePreviewTab(previewTab);
            toast('Erro ao gerar imagem!', 'error');
            return;
        }
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Material Design 3 Background (--bg + radial glow --bg-glow)
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, canvasW, canvasH);

        const bgRadial = ctx.createRadialGradient(
            canvasW * 0.5,
            0,
            0,
            canvasW * 0.5,
            0,
            Math.max(canvasW, canvasH) * 0.78
        );
        bgRadial.addColorStop(0, palette.bgGlow);
        bgRadial.addColorStop(1, palette.bg);
        ctx.fillStyle = bgRadial;
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Header Stats
        const { total: totalCount, collected: ownedCount, mastered: masteredCount } = getCollectionCounts(
            releasedSprites,
            state
        );
        const mascotImg = imageMap['mascot'];

        const fitFont = (text, maxWidth, startSize, minSize, style) => {
            let size = startSize;
            ctx.font = `${style} ${size}px "Roboto", sans-serif`;
            while (ctx.measureText(text).width > maxWidth && size > minSize) {
                size -= 0.5;
                ctx.font = `${style} ${size}px "Roboto", sans-serif`;
            }
            return size;
        };

        const cardW = 172;
        const cardH = 56;
        const cardGap = 12;

        if (useCompactHeader) {
            const topY = layout.border + 28;
            const mascotSize = 30;
            const mascotGap = mascotImg ? 10 : 0;
            const titleMaxW = canvasW - layout.sidePad * 2 - (mascotImg ? mascotSize + mascotGap : 0);
            fitFont(config.titleL1, titleMaxW, 20, 14, '500');
            const titleW = ctx.measureText(config.titleL1).width;
            const brandW = titleW + (mascotImg ? mascotSize + mascotGap : 0);
            let bx = (canvasW - brandW) / 2;

            if (mascotImg) {
                ctx.drawImage(mascotImg, bx, topY - mascotSize / 2, mascotSize, mascotSize);
                bx += mascotSize + mascotGap;
            }
            ctx.fillStyle = palette.text;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.titleL1, bx, topY);

            // Mode chip centered below title
            ctx.font = '600 12px "Roboto", sans-serif';
            const chipW = 28 + ctx.measureText(config.titleL2).width + 12;
            drawModeChip(ctx, (canvasW - chipW) / 2, layout.border + 48, config.titleL2, config.color, palette);

            // Two progress cards side by side
            const compactCardW = Math.min(180, Math.floor((canvasW - layout.sidePad * 2 - cardGap) / 2));
            const totalCardsW = compactCardW * 2 + cardGap;
            const cardsX = (canvasW - totalCardsW) / 2;
            const cardsY = layout.border + 84;
            drawProgressCard(
                ctx,
                cardsX,
                cardsY,
                compactCardW,
                cardH,
                'Coleção',
                ownedCount,
                totalCount,
                palette.primary,
                palette
            );
            drawProgressCard(
                ctx,
                cardsX + compactCardW + cardGap,
                cardsY,
                compactCardW,
                cardH,
                'Dominados',
                masteredCount,
                totalCount,
                palette.uiMastered,
                palette
            );
        } else {
            const statsRight = canvasW - layout.border - layout.sidePad;
            const masteryX = statsRight - cardW;
            const collectionX = masteryX - cardGap - cardW;
            const cardsY = layout.border + (headerH - cardH) / 2;

            drawProgressCard(
                ctx,
                collectionX,
                cardsY,
                cardW,
                cardH,
                'Coleção',
                ownedCount,
                totalCount,
                palette.primary,
                palette
            );
            drawProgressCard(
                ctx,
                masteryX,
                cardsY,
                cardW,
                cardH,
                'Dominados',
                masteredCount,
                totalCount,
                palette.uiMastered,
                palette
            );

            const titleX = layout.border + layout.sidePad;
            const mascotSize = 36;
            const mascotGap = mascotImg ? 12 : 0;
            const brandMaxW = collectionX - titleX - 20 - (mascotImg ? mascotSize + mascotGap : 0);

            if (mascotImg) {
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetY = 2;
                ctx.drawImage(
                    mascotImg,
                    titleX,
                    layout.border + headerH / 2 - mascotSize / 2,
                    mascotSize,
                    mascotSize
                );
                ctx.restore();
            }

            const textLeft = titleX + (mascotImg ? mascotSize + mascotGap : 0);
            fitFont(config.titleL1, brandMaxW, 22, 15, '500');
            ctx.fillStyle = palette.text;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.titleL1, textLeft, layout.border + headerH / 2 - 14);

            drawModeChip(ctx, textLeft, layout.border + headerH / 2 + 4, config.titleL2, config.color, palette);
        }

        // Subtle header bottom divider
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(layout.sidePad, layout.border + headerH);
        ctx.lineTo(canvasW - layout.sidePad, layout.border + headerH);
        ctx.stroke();

        if (mode === 'trade') {
            const startTableY = layout.border + headerH + layout.colHeaderH;

            const drawColHeaders = startX => {
                ctx.fillStyle = palette.textSoft;
                ctx.font = '700 11px "Roboto", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                themeColumns.forEach((t, i) => {
                    const cx = startX + layout.labelW + i * (layout.cardW + layout.cardGap) + layout.cardW / 2;
                    ctx.fillText(t.name, cx, startTableY - 10);
                });
            };

            const leftTableX = layout.border + (canvasW - layout.border * 2 - tableW) / 2;
            const rightTableX = leftTableX + colW + layout.colGap;

            drawColHeaders(leftTableX);
            if (rightColumnKeys.length > 0) {
                drawColHeaders(rightTableX);
            }

            const drawRow = (charKey, startX, y) => {
                const name = resolveCharName(charNameMap, charKey);
                const displayName = getDisplayName(name);

                ctx.fillStyle = palette.text;
                let fontSize = 13.5;
                ctx.font = `600 ${fontSize}px "Roboto", sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                while (ctx.measureText(displayName).width > layout.labelW - 14 && fontSize > 8) {
                    fontSize -= 0.5;
                    ctx.font = `600 ${fontSize}px "Roboto", sans-serif`;
                }
                ctx.fillText(displayName, startX + layout.labelW - 12, y + layout.cardH / 2);

                const rowCards = themeColumns.map(t => familyThemeMap.get(charKey).get(t.themeName));

                rowCards.forEach((s, colIndex) => {
                    const cx = startX + layout.labelW + colIndex * (layout.cardW + layout.cardGap);

                    if (s) {
                        const cardState = getExportCardState(s, mode, state);
                        drawMiniCard(ctx, s, cx, y, layout.cardW, layout.cardH, cardState, imageMap, palette);
                    } else {
                        drawMiniCard(ctx, null, cx, y, layout.cardW, layout.cardH, 'empty', imageMap, palette);
                    }
                });
            };

            leftColumnKeys.forEach((charKey, idx) => {
                const y = startTableY + idx * (layout.cardH + layout.rowGap);
                drawRow(charKey, leftTableX, y);
            });

            rightColumnKeys.forEach((charKey, idx) => {
                const y = startTableY + idx * (layout.cardH + layout.rowGap);
                drawRow(charKey, rightTableX, y);
            });
        } else {
            // Render non-trade compact grid
            const startGridX = (canvasW - gridWidth) / 2;

            config.items.forEach((sprite, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);

                const x = startGridX + col * (layout.cardW + layout.cardGap);
                const y = startGridY + row * (layout.cardH + layout.rowGap);

                const cardState = getExportCardState(sprite, mode, state);
                drawMiniCard(ctx, sprite, x, y, layout.cardW, layout.cardH, cardState, imageMap, palette);
            });
        }

        // Footer (.footer style)
        const footerTopY = canvasH - layout.footerH - layout.border;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(layout.sidePad, footerTopY);
        ctx.lineTo(canvasW - layout.sidePad, footerTopY);
        ctx.stroke();

        ctx.fillStyle = palette.textMuted;
        ctx.font = '500 13px "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            'joaopedro-chaves.github.io/fnpituchinhubr/',
            canvasW / 2,
            footerTopY + layout.footerH / 2
        );

        // Export mode
        canvas.toBlob(blob => {
            if (!blob) {
                closePreviewTab(previewTab);
                toast('Erro ao gerar imagem!', 'error');
                return;
            }
            const url = URL.createObjectURL(blob);

            if (!shouldOpenInNewTab) {
                triggerPngDownload(url, config.filename, 1000);
                toast('Imagem exportada com sucesso!', 'success');
                return;
            }

            let routedToTab = false;
            if (previewTab && !previewTab.closed) {
                try {
                    previewTab.location.replace(url);
                    routedToTab = true;
                } catch {
                    closePreviewTab(previewTab);
                }
            }

            if (!routedToTab) {
                const openedTab = window.open(url, '_blank');
                if (openedTab) {
                    try {
                        openedTab.opener = null;
                    } catch {
                        /* Ignora bloqueio ao limpar opener */
                    }
                    routedToTab = true;
                }
            }

            if (routedToTab) {
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
                toast('Imagem aberta em nova aba!', 'success');
            } else {
                triggerPngDownload(url, config.filename, 1000);
                toast('Pop-up bloqueado — imagem baixada!', 'info');
            }
        }, 'image/png');
    }).catch(err => {
        closePreviewTab(previewTab);
        toast('Erro ao gerar imagem!', 'error');
        console.error(err);
    });
}

export { generateTradeText, generateTradeGridText } from './export-text.js';
