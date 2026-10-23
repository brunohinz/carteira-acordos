# Carteira de Acordos

[![CI](https://github.com/brunohinz/carteira-acordos/actions/workflows/ci.yml/badge.svg)](https://github.com/brunohinz/carteira-acordos/actions/workflows/ci.yml)

![Tela principal do dashboard](assets/dashboard.png)

Dashboard front-end para acompanhamento de acordos financeiros, criado como projeto de portfolio com HTML, CSS e JavaScript puro.

## Funcionalidades

- Indicadores de valor gerado no mês, valor pago, valor em aberto, atrasos e progresso de meta.
- Base inicial com acordos demonstrativos.
- Cadastro de novos acordos.
- Busca por contrato ou cliente.
- Filtro por status: todos, em aberto, pagos e atrasados.
- Ordenação por vencimento ou por data de geração.
- Marcação de acordos como pagos, reabertura e remoção.
- Restauração da base demonstrativa.
- Persistência local com `localStorage`.
- Layout responsivo para desktop e celular.

## O que este projeto demonstra

- Manipulação de DOM com JavaScript puro.
- Controle de estado da aplicação no front-end.
- Filtros, busca e ordenação de registros.
- Cálculo e atualização de indicadores financeiros.
- Persistência de dados no navegador com localStorage.
- Layout responsivo com CSS Grid e Flexbox.
- Testes automatizados das regras de moeda e datas com `node --test` e CI no GitHub Actions.
- Organização de uma interface administrativa em formato de dashboard.

## Tecnologias

- HTML sem frameworks.
- CSS responsivo com Grid e Flexbox.
- JavaScript puro para estado, renderização, filtros, ordenação e cálculos financeiros.
- `localStorage` para manter as interações da demo no navegador.

## Como visualizar

Acesse a demo online:

https://brunohinz.github.io/carteira-acordos/

Ou abra o arquivo `index.html` localmente no navegador.

## Estrutura

```text
index.html                 Estrutura da aplicação
favicon.svg                Ícone da aba do navegador
style.css                  Estilos e responsividade
script.js                  Estado, renderização e interações (DOM)
utils.js                   Funções puras: moeda, datas, busca e textos
tests/utils.test.js        Testes das funções puras
.github/workflows/ci.yml   Check e testes automáticos a cada push
```

## Como rodar os testes

Requer Node.js 18 ou superior (sem dependências externas):

```bash
npm test        # roda os testes com node --test
npm run check   # verifica a sintaxe de utils.js e script.js
```

## Observação

Os dados exibidos são fictícios e servem apenas para demonstrar a interface e o fluxo de uso.
