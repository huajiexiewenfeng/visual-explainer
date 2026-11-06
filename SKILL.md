---
name: visual-explainer
description: Explain technical ideas through visual-first desktop HTML, concise takeaways and expandable details. Use when the user wants a long AI explanation made easier to understand with diagrams or images, or continues a technical discussion visually.
---

# Visual Explainer

Help the user understand what the AI is explaining. Put the substantive explanation in a clear HTML page; keep a few useful takeaways in chat. Feedback stays in chat and revisions stay on the same page. Follow the user's language.

## Preserve the explanation

When converting an existing answer, identify its conclusion, reasoning, recommendations, relationships and material boundaries before choosing a layout. Carry those meanings into the page. Reorganize and shorten repetition, but do not discard important points to fit one diagram or one screen. Do not replace the explanation with a narrower question, an A/B poll or a sequence of forced decisions.

Keep facts, proposals and unknowns distinguishable where they affect interpretation. Preserve tradeoffs and constraints; don't silently turn a suggestion into an approved design, an illustration into a measurement, or an arrow into an implemented capability. Use existing relevant sources; do not start broad research just to decorate an answer.

## Default presentation: visuals first

Make diagrams or images carry the explanation. The default reading path is a relevant visual plus a short takeaway, not paragraphs or long tables with a decorative picture. Use several visuals when the content needs them; do not force a complete proposal into one image or one screen.

- Keep visible prose to short headings, labels, captions and the few points needed to read the visual. Show relationships, sequence, responsibility, branching or comparison through the visual itself; replacing paragraphs with text-heavy boxes is not enough.
- Put implementation details, field definitions, file locations, long comparison tables, supporting evidence and full acceptance criteria in native details sections, closed by default. Give each summary a clear label so the user can find the detail.
- Keep material limitations, tradeoffs and fact/proposal/unknown labels visible beside the relevant graphic. Folding detail must not hide a condition that changes the conclusion or make a proposed capability look implemented.
- Preserve the substantive explanation across the visual, concise text and expandable detail. Default-collapsed content remains accessible; it is not discarded. A small table or sentence is still appropriate when it is the clearest explanation.

## Choose the visual from the content

Choose by what the reader needs to understand, not by a fixed visual style. Combine compatible diagrams when one cannot explain the whole proposal; keep names, colors and direction conventions consistent.

| What needs explaining | Prefer |
|---|---|
| Components, layers, ownership or system boundaries | Architecture / component diagram |
| Who calls whom, in what order, including async returns | Sequence diagram |
| Steps, conditions, branches and approval gates | Flowchart / decision tree |
| Responsibility and handoffs across parallel participants | Swimlane diagram |
| States, transitions, retry and terminal conditions | State / lifecycle diagram |
| Where data comes from, how it changes, where it goes | Data-flow diagram |
| Order, duration, overlap and dependencies | Timeline / Gantt chart |
| Alternatives, differences and tradeoffs | Side-by-side comparison / matrix |
| Quantities, trends, distribution or composition | Appropriate data chart, with units and source |
| Appearance, spatial intuition or an abstract concept | Annotated image, sketch, mockup or illustration |

Timelines and charts must distinguish measured values from illustrative examples; keep missing values unknown. Use ordinary prose for points that are already clearer in a sentence. Do not draw every supported type just to demonstrate variety.

## Use available drawing capabilities

- For standard flow, sequence, relationship, tree and data diagrams, use the bundled renderer described below. For simple custom relationships, inline SVG or HTML remains available. Mermaid or Graphviz are alternatives when an appropriate local renderer is already available; embed the rendered visual rather than showing source code as the diagram.
- When structured layout or a polished architecture/sequence/state diagram materially helps, discover and use an installed specialist such as archify. Read its actual Skill instructions when selecting it. Integrate its useful artifact into the same explanation; do not replace the explanation with a gallery of disconnected files.
- For appearance, conceptual illustrations or bitmap edits, use an available image-generation capability such as imagegen. It is optional, not a step on every turn. A locally installed Skill may call a remote service: do not describe it as offline image inference.
- For data charts, prefer deterministic plotting from the supplied data. Preserve quantities, labels and units; never use image generation to invent or approximate analytical data.
- Keep project-referenced images/SVG beside the HTML or embedded within it. Verify labels, arrows, missing content and file references. If a specialist is unavailable, use an adequate simpler visual or state the limitation; do not install a new stack merely to decorate an explanation.

## Built-in renderer

This Skill includes the unchanged `answer-me-with-html` renderer; no second Skill installation is needed. Use [the renderer guide](references/renderer.md) when generating or updating a renderer-backed page. It provides commands, the draft format and a complete example. The explanation, visual selection and feedback rules in this file remain authoritative.

- Run `scripts/render.mjs` with Node.js 20+; prefer an available Node.js 24 runtime. The adapter handles rendering and same-file panel updates, uses private temporary settings, and keeps feedback in chat. It does not open a browser or enable upstream automatic triggers.
- New renderer-backed pages use the built-in fusion presentation: a spacious, light desktop page with consistent typography, diagram colors and native details. Both rendering and patching apply the shared style automatically. Existing renderer pages retain their presentation; use the renderer guide when selecting the original am layout or migrating a page.
- Let content determine the diagrams, section count and reading order. The fusion style scales complete diagrams without changing their measured fonts; wide diagrams scroll at their native size. Split dense diagrams when that makes the explanation clearer.
- In renderer drafts, write each folded section as **one complete `html` fenced block** containing `<details><summary>…</summary>…</details>`, with no `open` attribute. Write its body as HTML, including `<pre><code>`, lists and tables; escape code text. Keep the opening and closing tags in that same block. The adapter rejects cross-block details, broken nesting and initially open details before writing a page.
- Main diagrams and material boundaries stay outside folded sections. A diagram inside a detail must be a complete static SVG/image within that HTML block, not a Markdown component fence nested inside it.
- Existing handwritten HTML continues to be edited directly in place. If a required visual or interaction is not supported by the renderer, use the existing HTML/SVG or specialist path and preserve the full explanation. If Node.js is unavailable, state the limitation and use that path rather than installing software automatically.

## Keep the medium lightweight

Start when explicitly requested, without another permission question. Use [the renderer draft](assets/discussion-draft.md) for a standard rendered page, or [the optional HTML starter](assets/discussion-shell.html) for direct HTML; its VD comment regions are replaceable content, not a mandatory layout. Target desktop browsers; no mobile/H5 layouts or phone-viewport checks unless requested.

Preserve supplied images. Keep the delivered page self-contained where practical; drawing helpers are optional dependencies, not requirements for opening the HTML.

Use plain HTML/CSS and native elements such as details. A framework, persistent server, WebSocket, MCP or message backchannel is not needed. Page interactions may explain or reveal content, but do not imply that page clicks send feedback to the AI.

Use the user's chosen path, otherwise docs/visuals/<topic>-discussion.html in the workspace. During the same topic, update the known page in place; recover its path from context before editing. Keep still-valid content and decisions. Do not create endless versions or append every chat turn. A simple follow-up may remain short text. Stop visual updates if the user requests text-only.

## Update and communicate

- Apply feedback to the explanation and relevant visual, preserving the rest of the still-valid meaning.
- Check the default collapsed view: the main idea and important boundaries must be understandable from the visuals and short text alone. Then check that expanded details retain the supporting content, references and acceptance criteria. Inspect the changed area in a desktop browser when available; do not impose publication QA on every sentence edit. State preview limitations honestly.
- Open or refresh the existing preview when supported. A queued request is not proof the page opened. Otherwise give its file link; do not promise automatic reload without a mechanism.
- In chat, link the page and give a few key takeaways that help the user read it. Do not duplicate the full explanation. Ask a question only when a real clarification or decision is needed; do not end every visual update with a forced choice.

This skill changes how a discussion is presented. It does not authorize implementation, installation, publishing, team messages or changes to the system being discussed.
