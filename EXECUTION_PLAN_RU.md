# New Stream Logistics - План Выполнения

## Обзор

Этот план преобразует MVP версии 1 в готовую к продакшену, масштабируемую платформу. Организован в 4 фазы с четкими результатами.

---

## Фаза 1: Безопасность и Фундамент (Критично - До Запуска)

### 1.1 Ограничение Запросов (Rate Limiting)
**Цель:** Предотвратить спам и злоупотребление API-маршрутами

**Шаги:**
1. Установить `@upstash/ratelimit` и `@upstash/redis`
   ```bash
   pnpm add @upstash/ratelimit @upstash/redis
   ```
2. Создать аккаунт Upstash Redis на https://upstash.com
3. Добавить переменные окружения:
   ```env
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   ```
4. Создать утилиту ограничения запросов в `lib/rate-limit.ts`:
   - 5 запросов в минуту для отправки заявок на расчет
   - 3 запроса в минуту для контактной формы
5. Применить middleware к маршрутам `/api/quote` и `/api/contact`
6. Возвращать статус 429 с заголовком retry-after при превышении лимита

**Файлы для создания/изменения:**
- `lib/rate-limit.ts` (новый)
- `app/api/quote/route.ts` (изменить)
- `app/api/contact/route.ts` (изменить)

---

### 1.2 Санитизация Ввода
**Цель:** Предотвратить XSS и инъекционные атаки

**Шаги:**
1. Установить библиотеку санитизации:
   ```bash
   pnpm add isomorphic-dompurify
   ```
2. Создать утилиту санитизации в `lib/sanitize.ts`
3. Санитизировать все пользовательские данные перед:
   - Сохранением в базу данных (в будущем)
   - Включением в письма
   - Отображением в админ-панели
4. Добавить ограничения длины ввода для предотвращения DoS

**Файлы для создания/изменения:**
- `lib/sanitize.ts` (новый)
- `app/api/quote/route.ts` (изменить)
- `app/api/contact/route.ts` (изменить)

---

### 1.3 Валидация Форм с Zod
**Цель:** Типобезопасная валидация на клиенте и сервере

**Шаги:**
1. Установить зависимости:
   ```bash
   pnpm add zod react-hook-form @hookform/resolvers
   ```
2. Создать схемы валидации в `lib/validations/`:
   - `quote.ts` - Схема формы расчета
   - `contact.ts` - Схема контактной формы
3. Обновить форму расчета для использования react-hook-form + zod
4. Обновить контактную форму для использования react-hook-form + zod
5. Добавить серверную валидацию в API-маршрутах используя те же схемы

**Файлы для создания/изменения:**
- `lib/validations/quote.ts` (новый)
- `lib/validations/contact.ts` (новый)
- `app/quote/quote-form.tsx` (изменить)
- `app/contact/contact-form.tsx` (изменить - проверить наличие)
- `app/api/quote/route.ts` (изменить)
- `app/api/contact/route.ts` (изменить)

---

### 1.4 Обработка Ошибок и Состояния Загрузки
**Цель:** Корректная обработка ошибок и улучшение UX

**Шаги:**
1. Создать глобальную границу ошибок в `app/error.tsx`
2. Создать глобальную страницу 404 в `app/not-found.tsx` (если не существует)
3. Создать состояния загрузки:
   - `app/loading.tsx` - Глобальная загрузка
   - `app/quote/loading.tsx` - Загрузка страницы расчета
4. Добавить Suspense-границы вокруг динамического контента
5. Создать переиспользуемый компонент ошибки в `components/ui/error-state.tsx`

**Файлы для создания:**
- `app/error.tsx`
- `app/not-found.tsx`
- `app/loading.tsx`
- `app/quote/loading.tsx`
- `components/ui/error-state.tsx`

---

### 1.5 Мониторинг Ошибок (Sentry)
**Цель:** Отслеживать и оповещать о продакшн-ошибках

**Шаги:**
1. Создать аккаунт Sentry на https://sentry.io
2. Установить Sentry SDK:
   ```bash
   pnpm add @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```
3. Настроить `sentry.client.config.ts`
4. Настроить `sentry.server.config.ts`
5. Настроить `sentry.edge.config.ts`
6. Добавить переменные окружения:
   ```env
   SENTRY_DSN=
   SENTRY_AUTH_TOKEN=
   ```
7. Обновить `next.config.js` с webpack-плагином Sentry
8. Протестировать захват ошибок с намеренной ошибкой

**Файлы для создания/изменения:**
- `sentry.client.config.ts` (новый)
- `sentry.server.config.ts` (новый)
- `sentry.edge.config.ts` (новый)
- `next.config.js` (изменить)
- `.env.local` (изменить)

---

### 1.6 CI/CD Пайплайн
**Цель:** Автоматизированное тестирование и развертывание

**Шаги:**
1. Создать GitHub Actions workflow в `.github/workflows/ci.yml`:
   - Проверка линтера (`pnpm lint`)
   - Проверка типов (`pnpm tsc --noEmit`)
   - Проверка сборки (`pnpm build`)
   - Запуск при PR и push в main
2. Создать `.github/workflows/deploy.yml` для деплоя на Vercel
3. Добавить правила защиты веток на GitHub:
   - Требовать прохождение CI перед мержем
   - Требовать одобрение ревью

**Файлы для создания:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

---

## Фаза 2: База Данных и Персистентность

### 2.1 Настройка Базы Данных (Supabase)
**Цель:** Постоянное хранение заявок, контактов и отслеживания

**Шаги:**
1. Создать проект Supabase на https://supabase.com
2. Установить клиент Supabase:
   ```bash
   pnpm add @supabase/supabase-js
   ```
3. Добавить переменные окружения:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
4. Создать схему базы данных (SQL):
   ```sql
   -- Таблица заявок на расчет
   CREATE TABLE quotes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     status TEXT DEFAULT 'pending', -- pending, quoted, accepted, completed

     -- Контактная информация
     company_name TEXT NOT NULL,
     contact_name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT,

     -- Данные контейнера
     container_number TEXT,
     container_size TEXT,
     container_type TEXT,
     weight_lbs INTEGER,
     is_hazmat BOOLEAN DEFAULT FALSE,
     is_overweight BOOLEAN DEFAULT FALSE,
     is_reefer BOOLEAN DEFAULT FALSE,

     -- Локации
     pickup_terminal TEXT,
     delivery_address TEXT,
     delivery_city TEXT,
     delivery_state TEXT,
     delivery_zip TEXT,

     -- Детали услуги
     service_type TEXT, -- standard, expedited, pre-pull
     earliest_pickup DATE,
     latest_delivery DATE,
     special_instructions TEXT,

     -- Ответ по расчету (заполняется админом)
     quoted_price DECIMAL(10,2),
     quoted_at TIMESTAMPTZ,
     quoted_by TEXT,
     quote_notes TEXT,
     quote_valid_until DATE
   );

   -- Таблица контактов
   CREATE TABLE contacts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT,
     company TEXT,
     subject TEXT,
     message TEXT NOT NULL,
     status TEXT DEFAULT 'new' -- new, read, replied
   );

   -- Таблица отправлений (для отслеживания)
   CREATE TABLE shipments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     quote_id UUID REFERENCES quotes(id),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),

     container_number TEXT NOT NULL,
     status TEXT DEFAULT 'pending',
     -- pending, picked_up, in_transit, delivered, exception

     pickup_time TIMESTAMPTZ,
     delivery_time TIMESTAMPTZ,
     current_location TEXT,
     driver_name TEXT,
     truck_number TEXT,

     -- Клиент может видеть эти заметки
     public_notes TEXT,
     -- Внутренние заметки
     internal_notes TEXT
   );

   -- История статусов отправлений
   CREATE TABLE shipment_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     status TEXT NOT NULL,
     location TEXT,
     notes TEXT,
     created_by TEXT
   );

   -- Включить RLS (Row Level Security)
   ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
   ```

5. Создать клиент Supabase в `lib/supabase/client.ts`
6. Создать серверный клиент в `lib/supabase/server.ts`
7. Сгенерировать TypeScript-типы из схемы

**Файлы для создания:**
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `types/database.ts`

---

### 2.2 Обновление API-маршрутов для Использования Базы Данных
**Цель:** Сохранять заявки и контакты в Supabase

**Шаги:**
1. Обновить `/api/quote/route.ts`:
   - Вставлять заявку в базу данных
   - Генерировать уникальный номер заявки
   - Продолжать отправлять email-уведомление
   - Возвращать ID заявки клиенту
2. Обновить `/api/contact/route.ts`:
   - Вставлять контакт в базу данных
   - Продолжать отправлять email-уведомление
3. Создать `/api/quotes/[id]/route.ts` для поиска заявки
4. Обновить страницы благодарности для отображения номера заявки

**Файлы для изменения/создания:**
- `app/api/quote/route.ts` (изменить)
- `app/api/contact/route.ts` (изменить)
- `app/api/quotes/[id]/route.ts` (новый)
- `app/quote/thank-you/page.tsx` (изменить)

---

### 2.3 Реализация Реального Отслеживания
**Цель:** Позволить клиентам отслеживать отправления по номеру контейнера

**Шаги:**
1. Обновить `/app/track/page.tsx`:
   - Добавить форму поиска по номеру контейнера
   - Запрашивать таблицу shipments
   - Отображать временную шкалу статусов из shipment_events
2. Создать компонент результата отслеживания, показывающий:
   - Текущий статус с визуальным индикатором
   - Временную шкалу всех обновлений статуса
   - Ожидаемую доставку (если доступно)
   - Контактную информацию для вопросов
3. Создать endpoint `/api/track/route.ts`:
   - Поиск по номеру контейнера
   - Возвращать отправление + события
   - Ограничить запросы для предотвращения парсинга

**Файлы для изменения/создания:**
- `app/track/page.tsx` (изменить)
- `app/api/track/route.ts` (новый)
- `components/tracking/status-timeline.tsx` (новый)
- `components/tracking/tracking-result.tsx` (новый)

---

## Фаза 3: Улучшения Клиентского Опыта

### 3.1 Раздел Отзывов
**Цель:** Добавить социальное доказательство на главную страницу

**Шаги:**
1. Создать данные отзывов в `lib/data/testimonials.ts`:
   ```typescript
   export const testimonials = [
     {
       quote: "Наконец-то драйэдж-компания, которая не играет в игры с ценами.",
       author: "Сара Чен",
       title: "Менеджер по логистике",
       company: "Pacific Import Co.",
       rating: 5
     },
     // Добавить еще 4-5
   ];
   ```
2. Обновить `components/sections/testimonials.tsx` реальным контентом
3. Добавить отзывы на страницу Услуг
4. Добавить мини-отзыв на страницу Расчета (повышает доверие)

**Файлы для изменения:**
- `lib/data/testimonials.ts` (новый)
- `components/sections/testimonials.tsx` (изменить)
- `app/services/page.tsx` (изменить)
- `app/quote/page.tsx` (изменить)

---

### 3.2 Калькулятор Примерной Цены
**Цель:** Дать мгновенный диапазон цен до полного расчета

**Шаги:**
1. Создать данные ценовых зон в `lib/data/pricing-zones.ts`:
   ```typescript
   // Зональное ценообразование (упрощенное)
   export const zones = {
     zone1: { // LA Basin (Бассейн Лос-Анджелеса)
       zips: ['90001-90899'],
       standardRange: [350, 450],
       expeditedRange: [450, 600]
     },
     zone2: { // Inland Empire (Внутренняя Империя)
       zips: ['91701-92899'],
       standardRange: [450, 600],
       expeditedRange: [600, 800]
     },
     // и т.д.
   };
   ```
2. Создать компонент калькулятора в `components/quote/price-estimator.tsx`:
   - Ввод: ZIP-код + размер контейнера + тип услуги
   - Вывод: Диапазон цен с оговоркой
3. Добавить на страницу расчета как Шаг 0 (перед полной формой)
4. CTA: "Получить точный расчет" ведет к полной форме

**Файлы для создания:**
- `lib/data/pricing-zones.ts`
- `components/quote/price-estimator.tsx`
- `app/quote/page.tsx` (изменить)

---

### 3.3 Загрузка Документов
**Цель:** Позволить прикреплять коносамент/таможенные документы к заявке

**Шаги:**
1. Настроить хранилище файлов в Supabase:
   - Создать bucket `documents`
   - Настроить RLS-политики
2. Создать компонент загрузки в `components/ui/file-upload.tsx`:
   - Поддержка drag and drop
   - Валидация типов файлов (PDF, изображения)
   - Ограничение размера (10MB)
   - Индикатор прогресса загрузки
3. Добавить в форму расчета как опциональный шаг
4. Сохранять ссылки на файлы в таблице quotes

**Файлы для создания/изменения:**
- `components/ui/file-upload.tsx` (новый)
- `app/quote/quote-form.tsx` (изменить)
- `lib/supabase/storage.ts` (новый)

---

### 3.4 SEO-Улучшения
**Цель:** Улучшить видимость в поиске

**Шаги:**
1. Создать динамическую карту сайта в `app/sitemap.ts`:
   ```typescript
   export default function sitemap() {
     return [
       { url: 'https://newstreamlogistics.com', lastModified: new Date() },
       { url: 'https://newstreamlogistics.com/services', lastModified: new Date() },
       // Все статические страницы
     ];
   }
   ```
2. Создать robots.txt в `app/robots.ts`:
   ```typescript
   export default function robots() {
     return {
       rules: { userAgent: '*', allow: '/' },
       sitemap: 'https://newstreamlogistics.com/sitemap.xml',
     };
   }
   ```
3. Добавить структурированные данные JSON-LD в layout:
   - Схема LocalBusiness
   - Схема Service
4. Добавить канонические URL на все страницы
5. Проверить мета-теги на всех страницах

**Файлы для создания:**
- `app/sitemap.ts`
- `app/robots.ts`
- `components/structured-data.tsx`

---

### 3.5 Выделение Номера Телефона
**Цель:** Сделать номер телефона заметным

**Шаги:**
1. Добавить липкий баннер с телефоном для мобильных (появляется при прокрутке вверх)
2. Добавить телефон в hero-секцию на видное место
3. Добавить отслеживание кликов по звонку (GA4 event)
4. Обновить навигацию для показа телефона на планшетах+

**Файлы для изменения:**
- `components/sections/hero.tsx`
- `components/nav.tsx`
- `components/phone-banner.tsx` (новый)

---

## Фаза 4: Клиентский Портал и Аутентификация

### 4.1 Настройка Аутентификации (Clerk)
**Цель:** Вход клиентов для доступа к порталу

**Шаги:**
1. Создать аккаунт Clerk на https://clerk.com
2. Установить Clerk SDK:
   ```bash
   pnpm add @clerk/nextjs
   ```
3. Добавить переменные окружения:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
4. Создать middleware в `middleware.ts`:
   - Публичные маршруты: /, /services, /quote, /track и т.д.
   - Защищенные маршруты: /dashboard/*
5. Добавить ClerkProvider в layout
6. Создать страницу входа в `app/sign-in/[[...sign-in]]/page.tsx`
7. Создать страницу регистрации в `app/sign-up/[[...sign-up]]/page.tsx`
8. Добавить кнопки входа/регистрации в навигацию

**Файлы для создания/изменения:**
- `middleware.ts` (новый)
- `app/layout.tsx` (изменить)
- `app/sign-in/[[...sign-in]]/page.tsx` (новый)
- `app/sign-up/[[...sign-up]]/page.tsx` (новый)
- `components/nav.tsx` (изменить)

---

### 4.2 Клиентская Панель
**Цель:** Портал самообслуживания для клиентов

**Шаги:**
1. Создать layout панели в `app/dashboard/layout.tsx`
2. Создать главную страницу панели в `app/dashboard/page.tsx`:
   - Быстрая статистика (активные отправления, ожидающие расчеты)
   - Последняя активность
3. Создать страницу заявок в `app/dashboard/quotes/page.tsx`:
   - Список всех заявок со статусом
   - Фильтрация по статусу
   - Просмотр деталей заявки
4. Создать страницу отправлений в `app/dashboard/shipments/page.tsx`:
   - Список всех отправлений
   - Фильтрация по статусу
   - Отслеживание отдельного отправления
5. Создать страницу профиля в `app/dashboard/profile/page.tsx`:
   - Информация о компании
   - Настройки контактов
   - Настройки уведомлений

**Файлы для создания:**
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/quotes/page.tsx`
- `app/dashboard/quotes/[id]/page.tsx`
- `app/dashboard/shipments/page.tsx`
- `app/dashboard/shipments/[id]/page.tsx`
- `app/dashboard/profile/page.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/stats-card.tsx`

---

### 4.3 Админ-Панель
**Цель:** Внутренний инструмент для управления заявками и отправлениями

**Шаги:**
1. Создать layout админки в `app/admin/layout.tsx`:
   - Проверка роли (только пользователи-админы)
   - Боковая навигация
2. Создать главную страницу админки в `app/admin/page.tsx`:
   - Количество ожидающих заявок
   - Активные отправления
   - Статистика за сегодня
3. Создать управление заявками в `app/admin/quotes/page.tsx`:
   - Список всех заявок
   - Фильтрация/поиск
   - Обновление статуса
   - Добавление цены расчета
4. Создать управление отправлениями в `app/admin/shipments/page.tsx`:
   - Создание отправления из заявки
   - Обновление статуса
   - Добавление событий/заметок
5. Добавить ролевой контроль доступа:
   - Обычные клиенты: только dashboard
   - Админы: dashboard + admin

**Файлы для создания:**
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/quotes/page.tsx`
- `app/admin/quotes/[id]/page.tsx`
- `app/admin/shipments/page.tsx`
- `app/admin/shipments/[id]/page.tsx`
- `app/admin/shipments/new/page.tsx`
- `components/admin/sidebar.tsx`
- `components/admin/quote-form.tsx`
- `components/admin/shipment-form.tsx`

---

### 4.4 Email-Уведомления (Улучшенные)
**Цель:** Красивые, брендированные письма для всех точек взаимодействия

**Шаги:**
1. Установить react-email:
   ```bash
   pnpm add @react-email/components react-email
   ```
2. Создать email-шаблоны в `emails/`:
   - `quote-received.tsx` - Подтверждение клиенту
   - `quote-ready.tsx` - Уведомление о готовом расчете
   - `shipment-update.tsx` - Уведомление об изменении статуса
   - `welcome.tsx` - Приветствие нового аккаунта
3. Обновить API-маршруты для использования новых шаблонов
4. Добавить скрипт превью в package.json:
   ```json
   "email:dev": "email dev -p 3001"
   ```

**Файлы для создания:**
- `emails/quote-received.tsx`
- `emails/quote-ready.tsx`
- `emails/shipment-update.tsx`
- `emails/welcome.tsx`
- `emails/components/header.tsx`
- `emails/components/footer.tsx`

---

### 4.5 SMS-Уведомления (Twilio)
**Цель:** Опциональные SMS для критических обновлений

**Шаги:**
1. Создать аккаунт Twilio на https://twilio.com
2. Установить Twilio SDK:
   ```bash
   pnpm add twilio
   ```
3. Добавить переменные окружения:
   ```env
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_PHONE_NUMBER=
   ```
4. Создать SMS-утилиту в `lib/sms.ts`
5. Добавить чекбокс согласия на SMS в форму расчета
6. Отправлять SMS для:
   - Подтверждения получения заявки
   - Уведомления о готовом расчете
   - Забора отправления
   - Доставки отправления
   - Исключительных ситуаций при доставке

**Файлы для создания:**
- `lib/sms.ts`
- Изменить `app/quote/quote-form.tsx`
- Изменить схему базы данных (добавить поля sms_optin, phone)

---

## Порядок Приоритетов Реализации

### Неделя 1-2: Фундамент
1. Ограничение запросов (1.1)
2. Санитизация ввода (1.2)
3. Обработка ошибок (1.4)
4. CI/CD пайплайн (1.6)

### Неделя 3-4: База Данных
5. Настройка Supabase (2.1)
6. Обновление API-маршрутов (2.2)
7. Реальное отслеживание (2.3)

### Неделя 5-6: Клиентский Опыт
8. Отзывы (3.1)
9. SEO-улучшения (3.4)
10. Выделение телефона (3.5)
11. Калькулятор цены (3.2)

### Неделя 7-8: Портал
12. Аутентификация (4.1)
13. Клиентская панель (4.2)
14. Email-шаблоны (4.4)

### Неделя 9-10: Админка и Финализация
15. Админ-панель (4.3)
16. Загрузка документов (3.3)
17. SMS-уведомления (4.5)
18. Мониторинг Sentry (1.5)

---

## Чек-лист Переменных Окружения

```env
# Существующие
RESEND_API_KEY=

# Ограничение запросов (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# База данных (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Аутентификация (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Мониторинг (Sentry)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Сайт
NEXT_PUBLIC_SITE_URL=https://newstreamlogistics.com
```

---

## Метрики Успеха

### Фаза 1
- [ ] 0 критических уязвимостей безопасности
- [ ] Время загрузки страницы <3с
- [ ] 100% аптайм во время тестирования

### Фаза 2
- [ ] 100% заявок сохраняется в базе данных
- [ ] Отслеживание работает для всех отправлений
- [ ] Время ответа API <500мс

### Фаза 3
- [ ] 5+ отзывов отображается
- [ ] Карта сайта проиндексирована Google
- [ ] Отслеживается показатель кликов по телефону

### Фаза 4
- [ ] 50%+ постоянных клиентов используют портал
- [ ] <10 минут на обработку заявки (админ)
- [ ] 90%+ открываемость писем

---

## Примечания

- Все оценки временных рамок предполагают 1-2 разработчиков на полной занятости
- Фазы могут пересекаться там, где позволяют зависимости
- Каждая фаза должна быть тщательно протестирована перед переходом к следующей
- Рассмотреть staging-окружение для развертывания каждой фазы
