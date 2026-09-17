import fs from "node:fs";
import path from "node:path";

/** Write a file, creating parent directories as needed. Refuses to silently overwrite. */
export function writeFile(outDir, relPath, content) {
  const fullPath = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

/** Merge dependency objects, later ones winning on key conflicts. */
export function mergeDeps(...objs) {
  return Object.assign({}, ...objs);
}

/** Build and write the final package.json from accumulated parts. */
export function writePackageJson(outDir, { name, scripts, dependencies, devDependencies, extra = {} }) {
  const pkg = {
    name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts,
    dependencies: sortKeys(dependencies),
    devDependencies: sortKeys(devDependencies),
    ...extra,
  };
  writeFile(outDir, "package.json", JSON.stringify(pkg, null, 2) + "\n");
}

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

/** kebab-case route segment -> PascalCase component name, e.g. "/import" -> "ImportPage" */
export function routeToComponentName(route) {
  const cleaned = route
    .split("/")
    .filter(Boolean)
    .map((seg) => seg.replace(/[^a-zA-Z0-9]+/g, " "))
    .join(" ");
  const pascal = cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
  return (pascal || "Home") + "Page";
}

/** Extract Prisma model names from a schema.prisma-style string, e.g. ["Person", "Event", "Tag"] */
export function extractModelNames(prismaBlock) {
  if (!prismaBlock) return [];
  const matches = [...prismaBlock.matchAll(/^model\s+(\w+)\s*\{/gm)];
  return matches.map((m) => m[1]);
}

/** PascalCase model name -> plural kebab-case resource name for API routes, e.g. "Event" -> "events" */
export function modelToResourceName(modelName) {
  const kebab = modelName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
  return kebab.endsWith("s") ? kebab : kebab + "s";
}

export function buildAgentsMd({ frontMatter, constraintsBlock, developmentOrderBlock, prismaBlock }) {
  const { project, stack, database, api, auth, ai_integration, pwa } = frontMatter;

  let content = `# AGENTS.md\n\n`;
  content += `> Ezt a fájlt a scaffold generálta a projekt .projectspec.md fájljából.\n`;
  content += `> AI kódoló ügynökök (Copilot, Claude Code, Cursor stb.) session indításkor ezt olvassák be.\n\n`;

  content += `## Projekt\n\n${project.one_liner.trim()}\n\n`;

  content += `## Stack\n\n`;
  content += `- Framework: ${stack.framework}\n`;
  content += `- Nyelv: ${stack.language}\n`;
  content += `- Styling: ${stack.styling}\n`;
  if (stack.router) content += `- Router: ${stack.router}\n`;
  if (database.enabled) content += `- Adatbázis: ${database.engine} (${database.orm})\n`;
  if (api.enabled) content += `- API: ${api.style}\n`;
  if (auth.enabled) content += `- Auth: ${auth.provider}\n`;
  if (ai_integration?.enabled) content += `- AI integráció: ${ai_integration.provider} (${ai_integration.purpose ?? "cél nincs megadva"})\n`;
  if (pwa.enabled) content += `- PWA: igen (offline: ${pwa.offline ? "igen" : "nem"})\n`;
  content += `\n`;

  if (prismaBlock) {
    content += `## Adatmodell\n\nLásd \`prisma/schema.prisma\`. A modellek: ${extractModelNames(prismaBlock).join(", ")}.\n\n`;
  }

  if (constraintsBlock) {
    content += `## Korlátok — ezeket MINDIG tartsd be\n\n`;
    content += constraintsBlock
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n") + "\n\n";
  }

  if (developmentOrderBlock) {
    content += `## Javasolt fejlesztési sorrend\n\n${developmentOrderBlock}\n\n`;
  }

  content += `## Megjegyzés\n\nEz a scaffold csak az alapokat rakja le (mappaszerkezet, konfig, üres oldal-stubok, adatmodell). A tényleges üzleti logikát, UI-t és a fenti korlátok betartását erre a fájlra támaszkodva kell megvalósítani.\n`;

  return content;
}

export function buildReadme({ frontMatter, pages }) {
  const { project, stack, database, api, auth, deployment } = frontMatter;
  let content = `# ${project.name}\n\n${project.one_liner.trim()}\n\n`;
  content += `> ⚠️ Ez egy generált scaffold. Lásd \`AGENTS.md\`-t a tervezési kontextusért és korlátokért.\n\n`;

  content += `## Stack\n\n`;
  content += `- ${stack.framework === "nextjs-app-router" ? "Next.js (App Router)" : "Vite + React"}\n`;
  content += `- TypeScript\n`;
  content += `- ${stack.styling}\n`;
  if (database.enabled) content += `- ${database.orm} + ${database.engine}\n`;
  content += `\n`;

  content += `## Fejlesztés indítása\n\n\`\`\`bash\nnpm install\n`;
  if (database.enabled && database.engine === "postgres") {
    content += `docker compose up -d\n`;
  }
  if (database.enabled && database.orm === "prisma") {
    content += `npx prisma generate\nnpx prisma migrate dev --name init\n`;
  }
  content += `npm run dev\n\`\`\`\n\n`;
  if (database.enabled && database.engine === "postgres") {
    content += `> A fenti \`docker compose up -d\` egy helyi Postgres-t indít fejlesztéshez (lásd \`docker-compose.yml\`), és a \`.env\` fájl ehhez van előre beállítva. Éles környezetben cseréld le a \`DATABASE_URL\`-t a tényleges adatbázisra.\n\n`;
  }

  if (pages?.length) {
    content += `## Oldalak\n\n`;
    for (const p of pages) {
      content += `- \`${p.route}\`${p.description ? " — " + p.description : ""}\n`;
    }
    content += `\n`;
  }

  return content;
}
