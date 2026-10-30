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

    // jsdom não implementa showModal/scrollIntoView nem object URLs.
    window.HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
    window.HTMLDialogElement.prototype.close = function close() { this.open = false; };
    window.HTMLElement.prototype.scrollIntoView = () => {};
    // Blob do Node tem .text(), o do jsdom não.
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
    // Cabeçalho + 7 acordos + linha de total.
    assert.equal(csv.trim().split("\r\n").length, 9);
    assert.match(csv.trim().split("\r\n").pop(), /^Total;7 acordos;/);
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

test("ao voltar para a aba num novo dia, refaz a tela", () => {
    const { window, $ } = loadApp();
    $("#lastUpdated").textContent = "velho";
    window.dispatchEvent(new window.Event("focus"));
    assert.equal($("#lastUpdated").textContent, "velho");

    // Simula a virada do dia avançando o relógio da página em 24h.
    window.eval(`
        const RealDate = Date;
        Date = class extends RealDate {
            constructor(...args) {
                super(...(args.length ? args : [RealDate.now() + 86400000]));
            }
        };
    `);
    window.dispatchEvent(new window.Event("focus"));
    assert.match($("#lastUpdated").textContent, /^Atualizado em/);
});

test("remove um acordo e desfaz pela notificacao", () => {
    const { $, rows } = loadApp();
    const firstNumber = rows()[0].querySelector("strong").textContent;
    rows()[0].querySelector('[data-action="remove"]').click();
    assert.equal(rows().length, 6);
    assert.equal($("#undoToast").hidden, false);
    assert.match($("#undoText").textContent, new RegExp(firstNumber));

    $("#undoButton").click();
    assert.equal(rows().length, 7);
    assert.equal($("#undoToast").hidden, true);
    assert.equal(rows()[0].querySelector("strong").textContent, firstNumber);
});

test("importa backup JSON substituindo a carteira e a meta", async () => {
    const { window, $, rows } = loadApp();
    const backup = {
        formato: "carteira-acordos-backup",
        versao: 1,
        meta: 10000,
        acordos: [
            { numero: "IMP-1", cliente: "Importado A", valor: 100, vencimento: "2030-02-01" },
            { numero: "IMP-2", cliente: "Importado B", valor: 200, vencimento: "2030-03-01" },
            { numero: "imp-1", cliente: "Duplicado", valor: 300, vencimento: "2030-04-01" }
        ]
    };
    const file = { name: "backup.json", text: async () => JSON.stringify(backup) };
    window.confirm = () => true;
    Object.defineProperty($("#importBackupInput"), "files", { value: [file], configurable: true });
    $("#importBackupInput").dispatchEvent(new window.Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(rows().length, 2);
    assert.match($("#formMessage").textContent, /2 acordos importados \(1 registro ignorado/);
    assert.match($("#goalHint").textContent, /10\.000,00/);
});

test("reabrir o dialog de edicao limpa o erro da tentativa cancelada", () => {
    const { $, submit, rows } = loadApp();
    rows()[0].querySelector('[data-action="edit"]').click();
    $("#editClient").value = "";
    submit("#editForm");
    assert.equal($("#editClient").getAttribute("aria-invalid"), "true");
    assert.notEqual($("#editMessage").textContent, "");

    $("#editDialog").close();
    rows()[0].querySelector('[data-action="edit"]').click();
    assert.equal($("#editClient").hasAttribute("aria-invalid"), false);
    assert.equal($("#editMessage").textContent, "");
});

test("atalho / foca a busca, mas nao rouba a tecla de outro campo", () => {
    const { window, $ } = loadApp();
    const press = (target) => target.dispatchEvent(new window.KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));

    const typed = press($("#agreementNumber"));
    assert.equal(typed, true);
    assert.notEqual(window.document.activeElement, $("#searchInput"));

    const handled = press(window.document.body);
    assert.equal(handled, false);
    assert.equal(window.document.activeElement, $("#searchInput"));
});

test("card da meta fica destacado quando a meta do mes e batida", () => {
    const { $, submit } = loadApp();
    assert.equal($("#goalCard").classList.contains("is-goal-met"), false);
    $("#editGoalButton").click();
    $("#goalInput").value = "1,00";
    submit("#goalForm");
    assert.equal($("#goalCard").classList.contains("is-goal-met"), true);
});

test("Esc fecha o aviso de Desfazer e a remocao continua valendo", () => {
    const { window, $, rows } = loadApp();
    rows()[0].querySelector('[data-action="remove"]').click();
    assert.equal($("#undoToast").hidden, false);

    window.document.body.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    assert.equal($("#undoToast").hidden, true);
    assert.equal(rows().length, 6);
});

test("edita a data de pagamento de um acordo pago e recusa data futura", () => {
    const { $, submit, rows } = loadApp();
    const paidRow = rows().find((row) => row.querySelector('[data-action="toggle-paid"]').textContent === "Reabrir");
    paidRow.querySelector('[data-action="edit"]').click();
    assert.equal($("#editPaidField").hidden, false);

    $("#editPaidDate").value = "2100-01-01";
    submit("#editForm");
    assert.equal($("#editDialog").open, true);
    assert.equal($("#editPaidDate").getAttribute("aria-invalid"), "true");

    $("#editPaidDate").value = "2026-01-02";
    submit("#editForm");
    assert.equal($("#editDialog").open, false);
    assert.match($("#agreementTable").textContent, /Pago em 02\/01\/2026/);
});

test("acordo em aberto não mostra o campo Pago em", () => {
    const { $, rows } = loadApp();
    const openRow = rows().find((row) => row.querySelector('[data-action="toggle-paid"]').textContent === "Marcar pago");
    openRow.querySelector('[data-action="edit"]').click();
    assert.equal($("#editPaidField").hidden, true);
});

test("select de status mostra a contagem de cada filtro e atualiza ao pagar", () => {
    const { $, rows } = loadApp();
    const optionText = (value) => $(`#statusFilter option[value="${value}"]`).textContent;
    assert.equal(optionText("all"), "Todos (7)");
    assert.equal(optionText("paid"), "Pagos (2)");

    rows().find((row) => row.querySelector('[data-action="toggle-paid"]').textContent === "Marcar pago")
        .querySelector('[data-action="toggle-paid"]').click();
    assert.equal(optionText("paid"), "Pagos (3)");
});

test("título da aba mostra quantos acordos estão atrasados", () => {
    const { window, $ } = loadApp();
    const overdue = Number($("#overdueCount").textContent.match(/^\d+/)[0]);
    assert.ok(overdue > 0);
    assert.match(window.document.title, new RegExp(`^\\(${overdue} atrasados?\\) Carteira de acordos`));
});
