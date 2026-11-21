import { useMemo, useState } from 'react';
import { getCharNameMap, getFamilyKey, getFamilyKeys, resolveCharName } from '../query.js';
import { ModalDialog, closeEnclosingDialog } from './ModalDialog.jsx';

const SCOPE_OPTIONS = [
    { value: 'filter', label: 'Filtro atual' },
    { value: 'season', label: 'Temporada' },
    { value: 'family', label: 'Família' },
];

const BATCH_ACTIONS = [
    {
        action: 'collect',
        id: 'batchCollectBtn',
        dotClass: 'dot-collected',
        label: 'Marcar como coletados',
    },
    {
        action: 'master',
        id: 'batchMasterBtn',
        dotClass: 'dot-mastered',
        label: 'Marcar como dominados',
    },
    {
        action: 'unmaster',
        id: 'batchUnmasterBtn',
        dotClass: 'dot-unmastered',
        label: 'Remover domínio',
    },
    {
        action: 'uncollect',
        id: 'batchUncollectBtn',
        dotClass: 'dot-missing',
        label: 'Remover da coleção',
    },
];

/**
 * Modal para marcar ou desmarcar coleções em lote por filtro atual, temporada ou família.
 * @param {{
 *   activeSeasons: string[],
 *   initialSeason?: string,
 *   visibleIds: string[],
 *   scopeSprites: Array<{ id: string, name: string, season?: string, unreleased?: boolean }>,
 *   onApply: (targetIds: string[], action: 'collect' | 'master' | 'unmaster' | 'uncollect') => void,
 *   onClose: () => void,
 * }} props
 */
export default function BatchModal({
    activeSeasons,
    initialSeason,
    visibleIds,
    scopeSprites,
    onApply,
    onClose,
}) {
    const families = useMemo(() => {
        const charNameMap = getCharNameMap(scopeSprites);
        return getFamilyKeys(scopeSprites)
            .map(key => ({
                value: key,
                label: resolveCharName(charNameMap, key),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    }, [scopeSprites]);

    const [scope, setScope] = useState('filter');
    const [selectedSeason, setSelectedSeason] = useState(() =>
        initialSeason && initialSeason !== 'all' && activeSeasons.includes(initialSeason)
            ? initialSeason
            : activeSeasons[0] || ''
    );
    const [selectedFamily, setSelectedFamily] = useState(() => families[0]?.value || '');

    const targetIds = useMemo(() => {
        if (scope === 'season') {
            if (!selectedSeason) return [];
            return scopeSprites
                .filter(sprite => (sprite.season || 'none') === selectedSeason)
                .map(sprite => sprite.id);
        }
        if (scope === 'family') {
            if (!selectedFamily) return [];
            return scopeSprites
                .filter(sprite => getFamilyKey(sprite) === selectedFamily)
                .map(sprite => sprite.id);
        }
        return visibleIds;
    }, [scope, selectedSeason, selectedFamily, scopeSprites, visibleIds]);

    const selectedLabel =
        targetIds.length === 1 ? '1 sprite selecionado' : `${targetIds.length} sprites selecionados`;

    return (
        <ModalDialog
            title="Ações em lote"
            titleId="batchPopupTitle"
            bodyAriaLabel="Opções de ações em lote"
            onClose={onClose}
        >
            <div className="batch-modal-content">
                <fieldset className="batch-scope-group">
                    <legend className="dropdown-section-title batch-legend">Escopo</legend>
                    <div className="batch-radio-list">
                        {SCOPE_OPTIONS.map(opt => {
                            const disabled =
                                (opt.value === 'season' && activeSeasons.length === 0) ||
                                (opt.value === 'family' && families.length === 0);
                            return (
                                <label
                                    key={opt.value}
                                    className={`batch-radio-option${
                                        scope === opt.value ? ' is-selected' : ''
                                    }${disabled ? ' is-disabled' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="batch-scope"
                                        value={opt.value}
                                        checked={scope === opt.value}
                                        disabled={disabled}
                                        onChange={() => setScope(opt.value)}
                                    />
                                    <span>
                                        {opt.value === 'filter'
                                            ? `${opt.label} (${visibleIds.length})`
                                            : opt.label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>

                {scope === 'season' && activeSeasons.length > 0 && (
                    <div className="batch-subfilter">
                        <label htmlFor="batchSeasonSelect" className="batch-subfilter-label">
                            Temporada
                        </label>
                        <select
                            id="batchSeasonSelect"
                            className="select batch-select"
                            value={selectedSeason}
                            onChange={e => setSelectedSeason(e.target.value)}
                        >
                            {activeSeasons.map(season => (
                                <option key={season} value={season}>
                                    {season}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {scope === 'family' && families.length > 0 && (
                    <div className="batch-subfilter">
                        <label htmlFor="batchFamilySelect" className="batch-subfilter-label">
                            Família
                        </label>
                        <select
                            id="batchFamilySelect"
                            className="select batch-select"
                            value={selectedFamily}
                            onChange={e => setSelectedFamily(e.target.value)}
                        >
                            {families.map(family => (
                                <option key={family.value} value={family.value}>
                                    {family.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <p className="batch-summary" aria-live="polite">
                    {selectedLabel}
                </p>

                <hr className="dropdown-divider" />
                <div className="dropdown-section-title">Aplicar ação</div>

                {BATCH_ACTIONS.map(item => (
                    <button
                        key={item.id}
                        id={item.id}
                        type="button"
                        disabled={targetIds.length === 0}
                        onClick={e =>
                            closeEnclosingDialog(e.currentTarget, () => {
                                onClose();
                                onApply(
                                    targetIds,
                                    /** @type {'collect' | 'master' | 'unmaster' | 'uncollect'} */ (
                                        item.action
                                    )
                                );
                            })
                        }
                    >
                        <span className={`dot ${item.dotClass}`} aria-hidden="true" />
                        {item.label}
                    </button>
                ))}
            </div>
        </ModalDialog>
    );
}
