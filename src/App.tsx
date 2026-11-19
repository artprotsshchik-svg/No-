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
import {
  BookOpen,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';

const DEFAULT_CHECKED_MOD_IDS: string[] = [
  'embeddium',
  'sodium-chloride',
  'alloyium',
  'immediatelyfast',
  'entity-culling',
  'more-culling-reforged',
  'enhanced-block-entities-reloaded',
  'matlib',
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

const TAB_TITLES: Record<PersistedTabKey, string> = {
  catalog: 'Каталог',
  assembler: 'Клипание сборок',
  presets: 'Сборки',
  checker: 'Чекер',
};

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
      focusModId: null,
    };
    saveLocalAppState(snapshot);
    void window.desktopAPI?.saveAppState?.(snapshot as unknown as Record<string, unknown>);
  }, [dbUpdatedAt, lastSavedDate, activeTab, checkedModIds, builderModIds, builderPrefs]);

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

  const navItems: Array<{
    id: PersistedTabKey;
    label: string;
    count: number;
    icon: typeof BookOpen;
  }> = [
    { id: 'catalog', label: 'Каталог', count: MODS_DATABASE.length, icon: BookOpen },
    { id: 'assembler', label: 'Клипание сборок', count: builderModIds.length, icon: SlidersHorizontal },
    { id: 'presets', label: 'Сборки', count: MOD_PRESETS.length, icon: Layers },
    { id: 'checker', label: 'Чекер', count: checkedModIds.length, icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col lg:flex-row">
      {/* Left Navigation Rail (Desktop) */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-[#0d1017] border-r border-[#1f2534]">
        <div className="px-4 h-13 flex items-center gap-2.5 border-b border-[#191f2d]">
          <div className="w-7 h-7 rounded-lg bg-sky-500/12 border border-sky-500/35 flex items-center justify-center shrink-0">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <a
            href="#top"
            onClick={e => {
              e.preventDefault();
              setActiveTab('catalog');
            }}
            className="text-sm font-bold tracking-tight text-white hover:text-sky-300 transition-colors whitespace-nowrap"
          >
            Mod Optimizer
          </a>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Разделы">
          {navItems.map(item => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-[#161c29] text-white font-semibold border border-[#2a3347]'
                    : 'bg-transparent text-slate-300 hover:bg-[#131823] hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span
                  className={`text-[11px] font-mono tabular-nums shrink-0 ${
                    active ? 'text-sky-300' : 'text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[#191f2d] text-[11px] font-mono tabular-nums text-slate-400 flex items-center justify-between">
          <span>Forge 1.20.1</span>
          <span className="text-slate-300">{dbUpdatedAt}</span>
        </div>
      </aside>

      {/* Right Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Header */}
        <header className="sticky top-0 z-30 bg-[#0d1017]/95 backdrop-blur-md border-b border-[#1f2534]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href="#top"
                onClick={e => {
                  e.preventDefault();
                  setActiveTab('catalog');
                }}
                className="lg:hidden inline-flex items-center gap-2 text-sm font-bold tracking-tight text-white hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
              >
                <span className="w-6 h-6 rounded-md bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shrink-0">
                  <Terminal className="w-3 h-3 text-sky-400" />
                </span>
                Mod Optimizer
              </a>
              <h1 className="hidden lg:block text-sm font-semibold tracking-tight text-white whitespace-nowrap">
                {TAB_TITLES[activeTab]}
              </h1>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
              <span className="hidden sm:inline">Forge 1.20.1</span>
              <span className="hidden sm:inline text-slate-600">·</span>
              <span>
                База: <strong className="text-slate-200 font-semibold">{dbUpdatedAt}</strong>
              </span>
            </div>
          </div>

          {/* Mobile Nav */}
          <nav
            className="flex lg:hidden items-center gap-4 px-4 sm:px-6 border-t border-[#191f2d] overflow-x-auto no-scrollbar"
            aria-label="Разделы"
          >
            {navItems.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2.5 border-b-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'border-sky-400 text-white font-semibold'
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
        </header>

        {/* Main Content Viewport */}
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
      </div>

      <ModDetailModal
        mod={selectedModDetail}
        onClose={() => setSelectedModDetail(null)}
        onSelectMod={setSelectedModDetail}
        checkedModIds={checkedModIds}
        onToggleCheckMod={toggleCheckerMod}
        activeModIds={activeTab === 'checker' ? checkedModIds : builderModIds}
        contextSourceLabel={activeTab === 'checker' ? 'Чекер' : 'Клипание сборок'}
        builderPrefs={builderPrefs}
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
