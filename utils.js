// Funções puras (sem DOM) usadas pelo dashboard e pelos testes.

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

// Data do campo "Pago em" (AAAA-MM-DD) como ISO; usa meio-dia local para o dia não
// mudar ao converter para UTC. Devolve null se a data for inválida.
function paidDateToIso(value) {
    if (!isValidDueDate(value)) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12).toISOString();
}

// Dia AAAA-MM-DD depois de "today" (comparação de texto funciona nesse formato).
function isAfterToday(value, today = new Date()) {
    return String(value) > formatInputDate(today);
}

function getDueDateTime(agreement) {
    const dueDate = new Date(`${agreement.vencimento}T00:00:00`);
    return Number.isNaN(dueDate.getTime()) ? Number.MAX_SAFE_INTEGER : dueDate.getTime();
}

// "today" é injetável para os testes não dependerem da data atual.
function getDueDiffDays(agreement, today = new Date()) {
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    return Math.round((getDueDateTime(agreement) - start.getTime()) / 86400000);
}

function isOverdue(agreement, today = new Date()) {
    return !agreement.pago && getDueDiffDays(agreement, today) < 0;
}

// Data válida no mesmo mês/ano de "today".
function isInSameMonth(value, today = new Date()) {
    const date = new Date(value);

    return !Number.isNaN(date.getTime())
        && date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth();
}

// Pago dentro do mês/ano de "today" (usado pela meta mensal).
function wasPaidInMonth(agreement, today = new Date()) {
    return Boolean(agreement.pago && agreement.pagoEm) && isInSameMonth(agreement.pagoEm, today);
}

// Gerado dentro do mês/ano de "today" (card "Gerado no mês").
function wasCreatedInMonth(agreement, today = new Date()) {
    return Boolean(agreement.criadoEm) && isInSameMonth(agreement.criadoEm, today);
}

// Soma em centavos para evitar erro de ponto flutuante.
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

    return normalizeSearchText(`${agreement.numero} ${agreement.cliente} ${describeValueForSearch(agreement.valor)}`)
        .includes(normalizeSearchText(term));
}

// Formas do valor que a busca reconhece: "8.420,50", "8420,50" e "8420.50".
function describeValueForSearch(value) {
    const formatted = formatCurrencyInput(value);

    if (!formatted) {
        return "";
    }

    const plain = formatted.replace(/\./g, "");
    return `${formatted} ${plain} ${plain.replace(",", ".")}`;
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

// Ordenação pura: recebe o critério em vez de ler o estado global.
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

    if (sortOrder === "value-high") {
        return compareNumbers(currencyToCents(b.valor), currencyToCents(a.valor)) || compareText(a.numero, b.numero);
    }

    if (sortOrder === "value-low") {
        return compareNumbers(currencyToCents(a.valor), currencyToCents(b.valor)) || compareText(a.numero, b.numero);
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

// Texto de apoio exibido abaixo do campo Valor enquanto o usuário digita.
function describeValueInput(rawValue) {
    if (!String(rawValue || "").trim()) {
        return { text: "", isError: false };
    }

    const value = parseCurrency(rawValue);

    if (value <= 0) {
        return { text: "Informe um valor maior que zero, por exemplo 1.250,00.", isError: true };
    }

    return { text: `Será salvo como ${formatCurrency(value)}`, isError: false };
}

// Percentual inteiro (0 a 100) da meta atingido; meta zerada/inválida vira 0 em vez de NaN/Infinity.
function calculateGoalProgress(paid, goal) {
    const paidCents = currencyToCents(paid);
    const goalCents = currencyToCents(goal);

    if (goalCents <= 0 || paidCents <= 0) {
        return 0;
    }

    return Math.min(Math.round((paidCents / goalCents) * 100), 100);
}

// Meta batida de fato (em centavos); 99,6% não conta, mesmo que o percentual arredonde para 100.
function isGoalMet(paid, goal) {
    const goalCents = currencyToCents(goal);
    return goalCents > 0 && currencyToCents(paid) >= goalCents;
}

// Quanto falta para a meta mensal e o ritmo diário necessário até o fim do mês
// (conta o dia de hoje). "today" é injetável para os testes.
function describeGoalPace(paidThisMonth, goal, today = new Date()) {
    const paidCents = currencyToCents(paidThisMonth);
    const goalCents = currencyToCents(goal);

    if (goalCents <= 0) {
        return "";
    }

    if (isGoalMet(paidThisMonth, goal)) {
        return "Meta do mês batida!";
    }

    const remainingCents = goalCents - paidCents;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = lastDay - today.getDate() + 1;
    const dailyCents = Math.ceil(remainingCents / daysLeft);
    const remaining = `Faltam ${formatCurrency(centsToCurrency(remainingCents))}`;

    return daysLeft === 1
        ? `${remaining}, hoje é o último dia do mês`
        : `${remaining}, cerca de ${formatCurrency(centsToCurrency(dailyCents))} por dia em ${pluralize(daysLeft, "dia", "dias")}`;
}

// visibleValue (opcional) é a soma dos acordos listados; só aparece quando há algo na lista.
function buildListSummary(visibleCount, totalCount, search = "", visibleValue = null) {
    let summary = `${pluralize(visibleCount, "acordo encontrado", "acordos encontrados")} de ${totalCount}`;

    if (search) {
        summary += ` para "${search}"`;
    }

    if (visibleCount > 0 && visibleValue !== null) {
        summary += `, somando ${formatCurrency(visibleValue)}`;
    }

    return summary;
}

function escapeCsvField(value) {
    let text = String(value ?? "");

    // Evita que planilhas interpretem o campo como fórmula (CSV injection).
    if (/^[=+\-@\t\r]/.test(text)) {
        text = `'${text}`;
    }

    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// CSV com ";" e vírgula decimal, que o Excel em pt-BR abre direto.
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
    // Linha final com a soma (em centavos, para não acumular erro de ponto flutuante).
    const totalValue = centsToCurrency(sumCurrency(agreements)).toFixed(2).replace(".", ",");
    const totalRow = ["Total", pluralize(agreements.length, "acordo", "acordos"), totalValue, "", "", "", ""];

    return [header, ...rows, totalRow]
        .map((row) => row.map(escapeCsvField).join(";"))
        .join("\r\n");
}

const SORT_OPTIONS = ["due-soon", "due-late", "created-new", "created-old", "value-high", "value-low"];
const STATUS_FILTER_OPTIONS = ["all", "open", "paid", "overdue", "due-today", "next-7"];

function normalizeSortOrder(value) {
    return SORT_OPTIONS.includes(value) ? value : "due-soon";
}

function normalizeStatusFilter(value) {
    return STATUS_FILTER_OPTIONS.includes(value) ? value : "all";
}

// Lê o estado salvo; "storage" segue a interface do localStorage (injetável nos testes).
// Devolve null quando não há nada salvo ou o conteúdo está corrompido.
function readSavedState(storage, key, defaultGoal) {
    let saved;

    try {
        saved = JSON.parse(storage.getItem(key) || "null");
    } catch (error) {
        return null;
    }

    if (!saved || !Array.isArray(saved.agreements)) {
        return null;
    }

    return {
        agreements: saved.agreements.map(normalizeAgreement).filter(Boolean),
        sortOrder: normalizeSortOrder(saved.sortOrder),
        statusFilter: normalizeStatusFilter(saved.statusFilter),
        search: typeof saved.search === "string" ? saved.search.trim().slice(0, 100) : "",
        goal: normalizeCurrencyValue(saved.goal) || defaultGoal
    };
}

// Grava o estado; devolve false se o navegador recusar (cheio ou bloqueado).
function writeSavedState(storage, key, data) {
    try {
        storage.setItem(key, JSON.stringify({
            agreements: data.agreements,
            sortOrder: data.sortOrder,
            statusFilter: data.statusFilter,
            search: data.search,
            goal: data.goal
        }));
        return true;
    } catch (error) {
        return false;
    }
}

const BACKUP_FORMAT = "carteira-acordos-backup";
const BACKUP_VERSION = 1;

// Backup completo (todos os acordos + meta) para salvar ou levar a outro navegador.
function buildBackup(agreements, goal, now = new Date()) {
    return {
        formato: BACKUP_FORMAT,
        versao: BACKUP_VERSION,
        exportadoEm: now.toISOString(),
        meta: normalizeCurrencyValue(goal),
        acordos: agreements.map(normalizeAgreement).filter(Boolean)
    };
}

// Lê um backup (ou uma lista simples de acordos) e devolve dados validados.
// Lança Error com mensagem pronta para o usuário quando o arquivo não serve.
function parseBackup(text) {
    let data;

    try {
        data = JSON.parse(String(text).replace(/^\uFEFF/, ""));
    } catch (error) {
        throw new Error("O arquivo não é um JSON válido.");
    }

    const list = Array.isArray(data) ? data : data && data.acordos;

    if (!Array.isArray(list)) {
        throw new Error("O arquivo não parece um backup da carteira (falta a lista de acordos).");
    }

    if (!Array.isArray(data) && data.formato && data.formato !== BACKUP_FORMAT) {
        throw new Error("Formato de backup desconhecido.");
    }

    const seen = new Set();
    const agreements = [];

    list.map(normalizeAgreement).filter(Boolean).forEach((agreement) => {
        const key = normalizeContractKey(agreement.numero);

        if (!seen.has(key) && agreement.valor > 0 && isValidDueDate(agreement.vencimento)) {
            seen.add(key);
            agreements.push(agreement);
        }
    });

    return {
        agreements,
        goal: Array.isArray(data) ? 0 : normalizeCurrencyValue(data.meta),
        skipped: list.length - agreements.length
    };
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
        paidDateToIso,
        isAfterToday,
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
        isInSameMonth,
        wasPaidInMonth,
        wasCreatedInMonth,
        sumCurrency,
        formatDate,
        getStatusInfo,
        matchesSearchTerm,
        describeValueForSearch,
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
        calculateGoalProgress,
        isGoalMet,
        describeGoalPace,
        escapeCsvField,
        buildAgreementsCsv,
        normalizeSortOrder,
        normalizeStatusFilter,
        readSavedState,
        writeSavedState,
        BACKUP_FORMAT,
        BACKUP_VERSION,
        buildBackup,
        parseBackup
    };
}
