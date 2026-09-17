import fs from "node:fs";
import path from "node:path";
import { load as yamlLoad } from "js-yaml";
import Ajv from "ajv";

/**
 * ChatGPT/LLM outputs sometimes wrap the entire generated file in a single
 * outer ``` fence (e.g. ```markdown ... ```) despite instructions not to.
 * A real projectspec always starts with the YAML front matter delimiter
 * (---), so if the whole file is instead wrapped in one outer fence, strip
 * just that outer layer and keep the inner ```prisma/```text fences intact.
 */
function stripOuterFence(rawContent) {
  const lines = rawContent.split("\n");
  let start = 0;
  let end = lines.length - 1;
  while (start <= end && lines[start].trim() === "") start++;
  while (end >= start && lines[end].trim() === "") end--;

  if (start > end) return rawContent;
  if (!/^```\S*$/.test(lines[start].trim())) return rawContent;
  if (lines[end].trim() !== "```") return rawContent;

  return lines.slice(start + 1, end).join("\n");
}

/**
 * Extract the YAML front matter and the named ```text/```prisma blocks from a
 * .projectspec.md file's raw content.
 */
export function parseProjectSpec(rawContent) {
  rawContent = stripOuterFence(rawContent);

  const frontMatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontMatterMatch) {
    throw new Error(
      "Nem található YAML front matter (--- ... --- blokk) a fájl elején."
    );
  }

  let frontMatter;
  try {
    frontMatter = yamlLoad(frontMatterMatch[1]);
  } catch (err) {
    throw new Error(`Hibás YAML a front matterben: ${err.message}`);
  }

  const rest = rawContent.slice(frontMatterMatch[0].length);

  const prismaMatch = rest.match(/```prisma\n([\s\S]*?)\n```/);
  const prismaBlock = prismaMatch ? prismaMatch[1].trim() : null;

  const pagesMatch = rest.match(/```text\n# pages\n([\s\S]*?)\n```/);
  const pagesBlock = pagesMatch ? pagesMatch[1].trim() : null;

  const constraintsMatch = rest.match(/```text\n# constraints\n([\s\S]*?)\n```/);
  const constraintsBlock = constraintsMatch ? constraintsMatch[1].trim() : null;

  const devOrderMatch = rest.match(/```text\n# development-order\n([\s\S]*?)\n```/);
  const developmentOrderBlock = devOrderMatch ? devOrderMatch[1].trim() : null;

  const uiScreensMatch = rest.match(/```text\n# ui-screens\n([\s\S]*?)\n```/);
  const uiScreensBlock = uiScreensMatch ? uiScreensMatch[1].trim() : null;

  const navigationMatch = rest.match(/```text\n# navigation\n([\s\S]*?)\n```/);
  const navigationBlock = navigationMatch ? navigationMatch[1].trim() : null;

  return {
    frontMatter,
    prismaBlock,
    pagesBlock,
    constraintsBlock,
    developmentOrderBlock,
    uiScreensBlock,
    navigationBlock,
  };
}

/**
 * Parse a data-operation expression like:
 *   "Person.findMany()"
 *   "Event.findMany(where: personId={id})"
 *   "Person.findUnique({id})"
 *   "Person.create()"
 *   "Person.update({id})"
 *   "Person.delete({id})"
 */
export function parseOperation(expr) {
  const m = expr.trim().match(/^(\w+)\.(findMany|findUnique|create|update|delete)\((.*)\)$/);
  if (!m) return null;
  const [, model, op, argsRaw] = m;
  const args = argsRaw.trim();

  if (op === "findMany") {
    const whereMatch = args.match(/where:\s*(\w+)=\{(\w+)\}/);
    return whereMatch
      ? { model, op, filterField: whereMatch[1], paramName: whereMatch[2] }
      : { model, op, filterField: null, paramName: null };
  }

  // findUnique / update / delete all take a single {param}
  const paramMatch = args.match(/\{(\w+)\}/);
  return { model, op, filterField: null, paramName: paramMatch ? paramMatch[1] : null };
}

/** Extract dynamic segment names from a route, e.g. "/people/[id]/edit" -> ["id"] */
export function extractRouteParams(route) {
  return [...route.matchAll(/\[(\w+)\]/g)].map((m) => m[1]);
}

/**
 * Parse the "# ui-screens" block into a list of screen descriptors.
 * Each screen starts with a "## /route" header line.
 */
export function parseUiScreens(uiScreensBlock) {
  if (!uiScreensBlock) return [];

  const screenChunks = uiScreensBlock
    .split(/^## /m)
    .map((s) => s.trim())
    .filter(Boolean);

  return screenChunks.map((chunk) => {
    const [routeLine, ...bodyLines] = chunk.split("\n");
    const route = routeLine.trim();
    const body = bodyLines.join("\n");

    const elements = [];

    for (const m of body.matchAll(/\[Input:\s*(\w+)\s*\(([^)]*)\)(?:\s*placeholder="([^"]*)")?\]/g)) {
      const [, name, typeAndMods, placeholder] = m;
      const parts = typeAndMods.split(",").map((s) => s.trim());
      elements.push({
        kind: "input",
        name,
        type: parts[0] || "text",
        required: parts.includes("required"),
        placeholder: placeholder || null,
      });
    }

    for (const m of body.matchAll(/\[Button:\s*([^\]]*?)\s*->\s*([^\]]+)\]/g)) {
      const [, label, action] = m;
      const isNavigation = action.trim().startsWith("/");
      elements.push({
        kind: "button",
        label: label.trim(),
        action: action.trim(),
        isNavigation,
        operation: isNavigation ? null : parseOperation(action.trim()),
      });
    }

    for (const m of body.matchAll(/\[Link:\s*([^\]]*?)\s*->\s*([^\]]+)\]/g)) {
      const [, label, target] = m;
      elements.push({ kind: "link", label: label.trim(), target: target.trim() });
    }

    for (const m of body.matchAll(/\[Table:\s*columns=([^;]+);\s*rows=([^;\]]+?)(?:;\s*rowLink=([^\]]+))?\]/g)) {
      const [, columns, rowsExpr, rowLink] = m;
      elements.push({
        kind: "table",
        columns: columns.split(",").map((c) => c.trim()),
        operation: parseOperation(rowsExpr.trim()),
        rowLink: rowLink ? rowLink.trim() : null,
      });
    }

    for (const m of body.matchAll(/\[List:\s*rows=([^\]]+)\]/g)) {
      elements.push({ kind: "list", operation: parseOperation(m[1].trim()) });
    }

    for (const m of body.matchAll(/\[Data:\s*([^\]]+)\]/g)) {
      elements.push({ kind: "data", operation: parseOperation(m[1].trim()) });
    }

    for (const m of body.matchAll(/\[Text:\s*([^\]]+)\]/g)) {
      elements.push({ kind: "text", value: m[1].trim() });
    }

    // The first non-decorative, non-bracket line is treated as the screen heading.
    const strippedBody = body
      .replace(/\[[^\]]+\]/g, "")
      .split("\n")
      .map((l) => l.trim().replace(/^[│┌┐└┘┴┬├┤┼\s]+|[│┌┐└┘┴┬├┤┼\s]+$/g, "").trim())
      .filter((l) => l && !/^[┌┐└┘─│┴┬├┤┼\s]+$/.test(l));
    const heading = strippedBody[0] || null;

    return { route, params: extractRouteParams(route), heading, elements };
  });
}

/** Parse "[Nav: Label -> /route, Label -> /route, ...]" into a list of {label, route}. */
export function parseNavigation(navigationBlock) {
  if (!navigationBlock) return [];
  const m = navigationBlock.match(/\[Nav:\s*([^\]]+)\]/);
  if (!m) return [];
  return m[1].split(",").map((pair) => {
    const [label, route] = pair.split("->").map((s) => s.trim());
    return { label, route };
  });
}

/**
 * Check that every static screen route has an inbound link (from nav or another
 * screen's Button/Link/rowLink), and every dynamic route has at least one
 * template-level inbound link. Returns a list of human-readable warnings;
 * never throws — this is advisory, not a hard failure.
 */
export function checkOrphanRoutes(screens, navItems) {
  const toPattern = (route) => route.replace(/\[(\w+)\]/g, "{$1}").replace(/\{\w+\}/g, "{PARAM}");

  const targets = new Set();
  for (const item of navItems) targets.add(toPattern(item.route));
  for (const screen of screens) {
    for (const el of screen.elements) {
      if (el.kind === "button" && el.isNavigation) targets.add(toPattern(el.action));
      if (el.kind === "link") targets.add(toPattern(el.target));
      if (el.kind === "table" && el.rowLink) targets.add(toPattern(el.rowLink));
    }
  }

  const warnings = [];
  for (const screen of screens) {
    if (screen.route === "/") continue; // entry point, never orphaned
    if (!targets.has(toPattern(screen.route))) {
      warnings.push(
        `⚠️  "${screen.route}" nincs belinkelve sehonnan (sem a navigációból, sem másik képernyőről).`
      );
    }
  }
  return warnings;
}

/**
 * Parse the "# pages" block into a list of { route, description }.
 * Expected line format: "/some/path         → leírás szövege"
 */
export function parsePagesBlock(pagesBlock) {
  if (!pagesBlock) return [];
  return pagesBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("→");
      const route = parts[0].trim();
      const description = parts.length > 1 ? parts.slice(1).join("→").trim() : "";
      return { route, description };
    })
    .filter((p) => p.route.startsWith("/"));
}

/**
 * Validate the parsed front matter against the projectspec JSON Schema.
 * Throws with a readable message listing all validation errors if invalid.
 */
export function validateFrontMatter(frontMatter, schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(frontMatter);

  if (!valid) {
    const messages = validate.errors
      .map((e) => `  - ${e.instancePath || "(root)"} ${e.message}`)
      .join("\n");
    throw new Error(`A spec nem felel meg a schema-nak:\n${messages}`);
  }

  return true;
}

export function loadAndValidate(specFilePath, schemaPath) {
  const raw = fs.readFileSync(specFilePath, "utf-8");
  const parsed = parseProjectSpec(raw);
  validateFrontMatter(parsed.frontMatter, schemaPath);
  parsed.pages = parsePagesBlock(parsed.pagesBlock);
  parsed.screens = parseUiScreens(parsed.uiScreensBlock);
  parsed.navItems = parseNavigation(parsed.navigationBlock);
  parsed.orphanWarnings = checkOrphanRoutes(parsed.screens, parsed.navItems);
  return parsed;
}
