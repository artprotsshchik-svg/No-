import { useMemo, useState } from 'react';
import {
  DATABASE_UPDATED_AT,
  MODS_DATABASE,
  MOD_PRESETS,
  type ModItem,
} from '../data/modsData.ts';
import {
  analyzeSelection,
  formatAssemblyTreeText,
  getCheckerTier,
  getModRestrictionBadge,
  getModUpdatedLabel,
  getRecipeBridgeStatus,
  organizeAssemblyTree,
  shouldHideMod,
  smartFixAssembly,
  type CheckerTier,
} from '../utils/modLogic.ts';
import {
  ExternalLink,
  FolderOpen,
  Search,
  Plus,
  X,
  Copy,
  Check,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  Wand2,
} from 'lucide-react';
import { matchJarFilenamesToMods } from '../utils/jarMatcher.ts';

interface CheckerTabProps {
  checkedModIds: string[];
  setCheckedModIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  onOpenDetail: (mod: ModItem) => void;
}

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

  const rows = useMemo(() => {
    return analysis.selectedMods
      .map(mod => {
        const w = warningMap.get(mod.id);
        const checker = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity);
        const bridge = getRecipeBridgeStatus(mod, checkedSet);
        return {
          mod,
          tier: checker.tier,
          label: checker.label,
          reason: w?.messages[0] || checker.reason,
          viaBridge: bridge.compatible ? bridge.viaBridge : undefined,
        };
      })
      .sort((a, b) => {
        const order: Record<CheckerTier, number> = { red: 0, yellow: 1, lime: 2, green: 3 };
        return order[a.tier] - order[b.tier] || a.mod.name.localeCompare(b.mod.name, 'ru');
      });
  }, [analysis.selectedMods, analysis.conflictingIdSet, warningMap, checkedSet]);

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

  const handleCopyList = () => {
    const text =
      viewMode === 'tree'
        ? `# Сборка (обновлено: ${DATABASE_UPDATED_AT})\n${formatAssemblyTreeText(checkedModIds, true)}`
        : (() => {
            const tagMap: Record<CheckerTier, string> = { green: 'OK', lime: 'GOOD', yellow: 'WARN', red: 'BAD' };
            return rows
              .map(r => `[${tagMap[r.tier]}] ${r.mod.name} — ${r.mod.curseforgeUrl}`)
              .join('\n');
          })();
    navigator.clipboard.writeText(text);
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

  return (
    <div className="space-y-4">
      {/* Top compact bar: presets & summary counts */}
      <div className="bg-[#111824] border border-[#2a384e] rounded-xl p-4 space-y-3.5 shadow-lg shadow-black/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-50 tracking-tight">Чекер сборки</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Зелёный — лидер · Салатовый — сносно без конфликтов · Жёлтый — условно / через прослойку · Красный — конфликт или плацебо.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {window.desktopAPI?.isDesktop && (
              <button
                onClick={handleScanDesktopFolder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-100 transition-colors whitespace-nowrap"
              >
                <FolderOpen className="w-3.5 h-3.5 text-sky-300" />
                Папка mods
              </button>
            )}
            {hasAnyIssues && (
              <button
                onClick={() => setCheckedModIds(smartFixAssembly(checkedModIds))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-colors whitespace-nowrap"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Исправить автоматически
              </button>
            )}
            <button
              onClick={handleCopyList}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#182233] hover:bg-[#212f46] border border-[#344663] text-slate-100 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {copiedList ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedList ? 'Скопировано' : 'Копировать список'}
            </button>
            <button
              onClick={() => setCheckedModIds([])}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#182233] hover:bg-rose-500/20 border border-[#344663] hover:border-rose-400/50 text-slate-200 hover:text-rose-200 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить
            </button>
          </div>
        </div>

        {/* Preset quick-load buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Основные пресеты:</span>
          {MOD_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setCheckedModIds([...preset.modIds])}
              className="px-2.5 py-1 rounded-md text-xs font-medium border bg-[#0b1019] border-[#253348] text-slate-200 hover:border-sky-400/60 hover:bg-[#162030] hover:text-white transition-colors whitespace-nowrap"
            >
              {preset.name.split('(')[0].trim()}
            </button>
          ))}
        </div>

        {/* 4-tier filter counters + Add mod search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[#243044]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums transition-colors whitespace-nowrap ${
                tierFilter === 'all'
                  ? 'bg-sky-400 text-slate-950'
                  : 'bg-[#0b1019] border border-[#253348] text-slate-300 hover:text-white'
              }`}
            >
              Все ({counts.total})
            </button>
            <button
              onClick={() => setTierFilter('green')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'green'
                  ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400/60'
                  : 'bg-[#0b1019] border-[#253348] text-emerald-300 hover:border-emerald-400/50'
              }`}
            >
              Гарантировано ({counts.green})
            </button>
            <button
              onClick={() => setTierFilter('lime')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'lime'
                  ? 'bg-lime-500/25 text-lime-100 border-lime-400/60'
                  : 'bg-[#0b1019] border-[#253348] text-lime-300 hover:border-lime-400/50'
              }`}
            >
              Сносно ({counts.lime})
            </button>
            <button
              onClick={() => setTierFilter('yellow')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'yellow'
                  ? 'bg-amber-500/25 text-amber-100 border-amber-400/60'
                  : 'bg-[#0b1019] border-[#253348] text-amber-300 hover:border-amber-400/50'
              }`}
            >
              Условно ({counts.yellow})
            </button>
            <button
              onClick={() => setTierFilter('red')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'red'
                  ? 'bg-rose-500/25 text-rose-100 border-rose-400/60'
                  : 'bg-[#0b1019] border-[#253348] text-rose-300 hover:border-rose-400/50'
              }`}
            >
              Конфликт / плацебо ({counts.red})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#0b1019] border border-[#253348] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'tree' ? 'bg-[#1d2a3f] text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Мод → Аддоны
              </button>
              <button
                onClick={() => setViewMode('status')}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  viewMode === 'status' ? 'bg-[#1d2a3f] text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                По статусу
              </button>
            </div>

            <button
              onClick={() => setHideIncompatibleSuggestions(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                hideIncompatibleSuggestions
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-100'
                  : 'bg-[#0b1019] border-[#253348] text-slate-300 hover:text-white'
              }`}
              title="Скрывать несовместимые с текущим списком, нерабочие на Forge и полностью перекрытые моды"
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
                className="w-full pl-8 pr-3 py-1.5 bg-[#0b1019] border border-[#2a384e] rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:border-sky-400"
              />
              {addSuggestions.length > 0 && (
                <div className="absolute right-0 left-0 top-full mt-1 z-30 bg-[#141d2c] border border-[#364966] rounded-lg shadow-2xl divide-y divide-[#223044] max-h-64 overflow-y-auto">
                  {addSuggestions.map(s => {
                    const restriction = getModRestrictionBadge(s, checkedSet);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCheckedModIds(prev => (prev.includes(s.id) ? prev : [...prev, s.id]));
                          setAddSearch('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#1c283c] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-100 truncate">{s.name}</div>
                          <div className="text-[10px] text-slate-300 truncate">
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
                              `${s.statusLabel} · ${s.platform}`
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
          className={`bg-[#111824] border rounded-xl p-4 space-y-2.5 ${
            analysis.conflicts.length > 0 || redWarnings.length > 0 ? 'border-rose-400/50' : 'border-amber-400/45'
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
                : `Обнаружены лишние или перекрытые моды (${yellowWarnings.length})`}
            </div>
          </div>
          <div className="space-y-2">
            {analysis.conflicts.map((c, idx) => (
              <div key={idx} className="bg-rose-500/[0.06] border border-rose-500/20 rounded-md p-3 text-xs space-y-1">
                <div className="font-semibold text-rose-200">
                  {c.rule.title}: <span className="text-zinc-100">{c.matchedNames.join(' + ')}</span>
                </div>
                <p className="text-zinc-300">{c.rule.explanation}</p>
                <p className="text-emerald-300 font-medium">Решение: {c.rule.recommendation}</p>
              </div>
            ))}
            {redWarnings.map((w, idx) => (
              <div key={`rw-${idx}`} className="bg-rose-500/[0.06] border border-rose-500/20 rounded-md p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-rose-200">{w.message}</span>
                {w.fixModIds && (
                  <button
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  >
                    Добавить нужное
                  </button>
                )}
              </div>
            ))}
            {yellowWarnings.map((w, idx) => (
              <div key={`yw-${idx}`} className="bg-amber-500/[0.06] border border-amber-500/20 rounded-md p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-amber-200">{w.message}</span>
                {w.fixModIds && (
                  <button
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded bg-[#181b21] hover:bg-[#232833] border border-[#2b313c] text-amber-200 font-medium"
                  >
                    Добавить базу
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact Vertical List */}
      <div className="bg-[#111824] border border-[#2a384e] rounded-xl overflow-hidden shadow-lg shadow-black/25">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Список пуст. Загрузите готовый пресет выше или добавьте моды через поиск.
          </div>
        ) : (
          <div className="divide-y divide-[#202c3e]">
            {displayRows.map(({ row: { mod, tier, label, reason, viaBridge }, isChild, relationLabel, rootIndex, childCount }) => {
              const updatedLabel = getModUpdatedLabel(mod);
              const rowAccent =
                tier === 'green'
                  ? 'hover:bg-white/[0.03]'
                  : tier === 'lime'
                    ? 'bg-lime-500/[0.03] hover:bg-lime-500/[0.06]'
                    : tier === 'yellow'
                      ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]'
                      : 'bg-rose-500/[0.05] hover:bg-rose-500/[0.08]';
              const badgeCls =
                tier === 'green'
                  ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                  : tier === 'lime'
                    ? 'bg-lime-500/15 text-lime-200 border-lime-400/40'
                    : tier === 'yellow'
                      ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                      : 'bg-rose-500/20 text-rose-200 border-rose-400/50';
              const Icon =
                tier === 'green' || tier === 'lime'
                  ? CheckCircle2
                  : tier === 'yellow'
                    ? AlertTriangle
                    : ShieldAlert;

              return (
                <div
                  key={mod.id}
                  className={`py-2.5 flex items-center justify-between gap-3 transition-colors ${rowAccent} ${
                    isChild ? 'pl-10 pr-4 bg-[#0d1420]' : 'px-4'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {!isChild && rootIndex !== undefined && (
                      <span className="text-[11px] font-mono text-slate-400 w-5 text-right shrink-0 tabular-nums">
                        {rootIndex}.
                      </span>
                    )}
                    {isChild && (
                      <span className="text-xs font-mono text-sky-400 w-5 text-right shrink-0">
                        ↳
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border shrink-0 w-40 justify-center ${badgeCls}`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      {label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <button
                          onClick={() => onOpenDetail(mod)}
                          className="text-sm font-semibold text-slate-50 hover:text-sky-300 text-left truncate"
                        >
                          {mod.name}
                        </button>
                        {isChild && relationLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/35 text-sky-200 font-medium">
                            {relationLabel}
                          </span>
                        )}
                        {!isChild && childCount !== undefined && childCount > 0 && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            +{childCount} аддонов
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">{mod.platform}</span>
                        {updatedLabel && (
                          <span className="text-[11px] text-slate-400 font-mono">· обн. {updatedLabel}</span>
                        )}
                        {viaBridge && (
                          <span className="text-[11px] text-sky-300 font-medium">{viaBridge}</span>
                        )}
                      </div>
                      {tier !== 'green' && (
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            tier === 'red'
                              ? 'text-rose-200'
                              : tier === 'lime'
                                ? 'text-lime-200/90'
                                : 'text-amber-200/90'
                          }`}
                        >
                          {reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={mod.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#182233] hover:bg-[#f16436] border border-[#344663] hover:border-[#f16436] text-slate-200 hover:text-white transition-colors"
                      title="Открыть на CurseForge"
                    >
                      CurseForge
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => setCheckedModIds(prev => prev.filter(id => id !== mod.id))}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors"
                      title="Убрать из списка"
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
