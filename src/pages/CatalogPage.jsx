import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { baseSprites } from '../data/sprites-data.js';
import { useTrackerState } from '../hooks/useTrackerState.js';
import { useGamepadAndSpatialNav } from '../hooks/useGamepadAndSpatialNav.js';
import { Header } from '../components/Header.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { SpriteCard } from '../components/SpriteCard.jsx';
import { ControllerHud } from '../components/ControllerHud.jsx';
import { toast, copyText } from '../dom-utils.js';

/** @type {typeof import('../view-export.js') | null} */
let viewExportModule = null;
/** @type {Promise<typeof import('../view-export.js')> | null} */
let viewExportPromise = null;

function loadViewExport() {
    if (viewExportModule) return Promise.resolve(viewExportModule);
    if (!viewExportPromise) {
        viewExportPromise = import('../view-export.js')
            .then(mod => {
                viewExportModule = mod;
                return mod;
            })
            .catch(err => {
                viewExportPromise = null;
                throw err;
            });
    }
    return viewExportPromise;
}

// Primeiros cards acima da dobra carregam sem lazy-loading; só os 2 iniciais recebem prioridade alta
export const EAGER_CARDS = 8;
export const PRIORITY_CARDS = 2;
export const INITIAL_BATCH_SIZE = 48;
const BATCH_INCREMENT = 48;
export const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024;

export function CatalogPage() {

    const {
        obtained,
        mastered,
        viewMode,
        loadingShared,
        sharedError,
        deferredSearch,
        filters,
        settings,
        trackerState,
        activeThemes,
        showNewFilter,
        activeSeasons,
        visibleSprites,
        progressStats,
        toggleObtained,
        toggleMastery,
        updateFilter,
        clearFilters,
        updateSetting,
        importCollection,
        restoreCollection,
        applyBatchCollection,
        exitViewMode,
    } = useTrackerState(baseSprites);

    // Conjuntos O(1) para verificar rapidamente se cada card foi coletado/dominado
    const obtainedSet = useMemo(() => new Set(obtained), [obtained]);
    const masteredSet = useMemo(() => new Set(mastered), [mastered]);

    // Chave estrutural da consulta: alternar coletado/dominado não reinicia os lotes já expandidos
    const batchResetKey = useMemo(
        () =>
            [
                viewMode ? '1' : '0',
                deferredSearch,
                filters.theme,
                filters.season,
                filters.status,
                settings.hideMastered ? '1' : '0',
                settings.showUnreleased ? '1' : '0',
                settings.sortOrder,
            ].join('|'),
        [
            viewMode,
            deferredSearch,
            filters.theme,
            filters.season,
            filters.status,
            settings.hideMastered,
            settings.showUnreleased,
            settings.sortOrder,
        ]
    );

    // Renderização incremental em lotes para reduzir TBT e tamanho inicial do DOM
    const [batchState, setBatchState] = useState(() => ({
        key: batchResetKey,
        count: INITIAL_BATCH_SIZE,
    }));

    const loadMoreSprites = useCallback(() => {
        setBatchState(prev => {
            const currentCount = prev.key === batchResetKey ? prev.count : INITIAL_BATCH_SIZE;
            if (currentCount >= visibleSprites.length) return prev;
            return {
                key: batchResetKey,
                count: Math.min(visibleSprites.length, currentCount + BATCH_INCREMENT),
            };
        });
    }, [batchResetKey, visibleSprites.length]);

    const gridRef = useRef(null);
    const loadMoreRef = useRef(null);
    const {
        activeCardId,
        gamepadInfo,
        inputMode,
        handleGridKeyDown,
        handleCardFocus,
        handleCardKeyNavigate,
    } = useGamepadAndSpatialNav({
        gridRef,
        visibleSprites,
        viewMode,
        onToggleObtained: toggleObtained,
        onToggleMastery: toggleMastery,
    });

    const minRequiredForFocus = useMemo(() => {
        if (!activeCardId) return INITIAL_BATCH_SIZE;
        const idx = visibleSprites.findIndex(sprite => sprite.id === activeCardId);
        return idx >= 0 ? idx + 13 : INITIAL_BATCH_SIZE;
    }, [activeCardId, visibleSprites]);

    const renderedCount = Math.min(
        visibleSprites.length,
        Math.max(
            batchState.key === batchResetKey ? batchState.count : INITIAL_BATCH_SIZE,
            minRequiredForFocus
        )
    );
    const displayedSprites = useMemo(
        () => visibleSprites.slice(0, renderedCount),
        [visibleSprites, renderedCount]
    );
    const hasMoreSprites = renderedCount < visibleSprites.length;

    useEffect(() => {
        if (!hasMoreSprites || typeof IntersectionObserver === 'undefined') return;
        const target = loadMoreRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    loadMoreSprites();
                }
            },
            { rootMargin: '120px 0px' }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMoreSprites, renderedCount, loadMoreSprites]);

    const trackerStateRef = useRef(trackerState);
    useEffect(() => {
        trackerStateRef.current = trackerState;
    }, [trackerState]);

    const visibleSpritesRef = useRef(visibleSprites);
    useEffect(() => {
        visibleSpritesRef.current = visibleSprites;
    }, [visibleSprites]);

    const getBatchContext = useCallback(() => {
        const showUnreleased = trackerStateRef.current.settings.showUnreleased;
        return {
            visibleIds: visibleSpritesRef.current.map(sprite => sprite.id),
            scopeSprites: showUnreleased
                ? baseSprites
                : baseSprites.filter(sprite => !sprite.unreleased),
        };
    }, []);

    const handlePrepareExport = useCallback(() => {
        void loadViewExport().catch(() => {});
    }, []);

    const handleExportImage = useCallback(mode => {
        const currentState = trackerStateRef.current;
        if (viewExportModule) {
            viewExportModule.exportImage(mode, currentState, baseSprites);
            return;
        }
        loadViewExport()
            .then(mod => mod.exportImage(mode, currentState, baseSprites))
            .catch(() => toast('Erro ao carregar módulo de exportação!', 'error'));
    }, []);

    const handleCopyTradeText = useCallback(() => {
        const currentState = trackerStateRef.current;
        if (viewExportModule) {
            copyText(
                viewExportModule.generateTradeText(currentState, baseSprites),
                'Lista de trocas copiada para a área de transferência!',
                'Falha ao copiar lista de trocas'
            );
            return;
        }
        loadViewExport()
            .then(mod => {
                copyText(
                    mod.generateTradeText(currentState, baseSprites),
                    'Lista de trocas copiada para a área de transferência!',
                    'Falha ao copiar lista de trocas'
                );
            })
            .catch(() => toast('Falha ao copiar lista de trocas', 'error'));
    }, []);

    const handleCopyTradeGrid = useCallback(() => {
        const currentState = trackerStateRef.current;
        if (viewExportModule) {
            copyText(
                viewExportModule.generateTradeGridText(currentState, baseSprites),
                'Grelha de trocas copiada para a área de transferência!',
                'Falha ao copiar grelha de trocas'
            );
            return;
        }
        loadViewExport()
            .then(mod => {
                copyText(
                    mod.generateTradeGridText(currentState, baseSprites),
                    'Grelha de trocas copiada para a área de transferência!',
                    'Falha ao copiar grelha de trocas'
                );
            })
            .catch(() => toast('Falha ao copiar grelha de trocas', 'error'));
    }, []);

    const handleExportBackup = useCallback(() => {
        const current = trackerStateRef.current;
        const data = { obtained: current.obtained, mastered: current.mastered };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'pituchinhus-backup.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast('Backup exportado com sucesso!', 'success');
    }, []);

    const handleImportBackupFile = useCallback(
        file => {
            if (viewMode) {
                toast('Não é possível importar no modo somente leitura!', 'error');
                return;
            }
            if (file.size > MAX_BACKUP_FILE_BYTES) {
                toast('Arquivo de backup muito grande (máximo 2 MB).', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    if (typeof event.target?.result !== 'string') {
                        throw new Error('Invalid backup file content');
                    }
                    const data = JSON.parse(event.target.result);
                    if (!data || !Array.isArray(data.obtained) || !Array.isArray(data.mastered)) {
                        throw new Error('Invalid backup file format');
                    }

                    const previousCollection = {
                        obtained: trackerStateRef.current.obtained,
                        mastered: trackerStateRef.current.mastered,
                    };

                    const result = importCollection(data.obtained, data.mastered);
                    if (!result?.imported) {
                        if (result?.reason === 'empty') {
                            toast('Arquivo de backup vazio: nenhum pituchinhu para importar.', 'info');
                        } else {
                            toast('Nenhum pituchinhu válido encontrado no arquivo de backup!', 'error');
                        }
                        return;
                    }

                    const ignoredCount = result.ignoredCount ?? 0;
                    const summaryMsg =
                        ignoredCount > 0
                            ? `${result.obtainedCount} pituchinhu(s) importado(s) (${ignoredCount} item(ns) desconhecido(s) ignorado(s)).`
                            : `${result.obtainedCount} pituchinhu(s) importado(s) com sucesso!`;

                    toast(summaryMsg, 'success', {
                        duration: 6000,
                        actionLabel: 'Desfazer',
                        onAction: () => {
                            restoreCollection(previousCollection);
                            toast('Importação desfeita!', 'info');
                        },
                    });
                } catch (err) {
                    toast('Falha ao importar: formato JSON inválido', 'error');
                    console.error(err);
                }
            };
            reader.readAsText(file);
        },
        [viewMode, importCollection, restoreCollection]
    );

    const handleApplyBatch = useCallback(
        (targetIds, action) => {
            if (viewMode) return;
            const result = applyBatchCollection(targetIds, action);
            if (!result.changed) {
                toast('Nenhuma alteração para aplicar nesse escopo.', 'info');
                return;
            }
            const messages = {
                collect: `${result.changedCount} sprite(s) marcado(s) como coletado(s)!`,
                master: `${result.changedCount} sprite(s) marcado(s) como dominado(s)!`,
                unmaster: `Domínio removido de ${result.changedCount} sprite(s)!`,
                uncollect: `${result.changedCount} sprite(s) removido(s) da coleção!`,
            };
            toast(messages[action], 'success', {
                duration: 6000,
                actionLabel: 'Desfazer',
                onAction: () => {
                    restoreCollection(result.previousCollection);
                    toast('Ação em lote desfeita!', 'info');
                },
            });
        },
        [viewMode, applyBatchCollection, restoreCollection]
    );

    const handleShare = useCallback(async () => {
        try {
            const current = trackerStateRef.current;
            if (!current.obtained.length) {
                toast('Colete pelo menos um pituchinhu antes de compartilhar!', 'info');
                return;
            }
            const { compressCollection } = await import('../share-codec.js');
            const code = await compressCollection(current.obtained, current.mastered);
            if (!code) {
                toast('Falha ao compartilhar', 'error');
                return;
            }
            const url = `${window.location.origin}${window.location.pathname}?c=${code}`;
            copyText(url, 'Link compartilhado!', 'Falha ao compartilhar', {
                actionLabel: 'Fechar',
            });
        } catch (err) {
            toast('Falha ao compartilhar', 'error');
            console.error(err);
        }
    }, []);

    const handleMainKeyDown = useCallback(
        e => {
            if (
                !e.defaultPrevented &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.metaKey &&
                (e.key === 'Enter' || e.key === 'd' || e.key === 'D')
            ) {
                handleCardKeyNavigate();
            }
            handleGridKeyDown(e);
        },
        [handleCardKeyNavigate, handleGridKeyDown]
    );

    const hasActiveFilters =
        filters.search.trim() !== '' ||
        filters.theme !== 'all' ||
        filters.season !== 'all' ||
        filters.status !== 'all';
    const showEmptyState = !loadingShared && !sharedError && displayedSprites.length === 0;

    return (
        <>
            {viewMode && (
                <div className="banner" id="viewBanner">
                    <span>
                        {!loadingShared && sharedError
                            ? 'Link de compartilhamento inválido ou vazio — nenhum pituchinhu encontrado.'
                            : 'Visualizando uma coleção compartilhada - exibindo apenas pituchinhus coletados.'}
                    </span>
                    <a
                        href="./"
                        onClick={e => {
                            e.preventDefault();
                            exitViewMode();
                        }}
                    >
                        Ir para meu rastreador
                    </a>
                </div>
            )}

            <div className="app">
                <Header progressStats={progressStats} />

                <FilterBar
                    filters={filters}
                    settings={settings}
                    activeThemes={activeThemes}
                    showNewFilter={showNewFilter}
                    activeSeasons={activeSeasons}
                    viewMode={viewMode}
                    onFilterChange={updateFilter}
                    onSettingChange={updateSetting}
                    onPrepareExport={handlePrepareExport}
                    onExportImage={handleExportImage}
                    onCopyTradeText={handleCopyTradeText}
                    onCopyTradeGrid={handleCopyTradeGrid}
                    onExportBackup={handleExportBackup}
                    onImportBackupFile={handleImportBackupFile}
                    onShare={handleShare}
                    getBatchContext={getBatchContext}
                    onApplyBatch={handleApplyBatch}
                />

                <div className="grid-region">
                    <main
                        ref={gridRef}
                        className="grid"
                        id="spriteGrid"
                        aria-label="Coleção de pituchinhus"
                        aria-busy={loadingShared}
                        onKeyDown={handleMainKeyDown}
                    >
                        {displayedSprites.map((sprite, index) => {
                        const isActiveCard = activeCardId
                            ? activeCardId === sprite.id
                            : index === 0;
                        return (
                            <SpriteCard
                                key={sprite.id}
                                sprite={sprite}
                                obtained={obtainedSet.has(sprite.id)}
                                mastered={masteredSet.has(sprite.id)}
                                viewMode={viewMode}
                                eager={index < EAGER_CARDS}
                                priority={index < PRIORITY_CARDS}
                                tabIndex={isActiveCard ? 0 : -1}
                                isGamepadSelected={
                                    Boolean(gamepadInfo.connected) && isActiveCard
                                }
                                onCardFocus={handleCardFocus}
                                onToggleObtained={toggleObtained}
                                onToggleMastery={toggleMastery}
                            />
                        );
                    })}
                    {showEmptyState && (
                        <div className="empty-state" role="status">
                            {hasActiveFilters ? (
                                <>
                                    <p className="empty-state-message">
                                        Nenhum pituchinhu encontrado para os filtros atuais.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn"
                                        id="clearFiltersBtn"
                                        onClick={clearFilters}
                                    >
                                        Limpar filtros
                                    </button>
                                </>
                            ) : settings.hideMastered && obtained.length > 0 ? (
                                <>
                                    <p className="empty-state-message">
                                        Todos os pituchinhus visíveis já estão dominados.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn"
                                        id="showMasteredBtn"
                                        onClick={() => updateSetting('hideMastered', false)}
                                    >
                                        Mostrar dominados
                                    </button>
                                </>
                            ) : (
                                <p className="empty-state-message">
                                    Nenhum pituchinhu encontrado.
                                </p>
                            )}
                        </div>
                    )}
                    </main>
                    {hasMoreSprites && (
                        <div
                            ref={loadMoreRef}
                            className="load-more-sentinel"
                            aria-hidden="true"
                        />
                    )}
                </div>
            </div>

            <ControllerHud
                gamepadInfo={gamepadInfo}
                inputMode={inputMode}
                viewMode={viewMode}
            />

            {!hasMoreSprites && (
                <footer className="footer">
                    <p>
                        Fortnite and its materials (Sprites and Data) are trademarks and copyrights of
                        Epic Games, Inc. This website is not endorsed or affiliated with Epic Games,
                        Inc.
                    </p>
                </footer>
            )}
        </>
    );
}
