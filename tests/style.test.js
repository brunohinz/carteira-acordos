// Smoke test do CSS: o modo escuro precisa redefinir todas as variáveis do tema claro,
// e toda variável usada com var(--x) precisa existir.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// Pega o primeiro bloco ":root { ... }" a partir de "from" (as variáveis não têm chaves aninhadas).
function rootVariables(from) {
    const start = css.indexOf(":root", from);
    const open = css.indexOf("{", start);
    const close = css.indexOf("}", open);
    const vars = new Map();

    for (const match of css.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        vars.set(match[1], match[2].trim());
    }

    return vars;
}

const darkStart = css.indexOf("prefers-color-scheme: dark");
const light = rootVariables(0);
const dark = rootVariables(darkStart);

// Fundo do botão principal (texto branco): o mesmo azul funciona nos dois temas, de propósito.
const SHARED_BETWEEN_THEMES = new Set(["--primary", "--primary-hover"]);

test("modo escuro redefine todas as variáveis de cor do tema claro", () => {
    assert.ok(darkStart > 0, "bloco prefers-color-scheme: dark não encontrado");
    const missing = [...light.keys()].filter((name) => !dark.has(name) && !SHARED_BETWEEN_THEMES.has(name));
    assert.deepEqual(missing, []);
});

test("toda variável usada no CSS está definida no tema claro", () => {
    const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]));
    const undefinedVars = [...used].filter((name) => !light.has(name));
    assert.deepEqual(undefinedVars, []);
});

test("theme-color do modo escuro acompanha o fundo escuro", () => {
    const meta = html.match(/<meta name="theme-color" content="([^"]+)" media="\(prefers-color-scheme: dark\)">/);
    assert.ok(meta, "meta theme-color do modo escuro não encontrada");
    assert.equal(meta[1].toLowerCase(), dark.get("--bg").toLowerCase());
});

test("impressão oculta diálogos e o skip link", () => {
    const css = read("style.css");
    const printBlock = css.split("@media print")[1] || "";
    assert.match(printBlock, /\.app-dialog/);
    assert.match(printBlock, /\.skip-link/);
});
