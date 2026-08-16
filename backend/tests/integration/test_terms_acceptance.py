"""The consent log, tested at the HTTP seam (#1861, SPEC-onboarding "Terms").

The seam is the route plus the row it writes: everything this feature promises
is observable there, and nothing below it is worth a second test. The one
contract a naive implementation breaks is **append-only** — an upsert or a
unique constraint on the account would pass every other assertion here and
silently lose the second acceptance.
"""

from datetime import datetime

from sqlalchemy import select

from models.account import Account
from models.terms_acceptance import CURRENT_TERMS_VERSION, TermsAcceptance

_URL = "/terms/acceptance"


async def _rows_for(db_session, account: Account) -> list[TermsAcceptance]:
    result = await db_session.execute(
        select(TermsAcceptance)
        .where(TermsAcceptance.account_id == account.id)
        .order_by(TermsAcceptance.id)
    )
    return list(result.scalars())


async def test_anonymous_caller_is_refused(client, db_session, account):
    response = await client.post(_URL)

    assert response.status_code == 401
    assert await _rows_for(db_session, account) == []


async def test_accepting_writes_a_row_carrying_account_version_and_time(
    client, db_session, account, auth_headers
):
    response = await client.post(_URL, headers=auth_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["version"] == CURRENT_TERMS_VERSION

    rows = await _rows_for(db_session, account)
    assert len(rows) == 1
    assert rows[0].account_id == account.id
    assert rows[0].version == CURRENT_TERMS_VERSION
    assert rows[0].created_at is not None
    # The wire spells UTC "Z"; the column hands back a tz-aware datetime.
    assert datetime.fromisoformat(body["accepted_at"]) == rows[0].created_at


async def test_accepting_twice_writes_two_rows(
    client, db_session, account, auth_headers
):
    """Append-only: a re-scan shows the terms again and the log absorbs it.

    No upsert, no dedupe, no unique constraint on the account — which is also
    why ``CurrentUser`` needs no terms flag.
    """
    first = await client.post(_URL, headers=auth_headers)
    second = await client.post(_URL, headers=auth_headers)

    assert (first.status_code, second.status_code) == (201, 201)
    assert len(await _rows_for(db_session, account)) == 2


async def test_stored_version_is_the_servers_not_the_callers(
    client, db_session, account, auth_headers
):
    """A client cannot claim to have accepted a version it was never shown."""
    response = await client.post(
        _URL, headers=auth_headers, json={"version": "v99-i-made-this-up"}
    )

    assert response.status_code == 201
    rows = await _rows_for(db_session, account)
    assert [row.version for row in rows] == [CURRENT_TERMS_VERSION]


async def test_the_log_is_per_account(
    client, db_session, account, account2, auth_headers, auth_headers2
):
    await client.post(_URL, headers=auth_headers)
    await client.post(_URL, headers=auth_headers2)

    assert len(await _rows_for(db_session, account)) == 1
    assert len(await _rows_for(db_session, account2)) == 1
