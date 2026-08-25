from datetime import datetime
from typing import List, Optional
from schemas.base import WireModel
from schemas.task import TaskOut
from models.praxis import PraxisType, PraxisStatus, PraxisInviteStatus, MediaType, ModerationStatus


class MediaItemOut(WireModel):
    id: int
    praxis_id: int
    type: MediaType
    file_path: str
    display_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaUploadResultOut(WireModel):
    """One file in, one entry out — the per-file outcome of a batch media upload.

    ``POST /praxes/{id}/media/batch`` is deliberately partial-success: a file the
    pipeline rejects fails only itself, so the response cannot be a bare list of
    survivors. Exactly one of ``media_item`` / ``error`` is populated.

    ``filename`` is the *client-supplied* name, echoed verbatim and never
    sanitized, because the composer reports upload failures by the name the
    player recognises (``forms:editPraxis.errors.upload`` interpolates
    ``{ name: file.name }``). ``status_code`` carries the status the single-file
    route would have returned for that file (413 too large, 422 unsupported
    type, 500 unwritable) so the client can branch without parsing prose.
    """

    filename: str
    media_item: Optional[MediaItemOut] = None
    error: Optional[str] = None
    status_code: Optional[int] = None


class PraxisMemberOut(WireModel):
    id: int
    praxis_id: int
    character_id: int
    character_display_name: str  # populated by build_praxis_out
    # The member's portrait, so a roster row can draw the person and not just
    # their initials (#2318). Relative media path or "" — the empty string is
    # the ordinary case (no portrait uploaded) and every roster surface falls
    # back to its own monogram, never to a placeholder image. Same field, same
    # meaning as ``PraxisOut.created_by_avatar_url``; it rides the Character row
    # the roster already selectin-loads, so it costs no query.
    character_avatar_url: str = ""  # populated by build_praxis_out
    # APPROVAL of the live proposal since ADR-0079, not "this member filed their
    # part" — the name stayed because it is the wire field and the feed's column.
    has_submitted: bool
    # DONE (ADR-0079, #1811): "my part is finished." Purely social — the roster's
    # own badge — and freely reversible, which is why it survives everything that
    # clears an approval. On the wire because the composer's Done toggle has to
    # come back the same after a reload; `POST /praxes/{id}/done` is what moves it.
    is_done: bool
    # When `has_submitted` last flipped True (#571, #1415). NULL while the member
    # still owes a part, and NULL again the moment they pull it back or the
    # collab is unpublished — `collab_consensus` clears both together, so this is
    # never a stale "last time they filed". The roster's optional timestamp line
    # reads it; `has_submitted` stays the boolean the pill dispatches on.
    submitted_at: Optional[datetime] = None
    joined_at: datetime
    # When the VIEWER last nudged this member about this praxis (#1083), and
    # NULL once that 24h window lapses — so "there is a timestamp here" and "you
    # may not nudge again yet" are one fact, resolved server-side by
    # `services.nudge.NUDGE_COOLDOWN`. The roster button reads its disabled
    # state from this rather than from local React state, which is what made the
    # design's version dishonest: a reload un-nudged it.
    nudged_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PraxisDoneUpdate(WireModel):
    """The **Done** signal's body (ADR-0079) — "my part is finished".

    A field rather than two routes (``/done`` and ``/undone``) because Done is
    explicitly reversible and the client holds a checkbox, not a one-way button:
    a toggle that has to guess which endpoint to call from local state is one
    dropped response away from disagreeing with the server.
    """

    is_done: bool


class PraxisInviteOut(WireModel):
    id: int
    praxis_id: int
    inviter_id: int
    invitee_id: int
    invitee_display_name: str   # populated by build_praxis_out
    # The invitee's portrait (#2318). An unanswered invite draws the face INSIDE
    # the dashed ring: the ring is the state, the face is the person, so a
    # pending or declined row still says who it is about. Same "" fallback as
    # ``PraxisMemberOut.character_avatar_url``.
    invitee_avatar_url: str = ""  # populated by build_praxis_out
    status: PraxisInviteStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ``task_level_required``, ``submitted_at`` and ``created_by_faction_slug``
# below were added for the praxis read page by ADR-0017 §6. That ADR is now
# marked **Superseded by ADR-0061** — history, not live authority. The fields
# shipped; this schema is their record.
class PraxisOut(WireModel):
    id: int
    task_id: int
    task_title: str             # populated by build_praxis_out
    task_point_value: int       # populated by build_praxis_out
    task_level_required: int = 0  # populated by build_praxis_out
    task_faction_slug: Optional[str] = None  # populated by build_praxis_out; drives per-faction vote UI
    type: PraxisType
    status: PraxisStatus
    title: Optional[str]
    body_text: Optional[str]
    moderation_status: ModerationStatus
    admin_note: Optional[str]
    flagged_at: Optional[datetime]
    submitted_at: Optional[datetime] = None  # set on in_progress→submitted
    submit_proposed_at: Optional[datetime] = None  # collab pending-publish window opened-at (ADR-0012)
    created_by_id: int
    created_by_display_name: str  # populated by build_praxis_out
    # The author's portrait, for the detail byline (#2106). Relative media path
    # or "" — the empty string is the ordinary case (no portrait uploaded) and
    # the byline degrades to each archetype's own monogram, not a placeholder
    # image. Same field, same meaning as ``PraxisCardOut.created_by_avatar_url``.
    created_by_avatar_url: str = ""  # populated by build_praxis_out
    created_by_faction_slug: Optional[str] = None  # author's member faction; actor-scoped byline
    created_at: datetime
    updated_at: datetime
    members: List[PraxisMemberOut]
    invites: List[PraxisInviteOut]
    media_items: List[MediaItemOut]
    # The one authoritative number for this praxis (ADR-0053, supersedes
    # ADR-0047). Computed for the praxis AUTHOR, for every type incl. collab:
    #   score = task_point_value × display_multiplier
    #           + metatask_points + points_from_votes + habit_bonus_points
    # Only the base multiplies (ADR-0086); every earned extra is flat.
    # "Merit" (base + votes, multipliers ignored) is retired.
    score: float                # populated by build_praxis_out; the computed total
    metatask_points: int = 0    # populated by build_praxis_out
    display_multiplier: float = 1.0  # faction × duel collapsed; 1.0 when nothing applies
    points_from_votes: int = 0  # populated by build_praxis_out
    # The #1617 faction habit bonus, as stamped on the author's PraxisMember row
    # at seal time. FLAT — it sits outside the multiplier, beside the votes. It
    # is on the wire because it is a term of `score`, and a term that moves the
    # total without appearing in the breakdown is how a card and a detail page
    # start disagreeing. 0 for every faction that grants no such ability.
    habit_bonus_points: int = 0  # populated by build_praxis_out
    voter_count: int = 0        # populated by build_praxis_out via vote_tally
    is_top_for_task: bool = False  # Task Crown: top submitted praxis for its task (ADR-0028)
    # duel_id is set when this praxis is a side of a duel (ADR-0011).
    duel_id: Optional[int] = None
    applied_metatasks: List[TaskOut] = []
    can_flag: bool = False      # populated by build_praxis_out; viewer-relative
    # Viewer-relative (#998): False only when the viewer's account owns this
    # praxis (author/collab co-owner, ADR-0013) or is a participant in its duel
    # (#309) — the two PERMANENT vote blocks. Budget exhaustion is excluded (the
    # module stays visible). Anonymous → True (client shows the login gate).
    # Drives hiding the whole vote module for logged-in-but-ineligible viewers.
    #
    # REQUIRED, no default (#1974). It used to default to ``True`` and a route
    # that never computed it therefore shipped "yes, vote here" — silently, with
    # nothing to see at the call site. A permission field that fails open is one
    # forgotten caller away from a bug. Costs nothing on the wire: ``WireModel``
    # already marks default-carrying fields required in the SERIALIZATION schema
    # (#1400), so this field was always required in ``openapi.json`` — removing
    # the default only removes the way to forget it in Python.
    viewer_can_vote: bool
    # The viewer's own star (1-5); None if unvoted or anonymous — the same field
    # and the same meaning as ``PraxisCardOut.viewer_vote`` (#1382). Detail used
    # to be the ONE surface without it, which is why the client recovered the
    # viewer's cast from the voters list and parked it in an overlay store.
    viewer_vote: Optional[int] = None

    model_config = {"from_attributes": True}


class PraxisCardOut(WireModel):
    """Lightweight list-view schema."""
    id: int
    task_id: int
    task_title: str
    task_point_value: int
    task_level_required: int
    type: PraxisType
    status: PraxisStatus
    title: Optional[str]
    moderation_status: ModerationStatus
    created_by_id: int
    created_by_display_name: str
    # The author's portrait, for the card byline (#888). Relative media path or
    # "" — an empty string is the ordinary case (no portrait uploaded) and the
    # byline degrades to the shared monogram avatar, not a placeholder image.
    # This was card-only until #2106, on the stated condition that ``PraxisOut``
    # would get it if the detail byline ever needed a face. It does, so it has —
    # the two models carry the same field with the same meaning now.
    created_by_avatar_url: str = ""
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    submit_proposed_at: Optional[datetime] = None  # collab pending-publish chip (#521, ADR-0012)
    member_count: int
    # The computed total — the one number a praxis has (ADR-0053, supersedes
    # ADR-0047). Computed for the praxis AUTHOR (created_by), not the viewer:
    # the card shows the points the praxis banked for whoever made it.
    #   score = task_point_value × display_multiplier
    #           + metatask_points + points_from_votes + habit_bonus_points
    # Only the base multiplies (ADR-0086); every earned extra is flat.
    # ``display_multiplier`` is faction × duel collapsed into one value, for
    # every type including collab (one author → one faction → one multiplier).
    # Base is ``task_point_value`` above; there is no separate ``base_points``.
    score: float
    metatask_points: int = 0
    display_multiplier: float = 1.0
    points_from_votes: int = 0
    # The #1617 faction habit bonus for the AUTHOR, stamped at seal time. Flat,
    # outside the multiplier — see ``PraxisOut.habit_bonus_points``.
    habit_bonus_points: int = 0
    voter_count: int = 0
    is_top_for_task: bool = False  # Task Crown: top submitted praxis for its task (ADR-0028)
    # The metatasks pinned to this praxis, as full TaskOut rows (not just the
    # summed ``metatask_points`` above). The feed card renders a read-only seal
    # stack that dispatches on each metatask's issuing faction, so it needs the
    # rows. Populated page-wide in one query by the feed router (no N+1); the
    # card builder falls back to a single-praxis query for other callers.
    applied_metatasks: List[TaskOut] = []
    task_faction_slug: Optional[str] = None
    # Full-fidelity fields for bespoke mobile praxis cards (#573).
    body_text: Optional[str] = None
    created_by_faction_slug: Optional[str] = None  # author's member faction; actor-scoped byline
    members: List[PraxisMemberOut] = []
    media_items: List[MediaItemOut] = []
    viewer_vote: Optional[int] = None  # the authenticated viewer's own cast value (1-5), None if unvoted/anonymous
    # Account-mate marker (#644 §7): the display name of another character on the
    # viewer's account who voted this praxis, set only when the carried character
    # did not vote it. None otherwise (incl. anonymous). Computed, no column.
    voted_by_name: Optional[str] = None
    # Viewer-relative (#998); see ``PraxisOut.viewer_can_vote``, including why
    # this one carries no default (#1974). Precomputed page-wide by the card-list
    # route (no N+1) via ``viewer_can_vote_map``.
    viewer_can_vote: bool
    # Set when this praxis is a side of a duel (ADR-0011): a duel side is stored
    # ``type='solo'`` + a non-null ``duel_id``, so mode labels/chips must gate on
    # this, not ``type`` (#992). Precomputed page-wide by the card-list route (no
    # N+1) via ``duel_id_map``; mirrors ``PraxisOut.duel_id``.
    duel_id: Optional[int] = None
    # ── the other side of the duel (#596) ───────────────────────────────────
    # A duel is two separate praxis rows joined by a ``Duel`` row (ADR-0011), so
    # a duel side's own ``members`` holds only its own submitter and the card
    # cannot name its rival from anything else on this body. Populated page-wide
    # in one query by the card-list route (no N+1) via ``duel_opponents_for``.
    #
    # ALL THREE NULLABLE ONES ARE SET TOGETHER OR NOT AT ALL
    # (``opponent_avatar_url`` below rides the same path but is never None — see
    # its own note). They stay None in two cases the
    # card must not confuse: the praxis is not a duel side, or it IS one and the
    # duel is still ``pending`` — ``Duel.opponent_praxis_id`` is NULL until the
    # challenge is accepted, and a challenger has nobody to name until then. The
    # card falls back to the duel mode chip alone, which is what shipped before
    # these fields existed. Gate the banner on ``opponent_display_name``, NOT on
    # ``type == 'duel'``: a duel side is stored ``type='solo'`` (#992).
    opponent_praxis_id: Optional[int] = None
    opponent_display_name: Optional[str] = None
    opponent_faction_slug: Optional[str] = None
    # The rival's portrait (#2128), resolved on that same single statement — one
    # more selected column off the author joins already there, not a fourth
    # lookup. It is a plain ``str`` rather than ``Optional``, like every other
    # avatar on this wire: "" covers BOTH "no rival to name" and "the rival has
    # no portrait", because the banner never asks this field whether to draw.
    # It gates on ``opponent_display_name`` (above), and only then asks this one
    # what to draw — portrait when non-empty, monogram otherwise.
    opponent_avatar_url: str = ""

    model_config = {"from_attributes": True}


class PraxisCreate(WireModel):
    task_id: int
    type: PraxisType = PraxisType.solo
    title: Optional[str] = None
    body_text: Optional[str] = None


class PraxisTypeChange(WireModel):
    """Body for the in-place solo↔collab mode switch (#321)."""

    type: PraxisType


class PraxisInviteCreate(WireModel):
    invitee_id: int


class PraxisVoteIn(WireModel):
    value: int
