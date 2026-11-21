import { memo, useState, useCallback } from 'react';
import { getSeasonData } from '../query.js';
import { getCardStyleVars } from '../taxonomy.js';
import { getSpriteImageUrl } from '../assets/spriteImages.js';

const spriteMetaCache = new WeakMap();
const FALLBACK_SPRITE_URL = getSpriteImageUrl('sprite_unreal');

function getSpriteStaticMeta(sprite) {
    let cached = spriteMetaCache.get(sprite);
    if (cached) return cached;

    const rarityLabel = (sprite.rarity || '').toUpperCase();
    const displayName = sprite.name || sprite.id;
    const seasonData = getSeasonData(sprite.season);
    const themeClass = `theme-${(sprite.theme || '').replace(/\s+/g, '-')}`;
    const baseClasses = ['card', `rarity-${sprite.rarity}`, themeClass];
    if (sprite.rarity === 'Especial') baseClasses.push('rarity-special');

    cached = {
        rarityLabel,
        displayName,
        seasonName: seasonData.name,
        baseClassName: baseClasses.join(' '),
        cardStyle: getCardStyleVars(sprite.rarity, sprite.theme),
        imgSrc: getSpriteImageUrl(sprite.id),
        collectLabel: `${displayName} - ${sprite.unreleased ? 'Não lançado' : sprite.isNew ? 'Não coletado (Novo)' : 'Não coletado'} (clique para coletar)`,
        removeLabel: `${displayName} - Coletado (clique para remover da coleção)`,
        masteredCardLabel: `${displayName} - Dominado (clique para deixar apenas coletado)`,
        unmasterLabel: `Remover dominação de ${displayName}`,
        masterTitleLabel: `Marcar ${displayName} como dominado`,
    };
    spriteMetaCache.set(sprite, cached);
    return cached;
}

function CrownIcon() {
    return (
        <svg className="crown-icon" viewBox="0 0 24 20" aria-hidden="true" focusable="false">
            <path d="M2 5l5 3.5L12 2l5 6.5L22 5v12H2V5z" />
        </svg>
    );
}

export const SpriteCard = memo(
    /**
     * @param {{
     *   sprite: { id: string, name?: string, theme?: string, rarity?: string, unreleased?: boolean, isNew?: boolean, season?: string },
     *   obtained: boolean,
     *   mastered: boolean,
     *   viewMode?: boolean,
     *   eager?: boolean,
     *   priority?: boolean,
     *   tabIndex?: number,
     *   isGamepadSelected?: boolean,
     *   onCardFocus?: (id: string) => void,
     *   onToggleObtained: (id: string) => void,
     *   onToggleMastery: (id: string) => void,
     * }} props
     */
    function SpriteCard({
    sprite,
    obtained,
    mastered,
    viewMode = false,
    eager = false,
    priority = false,
    tabIndex = 0,
    isGamepadSelected = false,
    onCardFocus,
    onToggleObtained,
    onToggleMastery,
}) {
    if (import.meta.env.MODE === 'test' && typeof window !== 'undefined') {
        window.__recordPerfRender?.('spriteCard');
    }

    const [failedImgSrc, setFailedImgSrc] = useState(/** @type {string | null} */ (null));

    // Sprites "não lançados" podem ser placeholders sem tema/raridade/nome
    const meta = getSpriteStaticMeta(sprite);
    const hasImgError = failedImgSrc === meta.imgSrc;
    const resolvedImgSrc =
        hasImgError && FALLBACK_SPRITE_URL && FALLBACK_SPRITE_URL !== meta.imgSrc
            ? FALLBACK_SPRITE_URL
            : meta.imgSrc;

    let className = meta.baseClassName;
    if (obtained) className += ' obtained';
    if (mastered) className += ' mastered';
    if (isGamepadSelected) className += ' gamepad-selected';

    const handleCardClick = useCallback(() => {
        if (!viewMode && onToggleObtained) {
            onToggleObtained(sprite.id);
        }
    }, [viewMode, onToggleObtained, sprite.id]);

    const handleKeyDown = useCallback(
        e => {
            if (viewMode) return;
            if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (onToggleMastery) onToggleMastery(sprite.id);
            }
        },
        [viewMode, onToggleMastery, sprite.id]
    );

    const handleCrownClick = useCallback(
        e => {
            e.stopPropagation();
            if (!viewMode && onToggleMastery) {
                onToggleMastery(sprite.id);
            }
        },
        [viewMode, onToggleMastery, sprite.id]
    );

    const handleFocus = useCallback(() => {
        if (onCardFocus) onCardFocus(sprite.id);
    }, [onCardFocus, sprite.id]);

    const handleImgError = useCallback(() => {
        if (!hasImgError) {
            setFailedImgSrc(meta.imgSrc);
        }
    }, [hasImgError, meta.imgSrc]);

    const cardBody = (
        <>
            {/* Faixa Superior de Status (Header Banner) */}
            {sprite.unreleased ? (
                <div
                    className="card-badge unreleased-badge"
                    aria-hidden={!viewMode ? 'true' : undefined}
                >
                    NÃO LANÇADO
                </div>
            ) : mastered ? (
                <div
                    className="card-badge mastered-badge"
                    aria-hidden={!viewMode ? 'true' : undefined}
                >
                    DOMINADO
                </div>
            ) : obtained ? (
                <div
                    className="card-badge collected"
                    aria-hidden={!viewMode ? 'true' : undefined}
                >
                    COLETADO
                </div>
            ) : sprite.isNew ? (
                <div
                    className="card-badge new-badge"
                    aria-hidden={!viewMode ? 'true' : undefined}
                >
                    NOVO
                </div>
            ) : null}

            <div className="card-display">
                {viewMode && mastered && (
                    <span className="card-crown-display" aria-hidden="true">
                        <CrownIcon />
                    </span>
                )}

                <img
                    src={resolvedImgSrc}
                    alt={meta.displayName}
                    loading={eager || priority ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={priority ? 'high' : undefined}
                    width="80"
                    height="80"
                    draggable="false"
                    onError={hasImgError ? undefined : handleImgError}
                />
            </div>

            <div className="card-rarity-wrap" aria-hidden={!viewMode ? 'true' : undefined}>
                <div className="card-rarity">{meta.rarityLabel}</div>
            </div>

            <div className="card-name">
                <span className="card-title">{meta.displayName}</span>
                {meta.seasonName !== 'none' && (
                    <span
                        className="card-season"
                        aria-hidden={!viewMode ? 'true' : undefined}
                    >
                        {meta.seasonName}
                    </span>
                )}
            </div>
        </>
    );

    return (
        <div
            className={className}
            style={meta.cardStyle}
            data-id={sprite.id}
            data-name={meta.displayName}
        >
            <div className="card-inner">
                {viewMode ? (
                    cardBody
                ) : (
                    <>
                        <button
                            type="button"
                            className="card-primary"
                            tabIndex={tabIndex}
                            aria-pressed={obtained}
                            aria-label={
                                mastered
                                    ? meta.masteredCardLabel
                                    : obtained
                                      ? meta.removeLabel
                                      : meta.collectLabel
                            }
                            onClick={handleCardClick}
                            onKeyDown={handleKeyDown}
                            onFocus={handleFocus}
                        >
                            {cardBody}
                        </button>

                        {/* Botão irmão para marcar/desmarcar como dominado (coroa) */}
                        {obtained && !mastered && (
                            <button
                                className="card-crown"
                                type="button"
                                tabIndex={tabIndex}
                                title="Alternar dominação"
                                aria-label={meta.masterTitleLabel}
                                onClick={handleCrownClick}
                                onKeyDown={handleKeyDown}
                                onFocus={handleFocus}
                            >
                                <CrownIcon />
                            </button>
                        )}

                        {mastered && (
                            <button
                                className="card-crown-display"
                                type="button"
                                tabIndex={tabIndex}
                                title="Remover dominação"
                                aria-label={meta.unmasterLabel}
                                onClick={handleCrownClick}
                                onKeyDown={handleKeyDown}
                                onFocus={handleFocus}
                            >
                                <CrownIcon />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});
