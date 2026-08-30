import {
  writeFile,
  writePackageJson,
  mergeDeps,
  routeToComponentName,
  extractModelNames,
  modelToResourceName,
  buildAgentsMd,
  buildReadme,
} from "./common.mjs";

export function generateNextjsProject(outDir, spec) {
  const { frontMatter, prismaBlock, pages, constraintsBlock, developmentOrderBlock } = spec;
  const { project, stack, database, api, auth, ai_integration, pwa, deployment } = frontMatter;

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

  if (stack.styling.startsWith("tailwind")) {
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
  }

  if (auth.enabled && auth.provider === "next-auth-credentials") {
    dependencies = mergeDeps(dependencies, { "next-auth": "^4.24.0", bcryptjs: "^3.0.0" });
    devDependencies = mergeDeps(devDependencies, { "@types/bcryptjs": "^2.4.0" });
  }

  if (ai_integration?.enabled && ai_integration.provider === "openai") {
    dependencies = mergeDeps(dependencies, { openai: "^7.0.0" });
  }

  writePackageJson(outDir, { name: project.name, scripts, dependencies, devDependencies });

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
  writeFile(
    outDir,
    "eslint.config.mjs",
    `import { FlatCompat } from "@eslint/eslintrc";\n\nconst compat = new FlatCompat({ baseDirectory: import.meta.dirname });\n\nconst eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];\n\nexport default eslintConfig;\n`
  );

  // ---- postcss.config.mjs + tailwind ----
  if (stack.styling.startsWith("tailwind")) {
    writeFile(outDir, "postcss.config.mjs", `const config = {\n  plugins: { "@tailwindcss/postcss": {} },\n};\n\nexport default config;\n`);
  }

  // ---- app/layout.tsx, globals.css, page.tsx ----
  writeFile(
    outDir,
    "app/globals.css",
    stack.styling.startsWith("tailwind") ? `@import "tailwindcss";\n` : `:root {\n  color-scheme: light dark;\n}\n`
  );

  writeFile(
    outDir,
    "app/layout.tsx",
    `import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = {\n  title: "${project.name}",\n  description: "${project.one_liner.trim().replace(/"/g, "'")}",\n};\n\nexport default function RootLayout({\n  children,\n}: Readonly<{ children: React.ReactNode }>) {\n  return (\n    <html lang="hu">\n      <body>{children}</body>\n    </html>\n  );\n}\n`
  );

  writeFile(
    outDir,
    "app/page.tsx",
    `export default function Home() {\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">${project.name}</h1>\n      <p className="mt-2 text-gray-600">${project.one_liner.trim().replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
  );

  // ---- page stubs from the "pages" block (skip "/", already handled above) ----
  for (const p of pages) {
    if (p.route === "/") continue;
    const componentName = routeToComponentName(p.route);
    const routePath = `app${p.route}/page.tsx`;
    writeFile(
      outDir,
      routePath,
      `export default function ${componentName}() {\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">${p.route}</h1>\n      <p className="mt-2 text-gray-600">${(p.description || "TODO: implement").replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
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
        writeFile(
          outDir,
          `app/api/${resource}/route.ts`,
          `import { NextResponse } from "next/server";\nimport { prisma } from "@/lib/prisma";\n\nexport async function GET() {\n  const items = await prisma.${model.charAt(0).toLowerCase() + model.slice(1)}.findMany();\n  return NextResponse.json(items);\n}\n\nexport async function POST(request: Request) {\n  const body = await request.json();\n  const created = await prisma.${model.charAt(0).toLowerCase() + model.slice(1)}.create({ data: body });\n  return NextResponse.json(created, { status: 201 });\n}\n`
        );
      }
    }
  }

  // ---- docker-compose.yml if postgres + docker deployment ----
  if (database.engine === "postgres" && deployment.docker) {
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

  // ---- .env.example ----
  if (database.engine === "postgres") {
    writeFile(outDir, ".env.example", `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${project.name.replace(/-/g, "_")}"\n`);
  }

  // ---- AGENTS.md (+ CLAUDE.md copy) + README.md ----
  const agentsMd = buildAgentsMd({ frontMatter, constraintsBlock, developmentOrderBlock, prismaBlock });
  writeFile(outDir, "AGENTS.md", agentsMd);
  writeFile(outDir, "CLAUDE.md", agentsMd);
  writeFile(outDir, "README.md", buildReadme({ frontMatter, pages }));
}
