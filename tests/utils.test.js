const test = require("node:test");
const assert = require("node:assert/strict");
const {
    parseCurrency,
    normalizeCurrencyValue,
    formatCurrency,
    formatCurrencyInput,
    normalizeSearchText,
    normalizeContractKey,
    pluralize,
    isValidDueDate,
    escapeHtml,
    formatInputDate,
    addDays,
    normalizeOptionalDateTime,
    getDueDateTime,
    getDueDiffDays,
    isOverdue,
    matchesSearchTerm,
    matchesStatus
} = require("../utils.js");

test("parseCurrency entende formatos brasileiros e internacionais", () => {
    assert.equal(parseCurrency("1.234,56"), 1234.56);
    assert.equal(parseCurrency("R$ 8.420,50"), 8420.5);
    assert.equal(parseCurrency("1234.5"), 1234.5);
    assert.equal(parseCurrency("1.234"), 1234);
    assert.equal(parseCurrency(""), 0);
    assert.equal(parseCurrency("abc"), 0);
    assert.equal(parseCurrency(12.345), 12.35);
});

test("normalizeCurrencyValue zera valores invalidos ou negativos", () => {
    assert.equal(normalizeCurrencyValue(-5), 0);
    assert.equal(normalizeCurrencyValue(Number.NaN), 0);
    assert.equal(normalizeCurrencyValue("10.005"), 10.01);
});

test("formatCurrency e formatCurrencyInput usam o padrao pt-BR", () => {
    assert.equal(formatCurrency(1234.5).replace(/\s/g, " "), "R$ 1.234,50");
    assert.equal(formatCurrencyInput(1234.5), "1.234,50");
    assert.equal(formatCurrencyInput(0), "");
});

test("normalizeSearchText remove acentos e caixa", () => {
    assert.equal(normalizeSearchText("Colégio São Lucas"), "colegio sao lucas");
});

test("pluralize escolhe singular ou plural", () => {
    assert.equal(pluralize(1, "dia", "dias"), "1 dia");
    assert.equal(pluralize(0, "dia", "dias"), "0 dias");
    assert.equal(pluralize(3, "dia", "dias"), "3 dias");
});

test("isValidDueDate rejeita datas impossiveis e anos absurdos", () => {
    assert.equal(isValidDueDate("2026-10-21"), true);
    assert.equal(isValidDueDate("2026-02-30"), false);
    assert.equal(isValidDueDate("1899-01-01"), false);
    assert.equal(isValidDueDate("20260-01-01"), false);
    assert.equal(isValidDueDate(""), false);
});

test("escapeHtml neutraliza caracteres especiais", () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#039;&amp;&#039;&lt;/a&gt;");
});

test("addDays e formatInputDate geram datas no formato do input", () => {
    assert.equal(formatInputDate(addDays(new Date(2026, 0, 31), 1)), "2026-02-01");
    assert.equal(formatInputDate(addDays(new Date(2026, 2, 1), -1)), "2026-02-28");
});

test("normalizeOptionalDateTime aceita datas validas e descarta lixo", () => {
    assert.equal(normalizeOptionalDateTime("2026-10-20T12:00:00.000Z"), "2026-10-20T12:00:00.000Z");
    assert.equal(normalizeOptionalDateTime("data-invalida"), null);
    assert.equal(normalizeOptionalDateTime(""), null);
    assert.equal(normalizeOptionalDateTime(null), null);
    assert.equal(normalizeOptionalDateTime(undefined), null);
});

test("normalizeContractKey ignora espacos, acentos e caixa", () => {
    assert.equal(normalizeContractKey("CT-2026-001"), normalizeContractKey(" ct - 2026 - 001 "));
    assert.equal(normalizeContractKey("Ação 01"), "acao01");
    assert.notEqual(normalizeContractKey("CT-001"), normalizeContractKey("CT-002"));
});

test("getDueDiffDays conta dias ate o vencimento a partir de uma data fixa", () => {
    const today = new Date(2026, 9, 23, 15, 30);
    assert.equal(getDueDiffDays({ vencimento: "2026-10-23" }, today), 0);
    assert.equal(getDueDiffDays({ vencimento: "2026-10-30" }, today), 7);
    assert.equal(getDueDiffDays({ vencimento: "2026-10-20" }, today), -3);
});

test("isOverdue so considera atrasado o acordo vencido e nao pago", () => {
    const today = new Date(2026, 9, 23);
    assert.equal(isOverdue({ vencimento: "2026-10-22", pago: false }, today), true);
    assert.equal(isOverdue({ vencimento: "2026-10-22", pago: true }, today), false);
    assert.equal(isOverdue({ vencimento: "2026-10-23", pago: false }, today), false);
});

test("getDueDateTime joga vencimentos invalidos para o fim da fila", () => {
    assert.equal(getDueDateTime({ vencimento: "invalido" }), Number.MAX_SAFE_INTEGER);
});

test("matchesSearchTerm busca por contrato ou cliente sem acento e caixa", () => {
    const agreement = { numero: "CT-2026-007", cliente: "Colégio São Lucas" };
    assert.equal(matchesSearchTerm(agreement, ""), true);
    assert.equal(matchesSearchTerm(agreement, "sao lucas"), true);
    assert.equal(matchesSearchTerm(agreement, "ct-2026-007"), true);
    assert.equal(matchesSearchTerm(agreement, "Unidade Sul"), false);
});

test("matchesStatus aplica os filtros todos, em aberto, pagos e atrasados", () => {
    const today = new Date(2026, 9, 23);
    const paid = { vencimento: "2026-10-01", pago: true };
    const late = { vencimento: "2026-10-01", pago: false };
    const open = { vencimento: "2026-11-01", pago: false };
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "all", today)), [true, true, true]);
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "paid", today)), [true, false, false]);
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "open", today)), [false, true, true]);
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "overdue", today)), [false, true, false]);
});
