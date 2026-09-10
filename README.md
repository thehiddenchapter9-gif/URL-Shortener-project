# Coil — сервис сокращения ссылок (MVP)

MVP-сервис для сокращения URL с базовой аналитикой переходов. Backend на Node.js/Express/TypeScript со слоистой архитектурой, PostgreSQL и Redis-кешированием; frontend на React.

## Стек

- **Backend:** Node.js, Express, TypeScript (строгий режим)
- **Database:** PostgreSQL
- **Cache:** Redis (read-through cache, TTL 1 час)
- **Frontend:** React 18 + Vite
- **Валидация:** Zod (тело запроса, параметры, переменные окружения)
- **Тесты:** Jest + Supertest (юнит- и интеграционные тесты)
- **Логирование:** morgan (HTTP-запросы) + winston (структурированные логи приложения)
- **Безопасность:** helmet, rate limiting на создание ссылок, ограничение размера тела запроса
- **Линтинг/форматирование:** ESLint + Prettier
- **Инфраструктура:** Docker / docker-compose

## Архитектура backend

Чистое разделение на слои: HTTP не знает о SQL, бизнес-логика не знает об Express.

```
backend/src/
  config/         # env (валидация через Zod), подключение к PostgreSQL и Redis, health-пинги
  middleware/     # validate (Zod), rateLimiter, errorHandler
  routes/         # маршрутизация Express, подключение middleware к контроллерам
  controllers/    # HTTP-слой: тонкие обработчики, без бизнес-логики и валидации
  services/       # бизнес-логика: генерация кода, работа с кешем, защита от циклических редиректов
  repositories/   # доступ к данным: PostgreSQL (urlRepository) и Redis (urlCacheRepository)
  utils/          # ошибки, генератор кода, Zod-схемы, логгер, asyncHandler
  types/          # общие TypeScript-типы
```

Поток запроса: `route → validate middleware → controller → service → repository → PostgreSQL/Redis`.

## Быстрый старт через Docker

Требуется установленный Docker и Docker Compose.

```bash
git clone <repo-url>
cd url-shortener
docker compose up --build
```

После запуска:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Liveness: http://localhost:3000/health
- Readiness (проверяет доступность PostgreSQL и Redis): http://localhost:3000/health/ready

## Локальный запуск без Docker

Требуется Node.js 20+, локальный PostgreSQL и Redis.

### 1. PostgreSQL и Redis

Поднимите PostgreSQL (создайте базу `url_shortener`) и Redis локально, либо через Docker:

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=url_shortener -p 5432:5432 postgres:16-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

Таблица `urls` создаётся автоматически при старте backend (см. `src/config/db.ts`), либо создайте её вручную:

```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls (created_at);
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API поднимется на `http://localhost:3000`.

Другие полезные команды:

```bash
npm run build          # компиляция в dist/ (через tsconfig.build.json)
npm start               # запуск скомпилированной версии
npm test                # юнит- и интеграционные тесты
npm run test:coverage   # тесты с отчётом покрытия
npm run typecheck       # проверка типов без сборки
npm run lint            # ESLint
npm run format          # Prettier
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Приложение поднимется на `http://localhost:5173`.

## Переменные окружения

Все переменные валидируются через Zod при старте (`src/config/env.ts`) — при некорректном значении процесс завершится с понятной ошибкой вместо непредсказуемого поведения в рантайме.

### backend/.env

| Переменная | Описание | По умолчанию |
|---|---|---|
| `PORT` | Порт API | `3000` |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `BASE_URL` | Базовый URL для формирования коротких ссылок | `http://localhost:3000` |
| `PGHOST` | Хост PostgreSQL | `localhost` |
| `PGPORT` | Порт PostgreSQL | `5432` |
| `PGUSER` | Пользователь PostgreSQL | `postgres` |
| `PGPASSWORD` | Пароль PostgreSQL | `postgres` |
| `PGDATABASE` | Имя базы данных | `url_shortener` |
| `PG_POOL_MAX` | Максимальный размер пула соединений PostgreSQL | `10` |
| `REDIS_URL` | Строка подключения к Redis | `redis://localhost:6379` |
| `REDIS_CACHE_TTL_SECONDS` | TTL кеша в секундах | `3600` |
| `SHORT_CODE_LENGTH` | Длина короткого кода (4–10) | `6` |
| `LOG_LEVEL` | `error` \| `warn` \| `info` \| `http` \| `debug` | `info` |
| `RATE_LIMIT_WINDOW_MS` | Окно rate limit для `POST /api/shorten`, мс | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Лимит запросов на создание ссылки за окно (на IP) | `30` |

### frontend/.env

| Переменная | Описание | По умолчанию |
|---|---|---|
| `VITE_API_BASE_URL` | Адрес backend API | `http://localhost:3000` |

## API

### `POST /api/shorten`

Создаёт короткую ссылку. Ограничено rate limit'ом (см. `RATE_LIMIT_*`).

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com/very/long/path"}'
```

Ответ `201`:

```json
{ "shortCode": "aB3xY9", "shortUrl": "http://localhost:3000/aB3xY9" }
```

Ошибка `400` при невалидном URL:

```json
{ "error": "originalUrl must be a valid HTTP/HTTPS URL" }
```

Ошибка `400` при попытке сократить ссылку, ведущую на сам сервис (защита от циклических редиректов):

```json
{ "error": "originalUrl cannot point back to this service (would create a circular redirect)" }
```

Ошибка `429` при превышении лимита запросов:

```json
{ "error": "Too many requests, please try again later" }
```

### `GET /:shortCode`

Редиректит (`302`) на оригинальный URL и увеличивает счётчик переходов. Читает из Redis, при промахе — из PostgreSQL с прогревом кеша.

```bash
curl -i http://localhost:3000/aB3xY9
```

Ошибка `404`, если код не найден:

```json
{ "error": "Short code not found" }
```

### `GET /api/stats/:shortCode`

Возвращает статистику по короткой ссылке.

```bash
curl http://localhost:3000/api/stats/aB3xY9
```

Ответ `200`:

```json
{
  "originalUrl": "https://example.com/very/long/path",
  "shortCode": "aB3xY9",
  "clicks": 4,
  "createdAt": "2026-09-01T10:15:00.000Z"
}
```

### `GET /health` и `GET /health/ready`

Служебные эндпоинты для оркестрации (Docker/Kubernetes):

- `GET /health` — liveness: процесс запущен и отвечает на HTTP.
- `GET /health/ready` — readiness: дополнительно проверяет доступность PostgreSQL и Redis (`200`, если оба доступны, иначе `503`).

## Кеширование

При запросе `GET /:shortCode` сервис сначала обращается в Redis. При промахе — читает `original_url` из PostgreSQL, кладёт значение в Redis с TTL 1 час (`REDIS_CACHE_TTL_SECONDS`), и только затем отдаёт редирект. Счётчик `clicks` инкрементируется в PostgreSQL при каждом переходе, независимо от того, откуда был прочитан URL — это гарантирует, что статистика остаётся точной даже при активном использовании кеша.

## Тесты

```bash
cd backend
npm test
```

Покрытие:

- **Юнит-тесты** бизнес-логики сервиса (`tests/urlService.test.ts`): генерация кода, регенерация при коллизии, поведение кеша (hit/miss), защита от циклических редиректов, обработка отсутствующего кода.
- **Юнит-тесты** Zod-схем и middleware валидации (`tests/validation.test.ts`, `tests/validate.test.ts`).
- **Интеграционные тесты** через Supertest поверх реального HTTP-стека — роутинг, валидация, контроллеры, сервисы, обработка ошибок — с in-memory заглушками PostgreSQL/Redis вместо реальных БД (`tests/app.test.ts`, `tests/fakes.ts`).
- **Тесты rate limiting** (`tests/rateLimiter.test.ts`): лимит и его изоляция между инстансами приложения.

## Обработка ошибок

| Ситуация | Код |
|---|---|
| Невалидный `originalUrl` / короткий код неверного формата | `400` |
| Ссылка на сам сервис (циклический редирект) | `400` |
| Короткий код не найден (`GET /:code`, `GET /api/stats/:code`) | `404` |
| Превышен rate limit на `POST /api/shorten` | `429` |
| Не удалось сгенерировать уникальный код за 5 попыток | `500` |
| Непредвиденная ошибка сервера | `500` |

Формат ошибки везде одинаковый: `{ "error": "<сообщение>" }`.

## Дополнительно реализовано (сверх базовых требований)

- Слоистая архитектура с чёткой границей между HTTP, бизнес-логикой и доступом к данным.
- Строгий TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`), без `any` в бизнес-логике.
- Защита от циклических редиректов на этапе создания ссылки.
- Регенерация короткого кода при коллизии (в том числе при гонке на уровне БД через unique constraint).
- Валидация Zod для тела запроса, параметров пути и переменных окружения.
- Rate limiting на создание ссылок, Helmet, ограничение размера тела запроса.
- Структурированное логирование (winston) + логирование HTTP-запросов (morgan).
- Liveness/readiness health-checks для оркестрации в контейнерах.
- Graceful shutdown (корректное закрытие пула PostgreSQL и соединения Redis по SIGTERM/SIGINT).
- ESLint + Prettier, отдельный `tsconfig.build.json` для сборки.
- Юнит- и интеграционные тесты (Jest + Supertest) с in-memory заглушками инфраструктуры.
