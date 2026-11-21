// @vitest-environment jsdom
import { createElement } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import {
    CatalogPage,
    INITIAL_BATCH_SIZE,
    EAGER_CARDS,
    PRIORITY_CARDS,
} from './pages/CatalogPage.jsx';
import { getSpriteImageUrl } from './assets/spriteImages.js';

/** @param {ParentNode} root @param {string} selector */
function mustQuery(root, selector) {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`Elemento esperado não encontrado: ${selector}`);
    return /** @type {HTMLElement} */ (el);
}

function setupRenderCounter() {
    const counts = {
        spriteCard: 0,
        header: 0,
        filterBar: 0,
        controllerHud: 0,
    };
    window.__recordPerfRender = key => {
        counts[key] += 1;
    };
    return {
        counts,
        reset() {
            counts.spriteCard = 0;
            counts.header = 0;
            counts.filterBar = 0;
            counts.controllerHud = 0;
        },
    };
}

describe('Otimizações de renderização, carregamento e acessibilidade', () => {
    let tracker;
    const originalIntersectionObserver = globalThis.IntersectionObserver;
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
        localStorage.clear();
        tracker = setupRenderCounter();
    });

    afterEach(() => {
        delete window.__recordPerfRender;
        globalThis.IntersectionObserver = originalIntersectionObserver;
        window.matchMedia = originalMatchMedia;
        window.history.replaceState({}, '', '/');
        document.getElementById('toastContainer')?.remove();
        cleanup();
    });

    it('renderiza apenas o lote inicial e preserva memoização ao mover foco entre cards', () => {
        const { container } = render(createElement(CatalogPage));
        const cards = container.querySelectorAll('.card[data-id]');
        expect(cards.length).toBe(INITIAL_BATCH_SIZE);
        expect(tracker.counts).toEqual({
            spriteCard: INITIAL_BATCH_SIZE,
            header: 1,
            filterBar: 1,
            controllerHud: 1,
        });

        tracker.reset();
        fireEvent.focus(mustQuery(cards[1], '.card-primary'));

        expect(tracker.counts.spriteCard).toBe(2);
        expect(tracker.counts.header).toBe(0);
        expect(tracker.counts.filterBar).toBe(0);
        expect(tracker.counts.controllerHud).toBe(0);
    });

    it('carrega lotes adicionais via IntersectionObserver conforme rolagem', () => {
        /** @type {((entries: Array<{ isIntersecting: boolean }>) => void) | null} */
        let observerCallback = null;
        globalThis.IntersectionObserver = /** @type {typeof IntersectionObserver} */ (
            /** @type {unknown} */ (
                class MockIntersectionObserver {
                    constructor(cb) {
                        observerCallback = cb;
                    }
                    observe() {}
                    disconnect() {}
                }
            )
        );

        const { container } = render(createElement(CatalogPage));
        expect(container.querySelectorAll('.card[data-id]').length).toBe(INITIAL_BATCH_SIZE);
        expect(container.querySelector('.grid-region .load-more-sentinel')).not.toBeNull();
        expect(container.querySelector('footer.footer')).toBeNull();
        expect(typeof observerCallback).toBe('function');

        tracker.reset();
        act(() => {
            observerCallback?.([{ isIntersecting: true }]);
        });

        const updatedCards = container.querySelectorAll('.card[data-id]');
        expect(updatedCards.length).toBe(INITIAL_BATCH_SIZE * 2);
        // Apenas os novos 48 cards são montados
        expect(tracker.counts.spriteCard).toBe(INITIAL_BATCH_SIZE);

        // Avança até esgotar os lotes e verifica que o sentinela sai e o footer entra no fim
        for (let step = 0; step < 8 && container.querySelector('.load-more-sentinel'); step++) {
            act(() => {
                observerCallback?.([{ isIntersecting: true }]);
            });
        }
        expect(container.querySelector('.load-more-sentinel')).toBeNull();
        expect(container.querySelector('footer.footer')).not.toBeNull();
    });

    it('preserva lotes já carregados ao marcar pituchinhu sob filtro Faltando', () => {
        /** @type {((entries: Array<{ isIntersecting: boolean }>) => void) | null} */
        let observerCallback = null;
        globalThis.IntersectionObserver = /** @type {typeof IntersectionObserver} */ (
            /** @type {unknown} */ (
                class MockIntersectionObserver {
                    constructor(cb) {
                        observerCallback = cb;
                    }
                    observe() {}
                    disconnect() {}
                }
            )
        );

        const { container } = render(createElement(CatalogPage));
        fireEvent.click(mustQuery(container, '[data-status="missing"]'));

        act(() => {
            observerCallback?.([{ isIntersecting: true }]);
        });

        const expandedCards = container.querySelectorAll('.card[data-id]');
        expect(expandedCards.length).toBe(INITIAL_BATCH_SIZE * 2);

        const card49 = /** @type {HTMLElement} */ (expandedCards[INITIAL_BATCH_SIZE]);
        const card49Id = card49.dataset.id;
        fireEvent.click(mustQuery(card49, '.card-primary'));

        const remainingCards = container.querySelectorAll('.card[data-id]');
        expect(remainingCards.length).toBe(INITIAL_BATCH_SIZE * 2);
        expect(container.querySelector(`.card[data-id="${card49Id}"]`)).toBeNull();
    });

    it('clicar para coletar, dominar e desmarcar domínio re-renderiza apenas 1 card e atualiza aria-label em PT-BR', () => {
        const { container } = render(createElement(CatalogPage));
        const cards = container.querySelectorAll('.card[data-id]');
        const targetCard = cards[0];
        const targetBtn = mustQuery(targetCard, '.card-primary');
        const cardTitle = mustQuery(targetCard, '.card-title').textContent || '';

        expect(targetCard.querySelector('.card-primary button, .card-primary a, .card-primary [role="button"]')).toBeNull();
        expect(targetBtn.getAttribute('aria-label')).toContain(cardTitle);
        expect(targetBtn.getAttribute('aria-label')).toContain('Não coletado');

        // 1. Marcar como coletado
        tracker.reset();
        fireEvent.click(targetBtn);
        expect(tracker.counts.spriteCard).toBe(1);
        expect(tracker.counts.header).toBe(1);
        expect(tracker.counts.filterBar).toBe(0);
        expect(tracker.counts.controllerHud).toBe(0);
        expect(targetCard.classList.contains('obtained')).toBe(true);
        expect(targetCard.classList.contains('mastered')).toBe(false);
        expect(targetBtn.getAttribute('aria-label')).toMatch(new RegExp(`^${cardTitle}.*Coletado`));

        // 2. Marcar como dominado pela coroa (irmã de .card-primary, sem aninhamento interativo)
        const crownBtn = mustQuery(targetCard, '.card-crown');
        expect(targetBtn.contains(crownBtn)).toBe(false);
        tracker.reset();
        fireEvent.click(crownBtn);
        expect(tracker.counts.spriteCard).toBe(1);
        expect(tracker.counts.header).toBe(1);
        expect(tracker.counts.filterBar).toBe(0);
        expect(tracker.counts.controllerHud).toBe(0);
        expect(targetCard.classList.contains('mastered')).toBe(true);
        expect(targetBtn.getAttribute('aria-label')).toMatch(new RegExp(`^${cardTitle}.*Dominado`));

        // 3. Clicar no card dominado volta para apenas coletado
        tracker.reset();
        fireEvent.click(targetBtn);
        expect(tracker.counts.spriteCard).toBe(1);
        expect(tracker.counts.header).toBe(1);
        expect(tracker.counts.filterBar).toBe(0);
        expect(tracker.counts.controllerHud).toBe(0);
        expect(targetCard.classList.contains('obtained')).toBe(true);
        expect(targetCard.classList.contains('mastered')).toBe(false);
    });

    it('configura prioridade de imagens e semântica ARIA acessível no grid e cards', () => {
        const { container } = render(createElement(CatalogPage));
        const grid = mustQuery(container, '#spriteGrid');
        expect(grid.getAttribute('role')).toBeNull();

        const imgs = container.querySelectorAll('.card-display img');
        expect(imgs.length).toBe(INITIAL_BATCH_SIZE);

        imgs.forEach((img, index) => {
            expect(img.getAttribute('decoding')).toBe('async');
            expect(img.getAttribute('width')).toBe('80');
            expect(img.getAttribute('height')).toBe('80');
            if (index < EAGER_CARDS) {
                expect(img.getAttribute('loading')).toBe('eager');
            } else {
                expect(img.getAttribute('loading')).toBe('lazy');
            }
            if (index < PRIORITY_CARDS) {
                expect(img.getAttribute('fetchpriority')).toBe('high');
            } else {
                expect(img.hasAttribute('fetchpriority')).toBe(false);
            }
        });
    });

    it('carrega os modais de Exportar e Configurações como dialog nativo e devolve o foco ao fechar', async () => {
        const { container } = render(createElement(CatalogPage));
        expect(container.querySelector('#exportPopupTitle')).toBeNull();
        expect(container.querySelector('#settingsPopupTitle')).toBeNull();

        const exportBtn = mustQuery(container, '#exportToggle');
        exportBtn.focus();
        fireEvent.click(exportBtn);
        await waitFor(() => {
            expect(container.querySelector('#exportPopupTitle')).not.toBeNull();
        });

        const exportDialog = mustQuery(container, 'dialog.modal-popup');
        expect(exportDialog.hasAttribute('open')).toBe(true);
        expect(exportDialog.getAttribute('role')).toBeNull();
        expect(document.activeElement).toBe(container.querySelector('.modal-close-btn'));

        fireEvent.click(mustQuery(container, '.modal-close-btn'));
        expect(container.querySelector('#exportPopupTitle')).toBeNull();
        await waitFor(() => {
            expect(document.activeElement).toBe(exportBtn);
        });

        const settingsBtn = mustQuery(container, '#settingsToggle');
        settingsBtn.focus();
        fireEvent.click(settingsBtn);
        await waitFor(() => {
            expect(container.querySelector('#settingsPopupTitle')).not.toBeNull();
        });

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(container.querySelector('#settingsPopupTitle')).toBeNull();
        await waitFor(() => {
            expect(document.activeElement).toBe(settingsBtn);
        });
    });

    it('exibe empty state com botão Limpar filtros, desabilita pílulas em viewMode e ignora Ctrl+D', async () => {
        const { container } = render(createElement(CatalogPage));

        // 1. Ctrl+D no grid não deve ativar o HUD de teclado
        const grid = mustQuery(container, '#spriteGrid');
        fireEvent.keyDown(grid, { key: 'd', ctrlKey: true });
        expect(container.querySelector('.controller-hud')).toBeNull();

        // 2. Busca sem resultados mostra .empty-state com botão Limpar filtros
        const searchInput = mustQuery(container, '#searchInput');
        fireEvent.change(searchInput, { target: { value: '__termo_inexistente_xyz__' } });

        await waitFor(() => {
            expect(container.querySelector('.empty-state')).not.toBeNull();
        });
        const clearBtn = mustQuery(container, '#clearFiltersBtn');

        fireEvent.click(clearBtn);
        await waitFor(() => {
            expect(container.querySelector('.empty-state')).toBeNull();
            expect(container.querySelectorAll('.card[data-id]').length).toBe(INITIAL_BATCH_SIZE);
        });
        cleanup();

        // 3. Em viewMode, pílulas ficam desabilitadas com Coletados ativo
        window.history.replaceState({}, '', '/?c=2.invalido');
        const viewRender = render(createElement(CatalogPage));
        const pills = viewRender.container.querySelectorAll('#statusPills .pill');
        expect(pills.length).toBe(3);
        pills.forEach(node => {
            const pill = /** @type {HTMLButtonElement} */ (node);
            expect(pill.disabled).toBe(true);
            const expectedPressed = pill.dataset.status === 'owned' ? 'true' : 'false';
            expect(pill.getAttribute('aria-pressed')).toBe(expectedPressed);
        });
    });

    it('substitui src por sprite_unreal no erro de imagem sem loop infinito', () => {
        const { container } = render(createElement(CatalogPage));
        const img = /** @type {HTMLImageElement} */ (container.querySelector('.card-display img'));
        const fallbackUrl = getSpriteImageUrl('sprite_unreal');

        expect(img).not.toBeNull();
        expect(img.getAttribute('src')).not.toBe(fallbackUrl);

        fireEvent.error(img);
        expect(img.getAttribute('src')).toBe(fallbackUrl);

        // Um segundo erro no fallback não deve disparar novo ciclo de renderização
        tracker.reset();
        fireEvent.error(img);
        expect(tracker.counts.spriteCard).toBe(0);
        expect(img.getAttribute('src')).toBe(fallbackUrl);
    });

    it('monta apenas filtros desktop ou selects mobile conforme viewport matchMedia', () => {
        let matchesMobile = false;
        /** @type {Set<() => void>} */
        const listeners = new Set();

        window.matchMedia = /** @type {typeof window.matchMedia} */ (
            query =>
                /** @type {MediaQueryList} */ (
                    /** @type {unknown} */ ({
                        matches: query === '(max-width: 767px)' ? matchesMobile : false,
                        media: query,
                        addEventListener: (_event, cb) => listeners.add(cb),
                        removeEventListener: (_event, cb) => listeners.delete(cb),
                    })
                )
        );

        const { container, unmount } = render(createElement(CatalogPage));

        expect(container.querySelector('#themeFilterMenuTrigger')).not.toBeNull();
        expect(container.querySelector('#seasonFilterMenuTrigger')).not.toBeNull();
        expect(container.querySelector('#sortOrderMenuTrigger')).not.toBeNull();
        expect(container.querySelector('#themeFilterMobile')).toBeNull();
        expect(container.querySelector('#seasonFilterMobile')).toBeNull();
        expect(container.querySelector('#sortOrderMobile')).toBeNull();

        act(() => {
            matchesMobile = true;
            listeners.forEach(cb => cb());
        });

        expect(container.querySelector('#themeFilterMenuTrigger')).toBeNull();
        expect(container.querySelector('#seasonFilterMenuTrigger')).toBeNull();
        expect(container.querySelector('#sortOrderMenuTrigger')).toBeNull();
        expect(container.querySelector('#themeFilterMobile')).not.toBeNull();
        expect(container.querySelector('#seasonFilterMobile')).not.toBeNull();
        expect(container.querySelector('#sortOrderMobile')).not.toBeNull();

        unmount();
        expect(listeners.size).toBe(0);
    });

    it('exibe card-badge new-badge "NOVO" para novas adições e cede lugar a COLETADO / DOMINADO', async () => {
        const { container } = render(createElement(CatalogPage));
        const searchInput = mustQuery(container, '#searchInput');
        fireEvent.change(searchInput, { target: { value: 'Ponto Zé' } });

        await waitFor(() => {
            expect(container.querySelector('.card[data-id="zee_basic"]')).not.toBeNull();
        });

        const card = mustQuery(container, '.card[data-id="zee_basic"]');
        const primaryBtn = mustQuery(card, '.card-primary');

        // Estado inicial novo e não coletado
        expect(mustQuery(card, '.card-badge.new-badge').textContent).toBe('NOVO');
        expect(primaryBtn.getAttribute('aria-label')).toContain('Não coletado (Novo)');

        // Ao clicar para coletar, cede lugar a COLETADO
        fireEvent.click(primaryBtn);
        expect(card.querySelector('.card-badge.new-badge')).toBeNull();
        expect(mustQuery(card, '.card-badge.collected').textContent).toBe('COLETADO');

        // Ao dominar pela coroa, exibe DOMINADO
        fireEvent.click(mustQuery(card, '.card-crown'));
        expect(card.querySelector('.card-badge.new-badge')).toBeNull();
        expect(mustQuery(card, '.card-badge.mastered-badge').textContent).toBe('DOMINADO');

        // Ao desmarcar domínio e coleção, volta a exibir NOVO
        fireEvent.click(primaryBtn);
        expect(mustQuery(card, '.card-badge.collected').textContent).toBe('COLETADO');
        fireEvent.click(primaryBtn);
        expect(mustQuery(card, '.card-badge.new-badge').textContent).toBe('NOVO');
    });

    it('filtra apenas os novos elementais ao selecionar "Novos" no filtro de Tipos', async () => {
        const { container } = render(createElement(CatalogPage));
        const trigger = mustQuery(container, '#themeFilterMenuTrigger');
        fireEvent.click(trigger);

        const newOption = Array.from(container.querySelectorAll('.m3-menu-item')).find(
            el => el.textContent === 'Novos'
        );
        expect(newOption).toBeTruthy();
        fireEvent.click(/** @type {HTMLElement} */ (newOption));

        await waitFor(() => {
            const visibleCards = container.querySelectorAll('.card[data-id]');
            expect(visibleCards.length).toBe(13);
            visibleCards.forEach(cardEl => {
                expect(cardEl.querySelector('.card-badge.new-badge')?.textContent).toBe('NOVO');
            });
        });
    });
});
