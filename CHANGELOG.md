# DSH 适配器变更日志

## 1.0.0

- 本地版、Skill + 原生工具的 DeepSeek Harness 插件，打包 Archify 3.1.0（`main` 提交 `d0c8c7e9f4e06f303389f804208d387f27019ef5`）。
- 打包的 Archify 3.1.0 在原有 Architecture / Workflow / Sequence / Data Flow / Lifecycle 之外，新增 ERD、Class/Interface、Tree、Timeline、Waterfall 五种图型。
- 挂载一个名为 `archify-plugin` 的文件系统 Skill 提供者（bundled root，`includeDefaultRoots: false`），并新增三个原生工具 `archify_guide`、`archify_validate`、`archify_finalize`。工具在会话文件策略下运行打包 CLI（`ctx.sandbox.confine` + `ctx.subprocess.spawn`）；声明 `@deepseek-ai/dsh-tools` 为可选 peer。无 install 钩子、无遥测、无自动更新。
- 验收宿主记录为 `@deepseek-ai/dsh@0.2.1-alpha.4`；Node `^22.19.0 || >=24.0.0`。