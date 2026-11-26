# AI Trading Risk Manager

A single-user, local-first MERN web application for crypto futures traders (**isolated margin, linear USDT contracts**) to evaluate position sizing, trading costs, liquidation distance, circuit-breaker guardrails, stress tests, Monte Carlo simulations, and behavioural discipline before and after taking a trade.

- **Manual-only inputs:** No exchange APIs, live price feeds, external datasets, or automated order execution.
- **Local-only:** No login or authentication; Express binds strictly to `127.0.0.1:5000`.
- **AI Risk Coach with Fallback:** Powered by Google Gemini (`@google/genai`) on the server, with a deterministic rule-based fallback so the app works 100% offline or without an API key.

> **Disclaimers:**
> - Liquidation price is an estimate; ignores fees, funding and exchange tiers.
> - This app records decisions; it cannot stop orders on an exchange.
> - Monte Carlo output is a simulation from your own history, not a prediction.
> - Not financial advice.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Prerequisites & Setup](#prerequisites--setup)
4. [Environment Variables](#environment-variables)
5. [Scripts, Backup & Migration](#scripts-backup--migration)
6. [Database Models](#database-models)
7. [Risk Engine & Formulas](#risk-engine--formulas)
8. [Risk Score & Guardrails](#risk-score--guardrails)
9. [Stress Test, Monte Carlo & Behaviour Analytics](#stress-test-monte-carlo--behaviour-analytics)
10. [Gemini AI Risk Coach](#gemini-ai-risk-coach)
11. [REST API Reference](#rest-api-reference)
12. [Frontend Pages & UI](#frontend-pages--ui)
13. [Assumptions & Limitations](#assumptions--limitations)

---

## Tech Stack

- **Language:** JavaScript only (ES Modules `"type": "module"` in both `client` and `server`, no TypeScript)
- **Monorepo:** npm workspaces (`client`, `server`) + `concurrently`
- **Client:** React 19, Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), React Router v7, Recharts, Axios
- **Server:** Node.js (LTS), Express 5, Mongoose 9, Zod 4, `express-rate-limit`, `cors`, `dotenv`
- **AI:** `@google/genai` (server-side only)
- **Database:** Local MongoDB (`mongodb://127.0.0.1:27017/risk_manager`; tests use `risk_manager_test`)
- **Testing:** Vitest 5 + Supertest 7

---

## Project Structure

```
ai-risk-manager/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js                  # React, Tailwind v4, /api proxy -> 127.0.0.1:5000
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                     # Route definitions
│       ├── index.css
│       ├── api/                        # Axios instance & resource API modules
│       │   ├── axios.js
│       │   ├── aiApi.js
│       │   ├── analyticsApi.js
│       │   ├── exportApi.js
│       │   ├── guardrailApi.js
│       │   ├── ledgerApi.js
│       │   ├── portfolioApi.js
│       │   ├── settingsApi.js
│       │   ├── stressApi.js
│       │   ├── symbolApi.js
│       │   └── tradeApi.js
│       ├── components/
│       │   ├── ai/AiCoachPanel.jsx
│       │   ├── common/                 # EmptyState, ErrorMessage, Loader, Modal, StatCard
│       │   ├── dashboard/              # EquityCurve, ExposureChart
│       │   ├── history/                # HistoryFilters, PerformanceStats
│       │   ├── layout/                 # AppLayout, Sidebar, TopBar, Disclaimer
│       │   └── trade/                  # TradeForm, RiskResults, RiskGauge, ScoreBreakdown, WarningList, TradeTable, CloseTradeModal
│       ├── hooks/                      # useFetch, useDebounce
│       ├── pages/
│       │   ├── DashboardPage.jsx
│       │   ├── TradeFormPage.jsx
│       │   ├── PositionsPage.jsx
│       │   ├── HistoryPage.jsx
│       │   ├── StressTestPage.jsx
│       │   ├── AnalyticsPage.jsx
│       │   ├── LedgerPage.jsx
│       │   ├── SymbolsPage.jsx
│       │   └── SettingsPage.jsx
│       └── utils/                      # format.js, exportCsv.js
├── server/
│   ├── package.json
│   ├── vitest.config.js                # fileParallelism: false
│   ├── .env.example
│   ├── scripts/
│   │   ├── seed.js                     # Demo data seeder (refuses if trades exist)
│   │   └── migrate.js                  # Idempotent V1 -> V2 migration script
│   ├── src/
│   │   ├── server.js                   # Connects MongoDB & listens on 127.0.0.1
│   │   ├── app.js                      # Express app (exported for Supertest)
│   │   ├── config/                     # env.js, db.js
│   │   ├── models/                     # Settings, SymbolProfile, Trade, LedgerEntry, AuditLog, AiReview
│   │   ├── routes/                     # index, health, settings, symbol, trade, portfolio, ledger, audit, guardrail, stress, analytics, export, ai
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── validators/                 # Zod request schemas
│   │   ├── middleware/                 # validate, rateLimit, notFound, errorHandler
│   │   ├── utils/                      # ApiError, apiResponse, date (Asia/Kolkata)
│   │   ├── risk/                       # Pure calculation engine (no DB/HTTP)
│   │   │   ├── constants.js
│   │   │   ├── costs.risk.js
│   │   │   ├── trade.risk.js
│   │   │   ├── lifecycle.risk.js
│   │   │   ├── sizing.risk.js
│   │   │   ├── guardrails.risk.js
│   │   │   ├── score.risk.js
│   │   │   ├── warnings.risk.js
│   │   │   ├── portfolio.risk.js
│   │   │   ├── performance.risk.js
│   │   │   ├── stress.risk.js
│   │   │   ├── montecarlo.risk.js
│   │   │   └── behaviour.risk.js
│   │   └── ai/                         # gemini.client, prompts, response.schema, fallback
│   └── tests/
│       ├── setup.js
│       ├── unit/                       # 11 unit test files (risk engine)
│       └── api/                        # 9 API integration test files
├── .gitignore
├── package.json
└── README.md
```

**Layer flow:**
`routes -> validate (Zod) -> controllers -> services -> models (Mongoose) / risk (pure) / ai (Gemini + fallback)`

---

## Prerequisites & Setup

1. **Prerequisites:**
   - Node.js (current LTS)
   - Local MongoDB running on `127.0.0.1:27017`
2. **Install dependencies** (from repository root):
   ```bash
   npm install
   ```
3. **Configure environment:**
   ```bash
   cp server/.env.example server/.env
   ```
   *(Optional)* Add your `GEMINI_API_KEY` to `server/.env`. Never commit `.env` files.
4. **Run the app** (starts server on `127.0.0.1:5000` and client on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

---

## Environment Variables

Defined in `server/.env.example`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port (bound to `127.0.0.1`) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/risk_manager` | Primary MongoDB / Atlas connection URI |
| `MONGODB_TEST_URI` | `mongodb://127.0.0.1:27017/risk_manager_test` | Isolated test database URI |
| `GEMINI_API_KEY` | *(empty)* | Optional Google Gemini API key |
| `GEMINI_MODEL` | `gemini-flash-latest` | Gemini model ID |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (`credentials: true`) |
| `APP_URL` | `http://localhost:5173` | Public frontend URL for verification/reset links |
| `SESSION_TTL_HOURS` | `168` | Session cookie lifetime in hours (7 days) |
| `COOKIE_SECURE` | `false` (`true` in prod) | HTTPS-only cookie flag |
| `TRUST_PROXY` | `false` (`true` in prod) | Trust reverse proxy headers (required on Render) |
| `RESEND_API_KEY` | *(empty)* | Optional Resend API key for verification/reset emails |
| `EMAIL_FROM` | `AI Risk Manager <noreply@localhost>` | Sender address for transactional emails |

---

## Multi-User Authentication, Data Isolation & Demo Account

- **HTTP-Only Cookie Sessions:** Sessions are stored in MongoDB (`Session` collection with SHA-256 `tokenHash` and TTL auto-expiration) and delivered via `httpOnly`, `sameSite` cookies (`rm_session`). No tokens are stored in `localStorage`.
- **Password Security:** Passwords are hashed with `bcryptjs` (work factor 12) and `passwordHash` is excluded from queries/responses (`select: false`).
- **Strict User Data Isolation:** Every user-owned document (`Settings`, `SymbolProfile`, `Trade`, `LedgerEntry`, `AuditLog`, `AiReview`) is scoped by `userId` derived strictly from the validated server-side session (`req.auth`). Cross-user access returns `404` without leaking ownership.
- **Read-Only Demo Account:** Clicking **Continue as Demo Account** sets an isolated `rm_demo=1` cookie. Demo users can explore all 40 simulated trades, charts, Monte Carlo, and AI fallback reviews, while all write/mutation endpoints return HTTP `403` so the shared demo dataset cannot be corrupted.
- **Email Verification & Password Recovery:** Cryptographically random 32-byte single-use tokens stored as SHA-256 hashes with short expirations (24h verify / 1h reset). Password resets invalidate all active sessions.

### Legacy Auth Migration
If upgrading a database with pre-auth records (`userId: null, isDemo: false`), back up first and assign them explicitly to a registered owner:
```bash
mongodump --db risk_manager --out ./backup
node server/scripts/migrate-auth.js --owner-email=you@example.com
```

### Render Production Deployment
1. **Backend Web Service (Render):**
   - Root/Build: `npm install`
   - Start: `npm --workspace=server start`
   - Env vars: `NODE_ENV=production`, `MONGODB_URI=<Atlas prod URI>`, `CLIENT_ORIGIN=https://<your-client>.onrender.com`, `APP_URL=https://<your-client>.onrender.com`, `COOKIE_SECURE=true`, `TRUST_PROXY=true`, `RESEND_API_KEY=<optional>`, `EMAIL_FROM=<verified-sender>`, `GEMINI_API_KEY=<optional>`.
2. **Frontend Static Site (Render):**
   - Build: `npm --workspace=client run build`
   - Publish dir: `client/dist`
   - Env var: `VITE_API_URL=https://<your-server>.onrender.com/api`

---

## Scripts, Backup & Migration

| Command | Purpose |
|---|---|
| `npm run dev` | Starts server (`node --watch`) and Vite client concurrently |
| `npm test` | Runs all 20 Vitest unit & Supertest API suites against `risk_manager_test` |
| `npm run seed` | Inserts clearly labelled `[DEMO DATA]` trades (aborts if any trades exist) |
| `npm --workspace=client run build` | Builds the React production bundle |
| `node server/scripts/migrate.js` | Idempotent V1 → V2 database migration |

### Database Backup & V1 → V2 Migration
Before running `migrate.js` on an existing V1 database, back up your data:
```bash
mongodump --db risk_manager --out ./backup
node server/scripts/migrate.js
```
`migrate.js` is safe to run multiple times: it converts legacy `CLOSED` trades into single-entry `exits[]`, backfills `initialQuantity`, `remainingQuantity`, and `initialStop`, and preserves original `realizedPnl` values untouched.

---

## Database Models

1. **Settings** (singleton document, auto-created with defaults on first run):
   - Core: `startingBalance` (10000), `riskPerTradePct` (1), `maxLeverage` (10), `minRiskReward` (1.5), `maxOpenRiskPct` (5), `maxDrawdownPct` (10), `maxDailyLossPct` (3), `maintenanceMarginPct` (0.5)
   - V2 Costs: `takerFeePct` (0.05), `slippagePct` (0.05), `defaultFundingRatePct` (0.01)
   - V2 Guardrails & Tiers: `maxWeeklyLossPct` (7), `maxTradesPerDay` (5), `cooldownMinutes` (60), `cooldownAfterLosses` (3), `maxGroupRiskPct` (3), `drawdownTiers` (`<5%` → `1x`, `5–10%` → `0.5x`, `>=10%` → `0.25x`)
2. **SymbolProfile**:
   - `symbol` (unique, 2–15 uppercase alphanumeric), `maintenanceMarginPct`, `maxLeverage`, `qtyStep` (optional), `minNotional` (optional), `correlationGroup` (defaults to `symbol`), `beta` (default `1`). Overrides global defaults when present.
3. **Trade**:
   - Inputs: `symbol`, `side` (`LONG` | `SHORT`), `entry`, `stopLoss`, `initialStop`, `stopHistory[]`, `target`, `leverage` (1–125), `quantity`, `initialQuantity`, `remainingQuantity`, `fundingRatePct`, `fundingIntervals`, `markPrice`, `markUpdatedAt`
   - Lifecycle: `status` (`OPEN` | `CLOSED` | `CANCELLED`), `exits[]` (`quantity`, `price`, `fee`, `fundingPaid`, `pnl`, `time`), `exitPrice`, `fees`, `openedAt`, `closedAt`, `realizedPnl`, `rMultiple`
   - Journal & Audit: `notes`, `overrideReason`, `setupTag`, `emotionTag`, `followedPlan`, `lesson`
   - Snapshot: `metrics`, `riskScore`, `riskBand`, `scoreBreakdown[]`, `warnings[]`
4. **LedgerEntry**:
   - `type` (`DEPOSIT` | `WITHDRAWAL`), `amount` (> 0), `date`, `note`
5. **AuditLog**:
   - `action`, `entity`, `entityId`, `before`, `after`, `reason`, `time`
6. **AiReview**:
   - `type` (`TRADE` | `PORTFOLIO` | `WEEKLY`), `tradeId` (optional), `inputHash`, `response`, `source` (`gemini` | `fallback`), `model`, `createdAt`

---

## Risk Engine & Formulas

All calculations live in `server/src/risk/` as pure functions with `1e-9` threshold tolerance (`EPS`) and clean zero/null empty states (never `NaN` or `Infinity`).

### Account Balance & Equity
- `balance = startingBalance + sum(closedTrades.realizedPnl) + sum(deposits) - sum(withdrawals)`
- `equity = balance + sum(openTrades.unrealizedPnl)`
- `availableMargin = balance - marginUsed` (withdrawals exceeding `availableMargin` are rejected with HTTP 400)

### Trading Costs & Position Sizing (`costs.risk.js`, `trade.risk.js`)
Let `f = takerFeePct / 100`, `s = slippagePct / 100`, `mmr = maintenanceMarginPct / 100`, and `dir = LONG ? 1 : -1`:
- `fundingPerUnit = max(0, dir * entry * (fundingRatePct / 100) * fundingIntervals)` *(expected favorable funding never reduces risk)*
- `lossPerUnit = |entry - stopLoss| + entry * f + stopLoss * f + stopLoss * s + fundingPerUnit`
- `rawQuantity = userQuantity ?? (riskBudget / lossPerUnit)`
- `quantity = floor(rawQuantity / qtyStep) * qtyStep` *(rejects 0 after rounding or notional < `minNotional`)*
- `notional = quantity * entry`
- `margin = notional / leverage`
- `liquidation (LONG) = entry * (1 - 1 / leverage + mmr)`
- `liquidation (SHORT) = entry * (1 + 1 / leverage - mmr)`
- `stopBeyondLiquidation`: `LONG` if `stopLoss <= liquidation`; `SHORT` if `stopLoss >= liquidation`
- `amountAtRisk`:
  - With valid stop inside liquidation: `quantity * lossPerUnit`
  - Without stop or stop beyond liquidation: `margin + quantity * (entry * f + fundingPerUnit)`
- `netReward = quantity * (|target - entry| - entry * f - target * f - fundingPerUnit)`
- `grossRiskReward = |target - entry| / |entry - stopLoss|`
- `netRiskReward = netReward / amountAtRisk` *(used in risk scoring)*
- `breakEven (LONG) = (entry * (1 + f) + fundingPerUnit) / (1 - f)`
- `breakEven (SHORT) = (entry * (1 - f) - fundingPerUnit) / (1 + f)`

### Position Lifecycle (`lifecycle.risk.js`)
- **Partial / Full Exit PnL:** `dir * (exitPrice - entry) * q - exitFee - entryFee * (q / initialQuantity) - fundingPaid`
- **R-Multiple:** `totalRealizedPnl / initialAmountAtRisk`
- **Stop Move:** Must stay on the valid side of current mark price (`markPrice ?? entry`). Widening a stop requires a non-empty `reason`.
- **Mark Price:** Manual per open trade; marked **stale** if `markUpdatedAt` is older than 4 hours. Falls back to `entry` if unset.
- **Open Risk:** `max(0, dir * (entry - stopLoss) * remainingQuantity + exitCosts)` (or remaining margin + allocated entry fee if no stop / beyond liquidation).

### Cash-Flow-Neutral Drawdown (`performance.risk.js`)
- Maintains a **Performance Index** starting at `100`.
- Deposits and withdrawals update `runningBalance` without changing the index.
- Each exit event in chronological order updates:
  `perfIndex = perfIndex * (1 + exitPnl / balanceBeforeExit)`
- `drawdown = (peakIndex - perfIndex) / peakIndex * 100`

---

## Risk Score & Guardrails

### Drawdown-Based Sizing (`sizing.risk.js`)
`effectiveRiskPct = riskPerTradePct * multiplier`
- Drawdown `< 5%`: `1.0x`
- Drawdown `5% to < 10%`: `0.5x`
- Drawdown `>= 10%`: `0.25x`

Used for both `riskBudget` and the risk-per-trade score threshold.

### Risk Score (0–100, `score.risk.js`)
| Factor | Condition | Points |
|---|---|---|
| Risk per trade | `<= effectiveRiskPct` | 0 |
| | `> 1x` to `2x effectiveRiskPct` | 15 |
| | `> 2x effectiveRiskPct` | 25 |
| Leverage | `<= 5x` | 0 |
| | `> 5x` to `10x` | 10 |
| | `> 10x` to `20x` | 15 |
| | `> 20x` | 20 |
| Stop-loss | Missing or beyond liquidation | 25 *(and final score ≥ 51)* |
| Net Risk:Reward | No target | 10 |
| | `< 1.0` | 15 |
| | `1.0` to `< minRiskReward` | 10 |
| | `>= minRiskReward` (or no stop with target) | 0 |
| Portfolio | Projected open risk `> maxOpenRiskPct` | 10 |
| | Current drawdown `> maxDrawdownPct` | 5 |

- **Bands:** `0–25` Low, `26–50` Medium, `51–75` High, `76–100` Critical.
- Saving a **High** or **Critical** trade requires `acknowledged: true` ("I understand the risk").

### Guardrails / Circuit Breakers (`guardrails.risk.js`)
All day and week boundaries use **Asia/Kolkata (IST)** with weeks starting **Monday**.

- **BLOCK** when any of the following hold:
  1. Today's realized loss `>= maxDailyLossPct` of start-of-day balance
  2. This week's realized loss `>= maxWeeklyLossPct` of start-of-week balance
  3. Trades opened today `>= maxTradesPerDay`
  4. Last `cooldownAfterLosses` closed trades are losses and `cooldownMinutes` has not elapsed
  5. Projected open risk `> maxOpenRiskPct`
  6. Same-direction correlation group risk `> maxGroupRiskPct`
  7. Risk score band is `Critical`
- **WARN** when any limit is `>= 80%` used or non-scoring warnings trigger (leverage > `maxLeverage`, margin > `availableMargin`, 3+ consecutive losses, >50% symbol concentration with 2+ open trades).
- **Override:** A `BLOCK`ed trade can only be saved with `overrideReason` (minimum 20 characters), enforced on the server and recorded in `AuditLog`.

---

## Stress Test, Monte Carlo & Behaviour Analytics

- **Stress Test (`stress.risk.js`):**
  - Evaluates shocks `[-20, -10, -5, +5, +10, +20]` plus optional custom shock using `newPrice = mark * (1 + shock * beta / 100)`.
  - **`STOPS_WORK`:** Exits at stop-loss with slippage if shocked price crosses stop.
  - **`GAP`:** Ignores stops; exits at shocked price.
  - If the applied exit crosses liquidation, the position is liquidated and loses its full isolated margin (+ exit costs). Never loses more than margin plus costs.
- **Monte Carlo (`montecarlo.risk.js`):**
  - Requires at least **30 closed trades** with valid R-multiples (below 30, reports how many more trades are needed).
  - Runs **10,000** simulations of **100** trades each using a seedable Mulberry32 PRNG (`equity *= 1 + riskFraction * R`, floored at `0`).
  - Reports probability of 20%, 30%, and 50% drawdown, median final equity, and 5th percentile final equity.
- **Behaviour Analytics (`behaviour.risk.js`):**
  - Flags: `revengeTrade` (opened ≤ 30 min after a loss with higher risk %), `overtrading` (> `maxTradesPerDay` in IST), `widenedStop`, and `overrideUsed`.
  - Segmented stats by `setupTag`, `symbol`, `side`, and `weekday` (IST): count, win rate, average R, net PnL, total fees, and `smallSample` badge when `< 10` trades.

---

## Gemini AI Risk Coach

- **Endpoints:** `POST /api/ai/trade-review`, `POST /api/ai/portfolio-review`, `POST /api/ai/weekly-review`.
- **Privacy:** Sends only server-computed numbers, symbol, side, score breakdown, warnings, and flag counts — **never** free-text `notes` or `lesson`.
- **Reliability & Safety:**
  - Structured JSON output validated with Zod (`summary`, `weaknesses`, `suggestions`, `verdict`).
  - Verdict floor enforced on server: `High` risk ≥ `NEEDS_CHANGES`, `Critical` risk = `TOO_RISKY`.
  - 20-second timeout with 1 automatic retry for transient errors.
  - Rate-limited to **10 requests/minute** on `/api/ai/*`.
  - Successful Gemini responses cached in `AiReview` by SHA-256 hash of input + model.
  - Automatically falls back to deterministic rule-based advice (`source: "fallback"`) if `GEMINI_API_KEY` is missing, quota is exceeded, or JSON parsing fails.

---

## REST API Reference

All responses use `{ success: boolean, data: any, error: { message, details? } | null }`.

| Group | Method & Path | Description |
|---|---|---|
| **Health** | `GET /api/health` | Server & MongoDB connection status |
| **Settings** | `GET /api/settings` | Get (or initialize) global settings |
| | `PUT /api/settings` | Update global settings (audited) |
| **Symbols** | `GET /api/symbols` | List symbol profiles |
| | `POST /api/symbols` | Create symbol profile |
| | `PUT /api/symbols/:id` | Update symbol profile |
| | `DELETE /api/symbols/:id` | Delete symbol profile |
| **Trades** | `POST /api/trades/analyze` | Calculate sizing, costs, score, guardrails & what-if table without saving |
| | `GET /api/trades` | List trades (filters: `status`, `symbol`, `result`; optional pagination: `page`, `limit`, `sortBy`, `sortOrder`) |
| | `POST /api/trades` | Save open trade (enforces acknowledgement & 20-char override) |
| | `GET /api/trades/:id` | Get single trade with mark state |
| | `PUT /api/trades/:id` | Edit OPEN trade (blocked if partial exits exist; enforces BLOCK override) |
| | `DELETE /api/trades/:id` | Delete trade (blocked if exits exist) |
| | `POST /api/trades/:id/exits` | Record partial or full exit |
| | `POST /api/trades/:id/close` | Full exit of remaining quantity |
| | `PATCH /api/trades/:id/stop` | Move stop-loss (requires reason if widening) |
| | `PATCH /api/trades/:id/mark` | Update manual mark price |
| | `PATCH /api/trades/:id/journal` | Update `setupTag`, `emotionTag`, `followedPlan`, `lesson` |
| | `POST /api/trades/:id/cancel` | Cancel OPEN trade (without exits) |
| **Portfolio** | `GET /api/portfolio/summary` | Balance, equity, unrealized PnL, open risk, exposure, leverage concentration & warnings |
| | `GET /api/portfolio/performance` | Performance index, drawdowns, win rate, avg R, expectancy, equity curve |
| **Ledger** | `GET /api/ledger` | List deposits & withdrawals |
| | `POST /api/ledger` | Record deposit or withdrawal (blocks withdrawal > available margin) |
| **Guardrails** | `GET /api/guardrails/status` | Current `ALLOW` / `WARN` / `BLOCK` status & limit meters (excludes `CANCELLED` trades) |
| **Risk Sim** | `GET /api/risk/advanced` | Analytical Risk of Ruin, Kelly Criterion, Drawdown Recovery & Risk Budget |
| | `POST /api/risk/stress` | Run `STOPS_WORK` or `GAP` shock stress test |
| | `POST /api/risk/montecarlo` | Run seeded 10,000 × 100 Monte Carlo simulation |
| | `POST /api/risk/correlation` | Pearson return correlation matrix from user-supplied price series |
| **Analytics** | `GET /api/analytics` | Behavioural flags, planned-vs-actual & segmented performance |
| **Audit & Export** | `GET /api/audit` | Audit log entries (supports optional `page`, `limit`) |
| | `GET /api/export` | Full JSON backup of all collections |
| **AI Coach** | `POST /api/ai/trade-review` | AI review for unsaved trade input or `tradeId` |
| | `POST /api/ai/portfolio-review` | AI review of current portfolio |
| | `POST /api/ai/weekly-review` | AI review of weekly stats & behavioural flags |

---

## Frontend Pages & UI

- **Persistent Top Bar:** Displays Equity, Daily Loss Used, Open Risk Used, Dark/Light Theme toggle, and `ALLOW` / `WARN` / `BLOCK` status on every page (auto-refreshes on navigation).
- **Dashboard (`/`):** Balance & equity cards, limit meters, equity curve, drawdown curve, exposure by symbol chart, positions closest to liquidation, daily realized PnL calendar (IST), active warnings, and AI Portfolio Review.
- **New / Edit Trade (`/trades/new`, `/trades/:id/edit`):** Live debounced `/analyze` ticket with funding inputs, costs breakdown, gross vs net R:R, break-even price, drawdown-adjusted sizing note, guardrail status + override input, leverage what-if table, 0–100 score gauge, and Ask AI Coach.
- **Trade Detail & Journal (`/trades/:id`):** Full trade breakdown, exits history, score breakdown, Trade Journal editor (`setupTag`, `emotionTag`, `followedPlan`, `lesson`), and AI Trade Review.
- **Positions (`/positions`):** Open positions with mark price (and `stale`/`entry` labels), unrealized PnL, liquidation distance, and modals for Mark Price, Move Stop, Partial Exit, Close, Edit, and Cancel.
- **History (`/history`):** Closed trade filters (symbol & win/loss/breakeven), performance stats, and CSV export with formula-injection escaping (`=`, `+`, `-`, `@`).
- **Stress Test (`/stress`):** Risk of Ruin, Kelly Criterion, Drawdown Recovery, Risk Budget cards, shock mode toggle (`STOPS_WORK` vs `GAP`), Monte Carlo distribution chart, and manual-input Pearson Correlation calculator.
- **Analytics (`/analytics`):** Discipline flag counters, segmented performance tables with `small sample` badges (<10 trades), and AI Weekly Review.
- **Ledger (`/ledger`):** Deposit and withdrawal form and transaction history.
- **Symbols (`/symbols`):** Symbol profile override manager.
- **Settings (`/settings`):** All global risk, cost, and guardrail parameters plus **Export All JSON**.

---

## Assumptions & Limitations

1. **Isolated Margin & Linear USDT:** Cross-margin, coin-margined contracts, and tiered exchange maintenance margins are not modeled.
2. **Manual Data Only:** Entry, exit, mark prices, and funding rates are entered manually; no live exchange sync occurs.
3. **Liquidation Estimate:** `entry * (1 ∓ 1/leverage ± mmr)` is an approximation that ignores funding accruals, fees, and exchange-specific ADL/tier rules.
4. **Advisory Guardrails:** Circuit breakers and overrides enforce discipline inside this journal/calculator only; they cannot block orders placed directly on an exchange.
5. **Single User / Localhost:** No authentication or multi-user isolation; intended strictly for `127.0.0.1` local use.
