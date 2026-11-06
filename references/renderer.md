# Built-in page renderer

Use this guide for pages made with the renderer bundled inside `visual-explainer`. Keep the explanation rules in `SKILL.md`: diagrams carry the explanation, important boundaries stay visible, supporting details remain accessible, and feedback stays in chat.

## Commands

Replace `<skill-dir>` with the absolute directory containing this Skill's `SKILL.md`. Use quoted absolute file paths. Run from the project directory when quoting local code. Prefer an available Node.js 24 runtime (validated); Node.js 20+ is the minimum requirement. If multiple versions exist, use the desired Node executable by its absolute path. No npm installation or separate Skill is needed.

```text
node "<skill-dir>/scripts/render.mjs" render "<draft.md>" -o "<discussion.html>"
node "<skill-dir>/scripts/render.mjs" render "<draft.md>" -o "<discussion.html>" --presentation am
node "<skill-dir>/scripts/render.mjs" patch "<discussion.html>" --panel "B" --from "<replacement.md>"
node "<skill-dir>/scripts/render.mjs" source "<discussion.html>" -o "<draft.md>"
node "<skill-dir>/scripts/render.mjs" help flow
```

Choose the user's output path, otherwise `docs/visuals/<topic>-discussion.html`. Keep that path for the topic. Drafts and replacement text are files; the adapter does not need shell heredocs or stdin. Check the exit code and reported output path.

New pages default to the **fusion** presentation: `template: doc`, `theme: shadcn`, `mode: light`, with no STE rewriting pressure. The adapter embeds `assets/fusion.css`, styles native details, and applies the same presentation after every patch. The delivered page is self-contained; opening it does not require that CSS file or Node.js.

Use `--presentation am` with `render` when the content calls for another am template, theme or mode. That presentation retains the original am toolbar and accepts frontmatter `doc`/`sheet`, bundled themes and light/dark/auto mode. Fusion rejects conflicting frontmatter before replacing an existing file; choose am explicitly for those settings.

Each rendered page records its presentation. `patch` and a full `render` to the same path preserve it; older pages without this marker keep the original am presentation. To migrate a renderer-backed page, export its current source, then render to the same path with `--presentation fusion` and compatible frontmatter. New output paths default to fusion, so use `--presentation am` when recreating an original am page at a new path.

Fusion uses shared page width, heading hierarchy, spacing, colors and folds, without prescribing a topic, number of sections or one diagram size. Small flow/sequence diagrams are enlarged as whole SVGs. Diagrams wider than the content area retain their intrinsic width and scroll; labels and connector geometry are unchanged. Native diagram expansion remains available. Prefer a clearer split when a dense graph becomes hard to follow.

Both presentations remove the upstream Reply/Remark entry buttons and keep feedback in chat. The adapter does not open a browser, run a server, check for updates or change the user's global am settings.

## Draft shape

Start with [the runnable example](../assets/discussion-draft.md), replacing its content with the actual explanation. Each `##` is a panel; explicit unique IDs such as `A`, `B` make later patching unambiguous. Choose as many sections and visuals as the content needs. Do not treat a fixed panel count as a reason to drop material.

Use native component fences for main visuals: `flow`, `sequence`, `er`, `tree`, `timeline`, `chart`, `limits`. Use short Markdown for takeaways and visible boundaries. For the fusion emphasis styles, use a complete `html` block with `<p class="takeaway"><strong>…</strong></p>` and `<p class="boundary"><strong>Important boundary:</strong> …</p>`; write labels in the user’s language. Keep these paragraphs outside details. A local PNG/JPG/WebP/SVG image can be included with ordinary Markdown and an absolute file path; images up to 5 MB are embedded. Remote image URLs are blocked by the generated page. Keep images the user supplied.

Use `help <component>` for exact component syntax. The raw `html` and `svg` fences embed static markup. Upstream CSP blocks arbitrary scripts and network-loaded resources, so use the direct HTML/specialist path when an interaction depends on those capabilities. Do not weaken the page policy merely to add a decorative effect. For generated illustrations, produce a local image through the existing image-generation workflow, then embed it.

## One fold, one complete HTML block

Use this same form for short and long details. The body is HTML, not Markdown. Use HTML paragraphs, lists, tables and escaped `<pre><code>` text. Omit `open` so details start closed. Every details needs a direct, descriptive summary, and all tags close inside this one fence.

````markdown
```html
<details>
  <summary>实现细节与验收依据</summary>
  <div class="am-md">
    <p>保留支撑解释所需的完整内容。</p>
    <ul><li>这是一项提议，尚未实施。</li></ul>
    <pre><code>if (count &lt; limit) {
  keepDetails();
}</code></pre>
    <table>
      <thead><tr><th>检查项</th><th>标准</th></tr></thead>
      <tbody><tr><td>同页更新</td><td>保持原文件路径</td></tr></tbody>
    </table>
  </div>
</details>
```
````

Escape literal `&`, `<` and `>` in code/text. Use `<h3>` for a detail subheading, not a Markdown `##` panel. Keep renderer component fences outside the fold. If a secondary visual belongs inside it, embed a complete static SVG or local `<img>` in the same HTML block.

The renderer parses Markdown fences into separate blocks. Wrapping `<details>` around those blocks creates invalid nesting even when rendering exits successfully. The adapter rejects that form instead of silently moving information out of the fold.

## Same-page changes

For one panel, write its replacement to a file and call `patch`. A replacement body without a `##` heading keeps the old heading; a replacement with a heading must contain exactly one panel. Other panel source is retained. The adapter checks the replacement and original draft, renders a candidate, reapplies the recorded presentation, then replaces the original file only after success. A missing panel or invalid draft leaves the original page intact.

The HTML contains its source in `#am-source`. After patching, that embedded source is authoritative: use the `source` command above to synchronize any separately kept Markdown draft before using it for a later full render. Do not manually edit a rendered page and expect those edits to survive the next patch. Use `render` to rewrite the same path for broader changes from the complete, current draft.

Code/image references may be read again during patching; unchanged panel source does not guarantee unchanged external files. Preserve the referenced inputs if the page must retain a snapshot. Handwritten HTML without embedded am source is not migrated or overwritten by the adapter; continue editing that page directly unless migration is explicitly part of the task.

Open or refresh a supported preview after generating the page. File updates alone do not reload a browser tab. A browser-policy rejection is a preview limitation, not permission to work around that policy; report the limitation and provide the file link.

## Bundled version and checks

The renderer is the unmodified upstream bundle at `scripts/vendor/answer-me-with-html/am.mjs`. Its pinned version, commit and digest are in `upstream.json`, beside upstream LICENSE and the Bangers font license. This Skill is the user-facing entrypoint; do not install or load the upstream Skill to use the bundle.

For an intentional renderer/adapter update, run:

```text
node --test "<skill-dir>/scripts/render.test.mjs" "<skill-dir>/scripts/presentation.test.mjs"
```

`VE_TEST_DIR` can point to an existing writable directory when a sandbox disallows renaming files in its system temporary folder. Tests cover complete closed details, invalid fold rejection, unrelated content preservation, handwritten-page protection, local images, fusion defaults, wide sequences, long details, continuous patches, legacy presentation preservation and script CSP integrity. They do not substitute for inspecting the changed area in a desktop browser when available.
