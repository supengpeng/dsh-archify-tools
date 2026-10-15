# DSH adapter changelog

## 1.0.0

- Local, Skill-only DeepSeek Harness bundle packaging Archify 3.1.0 from `main` commit `d0c8c7e9f4e06f303389f804208d387f27019ef5`.
- Bundled Archify 3.1.0 adds ERD, Class/interface, Tree, Timeline and Waterfall to the existing Architecture, Workflow, Sequence, Data Flow and Lifecycle modes.
- Mounts one filesystem Skill provider named `archify-plugin` (bundled root, `includeDefaultRoots: false`) and, since this release, three native tools: `archify_guide`, `archify_validate`, `archify_finalize`. The tools run the bundled CLI under the session's file policy (`ctx.sandbox.confine` + `ctx.subprocess.spawn`); they declare `@deepseek-ai/dsh-tools` as an optional peer and add no install hooks, telemetry, or automatic updates.
- Acceptance host recorded as `@deepseek-ai/dsh@0.2.1-alpha.4`; Node `^22.19.0 || >=24.0.0`.