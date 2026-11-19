import { useMemo, useState } from 'react';
import {
  MODS_DATABASE,
  MOD_GROUPS,
  type ModItem,
} from '../data/modsData.ts';
import {
  EXCLUSIVE_ENGINE_POOLS,
  INITIAL_BUILDER_PREFS,
  evaluateAssemblyHealth,
  evaluateModImpactInPack,
  getCheckerTier,
  getModEffectivenessScore,
  getModResourceProfile,
  getModRestrictionBadge,
  getModSuperseder,
  isModIncompatibleWithSelection,
  isUnsupportedOnForge,
  organizeAssemblyTree,
  removeModsCascade,
  shouldHideMod,
  smartFixAssembly,
  summarizeAssemblyImpact,
  toggleModSmart,
  type AssemblyPreferences,
  type CheckerTier,
  type RecipeViewerChoice,
} from '../utils/modLogic.ts';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Unlock,
  Wrench,
  X,
} from 'lucide-react';

interface AssemblyBuilderTabProps {
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  prefs: AssemblyPreferences;
  setPrefs: (updater: AssemblyPreferences | ((prev: AssemblyPreferences) => AssemblyPreferences)) => void;
  onOpenDetail: (mod: ModItem) => void;
  onSendToChecker: (ids: string[]) => void;
}

type BuilderSort = 'smart' | 'green-first' | 'alpha';
type BuilderSection = 'all' | 'optimization' | 'recipes';
type SlotFilter = 'all' | 'selected' | 'issues';
type ExtraDrawerFilter = 'all' | 'viable' | 'legacy';

export function AssemblyBuilderTab({
  selectedIds,
  setSelectedIds,
  prefs,
  setPrefs,
  onOpenDetail,
  onSendToChecker,
}: AssemblyBuilderTabProps) {
  const [actionNotice, setActionNotice] = useState<{ text: string; tone: 'info' | 'warn' } | null>(null);
  const [sortMode, setSortMode] = useState<BuilderSort>('smart');
  const [builderSection, setBuilderSection] = useState<BuilderSection>('all');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [slotSearch, setSlotSearch] = useState('');
  const [strictExclusive, setStrictExclusive] = useState(true);
  const [hideUselessCovered, setHideUselessCovered] = useState(true);
  const [hideIncompatible, setHideIncompatible] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [extraSearchByGroup, setExtraSearchByGroup] = useState<Record<string, string>>({});
  const [extraFilterByGroup, setExtraFilterByGroup] = useState<Record<string, ExtraDrawerFilter>>({});
  const [copied, setCopied] = useState(false);

  const modById = useMemo(() => {
    const map = new Map<string, ModItem>();
    MODS_DATABASE.forEach(m => map.set(m.id, m));
    return map;
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const incompatibleWithActiveSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of MODS_DATABASE) {
      if (isModIncompatibleWithSelection(m, selectedSet, prefs)) {
        set.add(m.id);
      }
    }
    return set;
  }, [selectedSet, prefs]);

  const uselessOrSupersededSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of MODS_DATABASE) {
      if (selectedSet.has(m.id)) continue;
      if (
        m.status === 'danger' ||
        isUnsupportedOnForge(m) ||
        getModSuperseder(m, selectedSet, prefs, true) !== null
      ) {
        set.add(m.id);
      }
    }
    return set;
  }, [selectedSet, prefs]);

  const analysis = useMemo(() => evaluateAssemblyHealth(selectedIds), [selectedIds]);
  const assemblyImpact = useMemo(
    () => summarizeAssemblyImpact(selectedIds, analysis, prefs),
    [selectedIds, analysis, prefs]
  );

  const warningByMod = useMemo(() => {
    const map = new Map<string, { severity: 'red' | 'yellow'; messages: string[] }>();
    for (const w of analysis.warnings) {
      const prev = map.get(w.modId);
      const severity = prev?.severity === 'red' || w.severity === 'red' ? 'red' : 'yellow';
      map.set(w.modId, { severity, messages: prev ? [...prev.messages, w.message] : [w.message] });
    }
    return map;
  }, [analysis.warnings]);

  const summaryCounts = useMemo(() => {
    let green = 0;
    let lime = 0;
    let yellow = 0;
    let red = 0;
    for (const m of analysis.selectedMods) {
      const w = warningByMod.get(m.id);
      const t = getCheckerTier(m, analysis.conflictingIdSet, w?.severity);
      if (t.tier === 'green') green++;
      else if (t.tier === 'lime') lime++;
      else if (t.tier === 'yellow') yellow++;
      else red++;
    }
    return { green, lime, yellow, red, total: analysis.selectedMods.length };
  }, [analysis.selectedMods, analysis.conflictingIdSet, warningByMod]);

  const handleToggleMod = (mod: ModItem) => {
    const res = toggleModSmart(selectedIds, mod.id, { strict: strictExclusive, prefs });
    setSelectedIds(res.nextIds);
    if (res.notice) {
      setActionNotice({ text: res.notice, tone: res.noticeTone });
    } else {
      setActionNotice(null);
    }
  };

  const handleFixIssues = () => {
    const fixed = smartFixAssembly(selectedIds, { ...prefs, focusModId: null });
    setSelectedIds(fixed);
    setActionNotice({
      text: 'Конфликты и дубли устранены, недостающие зависимости добавлены.',
      tone: 'info',
    });
  };

  const handleResetAll = () => {
    setSelectedIds([]);
    setPrefs({ ...INITIAL_BUILDER_PREFS, recipeViewer: 'none', focusModId: null });
    setBuilderSection('all');
    setSlotFilter('all');
    setSlotSearch('');
    setSortMode('smart');
    setStrictExclusive(true);
    setHideUselessCovered(true);
    setHideIncompatible(true);
    setExpandedGroups({});
    setExtraSearchByGroup({});
    setExtraFilterByGroup({});
    setActionNotice({ text: 'Все моды и параметры сброшены.', tone: 'info' });
  };

  const handleQuickSelectSlotLeader = (_groupId: string, leaderId: string, memberIds: string[]) => {
    let next = selectedIds;
    if (strictExclusive) {
      const res = toggleModSmart(
        selectedIds.includes(leaderId)
          ? selectedIds
          : selectedIds.filter(id => !memberIds.includes(id)),
        leaderId,
        { strict: true, prefs }
      );
      next = res.nextIds;
    } else if (!selectedIds.includes(leaderId)) {
      next = [...selectedIds, leaderId];
    }
    setSelectedIds(next);
    const leaderName = modById.get(leaderId)?.name || leaderId;
    setActionNotice({ text: `В слот добавлен: ${leaderName}.`, tone: 'info' });
  };

  const handleClearSlot = (memberIds: string[], groupTitle: string) => {
    if (!strictExclusive) {
      setSelectedIds(selectedIds.filter(id => !memberIds.includes(id)));
      setActionNotice({ text: `Слот «${groupTitle}» очищен.`, tone: 'info' });
      return;
    }
    const res = removeModsCascade(selectedIds, memberIds);
    setSelectedIds(res.nextIds);
    if (res.cascadedNames.length > 0) {
      setActionNotice({
        text: `Слот «${groupTitle}» очищен (также убраны зависимые: ${res.cascadedNames.join(', ')}).`,
        tone: 'info',
      });
    } else {
      setActionNotice({ text: `Слот «${groupTitle}» очищен.`, tone: 'info' });
    }
  };

  const handleCopyNamesList = () => {
    const treeNodes = organizeAssemblyTree(selectedIds);
    const orderedNames: string[] = [];
    const seen = new Set<string>();
    for (const node of treeNodes) {
      if (!seen.has(node.parent.id)) {
        seen.add(node.parent.id);
        orderedNames.push(node.parent.name);
      }
      for (const ch of node.children) {
        if (!seen.has(ch.mod.id)) {
          seen.add(ch.mod.id);
          orderedNames.push(ch.mod.name);
        }
      }
    }
    for (const id of selectedIds) {
      if (!seen.has(id)) {
        const m = modById.get(id);
        if (m) {
          seen.add(id);
          orderedNames.push(m.name);
        }
      }
    }
    navigator.clipboard.writeText(orderedNames.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const sortMods = (mods: ModItem[], leaderId: string, addonIds: string[]) => {
    const addonSet = new Set(addonIds);
    const tierScore: Record<CheckerTier, number> = { green: 30, lime: 20, yellow: 10, red: -100 };
    return [...mods].sort((a, b) => {
      if (sortMode === 'alpha') return a.name.localeCompare(b.name, 'ru');
      if (sortMode === 'green-first') {
        const tierA = getCheckerTier(a, analysis.conflictingIdSet, warningByMod.get(a.id)?.severity).tier;
        const tierB = getCheckerTier(b, analysis.conflictingIdSet, warningByMod.get(b.id)?.severity).tier;
        return tierScore[tierB] - tierScore[tierA] || getModEffectivenessScore(b) - getModEffectivenessScore(a);
      }
      const rank = (m: ModItem) => (m.id === leaderId ? 2000 : addonSet.has(m.id) ? 1200 : 0);
      return rank(b) + getModEffectivenessScore(b) - (rank(a) + getModEffectivenessScore(a));
    });
  };

  const missingSlotGroupIds = useMemo(
    () => new Set(analysis.missingCoreSlots.map(s => s.groupId)),
    [analysis.missingCoreSlots]
  );

  const visibleGroups = useMemo(() => {
    const q = slotSearch.trim().toLowerCase();
    return MOD_GROUPS.filter(group => {
      const isRecipeGroup = group.id === 'recipes-jei';
      if (builderSection === 'optimization' && isRecipeGroup) return false;
      if (builderSection === 'recipes' && !isRecipeGroup) return false;

      const selectedInGroup = group.memberIds.filter(id => selectedSet.has(id));
      const hasIssues =
        missingSlotGroupIds.has(group.id) ||
        selectedInGroup.some(id => analysis.conflictingIdSet.has(id) || warningByMod.has(id));

      if (slotFilter === 'selected' && selectedInGroup.length === 0) return false;
      if (slotFilter === 'issues' && !hasIssues) return false;

      if (!q) return true;
      if (group.title.toLowerCase().includes(q) || group.description.toLowerCase().includes(q)) return true;
      return group.memberIds.some(id => {
        const m = modById.get(id);
        return m && (m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
      });
    });
  }, [slotSearch, slotFilter, builderSection, selectedSet, missingSlotGroupIds, analysis.conflictingIdSet, warningByMod, modById]);

  const optimizationGroups = useMemo(
    () => visibleGroups.filter(g => g.id !== 'recipes-jei'),
    [visibleGroups]
  );
  const recipeGroups = useMemo(
    () => visibleGroups.filter(g => g.id === 'recipes-jei'),
    [visibleGroups]
  );

  const restrictionTextClass = (tone: 'red' | 'amber' | 'violet' | 'sky') => {
    switch (tone) {
      case 'red':
        return 'text-rose-300';
      case 'amber':
        return 'text-amber-300';
      case 'violet':
      case 'sky':
        return 'text-sky-300';
    }
  };

  const tierShortText = (tier: CheckerTier) => {
    switch (tier) {
      case 'green':
        return { text: 'Стаб.', textCls: 'text-emerald-300', dotCls: 'bg-emerald-400' };
      case 'lime':
        return { text: 'Сносно', textCls: 'text-lime-300', dotCls: 'bg-lime-400' };
      case 'yellow':
        return { text: 'Усл.', textCls: 'text-amber-300', dotCls: 'bg-amber-400' };
      case 'red':
        return { text: 'Исключ.', textCls: 'text-rose-300', dotCls: 'bg-rose-500' };
    }
  };

  const currentRecipeViewer = prefs.recipeViewer ?? 'none';
  const hw = assemblyImpact.hardwareSummary;
  const gpuLoadMods = Array.from(new Set([...hw.highGpuIds, ...hw.highVramIds]))
    .map(id => modById.get(id))
    .filter((m): m is ModItem => Boolean(m));
  const cpuLoadMods = hw.highCpuIds
    .map(id => modById.get(id))
    .filter((m): m is ModItem => Boolean(m));
  const ramSaverMods = hw.ramSaverIds
    .map(id => modById.get(id))
    .filter((m): m is ModItem => Boolean(m));

  return (
    <div className="space-y-4">
      {/* Compact Obsidian Utility Control Bar */}
      <div className="bg-[#121620] border border-[#1f2534] rounded-xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Section Filter */}
            <div className="flex items-center bg-[#0a0c12] border border-[#1f2534] rounded-lg p-0.5 text-xs" role="group" aria-label="Секции сборок">
              {[
                { k: 'all', label: 'Все' },
                { k: 'optimization', label: 'Оптимизация' },
                { k: 'recipes', label: 'JEI / EMI' },
              ].map(sec => (
                <button
                  key={sec.k}
                  type="button"
                  onClick={() => setBuilderSection(sec.k as BuilderSection)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    builderSection === sec.k
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-52 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={slotSearch}
                onChange={e => setSlotSearch(e.target.value)}
                placeholder="Поиск слота или мода..."
                aria-label="Поиск слота или мода"
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#0a0c12] border border-[#1f2534] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400"
              />
            </div>

            {/* Recipe viewer filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Рецепты:</span>
              <div className="flex items-center bg-[#0a0c12] border border-[#1f2534] rounded-lg p-0.5 text-xs" role="group" aria-label="Режим просмотрщика рецептов">
                {[
                  { k: 'none', label: 'Нет' },
                  { k: 'jei', label: 'JEI' },
                  { k: 'emi', label: 'EMI' },
                  { k: 'emi-jei', label: 'EMI+JEI' },
                ].map(opt => {
                  const active = currentRecipeViewer === opt.k;
                  return (
                    <button
                      key={opt.k}
                      type="button"
                      onClick={() =>
                        setPrefs(p => ({ ...p, recipeViewer: opt.k as RecipeViewerChoice }))
                      }
                      className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                        active ? 'bg-[#1d2536] text-sky-300 font-semibold' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0c12] hover:bg-rose-500/15 border border-[#2e364a] hover:border-rose-500/45 text-slate-200 hover:text-rose-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сброс
            </button>
          </div>
        </div>

        {/* Second compact row: slot filter, sort, safety & hiding toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#191f2d]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#0a0c12] border border-[#1f2534] rounded-lg p-0.5 text-xs">
              {[
                { k: 'all', label: 'Все слоты' },
                { k: 'selected', label: 'Выбранные' },
                { k: 'issues', label: `Проблемы${analysis.missingCoreSlots.length + analysis.conflicts.length > 0 ? '!' : ''}` },
              ].map(f => (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setSlotFilter(f.k as SlotFilter)}
                  className={`px-2.5 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                    slotFilter === f.k ? 'bg-[#1d2536] text-white font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-[#0a0c12] border border-[#1f2534] rounded-lg p-0.5 text-xs">
              <ArrowUpDown className="w-3 h-3 text-slate-400 ml-1.5" />
              {[
                { k: 'smart', label: 'Порядок' },
                { k: 'green-first', label: 'Стабильные' },
                { k: 'alpha', label: 'А-Я' },
              ].map(s => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => setSortMode(s.k as BuilderSort)}
                  className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                    sortMode === s.k ? 'bg-[#1d2536] text-white font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStrictExclusive(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                strictExclusive
                  ? 'bg-[#0a0c12] border-[#2e364a] text-emerald-300'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-200'
              }`}
              title="Автоматически подбирать зависимости и заменять конфликты при клике"
            >
              {strictExclusive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {strictExclusive ? '1 слот' : 'Свободно'}
            </button>

            <button
              type="button"
              onClick={() => setHideUselessCovered(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                hideUselessCovered
                  ? 'bg-[#0a0c12] border-[#2e364a] text-slate-100'
                  : 'bg-[#0a0c12] border-[#1f2534] text-slate-400 hover:text-white'
              }`}
              title="Скрывать плацебо, нерабочие на Forge и встроенные моды"
            >
              {hideUselessCovered ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {hideUselessCovered ? `Скрыты лишние (${uselessOrSupersededSet.size})` : 'Показаны лишние'}
            </button>

            <button
              type="button"
              onClick={() => setHideIncompatible(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                hideIncompatible
                  ? 'bg-sky-500/12 border-sky-400/45 text-sky-200'
                  : 'bg-[#0a0c12] border-[#1f2534] text-slate-400 hover:text-white'
              }`}
              title="Скрывать моды, конфликтующие с активной сборкой"
            >
              {hideIncompatible ? <EyeOff className="w-3 h-3 text-sky-300" /> : <Eye className="w-3 h-3" />}
              {hideIncompatible
                ? `Несовм. скрыты (${incompatibleWithActiveSet.size})`
                : `Несовм. показаны (${incompatibleWithActiveSet.size})`}
            </button>
          </div>
        </div>

        {/* Inline compact color legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Стабильный
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-400" />
            Сносно
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Условно / нагрузка GPU·CPU / прослойка
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Конфликт / плацебо
          </span>
        </div>

        {actionNotice && (
          <div
            className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-3 border ${
              actionNotice.tone === 'warn'
                ? 'bg-amber-500/12 border-amber-400/45 text-amber-100'
                : 'bg-sky-500/12 border-sky-400/40 text-sky-100'
            }`}
          >
            <span>{actionNotice.text}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="p-0.5 rounded hover:bg-white/10 shrink-0"
              aria-label="Скрыть уведомление"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main 2-column workspace: Slots Left + Sticky Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Functional Group Slots */}
        <div className="lg:col-span-8 space-y-5">
          {visibleGroups.length === 0 ? (
            <div className="bg-[#121620] border border-[#1f2534] rounded-xl p-8 text-center text-xs text-slate-300">
              По текущему фильтру слоты не найдены.
            </div>
          ) : (
            [
              {
                key: 'optimization',
                title: 'Оптимизация',
                subtitle: 'Рендер, память, освещение, тики, чанки, сеть',
                groups: optimizationGroups,
              },
              {
                key: 'recipes',
                title: 'JEI / EMI (рецепты)',
                subtitle: 'Просмотрщики рецептов и плагины',
                groups: recipeGroups,
              },
            ]
              .filter(sec => sec.groups.length > 0)
              .map(sec => (
                <section key={sec.key} className="space-y-3" data-slot-section={sec.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">{sec.title}</h3>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">({sec.groups.length})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{sec.subtitle}</span>
                  </div>

                  <div className="space-y-3">
                    {sec.groups.map(group => {
                      const addonSet = new Set(group.addonIds);
                      const allMembers = group.memberIds
                        .map(id => modById.get(id))
                        .filter((m): m is ModItem => Boolean(m));
                      const sortedMembers = sortMods(allMembers, group.leaderId, group.addonIds);

                      const q = slotSearch.trim().toLowerCase();
                      const hiddenSupersededInGroupCount = sortedMembers.filter(
                        m => !selectedSet.has(m.id) && uselessOrSupersededSet.has(m.id)
                      ).length;
                      const hiddenIncompatibleInGroupCount = sortedMembers.filter(
                        m =>
                          !selectedSet.has(m.id) &&
                          incompatibleWithActiveSet.has(m.id) &&
                          !(hideUselessCovered && uselessOrSupersededSet.has(m.id))
                      ).length;

                      const primaryMembers = sortedMembers.filter(m => {
                        if (shouldHideMod(m, selectedSet, prefs, { hideIncompatible, hideUselessCovered })) {
                          return false;
                        }
                        if (q && (m.name.toLowerCase().includes(q) || (m.tags && m.tags.some(t => t.toLowerCase().includes(q))))) {
                          return true;
                        }
                        if (selectedSet.has(m.id)) return true;
                        if (m.id === group.leaderId || addonSet.has(m.id)) return true;
                        return false;
                      });

                      const primaryIdSet = new Set(primaryMembers.map(m => m.id));
                      const extraMembersAll = sortedMembers.filter(m => {
                        if (primaryIdSet.has(m.id)) return false;
                        if (shouldHideMod(m, selectedSet, prefs, { hideIncompatible, hideUselessCovered })) {
                          return false;
                        }
                        return true;
                      });

                      const hiddenCount = extraMembersAll.length;
                      const isExtraOpen = Boolean(expandedGroups[group.id]);
                      const extraSearch = (extraSearchByGroup[group.id] || '').trim().toLowerCase();
                      const extraFilter: ExtraDrawerFilter = extraFilterByGroup[group.id] || 'all';

                      const extraFiltered = extraMembersAll.filter(m => {
                        if (
                          extraSearch &&
                          !m.name.toLowerCase().includes(extraSearch) &&
                          !m.description.toLowerCase().includes(extraSearch) &&
                          !(m.tags && m.tags.some(t => t.toLowerCase().includes(extraSearch)))
                        ) {
                          return false;
                        }
                        const tier = getCheckerTier(m, analysis.conflictingIdSet, warningByMod.get(m.id)?.severity).tier;
                        if (extraFilter === 'viable') return tier === 'green' || tier === 'lime' || tier === 'yellow';
                        if (extraFilter === 'legacy') return tier === 'red' || Boolean(m.coveredBy);
                        return true;
                      });

                      const viableCount = extraMembersAll.filter(m => {
                        const t = getCheckerTier(m, analysis.conflictingIdSet, warningByMod.get(m.id)?.severity).tier;
                        return t === 'green' || t === 'lime' || t === 'yellow';
                      }).length;
                      const legacyCount = extraMembersAll.length - viableCount;

                      const exclusivePoolIds = EXCLUSIVE_ENGINE_POOLS[group.id] || [];
                      const exclusivePoolSet = new Set(exclusivePoolIds);
                      const selectedInGroup = group.memberIds.filter(id => selectedSet.has(id));
                      const selectedInCore = exclusivePoolIds.filter(id => selectedSet.has(id));
                      const hasExclusiveConflict = exclusivePoolIds.length > 1 && selectedInCore.length > 1;
                      const isMissingCore = missingSlotGroupIds.has(group.id);

                      return (
                        <div
                          key={group.id}
                          className={`bg-[#121620] border rounded-xl overflow-hidden ${
                            hasExclusiveConflict
                              ? 'border-rose-500/60'
                              : isMissingCore
                                ? 'border-amber-400/50'
                                : 'border-[#1f2534]'
                          }`}
                        >
                          {/* Slot Header */}
                          <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#191f2d]">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                                <h4 className="text-sm font-semibold text-slate-50">{group.title}</h4>
                                <span className="text-[11px] text-slate-400 tabular-nums">
                                  {exclusivePoolIds.length > 1 ? '1 основа + аддоны' : 'совместимые модули'}
                                  <span aria-hidden="true"> · </span>
                                  {selectedInGroup.length > 0 ? (
                                    <span className="text-emerald-300 font-semibold">выбрано {selectedInGroup.length}</span>
                                  ) : isMissingCore ? (
                                    <span className="text-amber-300 font-semibold">рекомендуется</span>
                                  ) : (
                                    <span>0 выбрано</span>
                                  )}
                                  {hideIncompatible && hiddenIncompatibleInGroupCount > 0 && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span className="text-slate-400">скрыто несовм. {hiddenIncompatibleInGroupCount}</span>
                                    </>
                                  )}
                                  {hideUselessCovered && hiddenSupersededInGroupCount > 0 && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span className="text-slate-400">перекрыто/лишних {hiddenSupersededInGroupCount}</span>
                                    </>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{group.description}</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!selectedSet.has(group.leaderId) && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickSelectSlotLeader(group.id, group.leaderId, group.memberIds)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[#181d2a] hover:bg-[#22293b] border border-[#2e364a] text-emerald-300 font-semibold transition-colors whitespace-nowrap"
                                >
                                  + Лидер
                                </button>
                              )}
                              {selectedInGroup.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleClearSlot(group.memberIds, group.title)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0a0c12] hover:bg-[#181d2a] border border-[#1f2534] text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                                >
                                  Очистить
                                </button>
                              )}
                              {hiddenCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                                  className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors whitespace-nowrap tabular-nums ${
                                    isExtraOpen
                                      ? 'bg-sky-600 border-sky-500 text-white'
                                      : 'bg-[#181d2a] hover:bg-[#22293b] border-[#2e364a] text-slate-100'
                                  }`}
                                >
                                  <span>{isExtraOpen ? 'Свернуть доп.' : `Доп. (${hiddenCount})`}</span>
                                  {isExtraOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {hasExclusiveConflict && (
                            <div className="mx-4 mt-3 bg-rose-500/12 border border-rose-500/45 rounded-lg px-3 py-2 text-xs text-rose-100 flex items-start gap-2">
                              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Конфликт внутри слота:</span> выбрано сразу{' '}
                                {selectedInCore.map(id => modById.get(id)?.name).join(' + ')}.{' '}
                                {group.conflictReason || 'Оставьте только 1 вариант (лучше лидера).'}
                              </div>
                            </div>
                          )}

                          {/* Extra Drawer */}
                          {isExtraOpen && extraMembersAll.length > 0 && (
                            <div className="bg-[#0a0c12] border-b border-[#191f2d] p-3 space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                  <span className="text-[11px] font-semibold text-slate-200 shrink-0">
                                    Дополнительные и аналоги
                                  </span>
                                  {extraMembersAll.length > 6 && (
                                    <div className="relative w-44 max-w-full">
                                      <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="text"
                                        value={extraSearchByGroup[group.id] || ''}
                                        onChange={e =>
                                          setExtraSearchByGroup(prev => ({ ...prev, [group.id]: e.target.value }))
                                        }
                                        placeholder={`Поиск среди ${extraMembersAll.length}...`}
                                        className="w-full pl-7 pr-2 py-1 bg-[#121620] border border-[#1f2534] rounded-md text-[11px] text-slate-100 placeholder-slate-500 focus:border-sky-400"
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center gap-0.5 bg-[#121620] border border-[#1f2534] rounded-md p-0.5 text-[11px]">
                                    {[
                                      { k: 'all', label: `Все (${extraMembersAll.length})` },
                                      { k: 'viable', label: `Рабочие (${viableCount})` },
                                      { k: 'legacy', label: `Устар./конфл. (${legacyCount})` },
                                    ].map(f => (
                                      <button
                                        key={f.k}
                                        type="button"
                                        onClick={() =>
                                          setExtraFilterByGroup(prev => ({
                                            ...prev,
                                            [group.id]: f.k as ExtraDrawerFilter,
                                          }))
                                        }
                                        className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap tabular-nums ${
                                          extraFilter === f.k
                                            ? 'bg-[#1d2536] text-white font-semibold'
                                            : 'text-slate-300 hover:text-white'
                                        }`}
                                      >
                                        {f.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {hiddenIncompatibleInGroupCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setHideIncompatible(v => !v)}
                                      className="text-[11px] text-sky-300 hover:text-sky-200 px-2 py-1 rounded hover:bg-[#181d2a] whitespace-nowrap"
                                    >
                                      {hideIncompatible
                                        ? `Показать несовм. (${hiddenIncompatibleInGroupCount})`
                                        : 'Скрыть несовм.'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: false }))}
                                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-[#181d2a] whitespace-nowrap"
                                  >
                                    <span>Свернуть</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {extraFiltered.length === 0 ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                  По фильтру ничего не найдено.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                                  {extraFiltered.map(mod => {
                                    const isSelected = selectedSet.has(mod.id);
                                    const isCoreExclusiveItem = exclusivePoolSet.has(mod.id);
                                    const w = warningByMod.get(mod.id);
                                    const modTier = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity).tier;
                                    const statusInfo = tierShortText(modTier);
                                    const restriction = getModRestrictionBadge(mod, selectedSet, prefs);
                                    const isIncompat = incompatibleWithActiveSet.has(mod.id);
                                    const rp = getModResourceProfile(mod);

                                    const cardHighlight =
                                      modTier === 'red' || isIncompat || (isSelected && hasExclusiveConflict && isCoreExclusiveItem)
                                        ? isSelected
                                          ? 'bg-rose-500/15 border-rose-400/70'
                                          : 'bg-rose-500/[0.06] border-rose-500/35 hover:border-rose-400/65'
                                        : modTier === 'yellow' || restriction?.tone === 'amber'
                                          ? isSelected
                                            ? 'bg-amber-500/15 border-amber-400/70'
                                            : 'bg-amber-500/[0.06] border-amber-400/35 hover:border-amber-400/65'
                                          : isSelected
                                            ? 'bg-sky-500/12 border-sky-400/65'
                                            : 'bg-[#121620] border-[#1f2534] hover:border-[#2e364a]';

                                    return (
                                      <div
                                        key={mod.id}
                                        className={`rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors ${cardHighlight}`}
                                      >
                                        <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                                          <input
                                            type={strictExclusive && isCoreExclusiveItem ? 'radio' : 'checkbox'}
                                            name={strictExclusive && isCoreExclusiveItem ? `group-extra-${group.id}` : undefined}
                                            checked={isSelected}
                                            onChange={() => handleToggleMod(mod)}
                                            className="accent-sky-500 w-3 h-3 shrink-0"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="text-[11px] font-medium text-slate-50 truncate">
                                                {mod.name}
                                              </span>
                                              <span className={`text-[10px] font-medium shrink-0 ${statusInfo.textCls}`}>
                                                {statusInfo.text}
                                              </span>
                                            </div>
                                            <div
                                              className={`text-[10px] truncate ${
                                                modTier === 'red' || isIncompat
                                                  ? 'text-rose-300'
                                                  : modTier === 'yellow' || rp.hasTradeoff
                                                    ? 'text-amber-300'
                                                    : 'text-slate-400'
                                              }`}
                                              title={rp.tradeoffNote}
                                            >
                                              {mod.coveredBy
                                                ? `Встроено: ${mod.coveredBy}`
                                                : restriction?.text || (rp.hasTradeoff ? rp.shortTag : mod.platform)}
                                            </div>
                                          </div>
                                        </label>

                                        <button
                                          type="button"
                                          onClick={() => onOpenDetail(mod)}
                                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2030] transition-colors shrink-0"
                                          title="Подробнее"
                                          aria-label={`Подробнее о ${mod.name}`}
                                        >
                                          <Info className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Primary Visible Mods List (Zero border-l-2 stripes, clean hierarchy) */}
                          <div className="divide-y divide-[#191f2d]">
                            {primaryMembers.map(mod => {
                              const isSelected = selectedSet.has(mod.id);
                              const isLeader = mod.id === group.leaderId;
                              const isAddon = addonSet.has(mod.id);
                              const isCoreExclusiveItem = exclusivePoolSet.has(mod.id);
                              const w = warningByMod.get(mod.id);
                              const modTier = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity).tier;
                              const isIncompat = incompatibleWithActiveSet.has(mod.id);
                              const restriction = getModRestrictionBadge(mod, selectedSet, prefs);
                              const statusInfo = tierShortText(modTier);

                              const isRed = modTier === 'red' || isIncompat || (isSelected && hasExclusiveConflict && isCoreExclusiveItem);
                              const isYellow = !isRed && (modTier === 'yellow' || restriction?.tone === 'amber');

                              const rowCls = isRed
                                ? isSelected
                                  ? 'bg-rose-500/[0.11]'
                                  : 'bg-rose-500/[0.04] hover:bg-rose-500/[0.08]'
                                : isYellow
                                  ? isSelected
                                    ? 'bg-amber-500/[0.10]'
                                    : 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]'
                                  : isSelected
                                    ? 'bg-sky-500/[0.08]'
                                    : 'hover:bg-[#171d2b]';

                              const modImpact = evaluateModImpactInPack(mod, selectedSet, isSelected ? analysis : undefined, prefs);
                              const rp = modImpact.resourceProfile;
                              const relPctStr =
                                modImpact.relativeImpactPct > 0
                                  ? `+${modImpact.relativeImpactPct}%`
                                  : `${modImpact.relativeImpactPct}%`;

                              return (
                                <div
                                  key={mod.id}
                                  className={`px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${rowCls}`}
                                >
                                  <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                                    <input
                                      type={strictExclusive && isCoreExclusiveItem ? 'radio' : 'checkbox'}
                                      name={strictExclusive && isCoreExclusiveItem ? `group-${group.id}` : undefined}
                                      checked={isSelected}
                                      onChange={() => handleToggleMod(mod)}
                                      className="accent-sky-500 w-3.5 h-3.5 shrink-0 mt-1"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                                        <span className="text-[13px] font-semibold text-slate-50">{mod.name}</span>
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${statusInfo.textCls}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotCls}`} />
                                          {statusInfo.text}
                                        </span>
                                        <span
                                          className={`text-[11px] font-mono font-semibold tabular-nums ${
                                            modImpact.relativeImpactPct > 0
                                              ? 'text-emerald-300'
                                              : modImpact.relativeImpactPct < 0
                                                ? 'text-rose-300'
                                                : 'text-slate-400'
                                          }`}
                                          title={`Оценка в текущей сборке: ${modImpact.impactPoints}/100 б.`}
                                        >
                                          {relPctStr} · {modImpact.impactPoints}б.
                                        </span>
                                        {(isLeader || isAddon || mod.platform.includes('Sinytra')) && (
                                          <span className="text-[11px] text-slate-400">
                                            ·{' '}
                                            {[
                                              isLeader ? 'Лидер' : isAddon ? 'Аддон' : null,
                                              mod.platform.includes('Sinytra') ? 'Sinytra' : null,
                                            ]
                                              .filter(Boolean)
                                              .join(' · ')}
                                          </span>
                                        )}
                                        {rp.hasTradeoff && (
                                          <span
                                            className="text-[11px] text-amber-300 font-medium"
                                            title={rp.tradeoffNote}
                                          >
                                            · {rp.shortTag}
                                          </span>
                                        )}
                                        {restriction && (
                                          <span className={`text-[11px] font-medium ${restrictionTextClass(restriction.tone)}`}>
                                            · {restriction.text}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-400 truncate mt-0.5">
                                        {w ? w.messages[0] : mod.description}
                                      </p>
                                    </div>
                                  </label>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenDetail(mod)}
                                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1d2536] transition-colors"
                                      title="Подробнее: нагрузка ПК и аналоги"
                                      aria-label={`Подробнее о ${mod.name}`}
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={mod.curseforgeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-md text-slate-400 hover:text-[#f16436] hover:bg-[#1d2536] transition-colors"
                                      title="CurseForge"
                                      aria-label={`${mod.name} на CurseForge`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Expandable Footer */}
                          {hiddenCount > 0 && !isExtraOpen && (
                            <button
                              type="button"
                              onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: true }))}
                              className="w-full px-4 py-2 bg-[#0a0c12] hover:bg-[#181d2a] border-t border-[#191f2d] text-xs text-slate-300 hover:text-white flex items-center justify-between transition-colors"
                            >
                              <span>Показать дополнительные моды и аналоги ({hiddenCount})</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
          )}
        </div>

        {/* Right Sticky Build Composition & Hardware Load Panel */}
        <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-4">
          <div className="bg-[#121620] border border-[#1f2534] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-50">Состав сборки</h3>
              </div>
              <span className="text-xs font-mono text-slate-300 tabular-nums">{summaryCounts.total} модов</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-[#0a0c12] border border-emerald-500/30 rounded-lg p-2">
                <div className="text-lg font-bold text-emerald-300 tabular-nums">{summaryCounts.green}</div>
                <div className="text-[10px] text-slate-400">Стабильно</div>
              </div>
              <div className="bg-[#0a0c12] border border-lime-500/30 rounded-lg p-2">
                <div className="text-lg font-bold text-lime-300 tabular-nums">{summaryCounts.lime}</div>
                <div className="text-[10px] text-slate-400">Сносно</div>
              </div>
              <div className="bg-[#0a0c12] border border-amber-400/35 rounded-lg p-2">
                <div className="text-lg font-bold text-amber-300 tabular-nums">{summaryCounts.yellow}</div>
                <div className="text-[10px] text-slate-400">Условно</div>
              </div>
              <div className="bg-[#0a0c12] border border-rose-500/35 rounded-lg p-2">
                <div className="text-lg font-bold text-rose-300 tabular-nums">{summaryCounts.red}</div>
                <div className="text-[10px] text-slate-400">Проблемы</div>
              </div>
            </div>

            {summaryCounts.total > 0 && (
              <div className="rounded-lg bg-[#0a0c12] border border-[#1f2534] p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    Оценка: <strong className="text-sky-300 font-mono tabular-nums">{assemblyImpact.assemblyScore}/100 б.</strong>
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    Подсистемы: {assemblyImpact.coveredSubsystems.length}/7 ({assemblyImpact.coveragePct}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#181d2a] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      assemblyImpact.assemblyScore >= 80
                        ? 'bg-emerald-400'
                        : assemblyImpact.assemblyScore >= 55
                          ? 'bg-sky-400'
                          : 'bg-amber-400'
                    }`}
                    style={{ width: `${assemblyImpact.assemblyScore}%` }}
                  />
                </div>

                {/* Live Hardware Load Breakdown */}
                <div className="pt-2 border-t border-[#191f2d] space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    Профиль нагрузки ПК
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-400 shrink-0">GPU / VRAM ↑:</span>
                      {gpuLoadMods.length > 0 ? (
                        <span className="text-amber-300 text-right truncate">
                          {gpuLoadMods.map(m => m.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-emerald-300">без лишней нагрузки</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-400 shrink-0">CPU потоки ↑:</span>
                      {cpuLoadMods.length > 0 ? (
                        <span className="text-amber-300 text-right truncate">
                          {cpuLoadMods.map(m => m.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-emerald-300">щадящая нагрузка</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Экономия ОЗУ:</span>
                      {ramSaverMods.length > 0 ? (
                        <span className="text-emerald-300 text-right truncate">
                          {ramSaverMods.map(m => m.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-amber-300">не выбраны</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Missing Critical Slots Check */}
            {analysis.missingCoreSlots.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/35 space-y-2">
                <div className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Пропущены базовые слоты ({analysis.missingCoreSlots.length})
                </div>
                <div className="space-y-1.5">
                  {analysis.missingCoreSlots.map(slot => (
                    <div key={slot.groupId} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-100 truncate">{slot.groupTitle}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const res = toggleModSmart(selectedIds, slot.leaderId, { strict: true, prefs });
                          setSelectedIds(res.nextIds);
                        }}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#181d2a] hover:bg-[#22293b] border border-[#2e364a] text-amber-200 font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        {slot.leaderName}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.conflicts.length > 0 || analysis.warnings.length > 0 || summaryCounts.red > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {analysis.conflicts.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/35 text-xs space-y-1">
                    <div className="font-semibold text-rose-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      {c.matchedNames.join(' + ')}
                    </div>
                    <p className="text-[11px] text-slate-200">{c.rule.explanation}</p>
                  </div>
                ))}
                {analysis.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      w.severity === 'red'
                        ? 'bg-rose-500/10 border-rose-500/35 text-rose-100'
                        : 'bg-amber-500/10 border-amber-400/35 text-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="text-[11px]">{w.message}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleFixIssues}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  Исправить конфликты и добрать зависимости
                </button>
              </div>
            ) : summaryCounts.total > 0 ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Конфликтов и пропущенных зависимостей нет.
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#0a0c12] border border-[#1f2534] text-xs text-slate-400">
                Сборка пуста. Выберите моды слева или загрузите готовую конфигурацию во вкладке «Сборки».
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[#191f2d]">
              <button
                type="button"
                onClick={handleCopyNamesList}
                disabled={summaryCounts.total === 0}
                className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Список скопирован' : 'Копировать списком'}
              </button>
              <button
                type="button"
                onClick={() => onSendToChecker(selectedIds)}
                disabled={summaryCounts.total === 0}
                className="w-full py-2 px-3 rounded-lg bg-[#0a0c12] hover:bg-[#181d2a] border border-[#2e364a] text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                Открыть в Чекере
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
