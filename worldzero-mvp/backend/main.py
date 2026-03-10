import os
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from auth import (
    create_token,
    get_active_character,
    get_current_account,
    get_current_account_optional,
    oauth,
)
from database import Base, engine, get_db
from models import Account, Character, CharacterTask, Submission, Task, Vote
from schemas import (
    AccountOut,
    CharacterCreate,
    CharacterOut,
    CharacterUpdate,
    LeaderboardEntry,
    SubmissionCreate,
    SubmissionOut,
    SubmissionSummary,
    SubmissionUpdate,
    TaskOut,
    VoteCreate,
    VoteOut,
)
from seed import seed_tasks
from starlette.middleware.sessions import SessionMiddleware

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-32-chars!!")

LEVEL_THRESHOLDS = [0, 10, 70, 170, 330, 610, 1090, 1840, 3040]


def compute_level(score: float) -> int:
    for level, threshold in reversed(list(enumerate(LEVEL_THRESHOLDS))):
        if score >= threshold:
            return level
    return 0


app = FastAPI(title="World Zero MVP")

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_tasks(db)
    finally:
        db.close()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _enrich_submission(sub: Submission) -> dict:
    votes = sub.votes
    vote_count = len(votes)
    avg_stars = sum(v.stars for v in votes) / vote_count if vote_count else None
    return {
        "id": sub.id,
        "task_id": sub.task_id,
        "character_id": sub.character_id,
        "title": sub.title,
        "body_text": sub.body_text,
        "score": sub.score,
        "created_at": sub.created_at,
        "updated_at": sub.updated_at,
        "character": sub.character,
        "vote_count": vote_count,
        "avg_stars": avg_stars,
    }


def _enrich_submission_summary(sub: Submission) -> dict:
    votes = sub.votes
    vote_count = len(votes)
    avg_stars = sum(v.stars for v in votes) / vote_count if vote_count else None
    return {
        "id": sub.id,
        "task_id": sub.task_id,
        "character_id": sub.character_id,
        "title": sub.title,
        "score": sub.score,
        "created_at": sub.created_at,
        "character": sub.character,
        "vote_count": vote_count,
        "avg_stars": avg_stars,
    }


def _recompute_scores(submission: Submission, db: Session) -> None:
    votes = submission.votes
    vote_count = len(votes)
    avg = sum(v.stars for v in votes) / vote_count if vote_count else 0.0
    submission.score = avg * submission.task.point_value

    character = submission.character
    total = sum(s.score for s in character.submissions)
    character.score = total
    if total > character.all_time_score:
        character.all_time_score = total
    character.level = compute_level(total)
    db.commit()


# ── Auth ───────────────────────────────────────────────────────────────────────

@app.get("/auth/google")
async def auth_google(request: Request):
    redirect_uri = request.url_for("auth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback", name="auth_google_callback")
async def auth_google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    google_id = userinfo["sub"]
    email = userinfo["email"]

    account = db.query(Account).filter(Account.google_id == google_id).first()
    if not account:
        account = Account(google_id=google_id, email=email)
        db.add(account)
        db.commit()
        db.refresh(account)

    jwt_token = create_token(account.id)
    response = RedirectResponse(url=f"{FRONTEND_URL}/")
    response.set_cookie(
        "wz_token",
        jwt_token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
    )
    return response


@app.get("/auth/me", response_model=AccountOut)
def auth_me(
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = get_active_character(account, db)
    return {
        "id": account.id,
        "email": account.email,
        "created_at": account.created_at,
        "character": character,
    }


@app.post("/auth/logout")
def auth_logout():
    response = JSONResponse({"detail": "Logged out"})
    response.delete_cookie("wz_token")
    return response


# ── Characters ─────────────────────────────────────────────────────────────────

@app.post("/characters", response_model=CharacterOut)
def create_character(
    body: CharacterCreate,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    existing = get_active_character(account, db)
    if existing:
        raise HTTPException(status_code=400, detail="Account already has an active character")

    if db.query(Character).filter(Character.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    character = Character(
        account_id=account.id,
        username=body.username,
        display_name=body.display_name,
        bio=body.bio,
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return character


@app.get("/characters/{character_id}", response_model=CharacterOut)
def get_character(character_id: int, db: Session = Depends(get_db)):
    character = db.query(Character).filter(Character.id == character_id, Character.is_active == True).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@app.put("/characters/{character_id}", response_model=CharacterOut)
def update_character(
    character_id: int,
    body: CharacterUpdate,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    if character.account_id != account.id:
        raise HTTPException(status_code=403, detail="Not your character")

    if body.display_name is not None:
        character.display_name = body.display_name
    if body.bio is not None:
        character.bio = body.bio
    db.commit()
    db.refresh(character)
    return character


# ── Tasks ──────────────────────────────────────────────────────────────────────

@app.get("/tasks", response_model=list[TaskOut])
def list_tasks(
    status: Optional[str] = Query(default="active"),
    db: Session = Depends(get_db),
):
    q = db.query(Task)
    if status and status != "all":
        q = q.filter(Task.status == status)
    tasks = q.order_by(Task.level_required, Task.id).all()

    result = []
    for t in tasks:
        result.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "point_value": t.point_value,
            "level_required": t.level_required,
            "status": t.status,
            "created_at": t.created_at,
            "submission_count": len(t.submissions),
        })
    return result


@app.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    submissions_sorted = sorted(task.submissions, key=lambda s: s.score, reverse=True)
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "point_value": task.point_value,
        "level_required": task.level_required,
        "status": task.status,
        "created_at": task.created_at,
        "submission_count": len(task.submissions),
        "submissions": [_enrich_submission_summary(s) for s in submissions_sorted],
    }


@app.post("/tasks/{task_id}/signup")
def signup_task(
    task_id: int,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = get_active_character(account, db)
    if not character:
        raise HTTPException(status_code=400, detail="Create a character first")

    task = db.query(Task).filter(Task.id == task_id, Task.status == "active").first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not active")

    existing = (
        db.query(CharacterTask)
        .filter(CharacterTask.character_id == character.id, CharacterTask.task_id == task_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already signed up for this task")

    signup = CharacterTask(character_id=character.id, task_id=task_id)
    db.add(signup)
    db.commit()
    return {"detail": "Signed up successfully"}


@app.delete("/tasks/{task_id}/signup")
def drop_task(
    task_id: int,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = get_active_character(account, db)
    if not character:
        raise HTTPException(status_code=400, detail="No active character")

    signup = (
        db.query(CharacterTask)
        .filter(CharacterTask.character_id == character.id, CharacterTask.task_id == task_id)
        .first()
    )
    if not signup:
        raise HTTPException(status_code=404, detail="Not signed up for this task")
    if signup.status == "submitted":
        raise HTTPException(status_code=400, detail="Cannot drop a task you've already submitted")

    db.delete(signup)
    db.commit()
    return {"detail": "Task dropped"}


# ── Submissions ────────────────────────────────────────────────────────────────

@app.get("/submissions")
def list_submissions(
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
):
    page_size = 20
    offset = (page - 1) * page_size
    submissions = (
        db.query(Submission)
        .order_by(Submission.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [_enrich_submission_summary(s) for s in submissions]


@app.get("/submissions/{submission_id}")
def get_submission(submission_id: int, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return _enrich_submission(sub)


@app.post("/submissions")
def create_submission(
    body: SubmissionCreate,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = get_active_character(account, db)
    if not character:
        raise HTTPException(status_code=400, detail="Create a character first")

    signup = (
        db.query(CharacterTask)
        .filter(CharacterTask.character_id == character.id, CharacterTask.task_id == body.task_id)
        .first()
    )
    if not signup:
        raise HTTPException(status_code=400, detail="Not signed up for this task")
    if signup.status == "submitted":
        raise HTTPException(status_code=400, detail="Already submitted for this task")

    task = db.query(Task).filter(Task.id == body.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    submission = Submission(
        task_id=body.task_id,
        character_id=character.id,
        title=body.title,
        body_text=body.body_text,
    )
    db.add(submission)
    signup.status = "submitted"
    db.commit()
    db.refresh(submission)
    return _enrich_submission(submission)


@app.put("/submissions/{submission_id}")
def update_submission(
    submission_id: int,
    body: SubmissionUpdate,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = get_active_character(account, db)
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if not character or sub.character_id != character.id:
        raise HTTPException(status_code=403, detail="Not your submission")

    if body.title is not None:
        sub.title = body.title
    if body.body_text is not None:
        sub.body_text = body.body_text
    db.commit()
    db.refresh(sub)
    return _enrich_submission(sub)


# ── Votes ──────────────────────────────────────────────────────────────────────

@app.post("/submissions/{submission_id}/vote", response_model=VoteOut)
def cast_vote(
    submission_id: int,
    body: VoteCreate,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    if body.stars < 1 or body.stars > 5:
        raise HTTPException(status_code=400, detail="Stars must be 1–5")

    character = get_active_character(account, db)
    if not character:
        raise HTTPException(status_code=400, detail="Create a character first")

    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Block self-voting at account level
    author_account_id = sub.character.account_id
    if author_account_id == account.id:
        raise HTTPException(status_code=403, detail="Cannot vote on your own submission")

    existing_vote = (
        db.query(Vote)
        .filter(Vote.submission_id == submission_id, Vote.voter_character_id == character.id)
        .first()
    )

    if existing_vote:
        existing_vote.stars = body.stars
        db.commit()
        _recompute_scores(sub, db)
        db.refresh(existing_vote)
        return existing_vote
    else:
        vote = Vote(
            submission_id=submission_id,
            voter_character_id=character.id,
            voter_account_id=account.id,
            stars=body.stars,
        )
        db.add(vote)
        db.commit()
        db.refresh(vote)
        db.refresh(sub)
        _recompute_scores(sub, db)
        return vote


# ── Leaderboard ────────────────────────────────────────────────────────────────

@app.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db)):
    characters = (
        db.query(Character)
        .filter(Character.is_active == True)
        .order_by(Character.score.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "rank": i + 1,
            "id": c.id,
            "username": c.username,
            "display_name": c.display_name,
            "level": c.level,
            "score": c.score,
        }
        for i, c in enumerate(characters)
    ]


# ── Account ────────────────────────────────────────────────────────────────────

@app.delete("/account")
def delete_account(
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    account.is_active = False
    for character in account.characters:
        character.is_active = False
    db.commit()
    response = JSONResponse({"detail": "Account deleted"})
    response.delete_cookie("wz_token")
    return response


# ── Signed-up tasks for current character ─────────────────────────────────────

@app.get("/me/signups")
def my_signups(
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = get_active_character(account, db)
    if not character:
        return []
    signups = (
        db.query(CharacterTask)
        .filter(CharacterTask.character_id == character.id)
        .all()
    )
    return [{"task_id": s.task_id, "status": s.status} for s in signups]


@app.get("/me/votes")
def my_votes(
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    character = get_active_character(account, db)
    if not character:
        return []
    votes = (
        db.query(Vote)
        .filter(Vote.voter_character_id == character.id)
        .all()
    )
    return [{"submission_id": v.submission_id, "stars": v.stars} for v in votes]


@app.get("/characters/{character_id}/submissions")
def character_submissions(character_id: int, db: Session = Depends(get_db)):
    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    submissions = (
        db.query(Submission)
        .filter(Submission.character_id == character_id)
        .order_by(Submission.created_at.desc())
        .all()
    )
    return [_enrich_submission_summary(s) for s in submissions]
