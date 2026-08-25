"""#2530 import fix-ups the parenthesis sweep cannot do: moved modules and
double-named imports. One assert per replacement, so a stale pair fails loudly
instead of silently doing nothing."""
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"

EDITS = {
    "pages/EditPraxis.tsx": [
        ('import { resolveVariant, resolveVariant } from "../utils/factionDispatch";',
         'import { resolveVariant } from "../utils/factionDispatch";')],
    "components/sigil/__tests__/factionSigil.test.tsx": [
        ('import FactionSigil, { DefaultSigilAdapter } from "../FactionSigil";',
         'import FactionSigil from "../FactionSigil";'),
        ('import { pickVariant, resolveVariant } from "../../../utils/factionDispatch";',
         'import { resolveVariant } from "../../../utils/factionDispatch";')],
    "components/vote/__tests__/albescentVote.test.tsx": [
        ("      pickVariant(map as Record<string, typeof AlbescentVote>, 'albescent', DefaultVote),",
         "      resolveVariant(map as Record<string, typeof AlbescentVote>, 'albescent'),"),
        ("import { pickVariant } from '../../../utils/factionDispatch'",
         "import { resolveVariant } from '../../../utils/factionDispatch'")],
    "components/avatar/AlbescentAvatar.tsx": [
        ("import { avatarDim, DefaultAvatar } from './FactionAvatar'",
         "import DefaultAvatar from './DefaultAvatar'\nimport { avatarDim } from './FactionAvatar'")],
    "components/avatar/__tests__/albescentAvatar.test.tsx": [
        ("import { DefaultAvatar } from '../FactionAvatar'",
         "import DefaultAvatar from '../DefaultAvatar'")],
    "components/feed/AlbescentFeedFrame.tsx": [
        ("import { DefaultFeedFrame } from './FactionFeedFrame'",
         "import DefaultFeedFrame from './DefaultFeedFrame'")],
    "components/feed/__tests__/feedArchiveControl.test.tsx": [
        ("import { DefaultFeedFrame } from '../FactionFeedFrame'",
         "import DefaultFeedFrame from '../DefaultFeedFrame'")],
    "components/__tests__/factionFeedFrame.test.tsx": [
        ('import FactionFeedFrame, { DefaultFeedFrame } from "../feed/FactionFeedFrame";',
         'import FactionFeedFrame from "../feed/FactionFeedFrame";\n'
         'import DefaultFeedFrame from "../feed/DefaultFeedFrame";')],
}

for rel, pairs in EDITS.items():
    path = SRC / rel
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        assert old in text, (rel, old)
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8", newline="\n")
    print("ok", rel)
