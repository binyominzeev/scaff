import { writeFile } from "./common.mjs";

/**
 * Writes a small, fixed set of presentational UI primitives into components/ui/.
 * These are NOT generated per-project-content — they are the same, deterministic,
 * pre-styled components every scaffold gets, so the ASCII wireframe tokens have
 * something consistent and elegant to compile down to.
 */
export function writeUiKit(outDir, { framework, navItems }) {
  const isNext = framework === "nextjs-app-router";
  const linkImport = isNext ? `import Link from "next/link";` : `import { Link } from "react-router-dom";`;
  const linkProp = isNext ? "href" : "to";

  // ---- button.tsx ----
  writeFile(
    outDir,
    "components/ui/button.tsx",
    `${linkImport}\nimport type { ButtonHTMLAttributes, ReactNode } from "react";\n\ntype ButtonProps = {\n  href?: string;\n  children: ReactNode;\n  variant?: "primary" | "ghost" | "danger";\n} & ButtonHTMLAttributes<HTMLButtonElement>;\n\nconst variantClass: Record<string, string> = {\n  primary: "bg-slate-900 text-white hover:bg-slate-700",\n  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",\n  danger: "bg-red-600 text-white hover:bg-red-500",\n};\n\nconst base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";\n\nexport function Button({ href, children, variant = "primary", className, ...props }: ButtonProps) {\n  const classes = \`\${base} \${variantClass[variant]} \${className ?? ""}\`;\n  if (href) {\n    return (\n      <Link ${linkProp}={href} className={classes}>\n        {children}\n      </Link>\n    );\n  }\n  return (\n    <button className={classes} {...props}>\n      {children}\n    </button>\n  );\n}\n`
  );

  // ---- input.tsx ----
  writeFile(
    outDir,
    "components/ui/input.tsx",
    `import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";\n\ntype LabelProps = { label?: string };\n\nconst fieldClass = "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";\n\nexport function TextInput({ label, id, className, ...props }: LabelProps & InputHTMLAttributes<HTMLInputElement>) {\n  return (\n    <label className="flex flex-col gap-1 text-sm text-slate-700">\n      {label && <span className="font-medium">{label}</span>}\n      <input id={id} className={\`\${fieldClass} \${className ?? ""}\`} {...props} />\n    </label>\n  );\n}\n\nexport function TextArea({ label, id, className, ...props }: LabelProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {\n  return (\n    <label className="flex flex-col gap-1 text-sm text-slate-700">\n      {label && <span className="font-medium">{label}</span>}\n      <textarea id={id} className={\`min-h-24 \${fieldClass} \${className ?? ""}\`} {...props} />\n    </label>\n  );\n}\n`
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
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none">
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

  // ---- table.tsx ----
  writeFile(
    outDir,
    "components/ui/table.tsx",
    `${linkImport}\n\ntype Row = Record<string, unknown>;\n\ntype TableProps = {\n  columns: string[];\n  rows: Row[];\n  rowLink?: (row: Row) => string;\n};\n\nexport function DataTable({ columns, rows, rowLink }: TableProps) {\n  if (rows.length === 0) {\n    return <p className="text-sm text-slate-500">Nincs még adat.</p>;\n  }\n  return (\n    <div className="overflow-x-auto rounded-lg border border-slate-200">\n      <table className="min-w-full divide-y divide-slate-200 text-sm">\n        <thead className="bg-slate-50">\n          <tr>\n            {columns.map((col) => (\n              <th key={col} className="px-4 py-2 text-left font-medium text-slate-600">\n                {col}\n              </th>\n            ))}\n          </tr>\n        </thead>\n        <tbody className="divide-y divide-slate-100">\n          {rows.map((row, i) => (\n            <tr key={(row.id as string) ?? i} className="hover:bg-slate-50">\n              {columns.map((col, ci) => {\n                const value = String(row[col] ?? "");\n                const href = rowLink?.(row);\n                return (\n                  <td key={col} className="px-4 py-2 text-slate-800">\n                    {ci === 0 && href ? (\n                      <Link ${linkProp}={href} className="font-medium text-slate-900 hover:underline">\n                        {value}\n                      </Link>\n                    ) : (\n                      value\n                    )}\n                  </td>\n                );\n              })}\n            </tr>\n          ))}\n        </tbody>\n      </table>\n    </div>\n  );\n}\n`
  );

  // ---- list.tsx ----
  writeFile(
    outDir,
    "components/ui/list.tsx",
    `type Row = Record<string, unknown>;

export function DataList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Nincs még adat.</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
      {rows.map((row, index) => (
        <li key={(row.id as string) ?? index} className="p-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(row)
              .filter(([key]) => key !== "id")
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="font-medium text-slate-500">{key}</dt>
                  <dd className="text-slate-900">{String(value ?? "")}</dd>
                </div>
              ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
`
  );

  writeFile(
    outDir,
    "components/ui/interactive-list.tsx",
    `"use client";

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
  if (rows.length === 0) return <p className="text-sm text-slate-500">Nincs még adat.</p>;
  const row = rows[index];
  function next() {
    setIndex((current) => (current + 1) % rows.length);
    setRevealed(false);
  }
  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-lg font-medium text-slate-900">{String(row[primaryField] ?? "")}</p>
      {revealed && <p className="mt-4 text-slate-700">{String(row[secondaryField] ?? "")}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => setRevealed(true)} disabled={revealed}>{revealLabel}</button>
        <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={next}>{nextLabel}</button>
      </div>
      <p className="mt-3 text-xs text-slate-500">{index + 1} / {rows.length}</p>
    </section>
  );
}
`
  );

  // ---- card.tsx ----
  writeFile(
    outDir,
    "components/ui/card.tsx",
    `import type { ReactNode } from "react";\n\nexport function Card({ children, className }: { children: ReactNode; className?: string }) {\n  return <div className={\`rounded-xl border border-slate-200 bg-white p-6 shadow-sm \${className ?? ""}\`}>{children}</div>;\n}\n`
  );

  // ---- nav.tsx ----
  if (navItems && navItems.length) {
    const linksArray = navItems.map((n) => `  { label: ${JSON.stringify(n.label)}, href: ${JSON.stringify(n.route)} },`).join("\n");
    writeFile(
      outDir,
      "components/ui/nav.tsx",
      `${linkImport}\n\nconst links = [\n${linksArray}\n];\n\nexport function Nav() {\n  return (\n    <nav className="border-b border-slate-200 bg-white">\n      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm font-medium text-slate-600">\n        {links.map((l) => (\n          <Link key={l.href} ${linkProp}={l.href} className="hover:text-slate-900">\n            {l.label}\n          </Link>\n        ))}\n      </div>\n    </nav>\n  );\n}\n`
    );
  }

  // ---- delete-button.tsx (Next.js only: uses next/navigation router.refresh()) ----
  if (isNext) {
    writeFile(
      outDir,
      "components/ui/delete-button.tsx",
      `"use client";\n\nimport { useRouter } from "next/navigation";\nimport { useState } from "react";\n\nexport function DeleteButton({ resource, id }: { resource: string; id: string }) {\n  const router = useRouter();\n  const [pending, setPending] = useState(false);\n\n  async function handleDelete() {\n    setPending(true);\n    await fetch(\`/api/\${resource}/\${id}\`, { method: "DELETE" });\n    router.refresh();\n  }\n\n  return (\n    <button\n      onClick={handleDelete}\n      disabled={pending}\n      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"\n    >\n      {pending ? "Törlés…" : "Törlés"}\n    </button>\n  );\n}\n`
    );
  }
}
