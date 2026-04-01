import Handlebars from "handlebars";
import matter from "gray-matter";
import { readFileSync } from "fs";
import path from "path";

interface TemplateCache {
  template: HandlebarsTemplateDelegate;
  config: Record<string, unknown>;
}

const cache = new Map<string, TemplateCache>();

function loadPrompt(name: string): TemplateCache {
  if (cache.has(name)) return cache.get(name)!;

  const filePath = path.join(process.cwd(), "src/server/prompts", `${name}.md`);
  const raw = readFileSync(filePath, "utf-8");
  const { data: config, content } = matter(raw);
  const template = Handlebars.compile(content.trim(), { noEscape: true });

  const entry = { template, config };
  cache.set(name, entry);
  return entry;
}

export function renderPrompt<T extends Record<string, unknown>>(
  name: string,
  data?: T,
): { prompt: string; config: Record<string, unknown> } {
  const { template, config } = loadPrompt(name);
  return { prompt: template(data ?? {}), config };
}
