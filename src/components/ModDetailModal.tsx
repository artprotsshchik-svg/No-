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
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-[#111824] border border-[#344663] rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#111824]/95 backdrop-blur-md px-6 py-4 border-b border-[#26344b] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
              <span className={`px-2 py-0.5 rounded font-semibold border ${tierStyle.badge}`}>
                {mod.statusLabel}
              </span>
              <span className="text-slate-300">
                {mod.platform}
                {mod.isGroupLeader ? ' · Лидер группы' : mod.isGroupAddon ? ' · Аддон' : ''}
                {(() => {
                  const updated = getModUpdatedLabel(mod);
                  return updated ? ` · Обновл.: ${updated}` : '';
                })()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-50 leading-tight break-words tracking-tight">{mod.name}</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {mod.category}
              {mod.groupTitle ? ` · ${mod.groupTitle}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#1e2a3f] transition-colors shrink-0"
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
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#f16436] hover:bg-[#e0572b] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть на CurseForge
            </a>

            <button
              onClick={() => onToggleCheckMod(mod.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                isSelectedInChecker
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/25'
                  : 'bg-[#182233] border-[#344663] text-slate-100 hover:bg-[#212f46]'
              }`}
            >
              {isSelectedInChecker ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isSelectedInChecker ? 'В сборке (Чекер)' : 'Добавить в Чекер'}
            </button>

            {onAnchorForBuilder && baseTier !== 'red' && !mod.coveredBy && (
              <button
                onClick={() => onAnchorForBuilder(mod)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                  anchorModId === mod.id
                    ? 'bg-sky-500/25 border-sky-400/60 text-sky-100'
                    : 'bg-sky-400 hover:bg-sky-300 border-sky-400 text-slate-950'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                {anchorModId === mod.id ? 'Упор активен (к Клипанию)' : 'Сделать упор в Клипании'}
              </button>
            )}

            {groupInfo?.leader && groupInfo.leader.id !== mod.id && (
              <button
                onClick={() => onSelectMod(groupInfo.leader!)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#182233] border border-[#344663] text-slate-100 hover:bg-[#212f46] transition-colors whitespace-nowrap"
              >
                К лидеру: {groupInfo.leader.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bg-[#0b1019] border border-[#243248] rounded-xl p-4 space-y-3">
            <p className="text-sm text-slate-100 leading-relaxed">{mod.description}</p>

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
            <div className="bg-[#0b1019] border border-[#2a384e] rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                  Выбор реализации: {dualPairMods.pair.title}
                </h3>
                <span className="text-[11px] text-slate-300">
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
                        ? 'border-emerald-400/60 bg-emerald-500/10'
                        : 'border-[#273549] bg-[#111824]'
                      : item.tone === 'sky'
                        ? isCurrent
                          ? 'border-sky-400/60 bg-sky-500/10'
                          : 'border-[#273549] bg-[#111824]'
                        : 'border-rose-400/40 bg-rose-500/10';
                  return (
                    <div key={item.target.id} className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 ${borderCls}`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-300">
                            {item.role}
                          </span>
                          <a
                            href={item.target.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-300 hover:text-[#f16436] inline-flex items-center gap-1"
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
                            onClick={() => onSelectMod(item.target)}
                            className="px-2.5 py-1 rounded-md bg-[#182233] hover:bg-[#223048] border border-[#344663] text-[11px] text-slate-100 font-medium"
                          >
                            Открыть
                          </button>
                        )}
                        {onChooseVariantInBuilder && item.canPick && (
                          <button
                            onClick={() => onChooseVariantInBuilder(item.target)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                              item.tone === 'emerald'
                                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                                : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
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
                <h3 className="text-sm font-semibold text-slate-50">
                  Совместимые аддоны и дополнения ({groupInfo.addons.length})
                </h3>
                <span className="text-[11px] text-slate-400">Дополняют лидера, не заменяя его</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  return (
                    <div
                      key={addon.id}
                      onClick={() => onSelectMod(addon)}
                      className="p-3 rounded-lg bg-[#0b1019] border border-[#243248] hover:border-[#42587a] cursor-pointer transition-colors flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-50 truncate">
                            {addon.name}
                          </span>
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
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{addon.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
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
                <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-300" />
                  Скрытые аналоги в группе ({groupInfo.removedAnalogs.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  {groupInfo.group.exclusive ? 'Конфликтуют или слабее лидера' : 'Дополнительные варианты'}
                </span>
              </div>
              {groupInfo.group.conflictReason && (
                <p className="text-xs text-slate-300 bg-[#0b1019] border border-[#243248] rounded-lg px-3 py-2">
                  {groupInfo.group.conflictReason}
                </p>
              )}
              <div className="divide-y divide-[#202c3e] border border-[#273549] rounded-lg overflow-hidden bg-[#0b1019]">
                {groupInfo.removedAnalogs.map(alt => {
                  const altTier = getBaseHealthTier(alt);
                  const pillCls =
                    altTier === 'red'
                      ? 'bg-rose-500/15 text-rose-200 border-rose-400/35'
                      : altTier === 'green'
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35'
                        : altTier === 'lime'
                          ? 'bg-lime-500/15 text-lime-200 border-lime-400/35'
                          : 'bg-amber-500/15 text-amber-200 border-amber-400/35';
                  return (
                    <div
                      key={alt.id}
                      onClick={() => onSelectMod(alt)}
                      className="px-3.5 py-2.5 hover:bg-[#151e2e] cursor-pointer transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-50">{alt.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${pillCls}`}>
                            {alt.statusLabel}
                          </span>
                          {alt.coveredBy && (
                            <span className="text-[11px] text-slate-300">
                              Встроено в {alt.coveredBy}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">{alt.description}</p>
                        {(alt.bestAlternative || alt.warning) && (
                          <p className="text-[11px] text-slate-200 mt-1">
                            <span className="text-slate-400">Сравнение:</span>{' '}
                            {alt.bestAlternative || alt.warning}
                          </p>
                        )}
                      </div>
                      <a
                        href={alt.curseforgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#182233] hover:bg-[#f16436] border border-[#344663] text-slate-200 hover:text-white text-[11px] transition-colors"
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
              <div className="divide-y divide-[#202c3e] border border-[#273549] rounded-lg overflow-hidden bg-[#0b1019]">
                {builtInCoveredMods.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => onSelectMod(sub)}
                    className="px-3.5 py-2 hover:bg-[#151e2e] cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100">{sub.name}</div>
                      <div className="text-[11px] text-slate-300 truncate">{sub.description}</div>
                    </div>
                    <a
                      href={sub.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 text-slate-300 hover:text-[#f16436] p-1"
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
