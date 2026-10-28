// Smoke test de DOM: carrega index.html + scripts no jsdom e exercita os fluxos principais.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadApp() {
    const html = read("index.html").replace(/<script[^>]*><\/script>/g, "");
    const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
    const { window } = dom;
    const downloads = [];

    // jsdom nao implementa showModal/scrollIntoView nem object URLs.
    window.HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
    window.HTMLDialogElement.prototype.close = function close() { this.open = false; };
    window.HTMLElement.prototype.scrollIntoView = () => {};
    // Blob do Node tem .text(), o do jsdom nao.
    window.Blob = require("node:buffer").Blob;
    window.URL.createObjectURL = (blob) => { downloads.push(blob); return "blob:teste"; };
    window.URL.revokeObjectURL = () => {};
    window.HTMLAnchorElement.prototype.click = function click() {};

    window.eval(read("utils.js"));
    window.eval(read("script.js"));
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

    const $ = (selector) => window.document.querySelector(selector);
    const submit = (selector) => $(selector).dispatchEvent(new window.Event("submit", { cancelable: true }));
    const rows = () => Array.from($("#agreementTable").rows);

    return { window, $, submit, rows, downloads };
}

test("carrega a base demo com indicadores e lista", () => {
    const { $, rows } = loadApp();
    assert.equal(rows().length, 7);
    assert.match($("#listSummary").textContent, /7 acordos encontrados de 7/);
    assert.match($("#goalHint").textContent, /pagos no mês/);
});

test("adiciona um acordo e bloqueia contrato duplicado", () => {
    const { $, submit, rows } = loadApp();
    $("#agreementClient").value = "Unidade Teste";
    $("#agreementNumber").value = "CT-TESTE-1";
    $("#agreementDueDate").value = "2030-01-15";
    $("#agreementValue").value = "1.500,00";
    submit("#agreementForm");
    assert.equal(rows().length, 8);
    assert.match($("#formMessage").textContent, /adicionado/);

    $("#agreementClient").value = "Outra";
    $("#agreementNumber").value = " ct-teste-1 ";
    $("#agreementDueDate").value = "2030-01-15";
    $("#agreementValue").value = "10";
    submit("#agreementForm");
    assert.equal(rows().length, 8);
    assert.match($("#formMessage").textContent, /já existe/);
});

test("busca e filtro de status reduzem a lista", () => {
    const { window, $, rows } = loadApp();
    $("#searchInput").value = "sao lucas";
    $("#searchInput").dispatchEvent(new window.Event("input"));
    assert.equal(rows().length, 1);

    $("#searchInput").value = "";
    $("#searchInput").dispatchEvent(new window.Event("input"));
    $("#statusFilter").value = "paid";
    $("#statusFilter").dispatchEvent(new window.Event("change"));
    assert.equal(rows().length, 2);
});

test("exporta CSV da lista visivel", async () => {
    const { $, downloads } = loadApp();
    $("#exportCsvButton").click();
    assert.equal(downloads.length, 1);
    const csv = await downloads[0].text();
    assert.match(csv, /^\uFEFF?Contrato;Cliente;Valor/);
    assert.equal(csv.trim().split("\r\n").length, 8);
});

test("edita um acordo pelo dialog", () => {
    const { $, submit } = loadApp();
    $('[data-action="edit"]').click();
    assert.equal($("#editDialog").open, true);
    $("#editClient").value = "Cliente Editado";
    submit("#editForm");
    assert.equal($("#editDialog").open, false);
    assert.match($("#agreementTable").textContent, /Cliente Editado/);
});

test("dialog de edicao mostra preview do valor digitado", () => {
    const { window, $ } = loadApp();
    $('[data-action="edit"]').click();
    assert.match($("#editValuePreview").textContent, /Será salvo como R\$/);
    $("#editValue").value = "abc";
    $("#editValue").dispatchEvent(new window.Event("input"));
    assert.equal($("#editValuePreview").classList.contains("error"), true);
    assert.equal($("#editValue").getAttribute("aria-invalid"), "true");
});

test("card de pagos separa o total do valor pago no mes", () => {
    const { $ } = loadApp();
    assert.match($("#paidCount").textContent, /^\d+ acordos? pagos?, R\$\s?[\d.,]+ no mês$/);
});
