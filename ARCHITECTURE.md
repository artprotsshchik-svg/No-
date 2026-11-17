# Mod Optimizer — Карта проекта (для быстрой работы с минимальным расходом токенов)

Этот файл помогает разработчику и ИИ-ассистенту не читать лишние файлы.

## Где лежат данные (JSON-шарды, править нужный кусок вместо всего каталога)
- `src/data/db/meta.json` — актуальная дата проверки базы (`updatedAt`).
- `src/data/db/mods-render.json` — рендер, шейдеры, Sinytra, LOD/Nvidium, куллинг, освещение, апскейл.
- `src/data/db/mods-memory-cpu.json` — память (RAM), запуск, CPU/потоки, частицы и звук, пресеты для слабых ПК.
- `src/data/db/mods-world-tps.json` — чанки, генерация мира, тики/TPS, физика и ИИ.
- `src/data/db/mods-net-recipes-misc.json` — сеть, рецепты (JEI/EMI/TMRV), дроп/опыт, фиксы, профилировщики.
- `src/data/db/presets.json` — готовые сборки (вкладка «Сборки»).
- `src/data/db/rules.json` — правила несовместимостей.
- `src/data/db/groups.json` — группы аналогов и их лидеры.
- `src/data/db/golden.json` — золотой стандарт лидеров.
- `src/data/modsData.ts` — короткий TS-фасад (~75 строк), объединяющий все JSON-шарды.

## Логика и интерфейс
- `src/utils/modLogic.ts` — проверка конфликтов, умный подбор, дерево «Мод → Аддоны», даты обновлений (`MOD_LAST_UPDATED_MAP`), экспорт текста.
- `src/utils/modLogic.test.ts` — автотесты (`npm test`).
- `src/components/CheckerTab.tsx` — вкладка «Чекер» + сканер папки `mods/` в Windows-версии (`window.desktopAPI`).
- `src/components/AssemblyBuilderTab.tsx` — конструктор «Клипание сборок».
- `src/components/ModDetailModal.tsx` — карточка подробностей мода.
- `src/App.tsx` — каркас навигации, вкладки «Каталог», «Сборки», «Золотой стандарт», «Отчёт».

## Windows-приложение (Electron + Умное обновление)
- `electron/main.cjs` + `electron/preload.cjs` — окно Electron, сканер локальной папки `.minecraft/mods` и `.connector`, 2-уровневый апдейтер:
  1. **Горячее обновление базы:** проверяет `manifest.json` -> качает только `db-bundle.json` в `%AppData%` без переустановки `.exe`.
  2. **Дельта-обновление программы:** `electron-updater` + `.blockmap` через GitHub Releases (`electron/builder.yml`).
- `.github/workflows/release-windows.yml` — автосборка Windows-установщика на `windows-latest` при пуше тега `v*`.

## Основные команды
- `npm test` — прогнать юнит-тесты (`tsx --test src/utils/modLogic.test.ts`).
- `npm run lint` — проверка TypeScript (`tsc --noEmit`).
- `npm run sync:data` — пересобрать `public/data/manifest.json` и `db-bundle.json` (перед релизом / после правки JSON).
- `npm run build` — сборка фронтенда (`dist/`).
- На Windows локально для сборки `.exe`:
  `npm install --no-save electron electron-builder electron-updater && npx electron-builder --config electron/builder.yml --win nsis`
