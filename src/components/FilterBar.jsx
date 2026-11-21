import { Fragment, memo, useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { getUiThemeLabel, NEW_THEME_FILTER } from '../query.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { M3FilterMenu } from './M3FilterMenu.jsx';
import { SearchIcon, ExportIcon, ShareIcon, SettingsIcon, BatchIcon } from './ToolbarIcons.jsx';

const loadExportModal = () => import('./ExportModal.jsx');
const loadSettingsModal = () => import('./SettingsModal.jsx');
const loadBatchModal = () => import('./BatchModal.jsx');
const ExportModal = lazy(loadExportModal);
const SettingsModal = lazy(loadSettingsModal);
const BatchModal = lazy(loadBatchModal);

const EMPTY_SEASONS = [];

const STATUS_PILLS = [
    { value: 'all', label: 'Todos' },
    { value: 'owned', label: 'Coletados' },
    { value: 'missing', label: 'Faltando' },
];

const SORT_OPTIONS = [
    { value: 'theme', label: 'Categorias' },
    { value: 'sprite', label: 'Elementais' },
    { value: 'name', label: 'Nome' },
    { value: 'rarity', label: 'Raridade' },
];

export const FilterBar = memo(
    /**
     * @param {{
     *   filters: { search: string, theme: string, season: string, status: string },
     *   settings: {
     *     hideMastered: boolean,
     *     sortOrder: string,
     *     showUnreleased: boolean,
     *     lowFidelity: boolean,
     *     openExports: boolean,
     *     lightTheme: boolean,
     *   },
     *   activeThemes: string[],
     *   showNewFilter?: boolean,
     *   activeSeasons?: string[],
     *   viewMode: boolean,
     *   onFilterChange: (key: string, value: string) => void,
     *   onSettingChange: (key: string, value: any) => void,
     *   onPrepareExport?: () => void,
     *   onExportImage: (mode: string) => void,
     *   onCopyTradeText: () => void,
     *   onCopyTradeGrid: () => void,
     *   onExportBackup: () => void,
     *   onImportBackupFile: (file: File) => void,
     *   onShare: () => void,
     *   getBatchContext?: () => { visibleIds: string[], scopeSprites: Array<{ id: string, name: string, season?: string, unreleased?: boolean }> },
     *   onApplyBatch?: (targetIds: string[], action: 'collect' | 'master' | 'unmaster' | 'uncollect') => void,
     * }} props
     */
    function FilterBar({
    filters,
    settings,
    activeThemes,
    showNewFilter = false,
    activeSeasons = EMPTY_SEASONS,
    viewMode,
    onFilterChange,
    onSettingChange,
    onPrepareExport,
    onExportImage,
    onCopyTradeText,
    onCopyTradeGrid,
    onExportBackup,
    onImportBackupFile,
    onShare,
    getBatchContext,
    onApplyBatch,
}) {
    if (import.meta.env.MODE === 'test' && typeof window !== 'undefined') {
        window.__recordPerfRender?.('filterBar');
    }

    const [activePopup, setActivePopup] = useState(
        /** @type {'export' | 'settings' | 'batch' | null} */ (null)
    );
    const [batchContext, setBatchContext] = useState(
        /** @type {{ visibleIds: string[], scopeSprites: Array<{ id: string, name: string, season?: string, unreleased?: boolean }> } | null} */ (
            null
        )
    );
    const [openFilterMenu, setOpenFilterMenu] = useState(/** @type {string | null} */ (null)); // 'theme' | 'season' | 'sortOrder' | null
    const isMobileViewport = useMediaQuery('(max-width: 767px)');
    const activeFilterMenu = isMobileViewport ? null : openFilterMenu;
    const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
    const filtersRowRef = useRef(/** @type {HTMLDivElement | null} */ (null));
    const popupInvokerRef = useRef(/** @type {HTMLElement | null} */ (null));
    const prevPopupRef = useRef(/** @type {'export' | 'settings' | 'batch' | null} */ (null));

    // Restaura foco ao gatilho apenas se o ambiente/suspense não devolver o foco nativamente ao fechar o dialog
    useEffect(() => {
        if (prevPopupRef.current && !activePopup) {
            const invoker = popupInvokerRef.current;
            queueMicrotask(() => {
                if (
                    invoker?.isConnected &&
                    (!document.activeElement || document.activeElement === document.body)
                ) {
                    invoker.focus({ preventScroll: true });
                }
            });
        }
        prevPopupRef.current = activePopup;
    }, [activePopup]);

    // Fecha menu M3 ao clicar fora ou perder o foco no desktop
    useEffect(() => {
        if (!activeFilterMenu) return;

        const handlePointerDown = e => {
            if (
                filtersRowRef.current &&
                e.target instanceof Node &&
                !filtersRowRef.current.contains(e.target)
            ) {
                setOpenFilterMenu(null);
            }
        };

        const handleFocusIn = e => {
            if (
                filtersRowRef.current &&
                e.target instanceof Node &&
                !filtersRowRef.current.contains(e.target)
            ) {
                setOpenFilterMenu(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('focusin', handleFocusIn);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, [activeFilterMenu]);

    const handleClosePopup = useCallback(() => setActivePopup(null), []);

    const handleExportAction = useCallback(
        mode => {
            onExportImage(mode);
        },
        [onExportImage]
    );

    const handleTriggerImport = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    const handlePrefetchExport = useCallback(() => {
        void loadExportModal().catch(() => {});
        onPrepareExport?.();
    }, [onPrepareExport]);

    const handlePrefetchSettings = useCallback(() => {
        void loadSettingsModal().catch(() => {});
    }, []);

    const handlePrefetchBatch = useCallback(() => {
        void loadBatchModal().catch(() => {});
    }, []);

    const handleFileChange = e => {
        const file = e.target.files?.[0];
        if (file) {
            onImportBackupFile(file);
        }
        e.target.value = '';
    };

    const themeOptions = useMemo(
        () => [
            { value: 'all', label: 'Tipos' },
            ...(showNewFilter ? [{ value: NEW_THEME_FILTER, label: 'Novos' }] : []),
            ...activeThemes.map(theme => ({
                value: theme,
                label: getUiThemeLabel(theme),
            })),
        ],
        [activeThemes, showNewFilter]
    );

    const seasonOptions = useMemo(
        () => [
            { value: 'all', label: 'Temporadas' },
            ...activeSeasons.map(season => ({
                value: season,
                label: season,
            })),
        ],
        [activeSeasons]
    );

    const handleToggleThemeMenu = useCallback(
        () => setOpenFilterMenu(prev => (prev === 'theme' ? null : 'theme')),
        []
    );
    const handleToggleSeasonMenu = useCallback(
        () => setOpenFilterMenu(prev => (prev === 'season' ? null : 'season')),
        []
    );
    const handleToggleSortOrderMenu = useCallback(
        () => setOpenFilterMenu(prev => (prev === 'sortOrder' ? null : 'sortOrder')),
        []
    );
    const handleCloseFilterMenu = useCallback(() => setOpenFilterMenu(null), []);
    const handleSelectTheme = useCallback(val => onFilterChange('theme', val), [onFilterChange]);
    const handleSelectSeason = useCallback(val => onFilterChange('season', val), [onFilterChange]);
    const handleSelectSortOrder = useCallback(
        val => onSettingChange('sortOrder', val),
        [onSettingChange]
    );

    const filterConfigs = useMemo(
        () => [
            {
                id: 'themeFilter',
                mobileId: 'themeFilterMobile',
                menuKey: 'theme',
                name: 'theme',
                label: 'Tipos',
                value: filters.theme,
                defaultValue: 'all',
                options: themeOptions,
                onToggle: handleToggleThemeMenu,
                onSelect: handleSelectTheme,
            },
            {
                id: 'seasonFilter',
                mobileId: 'seasonFilterMobile',
                menuKey: 'season',
                name: 'season',
                label: 'Temporadas',
                value: filters.season,
                defaultValue: 'all',
                options: seasonOptions,
                onToggle: handleToggleSeasonMenu,
                onSelect: handleSelectSeason,
            },
            {
                id: 'sortOrder',
                mobileId: 'sortOrderMobile',
                menuKey: 'sortOrder',
                name: 'sortOrder',
                label: 'Categorias',
                value: settings.sortOrder,
                defaultValue: 'theme',
                options: SORT_OPTIONS,
                onToggle: handleToggleSortOrderMenu,
                onSelect: handleSelectSortOrder,
            },
        ],
        [
            filters.theme,
            filters.season,
            settings.sortOrder,
            themeOptions,
            seasonOptions,
            handleToggleThemeMenu,
            handleToggleSeasonMenu,
            handleToggleSortOrderMenu,
            handleSelectTheme,
            handleSelectSeason,
            handleSelectSortOrder,
        ]
    );

    return (
        <div className="toolbar">
            <div className="toolbar-search" role="search" aria-label="Buscar e filtrar pituchinhus">
                {/* 1ª Linha: Busca + Segmented Button à esquerda; Botões de Ação à direita */}
                <div className="toolbar-row toolbar-row-primary">
                    <div className="toolbar-primary-left">
                        <label className="sr-only" htmlFor="searchInput">
                            Buscar
                        </label>
                        <div className="search-bar">
                            <SearchIcon />
                            <input
                                type="search"
                                id="searchInput"
                                name="search"
                                className="search-input"
                                placeholder="Buscar..."
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck="false"
                                value={filters.search}
                                onChange={e => onFilterChange('search', e.target.value)}
                            />
                        </div>

                        <div
                            className={`pills${viewMode ? ' is-view-mode' : ''}`}
                            id="statusPills"
                            role="group"
                            aria-label="Filtro de status"
                        >
                            {STATUS_PILLS.map(pill => {
                                const isActive = viewMode
                                    ? pill.value === 'owned'
                                    : filters.status === pill.value;
                                return (
                                    <button
                                        key={pill.value}
                                        type="button"
                                        className={`pill${isActive ? ' active' : ''}`}
                                        data-status={pill.value}
                                        aria-pressed={isActive}
                                        disabled={viewMode}
                                        onClick={() => {
                                            if (!viewMode) onFilterChange('status', pill.value);
                                        }}
                                    >
                                        {pill.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="actions">
                        <button
                            type="button"
                            className="btn"
                            id="exportToggle"
                            aria-label="Exportar"
                            aria-haspopup="dialog"
                            aria-expanded={activePopup === 'export'}
                            onPointerEnter={handlePrefetchExport}
                            onFocus={handlePrefetchExport}
                            onClick={e => {
                                popupInvokerRef.current = e.currentTarget;
                                handlePrefetchExport();
                                setActivePopup('export');
                            }}
                        >
                            <ExportIcon />
                            <span className="btn-label">Exportar</span>
                        </button>

                        {!viewMode && (
                            <button
                                type="button"
                                className="btn"
                                id="batchToggle"
                                aria-label="Ações em lote"
                                aria-haspopup="dialog"
                                aria-expanded={activePopup === 'batch'}
                                onPointerEnter={handlePrefetchBatch}
                                onFocus={handlePrefetchBatch}
                                onClick={e => {
                                    popupInvokerRef.current = e.currentTarget;
                                    handlePrefetchBatch();
                                    setBatchContext(
                                        getBatchContext
                                            ? getBatchContext()
                                            : { visibleIds: [], scopeSprites: [] }
                                    );
                                    setActivePopup('batch');
                                }}
                            >
                                <BatchIcon />
                                <span className="btn-label">Em lote</span>
                            </button>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            id="importInput"
                            name="importBackup"
                            className="file-input"
                            accept=".json"
                            onChange={handleFileChange}
                        />

                        <button
                            type="button"
                            className="btn"
                            id="shareBtn"
                            aria-label="Compartilhar"
                            onClick={onShare}
                        >
                            <ShareIcon />
                            <span className="btn-label">Compartilhar</span>
                        </button>

                        <button
                            type="button"
                            className="btn"
                            id="settingsToggle"
                            aria-label="Configurações"
                            aria-haspopup="dialog"
                            aria-expanded={activePopup === 'settings'}
                            onPointerEnter={handlePrefetchSettings}
                            onFocus={handlePrefetchSettings}
                            onClick={e => {
                                popupInvokerRef.current = e.currentTarget;
                                handlePrefetchSettings();
                                setActivePopup('settings');
                            }}
                        >
                            <SettingsIcon />
                            <span className="btn-label">Configurações</span>
                        </button>
                    </div>
                </div>

                {/* 2ª Linha: Filtros Secundários (M3 Menu no Desktop >=768px / Select Nativo no Mobile <=767px) */}
                <div className="toolbar-row toolbar-row-filters" ref={filtersRowRef}>
                    {isMobileViewport
                        ? filterConfigs.map(cfg => (
                              <Fragment key={cfg.mobileId}>
                                  <label className="sr-only" htmlFor={cfg.mobileId}>
                                      {cfg.label}
                                  </label>
                                  <select
                                      id={cfg.mobileId}
                                      name={cfg.name}
                                      className="select filter-chip mobile-filter-select"
                                      value={cfg.value}
                                      onChange={e => cfg.onSelect(e.target.value)}
                                  >
                                      {cfg.options.map(opt => (
                                          <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                          </option>
                                      ))}
                                  </select>
                              </Fragment>
                          ))
                        : filterConfigs.map(cfg => (
                              <M3FilterMenu
                                  key={cfg.id}
                                  id={cfg.id}
                                  label={cfg.label}
                                  value={cfg.value}
                                  defaultValue={cfg.defaultValue}
                                  options={cfg.options}
                                  isOpen={activeFilterMenu === cfg.menuKey}
                                  onToggle={cfg.onToggle}
                                  onClose={handleCloseFilterMenu}
                                  onSelect={cfg.onSelect}
                              />
                          ))}
                </div>
            </div>

            {/* Popup Modal Centralizado: Exportar */}
            {activePopup === 'export' && (
                <Suspense fallback={null}>
                    <ExportModal
                        viewMode={viewMode}
                        onClose={handleClosePopup}
                        onExportImage={handleExportAction}
                        onCopyTradeText={onCopyTradeText}
                        onCopyTradeGrid={onCopyTradeGrid}
                        onExportBackup={onExportBackup}
                        onTriggerImport={handleTriggerImport}
                    />
                </Suspense>
            )}

            {/* Popup Modal Centralizado: Configurações */}
            {activePopup === 'settings' && (
                <Suspense fallback={null}>
                    <SettingsModal
                        settings={settings}
                        onSettingChange={onSettingChange}
                        onClose={handleClosePopup}
                    />
                </Suspense>
            )}

            {/* Popup Modal Centralizado: Ações em lote */}
            {activePopup === 'batch' && !viewMode && batchContext && onApplyBatch && (
                <Suspense fallback={null}>
                    <BatchModal
                        activeSeasons={activeSeasons}
                        initialSeason={filters.season}
                        visibleIds={batchContext.visibleIds}
                        scopeSprites={batchContext.scopeSprites}
                        onApply={onApplyBatch}
                        onClose={handleClosePopup}
                    />
                </Suspense>
            )}
        </div>
    );
});
