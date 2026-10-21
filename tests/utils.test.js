const test = require("node:test");
const assert = require("node:assert/strict");
const {
    parseCurrency,
    normalizeCurrencyValue,
    formatCurrency,
    formatCurrencyInput,
    normalizeSearchText,
    pluralize,
    isValidDueDate,
    escapeHtml,
    formatInputDate,
    addDays
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
