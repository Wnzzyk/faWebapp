# Faceit Arena — Static Deploy Guide

Полностью бесплатный стек:
- **GitHub Pages** → фронтенд (HTML/CSS/JS)
- **Cloudflare Workers** → API (замена Next.js API routes)
- **Supabase** → PostgreSQL (бесплатно 500MB)

---

## Шаг 1 — Supabase (база данных)

1. Зайди на [supabase.com](https://supabase.com) → **New project**
2. Запомни: **Project URL** и **service_role key** (Settings → API)
3. Открой **SQL Editor** и вставь схему:

```sql
-- Применяет схему из Prisma напрямую в Supabase
-- Запусти npx prisma db push с DATABASE_URL от Supabase
```

Либо подключи `DATABASE_URL` от Supabase к Railway и запусти:
```
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres" npx prisma db push
```

Или через Supabase CLI:
```bash
npx supabase db push
```

---

## Шаг 2 — Cloudflare Workers (API)

1. Зарегистрируйся на [cloudflare.com](https://cloudflare.com)
2. Перейди в **Workers & Pages** → **Create application** → **Create Worker**
3. Назови воркер, например `faceit-api`
4. Нажми **Edit code** и замени всё содержимое на код из `worker/worker.js`
5. Нажми **Save and deploy**
6. Перейди в **Settings** → **Variables** → добавь:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | `service_role_key_here` |
| `BOT_TOKEN` | `токен_бота` |

7. Запомни URL воркера — он выглядит как `https://faceit-api.YOUR_NAME.workers.dev`

> ⚠️ Variables типа `SUPABASE_KEY` и `BOT_TOKEN` — секретные. Никогда не добавляй их в код!

---

## Шаг 3 — Frontend (GitHub Pages)

1. Открой `frontend/app.js` и замени в первой строке:
```js
const API_BASE = 'https://faceit-api.YOUR_SUBDOMAIN.workers.dev';
```
На реальный URL твоего Cloudflare Worker из шага 2.

2. Создай новый репозиторий на GitHub (или используй текущий)
3. Залей три файла из папки `frontend/`:
   - `index.html`
   - `style.css`
   - `app.js`

4. Перейди в **Settings** → **Pages** → **Source**: `Deploy from a branch`
5. Branch: `main`, Folder: `/ (root)` → **Save**
6. Через 1-2 минуты сайт будет доступен по адресу:
   `https://USERNAME.github.io/REPO_NAME`

---

## Шаг 4 — Telegram Mini App

1. Открой [@BotFather](https://t.me/BotFather) → `/mybots` → твой бот
2. **Bot Settings** → **Menu Button** → вставь URL GitHub Pages:
   `https://USERNAME.github.io/REPO_NAME`
3. Или через **Menu Button** → **Configure Menu Button**

---

## Структура файлов

```
├── frontend/
│   ├── index.html    ← деплоить на GitHub Pages
│   ├── style.css
│   └── app.js        ← не забудь вписать API_BASE!
└── worker/
    └── worker.js     ← вставить в Cloudflare Workers
```

---

## Миграция данных из Railway → Supabase

Если уже есть данные на Railway PostgreSQL:

```bash
# Экспорт из Railway
pg_dump "postgresql://USER:PASS@switchback.proxy.rlwy.net:PORT/railway" > backup.sql

# Импорт в Supabase
psql "postgresql://postgres:PASSWORD@db.SUPABASE_ID.supabase.co:5432/postgres" < backup.sql
```

---

## Итог

| Сервис | Домен | Цена |
|--------|-------|------|
| GitHub Pages | `username.github.io/repo` | Бесплатно |
| Cloudflare Workers | `faceit-api.name.workers.dev` | Бесплатно (100k req/day) |
| Supabase | (только БД) | Бесплатно (500MB) |
