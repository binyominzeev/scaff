import { writeFile, humanizeSlug } from "./common.mjs";
import { resolveDesignLook, resolveLayoutArchetype } from "../designCatalog.mjs";

/**
 * Writes a small, fixed set of presentational UI primitives into components/ui/.
 * These are NOT generated per-project-content — the same components every scaffold
 * gets, so the ASCII wireframe tokens have something consistent to compile down to —
 * but their Tailwind classes and DataTable/DataList/InteractiveList rendering strategy
 * now vary with the spec's optional `design.look` / `design.components` choice.
 */
export function writeUiKit(outDir, { framework, navItems, projectName, authEnabled, designLook, designComponents }) {
  const isNext = framework === "nextjs-app-router";
  const linkImport = isNext ? `import Link from "next/link";` : `import { Link } from "react-router-dom";`;
  const linkProp = isNext ? "href" : "to";
  const t = resolveDesignLook(designLook);
  const archetype = resolveLayoutArchetype(designComponents);

  // ---- button.tsx ----
  writeFile(
    outDir,
    "components/ui/button.tsx",
    `${linkImport}\nimport type { ButtonHTMLAttributes, ReactNode } from "react";\n\ntype ButtonProps = {\n  href?: string;\n  children: ReactNode;\n  variant?: "primary" | "ghost" | "danger";\n} & ButtonHTMLAttributes<HTMLButtonElement>;\n\nconst variantClass: Record<string, string> = {\n  primary: "${t.button.primary}",\n  ghost: "${t.button.ghost}",\n  danger: "${t.button.danger}",\n};\n\nconst base = "${t.button.base}";\n\nexport function Button({ href, children, variant = "primary", className, ...props }: ButtonProps) {\n  const classes = \`\${base} \${variantClass[variant]} \${className ?? ""}\`;\n  if (href) {\n    return (\n      <Link ${linkProp}={href} className={classes}>\n        {children}\n      </Link>\n    );\n  }\n  return (\n    <button className={classes} {...props}>\n      {children}\n    </button>\n  );\n}\n`
  );

  // ---- input.tsx ----
  writeFile(
    outDir,
    "components/ui/input.tsx",
    `import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";\n\ntype LabelProps = { label?: string };\n\nconst fieldClass = "${t.field.input}";\nconst labelClass = "${t.field.label}";\n\nexport function TextInput({ label, id, className, ...props }: LabelProps & InputHTMLAttributes<HTMLInputElement>) {\n  return (\n    <label className="flex flex-col gap-1 text-sm ${t.palette.textSecondary}">\n      {label && <span className={labelClass}>{label}</span>}\n      <input id={id} className={\`\${fieldClass} \${className ?? ""}\`} {...props} />\n    </label>\n  );\n}\n\nexport function TextArea({ label, id, className, ...props }: LabelProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {\n  return (\n    <label className="flex flex-col gap-1 text-sm ${t.palette.textSecondary}">\n      {label && <span className={labelClass}>{label}</span>}\n      <textarea id={id} className={\`min-h-24 \${fieldClass} \${className ?? ""}\`} {...props} />\n    </label>\n  );\n}\n`
  );

  writeFile(
    outDir,
    "components/ui/select.tsx",
    `type Option = Record<string, unknown>;

export function Select({ label, value, options, valueField, labelField, required, onChange }: {
  label: string;
  value: string;
  options: Option[];
  valueField: string;
  labelField: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm ${t.palette.textSecondary}">
      <span className="${t.field.label}">{label}</span>
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="${t.field.input}">
        <option value="">Válassz...</option>
        {options.map((option) => (
          <option key={String(option[valueField])} value={String(option[valueField])}>
            {String(option[labelField] ?? option[valueField])}
          </option>
        ))}
      </select>
    </label>
  );
}
`
  );

  // ---- table.tsx (DataTable) — rendering strategy depends on design.components ----
  writeFile(outDir, "components/ui/table.tsx", buildDataTableSource({ linkImport, linkProp, t, archetype }));

  // ---- list.tsx (DataList) — same strategy family as DataTable, applied to full-row field lists ----
  writeFile(outDir, "components/ui/list.tsx", buildDataListSource({ t, archetype }));

  writeFile(outDir, "components/ui/interactive-list.tsx", buildInteractiveListSource(t));

  // ---- card.tsx ----
  writeFile(
    outDir,
    "components/ui/card.tsx",
    `import type { ReactNode } from "react";\n\nexport function Card({ children, className }: { children: ReactNode; className?: string }) {\n  return <div className={\`${t.card.wrapper} \${className ?? ""}\`}>{children}</div>;\n}\n`
  );

  // ---- nav.tsx ----
  if (navItems && navItems.length) {
    const linksArray = navItems.map((n) => `  { label: ${JSON.stringify(n.label)}, href: ${JSON.stringify(n.route)} },`).join("\n");
    const authControlsImport = authEnabled ? `import { AuthControls } from "@/components/ui/auth-controls";\n` : "";
    const authControlsJsx = authEnabled ? `\n        <AuthControls />` : "";
    writeFile(
      outDir,
      "components/ui/nav.tsx",
      `${linkImport}\n${authControlsImport}\nconst links = [\n${linksArray}\n];\n\nexport function Nav() {\n  return (\n    <nav className="${t.nav.bar}">\n      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">\n        <Link ${linkProp}="/" className="${t.nav.brand}">\n          ${projectName ? humanizeSlug(projectName) : ""}\n        </Link>\n        <div className="${t.nav.linksWrap}">\n          {links.map((l) => (\n            <Link key={l.href} ${linkProp}={l.href} className="${t.nav.linkHover}">\n              {l.label}\n            </Link>\n          ))}\n        </div>${authControlsJsx}\n      </div>\n    </nav>\n  );\n}\n`
    );
  }

  // ---- delete-button.tsx (Next.js only: uses next/navigation router.refresh()) ----
  if (isNext) {
    writeFile(
      outDir,
      "components/ui/delete-button.tsx",
      `"use client";\n\nimport { useRouter } from "next/navigation";\nimport { useState } from "react";\n\nexport function DeleteButton({ resource, id }: { resource: string; id: string }) {\n  const router = useRouter();\n  const [pending, setPending] = useState(false);\n\n  async function handleDelete() {\n    setPending(true);\n    await fetch(\`/api/\${resource}/\${id}\`, { method: "DELETE" });\n    router.refresh();\n  }\n\n  return (\n    <button\n      onClick={handleDelete}\n      disabled={pending}\n      className="text-sm font-medium ${t.text.danger} hover:underline disabled:opacity-50"\n    >\n      {pending ? "Törlés…" : "Törlés"}\n    </button>\n  );\n}\n`
    );
  }
}

/** DataTable: "table" (default) renders a real <table>; "cards"/"stacked"/"accordion" render each row as a field list instead. */
function buildDataTableSource({ linkImport, linkProp, t, archetype }) {
  if (archetype.renderStrategy === "cards") {
    return `type Row = Record<string, unknown>;

type TableProps = {
  columns: string[];
  rows: Row[];
  rowLink?: (row: Row) => string;
};

${linkImport}

export function DataTable({ columns, rows, rowLink }: TableProps) {
  if (rows.length === 0) {
    return <p className="${t.text.muted}">Nincs még adat.</p>;
  }
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row, i) => {
        const href = rowLink?.(row);
        const content = (
          <div className="${t.card.wrapper}">
            {columns.map((col) => (
              <div key={col} className="mb-2 last:mb-0">
                <dt className="${t.list.dt}">{col}</dt>
                <dd className="${t.list.dd}">{String(row[col] ?? "")}</dd>
              </div>
            ))}
          </div>
        );
        const key = (row.id as string) ?? i;
        return href ? (
          <Link key={key} ${linkProp}={href} className="block">
            {content}
          </Link>
        ) : (
          <div key={key}>{content}</div>
        );
      })}
    </div>
  );
}
`;
  }

  if (archetype.renderStrategy === "stacked") {
    return `type Row = Record<string, unknown>;

type TableProps = {
  columns: string[];
  rows: Row[];
  rowLink?: (row: Row) => string;
};

${linkImport}

export function DataTable({ columns, rows, rowLink }: TableProps) {
  if (rows.length === 0) {
    return <p className="${t.text.muted}">Nincs még adat.</p>;
  }
  return (
    <ul className="${t.list.wrapper}">
      {rows.map((row, i) => {
        const href = rowLink?.(row);
        return (
          <li key={(row.id as string) ?? i} className="p-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {columns.map((col, ci) => (
                <div key={col}>
                  <dt className="${t.list.dt}">{col}</dt>
                  <dd className="${t.list.dd}">
                    {ci === 0 && href ? (
                      <Link ${linkProp}={href} className="hover:underline">
                        {String(row[col] ?? "")}
                      </Link>
                    ) : (
                      String(row[col] ?? "")
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
`;
  }

  if (archetype.renderStrategy === "accordion") {
    return `"use client";

import { useState } from "react";

type Row = Record<string, unknown>;

type TableProps = {
  columns: string[];
  rows: Row[];
  rowLink?: (row: Row) => string;
};

export function DataTable({ columns, rows }: TableProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (rows.length === 0) {
    return <p className="${t.text.muted}">Nincs még adat.</p>;
  }
  return (
    <div className="${t.list.wrapper}">
      {rows.map((row, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={(row.id as string) ?? i} className="p-4">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between text-left ${t.palette.textPrimary}"
            >
              <span className="font-medium">{String(row[columns[0]] ?? "")}</span>
              <span className="${t.text.muted}">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {columns.slice(1).map((col) => (
                  <div key={col}>
                    <dt className="${t.list.dt}">{col}</dt>
                    <dd className="${t.list.dd}">{String(row[col] ?? "")}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
`;
  }

  // default: "table"
  return `${linkImport}

type Row = Record<string, unknown>;

type TableProps = {
  columns: string[];
  rows: Row[];
  rowLink?: (row: Row) => string;
};

export function DataTable({ columns, rows, rowLink }: TableProps) {
  if (rows.length === 0) {
    return <p className="${t.text.muted}">Nincs még adat.</p>;
  }
  return (
    <div className="${t.table.wrapper}">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="${t.table.headerBg}">
          <tr>
            {columns.map((col) => (
              <th key={col} className="${t.table.headerCell}">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={(row.id as string) ?? i} className="${t.table.row}">
              {columns.map((col, ci) => {
                const value = String(row[col] ?? "");
                const href = rowLink?.(row);
                return (
                  <td key={col} className="${t.table.cell}">
                    {ci === 0 && href ? (
                      <Link ${linkProp}={href} className="${t.table.cellLink}">
                        {value}
                      </Link>
                    ) : (
                      value
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
}

/** DataList: renders every non-id field of every row. "cards"/"accordion" reuse the same row-shape treatment as DataTable. */
function buildDataListSource({ t, archetype }) {
  if (archetype.renderStrategy === "cards") {
    return `type Row = Record<string, unknown>;

export function DataList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="${t.text.muted}">Nincs még adat.</p>;
  }
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row, index) => (
        <div key={(row.id as string) ?? index} className="${t.card.wrapper}">
          {Object.entries(row)
            .filter(([key]) => key !== "id")
            .map(([key, value]) => (
              <div key={key} className="mb-2 last:mb-0">
                <dt className="${t.list.dt}">{key}</dt>
                <dd className="${t.list.dd}">{String(value ?? "")}</dd>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
`;
  }

  if (archetype.renderStrategy === "accordion") {
    return `"use client";

import { useState } from "react";

type Row = Record<string, unknown>;

export function DataList({ rows }: { rows: Row[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (rows.length === 0) {
    return <p className="${t.text.muted}">Nincs még adat.</p>;
  }
  return (
    <div className="${t.list.wrapper}">
      {rows.map((row, index) => {
        const entries = Object.entries(row).filter(([key]) => key !== "id");
        const isOpen = openIndex === index;
        return (
          <div key={(row.id as string) ?? index} className="p-4">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between text-left ${t.palette.textPrimary}"
            >
              <span className="font-medium">{String(entries[0]?.[1] ?? "")}</span>
              <span className="${t.text.muted}">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {entries.slice(1).map(([key, value]) => (
                  <div key={key}>
                    <dt className="${t.list.dt}">{key}</dt>
                    <dd className="${t.list.dd}">{String(value ?? "")}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
`;
  }

  // default: "table" and "stacked" both use the plain definition-list rendering for DataList
  return `type Row = Record<string, unknown>;

export function DataList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="${t.text.muted}">Nincs még adat.</p>;
  }
  return (
    <ul className="${t.list.wrapper}">
      {rows.map((row, index) => (
        <li key={(row.id as string) ?? index} className="p-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(row)
              .filter(([key]) => key !== "id")
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="${t.list.dt}">{key}</dt>
                  <dd className="${t.list.dd}">{String(value ?? "")}</dd>
                </div>
              ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
`;
}

function buildInteractiveListSource(t) {
  return `"use client";

import { useState } from "react";

type Row = Record<string, unknown>;

export function InteractiveList({ rows, primaryField, secondaryField, revealLabel, nextLabel }: {
  rows: Row[];
  primaryField: string;
  secondaryField: string;
  revealLabel: string;
  nextLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  if (rows.length === 0) return <p className="${t.text.muted}">Nincs még adat.</p>;
  const row = rows[index];
  function next() {
    setIndex((current) => (current + 1) % rows.length);
    setRevealed(false);
  }
  return (
    <section className="${t.interactiveList.card}">
      <p className="${t.interactiveList.primaryText}">{String(row[primaryField] ?? "")}</p>
      {revealed && <p className="${t.interactiveList.secondaryText}">{String(row[secondaryField] ?? "")}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" className="${t.interactiveList.revealButton}" onClick={() => setRevealed(true)} disabled={revealed}>{revealLabel}</button>
        <button type="button" className="${t.interactiveList.nextButton}" onClick={next}>{nextLabel}</button>
      </div>
      <p className="${t.interactiveList.counter}">{index + 1} / {rows.length}</p>
    </section>
  );
}
`;
}
