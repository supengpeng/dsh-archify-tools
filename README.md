# `@local/archify-dsh`

一个本地版 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，封装 [Archify](https://github.com/tt-a1i/archify) **3.1.0**（`main` 提交 `d0c8c7e9f4e06f303389f804208d387f27019ef5`）。非 DeepSeek、非 Archify 官方出品。

与上游 `@tt-a1i/archify-dsh@1.0.0`（打包 Archify 3.0.1，仅 Skill）相比，本插件跟随 3.1.0，新增 ERD / 类图 / 树 / 时间线 / 瀑布图五种图型，并内置**原生模型工具**。

## 提供内容

1. **`archify` 技能** —— 一个名为 `archify-plugin` 的文件系统 Skill 提供者，扫描打包的 `skills/` 目录，加载完整的 Archify 编写/交付流程。
2. **原生工具** —— 三个面向模型的工具，在会话文件策略下运行打包的 Archify CLI，模型无需知道 CLI 位置、也不必拼 shell 命令：

| 工具 | 作用 |
|---|---|
| `archify_guide` | 为问题或场景选择正确的图型 |
| `archify_validate` | 校验候选 JSON，返回可执行的修复诊断 |
| `archify_finalize` | 跑完整门禁（校验 + 交付 + 严格检查 + 浏览器检查）并产出独立 HTML |

## 安装

```bash
dsh plugin --profile <profile> add /绝对路径/archify-dsh
```

或在本工作区目录通过插件管理器的 `install_bundle` 安装（本地目录以 link 方式挂载，改动即时生效）。

## 使用

可以调用 `archify` 技能（它会教怎么写候选 JSON、怎么修复），也可以直接调用原生工具。例如：

```text
Use the archify skill to map this repository's runtime architecture.
Show 8–12 core components, one primary path, external dependencies, and trust boundaries.
After delivery, return the exact workspace paths of the specification JSON and the HTML artifact.
```

生成的 JSON 与 HTML 是普通工作区文件，不会自动出现在 Web 的「Produced Files」条里；请让 Agent 返回**确切的工作区路径**，再从工作区打开。

## 卸载

```bash
dsh plugin --profile <profile> remove @local/archify-dsh
```

## 激活与作用域

`cordis.patch.yml` 含一个 `!!js` 表达式，由 DSH 宿主在 Agent 沙箱外求值：它只用 Node 内置的 `path` 与 `module` 定位本包的 `skills` 目录，不抓数据、不读凭据、不起进程、不开第二条权限路径。工具模块（`lib/tools.js`）则从自身模块 URL 定位同一 CLI。

工具把 `@deepseek-ai/dsh-tools` 声明为**可选 peer 依赖**（由 DSH 宿主提供），并通过 `ctx.sandbox.confine` + `ctx.subprocess.spawn` 在会话文件策略下运行 CLI。无遥测、无凭据处理、无后台服务、无 install 钩子。打包的 Skill 有一个仅通知的稳定更新检查器、以及为作者标注的品牌资源保留的受限网络路径；两者都不会自动升级本插件。

`release.json` 记录不可变的 Skill 源提交与验收宿主版本。