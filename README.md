# `@local/archify-dsh`

A local [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) bundle for [Archify](https://github.com/tt-a1i/archify). It packages **Archify 3.1.0** (main commit `d0c8c7e9f4e06f303389f804208d387f27019ef5`) and is not an official DeepSeek or Archify product.

Unlike the upstream `@tt-a1i/archify-dsh@1.0.0` (which bundles Archify 3.0.1 as a Skill-only install), this bundle tracks 3.1.0 with its new diagram types (ERD, Class, Tree, Timeline, Waterfall) and adds **native model tools**.

## What it provides

1. **The `archify` skill** — a filesystem Skill provider named `archify-plugin` that scans a bundled `skills/` directory and loads the full Archify authoring/delivery workflow.
2. **Native tools** — three model-facing tools that run the bundled Archify CLI under the calling session's file policy, so the model does not need to know where the CLI lives or shell out:

| Tool | Purpose |
|---|---|
| `archify_guide` | Choose the right diagram type for a question or scenario. |
| `archify_validate` | Validate a candidate JSON and return machine-readable repair diagnostics. |
| `archify_finalize` | Run the full gate (validate + deliver + strict check + browser check) and write the standalone HTML. |

## Install

```bash
dsh plugin --profile <profile> add /abs/path/to/archify-dsh
```

Or install this workspace directory through the Plugin Manager `install_bundle` action.

## Invoke

Either ask for the skill (which documents JSON authoring and repair), or drive the tools directly. For example:

```text
Use the archify skill to map this repository's runtime architecture.
Show 8–12 core components, one primary path, external dependencies, and trust boundaries.
After delivery, return the exact workspace paths of the specification JSON and the HTML artifact.
```

Generated JSON and HTML are normal workspace files and do not automatically appear in the Web Produced Files strip; ask for their **exact workspace paths** and open them from the workspace.

## Uninstall

```bash
dsh plugin --profile <profile> remove @local/archify-dsh
```

## Activation and scope

The bundle's `cordis.patch.yml` contains a `!!js` expression evaluated by the DSH host outside the agent sandbox. It uses Node's built-in `path` and `module` helpers to locate this installed package's `skills` directory; it does not fetch data, read credentials, spawn processes, or register a second permission path. The tool module (`lib/tools.js`) locates the same CLI from its own module URL.

The tools declare `@deepseek-ai/dsh-tools` as an optional peer dependency (provided by the DSH host) and resolve the CLI under the session's file policy via `ctx.sandbox.confine` + `ctx.subprocess.spawn`. There is no telemetry, credentials handling, background service, or install hook. The bundled Skill has an optional notification-only update checker and bounded network access for authored remote brand assets; neither it nor the tools upgrade this plugin automatically.

`release.json` records the immutable Skill source commit and the acceptance host version.