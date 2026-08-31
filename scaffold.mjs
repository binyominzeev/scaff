#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadAndValidate } from "./lib/parseSpec.mjs";
import { generateNextjsProject } from "./lib/generators/nextjs.mjs";
import { generateViteProject } from "./lib/generators/vite.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printUsage() {
  console.log(`
Használat:
  node scaffold.mjs <path-to-projectspec.md> [outputDir]

Ha az outputDir nincs megadva, a projekt neve alapján (a spec YAML front matteréből)
egy azonos nevű mappa jön létre a jelenlegi könyvtárban.
`);
}

function main() {
  const [, , specPathArg, outputDirArg] = process.argv;

  if (!specPathArg) {
    printUsage();
    process.exit(1);
  }

  const specPath = path.resolve(process.cwd(), specPathArg);
  const schemaPath = path.join(__dirname, "projectspec.schema.json");

  if (!fs.existsSync(specPath)) {
    console.error(`❌ Nem található: ${specPath}`);
    process.exit(1);
  }

  let spec;
  try {
    spec = loadAndValidate(specPath, schemaPath);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  const { frontMatter } = spec;
  const outDir = path.resolve(process.cwd(), outputDirArg || frontMatter.project.name);

  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    console.error(`❌ A célmappa már létezik és nem üres: ${outDir}`);
    console.error(`   Adj meg egy másik outputDir-t, vagy ürítsd ki a mappát.`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`📦 Scaffold generálása: ${frontMatter.project.name}`);
  console.log(`   Stack: ${frontMatter.stack.framework}`);
  console.log(`   Cél mappa: ${outDir}`);
  if (spec.screens?.length) {
    console.log(`   UI képernyők: ${spec.screens.length}`);
  }

  const warnings = [...(spec.orphanWarnings || [])];

  if (frontMatter.stack.framework === "nextjs-app-router") {
    generateNextjsProject(outDir, spec, warnings);
  } else if (frontMatter.stack.framework === "vite-react") {
    generateViteProject(outDir, spec, warnings);
  } else {
    console.error(`❌ Ismeretlen framework: ${frontMatter.stack.framework}`);
    process.exit(1);
  }

  if (warnings.length) {
    console.log(`\n${warnings.length} figyelmeztetés:`);
    for (const w of warnings) console.log(`   ${w}`);
  }

  console.log(`\n✅ Kész! Következő lépések:\n`);
  console.log(`   cd ${path.relative(process.cwd(), outDir) || "."}`);
  console.log(`   npm install`);
  if (frontMatter.database?.enabled && frontMatter.database.orm === "prisma") {
    console.log(`   npx prisma migrate dev --name init`);
  }
  console.log(`   npm run dev`);
  console.log(`\n   Nyisd meg VS Code-ban, és folytasd a fine-tuningot — az AGENTS.md / CLAUDE.md`);
  console.log(`   fájl tartalmazza a projekt kontextusát és a korlátokat a Copilot/Claude Code számára.\n`);
}

main();
