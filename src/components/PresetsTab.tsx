import { useState } from 'react';
import {
  MODS_DATABASE,
  MOD_PRESETS,
  type ModItem,
  type ModPreset,
} from '../data/modsData.ts';
import {
  evaluateAssemblyHealth,
  getModUpdatedLabel,
  organizeAssemblyTree,
  summarizeAssemblyImpact,
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
  onLoadToChecker: (preset: ModPreset) => void;
  onLoadToBuilder: (preset: ModPreset) => void;
  onOpenDetail: (mod: ModItem) => void;
}

const MOD_BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

export function PresetsTab({
  dbUpdatedAt,
  onLoadToChecker,
  onLoadToBuilder,
  onOpenDetail,
}: PresetsTabProps) {
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);

  const handleCopyNamesList = (preset: ModPreset) => {
    const treeNodes = organizeAssemblyTree(preset.modIds);
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
    for (const id of preset.modIds) {
      if (!seen.has(id)) {
        const m = MOD_BY_ID.get(id);
        if (m) {
          seen.add(id);
          orderedNames.push(m.name);
        }
      }
    }
    navigator.clipboard.writeText(orderedNames.join('\n'));
    setCopiedPresetId(preset.id);
    setTimeout(() => setCopiedPresetId(prev => (prev === preset.id ? null : prev)), 1800);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#121620] border border-[#1f2534] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-50 tracking-tight">
            Основные сборки ({MOD_PRESETS.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Две проверенные конфигурации для Forge 1.20.1: NVIDIA (Nvidium + Emberbium) и универсальная (Alloyium + Embeddium).
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
          База: <strong className="text-slate-200">{dbUpdatedAt}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOD_PRESETS.map(preset => {
          const treeNodes = organizeAssemblyTree(preset.modIds);
          const parentWithAddons = treeNodes.filter(n => n.children.length > 0);
          const standaloneRoots = treeNodes.filter(n => n.children.length === 0);
          const badgeTone =
            preset.badgeColor === 'emerald' ? 'text-emerald-300' : 'text-sky-300';

          const presetHealth = evaluateAssemblyHealth(preset.modIds);
          const presetSummary = summarizeAssemblyImpact(preset.modIds, presetHealth);
          const presetRedCount =
            presetHealth.conflicts.length +
            presetHealth.warnings.filter(w => w.severity === 'red').length;
          const presetYellowCount = presetHealth.warnings.filter(w => w.severity === 'yellow').length;

          const gpuVramNames = Array.from(
            new Set([
              ...presetSummary.hardwareSummary.highGpuIds,
              ...presetSummary.hardwareSummary.highVramIds,
            ])
          )
            .map(id => MOD_BY_ID.get(id)?.name || id)
            .slice(0, 3);
          const ramSaverNames = presetSummary.hardwareSummary.ramSaverIds
            .map(id => MOD_BY_ID.get(id)?.name || id)
            .slice(0, 3);

          return (
            <div
              key={preset.id}
              className="bg-[#121620] border border-[#1f2534] rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-50">{preset.name}</h3>
                  <span className={`text-xs font-semibold ${badgeTone}`}>{preset.badge}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{preset.description}</p>

                {/* Crisp Stats & Resource Balance */}
                <div className="rounded-lg bg-[#0a0c12] border border-[#1f2534] px-3.5 py-2.5 space-y-1.5 text-[11px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300 tabular-nums">
                    <span>
                      Оценка: <strong className="text-sky-300 font-mono">{presetSummary.assemblyScore}/100 б.</strong>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>
                      Подсистемы: <strong className="text-slate-100">{presetSummary.coveredSubsystems.length}/7</strong>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span
                      className={`font-semibold ${
                        presetRedCount > 0
                          ? 'text-rose-400'
                          : presetYellowCount > 0
                            ? 'text-amber-300'
                            : 'text-emerald-400'
                      }`}
                    >
                      {presetRedCount} конфл. / {presetYellowCount} замеч. ({preset.modIds.length} модов)
                    </span>
                  </div>
                  <div className="text-slate-400">
                    <strong className="text-slate-200">Риск:</strong> {preset.crashRisk}
                  </div>
                  {(gpuVramNames.length > 0 || ramSaverNames.length > 0) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-[#191f2d]">
                      {gpuVramNames.length > 0 && (
                        <span className="text-amber-300">
                          GPU/VRAM ↑: {gpuVramNames.join(', ')}
                        </span>
                      )}
                      {ramSaverNames.length > 0 && (
                        <span className="text-emerald-300">
                          ОЗУ ↓: {ramSaverNames.join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Clean Hierarchical List without Boxed Mini-Pills */}
                <div className="divide-y divide-[#191f2d] border border-[#1f2534] rounded-lg bg-[#0a0c12] max-h-[380px] overflow-y-auto">
                  {parentWithAddons.map((node, idx) => {
                    const pUpdated = getModUpdatedLabel(node.parent);
                    return (
                      <div key={node.parent.id} className="px-3.5 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
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
                              <span className="text-[10px] text-slate-500 font-mono">
                                · {pUpdated}
                              </span>
                            )}
                          </div>
                          <a
                            href={node.parent.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 text-slate-400 hover:text-[#ff865c] text-[10px] font-medium transition-colors"
                            title="CurseForge"
                          >
                            CF
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-4 text-[11px]">
                          {node.children.map(({ mod: ch, relationLabel }) => (
                            <span key={ch.id} className="inline-flex items-center gap-1">
                              <span className="text-slate-600">↳</span>
                              <button
                                type="button"
                                onClick={() => onOpenDetail(ch)}
                                className="text-slate-200 hover:text-sky-300 transition-colors"
                              >
                                {ch.name}
                              </button>
                              <span className="text-[10px] text-slate-500">({relationLabel})</span>
                              <a
                                href={ch.curseforgeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-[#ff865c] transition-colors"
                                title="CurseForge"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {standaloneRoots.length > 0 && (
                    <div className="px-3.5 py-2.5 space-y-1.5">
                      <div className="text-[11px] font-medium text-slate-400">
                        Остальные моды сборки ({standaloneRoots.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {standaloneRoots.map(({ parent: m }, sIdx) => {
                          const num = parentWithAddons.length + sIdx + 1;
                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between gap-2 text-[11px]"
                            >
                              <button
                                type="button"
                                onClick={() => onOpenDetail(m)}
                                className="text-slate-200 hover:text-sky-300 transition-colors truncate flex items-center gap-1.5 text-left"
                              >
                                <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                                  {num}.
                                </span>
                                <span className="truncate">{m.name}</span>
                              </button>
                              <a
                                href={m.curseforgeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-[#ff865c] transition-colors shrink-0"
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

              <div className="pt-3 border-t border-[#191f2d] flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyNamesList(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  {copiedPresetId === preset.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Список скопирован
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Копировать списком
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onLoadToBuilder(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0c12] hover:bg-[#181d2a] border border-[#2e364a] text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  В Клипание
                </button>
                <button
                  type="button"
                  onClick={() => onLoadToChecker(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0c12] hover:bg-[#181d2a] border border-[#2e364a] text-slate-200 text-xs font-medium transition-colors whitespace-nowrap ml-auto"
                >
                  В Чекер
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
