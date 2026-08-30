import fs from "node:fs";
import path from "node:path";
import { load as yamlLoad } from "js-yaml";
import Ajv from "ajv";

/**
 * Extract the YAML front matter and the named ```text/```prisma blocks from a
 * .projectspec.md file's raw content.
 */
export function parseProjectSpec(rawContent) {
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

  return {
    frontMatter,
    prismaBlock,
    pagesBlock,
    constraintsBlock,
    developmentOrderBlock,
  };
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
  return parsed;
}
