const DEMO_STORAGE_KEY = "portfolio-acordos-demo";
const DEFAULT_GOAL = 42000;

const state = {
    agreements: [],
    sortOrder: "due-soon",
    statusFilter: "all",
    search: ""
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
    elements.form = document.querySelector("#agreementForm");
    elements.client = document.querySelector("#agreementClient");
    elements.number = document.querySelector("#agreementNumber");
    elements.dueDate = document.querySelector("#agreementDueDate");
    elements.value = document.querySelector("#agreementValue");
    elements.formMessage = document.querySelector("#formMessage");
    elements.searchInput = document.querySelector("#searchInput");
    elements.statusFilter = document.querySelector("#statusFilter");
    elements.sortOrder = document.querySelector("#sortOrder");
    elements.table = document.querySelector("#agreementTable");
    elements.emptyState = document.querySelector("#emptyState");
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
    elements.goalProgressBar = document.querySelector("#goalProgressBar");
    elements.goalHint = document.querySelector("#goalHint");
}

function bindEvents() {
    elements.form.addEventListener("submit", handleAddAgreement);
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
    elements.table.addEventListener("click", handleTableAction);
}

function loadDemoState() {
    try {
        const saved = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "null");

        if (saved && Array.isArray(saved.agreements)) {
            state.agreements = saved.agreements.map(normalizeAgreement).filter(Boolean);
            state.sortOrder = normalizeSortOrder(saved.sortOrder);
            state.statusFilter = normalizeStatusFilter(saved.statusFilter);
            state.search = typeof saved.search === "string" ? saved.search.trim().slice(0, 100) : "";
            return;
        }
    } catch (error) {
        state.agreements = [];
    }

    state.agreements = createDemoAgreements();
    saveDemoState();
}

function saveDemoState() {
    try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
            agreements: state.agreements,
            sortOrder: state.sortOrder,
            statusFilter: state.statusFilter,
            search: state.search
        }));
        return true;
    } catch (error) {
        showMessage("Nao foi possivel salvar no navegador (armazenamento cheio ou bloqueado). As alteracoes valem so ate recarregar a pagina.", true);
        return false;
    }
}

function createDemoAgreements() {
    return [
        createDemoAgreement("CT-2026-001", "Unidade Centro", 8420.5, -4, -19, true),
        createDemoAgreement("CT-2026-002", "Colegio Horizonte", 5930, 0, -8, false),
        createDemoAgreement("CT-2026-003", "Unidade Norte", 12780.9, 4, -2, false),
        createDemoAgreement("CT-2026-004", "Centro Educacional Vale", 3760, 12, -5, true),
        createDemoAgreement("CT-2026-005", "Polo Jardim", 9145.75, 20, 0, false),
        createDemoAgreement("CT-2026-006", "Unidade Sul", 2210.35, -11, -32, false),
        createDemoAgreement("CT-2026-007", "Colegio Sao Lucas", 4680, 7, -1, false)
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

function normalizeAgreement(agreement) {
    if (!agreement || !agreement.numero || !agreement.cliente || !agreement.vencimento) {
        return null;
    }

    return {
        id: agreement.id || createId(),
        numero: String(agreement.numero),
        cliente: String(agreement.cliente),
        valor: normalizeCurrencyValue(agreement.valor),
        vencimento: String(agreement.vencimento).slice(0, 10),
        criadoEm: normalizeDateTime(agreement.criadoEm),
        pago: Boolean(agreement.pago),
        pagoEm: agreement.pago ? normalizeOptionalDateTime(agreement.pagoEm) : null
    };
}

function render() {
    elements.searchInput.value = state.search;
    elements.statusFilter.value = state.statusFilter;
    elements.sortOrder.value = state.sortOrder;
    elements.lastUpdated.textContent = `Atualizado em ${formatDateTime(new Date())}`;
    renderMetrics();
    renderList();
}

function renderMetrics() {
    const monthGenerated = state.agreements.filter(wasCreatedThisMonth);
    const paid = state.agreements.filter((agreement) => agreement.pago);
    const open = state.agreements.filter((agreement) => !agreement.pago);
    const overdue = state.agreements.filter((agreement) => isOverdue(agreement));
    const paidValue = centsToCurrency(sumCurrency(paid));
    const progress = Math.min(Math.round((paidValue / DEFAULT_GOAL) * 100), 100);

    elements.monthGeneratedValue.textContent = formatCurrency(centsToCurrency(sumCurrency(monthGenerated)));
    elements.monthGeneratedCount.textContent = pluralize(monthGenerated.length, "acordo gerado", "acordos gerados");
    elements.paidValue.textContent = formatCurrency(paidValue);
    elements.paidCount.textContent = pluralize(paid.length, "acordo pago", "acordos pagos");
    elements.openValue.textContent = formatCurrency(centsToCurrency(sumCurrency(open)));
    elements.openCount.textContent = pluralize(open.length, "acordo pendente", "acordos pendentes");
    elements.overdueValue.textContent = formatCurrency(centsToCurrency(sumCurrency(overdue)));
    elements.overdueCount.textContent = pluralize(overdue.length, "acordo atrasado", "acordos atrasados");
    elements.goalProgress.textContent = `${progress}%`;
    elements.goalProgressBar.style.width = `${progress}%`;
    elements.goalHint.textContent = `${formatCurrency(paidValue)} de ${formatCurrency(DEFAULT_GOAL)}`;
}

function renderList() {
    const visibleAgreements = getVisibleAgreements();
    elements.table.innerHTML = "";
    elements.emptyState.classList.toggle("is-visible", visibleAgreements.length === 0);
    elements.listSummary.textContent = `${pluralize(visibleAgreements.length, "acordo encontrado", "acordos encontrados")} de ${state.agreements.length}`;

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
    if (!state.search) {
        return true;
    }

    return normalizeSearchText(`${agreement.numero} ${agreement.cliente}`).includes(normalizeSearchText(state.search));
}

function matchesStatusFilter(agreement) {
    if (state.statusFilter === "paid") {
        return agreement.pago;
    }

    if (state.statusFilter === "open") {
        return !agreement.pago;
    }

    if (state.statusFilter === "overdue") {
        return isOverdue(agreement);
    }

    return true;
}

function createAgreementRow(agreement) {
    const row = document.createElement("tr");
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

    if (!cliente || !numero || !vencimento || valor <= 0) {
        showMessage("Preencha cliente, contrato, vencimento e valor.", true);
        return;
    }

    if (!isValidDueDate(vencimento)) {
        showMessage("Informe um vencimento valido entre 2000 e 2100.", true);
        elements.dueDate.focus();
        return;
    }

    const contractKey = normalizeContractKey(numero);
    const exists = state.agreements.some((agreement) => (
        normalizeContractKey(agreement.numero) === contractKey
    ));

    if (exists) {
        showMessage("Esse contrato ja existe na carteira.", true);
        return;
    }

    state.agreements.push({
        id: createId(),
        numero,
        cliente,
        vencimento,
        valor,
        criadoEm: new Date().toISOString(),
        pago: false,
        pagoEm: null
    });

    elements.form.reset();
    elements.client.focus();
    showMessage("Acordo adicionado na carteira demo.");
    saveDemoState();
    renderMetrics();
    renderList();
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

    if (button.dataset.action === "remove") {
        const confirmed = window.confirm(`Remover o acordo ${agreement.numero} (${agreement.cliente})? Essa acao nao pode ser desfeita.`);

        if (!confirmed) {
            return;
        }

        state.agreements = state.agreements.filter((item) => item.id !== agreement.id);
        showMessage("Acordo removido da demo.");
    }

    saveDemoState();
    renderMetrics();
    renderList();
}

function resetDemo() {
    const confirmed = window.confirm("Restaurar a base demonstrativa? Os acordos adicionados ou alterados por voce serao substituidos.");

    if (!confirmed) {
        return;
    }

    state.agreements = createDemoAgreements();
    state.sortOrder = "due-soon";
    state.statusFilter = "all";
    state.search = "";
    showMessage("Base ficticia restaurada.");
    saveDemoState();
    render();
}

function compareAgreements(a, b) {
    if (state.sortOrder === "due-late") {
        return compareNumbers(getDueDateTime(b), getDueDateTime(a)) || compareText(a.numero, b.numero);
    }

    if (state.sortOrder === "created-new") {
        return compareNumbers(getCreatedTime(b), getCreatedTime(a)) || compareText(a.numero, b.numero);
    }

    if (state.sortOrder === "created-old") {
        return compareNumbers(getCreatedTime(a), getCreatedTime(b)) || compareText(a.numero, b.numero);
    }

    return compareNumbers(getDueDateTime(a), getDueDateTime(b)) || compareText(a.numero, b.numero);
}

function getStatusInfo(agreement) {
    if (agreement.pago) {
        return {
            label: "Pago",
            detail: agreement.pagoEm ? `Pago em ${formatDate(agreement.pagoEm)}` : "Pagamento registrado",
            className: "status-paid"
        };
    }

    const diffDays = getDueDiffDays(agreement);

    if (diffDays < 0) {
        const days = Math.abs(diffDays);
        return {
            label: "Atrasado",
            detail: `${pluralize(days, "dia", "dias")} em atraso`,
            className: "status-overdue"
        };
    }

    if (diffDays === 0) {
        return {
            label: "Vence hoje",
            detail: "Prioridade do dia",
            className: "status-due"
        };
    }

    return {
        label: "Em aberto",
        detail: `Vence em ${pluralize(diffDays, "dia", "dias")}`,
        className: "status-open"
    };
}

function isOverdue(agreement) {
    return !agreement.pago && getDueDiffDays(agreement) < 0;
}

function getDueDiffDays(agreement) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((getDueDateTime(agreement) - today.getTime()) / 86400000);
}

function wasCreatedThisMonth(agreement) {
    const createdAt = new Date(agreement.criadoEm);
    const today = new Date();

    return !Number.isNaN(createdAt.getTime())
        && createdAt.getFullYear() === today.getFullYear()
        && createdAt.getMonth() === today.getMonth();
}

function normalizeSortOrder(value) {
    const validOptions = ["due-soon", "due-late", "created-new", "created-old"];
    return validOptions.includes(value) ? value : "due-soon";
}

function normalizeStatusFilter(value) {
    const validOptions = ["all", "open", "paid", "overdue"];
    return validOptions.includes(value) ? value : "all";
}

function compareNumbers(a, b) {
    return a - b;
}

function compareText(a, b) {
    return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

function getDueDateTime(agreement) {
    const dueDate = new Date(`${agreement.vencimento}T00:00:00`);
    return Number.isNaN(dueDate.getTime()) ? Number.MAX_SAFE_INTEGER : dueDate.getTime();
}

function getCreatedTime(agreement) {
    const createdAt = new Date(agreement.criadoEm);
    return Number.isNaN(createdAt.getTime()) ? 0 : createdAt.getTime();
}

function normalizeDateTime(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function sumCurrency(agreements) {
    return agreements.reduce((total, agreement) => total + currencyToCents(agreement.valor), 0);
}

function formatDate(value) {
    const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "--/--/----";
    }

    return new Intl.DateTimeFormat("pt-BR").format(date);
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

function showMessage(message, isError = false) {
    elements.formMessage.textContent = message;
    elements.formMessage.classList.toggle("error", isError);
}

function createId() {
    const cryptoApi = globalThis.crypto;

    if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
        return cryptoApi.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
