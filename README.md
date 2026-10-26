# Carteira de Acordos

[![CI](https://github.com/brunohinz/carteira-acordos/actions/workflows/ci.yml/badge.svg)](https://github.com/brunohinz/carteira-acordos/actions/workflows/ci.yml)

🇬🇧 [English version](README.en.md)

![Tela principal do dashboard](assets/dashboard.png)

Dashboard front-end para acompanhamento de acordos financeiros, criado como projeto de portfolio com HTML, CSS e JavaScript puro.

## Funcionalidades

- Indicadores de valor gerado no mês, valor pago, valor em aberto e atrasos.
- Meta mensal configurável (botão "Alterar meta"), calculada só com os acordos pagos no mês corrente.
- Base inicial com acordos demonstrativos.
- Cadastro de novos acordos, com prévia do valor formatado e validação de vencimento.
- Edição de valor e vencimento de um acordo existente.
- Busca por contrato ou cliente, sem diferenciar acentos e maiúsculas (Esc limpa a busca).
- Filtro por status: todos, em aberto, pagos, atrasados, vence hoje e próximos 7 dias.
- Ordenação por vencimento ou por data de geração.
- Marcação de acordos como pagos, reabertura e remoção com opção de desfazer.
- Exportação da lista atual em CSV (respeita busca e filtros, abre direto no Excel em pt-BR).
- Backup completo em JSON e importação de um backup (valida os dados e ignora contratos duplicados).
- Restauração da base demonstrativa.
- Persistência local com `localStorage` (acordos, filtros, busca e meta).
- Layout responsivo para desktop e celular.

## Capturas de tela

| Novo acordo | Filtro "Atrasados" + busca |
|---|---|
| ![Formulário de novo acordo](assets/new-agreement.png) | ![Filtro e busca](assets/filters.png) |

| Alterar meta | Desfazer exclusão |
|---|---|
| ![Alterar meta](assets/goal.png) | ![Desfazer exclusão](assets/undo-delete.png) |

Versão mobile (cerca de 390 px):

<img src="assets/mobile.png" alt="Layout mobile" width="260">

## O que este projeto demonstra

- Manipulação de DOM com JavaScript puro.
- Controle de estado da aplicação no front-end.
- Filtros, busca e ordenação de registros.
- Cálculo e atualização de indicadores financeiros.
- Persistência de dados no navegador com localStorage.
- Layout responsivo com CSS Grid e Flexbox.
- Testes automatizados das regras de moeda, datas, filtros, backup e armazenamento com `node --test` e CI no GitHub Actions.
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
utils.js                   Funções puras: moeda, datas, filtros, CSV, backup e armazenamento
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
