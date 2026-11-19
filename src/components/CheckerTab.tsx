import { useMemo, useState } from 'react';
import {
  MODS_DATABASE,
  MOD_PRESETS,
  type ModItem,
} from '../data/modsData.ts';
import {
  analyzeSelection,
  evaluateModImpactInPack,
  getCheckerTier,
  getModRestrictionBadge,
  getModUpdatedLabel,
  getRecipeBridgeStatus,
  organizeAssemblyTree,
  shouldHideMod,
  smartFixAssembly,
  summarizeAssemblyImpact,
  type CheckerTier,
  type ModImpactLevel,
} from '../utils/modLogic.ts';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { matchJarFilenamesToMods } from '../utils/jarMatcher.ts';

interface CheckerTabProps {
  checkedModIds: string[];
  setCheckedModIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  onOpenDetail: (mod: ModItem) => void;
}

const MOD_BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

export function CheckerTab({ checkedModIds, setCheckedModIds, onOpenDetail }: CheckerTabProps) {
  const [tierFilter, setTierFilter] = useState<'all' | CheckerTier>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'status'>('tree');
  const [addSearch, setAddSearch] = useState('');
  const [hideIncompatibleSuggestions, setHideIncompatibleSuggestions] = useState(true);
  const [copiedList, setCopiedList] = useState(false);

  const checkedSet = useMemo(() => new Set(checkedModIds), [checkedModIds]);
  const analysis = useMemo(() => analyzeSelection(checkedModIds), [checkedModIds]);

  const warningMap = useMemo(() => {
    const map = new Map<string, { severity: 'red' | 'yellow'; messages: string[] }>();
    for (const w of analysis.warnings) {
      const prev = map.get(w.modId);
      const sev = prev?.severity === 'red' || w.severity === 'red' ? 'red' : 'yellow';
      const msgs = prev ? [...prev.messages, w.message] : [w.message];
      map.set(w.modId, { severity: sev, messages: msgs });
    }
    return map;
  }, [analysis.warnings]);

  const impactSummary = useMemo(
    () => summarizeAssemblyImpact(checkedModIds, analysis),
    [checkedModIds, analysis]
  );

  const rows = useMemo(() => {
    return analysis.selectedMods
      .map(mod => {
        const w = warningMap.get(mod.id);
        const checker = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity);
        const bridge = getRecipeBridgeStatus(mod, checkedSet);
        const impact = evaluateModImpactInPack(mod, checkedSet, analysis);
        return {
          mod,
          tier: checker.tier,
          label: checker.label,
          reason: w?.messages[0] || checker.reason,
          viaBridge: bridge.compatible ? bridge.viaBridge : undefined,
          impact,
        };
      })
      .sort((a, b) => {
        const order: Record<CheckerTier, number> = { red: 0, yellow: 1, lime: 2, green: 3 };
        return order[a.tier] - order[b.tier] || a.mod.name.localeCompare(b.mod.name, 'ru');
      });
  }, [analysis, warningMap, checkedSet]);

  const counts = useMemo(() => {
    let green = 0;
    let lime = 0;
    let yellow = 0;
    let red = 0;
    for (const r of rows) {
      if (r.tier === 'green') green++;
      else if (r.tier === 'lime') lime++;
      else if (r.tier === 'yellow') yellow++;
      else red++;
    }
    return { green, lime, yellow, red, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (tierFilter === 'all') return rows;
    return rows.filter(r => r.tier === tierFilter);
  }, [rows, tierFilter]);

  const addSuggestions = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return [];
    return MODS_DATABASE.filter(m => {
      if (checkedSet.has(m.id)) return false;
      const matches =
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.bestAlternative && m.bestAlternative.toLowerCase().includes(q)) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(q)));
      if (!matches) return false;
      if (
        hideIncompatibleSuggestions &&
        shouldHideMod(m, checkedSet, undefined, { hideIncompatible: true, hideUselessCovered: true })
      ) {
        return false;
      }
      return true;
    }).slice(0, 8);
  }, [addSearch, checkedSet, hideIncompatibleSuggestions]);

  const rowByModId = useMemo(() => new Map(rows.map(r => [r.mod.id, r])), [rows]);

  const hierarchicalRows = useMemo(() => {
    const filteredIds = filteredRows.map(r => r.mod.id);
    const tree = organizeAssemblyTree(filteredIds);
    const out: Array<{
      row: (typeof rows)[number];
      isChild: boolean;
      relationLabel?: string;
      rootIndex?: number;
      childCount?: number;
    }> = [];
    tree.forEach((node, idx) => {
      const parentRow = rowByModId.get(node.parent.id);
      if (parentRow) {
        out.push({
          row: parentRow,
          isChild: false,
          rootIndex: idx + 1,
          childCount: node.children.length,
        });
      }
      for (const ch of node.children) {
        const childRow = rowByModId.get(ch.mod.id);
        if (childRow) {
          out.push({
            row: childRow,
            isChild: true,
            relationLabel: ch.relationLabel,
          });
        }
      }
    });
    return out;
  }, [filteredRows, rowByModId]);

  const displayRows = useMemo(() => {
    if (viewMode === 'tree') return hierarchicalRows;
    return filteredRows.map(row => ({
      row,
      isChild: false,
      relationLabel: undefined as string | undefined,
      rootIndex: undefined as number | undefined,
      childCount: undefined as number | undefined,
    }));
  }, [viewMode, hierarchicalRows, filteredRows]);

  const handleCopyNamesList = () => {
    const tree = organizeAssemblyTree(checkedModIds);
    const orderedNames: string[] = [];
    const seen = new Set<string>();
    for (const node of tree) {
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
    for (const id of checkedModIds) {
      if (!seen.has(id)) {
        const m = MOD_BY_ID.get(id);
        if (m) {
          seen.add(id);
          orderedNames.push(m.name);
        }
      }
    }
    navigator.clipboard.writeText(orderedNames.join('\n'));
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 1800);
  };

  const handleScanDesktopFolder = async () => {
    if (!window.desktopAPI?.scanModsFolder) return;
    const res = await window.desktopAPI.scanModsFolder();
    if (res.canceled) return;
    const { matchedIds } = matchJarFilenamesToMods(res.jarFiles);
    if (matchedIds.length > 0) {
      setCheckedModIds(matchedIds);
    }
  };

  const redWarnings = analysis.warnings.filter(w => w.severity === 'red');
  const yellowWarnings = analysis.warnings.filter(w => w.severity === 'yellow');
  const hasAnyIssues = analysis.conflicts.length > 0 || analysis.warnings.length > 0;

  const hw = impactSummary.hardwareSummary;
  const formatModNames = (ids: string[]) => ids.map(id => MOD_BY_ID.get(id)?.name || id).join(', ');

  return (
    <div className="space-y-4">
      {/* Top Bar: Actions, Presets, Tier Filter */}
      <div className="bg-[#121620] border border-[#1f2534] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Основные сборки:</span>
            {MOD_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCheckedModIds([...preset.modIds])}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-[#0a0c12] border-[#1f2534] text-slate-200 hover:border-sky-400/50 hover:bg-[#181d2a] hover:text-white transition-colors whitespace-nowrap"
              >
                {preset.name.split('(')[0].trim()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {window.desktopAPI?.isDesktop && (
              <button
                type="button"
                onClick={handleScanDesktopFolder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/45 text-sky-100 transition-colors whitespace-nowrap"
              >
                <FolderOpen className="w-3.5 h-3.5 text-sky-300" />
                Папка mods
              </button>
            )}
            {hasAnyIssues && (
              <button
                type="button"
                onClick={() => setCheckedModIds(smartFixAssembly(checkedModIds))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Исправить автоматически
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyNamesList}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {copiedList ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedList ? 'Список скопирован' : 'Копировать списком'}
            </button>
            <button
              type="button"
              onClick={() => setCheckedModIds([])}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0a0c12] hover:bg-rose-500/15 border border-[#2e364a] hover:border-rose-500/45 text-slate-200 hover:text-rose-200 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить
            </button>
          </div>
        </div>

        {/* 4-tier filter counters + Add mod search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[#191f2d]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums transition-colors whitespace-nowrap ${
                tierFilter === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-[#0a0c12] border border-[#1f2534] text-slate-300 hover:text-white'
              }`}
            >
              Все ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('green')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'green'
                  ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/50'
                  : 'bg-[#0a0c12] border-[#1f2534] text-emerald-300 hover:border-emerald-400/45'
              }`}
            >
              Стабильно ({counts.green})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('lime')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'lime'
                  ? 'bg-lime-500/20 text-lime-100 border-lime-400/50'
                  : 'bg-[#0a0c12] border-[#1f2534] text-lime-300 hover:border-lime-400/45'
              }`}
            >
              Сносно ({counts.lime})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('yellow')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'yellow'
                  ? 'bg-amber-500/20 text-amber-100 border-amber-400/50'
                  : 'bg-[#0a0c12] border-[#1f2534] text-amber-300 hover:border-amber-400/45'
              }`}
            >
              Условно ({counts.yellow})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('red')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'red'
                  ? 'bg-rose-500/20 text-rose-100 border-rose-400/50'
                  : 'bg-[#0a0c12] border-[#1f2534] text-rose-300 hover:border-rose-400/45'
              }`}
            >
              Конфликт / плацебо ({counts.red})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#0a0c12] border border-[#1f2534] rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'tree' ? 'bg-[#1d2536] text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Дерево
              </button>
              <button
                type="button"
                onClick={() => setViewMode('status')}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'status' ? 'bg-[#1d2536] text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                По статусу
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHideIncompatibleSuggestions(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                hideIncompatibleSuggestions
                  ? 'bg-sky-500/12 border-sky-400/45 text-sky-100'
                  : 'bg-[#0a0c12] border-[#1f2534] text-slate-300 hover:text-white'
              }`}
              title="Скрывать несовместимые с текущим списком, нерабочие на Forge и перекрытые моды"
            >
              {hideIncompatibleSuggestions ? <EyeOff className="w-3.5 h-3.5 text-sky-300" /> : <Eye className="w-3.5 h-3.5" />}
              {hideIncompatibleSuggestions ? 'Только совм.' : 'Все в поиске'}
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Добавить мод по названию..."
                aria-label="Добавить мод по названию"
                className="w-full pl-8 pr-3 py-1.5 bg-[#0a0c12] border border-[#1f2534] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400"
              />
              {addSuggestions.length > 0 && (
                <div className="absolute right-0 left-0 top-full mt-1 z-30 bg-[#121620] border border-[#2e364a] rounded-lg shadow-2xl divide-y divide-[#191f2d] max-h-64 overflow-y-auto">
                  {addSuggestions.map(s => {
                    const restriction = getModRestrictionBadge(s, checkedSet);
                    const addImpact = evaluateModImpactInPack(s, checkedSet, analysis);
                    const addPct = addImpact.relativeImpactPct > 0 ? `+${addImpact.relativeImpactPct}%` : `${addImpact.relativeImpactPct}%`;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCheckedModIds(prev => (prev.includes(s.id) ? prev : [...prev, s.id]));
                          setAddSearch('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#1a2030] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-slate-100 truncate">{s.name}</span>
                            <span
                              className={`text-[10px] font-mono font-semibold tabular-nums shrink-0 ${
                                addImpact.relativeImpactPct > 0
                                  ? 'text-emerald-300'
                                  : addImpact.relativeImpactPct < 0
                                    ? 'text-rose-300'
                                    : 'text-slate-400'
                              }`}
                            >
                              {addPct} · {addImpact.impactPoints}б.
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {restriction ? (
                              <span
                                className={
                                  restriction.tone === 'red'
                                    ? 'text-rose-300'
                                    : restriction.tone === 'amber'
                                      ? 'text-amber-300'
                                      : 'text-sky-300'
                                }
                              >
                                {restriction.text}
                              </span>
                            ) : (
                              `${addImpact.resourceProfile.shortTag} · ${s.platform}`
                            )}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Conflict / Dependency / Superseded explanation banner */}
      {hasAnyIssues && (
        <div
          className={`bg-[#121620] border rounded-xl p-4 space-y-2.5 ${
            analysis.conflicts.length > 0 || redWarnings.length > 0 ? 'border-rose-500/45' : 'border-amber-400/45'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                analysis.conflicts.length > 0 || redWarnings.length > 0 ? 'text-rose-300' : 'text-amber-300'
              }`}
            >
              {analysis.conflicts.length > 0 || redWarnings.length > 0 ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              {analysis.conflicts.length > 0 || redWarnings.length > 0
                ? `Обнаружены конфликты и ошибки (${analysis.conflicts.length + redWarnings.length})`
                : `Замечания и условные моды (${yellowWarnings.length})`}
            </div>
          </div>
          <div className="space-y-2">
            {analysis.conflicts.map((c, idx) => (
              <div key={idx} className="bg-rose-500/[0.06] border border-rose-500/25 rounded-lg p-3 text-xs space-y-1">
                <div className="font-semibold text-rose-200">
                  {c.rule.title}: <span className="text-white">{c.matchedNames.join(' + ')}</span>
                </div>
                <p className="text-slate-300">{c.rule.explanation}</p>
                <p className="text-emerald-300 font-medium">Решение: {c.rule.recommendation}</p>
              </div>
            ))}
            {redWarnings.map((w, idx) => (
              <div key={`rw-${idx}`} className="bg-rose-500/[0.06] border border-rose-500/25 rounded-lg p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-rose-200">{w.message}</span>
                {w.fixModIds && (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  >
                    Добавить нужное
                  </button>
                )}
              </div>
            ))}
            {yellowWarnings.map((w, idx) => (
              <div key={`yw-${idx}`} className="bg-amber-500/[0.06] border border-amber-400/25 rounded-lg p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-amber-200">{w.message}</span>
                {w.fixModIds && (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded-md bg-[#181d2a] hover:bg-[#22293b] border border-[#2e364a] text-amber-200 font-medium"
                  >
                    Добавить базу
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Impact & Hardware Load Summary Bar */}
      {rows.length > 0 && (
        <div className="bg-[#121620] border border-[#1f2534] rounded-xl px-4 py-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-slate-300">
                Оценка: <strong className="text-sky-300 font-mono font-semibold tabular-nums">{impactSummary.assemblyScore}/100 б.</strong>
              </span>
              <span className="text-slate-300">
                Подсистемы: <strong className="text-slate-100 font-semibold tabular-nums">{impactSummary.coveredSubsystems.length}/7</strong>
                <span className="text-slate-400 ml-1 tabular-nums">({impactSummary.coveragePct}%)</span>
                {impactSummary.missingSubsystems.length > 0 && (
                  <span className="text-amber-300/90 ml-1.5">· нет: {impactSummary.missingSubsystems.slice(0, 2).join(', ')}</span>
                )}
              </span>
              <span className="text-slate-300">
                Синергии: <strong className="text-emerald-300 font-semibold tabular-nums">{impactSummary.synergies.length}</strong>
              </span>
              {(impactSummary.overlaps.length > 0 || impactSummary.zeroOrLowImpactIds.length > 0) && (
                <span className="text-amber-200">
                  Пересечения / 0%: <strong className="font-semibold tabular-nums">{impactSummary.overlaps.length + impactSummary.zeroOrLowImpactIds.length}</strong>
                </span>
              )}
            </div>
            {impactSummary.networkOnlyIds.length > 0 && (
              <span className="text-[11px] text-slate-400">
                Онлайн-онли: {impactSummary.networkOnlyIds.length} (в соло ~0%)
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-[#191f2d] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <span className="text-slate-400 font-medium">Нагрузка ПК:</span>
            <span
              className={hw.highGpuIds.length > 0 ? 'text-amber-300 font-medium' : 'text-slate-400'}
              title={hw.highGpuIds.length > 0 ? formatModNames(hw.highGpuIds) : 'Повышенной нагрузки на GPU нет'}
            >
              GPU ↑ ({hw.highGpuIds.length})
              {hw.highGpuIds.length > 0 && <span className="text-slate-400 font-normal"> · {formatModNames(hw.highGpuIds)}</span>}
            </span>
            <span
              className={hw.highVramIds.length > 0 ? 'text-amber-300 font-medium' : 'text-slate-400'}
              title={hw.highVramIds.length > 0 ? formatModNames(hw.highVramIds) : 'Повышенного расхода VRAM нет'}
            >
              VRAM ↑ ({hw.highVramIds.length})
              {hw.highVramIds.length > 0 && <span className="text-slate-400 font-normal"> · {formatModNames(hw.highVramIds)}</span>}
            </span>
            <span
              className={hw.highCpuIds.length > 0 ? 'text-amber-300 font-medium' : 'text-slate-400'}
              title={hw.highCpuIds.length > 0 ? formatModNames(hw.highCpuIds) : 'Повышенной нагрузки на CPU нет'}
            >
              CPU ↑ ({hw.highCpuIds.length})
              {hw.highCpuIds.length > 0 && <span className="text-slate-400 font-normal"> · {formatModNames(hw.highCpuIds)}</span>}
            </span>
            <span
              className={hw.ramSaverIds.length > 0 ? 'text-emerald-300 font-medium' : 'text-slate-400'}
              title={hw.ramSaverIds.length > 0 ? formatModNames(hw.ramSaverIds) : ''}
            >
              ОЗУ ↓ ({hw.ramSaverIds.length})
            </span>
          </div>
        </div>
      )}

      {/* Compact Vertical List (Zero border-l-2 stripes & Zero pill clutter) */}
      <div className="bg-[#121620] border border-[#1f2534] rounded-xl overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Список пуст. Загрузите сборку выше или добавьте моды через поиск.
          </div>
        ) : (
          <div className="divide-y divide-[#191f2d]">
            {displayRows.map(({ row: { mod, tier, label, reason, viaBridge, impact }, isChild, relationLabel, rootIndex, childCount }) => {
              const updatedLabel = getModUpdatedLabel(mod);
              const rp = impact.resourceProfile;
              const impactColorMap: Record<ModImpactLevel, string> = {
                core: 'text-sky-300',
                high: 'text-emerald-300',
                medium: 'text-slate-300',
                conditional: 'text-amber-300',
                support: 'text-slate-400',
                diagnostic: 'text-slate-400',
                zero: 'text-amber-300',
                negative: 'text-rose-300',
              };
              const relPctText = impact.relativeImpactPct > 0 ? `+${impact.relativeImpactPct}%` : `${impact.relativeImpactPct}%`;
              const primaryInteraction = impact.interactions.find(i => i.kind === 'overlap' || i.kind === 'conflict' || i.kind === 'synergy');
              const showContextSubline =
                tier !== 'green' ||
                impact.level === 'zero' ||
                impact.level === 'support' ||
                impact.level === 'conditional' ||
                Boolean(impact.betterAnalogName) ||
                Boolean(primaryInteraction) ||
                rp.hasTradeoff;
              const sublineText =
                tier === 'red'
                  ? reason
                  : impact.betterAnalogName && impact.betterAnalogDeltaPoints
                    ? `${impact.summary} · Лучше: ${impact.betterAnalogName} (+${impact.betterAnalogDeltaPoints} б.)`
                    : tier === 'yellow' || impact.level === 'zero' || primaryInteraction?.kind === 'overlap'
                      ? impact.summary
                      : primaryInteraction?.summary || rp.tradeoffNote;

              const rowBg =
                tier === 'red'
                  ? 'bg-rose-500/[0.05] hover:bg-rose-500/[0.08]'
                  : tier === 'yellow'
                    ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]'
                    : isChild
                      ? 'bg-[#0a0c12] hover:bg-[#141926]'
                      : 'hover:bg-[#171d2b]';

              const dotCls =
                tier === 'green'
                  ? 'bg-emerald-400'
                  : tier === 'lime'
                    ? 'bg-lime-400'
                    : tier === 'yellow'
                      ? 'bg-amber-400'
                      : 'bg-rose-500';
              const statusTextCls =
                tier === 'green'
                  ? 'text-emerald-300'
                  : tier === 'lime'
                    ? 'text-lime-300'
                    : tier === 'yellow'
                      ? 'text-amber-300'
                      : 'text-rose-300';

              return (
                <div
                  key={mod.id}
                  className={`py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 transition-colors ${rowBg} ${
                    isChild ? 'pl-6 sm:pl-10 pr-4' : 'px-4'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {!isChild && rootIndex !== undefined && (
                      <span className="text-[11px] font-mono text-slate-500 w-5 text-right shrink-0 tabular-nums mt-0.5 sm:mt-0">
                        {rootIndex}.
                      </span>
                    )}
                    {isChild && (
                      <span className="text-xs font-mono text-sky-400 w-4 sm:w-5 text-right shrink-0 mt-0.5 sm:mt-0">
                        ↳
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                        <span className={`inline-flex items-center gap-1.5 font-semibold shrink-0 ${statusTextCls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
                          {label}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => onOpenDetail(mod)}
                          className="text-sm font-semibold text-slate-50 hover:text-sky-300 text-left break-words"
                        >
                          {mod.name}
                        </button>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className={`text-[11px] font-mono font-semibold tabular-nums ${impactColorMap[impact.level]}`}>
                          {impact.label} · {relPctText} ({impact.impactPoints} б.)
                        </span>
                        {rp.hasTradeoff && (
                          <span
                            className="text-[11px] text-amber-300 font-medium"
                            title={rp.tradeoffNote}
                          >
                            · {rp.shortTag}
                          </span>
                        )}
                        {isChild && relationLabel && (
                          <span className="text-[11px] text-sky-300 font-medium">
                            · {relationLabel}
                          </span>
                        )}
                        {!isChild && childCount !== undefined && childCount > 0 && (
                          <span className="text-[11px] text-slate-400">
                            · +{childCount} аддонов
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">· {mod.platform}</span>
                        {updatedLabel && (
                          <span className="text-[11px] text-slate-500 font-mono">· {updatedLabel}</span>
                        )}
                        {viaBridge && (
                          <span className="text-[11px] text-sky-300 font-medium">· {viaBridge}</span>
                        )}
                      </div>
                      {showContextSubline && (
                        <p
                          className={`text-xs mt-0.5 break-words sm:truncate ${
                            tier === 'red'
                              ? 'text-rose-200'
                              : tier === 'yellow' || impact.level === 'zero' || primaryInteraction?.kind === 'overlap'
                                ? 'text-amber-200/90'
                                : primaryInteraction?.kind === 'synergy'
                                  ? 'text-emerald-200/85'
                                  : 'text-slate-400'
                          }`}
                        >
                          {sublineText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                    <a
                      href={mod.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#0a0c12] hover:bg-[#f16436] border border-[#1f2534] hover:border-[#f16436] text-slate-200 hover:text-white transition-colors"
                      title="Открыть на CurseForge"
                    >
                      CF
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setCheckedModIds(prev => prev.filter(id => id !== mod.id))}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors"
                      title="Убрать из списка"
                      aria-label={`Убрать ${mod.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
