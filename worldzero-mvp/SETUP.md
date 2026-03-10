# World Zero MVP — Local Setup

## Prerequisites

- Python 3.11+
- Node.js 18+
- A Google account (for OAuth setup)

---

## 1. Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project (or select an existing one)
3. In the left sidebar, go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. If prompted, configure the OAuth consent screen first:
   - User Type: External
   - Fill in app name (e.g. "World Zero Dev") and your email
   - No scopes needed beyond the defaults
   - Add your email as a test user
6. Back in Create Credentials, choose **Application type: Web application**
7. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8000/auth/google/callback
   ```
8. Click **Create** — copy the **Client ID** and **Client Secret**

---

## 2. Backend Setup

```bash
cd worldzero-mvp/backend

# Copy the example env file and fill in your credentials
cp .env.example .env
```

Edit `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
SECRET_KEY=any_random_string_at_least_32_characters_long
FRONTEND_URL=http://localhost:3000
```

Generate a random `SECRET_KEY` if you don't have one:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Install dependencies and run:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

- API runs at **http://localhost:8000**
- `worldzero.db` is created automatically on first run
- 10 seed tasks are inserted automatically on first run
- API docs available at http://localhost:8000/docs

---

## 3. Frontend Setup

In a separate terminal:

```bash
cd worldzero-mvp/frontend
npm install
npm start
```

- App runs at **http://localhost:3000**

---

## 4. First Run Walkthrough

1. Visit http://localhost:3000
2. Click **Sign In with Google** — you'll be redirected to Google's consent screen
3. After signing in, you'll be returned to the home page
4. Enter a **username** (permanent, letters/numbers/underscores) and **display name**
5. Click **Enter the Game** — your character is created
6. You're redirected to the Tasks page — 10 tasks are ready to explore
7. Click **Sign Up** on any task, then **Submit Proof** to write your praxis
8. Visit someone else's submission to vote 1–5 stars

---

## 5. Project Structure

```
worldzero-mvp/
├── backend/
│   ├── main.py        # All FastAPI routes
│   ├── models.py      # SQLAlchemy models (SQLite)
│   ├── schemas.py     # Pydantic request/response schemas
│   ├── auth.py        # Google OAuth + JWT logic
│   ├── database.py    # SQLite engine + session
│   ├── seed.py        # Seeds 10 tasks on first run
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js          # All API calls
    │   ├── AuthContext.jsx # Auth state (account, character)
    │   ├── pages/          # Home, Tasks, TaskDetail, SubmitPraxis,
    │   │                   # SubmissionDetail, Profile, Leaderboard
    │   └── components/     # Nav, StarRating
    ├── public/index.html
    └── package.json
```

---

## 6. Troubleshooting

**"redirect_uri_mismatch" from Google**
→ Make sure `http://localhost:8000/auth/google/callback` is listed in your OAuth credentials' Authorized redirect URIs.

**CORS errors in browser console**
→ Ensure both servers are running (backend on :8000, frontend on :3000). Check that `FRONTEND_URL=http://localhost:3000` is set in `.env`.

**"Not authenticated" after login**
→ The JWT is stored as an httpOnly cookie. Make sure your browser allows cookies from localhost. In Chrome, check Settings → Privacy and Security → Cookies.

**Database issues**
→ Delete `worldzero.db` and restart the backend — it will be recreated fresh with seed data.

**Port already in use**
→ Backend: `uvicorn main:app --reload --port 8001` (then update `FRONTEND_URL` references and `api.js` API const)
→ Frontend: set `PORT=3001 npm start` on Mac/Linux, or `set PORT=3001 && npm start` on Windows
