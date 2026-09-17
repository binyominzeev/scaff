import {
  writeFile,
  writePackageJson,
  mergeDeps,
  routeToComponentName,
  extractModelNames,
  modelToResourceName,
  buildAgentsMd,
  buildReadme,
  humanizeRouteSegment,
  humanizeSlug,
} from "./common.mjs";
import { writeUiKit } from "./uiKit.mjs";
import { generateNextjsUiScreens } from "./uiScreens.mjs";

function buildPrismaSeed(seedData) {
  if (!seedData || typeof seedData !== "object" || Array.isArray(seedData)) {
    throw new Error("A # seed-data blokk gyökere objektum kell legyen, modellenként tömbökkel.");
  }

  const records = [];
  for (const [model, modelRecords] of Object.entries(seedData)) {
    if (!Array.isArray(modelRecords)) {
      throw new Error(`A # seed-data blokkban a ${model} értéke tömb kell legyen.`);
    }
    for (const [index, record] of modelRecords.entries()) {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error(`A # seed-data blokkban a ${model}[${index}] rekord objektum kell legyen.`);
      }
      const alias = record._alias;
      if (!alias || typeof alias !== "string") {
        throw new Error(`A # seed-data blokkban minden ${model} rekordnak kell _alias.`);
      }
      const data = { ...record };
      delete data._alias;
      if (!data.id) data.id = `seed_${alias}`;
      records.push({ alias, model, data });
    }
  }

  const aliases = new Set();
  for (const record of records) {
    if (aliases.has(record.alias)) throw new Error(`Duplikált seed alias: ${record.alias}`);
    aliases.add(record.alias);
  }

  const ordered = [];
  const remaining = [...records];
  const resolved = new Set();
  const findRefs = (value, refs = []) => {
    if (Array.isArray(value)) value.forEach((item) => findRefs(item, refs));
    else if (value && typeof value === "object") {
      if (typeof value.$ref === "string") refs.push(value.$ref);
      else Object.values(value).forEach((item) => findRefs(item, refs));
    }
    return refs;
  };

  while (remaining.length) {
    const nextIndex = remaining.findIndex((record) => findRefs(record.data).every((ref) => resolved.has(ref)));
    if (nextIndex < 0) {
      throw new Error("A # seed-data blokk relációi körkörösek vagy előre nem feloldható aliasra hivatkoznak.");
    }
    const [record] = remaining.splice(nextIndex, 1);
    ordered.push(record);
    resolved.add(record.alias);
  }

  return `import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const records = ${JSON.stringify(ordered, null, 2)};
const created = new Map<string, { id: string }>();

function resolve(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(resolve);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.$ref === "string") {
      const referenced = created.get(object.$ref);
      if (!referenced) throw new Error(\`Ismeretlen seed alias: \${object.$ref}\`);
      return referenced.id;
    }
    return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, resolve(item)]));
  }
  return value;
}

async function main() {
  for (const entry of records) {
    const model = (prisma as unknown as Record<string, { upsert(args: unknown): Promise<{ id: string }> }>)[entry.model];
    if (!model) throw new Error(\`Ismeretlen Prisma modell a seedben: \${entry.model}\`);
    const data = resolve(entry.data) as Record<string, unknown>;
    const result = await model.upsert({ where: { id: data.id }, update: data, create: data });
    created.set(entry.alias, result);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
`;
}

export function generateNextjsProject(outDir, spec, warnings = []) {
  const { frontMatter, prismaBlock, pages, constraintsBlock, developmentOrderBlock, screens = [], navItems = [], seedData } = spec;
  const { project, stack, database, api, auth, ai_integration, pwa, deployment } = frontMatter;
  const screenRoutes = new Set(screens.map((s) => s.route));

  // The generated UI kit (components/ui/*) and every ui-screens page hardcode Tailwind
  // utility classNames unconditionally, so Tailwind must be installed whenever screens
  // are generated, regardless of the spec's own styling choice.
  const usesTailwind = stack.styling.startsWith("tailwind") || screens.length > 0;
  if (stack.styling === "none" && screens.length > 0) {
    warnings.push(
      `⚠️  stack.styling: "none", de a generált UI képernyők Tailwind osztályokra épülnek — a scaffold automatikusan bekapcsolta a Tailwind-et, különben stílus nélkül maradt volna a UI.`
    );
  }

  // ---- package.json ----
  const scripts = {
    dev: "next dev",
    build: "next build",
    start: "next start",
    lint: "eslint",
  };

  let dependencies = {
    next: "^16.0.0",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
  };
  let devDependencies = {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    eslint: "^9",
    "eslint-config-next": "^16.0.0",
    typescript: "^5",
  };

  if (usesTailwind) {
    devDependencies = mergeDeps(devDependencies, {
      tailwindcss: "^4",
      "@tailwindcss/postcss": "^4",
    });
  }

  if (database.enabled) {
    scripts["db:generate"] = "prisma generate";
    scripts["db:migrate"] = "prisma migrate dev";
    scripts["db:studio"] = "prisma studio";
    scripts["postinstall"] = "prisma generate";
    dependencies = mergeDeps(dependencies, { "@prisma/client": "^6.0.0" });
    devDependencies = mergeDeps(devDependencies, { prisma: "^6.0.0" });
    if (database.engine === "sqlite") {
      dependencies = mergeDeps(dependencies, { "better-sqlite3": "^13.0.0" });
      devDependencies = mergeDeps(devDependencies, { "@types/better-sqlite3": "^9.6.0" });
    }
    if (database.engine === "postgres") {
      dependencies = mergeDeps(dependencies, { pg: "^8.13.0" });
      devDependencies = mergeDeps(devDependencies, { "@types/pg": "^8.11.0" });
    }
    if (!seedData) {
      throw new Error("A database.enabled: true spec kötelezően tartalmazzon # seed-data blokkot.");
    }
    scripts["db:seed"] = "prisma db seed";
    devDependencies = mergeDeps(devDependencies, { tsx: "^4.19.0" });
  }

  if (auth.enabled && auth.provider === "next-auth-credentials") {
    dependencies = mergeDeps(dependencies, { "next-auth": "^4.24.0", bcryptjs: "^3.0.0" });
    devDependencies = mergeDeps(devDependencies, { "@types/bcryptjs": "^2.4.0" });
    writeFile(
      outDir,
      "lib/auth.ts",
      `// TODO: kösd be a next-auth session-t; addig egy fix tesztfelhasználót ad vissza\nconst DEV_TEST_USER_ID = "dev-test-user";\n\nexport async function getCurrentUserId(): Promise<string> {\n  return DEV_TEST_USER_ID;\n}\n`
    );
  }

  if (ai_integration?.enabled && ai_integration.provider === "openai") {
    dependencies = mergeDeps(dependencies, { openai: "^7.0.0" });
  }

    const extra = database.enabled ? { prisma: { seed: "tsx prisma/seed.ts" } } : {};
  writePackageJson(outDir, { name: project.name, scripts, dependencies, devDependencies, extra });

  // ---- tsconfig.json ----
  writeFile(
    outDir,
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    ) + "\n"
  );

  // ---- next.config.ts ----
  writeFile(outDir, "next.config.ts", `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n`);

  // ---- eslint.config.mjs ----
  // eslint-config-next 16+ már natívan flat-config formátumú (tömböt exportál),
  // ezért NEM kell FlatCompat-tal becsomagolni — az régi .eslintrc-stílusú configokhoz
  // való, és körkörös plugin-referenciát okoz, ha flat configra alkalmazzuk.
  writeFile(
    outDir,
    "eslint.config.mjs",
    `import nextConfig from "eslint-config-next";\n\nconst eslintConfig = [...nextConfig];\n\nexport default eslintConfig;\n`
  );

  // ---- postcss.config.mjs + tailwind ----
  if (usesTailwind) {
    writeFile(outDir, "postcss.config.mjs", `const config = {\n  plugins: { "@tailwindcss/postcss": {} },\n};\n\nexport default config;\n`);
  }

  // ---- app/layout.tsx, globals.css, page.tsx ----
  writeFile(
    outDir,
    "app/globals.css",
    usesTailwind ? `@import "tailwindcss";\n` : `:root {\n  color-scheme: light dark;\n}\n`
  );

  writeFile(
    outDir,
    "app/layout.tsx",
    navItems.length
      ? `import type { Metadata } from "next";\nimport "./globals.css";\nimport { Nav } from "@/components/ui/nav";\n\nexport const metadata: Metadata = {\n  title: "${project.name}",\n  description: "${project.one_liner.trim().replace(/"/g, "'")}",\n};\n\nexport default function RootLayout({\n  children,\n}: Readonly<{ children: React.ReactNode }>) {\n  return (\n    <html lang="hu">\n      <body>\n        <Nav />\n        {children}\n      </body>\n    </html>\n  );\n}\n`
      : `import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = {\n  title: "${project.name}",\n  description: "${project.one_liner.trim().replace(/"/g, "'")}",\n};\n\nexport default function RootLayout({\n  children,\n}: Readonly<{ children: React.ReactNode }>) {\n  return (\n    <html lang="hu">\n      <body>{children}</body>\n    </html>\n  );\n}\n`
  );

  // ---- app/page.tsx: only write the default home page if the "/" route isn't
  //      already covered by a ui-screens entry (which will generate it instead) ----
  if (!screenRoutes.has("/")) {
    writeFile(
      outDir,
      "app/page.tsx",
      `export default function Home() {\n  return (\n    <main className="p-8">\n      <h1 className="text-3xl font-bold tracking-tight">${humanizeSlug(project.name)}</h1>\n      <p className="mt-2 text-slate-600">${project.one_liner.trim().replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
    );
  }

  // ---- page stubs from the "pages" block (skip "/" and anything already
  //      covered by a ui-screens entry, to avoid overwriting the richer version) ----
  for (const p of pages) {
    if (p.route === "/" || screenRoutes.has(p.route)) continue;
    const componentName = routeToComponentName(p.route);
    const routePath = `app${p.route}/page.tsx`;
    const stubTitle = humanizeRouteSegment(p.route) || p.route;
    writeFile(
      outDir,
      routePath,
      `export default function ${componentName}() {\n  return (\n    <main className="p-8">\n      <h1 className="text-3xl font-bold tracking-tight">${stubTitle}</h1>\n      <p className="mt-2 text-slate-600">${(p.description || "TODO: implement").replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
    );
  }

  // ---- prisma schema + api route stubs ----
  if (database.enabled && prismaBlock) {
    const provider = database.engine === "postgres" ? "postgresql" : "sqlite";
    const url = database.engine === "postgres" ? `env("DATABASE_URL")` : `"file:./dev.db"`;
    const schemaContent =
      `generator client {\n  provider = "prisma-client-js"\n}\n\n` +
      `datasource db {\n  provider = "${provider}"\n  url      = ${url}\n}\n\n` +
      prismaBlock +
      "\n";
    writeFile(outDir, "prisma/schema.prisma", schemaContent);
    writeFile(
      outDir,
      "lib/prisma.ts",
      `import { PrismaClient } from "@prisma/client";\n\nconst globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };\n\nexport const prisma = globalForPrisma.prisma ?? new PrismaClient();\n\nif (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;\n`
    );

    if (api.enabled) {
      const models = extractModelNames(prismaBlock);
      for (const model of models) {
        const resource = modelToResourceName(model);
        const varModel = model.charAt(0).toLowerCase() + model.slice(1);
        writeFile(
          outDir,
          `app/api/${resource}/route.ts`,
          `import { NextResponse } from "next/server";\nimport { prisma } from "@/lib/prisma";\n\nfunction prismaError(error: unknown) {\n  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";\n  const status = code === "P2002" || code === "P2003" ? 400 : 500;\n  return NextResponse.json({ error: code ? \`Adatbázis hiba (\${code}).\` : "A művelet nem sikerült." }, { status });\n}\n\nexport async function GET() {\n  try {\n    const items = await prisma.${varModel}.findMany();\n    return NextResponse.json(items);\n  } catch (error) {\n    return prismaError(error);\n  }\n}\n\nexport async function POST(request: Request) {\n  try {\n    const body = await request.json();\n    const created = await prisma.${varModel}.create({ data: body });\n    return NextResponse.json(created, { status: 201 });\n  } catch (error) {\n    return prismaError(error);\n  }\n}\n`
        );
        writeFile(
          outDir,
          `app/api/${resource}/[id]/route.ts`,
          `import { NextResponse } from "next/server";\nimport { prisma } from "@/lib/prisma";\n\nfunction prismaError(error: unknown) {\n  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";\n  const status = code === "P2025" ? 404 : code === "P2002" || code === "P2003" ? 400 : 500;\n  return NextResponse.json({ error: code ? \`Adatbázis hiba (\${code}).\` : "A művelet nem sikerült." }, { status });\n}\n\ntype Params = { params: Promise<{ id: string }> };\n\nexport async function GET(request: Request, { params }: Params) {\n  try {\n    const { id } = await params;\n    const item = await prisma.${varModel}.findUnique({ where: { id } });\n    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });\n    return NextResponse.json(item);\n  } catch (error) {\n    return prismaError(error);\n  }\n}\n\nexport async function PATCH(request: Request, { params }: Params) {\n  try {\n    const { id } = await params;\n    const body = await request.json();\n    const updated = await prisma.${varModel}.update({ where: { id }, data: body });\n    return NextResponse.json(updated);\n  } catch (error) {\n    return prismaError(error);\n  }\n}\n\nexport async function DELETE(request: Request, { params }: Params) {\n  try {\n    const { id } = await params;\n    await prisma.${varModel}.delete({ where: { id } });\n    return NextResponse.json({ success: true });\n  } catch (error) {\n    return prismaError(error);\n  }\n}\n`
        );
      }
    }

    writeFile(outDir, "prisma/seed.ts", buildPrismaSeed(seedData));
  }

  // ---- v0.2: UI kit + generated screens from the "ui-screens" block ----
  if (screens.length) {
    writeUiKit(outDir, { framework: "nextjs-app-router", navItems, projectName: project.name });
    generateNextjsUiScreens(outDir, spec, warnings);
  }

  // ---- docker-compose.yml: local dev Postgres, regardless of the app's own deployment target ----
  if (database.engine === "postgres") {
    writeFile(
      outDir,
      "docker-compose.yml",
      `services:\n  db:\n    image: postgres:16\n    restart: unless-stopped\n    environment:\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: postgres\n      POSTGRES_DB: ${project.name.replace(/-/g, "_")}\n    ports:\n      - "5432:5432"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:\n`
    );
  }

  // ---- .gitignore ----
  writeFile(
    outDir,
    ".gitignore",
    `node_modules\n.next\n.env\n.env.local\n*.tsbuildinfo\n${database.engine === "sqlite" ? "prisma/*.db\nprisma/*.db-*\n" : ""}`
  );

  // ---- .env / .env.example ----
  if (database.engine === "postgres") {
    const databaseUrlLine = `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${project.name.replace(/-/g, "_")}"\n`;
    writeFile(outDir, ".env.example", databaseUrlLine);
    // real .env with matching defaults so `prisma migrate dev` works out of the box against the docker-compose db
    writeFile(outDir, ".env", databaseUrlLine);
  }

  // ---- AGENTS.md (+ CLAUDE.md copy) + README.md ----
  const agentsMd = buildAgentsMd({ frontMatter, constraintsBlock, developmentOrderBlock, prismaBlock });
  writeFile(outDir, "AGENTS.md", agentsMd);
  writeFile(outDir, "CLAUDE.md", agentsMd);
  writeFile(outDir, "README.md", buildReadme({ frontMatter, pages, seedData }));
}
