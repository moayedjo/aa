#!/usr/bin/env node
/**
 * claude-design — project-local MCP server for this repository.
 *
 * A persistent design studio: designs are stored as versioned, self-contained
 * HTML files under design-studio/ so they survive across sessions and can be
 * reviewed in git. Optional screenshot rendering uses playwright-core when a
 * Chromium executable can be found.
 *
 * Storage layout:
 *   design-studio/<slug>/design.json   (metadata: title, notes per version)
 *   design-studio/<slug>/v001.html     (one file per version)
 *   design-studio/<slug>/v001.png      (screenshot, if rendered)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SERVER_DIR, '..', '..');
const STUDIO_DIR = process.env.CLAUDE_DESIGN_STUDIO_DIR
  ? path.resolve(process.env.CLAUDE_DESIGN_STUDIO_DIR)
  : path.join(REPO_ROOT, 'design-studio');

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function assertSlug(name) {
  if (!SLUG_RE.test(name)) {
    throw new Error(
      `Invalid design name "${name}". Use lowercase letters, digits, "-" or "_" (max 64 chars).`
    );
  }
}

function versionFile(n) {
  return `v${String(n).padStart(3, '0')}.html`;
}

async function readMeta(slug) {
  const file = path.join(STUDIO_DIR, slug, 'design.json');
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function writeMeta(slug, meta) {
  const dir = path.join(STUDIO_DIR, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'design.json'), JSON.stringify(meta, null, 2) + '\n');
}

function text(s) {
  return { content: [{ type: 'text', text: s }] };
}

async function findChromium() {
  if (process.env.CLAUDE_DESIGN_CHROMIUM) return process.env.CLAUDE_DESIGN_CHROMIUM;
  try {
    const { chromium } = await import('playwright-core');
    const p = chromium.executablePath();
    await fs.access(p);
    return p;
  } catch {
    /* fall through to a manual scan */
  }
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(process.env.HOME || '/root', '.cache', 'ms-playwright'),
  ].filter(Boolean);
  for (const root of roots) {
    try {
      for (const entry of await fs.readdir(root)) {
        if (!entry.startsWith('chromium')) continue;
        for (const candidate of [
          path.join(root, entry, 'chrome-linux', 'chrome'),
          path.join(root, entry, 'chrome-linux', 'headless_shell'),
          path.join(root, entry),
        ]) {
          try {
            const stat = await fs.stat(candidate);
            if (stat.isFile()) return candidate;
          } catch {
            /* try next candidate */
          }
        }
      }
    } catch {
      /* try next root */
    }
  }
  return null;
}

const server = new McpServer({ name: 'claude-design', version: '0.1.0' });

server.registerTool(
  'list_designs',
  {
    title: 'List designs',
    description:
      'List all designs in the studio with their latest version number, title and notes.',
    inputSchema: {},
  },
  async () => {
    let slugs = [];
    try {
      slugs = (await fs.readdir(STUDIO_DIR, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      /* studio dir does not exist yet */
    }
    const designs = [];
    for (const slug of slugs.sort()) {
      const meta = await readMeta(slug);
      if (meta) designs.push(meta);
    }
    if (designs.length === 0) {
      return text(`No designs yet. Studio directory: ${STUDIO_DIR}. Use save_design to create one.`);
    }
    return text(JSON.stringify(designs, null, 2));
  }
);

server.registerTool(
  'get_design',
  {
    title: 'Get design HTML',
    description: 'Return the HTML of a design. Defaults to the latest version.',
    inputSchema: {
      name: z.string().describe('Design name (slug)'),
      version: z.number().int().min(1).optional().describe('Version number; latest if omitted'),
    },
  },
  async ({ name, version }) => {
    assertSlug(name);
    const meta = await readMeta(name);
    if (!meta) throw new Error(`Design "${name}" not found. Use list_designs to see what exists.`);
    const v = version ?? meta.latestVersion;
    if (v < 1 || v > meta.latestVersion) {
      throw new Error(`Version ${v} does not exist; "${name}" has versions 1..${meta.latestVersion}.`);
    }
    const html = await fs.readFile(path.join(STUDIO_DIR, name, versionFile(v)), 'utf8');
    return text(html);
  }
);

server.registerTool(
  'save_design',
  {
    title: 'Save design version',
    description:
      'Save a design as a new version (v1 if the design does not exist yet). ' +
      'HTML should be fully self-contained: inline CSS, no external network dependencies.',
    inputSchema: {
      name: z.string().describe('Design name (slug), e.g. "wedding-invite-gold"'),
      html: z.string().min(1).describe('Complete self-contained HTML document'),
      title: z.string().optional().describe('Human-readable title (kept from before if omitted)'),
      notes: z.string().optional().describe('What changed in this version'),
    },
  },
  async ({ name, html, title, notes }) => {
    assertSlug(name);
    const now = new Date().toISOString();
    const meta = (await readMeta(name)) ?? {
      name,
      title: title ?? name,
      createdAt: now,
      latestVersion: 0,
      versions: [],
    };
    if (title) meta.title = title;
    meta.latestVersion += 1;
    meta.updatedAt = now;
    meta.versions.push({ version: meta.latestVersion, savedAt: now, notes: notes ?? '' });
    await fs.mkdir(path.join(STUDIO_DIR, name), { recursive: true });
    await fs.writeFile(path.join(STUDIO_DIR, name, versionFile(meta.latestVersion)), html);
    await writeMeta(name, meta);
    return text(
      `Saved "${name}" v${meta.latestVersion} → ${path.join(STUDIO_DIR, name, versionFile(meta.latestVersion))}`
    );
  }
);

server.registerTool(
  'screenshot_design',
  {
    title: 'Screenshot design',
    description:
      'Render a design version to a PNG next to its HTML file using headless Chromium ' +
      '(requires playwright-core plus a Chromium install; set CLAUDE_DESIGN_CHROMIUM to point ' +
      'at a Chrome/Chromium binary if auto-detection fails). Returns the image.',
    inputSchema: {
      name: z.string().describe('Design name (slug)'),
      version: z.number().int().min(1).optional().describe('Version number; latest if omitted'),
      width: z.number().int().min(200).max(4000).optional().describe('Viewport width, default 1200'),
      height: z.number().int().min(200).max(4000).optional().describe('Viewport height, default 800'),
      fullPage: z.boolean().optional().describe('Capture full page height, default true'),
    },
  },
  async ({ name, version, width, height, fullPage }) => {
    assertSlug(name);
    const meta = await readMeta(name);
    if (!meta) throw new Error(`Design "${name}" not found.`);
    const v = version ?? meta.latestVersion;
    const htmlPath = path.join(STUDIO_DIR, name, versionFile(v));
    await fs.access(htmlPath);

    const executablePath = await findChromium();
    if (!executablePath) {
      throw new Error(
        'No Chromium executable found. Install one (e.g. `npx playwright-core install chromium` ' +
          'or a system Chrome) or set CLAUDE_DESIGN_CHROMIUM to its path.'
      );
    }
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath });
    try {
      const page = await browser.newPage({
        viewport: { width: width ?? 1200, height: height ?? 800 },
      });
      await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
      const pngPath = htmlPath.replace(/\.html$/, '.png');
      const buffer = await page.screenshot({ path: pngPath, fullPage: fullPage ?? true });
      return {
        content: [
          { type: 'text', text: `Screenshot of "${name}" v${v} saved to ${pngPath}` },
          { type: 'image', data: buffer.toString('base64'), mimeType: 'image/png' },
        ],
      };
    } finally {
      await browser.close();
    }
  }
);

server.registerTool(
  'get_design_tokens',
  {
    title: 'Get repo design tokens',
    description:
      'Extract design tokens (colors, fonts, radii) from the Tailwind configs and global ' +
      'stylesheets of the apps in this repository, so new designs match the existing brand.',
    inputSchema: {},
  },
  async () => {
    const sources = [];
    for (const app of ['jo-print', 'orooood']) {
      for (const rel of ['tailwind.config.ts', 'tailwind.config.js', 'app/globals.css']) {
        const file = path.join(REPO_ROOT, app, rel);
        try {
          const raw = await fs.readFile(file, 'utf8');
          const colors = [...new Set(raw.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])];
          const fonts = [...new Set(raw.match(/['"]([A-Z][A-Za-z ]{2,30})['"]/g) ?? [])]
            .map((m) => m.slice(1, -1))
            .filter((f) => !/Config|DEFAULT/.test(f));
          sources.push({ file: path.join(app, rel), colors, fonts, raw });
        } catch {
          /* file not present in this app */
        }
      }
    }
    if (sources.length === 0) return text('No token sources found (tailwind config / globals.css).');
    return text(JSON.stringify(sources, null, 2));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
