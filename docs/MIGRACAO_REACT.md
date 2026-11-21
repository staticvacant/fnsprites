# Documentação da Migração: Vanilla JS para React + Vite

Este documento registra as mudanças arquiteturais, organização de pastas e comparativos de código ("Antes vs. Depois") da migração inicial do **Rastreador de Pituchinhus (`fnpituchinhubr`)** para **React com Vite** (posteriormente consolidada na branch `main` e estendida com PWA, testes de UI, tipagem `strictNullChecks` e consolidação de tokens).

---

## 1. Visão Geral e Estrutura de Pastas

A aplicação anteriormente baseada em manipulação imperativa do DOM (`document.createElement`, `innerHTML`, `classList.toggle`) foi reestruturada para o paradigma **declarativo e baseado em componentes** do React.

```text
fnpituchinhubr/
├── index.html                  # Entrada única: <div id="root"></div> + /src/main.jsx
├── public/
│   ├── favicon.webp            # Ícone do site
│   ├── pwa-192x192.png         # Ícone do manifesto PWA (192x192)
│   └── pwa-512x512.png         # Ícone do manifesto PWA (512x512)
├── package.json                # Scripts: dev, build, preview, lint, typecheck, test, assets:offline
├── tsconfig.json               # Configuração checkJs (--noEmit, strictNullChecks) para JS/JSX
├── vite.config.js              # Vite 8 + React + preload Roboto + split react-vendor + VitePWA + Vitest
├── eslint.config.js            # ESLint 9 (flat config) com regras de React e Hooks
├── styles.css                  # Folha de estilos global + variáveis CSS por card
├── sprites/                    # Imagens .webp dos pituchinhus (otimizadas em 256x256)
├── scripts/
│   ├── convert_webp.sh         # Conversão em lote PNG -> WebP (ffmpeg / cwebp / Pillow)
│   ├── compress_webp.sh        # Compressão de imagens para WebP
│   ├── download-offline-assets.js # Sync de fontes Roboto locais e auditoria de origem/dist offline
│   ├── release-sprites.js      # Automação de lançamento e selo isNew em src/data/sprites-data.js
│   └── offline-assets.test.js  # Testes de release-sprites.js e download-offline-assets.js
├── .github/workflows/
│   ├── main.yml                # CI/CD: lint + testes + build + auditoria offline + deploy GitHub Pages (main)
│   └── release-sprites.yml     # Automação agendada/manual de sprites e assets offline com abertura de PR
└── src/
    ├── main.jsx                # Bootstrap do React (createRoot) + fonte Roboto local
    ├── App.jsx                 # Raiz da aplicação (<CatalogPage />)
    ├── global.d.ts             # Declarações globais de tipos (Vite e gancho de teste)
    ├── pages/
    │   └── CatalogPage.jsx     # Página do catálogo: estado, filtros, grade, modais e exportações
    ├── components/
    │   ├── Header.jsx          # Cabeçalho e barras de progresso reativas
    │   ├── FilterBar.jsx       # Busca, filtros responsivos (Desktop M3 / Mobile select, incl. "Novos") e ações
    │   ├── M3FilterMenu.jsx    # Dropdown estilo Material Design 3 para filtros desktop
    │   ├── ToolbarIcons.jsx    # Ícones SVG da barra de ferramentas
    │   ├── SpriteCard.jsx      # Cartão reutilizável de pituchinhu (selos NOVO/Coletado/Dominado + fallback)
    │   ├── ModalDialog.jsx     # Invólucro acessível baseado em <dialog> nativo
    │   ├── ExportModal.jsx     # Modal de exportação/backup/compartilhamento (lazy)
    │   ├── BatchModal.jsx      # Modal de ações em lote por filtro, temporada ou família (lazy)
    │   ├── SettingsModal.jsx   # Modal de configurações (lazy)
    │   └── ControllerHud.jsx   # Guia de controles para navegação por gamepad
    ├── hooks/
    │   ├── useTrackerState.js          # Estado, persistência incremental, filtros e isolamento em viewMode
    │   ├── useGamepadAndSpatialNav.js  # Navegação espacial e suporte a gamepad
    │   └── useMediaQuery.js            # Assinatura responsiva de media query via useSyncExternalStore
    ├── assets/
    │   ├── fonts/
    │   │   ├── roboto.css              # @font-face auto-hospedado da fonte variável Roboto (latin)
    │   │   └── roboto-latin.woff2      # Binário WOFF2 local pré-cacheado pelo Service Worker
    │   └── spriteImages.js             # Mapeamento de imagens .webp com import.meta.glob
    ├── data/
    │   └── sprites-data.js     # `export const baseSprites`
    ├── taxonomy.js             # FONTE ÚNICA de temas, raridades, rótulos e cores (UI e Canvas)
    ├── query.js                # Funções puras de filtro, ordenação, lote, temporadas e validação
    ├── share-order.js          # Chaves de localStorage, layout de exportação e filtros
    ├── share-codec.js          # Links compartilháveis (?c=...) v1 e v2 (lazy-loaded)
    ├── share-legacy-order.js   # Ordem congelada do formato v1 (não editar)
    ├── view-export.js          # Imagens em Canvas 2D (reexporta texto e paleta)
    ├── export-palette.js       # Paletas MD3 da exportação Canvas (tokens CSS + fallback)
    ├── export-text.js          # Geração de texto simples e grade de trocas
    ├── dom-utils.js            # Toasts empilháveis, área de transferência e Canvas
    ├── query.test.js                   # Testes de query, ações em lote, taxonomia e dados
    ├── share-codec.test.js             # Testes do codec de compartilhamento
    ├── view-export.test.js             # Testes de exportação Canvas e textos de troca
    ├── useTrackerState.test.js         # Testes de persistência, debounce e tema no hook
    ├── useGamepadAndSpatialNav.test.js # Testes de gamepad e navegação espacial
    ├── modals-backup-share.test.js     # Testes de modais, backup JSON, fluxo ?c= e lote
    └── render-count.test.js            # Testes de lotes, filtros responsivos, fallback e a11y
```

---

## 2. Como Executar o Projeto (Setup Vite)

No terminal, certifique-se de estar na branch `main` e possuir o Node.js e `npm` instalados:

```bash
# 1. Instalar as dependências do React e Vite
npm install

# 2. Iniciar o servidor de desenvolvimento com Hot Module Replacement (HMR)
npm run dev

# 3. Gerar o pacote otimizado de produção na pasta dist/
npm run build

# 4. Testar localmente o build de produção
npm run preview

# 5. Verificar qualidade do código (ESLint + tsc --noEmit) e testes
npm run lint
npm run typecheck
npm test
```

---

## 3. Comparativo Didático: Antes (Vanilla JS) vs. Depois (React)

### 3.1. Renderização de Cartões (`SpriteCard.jsx`)

#### Antes — Vanilla JS (`src/view-grid.js`)
No modelo imperativo, cada cartão era construído concatenando strings HTML (`buildCardHTML`), criando nós manualmente (`document.createElement('div')`) e atualizando classes manualmente (`updateCardDOM`):

```javascript
// src/view-grid.js (Legado)
const card = document.createElement('div');
card.dataset.id = sprite.id;
card.className = ['card', `rarity-${sprite.rarity}`, themeClass].join(' ');
card.innerHTML = buildCardHTML(sprite, obtained, mastered, state.viewMode);
frag.appendChild(card);

// Para atualizar um único card sem recriar tudo, era necessário sincronizar o DOM na mão:
export function updateCardDOM(cardEl, spriteName, isObtainedState, isMasteredState) {
    cardEl.classList.toggle('obtained', isObtainedState);
    cardEl.classList.toggle('mastered', isMasteredState);
    cardEl.setAttribute('aria-pressed', String(isObtainedState));
}
```

#### Depois — React (`src/components/SpriteCard.jsx`)
No React, o componente é uma função pura que recebe propriedades (`props`) e retorna JSX. O próprio React calcula a diferença (*diffing*) no Virtual DOM e atualiza apenas os atributos ou elementos filhos que mudaram:

```jsx
// src/components/SpriteCard.jsx
export function SpriteCard({ sprite, obtained, mastered, viewMode, onToggleObtained, onToggleMastery }) {
    const classes = ['card', `rarity-${sprite.rarity}`, `theme-${sprite.theme.replace(/\s+/g, '-')}`];
    if (obtained) classes.push('obtained');
    if (mastered) classes.push('mastered');

    return (
        <div
            className={classes.join(' ')}
            role={!viewMode ? 'button' : undefined}
            aria-pressed={!viewMode ? String(obtained) : undefined}
            onClick={() => !viewMode && onToggleObtained(sprite.id)}
        >
            {sprite.unreleased ? (
                <div className="card-badge unreleased-badge">Não lançado</div>
            ) : mastered ? (
                <div className="card-badge mastered-badge">Dominado</div>
            ) : obtained ? (
                <div className="card-badge collected">Coletado</div>
            ) : null}
            {/* ... */}
        </div>
    );
}
```

**Por que a mudança?**
- **Segurança automática:** O JSX escapa valores dinâmicos automaticamente, tornando desnecessário o uso manual de `escapeHTML()`.
- **Fim da duplicação de lógica:** Não precisamos mais manter duas lógicas separadas (`buildCardHTML` para criar + `updateCardDOM` para atualizar).
- **Eventos encapsulados:** O clique no card (`onToggleObtained`) e o clique na coroa (`e.stopPropagation()` + `onToggleMastery`) ficam declarados diretamente nos elementos correspondentes.

---

### 3.2. Barra de Filtros e Controles (`FilterBar.jsx`)

#### Antes — Vanilla JS (`src/main.js` e `src/view-grid.js`)
Era necessário buscar referências de cada `<input>` e `<select>` via `document.getElementById`, popular `<option>` manualmente com `replaceChildren` e manter a função `applyStateToDOM()` para atualizar classes `.active` nas pílulas:

```javascript
// src/main.js (Legado)
export function applyStateToDOM() {
    if (dom.searchInput) dom.searchInput.value = state.filters.search;
    if (dom.themeFilter) dom.themeFilter.value = state.filters.theme;
    dom.statusPills.querySelectorAll('.pill').forEach(pill => {
        const match = pill.dataset.status === state.filters.status;
        pill.classList.toggle('active', match);
    });
}
```

#### Depois — React (`src/components/FilterBar.jsx`)
Utilizamos **Controlled Components** (Componentes Controlados), onde o valor exibido no input (`value`) e o estado ativo das pílulas derivam diretamente do objeto `filters`:

```jsx
// src/components/FilterBar.jsx
<input
    type="search"
    id="searchInput"
    className="input"
    placeholder="Buscar…"
    value={filters.search}
    onChange={e => onFilterChange('search', e.target.value)}
/>

<select
    id="themeFilter"
    className="select"
    value={filters.theme}
    onChange={e => onFilterChange('theme', e.target.value)}
>
    <option value="all">Todos</option>
    {activeThemes.map(theme => (
        <option key={theme} value={theme}>
            {getUiThemeLabel(theme)}
        </option>
    ))}
</select>
```

**Por que a mudança?**
- **Fonte única da verdade (*Single Source of Truth*):** A interface nunca fica dessincronizada em relação ao estado salvo no `localStorage`.
- **Ciclo de vida limpo para Dropdowns:** Os menus de *Exportar* e *Configurações* agora são controlados pelo estado local `const [openDropdown, setOpenDropdown] = useState(null)` em vez de manipular classes DOM diretamente.

---

### 3.3. Gestão de Estado com `useState` e `useMemo` (`useTrackerState.js`)

#### Antes — Vanilla JS (`src/main.js`)
O estado ficava em um objeto global mutável (`export const state = { ... }`). Qualquer mutação exigia lembrar de chamar `saveCollection()` e `renderGrid(dom, state, sprites)` manualmente:

```javascript
// src/main.js (Legado)
export function toggleObtained(id, sprites) {
    if (isObtained(state, id)) {
        state.obtained = state.obtained.filter(x => x !== id);
        state.mastered = state.mastered.filter(x => x !== id);
    } else {
        state.obtained.push(id); // Mutação direta do array
    }
    saveCollection();
    renderGrid(dom, state, sprites); // Apaga e recria todo o HTML da grade
}
```

#### Depois — React (`src/hooks/useTrackerState.js`)
Substituímos a mutação direta por atualizações imutáveis com `useState` e cálculos memorizados com `useMemo`:

```javascript
// src/hooks/useTrackerState.js
const [obtained, setObtained] = useState(initialCollection.obtained);
const [mastered, setMastered] = useState(initialCollection.mastered);
const [filters, setFilters] = useState(() => getInitialFilters(sprites));

// Recalcula a lista visível APENAS quando filtros, ordenação ou coleção mudam
const visibleSprites = useMemo(() => {
    const filtered = filterSprites(sprites, trackerState);
    return sortSprites(filtered, settings.sortOrder);
}, [sprites, trackerState, settings.sortOrder]);

// Recalcula as barras de progresso automaticamente
const progressStats = useMemo(() => {
    const released = getReleasedSprites(sprites, filters.season);
    return getCollectionCounts(released, trackerState);
}, [sprites, filters.season, trackerState]);
```

**Por que a mudança?**
- **`useState`:** Garante que toda alteração na coleção ou nos filtros dispare automaticamente a atualização visual dos componentes dependentes (como o `Header` de progresso e a grade de `SpriteCard`), sem precisarmos chamar `updateProgress()` ou `renderGrid()`.
- **`useMemo`:** Evita reexecutar a filtragem e a ordenação caso o componente sofra re-renderizações que não afetem a lista de sprites, mantendo alta performance mesmo com centenas de cartões.

---

### 3.4. Tratamento de Imagens Estáticas no Vite (`src/assets/spriteImages.js`)

#### Antes — Vanilla JS (`src/view-grid.js`)
O caminho era montado como string relativa fixa:
```javascript
const imgPath = `sprites/${encodeURIComponent(sprite.id)}.webp`;
```
Em um bundler moderno como o Vite, referenciar strings dinâmicas soltas pode impedir que o empacotador inclua os arquivos na pasta `dist/` ou adicione hashes de cache em produção.

#### Depois — Vite `import.meta.glob` (`src/assets/spriteImages.js`)
Utilizamos a funcionalidade nativa `import.meta.glob` do Vite para mapear estaticamente todos os arquivos `.webp` da pasta `/sprites/` e `/siteimages/` em tempo de compilação:

```javascript
// src/assets/spriteImages.js
const spriteModules =
    typeof import.meta.glob === 'function'
        ? import.meta.glob('/sprites/*.webp', { eager: true, import: 'default' })
        : {};

export function getSpriteImageUrl(spriteId) {
    if (!spriteId) return '';
    const key = `/sprites/${spriteId}.webp`;
    return spriteModules[key] || `sprites/${encodeURIComponent(spriteId)}.webp`;
}
```

**Por que a mudança?**
- Garante que todas as imagens `.webp` sejam reconhecidas pelo grafo de dependências do Vite durante o `vite build`, funcionando perfeitamente tanto nos cartões `<SpriteCard />` quanto na exportação em `<canvas>` (`src/view-export.js`).

---

## 4. Refinamentos Pós-Migração

Depois da migração inicial, uma análise do projeto apontou 8 pontos de melhoria. Todos foram aplicados e estão registrados abaixo.

| # | Problema | Solução | Onde |
|---|---|---|---|
| 1 | ~1.000 linhas de código morto do Vanilla JS | Arquivos removidos | `main.js`, `view-grid.js`, `app.js`, `codes-app.js` |
| 2 | Efeitos colaterais dentro de atualizadores de estado | Atualizadores puros + persistência em `useEffect` | `useTrackerState.js` |
| 3 | 279 imagens com `loading="eager"` e `fetchPriority="high"` | Prioridade só para os primeiros 24 cards | `SpriteCard.jsx`, `CatalogPage.jsx` |
| 4 | Coleção local "piscava" antes da compartilhada | Modo somente leitura já nasce vazio quando há `?c=` | `useTrackerState.js` |
| 5 | Temas e raridades duplicados em 3 arquivos | `taxonomy.js` como fonte única | `taxonomy.js`, `share-order.js`, `query.js`, `view-export.js` |
| 6 | Sprite placeholder com campos vazios | Componente tolerante + validação de dados em teste | `SpriteCard.jsx`, `getSpriteDataIssues` |
| 7 | Navegação improvisada com `#codes` e `pathname` | `react-router-dom` com `HashRouter` | `App.jsx`, `public/codes.html` |
| 8 | Sem ESLint, testes, CI ou README atualizado | ESLint 9, Vitest, workflow de CI e README | `eslint.config.js`, `*.test.js`, `ci.yml` |

### 4.1. Código morto removido

O app React não importa mais nenhum destes arquivos, então foram apagados. Além deles, saíram os helpers de DOM que só serviam ao Vanilla JS (`escapeHTML`, `setDropdownOpen`, `closeDropdowns`) e o fallback global `typeof baseSprites !== 'undefined'` dos parâmetros padrão.

**Por que:** código que ninguém chama confunde quem está estudando o projeto ("qual destes arquivos manda?") e faz o ESLint e a revisão perderem tempo.

### 4.2. Atualizadores puros e persistência em `useEffect`

#### Antes
```javascript
setObtained(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    persistValue(KEYS.obtained, next);              // efeito colateral dentro do atualizador
    if (prev.includes(id)) setMastered(/* ... */);  // setState dentro de setState
    return next;
});
```

#### Depois
```javascript
// obtained e mastered no MESMO estado: a atualização é atômica
setCollection(prev =>
    prev.obtained.includes(id)
        ? { obtained: prev.obtained.filter(x => x !== id),
            mastered: prev.mastered.filter(x => x !== id) }
        : { ...prev, obtained: [...prev.obtained, id] }
);

// A gravação acontece em um efeito, depois da renderização
useEffect(() => {
    if (viewMode) return;   // nunca sobrescreve a coleção local ao ver um link
    persistValue(KEYS.obtained, collection.obtained);
    persistValue(KEYS.mastered, collection.mastered);
}, [collection, viewMode]);
```

**Por que:** o React pode executar a função passada a `setState` mais de uma vez (o `StrictMode` faz isso de propósito em desenvolvimento). Por isso ela precisa ser **pura**: só calcula o próximo estado. Gravar no `localStorage` é um efeito colateral e pertence ao `useEffect`. Juntar `obtained` e `mastered` em um só estado também elimina o `setState` aninhado.

### 4.3. Carregamento de imagens

```jsx
// SpriteCard.jsx
<img
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : 'auto'}
    /* ... */
/>

// CatalogPage.jsx — só os 24 primeiros cards (acima da dobra) têm prioridade
<SpriteCard priority={index < PRIORITY_CARDS} /* ... */ />
```

**Por que:** pedir prioridade alta para todas as imagens do catálogo (na ocasião 279; hoje 338 sprites) equivale a não priorizar nenhuma. Agora o navegador carrega primeiro o que o usuário vê e adia o resto *(na `main` atual, ajustado para `EAGER_CARDS = 8` com `loading="eager"` e `PRIORITY_CARDS = 2` com `fetchPriority="high"`)*.

### 4.4. Coleção compartilhada sem "piscar"

#### Antes
O estado nascia com a coleção salva localmente e, só depois que a decodificação assíncrona do `?c=` terminava, era trocado pela coleção compartilhada. Por um instante o usuário via os próprios dados dentro do link de outra pessoa.

#### Depois
```javascript
const [initial] = useState(() => {
    const shareCode = getShareCode();
    return {
        shareCode,
        collection: shareCode ? EMPTY_COLLECTION : getStoredCollection(sprites),
    };
});
const [viewMode, setViewMode] = useState(Boolean(initial.shareCode));
const [loadingShared, setLoadingShared] = useState(Boolean(initial.shareCode));
```

**Por que:** a decisão "estou em modo compartilhado?" é tomada de forma síncrona, na primeira renderização. A grade expõe `aria-busy` enquanto a coleção é decodificada.

### 4.5. Taxonomia única (`taxonomy.js`)

#### Antes
Ordem e rótulos de tema/raridade estavam em `share-order.js` (`THEME_ORDER`, `EXPORT_THEME_LABELS`...), cores duplicadas em `taxonomy.js` e de novo em `getRarityGradient` e `getRarityTagColors` de `view-export.js`, com temas legados (`Rift`, `Trapaça`, `Hacker`) e tabelas em inglês que os dados nunca usam.

#### Depois
```javascript
// taxonomy.js — o único lugar a editar para criar um tema novo
export const THEME = {
    'Básico': { order: 0, gradient: [...], exportLabel: 'NORMAL', tradeLabel: 'Base' },
    'Dourado': { order: 1, gradient: [...], exportLabel: 'DOURADO' },
    // ...
};
export const THEME_ORDER = byOrder(THEME);        // derivado
export const RARITY_ORDER = byOrder(RARITIES);    // derivado
```

`query.js` (`getExportThemeLabel`, `getTradeThemeLabel`), `SpriteCard.jsx` (`getCardStyleVars`) e `view-export.js` (`getRarityGradient`, `getRarityDisplayGradient`, `getRarityStripStyle`, `getRarityTagColors`) agora leem diretamente desse módulo.

**Por que:** com uma fonte única para temas, raridades, rótulos e tokens visuais de card (UI e Canvas 2D), adicionar um tema novo exige editar apenas `THEME` em `src/taxonomy.js`, eliminando duplicação e divergência de cores no CSS.

### 4.6. Sprites incompletos e validação de dados

- `SpriteCard` tolera `name`, `theme` e `rarity` vazios (usa o `id` como nome), então um placeholder como `chesthunter_basic` não quebra a tela se for exibido com "Não lançados" ligado.
- `getSpriteDataIssues(sprites)` em `query.js` valida os dados: ids únicos e, para sprites **lançados**, nome preenchido, tema e raridade conhecidos.
- Um teste roda essa validação nos dados reais. Se alguém lançar um sprite sem preencher os campos, o `npm test` e o CI falham antes do deploy.

### 4.7. Rotas com `react-router-dom` *(Histórico — posteriormente simplificado)*

> **Nota de atualização:** em refinamento posterior após a migração, a página `/codes`, o redirecionamento `public/codes.html` e a dependência `react-router-dom` foram removidos; hoje `src/App.jsx` renderiza `<CatalogPage />` diretamente em um App Shell PWA único. O comparativo abaixo é mantido como registro histórico da migração inicial.

#### Antes
```javascript
// App.jsx — navegação manual
const [currentPage, setCurrentPage] = useState(getInitialPage);
window.history.pushState({}, '', '#codes');
if (window.location.pathname.endsWith('/codes.html')) { /* ... */ }
```

#### Depois (na ocasião da migração inicial)
```jsx
// App.jsx
<HashRouter>
    <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/codes" element={<CodesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
</HashRouter>

// Em qualquer componente
const navigate = useNavigate();
navigate('/codes');
```

**Por que `HashRouter` foi escolhido inicialmente:** o site é estático no GitHub Pages, sem servidor para reescrever URLs.

### 4.8. Qualidade: ESLint, Vitest e CI

| Ferramenta | Comando | O que cobre |
|---|---|---|
| ESLint 9 + `react` + `react-hooks` + TypeScript (`checkJs`) | `npm run lint` | Regras React/Hooks, variáveis não usadas e `tsc --noEmit` (`strictNullChecks: true`) |
| Vitest + Testing Library | `npm test` | 8 suítes (102 testes): query/taxonomia/temporadas/Novos, codec de compartilhamento, exportação Canvas/texto, persistência/tema em `useTrackerState`, navegação por teclado/gamepad, fluxos de modais/backup/lote/`?c=`, renders/a11y/fallback e automação/auditoria offline (`scripts/offline-assets.test.js`) |
| GitHub Actions | `.github/workflows/main.yml` e `.github/workflows/release-sprites.yml` | Roda `lint`, `npm test`, `build` e `--verify --verify-dist` antes do deploy no Pages (restrito à `main`) e em atualizações automatizadas de sprites/assets offline via PR (Node 22) |

> **Nota:** o ESLint está fixado na versão 9 porque `eslint-plugin-react` ainda não declara suporte ao ESLint 10. O lint ajudou na própria refatoração: apontou os fallbacks `baseSprites` herdados do Vanilla JS e um bloco `catch` vazio.

### 4.9. Verificação

**Marco histórico da migração inicial (`react`):** `npm run lint` sem erros, `npm test` (`23/23` testes) e `npm run build` com `337` módulos.

**Estado atual (`2.2.0`):**

| Verificação | Resultado observado |
|---|---|
| `npm run lint` | ESLint e `tsc --noEmit` (`strictNullChecks: true`) sem erros nem avisos |
| `npm test` | 8 arquivos, 102 testes passando |
| `npm run build` | 382 módulos transformados (Vite 8.3.8); CSS `34.52 kB` (`7.74 kB` gzip); `index-*.js` `131.53 kB` (`33.07 kB` gzip) + `react-vendor-*.js` `218.77 kB` (`68.25 kB` gzip); PWA com precache offline completo de `354` entradas (`4095.41 KiB`) |

---

## 5. Erros Encontrados na Integração/Deploy e Soluções

Durante o merge das novidades da temporada `C7T5` e a publicação no GitHub Pages, três problemas ocorreram e foram solucionados:

### 5.1. `TypeError: Cannot read properties of undefined (reading 'indexOf')` no CI (Vitest)

* **Sintoma:** 3 testes falhando em `src/query.test.js` (`sortSprites` por raridade, `sortSprites` por tema e `getActiveThemes`) na linha `order.indexOf(value)` de `src/share-order.js`.
* **Causa:** Ao resolver o conflito de merge entre a branch `main` (que adicionou os temas `Valioso` e `Amaldiçoado`) e a branch `react` em `src/taxonomy.js`, o bloco que derivava e exportava `THEME_ORDER` e `RARITY_ORDER` foi removido acidentalmente. Como `src/share-order.js` reexportava essas constantes (`export { THEME_ORDER, RARITY_ORDER } from './taxonomy.js'`), ambas passaram a ser `undefined`.
* **Solução:** Restaurada a função `byOrder` e as exportações `THEME_ORDER` e `RARITY_ORDER` em `src/taxonomy.js`:
  ```javascript
  const byOrder = table =>
      Object.entries(table)
          .sort(([, a], [, b]) => a.order - b.order)
          .map(([name]) => name);

  export const THEME_ORDER = byOrder(THEME);
  export const RARITY_ORDER = byOrder(RARITIES);
  ```

### 5.2. `main.jsx:1 Failed to load resource: the server responded with a status of 404 ()`

* **Sintoma:** Página em branco ao abrir no GitHub Pages com erro 404 para `main.jsx`.
* **Causa:**
  1. O GitHub Pages estava configurado no modo *"Deploy from a branch"*, servindo o `index.html` bruto da raiz do repositório sem executar o build do Vite (`npm run build`). Navegadores não interpretam arquivos `.jsx` nem resolvem pacotes do `node_modules` diretamente.
  2. Além disso, `<script type="module" src="/src/main.jsx"></script>` no `index.html` bruto aponta para a raiz do domínio (`https://joaopedro-chaves.github.io/src/main.jsx`), fora do subcaminho `/fnpituchinhubr/`.
* **Solução:**
  1. Configurado o workflow `.github/workflows/main.yml` com `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` e `actions/deploy-pages@v4` para compilar o projeto (`npm run build`) e publicar a pasta `./dist` (que já usa `base: './'` no `vite.config.js`).
  2. Alterada a fonte do GitHub Pages (**Settings → Pages → Source**) para **GitHub Actions**.

### 5.3. Erro 404 em todas as imagens `.webp` (`staticsprite.webp`, `water_basic.webp`, etc.)

* **Sintoma:** Após publicar o build do React, a interface carregava normalmente, mas todas as imagens retornavam `GET https://joaopedro-chaves.github.io/fnpituchinhubr/sprites/...webp 404 (Not Found)`.
* **Causa:** Em `src/assets/spriteImages.js`, o mapeamento com `import.meta.glob` estava protegido por uma verificação de tipo em tempo de execução:
  ```javascript
  // Problemático:
  const spriteModules =
      typeof import.meta.glob === 'function'
          ? import.meta.glob('/sprites/*.webp', { eager: true, import: 'default' })
          : {};
  ```
  No Vite, `import.meta.glob(...)` não é uma função real em runtime, e sim uma **macro substituída estaticamente na compilação**. O Vite substituía a chamada `import.meta.glob(...)` pelo objeto com as URLs empacotadas (`./assets/water_basic-XXXX.webp`), mas **não** substituía `typeof import.meta.glob === 'function'`. No navegador, `typeof import.meta.glob` avaliava como `'undefined'` (`false`), descartando todo o mapa de imagens e caindo no fallback `sprites/${spriteId}.webp` (que não existe em `dist/`, pois todas as imagens foram empacotadas em `dist/assets/`).
* **Solução:** Removida a verificação `typeof import.meta.glob === 'function'` em `src/assets/spriteImages.js`, chamando `import.meta.glob` diretamente:
  ```javascript
  const spriteModules = import.meta.glob('/sprites/*.webp', { eager: true, import: 'default' });
  ```
