# Mod Optimizer — Карта проекта (для минимального расхода токенов)

Короткий индекс: при правке данных или UI читайте только нужный узкий модуль.

## База модов (`src/data/db/`)
- `meta.json` — дата проверки базы (`updatedAt`).
- `mod-dates.json` — даты обновлений отдельных модов.
- `presets.json` — основные сборки Nvidium и Alloyium (`Сборки`).
- `rules.json` — правила несовместимостей.
- `groups.json` — группы аналогов и лидеры.
- `mods-render.json`, `mods-memory-cpu.json`, `mods-world-tps.json`, `mods-net-recipes-misc.json` — шарды каталога модов.
- `src/data/modsData.ts` — короткий TS-фасад, собирающий JSON-шарды.

## Логика (`src/utils/`, разбита на мелкие модули)
- `modTypes.ts` — типы настроек, результатов и статусов.
- `modDates.ts` — чтение `mod-dates.json`.
- `modAnalyzer.ts` — зависимости, конфликты, совместимость JEI/EMI и тиры.
- `modBuilder.ts` — умный подбор, фиксы, переключение модов.
- `modTree.ts` — дерево «Мод → Аддоны» и текстовый экспорт.
- `modLogic.ts` — реэкспорт модулей (~5 строк).
- `jarMatcher.ts` — сопоставление `.jar` из локальной папки `.minecraft/mods`.
- `persistence.ts` — сохранение вкладок, настроек и дат между перезапусками.
- `modLogic.test.ts` — автотесты (`npm test`).

## Интерфейс (`src/components/` + `src/App.tsx`)
- `src/App.tsx` — каркас шапки (4 вкладки), полоса дат и сохранение состояния.
- `CatalogTab.tsx` — вкладка «Каталог».
- `AssemblyBuilderTab.tsx` — «Клипание сборок» (2 секции: Оптимизация и JEI / EMI).
- `PresetsTab.tsx` — вкладка «Сборки» (Nvidium и Alloyium).
- `CheckerTab.tsx` — вкладка «Чекер» + сканер `.jar`.
- `desktopBridge.ts` — мост фронтенда для desktop-оболочки на Go + WebView2.
- `ModDetailModal.tsx` — карточка подробностей мода.

## Windows-приложение (Go + системный Edge WebView2 + CLI)
- `desktop/main.go`, `core.go`, `server.go`, `gui_windows.go` — нативный Windows-клиент без Electron (~7 МБ `.exe`, системный WebView2), сканер `.minecraft/mods`, хранение `app-state.json`, горячее обновление базы и консольный режим (`modopt-cli` / `scan`).
- `.github/workflows/release-windows.yml` — автопроверка веб-сборки, Go-тестов, кросс-компиляции и выпуск `.exe` при теге `v*`.

## Основные команды
- `npm run sync:data` — обновить `public/data/manifest.json` и `db-bundle.json` после правки JSON.
- `npm test` — юнит-тесты.
- `npm run lint` — проверка TypeScript.
- `npm run build` — сборка фронтенда.
