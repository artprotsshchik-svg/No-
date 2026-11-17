import { useMemo, useState, useEffect } from 'react';
import {
  MODS_DATABASE,
  MOD_GROUPS,
  type ModItem,
} from '../data/modsData.ts';
import {
  getBaseHealthTier,
  getGroupMembersByRole,
  getModEffectivenessScore,
  getModRestrictionBadge,
  getModSuperseder,
  getModUpdatedLabel,
  isModIncompatibleWithSelection,
  isUnsupportedOnForge,
  type AssemblyPreferences,
  type CheckerTier,
} from '../utils/modLogic.ts';
import {
  Award,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Grid,
  Layers,
  List,
  PackageCheck,
  Plus,
  Search,
  Table,
} from 'lucide-react';

type CatalogView = 'cards' | 'list' | 'table';
type HealthFilter = 'all' | CheckerTier;
type CatalogSort = 'leaders-first' | 'best-first' | 'name-asc';

interface CatalogTabProps {
  checkedModIds: string[];
  toggleCheckerMod: (id: string) => void;
  builderSet: Set<string>;
  builderPrefs: AssemblyPreferences;
  onOpenDetail: (mod: ModItem) => void;
}

export function getHealthBadge(mod: ModItem) {
  const tier = getBaseHealthTier(mod);
  if (tier === 'red') {
    return {
      cls: 'bg-rose-500/15 text-rose-200 border-rose-400/40',
      textCls: 'text-rose-300',
      text: mod.statusLabel,
    };
  }
  if (tier === 'green') {
    return {
      cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
      textCls: 'text-emerald-300',
      text: mod.statusLabel,
    };
  }
  if (tier === 'lime') {
    return {
      cls: 'bg-lime-500/15 text-lime-200 border-lime-400/40',
      textCls: 'text-lime-300',
      text: mod.statusLabel,
    };
  }
  return {
    cls: 'bg-amber-500/15 text-amber-200 border-amber-400/40',
    textCls: 'text-amber-300',
    text: mod.statusLabel,
  };
}

export function CatalogTab({
  checkedModIds,
  toggleCheckerMod,
  builderSet,
  builderPrefs,
  onOpenDetail,
}: CatalogTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [onlyLeaders, setOnlyLeaders] = useState(true);
  const [hideUselessCovered, setHideUselessCovered] = useState(true);
  const [onlyCompatibleInCatalog, setOnlyCompatibleInCatalog] = useState(false);
  const [catalogView, setCatalogView] = useState<CatalogView>('cards');
  const [sortBy, setSortBy] = useState<CatalogSort>('leaders-first');
  const [itemsPerPage, setItemsPerPage] = useState<number>(36);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, healthFilter, onlyLeaders, hideUselessCovered, onlyCompatibleInCatalog, sortBy]);

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
        if (onlyLeaders && mod.groupId && !mod.isGroupLeader) {
          return false;
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

  return (
    <div className="space-y-4">
      <div className="bg-[#111824] border border-[#2a384e] rounded-xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, описанию или аналогу (Alloyium, Nvidium)..."
              className="w-full pl-9 pr-3 py-2 bg-[#0b1019] border border-[#263244] rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:border-sky-400 transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Категория модов"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b1019] border border-[#263244] rounded-lg text-xs text-slate-100 focus:border-sky-400 transition-colors"
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
              aria-label="Статус модов"
              value={healthFilter}
              onChange={e => setHealthFilter(e.target.value as HealthFilter)}
              className="w-full px-3 py-2 bg-[#0b1019] border border-[#263244] rounded-lg text-xs text-slate-100 focus:border-sky-400 transition-colors"
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
              aria-label="Сортировка модов"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as CatalogSort)}
              className="w-full px-3 py-2 bg-[#0b1019] border border-[#263244] rounded-lg text-xs text-slate-100 focus:border-sky-400 transition-colors"
            >
              <option value="leaders-first">Сначала лидеры</option>
              <option value="best-first">По эффективности</option>
              <option value="name-asc">По алфавиту</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#223044]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyLeaders(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                onlyLeaders
                  ? 'bg-sky-400/15 border-sky-400/50 text-sky-100'
                  : 'bg-[#0b1019] border-[#263244] text-slate-300 hover:text-white hover:border-[#3b4d68]'
              }`}
            >
              <Award className={`w-3.5 h-3.5 ${onlyLeaders ? 'text-sky-300' : 'text-slate-400'}`} />
              Только лидеры групп
            </button>

            <button
              type="button"
              onClick={() => setHideUselessCovered(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                hideUselessCovered
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                  : 'bg-[#0b1019] border-[#263244] text-slate-300 hover:text-white hover:border-[#3b4d68]'
              }`}
              title="Скрывать плацебо, нерабочие на Forge, встроенные и 100% перекрытые более лучшими модами"
            >
              {hideUselessCovered ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              Скрыть лишние и перекрытые
            </button>

            <button
              type="button"
              onClick={() => setOnlyCompatibleInCatalog(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                onlyCompatibleInCatalog
                  ? 'bg-sky-400/15 border-sky-400/50 text-sky-200'
                  : 'bg-[#0b1019] border-[#263244] text-slate-300 hover:text-white hover:border-[#3b4d68]'
              }`}
              title="Показывать только моды, совместимые с текущей активной сборкой и выбранным просмотрщиком рецептов (JEI / EMI)"
            >
              {onlyCompatibleInCatalog ? <EyeOff className="w-3.5 h-3.5 text-sky-300" /> : <Eye className="w-3.5 h-3.5" />}
              Совм. со сборкой
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 tabular-nums">
              Показано: <strong className="text-slate-50">{filteredMods.length}</strong>
            </span>
            <div className="flex items-center bg-[#0b1019] border border-[#263244] rounded-lg p-0.5">
              {[
                { k: 'cards', icon: Grid, title: 'Карточки' },
                { k: 'list', icon: List, title: 'Список' },
                { k: 'table', icon: Table, title: 'Таблица' },
              ].map(v => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.k}
                    type="button"
                    onClick={() => setCatalogView(v.k as CatalogView)}
                    className={`p-1.5 rounded-md transition-colors ${
                      catalogView === v.k ? 'bg-sky-400 text-slate-950' : 'text-slate-400 hover:text-slate-100'
                    }`}
                    title={v.title}
                    aria-label={v.title}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {catalogView === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginatedMods.map(mod => {
            const badge = getHealthBadge(mod);
            const grp = mod.groupId ? groupMetaMap.get(mod.groupId) : null;
            const addons = mod.isGroupLeader && grp ? grp.addons : [];
            const removedCount = mod.isGroupLeader && grp ? grp.removedAnalogs.length : 0;
            const isInChecker = checkedModIds.includes(mod.id);
            const updated = getModUpdatedLabel(mod);
            const restriction = getModRestrictionBadge(mod, builderSet, builderPrefs);

            return (
              <div
                key={mod.id}
                onClick={() => onOpenDetail(mod)}
                className="bg-[#111824] border border-[#2a384e] hover:border-sky-400/50 rounded-xl p-4 cursor-pointer transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-50 truncate">{mod.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 min-w-0">
                        <span className="truncate">{mod.groupTitle || mod.category} · {mod.platform}</span>
                        {updated && (
                          <span className="shrink-0 font-mono text-slate-300">· обн. {updated}</span>
                        )}
                      </div>
                    </div>

                    <a
                      href={mod.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0b1019] hover:bg-[#f16436] border border-[#2a384e] hover:border-[#f16436] text-slate-200 hover:text-white text-[11px] font-medium transition-colors"
                      title="Открыть на CurseForge"
                    >
                      CF
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">
                    {mod.description}
                  </p>

                  {addons.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <div className="text-[11px] font-medium text-slate-400">
                        Аддоны ({addons.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {addons.slice(0, 5).map(ad => (
                          <button
                            key={ad.id}
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onOpenDetail(ad);
                            }}
                            className="px-2 py-0.5 rounded bg-[#0b1019] hover:bg-[#192334] border border-[#263244] text-[11px] text-sky-300 transition-colors"
                          >
                            {ad.name}
                          </button>
                        ))}
                        {addons.length > 5 && (
                          <span className="text-[11px] text-slate-400 px-1">+{addons.length - 5}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-[#223044] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-300 truncate">
                    {restriction && (restriction.tone === 'red' || restriction.tone === 'amber') ? (
                      <span className={`font-medium ${restriction.tone === 'red' ? 'text-rose-300' : 'text-amber-300'}`}>
                        {restriction.text}
                      </span>
                    ) : removedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-slate-200">
                        <Layers className="w-3 h-3 text-amber-300 shrink-0" />
                        +{removedCount} аналогов внутри
                      </span>
                    ) : mod.coveredBy ? (
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <PackageCheck className="w-3 h-3 shrink-0" />
                        Встроено в {mod.coveredBy}
                      </span>
                    ) : restriction?.tone === 'sky' ? (
                      <span className="font-medium text-sky-300">{restriction.text}</span>
                    ) : (
                      <span className={`font-medium ${badge.textCls}`}>{badge.text}</span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      toggleCheckerMod(mod.id);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      isInChecker
                        ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                        : 'bg-[#0b1019] border-[#263244] text-slate-200 hover:bg-[#192334] hover:border-sky-400/40'
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
        <div className="bg-[#111824] border border-[#2a384e] rounded-xl divide-y divide-[#223044] overflow-hidden">
          {paginatedMods.map(mod => {
            const badge = getHealthBadge(mod);
            const grp = mod.groupId ? groupMetaMap.get(mod.groupId) : null;
            const removedCount = mod.isGroupLeader && grp ? grp.removedAnalogs.length : 0;
            const addonsCount = mod.isGroupLeader && grp ? grp.addons.length : 0;
            const updated = getModUpdatedLabel(mod);

            return (
              <div
                key={mod.id}
                onClick={() => onOpenDetail(mod)}
                className="px-4 py-3 hover:bg-[#172133] cursor-pointer transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-50">{mod.name}</span>
                    <span className={`text-[11px] font-medium ${badge.textCls}`}>{badge.text}</span>
                    <span className="text-[11px] text-slate-400">{mod.platform}</span>
                    {updated && <span className="text-[11px] text-slate-400 font-mono">· обн. {updated}</span>}
                    {addonsCount > 0 && <span className="text-[11px] text-sky-300">+{addonsCount} аддонов</span>}
                    {removedCount > 0 && <span className="text-[11px] text-slate-300">· {removedCount} аналогов внутри</span>}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 truncate">{mod.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={mod.curseforgeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0b1019] hover:bg-[#f16436] border border-[#263244] hover:border-[#f16436] text-slate-200 hover:text-white text-xs transition-colors"
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
        <div className="bg-[#111824] border border-[#2a384e] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#2a384e] text-slate-300 bg-[#0b1019]">
                <th className="py-2.5 px-4 font-semibold">Мод</th>
                <th className="py-2.5 px-4 font-semibold">Группа / Категория</th>
                <th className="py-2.5 px-4 font-semibold">Статус</th>
                <th className="py-2.5 px-4 font-semibold">Аддоны / Аналоги</th>
                <th className="py-2.5 px-4 font-semibold text-right">CurseForge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#223044]">
              {paginatedMods.map(mod => {
                const badge = getHealthBadge(mod);
                const grp = mod.groupId ? groupMetaMap.get(mod.groupId) : null;
                return (
                  <tr
                    key={mod.id}
                    onClick={() => onOpenDetail(mod)}
                    className="hover:bg-[#172133] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-50">{mod.name}</td>
                    <td className="py-2.5 px-4 text-slate-300">{mod.groupTitle || mod.category}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-200 tabular-nums">
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
                        className="inline-flex items-center gap-1 text-[#ff865c] hover:underline font-medium"
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

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>На странице:</span>
            {[24, 36, 72, 500].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setItemsPerPage(n);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md border tabular-nums transition-colors ${
                  itemsPerPage === n
                    ? 'bg-sky-400 border-sky-400 text-slate-950 font-semibold'
                    : 'bg-[#111824] border-[#263244] text-slate-300 hover:text-white'
                }`}
              >
                {n === 500 ? 'Все' : n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-[#111824] border border-[#2a384e] text-slate-200 hover:border-sky-400/50 disabled:opacity-40 transition-colors"
            >
              Назад
            </button>
            <span className="px-2 text-slate-300 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-[#111824] border border-[#2a384e] text-slate-200 hover:border-sky-400/50 disabled:opacity-40 transition-colors"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
