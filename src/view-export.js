/* ===================================================
   Canvas Export & Trade Generation
   =================================================== */

import { EXPORT_LAYOUT, TRACKER_URL } from './share-order.js';
import { toast, isIOS, drawRoundRect } from './dom-utils.js';
import { getSpriteImageUrl, getMascotImageUrl } from './assets/spriteImages.js';
import { RARITIES, THEME } from './taxonomy.js';
import {
    getReleasedSprites,
    sortSprites,
    getCollectionCounts,
    getFamilyKeys,
    getFamilyThemeMap,
    getActiveThemes,
    getExportThemeLabel,
    getTradeThemeLabel,
    getCharName,
    getDisplayName,
    isObtained,
    isMastered,
} from './query.js';

export function getRarityGradient(rarity, theme) {
    const rarityInfo = RARITIES[rarity];
    if (rarityInfo?.gradient) return rarityInfo.gradient;
    // Raridade "Especial" não tem gradiente próprio: usa o do tema
    if (rarityInfo) return (THEME[theme] || THEME['Básico']).gradient;
    return RARITIES['Raro'].gradient;
}

export function getRarityTagColors(rarity) {
    return (RARITIES[rarity] || RARITIES['Raro']).tag;
}

export function getExportConfig(mode, state, sprites = []) {
    const releasedSprites = getReleasedSprites(sprites, state.filters.season);
    let rawItems = [];

    if (mode === 'collected') rawItems = releasedSprites.filter(sprite => isObtained(state, sprite.id));
    else if (mode === 'missing') rawItems = releasedSprites.filter(sprite => !isObtained(state, sprite.id));
    else if (mode === 'unmastered')
        rawItems = releasedSprites.filter(sprite => isObtained(state, sprite.id) && !isMastered(state, sprite.id));
    else if (mode === 'mastered')
        rawItems = releasedSprites.filter(sprite => isObtained(state, sprite.id) && isMastered(state, sprite.id));
    else if (mode === 'trade') rawItems = releasedSprites;

    const items = mode === 'trade' ? rawItems : sortSprites(rawItems, state.settings.sortOrder);

    const configs = {
        collected: {
            items,
            titleL1: 'Rastreador de Pituchinhos:',
            titleL2: 'Minha coleção',
            color: '#3fac3fff',
            filename: 'fnsprites-collection',
            emptyMsg: 'Nenhum pituchinhu para exportar!',
        },
        missing: {
            items,
            titleL1: 'Rastreador de Pituchinhos:',
            titleL2: 'Eu procuro estes!',
            color: '#e34b4bff',
            filename: 'fnsprites-missing',
            emptyMsg: 'Você não está faltando nenhum pituchinhu!',
        },
        unmastered: {
            items,
            titleL1: 'Rastreador de Pituchinhos:',
            titleL2: 'Não Dominados',
            color: '#6ad1d8ff',
            filename: 'fnsprites-unmastered',
            emptyMsg: 'Você não tem nenhum pituchinhu para exportar!',
        },
        mastered: {
            items,
            titleL1: 'Rastreador de Pituchinhos:',
            titleL2: 'Dominados',
            color: '#edd234ff',
            filename: 'fnsprites-mastered',
            emptyMsg: 'Você não tem nenhum pituchinhu dominado!',
        },
        trade: {
            items,
            titleL1: 'Rastreador de Pituchinhos:',
            titleL2: 'Lista de Trocas',
            color: '#ce26d3ff',
            filename: 'fnsprites-trade-card',
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

export function loadImage(item) {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ id: item.id, img, success: true });
        img.onerror = () => resolve({ id: item.id, img, success: false });
        img.src = item.src;
    });
}

export function drawCrown(ctx, cx, cy) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 5);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.lineTo(cx + 7, cy - 2);
    ctx.lineTo(cx + 3, cy + 1.5);
    ctx.lineTo(cx, cy - 4.5);
    ctx.lineTo(cx - 3, cy + 1.5);
    ctx.lineTo(cx - 7, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

export function drawMiniCard(ctx, sprite, x, y, w, h, cardState, imageMap) {
    if (cardState === 'empty') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        drawRoundRect(ctx, x, y, w, h, 8);
        ctx.stroke();
        ctx.restore();
        return;
    }

    const rarity = sprite.rarity || 'Raro';
    const theme = sprite.theme || 'Básico';
    const innerH = h - 22; // 100 - 22 = 78

    const isMastered = cardState === 'mastered';
    const isGrayed = cardState === 'missing_gray';
    const isMissing = cardState === 'missing_gray' || cardState === 'missing_color';

    /* Card base background */
    ctx.fillStyle = '#0f141d';
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h);
    ctx.fill();

    /* Rarity background */
    ctx.save();
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, innerH, 8);
    ctx.clip();

    const grad = ctx.createLinearGradient(x, y, x, y + innerH);
    const [c1, c2] = getRarityGradient(rarity, theme);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, innerH);

    /* Special rainbow overlay */
    if (rarity === 'Especial') {
        const rainbow = ctx.createLinearGradient(x, y, x + w, y + innerH);
        rainbow.addColorStop(0, 'rgba(81,247,204,0.25)');
        rainbow.addColorStop(0.5, 'rgba(227,116,238,0.35)');
        rainbow.addColorStop(1, 'rgba(181,246,158,0.25)');
        ctx.fillStyle = rainbow;
        ctx.fillRect(x, y, w, innerH);
    }

    /* Highlight shine */
    const shine = ctx.createLinearGradient(x, y, x, y + innerH);
    shine.addColorStop(0, 'rgba(255,255,255,0.12)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(x, y, w, innerH);

    if (isGrayed) {
        ctx.fillStyle = 'rgba(11, 13, 20, 0.45)';
        ctx.fillRect(x, y, w, innerH);
    }
    ctx.restore();

    /* Sprite image */
    const img = imageMap[sprite.id];
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        drawRoundRect(ctx, x, y, w, innerH, 8);
        ctx.clip();

        if (isGrayed) {
            try {
                ctx.filter = 'grayscale(100%) brightness(48%)';
            } catch {
                /* ctx.filter não suportado neste navegador: segue sem o efeito */
            }
        }
        const maxDim = w * 0.82;
        const ratio = Math.min(maxDim / img.width, maxDim / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        ctx.drawImage(img, x + (w - nw) / 2, y + (innerH - nh) / 2, nw, nh);
        ctx.restore();

        if (isGrayed) {
            ctx.fillStyle = 'rgba(15, 20, 30, 0.15)';
            ctx.beginPath();
            drawRoundRect(ctx, x, y, w, innerH, 8);
            ctx.fill();
        }
    }

    /* Status label */
    ctx.save();
    ctx.font = '900 8.5px "Roboto", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let labelText = 'COLETADO';
    let labelColor = '#22c55e';
    if (isMastered) {
        labelText = 'DOMINADO';
        labelColor = '#ffd700';
    } else if (isMissing) {
        labelText = 'FALTANDO';
        labelColor = '#ef4444';
    }

    ctx.fillStyle = labelColor;
    ctx.fillText(labelText, x + 5, y + 5);
    ctx.restore();

    /* Rarity tag (angled shape) */
    const [tagBg, tagText] = getRarityTagColors(rarity);
    ctx.save();
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, innerH, 8);
    ctx.clip();

    if (rarity === 'Especial') {
        const tg = ctx.createLinearGradient(x, y + innerH - 12, x + w * 0.6, y + innerH - 12);
        tg.addColorStop(0, '#51f7cc');
        tg.addColorStop(0.5, '#e374ee');
        tg.addColorStop(1, '#b5f69e');
        ctx.fillStyle = tg;
    } else {
        ctx.fillStyle = tagBg;
    }
    ctx.beginPath();
    ctx.moveTo(x, y + innerH - 12);
    ctx.lineTo(x + w * 0.48, y + innerH - 12);
    ctx.lineTo(x + w * 0.58, y + innerH);
    ctx.lineTo(x, y + innerH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = tagText;
    ctx.font = '900 8.5px "Roboto", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarity === 'Mítico' ? 'MYTHIC' : rarity.toUpperCase(), x + 4, y + innerH - 6);

    /* Name/Theme footer */
    ctx.fillStyle = 'rgba(15,20,29,0.9)';
    ctx.fillRect(x, y + innerH, w, 22);

    ctx.fillStyle = isMissing ? '#ef4444' : '#ffffff';
    let fontSize = 9.5;
    const name = sprite.name.toUpperCase();
    ctx.font = `bold ${fontSize}px "Roboto", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    while (ctx.measureText(name).width > w - 6 && fontSize > 6.5) {
        fontSize -= 0.5;
        ctx.font = `bold ${fontSize}px "Roboto", sans-serif`;
    }
    ctx.fillText(name, x + w / 2, y + innerH + 11);

    /* Bottom accent + border */
    let bottomAccentColor = tagBg;
    let borderColor = '#1a2233';
    if (isMastered) {
        bottomAccentColor = '#ffd700';
        borderColor = '#ffd700';
    } else if (isMissing) {
        bottomAccentColor = '#ef4444';
    } else if (cardState === 'unmastered') {
        bottomAccentColor = '#00f0ff';
    }

    ctx.fillStyle = bottomAccentColor;
    ctx.fillRect(x, y + h - 3, w, 3);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isMastered ? 2 : 1;
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h, 8);
    ctx.stroke();

    /* Crown at top center */
    if (isMastered) {
        drawCrown(ctx, x + w / 2, y - 2);
    }
}

export function exportImage(mode, state, sprites = []) {
    const config = getExportConfig(mode, state, sprites);
    if (!config) return;

    const releasedSprites = getReleasedSprites(sprites, state.filters.season);
    const imagesToLoad = [
        { id: 'mascot', src: getMascotImageUrl() },
        ...releasedSprites.map(sprite => ({ id: sprite.id, src: getSpriteImageUrl(sprite.id) })),
    ];

    toast('Gerando imagem...', 'info');

    Promise.all(imagesToLoad.map(loadImage)).then(loadedImages => {
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
        let charKeys, familyThemeMap, themeColumns, leftColumnKeys, rightColumnKeys, tableColumnCount, colW, tableW;

        if (mode === 'trade') {
            charKeys = getFamilyKeys(releasedSprites);
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

            // Compute ideal column count to make overall layout aspect ratio as close to 1:1 as possible
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
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Border gradient
        let borderGrad;
        if (mode === 'trade') {
            borderGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
            borderGrad.addColorStop(0, '#ffd700');
            borderGrad.addColorStop(1, '#22c55e');
            ctx.fillStyle = borderGrad;
        } else {
            ctx.fillStyle = config.color;
            borderGrad = config.color;
        }
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Inner Background
        ctx.fillStyle = '#0b0d13';
        ctx.fillRect(layout.border, layout.border, canvasW - layout.border * 2, canvasH - layout.border * 2);

        // Header Background
        ctx.fillStyle = '#181c25';
        ctx.fillRect(layout.border, layout.border, canvasW - layout.border * 2, headerH);

        // Header separator
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(layout.border, layout.border + headerH);
        ctx.lineTo(canvasW - layout.border, layout.border + headerH);
        ctx.stroke();

        // Header Stats / Progress Bars
        const { total: totalCount, collected: ownedCount, mastered: masteredCount } = getCollectionCounts(
            releasedSprites,
            state
        );
        const colPct = totalCount > 0 ? ownedCount / totalCount : 0;
        const masPct = totalCount > 0 ? masteredCount / totalCount : 0;

        const bw = 110;
        const statGap = 25;
        const mascotImg = imageMap['mascot'];
        const fullTitle = `${config.titleL1} ${config.titleL2}`;

        const fitFont = (text, maxWidth, startSize, minSize, style) => {
            let size = startSize;
            ctx.font = `${style} ${size}px "Roboto", sans-serif`;
            while (ctx.measureText(text).width > maxWidth && size > minSize) {
                size -= 0.5;
                ctx.font = `${style} ${size}px "Roboto", sans-serif`;
            }
            return size;
        };

        const drawProgressBlock = (label, count, total, pct, x, y, color) => {
            ctx.font = '900 12px "Roboto", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = color;
            ctx.fillText(`${label}: ${count}/${total}`, x, y);
            ctx.fillStyle = '#0e1117';
            ctx.fillRect(x, y + 15, bw, 12);
            ctx.strokeStyle = '#3b4253';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y + 15, bw, 12);
            ctx.fillStyle = color;
            ctx.fillRect(x, y + 16, bw * pct, 10);
        };

        if (useCompactHeader) {
            const topY = layout.border + 24;
            const mascotSize = 24;
            const mascotGap = mascotImg ? 8 : 0;
            fitFont(config.titleL1, canvasW - layout.border * 2 - 60, 14, 10, 'italic 900');
            const titleL1W = ctx.measureText(config.titleL1).width;
            const titleGroupW = titleL1W + (mascotImg ? mascotSize + mascotGap : 0);
            let groupX = (canvasW - titleGroupW) / 2;
            if (mascotImg) {
                ctx.drawImage(mascotImg, groupX, topY - mascotSize / 2, mascotSize, mascotSize);
                groupX += mascotSize + mascotGap;
            }
            ctx.fillStyle = borderGrad;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.titleL1, groupX, topY);

            fitFont(config.titleL2, canvasW - layout.border * 2 - 36, 20, 13, 'italic 900');
            ctx.fillStyle = borderGrad;
            ctx.textAlign = 'center';
            ctx.fillText(config.titleL2, canvasW / 2, layout.border + 52);

            const statsW = bw * 2 + statGap;
            const statsX = (canvasW - statsW) / 2;
            const statsY = layout.border + 86;
            drawProgressBlock('COLECIONADOS', ownedCount, totalCount, colPct, statsX, statsY, '#22c55e');
            drawProgressBlock('DOMINADOS', masteredCount, totalCount, masPct, statsX + bw + statGap, statsY, '#ffd700');
        } else {
            const statsRight = canvasW - layout.border - layout.sidePad;
            const collectionX = statsRight - bw * 2 - statGap;
            const masteryX = statsRight - bw;
            const titleX = layout.border + layout.sidePad;
            const mascotSize = 32;
            const mascotGap = mascotImg ? 10 : 0;
            const titleMaxW = collectionX - titleX - 20;

            fitFont(fullTitle, titleMaxW - (mascotImg ? mascotSize + mascotGap : 0), 26, 16, 'italic 900');
            ctx.fillStyle = borderGrad;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            let textLeft = titleX;
            if (mascotImg) {
                ctx.drawImage(
                    mascotImg,
                    textLeft,
                    layout.border + headerH / 2 - mascotSize / 2,
                    mascotSize,
                    mascotSize
                );
                textLeft += mascotSize + mascotGap;
            }
            ctx.fillText(fullTitle, textLeft, layout.border + headerH / 2);

            drawProgressBlock('COLECIONADOS', ownedCount, totalCount, colPct, collectionX, layout.border + 28, '#22c55e');
            drawProgressBlock('DOMINADOS', masteredCount, totalCount, masPct, masteryX, layout.border + 28, '#ffd700');
        }

        if (mode === 'trade') {
            const startTableY = layout.border + headerH + layout.colHeaderH;

            const drawColHeaders = startX => {
                ctx.fillStyle = '#8891a5';
                ctx.font = 'bold 12px "Roboto", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                themeColumns.forEach((t, i) => {
                    const cx = startX + layout.labelW + i * (layout.cardW + layout.cardGap) + layout.cardW / 2;
                    ctx.fillText(t.name, cx, startTableY - 8);
                });
            };

            const leftTableX = layout.border + (canvasW - layout.border * 2 - tableW) / 2;
            const rightTableX = leftTableX + colW + layout.colGap;

            drawColHeaders(leftTableX);
            if (rightColumnKeys.length > 0) {
                drawColHeaders(rightTableX);
            }

            const drawRow = (charKey, startX, y) => {
                const name = getCharName(charKey, sprites);
                const displayName = getDisplayName(name);

                ctx.fillStyle = '#ffffff';
                let fontSize = 14;
                ctx.font = `bold ${fontSize}px "Roboto", sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                while (ctx.measureText(displayName).width > layout.labelW - 12 && fontSize > 8) {
                    fontSize -= 0.5;
                    ctx.font = `bold ${fontSize}px "Roboto", sans-serif`;
                }
                ctx.fillText(displayName, startX + layout.labelW - 10, y + layout.cardH / 2);

                const rowCards = themeColumns.map(t => familyThemeMap.get(charKey).get(t.themeName));

                rowCards.forEach((s, colIndex) => {
                    const cx = startX + layout.labelW + colIndex * (layout.cardW + layout.cardGap);

                    if (s) {
                        const cardState = getExportCardState(s, mode, state);
                        drawMiniCard(ctx, s, cx, y, layout.cardW, layout.cardH, cardState, imageMap);
                    } else {
                        ctx.save();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4, 4]);
                        ctx.beginPath();
                        drawRoundRect(ctx, cx, y, layout.cardW, layout.cardH, 8);
                        ctx.stroke();
                        ctx.restore();
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
                drawMiniCard(ctx, sprite, x, y, layout.cardW, layout.cardH, cardState, imageMap);
            });
        }

        // Footer
        ctx.fillStyle = '#0e1117';
        ctx.fillRect(
            layout.border,
            canvasH - layout.footerH - layout.border,
            canvasW - layout.border * 2,
            layout.footerH
        );

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            'joaopedro-chaves.github.io/fnpituchinhubr/',
            canvasW / 2,
            canvasH - layout.border - layout.footerH / 2
        );

        // Export mode
        const shouldOpenInNewTab = isIOS() || state.settings.openExports;

        if (shouldOpenInNewTab) {
            canvas.toBlob(blob => {
                if (!blob) {
                    toast('Erro ao gerar imagem!', 'error');
                    return;
                }
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                toast('Imagem aberta em nova aba!', 'success');
            }, 'image/png');
        } else {
            const link = document.createElement('a');
            link.download = `${config.filename}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast('Imagem exportada com sucesso!', 'success');
        }
    });
}

export function generateTradeText(state, sprites = []) {
    const releasedSprites = getReleasedSprites(sprites, state.filters.season);
    const charKeys = getFamilyKeys(releasedSprites);
    const familyThemeMap = getFamilyThemeMap(releasedSprites);
    const { total, collected, mastered } = getCollectionCounts(releasedSprites, state);

    const buildSection = (title, selectSprites) => {
        const lines = [];

        charKeys.forEach(charKey => {
            const name = getCharName(charKey, sprites);
            const themeSprites = [...familyThemeMap.get(charKey).values()];
            const selected = selectSprites(themeSprites);
            if (selected.length === 0) return;

            const list = selected.map(sprite => getTradeThemeLabel(sprite.theme)).join(', ');
            lines.push(`  ▸ ${name} ➔ ${list}`);
        });

        return lines.length > 0 ? `【 ${title} 】\n${lines.join('\n')}` : '';
    };

    const sections = [
        buildSection('LOOKING FOR', items => items.filter(sprite => !isObtained(state, sprite.id))),
        buildSection('HAVE', items => items.filter(sprite => isObtained(state, sprite.id))),
        buildSection('STILL NEED TO MASTER', items =>
            items.filter(sprite => isObtained(state, sprite.id) && !isMastered(state, sprite.id))
        ),
        [
            `Colecionados: ${collected}/${total}`,
            `Dominados: ${mastered}/${total}`,
            `Link do rastreador: ${TRACKER_URL}`,
        ].join('\n'),
    ].filter(Boolean);

    return sections.join('\n\n');
}

export function generateTradeGridText(state, sprites = []) {
    const releasedSprites = getReleasedSprites(sprites, state.filters.season);
    const activeThemes = getActiveThemes(releasedSprites);
    const charKeys = getFamilyKeys(releasedSprites);
    const familyThemeMap = getFamilyThemeMap(releasedSprites);
    const { total, collected, mastered } = getCollectionCounts(releasedSprites, state);

    let lines = [
        '```',
        '✅ Tenho  👑 Dominado  ❌ Não tenho',
        '',
        `| ${activeThemes.map(getExportThemeLabel).join(' | ')} | Sprite`,
        '-----------------------',
    ];

    charKeys.forEach(charKey => {
        const rowStates = activeThemes.map(theme => {
            const s = familyThemeMap.get(charKey).get(theme);
            if (!s) return '⬛';
            if (isMastered(state, s.id)) return '👑';
            return isObtained(state, s.id) ? '✅' : '❌';
        });

        lines.push(`| ${rowStates.join(' | ')} | ${getCharName(charKey, sprites)}`);
    });

    lines.push(
        '',
        `Colecionados: ${collected}/${total}`,
        `Dominados: ${mastered}/${total}`,
        `Link: ${TRACKER_URL}`,
        '```'
    );

    return lines.join('\n');
}
