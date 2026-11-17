import { useState } from 'react';
import {
  MOD_PRESETS,
  type ModItem,
  type ModPreset,
  type PresetCategory,
} from '../data/modsData.ts';
import {
  evaluateAssemblyHealth,
  formatAssemblyTreeText,
  getModUpdatedLabel,
  organizeAssemblyTree,
} from '../utils/modLogic.ts';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Wrench,
} from 'lucide-react';

interface PresetsTabProps {
  dbUpdatedAt: string;
  lastSavedDate: string;
  onLoadToChecker: (preset: ModPreset) => void;
  onLoadToBuilder: (preset: ModPreset) => void;
  onOpenDetail: (mod: ModItem) => void;
}

export function PresetsTab({
  dbUpdatedAt,
  lastSavedDate,
  onLoadToChecker,
  onLoadToBuilder,
  onOpenDetail,
}: PresetsTabProps) {
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<'all' | PresetCategory>('all');
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);

  const handleCopyPresetTree = (preset: ModPreset) => {
    const header = `# ${preset.name} (база: ${dbUpdatedAt})`;
    navigator.clipboard.writeText(`${header}\n${formatAssemblyTreeText(preset.modIds, true)}`);
    setCopiedPresetId(preset.id);
    setTimeout(() => setCopiedPresetId(prev => (prev === preset.id ? null : prev)), 1800);
  };

  const visiblePresets = MOD_PRESETS.filter(
    p => presetCategoryFilter === 'all' || p.category === presetCategoryFilter
  );

  return (
    <div className="space-y-4">
      <div className="bg-[#111824] border border-[#2a384e] rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-50 tracking-tight">
              Основные сборки Nvidium и Alloyium ({MOD_PRESETS.length})
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Проверенные связки «Мод → Аддоны и зависимости» на Nvidium (Mesh Shaders) и нативном Alloyium (включая вариант с шейдерами Oculus).
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#0b1019] border border-[#263244] text-[11px] font-mono text-slate-300 tabular-nums whitespace-nowrap">
            База: {dbUpdatedAt} · Сохранено: {lastSavedDate}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#223044]">
          {[
            { k: 'all', label: `Все (${MOD_PRESETS.length})` },
            { k: 'nvidium', label: 'Nvidium (NVIDIA)' },
            { k: 'max', label: 'Alloyium (Forge / AMD / Intel)' },
            { k: 'shaders', label: 'С шейдерами (Alloyium + Oculus)' },
          ].map(cat => (
            <button
              key={cat.k}
              type="button"
              onClick={() => setPresetCategoryFilter(cat.k as 'all' | PresetCategory)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                presetCategoryFilter === cat.k
                  ? 'bg-sky-400 border-sky-400 text-slate-950 font-semibold'
                  : 'bg-[#0b1019] border-[#263244] text-slate-300 hover:text-white hover:border-[#3b4d68]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visiblePresets.map(preset => {
          const treeNodes = organizeAssemblyTree(preset.modIds);
          const parentWithAddons = treeNodes.filter(n => n.children.length > 0);
          const standaloneRoots = treeNodes.filter(n => n.children.length === 0);
          const badgeCls =
            preset.badgeColor === 'emerald'
              ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
              : preset.badgeColor === 'violet' || preset.badgeColor === 'sky'
                ? 'bg-sky-500/15 text-sky-200 border-sky-400/40'
                : preset.badgeColor === 'amber'
                  ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                  : 'bg-rose-500/15 text-rose-200 border-rose-400/40';

          const presetHealth = evaluateAssemblyHealth(preset.modIds);
          const presetRedCount =
            presetHealth.conflicts.length +
            presetHealth.warnings.filter(w => w.severity === 'red').length;
          const presetYellowCount = presetHealth.warnings.filter(w => w.severity === 'yellow').length;

          return (
            <div
              key={preset.id}
              className="bg-[#111824] border border-[#2a384e] rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-50">{preset.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${badgeCls}`}>
                    {preset.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{preset.description}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                  <span>
                    <strong className="text-slate-100">Риск конфликтов:</strong> {preset.crashRisk}
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      presetRedCount > 0
                        ? 'text-rose-300'
                        : presetYellowCount > 0
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    }`}
                  >
                    · Проверка: {presetRedCount} конфл. / {presetYellowCount} замеч. ({preset.modIds.length} модов)
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {parentWithAddons.map((node, idx) => {
                    const pUpdated = getModUpdatedLabel(node.parent);
                    return (
                      <div
                        key={node.parent.id}
                        className="rounded-lg bg-[#0b1019] border border-[#263244] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                              {idx + 1}.
                            </span>
                            <button
                              type="button"
                              onClick={() => onOpenDetail(node.parent)}
                              className="text-xs font-semibold text-slate-50 hover:text-sky-300 text-left transition-colors"
                            >
                              {node.parent.name}
                            </button>
                            {pUpdated && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                обн. {pUpdated}
                              </span>
                            )}
                          </div>
                          <a
                            href={node.parent.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141d2b] hover:bg-[#f16436] border border-[#263244] text-slate-300 hover:text-white text-[10px] font-medium transition-colors"
                            title="CurseForge"
                          >
                            CF
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <div className="ml-2.5 p-2 rounded-md bg-[#101928] border border-[#223044] space-y-1.5">
                          <div className="text-[10px] font-medium text-slate-400">
                            Аддоны и зависимости к нему ({node.children.length}):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {node.children.map(({ mod: ch, relationLabel }) => {
                              const cUpdated = getModUpdatedLabel(ch);
                              return (
                                <div
                                  key={ch.id}
                                  className="inline-flex items-center rounded-md bg-[#0b1019] border border-[#263244] overflow-hidden text-[11px]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => onOpenDetail(ch)}
                                    className="px-2 py-1 text-slate-100 hover:bg-[#192334] transition-colors flex items-center gap-1.5"
                                  >
                                    <span>{ch.name}</span>
                                    <span className="text-[10px] text-sky-300">
                                      · {relationLabel}
                                    </span>
                                    {cUpdated && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({cUpdated})
                                      </span>
                                    )}
                                  </button>
                                  <a
                                    href={ch.curseforgeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-1 text-slate-400 hover:text-[#ff865c] hover:bg-[#192334] border-l border-[#263244] transition-colors"
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
                    <div className="rounded-lg bg-[#0b1019] border border-[#263244] p-3 space-y-1.5">
                      <div className="text-[10px] font-medium text-slate-400">
                        Самостоятельные моды сборки ({standaloneRoots.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {standaloneRoots.map(({ parent: m }, sIdx) => {
                          const mUpdated = getModUpdatedLabel(m);
                          const num = parentWithAddons.length + sIdx + 1;
                          return (
                            <div
                              key={m.id}
                              className="inline-flex items-center rounded-md bg-[#131c2b] border border-[#263244] overflow-hidden text-[11px]"
                            >
                              <button
                                type="button"
                                onClick={() => onOpenDetail(m)}
                                className="px-2 py-1 text-slate-100 hover:bg-[#1b273b] transition-colors flex items-center gap-1"
                              >
                                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                                  {num}.
                                </span>
                                <span>{m.name}</span>
                                {mUpdated && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({mUpdated})
                                  </span>
                                )}
                              </button>
                              <a
                                href={m.curseforgeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-1 text-slate-400 hover:text-[#ff865c] hover:bg-[#1b273b] border-l border-[#263244] transition-colors"
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

              <div className="pt-3 border-t border-[#223044] flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onLoadToChecker(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Проверить в Чекере
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onLoadToBuilder(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b1019] hover:bg-[#182233] border border-[#2a384e] text-slate-100 text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Редактировать в Клипании
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyPresetTree(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b1019] hover:bg-[#182233] border border-[#2a384e] text-slate-200 text-xs font-medium transition-colors whitespace-nowrap ml-auto"
                >
                  {copiedPresetId === preset.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
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
  );
}
