# CLUB Core MVP

Mobile-first операційний інструмент для власника та тренера дитячого спортивного клубу. Demo-клуб — **Black Fox**, але домен не прив’язаний до конкретного виду спорту.

## Реалізовано

- dashboard із сьогоднішніми та найближчими тренуваннями;
- CRUD груп, спортсменів і тренувань (створення, редагування, деактивація/скасування);
- membership-модель, яка дозволяє спортсмену належати до кількох груп;
- Training Now із великими touch targets, стабільним алфавітним порядком, optimistic autosave, rollback, “Всі присутні” та Undo;
- профіль спортсмена й історія відвідуваності;
- огляд групи, базові метрики, needs-attention і desktop attendance matrix;
- responsive sidebar / mobile bottom navigation;
- Better Auth login, PostgreSQL, Prisma, Zod і PWA manifest.

## Запуск

Потрібні Node.js 22 і PostgreSQL.

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000).

Demo credentials:

```text
Email: coach@clubcore.local
Password: ClubCoreDemo123!
```

Ці credentials призначені лише для локального demo. У production задайте власний `BETTER_AUTH_SECRET`, канонічний HTTPS `BETTER_AUTH_URL` і не запускайте demo seed.

## Основні routes

- `/login` — вхід;
- `/dashboard` — сьогодні й найближчий розклад;
- `/groups` — групи та створення групи;
- `/groups/[id]` — огляд, учасники, тренування, attendance history;
- `/athletes/[id]` — профіль спортсмена;
- `/calendar` — список тренувань і створення тренування;
- `/trainings/[id]` — mobile-first Training Now.

## Архітектура даних

`Club` володіє `Group`, `Athlete` і `Training`. `GroupMembership` нормалізує many-to-many зв’язок груп та спортсменів. `Attendance` — окремий запис із database unique constraint для `(trainingId, athleteId)`. Усі server reads/actions отримують `clubId` із поточної authenticated session та повторно перевіряють належність mutation targets до клубу.

```text
Club -> Group -> Training -> Attendance
   \-> Athlete <- GroupMembership <- Group
```

Ключові папки: `src/server/club` — reads, `src/server/actions/club-actions.ts` — validated mutations, `src/components/club` — shell і optimistic attendance UI, `prisma` — schema/migration/repeatable seed.

## Перевірки

```bash
npm run lint
npm test
npm run build
npm run test:integration   # потребує окремої test DB
npm run test:e2e           # потребує запущеного app та DB
```

## Свідомо не входить у MVP

Payments, subscriptions, messaging, parent/athlete accounts, push/SMS, files, AI, CRM, multi-tenant SaaS, advanced analytics, offline sync та recurring-training engine.

Під час першого тестового тижня варто перевірити: чи достатньо швидкий tap-cycle статусів; чи потрібен окремий жест для absent; чи зрозуміле Undo після “Всі присутні”; чи вистачає інформації у списку спортсменів; чи відповідає needs-attention реальній тренерській інтуїції.
