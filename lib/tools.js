/**
 * Model-facing Archify diagram tools.
 *
 * Runs the bundled, zero-dependency Archify CLI (`skills/archify/bin/archify.mjs`)
 * under the calling session's file policy, so the model generates and validates
 * diagrams without shelling out or knowing where the CLI lives.
 *
 * @module @local/archify-dsh/tools
 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'archify-tools'
export const inject = ['tools', 'sandbox', 'sandboxPolicy', 'subprocess', 'workingDirectory']

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = dirname(MODULE_DIR)
const ARCHIFY = join(PACKAGE_DIR, 'skills', 'archify', 'bin', 'archify.mjs')

const DIAGRAM_TYPES = [
  'architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle',
  'erd', 'class', 'tree', 'timeline', 'waterfall',
]
const QUALITIES = ['standard', 'showcase']
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024

/** Stable, shared result contract across the Archify tools. */
const OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      ok: { type: 'boolean', required: true },
      outputPath: { type: 'string' },
      text: { type: 'string', required: true },
    },
  },
  render: (_args, value) => [{ type: 'text', text: value.text }],
}

/** Resolve the session working directory, falling back to the host cwd for agentless calls. */
async function sessionCwd(ctx, agent, signal) {
  if (agent === undefined) return process.cwd()
  return ctx.workingDirectory.ensure(agent, signal)
}

/**
 * Run the Archify CLI under the calling session's file policy and collect its output.
 * @param outputArg - when set, the reported absolute path of the HTML artifact this run writes.
 */
async function run(ctx, exec, args, outputArg) {
  const signal = exec.signal
  const cwd = await sessionCwd(ctx, exec.agent, signal)
  const policy = ctx.sandboxPolicy.resolve(exec.agent === undefined ? {} : { session: exec.agent.session })
  const command = [process.execPath, ARCHIFY, ...args]
  const argv = policy.mode === 'danger-full-access'
    ? command
    : (await ctx.sandbox.confine(command, { ...policy, mode: policy.mode }, signal)).argv
  const child = ctx.subprocess.spawn({
    argv,
    cwd,
    env: { ARCHIFY_UPDATE_CHECK_DISABLED: '1' },
    signal,
    graceMs: 3000,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: MAX_OUTPUT_BYTES },
      stderr: { maxBytes: MAX_OUTPUT_BYTES },
    },
  })
  try {
    const outcome = await child.done
    signal.throwIfAborted()
    const stdout = child.collected.stdout?.readFrom(0)
    const stderr = child.collected.stderr?.readFrom(0)
    const outText = stdout?.text ?? ''
    const errText = stderr?.text ?? ''
    let ok = outcome.exitCode === 0
    let text = (ok ? outText : (errText || outText)).trim()
    if (stdout?.lossy || stderr?.lossy) {
      ok = false
      text = 'archify output exceeded the capture limit; narrow the request or write a smaller candidate.'
    }
    if (text === '') text = ok ? '(no output)' : '(command failed with no output)'
    return {
      ok,
      outputPath: outputArg === undefined ? '' : resolve(cwd, outputArg),
      text,
    }
  } finally {
    child.terminate()
    await child.waitForExit()
  }
}

/** Register the Archify diagram tools. */
export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'archify_guide',
    description: 'Choose the right Archify diagram type for a question or scenario. '
      + 'Returns the recommended type (architecture, workflow, sequence, data-flow, lifecycle, ERD, '
      + 'class, tree, timeline, or waterfall) and short guidance.',
    parameters: {
      question: { type: 'string', description: 'Plain-language question or scenario to classify. Omit to list all supported scenarios.' },
      lang: { type: 'string', enum: ['en', 'zh'], description: 'Language for the returned guidance.' },
    },
    output: OUTPUT,
    timeoutMs: 60_000,
    execute(args, exec) {
      const argv = ['guide']
      if (args.question) argv.push(args.question)
      argv.push('--json')
      if (args.lang) argv.push('--lang', args.lang)
      return run(ctx, exec, argv)
    },
    presentCall: args => ({ card: 'generic', title: 'Archify guide', kind: 'read', rawInput: args.question ?? '' }),
  }))

  ctx.tools.register(defineTool({
    name: 'archify_validate',
    description: 'Validate an Archify JSON-IR candidate against its schema and layout rules. '
      + 'Returns machine-readable diagnostics with the repair controls to apply. '
      + 'Use to iterate on a candidate before finalizing.',
    parameters: {
      type: { type: 'string', required: true, enum: DIAGRAM_TYPES, description: 'Diagram type.' },
      input: { type: 'string', required: true, description: 'Path to the candidate JSON, relative to the workspace or absolute.' },
      quality: { type: 'string', enum: QUALITIES, description: 'Quality profile; omit for showcase.' },
      repo_root: { type: 'string', description: 'Repository root, required only for source-evidence-backed diagrams.' },
    },
    output: OUTPUT,
    timeoutMs: 120_000,
    execute(args, exec) {
      const argv = ['validate', args.type, args.input, '--json']
      if (args.quality) argv.push('--quality', args.quality)
      if (args.repo_root) argv.push('--repo-root', args.repo_root)
      return run(ctx, exec, argv)
    },
    presentCall: args => ({ card: 'generic', title: 'Archify validate', kind: 'other', rawInput: `${args.type} ${args.input}` }),
  }))

  ctx.tools.register(defineTool({
    name: 'archify_finalize',
    description: 'Run the complete Archify gate for a candidate JSON and write the final standalone '
      + 'interactive HTML diagram (validate, deliver, strict check, and browser check). '
      + 'Returns the receipt summary and the exact artifact path. A non-zero result is a failure; '
      + 'repair the candidate and call again.',
    parameters: {
      type: { type: 'string', required: true, enum: DIAGRAM_TYPES, description: 'Diagram type.' },
      input: { type: 'string', required: true, description: 'Path to the candidate JSON, relative to the workspace or absolute.' },
      output: { type: 'string', required: true, description: 'Output .html path, relative to the workspace or absolute.' },
      quality: { type: 'string', enum: QUALITIES, description: 'Quality profile; omit for showcase.' },
      out_dir: { type: 'string', description: 'Separate evidence directory for this run; use a new -review-N dir per rerun of a used output path.' },
      repo_root: { type: 'string', description: 'Repository root, required only for source-evidence-backed diagrams.' },
    },
    output: OUTPUT,
    timeoutMs: 240_000,
    execute(args, exec) {
      const argv = ['finalize', args.type, args.input, args.output, '--json']
      if (args.quality) argv.push('--quality', args.quality)
      if (args.out_dir) argv.push('--out-dir', args.out_dir)
      if (args.repo_root) argv.push('--repo-root', args.repo_root)
      return run(ctx, exec, argv, args.output)
    },
    presentCall: args => ({ card: 'generic', title: 'Archify finalize', kind: 'other', rawInput: `${args.type} ${args.output}` }),
  }))
}