import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const baseline = process.env.VE_BASELINE === '1';
const driver = join(here, baseline ? 'vendor/answer-me-with-html/am.mjs' : 'render.mjs');
const root = mkdtempSync(join(process.env.VE_TEST_DIR || tmpdir(), 've-test-'));
const home = join(root, 'caller-home');
mkdirSync(home);
const config = '{"open":false,"update_check":false,"style":"off","colophon":false}';
writeFileSync(join(home, 'config.json'), config);
let count = 0;
const run = (args) => spawnSync(process.execPath, [driver, ...args, ...(baseline ? ['--no-open'] : [])], {
  cwd: root, env: { ...process.env, AM_HOME: home }, encoding: 'utf8', windowsHide: true,
});
const ok = (result) => assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
const fixture = (source) => {
  const stem = String(++count);
  const draft = join(root, `${stem}.md`);
  const page = join(root, `${stem}.html`);
  writeFileSync(draft, source);
  return { draft, page };
};
const good = [
  '---', 'title: 图解测试', 'lang: zh', '---',
  '## A 关系', '```flow LR', '规范 -> 草稿: 保留解释', '草稿 -> 页面: 渲染', '```',
  '关键边界保持可见。',
  '```html', '<details><summary>实现细节</summary><div class="am-md">',
  '<pre><code>const ready = false;</code></pre>',
  '<table><tr><th>字段</th><th>含义</th></tr><tr><td>状态</td><td>提议</td></tr></table>',
  '<p>DETAIL_END</p></div></details>', '```',
  '## B 更新', '```sequence', '用户 -> Skill: 反馈', 'Skill -> 页面: 更新', '```',
].join('\n');
const panel = (html, id) => html.match(new RegExp(`<section[^>]+id="panel-${id}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];

test('renders diagrams and complete closed details, with a single-column chat-feedback page', () => {
  const { draft, page } = fixture(good);
  const result = run(['render', draft, '-o', page]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = readFileSync(page, 'utf8');
  assert.match(html, /<main class="am-doc">/);
  assert.match(html, /<figure class="am-diagram am-flow">/);
  assert.match(html, /<figure class="am-diagram am-seq">/);
  assert.match(panel(html, 'A'), /<details><summary>实现细节<\/summary>/);
  assert.match(panel(html, 'A'), /DETAIL_END/);
  assert.doesNotMatch(html, /<button\b[^>]*data-am="(?:reply|remark)"/);
  assert.equal(readFileSync(join(home, 'config.json'), 'utf8'), config);
});

test('rejects details spanning Markdown code or component fences before writing output', () => {
  const { draft, page } = fixture('## A 详情\n<details><summary>展开</summary>\n\n```js\nconst x = 1;\n```\n</details>');
  const result = run(['render', draft, '-o', page]);
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(page), false);
});

test('rejects initially open and improperly nested details', () => {
  for (const body of [
    '<details open><summary>展开</summary><p>内容</p></details>',
    '<details><summary>展开</summary><div>内容</details></div>',
    '<details><p>缺少标题</p></details>',
  ]) {
    const { draft, page } = fixture(`## A 详情\n\`\`\`html\n${body}\n\`\`\``);
    const result = run(['render', draft, '-o', page]);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(page), false);
  }
});

test('patch keeps the same file and unrelated panel; rejected patches leave all bytes unchanged', () => {
  const { draft, page } = fixture(good);
  ok(run(['render', draft, '-o', page]));
  const before = readFileSync(page, 'utf8');
  const replacement = join(root, 'replacement.md');
  writeFileSync(replacement, '## B 更新\n已修改，反馈仍留在聊天。');
  const result = run(['patch', page, '--panel', 'B', '--from', replacement]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const after = readFileSync(page, 'utf8');
  assert.equal(panel(after, 'A'), panel(before, 'A'));
  assert.match(panel(after, 'B'), /已修改/);
  assert.doesNotMatch(after, /<button\b[^>]*data-am="(?:reply|remark)"/);
  writeFileSync(replacement, '## B 更新\n<details><summary>展开</summary>\n```flow\nA -> B\n```\n</details>');
  assert.notEqual(run(['patch', page, '--panel', 'B', '--from', replacement]).status, 0);
  assert.equal(readFileSync(page, 'utf8'), after);
});

test('preserves a handwritten page and an existing page on rendering errors', () => {
  const { draft, page } = fixture(good);
  const manual = '<!doctype html><p>用户已有内容</p>';
  writeFileSync(page, manual);
  assert.notEqual(run(['render', draft, '-o', page]).status, 0);
  assert.equal(readFileSync(page, 'utf8'), manual);
});

test('retains local image data and source through a patch', () => {
  const image = join(root, 'label.svg');
  writeFileSync(image, '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="35">保留图片</text></svg>');
  const { draft, page } = fixture(`## A 图\n![现有图片](${image.replaceAll('\\', '/')})\n## B 说明\n原说明。`);
  ok(run(['render', draft, '-o', page]));
  const before = readFileSync(page, 'utf8');
  assert.match(panel(before, 'A'), /data:image\/svg\+xml;base64,/);
  const patch = join(root, 'image-patch.md');
  writeFileSync(patch, '更新说明。');
  ok(run(['patch', page, '--panel', 'B', '--from', patch]));
  const after = readFileSync(page, 'utf8');
  assert.equal(panel(after, 'A'), panel(before, 'A'));
  assert.match(after, /id="am-source"/);
});

test('exports the current draft after a patch, preserving escaped text and the HTML page', () => {
  const { draft, page } = fixture('## A 保留\n原始文字 &amp; &lt;tag&gt;。\n## B 更新\n旧说明。');
  ok(run(['render', draft, '-o', page]));
  const replacement = join(root, 'source-patch.md');
  writeFileSync(replacement, '新说明 & 比较。');
  ok(run(['patch', page, '--panel', 'B', '--from', replacement]));
  const before = readFileSync(page, 'utf8');
  ok(run(['source', page, '-o', draft]));
  assert.equal(readFileSync(draft, 'utf8'), '## A 保留\n原始文字 &amp; &lt;tag&gt;。\n## B 更新\n新说明 & 比较。');
  assert.equal(readFileSync(page, 'utf8'), before);
  assert.notEqual(run(['source', page, '-o', page]).status, 0);
  assert.equal(readFileSync(page, 'utf8'), before);
});
