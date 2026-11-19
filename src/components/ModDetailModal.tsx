import { useEffect, useMemo } from 'react';
import {
  MODS_DATABASE,
  type ModItem,
} from '../data/modsData.ts';
import {
  evaluateModImpactInPack,
  getBaseHealthTier,
  getDualPortPairForMod,
  getGroupMembersByRole,
  getModAnalogsComparison,
  getModResourceProfile,
  getModSuperseder,
  getModUpdatedLabel,
  getRecipeBridgeStatus,
  isUnsupportedOnForge,
  matchesCoveredByName,
  type AssemblyPreferences,
  type CoUsageVerdict,
  type ResourceLoadDelta,
} from '../utils/modLogic.ts';
import {
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Layers,
  Plus,
  Check,
  ArrowRight,
  PackageCheck,
  ArrowLeftRight,
  Gauge,
} from 'lucide-react';

interface ModDetailModalProps {
  mod: ModItem | null;
  onClose: () => void;
  onSelectMod: (mod: ModItem) => void;
  checkedModIds: string[];
  onToggleCheckMod: (id: string) => void;
  activeModIds?: string[];
  contextSourceLabel?: string;
  builderPrefs?: AssemblyPreferences;
  onChooseVariantInBuilder?: (mod: ModItem) => void;
}

function getDeltaMeta(delta: ResourceLoadDelta) {
  switch (delta) {
    case -2:
      return {
        text: 'Разгружает ↓↓',
        textCls: 'text-emerald-300',
        activeBars: 2,
        barCls: 'bg-emerald-400',
        direction: 'relief' as const,
      };
    case -1:
      return {
        text: 'Снижает ↓',
        textCls: 'text-sky-300',
        activeBars: 1,
        barCls: 'bg-sky-400',
        direction: 'relief' as const,
      };
    case 0:
      return {
        text: 'Нейтрально',
        textCls: 'text-slate-400',
        activeBars: 0,
        barCls: 'bg-slate-600',
        direction: 'neutral' as const,
      };
    case 1:
      return {
        text: 'Нагрузка ↑',
        textCls: 'text-amber-300',
        activeBars: 1,
        barCls: 'bg-amber-400',
        direction: 'load' as const,
      };
    case 2:
      return {
        text: 'Нагрузка ↑↑',
        textCls: 'text-rose-300',
        activeBars: 2,
        barCls: 'bg-rose-400',
        direction: 'load' as const,
      };
  }
}

export function ModDetailModal({
  mod,
  onClose,
  onSelectMod,
  checkedModIds,
  onToggleCheckMod,
  activeModIds,
  contextSourceLabel = 'Текущая сборка',
  builderPrefs,
  onChooseVariantInBuilder,
}: ModDetailModalProps) {
  const groupInfo = useMemo(() => {
    if (!mod?.groupId) return null;
    return getGroupMembersByRole(mod.groupId);
  }, [mod]);

  const dualPair = useMemo(() => {
    if (!mod) return null;
    return getDualPortPairForMod(mod.id);
  }, [mod]);

  const dualPairMods = useMemo(() => {
    if (!dualPair) return null;
    const forgeMod = MODS_DATABASE.find(m => m.id === dualPair.forgeModId) || null;
    const fabricMod = MODS_DATABASE.find(m => m.id === dualPair.fabricModId) || null;
    return { pair: dualPair, forgeMod, fabricMod };
  }, [dualPair]);

  const builtInCoveredMods = useMemo(() => {
    if (!mod) return [];
    return MODS_DATABASE.filter(
      item => item.id !== mod.id && matchesCoveredByName(item.coveredBy, mod.name)
    );
  }, [mod]);

  const contextSet = useMemo(
    () => new Set(activeModIds ?? checkedModIds),
    [activeModIds, checkedModIds]
  );

  const supersederInfo = useMemo(() => {
    if (!mod) return null;
    return getModSuperseder(mod, contextSet, builderPrefs, true);
  }, [mod, contextSet, builderPrefs]);

  const bridgeInfo = useMemo(() => {
    if (!mod) return null;
    return getRecipeBridgeStatus(mod, contextSet, builderPrefs);
  }, [mod, contextSet, builderPrefs]);

  const contextImpact = useMemo(() => {
    if (!mod) return null;
    return evaluateModImpactInPack(mod, contextSet, undefined, builderPrefs);
  }, [mod, contextSet, builderPrefs]);

  const resourceProfile = useMemo(() => {
    if (!mod) return null;
    return contextImpact?.resourceProfile ?? getModResourceProfile(mod);
  }, [mod, contextImpact]);

  const analogsComparison = useMemo(() => {
    if (!mod) return [];
    return getModAnalogsComparison(mod, contextSet, builderPrefs);
  }, [mod, contextSet, builderPrefs]);

  useEffect(() => {
    if (!mod) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mod, onClose]);

  if (!mod) return null;

  const baseTier = getBaseHealthTier(mod);
  const tierColor =
    baseTier === 'red'
      ? 'text-rose-300'
      : baseTier === 'green'
        ? 'text-emerald-300'
        : baseTier === 'lime'
          ? 'text-lime-300'
          : 'text-amber-300';
  const tierDot =
    baseTier === 'red'
      ? 'bg-rose-400'
      : baseTier === 'green'
        ? 'bg-emerald-400'
        : baseTier === 'lime'
          ? 'bg-lime-400'
          : 'bg-amber-400';

  const isSelectedInChecker = checkedModIds.includes(mod.id);
  const updated = getModUpdatedLabel(mod);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-[#121620] border border-[#2a3347] rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Clean Unboxed Header */}
        <div className="sticky top-0 z-10 bg-[#121620]/95 backdrop-blur-md px-6 py-4 border-b border-[#1f2534] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mb-1">
              <span className={`inline-flex items-center gap-1.5 font-semibold ${tierColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${tierDot}`} />
                {mod.statusLabel}
              </span>
              <span className="text-slate-300">
                <span className="text-slate-600 mr-2" aria-hidden="true">·</span>
                {mod.platform}
              </span>
              {(mod.isGroupLeader || mod.isGroupAddon) && (
                <span className="text-sky-300 font-medium">
                  <span className="text-slate-600 mr-2" aria-hidden="true">·</span>
                  {mod.isGroupLeader ? 'Лидер группы' : 'Аддон'}
                </span>
              )}
              {updated && (
                <span className="font-mono text-slate-400">
                  <span className="text-slate-600 mr-2" aria-hidden="true">·</span>
                  обн. {updated}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-50 leading-tight break-words tracking-tight">
              {mod.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mod.category}
              {mod.groupTitle ? ` · ${mod.groupTitle}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2231] transition-colors shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mod.curseforgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#f16436] hover:bg-[#e0572b] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть на CurseForge
            </a>

            <button
              type="button"
              onClick={() => onToggleCheckMod(mod.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                isSelectedInChecker
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/20'
                  : 'bg-[#181d2a] border-[#2e364a] text-slate-100 hover:bg-[#202738]'
              }`}
            >
              {isSelectedInChecker ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Plus className="w-3.5 h-3.5" />}
              {isSelectedInChecker ? 'В сборке (Чекер)' : 'Добавить в Чекер'}
            </button>

            {groupInfo?.leader && groupInfo.leader.id !== mod.id && (
              <button
                type="button"
                onClick={() => onSelectMod(groupInfo.leader!)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#181d2a] border border-[#2e364a] text-slate-200 hover:text-white hover:bg-[#202738] transition-colors whitespace-nowrap"
              >
                К лидеру: {groupInfo.leader.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Description & Key Verdicts */}
          <div className="bg-[#0a0c12] border border-[#1f2534] rounded-xl p-4 space-y-3">
            <p className="text-sm text-slate-100 leading-relaxed">{mod.description}</p>

            {mod.coveredBy && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.07] border border-amber-500/25 text-xs text-amber-200">
                <PackageCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Бесполезен как отдельный мод:</span> функционал уже встроен в{' '}
                  <span className="font-semibold text-white">{mod.coveredBy}</span>.
                </div>
              </div>
            )}

            {!mod.coveredBy && supersederInfo && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.07] border border-amber-500/25 text-xs text-amber-200">
                <PackageCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    {supersederInfo.isActiveInSelection ? 'Полностью перекрыт активной связкой:' : 'Перекрывается более лучшим модом:'}
                  </span>{' '}
                  {supersederInfo.reason}.
                </div>
              </div>
            )}

            {(mod.recipeEcosystem || bridgeInfo?.viaBridge || (bridgeInfo && !bridgeInfo.compatible)) && (
              <div
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                  bridgeInfo && !bridgeInfo.compatible
                    ? 'bg-rose-500/[0.07] border-rose-500/25 text-rose-200'
                    : 'bg-sky-500/[0.07] border-sky-500/25 text-sky-200'
                }`}
              >
                <ArrowLeftRight className={`w-4 h-4 shrink-0 mt-0.5 ${bridgeInfo && !bridgeInfo.compatible ? 'text-rose-400' : 'text-sky-400'}`} />
                <div>
                  <span className="font-semibold">Совместимость / прослойка:</span>{' '}
                  {bridgeInfo && !bridgeInfo.compatible
                    ? bridgeInfo.reason
                    : bridgeInfo?.viaBridge
                      ? `${bridgeInfo.viaBridge} — работает в текущей конфигурации.`
                      : mod.recipeEcosystem === 'emi-only'
                        ? 'Требует EMI (нативный аддон EMI).'
                        : mod.recipeEcosystem === 'tmrv-bridge'
                          ? 'Мост JEI-плагинов для чистого EMI (конфликтует с самим JEI).'
                          : mod.recipeEcosystem === 'jei-engine'
                            ? 'Работает только с установленным JEI (не работает через TMRV в чистом EMI).'
                            : mod.recipeEcosystem === 'jei-plugin'
                              ? 'JEI-плагин: работает с JEI напрямую либо в чистом EMI через прослойку TMRV Updated.'
                              : 'Универсально работает с EMI и JEI.'}
                </div>
              </div>
            )}

            {mod.bestAlternative && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/25 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Вердикт / Рекомендация:</span> {mod.bestAlternative}
                </div>
              </div>
            )}

            {mod.warning && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/[0.07] border border-rose-500/25 text-xs text-rose-200">
                {mod.status === 'danger' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold">Важно:</span> {mod.warning}
                </div>
              </div>
            )}
          </div>

          {/* Hardware Resource & Performance Trade-off Profile */}
          {resourceProfile && (
            <section
              aria-label="Профиль нагрузки и компромиссы"
              className="bg-[#0a0c12] border border-[#1f2534] rounded-xl p-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#191f2d]">
                <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  Профиль нагрузки и компромиссы
                </h3>
                <span
                  className={`text-xs font-medium ${
                    resourceProfile.hasTradeoff ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  {resourceProfile.shortTag}
                </span>
              </div>

              {/* Two columns: Gains vs Costs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#121620] border border-[#1f2534] p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Что ускоряет
                  </div>
                  <ul className="space-y-1 text-xs text-slate-200 leading-snug">
                    {resourceProfile.gains.map((g, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 shrink-0 mt-0.5">+</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-[#121620] border border-[#1f2534] p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    Цена / нагрузка
                  </div>
                  <ul className="space-y-1 text-xs text-slate-200 leading-snug">
                    {resourceProfile.costs.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4 Directional Resource Meters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'GPU', delta: resourceProfile.gpuLoad },
                  { label: 'VRAM', delta: resourceProfile.vramLoad },
                  { label: 'CPU', delta: resourceProfile.cpuLoad },
                  { label: 'ОЗУ', delta: resourceProfile.ramLoad },
                ].map(item => {
                  const meta = getDeltaMeta(item.delta);
                  return (
                    <div
                      key={item.label}
                      className="rounded-lg bg-[#121620] border border-[#1f2534] px-3 py-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-semibold text-slate-300">
                          {item.label}
                        </span>
                        <span className={`font-semibold tabular-nums ${meta.textCls}`}>
                          {meta.text}
                        </span>
                      </div>
                      {/* Directional 5-slot meter: [-2, -1 | 0 | +1, +2] */}
                      <div className="grid grid-cols-5 gap-1 h-1.5">
                        <span
                          className={`rounded-sm ${
                            meta.direction === 'relief' && meta.activeBars === 2
                              ? meta.barCls
                              : 'bg-[#1c2231]'
                          }`}
                        />
                        <span
                          className={`rounded-sm ${
                            meta.direction === 'relief' && meta.activeBars >= 1
                              ? meta.barCls
                              : 'bg-[#1c2231]'
                          }`}
                        />
                        <span className="rounded-sm bg-[#2b3347]" />
                        <span
                          className={`rounded-sm ${
                            meta.direction === 'load' && meta.activeBars >= 1
                              ? meta.barCls
                              : 'bg-[#1c2231]'
                          }`}
                        />
                        <span
                          className={`rounded-sm ${
                            meta.direction === 'load' && meta.activeBars === 2
                              ? meta.barCls
                              : 'bg-[#1c2231]'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                {resourceProfile.tradeoffNote}
              </p>
            </section>
          )}

          {/* Contextual Pack Impact */}
          {contextImpact && (() => {
            const coUsageLabelMap: Record<CoUsageVerdict, string> = {
              synergy: 'Синергия со сборкой',
              solo: 'Работает автономно',
              overlap: 'Частичное пересечение',
              redundant: 'Перекрыт / без потребителя',
              dependency: 'Опорная зависимость',
              conflict: 'Конфликт / несовместимость',
            };
            const relPctText =
              contextImpact.relativeImpactPct > 0
                ? `+${contextImpact.relativeImpactPct}%`
                : `${contextImpact.relativeImpactPct}%`;
            const impactTone =
              contextImpact.relativeImpactPct > 0
                ? 'text-emerald-300'
                : contextImpact.relativeImpactPct < 0
                  ? 'text-rose-300'
                  : 'text-amber-300';
            const betterMod = contextImpact.betterAnalogId
              ? MODS_DATABASE.find(m => m.id === contextImpact.betterAnalogId) || null
              : null;

            return (
              <div className="bg-[#0a0c12] border border-[#1f2534] rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2.5 border-b border-[#191f2d]">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-50">
                      Взаимодействие и относительный импакт ({contextSourceLabel})
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {contextImpact.inPack
                        ? `Уже в сборке · ${coUsageLabelMap[contextImpact.coUsageVerdict]}`
                        : `При добавлении к текущей сборке · ${coUsageLabelMap[contextImpact.coUsageVerdict]}`}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2.5 font-mono text-xs tabular-nums">
                    <span className={`font-bold ${impactTone}`}>
                      {contextImpact.inPack ? 'Вклад ' : 'Добавит '}
                      {relPctText}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-200">{contextImpact.impactPoints} / 100 б.</span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-slate-300">{contextImpact.label}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{contextImpact.summary}</p>
                {betterMod && contextImpact.betterAnalogDeltaPoints !== undefined && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sky-500/[0.07] border border-sky-400/25 text-xs">
                    <span className="text-sky-200">
                      Сильнее аналог: <strong className="text-white">{betterMod.name}</strong>{' '}
                      <span className="text-emerald-300 font-semibold tabular-nums">
                        (+{contextImpact.betterAnalogDeltaPoints} б.)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectMod(betterMod)}
                      className="px-2.5 py-1 rounded-md bg-[#181d2a] hover:bg-[#22293b] border border-[#2e364a] text-sky-200 text-[11px] font-semibold"
                    >
                      Сравнить с {betterMod.name}
                    </button>
                  </div>
                )}
                {contextImpact.interactions.length > 0 && (
                  <div className="divide-y divide-[#191f2d] rounded-lg border border-[#1f2534] bg-[#121620] overflow-hidden">
                    {contextImpact.interactions.map((inter, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-2 text-[11px] leading-snug ${
                          inter.kind === 'conflict'
                            ? 'text-rose-200 bg-rose-500/[0.06]'
                            : inter.kind === 'overlap'
                              ? 'text-amber-200 bg-amber-500/[0.05]'
                              : inter.kind === 'synergy'
                                ? 'text-emerald-200 bg-emerald-500/[0.04]'
                                : 'text-slate-300'
                        }`}
                      >
                        {inter.targetNames.length > 0 && (
                          <span className="font-semibold text-white">[{inter.targetNames.join(' + ')}] </span>
                        )}
                        {inter.summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dual Port Choice */}
          {dualPairMods && dualPairMods.forgeMod && dualPairMods.fabricMod && (
            <div className="bg-[#0a0c12] border border-[#1f2534] rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                  Выбор реализации: {dualPairMods.pair.title}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {dualPairMods.pair.switchableOnForge
                    ? 'Оба варианта работают на Forge 1.20.1'
                    : 'На Forge работает только нативный порт'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    role: 'Нативный Forge-порт',
                    target: dualPairMods.forgeMod,
                    summary: dualPairMods.pair.forgeSummary,
                    tone: 'emerald' as const,
                    canPick: true,
                  },
                  {
                    role: dualPairMods.pair.switchableOnForge ? 'Fabric + Sinytra Connector' : 'Fabric-оригинал (справка)',
                    target: dualPairMods.fabricMod,
                    summary: dualPairMods.pair.fabricSummary,
                    tone: isUnsupportedOnForge(dualPairMods.fabricMod) ? ('rose' as const) : ('sky' as const),
                    canPick: dualPairMods.pair.switchableOnForge && !isUnsupportedOnForge(dualPairMods.fabricMod),
                  },
                ].map(item => {
                  const isCurrent = item.target.id === mod.id;
                  const borderCls =
                    item.tone === 'emerald'
                      ? isCurrent
                        ? 'border-emerald-400/60 bg-emerald-500/[0.08]'
                        : 'border-[#1f2534] bg-[#121620]'
                      : item.tone === 'sky'
                        ? isCurrent
                          ? 'border-sky-400/60 bg-sky-500/[0.08]'
                          : 'border-[#1f2534] bg-[#121620]'
                        : 'border-rose-400/40 bg-rose-500/[0.08]';
                  return (
                    <div key={item.target.id} className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 ${borderCls}`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-400">{item.role}</span>
                          <a
                            href={item.target.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-400 hover:text-[#f16436] inline-flex items-center gap-1"
                          >
                            CF <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-xs font-semibold text-slate-50">{item.target.name}</div>
                        <p className="text-[11px] text-slate-300 leading-snug">{item.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => onSelectMod(item.target)}
                            className="px-2.5 py-1 rounded-md bg-[#181d2a] hover:bg-[#22293b] border border-[#2e364a] text-[11px] text-slate-100 font-medium"
                          >
                            Открыть
                          </button>
                        )}
                        {onChooseVariantInBuilder && item.canPick && (
                          <button
                            type="button"
                            onClick={() => onChooseVariantInBuilder(item.target)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                              item.tone === 'emerald'
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                : 'bg-sky-600 hover:bg-sky-500 text-white'
                            }`}
                          >
                            Выбрать в Клипании
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compatible Group Addons */}
          {groupInfo && groupInfo.addons.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-50">
                  Совместимые аддоны и дополнения ({groupInfo.addons.length})
                </h3>
                <span className="text-[11px] text-slate-400">Дополняют лидера, не заменяя его</span>
              </div>
              <div className="divide-y divide-[#191f2d] border border-[#1f2534] rounded-xl overflow-hidden bg-[#0a0c12]">
                {groupInfo.addons.map(addon => {
                  const addonTier = getBaseHealthTier(addon);
                  const statusTone =
                    addonTier === 'red'
                      ? 'text-rose-300'
                      : addonTier === 'green'
                        ? 'text-emerald-300'
                        : addonTier === 'lime'
                          ? 'text-lime-300'
                          : 'text-amber-300';
                  const addonRp = getModResourceProfile(addon);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => onSelectMod(addon)}
                      className="px-4 py-2.5 hover:bg-[#161c29] cursor-pointer transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                          <span className="font-semibold text-slate-50">{addon.name}</span>
                          <span className={statusTone}>{addon.statusLabel}</span>
                          <span className="text-slate-500">· {addon.platform}</span>
                          {addonRp.hasTradeoff && (
                            <span className="text-amber-300 text-[11px]">· {addonRp.shortTag}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{addon.description}</p>
                      </div>
                      <a
                        href={addon.curseforgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-slate-400 hover:text-[#f16436] p-1 rounded shrink-0"
                        title="Открыть на CurseForge"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analogs & Co-Usage Comparison */}
          {analogsComparison.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-300" />
                  Аналоги, замены и совместная работа ({analogsComparison.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Сравнение по баллам и совместимости с {mod.name}
                </span>
              </div>
              {groupInfo?.group.conflictReason && (
                <p className="text-xs text-slate-300 bg-[#0a0c12] border border-[#1f2534] rounded-lg px-3 py-2">
                  {groupInfo.group.conflictReason}
                </p>
              )}
              <div className="divide-y divide-[#191f2d] border border-[#1f2534] rounded-xl overflow-hidden bg-[#0a0c12]">
                {analogsComparison.map(entry => {
                  const alt = entry.mod;
                  const altTier = getBaseHealthTier(alt);
                  const statusTone =
                    altTier === 'red'
                      ? 'text-rose-300'
                      : altTier === 'green'
                        ? 'text-emerald-300'
                        : altTier === 'lime'
                          ? 'text-lime-300'
                          : 'text-amber-300';
                  const relColor =
                    entry.relation === 'better-replacement' || entry.relation === 'leader'
                      ? 'text-sky-300'
                      : entry.relation === 'addon-synergy'
                        ? 'text-emerald-300'
                        : entry.relation === 'conflict' || entry.relation === 'overlap-duplicate'
                          ? 'text-rose-300'
                          : 'text-slate-300';
                  const deltaSign =
                    entry.relativeDeltaPoints > 0
                      ? `+${entry.relativeDeltaPoints} б.`
                      : `${entry.relativeDeltaPoints} б.`;
                  const pctText =
                    entry.marginalPct > 0
                      ? `+${entry.marginalPct}%`
                      : `${entry.marginalPct}%`;
                  const altRp = getModResourceProfile(alt);
                  return (
                    <div
                      key={alt.id}
                      onClick={() => onSelectMod(alt)}
                      className="px-4 py-2.5 hover:bg-[#161c29] cursor-pointer transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                          <span className="font-semibold text-slate-50">{alt.name}</span>
                          {entry.isSelectedInContext && (
                            <span className="text-[11px] font-semibold text-emerald-300">в сборке</span>
                          )}
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span className={`text-[11px] font-medium ${relColor}`}>{entry.relationLabel}</span>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span className={`text-[11px] font-medium ${statusTone}`}>{alt.statusLabel}</span>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span className="text-[11px] font-mono text-slate-200 tabular-nums">
                            {entry.points} б. ({pctText})
                          </span>
                          {entry.relativeDeltaPoints !== 0 && (
                            <span
                              className={`text-[11px] font-semibold tabular-nums ${
                                entry.relativeDeltaPoints > 0 ? 'text-emerald-300' : 'text-slate-400'
                              }`}
                            >
                              {deltaSign} vs {mod.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                          <span className={entry.canUseTogether ? 'text-emerald-300 font-medium' : 'text-amber-300 font-medium'}>
                            {entry.canUseTogether ? 'Совместим: ' : 'Несовместно: '}
                          </span>
                          {entry.coUsageNote}
                          {altRp.hasTradeoff && (
                            <span className="text-amber-300/90"> · {altRp.shortTag}</span>
                          )}
                        </p>
                      </div>
                      <a
                        href={alt.curseforgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#181d2a] hover:bg-[#f16436] border border-[#2e364a] text-slate-200 hover:text-white text-[11px] transition-colors"
                      >
                        CF
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {builtInCoveredMods.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-300" />
                Моды, уже включённые в {mod.name} ({builtInCoveredMods.length})
              </h3>
              <div className="divide-y divide-[#191f2d] border border-[#1f2534] rounded-xl overflow-hidden bg-[#0a0c12]">
                {builtInCoveredMods.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => onSelectMod(sub)}
                    className="px-4 py-2 hover:bg-[#161c29] cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100">{sub.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{sub.description}</div>
                    </div>
                    <a
                      href={sub.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 text-slate-400 hover:text-[#f16436] p-1"
                      title="CurseForge"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
