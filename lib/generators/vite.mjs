import {
  writeFile,
  writePackageJson,
  mergeDeps,
  routeToComponentName,
  buildAgentsMd,
  buildReadme,
} from "./common.mjs";

export function generateViteProject(outDir, spec) {
  const { frontMatter, pages, constraintsBlock, developmentOrderBlock } = spec;
  const { project, stack, ai_integration, pwa } = frontMatter;

  const scripts = {
    dev: "vite",
    build: "tsc -b && vite build",
    lint: "eslint .",
    preview: "vite preview",
  };

  let dependencies = { react: "^19.0.0", "react-dom": "^19.0.0" };
  let devDependencies = {
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.0",
    eslint: "^10",
    "eslint-plugin-react-hooks": "^7.0.0",
    "eslint-plugin-react-refresh": "^0.5.0",
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
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
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
      { compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", strict: true }, include: ["vite.config.ts"] },
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
      `import { BrowserRouter, Routes, Route } from "react-router-dom";\n${imports}\n\nfunction Home() {\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">${project.name}</h1>\n      <p className="mt-2 text-gray-600">${project.one_liner.trim().replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        <Route path="/" element={<Home />} />\n${routes}\n      </Routes>\n    </BrowserRouter>\n  );\n}\n`
    );
    for (const p of nonHomePages) {
      const componentName = routeToComponentName(p.route);
      writeFile(
        outDir,
        `src/pages/${componentName}.tsx`,
        `export default function ${componentName}() {\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">${p.route}</h1>\n      <p className="mt-2 text-gray-600">${(p.description || "TODO: implement").replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
      );
    }
  } else {
    writeFile(
      outDir,
      "src/App.tsx",
      `export default function App() {\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">${project.name}</h1>\n      <p className="mt-2 text-gray-600">${project.one_liner.trim().replace(/`/g, "'")}</p>\n    </main>\n  );\n}\n`
    );
  }

  writeFile(outDir, ".gitignore", `node_modules\ndist\n.env\n.env.local\n*.tsbuildinfo\n`);

  const agentsMd = buildAgentsMd({ frontMatter, constraintsBlock, developmentOrderBlock, prismaBlock: null });
  writeFile(outDir, "AGENTS.md", agentsMd);
  writeFile(outDir, "CLAUDE.md", agentsMd);
  writeFile(outDir, "README.md", buildReadme({ frontMatter, pages }));
}
