# visual-explainer · 方案图解

用图解释技术方案，把关键结论留在眼前，把完整细节放进可展开的 HTML。讨论继续时，在同一页面上更新。

Visual-first technical explanations with polished HTML, expandable details, and updates to the same page.

## 能做什么

- **图解优先**：按内容选择流程图、时序图、架构图或其他合适的表达，不把长段文字简单塞进方框。
- **保留完整解释**：结论、关系、取舍与重要限制保持可见；代码、字段、推导和验收依据放在原生 `details` 中，默认折叠。
- **默认融合样式**：统一标题、留白、配色和折叠样式；复用 am 自动绘图，保留图形的原始排版和字号关系。
- **同页更新**：修改对应章节后重新生成同一路径，并自动应用页面原有的呈现方式。
- **一个 Skill**：内置 `answer-me-with-html` 渲染器，无需另装第二个 Skill，也无需 `npm install`。

特殊图解仍可使用自定义 HTML/SVG，已有手写 HTML 继续直接编辑。反馈留在聊天中，页面不会把点击自动发送给 AI。

## 安装

把本仓库克隆或下载到你的 Agent 使用的 Skills 目录，文件夹命名为 `visual-explainer`。下面用占位路径表示你的 Skills 目录：

```text
git clone https://github.com/huajiexiewenfeng/visual-explainer.git <skills-directory>/visual-explainer
```

目录根部包含 `SKILL.md`，无需构建。使用内置渲染器生成或更新页面需要 **Node.js 20+，推荐 Node.js 24**；打开生成后的单文件 HTML 不需要 Node.js。

## 使用

在支持 Skills 的 Agent 中调用：

```text
$visual-explainer
把这个方案整理成图解：先展示关键流程和边界，详细代码与字段按需展开。
```

继续在聊天中提出修改，例如：

```text
把通知改成异步，不等待通知完成就返回；在原页面更新图和解释，保留其他有效内容。
```

也可以在仓库根目录直接运行渲染入口：

```sh
node scripts/render.mjs render examples/cache-read.md -o output/cache-read.html
node scripts/render.mjs source output/cache-read.html -o output/current-draft.md
```

新页面默认采用浅色融合版。需要原 am 的纸张、蓝图、深色主题或其他布局时，使用 `--presentation am`，并在源稿 frontmatter 中选择对应配置：

```sh
node scripts/render.mjs render examples/cache-read.md -o output/am-page.html --presentation am
```

单章节更新使用 `patch --panel <章节 ID> --from <替换源稿>`。已有 am 页面保留原呈现方式；手写 HTML 不会被渲染器覆盖。文件更新后，需要刷新浏览器页面。

完整命令、折叠写法、主题选择和迁移方式见 [渲染器指南](references/renderer.md)。解释原则见 [SKILL.md](SKILL.md)。

## 示例

- [缓存读取源稿](examples/cache-read.md)
- [完整 HTML 示例](examples/cache-read.html)：下载后用桌面浏览器打开。GitHub 文件页展示源代码。

示例展示缓存读取的流程图、命中时序图，以及包含代码、字段与验收条件的折叠区。内容是尚未实施的假设方案，不代表真实系统或性能测试结果。

## 渲染与样式

`visual-explainer` 负责解释规范和页面呈现，内置的 am 负责标准图形、源稿保存与章节更新。融合样式由 `assets/fusion.css` 统一维护，在首次生成和后续更新时自动应用。

图形按整体 SVG 缩放，不单独改动已经测量的图中文字。较宽的图保留原始宽度并支持横向滚动；复杂内容仍应按理解需要拆成多张图。融合版使用 `doc / shadcn / light`，其他组合可选择 am 呈现方式。

## 验证

```sh
node --test scripts/render.test.mjs scripts/presentation.test.mjs
```

测试覆盖折叠结构、源稿与图片保留、连续更新、长内容、多参与方时序图、旧页面兼容和脚本 CSP 校验。自动测试不能替代浏览器中的视觉与交互检查。

## 来源与许可

原创说明、样式和适配代码采用 [MIT](LICENSE)。内置渲染器来自 [QingYunA/answer-me-with-html](https://github.com/QingYunA/answer-me-with-html)，保留未修改的上游包及原始许可。

详细版本、提交和摘要见 [upstream.json](scripts/vendor/answer-me-with-html/upstream.json)，第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
