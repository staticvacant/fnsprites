// @vitest-environment jsdom
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CatalogPage, MAX_BACKUP_FILE_BYTES } from './pages/CatalogPage.jsx';
import { ModalDialog } from './components/ModalDialog.jsx';
import ExportModal from './components/ExportModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { KEYS } from './share-order.js';
import { toast } from './dom-utils.js';
import { baseSprites } from './data/sprites-data.js';
import { getActiveSeasons, getFamilyKey, getReleasedSprites } from './query.js';
import { encodeBits } from './share-codec.js';
import { LEGACY_SHARE_ORDER } from './share-legacy-order.js';

describe('Modais (ModalDialog, ExportModal, SettingsModal)', () => {
    const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
    const originalShowModal = Object.getOwnPropertyDescriptor(
        HTMLDialogElement.prototype,
        'showModal'
    );
    const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        document.getElementById('toastContainer')?.remove();
        delete document.documentElement.dataset.theme;
        cleanup();
        vi.restoreAllMocks();
        if (originalUserAgent) Object.defineProperty(navigator, 'userAgent', originalUserAgent);
        if (originalPlatform) Object.defineProperty(navigator, 'platform', originalPlatform);
        if (originalShowModal) {
            Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
        } else {
            delete (/** @type {any} */ (HTMLDialogElement.prototype)).showModal;
        }
        if (originalClose) {
            Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
        } else {
            delete (/** @type {any} */ (HTMLDialogElement.prototype)).close;
        }
    });

    it('usa showModal nativo quando disponível e fecha ao clicar fora do retângulo do dialog', () => {
        const showModalSpy = vi.fn(
            /** @this {HTMLDialogElement} */
            function () {
                this.setAttribute('open', '');
            }
        );
        const closeSpy = vi.fn(
            /** @this {HTMLDialogElement} */
            function () {
                this.removeAttribute('open');
            }
        );
        Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
            configurable: true,
            value: showModalSpy,
        });
        Object.defineProperty(HTMLDialogElement.prototype, 'close', {
            configurable: true,
            value: closeSpy,
        });

        const onClose = vi.fn();
        const { container } = render(
            createElement(
                ModalDialog,
                {
                    title: 'Teste',
                    titleId: 'testModalTitle',
                    bodyAriaLabel: 'Conteúdo de teste',
                    onClose,
                },
                createElement('p', null, 'Corpo')
            )
        );

        const dialog = /** @type {HTMLDialogElement} */ (container.querySelector('dialog.modal-popup'));
        expect(showModalSpy).toHaveBeenCalledTimes(1);
        dialog.getBoundingClientRect = () =>
            /** @type {DOMRect} */ ({
                left: 100,
                right: 300,
                top: 100,
                bottom: 300,
                width: 200,
                height: 200,
                x: 100,
                y: 100,
                toJSON: () => ({}),
            });

        // Pressionar dentro e soltar fora não deve fechar
        fireEvent(
            dialog,
            Object.assign(new Event('pointerdown', { bubbles: true }), { clientX: 150, clientY: 150 })
        );
        fireEvent(
            dialog,
            Object.assign(new Event('pointerup', { bubbles: true }), { clientX: 10, clientY: 10 })
        );
        expect(onClose).not.toHaveBeenCalled();

        // Pressionar e soltar fora fecha via light-dismiss
        fireEvent(
            dialog,
            Object.assign(new Event('pointerdown', { bubbles: true }), { clientX: 10, clientY: 10 })
        );
        fireEvent(
            dialog,
            Object.assign(new Event('pointerup', { bubbles: true }), { clientX: 10, clientY: 10 })
        );
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('dispara ações de imagem, troca e backup JSON pelo ExportModal e fecha após clicar', () => {
        const onClose = vi.fn();
        const onExportImage = vi.fn();
        const onCopyTradeText = vi.fn();
        const onCopyTradeGrid = vi.fn();
        const onExportBackup = vi.fn();
        const onTriggerImport = vi.fn();

        const { container } = render(
            createElement(ExportModal, {
                onClose,
                onExportImage,
                onCopyTradeText,
                onCopyTradeGrid,
                onExportBackup,
                onTriggerImport,
            })
        );

        const collectionBtn = Array.from(container.querySelectorAll('button')).find(btn =>
            btn.textContent?.includes('Coleção')
        );
        fireEvent.click(/** @type {HTMLElement} */ (collectionBtn));
        expect(onExportImage).toHaveBeenCalledWith('collected');

        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#copyTradeTextBtn')));
        expect(onCopyTradeText).toHaveBeenCalledTimes(1);

        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#copyTradeGridBtn')));
        expect(onCopyTradeGrid).toHaveBeenCalledTimes(1);

        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#exportBackupBtn')));
        expect(onExportBackup).toHaveBeenCalledTimes(1);

        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#importBtn')));
        expect(onTriggerImport).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(5);
    });

    it('oculta o botão de importação no ExportModal quando está em viewMode', () => {
        const { container } = render(
            createElement(ExportModal, {
                viewMode: true,
                onClose: vi.fn(),
                onExportImage: vi.fn(),
                onCopyTradeText: vi.fn(),
                onCopyTradeGrid: vi.fn(),
                onExportBackup: vi.fn(),
                onTriggerImport: vi.fn(),
            })
        );

        expect(container.querySelector('#exportBackupBtn')).not.toBeNull();
        expect(container.querySelector('#importBtn')).toBeNull();
    });

    it('atualiza switches em SettingsModal e oculta Abrir exportações no iOS', () => {
        const baseSettings = {
            hideMastered: false,
            showUnreleased: false,
            lowFidelity: false,
            lightTheme: false,
            openExports: false,
        };
        const onSettingChange = vi.fn();

        const desktop = render(
            createElement(SettingsModal, {
                settings: baseSettings,
                onSettingChange,
                onClose: vi.fn(),
            })
        );
        expect(desktop.container.querySelector('#openExports')).not.toBeNull();
        fireEvent.click(/** @type {HTMLElement} */ (desktop.container.querySelector('#hideMastered')));
        fireEvent.click(/** @type {HTMLElement} */ (desktop.container.querySelector('#openExports')));
        expect(onSettingChange).toHaveBeenCalledWith('hideMastered', true);
        expect(onSettingChange).toHaveBeenCalledWith('openExports', true);
        desktop.unmount();

        Object.defineProperty(navigator, 'userAgent', {
            configurable: true,
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        });
        const ios = render(
            createElement(SettingsModal, {
                settings: baseSettings,
                onSettingChange,
                onClose: vi.fn(),
            })
        );
        expect(ios.container.querySelector('#openExports')).toBeNull();
    });
});

describe('Backup JSON completo (exportação, validações e modo leitura)', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        document.getElementById('toastContainer')?.remove();
        delete document.documentElement.dataset.theme;
        cleanup();
        vi.restoreAllMocks();
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('exporta JSON completo da coleção e revoga ObjectURL em seguida', async () => {
        localStorage.setItem(KEYS.obtained, JSON.stringify(['water_basic', 'water_gold']));
        localStorage.setItem(KEYS.mastered, JSON.stringify(['water_basic']));

        /** @type {Blob | null} */
        let capturedBlob = null;
        URL.createObjectURL = vi.fn(blob => {
            capturedBlob = blob;
            return 'blob:mock-backup';
        });
        URL.revokeObjectURL = vi.fn();
        const anchorClickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        const { container } = render(createElement(CatalogPage));
        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#exportToggle')));

        const exportBackupBtn = /** @type {HTMLElement} */ (
            await waitFor(() => {
                const btn = container.querySelector('#exportBackupBtn');
                expect(btn).not.toBeNull();
                return btn;
            })
        );
        fireEvent.click(exportBackupBtn);

        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(anchorClickSpy).toHaveBeenCalledTimes(1);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-backup');
        expect(capturedBlob).not.toBeNull();
        if (!capturedBlob) throw new Error('Backup blob não foi capturado');
        const parsed = JSON.parse(await /** @type {Blob} */ (capturedBlob).text());
        expect(parsed).toEqual({
            obtained: ['water_basic', 'water_gold'],
            mastered: ['water_basic'],
        });
        expect(document.body.textContent).toContain('Backup exportado com sucesso!');
    });

    it('rejeita JSON corrompido, trata backup vazio, limpa mastered órfãos e bloqueia importação em viewMode', async () => {
        localStorage.setItem(KEYS.obtained, JSON.stringify(['water_basic']));
        const { container } = render(createElement(CatalogPage));
        const importInput = /** @type {HTMLInputElement} */ (
            container.querySelector('#importInput')
        );

        // 1. JSON sintaticamente inválido
        fireEvent.change(importInput, {
            target: { files: [new File(['{corrompido'], 'bad.json', { type: 'application/json' })] },
        });
        await waitFor(() => {
            expect(document.body.textContent).toContain('Falha ao importar: formato JSON inválido');
        });
        expect(JSON.parse(localStorage.getItem(KEYS.obtained) || '[]')).toEqual(['water_basic']);

        // 2. Backup vazio
        fireEvent.change(importInput, {
            target: {
                files: [
                    new File([JSON.stringify({ obtained: [], mastered: [] })], 'empty.json', {
                        type: 'application/json',
                    }),
                ],
            },
        });
        await waitFor(() => {
            expect(document.body.textContent).toContain('Arquivo de backup vazio');
        });

        // 3. Preserva invariante mastered ⊆ obtained ao importar mastered órfão
        fireEvent.change(importInput, {
            target: {
                files: [
                    new File(
                        [
                            JSON.stringify({
                                obtained: ['water_gold'],
                                mastered: ['water_gold', 'fire_basic'],
                            }),
                        ],
                        'orphan.json',
                        { type: 'application/json' }
                    ),
                ],
            },
        });
        await waitFor(() => {
            expect(JSON.parse(localStorage.getItem(KEYS.obtained) || '[]')).toEqual(['water_gold']);
            expect(JSON.parse(localStorage.getItem(KEYS.mastered) || '[]')).toEqual(['water_gold']);
        });
        cleanup();

        // 4. Modo somente leitura recusa importação
        window.history.replaceState({}, '', '/?c=water:basic');
        const viewRender = render(createElement(CatalogPage));
        const viewInput = /** @type {HTMLInputElement} */ (
            viewRender.container.querySelector('#importInput')
        );
        fireEvent.change(viewInput, {
            target: {
                files: [
                    new File(
                        [JSON.stringify({ obtained: ['water_basic'], mastered: [] })],
                        'ro.json',
                        { type: 'application/json' }
                    ),
                ],
            },
        });
        await waitFor(() => {
            expect(document.body.textContent).toContain(
                'Não é possível importar no modo somente leitura!'
            );
        });
    });

    it('recusa arquivo de backup acima do limite antes de chamar FileReader.readAsText', async () => {
        const readAsTextSpy = vi.spyOn(FileReader.prototype, 'readAsText');
        const { container } = render(createElement(CatalogPage));
        const input = /** @type {HTMLInputElement} */ (container.querySelector('#importInput'));
        const oversizedFile = new File(['{}'], 'huge.json', { type: 'application/json' });
        Object.defineProperty(oversizedFile, 'size', { value: MAX_BACKUP_FILE_BYTES + 1 });

        fireEvent.change(input, { target: { files: [oversizedFile] } });

        await waitFor(() => {
            expect(document.body.textContent).toContain(
                'Arquivo de backup muito grande (máximo 2 MB).'
            );
        });
        expect(readAsTextSpy).not.toHaveBeenCalled();
    });
});

describe('Fluxo ponta a ponta ?c= (compartilhar, somente leitura e sair)', () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        document.getElementById('toastContainer')?.remove();
        delete document.documentElement.dataset.theme;
        cleanup();
        vi.restoreAllMocks();
        if (originalClipboard) {
            Object.defineProperty(navigator, 'clipboard', originalClipboard);
        } else {
            delete (/** @type {any} */ (navigator)).clipboard;
        }
    });

    it('compartilha coleção v2 via ?c=, abre em viewMode travado sem alterar localStorage e sai restaurando dados locais', async () => {
        let copiedUrl = '';
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: vi.fn(async text => {
                    copiedUrl = text;
                }),
            },
        });

        // 1. Sem pituchinhus coletados apenas orienta o usuário
        const emptyRender = render(createElement(CatalogPage));
        fireEvent.click(/** @type {HTMLElement} */ (emptyRender.container.querySelector('#shareBtn')));
        expect(document.body.textContent).toContain('Colete pelo menos um pituchinhu antes de compartilhar!');
        emptyRender.unmount();

        // 2. Com coleção salva, gera ?c= v2 e copia link
        localStorage.setItem(KEYS.obtained, JSON.stringify(['water_basic', 'water_gold']));
        localStorage.setItem(KEYS.mastered, JSON.stringify(['water_gold']));

        const ownerRender = render(createElement(CatalogPage));
        fireEvent.click(/** @type {HTMLElement} */ (ownerRender.container.querySelector('#shareBtn')));
        await waitFor(() => {
            expect(copiedUrl).toContain('?c=2');
        });
        expect(document.body.textContent).toContain('Link compartilhado!');
        ownerRender.unmount();

        // 3. Outro visitante com sua própria coleção local abre o ?c= gerado
        const visitorLocal = JSON.stringify(['fire_basic']);
        localStorage.setItem(KEYS.obtained, visitorLocal);
        localStorage.removeItem(KEYS.mastered);

        const parsed = new URL(copiedUrl);
        window.history.replaceState({}, '', `${parsed.pathname}${parsed.search}`);

        const sharedRender = render(createElement(CatalogPage));
        await waitFor(() => {
            const cards = sharedRender.container.querySelectorAll('.card[data-id]');
            expect(cards.length).toBe(2);
        });

        const banner = /** @type {HTMLElement} */ (
            sharedRender.container.querySelector('#viewBanner')
        );
        expect(banner.textContent).toContain('Visualizando uma coleção compartilhada');
        expect(sharedRender.container.querySelector('#batchToggle')).toBeNull();
        expect(sharedRender.container.querySelector('.card-primary')).toBeNull();
        expect(sharedRender.container.querySelector('.card[data-id="water_gold"].mastered')).not.toBeNull();
        expect(sharedRender.container.querySelector('.card[data-id="water_basic"].obtained')).not.toBeNull();
        expect(localStorage.getItem(KEYS.obtained)).toBe(visitorLocal);

        // 4. Ao clicar em "Ir para meu rastreador", limpa ?c= e volta para coleção local
        fireEvent.click(/** @type {HTMLElement} */ (banner.querySelector('a')));
        await waitFor(() => {
            expect(sharedRender.container.querySelector('#viewBanner')).toBeNull();
            expect(sharedRender.container.querySelector('#batchToggle')).not.toBeNull();
            expect(
                sharedRender.container.querySelector('.card[data-id="fire_basic"].obtained')
            ).not.toBeNull();
        });
        expect(window.location.search).toBe('');
        expect(localStorage.getItem(KEYS.obtained)).toBe(visitorLocal);
    });

    it('carrega link legado v1 em modo somente leitura mantendo mastered', async () => {
        const legacyCode = `${encodeBits('101')}~${encodeBits('1')}`;
        window.history.replaceState({}, '', `/?c=${legacyCode}`);
        const { container } = render(createElement(CatalogPage));

        await waitFor(() => {
            expect(container.querySelectorAll('.card[data-id]').length).toBe(2);
        });
        expect(
            container.querySelector(`.card[data-id="${LEGACY_SHARE_ORDER[0]}"].mastered`)
        ).not.toBeNull();
        expect(
            container.querySelector(`.card[data-id="${LEGACY_SHARE_ORDER[2]}"].obtained`)
        ).not.toBeNull();
    });

    it('inicia viewMode (?c=) com filtros limpos em memória sem sobrescrever filtros salvos no localStorage', async () => {
        localStorage.setItem(KEYS.obtained, JSON.stringify(['fire_basic']));
        localStorage.setItem(KEYS.theme, '__new__');
        localStorage.setItem(KEYS.season, 'C7T5');
        localStorage.setItem(KEYS.status, 'missing');
        localStorage.setItem(KEYS.search, 'fogo');

        const legacyCode = `${encodeBits('101')}~${encodeBits('1')}`;
        window.history.replaceState({}, '', `/?c=${legacyCode}`);
        const { container } = render(createElement(CatalogPage));

        await waitFor(() => {
            expect(container.querySelectorAll('.card[data-id]').length).toBe(2);
        });

        const searchInput = /** @type {HTMLInputElement} */ (
            container.querySelector('#searchInput')
        );
        expect(searchInput.value).toBe('');

        // Filtrar em memória dentro do viewMode não altera o localStorage do visitante
        fireEvent.change(searchInput, { target: { value: 'inexistente_xyz' } });
        window.dispatchEvent(new Event('pagehide'));
        expect(localStorage.getItem(KEYS.search)).toBe('fogo');
        expect(localStorage.getItem(KEYS.theme)).toBe('__new__');
        expect(localStorage.getItem(KEYS.season)).toBe('C7T5');
        expect(localStorage.getItem(KEYS.status)).toBe('missing');

        // Ao sair do viewMode, restaura coleção e filtros salvos localmente
        const exitLink = /** @type {HTMLElement} */ (container.querySelector('#viewBanner a'));
        fireEvent.click(exitLink);

        await waitFor(() => {
            expect(container.querySelector('#viewBanner')).toBeNull();
            expect(
                /** @type {HTMLInputElement} */ (container.querySelector('#searchInput')).value
            ).toBe('fogo');
        });
        expect(localStorage.getItem(KEYS.search)).toBe('fogo');
        expect(localStorage.getItem(KEYS.theme)).toBe('__new__');
        expect(localStorage.getItem(KEYS.season)).toBe('C7T5');
        expect(localStorage.getItem(KEYS.status)).toBe('missing');
    });
});

describe('Ações em lote (BatchModal + Desfazer atômico)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        document.getElementById('toastContainer')?.remove();
        delete document.documentElement.dataset.theme;
        cleanup();
        vi.restoreAllMocks();
    });

    it('marca família com mastery e desfaz restaurando estado anterior exato', async () => {
        const released = getReleasedSprites(baseSprites);
        const waterIds = released.filter(s => getFamilyKey(s) === 'water').map(s => s.id);
        expect(waterIds.length).toBeGreaterThan(1);

        localStorage.setItem(KEYS.obtained, JSON.stringify(['fire_basic']));
        localStorage.setItem(KEYS.mastered, JSON.stringify([]));

        const { container } = render(createElement(CatalogPage));
        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchToggle')));

        const familyRadio = /** @type {HTMLInputElement} */ (
            await waitFor(() => {
                const radio = container.querySelector('input[name="batch-scope"][value="family"]');
                expect(radio).not.toBeNull();
                return radio;
            })
        );
        fireEvent.click(familyRadio);

        const familySelect = /** @type {HTMLSelectElement} */ (
            container.querySelector('#batchFamilySelect')
        );
        fireEvent.change(familySelect, { target: { value: 'water' } });

        // Alterar radio/select nunca auto-submete mudanças antes do clique explícito
        expect(JSON.parse(localStorage.getItem(KEYS.obtained) || '[]')).toEqual(['fire_basic']);
        expect(container.querySelector('.batch-summary')?.textContent).toContain(
            `${waterIds.length} sprites selecionados`
        );

        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchMasterBtn')));

        await waitFor(() => {
            const obtained = JSON.parse(localStorage.getItem(KEYS.obtained) || '[]');
            const mastered = JSON.parse(localStorage.getItem(KEYS.mastered) || '[]');
            expect(obtained).toEqual(['fire_basic', ...waterIds]);
            expect(mastered).toEqual(waterIds);
        });

        const undoBtn = /** @type {HTMLElement} */ (
            await waitFor(() => {
                const btn = document.querySelector('#toastContainer .toast-success .toast-action');
                expect(btn).not.toBeNull();
                return btn;
            })
        );
        fireEvent.click(undoBtn);

        await waitFor(() => {
            expect(JSON.parse(localStorage.getItem(KEYS.obtained) || '[]')).toEqual(['fire_basic']);
            expect(JSON.parse(localStorage.getItem(KEYS.mastered) || '[]')).toEqual([]);
        });
    });

    it('marca por temporada, remove apenas domínio e limpa coleção no filtro atual (desabilitando quando vazio)', async () => {
        const seasons = getActiveSeasons(baseSprites);
        expect(seasons.length).toBeGreaterThan(0);
        const targetSeason = seasons[0];
        const seasonSprites = getReleasedSprites(baseSprites, targetSeason);
        const seasonIds = seasonSprites.map(s => s.id);

        const { container } = render(createElement(CatalogPage));

        // 1. Escopo Temporada -> marcar como coletados
        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchToggle')));
        const seasonRadio = /** @type {HTMLInputElement} */ (
            await waitFor(() => {
                const el = container.querySelector('input[name="batch-scope"][value="season"]');
                expect(el).not.toBeNull();
                return el;
            })
        );
        fireEvent.click(seasonRadio);
        fireEvent.change(/** @type {HTMLElement} */ (container.querySelector('#batchSeasonSelect')), {
            target: { value: targetSeason },
        });
        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchCollectBtn')));

        await waitFor(() => {
            expect(JSON.parse(localStorage.getItem(KEYS.obtained) || '[]')).toEqual(seasonIds);
        });

        // 2. Escopo Filtro atual restrito ao primeiro sprite da temporada -> master, unmaster, uncollect
        const targetSprite = seasonSprites[0];
        fireEvent.change(/** @type {HTMLElement} */ (container.querySelector('#searchInput')), {
            target: { value: targetSprite.name },
        });
        await waitFor(() => {
            const cards = container.querySelectorAll('.card[data-id]');
            expect(cards.length).toBeGreaterThan(0);
            expect(
                Array.from(cards).some(el => el.getAttribute('data-id') === targetSprite.id)
            ).toBe(true);
        });

        const openBatch = async () => {
            fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchToggle')));
            await waitFor(() => {
                expect(container.querySelector('#batchPopupTitle')).not.toBeNull();
            });
        };

        await openBatch();
        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchMasterBtn')));
        await waitFor(() => {
            const mastered = JSON.parse(localStorage.getItem(KEYS.mastered) || '[]');
            expect(mastered).toContain(targetSprite.id);
        });

        await openBatch();
        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchUnmasterBtn')));
        await waitFor(() => {
            const mastered = JSON.parse(localStorage.getItem(KEYS.mastered) || '[]');
            expect(mastered).not.toContain(targetSprite.id);
            expect(JSON.parse(localStorage.getItem(KEYS.obtained) || '[]')).toContain(
                targetSprite.id
            );
        });

        await openBatch();
        fireEvent.click(/** @type {HTMLElement} */ (container.querySelector('#batchUncollectBtn')));
        await waitFor(() => {
            expect(JSON.parse(localStorage.getItem(KEYS.obtained) || '[]')).not.toContain(
                targetSprite.id
            );
        });

        // 3. Busca sem resultados desabilita ações no filtro atual
        fireEvent.change(/** @type {HTMLElement} */ (container.querySelector('#searchInput')), {
            target: { value: '__sprite_inexistente_xyz__' },
        });
        await waitFor(() => {
            expect(container.querySelectorAll('.card[data-id]').length).toBe(0);
        });
        await openBatch();
        expect(
            /** @type {HTMLButtonElement} */ (container.querySelector('#batchCollectBtn')).disabled
        ).toBe(true);
    });
});

describe('Toasts (ciclo de vida e top layer)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        document.getElementById('toastContainer')?.remove();
        vi.restoreAllMocks();
    });

    it('aplica classe .dismissing, desabilita ação ao dispensar e re-promove popover acima de dialog aberto', () => {
        toast('Primeiro', 'info', { actionLabel: 'Desfazer', onAction: vi.fn() });
        const container = /** @type {HTMLElement} */ (document.getElementById('toastContainer'));
        expect(container).not.toBeNull();

        let popoverOpen = false;
        container.showPopover = vi.fn(() => {
            popoverOpen = true;
        });
        container.hidePopover = vi.fn(() => {
            popoverOpen = false;
        });
        const origMatches = container.matches.bind(container);
        Object.defineProperty(container, 'matches', {
            configurable: true,
            value: selector => (selector === ':popover-open' ? popoverOpen : origMatches(selector)),
        });

        const firstToast = /** @type {HTMLElement} */ (container.querySelector('.toast'));
        const actionBtn = /** @type {HTMLButtonElement} */ (
            firstToast.querySelector('.toast-action')
        );
        actionBtn.focus();
        fireEvent.click(actionBtn);

        expect(firstToast.classList.contains('dismissing')).toBe(true);
        expect(firstToast.classList.contains('visible')).toBe(false);
        expect(actionBtn.disabled).toBe(true);

        vi.advanceTimersByTime(500);
        expect(firstToast.isConnected).toBe(false);

        toast('Base', 'info');
        expect(container.showPopover).toHaveBeenCalledTimes(1);

        const modal = document.createElement('dialog');
        modal.setAttribute('open', '');
        document.body.appendChild(modal);

        toast('Sobre modal', 'gamepad');
        expect(container.hidePopover).toHaveBeenCalledTimes(1);
        expect(container.showPopover).toHaveBeenCalledTimes(2);
    });
});
