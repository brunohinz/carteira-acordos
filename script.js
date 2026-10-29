const DEMO_STORAGE_KEY = "portfolio-acordos-demo";
const DEFAULT_GOAL = 42000;

const state = {
    agreements: [],
    sortOrder: "due-soon",
    statusFilter: "all",
    search: "",
    goal: DEFAULT_GOAL
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    loadDemoState();
    bindEvents();
    render();
});

function cacheElements() {
    elements.lastUpdated = document.querySelector("#lastUpdated");
    elements.resetDemoButton = document.querySelector("#resetDemoButton");
    elements.exportCsvButton = document.querySelector("#exportCsvButton");
    elements.exportBackupButton = document.querySelector("#exportBackupButton");
    elements.importBackupButton = document.querySelector("#importBackupButton");
    elements.importBackupInput = document.querySelector("#importBackupInput");
    elements.form = document.querySelector("#agreementForm");
    elements.client = document.querySelector("#agreementClient");
    elements.number = document.querySelector("#agreementNumber");
    elements.dueDate = document.querySelector("#agreementDueDate");
    elements.value = document.querySelector("#agreementValue");
    elements.formMessage = document.querySelector("#formMessage");
    elements.valuePreview = document.querySelector("#valuePreview");
    elements.searchInput = document.querySelector("#searchInput");
    elements.statusFilter = document.querySelector("#statusFilter");
    elements.sortOrder = document.querySelector("#sortOrder");
    elements.table = document.querySelector("#agreementTable");
    elements.emptyState = document.querySelector("#emptyState");
    elements.emptyStateText = document.querySelector("#emptyStateText");
    elements.clearFiltersButton = document.querySelector("#clearFiltersButton");
    elements.listSummary = document.querySelector("#listSummary");
    elements.monthGeneratedValue = document.querySelector("#monthGeneratedValue");
    elements.monthGeneratedCount = document.querySelector("#monthGeneratedCount");
    elements.paidValue = document.querySelector("#paidValue");
    elements.paidCount = document.querySelector("#paidCount");
    elements.openValue = document.querySelector("#openValue");
    elements.openCount = document.querySelector("#openCount");
    elements.overdueValue = document.querySelector("#overdueValue");
    elements.overdueCount = document.querySelector("#overdueCount");
    elements.goalProgress = document.querySelector("#goalProgress");
    elements.goalProgressTrack = document.querySelector("#goalProgressTrack");
    elements.goalProgressBar = document.querySelector("#goalProgressBar");
    elements.goalHint = document.querySelector("#goalHint");
    elements.goalPace = document.querySelector("#goalPace");
    elements.editGoalButton = document.querySelector("#editGoalButton");
    elements.undoToast = document.querySelector("#undoToast");
    elements.undoText = document.querySelector("#undoText");
    elements.undoButton = document.querySelector("#undoButton");
    elements.editDialog = document.querySelector("#editDialog");
    elements.editForm = document.querySelector("#editForm");
    elements.editDialogTitle = document.querySelector("#editDialogTitle");
    elements.editClient = document.querySelector("#editClient");
    elements.editNumber = document.querySelector("#editNumber");
    elements.editValue = document.querySelector("#editValue");
    elements.editValuePreview = document.querySelector("#editValuePreview");
    elements.editDueDate = document.querySelector("#editDueDate");
    elements.editMessage = document.querySelector("#editMessage");
    elements.goalDialog = document.querySelector("#goalDialog");
    elements.goalForm = document.querySelector("#goalForm");
    elements.goalInput = document.querySelector("#goalInput");
    elements.goalMessage = document.querySelector("#goalMessage");
}

function bindEvents() {
    elements.form.addEventListener("submit", handleAddAgreement);
    elements.value.addEventListener("input", renderValuePreview);
    elements.editValue.addEventListener("input", renderEditValuePreview);
    elements.value.addEventListener("blur", () => {
        const value = parseCurrency(elements.value.value);

        if (value > 0) {
            elements.value.value = formatCurrencyInput(value);
        }
    });
    elements.searchInput.addEventListener("input", () => {
        state.search = elements.searchInput.value.trim();
        saveDemoState();
        renderList();
    });
    elements.searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && elements.searchInput.value) {
            event.preventDefault();
            elements.searchInput.value = "";
            state.search = "";
            saveDemoState();
            renderList();
        }
    });
    elements.statusFilter.addEventListener("change", () => {
        state.statusFilter = elements.statusFilter.value;
        saveDemoState();
        renderList();
    });
    elements.sortOrder.addEventListener("change", () => {
        state.sortOrder = elements.sortOrder.value;
        saveDemoState();
        renderList();
    });
    elements.resetDemoButton.addEventListener("click", resetDemo);
    elements.exportCsvButton.addEventListener("click", exportCsv);
    elements.exportBackupButton.addEventListener("click", exportBackup);
    elements.importBackupButton.addEventListener("click", () => elements.importBackupInput.click());
    elements.importBackupInput.addEventListener("change", importBackup);
    elements.editGoalButton.addEventListener("click", editGoal);
    elements.clearFiltersButton.addEventListener("click", clearFilters);
    elements.table.addEventListener("click", handleTableAction);
    elements.undoButton.addEventListener("click", undoRemove);
    elements.editForm.addEventListener("submit", handleEditSubmit);
    elements.goalForm.addEventListener("submit", handleGoalSubmit);
    document.addEventListener("keydown", focusSearchOnSlash);
    document.addEventListener("visibilitychange", refreshIfDayChanged);
    window.addEventListener("focus", refreshIfDayChanged);
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
        button.addEventListener("click", () => button.closest("dialog").close());
    });
}

// Atalho "/" leva para a busca, exceto quando o usuario ja esta digitando ou com um dialog aberto.
function focusSearchOnSlash(event) {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    const target = event.target;
    const isTyping = target instanceof Element
        && (target.closest("input, textarea, select, [contenteditable]") !== null);

    if (isTyping || document.querySelector("dialog[open]")) {
        return;
    }

    event.preventDefault();
    elements.searchInput.focus();
    elements.searchInput.select();
}

function loadDemoState() {
    let saved = null;

    try {
        saved = readSavedState(localStorage, DEMO_STORAGE_KEY, DEFAULT_GOAL);
    } catch (error) {
        // localStorage pode nem estar acessivel (modo privado/bloqueado).
        saved = null;
    }

    if (saved) {
        Object.assign(state, saved);
        return;
    }

    state.agreements = createDemoAgreements();
    saveDemoState();
}

function saveDemoState() {
    let saved = false;

    try {
        saved = writeSavedState(localStorage, DEMO_STORAGE_KEY, state);
    } catch (error) {
        saved = false;
    }

    if (!saved) {
        showMessage("Não foi possível salvar no navegador (armazenamento cheio ou bloqueado). As alterações valem só até recarregar a página.", true);
    }

    return saved;
}

function createDemoAgreements() {
    return [
        createDemoAgreement("CT-2026-001", "Unidade Centro", 8420.5, -4, -19, true),
        createDemoAgreement("CT-2026-002", "Colégio Horizonte", 5930, 0, -8, false),
        createDemoAgreement("CT-2026-003", "Unidade Norte", 12780.9, 4, -2, false),
        createDemoAgreement("CT-2026-004", "Centro Educacional Vale", 3760, 12, -5, true),
        createDemoAgreement("CT-2026-005", "Polo Jardim", 9145.75, 20, 0, false),
        createDemoAgreement("CT-2026-006", "Unidade Sul", 2210.35, -11, -32, false),
        createDemoAgreement("CT-2026-007", "Colégio São Lucas", 4680, 7, -1, false)
    ];
}

function createDemoAgreement(numero, cliente, valor, dueOffset, createdOffset, pago) {
    const now = new Date();
    const createdAt = addDays(now, createdOffset);

    return {
        id: createId(),
        numero,
        cliente,
        valor,
        vencimento: formatInputDate(addDays(now, dueOffset)),
        criadoEm: createdAt.toISOString(),
        pago,
        pagoEm: pago ? addDays(createdAt, 3).toISOString() : null
    };
}

// Dia (AAAA-MM-DD) do ultimo render completo; status como "Vence hoje" dependem dele.
let renderedDay = "";

// Se a aba ficou aberta de um dia para o outro, refaz status, metricas e "Atualizado em" ao voltar.
function refreshIfDayChanged() {
    if (document.visibilityState === "hidden") {
        return;
    }

    if (formatInputDate(new Date()) !== renderedDay) {
        render();
    }
}

function render() {
    renderedDay = formatInputDate(new Date());
    elements.searchInput.value = state.search;
    elements.statusFilter.value = state.statusFilter;
    elements.sortOrder.value = state.sortOrder;
    elements.lastUpdated.textContent = `Atualizado em ${formatDateTime(new Date())}`;
    renderMetrics();
    renderList();
}

function renderMetrics() {
    const monthGenerated = state.agreements.filter((agreement) => wasCreatedInMonth(agreement));
    const paid = state.agreements.filter((agreement) => agreement.pago);
    const open = state.agreements.filter((agreement) => !agreement.pago);
    const overdue = state.agreements.filter((agreement) => isOverdue(agreement));
    const paidValue = centsToCurrency(sumCurrency(paid));
    // A meta e mensal: so conta o que foi pago no mes corrente.
    const paidThisMonthValue = centsToCurrency(sumCurrency(state.agreements.filter((agreement) => wasPaidInMonth(agreement))));
    const progress = calculateGoalProgress(paidThisMonthValue, state.goal);

    elements.monthGeneratedValue.textContent = formatCurrency(centsToCurrency(sumCurrency(monthGenerated)));
    elements.monthGeneratedCount.textContent = pluralize(monthGenerated.length, "acordo gerado", "acordos gerados");
    elements.paidValue.textContent = formatCurrency(paidValue);
    // O card soma todos os pagos; o recorte do mes (o que conta para a meta) fica explicito no rodape.
    elements.paidCount.textContent = `${pluralize(paid.length, "acordo pago", "acordos pagos")}, ${formatCurrency(paidThisMonthValue)} no mês`;
    elements.openValue.textContent = formatCurrency(centsToCurrency(sumCurrency(open)));
    elements.openCount.textContent = pluralize(open.length, "acordo pendente", "acordos pendentes");
    elements.overdueValue.textContent = formatCurrency(centsToCurrency(sumCurrency(overdue)));
    elements.overdueCount.textContent = pluralize(overdue.length, "acordo atrasado", "acordos atrasados");
    elements.goalProgress.textContent = `${progress}%`;
    elements.goalProgressBar.style.width = `${progress}%`;
    elements.goalProgressTrack.setAttribute("aria-valuenow", String(progress));
    elements.goalProgressTrack.setAttribute("aria-valuetext", `${progress}% da meta: ${formatCurrency(paidThisMonthValue)} de ${formatCurrency(state.goal)}`);
    elements.goalHint.textContent = `${formatCurrency(paidThisMonthValue)} pagos no mês de ${formatCurrency(state.goal)}`;
    elements.goalPace.textContent = describeGoalPace(paidThisMonthValue, state.goal);
}

function renderList() {
    const visibleAgreements = getVisibleAgreements();
    elements.table.innerHTML = "";
    const hasFilters = Boolean(state.search) || state.statusFilter !== "all";
    elements.emptyState.classList.toggle("is-visible", visibleAgreements.length === 0);
    elements.emptyStateText.textContent = hasFilters && state.agreements.length > 0
        ? "Nenhum acordo corresponde à busca ou ao filtro atual."
        : "Nenhum acordo encontrado.";
    elements.clearFiltersButton.hidden = !(hasFilters && state.agreements.length > 0);
    elements.listSummary.textContent = buildListSummary(
        visibleAgreements.length,
        state.agreements.length,
        state.search,
        centsToCurrency(sumCurrency(visibleAgreements))
    );

    visibleAgreements.forEach((agreement) => {
        elements.table.appendChild(createAgreementRow(agreement));
    });
}

function getVisibleAgreements() {
    return state.agreements
        .filter(matchesSearch)
        .filter(matchesStatusFilter)
        .sort(compareAgreements);
}

function matchesSearch(agreement) {
    return matchesSearchTerm(agreement, state.search);
}

function matchesStatusFilter(agreement) {
    return matchesStatus(agreement, state.statusFilter);
}

function createAgreementRow(agreement) {
    const row = document.createElement("tr");
    row.dataset.id = agreement.id;
    const status = getStatusInfo(agreement);
    const safeId = escapeHtml(agreement.id);
    const safeNumber = escapeHtml(agreement.numero);
    const primaryAction = agreement.pago
        ? `<button type="button" class="row-button reopen" data-action="toggle-paid" data-id="${safeId}" aria-label="Reabrir acordo ${safeNumber}">Reabrir</button>`
        : `<button type="button" class="row-button pay" data-action="toggle-paid" data-id="${safeId}" aria-label="Marcar acordo ${safeNumber} como pago">Marcar pago</button>`;

    row.innerHTML = `
        <td>
            <strong>${safeNumber}</strong>
            <small>Gerado em ${formatDate(agreement.criadoEm)}</small>
        </td>
        <td>${escapeHtml(agreement.cliente)}</td>
        <td class="value-cell">${formatCurrency(agreement.valor)}</td>
        <td>
            <strong>${formatDate(agreement.vencimento)}</strong>
            <small>${status.detail}</small>
        </td>
        <td><span class="status-pill ${status.className}">${status.label}</span></td>
        <td>
            <div class="row-actions">
                ${primaryAction}
                <button type="button" class="row-button edit" data-action="edit" data-id="${safeId}" aria-label="Editar acordo ${safeNumber}">Editar</button>
                <button type="button" class="row-button remove" data-action="remove" data-id="${safeId}" aria-label="Remover acordo ${safeNumber}">Remover</button>
            </div>
        </td>
    `;

    return row;
}

function handleAddAgreement(event) {
    event.preventDefault();

    const cliente = elements.client.value.trim();
    const numero = elements.number.value.trim();
    const vencimento = elements.dueDate.value;
    const valor = parseCurrency(elements.value.value);

    if (cliente && numero && vencimento && elements.value.value.trim() && valor <= 0) {
        showMessage("O valor precisa ser maior que zero.", true);
        elements.value.focus();
        return;
    }

    if (!cliente || !numero || !vencimento || valor <= 0) {
        showMessage("Preencha cliente, contrato, vencimento e valor.", true);
        return;
    }

    if (!isValidDueDate(vencimento)) {
        showMessage("Informe um vencimento válido entre 2000 e 2100.", true);
        elements.dueDate.focus();
        return;
    }

    if (isDuplicateContract(numero)) {
        showMessage("Esse contrato já existe na carteira.", true);
        return;
    }

    const id = createId();

    state.agreements.push({
        id,
        numero,
        cliente,
        vencimento,
        valor,
        criadoEm: new Date().toISOString(),
        pago: false,
        pagoEm: null
    });

    elements.form.reset();
    renderValuePreview();
    elements.client.focus();
    showMessage("Acordo adicionado na carteira demo.");
    saveDemoState();
    renderMetrics();
    renderList();
    highlightRow(id);
}

// Atualiza o texto de apoio de um campo de valor (preview formatado ou erro).
function renderPreviewFor(input, previewElement) {
    const preview = describeValueInput(input.value);
    previewElement.textContent = preview.text;
    previewElement.classList.toggle("error", preview.isError);
    input.setAttribute("aria-invalid", String(preview.isError));
}

function renderValuePreview() {
    renderPreviewFor(elements.value, elements.valuePreview);
}

function renderEditValuePreview() {
    renderPreviewFor(elements.editValue, elements.editValuePreview);
}

// Destaca por alguns segundos a linha do acordo recem-adicionado (se estiver visivel).
function highlightRow(id) {
    const row = Array.from(elements.table.rows).find((item) => item.dataset.id === id);

    if (!row) {
        return;
    }

    row.classList.add("is-new");
    row.scrollIntoView({ block: "nearest" });
    window.setTimeout(() => row.classList.remove("is-new"), 3000);
}

function handleTableAction(event) {
    const button = event.target instanceof Element
        ? event.target.closest("button[data-action]")
        : null;

    if (!button) {
        return;
    }

    const agreement = state.agreements.find((item) => item.id === button.dataset.id);

    if (!agreement) {
        return;
    }

    if (button.dataset.action === "toggle-paid") {
        agreement.pago = !agreement.pago;
        agreement.pagoEm = agreement.pago ? new Date().toISOString() : null;
        showMessage(agreement.pago ? "Acordo marcado como pago." : "Acordo reaberto.");
    }

    if (button.dataset.action === "edit") {
        openEditDialog(agreement);
        return;
    }

    if (button.dataset.action === "remove") {
        const index = state.agreements.indexOf(agreement);
        state.agreements.splice(index, 1);
        showUndoToast(agreement, index);
    }

    saveDemoState();
    renderMetrics();
    renderList();
}

let editingId = null;

// Contrato repetido ignorando caixa, espacos e acentos; ignoreId deixa o proprio acordo de fora na edicao.
function isDuplicateContract(numero, ignoreId = null) {
    const contractKey = normalizeContractKey(numero);

    return state.agreements.some((agreement) => (
        agreement.id !== ignoreId && normalizeContractKey(agreement.numero) === contractKey
    ));
}

function openEditDialog(agreement) {
    editingId = agreement.id;
    elements.editDialogTitle.textContent = `Editar acordo ${agreement.numero}`;
    elements.editClient.value = agreement.cliente;
    elements.editNumber.value = agreement.numero;
    elements.editValue.value = formatCurrencyInput(agreement.valor);
    elements.editDueDate.value = agreement.vencimento;
    // Ao reabrir, nao deixa preso o erro de uma tentativa anterior cancelada (Esc/Cancelar).
    elements.editMessage.textContent = "";
    [elements.editClient, elements.editNumber, elements.editValue, elements.editDueDate]
        .forEach((input) => input.removeAttribute("aria-invalid"));
    renderEditValuePreview();
    elements.editDialog.showModal();
    elements.editClient.focus();
}

function showDialogError(messageElement, input, message) {
    messageElement.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.focus();
}

function handleEditSubmit(event) {
    event.preventDefault();
    const agreement = state.agreements.find((item) => item.id === editingId);

    if (!agreement) {
        elements.editDialog.close();
        return;
    }

    [elements.editClient, elements.editNumber, elements.editValue, elements.editDueDate]
        .forEach((input) => input.removeAttribute("aria-invalid"));
    const cliente = elements.editClient.value.trim();
    const numero = elements.editNumber.value.trim();
    const valor = parseCurrency(elements.editValue.value);
    const vencimento = elements.editDueDate.value;

    if (!cliente) {
        showDialogError(elements.editMessage, elements.editClient, "Informe o cliente ou a unidade.");
        return;
    }

    if (!numero) {
        showDialogError(elements.editMessage, elements.editNumber, "Informe o número do contrato.");
        return;
    }

    if (isDuplicateContract(numero, agreement.id)) {
        showDialogError(elements.editMessage, elements.editNumber, "Esse contrato já existe na carteira.");
        return;
    }

    if (valor <= 0) {
        showDialogError(elements.editMessage, elements.editValue, "Informe um valor maior que zero, por exemplo 1.250,00.");
        return;
    }

    if (!isValidDueDate(vencimento)) {
        showDialogError(elements.editMessage, elements.editDueDate, "Informe um vencimento válido entre 2000 e 2100.");
        return;
    }

    elements.editDialog.close();

    if (cliente === agreement.cliente && numero === agreement.numero
        && valor === agreement.valor && vencimento === agreement.vencimento) {
        showMessage("Nada foi alterado.");
        return;
    }

    agreement.cliente = cliente;
    agreement.numero = numero;
    agreement.valor = valor;
    agreement.vencimento = vencimento;
    showMessage(`Acordo ${agreement.numero} atualizado.`);
    saveDemoState();
    renderMetrics();
    renderList();
    highlightRow(agreement.id);
}

// Em vez de pedir confirmacao, remove na hora e oferece "Desfazer" por alguns segundos.
const UNDO_TIMEOUT_MS = 8000;
let pendingUndo = null;
let undoTimer = null;

function showUndoToast(agreement, index) {
    window.clearTimeout(undoTimer);
    pendingUndo = { agreement, index };
    elements.undoText.textContent = `Acordo ${agreement.numero} removido.`;
    elements.undoToast.hidden = false;
    undoTimer = window.setTimeout(hideUndoToast, UNDO_TIMEOUT_MS);
}

function hideUndoToast() {
    window.clearTimeout(undoTimer);
    pendingUndo = null;
    elements.undoToast.hidden = true;
}

function undoRemove() {
    if (!pendingUndo) {
        return;
    }

    const { agreement, index } = pendingUndo;
    hideUndoToast();

    if (state.agreements.some((item) => item.id === agreement.id)) {
        return;
    }

    state.agreements.splice(Math.min(index, state.agreements.length), 0, agreement);
    showMessage(`Acordo ${agreement.numero} restaurado.`);
    saveDemoState();
    renderMetrics();
    renderList();
    highlightRow(agreement.id);
}

function clearFilters() {
    state.search = "";
    state.statusFilter = "all";
    elements.searchInput.value = "";
    elements.statusFilter.value = "all";
    saveDemoState();
    renderList();
    elements.searchInput.focus();
}

function editGoal() {
    elements.goalInput.value = formatCurrencyInput(state.goal);
    elements.goalInput.removeAttribute("aria-invalid");
    elements.goalMessage.textContent = "";
    elements.goalDialog.showModal();
    elements.goalInput.select();
}

function handleGoalSubmit(event) {
    event.preventDefault();
    const goal = parseCurrency(elements.goalInput.value);

    if (goal <= 0) {
        showDialogError(elements.goalMessage, elements.goalInput, "Informe uma meta maior que zero, por exemplo 50.000,00.");
        return;
    }

    elements.goalDialog.close();
    state.goal = goal;
    saveDemoState();
    renderMetrics();
    showMessage(`Meta mensal atualizada para ${formatCurrency(goal)}.`);
}

function exportCsv() {
    const visibleAgreements = getVisibleAgreements();

    if (visibleAgreements.length === 0) {
        showMessage("Nenhum acordo na lista para exportar.", true);
        return;
    }

    // BOM para o Excel reconhecer UTF-8 (acentos).
    const csv = `\uFEFF${buildAgreementsCsv(visibleAgreements)}`;
    downloadFile(csv, `carteira-acordos-${formatInputDate(new Date())}.csv`, "text/csv;charset=utf-8");
    showMessage(`${pluralize(visibleAgreements.length, "acordo exportado", "acordos exportados")} em CSV.`);
}

// Backup ignora busca e filtros: leva a carteira inteira e a meta.
function exportBackup() {
    const backup = buildBackup(state.agreements, state.goal);
    downloadFile(JSON.stringify(backup, null, 2), `carteira-acordos-backup-${formatInputDate(new Date())}.json`, "application/json");
    showMessage(`Backup salvo com ${pluralize(backup.acordos.length, "acordo", "acordos")}.`);
}

async function importBackup() {
    const file = elements.importBackupInput.files[0];
    // Limpa o input para permitir escolher o mesmo arquivo de novo.
    elements.importBackupInput.value = "";

    if (!file) {
        return;
    }

    let backup;

    try {
        backup = parseBackup(await file.text());
    } catch (error) {
        showMessage(`Não foi possível importar: ${error.message}`, true);
        return;
    }

    if (backup.agreements.length === 0) {
        showMessage("Nenhum acordo válido encontrado no arquivo.", true);
        return;
    }

    const confirmed = window.confirm(`Importar ${pluralize(backup.agreements.length, "acordo", "acordos")} de "${file.name}"? A carteira atual será substituída.`);

    if (!confirmed) {
        return;
    }

    hideUndoToast();
    state.agreements = backup.agreements;

    if (backup.goal > 0) {
        state.goal = backup.goal;
    }

    const skippedNote = backup.skipped > 0
        ? ` (${pluralize(backup.skipped, "registro ignorado", "registros ignorados")} por estar incompleto ou duplicado)`
        : "";
    showMessage(`${pluralize(backup.agreements.length, "acordo importado", "acordos importados")}${skippedNote}.`);
    saveDemoState();
    render();
}

function downloadFile(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function resetDemo() {
    const confirmed = window.confirm("Restaurar a base demonstrativa? Os acordos adicionados ou alterados por você serão substituídos.");

    if (!confirmed) {
        return;
    }

    hideUndoToast();
    state.agreements = createDemoAgreements();
    state.sortOrder = "due-soon";
    state.statusFilter = "all";
    state.search = "";
    state.goal = DEFAULT_GOAL;
    showMessage("Base fictícia restaurada.");
    saveDemoState();
    render();
}

function compareAgreements(a, b) {
    return compareAgreementsBy(state.sortOrder, a, b);
}

function formatDateTime(value) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(value);
}

let messageTimer = null;

function showMessage(message, isError = false) {
    window.clearTimeout(messageTimer);
    elements.formMessage.textContent = message;
    elements.formMessage.classList.toggle("error", isError);

    // Sucesso some rapido; erro fica mais tempo para dar tempo de ler.
    messageTimer = window.setTimeout(() => {
        elements.formMessage.textContent = "";
        elements.formMessage.classList.remove("error");
    }, isError ? 8000 : 4000);
}
