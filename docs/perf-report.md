# Relatório de Refatoração de Desempenho

Relatório das otimizações de desempenho executadas inicialmente nas Fases 0 a 7 e seu estado consolidado até a release **`2.2.0`** (Vite 8 + PWA offline completo).

---

## 1. Comparativo de Chunks e Métricas (Antes vs. Depois)

| Artefato / Métrica | Baseline (Fase 0 — `61427b7`) | Refatoração Perf (Fase 7 — `54a05ba`) | `main` (pós-remediação) | Estado Atual (`2.2.0`) |
| --- | ---: | ---: | ---: | ---: |
| Chunk principal JS (`index-*.js`) | `347.35 kB` (`98.17 kB` gzip) | `341.19 kB` (`95.90 kB` gzip) | `355.26 kB` (`102.69 kB` gzip) | `131.53 kB` (`33.07 kB` gzip) |
| Chunk vendor React (`react-vendor-*.js`) | *embutido no principal* | *embutido no principal* | *embutido no principal* | `218.77 kB` (`68.25 kB` gzip) |
| Chunk sob demanda (`view-export-*.js`) | *embutido no principal* | `12.31 kB` (`4.76 kB` gzip) | `17.25 kB` (`6.45 kB` gzip) | `16.73 kB` (`6.19 kB` gzip) |
| Chunk sob demanda (`share-codec-*.js`) | *embutido no principal* | *embutido no principal* | `6.74 kB` (`2.28 kB` gzip) | `5.96 kB` (`2.15 kB` gzip) |
| CSS principal (`index-*.css`) | `34.20 kB` (`7.39 kB` gzip) | `30.62 kB` (`6.89 kB` gzip) | `34.94 kB` (`7.64 kB` gzip) | `34.52 kB` (`7.74 kB` gzip) |
| HTML (`dist/index.html`) | `1.18 kB` (`0.61 kB` gzip) | `1.13 kB` (`0.59 kB` gzip) | `3.07 kB` (`1.00 kB` gzip) | `2.71 kB` (`0.92 kB` gzip) |
| Precache Workbox (`dist/sw.js`) | `322` entradas (`6644.75 KiB`) | `323` entradas (`6647.21 KiB`) | `14` entradas (`416.12 KiB`) + WebP em runtime | `354` entradas (`4095.41 KiB`, offline completo) |
| `npm run lint` | `0` erros | `0` erros | `0` erros (ESLint + `strictNullChecks`) | `0` erros (ESLint + `strictNullChecks`) |
| `npm test` (Vitest) | `2` arquivos, `23` testes | `5` arquivos, `40` testes | `7` arquivos, `87` testes | `8` arquivos, `102` testes |
| Catálogo (`baseSprites`) | `314` sprites | `314` sprites | `338` sprites | `338` sprites (`13` com `isNew: true`) |

> **Notas de evolução na `2.2.0`:**
> - **Split de `react-vendor` (Vite 8 / Rolldown):** `vite.config.js` isola `react`, `react-dom` e `scheduler` via `build.rolldownOptions.output.codeSplitting.groups` (`react-vendor-*.js`, `68.25 kB` gzip). Atualizações frequentes em `src/data/sprites-data.js` invalidam apenas `index-*.js` (`33.07 kB` gzip) sem forçar re-download do React no Service Worker.
> - **Fonte Roboto offline + `preload`:** Fonte variável `Roboto` auto-hospedada localmente em `src/assets/fonts/roboto-latin.woff2` (`43.13 kB`, subset `latin-ext` removido por ter 0 caracteres usados no projeto) com `<link rel="preload" as="font" type="font/woff2" ... crossorigin>` injetado automaticamente em `dist/index.html`, eliminando qualquer dependência externa do Google Fonts.
> - **Precache Workbox completo:** Na `2.2.0`, o PWA voltou a pré-cachear 100% dos assets emitidos (`354` entradas / `4095.41 KiB`, incluindo todos os `.webp`, ícones PWA e `roboto-latin.woff2`) para funcionamento integral sem conexão, validado automaticamente em CI por `scripts/download-offline-assets.js --verify --verify-dist`.
> - **Otimizações de runtime e UX:** [BatchModal.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/BatchModal.jsx) passou a resolver nomes de famílias em passagem única $O(N)$ (`getCharNameMap` + `resolveCharName`), e o modo compartilhado `?c=` (`viewMode`) em [useTrackerState.js](file:///home/radiant/DevHub/fnpituchinhubr/src/hooks/useTrackerState.js) inicia com filtros limpos em memória sem sobrescrever o `localStorage` do visitante.
> - **Chunks sob demanda:** Além de [src/view-export.js](file:///home/radiant/DevHub/fnpituchinhubr/src/view-export.js) (modularizado com [src/export-text.js](file:///home/radiant/DevHub/fnpituchinhubr/src/export-text.js) e [src/export-palette.js](file:///home/radiant/DevHub/fnpituchinhubr/src/export-palette.js)), os modais (`ExportModal`, `BatchModal`, `SettingsModal`, `ModalDialog`) e [src/share-codec.js](file:///home/radiant/DevHub/fnpituchinhubr/src/share-codec.js) são carregados dinamicamente via `import()`.

---

## 2. O Que Foi Implementado, O Que Foi Pulado e Por Quê

### Implementado por Fase
- **Fase 0 (`61427b7`):** Medição inicial documentada em [docs/perf-baseline.md](file:///home/radiant/DevHub/fnpituchinhubr/docs/perf-baseline.md).
- **Fase 1 (`768e325`):** Ampliação de [src/query.test.js](file:///home/radiant/DevHub/fnpituchinhubr/src/query.test.js) (todos os métodos de `sortSprites`, `getCollectionCounts`, `getSeasonData`, `getFamilyKeys`, `getActiveThemes`, `getCharName`, `getFamilyThemeMap`, `getSpriteIdSet`, `uniqueValidIds`, `isObtained`, `isMastered`, `getDisplayName`) e criação de [src/view-export.test.js](file:///home/radiant/DevHub/fnpituchinhubr/src/view-export.test.js), ambos aprovados sem modificar o código original.
- **Fase 2 (`55cfcb7`):** Em [src/hooks/useGamepadAndSpatialNav.js](file:///home/radiant/DevHub/fnpituchinhubr/src/hooks/useGamepadAndSpatialNav.js):
  - `requestAnimationFrame` (`pollGamepad`) iniciado sob demanda apenas quando há controle conectado no mount ou em `gamepadconnected`, parado em `gamepaddisconnected` (quando zera) e pausado/retomado via `visibilitychange` (`document.hidden`).
  - Substituição de `Array.from(...).filter(Boolean)` por iteração `for` direta (`findActiveGamepad`), remoção da ref morta `visibleSpritesRef` e fast-path de `document.activeElement` em `moveFocusInDirection` com fallback para `querySelector`.
  - **Prova de equivalência em `findSpatialCandidate`:** Em [src/pages/CatalogPage.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/pages/CatalogPage.jsx), `#spriteGrid` renderiza diretamente `{visibleSprites.map(...)}` — cards filtrados são desmontados do DOM (nunca ocultados com `display: none` ou `hidden`), e nem [src/components/SpriteCard.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/SpriteCard.jsx) nem [styles.css](file:///home/radiant/DevHub/fnpituchinhubr/styles.css) aplicam ocultação condicional em `.card`. Assim, verificar `container.checkVisibility()` uma única vez e iterar `container.children` (com fallback `candidate.offsetParent === null` se `checkVisibility` não existir) é estritamente equivalente a checar `checkVisibility()` nos 314 cards.
- **Fase 3 (`0e17827`):**
  - Remoção de `Roboto Mono` de [index.html](file:///home/radiant/DevHub/fnpituchinhubr/index.html) mantendo `Roboto` com todos os pesos/itálico (`0,100..900;1,100..900`).
  - `decoding="async"` na `<img>` de [src/components/SpriteCard.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/SpriteCard.jsx).
  - Carregamento sob demanda de [src/view-export.js](file:///home/radiant/DevHub/fnpituchinhubr/src/view-export.js) com preload em `onPointerEnter`/`onFocus`/`onClick` de `#exportToggle` em [src/components/FilterBar.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/FilterBar.jsx) e execução síncrona quando já pré-carregado (preservando o *user gesture* para Clipboard/`window.open`).
  - Em [src/view-export.js](file:///home/radiant/DevHub/fnpituchinhubr/src/view-export.js): carregamento apenas de `mascot` + `config.items` (os sprites realmente desenhados), cache em memória (`loadedImageCache` `Map` por `src`), e exportação desktop via `canvas.toBlob` + `URL.createObjectURL` + `URL.revokeObjectURL`.
  - **Proposta para `PRIORITY_CARDS` (na ocasião em `24` → ajustada posteriormente para `PRIORITY_CARDS = 2` e `EAGER_CARDS = 8`):** Com base em `.app` (`max-width: 1400px`, `padding: 20px`) e `.grid` em [styles.css](file:///home/radiant/DevHub/fnpituchinhubr/styles.css), a separação foi aplicada em [CatalogPage.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/pages/CatalogPage.jsx), priorizando os primeiros `2` cards com `fetchPriority="high"` e `8` com `loading="eager"`, além de carregamento em lotes (`INITIAL_BATCH_SIZE = 48`).
- **Fase 4 (`30c80bc`):**
  - Instalação de `@testing-library/react` e `jsdom` em `devDependencies` (autorizada pelo usuário).
  - `React.memo` em [SpriteCard.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/SpriteCard.jsx), [Header.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/Header.jsx), [FilterBar.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/FilterBar.jsx) ([M3FilterMenu.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/M3FilterMenu.jsx) + `FilterBar`) e [ControllerHud.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/ControllerHud.jsx).
  - `WeakMap` de metadados estáticos do sprite em `SpriteCard` (confirmado via `grep` que `baseSprites` e os objetos `sprite` nunca são mutados em `src/`).
  - Memoização de opções (`themeOptions`, `seasonOptions` dinâmico e `SORT_OPTIONS`) em `FilterBar.jsx` e estabilização de handlers com `useRef`/`useCallback` em [CatalogPage.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/pages/CatalogPage.jsx).
  - Teste automatizado em [src/render-count.test.js](file:///home/radiant/DevHub/fnpituchinhubr/src/render-count.test.js) (originalmente sobre os `314` cards; hoje `338` sprites no catálogo): mover foco re-renderiza apenas **`2` `SpriteCard`s** (`0` `Header`/`FilterBar`/`ControllerHud`); clicar para coletar/dominar/desmarcar domínio re-renderiza **`1` `SpriteCard`** (`0` `FilterBar`/`ControllerHud`). Telemetria protegida por `import.meta.env.MODE === 'test'` (`0` ocorrências no bundle de produção verificado com `grep`).
- **Fase 5 (`59b280c`):** Em [src/hooks/useTrackerState.js](file:///home/radiant/DevHub/fnpituchinhubr/src/hooks/useTrackerState.js):
  - Persistência incremental no `localStorage` (0 gravações no mount inicial; grava apenas a chave alterada), debounce de `200 ms` para `KEYS.search` com flush imediato em `pagehide`, `visibilitychange` (`hidden`) e unmount — validado em [src/useTrackerState.test.js](file:///home/radiant/DevHub/fnpituchinhubr/src/useTrackerState.test.js).
  - `useDeferredValue(filters.search)` para filtrar o grid mantendo digitação responsiva, `progressStats` com dependências mínimas `[sprites, filters.season, obtained, mastered]` e `new Set(obtained)` em `getStoredCollection`.
- **Fase 6 (`f6f602e`):** Versão enxuta em [src/query.js](file:///home/radiant/DevHub/fnpituchinhubr/src/query.js) e [src/view-export.js](file:///home/radiant/DevHub/fnpituchinhubr/src/view-export.js): `Intl.Collator` reutilizável em `sortSprites` (com paridade verificada contra `localeCompare` em todos os `baseSprites`), `Set` em `getFamilyKeys`, `getActiveThemes`, `filterSprites`, `getCollectionCounts`, `getExportConfig`, `generateTradeText` e `generateTradeGridText`, e loop de passagem única em `getCollectionCounts`.
- **Fase 7 (`54a05ba`):** Remoção segura em [styles.css](file:///home/radiant/DevHub/fnpituchinhubr/styles.css) após `grep` em `index.html`, `src/`, `src/taxonomy.js` e `sprites-data.js`: utilitários tipográficos (`.display-*`, `.headline-*`, `.title-*`, `.body-*`, `.label-*`), botões legados (`.btn-accent`, `.btn-sm`, `.btn-redeemed`), dropdowns legados (`.dropdown`, `.dropdown-menu*`), temas ausentes da taxonomia (`.theme-Rift`, `.theme-Trapaça`, `.theme-Hacker` mantendo `.theme-Trapaceiro` e `.theme-Hacker-de-Saque`) e `.footer a`.

### O Que Foi Pulado e Por Quê
- **Import dinâmico de `share-legacy-order.js` / `share-codec.js` (na Fase 3):** Pulado originalmente na Fase 3 pelo tamanho enxuto de [src/share-legacy-order.js](file:///home/radiant/DevHub/fnpituchinhubr/src/share-legacy-order.js) (`4.913` bytes brutos / `1.271` bytes gzip); posteriormente na `main`, [src/share-codec.js](file:///home/radiant/DevHub/fnpituchinhubr/src/share-codec.js) (junto de `share-legacy-order.js`) passou a ser carregado sob demanda via `import('../share-codec.js')` ao compartilhar ou abrir um link `?c=`, isolando o chunk `share-codec-*.js` (`6.74 kB` / `2.28 kB` gzip).
- **Lógica condicional para pular `filterSprites`/`sortSprites` (Fase 5):** Pulada conforme regra explícita do usuário, mantendo dependências completas e corretas.
- **Caches `WeakMap`/`Map` em `getSeasonData`, `getCharName`, `getFamilyKeys`, `getActiveThemes` e `getOrderedIndex` (Fase 6):** Pulados conforme regra da versão enxuta.
- **`.dropdown-divider` e `.dropdown-section-title` (Fase 7):** Mantidas por serem ativamente usadas dentro de `.modal-body` em [ExportModal.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/ExportModal.jsx) e [BatchModal.jsx](file:///home/radiant/DevHub/fnpituchinhubr/src/components/BatchModal.jsx).

---

## 3. Divergências Entre o Plano e o Código Real

1. **`FilterBar.jsx` e filtros responsivos:** Na refatoração de performance havia menus desktop (`${id}MenuTrigger`) e `<select>` mobile no DOM simultaneamente; na remediação posterior na `main`, `FilterBar.jsx` passou a usar `useMediaQuery('(max-width: 767px)')` para montar apenas a variante ativa no DOM sem duplicação.
2. **`importCollection` em `useTrackerState.js`:** Já validava `mastered` com `new Set(cleanObtained)`; apenas `getStoredCollection` ainda usava `obtained.includes(id)`.
3. **Referências de linha:** Os números de linha do plano original não correspondiam exatamente ao `HEAD` atual (deslocados após commits anteriores de UI/M3); todas as edições foram localizadas diretamente nos arquivos reais.
4. **Google Fonts:** A busca simples por `"Roboto Mono"` não encontrava a string em `index.html` porque na URL estava codificada como `Roboto+Mono`.

---

## 4. Bugs Pré-Existentes Encontrados e Corrigidos na `main`

Os dois itens originalmente identificados como abertos ao término da Fase 7 foram corrigidos posteriormente na branch `main`:

1. **`--duration-short3` em [styles.css](file:///home/radiant/DevHub/fnpituchinhubr/styles.css):** Token `--duration-short3: 150ms` passou a ser definido em `:root` e utilizado em `.m3-menu`.
2. **Revogação de `ObjectURL` em `shouldOpenInNewTab` no [src/view-export.js](file:///home/radiant/DevHub/fnpituchinhubr/src/view-export.js):** Quando a exportação abre a imagem em nova aba, a URL gerada passa a ser revogada após `60_000 ms` (`setTimeout(() => URL.revokeObjectURL(url), 60_000)`).

Além disso, o ciclo posterior de remediação habilitou `"strictNullChecks": true` em [tsconfig.json](file:///home/radiant/DevHub/fnpituchinhubr/tsconfig.json), protegeu importações/Canvas, corrigiu fallback de imagem e toasts em modais nativos e expandiu a suíte Vitest para `7` arquivos (`87` testes).

---

## 5. Checklist de Validação Manual no Navegador

Execute `npm run preview` e valide os seguintes itens (de preferência comparando com as medições do DevTools sugeridas em [docs/perf-baseline.md](file:///home/radiant/DevHub/fnpituchinhubr/docs/perf-baseline.md)):

- [ ] **Cards e Rarity `Especial`:** Verificar visual normal, estados `COLETADO` / `DOMINADO`, coroa de dominação, clique em card dominado voltando para apenas coletado e animação arco-íris/glow somente em hover/toque.
- [ ] **Menus Desktop & Mobile:** Abrir menus M3 (`Tipos`, `Temporadas`, `Categorias`) em `>= 768px` e selects nativos + botões circulares de ação em `<= 767px`.
- [ ] **Busca e Persistência:** Digitar rapidamente na barra de busca e imediatamente recarregar a página (`F5` / `Ctrl+R`) para confirmar que `fn_state_search` e filtros/coleção permanecem salvos no reload.
- [ ] **Exportação e Clipboard:** Testar exportação PNG (desktop download e, se possível, iOS/nova aba), `Lista de trocas (texto)`, `Grade de trocas (texto)` (inclusive em iOS/Safari para confirmar preservação do *user gesture*), backup JSON e compartilhamento por URL `?c=`.
- [ ] **Teclado e Gamepad:** Navegar com setas, `Enter` e `D`; conectar e desconectar um controle verificando o HUD inferior direito e os atalhos.
- [ ] **DevTools Performance (Idle):** Gravar 5 segundos na aba *Performance* sem controle conectado e sem interagir na página — confirmar que **não há** callbacks contínuos de `requestAnimationFrame` rodando em repouso.

