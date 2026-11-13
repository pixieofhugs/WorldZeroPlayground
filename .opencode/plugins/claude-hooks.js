// Runs the repo's Claude Code PreToolUse Bash hooks under OpenCode, so both harnesses
// share one implementation of each guard: Bot Bros bouncer's, through `bros guard`.
// Fails closed like the hooks themselves: a hook that can't run denies the call.
const HOOKS = [
  ["bros", "guard", "issue-comments"],
  ["bros", "guard", "paths"],
  ["bros", "guard", "merge"],
]

export const ClaudeHooks = async ({ worktree }) => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return
    const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command: output.args.command } })
    for (const hook of HOOKS) {
      const proc = Bun.spawnSync(hook, {
        cwd: worktree,
        stdin: new TextEncoder().encode(payload),
        env: { ...process.env, CLAUDE_PROJECT_DIR: worktree },
      })
      const out = proc.stdout.toString().trim()
      if (proc.exitCode !== 0) throw new Error(`${hook.join(" ")} failed (exit ${proc.exitCode}), so it cannot clear this call.`)
      if (!out) continue
      let decision
      try {
        decision = JSON.parse(out).hookSpecificOutput
      } catch {
        throw new Error(`${hook.join(" ")} returned unreadable output, so it cannot clear this call.`)
      }
      if (decision?.permissionDecision === "deny") throw new Error(decision.permissionDecisionReason)
    }
  },
})
