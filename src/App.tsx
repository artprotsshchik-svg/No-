import { useState, useMemo, useEffect } from 'react';
import {
  DATABASE_UPDATED_AT,
  MODS_DATABASE,
  MOD_GROUPS,
  GOLDEN_STANDARD_MODS,
  MOD_PRESETS,
  type ModItem,
  type ModPreset,
  type PresetCategory,
} from './data/modsData.ts';
import {
  buildSmartAssembly,
  evaluateAssemblyHealth,
  findModByDisplayName,
  formatAssemblyTreeText,
  getBaseHealthTier,
  getModEffectivenessScore,
  getModRestrictionBadge,
  getModSuperseder,
  getModUpdatedLabel,
  getGroupMembersByRole,
  generateReportText,
  isModIncompatibleWithSelection,
  isUnsupportedOnForge,
  organizeAssemblyTree,
  toggleModSmart,
  INITIAL_BUILDER_PREFS,
  type AssemblyPreferences,
  type CheckerTier,
} from './utils/modLogic.ts';
import { ModDetailModal } from './components/ModDetailModal.tsx';
import { CheckerTab } from './components/CheckerTab.tsx';
import { AssemblyBuilderTab } from './components/AssemblyBuilderTab.tsx';
import {
  Search,
  ExternalLink,
  Download,
  Copy,
  Check,
  Layers,
  List,
  Grid,
  Table,
  Plus,
  Wrench,
  FileText,
  BookmarkCheck,
  PackageCheck,
  EyeOff,
  Eye,
  ArrowRight,
  Award,
} from 'lucide-react';

type TabKey = 'catalog' | 'assembler' | 'presets' | 'checker' | 'golden' | 'file';
type CatalogView = 'cards' | 'list' | 'table';
type HealthFilter = 'all' | CheckerTier;
type CatalogSort = 'leaders-first' | 'best-first' | 'name-asc';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [onlyLeaders, setOnlyLeaders] = useState(true);
  const [hideUselessCovered, setHideUselessCovered] = useState(true);
  const [onlyCompatibleInCatalog, setOnlyCompatibleInCatalog] = useState(false);
  const [catalogView, setCatalogView] = useState<CatalogView>('cards');
  const [sortBy, setSortBy] = useState<CatalogSort>('leaders-first');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<'all' | PresetCategory>('all');
  const [selectedModDetail, setSelectedModDetail] = useState<ModItem | null>(null);

  const [checkedModIds, setCheckedModIds] = useState<string[]>([
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
  ]);

  const [builderPrefs, setBuilderPrefs] = useState<AssemblyPreferences>(INITIAL_BUILDER_PREFS);
  const [builderModIds, setBuilderModIds] = useState<string[]>(
    () => buildSmartAssembly(INITIAL_BUILDER_PREFS).modIds
  );
  const [focusModId, setFocusModId] = useState<string | null>(null);

  const [fileSearch, setFileSearch] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);

  const [itemsPerPage, setItemsPerPage] = useState<number>(36);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, healthFilter, onlyLeaders, hideUselessCovered, onlyCompatibleInCatalog, sortBy]);

  const modById = useMemo(() => {
    const map = new Map<string, ModItem>();
    MODS_DATABASE.forEach(m => map.set(m.id, m));
    return map;
  }, []);

  const groupMetaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getGroupMembersByRole>>();
    MOD_GROUPS.forEach(g => {
      map.set(g.id, getGroupMembersByRole(g.id));
    });
    return map;
  }, []);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    MODS_DATABASE.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return ['Все', ...Object.keys(counts)];
  }, []);

  const builderSet = useMemo(() => new Set(builderModIds), [builderModIds]);

  const filteredMods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = MODS_DATABASE.filter(mod => {
      if (selectedCategory !== 'Все' && mod.category !== selectedCategory) return false;

      const modHealth = getBaseHealthTier(mod);
      if (healthFilter !== 'all' && modHealth !== healthFilter) return false;

      if (onlyCompatibleInCatalog && isModIncompatibleWithSelection(mod, builderSet, builderPrefs)) {
        return false;
      }

      if (!q) {
        if (
          hideUselessCovered &&
          (mod.coveredBy ||
            mod.status === 'danger' ||
            isUnsupportedOnForge(mod) ||
            getModSuperseder(mod, builderSet, builderPrefs, true) !== null)
        ) {
          return false;
        }
        if (onlyLeaders) {
          if (mod.groupId && !mod.isGroupLeader) return false;
        }
      } else {
        const matches =
          mod.name.toLowerCase().includes(q) ||
          mod.description.toLowerCase().includes(q) ||
          (mod.bestAlternative && mod.bestAlternative.toLowerCase().includes(q)) ||
          mod.category.toLowerCase().includes(q) ||
          mod.platform.toLowerCase().includes(q) ||
          (mod.tags && mod.tags.some(t => t.toLowerCase().includes(q)));
        if (!matches) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'ru');
      if (sortBy === 'leaders-first') {
        const lA = a.isGroupLeader ? 1 : 0;
        const lB = b.isGroupLeader ? 1 : 0;
        if (lB !== lA) return lB - lA;
      }
      return getModEffectivenessScore(b) - getModEffectivenessScore(a);
    });
  }, [searchQuery, selectedCategory, healthFilter, onlyLeaders, hideUselessCovered, onlyCompatibleInCatalog, builderSet, builderPrefs, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredMods.length / itemsPerPage));
  const paginatedMods = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMods.slice(start, start + itemsPerPage);
  }, [filteredMods, currentPage, itemsPerPage]);

  const reportText = useMemo(() => generateReportText(), []);
  const filteredReportLines = useMemo(() => {
    const lines = reportText.split('\n');
    const q = fileSearch.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter(l => l.toLowerCase().includes(q));
  }, [reportText, fileSearch]);

  const handleDownloadIlya = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ilya.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 1800);
  };

  const handleCopyPresetTree = (preset: ModPreset) => {
    const header = `# ${preset.name} (актуализировано: ${DATABASE_UPDATED_AT})`;
    navigator.clipboard.writeText(`${header}\n${formatAssemblyTreeText(preset.modIds, true)}`);
    setCopiedPresetId(preset.id);
    setTimeout(() => setCopiedPresetId(prev => (prev === preset.id ? null : prev)), 1800);
  };

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

  const navItems: Array<{ id: TabKey; label: string; count?: number }> = [
    { id: 'catalog', label: 'Каталог', count: filteredMods.length },
    { id: 'assembler', label: 'Клипание сборок', count: builderModIds.length },
    { id: 'presets', label: 'Сборки', count: MOD_PRESETS.length },
    { id: 'checker', label: 'Чекер', count: checkedModIds.length },
    { id: 'golden', label: 'Золотой стандарт', count: GOLDEN_STANDARD_MODS.length },
    { id: 'file', label: 'ilya.txt' },
  ];

  const getHealthBadge = (mod: ModItem) => {
    const tier = getBaseHealthTier(mod);
    if (tier === 'red') {
      return {
        cls: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
        textCls: 'text-rose-400',
        text: mod.statusLabel,
      };
    }
    if (tier === 'green') {
      return {
        cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
        textCls: 'text-emerald-400',
        text: mod.statusLabel,
      };
    }
    if (tier === 'lime') {
      return {
        cls: 'bg-lime-500/10 text-lime-300 border-lime-500/25',
        textCls: 'text-lime-400',
        text: mod.statusLabel,
      };
    }
    return {
      cls: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
      textCls: 'text-amber-400',
      text: mod.statusLabel,
    };
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-zinc-100 flex flex-col">
      {/* Crisp 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0a0b0d]/95 backdrop-blur-md border-b border-[#1d2027]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="#top"
              onClick={e => {
                e.preventDefault();
                setActiveTab('catalog');
              }}
              className="text-sm font-bold tracking-tight text-zinc-100 whitespace-nowrap"
            >
              Mod Optimizer
            </a>
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded bg-[#15181e] border border-[#232832] text-[10px] font-mono text-zinc-400 tabular-nums whitespace-nowrap">
              База: {DATABASE_UPDATED_AT}
            </span>
          </div>

          <nav className="flex items-center gap-5 overflow-x-auto no-scrollbar">
            {navItems.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`py-4 border-b-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'border-zinc-100 text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className={`text-[11px] font-mono tabular-nums ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            onClick={handleDownloadIlya}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shrink-0 whitespace-nowrap transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            ilya.txt
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Compact Filter Bar */}
            <div className="bg-[#111317] border border-[#20242b] rounded-lg p-3.5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию, описанию или аналогу (Alloyium, Nvidium)..."
                    className="w-full pl-9 pr-3 py-2 bg-[#0c0d10] border border-[#20242b] rounded-md text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0d10] border border-[#20242b] rounded-md text-xs text-zinc-200 focus:outline-none focus:border-sky-400"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>
                        {c === 'Все' ? 'Все категории' : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={healthFilter}
                    onChange={e => setHealthFilter(e.target.value as HealthFilter)}
                    className="w-full px-3 py-2 bg-[#0c0d10] border border-[#20242b] rounded-md text-xs text-zinc-200 focus:outline-none focus:border-sky-400"
                  >
                    <option value="all">Любой статус</option>
                    <option value="green">Стабильно (зелёный)</option>
                    <option value="lime">Сносно (салатовый)</option>
                    <option value="yellow">Условно (жёлтый)</option>
                    <option value="red">Опасно (красный)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as CatalogSort)}
                    className="w-full px-3 py-2 bg-[#0c0d10] border border-[#20242b] rounded-md text-xs text-zinc-200 focus:outline-none focus:border-sky-400"
                  >
                    <option value="leaders-first">Сначала лидеры</option>
                    <option value="best-first">По эффективности</option>
                    <option value="name-asc">По алфавиту</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#1e222a]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setOnlyLeaders(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                      onlyLeaders
                        ? 'bg-[#1a1e25] border-[#2e343f] text-zinc-100'
                        : 'bg-[#0c0d10] border-[#1e222a] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Award className={`w-3.5 h-3.5 ${onlyLeaders ? 'text-sky-400' : 'text-zinc-500'}`} />
                    Только лидеры групп
                  </button>

                  <button
                    onClick={() => setHideUselessCovered(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                      hideUselessCovered
                        ? 'bg-[#1a1e25] border-[#2e343f] text-emerald-300'
                        : 'bg-[#0c0d10] border-[#1e222a] text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Скрывать плацебо, нерабочие на Forge, встроенные и 100% перекрытые более лучшими модами"
                  >
                    {hideUselessCovered ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    Скрыть лишние и перекрытые
                  </button>

                  <button
                    onClick={() => setOnlyCompatibleInCatalog(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                      onlyCompatibleInCatalog
                        ? 'bg-sky-500/10 border-sky-400/40 text-sky-200'
                        : 'bg-[#0c0d10] border-[#1e222a] text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Показывать только моды, совместимые с текущей активной сборкой и выбранным просмотрщиком рецептов (JEI / EMI)"
                  >
                    {onlyCompatibleInCatalog ? <EyeOff className="w-3.5 h-3.5 text-sky-400" /> : <Eye className="w-3.5 h-3.5" />}
                    Совм. со сборкой
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 tabular-nums">
                    Показано: <strong className="text-zinc-100">{filteredMods.length}</strong>
                  </span>
                  <div className="flex items-center bg-[#0c0d10] border border-[#1e222a] rounded-md p-0.5">
                    {[
                      { k: 'cards', icon: Grid, title: 'Карточки' },
                      { k: 'list', icon: List, title: 'Список' },
                      { k: 'table', icon: Table, title: 'Таблица' },
                    ].map(v => {
                      const Icon = v.icon;
                      return (
                        <button
                          key={v.k}
                          onClick={() => setCatalogView(v.k as CatalogView)}
                          className={`p-1.5 rounded transition-colors ${
                            catalogView === v.k ? 'bg-[#232832] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title={v.title}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog Display */}
            {catalogView === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {paginatedMods.map(mod => {
                  const badge = getHealthBadge(mod);
                  const grp = mod.groupId ? groupMetaMap.get(mod.groupId) : null;
                  const addons = mod.isGroupLeader && grp ? grp.addons : [];
                  const removedCount = mod.isGroupLeader && grp ? grp.removedAnalogs.length : 0;
                  const isInChecker = checkedModIds.includes(mod.id);

                  return (
                    <div
                      key={mod.id}
                      onClick={() => setSelectedModDetail(mod)}
                      className="bg-[#111317] border border-[#20242b] hover:border-[#323844] rounded-lg p-4 cursor-pointer transition-colors flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-zinc-100 truncate">{mod.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500 min-w-0">
                              <span className="truncate">{mod.groupTitle || mod.category} · {mod.platform}</span>
                              {(() => {
                                const updated = getModUpdatedLabel(mod);
                                return updated ? (
                                  <span className="shrink-0 font-mono text-zinc-400">· обн. {updated}</span>
                                ) : null;
                              })()}
                            </div>
                          </div>

                          <a
                            href={mod.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b21] hover:bg-[#f16436] border border-[#252a33] hover:border-[#f16436] text-zinc-300 hover:text-white text-[11px] font-medium transition-colors"
                            title="Открыть на CurseForge"
                          >
                            CF
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                          {mod.description}
                        </p>

                        {addons.length > 0 && (
                          <div className="pt-1 space-y-1">
                            <div className="text-[11px] font-medium text-zinc-400">
                              Аддоны ({addons.length}):
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {addons.slice(0, 5).map(ad => (
                                <button
                                  key={ad.id}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedModDetail(ad);
                                  }}
                                  className="px-2 py-0.5 rounded bg-[#161920] hover:bg-[#1f242e] border border-[#262b35] text-[11px] text-sky-300 transition-colors"
                                >
                                  {ad.name}
                                </button>
                              ))}
                              {addons.length > 5 && (
                                <span className="text-[11px] text-zinc-500 px-1">+{addons.length - 5}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-[#1c1f26] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-400 truncate">
                          {(() => {
                            const restriction = getModRestrictionBadge(mod, builderSet, builderPrefs);
                            if (restriction && (restriction.tone === 'red' || restriction.tone === 'amber')) {
                              return (
                                <span
                                  className={`font-medium ${
                                    restriction.tone === 'red' ? 'text-rose-400' : 'text-amber-300'
                                  }`}
                                >
                                  {restriction.text}
                                </span>
                              );
                            }
                            if (removedCount > 0) {
                              return (
                                <span className="inline-flex items-center gap-1 text-zinc-300">
                                  <Layers className="w-3 h-3 text-amber-400 shrink-0" />
                                  +{removedCount} аналогов внутри
                                </span>
                              );
                            }
                            if (mod.coveredBy) {
                              return (
                                <span className="inline-flex items-center gap-1 text-zinc-400">
                                  <PackageCheck className="w-3 h-3 shrink-0" />
                                  Встроено в {mod.coveredBy}
                                </span>
                              );
                            }
                            if (restriction?.tone === 'sky') {
                              return <span className="font-medium text-sky-300">{restriction.text}</span>;
                            }
                            return (
                              <span className={`font-medium ${badge.textCls}`}>
                                {badge.text}
                              </span>
                            );
                          })()}
                        </span>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleCheckerMod(mod.id);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                            isInChecker
                              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                              : 'bg-[#181b21] border-[#252a33] text-zinc-300 hover:bg-[#22262e]'
                          }`}
                        >
                          {isInChecker ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {isInChecker ? 'В Чекере' : 'В Чекер'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {catalogView === 'list' && (
              <div className="bg-[#111317] border border-[#20242b] rounded-lg divide-y divide-[#1b1f26] overflow-hidden">
                {paginatedMods.map(mod => {
                  const badge = getHealthBadge(mod);
                  const grp = mod.groupId ? groupMetaMap.get(mod.groupId) : null;
                  const removedCount = mod.isGroupLeader && grp ? grp.removedAnalogs.length : 0;
                  const addonsCount = mod.isGroupLeader && grp ? grp.addons.length : 0;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => setSelectedModDetail(mod)}
                      className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-zinc-100">{mod.name}</span>
                          <span className={`text-[11px] font-medium ${badge.textCls}`}>{badge.text}</span>
                          <span className="text-[11px] text-zinc-500">{mod.platform}</span>
                          {(() => {
                            const updated = getModUpdatedLabel(mod);
                            return updated ? <span className="text-[11px] text-zinc-500">· обн. {updated}</span> : null;
                          })()}
                          {addonsCount > 0 && (
                            <span className="text-[11px] text-sky-300">+{addonsCount} аддонов</span>
                          )}
                          {removedCount > 0 && (
                            <span className="text-[11px] text-zinc-400">· {removedCount} аналогов внутри</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{mod.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={mod.curseforgeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#181b21] hover:bg-[#f16436] border border-[#252a33] hover:border-[#f16436] text-zinc-200 hover:text-white text-xs transition-colors"
                        >
                          CurseForge
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {catalogView === 'table' && (
              <div className="bg-[#111317] border border-[#20242b] rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#20242b] text-zinc-400 bg-[#0d0f13]">
                      <th className="py-2.5 px-4 font-medium">Мод</th>
                      <th className="py-2.5 px-4 font-medium">Группа / Категория</th>
                      <th className="py-2.5 px-4 font-medium">Статус</th>
                      <th className="py-2.5 px-4 font-medium">Аддоны / Аналоги</th>
                      <th className="py-2.5 px-4 font-medium text-right">CurseForge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1f26]">
                    {paginatedMods.map(mod => {
                      const badge = getHealthBadge(mod);
                      const grp = mod.groupId ? groupMetaMap.get(mod.groupId) : null;
                      return (
                        <tr
                          key={mod.id}
                          onClick={() => setSelectedModDetail(mod)}
                          className="hover:bg-white/[0.02] cursor-pointer"
                        >
                          <td className="py-2.5 px-4 font-semibold text-zinc-100">{mod.name}</td>
                          <td className="py-2.5 px-4 text-zinc-400">{mod.groupTitle || mod.category}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${badge.cls}`}>
                              {badge.text}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300 tabular-nums">
                            {mod.isGroupLeader && grp
                              ? `${grp.addons.length} аддонов / ${grp.removedAnalogs.length} скрыто`
                              : mod.coveredBy
                                ? `Встроено в ${mod.coveredBy}`
                                : mod.platform}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <a
                              href={mod.curseforgeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[#f16436] hover:underline"
                            >
                              Открыть <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>На странице:</span>
                  {[24, 36, 72, 500].map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        setItemsPerPage(n);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1 rounded tabular-nums ${
                        itemsPerPage === n ? 'bg-[#1f232b] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {n === 500 ? 'Все' : n}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-md bg-[#111317] border border-[#20242b] text-zinc-300 disabled:opacity-40"
                  >
                    Назад
                  </button>
                  <span className="px-2 text-zinc-400 tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-md bg-[#111317] border border-[#20242b] text-zinc-300 disabled:opacity-40"
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <div className="space-y-4">
            <div className="bg-[#111317] border border-[#20242b] rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                    Готовые оптимизированные сборки ({MOD_PRESETS.length})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Сгруппировано по структуре «Мод → Аддоны и зависимости к нему». Линейка Nvidium, нативный Alloyium, шейдеры и серверные пресеты.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#0c0d10] border border-[#1e222a] text-[11px] font-mono text-zinc-400 tabular-nums whitespace-nowrap">
                  Актуализировано: {DATABASE_UPDATED_AT}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#1e222a]">
                {[
                  { k: 'all', label: `Все (${MOD_PRESETS.length})` },
                  { k: 'nvidium', label: 'Nvidium / NVIDIA' },
                  { k: 'max', label: 'Макс. FPS / GPU' },
                  { k: 'shaders', label: 'Шейдеры' },
                  { k: 'server', label: 'Сервер' },
                  { k: 'potato', label: 'Слабый ПК' },
                  { k: 'demo', label: 'Тест краша' },
                ].map(cat => (
                  <button
                    key={cat.k}
                    onClick={() => setPresetCategoryFilter(cat.k as 'all' | PresetCategory)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      presetCategoryFilter === cat.k
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'bg-[#0c0d10] text-zinc-400 hover:text-zinc-200 border border-[#1e222a]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {MOD_PRESETS.filter(
                p => presetCategoryFilter === 'all' || p.category === presetCategoryFilter
              ).map(preset => {
                const treeNodes = organizeAssemblyTree(preset.modIds);
                const parentWithAddons = treeNodes.filter(n => n.children.length > 0);
                const standaloneRoots = treeNodes.filter(n => n.children.length === 0);
                const badgeCls =
                  preset.badgeColor === 'emerald'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                    : preset.badgeColor === 'violet'
                      ? 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                      : preset.badgeColor === 'sky'
                        ? 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                        : preset.badgeColor === 'amber'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/25';

                const presetHealth = evaluateAssemblyHealth(preset.modIds);
                const presetRedCount =
                  presetHealth.conflicts.length +
                  presetHealth.warnings.filter(w => w.severity === 'red').length;
                const presetYellowCount = presetHealth.warnings.filter(w => w.severity === 'yellow').length;

                return (
                  <div
                    key={preset.id}
                    className="bg-[#111317] border border-[#20242b] rounded-lg p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-zinc-100">{preset.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badgeCls}`}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{preset.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                        <span>
                          <strong className="text-zinc-200">Риск конфликтов:</strong> {preset.crashRisk}
                        </span>
                        <span
                          className={`font-medium tabular-nums ${
                            presetRedCount > 0
                              ? 'text-rose-400'
                              : presetYellowCount > 0
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                          }`}
                        >
                          · Проверка: {presetRedCount} конфл. / {presetYellowCount} замеч. ({preset.modIds.length} модов)
                        </span>
                      </div>

                      {/* Structured Parent Mod -> Addons Tree */}
                      <div className="space-y-2 pt-1">
                        {parentWithAddons.map((node, idx) => {
                          const pUpdated = getModUpdatedLabel(node.parent);
                          return (
                            <div
                              key={node.parent.id}
                              className="rounded-md bg-[#0c0d10] border border-[#1e222a] p-2.5 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                                    {idx + 1}.
                                  </span>
                                  <button
                                    onClick={() => setSelectedModDetail(node.parent)}
                                    className="text-xs font-semibold text-zinc-100 hover:text-sky-300 text-left transition-colors"
                                  >
                                    {node.parent.name}
                                  </button>
                                  {pUpdated && (
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      обн. {pUpdated}
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={node.parent.curseforgeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#15181e] hover:bg-[#f16436] text-zinc-400 hover:text-white text-[10px] transition-colors"
                                  title="CurseForge"
                                >
                                  CF
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>

                              <div className="pl-3.5 border-l-2 border-sky-500/35 space-y-1">
                                <div className="text-[10px] font-medium text-zinc-500">
                                  Аддоны и зависимости к нему ({node.children.length}):
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {node.children.map(({ mod: ch, relationLabel }) => {
                                    const cUpdated = getModUpdatedLabel(ch);
                                    return (
                                      <div
                                        key={ch.id}
                                        className="inline-flex items-center rounded bg-[#14171d] border border-[#242a34] overflow-hidden text-[11px]"
                                      >
                                        <button
                                          onClick={() => setSelectedModDetail(ch)}
                                          className="px-2 py-1 text-zinc-200 hover:bg-[#1c2028] transition-colors flex items-center gap-1.5"
                                        >
                                          <span>{ch.name}</span>
                                          <span className="text-[10px] text-sky-400/90">
                                            · {relationLabel}
                                          </span>
                                          {cUpdated && (
                                            <span className="text-[10px] text-zinc-500 font-mono">
                                              ({cUpdated})
                                            </span>
                                          )}
                                        </button>
                                        <a
                                          href={ch.curseforgeUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-1.5 py-1 text-zinc-500 hover:text-[#f16436] hover:bg-[#1c2028] border-l border-[#242a34] transition-colors"
                                          title="CurseForge"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {standaloneRoots.length > 0 && (
                          <div className="rounded-md bg-[#0c0d10] border border-[#1e222a] p-2.5 space-y-1.5">
                            <div className="text-[10px] font-medium text-zinc-500">
                              Самостоятельные моды сборки ({standaloneRoots.length}):
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {standaloneRoots.map(({ parent: m }, sIdx) => {
                                const mUpdated = getModUpdatedLabel(m);
                                const num = parentWithAddons.length + sIdx + 1;
                                return (
                                  <div
                                    key={m.id}
                                    className="inline-flex items-center rounded bg-[#14171d] border border-[#222730] overflow-hidden text-[11px]"
                                  >
                                    <button
                                      onClick={() => setSelectedModDetail(m)}
                                      className="px-2 py-1 text-zinc-200 hover:bg-[#1c2028] transition-colors flex items-center gap-1"
                                    >
                                      <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                                        {num}.
                                      </span>
                                      <span>{m.name}</span>
                                      {mUpdated && (
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                          ({mUpdated})
                                        </span>
                                      )}
                                    </button>
                                    <a
                                      href={m.curseforgeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-1.5 py-1 text-zinc-500 hover:text-[#f16436] hover:bg-[#1c2028] border-l border-[#222730] transition-colors"
                                      title="CurseForge"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#1c1f26] flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => loadPresetToChecker(preset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        Проверить в Чекере
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => loadPresetToBuilder(preset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181b21] hover:bg-[#22262e] border border-[#282d37] text-zinc-200 text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Редактировать в Клипании
                      </button>
                      <button
                        onClick={() => handleCopyPresetTree(preset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181b21] hover:bg-[#22262e] border border-[#282d37] text-zinc-300 text-xs font-medium transition-colors whitespace-nowrap ml-auto"
                      >
                        {copiedPresetId === preset.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Скопировано
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Копировать дерево
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'checker' && (
          <CheckerTab
            checkedModIds={checkedModIds}
            setCheckedModIds={setCheckedModIds}
            onOpenDetail={setSelectedModDetail}
          />
        )}

        {activeTab === 'golden' && (
          <div className="space-y-4">
            <div className="bg-[#111317] border border-[#20242b] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 tracking-tight">
                  <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  Золотой стандарт Forge 1.20+ (Мод → Аддоны)
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Актуализировано: {DATABASE_UPDATED_AT}. Базовый список лидеров, сгруппированный с аддонами и зависимостями.
                </p>
              </div>
              <button
                onClick={() => {
                  const preset = MOD_PRESETS.find(p => p.id === 'golden');
                  if (preset) loadPresetToChecker(preset);
                }}
                className="px-3.5 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Открыть в Чекере
              </button>
            </div>

            {(() => {
              const roleById = new Map<string, string>();
              const goldenIds: string[] = [];
              GOLDEN_STANDARD_MODS.forEach(g => {
                const matched = findModByDisplayName(g.name);
                if (matched) {
                  goldenIds.push(matched.id);
                  roleById.set(matched.id, g.role);
                }
              });
              const goldenTree = organizeAssemblyTree(goldenIds);
              return (
                <div className="bg-[#111317] border border-[#20242b] rounded-lg divide-y divide-[#1b1f26] overflow-hidden">
                  {goldenTree.map((node, idx) => {
                    const pUpdated = getModUpdatedLabel(node.parent);
                    return (
                      <div key={node.parent.id}>
                        <div
                          onClick={() => setSelectedModDetail(node.parent)}
                          className="px-4 py-3 hover:bg-white/[0.02] cursor-pointer flex items-center justify-between gap-4 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-mono text-zinc-500 w-6 tabular-nums">{idx + 1}.</span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-sm font-semibold text-zinc-100">{node.parent.name}</span>
                                {pUpdated && (
                                  <span className="text-[11px] font-mono text-zinc-500">обн. {pUpdated}</span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 truncate">
                                {roleById.get(node.parent.id) || node.parent.statusLabel}
                              </div>
                            </div>
                          </div>
                          <a
                            href={node.parent.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#181b21] hover:bg-[#f16436] border border-[#252a33] hover:border-[#f16436] text-zinc-200 hover:text-white text-xs transition-colors"
                          >
                            CurseForge
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {node.children.map(ch => {
                          const cUpdated = getModUpdatedLabel(ch.mod);
                          return (
                            <div
                              key={ch.mod.id}
                              onClick={() => setSelectedModDetail(ch.mod)}
                              className="pl-11 pr-4 py-2.5 bg-[#0c0d10]/80 border-t border-[#181c22] border-l-2 border-l-sky-500/35 hover:bg-white/[0.02] cursor-pointer flex items-center justify-between gap-4 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xs font-mono text-sky-400/80 shrink-0">↳</span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    <span className="text-xs font-semibold text-zinc-200">{ch.mod.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/25 text-sky-300">
                                      {ch.relationLabel}
                                    </span>
                                    {cUpdated && (
                                      <span className="text-[10px] font-mono text-zinc-500">обн. {cUpdated}</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-400 truncate">
                                    {roleById.get(ch.mod.id) || ch.mod.statusLabel}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={ch.mod.curseforgeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b21] hover:bg-[#f16436] border border-[#252a33] hover:border-[#f16436] text-zinc-300 hover:text-white text-[11px] transition-colors"
                              >
                                CF
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'file' && (
          <div className="space-y-3">
            <div className="bg-[#111317] border border-[#20242b] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold text-zinc-100">Полный отчёт ilya.txt</span>
                <span className="text-xs text-zinc-500 tabular-nums">({filteredReportLines.length} строк)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={fileSearch}
                  onChange={e => setFileSearch(e.target.value)}
                  placeholder="Поиск в файле..."
                  className="px-3 py-1.5 bg-[#0c0d10] border border-[#20242b] rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  onClick={handleCopyReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181b21] hover:bg-[#22262e] border border-[#282d37] text-xs text-zinc-200 whitespace-nowrap"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedReport ? 'Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={handleDownloadIlya}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-xs text-zinc-950 font-semibold whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Скачать
                </button>
              </div>
            </div>

            <pre className="bg-[#0c0d10] border border-[#20242b] rounded-lg p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[72vh] overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {filteredReportLines.join('\n')}
            </pre>
          </div>
        )}
      </main>

      {/* Mod Detail Modal */}
      <ModDetailModal
        mod={selectedModDetail}
        onClose={() => setSelectedModDetail(null)}
        onSelectMod={setSelectedModDetail}
        checkedModIds={checkedModIds}
        onToggleCheckMod={toggleCheckerMod}
        activeModIds={activeTab === 'checker' ? checkedModIds : builderModIds}
        builderPrefs={activeTab === 'checker' ? undefined : builderPrefs}
        anchorModId={focusModId}
        onAnchorForBuilder={mod => {
          let nextViewer = builderPrefs.recipeViewer ?? 'jei';
          if (mod.id === 'tmrv-updated' || mod.id === 'emi' || mod.recipeEcosystem === 'emi-only') {
            nextViewer = mod.id === 'tmrv-updated' || nextViewer === 'none' || nextViewer === 'jei' ? 'emi' : nextViewer;
          } else if (mod.id === 'just-enough-items-jei' || mod.recipeEcosystem === 'jei-engine') {
            nextViewer = nextViewer === 'emi-jei' ? 'emi-jei' : 'jei';
          } else if (mod.recipeEcosystem === 'jei-plugin' && nextViewer === 'none') {
            nextViewer = 'jei';
          }
          const nextPrefs: AssemblyPreferences = {
            ...builderPrefs,
            recipeViewer: nextViewer,
            focusModId: mod.id,
          };
          setFocusModId(mod.id);
          setBuilderPrefs(nextPrefs);
          setBuilderModIds(buildSmartAssembly(nextPrefs).modIds);
          setSelectedModDetail(null);
          setActiveTab('assembler');
        }}
        onChooseVariantInBuilder={mod => {
          setBuilderModIds(prev =>
            prev.includes(mod.id)
              ? prev
              : toggleModSmart(prev, mod.id, { strict: true, prefs: builderPrefs }).nextIds
          );
          setFocusModId(mod.id);
          setSelectedModDetail(null);
          setActiveTab('assembler');
        }}
      />
    </div>
  );
}
