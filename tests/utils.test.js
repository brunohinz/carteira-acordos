const test = require("node:test");
const assert = require("node:assert/strict");
const {
    describeGoalPace,
    buildCsvFileName,
    highlightSearchMatch,
    buildDocumentTitle,
    countByStatusFilter,
    paidDateToIso,
    isAfterToday,
    parseCurrency,
    normalizeCurrencyValue,
    formatCurrency,
    formatCurrencyInput,
    normalizeSearchText,
    normalizeContractKey,
    pluralize,
    isValidDueDate,
    escapeHtml,
    formatInputDate,
    addDays,
    normalizeOptionalDateTime,
    getDueDateTime,
    getDueDiffDays,
    isOverdue,
    wasPaidInMonth,
    wasCreatedInMonth,
    sumCurrency,
    calculateGoalProgress,
    normalizeSortOrder,
    matchesSearchTerm,
    matchesStatus,
    compareText,
    getCreatedTime,
    compareAgreementsBy,
    normalizeAgreement,
    createId,
    formatDate,
    getStatusInfo,
    escapeCsvField,
    buildAgreementsCsv,
    buildListSummary,
    buildBackup,
    BACKUP_FORMAT,
    parseBackup,
    readSavedState,
    writeSavedState
} = require("../utils.js");

test("parseCurrency entende formatos brasileiros e internacionais", () => {
    assert.equal(parseCurrency("1.234,56"), 1234.56);
    assert.equal(parseCurrency("R$ 8.420,50"), 8420.5);
    assert.equal(parseCurrency("1234.5"), 1234.5);
    assert.equal(parseCurrency("1.234"), 1234);
    assert.equal(parseCurrency(""), 0);
    assert.equal(parseCurrency("abc"), 0);
    assert.equal(parseCurrency(12.345), 12.35);
});

test("normalizeCurrencyValue zera valores invalidos ou negativos", () => {
    assert.equal(normalizeCurrencyValue(-5), 0);
    assert.equal(normalizeCurrencyValue(Number.NaN), 0);
    assert.equal(normalizeCurrencyValue("10.005"), 10.01);
});

test("formatCurrency e formatCurrencyInput usam o padrao pt-BR", () => {
    assert.equal(formatCurrency(1234.5).replace(/\s/g, " "), "R$ 1.234,50");
    assert.equal(formatCurrencyInput(1234.5), "1.234,50");
    assert.equal(formatCurrencyInput(0), "");
});

test("normalizeSearchText remove acentos e caixa", () => {
    assert.equal(normalizeSearchText("Colégio São Lucas"), "colegio sao lucas");
});

test("pluralize escolhe singular ou plural", () => {
    assert.equal(pluralize(1, "dia", "dias"), "1 dia");
    assert.equal(pluralize(0, "dia", "dias"), "0 dias");
    assert.equal(pluralize(3, "dia", "dias"), "3 dias");
});

test("isValidDueDate rejeita datas impossiveis e anos absurdos", () => {
    assert.equal(isValidDueDate("2026-10-21"), true);
    assert.equal(isValidDueDate("2026-02-30"), false);
    assert.equal(isValidDueDate("1899-01-01"), false);
    assert.equal(isValidDueDate("20260-01-01"), false);
    assert.equal(isValidDueDate(""), false);
});

test("escapeHtml neutraliza caracteres especiais", () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#039;&amp;&#039;&lt;/a&gt;");
});

test("addDays e formatInputDate geram datas no formato do input", () => {
    assert.equal(formatInputDate(addDays(new Date(2026, 0, 31), 1)), "2026-02-01");
    assert.equal(formatInputDate(addDays(new Date(2026, 2, 1), -1)), "2026-02-28");
});

test("normalizeOptionalDateTime aceita datas validas e descarta lixo", () => {
    assert.equal(normalizeOptionalDateTime("2026-10-20T12:00:00.000Z"), "2026-10-20T12:00:00.000Z");
    assert.equal(normalizeOptionalDateTime("data-invalida"), null);
    assert.equal(normalizeOptionalDateTime(""), null);
    assert.equal(normalizeOptionalDateTime(null), null);
    assert.equal(normalizeOptionalDateTime(undefined), null);
});

test("normalizeContractKey ignora espacos, acentos e caixa", () => {
    assert.equal(normalizeContractKey("CT-2026-001"), normalizeContractKey(" ct - 2026 - 001 "));
    assert.equal(normalizeContractKey("Ação 01"), "acao01");
    assert.notEqual(normalizeContractKey("CT-001"), normalizeContractKey("CT-002"));
});

test("getDueDiffDays conta dias ate o vencimento a partir de uma data fixa", () => {
    const today = new Date(2026, 9, 23, 15, 30);
    assert.equal(getDueDiffDays({ vencimento: "2026-10-23" }, today), 0);
    assert.equal(getDueDiffDays({ vencimento: "2026-10-30" }, today), 7);
    assert.equal(getDueDiffDays({ vencimento: "2026-10-20" }, today), -3);
});

test("isOverdue so considera atrasado o acordo vencido e nao pago", () => {
    const today = new Date(2026, 9, 23);
    assert.equal(isOverdue({ vencimento: "2026-10-22", pago: false }, today), true);
    assert.equal(isOverdue({ vencimento: "2026-10-22", pago: true }, today), false);
    assert.equal(isOverdue({ vencimento: "2026-10-23", pago: false }, today), false);
});

test("getDueDateTime joga vencimentos invalidos para o fim da fila", () => {
    assert.equal(getDueDateTime({ vencimento: "invalido" }), Number.MAX_SAFE_INTEGER);
});

test("matchesSearchTerm busca por contrato ou cliente sem acento e caixa", () => {
    const agreement = { numero: "CT-2026-007", cliente: "Colégio São Lucas" };
    assert.equal(matchesSearchTerm(agreement, ""), true);
    assert.equal(matchesSearchTerm(agreement, "sao lucas"), true);
    assert.equal(matchesSearchTerm(agreement, "ct-2026-007"), true);
    assert.equal(matchesSearchTerm(agreement, "Unidade Sul"), false);
});

test("matchesStatus aplica os filtros todos, em aberto, pagos e atrasados", () => {
    const today = new Date(2026, 9, 23);
    const paid = { vencimento: "2026-10-01", pago: true };
    const late = { vencimento: "2026-10-01", pago: false };
    const open = { vencimento: "2026-11-01", pago: false };
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "all", today)), [true, true, true]);
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "paid", today)), [true, false, false]);
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "open", today)), [false, true, true]);
    assert.deepEqual([paid, late, open].map((a) => matchesStatus(a, "overdue", today)), [false, true, false]);
});

test("compareText ordena contratos com numeros de forma natural", () => {
    assert.ok(compareText("CT-2", "CT-10") < 0);
    assert.equal(compareText("ct-1", "CT-1"), 0);
});

test("getCreatedTime trata criadoEm invalido como zero", () => {
    assert.equal(getCreatedTime({ criadoEm: "lixo" }), 0);
    assert.equal(getCreatedTime({ criadoEm: "2026-10-01T00:00:00.000Z" }), Date.parse("2026-10-01T00:00:00.000Z"));
});

test("compareAgreementsBy ordena por vencimento e por data de criacao", () => {
    const a = { numero: "CT-1", vencimento: "2026-10-10", criadoEm: "2026-09-01T00:00:00.000Z" };
    const b = { numero: "CT-2", vencimento: "2026-10-05", criadoEm: "2026-09-20T00:00:00.000Z" };
    const c = { numero: "CT-3", vencimento: "2026-10-05", criadoEm: "2026-08-15T00:00:00.000Z" };
    const order = (sort) => [a, b, c].sort((x, y) => compareAgreementsBy(sort, x, y)).map((x) => x.numero);
    assert.deepEqual(order("due-soon"), ["CT-2", "CT-3", "CT-1"]);
    assert.deepEqual(order("due-late"), ["CT-1", "CT-2", "CT-3"]);
    assert.deepEqual(order("created-new"), ["CT-2", "CT-1", "CT-3"]);
    assert.deepEqual(order("created-old"), ["CT-3", "CT-1", "CT-2"]);
    assert.deepEqual(order("desconhecido"), order("due-soon"));
});

test("normalizeAgreement descarta registros sem dados essenciais", () => {
    assert.equal(normalizeAgreement(null), null);
    assert.equal(normalizeAgreement({ numero: "CT-1", cliente: "X" }), null);
    assert.equal(normalizeAgreement({ numero: "", cliente: "X", vencimento: "2026-10-01" }), null);
});

test("normalizeAgreement corrige tipos e campos invalidos", () => {
    const result = normalizeAgreement({
        id: "abc",
        numero: 123,
        cliente: "Unidade Centro",
        valor: "-10",
        vencimento: "2026-10-01T12:00:00",
        criadoEm: "2026-09-01T00:00:00.000Z",
        pago: 0,
        pagoEm: "2026-09-05T00:00:00.000Z"
    });
    assert.deepEqual(result, {
        id: "abc",
        numero: "123",
        cliente: "Unidade Centro",
        valor: 0,
        vencimento: "2026-10-01",
        criadoEm: "2026-09-01T00:00:00.000Z",
        pago: false,
        pagoEm: null
    });
});

test("normalizeAgreement gera id e criadoEm quando faltam", () => {
    const result = normalizeAgreement({ numero: "CT-1", cliente: "X", vencimento: "2026-10-01", valor: 10, pago: true, pagoEm: "lixo" });
    assert.ok(result.id);
    assert.ok(!Number.isNaN(Date.parse(result.criadoEm)));
    assert.equal(result.pago, true);
    assert.equal(result.pagoEm, null);
});

test("createId gera ids diferentes", () => {
    assert.notEqual(createId(), createId());
});

test("formatDate formata datas e mostra placeholder para lixo", () => {
    assert.equal(formatDate("2026-10-05"), "05/10/2026");
    assert.equal(formatDate("invalido"), "--/--/----");
});

test("getStatusInfo classifica pago, atrasado, vence hoje e em aberto", () => {
    const today = new Date(2026, 9, 23);
    assert.equal(getStatusInfo({ pago: true, pagoEm: null, vencimento: "2026-10-01" }, today).detail, "Pagamento registrado");
    assert.equal(getStatusInfo({ pago: true, pagoEm: "2026-10-02T12:00:00", vencimento: "2026-10-01" }, today).detail, "Pago em 02/10/2026");

    const late = getStatusInfo({ pago: false, vencimento: "2026-10-22" }, today);
    assert.equal(late.className, "status-overdue");
    assert.equal(late.detail, "1 dia em atraso");

    assert.equal(getStatusInfo({ pago: false, vencimento: "2026-10-23" }, today).label, "Vence hoje");

    const open = getStatusInfo({ pago: false, vencimento: "2026-10-28" }, today);
    assert.equal(open.className, "status-open");
    assert.equal(open.detail, "Vence em 5 dias");
});

test("matchesStatus filtra vence hoje e proximos 7 dias so entre os nao pagos", () => {
    const today = new Date(2026, 9, 23);
    const dueToday = { vencimento: "2026-10-23", pago: false };
    const inWeek = { vencimento: "2026-10-30", pago: false };
    const later = { vencimento: "2026-10-31", pago: false };
    const late = { vencimento: "2026-10-22", pago: false };
    const paidToday = { vencimento: "2026-10-23", pago: true };
    const all = [dueToday, inWeek, later, late, paidToday];
    assert.deepEqual(all.map((a) => matchesStatus(a, "due-today", today)), [true, false, false, false, false]);
    assert.deepEqual(all.map((a) => matchesStatus(a, "next-7", today)), [true, true, false, false, false]);
});

test("escapeCsvField protege aspas, separador e formulas", () => {
    assert.equal(escapeCsvField("simples"), "simples");
    assert.equal(escapeCsvField('a;b "c"'), '"a;b ""c"""');
    assert.equal(escapeCsvField("=SOMA(A1)"), "'=SOMA(A1)");
    assert.equal(escapeCsvField(null), "");
});

test("buildAgreementsCsv gera cabecalho e linhas no padrao pt-BR", () => {
    const today = new Date(2026, 9, 23);
    const csv = buildAgreementsCsv([
        { numero: "CT-1", cliente: "Unidade; Centro", valor: 1234.5, vencimento: "2026-10-20", criadoEm: "2026-10-01T12:00:00", pago: false, pagoEm: null }
    ], today);
    const [header, line, total] = csv.split("\r\n");
    assert.equal(header, "Contrato;Cliente;Valor;Vencimento;Status;Gerado em;Pago em");
    assert.equal(line, 'CT-1;"Unidade; Centro";1234,50;20/10/2026;Atrasado;01/10/2026;');
    assert.equal(total, "Total;1 acordo;1234,50;;;;");
});

test("buildAgreementsCsv soma os valores na linha de total sem erro de arredondamento", () => {
    const csv = buildAgreementsCsv([
        { numero: "A", cliente: "X", valor: 0.1, vencimento: "2026-10-20", criadoEm: "2026-10-01T12:00:00", pago: false, pagoEm: null },
        { numero: "B", cliente: "Y", valor: 0.2, vencimento: "2026-10-20", criadoEm: "2026-10-01T12:00:00", pago: false, pagoEm: null }
    ], new Date(2026, 9, 23));
    assert.equal(csv.split("\r\n").pop(), "Total;2 acordos;0,30;;;;");
});

test("buildListSummary mostra o termo buscado quando houver", () => {
    assert.equal(buildListSummary(7, 7), "7 acordos encontrados de 7");
    assert.equal(buildListSummary(1, 7, "sao"), '1 acordo encontrado de 7 para "sao"');
});

test("buildListSummary soma o valor dos acordos listados", () => {
    assert.match(buildListSummary(2, 7, "", 1500.5), /^2 acordos encontrados de 7, somando R\$\s1\.500,50$/);
    assert.match(buildListSummary(1, 7, "sao", 100), /para "sao", somando R\$\s100,00$/);
    assert.equal(buildListSummary(0, 7, "x", 0), '0 acordos encontrados de 7 para "x"');
});

test("describeValueInput mostra preview formatado ou erro para valor invalido", () => {
    const { describeValueInput } = require("../utils.js");
    assert.deepEqual(describeValueInput(""), { text: "", isError: false });
    assert.deepEqual(describeValueInput("   "), { text: "", isError: false });
    assert.equal(describeValueInput("0").isError, true);
    assert.equal(describeValueInput("abc").isError, true);
    const ok = describeValueInput("1.250,5");
    assert.equal(ok.isError, false);
    assert.match(ok.text, /1\.250,50/);
});

test("wasPaidInMonth so considera pagamentos no mes de referencia", () => {
    const today = new Date(2026, 9, 26);
    assert.equal(wasPaidInMonth({ pago: true, pagoEm: new Date(2026, 9, 1, 12).toISOString() }, today), true);
    assert.equal(wasPaidInMonth({ pago: true, pagoEm: new Date(2026, 8, 30, 12).toISOString() }, today), false);
    assert.equal(wasPaidInMonth({ pago: true, pagoEm: new Date(2025, 9, 10, 12).toISOString() }, today), false);
    assert.equal(wasPaidInMonth({ pago: true, pagoEm: null }, today), false);
    assert.equal(wasPaidInMonth({ pago: false, pagoEm: new Date(2026, 9, 2).toISOString() }, today), false);
    assert.equal(wasPaidInMonth({ pago: true, pagoEm: "invalida" }, today), false);
});

test("buildBackup inclui formato, meta e apenas acordos validos", () => {
    const now = new Date("2026-10-26T13:00:00.000Z");
    const backup = buildBackup([
        { id: "a", numero: "CT-1", cliente: "Unidade", valor: 10.005, vencimento: "2026-11-01", criadoEm: "2026-10-01T00:00:00.000Z", pago: false },
        { numero: "", cliente: "Sem contrato", vencimento: "2026-11-01" }
    ], 42000, now);

    assert.equal(backup.formato, BACKUP_FORMAT);
    assert.equal(backup.versao, 1);
    assert.equal(backup.exportadoEm, "2026-10-26T13:00:00.000Z");
    assert.equal(backup.meta, 42000);
    assert.equal(backup.acordos.length, 1);
    assert.equal(backup.acordos[0].numero, "CT-1");
    assert.equal(backup.acordos[0].pagoEm, null);
});

test("parseBackup aceita o proprio backup e descarta invalidos e duplicados", () => {
    const backup = buildBackup([
        { id: "a", numero: "CT-1", cliente: "Unidade", valor: 100, vencimento: "2026-11-01", criadoEm: "2026-10-01T00:00:00.000Z" },
        { id: "b", numero: " ct - 1", cliente: "Duplicado", valor: 50, vencimento: "2026-11-02", criadoEm: "2026-10-01T00:00:00.000Z" },
        { id: "c", numero: "CT-2", cliente: "Sem valor", valor: 0, vencimento: "2026-11-02" },
        { id: "d", numero: "CT-3", cliente: "Data ruim", valor: 10, vencimento: "2026-02-31" }
    ], 50000);
    const result = parseBackup(`\uFEFF${JSON.stringify(backup)}`);

    assert.deepEqual(result.agreements.map((item) => item.numero), ["CT-1"]);
    assert.equal(result.goal, 50000);
    assert.equal(result.skipped, 3);
});

test("parseBackup aceita lista simples e rejeita arquivos invalidos", () => {
    const result = parseBackup(JSON.stringify([{ numero: "CT-9", cliente: "X", valor: 1, vencimento: "2026-12-01" }]));
    assert.equal(result.agreements.length, 1);
    assert.equal(result.goal, 0);

    assert.throws(() => parseBackup("{nao e json"), /JSON válido/);
    assert.throws(() => parseBackup(JSON.stringify({ foo: 1 })), /lista de acordos/);
    assert.throws(() => parseBackup(JSON.stringify({ formato: "outro", acordos: [] })), /desconhecido/);
});

function createMemoryStorage(initial = {}) {
    const data = { ...initial };
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value); },
        data
    };
}

test("writeSavedState e readSavedState fazem ida e volta com normalizacao", () => {
    const storage = createMemoryStorage();
    const ok = writeSavedState(storage, "k", {
        agreements: [{ id: "a", numero: "CT-1", cliente: "U", valor: 10, vencimento: "2026-11-01", criadoEm: "2026-10-01T00:00:00.000Z", pago: false, pagoEm: "x" }],
        sortOrder: "created-new",
        statusFilter: "next-7",
        search: "  sao  ",
        goal: 50000,
        extra: "nao deve ser salvo"
    });

    assert.equal(ok, true);
    assert.equal(JSON.parse(storage.data.k).extra, undefined);

    const saved = readSavedState(storage, "k", 42000);
    assert.equal(saved.agreements.length, 1);
    assert.equal(saved.agreements[0].pagoEm, null);
    assert.equal(saved.sortOrder, "created-new");
    assert.equal(saved.statusFilter, "next-7");
    assert.equal(saved.search, "sao");
    assert.equal(saved.goal, 50000);
});

test("readSavedState devolve null para vazio/corrompido e usa defaults invalidos", () => {
    assert.equal(readSavedState(createMemoryStorage(), "k", 42000), null);
    assert.equal(readSavedState(createMemoryStorage({ k: "{quebrado" }), "k", 42000), null);
    assert.equal(readSavedState(createMemoryStorage({ k: JSON.stringify({ foo: 1 }) }), "k", 42000), null);

    const saved = readSavedState(createMemoryStorage({ k: JSON.stringify({ agreements: [], sortOrder: "x", statusFilter: "y", search: 5, goal: -1 }) }), "k", 42000);
    assert.deepEqual(saved, { agreements: [], sortOrder: "due-soon", statusFilter: "all", search: "", goal: 42000 });
});

test("writeSavedState devolve false quando o armazenamento recusa", () => {
    const storage = { setItem: () => { throw new Error("QuotaExceededError"); } };
    assert.equal(writeSavedState(storage, "k", { agreements: [] }), false);
});

test("describeGoalPace mostra quanto falta e o ritmo diario ate o fim do mes", () => {
    const today = new Date(2026, 9, 27); // 27/10: faltam 5 dias contando hoje
    assert.equal(describeGoalPace(30000, 40000, today), "Faltam R$\u00a010.000,00, cerca de R$\u00a02.000,00 por dia em 5 dias");
    assert.equal(describeGoalPace(39000, 40000, new Date(2026, 9, 31)), "Faltam R$\u00a01.000,00, hoje é o último dia do mês");
    assert.equal(describeGoalPace(40000, 40000, today), "Meta do mês batida!");
    assert.equal(describeGoalPace(100, 0, today), "");
});

test("wasCreatedInMonth so considera acordos gerados no mes de referencia", () => {
    const today = new Date(2026, 9, 28);
    assert.equal(wasCreatedInMonth({ criadoEm: new Date(2026, 9, 1, 9).toISOString() }, today), true);
    assert.equal(wasCreatedInMonth({ criadoEm: new Date(2026, 8, 30, 9).toISOString() }, today), false);
    assert.equal(wasCreatedInMonth({ criadoEm: new Date(2025, 9, 15, 9).toISOString() }, today), false);
    assert.equal(wasCreatedInMonth({ criadoEm: "lixo" }, today), false);
    assert.equal(wasCreatedInMonth({}, today), false);
});

test("sumCurrency soma em centavos sem erro de ponto flutuante", () => {
    assert.equal(sumCurrency([]), 0);
    assert.equal(sumCurrency([{ valor: 0.1 }, { valor: 0.2 }]), 30);
    assert.equal(sumCurrency([{ valor: 8420.5 }, { valor: 2210.35 }]), 1063085);
});

test("calculateGoalProgress limita a 100% e nunca devolve NaN", () => {
    assert.equal(calculateGoalProgress(21000, 42000), 50);
    assert.equal(calculateGoalProgress(50000, 42000), 100);
    assert.equal(calculateGoalProgress(0, 42000), 0);
    assert.equal(calculateGoalProgress(1000, 0), 0);
    assert.equal(calculateGoalProgress(1000, undefined), 0);
    assert.equal(calculateGoalProgress(Number.NaN, 42000), 0);
});

test("compareAgreementsBy ordena por maior e menor valor, desempatando pelo contrato", () => {
    const list = [
        { numero: "CT-2", valor: 500 },
        { numero: "CT-1", valor: 1200.5 },
        { numero: "CT-3", valor: 500 }
    ];
    const byHigh = [...list].sort((a, b) => compareAgreementsBy("value-high", a, b)).map((item) => item.numero);
    const byLow = [...list].sort((a, b) => compareAgreementsBy("value-low", a, b)).map((item) => item.numero);
    assert.deepEqual(byHigh, ["CT-1", "CT-2", "CT-3"]);
    assert.deepEqual(byLow, ["CT-2", "CT-3", "CT-1"]);
    assert.equal(normalizeSortOrder("value-high"), "value-high");
});

test("matchesSearchTerm encontra o acordo pelo valor em formatos comuns", () => {
    const agreement = { numero: "CT-2026-001", cliente: "Unidade Centro", valor: 8420.5 };
    assert.equal(matchesSearchTerm(agreement, "8.420,50"), true);
    assert.equal(matchesSearchTerm(agreement, "8420"), true);
    assert.equal(matchesSearchTerm(agreement, "8420.50"), true);
    assert.equal(matchesSearchTerm(agreement, "9999"), false);
    assert.equal(matchesSearchTerm({ numero: "CT-1", cliente: "Sem valor" }, "0,00"), false);
});

test("isGoalMet so considera batida quando o pago alcanca a meta", () => {
    const { isGoalMet, calculateGoalProgress } = require("../utils.js");
    assert.equal(isGoalMet(42000, 42000), true);
    assert.equal(isGoalMet(50000, 42000), true);
    assert.equal(calculateGoalProgress(41850, 42000), 100);
    assert.equal(isGoalMet(41850, 42000), false);
    assert.equal(isGoalMet(100, 0), false);
});

test("paidDateToIso mantém o dia escolhido e rejeita data inválida", () => {
    const iso = paidDateToIso("2026-10-05");
    assert.equal(formatInputDate(new Date(iso)), "2026-10-05");
    assert.equal(paidDateToIso("2026-02-30"), null);
    assert.equal(paidDateToIso(""), null);
});

test("isAfterToday compara só o dia", () => {
    const today = new Date(2026, 9, 30, 23, 59);
    assert.equal(isAfterToday("2026-10-30", today), false);
    assert.equal(isAfterToday("2026-10-31", today), true);
    assert.equal(isAfterToday("2026-09-01", today), false);
});

test("countByStatusFilter conta cada opção do filtro de status", () => {
    const today = new Date(2026, 9, 30);
    const agreements = [
        { valor: 1, vencimento: "2026-10-29", pago: false },
        { valor: 1, vencimento: "2026-10-30", pago: false },
        { valor: 1, vencimento: "2026-11-03", pago: false },
        { valor: 1, vencimento: "2026-10-01", pago: true, pagoEm: "2026-10-02T12:00:00.000Z" }
    ];
    const counts = countByStatusFilter(agreements, today);
    assert.equal(counts.all, 4);
    assert.equal(counts.paid, 1);
    assert.equal(counts.open, 3);
    assert.equal(counts.overdue, 1);
    assert.equal(counts["due-today"], 1);
    assert.equal(counts["next-7"] >= 1, true);
});

test("buildDocumentTitle mostra atrasados só quando existem", () => {
    assert.equal(buildDocumentTitle("Carteira", 0), "Carteira");
    assert.equal(buildDocumentTitle("Carteira", 1), "(1 atrasado) Carteira");
    assert.equal(buildDocumentTitle("Carteira", 3), "(3 atrasados) Carteira");
});

test("highlightSearchMatch marca o trecho ignorando acentos e escapa o resto", () => {
    assert.equal(highlightSearchMatch("Colégio São Lucas", "sao"), "Colégio <mark>São</mark> Lucas");
    assert.equal(highlightSearchMatch("Colegio", "COLÉ"), "<mark>Cole</mark>gio");
    assert.equal(highlightSearchMatch("<b>Unidade</b>", "uni"), "&lt;b&gt;<mark>Uni</mark>dade&lt;/b&gt;");
    assert.equal(highlightSearchMatch("CT-1 e ct-1", "ct-1"), "<mark>CT-1</mark> e <mark>ct-1</mark>");
    assert.equal(highlightSearchMatch("Unidade", ""), "Unidade");
    assert.equal(highlightSearchMatch("Unidade", "xyz"), "Unidade");
});

test("buildCsvFileName indica filtro e busca no nome do arquivo", () => {
    const today = new Date(2026, 9, 30);
    assert.equal(buildCsvFileName("all", "", today), "carteira-acordos-2026-10-30.csv");
    assert.equal(buildCsvFileName("overdue", "", today), "carteira-acordos-atrasados-2026-10-30.csv");
    assert.equal(buildCsvFileName("next-7", "  centro ", today), "carteira-acordos-proximos-7-dias-busca-2026-10-30.csv");
    assert.equal(buildCsvFileName("desconhecido", "", today), "carteira-acordos-2026-10-30.csv");
});
