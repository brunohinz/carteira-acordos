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
    // Os pagos da demo caem no mês corrente, então a meta nunca começa zerada.
    assert.doesNotMatch($("#goalHint").textContent, /^R\$\s0,00 pagos/);
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

test("exporta CSV da lista visível", async () => {
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

test("salvar a edição devolve o foco ao botão Editar da mesma linha", () => {
    const { window, $, submit } = loadApp();
    const editButton = $('[data-action="edit"]');
    const id = editButton.dataset.id;
    editButton.click();
    $("#editClient").value = "Cliente Focado";
    submit("#editForm");
    const active = window.document.activeElement;
    assert.equal(active.dataset.action, "edit");
    assert.equal(active.dataset.id, id);
});

test("dialog de edição mostra preview do valor digitado", () => {
    const { window, $, submit } = loadApp();
    $('[data-action="edit"]').click();
    assert.match($("#editValuePreview").textContent, /Será salvo como R\$/);
    $("#editValue").value = "abc";
    $("#editValue").dispatchEvent(new window.Event("input"));
    assert.equal($("#editValuePreview").classList.contains("error"), true);
    assert.equal($("#editValue").getAttribute("aria-invalid"), "true");
});

test("card de pagos separa o total do valor pago no mês", () => {
    const { $ } = loadApp();
    assert.match($("#paidCount").textContent, /^\d+ acordos? pagos?, R\$\s?[\d.,]+ no mês$/);
});

test("ao voltar para a aba num novo dia, refaz a tela", () => {
    const { window, $, submit } = loadApp();
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

test("remove um acordo e desfaz pela notificação", () => {
    const { $, rows } = loadApp();
    const firstNumber = rows()[0].querySelector("strong").textContent;
    const firstValue = rows()[0].querySelector(".value-cell").textContent;
    rows()[0].querySelector('[data-action="remove"]').click();
    assert.equal(rows().length, 6);
    assert.equal($("#undoToast").hidden, false);
    assert.match($("#undoText").textContent, new RegExp(firstNumber));
    assert.ok($("#undoText").textContent.includes(firstValue));

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
    let confirmText = "";
    window.confirm = (text) => { confirmText = text; return true; };
    Object.defineProperty($("#importBackupInput"), "files", { value: [file], configurable: true });
    $("#importBackupInput").dispatchEvent(new window.Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // A confirmação compara o que entra com o que será substituído e cita a meta quando difere.
    assert.match(confirmText, /Importar 2 acordos de "backup\.json"\? A carteira atual, com 7 acordos, será substituída\./);
    assert.match(confirmText, /meta do arquivo \(R\$\s*10\.000,00\)/);
    assert.match(confirmText, /diferente da atual \(R\$\s*42\.000,00\)/);
    assert.equal(rows().length, 2);
    assert.match($("#formMessage").textContent, /2 acordos importados \(1 registro ignorado/);
    assert.match($("#goalHint").textContent, /10\.000,00/);
});

test("reabrir o dialog de edição limpa o erro da tentativa cancelada", () => {
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

test("atalho / foca a busca, mas não rouba a tecla de outro campo", () => {
    const { window, $, submit } = loadApp();
    const press = (target) => target.dispatchEvent(new window.KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));

    const typed = press($("#agreementNumber"));
    assert.equal(typed, true);
    assert.notEqual(window.document.activeElement, $("#searchInput"));

    const handled = press(window.document.body);
    assert.equal(handled, false);
    assert.equal(window.document.activeElement, $("#searchInput"));
});

test("card da meta fica destacado quando a meta do mês é batida", () => {
    const { $, submit, rows } = loadApp();
    assert.equal($("#goalCard").classList.contains("is-goal-met"), false);
    // Paga um acordo agora: os pagos da base demo podem cair no mês anterior (ex.: dia 1º).
    $("#agreementTable .row-button.pay").click();
    $("#editGoalButton").click();
    $("#goalInput").value = "1,00";
    submit("#goalForm");
    assert.equal($("#goalCard").classList.contains("is-goal-met"), true);
});

test("Esc fecha o aviso de Desfazer e a remoção continua valendo", () => {
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
    const { window, $, submit } = loadApp();
    const overdue = Number($("#overdueCount").textContent.match(/^\d+/)[0]);
    assert.ok(overdue > 0);
    assert.match(window.document.title, new RegExp(`^\\(${overdue} atrasados?\\) Carteira de acordos`));
});

test("busca destaca o trecho encontrado na lista", () => {
    const { window, $, rows } = loadApp();
    $("#searchInput").value = "sao lucas";
    $("#searchInput").dispatchEvent(new window.Event("input"));
    assert.equal(rows()[0].querySelector("mark").textContent, "São Lucas");
});

test("marcar pago cita o contrato e mantém o foco no botão da mesma linha", () => {
    const { window, $, rows } = loadApp();
    const row = rows().find((item) => item.querySelector('[data-action="toggle-paid"]').textContent === "Marcar pago");
    const id = row.dataset.id;
    const number = row.querySelector("strong").textContent;
    row.querySelector('[data-action="toggle-paid"]').click();

    assert.equal($("#formMessage").textContent, `Acordo ${number} marcado como pago.`);
    const active = window.document.activeElement;
    assert.equal(active.dataset.id, id);
    assert.equal(active.textContent, "Reabrir");
});

test("dialog de edição marca e reabre o pagamento sem fechar, e Cancelar descarta", () => {
    const { $, submit } = loadApp();
    const payButton = () => $("#agreementTable .row-button.pay");
    const id = payButton().dataset.id;
    const rowButton = () => $(`#agreementTable [data-action="toggle-paid"][data-id="${id}"]`);
    const openEdit = () => $(`#agreementTable [data-action="edit"][data-id="${id}"]`).click();

    openEdit();
    assert.equal($("#editPaidField").hidden, true);
    $("#editPaidToggle").click();
    assert.equal($("#editDialog").open, true);
    assert.equal($("#editPaidField").hidden, false);
    assert.equal($("#editPaidToggle").getAttribute("aria-pressed"), "true");
    assert.match($("#editPaidStatus").textContent, /marcado como pago ao salvar/);
    assert.match($("#editPaidDate").value, /^\d{4}-\d{2}-\d{2}$/);
    $("#editDialog [data-close-dialog]").click();
    assert.equal(rowButton().textContent.trim(), "Marcar pago");

    openEdit();
    $("#editPaidToggle").click();
    submit("#editForm");
    assert.equal(rowButton().textContent.trim(), "Reabrir");
    assert.match($("#formMessage").textContent, /atualizado e marcado como pago\./);

    openEdit();
    assert.equal($("#editPaidToggle").textContent, "Reabrir (não pago)");
    assert.equal($("#editPaidStatus").textContent, "");
    $("#editPaidToggle").click();
    assert.equal($("#editPaidField").hidden, true);
    assert.match($("#editPaidStatus").textContent, /reaberto como não pago/);
    submit("#editForm");
    assert.equal(rowButton().textContent.trim(), "Marcar pago");
    assert.match($("#formMessage").textContent, /atualizado e reaberto\./);
});

test("adota as alterações gravadas por outra aba sem perder a busca desta", () => {
    const { window, $, rows } = loadApp();
    $("#searchInput").value = "zzz-sem-resultado";
    $("#searchInput").dispatchEvent(new window.Event("input"));
    assert.equal(rows().length, 0);

    const key = "portfolio-acordos-demo";
    const saved = JSON.parse(window.localStorage.getItem(key));
    saved.agreements = saved.agreements.slice(0, 3);
    saved.goal = 1234;
    saved.search = "";
    window.localStorage.setItem(key, JSON.stringify(saved));
    window.dispatchEvent(new window.StorageEvent("storage", { key, newValue: JSON.stringify(saved) }));

    assert.equal($("#searchInput").value, "zzz-sem-resultado");
    assert.match($("#formMessage").textContent, /atualizada com alterações feitas em outra aba/);
    assert.equal($("#formMessage").getAttribute("aria-live"), "polite");
    $("#searchInput").value = "";
    $("#searchInput").dispatchEvent(new window.Event("input"));
    assert.equal(rows().length, 3);
});

test("fecha a edição e avisa quando outra aba remove o acordo aberto", () => {
    const { window, $, rows } = loadApp();
    rows()[0].querySelector('[data-action="edit"]').click();
    assert.equal($("#editDialog").open, true);

    const key = "portfolio-acordos-demo";
    const saved = JSON.parse(window.localStorage.getItem(key));
    const editedNumber = $("#editNumber").value;
    saved.agreements = saved.agreements.filter((item) => item.numero !== editedNumber);
    window.localStorage.setItem(key, JSON.stringify(saved));
    window.dispatchEvent(new window.StorageEvent("storage", { key, newValue: JSON.stringify(saved) }));

    assert.equal($("#editDialog").open, false);
    assert.match($("#formMessage").textContent, /removido em outra aba/);
    assert.equal(rows().length, 6);
});

test("dialog da meta aberto acompanha a meta alterada em outra aba, sem apagar o que foi digitado", () => {
    const { window, $, submit } = loadApp();
    const key = "portfolio-acordos-demo";
    const otherTabSaves = (goal) => {
        const saved = JSON.parse(window.localStorage.getItem(key));
        saved.goal = goal;
        window.localStorage.setItem(key, JSON.stringify(saved));
        window.dispatchEvent(new window.StorageEvent("storage", { key, newValue: JSON.stringify(saved) }));
    };

    $("#editGoalButton").click();
    assert.equal($("#goalDialog").open, true);
    otherTabSaves(77000);
    assert.equal($("#goalInput").value, "77.000,00");
    assert.match($("#goalMessage").textContent, /alterada em outra aba/);
    assert.equal($("#goalMessage").classList.contains("warning"), true);
    assert.equal($("#goalMessage").classList.contains("error"), false);

    $("#goalInput").value = "12.345,00";
    otherTabSaves(88000);
    assert.equal($("#goalInput").value, "12.345,00");

    $("#goalInput").value = "0";
    submit("#goalForm");
    assert.equal($("#goalMessage").classList.contains("error"), true);
    assert.equal($("#goalMessage").classList.contains("warning"), false);
});

test("armazenamento cheio avisa o usuário, mas o acordo continua na lista", () => {
    const { window, $, submit, rows } = loadApp();
    window.Storage.prototype.setItem = () => {
        throw new window.DOMException("O armazenamento está cheio.", "QuotaExceededError");
    };

    $("#agreementClient").value = "Unidade Cheia";
    $("#agreementNumber").value = "CT-QUOTA-1";
    $("#agreementDueDate").value = "2030-05-10";
    $("#agreementValue").value = "900,00";
    submit("#agreementForm");

    assert.equal(rows().length, 8);
    assert.match($("#formMessage").textContent, /Não foi possível salvar no navegador \(armazenamento cheio ou bloqueado\)/);
    assert.equal($("#formMessage").classList.contains("error"), true);
    assert.equal(JSON.parse(window.localStorage.getItem("portfolio-acordos-demo")).agreements.length, 7);
});

test("gravação de outra aba sem mudança na carteira não gera aviso", () => {
    const { window, $ } = loadApp();
    const key = "portfolio-acordos-demo";
    const saved = JSON.parse(window.localStorage.getItem(key));
    saved.search = "outra busca";
    window.dispatchEvent(new window.StorageEvent("storage", { key, newValue: JSON.stringify(saved) }));
    assert.equal($("#formMessage").textContent, "");
});

test("syncFromOtherTab ignora outra chave do localStorage e newValue nulo", () => {
    const { window, $, rows } = loadApp();
    const key = "portfolio-acordos-demo";
    const before = window.localStorage.getItem(key);
    const beforeCount = rows().length;

    // Outra chave não deve mexer na carteira desta aba.
    window.localStorage.setItem("outra-chave-qualquer", JSON.stringify({ agreements: [], goal: 1 }));
    window.dispatchEvent(new window.StorageEvent("storage", {
        key: "outra-chave-qualquer",
        newValue: JSON.stringify({ agreements: [], goal: 1 })
    }));
    assert.equal(rows().length, beforeCount);
    assert.equal($("#formMessage").textContent, "");
    assert.equal(window.localStorage.getItem(key), before);

    // clear() em outra aba chega com newValue null — não apaga o estado local desta.
    window.dispatchEvent(new window.StorageEvent("storage", {
        key,
        newValue: null,
        oldValue: before
    }));
    assert.equal(rows().length, beforeCount);
    assert.equal($("#formMessage").textContent, "");
    assert.equal(window.localStorage.getItem(key), before);
});

test("formata valor da edição e da meta ao sair do campo", () => {
    const { window, $, rows } = loadApp();
    rows()[0].querySelector('[data-action="edit"]').click();
    $("#editValue").value = "1234,5";
    $("#editValue").dispatchEvent(new window.Event("blur"));
    assert.equal($("#editValue").value, "1.234,50");
    $("#editDialog [data-close-dialog]").click();

    $("#editGoalButton").click();
    $("#goalInput").value = "50000";
    $("#goalInput").dispatchEvent(new window.Event("blur"));
    assert.equal($("#goalInput").value, "50.000,00");
});

test("digitar de novo no diálogo remove aria-invalid do campo", () => {
    const { window, $, submit, rows } = loadApp();
    rows()[0].querySelector('[data-action="edit"]').click();
    $("#editClient").value = "";
    submit("#editForm");
    assert.equal($("#editClient").getAttribute("aria-invalid"), "true");
    $("#editClient").value = "Unidade Corrigida";
    $("#editClient").dispatchEvent(new window.Event("input"));
    assert.equal($("#editClient").hasAttribute("aria-invalid"), false);

    $("#editDialog [data-close-dialog]").click();
    $("#editGoalButton").click();
    $("#goalInput").value = "0";
    submit("#goalForm");
    assert.equal($("#goalInput").getAttribute("aria-invalid"), "true");
    $("#goalInput").value = "10.000,00";
    $("#goalInput").dispatchEvent(new window.Event("input"));
    assert.equal($("#goalInput").hasAttribute("aria-invalid"), false);
});

test("restaura a demo e devolve a meta ao valor padrão", () => {
    const { window, $, submit, rows } = loadApp();
    $("#editGoalButton").click();
    $("#goalInput").value = "99.000,00";
    submit("#goalForm");
    assert.match($("#goalHint").textContent, /99\.000,00/);

    $("#searchInput").value = "inexistente";
    $("#searchInput").dispatchEvent(new window.Event("input"));
    $("#statusFilter").value = "paid";
    $("#statusFilter").dispatchEvent(new window.Event("change"));
    $("#sortOrder").value = "client-az";
    $("#sortOrder").dispatchEvent(new window.Event("change"));

    let confirmText = "";
    window.confirm = (text) => { confirmText = text; return true; };
    $("#resetDemoButton").click();

    assert.match(confirmText, /Restaurar a base demonstrativa/);
    assert.match(confirmText, /meta voltará para R\$\s*42\.000,00/);
    assert.equal(rows().length, 7);
    assert.equal($("#searchInput").value, "");
    assert.equal($("#statusFilter").value, "all");
    assert.equal($("#sortOrder").value, "due-soon");
    assert.match($("#goalHint").textContent, /42\.000,00/);
    assert.match($("#formMessage").textContent, /Base fictícia restaurada\. A meta voltou para R\$\s*42\.000,00/);
});

test("restaurar a demo fecha diálogos de edição e de meta abertos", () => {
    const { window, $, rows } = loadApp();

    rows()[0].querySelector('[data-action="edit"]').click();
    assert.equal($("#editDialog").open, true);
    window.confirm = () => true;
    $("#resetDemoButton").click();
    assert.equal($("#editDialog").open, false);
    assert.equal(rows().length, 7);

    $("#editGoalButton").click();
    assert.equal($("#goalDialog").open, true);
    window.confirm = () => true;
    $("#resetDemoButton").click();
    assert.equal($("#goalDialog").open, false);
});

test("carteira vazia sugere adicionar acordo ou restaurar a demo", () => {
    const { window, $, rows } = loadApp();
    window.confirm = () => true;
    while (rows().length > 0) {
        rows()[0].querySelector('[data-action="remove"]').click();
    }
    assert.equal($("#emptyState").classList.contains("is-visible"), true);
    assert.match($("#emptyStateText").textContent, /Adicione um novo ou restaure a demo/);
    assert.equal($("#clearFiltersButton").hidden, true);
});

test("campos de cliente e contrato têm limite de tamanho", () => {
    const { $ } = loadApp();
    ["#agreementClient", "#editClient"].forEach((selector) => assert.equal($(selector).maxLength, 120));
    ["#agreementNumber", "#editNumber"].forEach((selector) => assert.equal($(selector).maxLength, 40));
});

test("atalho Ver na lista dos cards aplica o filtro de status", () => {
    const { window, $, rows } = loadApp();
    $('[data-status-shortcut="paid"]').click();
    assert.equal($("#statusFilter").value, "paid");
    assert.ok(rows().length > 0);
    rows().forEach((row) => assert.match(row.textContent, /Pago/));
    assert.equal(window.document.activeElement, $("#listTitle"));

    $('[data-status-shortcut="overdue"]').click();
    assert.equal($("#statusFilter").value, "overdue");
    rows().forEach((row) => assert.match(row.textContent, /Atrasado/));
});
