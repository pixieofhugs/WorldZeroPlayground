"""The seam between *loading* a praxis and *advancing* its consensus window (#2874).

``services.praxis.get_praxis`` used to do both: read the aggregate, and run
ADR-0012's lazy-on-access seal. The name promised a read, so no call site could
tell that state might move — and seven request paths called it two or three
times, re-running the seal each time.

What this file pins is the split, not the consensus rule itself (that lives in
``test_collab_consensus.py`` and ``test_praxes.py``):

- :func:`services.praxis.get_praxis` reads and *only* reads.
- :func:`services.praxis.get_praxis_settling_consensus` is the named door for the
  paths that genuinely need the window checked.
- No single request runs ``settle_if_window_lapsed`` more than once.
- Approving a collab whose window has already lapsed seals it **once**.

The window length is read from ``era.collab_auto_submit_days`` rather than
restated, so these tests cannot drift from the era that owns the rule.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.praxis import Praxis, PraxisStatus
from services import collab_consensus


async def _lapse_the_open_window(praxis_id: int, session: AsyncSession) -> None:
    """Backdate the live proposal so its silence-is-consent window has elapsed."""
    praxis = await session.get(Praxis, praxis_id)
    praxis.submit_proposed_at = datetime.now(timezone.utc) - timedelta(
        days=CURRENT_ERA.collab_auto_submit_days, seconds=1
    )
    await session.commit()


@pytest.mark.asyncio
async def test_get_praxis_is_a_read(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """The plain loader moves no state, even on a praxis that is overdue to seal."""
    from services.praxis import get_praxis

    await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)
    await _lapse_the_open_window(praxis_collab.id, db_session)

    praxis = await get_praxis(praxis_collab.id, db_session)

    assert praxis.status == PraxisStatus.pending
    assert praxis.submit_proposed_at is not None


@pytest.mark.asyncio
async def test_get_praxis_settling_consensus_settles(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """The named loader is where ADR-0012's lazy seal still fires."""
    from services.praxis import get_praxis_settling_consensus

    await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)
    await _lapse_the_open_window(praxis_collab.id, db_session)

    praxis = await get_praxis_settling_consensus(praxis_collab.id, db_session)

    assert praxis.status == PraxisStatus.submitted


@pytest.mark.asyncio
async def test_no_request_settles_the_window_more_than_once(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    monkeypatch: pytest.MonkeyPatch,
):
    """Four routes that each loaded the aggregate two or three times.

    Driven in an order that keeps every request legal: Done and Propose on an
    ``in_progress`` collab, Withdraw against the proposal that opens, then the
    ``collab → solo`` takeover last (it retypes the praxis).
    """
    calls: list[int] = []
    real_settle = collab_consensus.settle_if_window_lapsed

    async def counting_settle(praxis, session, era=CURRENT_ERA):
        calls.append(praxis.id)
        return await real_settle(praxis, session, era)

    monkeypatch.setattr(collab_consensus, "settle_if_window_lapsed", counting_settle)

    pid = praxis_collab.id
    requests = [
        ("done", f"/praxes/{pid}/done", {"is_done": True}),
        ("submit", f"/praxes/{pid}/submit", None),
        ("unsubmit", f"/praxes/{pid}/unsubmit", None),
        ("change-type", f"/praxes/{pid}/change-type", {"type": "solo"}),
    ]
    for name, url, payload in requests:
        calls.clear()
        resp = await client.post(url, json=payload, headers=auth_headers)
        assert resp.status_code == 200, f"{name}: {resp.text}"
        assert len(calls) <= 1, f"{name} settled the window {len(calls)} times"


@pytest.mark.asyncio
async def test_approving_a_lapsed_collab_seals_it_exactly_once(
    client: AsyncClient,
    praxis_collab: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    """The last approval on an overdue proposal must not seal on top of a seal.

    Settling *before* ``on_submit`` published the praxis and marked every member
    approved, so the approval that followed found ``all(has_submitted)`` and ran
    the seal a second time — duplicate ``praxis_complete`` taunts, a re-stamped
    habit bonus and a rewritten ``submitted_at``.
    """
    seals: list[int] = []
    real_apply_seal = collab_consensus._apply_seal

    async def counting_apply_seal(praxis, session, era):
        seals.append(praxis.id)
        return await real_apply_seal(praxis, session, era)

    monkeypatch.setattr(collab_consensus, "_apply_seal", counting_apply_seal)

    await client.post(f"/praxes/{praxis_collab.id}/submit", headers=auth_headers)
    await _lapse_the_open_window(praxis_collab.id, db_session)

    resp = await client.post(
        f"/praxes/{praxis_collab.id}/submit", headers=auth_headers2
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "submitted"
    assert seals == [praxis_collab.id], f"sealed {len(seals)} times"
