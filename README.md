# Rastreador de Pituchinhus (Fortnite Sprites Tracker)

![Elemental sprites](https://github.com/joaopedro-chaves/fnpituchinhubr/blob/main/public/favicon.webp)

> Adaptação do projeto [fnsprites](https://github.com/staticvacant/fnsprites) para português (pt-BR), com redesign em Material Design 3, exportação em imagem/texto e suporte offline (PWA).

> Criado originalmente por [staticvacant](https://github.com/staticvacant).

Site publicado: https://joaopedro-chaves.github.io/fnpituchinhubr/

## Visão Geral e Recursos

Aplicação web construída com **React 19**, **Vite 8** e **PWA (`vite-plugin-pwa`)**, utilizando:

- Catálogo filtrável por busca textual, tema/tipo (incluindo a categoria condicional `Novos` quando há adições recentes), temporada (`C7T3`, `C7T4`, `C7T5` e futuras), status (`Todos`, `Coletados`, `Faltando`) e ordenação (`Categorias`, `Elementais`, `Nome`, `Raridade`).
- Marcação de coleção (`Coletado`) e dominação (`Dominado`), selo `NOVO` para lançamentos recentes, ações em lote (`Em lote` + desfazer atômico), persistência em `localStorage`, backup/restauração em JSON e compartilhamento via URL compactada (`?c=...`) em modo somente leitura isolado.
- Exportação de cards em PNG (Canvas 2D) para coleção, faltantes, não dominados, dominados e lista de trocas, além de cópia em texto simples ou grade alinhada por família.
- Suporte a tema escuro/claro, modo de desempenho simples (`low-fidelity`), navegação por teclado/gamepad e modais nativos com `<dialog>`.
- Assets em formato WebP (sprites otimizados em `256x256`), fonte `Roboto` (`latin`) auto-hospedada com `preload` e pré-cache offline completo via Service Worker (sem dependências externas em runtime).

## Desenvolvimento (React + Vite)

Veja o histórico e a arquitetura da migração em [MIGRACAO_REACT.md](./docs/MIGRACAO_REACT.md).

```bash
npm install        # instala as dependências
npm run dev        # servidor de desenvolvimento com HMR
npm run build      # build de produção e Service Worker offline em dist/
npm run preview    # serve o build localmente
npm run lint       # ESLint (React/Hooks) + checagem de tipos (tsc --noEmit)
npm run typecheck  # TypeScript checkJs (--noEmit, strictNullChecks) sobre JS/JSX
npm test           # suíte de testes unitários e de componentes (Vitest)
npm run assets:offline # baixa fontes Roboto locais e audita todos os assets offline
```

## Scripts de Manutenção e Assets (`./scripts`)

### Converter imagens PNG para WebP (`./scripts/convert_webp.sh`)

Modo interativo:

```bash
./scripts/convert_webp.sh
```

Modo linha de comando:

```bash
# Converter pasta inteira em escala 2x com qualidade padrão (85)
./scripts/convert_webp.sh -i ./minhas-imagens -s 2

# Converter uma única imagem definindo pasta de saída, escala e qualidade
./scripts/convert_webp.sh -i sprite.png -o ./sprites/ -s 0.5 -q 90

# Ver todas as opções disponíveis
./scripts/convert_webp.sh --help
```

### Recomprimir imagens para WebP (`./scripts/compress_webp.sh`)

```bash
./scripts/compress_webp.sh ./sprites 75
```

### Liberar elementais e atualizar assets offline (`scripts/release-sprites.js` e `scripts/download-offline-assets.js`)

Utilizados pelo workflow [release-sprites.yml](./.github/workflows/release-sprites.yml) (agendamento periódico + disparo manual com abertura automática de Pull Request) para liberar `unreleased` e gerenciar o selo `isNew: true` ("NOVO") em `src/data/sprites-data.js`, além de garantir os assets offline no build PWA:

```bash
# Lançar todos os elementais não lançados que já possuam .webp em sprites/ (marca isNew: true automaticamente)
node scripts/release-sprites.js --mode all-unreleased --require-asset --dry-run

# Lançar IDs ou padrões específicos mantendo selos "NOVO" de lançamentos anteriores
node scripts/release-sprites.js --ids="id1,id2,prefix_*" --action=release --keep-previous-new --dry-run

# Remover selos isNew quando não houver mais adições recentes para destacar
node scripts/release-sprites.js --mode clear-new --dry-run

# Baixar/atualizar fontes locais Roboto e validar sprites/manifesto offline
node scripts/download-offline-assets.js --sync-fonts --verify
```

## Direitos Autorais

Este projeto utiliza imagens e referências de **Fortnite**, que são marcas registradas e direitos autorais da **Epic Games, Inc.** Este projeto não possui fins lucrativos e não é endossado ou afiliado à Epic Games, Inc.

## Contribuindo

Este projeto é open source e contribuições são bem-vindas, preservando os créditos originais. Antes de abrir um pull request, execute `npm run lint`, `npm test` e `npm run build`.
