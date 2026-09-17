import {
  writeFile,
  writePackageJson,
  mergeDeps,
  routeToComponentName,
  buildAgentsMd,
  buildReadme,
  humanizeRouteSegment,
  humanizeSlug,
} from "./common.mjs";

export function generateViteProject(outDir, spec, warnings = []) {
  const { frontMatter, pages, constraintsBlock, developmentOrderBlock, screens = [] } = spec;
  const { project, stack, ai_integration, pwa, auth } = frontMatter;

  if (auth?.enabled && auth.provider === "pocket-id-oidc") {
    warnings.push(
      `⚠️  auth.provider: "pocket-id-oidc" jelenleg csak a Next.js App Router ágon támogatott (a Vite+React ágnak nincs saját backendje a client_secret-et igénylő token-cseréhez) — az auth generálás kimaradt ennél a projektnél.`
    );
  }

  if (screens.length) {
    warnings.push(
      `ℹ️  ${screens.length} "ui-screens" képernyő van a specben, de a Vite+React ág a v0.2-ben még nem generál belőlük adatkötött UI-t (csak a Next.js App Router ág). A "# pages" blokk alapján generált egyszerű stubok készültek helyette.`
    );
  }

  const scripts = {
    dev: "vite",
    build: "tsc -b && vite build",
    lint: "eslint .",
    preview: "vite preview",
  };

  let dependencies = { react: "^19.0.0", "react-dom": "^19.0.0" };
  let devDependencies = {
    "@eslint/js": "^10",
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.0",
    eslint: "^10",
    "eslint-plugin-react-hooks": "^7.0.0",
    "eslint-plugin-react-refresh": "^0.5.0",
    globals: "^16.0.0",
    typescript: "~6.0.0",
    "typescript-eslint": "^8.0.0",
    vite: "^8.0.0",
  };

  if (stack.router === "react-router") {
    dependencies = mergeDeps(dependencies, { "react-router-dom": "^7.0.0" });
  }

  if (stack.styling.startsWith("tailwind")) {
    devDependencies = mergeDeps(devDependencies, { tailwindcss: "^4", "@tailwindcss/vite": "^4" });
  }

  if (pwa.enabled) {
    devDependencies = mergeDeps(devDependencies, { "vite-plugin-pwa": "^1.3.0" });
  }

  if (ai_integration?.enabled && ai_integration.provider === "openai") {
    dependencies = mergeDeps(dependencies, { openai: "^7.0.0" });
  }

  writePackageJson(outDir, { name: project.name, scripts, dependencies, devDependencies });

  // ---- vite.config.ts ----
  const pluginImports = [`import react from "@vitejs/plugin-react";`];
  const plugins = ["react()"];
  if (stack.styling.startsWith("tailwind")) {
    pluginImports.push(`import tailwindcss from "@tailwindcss/vite";`);
    plugins.push("tailwindcss()");
  }
  if (pwa.enabled) {
    pluginImports.push(`import { VitePWA } from "vite-plugin-pwa";`);
    plugins.push(
      `VitePWA({ registerType: "autoUpdate", manifest: { name: "${project.name}", short_name: "${project.name}", start_url: "/", display: "standalone" } })`
    );
  }
  writeFile(
    outDir,
    "vite.config.ts",
    `import { defineConfig } from "vite";\n${pluginImports.join("\n")}\n\nexport default defineConfig({\n  plugins: [${plugins.join(", ")}],\n});\n`
  );

  // ---- tsconfig files ----
  writeFile(
    outDir,
    "tsconfig.json",
    JSON.stringify({ files: [], references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }] }, null, 2) + "\n"
  );
  writeFile(
    outDir,
    "tsconfig.app.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          types: ["vite/client"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2
    ) + "\n"
  );
  writeFile(
    outDir,
    "tsconfig.node.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
        },
        include: ["vite.config.ts"],
      },
      null,
      2
    ) + "\n"
  );

  // ---- index.html ----
  writeFile(
    outDir,
    "index.html",
    `<!doctype html>\n<html lang="hu">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${project.name}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`
  );

  // ---- src/main.tsx ----
  writeFile(
    outDir,
    "src/main.tsx",
    `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./index.css";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);\n`
  );

  writeFile(outDir, "src/index.css", stack.styling.startsWith("tailwind") ? `@import "tailwindcss";\n` : `:root {\n  color-scheme: light dark;\n}\n`);

  // ---- src/App.tsx (+ react-router setup if requested) ----
  const nonHomePages = pages.filter((p) => p.route !== "/");
  if (stack.router === "react-router" && nonHomePages.length) {
    const imports = nonHomePages
      .map((p) => `import ${routeToComponentName(p.route)} from "./pages/${routeToComponentName(p.route)}";`)
      .join("\n");
    const routes = nonHomePages
      .map((p) => `        <Route path="${p.route}" element={<${routeToComponentName(p.route)} />} />`)
      .join("\n");
    writeFile(
      outDir,
      "src/App.tsx",
      `import { BrowserRouter, Routes, Route } from "react-router-dom";\n${imports}\n\nfunction Home() {\n  return (\n    <main className="p-8">\n      <h1 className="text-3xl font-bold tracking-tight">${humanizeSlug(project.name)}</h1>\n      <p className="mt-2 text-slate-600">${project.one_liner.trim().replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        <Route path="/" element={<Home />} />\n${routes}\n      </Routes>\n    </BrowserRouter>\n  );\n}\n`
    );
    for (const p of nonHomePages) {
      const componentName = routeToComponentName(p.route);
      const stubTitle = humanizeRouteSegment(p.route) || p.route;
      writeFile(
        outDir,
        `src/pages/${componentName}.tsx`,
        `export default function ${componentName}() {\n  return (\n    <main className="p-8">\n      <h1 className="text-3xl font-bold tracking-tight">${stubTitle}</h1>\n      <p className="mt-2 text-slate-600">${(p.description || "TODO: implement").replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
      );
    }
  } else {
    writeFile(
      outDir,
      "src/App.tsx",
      `export default function App() {\n  return (\n    <main className="p-8">\n      <h1 className="text-3xl font-bold tracking-tight">${humanizeSlug(project.name)}</h1>\n      <p className="mt-2 text-slate-600">${project.one_liner.trim().replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
    );
  }

  writeFile(outDir, ".gitignore", `node_modules\ndist\n.env\n.env.local\n*.tsbuildinfo\n`);

  // ---- eslint.config.js ----
  writeFile(
    outDir,
    "eslint.config.js",
    `import js from "@eslint/js";\nimport globals from "globals";\nimport reactHooks from "eslint-plugin-react-hooks";\nimport reactRefresh from "eslint-plugin-react-refresh";\nimport tseslint from "typescript-eslint";\n\nexport default tseslint.config(\n  { ignores: ["dist"] },\n  {\n    extends: [js.configs.recommended, ...tseslint.configs.recommended],\n    files: ["**/*.{ts,tsx}"],\n    languageOptions: {\n      ecmaVersion: 2020,\n      globals: globals.browser,\n    },\n    plugins: {\n      "react-hooks": reactHooks,\n      "react-refresh": reactRefresh,\n    },\n    rules: {\n      ...reactHooks.configs.recommended.rules,\n      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],\n    },\n  }\n);\n`
  );

  const agentsMd = buildAgentsMd({ frontMatter, constraintsBlock, developmentOrderBlock, prismaBlock: null });
  writeFile(outDir, "AGENTS.md", agentsMd);
  writeFile(outDir, "CLAUDE.md", agentsMd);
  writeFile(outDir, "README.md", buildReadme({ frontMatter, pages }));
}
