// Funcoes puras (sem DOM) usadas pelo dashboard e pelos testes.

function normalizeSearchText(value) {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function normalizeContractKey(value) {
    return normalizeSearchText(value).replace(/\s+/g, "");
}

function isValidDueDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));

    if (!match) {
        return false;
    }

    const [, year, month, day] = match.map(Number);
    const date = new Date(year, month - 1, day);

    return year >= 2000
        && year <= 2100
        && date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day;
}

function normalizeOptionalDateTime(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeDateTime(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function createId() {
    const cryptoApi = globalThis.crypto;

    if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
        return cryptoApi.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Valida e limpa um acordo vindo do localStorage; devolve null se faltar dado essencial.
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

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDueDateTime(agreement) {
    const dueDate = new Date(`${agreement.vencimento}T00:00:00`);
    return Number.isNaN(dueDate.getTime()) ? Number.MAX_SAFE_INTEGER : dueDate.getTime();
}

// "today" e injetavel para os testes nao dependerem da data atual.
function getDueDiffDays(agreement, today = new Date()) {
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    return Math.round((getDueDateTime(agreement) - start.getTime()) / 86400000);
}

function isOverdue(agreement, today = new Date()) {
    return !agreement.pago && getDueDiffDays(agreement, today) < 0;
}

// Pago dentro do mes/ano de "today" (usado pela meta mensal).
function wasPaidInMonth(agreement, today = new Date()) {
    if (!agreement.pago || !agreement.pagoEm) {
        return false;
    }

    const paidAt = new Date(agreement.pagoEm);

    return !Number.isNaN(paidAt.getTime())
        && paidAt.getFullYear() === today.getFullYear()
        && paidAt.getMonth() === today.getMonth();
}

function formatDate(value) {
    const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "--/--/----";
    }

    return new Intl.DateTimeFormat("pt-BR").format(date);
}

function getStatusInfo(agreement, today = new Date()) {
    if (agreement.pago) {
        return {
            label: "Pago",
            detail: agreement.pagoEm ? `Pago em ${formatDate(agreement.pagoEm)}` : "Pagamento registrado",
            className: "status-paid"
        };
    }

    const diffDays = getDueDiffDays(agreement, today);

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

function matchesSearchTerm(agreement, term) {
    if (!term) {
        return true;
    }

    return normalizeSearchText(`${agreement.numero} ${agreement.cliente}`).includes(normalizeSearchText(term));
}

function matchesStatus(agreement, filter, today = new Date()) {
    if (filter === "paid") {
        return agreement.pago;
    }

    if (filter === "open") {
        return !agreement.pago;
    }

    if (filter === "overdue") {
        return isOverdue(agreement, today);
    }

    if (filter === "due-today") {
        return !agreement.pago && getDueDiffDays(agreement, today) === 0;
    }

    if (filter === "next-7") {
        const diffDays = getDueDiffDays(agreement, today);
        return !agreement.pago && diffDays >= 0 && diffDays <= 7;
    }

    return true;
}

function compareNumbers(a, b) {
    return a - b;
}

function compareText(a, b) {
    return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

function getCreatedTime(agreement) {
    const createdAt = new Date(agreement.criadoEm);
    return Number.isNaN(createdAt.getTime()) ? 0 : createdAt.getTime();
}

// Ordenacao pura: recebe o criterio em vez de ler o estado global.
function compareAgreementsBy(sortOrder, a, b) {
    if (sortOrder === "due-late") {
        return compareNumbers(getDueDateTime(b), getDueDateTime(a)) || compareText(a.numero, b.numero);
    }

    if (sortOrder === "created-new") {
        return compareNumbers(getCreatedTime(b), getCreatedTime(a)) || compareText(a.numero, b.numero);
    }

    if (sortOrder === "created-old") {
        return compareNumbers(getCreatedTime(a), getCreatedTime(b)) || compareText(a.numero, b.numero);
    }

    return compareNumbers(getDueDateTime(a), getDueDateTime(b)) || compareText(a.numero, b.numero);
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

    return normalizeCurrencyValue(Number.parseFloat(normalizedValue));
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

function pluralize(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
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

// Texto de apoio exibido abaixo do campo Valor enquanto o usuario digita.
function describeValueInput(rawValue) {
    if (!String(rawValue || "").trim()) {
        return { text: "", isError: false };
    }

    const value = parseCurrency(rawValue);

    if (value <= 0) {
        return { text: "Informe um valor maior que zero, por exemplo 1.250,00.", isError: true };
    }

    return { text: `Sera salvo como ${formatCurrency(value)}`, isError: false };
}

function buildListSummary(visibleCount, totalCount, search = "") {
    const summary = `${pluralize(visibleCount, "acordo encontrado", "acordos encontrados")} de ${totalCount}`;
    return search ? `${summary} para "${search}"` : summary;
}

function escapeCsvField(value) {
    let text = String(value ?? "");

    // Evita que planilhas interpretem o campo como formula (CSV injection).
    if (/^[=+\-@\t\r]/.test(text)) {
        text = `'${text}`;
    }

    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// CSV com ";" e virgula decimal, que o Excel em pt-BR abre direto.
function buildAgreementsCsv(agreements, today = new Date()) {
    const header = ["Contrato", "Cliente", "Valor", "Vencimento", "Status", "Gerado em", "Pago em"];
    const rows = agreements.map((agreement) => [
        agreement.numero,
        agreement.cliente,
        normalizeCurrencyValue(agreement.valor).toFixed(2).replace(".", ","),
        formatDate(agreement.vencimento),
        getStatusInfo(agreement, today).label,
        formatDate(agreement.criadoEm),
        agreement.pagoEm ? formatDate(agreement.pagoEm) : ""
    ]);

    return [header, ...rows]
        .map((row) => row.map(escapeCsvField).join(";"))
        .join("\r\n");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        normalizeSearchText,
        normalizeContractKey,
        isValidDueDate,
        normalizeOptionalDateTime,
        normalizeDateTime,
        createId,
        normalizeAgreement,
        addDays,
        formatInputDate,
        getDueDateTime,
        getDueDiffDays,
        isOverdue,
        wasPaidInMonth,
        formatDate,
        getStatusInfo,
        matchesSearchTerm,
        matchesStatus,
        compareNumbers,
        compareText,
        getCreatedTime,
        compareAgreementsBy,
        parseCurrency,
        normalizeCurrencyValue,
        currencyToCents,
        centsToCurrency,
        pluralize,
        formatCurrency,
        formatCurrencyInput,
        describeValueInput,
        escapeHtml,
        buildListSummary,
        escapeCsvField,
        buildAgreementsCsv
    };
}
