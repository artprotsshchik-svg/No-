import { useState, useMemo, useEffect, useRef, type SetStateAction } from 'react';
import {
  DATABASE_UPDATED_AT,
  MODS_DATABASE,
  MOD_PRESETS,
  type ModItem,
  type ModPreset,
} from './data/modsData.ts';
import {
  buildSmartAssembly,
  toggleModSmart,
  INITIAL_BUILDER_PREFS,
  type AssemblyPreferences,
} from './utils/modLogic.ts';
import {
  formatRuDate,
  loadLocalAppState,
  parsePersistedState,
  saveLocalAppState,
  type PersistedAppState,
  type PersistedTabKey,
} from './utils/persistence.ts';
import { ModDetailModal } from './components/ModDetailModal.tsx';
import { CheckerTab } from './components/CheckerTab.tsx';
import { AssemblyBuilderTab } from './components/AssemblyBuilderTab.tsx';
import { CatalogTab } from './components/CatalogTab.tsx';
import { PresetsTab } from './components/PresetsTab.tsx';
import { ShieldCheck } from 'lucide-react';

const DEFAULT_CHECKED_MOD_IDS: string[] = [
  'embeddium',
  'sodium-chloride',
  'alloyium',
  'immediatelyfast',
  'entity-culling',
  'more-culling-reforged',
  'enhanced-block-entities-reloaded',
  'culllessleaves-reforged',
  'modernfix',
  'ferritecore',
  'alltheleaks-memory-leak-fix',
  'radium-re-reforged',
  'badoptimizations',
  'noisiumed',
  'ixeris',
  'smooth-boot-reloaded',
  'dynamic-fps',
  'clumps',
  'packet-fixer',
  'spark',
];

export default function App() {
  const initialLocal = useMemo(() => loadLocalAppState(), []);
  const initialPrefs = initialLocal?.builderPrefs ?? INITIAL_BUILDER_PREFS;

  const [activeTab, setActiveTabState] = useState<PersistedTabKey>(
    initialLocal?.activeTab ?? 'catalog'
  );
  const [selectedModDetail, setSelectedModDetail] = useState<ModItem | null>(null);
  const [checkedModIds, setCheckedModIdsState] = useState<string[]>(
    initialLocal?.checkedModIds ?? DEFAULT_CHECKED_MOD_IDS
  );
  const [builderPrefs, setBuilderPrefsState] = useState<AssemblyPreferences>(initialPrefs);
  const [builderModIds, setBuilderModIdsState] = useState<string[]>(
    () => initialLocal?.builderModIds ?? buildSmartAssembly(initialPrefs).modIds
  );
  const [focusModId, setFocusModIdState] = useState<string | null>(
    () => initialLocal?.focusModId ?? initialPrefs.focusModId ?? null
  );
  const [dbUpdatedAt, setDbUpdatedAt] = useState<string>(
    initialLocal?.dbUpdatedAt ?? DATABASE_UPDATED_AT
  );
  const [lastSavedDate, setLastSavedDate] = useState<string>(
    initialLocal?.lastSavedDate ?? initialLocal?.dbUpdatedAt ?? DATABASE_UPDATED_AT
  );

  const hydratedRef = useRef(false);
  const userMutatedRef = useRef(false);

  const touchSavedDate = () => {
    userMutatedRef.current = true;
    setLastSavedDate(formatRuDate());
  };

  const setActiveTab = (next: PersistedTabKey) => {
    touchSavedDate();
    setActiveTabState(next);
  };

  const setCheckedModIds = (action: SetStateAction<string[]>) => {
    touchSavedDate();
    setCheckedModIdsState(action);
  };

  const setBuilderPrefs = (action: SetStateAction<AssemblyPreferences>) => {
    touchSavedDate();
    setBuilderPrefsState(action);
  };

  const setBuilderModIds = (action: SetStateAction<string[]>) => {
    touchSavedDate();
    setBuilderModIdsState(action);
  };

  const setFocusModId = (action: SetStateAction<string | null>) => {
    touchSavedDate();
    setFocusModIdState(action);
  };

  // Hydrate persisted Desktop state & hot DB date on startup
  useEffect(() => {
    let cancelled = false;
    const api = window.desktopAPI;
    if (!api) {
      hydratedRef.current = true;
      return;
    }

    (async () => {
      try {
        const [meta, rawDesktopState] = await Promise.all([
          api.getAppMeta?.().catch(() => null),
          api.loadAppState?.().catch(() => null),
        ]);
        if (cancelled) return;

        const hotUpdatedAt = meta?.hotManifest?.updatedAt;
        if (hotUpdatedAt && typeof hotUpdatedAt === 'string') {
          setDbUpdatedAt(hotUpdatedAt);
        }

        const parsed = parsePersistedState(rawDesktopState);
        if (parsed && !userMutatedRef.current) {
          if (parsed.activeTab) setActiveTabState(parsed.activeTab);
          if (parsed.checkedModIds) setCheckedModIdsState(parsed.checkedModIds);
          if (parsed.builderPrefs) setBuilderPrefsState(parsed.builderPrefs);
          if (parsed.builderModIds) setBuilderModIdsState(parsed.builderModIds);
          if (parsed.focusModId !== undefined) setFocusModIdState(parsed.focusModId);
          if (parsed.lastSavedDate) setLastSavedDate(parsed.lastSavedDate);
          if (parsed.dbUpdatedAt && !hotUpdatedAt) setDbUpdatedAt(parsed.dbUpdatedAt);
        }
      } finally {
        hydratedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist state & dates on every change
  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshot: PersistedAppState = {
      schemaVersion: 2,
      dbUpdatedAt,
      lastSavedDate,
      activeTab,
      checkedModIds,
      builderModIds,
      builderPrefs,
      focusModId,
    };
    saveLocalAppState(snapshot);
    void window.desktopAPI?.saveAppState?.(snapshot as unknown as Record<string, unknown>);
  }, [dbUpdatedAt, lastSavedDate, activeTab, checkedModIds, builderModIds, builderPrefs, focusModId]);

  const builderSet = useMemo(() => new Set(builderModIds), [builderModIds]);

  const toggleCheckerMod = (id: string) => {
    setCheckedModIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const loadPresetToChecker = (preset: ModPreset) => {
    setCheckedModIds([...preset.modIds]);
    setActiveTab('checker');
  };

  const loadPresetToBuilder = (preset: ModPreset) => {
    setBuilderModIds([...preset.modIds]);
    setActiveTab('assembler');
  };

  const navItems: Array<{ id: PersistedTabKey; label: string; count: number }> = [
    { id: 'catalog', label: 'Каталог', count: MODS_DATABASE.length },
    { id: 'assembler', label: 'Клипание сборок', count: builderModIds.length },
    { id: 'presets', label: 'Сборки', count: MOD_PRESETS.length },
    { id: 'checker', label: 'Чекер', count: checkedModIds.length },
  ];

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-100 flex flex-col">
      {/* Crisp 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0b1019]/95 backdrop-blur-md border-b border-[#263244]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          <a
            href="#top"
            onClick={e => {
              e.preventDefault();
              setActiveTab('catalog');
            }}
            className="text-sm font-bold tracking-tight text-slate-50 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            Mod Optimizer
          </a>

          <nav className="flex items-center gap-5 overflow-x-auto no-scrollbar" aria-label="Разделы">
            {navItems.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-4 border-b-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'border-sky-400 text-slate-50 font-semibold'
                      : 'border-transparent text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[11px] font-mono tabular-nums ${active ? 'text-sky-300' : 'text-slate-400'}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setActiveTab('checker')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold shrink-0 whitespace-nowrap transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Проверить сборку
          </button>
        </div>

        {/* Unboxed Persisted Status Metadata Strip */}
        <div className="border-t border-[#182233] bg-[#090d14]/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-7 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono tabular-nums">
              База модов: <strong className="text-slate-200 font-semibold">{dbUpdatedAt}</strong> · Сохранено:{' '}
              <strong className="text-sky-300 font-semibold">{lastSavedDate}</strong>
            </span>
            <span className="hidden sm:inline text-slate-400">
              Forge 1.20.1 · Nvidium &amp; Alloyium
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'catalog' && (
          <CatalogTab
            checkedModIds={checkedModIds}
            toggleCheckerMod={toggleCheckerMod}
            builderSet={builderSet}
            builderPrefs={builderPrefs}
            onOpenDetail={setSelectedModDetail}
          />
        )}

        {activeTab === 'assembler' && (
          <AssemblyBuilderTab
            selectedIds={builderModIds}
            setSelectedIds={setBuilderModIds}
            prefs={builderPrefs}
            setPrefs={setBuilderPrefs}
            focusModId={focusModId}
            setFocusModId={setFocusModId}
            onOpenDetail={setSelectedModDetail}
            onSendToChecker={ids => {
              setCheckedModIds(ids);
              setActiveTab('checker');
            }}
          />
        )}

        {activeTab === 'presets' && (
          <PresetsTab
            dbUpdatedAt={dbUpdatedAt}
            lastSavedDate={lastSavedDate}
            onLoadToChecker={loadPresetToChecker}
            onLoadToBuilder={loadPresetToBuilder}
            onOpenDetail={setSelectedModDetail}
          />
        )}

        {activeTab === 'checker' && (
          <CheckerTab
            checkedModIds={checkedModIds}
            setCheckedModIds={setCheckedModIds}
            onOpenDetail={setSelectedModDetail}
          />
        )}
      </main>

      <ModDetailModal
        mod={selectedModDetail}
        onClose={() => setSelectedModDetail(null)}
        onSelectMod={setSelectedModDetail}
        checkedModIds={checkedModIds}
        onToggleCheckMod={toggleCheckerMod}
        activeModIds={builderModIds}
        builderPrefs={builderPrefs}
        anchorModId={focusModId}
        onAnchorForBuilder={mod => {
          const nextPrefs: AssemblyPreferences = { ...builderPrefs, focusModId: mod.id };
          setFocusModId(mod.id);
          setBuilderPrefs(nextPrefs);
          setBuilderModIds(buildSmartAssembly(nextPrefs).modIds);
          setSelectedModDetail(null);
          setActiveTab('assembler');
        }}
        onChooseVariantInBuilder={mod => {
          const alreadySelected = builderModIds.includes(mod.id);
          if (!alreadySelected) {
            const res = toggleModSmart(builderModIds, mod.id, { strict: true, prefs: builderPrefs });
            setBuilderModIds(res.nextIds);
          }
          setSelectedModDetail(null);
          setActiveTab('assembler');
        }}
      />
    </div>
  );
}
