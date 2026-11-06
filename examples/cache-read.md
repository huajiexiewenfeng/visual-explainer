---
title: 缓存读取：命中直返，未命中回源
lang: zh
template: doc
theme: shadcn
mode: light
---
假设方案 · 仅讨论数据库读取成功的路径 · 尚未实施

## A 从请求到返回，看清两条路径
```flow LR
(读取请求) -> [(缓存)]: key
缓存 -> {有效命中?}
有效命中? -> (返回缓存): 是
有效命中? -> [(数据库)]: 否
数据库 -> (返回数据): 读取成功
数据库 --> 后台回填: key / value / ttl
```

```html
<p class="takeaway"><strong>命中直接返回；未命中读取数据库，返回不等待后台回填。</strong></p>
<p class="boundary"><strong>重要边界：</strong>仍为提议：回填完成前，重复请求仍可能查库。主图不承诺后台成功或重试，失败策略待定。</p>
```

```html
<details id="implementation"><summary>伪代码与三条拟议验收条件</summary><div class="am-md">
<h3>伪代码（提议）</h3><pre><code>async function read(key, ttl) {
  const hit = await cache.get(key);
  if (hit.found &amp;&amp; !hit.expired) return hit.value;
  const value = await database.read(key);
  scheduleBackground(async () =&gt; {
    await cache.set(key, value, ttl);
  });
  return value;
}</code></pre>
<p>scheduleBackground 仅示意后台调度，不指定实现；本次返回不等待回填完成。</p>
<h3>三条拟议验收条件（尚未执行）</h3><ol id="acceptance-criteria">
<li>命中且未过期时返回缓存 value，不读取数据库。</li>
<li>未命中或已过期时读取数据库，并使用一致的 key、value 和指定 ttl 回填。</li>
<li>数据库读取成功后不等待回填完成即可返回；通过延迟回填验证本次返回先发生。</li></ol></div></details>
```
## B 命中缓存时，数据库不参与
```sequence
调用方 -> 读取服务: read(key)
读取服务 -> 缓存: GET key
缓存 --> 读取服务: 命中且未过期
读取服务 --> 调用方: value
```

```html
<p class="takeaway"><strong>命中且未过期时直接返回缓存值，不读取数据库。</strong></p>
<p class="boundary"><strong>重要边界：</strong>提议范围：缓存不可用、空值处理和并发请求合并尚未定义；此图只表示有效命中的分支。</p>
```

```html
<details id="fields"><summary>字段定义与示例边界</summary><div class="am-md">
<h3>字段定义</h3>
<table><thead><tr><th>字段</th><th>含义</th><th>约束</th></tr></thead><tbody>
<tr><td>key</td><td>缓存条目标识</td><td>字符串，与数据库查询标识一致</td></tr>
<tr><td>value</td><td>查询得到的数据</td><td>回填值与本次返回数据一致</td></tr>
<tr><td>ttl</td><td>有效期，单位秒</td><td>正数；具体值由业务确定</td></tr>
</tbody></table>
<h3>示例边界</h3><ul><li>本例用于比较解释页面的呈现方式，不是项目的已确认设计。</li><li>没有性能测量，也没有验证实际缓存或数据库服务。</li><li>空值、缓存不可用、后台失败与重试策略仍需设计。</li></ul>
</div></details>
```
