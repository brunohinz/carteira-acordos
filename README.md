# Carteira de Acordos

Projeto front-end para controle de acordos financeiros, criado em HTML, CSS e JavaScript puro. O repositorio agora tem duas experiencias:

- `index.html`: versao demonstrativa para portfolio e GitHub Pages, com dados ficticios e interacoes salvas no navegador.
- `inicio.html`: versao operacional local, com importacao/exportacao de JSON e uso com arquivo de dados.

## Demo de portfolio

A versao `index.html` foi pensada para mostrar o projeto de forma mais completa em um portfolio:

- indicadores de valor gerado no mes, valor pago, valor em aberto, atrasados e progresso da meta;
- contratos ficticios carregados automaticamente;
- cadastro de novos acordos demo;
- busca por contrato ou cliente;
- filtro por status;
- ordenacao por vencimento ou data de geracao;
- marcacao de acordos como pagos, reabertura e remocao;
- restauracao da base ficticia;
- layout responsivo para desktop e celular.

## Versao local

A versao `inicio.html` continua focada no uso do dia a dia:

- cadastro de contrato, vencimento e valor;
- meta mensal;
- soma de acordos pagos;
- soma de acordos gerados hoje e no mes;
- lista de acordos com ordenacao escolhida pelo usuario;
- armazenamento no navegador;
- importacao e exportacao de JSON;
- opcao de conectar um arquivo JSON quando o navegador permitir.

## Como executar

Para ver a demo de portfolio, abra:

```text
index.html
```

Para usar a versao local operacional, abra:

```text
inicio.html
```

Tambem e possivel iniciar o servidor local:

```text
node servidor-local.js
```

Depois acesse `http://127.0.0.1:4173/inicio.html`.

## Publicacao no GitHub Pages

Como a demo principal esta em `index.html`, o projeto pode ser publicado diretamente pelo GitHub Pages:

1. Envie os arquivos para um repositorio no GitHub.
2. Abra as configuracoes do repositorio.
3. Ative GitHub Pages usando a branch principal.
4. A pagina inicial exibira a versao de portfolio.

## Tecnologias

- HTML sem dependencias externas.
- CSS responsivo com Grid e Flexbox.
- JavaScript puro para estado, filtros, ordenacao, calculos e persistencia local.
- Dados ficticios na demo e armazenamento via `localStorage`.

## Observacao

Os dados exibidos na versao de portfolio sao ficticios e existem apenas para demonstrar o funcionamento da interface.
