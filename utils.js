// Funcoes puras (sem DOM) usadas pelo dashboard e pelos testes.

function normalizeSearchText(value) {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
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
        isValidDueDate,
        addDays,
        formatInputDate,
        parseCurrency,
        normalizeCurrencyValue,
        currencyToCents,
        centsToCurrency,
        pluralize,
        formatCurrency,
        formatCurrencyInput,
        escapeHtml
    };
}
