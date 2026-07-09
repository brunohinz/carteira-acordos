const STORAGE_KEY = "controle-acordos-local";
const SORT_STORAGE_KEY = "controle-acordos-ordem";
const DEFAULT_SORT_ORDER = "due-soon";

const state = {
    meta: 0,
    contratos: [],
    ordem: DEFAULT_SORT_ORDER
};

let storageMode = "browser";
let saveTimer;
let dataFileHandle;

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
    cacheElements();
    await loadData();
    loadSortOrder();
    bindEvents();
    render();
});

function cacheElements() {
    elements.form = document.querySelector("#contractForm");
    elements.contractNumber = document.querySelector("#contractNumber");
    elements.dueDate = document.querySelector("#dueDate");
    elements.contractValue = document.querySelector("#contractValue");
    elements.formMessage = document.querySelector("#formMessage");
    elements.goalInput = document.querySelector("#goalInput");
    elements.contractList = document.querySelector("#contractList");
    elements.emptyState = document.querySelector("#emptyState");
    elements.clearAllButton = document.querySelector("#clearAllButton");
    elements.sortOrder = document.querySelector("#sortOrder");
    elements.connectDataFileButton = document.querySelector("#connectDataFileButton");
    elements.exportDataButton = document.querySelector("#exportDataButton");
    elements.importDataInput = document.querySelector("#importDataInput");
    elements.paidCount = document.querySelector("#paidCount");
    elements.totalCount = document.querySelector("#totalCount");
    elements.generatedTodayValue = document.querySelector("#generatedTodayValue");
    elements.generatedTodayCount = document.querySelector("#generatedTodayCount");
    elements.generatedMonthValue = document.querySelector("#generatedMonthValue");
    elements.generatedMonthCount = document.querySelector("#generatedMonthCount");
    elements.remainingGoal = document.querySelector("#remainingGoal");
    elements.goalHint = document.querySelector("#goalHint");
    elements.dailyNeed = document.querySelector("#dailyNeed");
    elements.daysLeft = document.querySelector("#daysLeft");
    elements.storageStatus = document.querySelector("#storageStatus");
}

async function loadData() {
    if (window.location.protocol !== "file:") {
        try {
            const response = await fetch("/api/dados", { cache: "no-store" });
            if (response.ok) {
                applyData(await response.json());
                storageMode = "server";
                elements.storageStatus.textContent = "Salvando em dados/acordos.json nesta pasta.";
                return;
            }
        } catch (error) {
            storageMode = "browser";
        }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            applyData(JSON.parse(saved));
        } catch (error) {
            applyData({});
        }
    }

    elements.storageStatus.textContent = "Salvando neste navegador.";
}

function applyData(data) {
    state.meta = parseCurrency(data.meta);
    state.contratos = Array.isArray(data.contratos)
        ? data.contratos.map(normalizeContract).filter(Boolean)
        : [];
}

function normalizeContract(contract) {
    if (!contract || !contract.numero || !contract.vencimento) {
        return null;
    }

    return {
        id: contract.id || createId(),
        numero: String(contract.numero),
        vencimento: String(contract.vencimento),
        valor: normalizeCurrencyValue(contract.valor),
        pago: Boolean(contract.pago),
        criadoEm: normalizeDateTime(contract.criadoEm),
        pagoEm: contract.pagoEm || null
    };
}

function bindEvents() {
    elements.form.addEventListener("submit", handleAddContract);
    elements.goalInput.addEventListener("input", handleGoalChange);
    elements.goalInput.addEventListener("blur", () => syncCurrencyInput(elements.goalInput, state.meta));
    elements.contractValue.addEventListener("blur", () => {
        const value = parseCurrency(elements.contractValue.value);
        if (value > 0) {
            syncCurrencyInput(elements.contractValue, value);
        }
    });
    elements.clearAllButton.addEventListener("click", handleClearAll);
    elements.sortOrder.addEventListener("change", handleSortOrderChange);
    elements.connectDataFileButton.addEventListener("click", handleConnectDataFile);
    elements.exportDataButton.addEventListener("click", handleExportData);
    elements.importDataInput.addEventListener("change", handleImportData);
}

function handleSortOrderChange() {
    state.ordem = normalizeSortOrder(elements.sortOrder.value);
    localStorage.setItem(SORT_STORAGE_KEY, state.ordem);
    renderContracts();
}

function handleAddContract(event) {
    event.preventDefault();

    const numero = elements.contractNumber.value.trim();
    const vencimento = elements.dueDate.value;
    const valor = parseCurrency(elements.contractValue.value);

    if (!numero || !vencimento || valor <= 0) {
        showMessage("Preencha o n\u00famero, a data de vencimento e um valor maior que zero.", true);
        return;
    }

    const alreadyExists = state.contratos.some((contract) => (
        contract.numero.toLowerCase() === numero.toLowerCase()
    ));

    if (alreadyExists) {
        showMessage("Esse contrato j\u00e1 est\u00e1 na lista.", true);
        return;
    }

    state.contratos.push({
        id: createId(),
        numero,
        vencimento,
        valor,
        pago: false,
        criadoEm: new Date().toISOString(),
        pagoEm: null
    });

    elements.form.reset();
    elements.contractNumber.focus();
    showMessage("Contrato adicionado.");
    render();
    scheduleSave();
}

function handleGoalChange() {
    state.meta = parseCurrency(elements.goalInput.value);
    render(false);
    scheduleSave();
}

function handleClearAll() {
    if (!state.contratos.length) {
        showMessage("N\u00e3o h\u00e1 acordos para limpar.");
        return;
    }

    const typedText = window.prompt(
        "Esta a\u00e7\u00e3o remove todos os acordos cadastrados. Para confirmar, digite: Limpar Acordos"
    );

    if (typedText === null) {
        return;
    }

    if (typedText !== "Limpar Acordos") {
        window.alert("Texto incorreto. Nenhum acordo foi removido.");
        showMessage("Nenhum acordo foi removido.");
        return;
    }

    state.contratos = [];
    render();
    scheduleSave();
    showMessage("Todos os acordos foram removidos.");
}

async function handleConnectDataFile() {
    if (!window.showOpenFilePicker) {
        window.alert("Este navegador n\u00e3o permite salvar direto em um JSON. Use Importar JSON e Exportar JSON para manter backups.");
        elements.importDataInput.click();
        return;
    }

    try {
        const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [
                {
                    description: "Arquivo JSON",
                    accept: {
                        "application/json": [".json"]
                    }
                }
            ]
        });
        const data = await readJsonFile(await handle.getFile());
        applyData(data);
        dataFileHandle = handle;
        storageMode = "json-file";
        render();
        await saveData();
        showMessage("Arquivo JSON conectado.");
        elements.storageStatus.textContent = "Salvando no JSON conectado.";
    } catch (error) {
        if (error.name !== "AbortError") {
            window.alert("N\u00e3o consegui abrir esse arquivo JSON.");
        }
    }
}

async function handleImportData(event) {
    const [file] = event.target.files;
    if (!file) {
        return;
    }

    try {
        applyData(await readJsonFile(file));
        render();
        scheduleSave();
        showMessage("Dados importados.");
    } catch (error) {
        window.alert("N\u00e3o consegui importar esse arquivo JSON.");
    } finally {
        event.target.value = "";
    }
}

function handleExportData() {
    const blob = new Blob([JSON.stringify(createDataSnapshot(), null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "acordos.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showMessage("JSON exportado.");
}

function render(syncGoalInput = true) {
    if (syncGoalInput && document.activeElement !== elements.goalInput) {
        syncCurrencyInput(elements.goalInput, state.meta);
    }

    elements.sortOrder.value = state.ordem;
    renderMetrics();
    renderContracts();
}

function renderMetrics() {
    const paidContracts = state.contratos.filter((contract) => contract.pago);
    const generatedTodayContracts = state.contratos.filter(wasCreatedToday);
    const generatedMonthContracts = state.contratos.filter(wasCreatedThisMonth);
    const paidCount = paidContracts.length;
    const paidValue = centsToCurrency(sumCurrency(paidContracts));
    const generatedTodayCount = generatedTodayContracts.length;
    const generatedTodayValue = centsToCurrency(sumCurrency(generatedTodayContracts));
    const generatedMonthCount = generatedMonthContracts.length;
    const generatedMonthValue = centsToCurrency(sumCurrency(generatedMonthContracts));
    const total = state.contratos.length;
    const remaining = Math.max(currencyToCents(state.meta) - currencyToCents(paidValue), 0);
    const daysLeft = getDaysLeftInMonth();
    const dailyNeed = remaining / daysLeft;

    elements.paidCount.textContent = formatCurrency(paidValue);
    elements.totalCount.textContent = `${paidCount} ${paidCount === 1 ? "pago" : "pagos"} de ${total} ${total === 1 ? "cadastrado" : "cadastrados"}`;
    elements.generatedTodayValue.textContent = formatCurrency(generatedTodayValue);
    elements.generatedTodayCount.textContent = `${generatedTodayCount} ${generatedTodayCount === 1 ? "acordo gerado" : "acordos gerados"} hoje`;
    elements.generatedMonthValue.textContent = formatCurrency(generatedMonthValue);
    elements.generatedMonthCount.textContent = `${generatedMonthCount} ${generatedMonthCount === 1 ? "acordo gerado" : "acordos gerados"} no m\u00eas`;
    elements.remainingGoal.textContent = state.meta ? formatCurrency(centsToCurrency(remaining)) : "-";
    elements.goalHint.textContent = state.meta
        ? `${formatCurrency(paidValue)} de ${formatCurrency(state.meta)} pagos`
        : "Defina sua meta mensal";
    elements.dailyNeed.textContent = state.meta ? formatCurrency(centsToCurrency(dailyNeed)) : "-";
    elements.daysLeft.textContent = `${daysLeft} ${daysLeft === 1 ? "dia restante" : "dias restantes"} no m\u00eas`;
}

function renderContracts() {
    elements.contractList.innerHTML = "";

    const sortedContracts = [...state.contratos].sort(compareContractsBySortOrder);

    elements.emptyState.classList.toggle("is-visible", sortedContracts.length === 0);
    elements.clearAllButton.disabled = state.contratos.length === 0;

    sortedContracts.forEach((contract) => {
        elements.contractList.appendChild(createContractItem(contract));
    });
}

function createContractItem(contract) {
    const item = document.createElement("article");
    const dueInfo = getDueInfo(contract);
    item.className = "contract-item";
    item.classList.toggle("is-paid", contract.pago);
    item.classList.toggle("is-overdue", dueInfo.kind === "danger");

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "paid-toggle";
    toggleLabel.title = contract.pago ? "Marcado como pago" : "Marcar como pago";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = contract.pago;
    toggle.addEventListener("change", () => {
        contract.pago = toggle.checked;
        contract.pagoEm = toggle.checked ? new Date().toISOString() : null;
        render();
        scheduleSave();
    });

    const mark = document.createElement("span");
    mark.className = "toggle-mark";

    toggleLabel.append(toggle, mark);

    const main = document.createElement("div");
    main.className = "contract-main";

    const number = document.createElement("span");
    number.className = "contract-number";
    number.textContent = `Contrato ${contract.numero}`;

    const date = document.createElement("span");
    date.className = "contract-date";
    date.textContent = `Vencimento: ${formatDate(contract.vencimento)}`;

    const value = document.createElement("span");
    value.className = "contract-value";
    value.textContent = `Valor: ${formatCurrency(contract.valor)}`;

    const status = document.createElement("span");
    status.className = `status-pill ${dueInfo.kind}`;
    status.textContent = contract.pago ? "Pago" : dueInfo.label;

    main.append(number, date, value, status);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "Remover";
    removeButton.addEventListener("click", () => removeContract(contract.id));

    item.append(toggleLabel, main, removeButton);
    return item;
}

function removeContract(id) {
    const contract = state.contratos.find((item) => item.id === id);
    if (!contract) {
        return;
    }

    const confirmed = window.confirm(`Remover o contrato ${contract.numero}?`);
    if (!confirmed) {
        return;
    }

    state.contratos = state.contratos.filter((item) => item.id !== id);
    render();
    scheduleSave();
}

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveData, 180);
}

async function saveData() {
    const data = createDataSnapshot();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (storageMode === "json-file" && dataFileHandle) {
        try {
            await writeJsonFile(dataFileHandle, data);
            elements.storageStatus.textContent = "Salvo no JSON conectado.";
            return;
        } catch (error) {
            storageMode = "browser";
            dataFileHandle = null;
            elements.storageStatus.textContent = "N\u00e3o consegui salvar no JSON; mantive uma c\u00f3pia neste navegador.";
            return;
        }
    }

    if (storageMode !== "server") {
        elements.storageStatus.textContent = "Salvo neste navegador.";
        return;
    }

    try {
        const response = await fetch("/api/dados", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error("Falha ao salvar.");
        }

        elements.storageStatus.textContent = "Salvo em dados/acordos.json.";
    } catch (error) {
        storageMode = "browser";
        elements.storageStatus.textContent = "N\u00e3o consegui salvar o arquivo; mantive uma c\u00f3pia neste navegador.";
    }
}

function showMessage(message, isError = false) {
    elements.formMessage.textContent = message;
    elements.formMessage.classList.toggle("error", isError);
}

function createDataSnapshot() {
    return {
        meta: state.meta,
        contratos: state.contratos
    };
}

function loadSortOrder() {
    state.ordem = normalizeSortOrder(localStorage.getItem(SORT_STORAGE_KEY));
}

function normalizeSortOrder(value) {
    const validOptions = ["due-soon", "due-late", "created-new", "created-old"];
    return validOptions.includes(value) ? value : DEFAULT_SORT_ORDER;
}

function compareContractsBySortOrder(a, b) {
    if (state.ordem === "due-late") {
        return compareNumbers(getDueDateTime(b), getDueDateTime(a)) || compareContractNumbers(a, b);
    }

    if (state.ordem === "created-new") {
        return compareNumbers(getCreatedTime(b), getCreatedTime(a)) || compareContractNumbers(a, b);
    }

    if (state.ordem === "created-old") {
        return compareNumbers(getCreatedTime(a), getCreatedTime(b)) || compareContractNumbers(a, b);
    }

    return compareNumbers(getDueDateTime(a), getDueDateTime(b)) || compareContractNumbers(a, b);
}

function compareNumbers(a, b) {
    return a - b;
}

function compareContractNumbers(a, b) {
    return a.numero.localeCompare(b.numero, "pt-BR", { numeric: true, sensitivity: "base" });
}

function getDueDateTime(contract) {
    const dueDate = new Date(`${contract.vencimento}T00:00:00`);
    return Number.isNaN(dueDate.getTime()) ? Number.MAX_SAFE_INTEGER : dueDate.getTime();
}

function getCreatedTime(contract) {
    const createdAt = new Date(contract.criadoEm);
    return Number.isNaN(createdAt.getTime()) ? 0 : createdAt.getTime();
}

async function readJsonFile(file) {
    const text = await file.text();
    if (!text.trim()) {
        return {};
    }

    return JSON.parse(text);
}

async function writeJsonFile(handle, data) {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
}

function getDaysLeftInMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(lastDay - now.getDate() + 1, 1);
}

function normalizeDateTime(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function wasCreatedToday(contract) {
    const createdAt = new Date(contract.criadoEm);

    if (Number.isNaN(createdAt.getTime())) {
        return false;
    }

    const today = new Date();
    return createdAt.getFullYear() === today.getFullYear()
        && createdAt.getMonth() === today.getMonth()
        && createdAt.getDate() === today.getDate();
}

function wasCreatedThisMonth(contract) {
    const createdAt = new Date(contract.criadoEm);

    if (Number.isNaN(createdAt.getTime())) {
        return false;
    }

    const today = new Date();
    return createdAt.getFullYear() === today.getFullYear()
        && createdAt.getMonth() === today.getMonth();
}

function getDueInfo(contract) {
    if (contract.pago) {
        return { kind: "", label: "Pago" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${contract.vencimento}T00:00:00`);
    const diffDays = Math.round((dueDate - today) / 86400000);

    if (diffDays < 0) {
        return { kind: "danger", label: `Atrasado h\u00e1 ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "dia" : "dias"}` };
    }

    if (diffDays === 0) {
        return { kind: "warn", label: "Vence hoje" };
    }

    return { kind: "", label: `Vence em ${diffDays} ${diffDays === 1 ? "dia" : "dias"}` };
}

function formatDate(value) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function parseCurrency(value) {
    if (typeof value === "number") {
        return normalizeCurrencyValue(value);
    }

    const rawValue = String(value || "")
        .replace(/[^\d,.-]/g, "")
        .trim();

    if (!rawValue) {
        return 0;
    }

    const hasComma = rawValue.includes(",");
    const hasDot = rawValue.includes(".");
    let normalizedValue = rawValue;

    if (hasComma) {
        normalizedValue = rawValue.replace(/\./g, "").replace(",", ".");
    } else if (hasDot) {
        const parts = rawValue.split(".");
        const decimalPart = parts[parts.length - 1];
        normalizedValue = decimalPart.length <= 2
            ? `${parts.slice(0, -1).join("")}.${decimalPart}`
            : rawValue.replace(/\./g, "");
    }

    const parsed = Number.parseFloat(normalizedValue);
    return normalizeCurrencyValue(parsed);
}

function normalizeCurrencyValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return centsToCurrency(currencyToCents(parsed));
}

function currencyToCents(value) {
    return Math.round((Number(value) || 0) * 100);
}

function centsToCurrency(value) {
    return Math.round(Number(value) || 0) / 100;
}

function sumCurrency(contracts) {
    return contracts.reduce((total, contract) => total + currencyToCents(contract.valor), 0);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(normalizeCurrencyValue(value));
}

function formatCurrencyInput(value) {
    if (!value) {
        return "";
    }

    return normalizeCurrencyValue(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function syncCurrencyInput(input, value) {
    input.value = formatCurrencyInput(value);
}

function createId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
