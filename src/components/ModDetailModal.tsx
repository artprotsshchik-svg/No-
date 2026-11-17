import { useMemo } from 'react';
import {
  MODS_DATABASE,
  type ModItem,
} from '../data/modsData.ts';
import {
  getBaseHealthTier,
  getDualPortPairForMod,
  getGroupMembersByRole,
  getModSuperseder,
  getModUpdatedLabel,
  getRecipeBridgeStatus,
  isUnsupportedOnForge,
  type AssemblyPreferences,
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
  Crosshair,
  ArrowLeftRight,
} from 'lucide-react';

interface ModDetailModalProps {
  mod: ModItem | null;
  onClose: () => void;
  onSelectMod: (mod: ModItem) => void;
  checkedModIds: string[];
  onToggleCheckMod: (id: string) => void;
  activeModIds?: string[];
  builderPrefs?: AssemblyPreferences;
  anchorModId?: string | null;
  onAnchorForBuilder?: (mod: ModItem) => void;
  onChooseVariantInBuilder?: (mod: ModItem) => void;
}

export function ModDetailModal({
  mod,
  onClose,
  onSelectMod,
  checkedModIds,
  onToggleCheckMod,
  activeModIds,
  builderPrefs,
  anchorModId,
  onAnchorForBuilder,
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
      item =>
        item.id !== mod.id &&
        item.coveredBy &&
        (item.coveredBy === mod.name || item.coveredBy.toLowerCase().includes(mod.name.toLowerCase()))
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

  if (!mod) return null;

  const baseTier = getBaseHealthTier(mod);
  const tierStyle =
    baseTier === 'red'
      ? {
          badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          label: 'Плохо / Конфликт',
        }
      : baseTier === 'green'
        ? {
            badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
            label: 'Гарантировано стабильно',
          }
        : baseTier === 'lime'
          ? {
              badge: 'bg-lime-500/10 text-lime-300 border-lime-500/30',
              label: 'Сносно / Подходит',
            }
          : {
              badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
              label: 'Не гарантировано / Условно',
            };

  const isSelectedInChecker = checkedModIds.includes(mod.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-[#111317] border border-[#262b34] rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#111317]/95 backdrop-blur-md px-6 py-4 border-b border-[#20242b] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
              <span className={`px-2 py-0.5 rounded font-medium border ${tierStyle.badge}`}>
                {mod.statusLabel}
              </span>
              <span className="text-zinc-400">
                {mod.platform}
                {mod.isGroupLeader ? ' · Лидер группы' : mod.isGroupAddon ? ' · Аддон' : ''}
                {(() => {
                  const updated = getModUpdatedLabel(mod);
                  return updated ? ` · Обновл.: ${updated}` : '';
                })()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 leading-tight break-words tracking-tight">{mod.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {mod.category}
              {mod.groupTitle ? ` · ${mod.groupTitle}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#1c2028] transition-colors shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mod.curseforgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#f16436] hover:bg-[#d95327] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть на CurseForge
            </a>

            <button
              onClick={() => onToggleCheckMod(mod.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                isSelectedInChecker
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-[#181b21] border-[#292e39] text-zinc-200 hover:bg-[#21252e]'
              }`}
            >
              {isSelectedInChecker ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isSelectedInChecker ? 'В сборке (Чекер)' : 'Добавить в Чекер'}
            </button>

            {onAnchorForBuilder && baseTier !== 'red' && !mod.coveredBy && (
              <button
                onClick={() => onAnchorForBuilder(mod)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                  anchorModId === mod.id
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                    : 'bg-zinc-100 hover:bg-white border-zinc-100 text-zinc-950'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                {anchorModId === mod.id ? 'Упор активен (к Клипанию)' : 'Сделать упор в Клипании'}
              </button>
            )}

            {groupInfo?.leader && groupInfo.leader.id !== mod.id && (
              <button
                onClick={() => onSelectMod(groupInfo.leader!)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#181b21] border border-[#292e39] text-zinc-200 hover:bg-[#21252e] transition-colors whitespace-nowrap"
              >
                К лидеру: {groupInfo.leader.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bg-[#0c0d10] border border-[#1e222a] rounded-lg p-4 space-y-3">
            <p className="text-sm text-zinc-200 leading-relaxed">{mod.description}</p>

            {mod.coveredBy && (
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-500/[0.07] border border-amber-500/25 text-xs text-amber-200">
                <PackageCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Бесполезен как отдельный мод:</span> функционал уже встроен в{' '}
                  <span className="font-semibold text-zinc-100">{mod.coveredBy}</span>.
                </div>
              </div>
            )}

            {!mod.coveredBy && supersederInfo && (
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-500/[0.07] border border-amber-500/25 text-xs text-amber-200">
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
                className={`flex items-start gap-2.5 p-3 rounded-md border text-xs ${
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
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-emerald-500/[0.07] border border-emerald-500/25 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Вердикт / Рекомендация:</span> {mod.bestAlternative}
                </div>
              </div>
            )}

            {mod.warning && (
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-rose-500/[0.07] border border-rose-500/25 text-xs text-rose-200">
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

          {dualPairMods && dualPairMods.forgeMod && dualPairMods.fabricMod && (
            <div className="bg-[#0c0d10] border border-[#242a34] rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                  Выбор реализации: {dualPairMods.pair.title}
                </h3>
                <span className="text-[11px] text-zinc-400">
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
                        ? 'border-emerald-500/50 bg-emerald-500/[0.08]'
                        : 'border-[#20242b] bg-[#111317]'
                      : item.tone === 'sky'
                        ? isCurrent
                          ? 'border-sky-400/50 bg-sky-500/[0.08]'
                          : 'border-[#20242b] bg-[#111317]'
                        : 'border-rose-500/30 bg-rose-500/[0.05]';
                  return (
                    <div key={item.target.id} className={`rounded-md border p-3 flex flex-col justify-between gap-2.5 ${borderCls}`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-zinc-400">
                            {item.role}
                          </span>
                          <a
                            href={item.target.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-zinc-400 hover:text-[#f16436] inline-flex items-center gap-1"
                          >
                            CF <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-xs font-semibold text-zinc-100">{item.target.name}</div>
                        <p className="text-[11px] text-zinc-400 leading-snug">{item.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {!isCurrent && (
                          <button
                            onClick={() => onSelectMod(item.target)}
                            className="px-2.5 py-1 rounded bg-[#1b1f27] hover:bg-[#252a34] border border-[#2b313d] text-[11px] text-zinc-200 font-medium"
                          >
                            Открыть
                          </button>
                        )}
                        {onChooseVariantInBuilder && item.canPick && (
                          <button
                            onClick={() => onChooseVariantInBuilder(item.target)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              item.tone === 'emerald'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-zinc-100 hover:bg-white text-zinc-950'
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

          {groupInfo && groupInfo.addons.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Совместимые аддоны и дополнения ({groupInfo.addons.length})
                </h3>
                <span className="text-[11px] text-zinc-500">Дополняют лидера, не заменяя его</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupInfo.addons.map(addon => {
                  const addonTier = getBaseHealthTier(addon);
                  const statusTone =
                    addonTier === 'red'
                      ? 'text-rose-400'
                      : addonTier === 'green'
                        ? 'text-emerald-400'
                        : addonTier === 'lime'
                          ? 'text-lime-400'
                          : 'text-amber-400';
                  return (
                    <div
                      key={addon.id}
                      onClick={() => onSelectMod(addon)}
                      className="p-3 rounded-md bg-[#0c0d10] border border-[#1e222a] hover:border-[#323844] cursor-pointer transition-colors flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-100 truncate">
                            {addon.name}
                          </span>
                          <a
                            href={addon.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-zinc-500 hover:text-[#f16436] p-1 rounded shrink-0"
                            title="Открыть на CurseForge"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{addon.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{addon.platform}</span>
                        <span className={statusTone}>{addon.statusLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {groupInfo && groupInfo.removedAnalogs.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  Скрытые аналоги в группе ({groupInfo.removedAnalogs.length})
                </h3>
                <span className="text-[11px] text-zinc-500">
                  {groupInfo.group.exclusive ? 'Конфликтуют или слабее лидера' : 'Дополнительные варианты'}
                </span>
              </div>
              {groupInfo.group.conflictReason && (
                <p className="text-xs text-zinc-400 bg-[#0c0d10] border border-[#1e222a] rounded-md px-3 py-2">
                  {groupInfo.group.conflictReason}
                </p>
              )}
              <div className="divide-y divide-[#1b1f26] border border-[#20242b] rounded-md overflow-hidden bg-[#0c0d10]">
                {groupInfo.removedAnalogs.map(alt => {
                  const altTier = getBaseHealthTier(alt);
                  const pillCls =
                    altTier === 'red'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                      : altTier === 'green'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                        : altTier === 'lime'
                          ? 'bg-lime-500/10 text-lime-300 border-lime-500/25'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/25';
                  return (
                    <div
                      key={alt.id}
                      onClick={() => onSelectMod(alt)}
                      className="px-3.5 py-2.5 hover:bg-[#14171d] cursor-pointer transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-100">{alt.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${pillCls}`}>
                            {alt.statusLabel}
                          </span>
                          {alt.coveredBy && (
                            <span className="text-[11px] text-zinc-400">
                              Встроено в {alt.coveredBy}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{alt.description}</p>
                        {(alt.bestAlternative || alt.warning) && (
                          <p className="text-[11px] text-zinc-300 mt-1">
                            <span className="text-zinc-500">Сравнение:</span>{' '}
                            {alt.bestAlternative || alt.warning}
                          </p>
                        )}
                      </div>
                      <a
                        href={alt.curseforgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b21] hover:bg-[#f16436] border border-[#252a33] text-zinc-300 hover:text-white text-[11px] transition-colors"
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
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                Моды, уже включённые в {mod.name} ({builtInCoveredMods.length})
              </h3>
              <div className="divide-y divide-[#1b1f26] border border-[#20242b] rounded-md overflow-hidden bg-[#0c0d10]">
                {builtInCoveredMods.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => onSelectMod(sub)}
                    className="px-3.5 py-2 hover:bg-[#14171d] cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200">{sub.name}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{sub.description}</div>
                    </div>
                    <a
                      href={sub.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 text-zinc-400 hover:text-[#f16436] p-1"
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
