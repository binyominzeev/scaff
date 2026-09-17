import { writeFile, modelToResourceName } from "./common.mjs";

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Resolve which model (if any) acts as "the current record" for interpolation/prefill. */
function resolvePrimaryModel(screen) {
  const dataOp = screen.elements.find(
    (e) => e.kind === "data" && ["findUnique", "singleton"].includes(e.operation?.op)
  );
  if (dataOp) return { model: dataOp.operation.model, paramName: dataOp.operation.paramName };

  const updateBtn = screen.elements.find((e) => e.kind === "button" && e.operation?.op === "update");
  if (updateBtn) return { model: updateBtn.operation.model, paramName: updateBtn.operation.paramName };

  return null;
}

/** Replace {field} tokens with `${params.field}` or `${<recordVar>.field}`, falling back to literal text. */
function interpolate(text, { params, hasRecord, recordVar = "record", fallbackVar = null }, warnings, screenRoute) {
  return text.replace(/\{(\w+)\}/g, (full, field) => {
    if (params.includes(field)) return "${params." + field + "}";
    if (hasRecord && fallbackVar) return "${" + recordVar + "?." + field + " ?? " + fallbackVar + "?." + field + " ?? \"\"}";
    if (hasRecord) return "${" + recordVar + "?." + field + " ?? \"\"}";
    if (fallbackVar) return "${" + fallbackVar + "?." + field + " ?? \"\"}";
    warnings.push(
      `⚠️  "${screenRoute}": "{${field}}" nem oldható fel (nincs sem route paraméter, sem elsődleges rekord) — szó szerint jelenik meg.`
    );
    return field;
  });
}

function buildRowLinkArrow(template) {
  if (!template) return null;
  const body = template.replace(/\{(\w+)\}/g, (_, f) => "${row." + f + "}");
  return "(row) => `" + body + "`";
}

function allocateVarName(base, usedNames) {
  let name = base;
  let suffix = 2;
  while (usedNames.has(name)) name = `${base}${suffix++}`;
  usedNames.add(name);
  return name;
}

/**
 * `operation.paramName` may either be a real dynamic route segment (e.g. "/cards/[id]")
 * or a session-derived identifier that was never declared as a route param (e.g. the
 * `{userId}` in `UserPreference.findUnique({userId})` on a static "/" screen). Resolve it
 * to the right JS expression instead of blindly emitting `params.<name>`, which would
 * reference an undefined variable and crash at runtime.
 */
function resolveParamExpr(paramName, screenCtx, accessorName = "params") {
  const displayParamName = paramName || "param";
  if (!paramName) {
    screenCtx.warnings.push(
      `⚠️  "${screenCtx.screenRoute}": a műveletből hiányzik az azonosító paraméter — adj meg valódi route-paramétert, például {id}. "MISSING_PARAM" placeholder kerül a generált kódba.`
    );
    return '"MISSING_PARAM"';
  }
  if (screenCtx.screenParams.includes(paramName)) {
    return `${accessorName}.${paramName}`;
  }
  if (screenCtx.authEnabled) {
    screenCtx.needsCurrentUserId = true;
    return "currentUserId";
  }
  screenCtx.warnings.push(
    `⚠️  "${screenCtx.screenRoute}": "{${displayParamName}}" nem route paraméter és auth sincs bekapcsolva — "MISSING_${displayParamName.toUpperCase()}" placeholder kerül a lekérdezésbe, ezt kézzel kell pótolni.`
  );
  return `"MISSING_${displayParamName.toUpperCase()}"`;
}

function derivePrismaCall(operation, screenCtx) {
  const varModel = lowerFirst(operation.model);
  if (operation.op === "findMany" && operation.filterField) {
    const paramExpr = resolveParamExpr(operation.paramName, screenCtx);
    return `await prisma.${varModel}.findMany({ where: { ${operation.filterField}: ${paramExpr} } })`;
  }
  if (operation.op === "findMany") {
    return `await prisma.${varModel}.findMany()`;
  }
  if (operation.op === "findUnique") {
    const paramExpr = resolveParamExpr(operation.paramName, screenCtx);
    return `await prisma.${varModel}.findUnique({ where: { id: ${paramExpr} } })`;
  }
  if (operation.op === "singleton") {
    return `await prisma.${varModel}.findFirst()`;
  }
  return null;
}

function inputComponentTag(input) {
  return input.type === "textarea" ? "TextArea" : "TextInput";
}

function buildFormFieldsJsx(inputs, { valuesVar = "values" } = {}) {
  return inputs
    .map((input) => {
      const Tag = inputComponentTag(input);
      const typeAttr = input.type !== "textarea" ? ` type="${input.type}"` : "";
      const requiredAttr = input.required ? " required" : "";
      const placeholderAttr = input.placeholder ? ` placeholder="${input.placeholder}"` : "";
      return `        <${Tag} label="${input.name}"${typeAttr}${requiredAttr}${placeholderAttr} value={${valuesVar}.${input.name}} onChange={(e) => update("${input.name}", e.target.value)} />`;
    })
    .join("\n");
}

function buildSelectFieldsJsx(selects, optionsByName) {
  return selects
    .map((select) => `        <Select label="${select.name}" value={${optionsByName.valuesVar}.${select.name}} options={${optionsByName[select.name]}} valueField="${select.valueField}" labelField="${select.labelField}"${select.required ? " required" : ""} onChange={(value) => update("${select.name}", value)} />`)
    .join("\n");
}

function initialValuesObjectLiteral(inputs, sourceVar) {
  return inputs
    .map((i) => `${i.name}: ${sourceVar} ? ((${sourceVar}.${i.name} as string | null | undefined) ?? "") : ""`)
    .join(", ");
}

/** Route folder path is literally the Next.js App Router path (already uses [param] syntax). */
function screenFolder(route) {
  return `app${route === "/" ? "" : route}`;
}

function staticParentPath(route) {
  const parts = route.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/");
}

/**
 * After a create action, we redirect somewhere sensible to view the result. The literal
 * parent path (e.g. "/cards/new" -> "/cards") isn't necessarily a real generated screen
 * (e.g. the card list actually lives on "/"), so walk up until we hit a route that
 * actually exists, falling back to "/" which is always present.
 */
function resolveCreateRedirectTarget(route, screenRoutes) {
  let candidate = staticParentPath(route);
  while (candidate !== "/" && !screenRoutes.has(candidate)) {
    candidate = staticParentPath(candidate);
  }
  return screenRoutes.has(candidate) ? candidate : "/";
}

/** First static path segment, used to guess the REST resource root, e.g. "/people/[id]/edit" -> "people". */
function firstStaticSegment(route) {
  return route.split("/").filter(Boolean)[0] || "";
}

export function generateNextjsUiScreens(outDir, spec, warnings) {
  const authEnabled = Boolean(spec.frontMatter?.auth?.enabled);
  const screenRoutes = new Set(spec.screens.map((s) => s.route));
  for (const screen of spec.screens) {
    const primary = resolvePrimaryModel(screen);
    const hasRecord = Boolean(primary);

    const formButton = screen.elements.find(
      (e) => e.kind === "button" && e.operation && ["create", "update", "updateSingleton"].includes(e.operation.op)
    );
    const deleteButton = screen.elements.find((e) => e.kind === "button" && e.operation?.op === "delete");
    const tableEls = screen.elements.filter((e) => e.kind === "table");
    const listEls = screen.elements.filter((e) => e.kind === "list");
    const interactiveEls = screen.elements.filter((e) => e.kind === "interactive-list");
    const dataEls = screen.elements.filter((e) => e.kind === "data");
    const inputEls = screen.elements.filter((e) => e.kind === "input");
    const selectEls = screen.elements.filter((e) => e.kind === "select");
    const textEls = screen.elements.filter((e) => e.kind === "text");
    const navButtons = screen.elements.filter((e) => e.kind === "button" && e.isNavigation);
    const linkEls = screen.elements.filter((e) => e.kind === "link");

    if (formButton) {
      generateFormScreen(outDir, screen, formButton, inputEls, selectEls, warnings, authEnabled, screenRoutes);
    } else {
      generateReadScreen(
        outDir,
        screen,
        { primary, hasRecord, tableEls, listEls, interactiveEls, dataEls, textEls, navButtons, linkEls, deleteButton },
        warnings,
        authEnabled
      );
    }
  }
}

function generateFormScreen(outDir, screen, formButton, inputEls, selectEls, warnings, authEnabled, screenRoutes) {
  const { model, op } = formButton.operation;
  const resource = modelToResourceName(model);
  const folder = screenFolder(screen.route);
  const paramsType = screen.params.length
    ? `{ ${screen.params.map((p) => `${p}: string`).join("; ")} }`
    : null;

  if (op === "create") {
    if (inputEls.length === 0 && selectEls.length === 0) {
      throw new Error(`A ${screen.route} create formhoz legalább egy [Input: ...] mező szükséges.`);
    }
    const heading = interpolate(screen.heading || "Új elem", { params: screen.params, hasRecord: false }, warnings, screen.route);
    const redirectTarget = resolveCreateRedirectTarget(screen.route, screenRoutes);
    const fields = buildFormFieldsJsx(inputEls);
    const initialValues = [...inputEls, ...selectEls].map((i) => `${i.name}: ""`).join(", ");
    const optionFetches = selectEls.map((select) => `  const ${select.name}Options = await prisma.${lowerFirst(select.options.model)}.findMany();`).join("\n");
    const selectFields = buildSelectFieldsJsx(selectEls, Object.assign({ valuesVar: "values" }, Object.fromEntries(selectEls.map((select) => [select.name, `${select.name}Options`]))));

    if (selectEls.length > 0) {
      const optionFetches = selectEls
        .map((select) => `  const ${select.name}Options = await prisma.${lowerFirst(select.options.model)}.findMany();`)
        .join("\n");
      const optionProps = selectEls.map((select) => `${select.name}Options`).join(", ");
      const selectFields = buildSelectFieldsJsx(
        selectEls,
        Object.assign({ valuesVar: "values" }, Object.fromEntries(selectEls.map((select) => [select.name, `${select.name}Options`])))
      );
      const allInitialValues = [...inputEls, ...selectEls].map((input) => `${input.name}: ""`).join(", ");
      const clientFields = `${buildFormFieldsJsx(inputEls)}\n${selectFields}`;
      const clientFormName = `${model}CreateForm`;
      const clientContent = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextInput, TextArea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function ${clientFormName}({ ${optionProps} }: { ${selectEls.map((select) => `${select.name}Options: Array<Record<string, unknown>>`).join("; ")} }) {
  const router = useRouter();
  const [values, setValues] = useState({ ${allInitialValues} });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) { setValues((current) => ({ ...current, [field]: value })); }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/${resource}", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "A mentés nem sikerült.");
      setPending(false);
      return;
    }
    router.push("${redirectTarget}");
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">{\`${heading}\`}</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
${clientFields}
        <div className="flex items-center gap-4"><Button type="submit" disabled={pending}>{pending ? "Mentés…" : "Mentés"}</Button><Link href="${redirectTarget}" className="text-sm text-slate-600 hover:underline">Mégse</Link></div>
      </form>
    </main>
  );
}
`;
      writeFile(outDir, `${folder}/form.tsx`, clientContent);
      writeFile(outDir, `${folder}/page.tsx`, `import { prisma } from "@/lib/prisma";
import { ${clientFormName} } from "./form";

export default async function Page() {
${optionFetches}
  return <${clientFormName} ${selectEls.map((select) => `${select.name}Options={${select.name}Options}`).join(" ")} />;
}
`);
      return;
    }

    const content = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextInput, TextArea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Page() {
  const router = useRouter();
  const [values, setValues] = useState({ ${initialValues} });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/${resource}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "A mentés nem sikerült.");
      setPending(false);
      return;
    }
    router.push("${redirectTarget}");
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">{\`${heading}\`}</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
${fields}
${selectFields}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Mentés…" : "Mentés"}
          </Button>
          <Link href="${redirectTarget}" className="text-sm text-slate-600 hover:underline">
            Mégse
          </Link>
        </div>
      </form>
    </main>
  );
}
`;
    writeFile(outDir, `${folder}/page.tsx`, content);
    return;
  }

  // op === "update" -> server page fetches record, client form component does the editing
  const paramName = formButton.operation.paramName;
  const varModel = lowerFirst(model);
  const formComponentName = `${model}EditForm`;
  if (inputEls.length === 0 && selectEls.length === 0) {
    throw new Error(`A ${screen.route} update formhoz legalább egy [Input: ...] mező szükséges.`);
  }
  const detailRoute = firstStaticSegment(screen.route);
  const isRouteParam = screen.params.includes(paramName);

  const screenCtx = { screenParams: screen.params, authEnabled, warnings, screenRoute: screen.route, needsCurrentUserId: false };
  const idExpr = op === "updateSingleton"
    ? "record.id"
    : resolveParamExpr(paramName, screenCtx, "resolvedParams");
  const currentUserIdLine = screenCtx.needsCurrentUserId ? `  const currentUserId = await getCurrentUserId();\n` : "";
  const authImport = screenCtx.needsCurrentUserId ? `import { getCurrentUserId } from "@/lib/auth";\n` : "";
  const paramsPreamble = op === "updateSingleton"
    ? `export default async function Page() {\n  const record = await prisma.${varModel}.findFirst();\n`
    : isRouteParam
    ? `export default async function Page({ params }: { params: Promise<${paramsType}> }) {\n  const resolvedParams = await params;\n`
    : `export default async function Page() {\n`;

  const serverPage = `import { prisma } from "@/lib/prisma";
${authImport}import { ${formComponentName} } from "./form";

${paramsPreamble}${op === "updateSingleton" ? "" : currentUserIdLine + `  const record = await prisma.${varModel}.findUnique({ where: { id: ${idExpr} } });\n`}

  if (!record) {
    return <p className="p-8 text-slate-500">Nem található.</p>;
  }

  return <${formComponentName} initialData={record} />;
}
`;
  writeFile(outDir, `${folder}/page.tsx`, serverPage);

  const heading = interpolate(screen.heading || "Szerkesztés", { params: [], hasRecord: true, recordVar: "initialData" }, warnings, screen.route);
  const fields = buildFormFieldsJsx(inputEls);
  const initialValues = [...inputEls, ...selectEls].map((input) => `${input.name}: initialData ? ((initialData.${input.name} as string | null | undefined) ?? "") : ""`).join(", ");
  const optionFetches = selectEls.map((select) => `  const ${select.name}Options = await prisma.${lowerFirst(select.options.model)}.findMany();`).join("\n");
  const selectFields = buildSelectFieldsJsx(selectEls, Object.assign({ valuesVar: "values" }, Object.fromEntries(selectEls.map((select) => [select.name, `${select.name}Options`]))));
  const updateOptionProps = selectEls.map((select) => `${select.name}Options`).join(", ");
  const updateOptionTypes = selectEls.map((select) => `${select.name}Options: Array<Record<string, unknown>>`).join("; ");
  const updateFormName = formComponentName;

  const formContent = `"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextInput, TextArea } from "@/components/ui/input";
${selectEls.length ? `import { Select } from "@/components/ui/select";` : ""}
import { Button } from "@/components/ui/button";

type InitialData = { id: string } & Record<string, unknown>;

export function ${formComponentName}({ initialData${selectEls.length ? `, ${updateOptionProps}` : ""} }: { initialData: InitialData${selectEls.length ? `; ${updateOptionTypes}` : ""} }) {
  const router = useRouter();
  const [values, setValues] = useState({ ${initialValues} });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch(\`/api/${resource}/\${initialData.id}\`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "A mentés nem sikerült.");
      setPending(false);
      return;
    }
    router.push("${resolveCreateRedirectTarget(screen.route, screenRoutes)}");
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">{\`${heading}\`}</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
${fields}
${selectFields}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Mentés…" : "Mentés"}
          </Button>
          <Link href={\`/${detailRoute}/\${initialData.id}\`} className="text-sm text-slate-600 hover:underline">
            Mégse
          </Link>
        </div>
      </form>
    </main>
  );
}
`;
  writeFile(outDir, `${folder}/form.tsx`, formContent);

  if (selectEls.length > 0) {
    writeFile(outDir, `${folder}/page.tsx`, `import { prisma } from "@/lib/prisma";
import { ${updateFormName} } from "./form";

export default async function Page() {
${optionFetches}
  const record = await prisma.${varModel}.findFirst();
  if (!record) return <p className="p-8 text-slate-500">Nem található.</p>;
  return <${updateFormName} initialData={record} ${selectEls.map((select) => `${select.name}Options={${select.name}Options}`).join(" ")} />;
}
`);
  }
}

function generateReadScreen(outDir, screen, ctx, warnings, authEnabled) {
  const { primary, hasRecord, tableEls, listEls, interactiveEls, dataEls, textEls, navButtons, linkEls, deleteButton } = ctx;
  const folder = screenFolder(screen.route);
  const hasParams = screen.params.length > 0;
  const paramsType = hasParams ? `{ ${screen.params.map((p) => `${p}: string`).join("; ")} }` : null;

  const screenCtx = { screenParams: screen.params, authEnabled, warnings, screenRoute: screen.route, needsCurrentUserId: false };
  const fetchLines = [];
  const tableVarNames = [];
  const listVarNames = [];
  const interactiveVarNames = [];
  const usedDataNames = new Set();
  let primaryRecordAssigned = false;

  for (const dataEl of dataEls) {
    const call = derivePrismaCall(dataEl.operation, screenCtx);
    if (call) {
      const isRecordOperation = ["findUnique", "singleton"].includes(dataEl.operation.op);
      let varName = allocateVarName(`${lowerFirst(dataEl.operation.model)}Rows`, usedDataNames);
      if (isRecordOperation) {
        if (primary && !primaryRecordAssigned && dataEl.operation.model === primary.model) {
          primaryRecordAssigned = true;
          usedDataNames.delete(varName);
          varName = "record";
          usedDataNames.add(varName);
        } else {
          usedDataNames.delete(varName);
          varName = allocateVarName(`${lowerFirst(dataEl.operation.model)}Record`, usedDataNames);
        }
      }
      const valueType = isRecordOperation ? "Record<string, unknown> | null" : "Array<Record<string, unknown>>";
      fetchLines.push(`  const ${varName} = (${call}) as ${valueType};`);
    }
  }

  for (const tableEl of tableEls) {
    const call = derivePrismaCall(tableEl.operation, screenCtx);
    const varName = allocateVarName(`${lowerFirst(tableEl.operation.model)}Rows`, usedDataNames);
    tableVarNames.push(varName);
    if (call) fetchLines.push(`  const ${varName} = (${call}) as Array<Record<string, unknown>>;`);
  }

  for (const listEl of listEls) {
    const call = derivePrismaCall(listEl.operation, screenCtx);
    const varName = allocateVarName(`${lowerFirst(listEl.operation.model)}Rows`, usedDataNames);
    listVarNames.push(varName);
    if (call) fetchLines.push(`  const ${varName} = (${call}) as Array<Record<string, unknown>>;`);
  }

  for (const interactiveEl of interactiveEls) {
    const call = derivePrismaCall(interactiveEl.operation, screenCtx);
    const varName = allocateVarName(`${lowerFirst(interactiveEl.operation.model)}Rows`, usedDataNames);
    interactiveVarNames.push(varName);
    if (call) fetchLines.push(`  const ${varName} = (${call}) as Array<Record<string, unknown>>;`);
  }

  const needsRecordButNoDataToken = hasRecord && dataEls.length === 0;
  if (needsRecordButNoDataToken && primary) {
    // update-button-implied prefill fetch isn't relevant on read screens; this path
    // only fires if a screen references {field} without an explicit [Data:] token
    // and without a form — treat primary the same way for consistency.
    const varModel = lowerFirst(primary.model);
    const paramExpr = resolveParamExpr(primary.paramName, screenCtx);
    fetchLines.unshift(`  const record = (await prisma.${varModel}.findUnique({ where: { id: ${paramExpr} } })) as Record<string, unknown> | null;`);
  }

  if (screenCtx.needsCurrentUserId) {
    fetchLines.unshift(`  const currentUserId = await getCurrentUserId();`);
  }

  const fallbackVar = listVarNames[0] ? `${listVarNames[0]}[0]` : null;
  const headingText = interpolate(screen.heading || "", { params: screen.params, hasRecord, fallbackVar }, warnings, screen.route);

  const bodyParts = [];
  if (headingText) {
    bodyParts.push(`      <h1 className="text-2xl font-bold">{\`${headingText}\`}</h1>`);
  }
  for (const t of textEls) {
    const interpolated = interpolate(t.value, { params: screen.params, hasRecord, fallbackVar }, warnings, screen.route);
    bodyParts.push(`      <p className="mt-2 text-slate-600">{\`${interpolated}\`}</p>`);
  }

  let tableIndex = 0;
  for (const tableEl of tableEls) {
    const varName = tableVarNames[tableIndex++];
    const rowLinkArrow = buildRowLinkArrow(tableEl.rowLink);
    const columnsLiteral = JSON.stringify(tableEl.columns);
    bodyParts.push(
      `      <div className="mt-6">`,
      `        <DataTable columns={${columnsLiteral}} rows={${varName}} ${rowLinkArrow ? `rowLink={${rowLinkArrow}}` : ""} />`,
      `      </div>`
    );
  }

  let listIndex = 0;
  for (const listEl of listEls) {
    const varName = listVarNames[listIndex++];
    bodyParts.push(
      `      <div className="mt-6">`,
      `        <DataList rows={${varName}} />`,
      `      </div>`
    );
  }

  let interactiveIndex = 0;
  for (const interactiveEl of interactiveEls) {
    const varName = interactiveVarNames[interactiveIndex++];
    bodyParts.push(
      `      <InteractiveList rows={${varName}} primaryField="${interactiveEl.primaryField}" secondaryField="${interactiveEl.secondaryField}" revealLabel="${interactiveEl.revealLabel}" nextLabel="${interactiveEl.nextLabel}" />`
    );
  }

  for (const link of linkEls) {
    const href = interpolate(link.target, { params: screen.params, hasRecord }, warnings, screen.route);
    bodyParts.push(
      `      <Link href={\`${href}\`} className="mt-4 inline-block text-sm text-slate-600 hover:underline">`,
      `        ${link.label}`,
      `      </Link>`
    );
  }

  for (const btn of navButtons) {
    const href = interpolate(btn.action, { params: screen.params, hasRecord }, warnings, screen.route);
    bodyParts.push(
      `      <div className="mt-4">`,
      `        <Button href={\`${href}\`}>${btn.label}</Button>`,
      `      </div>`
    );
  }

  if (deleteButton && primary) {
    const resource = modelToResourceName(deleteButton.operation.model);
    bodyParts.push(
      `      <div className="mt-4">`,
      `        <DeleteButton resource="${resource}" id={record.id as string} />`,
      `      </div>`
    );
  }

  const usesLink = linkEls.length > 0 || navButtons.length > 0;
  const usesTable = tableEls.length > 0;
  const usesList = listEls.length > 0;
  const usesInteractive = interactiveEls.length > 0;
  const usesButton = navButtons.length > 0;
  const usesDeleteButton = Boolean(deleteButton && primary);

  const imports = [`import { prisma } from "@/lib/prisma";`];
  if (usesLink) imports.push(`import Link from "next/link";`);
  if (usesTable) imports.push(`import { DataTable } from "@/components/ui/table";`);
  if (usesList) imports.push(`import { DataList } from "@/components/ui/list";`);
  if (usesInteractive) imports.push(`import { InteractiveList } from "@/components/ui/interactive-list";`);
  if (usesButton) imports.push(`import { Button } from "@/components/ui/button";`);
  if (usesDeleteButton) imports.push(`import { DeleteButton } from "@/components/ui/delete-button";`);
  if (screenCtx.needsCurrentUserId) imports.push(`import { getCurrentUserId } from "@/lib/auth";`);

  const fnSignature = hasParams
    ? `export default async function Page({ params: paramsPromise }: { params: Promise<${paramsType}> }) {\n  const params = await paramsPromise;\n`
    : `export default async function Page() {\n`;

  // findUnique can legitimately return null (e.g. no record for the current dev test user yet),
  // so any screen that renders record fields must guard against it before dereferencing them.
  const recordGuard = hasRecord ? `\n  if (!record) {\n    return <p className="p-8 text-slate-500">Nem található.</p>;\n  }\n` : "";

  const content = `${imports.join("\n")}

${fnSignature}${fetchLines.join("\n")}${fetchLines.length ? "\n" : ""}${recordGuard}
  return (
    <main className="p-8">
${bodyParts.join("\n")}
    </main>
  );
}
`;
  writeFile(outDir, `${folder}/page.tsx`, content);
}
