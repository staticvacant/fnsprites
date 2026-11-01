A Fortnite Sprites Tracker / Rastreamento de pituchinho/elementais para o Fortnite

![Elemental sprites](https://github.com/joaopedro-chaves/fnpituchinhubr/blob/main/siteimages/staticsprite.webp)

> Modificação do projeto [fnsprites](https://github.com/staticvacant/fnsprites) para português e organização do layout (material design).

> Criado originalmente por [staticvacant](https://github.com/staticvacant)

> Aqui está o site do repositório:
https://joaopedro-chaves.github.io/fnpituchinhubr/

## Migração para React e TypeScript

O projeto está em processo de migração para React e TypeScript. O motivo é a necessidade de uma melhor organização do código e a adição de novas funcionalidades que o framework oferece.

## Arquivamento do projeto

Devido ao encerramento da funcionalidade de elementais por parte da Epic Games, este repositório irá ficar arquivado em 01.01.2027 e não será mais atualizado.

Caso contrário, o projeto será atualizado.

## Otimizações e Design

O design foi otimizado para uma experiência mais agradável e moderna, com um layout mais limpo e organizado. Foram utilizadas as diretrizes do Material Design para criar uma interface intuitiva e responsiva, que funciona bem em diferentes dispositivos.

O site foi traduzido para português do Brasil e a organização dos elementos foi feita de forma mais lógica e agradável. Ainda falta a implementação da funcionalidade i18n (internacionalização) para que o site possa ser traduzido para outros idiomas, (30.09.2026 - isso estar sendo testado internamente).

Houve tambem uma refatorização do script javascript ao qual o projeto utiliza, para que o mesmo ficasse mais organizado e legível, além de adicionar novas funcionalidades no futuro.

Webp otimização de imagens, foi uma das mudanças que mais fez diferença no projeto, pois reduziu o tamanho das imagens em mais de 50%, fazendo com que o site carregasse mais rápido. Mais as otimização, conseguiram atingir a pontuação de 95 no google lighthouse, no quesito performance (Teste realizado em 30.09.2026 as 11:42).

## Direitos Autorais

Este projeto utiliza imagens dos jogos Fortnite, os quais são de propriedade da Epic Games, todos os direitos autorais pertencem à Epic Games. Este projeto não tem fins lucrativos e não é afiliado à Epic Games.

## Contribuindo

Este projeto é opensource e qualquer pessoa pode contribuir com ele. Claro, dando o devido crédito aos criadores. 

## Usando o script para converter imagens PNG para WebP

### 1. Modo Interativo (Menu no terminal)
Basta executar o script sem argumentos:

```bash
./convert_webp.sh
```

A pasta ou arquivo de entrada (padrão é a pasta atual).
A escala desejada:
1) 1x (Tamanho original)
2) 2x (Dobro do tamanho)
3) 4x (4 vezes o tamanho)
4) 0.5x (Metade do tamanho)
5) 0.25x (1/4 do tamanho)
A qualidade WebP (padrão: 85).

### 2. Modo Linha de Comando (Rápido e automatizado)

Converter imagens em 2x:
```bash
./convert_webp.sh -i ./minhas-imagens -s 2
```
Converter imagens em 4x:
```bash
./convert_webp.sh -i ./minhas-imagens -s 4
```
Converter uma única imagem definindo pasta de saída e qualidade:
```bash
./convert_webp.sh -i sprite.png -o ./sprites/ -s 2 -q 90
```
Ver todas as opções disponíveis:
```bash
./convert_webp.sh --help
```