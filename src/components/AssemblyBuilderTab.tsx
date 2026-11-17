import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MODS_DATABASE,
  MOD_GROUPS,
  type ModItem,
} from '../data/modsData.ts';
import {
  DUAL_PORT_PAIRS,
  buildSmartAssembly,
  evaluateAssemblyHealth,
  getBaseHealthTier,
  getCheckerTier,
  getModEffectivenessScore,
  getModRestrictionBadge,
  getModSuperseder,
  shouldHideMod,
  isModIncompatibleWithSelection,
  isUnsupportedOnForge,
  removeModsCascade,
  smartFixAssembly,
  toggleModSmart,
  type AssemblyPreferences,
  type CheckerTier,
  type ExcludedModNote,
  type PortStrategy,
  type RecipeViewerChoice,
} from '../utils/modLogic.ts';
import {
  Wand2,
  ExternalLink,
  Info,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  ArrowUpDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  Search,
  Zap,
  X,
  Plus,
  Crosshair,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AssemblyBuilderTabProps {
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  prefs: AssemblyPreferences;
  setPrefs: (updater: AssemblyPreferences | ((prev: AssemblyPreferences) => AssemblyPreferences)) => void;
  focusModId: string | null;
  setFocusModId: (id: string | null) => void;
  onOpenDetail: (mod: ModItem) => void;
  onSendToChecker: (ids: string[]) => void;
}

type BuilderSort = 'smart' | 'green-first' | 'alpha';
type BuilderSection = 'all' | 'optimization' | 'recipes';
type SlotFilter = 'all' | 'selected' | 'issues';
type ExtraDrawerFilter = 'all' | 'viable' | 'legacy';

const QUICK_ANCHOR_IDS = [
  'nvidium',
  'alloyium',
  'emberlens',
  'oculus',
  'distant-horizons',
  'accelerated-rendering',
  'concurrent-chunk-management-engine-forge-c2me',
  'vmp-forge',
  'krypton-hybrid',
  'emi',
];

export function AssemblyBuilderTab({
  selectedIds,
  setSelectedIds,
  prefs,
  setPrefs,
  focusModId,
  setFocusModId,
  onOpenDetail,
  onSendToChecker,
}: AssemblyBuilderTabProps) {
  const [autoClip, setAutoClip] = useState(true);
  const [smartNotes, setSmartNotes] = useState<string[]>(
    () => buildSmartAssembly({ ...prefs, focusModId }).notes
  );
  const [excludedNotes, setExcludedNotes] = useState<ExcludedModNote[]>(
    () => buildSmartAssembly({ ...prefs, focusModId }).excluded
  );
  const [actionNotice, setActionNotice] = useState<{ text: string; tone: 'info' | 'warn' } | null>(() => {
    if (!focusModId) return null;
    const m = MODS_DATABASE.find(x => x.id === focusModId);
    return m
      ? { text: `Сборка переклипана с упором на «${m.name}».`, tone: 'info' }
      : null;
  });
  const [anchorSearch, setAnchorSearch] = useState('');
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
  const [showPortPairs, setShowPortPairs] = useState(true);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastHandledFocusRef = useRef<string | null>(focusModId);

  const modById = useMemo(() => {
    const map = new Map<string, ModItem>();
    MODS_DATABASE.forEach(m => map.set(m.id, m));
    return map;
  }, []);

  const anchorMod = focusModId ? modById.get(focusModId) || null : null;

  useEffect(() => {
    if (lastHandledFocusRef.current === focusModId) return;
    lastHandledFocusRef.current = focusModId;
    const res = buildSmartAssembly({ ...prefs, focusModId });
    if (prefs.focusModId !== focusModId) {
      setPrefs(p => ({ ...p, focusModId }));
      setSelectedIds(res.modIds);
    }
    setSmartNotes(res.notes);
    setExcludedNotes(res.excluded);
    if (focusModId) {
      const m = modById.get(focusModId);
      setActionNotice({
        text: m
          ? `Сборка переклипана с упором на «${m.name}» (${res.modIds.length} модов без конфликтов).`
          : `Сборка пересобрана (${res.modIds.length} модов).`,
        tone: 'info',
      });
    }
  }, [focusModId, modById, prefs, setPrefs, setSelectedIds]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const anchorSuggestions = useMemo(() => {
    const q = anchorSearch.trim().toLowerCase();
    if (!q) return [];
    return MODS_DATABASE.filter(
      m =>
        m.status !== 'danger' &&
        !isUnsupportedOnForge(m) &&
        !m.coveredBy &&
        getModSuperseder(m, selectedSet, prefs, true) === null &&
        (m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.tags && m.tags.some(t => t.toLowerCase().includes(q))))
    ).slice(0, 8);
  }, [anchorSearch, selectedSet, prefs]);

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

  const applyPrefs = (updater: (prev: AssemblyPreferences) => AssemblyPreferences) => {
    const next = { ...updater(prefs), focusModId };
    setPrefs(next);
    if (autoClip) {
      const res = buildSmartAssembly(next);
      setSelectedIds(res.modIds);
      setSmartNotes(res.notes);
      setExcludedNotes(res.excluded);
      setActionNotice(null);
    }
  };

  const handleSelectAnchor = (modId: string | null) => {
    const nextId = focusModId === modId ? null : modId;
    const anchorTarget = nextId ? modById.get(nextId) : undefined;
    let nextViewer = prefs.recipeViewer ?? 'jei';
    if (anchorTarget) {
      if (anchorTarget.id === 'tmrv-updated' || anchorTarget.id === 'emi' || anchorTarget.recipeEcosystem === 'emi-only') {
        nextViewer =
          anchorTarget.id === 'tmrv-updated' || nextViewer === 'none' || nextViewer === 'jei'
            ? 'emi'
            : nextViewer;
      } else if (anchorTarget.id === 'just-enough-items-jei' || anchorTarget.recipeEcosystem === 'jei-engine') {
        nextViewer = nextViewer === 'emi-jei' ? 'emi-jei' : 'jei';
      } else if (anchorTarget.recipeEcosystem === 'jei-plugin' && nextViewer === 'none') {
        nextViewer = 'jei';
      }
    }
    lastHandledFocusRef.current = nextId;
    setFocusModId(nextId);
    const nextPrefs: AssemblyPreferences = { ...prefs, focusModId: nextId, recipeViewer: nextViewer };
    setPrefs(nextPrefs);
    const res = buildSmartAssembly(nextPrefs);
    setSelectedIds(res.modIds);
    setSmartNotes(res.notes);
    setExcludedNotes(res.excluded);
    setAnchorSearch('');
    const targetName = nextId ? modById.get(nextId)?.name : null;
    setActionNotice({
      text: targetName
        ? `Сделан упор на «${targetName}»: подтянуты зависимости, выбрано ${res.modIds.length} модов.`
        : `Упор сброшен: сборка пересобрана по базовым предпочтениям (${res.modIds.length} модов).`,
      tone: 'info',
    });
  };

  const handleAutoAssemble = () => {
    const nextPrefs = { ...prefs, focusModId };
    const res = buildSmartAssembly(nextPrefs);
    setSelectedIds(res.modIds);
    setSmartNotes(res.notes);
    setExcludedNotes(res.excluded);
    setActionNotice({
      text: anchorMod
        ? `Сборка пересобрана с упором на «${anchorMod.name}»: выбрано ${res.modIds.length} модов без конфликтов.`
        : `Сборка пересобрана автоматически под профиль: выбрано ${res.modIds.length} модов без конфликтов.`,
      tone: 'info',
    });
  };

  const handleToggleMod = (mod: ModItem) => {
    const res = toggleModSmart(selectedIds, mod.id, { strict: strictExclusive, prefs });
    setSelectedIds(res.nextIds);
    if (res.notice) {
      setActionNotice({ text: res.notice, tone: res.noticeTone });
    } else {
      setActionNotice(null);
    }
  };

  const handleChoosePortVariant = (targetId: string, counterpartId: string, label: string, needsSinytra: boolean) => {
    const updatedPrefs: AssemblyPreferences = needsSinytra
      ? { ...prefs, allowSinytra: true, focusModId: targetId }
      : { ...prefs, focusModId: targetId };

    if (needsSinytra && !prefs.allowSinytra) {
      setPrefs(updatedPrefs);
    }

    const baseIds = selectedIds.filter(id => id !== counterpartId);
    const res = baseIds.includes(targetId)
      ? { nextIds: baseIds, notice: `${label} уже активен в сборке.`, noticeTone: 'info' as const }
      : toggleModSmart(baseIds, targetId, { strict: true, prefs: updatedPrefs });

    setSelectedIds(res.nextIds);
    setActionNotice({
      text: res.notice || `Выбран вариант: ${label}.`,
      tone: res.noticeTone,
    });
  };

  const handleFixIssues = () => {
    const fixed = smartFixAssembly(selectedIds, { ...prefs, focusModId });
    setSelectedIds(fixed);
    setActionNotice({
      text: 'Конфликты, дубли и устаревшие Fabric-оригиналы устранены, недостающие зависимости добавлены.',
      tone: 'info',
    });
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
    setActionNotice({ text: `В слот добавлен лидер: ${leaderName}.`, tone: 'info' });
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

  const handleCopy = () => {
    const text = analysis.selectedMods
      .map(m => `${m.name} (${m.platform}) — ${m.curseforgeUrl}`)
      .join('\n');
    navigator.clipboard.writeText(text);
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
        return 'text-rose-400';
      case 'amber':
        return 'text-amber-400';
      case 'violet':
        return 'text-sky-300';
      case 'sky':
        return 'text-sky-400';
    }
  };

  const tierShortLabel = (tier: CheckerTier) => {
    switch (tier) {
      case 'green':
        return { text: 'Стаб.', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' };
      case 'lime':
        return { text: 'Сносно', cls: 'text-lime-400 bg-lime-500/10 border-lime-500/25' };
      case 'yellow':
        return { text: 'Усл.', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
      case 'red':
        return { text: 'Исключ.', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/25' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bench */}
      <div className="bg-[#111824] border border-[#2a384e] rounded-xl p-4 space-y-4 shadow-lg shadow-black/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-50 tracking-tight">Конфигуратор сборки</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Разделено на 2 секции: Оптимизация и JEI / EMI (рецепты). Автоматически подтягивает зависимости и исключает конфликты.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoClip(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                autoClip
                  ? 'bg-[#182233] border-[#384b69] text-slate-50'
                  : 'bg-[#0b1019] border-[#253348] text-slate-300 hover:text-white'
              }`}
              title="Автоматически пересобирать список при смене параметров"
            >
              <Zap className={`w-3.5 h-3.5 ${autoClip ? 'text-emerald-300' : 'text-slate-400'}`} />
              {autoClip ? 'Автопересчёт' : 'Вручную'}
            </button>
            <button
              onClick={handleAutoAssemble}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Пересобрать
            </button>
            <button
              onClick={() => {
                lastHandledFocusRef.current = null;
                setFocusModId(null);
                setPrefs(p => ({ ...p, focusModId: null }));
                setSelectedIds([]);
                setSmartNotes([]);
                setExcludedNotes([]);
                setActionNotice({ text: 'Список модов и упор очищены.', tone: 'info' });
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#182233] hover:bg-[#223048] border border-[#344663] text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сброс
            </button>
          </div>
        </div>

        {/* Section 1: Оптимизация */}
        <div className="pt-3 border-t border-[#243044] space-y-3" data-section="optimization-controls">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-sky-300">01</span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
                Секция: Оптимизация
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Железо, профиль, шейдеры и порты Forge / Sinytra
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">Видеокарта</label>
              <div className="grid grid-cols-3 gap-0.5 bg-[#0b1019] p-1 rounded-lg border border-[#253348]">
                {[
                  { k: 'nvidia', label: 'NVIDIA' },
                  { k: 'amd-intel', label: 'AMD/Intel' },
                  { k: 'integrated', label: 'Слабая' },
                ].map(opt => (
                  <button
                    key={opt.k}
                    onClick={() => applyPrefs(p => ({ ...p, gpu: opt.k as AssemblyPreferences['gpu'] }))}
                    className={`py-1.5 px-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      prefs.gpu === opt.k ? 'bg-[#1e2d44] text-white font-semibold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">Цель</label>
              <div className="grid grid-cols-3 gap-0.5 bg-[#0b1019] p-1 rounded-lg border border-[#253348]">
                {[
                  { k: 'balanced', label: 'Баланс' },
                  { k: 'max-safe', label: 'Макс.' },
                  { k: 'potato', label: 'Слабый ПК' },
                ].map(opt => (
                  <button
                    key={opt.k}
                    onClick={() => applyPrefs(p => ({ ...p, goal: opt.k as AssemblyPreferences['goal'] }))}
                    className={`py-1.5 px-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      prefs.goal === opt.k ? 'bg-[#1e2d44] text-white font-semibold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">Среда</label>
              <div className="grid grid-cols-3 gap-0.5 bg-[#0b1019] p-1 rounded-lg border border-[#253348]">
                {[
                  { k: 'singleplayer', label: 'Соло' },
                  { k: 'server', label: 'Сервер' },
                  { k: 'hybrid-server', label: 'Гибрид' },
                ].map(opt => (
                  <button
                    key={opt.k}
                    onClick={() => applyPrefs(p => ({ ...p, mode: opt.k as AssemblyPreferences['mode'] }))}
                    className={`py-1.5 px-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      prefs.mode === opt.k ? 'bg-[#1e2d44] text-white font-semibold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">Модули</label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => applyPrefs(p => ({ ...p, useShaders: !p.useShaders }))}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    prefs.useShaders
                      ? 'bg-sky-500/20 border-sky-400/60 text-sky-100'
                      : 'bg-[#0b1019] border-[#253348] text-slate-300 hover:text-white'
                  }`}
                >
                  Шейдеры
                </button>
                <button
                  onClick={() => applyPrefs(p => ({ ...p, useCreate: !p.useCreate }))}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    prefs.useCreate
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-100'
                      : 'bg-[#0b1019] border-[#253348] text-slate-300 hover:text-white'
                  }`}
                >
                  Create
                </button>
                <button
                  onClick={() =>
                    applyPrefs(p => {
                      const nextSinytra = !p.allowSinytra;
                      return {
                        ...p,
                        allowSinytra: nextSinytra,
                        portStrategy: nextSinytra
                          ? p.portStrategy === 'native-forge'
                            ? 'hybrid'
                            : p.portStrategy
                          : 'native-forge',
                      };
                    })
                  }
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    prefs.allowSinytra
                      ? 'bg-sky-500/20 border-sky-400/60 text-sky-100'
                      : 'bg-[#0b1019] border-[#253348] text-slate-300 hover:text-white'
                  }`}
                >
                  Sinytra
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: JEI / EMI (рецепты) */}
        <div className="pt-3 border-t border-[#243044] space-y-2.5" data-section="recipes-controls">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-sky-300">02</span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
                Секция: JEI / EMI (рецепты)
              </h3>
            </div>
            <span className="text-[11px] text-slate-300">
              {(prefs.recipeViewer ?? 'jei') === 'emi'
                ? 'EMI + прослойка TMRV Updated (запускает JEI-плагины без самого JEI)'
                : (prefs.recipeViewer ?? 'jei') === 'emi-jei'
                  ? 'EMI + JEI совместно (TMRV не нужен)'
                  : (prefs.recipeViewer ?? 'jei') === 'jei'
                    ? 'Классический JEI + ускорение поиска'
                    : 'Просмотрщик рецептов отключён'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 bg-[#0b1019] p-1 rounded-lg border border-[#253348] max-w-xl">
            {[
              { k: 'none', label: 'Нет' },
              { k: 'jei', label: 'JEI' },
              { k: 'emi', label: 'EMI' },
              { k: 'emi-jei', label: 'EMI+JEI' },
            ].map(opt => {
              const active = (prefs.recipeViewer ?? 'jei') === opt.k;
              return (
                <button
                  key={opt.k}
                  onClick={() =>
                    applyPrefs(p => ({ ...p, recipeViewer: opt.k as RecipeViewerChoice }))
                  }
                  className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Port Strategy + Dual Port Switcher */}
        <div className="pt-3 border-t border-[#243044] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span className="text-xs font-semibold text-slate-100">Реализация аналоговых портов</span>
              <span className="text-[11px] text-slate-400 hidden md:inline">
                · нативный Forge или Fabric через Sinytra
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-[#0b1019] p-1 rounded-lg border border-[#253348]">
                {[
                  { k: 'native-forge', label: 'Нативный Forge' },
                  { k: 'hybrid', label: 'Гибрид' },
                  { k: 'fabric-sinytra', label: 'Fabric + Sinytra' },
                ].map(opt => {
                  const active = (prefs.portStrategy || 'hybrid') === opt.k;
                  return (
                    <button
                      key={opt.k}
                      onClick={() =>
                        applyPrefs(p => ({
                          ...p,
                          portStrategy: opt.k as PortStrategy,
                          allowSinytra: opt.k === 'fabric-sinytra' ? true : opt.k === 'hybrid' ? true : p.allowSinytra,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                        active ? 'bg-sky-400 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowPortPairs(v => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0b1019] hover:bg-[#182233] border border-[#253348] text-[11px] text-slate-200 transition-colors whitespace-nowrap"
              >
                {showPortPairs ? 'Скрыть пары' : 'Пары (4)'}
                {showPortPairs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {showPortPairs && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {DUAL_PORT_PAIRS.filter(p => p.switchableOnForge && p.id !== 'worldgen-noisium').map(pair => {
                const isForgeActive = selectedSet.has(pair.forgeModId);
                const isFabricActive = selectedSet.has(pair.fabricModId);
                const forgeMod = modById.get(pair.forgeModId);
                const fabricMod = modById.get(pair.fabricModId);

                return (
                  <div
                    key={pair.id}
                    className="bg-[#0b1019] border border-[#243248] rounded-lg p-2.5 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-slate-100 truncate">{pair.title}</span>
                      {!isForgeActive && !isFabricActive && (
                        <span className="text-[10px] text-slate-400 shrink-0">не выбран</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => handleChoosePortVariant(pair.forgeModId, pair.fabricModId, pair.forgeLabel, false)}
                        className={`px-2 py-1.5 rounded-md text-left border transition-colors ${
                          isForgeActive
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100'
                            : 'bg-[#141d2c] border-[#273549] text-slate-300 hover:text-white hover:border-[#42587a]'
                        }`}
                      >
                        <div className="text-[10px] font-medium opacity-90">Forge порт</div>
                        <div className="text-[11px] font-semibold truncate text-white">
                          {pair.forgeModId === 'vmp-forge'
                            ? 'VMP (Forge)'
                            : pair.forgeModId === 'concurrent-chunk-management-engine-forge-c2me'
                              ? 'C2MEF'
                              : forgeMod?.name.split('(')[0].trim() || pair.forgeLabel}
                        </div>
                      </button>

                      <button
                        onClick={() => handleChoosePortVariant(pair.fabricModId, pair.forgeModId, pair.fabricLabel, true)}
                        className={`px-2 py-1.5 rounded-md text-left border transition-colors ${
                          isFabricActive
                            ? 'bg-sky-500/20 border-sky-400/60 text-sky-100'
                            : 'bg-[#141d2c] border-[#273549] text-slate-300 hover:text-white hover:border-[#42587a]'
                        }`}
                      >
                        <div className="text-[10px] font-medium opacity-90">Fabric + Sinytra</div>
                        <div className="text-[11px] font-semibold truncate text-white">
                          {pair.fabricModId === 'very-many-players-vmp'
                            ? 'VMP (Fabric)'
                            : fabricMod?.name.split('(')[0].trim() || pair.fabricLabel}
                        </div>
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                      {isFabricActive ? pair.fabricSummary : pair.forgeSummary}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Anchor Mod Focus */}
        <div className="pt-3 border-t border-[#243044] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span className="text-xs font-semibold text-slate-100">Упор на конкретный мод</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                · пересобирает сборку и зависимости вокруг него
              </span>
            </div>

            {anchorMod && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-500/20 border border-sky-400/50 text-xs text-sky-100">
                <span className="font-medium">Упор: {anchorMod.name}</span>
                <button
                  onClick={() => handleSelectAnchor(null)}
                  className="p-0.5 rounded hover:bg-white/10 text-sky-200 hover:text-white"
                  title="Сбросить упор"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-2">
            <div className="relative w-full lg:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={anchorSearch}
                onChange={e => setAnchorSearch(e.target.value)}
                placeholder="Выбрать любой мод для упора..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0b1019] border border-[#2a384e] rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:border-sky-400"
              />
              {anchorSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#141d2c] border border-[#364966] rounded-lg shadow-2xl divide-y divide-[#223044] max-h-60 overflow-y-auto">
                  {anchorSuggestions.map(s => {
                    const tier = getBaseHealthTier(s);
                    const tierChip = tierShortLabel(tier);
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelectAnchor(s.id)}
                        className="w-full px-3 py-2 text-left hover:bg-[#1c283c] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-50 truncate">{s.name}</div>
                          <div className="text-[10px] text-slate-300 truncate">
                            {s.platform} · {s.statusLabel}
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${tierChip.cls}`}>
                          {tierChip.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {QUICK_ANCHOR_IDS.map(aid => {
                const am = modById.get(aid);
                if (!am) return null;
                const active = focusModId === aid;
                const shortLabel =
                  aid === 'concurrent-chunk-management-engine-forge-c2me'
                    ? 'C2MEF'
                    : aid === 'vmp-forge'
                      ? 'VMP (Forge)'
                      : aid === 'accelerated-rendering'
                        ? 'Accel. Rendering'
                        : am.name.split('(')[0].trim();
                return (
                  <button
                    key={aid}
                    onClick={() => handleSelectAnchor(aid)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-sky-500/20 border-sky-400/60 text-sky-100'
                        : 'bg-[#0b1019] border-[#253348] text-slate-300 hover:border-[#42587a] hover:text-white'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Collapsible Logic & Excluded Rationale */}
        {(smartNotes.length > 0 || excludedNotes.length > 0) && (
          <div className="pt-2 border-t border-[#243044]">
            <button
              onClick={() => setShowNotesDrawer(v => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              {showNotesDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>
                Логика выбора и замены ({smartNotes.length + excludedNotes.length})
              </span>
            </button>

            {showNotesDrawer && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mt-2.5">
                {smartNotes.length > 0 && (
                  <div className="bg-[#0b1019] border border-[#243248] rounded-lg px-3.5 py-2.5 text-xs text-slate-200 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-100">
                      Логика под ваш профиль
                    </div>
                    {smartNotes.map((n, i) => (
                      <div key={i} className="text-slate-300">· {n}</div>
                    ))}
                  </div>
                )}
                {excludedNotes.length > 0 && (
                  <div className="bg-[#0b1019] border border-[#243248] rounded-lg px-3.5 py-2.5 text-xs text-slate-200 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-100">
                      Исключено / заменено
                    </div>
                    {excludedNotes.map((ex, i) => (
                      <div key={i} className="truncate text-slate-300" title={`${ex.name}: ${ex.reason}`}>
                        · <span className="font-medium text-slate-100">{ex.name}</span> — {ex.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Smart Action Feedback Banner */}
        {actionNotice && (
          <div
            className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-3 border ${
              actionNotice.tone === 'warn'
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-100'
                : 'bg-emerald-500/15 border-emerald-400/50 text-emerald-100'
            }`}
          >
            <span>{actionNotice.text}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="p-0.5 rounded hover:bg-white/10 shrink-0"
              aria-label="Скрыть уведомление"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Section Switcher + Slot Filter, Search, Smart Sorting & Safety Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#243044]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#0b1019] border border-[#253348] rounded-lg p-0.5 text-xs" role="group" aria-label="Секции сборок">
              {[
                { k: 'all', label: 'Все секции' },
                { k: 'optimization', label: 'Оптимизация' },
                { k: 'recipes', label: 'JEI / EMI' },
              ].map(sec => (
                <button
                  key={sec.k}
                  onClick={() => setBuilderSection(sec.k as BuilderSection)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    builderSection === sec.k
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={slotSearch}
                onChange={e => setSlotSearch(e.target.value)}
                placeholder="Найти слот или мод..."
                className="w-full pl-8 pr-2.5 py-1 bg-[#0b1019] border border-[#2a384e] rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:border-sky-400"
              />
            </div>

            <div className="flex items-center bg-[#0b1019] border border-[#253348] rounded-lg p-0.5 text-xs">
              {[
                { k: 'all', label: 'Все слоты' },
                { k: 'selected', label: 'Выбранные' },
                { k: 'issues', label: `Проблемы${analysis.missingCoreSlots.length + analysis.conflicts.length > 0 ? '!' : ''}` },
              ].map(f => (
                <button
                  key={f.k}
                  onClick={() => setSlotFilter(f.k as SlotFilter)}
                  className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                    slotFilter === f.k ? 'bg-[#1e2d44] text-white font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              {[
                { k: 'smart', label: 'Умный порядок' },
                { k: 'green-first', label: 'Стабильные' },
                { k: 'alpha', label: 'А-Я' },
              ].map(s => (
                <button
                  key={s.k}
                  onClick={() => setSortMode(s.k as BuilderSort)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    sortMode === s.k ? 'bg-[#1e2d44] text-white font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStrictExclusive(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                strictExclusive
                  ? 'bg-[#182233] border-[#344663] text-emerald-300'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-200'
              }`}
            >
              {strictExclusive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {strictExclusive ? 'Умная защита' : 'Свободный выбор'}
            </button>

            <button
              onClick={() => setHideUselessCovered(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                hideUselessCovered
                  ? 'bg-[#182233] border-[#344663] text-slate-100'
                  : 'bg-[#0b1019] border-[#253348] text-slate-300'
              }`}
              title="Скрывать плацебо, нерабочие на Forge и моды, функционал которых 100% перекрыт более лучшими модами"
            >
              {hideUselessCovered ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {hideUselessCovered
                ? `Скрыты лишние (${uselessOrSupersededSet.size})`
                : `Показаны все`}
            </button>

            <button
              onClick={() => setHideIncompatible(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                hideIncompatible
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-100'
                  : 'bg-[#0b1019] border-[#253348] text-slate-300 hover:text-white'
              }`}
              title="Скрывать моды, несовместимые с активными модами сборки, просмотрщиком рецептов (JEI/EMI) или прослойками"
            >
              {hideIncompatible ? <EyeOff className="w-3.5 h-3.5 text-sky-300" /> : <Eye className="w-3.5 h-3.5" />}
              {hideIncompatible
                ? `Несовм. скрыты (${incompatibleWithActiveSet.size})`
                : `Скрыть несовм. (${incompatibleWithActiveSet.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-column workspace: Slots Left + Sticky Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Functional Group Slots divided into Optimization and JEI / EMI sections */}
        <div className="lg:col-span-8 space-y-5">
          {visibleGroups.length === 0 ? (
            <div className="bg-[#111824] border border-[#2a384e] rounded-xl p-8 text-center text-xs text-slate-300">
              По текущему фильтру слоты не найдены.
            </div>
          ) : (
            [
              {
                key: 'optimization',
                title: 'Секция 1 · Оптимизация',
                subtitle: 'Рендер, память, освещение, тики TPS, чанки, сеть и утилиты',
                groups: optimizationGroups,
              },
              {
                key: 'recipes',
                title: 'Секция 2 · JEI / EMI (рецепты)',
                subtitle: 'Просмотрщики рецептов, прослойка TMRV Updated и ускорители крафта',
                groups: recipeGroups,
              },
            ]
              .filter(sec => sec.groups.length > 0)
              .map(sec => (
                <section key={sec.key} className="space-y-3" data-slot-section={sec.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300">{sec.title}</h3>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">({sec.groups.length})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{sec.subtitle}</span>
                  </div>
                  <div className="space-y-3.5">
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

              // Primary visible mods: selected, leader, compatible addons, or global search matches (respecting hideIncompatible & hideUselessCovered)
              const primaryMembers = sortedMembers.filter(m => {
                if (shouldHideMod(m, selectedSet, prefs, { hideIncompatible, hideUselessCovered })) {
                  return false;
                }
                if (q && (m.name.toLowerCase().includes(q) || (m.tags && m.tags.some(t => t.toLowerCase().includes(q))))) return true;
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

              const corePoolIds = group.memberIds.filter(id => !addonSet.has(id));
              const selectedInGroup = group.memberIds.filter(id => selectedSet.has(id));
              const selectedInCore = corePoolIds.filter(id => selectedSet.has(id));
              const hasExclusiveConflict = group.exclusive && selectedInCore.length > 1;
              const isMissingCore = missingSlotGroupIds.has(group.id);

              return (
                <div
                  key={group.id}
                  className={`bg-[#111824] border rounded-xl overflow-hidden shadow-md shadow-black/20 ${
                    hasExclusiveConflict
                      ? 'border-rose-400/60'
                      : isMissingCore
                        ? 'border-amber-400/50'
                        : 'border-[#2a384e]'
                  }`}
                >
                  {/* Clean Slot Header with Unboxed Metadata */}
                  <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#223044]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                        <h4 className="text-sm font-semibold text-slate-50">{group.title}</h4>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {group.exclusive ? '1 основа + аддоны' : 'совместимые модули'}
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
                          onClick={() => handleQuickSelectSlotLeader(group.id, group.leaderId, group.memberIds)}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-[#182233] hover:bg-[#223048] border border-[#344663] text-emerald-300 font-semibold transition-colors whitespace-nowrap"
                        >
                          + Лидер
                        </button>
                      )}
                      {selectedInGroup.length > 0 && (
                        <button
                          onClick={() => handleClearSlot(group.memberIds, group.title)}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-[#0b1019] hover:bg-[#182233] border border-[#253348] text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                        >
                          Очистить
                        </button>
                      )}
                      {hiddenCount > 0 && (
                        <button
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border font-semibold transition-colors whitespace-nowrap tabular-nums ${
                            isExtraOpen
                              ? 'bg-sky-400 border-sky-400 text-slate-950'
                              : 'bg-[#182233] hover:bg-[#223048] border-[#344663] text-slate-100'
                          }`}
                        >
                          <span>{isExtraOpen ? 'Свернуть доп.' : `Доп. (${hiddenCount})`}</span>
                          {isExtraOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {hasExclusiveConflict && (
                    <div className="mx-4 mt-3 bg-rose-500/15 border border-rose-400/50 rounded-lg px-3 py-2 text-xs text-rose-100 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Конфликт внутри слота:</span> выбрано сразу{' '}
                        {selectedInCore.map(id => modById.get(id)?.name).join(' + ')}.{' '}
                        {group.conflictReason || 'Оставьте только 1 вариант (лучше лидера).'}
                      </div>
                    </div>
                  )}

                  {/* Compact Expandable Tray directly beneath header when opened */}
                  {isExtraOpen && extraMembersAll.length > 0 && (
                    <div className="bg-[#0b1019] border-b border-[#243248] p-3 space-y-2.5">
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
                                className="w-full pl-7 pr-2 py-1 bg-[#111824] border border-[#2a384e] rounded-md text-[11px] text-slate-100 placeholder-slate-400 focus:border-sky-400"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-0.5 bg-[#111824] border border-[#2a384e] rounded-md p-0.5 text-[11px]">
                            {[
                              { k: 'all', label: `Все (${extraMembersAll.length})` },
                              { k: 'viable', label: `Рабочие (${viableCount})` },
                              { k: 'legacy', label: `Устар./конфл. (${legacyCount})` },
                            ].map(f => (
                              <button
                                key={f.k}
                                onClick={() =>
                                  setExtraFilterByGroup(prev => ({
                                    ...prev,
                                    [group.id]: f.k as ExtraDrawerFilter,
                                  }))
                                }
                                className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap tabular-nums ${
                                  extraFilter === f.k
                                    ? 'bg-[#1e2d44] text-white font-semibold'
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
                              onClick={() => setHideIncompatible(v => !v)}
                              className="text-[11px] text-sky-300 hover:text-sky-200 px-2 py-1 rounded hover:bg-[#182233] whitespace-nowrap"
                            >
                              {hideIncompatible
                                ? `Показать несовм. (${hiddenIncompatibleInGroupCount})`
                                : 'Скрыть несовм.'}
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: false }))}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-[#182233] whitespace-nowrap"
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
                            const isAddon = addonSet.has(mod.id);
                            const isCoreExclusiveItem = group.exclusive && !isAddon;
                            const w = warningByMod.get(mod.id);
                            const modTier = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity).tier;
                            const chip = tierShortLabel(modTier);
                            const canAnchor = modTier !== 'red' && !mod.coveredBy;
                            const isAnchor = focusModId === mod.id;

                            return (
                              <div
                                key={mod.id}
                                className={`rounded-md border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors ${
                                  isSelected
                                    ? 'bg-[#172336] border-sky-400/60'
                                    : 'bg-[#111824] border-[#243248] hover:border-[#3c5070]'
                                }`}
                              >
                                <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                                  <input
                                    type={strictExclusive && isCoreExclusiveItem ? 'radio' : 'checkbox'}
                                    name={strictExclusive && isCoreExclusiveItem ? `group-extra-${group.id}` : undefined}
                                    checked={isSelected}
                                    onChange={() => handleToggleMod(mod)}
                                    className="accent-sky-400 w-3 h-3 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[11px] font-medium text-slate-50 truncate">
                                        {mod.name}
                                      </span>
                                      <span className={`text-[9px] px-1 py-0.2 rounded border shrink-0 ${chip.cls}`}>
                                        {chip.text}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {mod.coveredBy
                                        ? `Встроено: ${mod.coveredBy}`
                                        : getModRestrictionBadge(mod, selectedSet, prefs)?.text ||
                                          (mod.platform.includes('Sinytra') ? 'Fabric + Sinytra' : mod.platform)}
                                    </div>
                                  </div>
                                </label>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  {canAnchor && (
                                    <button
                                      onClick={() => handleSelectAnchor(mod.id)}
                                      className={`p-1 rounded transition-colors ${
                                        isAnchor
                                          ? 'text-sky-200 bg-sky-500/20'
                                          : 'text-slate-400 hover:text-white hover:bg-[#1e2a3f]'
                                      }`}
                                      title="Сделать упор на этот мод"
                                    >
                                      <Crosshair className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onOpenDetail(mod)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1e2a3f] transition-colors"
                                    title="Подробнее"
                                  >
                                    <Info className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Visible Mods List */}
                  <div className="divide-y divide-[#1e2a3d]">
                    {primaryMembers.map(mod => {
                      const isSelected = selectedSet.has(mod.id);
                      const isLeader = mod.id === group.leaderId;
                      const isAddon = addonSet.has(mod.id);
                      const isCoreExclusiveItem = group.exclusive && !isAddon;
                      const w = warningByMod.get(mod.id);
                      const modTier = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity).tier;
                      const isDangerOrBad = modTier === 'red';
                      const restriction = getModRestrictionBadge(mod, selectedSet, prefs);

                      const tierChip = tierShortLabel(modTier);
                      const isAnchor = focusModId === mod.id;
                      const canAnchor = modTier !== 'red' && !mod.coveredBy;

                      return (
                        <div
                          key={mod.id}
                          className={`px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                            isAnchor
                              ? 'bg-sky-500/12'
                              : isSelected
                                ? isDangerOrBad || (hasExclusiveConflict && isCoreExclusiveItem)
                                  ? 'bg-rose-500/10'
                                  : 'bg-[#162030]'
                                : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                            <input
                              type={strictExclusive && isCoreExclusiveItem ? 'radio' : 'checkbox'}
                              name={strictExclusive && isCoreExclusiveItem ? `group-${group.id}` : undefined}
                              checked={isSelected}
                              onChange={() => handleToggleMod(mod)}
                              className="accent-sky-400 w-3.5 h-3.5 shrink-0 mt-1"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-[13px] font-semibold text-slate-50">{mod.name}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${tierChip.cls}`}>
                                  {tierChip.text}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {[
                                    isAnchor ? 'Упор сборки' : null,
                                    isLeader ? 'Лидер' : isAddon ? 'Аддон' : null,
                                    mod.platform.includes('Sinytra') ? 'Sinytra' : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                                {restriction && (
                                  <span className={`text-[11px] font-medium ${restrictionTextClass(restriction.tone)}`}>
                                    {restriction.text}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 truncate mt-0.5">
                                {w ? w.messages[0] : mod.description}
                              </p>
                            </div>
                          </label>

                          <div className="flex items-center gap-1 shrink-0">
                            {canAnchor && (
                              <button
                                onClick={() => handleSelectAnchor(mod.id)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                                  isAnchor
                                    ? 'bg-sky-500/25 text-sky-100 border border-sky-400/60'
                                    : 'text-slate-300 hover:text-white hover:bg-[#1e2a3f]'
                                }`}
                                title={isAnchor ? 'Сбросить упор' : 'Сделать упор на этот мод и переклипать сборку'}
                              >
                                <Crosshair className="w-3 h-3" />
                                <span className="hidden sm:inline">{isAnchor ? 'Упор' : 'На нём'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => onOpenDetail(mod)}
                              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-[#1e2a3f] transition-colors"
                              title="Подробнее и сравнение аналогов"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={mod.curseforgeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md text-slate-300 hover:text-[#f16436] hover:bg-[#1e2a3f] transition-colors"
                              title="CurseForge"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Expandable Footer Bar */}
                  {hiddenCount > 0 && !isExtraOpen && (
                    <button
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: true }))}
                      className="w-full px-4 py-2 bg-[#0b1019] hover:bg-[#151e2e] border-t border-[#223044] text-xs text-slate-300 hover:text-white flex items-center justify-between transition-colors"
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

        {/* Right Sticky Summary */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="bg-[#111824] border border-[#2a384e] rounded-xl p-4 space-y-4 shadow-lg shadow-black/25">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-50">Итог умной сборки</h3>
              <span className="text-xs font-mono text-slate-300 tabular-nums">{summaryCounts.total} модов</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-[#0b1019] border border-emerald-400/35 rounded-lg p-2">
                <div className="text-lg font-bold text-emerald-300 tabular-nums">{summaryCounts.green}</div>
                <div className="text-[10px] text-slate-300">Стабильно</div>
              </div>
              <div className="bg-[#0b1019] border border-lime-400/35 rounded-lg p-2">
                <div className="text-lg font-bold text-lime-300 tabular-nums">{summaryCounts.lime}</div>
                <div className="text-[10px] text-slate-300">Сносно</div>
              </div>
              <div className="bg-[#0b1019] border border-amber-400/35 rounded-lg p-2">
                <div className="text-lg font-bold text-amber-300 tabular-nums">{summaryCounts.yellow}</div>
                <div className="text-[10px] text-slate-300">Условно</div>
              </div>
              <div className="bg-[#0b1019] border border-rose-400/35 rounded-lg p-2">
                <div className="text-lg font-bold text-rose-300 tabular-nums">{summaryCounts.red}</div>
                <div className="text-[10px] text-slate-300">Проблемы</div>
              </div>
            </div>

            {/* Missing Critical Slots Check */}
            {analysis.missingCoreSlots.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/40 space-y-2">
                <div className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Пропущены ключевые слоты ({analysis.missingCoreSlots.length})
                </div>
                <div className="space-y-1.5">
                  {analysis.missingCoreSlots.map(slot => (
                    <div key={slot.groupId} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-100 truncate">{slot.groupTitle}</span>
                      <button
                        onClick={() => {
                          const res = toggleModSmart(selectedIds, slot.leaderId, { strict: true, prefs });
                          setSelectedIds(res.nextIds);
                        }}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#182233] hover:bg-[#223048] border border-[#344663] text-amber-200 font-medium"
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
                  <div key={idx} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-400/40 text-xs space-y-1">
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
                        ? 'bg-rose-500/10 border-rose-400/40 text-rose-100'
                        : 'bg-amber-500/10 border-amber-400/40 text-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="text-[11px]">{w.message}</span>
                  </div>
                ))}
                <button
                  onClick={handleFixIssues}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold transition-colors"
                >
                  Исправить конфликты и добрать зависимости
                </button>
              </div>
            ) : summaryCounts.total > 0 ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/40 text-xs text-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                Конфликтов, пустых зависимостей и бесполезных дублей нет.
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#0b1019] border border-[#243248] text-xs text-slate-300">
                Нажмите «Пересобрать» или выберите параметры выше для генерации сборки.
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[#243044]">
              <button
                onClick={handleCopy}
                disabled={summaryCounts.total === 0}
                className="w-full py-2 px-3 rounded-lg bg-[#182233] hover:bg-[#223048] border border-[#344663] text-slate-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Список со ссылками скопирован' : 'Копировать моды и ссылки CF'}
              </button>
              <button
                onClick={() => onSendToChecker(selectedIds)}
                disabled={summaryCounts.total === 0}
                className="w-full py-2 px-3 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                Открыть списком в Чекере
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
