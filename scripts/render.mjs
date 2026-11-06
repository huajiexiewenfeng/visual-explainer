#!/usr/bin/env node
// A small adapter around the unmodified am renderer. No global installation/configuration.
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(HERE, 'vendor', 'answer-me-with-html', 'am.mjs');
const USAGE = `Visual Explainer (Node.js 20+)
  node render.mjs render <draft.md> -o <page.html> [--presentation fusion|am]
  node render.mjs patch <page.html> --panel <ID-or-title> --from <replacement.md>
  node render.mjs source <page.html> -o <draft.md>
  node render.mjs help [flow|sequence|chart|tree|er|timeline|image|code]

New pages default to fusion (doc, shadcn, light). Existing pages keep their presentation.
Use --presentation am on render for other frontmatter layouts, themes and modes.
Write every details section as one complete html fence; see references/renderer.md.
Feedback stays in chat. The adapter never opens a browser or changes global am settings.`;
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));

function fail(message) { throw new Error(message); }

// The canonical details form is a complete HTML subtree. Optional HTML closing tags
// are deliberately not accepted here: explicit closure prevents cross-block repairs.
function validateHtmlDetails(html, line) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  if (!/<\/?details\b/i.test(clean)) return;
  const stack = [];
  for (const token of clean.matchAll(/<\/?([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*\/?>/gi)) {
    const text = token[0], name = token[1].toLowerCase();
    const at = line + clean.slice(0, token.index).split('\n').length;
    if (text.startsWith('</')) {
      const item = stack.pop();
      if (item?.name !== name) fail(`L${at}: mismatched </${name}> inside the details HTML block`);
      if (name === 'details' && !item.summary) fail(`L${at}: each details needs a direct summary`);
      continue;
    }
    if (name === 'details') {
      const attrs = text.replace(/"[^"]*"|'[^']*'/g, '');
      if (/\sopen(?=\s|=|\/?>)/i.test(attrs)) fail(`L${at}: details must be closed by default; remove open`);
    }
    if (name === 'summary' && stack.at(-1)?.name === 'details') stack.at(-1).summary = true;
    if (!VOID.has(name) && !text.endsWith('/>')) stack.push({ name, summary: false });
  }
  if (stack.length) fail(`L${line}: close every tag inside the same details HTML block`);
}

function validateDraft(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let fence;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (fence) {
      if (new RegExp(`^${fence.char}{${fence.length},}\\s*$`).test(text)) {
        if (fence.lang === 'html') validateHtmlDetails(fence.body.join('\n'), fence.line);
        fence = undefined;
      } else fence.body.push(text);
      continue;
    }
    const start = text.match(/^(`{3,}|~{3,})\s*([^\s`]*)\s*(.*)$/);
    if (start) {
      fence = { char: start[1][0], length: start[1].length, lang: start[2].toLowerCase(), line: i + 1, body: [] };
      continue;
    }
    const prose = text.replace(/(`+).*?\1/g, '').replace(/<!--.*?-->/g, '');
    if (/<\/?details\b/i.test(prose)) fail(`L${i + 1}: put the whole details section in ONE html fence; use HTML pre/code, lists and tables inside it`);
  }
  if (fence) fail(`L${fence.line}: unclosed ${fence.lang || 'code'} fence`);
}

function sourceOf(html) {
  const matches = [...html.matchAll(/<textarea\b[^>]*\bid="am-source"[^>]*>([\s\S]*?)<\/textarea>/g)];
  if (!matches.length) return null;
  return matches.at(-1)[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function presentationOf(html) {
  if (!html) return 'fusion';
  const value = html.match(/<meta\b[^>]*name="visual-explainer-presentation"[^>]*content="([^"]+)"/)?.[1] || 'am';
  if (!['fusion', 'am'].includes(value)) fail(`Unknown page presentation: ${value}`);
  return value;
}

function sizeDiagrams(html) {
  // Scale complete native diagrams, preserving measured labels and geometry.
  // A wide diagram retains its intrinsic width and scrolls instead of shrinking its text.
  return html.replace(/<figure\b[^>]*class="[^"]*\bam-diagram\b[^"]*"[^>]*>[\s\S]*?<\/figure>/g, figure =>
    figure.replace(/<svg\b[^>]*>/, tag => {
      const viewBox = tag.match(/\bviewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number);
      const width = viewBox?.length === 4 ? viewBox[2] : NaN;
      if (!Number.isFinite(width) || width <= 0) return tag;
      const desired = Math.round(width * (/\bam-seq\b/.test(figure.slice(0, figure.indexOf('>'))) ? 1.5 : 1.35) * 100) / 100;
      const properties = `--ve-diagram-width:${desired}px;--ve-diagram-min-width:${width}px`;
      if (/\sstyle=(["'])[\s\S]*?\1/.test(tag)) {
        return tag.replace(/\sstyle=(["'])([\s\S]*?)\1/, (_, quote, value) => ` style=${quote}${value};${properties}${quote}`);
      }
      return tag.replace(/>$/, ` style="${properties}">`);
    }));
}

function adaptPage(html, presentation) {
  // Removing these entry buttons makes the bundled reply/remark modules no-op.
  // No script is changed, so the upstream script hashes in the CSP remain valid.
  html = html.replace(/<div class="am-toolbar"[^>]*>[\s\S]*?<\/div>/, (toolbar) =>
    toolbar.replace(/<button\b[^>]*\bdata-am="(?:reply|remark)"[^>]*>[\s\S]*?<\/button>\s*/g, ''));
  const css = `<style id="ve-details-style">
.am-panel details{border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;background:var(--fill)}
.am-panel details>summary{cursor:pointer;font-weight:600;color:var(--ink)}
.am-panel details>summary:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
.am-panel details[open]>summary{margin-bottom:14px}
.am-panel details .am-md{overflow-x:auto}
</style>`;
  const metadata = `<meta name="visual-explainer-renderer" content="am-0.5.11">\n<meta name="visual-explainer-presentation" content="${presentation}">`;
  html = html.replace('</head>', `${css}\n${metadata}\n</head>`);
  if (presentation === 'am') return html;
  const root = html.match(/<html\b[^>]*>/)?.[0] || '';
  if (!html.includes('<main class="am-doc">') || !root.includes('data-theme="shadcn"') || !root.includes('data-mode="light"')) {
    fail('Fusion uses template: doc, theme: shadcn and mode: light. Use --presentation am on render for other layouts, themes or modes. The existing page was preserved.');
  }
  const zh = /\blang="zh(?:-|"|_)/i.test(root);
  const labels = zh
    ? ['方案图解 / visual-explainer', '图为主 · 重点可见 · 详情可展开', '桌面 HTML · 同页持续更新', '反馈留在聊天，完整解释留在页面。']
    : ['visual-explainer', 'Visuals first · Details on demand', 'Desktop HTML · Updates on the same page', 'Feedback in chat. The full explanation on this page.'];
  const fusion = readFileSync(join(HERE, '..', 'assets', 'fusion.css'), 'utf8');
  return sizeDiagrams(html)
    .replace('<html ', '<html data-ve-presentation="fusion" ')
    .replace('</head>', `<style id="ve-fusion-style">${fusion}</style>\n</head>`)
    .replace('<main class="am-doc">', `<main class="am-doc"><div class="ve-masthead"><strong>${labels[0]}</strong><span>${labels[1]}</span></div>`)
    .replace('</main>', `<footer class="ve-footer"><span>${labels[2]}</span><span>${labels[3]}</span></footer></main>`);
}

function parseArgs(argv) {
  const [command, input, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') return { command: 'usage' };
  if (command === 'help') return { command, input };
  if (!['render', 'patch', 'source'].includes(command) || !input || input.startsWith('-')) fail(USAGE);
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i], value = rest[i + 1];
    if (!['-o', '--output', '--panel', '--from', '--presentation'].includes(key) || !value || value.startsWith('--')) fail(`Invalid argument: ${key}\n${USAGE}`);
    const name = key === '-o' ? '--output' : key;
    if (opts[name]) fail(`Repeated option: ${key}`);
    opts[name] = value;
  }
  if (['render', 'source'].includes(command) && (!opts['--output'] || opts['--panel'] || opts['--from'])) fail(USAGE);
  if (command === 'patch' && (!opts['--panel'] || !opts['--from'] || opts['--output'])) fail(USAGE);
  if (opts['--presentation'] && (command !== 'render' || !['fusion', 'am'].includes(opts['--presentation']))) fail(`Use --presentation fusion|am with render.\n${USAGE}`);
  return { command, input: resolve(input), opts };
}

function removeOwned(directory, parent, prefix) {
  if (!directory) return;
  const actual = realpathSync(directory);
  if (dirname(actual) !== realpathSync(parent) || !basename(actual).startsWith(prefix)) fail('Refusing cleanup outside the owned temporary directory');
  rmSync(actual, { recursive: true, force: true });
}

function replaceFile(from, to) {
  // Windows can briefly lock a freshly written HTML file (also handled upstream).
  // Keep the old page intact; retry briefly instead of unlinking it first.
  for (let attempt = 1; ; attempt++) {
    try { return renameSync(from, to); } catch (error) {
      if (process.platform !== 'win32' || attempt > 5 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * attempt);
    }
  }
}

function main() {
  if (Number(process.versions.node.split('.')[0]) < 20) fail('Visual Explainer needs Node.js 20+');
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'usage') return console.log(USAGE);
  if (args.command === 'source') {
    const draft = sourceOf(readFileSync(args.input, 'utf8'));
    if (draft === null) fail('The HTML has no embedded am source');
    const output = resolve(args.opts['--output']);
    if (output === args.input || (existsSync(output) && realpathSync(output) === realpathSync(args.input))) fail('Source output must differ from the HTML page');
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, draft);
    return console.log(`✓ ${output}`);
  }
  let source, previous, output;
  if (args.command !== 'help') {
    source = readFileSync(args.command === 'patch' ? resolve(args.opts['--from']) : args.input, 'utf8');
    validateDraft(source);
    output = args.command === 'patch' ? args.input : resolve(args.opts['--output']);
    if (existsSync(output)) {
      previous = readFileSync(output, 'utf8');
      const original = sourceOf(previous);
      if (original === null) fail('The existing HTML has no am source. Preserve it and edit it directly; do not overwrite it with this renderer.');
      if (args.command === 'patch') validateDraft(original);
    } else if (args.command === 'patch') fail('The page to patch does not exist');
  }
  const presentation = args.opts?.['--presentation'] || presentationOf(previous);
  const tempBase = realpathSync(tmpdir());
  const runtime = mkdtempSync(join(tempBase, 'visual-explainer-render-'));
  let stage, parent;
  try {
    const home = join(runtime, 'home');
    mkdirSync(home);
    writeFileSync(join(home, 'config.json'), JSON.stringify({ open: false, update_check: false, colophon: false, style: 'off', theme: 'shadcn' }));
    let cli;
    if (args.command === 'help') cli = ['help', ...(args.input ? [args.input] : [])];
    else {
      parent = dirname(output);
      mkdirSync(parent, { recursive: true });
      stage = mkdtempSync(join(parent, '.ve-render-'));
      const candidate = join(stage, 'page.html');
      if (args.command === 'patch') {
        copyFileSync(output, candidate);
        cli = ['patch', candidate, '--panel', args.opts['--panel'], '--from', resolve(args.opts['--from']), '--no-open'];
      } else {
        cli = ['render', args.input, '-o', candidate, '--no-open'];
        const frontmatter = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
        if (!/^template\s*:/m.test(frontmatter)) cli.push('--template', 'doc');
        if (presentation === 'fusion' && !/^mode\s*:/m.test(frontmatter)) cli.push('--mode', 'light');
      }
    }
    const result = spawnSync(process.execPath, [VENDOR, ...cli], { env: { ...process.env, AM_HOME: home }, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) fail(`Renderer exited with ${result.status}:\n${(result.stdout + result.stderr).trim()}`);
    if (args.command === 'help') return process.stdout.write(result.stdout);
    const candidate = join(stage, 'page.html');
    writeFileSync(candidate, adaptPage(readFileSync(candidate, 'utf8'), presentation));
    replaceFile(candidate, output);
    console.log(`✓ ${output}`);
    for (const line of result.stdout.split('\n')) {
      if (line.trim() && !line.startsWith('✓ ') && !line.trimStart().startsWith('link:') && !line.includes(stage) && !line.includes(runtime)) console.log(line);
    }
  } finally {
    removeOwned(stage, parent, '.ve-render-');
    removeOwned(runtime, tempBase, 'visual-explainer-render-');
  }
}

try { main(); } catch (error) { console.error(`✗ ${error.message}`); process.exitCode = 1; }
