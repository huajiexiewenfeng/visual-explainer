---
title: 先看懂关系，再展开细节
lang: zh
template: doc
theme: shadcn
mode: light
---
示例内容，用于替换成当前主题；不代表系统已经实现。

## A 解释如何进入页面
```flow LR
问题 -> 解释规范: 保留结论与边界
解释规范 -> 内容草稿: 图解优先
内容草稿 -> HTML页面: 渲染图形与布局
```
```html
<p class="takeaway"><strong>图解承担主要解释，支撑内容按需展开。</strong></p>
<p class="boundary"><strong>关键边界：</strong>页面用于讨论，不能把提议画成已经交付的能力。</p>
```

```html
<details>
  <summary>实现细节、代码与验收依据</summary>
  <div class="am-md">
    <p>这里保留完整依据；重要限制同时在图旁说明。</p>
    <pre><code>const feedback = "chat";
if (details.length &gt; 0) {
  preserve(details);
}</code></pre>
    <table>
      <thead><tr><th>检查项</th><th>预期</th></tr></thead>
      <tbody>
        <tr><td>默认视图</td><td>主图、短结论和重要边界可见</td></tr>
        <tr><td>折叠区</td><td>详细依据完整保留，默认关闭</td></tr>
      </tbody>
    </table>
  </div>
</details>
```

## B 反馈与同页更新
```sequence
用户 -> AI: 在聊天中反馈
AI -> 草稿: 更新对应面板
草稿 -> 同一页面: 重新生成内容
```
```html
<p class="takeaway"><strong>反馈留在聊天，仍然有效的内容保留在原页面。</strong></p>
```
