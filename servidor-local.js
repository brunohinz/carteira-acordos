const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "dados");
const dataFile = path.join(dataDir, "acordos.json");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
};

ensureDataFile();

const server = http.createServer(async (request, response) => {
    try {
        if (request.url === "/api/dados" && request.method === "GET") {
            return sendJson(response, readData());
        }

        if (request.url === "/api/dados" && request.method === "POST") {
            const body = await readBody(request);
            const data = sanitizeData(JSON.parse(body || "{}"));
            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
            return sendJson(response, { ok: true });
        }

        return serveStatic(request, response);
    } catch (error) {
        response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Erro interno ao processar a solicitacao." }));
    }
});

if (require.main === module) {
    startServer();
}

module.exports = {
    dataFile,
    server,
    startServer
};

function startServer(onReady) {
    return server.listen(port, host, () => {
        console.log(`Controle de acordos aberto em http://${host}:${port}/inicio.html`);
        console.log(`Dados locais: ${dataFile}`);

        if (typeof onReady === "function") {
            onReady();
        }
    });
}

function ensureDataFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify({ meta: 0, contratos: [] }, null, 2), "utf8");
    }
}

function readData() {
    ensureDataFile();

    try {
        return sanitizeData(JSON.parse(fs.readFileSync(dataFile, "utf8")));
    } catch (error) {
        return { meta: 0, contratos: [] };
    }
}

function sanitizeData(data) {
    return {
        meta: parseCurrency(data.meta),
        contratos: Array.isArray(data.contratos)
            ? data.contratos.map(sanitizeContract).filter(Boolean)
            : []
    };
}

function sanitizeContract(contract) {
    if (!contract || !contract.numero || !contract.vencimento) {
        return null;
    }

    return {
        id: String(contract.id || `${Date.now()}-${Math.random()}`),
        numero: String(contract.numero).trim(),
        vencimento: String(contract.vencimento).slice(0, 10),
        valor: parseCurrency(contract.valor),
        pago: Boolean(contract.pago),
        criadoEm: contract.criadoEm ? String(contract.criadoEm) : new Date().toISOString(),
        pagoEm: contract.pagoEm ? String(contract.pagoEm) : null
    };
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024 * 1024) {
                request.destroy();
                reject(new Error("Corpo muito grande."));
            }
        });

        request.on("end", () => resolve(body));
        request.on("error", reject);
    });
}

function sendJson(response, data) {
    response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(data));
}

function serveStatic(request, response) {
    const url = new URL(request.url, `http://${host}:${port}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") {
        pathname = "/inicio.html";
    }

    if (pathname.startsWith("/dados/")) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Arquivo nao encontrado.");
        return;
    }

    const cleanPath = pathname.replace(/^\/+/, "");
    const filePath = path.join(rootDir, cleanPath);
    const relative = path.relative(rootDir, filePath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Acesso negado.");
        return;
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Arquivo nao encontrado.");
        return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
        "Content-Type": mimeTypes[extension] || "application/octet-stream",
        "Cache-Control": "no-store"
    });
    fs.createReadStream(filePath).pipe(response);
}

function normalizeCurrencyValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return Math.round(parsed * 100) / 100;
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
