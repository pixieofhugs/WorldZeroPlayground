// Runs the repo's Claude Code PreToolUse Bash hooks (scripts/hooks/) under OpenCode,
// so both harnesses share one implementation of each guard.
// Fails closed like the hooks themselves: a hook that can't run denies the call.
const HOOKS = ["scripts/hooks/deny_raw_issue_comments.py", "scripts/hooks/guard_pr_merge.py"]

export const ClaudeHooks = async ({ worktree }) => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return
    const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command: output.args.command } })
    for (const hook of HOOKS) {
      const proc = Bun.spawnSync(["python", hook], {
        cwd: worktree,
        stdin: new TextEncoder().encode(payload),
        env: { ...process.env, CLAUDE_PROJECT_DIR: worktree },
      })
      const out = proc.stdout.toString().trim()
      if (proc.exitCode !== 0) throw new Error(`${hook} failed (exit ${proc.exitCode}), so it cannot clear this call.`)
      if (!out) continue
      let decision
      try {
        decision = JSON.parse(out).hookSpecificOutput
      } catch {
        throw new Error(`${hook} returned unreadable output, so it cannot clear this call.`)
      }
      if (decision?.permissionDecision === "deny") throw new Error(decision.permissionDecisionReason)
    }
  },
})
