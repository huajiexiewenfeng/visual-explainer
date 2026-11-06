import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = mkdtempSync(join(process.env.VE_TEST_DIR || tmpdir(), 've-presentation-test-'));
const driver = join(here, 'render.mjs');
let next = 0;
const run = args => spawnSync(process.execPath, [driver, ...args], { cwd: root, windowsHide: true, encoding: 'utf8' });
const ok = result => assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
const fixture = source => {
  const stem = String(++next), draft = join(root, stem + '.md'), page = join(root, stem + '.html');
  writeFileSync(draft, source);
  return {draft, page};
};
const pageText = page => readFileSync(page, 'utf8');
const panel = (html,id) => html.match(new RegExp('<section[^>]+id="panel-' + id + '"[^>]*>[\\s\\S]*?<\\/section>'))?.[0];
const skin = html => html.match(/<style id="ve-fusion-style">([\s\S]*?)<\/style>/)?.[1];
const cspValid = html => {
  const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  for (const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    assert.ok(csp.includes("'sha256-" + createHash('sha256').update(script).digest('base64') + "'"));
  }
};
const longDetails = '<details><summary>字段与完整依据</summary><div class="am-md"><pre><code>if (pending &lt; limit) {\n  preserve();\n}</code></pre><table><tbody>'
  + Array.from({length:70},(_,i)=>`<tr><td>字段 ${i+1}</td><td>保留解释 ${i+1}</td></tr>`).join('')
  + '</tbody></table><p>LONG_DETAIL_END</p></div></details>';
const source = [
  '---','title: 融合验证','lang: zh','---',
  '提议，尚未实施。',
  '## A 主线','```flow LR','用户 -> 服务: 请求','服务 -> 数据库: 读取','```',
  '```html','<p class="takeaway"><strong>服务读取数据。</strong></p><p class="boundary">重要边界：仅讨论成功路径。</p>','```',
  '## B 顺序','```sequence','用户 -> 服务: 请求','服务 -> 数据库: 读取','数据库 --> 服务: 数据','服务 --> 用户: 返回','```',
  '## C 依据','```html',longDetails,'```',
].join('\n');

test('new pages use the light fusion presentation and retain long native details and valid CSP', () => {
  const {draft,page}=fixture(source);
  ok(run(['render',draft,'-o',page]));
  const html=pageText(page);
  assert.match(html, /name="visual-explainer-presentation" content="fusion"/);
  assert.match(html, /<html[^>]*data-mode="light"/);
  assert.ok(skin(html));
  assert.ok(panel(html,'C').includes(longDetails));
  assert.doesNotMatch(panel(html,'C'), /<details[^>]*\sopen\b/);
  assert.match(panel(html,'A'), /重要边界/);
  assert.doesNotMatch(html, /<button[^>]*data-am="(?:reply|remark)"/);
  cspValid(html);
});

test('three consecutive patches preserve the fusion skin, long details and untouched panels', () => {
  const {draft,page}=fixture(source);
  ok(run(['render',draft,'-o',page]));
  const first=pageText(page), originalDetails=panel(first,'C');
  assert.ok(skin(first));
  for (const [id,body] of [
    ['A','```flow LR\n用户 -> 服务: 请求\n服务 -> 缓存: 优先查询\n```\n关键边界仍可见。'],
    ['B','```sequence\n用户 -> 服务: 请求\n服务 -> 缓存: 查询\n缓存 --> 服务: 数据\n服务 --> 用户: 返回\n```'],
    ['A','```flow LR\n用户 -> 服务: 请求\n服务 -> 缓存: 查询\n缓存 --> 服务: 返回\n```\n仍为提议。'],
  ]) {
    const before=pageText(page), replacement=join(root,'replacement.md');
    writeFileSync(replacement,body);
    ok(run(['patch',page,'--panel',id,'--from',replacement]));
    const after=pageText(page);
    assert.equal(skin(after),skin(first));
    assert.equal((after.match(/id="ve-fusion-style"/g)||[]).length,1);
    assert.equal(panel(after,'C'),originalDetails);
    assert.equal(panel(after,id==='A'?'B':'A'),panel(before,id==='A'?'B':'A'));
    cspValid(after);
  }
  ok(run(['source',page,'-o',draft]));
  assert.match(pageText(draft),/仍为提议/);
  ok(run(['render',draft,'-o',page]));
  assert.equal(skin(pageText(page)),skin(first));
});

test('many-participant sequence keeps native geometry and does not shrink below its intrinsic width', () => {
  const actors=Array.from({length:10},(_,i)=>`参与方${i+1}`);
  const wide='## A 多方时序\n```sequence\n'+actors.slice(0,-1).map((a,i)=>`${a} -> ${actors[i+1]}: 传递`).join('\n')+'\n```';
  const {draft,page}=fixture(wide), raw=join(root,'wide-am.html');
  ok(run(['render',draft,'-o',page]));
  ok(run(['render',draft,'-o',raw,'--presentation','am']));
  const html=pageText(page), rawHtml=pageText(raw);
  const svg=panel(html,'A').match(/<svg\b[\s\S]*?<\/svg>/)[0];
  const rawSvg=panel(rawHtml,'A').match(/<svg\b[\s\S]*?<\/svg>/)[0];
  const width=Number(svg.match(/viewBox="\S+\s+\S+\s+(\S+)\s+/)[1]);
  assert.ok(width>1000,'fixture must exceed the content width');
  assert.ok(svg.includes(`--ve-diagram-min-width:${width}px`));
  const widthStyle=Number(svg.match(/--ve-diagram-width:([\d.]+)px/)[1]);
  assert.ok(widthStyle>=width);
  assert.equal(svg.replace(/ style="--ve-diagram-width:[^"]+"/,''),rawSvg,'geometry, labels and intrinsic viewBox remain identical');
  assert.doesNotMatch(skin(html),/--am-fs-d-/,'do not override measured diagram fonts');
});

test('legacy am pages keep their presentation through patch and full render', () => {
  const legacy='---\ntitle: 旧页面\ntheme: paper\nmode: dark\n---\n## A 内容\n保留。\n## B 更新\n旧内容。';
  const {draft,page}=fixture(legacy);
  ok(run(['render',draft,'-o',page,'--presentation','am']));
  // Pages from before this update have no presentation marker.
  writeFileSync(page,pageText(page).replace(/<meta name="visual-explainer-presentation"[^>]*>\n?/,''));
  const initial=pageText(page), replacement=join(root,'legacy-patch.md');
  writeFileSync(replacement,'新内容。');
  ok(run(['patch',page,'--panel','B','--from',replacement]));
  const after=pageText(page);
  assert.equal(skin(after),undefined);
  assert.match(after,/<html[^>]*data-theme="paper"[^>]*data-mode="dark"/);
  assert.equal(panel(after,'A'),panel(initial,'A'));
  ok(run(['source',page,'-o',draft]));
  ok(run(['render',draft,'-o',page]));
  assert.equal(skin(pageText(page)),undefined);
  assert.match(pageText(page),/data-theme="paper"/);
});

test('explicit presentation switches are supported by full render; invalid requests preserve the old page', () => {
  const {draft,page}=fixture(source);
  ok(run(['render',draft,'-o',page,'--presentation','am']));
  assert.equal(skin(pageText(page)),undefined);
  ok(run(['render',draft,'-o',page,'--presentation','fusion']));
  const before=pageText(page);
  assert.ok(skin(before));
  assert.notEqual(run(['render',draft,'-o',page,'--presentation','unknown']).status,0);
  assert.equal(pageText(page),before);
  writeFileSync(draft,'---\ntheme: paper\nmode: dark\n---\n## A 内容\n新草稿。');
  const conflicting=run(['render',draft,'-o',page]);
  assert.notEqual(conflicting.status,0);
  assert.match(conflicting.stderr,/--presentation am/);
  assert.equal(pageText(page),before);
});
