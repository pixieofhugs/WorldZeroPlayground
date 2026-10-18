# Shadow test close-out

Read only when `/planner-bot shadow` ran this pass. Step 8 of `SKILL.md` points here.

**Shadow test, when it ran:** print how many issues agreed out of how many, then every
disagreement — both verdicts, both labels, each side's evidence. Ask her to rule on each, one
at a time: `opus`, `sonnet` or `neither` was right. Read the evidence back from the log, not
from memory. Append `{"issue": N, "at": "<the same sha>", "ruling": "…"}` to
`.claude/triage-shadow.jsonl`.

**The shadow test measures; it never labels.** A ruling of `opus` changes nothing. A ruling
of `sonnet` or `neither` means Opus's triage was wrong, and a bare relabel would put a label
on the issue with no brief and no stamp behind it — the dry run wrote neither. So record the
ruling on the issue as a comment, with her reason, and dispatch `triage` for it again with
the ruling in the prompt (`<N> — the owner ruled: …`), so the corrected verdict arrives with
its own brief and stamp. An issue Step 5 already ruled on is left exactly as she ruled. If
any ruling re-dispatched triage, re-run the census before the counts above are trusted.
