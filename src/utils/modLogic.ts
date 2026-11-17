import {
  DATABASE_UPDATED_AT,
  MODS_DATABASE,
  MOD_GROUPS,
  INCOMPATIBILITY_RULES,
  GOLDEN_STANDARD_MODS,
  type ModItem,
  type IncompatibilityRule,
} from '../data/modsData.ts';

export function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export interface ConflictDetection {
  rule: IncompatibilityRule;
  matchedIds: string[];
  matchedNames: string[];
}

export interface DependencyWarning {
  modId: string;
  modName: string;
  severity: 'red' | 'yellow';
  message: string;
  fixModIds?: string[];
}

export function isUnsupportedOnForge(mod: ModItem): boolean {
  return mod.platform.includes('Несовм.') || mod.platform.includes('Fabric (Справка');
}

export const MOD_HARD_DEPENDENCIES: Record<string, string[]> = {
  'embeddium-extras': ['embeddium'],
  'sodium-chloride': ['embeddium'],
  'alloyium': ['embeddium'],
  'oculus': ['embeddium'],
  'lightstar': ['embeddium'],
  'amd-fsr-upscaler-render-scale-for-embeddium': ['embeddium'],
  'faster-iris-shadow-mapper': ['embeddium', 'oculus'],
  'sodium-embeddium-dynamic-lights': ['sodium-embeddium-options-api'],
  'emberlens': ['emberbium'],
  'vanillin': ['flywheel'],
  'distant-horizons-memory-fix-dh': ['distant-horizons'],
  'nvidium': ['sinytra-connector', 'forgified-fabric-api'],
  'nvidium-forged': ['nvidium', 'sinytra-connector', 'forgified-fabric-api'],
  'c2me-concurrent-chunk-management-engine': ['sinytra-connector', 'forgified-fabric-api'],
  'voxy': ['sinytra-connector', 'forgified-fabric-api', 'embeddium'],
  'very-many-players-vmp': ['sinytra-connector', 'forgified-fabric-api'],
  'connector-extras': ['sinytra-connector'],
  'particle-core': ['kotlin-for-forge', 'fzzy-config'],
  'fzzy-config': ['kotlin-for-forge'],
  'enhanced-block-entities-reloaded': ['matlib'],
  'connectivity': ['cupboard'],
  'fastali': ['advanced-loot-info-ali'],
  'tmrv-updated': ['emi'],
  'emi-loot': ['emi'],
  'emi-ores': ['emi'],
  'emiffect': ['emi'],
  'emi-trades': ['emi'],
  'emi-professions': ['emi'],
  'jeioptimizer': ['just-enough-items-jei'],
  'just-enough-freezes': ['just-enough-items-jei'],
  'just-enough-threads': ['just-enough-items-jei'],
  'jeir-jei-rewired': ['just-enough-items-jei'],
};

export const MOD_ALTERNATIVE_DEPENDENCIES: Record<string, string[][]> = {
  'gputape': [['embeddium', 'emberbium']],
  'nvidium': [['embeddium', 'emberbium']],
  'nvidium-forged': [['embeddium', 'emberbium']],
  'flerovium': [['embeddium', 'emberbium']],
  'sodium-embeddium-options-api': [['embeddium', 'emberbium']],
  'sodium-embeddium-dynamic-lights': [['embeddium', 'emberbium']],
  'accelerated-rendering': [['embeddium', 'emberbium']],
};

export function findModByDisplayName(name: string): ModItem | undefined {
  const target = normalizeSlug(name);
  if (!target) return undefined;
  const exact = MODS_DATABASE.find(m => normalizeSlug(m.name) === target);
  if (exact) return exact;
  return MODS_DATABASE.find(m => normalizeSlug(m.name).startsWith(target));
}

export const FABRIC_TO_FORGE_SWAP: Record<string, string> = {
  'lithium': 'radium-re-reforged',
  'krypton': 'krypton-reno',
  'sodium': 'embeddium',
  'iris-shaders': 'oculus',
  'very-many-players-vmp': 'vmp-forge',
  'c2me-concurrent-chunk-management-engine': 'concurrent-chunk-management-engine-forge-c2me',
  'dashloader': 'modernfix',
  'exordium': 'immediatelyfast',
};

export interface DualPortPair {
  id: string;
  title: string;
  forgeModId: string;
  forgeLabel: string;
  forgeSummary: string;
  fabricModId: string;
  fabricLabel: string;
  fabricSummary: string;
  switchableOnForge: boolean;
  altForgeIds?: string[];
  altFabricIds?: string[];
}

export const DUAL_PORT_PAIRS: DualPortPair[] = [
  {
    id: 'gpu-chunk-renderer',
    title: 'GPU-рендер чанков (без шейдеров)',
    forgeModId: 'alloyium',
    forgeLabel: 'Alloyium (Нативный Forge)',
    forgeSummary: 'OpenGL 4.3 Compute без Sinytra; +1.3×–1.6× FPS на любых GPU (NVIDIA/AMD/Intel) и с шейдерами.',
    fabricModId: 'nvidium',
    fabricLabel: 'Nvidium (Fabric + Sinytra)',
    fabricSummary: 'NVIDIA Mesh Shaders (3×–10× FPS) через Sinytra Connector + алиас Embeddium (только без шейдеров).',
    switchableOnForge: true,
    altForgeIds: ['revidium-accedium'],
    altFabricIds: ['nvidium-forged'],
  },
  {
    id: 'c2me',
    title: 'Многопоточные чанки (C2ME)',
    forgeModId: 'concurrent-chunk-management-engine-forge-c2me',
    forgeLabel: 'C2ME-Forge (C2MEF)',
    forgeSummary: 'Нативный порт без Sinytra Connector — избегает конфликтов шины событий Forge 1.20.1.',
    fabricModId: 'c2me-concurrent-chunk-management-engine',
    fabricLabel: 'C2ME (Fabric + Sinytra)',
    fabricSummary: 'Оригинальный Fabric C2ME от ishland через Sinytra (нужны Connector Extras и noTickViewDistance = false).',
    switchableOnForge: true,
    altForgeIds: ['c2mer'],
  },
  {
    id: 'vmp',
    title: 'Высокий онлайн / игроки (VMP)',
    forgeModId: 'vmp-forge',
    forgeLabel: 'Very Many Players (Forge)',
    forgeSummary: 'Нативный Forge-порт без Sinytra и без конфликтов миксинов трекинга сущностей.',
    fabricModId: 'very-many-players-vmp',
    fabricLabel: 'VMP (Fabric + Sinytra)',
    fabricSummary: 'Оригинальный Fabric VMP через Sinytra Connector (может конфликтовать миксинами в тяжёлых паках).',
    switchableOnForge: true,
  },
  {
    id: 'zip-loading',
    title: 'Чтение .zip паков (ModernFix ↔ Quick Pack)',
    forgeModId: 'modernfix',
    forgeLabel: 'ModernFix (Нативный Forge)',
    forgeSummary: 'Ускоряет загрузку ресурсов нативно в Forge 1.20.1 без сторонних мостов.',
    fabricModId: 'quick-pack',
    fabricLabel: 'Quick Pack (Fabric / Quick Pack-Fix)',
    fabricSummary: 'Оригинал drexhd под Fabric — на Forge 1.20.1 требует Quick Pack-Fix или Sinytra Connector.',
    switchableOnForge: true,
  },
  {
    id: 'lithium-tps',
    title: 'Физика и ИИ (Radium ↔ Lithium)',
    forgeModId: 'radium-re-reforged',
    forgeLabel: 'Radium Re-Reforged (Нативный Forge)',
    forgeSummary: 'Стабильный порт Lithium с патчами под Create, C2ME и Forge-краши NBT.',
    fabricModId: 'lithium',
    fabricLabel: 'Lithium (Fabric — несовм. с Forge)',
    fabricSummary: 'Оригинальный Fabric Lithium падает даже с Sinytra Connector — ставьте Radium Re-Reforged.',
    switchableOnForge: false,
  },
  {
    id: 'krypton-net',
    title: 'Сеть Netty (Krypton Reno / Krypton Hybrid ↔ Krypton)',
    forgeModId: 'krypton-reno',
    forgeLabel: 'Krypton Reno / Krypton Hybrid (Нативный Forge)',
    forgeSummary: 'Нативный сетевой стек для Forge 1.20.1 (Krypton Hybrid для Mohist/Arclight; Pluto остановился на 1.18.2).',
    fabricModId: 'krypton',
    fabricLabel: 'Krypton (Fabric — несовм. с Forge)',
    fabricSummary: 'Velocity-нативки Fabric Krypton не работают через Sinytra — нужен Krypton Reno.',
    switchableOnForge: false,
    altForgeIds: ['krypton-hybrid', 'pluto'],
  },
  {
    id: 'sodium-core',
    title: 'Базовый 3D-рендер (Embeddium ↔ Sodium)',
    forgeModId: 'embeddium',
    forgeLabel: 'Embeddium (Нативный Forge)',
    forgeSummary: 'Официальный стандарт для Forge 1.20.1 (с алиасом "embeddium": "sodium" для Nvidium в Sinytra).',
    fabricModId: 'sodium',
    fabricLabel: 'Sodium (Fabric — несовм. с Forge)',
    fabricSummary: 'Fabric-оригинал Sodium крашнет Forge даже с Sinytra Connector.',
    switchableOnForge: false,
    altForgeIds: ['emberbium'],
  },
  {
    id: 'iris-shaders',
    title: 'Шейдеры (Oculus / Emberlens ↔ Iris)',
    forgeModId: 'oculus',
    forgeLabel: 'Oculus / Emberlens (Нативный Forge)',
    forgeSummary: 'Нативный порт Iris Shaders для Embeddium (либо Emberlens поверх Emberbium).',
    fabricModId: 'iris-shaders',
    fabricLabel: 'Iris Shaders (Fabric — несовм. с Forge)',
    fabricSummary: 'Fabric Iris несовместим с Forge 1.20.1 — используйте Oculus или Emberlens.',
    switchableOnForge: false,
    altForgeIds: ['emberlens'],
  },
  {
    id: 'worldgen-noisium',
    title: 'Шум генерации мира (Noisiumed ↔ Noisium)',
    forgeModId: 'noisiumed',
    forgeLabel: 'Noisiumed (Актуальный форк Forge)',
    forgeSummary: 'Поддерживаемое продолжение архивного Noisium для Forge 1.20.1.',
    fabricModId: 'noisium',
    fabricLabel: 'Noisium (Архивный порт)',
    fabricSummary: 'Прекращённый предшественник Noisiumed — оставляйте только один из них.',
    switchableOnForge: true,
  },
];

export function getDualPortPairForMod(modId: string): DualPortPair | null {
  for (const pair of DUAL_PORT_PAIRS) {
    if (
      pair.forgeModId === modId ||
      pair.fabricModId === modId ||
      pair.altForgeIds?.includes(modId) ||
      pair.altFabricIds?.includes(modId)
    ) {
      return pair;
    }
  }
  return null;
}

const MOD_BY_ID = new Map<string, ModItem>(MODS_DATABASE.map(m => [m.id, m]));

export function getDirectDependencies(modId: string, contextSet?: Set<string>): string[] {
  const deps = new Set<string>(MOD_HARD_DEPENDENCIES[modId] || []);
  const altGroups = MOD_ALTERNATIVE_DEPENDENCIES[modId];
  if (altGroups) {
    for (const options of altGroups) {
      if (options.length === 0) continue;
      const satisfied = contextSet ? options.find(opt => contextSet.has(opt)) : undefined;
      deps.add(satisfied || options[0]);
    }
  }
  const mod = MOD_BY_ID.get(modId);
  if (mod && mod.platform.includes('Sinytra')) {
    deps.add('sinytra-connector');
    deps.add('forgified-fabric-api');
  }
  if (mod?.recipeEcosystem === 'jei-plugin') {
    if (contextSet?.has('emi') && contextSet?.has('tmrv-updated')) {
      deps.add('emi');
      deps.add('tmrv-updated');
    } else if (!contextSet?.has('just-enough-items-jei')) {
      deps.add('just-enough-items-jei');
    }
  }
  return Array.from(deps);
}

export function getTransitiveDependencies(
  modId: string,
  visited = new Set<string>(),
  contextSet?: Set<string>
): string[] {
  if (visited.has(modId)) return [];
  visited.add(modId);
  const direct = getDirectDependencies(modId, contextSet);
  const result = new Set<string>(direct);
  for (const d of direct) {
    for (const td of getTransitiveDependencies(d, visited, contextSet)) {
      result.add(td);
    }
  }
  return Array.from(result);
}

export function getExclusivePoolForMod(modId: string): { groupId: string; poolIds: string[] } | null {
  for (const g of MOD_GROUPS) {
    if (!g.exclusive) continue;
    const addonSet = new Set(g.addonIds);
    const pool = g.memberIds.filter(id => !addonSet.has(id));
    if (pool.includes(modId)) {
      return { groupId: g.id, poolIds: pool };
    }
  }
  return null;
}

export function getRuleConflictingIds(modId: string): string[] {
  const mod = MOD_BY_ID.get(modId);
  if (!mod) return [];
  const slug = normalizeSlug(mod.name);
  const conflicts = new Set<string>();

  for (const rule of INCOMPATIBILITY_RULES) {
    const ruleSlugs = rule.conflictingMods.map(normalizeSlug);
    if (!ruleSlugs.includes(slug)) continue;

    if (rule.title.includes('OptiFine')) {
      for (const m of MODS_DATABASE) {
        const ms = normalizeSlug(m.name);
        if (slug === 'optifine') {
          if (ms !== 'optifine' && ruleSlugs.includes(ms)) conflicts.add(m.id);
        } else if (ms === 'optifine') {
          conflicts.add(m.id);
        }
      }
      continue;
    }

    if (rule.title.includes('Nvidium и шейдеров')) {
      for (const m of MODS_DATABASE) {
        const ms = normalizeSlug(m.name);
        if (mod.id === 'nvidium') {
          if (m.id !== 'nvidium' && ruleSlugs.includes(ms)) conflicts.add(m.id);
        } else if (m.id === 'nvidium') {
          conflicts.add(m.id);
        }
      }
      continue;
    }

    for (const m of MODS_DATABASE) {
      if (m.id !== modId && ruleSlugs.includes(normalizeSlug(m.name))) {
        conflicts.add(m.id);
      }
    }
  }

  const exclusive = getExclusivePoolForMod(modId);
  if (exclusive) {
    for (const pid of exclusive.poolIds) {
      if (pid !== modId) conflicts.add(pid);
    }
  }

  return Array.from(conflicts);
}

export function analyzeSelection(selectedIds: string[]) {
  const selectedSet = new Set(selectedIds);
  const selectedMods = MODS_DATABASE.filter(m => selectedSet.has(m.id));
  const conflicts: ConflictDetection[] = [];
  const conflictingIdSet = new Set<string>();

  for (const rule of INCOMPATIBILITY_RULES) {
    if (rule.title.includes('OptiFine')) {
      const opti = selectedMods.find(m => normalizeSlug(m.name) === 'optifine');
      if (!opti) continue;
      const others = selectedMods.filter(m => {
        const n = normalizeSlug(m.name);
        return n !== 'optifine' && rule.conflictingMods.some(cm => normalizeSlug(cm) === n);
      });
      if (others.length > 0) {
        const matched = [opti, ...others];
        matched.forEach(m => conflictingIdSet.add(m.id));
        conflicts.push({
          rule,
          matchedIds: matched.map(m => m.id),
          matchedNames: matched.map(m => m.name),
        });
      }
      continue;
    }

    if (rule.title.includes('Nvidium и шейдеров')) {
      const nvid = selectedMods.find(m => m.id === 'nvidium');
      if (!nvid) continue;
      const others = selectedMods.filter(m =>
        m.id !== 'nvidium' && rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(m.name))
      );
      if (others.length > 0) {
        const matched = [nvid, ...others];
        matched.forEach(m => conflictingIdSet.add(m.id));
        conflicts.push({
          rule,
          matchedIds: matched.map(m => m.id),
          matchedNames: matched.map(m => m.name),
        });
      }
      continue;
    }

    const matched = selectedMods.filter(sm =>
      rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(sm.name))
    );
    if (matched.length > 1) {
      matched.forEach(m => conflictingIdSet.add(m.id));
      conflicts.push({
        rule,
        matchedIds: matched.map(m => m.id),
        matchedNames: matched.map(m => m.name),
      });
    }
  }

  // Dependency, bridge & superseded checks
  const warnings: DependencyWarning[] = [];
  const hasSinytra = selectedSet.has('sinytra-connector');
  const hasFFAPI = selectedSet.has('forgified-fabric-api');
  const hasEmbeddium = selectedSet.has('embeddium');
  const hasEmberbium = selectedSet.has('emberbium');
  const hasEmi = selectedSet.has('emi');
  const hasJei = selectedSet.has('just-enough-items-jei');
  const hasTmrv = selectedSet.has('tmrv-updated');

  for (const mod of selectedMods) {
    if (mod.platform.includes('Sinytra')) {
      if (!hasSinytra || !hasFFAPI) {
        warnings.push({
          modId: mod.id,
          modName: mod.name,
          severity: 'red',
          message: `${mod.name} (Fabric-мод) не запустится на Forge без Sinytra Connector и Forgified Fabric API.`,
          fixModIds: ['sinytra-connector', 'forgified-fabric-api'],
        });
      }
      if (mod.id === 'nvidium' && !hasEmbeddium && !hasEmberbium) {
        warnings.push({
          modId: mod.id,
          modName: mod.name,
          severity: 'red',
          message: 'Nvidium на Forge требует Embeddium или Emberbium (и алиас embeddium -> sodium в конфиге Sinytra .connector).',
          fixModIds: ['embeddium'],
        });
      }
    }

    const hardDeps = MOD_HARD_DEPENDENCIES[mod.id] || [];
    const missingDeps = hardDeps.filter(depId => !selectedSet.has(depId));
    const missingNonSinytra = missingDeps.filter(
      depId => !(mod.platform.includes('Sinytra') && ['sinytra-connector', 'forgified-fabric-api', 'embeddium', 'emberbium'].includes(depId))
    );
    if (missingNonSinytra.length > 0) {
      const missingNames = missingNonSinytra.map(id => MOD_BY_ID.get(id)?.name || id);
      const isCriticalViewerMissing =
        mod.recipeEcosystem === 'emi-only' ||
        mod.recipeEcosystem === 'tmrv-bridge' ||
        mod.recipeEcosystem === 'jei-engine';
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: isCriticalViewerMissing ? 'red' : 'yellow',
        message: `${mod.name} требует: ${missingNames.join(' + ')}. Добавьте зависимость, иначе мод не сработает.`,
        fixModIds: missingNonSinytra,
      });
    }

    const altDepGroups = MOD_ALTERNATIVE_DEPENDENCIES[mod.id] || [];
    for (const options of altDepGroups) {
      if (mod.id === 'nvidium' && options.includes('embeddium')) continue;
      if (options.length > 0 && !options.some(optId => selectedSet.has(optId))) {
        const optNames = options.map(id => MOD_BY_ID.get(id)?.name || id);
        warnings.push({
          modId: mod.id,
          modName: mod.name,
          severity: 'yellow',
          message: `${mod.name} требует один из базовых модов: ${optNames.join(' или ')}.`,
          fixModIds: [options[0]],
        });
      }
    }

    if (mod.recipeEcosystem === 'jei-plugin' && !hasJei && !(hasEmi && hasTmrv)) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'red',
        message: hasEmi
          ? `${mod.name} — плагин JEI: для работы внутри чистого EMI нужна прослойка TMRV Updated (или JEI).`
          : `${mod.name} — плагин JEI: установите Just Enough Items (JEI) или связку EMI + TMRV Updated.`,
        fixModIds: hasEmi ? ['tmrv-updated'] : ['just-enough-items-jei'],
      });
    }

    const activeSuperseder = getModSuperseder(mod, selectedSet, undefined, false);
    if (activeSuperseder && activeSuperseder.isActiveInSelection) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'yellow',
        message: `${mod.name} лишний — ${activeSuperseder.reason}.`,
      });
    } else if (mod.coveredBy && selectedMods.some(other => other.name === mod.coveredBy || mod.coveredBy?.includes(other.name))) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'yellow',
        message: `${mod.name} избыточен — его функции уже встроены в ${mod.coveredBy}.`,
      });
    }

    if (isUnsupportedOnForge(mod)) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'red',
        message: `${mod.name} (${mod.platform}) не работает нативно на Forge 1.20.1 — ${mod.bestAlternative || 'удалите или замените Forge-портом'}.`,
      });
    } else if (mod.platform.includes('NeoForge') && !/\bForge\b/.test(mod.platform)) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'yellow',
        message: `${mod.name} рассчитан на ${mod.platform}, а не на Forge 1.20.1.`,
      });
    }
  }

  return {
    selectedMods,
    conflicts,
    conflictingIdSet,
    warnings,
  };
}

export type CheckerTier = 'green' | 'lime' | 'yellow' | 'red';

export function getCheckerTier(
  mod: ModItem,
  conflictingIdSet: Set<string> = new Set(),
  warningSeverity?: 'red' | 'yellow'
): { tier: CheckerTier; label: string; reason: string } {
  if (mod.status === 'danger' || conflictingIdSet.has(mod.id) || warningSeverity === 'red' || isUnsupportedOnForge(mod)) {
    const reason =
      mod.status === 'danger'
        ? mod.warning || 'Плацебо или высокий риск поломки/фризов'
        : conflictingIdSet.has(mod.id)
          ? 'Активный конфликт с другим выбранным модом'
          : mod.warning || mod.bestAlternative || 'Несовместим с Forge 1.20.1 или отсутствуют зависимости';
    return { tier: 'red', label: 'Плохо / Конфликт', reason };
  }

  if (mod.healthTier === 'green' && warningSeverity !== 'yellow') {
    return { tier: 'green', label: 'Стабильно', reason: 'Проверенный стабильный лидер для Forge' };
  }

  const isNeoForgeOnly = mod.platform.includes('NeoForge') && !/\bForge\b/.test(mod.platform);
  const needsBridgeOrExperimental =
    mod.platform.includes('Sinytra') ||
    mod.platform.includes('Fabric') ||
    mod.platform.includes('Quick Pack-Fix') ||
    mod.platform.includes('устаревший порт') ||
    mod.platform.includes('1.20.4') ||
    mod.platform.includes('Эксперимент') ||
    mod.id === 'concurrent-chunk-management-engine-forge-c2me' ||
    mod.id === 'c2mer' ||
    mod.id === 'tritium' ||
    mod.id === 'nvidium-forged';

  const isSuitableNative =
    warningSeverity !== 'yellow' &&
    !mod.coveredBy &&
    !isNeoForgeOnly &&
    !needsBridgeOrExperimental &&
    (mod.status === 'useful' || mod.status === 'diagnostic');

  if (isSuitableNative) {
    const reason =
      mod.status === 'diagnostic'
        ? 'Инструмент диагностики — работает стабильно, FPS сам не повышает'
        : mod.bestAlternative || mod.description;
    return { tier: 'lime', label: 'Сносно / Подходит', reason };
  }

  let reason = mod.warning || mod.bestAlternative || '';
  if (!reason) {
    if (mod.platform.includes('Sinytra')) reason = 'Работает на Forge через Sinytra Connector (требует настройки)';
    else if (mod.coveredBy) reason = `Уже встроен в ${mod.coveredBy}`;
    else if (mod.status === 'outdated') reason = 'Устарел — есть более новый лидер';
    else reason = 'Условно полезен с ограничениями по версии или лоадеру';
  }

  return { tier: 'yellow', label: 'Не гарантировано', reason };
}

export function getBaseHealthTier(mod: ModItem): CheckerTier {
  return getCheckerTier(mod, new Set()).tier;
}

export function getModEffectivenessScore(mod: ModItem): number {
  let score = 0;
  if (mod.isGroupLeader) score += 500;
  if (mod.isGroupAddon) score += 250;
  if (mod.installed) score += 120;
  switch (mod.status) {
    case 'recommended':
      score += 1000;
      break;
    case 'useful':
      score += 600;
      break;
    case 'diagnostic':
      score += 350;
      break;
    case 'redundant':
      score += 100;
      break;
    case 'outdated':
      score += 50;
      break;
    case 'danger':
      score -= 800;
      break;
  }
  if (mod.coveredBy) score -= 220;
  if (isUnsupportedOnForge(mod)) score -= 600;
  return score;
}

export type PortStrategy = 'native-forge' | 'hybrid' | 'fabric-sinytra';
export type RecipeViewerChoice = 'none' | 'jei' | 'emi' | 'emi-jei';

export interface AssemblyPreferences {
  gpu: 'nvidia' | 'amd-intel' | 'integrated';
  mode: 'singleplayer' | 'server' | 'hybrid-server';
  packSize: 'light' | 'heavy';
  useShaders: boolean;
  useCreate: boolean;
  allowSinytra: boolean;
  portStrategy?: PortStrategy;
  recipeViewer?: RecipeViewerChoice;
  goal: 'balanced' | 'max-safe' | 'potato';
  focusModId?: string | null;
}

export const INITIAL_BUILDER_PREFS: AssemblyPreferences = {
  gpu: 'nvidia',
  mode: 'singleplayer',
  packSize: 'light',
  useShaders: false,
  useCreate: false,
  allowSinytra: true,
  portStrategy: 'hybrid',
  recipeViewer: 'jei',
  goal: 'balanced',
  focusModId: null,
};

export interface ExcludedModNote {
  name: string;
  reason: string;
}

export interface SmartAssemblyResult {
  modIds: string[];
  notes: string[];
  excluded: ExcludedModNote[];
}

export function buildSmartAssembly(prefs: AssemblyPreferences): SmartAssemblyResult {
  const anchorRaw = prefs.focusModId ? MOD_BY_ID.get(prefs.focusModId) : undefined;
  const notes: string[] = [];
  const excluded: ExcludedModNote[] = [];

  let activeAnchor: ModItem | undefined = anchorRaw;
  if (anchorRaw && isUnsupportedOnForge(anchorRaw)) {
    const swapId = FABRIC_TO_FORGE_SWAP[anchorRaw.id];
    const swapMod = swapId ? MOD_BY_ID.get(swapId) : undefined;
    if (swapMod) {
      notes.push(`Упор «${anchorRaw.name}» недоступен на Forge 1.20.1 — автоматически переключён нативный порт ${swapMod.name}.`);
      excluded.push({ name: anchorRaw.name, reason: `Fabric-оригинал заменён на порт ${swapMod.name}.` });
      activeAnchor = swapMod;
    } else {
      notes.push(`Упор «${anchorRaw.name}» несовместим с Forge 1.20.1 — упор пропущен.`);
      excluded.push({ name: anchorRaw.name, reason: anchorRaw.bestAlternative || 'Не работает на Forge 1.20.1.' });
      activeAnchor = undefined;
    }
  } else if (anchorRaw && anchorRaw.status === 'danger') {
    notes.push(`Упор «${anchorRaw.name}» заблокирован умным движком: ${anchorRaw.warning || 'плацебо или высокий риск краша'}.`);
    excluded.push({ name: anchorRaw.name, reason: anchorRaw.warning || 'Опасный или плацебо-мод.' });
    activeAnchor = undefined;
  } else if (anchorRaw && anchorRaw.coveredBy) {
    notes.push(`Упор «${anchorRaw.name}» уже встроен в ${anchorRaw.coveredBy} — использован основной лидер.`);
  }

  const portStrategy: PortStrategy =
    prefs.portStrategy ?? (prefs.allowSinytra ? 'hybrid' : 'native-forge');

  let recipeViewer: RecipeViewerChoice = prefs.recipeViewer ?? 'jei';
  if (activeAnchor) {
    if (activeAnchor.id === 'tmrv-updated' || activeAnchor.id === 'emi' || activeAnchor.recipeEcosystem === 'emi-only') {
      recipeViewer = activeAnchor.id === 'tmrv-updated' || recipeViewer === 'none' || recipeViewer === 'jei' ? 'emi' : recipeViewer;
    } else if (activeAnchor.id === 'just-enough-items-jei' || activeAnchor.recipeEcosystem === 'jei-engine') {
      recipeViewer = recipeViewer === 'emi-jei' ? 'emi-jei' : 'jei';
    } else if (activeAnchor.recipeEcosystem === 'jei-plugin' && recipeViewer === 'none') {
      recipeViewer = 'jei';
    }
  }

  const effectivePrefs: AssemblyPreferences = {
    ...prefs,
    portStrategy,
    recipeViewer,
    allowSinytra: portStrategy === 'fabric-sinytra' ? true : prefs.allowSinytra,
    focusModId: activeAnchor?.id ?? null,
  };

  let useEmberlensPipeline = false;
  if (activeAnchor) {
    const aid = activeAnchor.id;
    const anchorPair = getDualPortPairForMod(aid);
    if (aid === 'nvidium' || aid === 'nvidium-forged') {
      effectivePrefs.gpu = 'nvidia';
      effectivePrefs.allowSinytra = true;
      effectivePrefs.useShaders = false;
      if (effectivePrefs.goal === 'potato') effectivePrefs.goal = 'balanced';
      notes.push(`Упор на ${activeAnchor.name}: активирован Sinytra Connector + Embeddium + Flerovium, а шейдеры и Alloyium отключены для работы Mesh Shaders.`);
    } else if (aid === 'alloyium') {
      if (effectivePrefs.goal === 'potato') effectivePrefs.goal = 'balanced';
      notes.push('Упор на Alloyium: выбран нативный OpenGL Compute конвейер (без Nvidium). Доступно переключение на Nvidium (Fabric + Sinytra) в блоке выбора портов.');
    } else if (aid === 'emberlens' || aid === 'emberbium') {
      useEmberlensPipeline = true;
      effectivePrefs.useShaders = true;
      if (effectivePrefs.goal === 'potato') effectivePrefs.goal = 'balanced';
      notes.push(`Упор на ${activeAnchor.name}: подключена альтернативная связка Emberbium + Emberlens (вместо Embeddium + Oculus + Nvidium).`);
    } else if (aid === 'oculus' || aid === 'faster-iris-shadow-mapper') {
      effectivePrefs.useShaders = true;
      if (effectivePrefs.goal === 'potato') effectivePrefs.goal = 'balanced';
      notes.push(`Упор на ${activeAnchor.name}: включён шейдерный стек Embeddium + Oculus (Nvidium исключён).`);
    } else if (aid === 'c2me-concurrent-chunk-management-engine' || activeAnchor.platform.includes('Sinytra')) {
      effectivePrefs.allowSinytra = true;
      notes.push(`Упор на ${activeAnchor.name} (Fabric + Sinytra): подключены Sinytra Connector + Forgified Fabric API.${anchorPair?.switchableOnForge ? ` Можно в 1 клик переключить на нативный Forge-порт ${anchorPair.forgeLabel}.` : ''}`);
    } else if (aid === 'concurrent-chunk-management-engine-forge-c2me' || aid === 'c2mer' || aid === 'vmp-forge') {
      notes.push(`Упор на нативный Forge-порт ${activeAnchor.name}: Fabric-дубликаты исключены.${anchorPair?.switchableOnForge ? ` При желании можно переключить на ${anchorPair.fabricLabel}.` : ''}`);
    } else if (aid === 'pluto' || aid === 'krypton-hybrid') {
      notes.push(`Упор на сетевой стек ${activeAnchor.name}: он заменил стандартный Krypton Reno в сетевом слоте.`);
    } else if (aid === 'accelerated-rendering') {
      if (effectivePrefs.goal === 'potato') effectivePrefs.goal = 'balanced';
      notes.push('Упор на Accelerated Rendering: подключён OpenGL 4.6 GPU-инстансинг сущностей и анимаций GeckoLib.');
    } else if (aid === 'distant-horizons' || aid === 'distant-horizons-memory-fix-dh') {
      notes.push('Упор на Distant Horizons: добавлены DH Memory Fix, Noisiumed и асинхронная подгрузка чанков под сверхдальний LOD.');
    } else if (aid === 'emi' || aid === 'tmrv-updated') {
      notes.push(`Упор на ${activeAnchor.name}: включена экосистема EMI + прослойка TMRV Updated + нативные EMI-плагины.`);
    } else {
      notes.push(`Упор на мод ${activeAnchor.name}: конфликтные аналоги исключены, а недостающие зависимости подтянуты автоматически.`);
    }
  } else if (portStrategy === 'native-forge') {
    notes.push('Режим портов «Нативный Forge»: для C2ME, VMP, GPU-рендера (Alloyium) и сети выбраны прямые Forge-порты без зависимости от Sinytra Connector.');
  } else if (portStrategy === 'fabric-sinytra') {
    notes.push('Режим портов «Fabric + Sinytra»: подключены оригинальные Fabric-версии (Nvidium, C2ME, VMP) через Sinytra Connector (LTS) + Forgified Fabric API.');
  } else {
    notes.push('Режим «Гибрид (Умный баланс)»: VMP и C2ME берутся нативными Forge-портами без лишних миксинов, а для NVIDIA без шейдеров подключается Nvidium через Sinytra.');
  }

  const isPotato = effectivePrefs.goal === 'potato' || effectivePrefs.gpu === 'integrated';
  const isHeavy = effectivePrefs.packSize === 'heavy' || effectivePrefs.goal === 'max-safe';

  const ids = new Set<string>([
    'embeddium',
    'sodium-chloride',
    'immediatelyfast',
    'entity-culling',
    'more-culling-reforged',
    'enhanced-block-entities-reloaded',
    'culllessleaves-reforged',
    'modernfix',
    'ferritecore',
    'alltheleaks-memory-leak-fix',
    'jasione',
    'put-a-plug-in-it-papi',
    'radium-re-reforged',
    'badoptimizations',
    'noisiumed',
    'ixeris',
    'dynamic-fps',
    'packet-fixer',
    'fastvancements',
    'clumps',
    'let-me-despawn',
    'cloth-config-v12',
    'matlib',
  ]);

  // Recipe Viewer ecosystem (JEI vs EMI vs EMI+JEI + bridges)
  if (recipeViewer === 'jei') {
    ids.add('just-enough-items-jei');
    ids.add('jei-emi-optimizations');
    ids.add('fast-recipe-search');
    if (isHeavy) {
      ids.add('jeioptimizer');
      ids.add('just-enough-freezes');
      ids.add('just-enough-threads');
    }
    notes.push('Просмотрщик рецептов: Just Enough Items (JEI) + JEI/EMI Optimizations' + (isHeavy ? ' + многопоточная индексация JEI.' : '.'));
    excluded.push({ name: 'EMI / TMRV Updated / EMI Loot', reason: 'Отключены, так как выбран классический режим JEI.' });
  } else if (recipeViewer === 'emi') {
    ids.add('emi');
    ids.add('tmrv-updated');
    ids.add('jei-emi-optimizations');
    ids.add('fast-recipe-search');
    if (isHeavy || effectivePrefs.goal === 'max-safe') {
      ids.add('emi-loot');
      ids.add('emi-ores');
      ids.add('emiffect');
      ids.add('emi-professions');
    }
    notes.push('Просмотрщик рецептов: EMI + прослойка TMRV Updated (запускает плагины JEI внутри EMI без самого JEI).');
    excluded.push({ name: 'Just Enough Items (JEI) + JEIOptimizer / Threads', reason: 'Заменены на EMI + TMRV Updated.' });
    if (isHeavy || effectivePrefs.goal === 'max-safe') {
      excluded.push({ name: 'JER / JEP / JEED', reason: 'Полностью перекрыты более быстрыми нативными EMI-плагинами (EMI Loot + EMI Ores, EMI Professions, EMIffect).' });
    }
  } else if (recipeViewer === 'emi-jei') {
    ids.add('emi');
    ids.add('just-enough-items-jei');
    ids.add('jei-emi-optimizations');
    ids.add('fast-recipe-search');
    if (isHeavy || effectivePrefs.goal === 'max-safe') {
      ids.add('emi-loot');
      ids.add('emi-ores');
      ids.add('emiffect');
      ids.add('emi-professions');
      ids.add('jeioptimizer');
      ids.add('just-enough-freezes');
      ids.add('just-enough-threads');
    }
    notes.push('Режим EMI + JEI: работают оба просмотрщика (прослойка TMRV Updated отключена, так как EMI нативно подхватывает установленный JEI).');
    excluded.push({ name: 'TMRV Updated', reason: 'Конфликтует с JEI — не нужен при совместной установке EMI + JEI.' });
  } else {
    excluded.push({ name: 'JEI / EMI и их плагины', reason: 'Просмотрщик рецептов отключён в настройках сборки.' });
  }

  // Network layer based on server architecture
  if (effectivePrefs.mode === 'hybrid-server') {
    ids.add('krypton-hybrid');
    ids.add('connectivity');
    ids.add('servercore');
    notes.push('Выбран Krypton Hybrid (сжатие Zstd и фиксы для гибридных серверов Mohist/Arclight) вместо Krypton Reno.');
    excluded.push({ name: 'Krypton Reno', reason: 'Заменён на Krypton Hybrid для совместимости с гибрид-ядром.' });
  } else {
    ids.add('krypton-reno');
    if (effectivePrefs.mode === 'server') {
      ids.add('servercore');
      ids.add('connectivity');
      ids.add('fast-ip-ping');
      ids.add('spark');
      if (!effectivePrefs.allowSinytra && isHeavy) {
        ids.add('vmp-forge');
      }
      notes.push('Для сетевой игры добавлены ServerCore, Connectivity, Fast IP Ping и Spark.');
    } else {
      ids.add('smooth-boot-reloaded');
      notes.push('Для одиночной игры добавлен Smooth Boot (Reloaded) для безопасного распределения потоков CPU без поломки спавн-чанков.');
    }
  }

  // Heavy modpack / Max-safe optimizations
  if (isHeavy) {
    [
      'duplicate-nbt-flattener',
      'capability-fix-revived',
      'structure-dfu-cache',
      'structure-layout-optimizer',
      'broken-tag-fixer',
      'stutterfix-reforged',
      'threadtweak-reforged',
      'smooth-boot-reloaded',
      'lightspeedre',
      'language-reload-reforged',
      'fastsuite',
      'fastfurnace',
      'fastworkbench',
      'fast-item-frames',
    ].forEach(id => ids.add(id));
    notes.push('Для большой/максимальной сборки подключены кеш рецептов FastSuite/Furnace/Workbench, Structure DFU Cache и потоковые фиксы.');
  } else {
    excluded.push({ name: 'FastSuite / FastFurnace / FastWorkbench', reason: 'Не требуются в лёгкой сборке (лишняя зависимость Placebo).' });
  }

  if (effectivePrefs.goal === 'max-safe') {
    [
      'sodium-chloride',
      'flerovium',
      'better-biome-reblend',
      'kerria',
      'servercore',
      'immersive-optimization',
      'alternate-current',
      'entity-collision-optimization',
      'villager-optimizer',
      'falling-blocks-fps-fix',
      'restmode',
      'particle-core',
      'kotlin-for-forge',
      'fzzy-config',
      'fast-sounds',
      'soundgc',
      'reload-looping-sound-fix',
      'connectivity',
      'cupboard',
      'geckolib-animation-optimizer',
      'async-screenshot',
    ].forEach(id => ids.add(id));
  }

  const anchorForcesAlloyium = activeAnchor?.id === 'alloyium' || activeAnchor?.id === 'revidium-accedium';
  const anchorForcesNvidium = activeAnchor?.id === 'nvidium' || activeAnchor?.id === 'nvidium-forged';
  const useNvidium =
    !useEmberlensPipeline &&
    !anchorForcesAlloyium &&
    (anchorForcesNvidium ||
      (effectivePrefs.allowSinytra &&
        portStrategy !== 'native-forge' &&
        effectivePrefs.gpu === 'nvidia' &&
        !effectivePrefs.useShaders &&
        !isPotato));

  // Core GPU / Shader pipeline
  if (useEmberlensPipeline) {
    ids.add('emberbium');
    ids.add('emberlens');
    ids.add('flywheel');
    ids.add('vanillin');
    excluded.push({
      name: 'Embeddium + Oculus + Alloyium + Nvidium',
      reason: 'Заменены на альтернативный шейдерный стек Emberbium + Emberlens.',
    });
  } else if (isPotato && !anchorForcesAlloyium) {
    ids.add('amd-fsr-upscaler-render-scale-for-embeddium');
    ids.add('restmode');
    ids.add('particle-core');
    ids.add('kotlin-for-forge');
    ids.add('fzzy-config');
    ids.add('fast-sounds');
    ids.add('dynamicrenderdistance');
    notes.push('Режим слабой графики: добавлены AMD FSR апскейлер, проверенная динамическая дальность DynamicRenderDistance, RestMode и оптимизатор частиц (без дубля PartiCull).');
    excluded.push({ name: 'FastBoot / Accelerated Rendering / Alloyium', reason: 'FastBoot уже встроен в ModernFix, а Compute Shaders могут перегружать слабую GPU и активно расходовать VRAM.' });
  } else if (!useNvidium) {
    ids.add('alloyium');
    if (effectivePrefs.goal === 'max-safe' || activeAnchor?.id === 'accelerated-rendering') {
      ids.add('accelerated-rendering');
      notes.push('Для дискретной GPU добавлены Alloyium, Flerovium и Accelerated Rendering (OpenGL 4.6 — расходует больше VRAM GPU, при нехватке видеопамяти уберите).');
    } else {
      notes.push('Добавлен Alloyium (нативный Compute-аддон к Embeddium для любых видеокарт без Sinytra).');
    }
  } else {
    ids.add('flerovium');
    excluded.push({ name: 'Alloyium', reason: 'Заменён на Nvidium (оба мода перехватывают GPU-рендер чанков Embeddium).' });
  }

  // Shaders (Oculus) vs Nvidium conflict prevention
  if (!useEmberlensPipeline && effectivePrefs.useShaders && effectivePrefs.goal !== 'potato') {
    ids.add('oculus');
    ids.add('faster-iris-shadow-mapper');
    ids.add('gputape');
    notes.push('Активированы шейдеры: Oculus + Faster Iris Shadow Mapper + GPUTape (стандартный стек на Embeddium).');
    excluded.push({ name: 'Emberlens', reason: 'Форк Oculus, требующий Emberbium вместо Embeddium (исключён во избежание конфликта).' });
    if (effectivePrefs.allowSinytra) {
      excluded.push({ name: 'Nvidium', reason: 'Жёсткий конфликт с буферами шейдеров Oculus (исключён автоматически).' });
    }
  } else if (effectivePrefs.useShaders && effectivePrefs.goal === 'potato') {
    excluded.push({ name: 'Oculus и шейдеры', reason: 'Пропущены, так как выбрана цель «Слабый ПК».' });
  }

  // Create & mechanical mods
  if (effectivePrefs.useCreate) {
    ids.add('flywheel');
    ids.add('vanillin');
    ids.add('immersive-optimization');
    ids.add('alternate-current');
    ids.add('entity-collision-optimization');
    ids.add('observable');
    notes.push('Для Create/индустрии добавлены Flywheel, Vanillin, Alternate Current, Immersive Optimization и Observable.');
  }

  // Chunk & Online ports choice (Native Forge vs Fabric + Sinytra)
  const useFabricC2ME =
    effectivePrefs.allowSinytra &&
    activeAnchor?.id !== 'concurrent-chunk-management-engine-forge-c2me' &&
    activeAnchor?.id !== 'c2mer' &&
    (activeAnchor?.id === 'c2me-concurrent-chunk-management-engine' || portStrategy === 'fabric-sinytra');

  const useNativeC2MEF =
    !useFabricC2ME &&
    activeAnchor?.id !== 'c2me-concurrent-chunk-management-engine' &&
    (activeAnchor?.id === 'concurrent-chunk-management-engine-forge-c2me' ||
      (!isPotato && (isHeavy || portStrategy === 'native-forge' || effectivePrefs.allowSinytra)));

  const useFabricVMP =
    effectivePrefs.allowSinytra &&
    activeAnchor?.id !== 'vmp-forge' &&
    (activeAnchor?.id === 'very-many-players-vmp' || (portStrategy === 'fabric-sinytra' && effectivePrefs.mode !== 'singleplayer' && isHeavy));

  if (useFabricC2ME) {
    ids.add('c2me-concurrent-chunk-management-engine');
    excluded.push({ name: 'C2ME-Forge (C2MEF)', reason: 'Выбран оригинальный Fabric C2ME через Sinytra Connector.' });
  } else if (useNativeC2MEF) {
    ids.add('concurrent-chunk-management-engine-forge-c2me');
    if (effectivePrefs.allowSinytra) {
      excluded.push({ name: 'C2ME (Fabric)', reason: 'Заменён на нативный C2ME-Forge (C2MEF) во избежание конфликтов шины событий.' });
    }
  }

  if (useFabricVMP) {
    ids.add('very-many-players-vmp');
    ids.delete('vmp-forge');
    excluded.push({ name: 'Very Many Players (Forge)', reason: 'Выбрана Fabric-версия VMP через Sinytra Connector.' });
  } else if (effectivePrefs.mode !== 'singleplayer' && isHeavy) {
    ids.add('vmp-forge');
    if (effectivePrefs.allowSinytra) {
      excluded.push({ name: 'VMP (Fabric)', reason: 'Выбран нативный VMP (Forge) без конфликтов миксинов через Sinytra.' });
    }
  }

  // Sinytra Connector Fabric Bridge
  if (effectivePrefs.allowSinytra) {
    const needsSinytraBridge =
      useNvidium ||
      useFabricC2ME ||
      useFabricVMP ||
      Boolean(activeAnchor?.platform.includes('Sinytra'));

    if (needsSinytraBridge || portStrategy === 'fabric-sinytra') {
      ids.add('sinytra-connector');
      ids.add('forgified-fabric-api');
      ids.add('connector-extras');
    }

    if (useNvidium) {
      ids.add('nvidium');
      notes.push('Через Sinytra подключён Nvidium (RTX/GTX 16xx+). В connector.json добавьте алиас "embeddium": "sodium" (или Nvidium Forged).');
    } else if (activeAnchor?.id !== 'bobby-reforged') {
      ids.add('distant-horizons');
      ids.add('distant-horizons-memory-fix-dh');
      if (portStrategy === 'native-forge' && effectivePrefs.gpu === 'nvidia' && !effectivePrefs.useShaders && !isPotato) {
        excluded.push({ name: 'Nvidium', reason: 'Отключён из-за приоритета «Нативный Forge» (используется Alloyium + Distant Horizons).' });
      } else if (effectivePrefs.gpu !== 'nvidia') {
        excluded.push({ name: 'Nvidium', reason: 'Требует видеокарту NVIDIA (GTX 16xx / RTX 20xx+), заменён на Alloyium + Distant Horizons.' });
      } else if (isPotato) {
        excluded.push({ name: 'Nvidium', reason: 'Для слабого ПК вместо Mesh Shaders подключён Distant Horizons.' });
      }
      notes.push('Подключён Distant Horizons (безопасный LOD на любой GPU и совместим с шейдерами).');
    }
  } else {
    excluded.push({ name: 'Nvidium / C2ME (Fabric) / VMP (Fabric)', reason: 'Прослойка Sinytra Connector выключена — сборка на 100% нативном Forge.' });
  }

  // Apply anchor mod + resolve any conflicts and orphaned dependents around it
  if (activeAnchor && !activeAnchor.coveredBy) {
    for (const cid of getRuleConflictingIds(activeAnchor.id)) {
      if (ids.delete(cid)) {
        const cname = MOD_BY_ID.get(cid)?.name || cid;
        if (!excluded.some(e => e.name === cname)) {
          excluded.push({ name: cname, reason: `Заменён из-за упора сборки на ${activeAnchor.name}.` });
        }
      }
    }

    ids.add(activeAnchor.id);
    for (const depId of getTransitiveDependencies(activeAnchor.id)) {
      for (const depConflict of getRuleConflictingIds(depId)) {
        if (ids.delete(depConflict)) {
          const cname = MOD_BY_ID.get(depConflict)?.name || depConflict;
          if (!excluded.some(e => e.name === cname)) {
            excluded.push({ name: cname, reason: `Конфликтует с зависимостью упора (${MOD_BY_ID.get(depId)?.name || depId}).` });
          }
        }
      }
      ids.add(depId);
    }

    let cascadeChanged = true;
    while (cascadeChanged) {
      cascadeChanged = false;
      for (const id of Array.from(ids)) {
        if (getDirectDependencies(id).some(d => !ids.has(d))) {
          ids.delete(id);
          cascadeChanged = true;
        }
      }
    }
  }

  excluded.push(
    { name: 'OptiFine / Xenon / Rubidium', reason: 'Конфликтуют с базовым рендерером.' },
    { name: 'Lithium / Krypton / Indium / DashLoader', reason: 'Fabric-оригиналы заменены на нативные порты Forge (Radium Re-Reforged, Krypton Reno/Hybrid/Pluto, ModernFix).' }
  );

  // Enforce strict conflict & dependency cleanup over computed assembly
  const cleaned = smartFixAssembly(Array.from(ids), effectivePrefs);
  return { modIds: cleaned, notes, excluded };
}

export function smartFixAssembly(selectedIds: string[], prefs?: AssemblyPreferences): string[] {
  const next = new Set(selectedIds);
  const focusId = prefs?.focusModId || null;

  // 1. Swap unsupported Fabric originals to their Forge ports if not already present, drop danger/covered
  for (const id of Array.from(next)) {
    const mod = MOD_BY_ID.get(id);
    if (!mod) {
      next.delete(id);
      continue;
    }
    if (isUnsupportedOnForge(mod)) {
      next.delete(id);
      const swap = FABRIC_TO_FORGE_SWAP[id];
      if (swap) next.add(swap);
      continue;
    }
    if (mod.status === 'danger' || mod.coveredBy) {
      next.delete(id);
      continue;
    }
  }

  // 2. Resolve exclusive group conflicts (anchored mod wins first, else leader, else highest effectiveness)
  for (const g of MOD_GROUPS) {
    if (!g.exclusive) continue;
    const addonSet = new Set(g.addonIds);
    const pool = g.memberIds.filter(id => !addonSet.has(id));
    const chosen = pool.filter(id => next.has(id));
    if (chosen.length > 1) {
      chosen.sort((a, b) => {
        if (focusId && a === focusId) return -1;
        if (focusId && b === focusId) return 1;
        if (a === g.leaderId) return -1;
        if (b === g.leaderId) return 1;
        return getModEffectivenessScore(MOD_BY_ID.get(b)!) - getModEffectivenessScore(MOD_BY_ID.get(a)!);
      });
      chosen.slice(1).forEach(id => next.delete(id));
    }
  }

  // 3. Resolve cross-group conflicts respecting anchored focusModId
  if (next.has('nvidium') && next.has('oculus')) {
    if (focusId === 'nvidium' || focusId === 'nvidium-forged') next.delete('oculus');
    else if (focusId === 'oculus') next.delete('nvidium');
    else next.delete(prefs?.useShaders ? 'nvidium' : 'oculus');
  }
  if (next.has('nvidium') && next.has('emberlens')) {
    if (focusId === 'nvidium' || focusId === 'nvidium-forged') next.delete('emberlens');
    else if (focusId === 'emberlens' || focusId === 'emberbium') next.delete('nvidium');
    else next.delete(prefs?.useShaders ? 'nvidium' : 'emberlens');
  }
  if (next.has('nvidium') && next.has('alloyium')) {
    if (focusId === 'alloyium') {
      next.delete('nvidium');
    } else if (focusId === 'nvidium' || focusId === 'nvidium-forged') {
      next.delete('alloyium');
    } else {
      const keepNvidium =
        prefs?.gpu === 'nvidia' &&
        !prefs?.useShaders &&
        prefs?.allowSinytra !== false &&
        prefs?.portStrategy !== 'native-forge';
      next.delete(keepNvidium ? 'alloyium' : 'nvidium');
    }
  }
  if (next.has('nvidium') && next.has('revidium-accedium')) {
    next.delete(focusId === 'revidium-accedium' ? 'nvidium' : 'revidium-accedium');
  }
  if (next.has('oculus') && next.has('emberlens')) {
    if (focusId === 'emberlens' || focusId === 'emberbium' || (next.has('emberbium') && !next.has('embeddium'))) {
      next.delete('oculus');
    } else {
      next.delete('emberlens');
    }
  }
  if (next.has('c2me-concurrent-chunk-management-engine') && next.has('concurrent-chunk-management-engine-forge-c2me')) {
    if (focusId === 'concurrent-chunk-management-engine-forge-c2me') {
      next.delete('c2me-concurrent-chunk-management-engine');
    } else if (focusId === 'c2me-concurrent-chunk-management-engine') {
      next.delete('concurrent-chunk-management-engine-forge-c2me');
    } else if (prefs?.portStrategy === 'fabric-sinytra') {
      next.delete('concurrent-chunk-management-engine-forge-c2me');
    } else {
      next.delete('c2me-concurrent-chunk-management-engine');
    }
  }
  if (next.has('c2mer') && (next.has('c2me-concurrent-chunk-management-engine') || next.has('concurrent-chunk-management-engine-forge-c2me'))) {
    if (focusId === 'c2mer') {
      next.delete('c2me-concurrent-chunk-management-engine');
      next.delete('concurrent-chunk-management-engine-forge-c2me');
    } else {
      next.delete('c2mer');
    }
  }
  if (next.has('vmp-forge') && next.has('very-many-players-vmp')) {
    if (focusId === 'very-many-players-vmp') next.delete('vmp-forge');
    else if (focusId === 'vmp-forge') next.delete('very-many-players-vmp');
    else if (prefs?.portStrategy === 'fabric-sinytra') next.delete('vmp-forge');
    else next.delete('very-many-players-vmp');
  }
  if (next.has('noisiumed') && next.has('noisium')) {
    next.delete(focusId === 'noisium' ? 'noisiumed' : 'noisium');
  }
  if (next.has('modernfix') && next.has('dashloader')) {
    next.delete('dashloader');
  }
  if (next.has('jasione') && next.has('redirected')) next.delete('redirected');
  if (next.has('jasione') && next.has('redirector-modern')) next.delete('redirector-modern');
  if (next.has('krypton-hybrid') && next.has('aegisnetworking-krypton-hybrid')) {
    next.delete(focusId === 'aegisnetworking-krypton-hybrid' ? 'krypton-hybrid' : 'aegisnetworking-krypton-hybrid');
  }
  if (next.has('tmrv-updated') && next.has('just-enough-items-jei')) {
    if (focusId === 'tmrv-updated') next.delete('just-enough-items-jei');
    else if (focusId === 'just-enough-items-jei') next.delete('tmrv-updated');
    else if (prefs?.recipeViewer === 'emi') next.delete('just-enough-items-jei');
    else next.delete('tmrv-updated');
  }
  if (next.has('accelerated-rendering') && next.has('accelerated-rendering-turned')) {
    next.delete(focusId === 'accelerated-rendering-turned' ? 'accelerated-rendering' : 'accelerated-rendering-turned');
  }

  // 3b. Drop mods whose functionality is 100% covered by a strictly better selected superseder
  for (const id of Array.from(next)) {
    if (focusId && id === focusId) continue;
    const mod = MOD_BY_ID.get(id);
    if (!mod) continue;
    const sup = getModSuperseder(mod, next, prefs, false);
    if (sup?.isActiveInSelection) {
      next.delete(id);
    }
  }

  // 4. Remove orphaned dependents before/after pulling deps for surviving mods
  let pruneOrphans = true;
  while (pruneOrphans) {
    pruneOrphans = false;
    for (const id of Array.from(next)) {
      const deps = getDirectDependencies(id, next);
      if (deps.some(d => !next.has(d) && getRuleConflictingIds(d).some(c => next.has(c)))) {
        next.delete(id);
        pruneOrphans = true;
      }
    }
  }

  for (const id of Array.from(next)) {
    for (const dep of getTransitiveDependencies(id, new Set(), next)) {
      if (!getRuleConflictingIds(dep).some(c => next.has(c))) {
        next.add(dep);
      }
    }
  }

  return Array.from(next);
}

export interface SmartToggleResult {
  nextIds: string[];
  notice: string | null;
  noticeTone: 'info' | 'warn';
}

export function toggleModSmart(
  currentIds: string[],
  modId: string,
  options: { strict: boolean; prefs?: AssemblyPreferences }
): SmartToggleResult {
  const mod = MOD_BY_ID.get(modId);
  if (!mod) return { nextIds: currentIds, notice: null, noticeTone: 'info' };

  const currentSet = new Set(currentIds);

  // Removing mod
  if (currentSet.has(modId)) {
    const next = new Set(currentIds);
    next.delete(modId);

    if (!options.strict) {
      return { nextIds: Array.from(next), notice: null, noticeTone: 'info' };
    }

    // Cascade-remove dependents that require removed mod(s)
    const removedDependents: string[] = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of Array.from(next)) {
        const depMod = MOD_BY_ID.get(id);
        const deps = getDirectDependencies(id, next);
        const pluginLostAllHosts =
          depMod?.recipeEcosystem === 'jei-plugin' &&
          !next.has('just-enough-items-jei') &&
          !(next.has('emi') && next.has('tmrv-updated'));
        if (deps.some(d => !next.has(d)) || pluginLostAllHosts) {
          next.delete(id);
          removedDependents.push(depMod?.name || id);
          changed = true;
        }
      }
    }

    return {
      nextIds: Array.from(next),
      notice:
        removedDependents.length > 0
          ? `Убран ${mod.name} и зависимые от него моды: ${removedDependents.join(', ')}.`
          : null,
      noticeTone: 'info',
    };
  }

  // Adding mod in free mode
  if (!options.strict) {
    return { nextIds: [...currentIds, modId], notice: null, noticeTone: 'info' };
  }

  // Strict smart mode checks
  if (mod.status === 'danger') {
    return {
      nextIds: currentIds,
      notice: `${mod.name} заблокирован умной защитой: ${mod.warning || 'плацебо или высокий риск краша'}. Отключите режим 1-слота для ручного теста.`,
      noticeTone: 'warn',
    };
  }

  if (isUnsupportedOnForge(mod)) {
    const swapId = FABRIC_TO_FORGE_SWAP[mod.id];
    if (swapId && MOD_BY_ID.has(swapId)) {
      const swapped = toggleModSmart(currentIds, swapId, options);
      const swapName = MOD_BY_ID.get(swapId)!.name;
      return {
        nextIds: swapped.nextIds,
        notice: `${mod.name} не работает на Forge 1.20.1 — автоматически подключён Forge-порт ${swapName}.`,
        noticeTone: 'info',
      };
    }
    return {
      nextIds: currentIds,
      notice: `${mod.name} не работает на Forge 1.20.1 (${mod.bestAlternative || 'несовместим даже через Sinytra'}).`,
      noticeTone: 'warn',
    };
  }

  if (mod.coveredBy) {
    return {
      nextIds: currentIds,
      notice: `${mod.name} не нужен — его функции уже встроены в ${mod.coveredBy}.`,
      noticeTone: 'warn',
    };
  }

  // Cleanly add mod + transitive dependencies, resolve all rule/exclusive conflicts + orphaned dependents
  const next = new Set(currentIds);
  const removedNames: string[] = [];
  const addedDeps: string[] = [];

  const conflictingIds = getRuleConflictingIds(modId);
  for (const cid of conflictingIds) {
    if (next.has(cid)) {
      next.delete(cid);
      removedNames.push(MOD_BY_ID.get(cid)?.name || cid);
    }
  }

  next.add(modId);
  for (const depId of getTransitiveDependencies(modId, new Set(), next)) {
    if (!next.has(depId)) {
      // Also resolve any conflicts introduced by adding dependency
      for (const depConflict of getRuleConflictingIds(depId)) {
        if (next.has(depConflict)) {
          next.delete(depConflict);
          removedNames.push(MOD_BY_ID.get(depConflict)?.name || depConflict);
        }
      }
      next.add(depId);
      addedDeps.push(MOD_BY_ID.get(depId)?.name || depId);
    }
  }

  // Remove orphaned dependents of any conflicted mods we just removed
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Array.from(next)) {
      if (getDirectDependencies(id, next).some(d => !next.has(d))) {
        next.delete(id);
        removedNames.push(MOD_BY_ID.get(id)?.name || id);
        changed = true;
      }
    }
  }

  const parts: string[] = [];
  if (addedDeps.length > 0) parts.push(`добраны зависимости: ${addedDeps.join(', ')}`);
  if (removedNames.length > 0) parts.push(`заменены конфликтные: ${removedNames.join(', ')}`);

  return {
    nextIds: Array.from(next),
    notice: parts.length > 0 ? `${mod.name} выбран — ${parts.join('; ')}.` : null,
    noticeTone: 'info',
  };
}

export function removeModsCascade(currentIds: string[], removeIds: string[]): { nextIds: string[]; cascadedNames: string[] } {
  const next = new Set(currentIds);
  for (const rid of removeIds) {
    next.delete(rid);
  }
  const cascadedNames: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Array.from(next)) {
      if (getDirectDependencies(id, next).some(d => !next.has(d))) {
        next.delete(id);
        cascadedNames.push(MOD_BY_ID.get(id)?.name || id);
        changed = true;
      }
    }
  }
  return { nextIds: Array.from(next), cascadedNames };
}

export interface MissingSlotWarning {
  groupId: string;
  groupTitle: string;
  leaderId: string;
  leaderName: string;
}

export function evaluateAssemblyHealth(selectedIds: string[]) {
  const analysis = analyzeSelection(selectedIds);
  const selectedSet = new Set(selectedIds);

  const essentialGroupIds = [
    'core-renderer',
    'memory-core',
    'tick-physics-engine',
    'block-culling',
    'networking',
  ];

  const missingCoreSlots: MissingSlotWarning[] = [];
  if (selectedIds.length > 0) {
    for (const gid of essentialGroupIds) {
      const grp = MOD_GROUPS.find(g => g.id === gid);
      if (!grp) continue;
      const hasAny = grp.memberIds.some(id => selectedSet.has(id));
      if (!hasAny) {
        const leader = MOD_BY_ID.get(grp.leaderId);
        if (leader) {
          missingCoreSlots.push({
            groupId: grp.id,
            groupTitle: grp.title,
            leaderId: leader.id,
            leaderName: leader.name,
          });
        }
      }
    }
  }

  return {
    ...analysis,
    missingCoreSlots,
  };
}

export interface RecipeBridgeStatus {
  compatible: boolean;
  viaBridge?: string;
  reason?: string;
}

export function getRecipeBridgeStatus(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs?: AssemblyPreferences
): RecipeBridgeStatus {
  const hasEmi = selectedSet.has('emi');
  const hasJei = selectedSet.has('just-enough-items-jei');
  const hasTmrv = selectedSet.has('tmrv-updated');
  const viewerPref = prefs?.recipeViewer;

  if (mod.platform.includes('Sinytra')) {
    if (prefs && !prefs.allowSinytra) {
      return { compatible: false, reason: 'Прослойка Sinytra Connector выключена' };
    }
    if (selectedSet.has('sinytra-connector') && selectedSet.has('forgified-fabric-api')) {
      return { compatible: true, viaBridge: 'Через прослойку Sinytra Connector' };
    }
  }

  const allowsEmi = viewerPref === 'none' ? false : hasEmi || viewerPref === 'emi' || viewerPref === 'emi-jei';
  const allowsJei = viewerPref === 'none' ? false : hasJei || viewerPref === 'jei' || viewerPref === 'emi-jei';

  if (mod.id === 'emi') {
    if (viewerPref === 'jei' || viewerPref === 'none') {
      return { compatible: false, reason: viewerPref === 'none' ? 'Просмотрщик рецептов отключён' : 'Выбран режим JEI' };
    }
    return { compatible: true };
  }

  if (mod.id === 'just-enough-items-jei') {
    if (viewerPref === 'emi' || viewerPref === 'none') {
      return { compatible: false, reason: viewerPref === 'none' ? 'Просмотрщик рецептов отключён' : 'Выбран режим чистого EMI (без JEI)' };
    }
    return { compatible: true };
  }

  const eco = mod.recipeEcosystem;
  if (!eco) return { compatible: true };

  if (eco === 'emi-only') {
    if (viewerPref === 'jei' || viewerPref === 'none') {
      return { compatible: false, reason: 'Аддон работает только с EMI' };
    }
    if (!allowsEmi && (hasJei || viewerPref !== undefined)) {
      return { compatible: false, reason: 'Требует установленный EMI' };
    }
    return { compatible: true };
  }

  if (eco === 'tmrv-bridge') {
    if (viewerPref === 'none' || viewerPref === 'jei') {
      return { compatible: false, reason: 'Прослойка нужна только для EMI без JEI' };
    }
    if (hasJei || viewerPref === 'emi-jei') {
      return { compatible: false, reason: 'Не нужен при наличии JEI (EMI сам подхватит JEI)' };
    }
    if (!allowsEmi) {
      return { compatible: false, reason: 'Требует установленный EMI' };
    }
    return { compatible: true, viaBridge: 'Прослойка JEI-плагинов для EMI' };
  }

  if (eco === 'jei-engine') {
    if (viewerPref === 'emi' || viewerPref === 'none') {
      return { compatible: false, reason: 'Работает только с самим JEI (не работает в чистом EMI)' };
    }
    if (!allowsJei && (hasEmi || viewerPref !== undefined)) {
      return { compatible: false, reason: 'Требует сам JEI (не работает через TMRV)' };
    }
    return { compatible: true };
  }

  if (eco === 'jei-plugin') {
    if (viewerPref === 'none') {
      return { compatible: false, reason: 'Просмотрщик рецептов отключён' };
    }
    if (allowsJei && viewerPref !== 'emi') {
      if (hasEmi) return { compatible: true, viaBridge: 'Нативный мост EMI + JEI' };
      return { compatible: true };
    }
    if (allowsEmi) {
      if (hasTmrv) {
        return { compatible: true, viaBridge: 'Через прослойку TMRV Updated (EMI)' };
      }
      return { compatible: false, reason: 'В чистом EMI не работает без прослойки TMRV Updated' };
    }
    return { compatible: true };
  }

  if (eco === 'emi-or-jei') {
    if (viewerPref === 'none' && mod.id !== 'fast-recipe-search') {
      return { compatible: false, reason: 'Требует JEI или EMI' };
    }
    return { compatible: true };
  }

  return { compatible: true };
}

export interface SupersederInfo {
  byNames: string[];
  isActiveInSelection: boolean;
  reason: string;
}

export function getModSuperseder(
  mod: ModItem,
  selectedSet?: Set<string>,
  prefs?: AssemblyPreferences,
  allowGlobalSupersede = false
): SupersederInfo | null {
  const activeSet = selectedSet ?? new Set<string>();

  if (mod.supersededWhenAll && mod.supersededWhenAll.length > 0) {
    if (mod.supersededWhenAll.every(id => activeSet.has(id))) {
      const names = mod.supersededWhenAll.map(id => MOD_BY_ID.get(id)?.name || id);
      return {
        byNames: names,
        isActiveInSelection: true,
        reason: `полностью перекрывается более лучшей связкой: ${names.join(' + ')}`,
      };
    }
  }

  if (mod.supersededBy && mod.supersededBy.length > 0) {
    const activeBest = mod.supersededBy.filter(id => activeSet.has(id));
    if (activeBest.length > 0) {
      const names = activeBest.map(id => MOD_BY_ID.get(id)?.name || id);
      return {
        byNames: names,
        isActiveInSelection: true,
        reason: `полностью перекрывается более лучшим: ${names.join(' / ')}`,
      };
    }

    if (allowGlobalSupersede) {
      const viableBest = mod.supersededBy.filter(id => {
        const bm = MOD_BY_ID.get(id);
        if (!bm || isUnsupportedOnForge(bm)) return false;
        if (prefs && !getRecipeBridgeStatus(bm, activeSet, prefs).compatible) return false;
        if (getRuleConflictingIds(bm.id).some(cid => activeSet.has(cid))) return false;
        return true;
      });
      if (viableBest.length > 0) {
        const names = viableBest.map(id => MOD_BY_ID.get(id)?.name || id);
        return {
          byNames: names,
          isActiveInSelection: false,
          reason: `есть более совершенный аналог: ${names.join(' / ')}`,
        };
      }
    }
  }

  if (mod.coveredBy) {
    const activeCover = Array.from(activeSet).some(id => {
      const other = MOD_BY_ID.get(id);
      return other && (other.name === mod.coveredBy || mod.coveredBy?.includes(other.name));
    });
    if (activeCover || allowGlobalSupersede) {
      return {
        byNames: [mod.coveredBy],
        isActiveInSelection: activeCover,
        reason: `уже встроено в ${mod.coveredBy}`,
      };
    }
  }

  return null;
}

export function getModRestrictionBadge(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs?: AssemblyPreferences
): { text: string; tone: 'red' | 'amber' | 'violet' | 'sky' } | null {
  if (mod.status === 'danger') {
    return { text: 'Опасно / Плацебо', tone: 'red' };
  }
  if (isUnsupportedOnForge(mod)) {
    const swapId = FABRIC_TO_FORGE_SWAP[mod.id];
    const swapName = swapId ? MOD_BY_ID.get(swapId)?.name : null;
    return {
      text: swapName ? `Только Fabric → есть ${swapName}` : 'Не работает на Forge',
      tone: 'red',
    };
  }

  const sup = getModSuperseder(mod, selectedSet, prefs, true);
  if (sup) {
    return {
      text: mod.coveredBy ? `Уже в ${mod.coveredBy}` : `Перекрыт: ${sup.byNames[0]}`,
      tone: 'amber',
    };
  }

  const bridge = getRecipeBridgeStatus(mod, selectedSet, prefs);
  if (!bridge.compatible) {
    return {
      text: bridge.reason || 'Не подходит к просмотрщику рецептов',
      tone: 'red',
    };
  }

  if (!selectedSet.has(mod.id)) {
    const activeConflicts = getRuleConflictingIds(mod.id)
      .filter(id => selectedSet.has(id))
      .map(id => MOD_BY_ID.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (activeConflicts.length > 0) {
      return {
        text: `Конфликт с ${activeConflicts.slice(0, 2).join(', ')}`,
        tone: 'red',
      };
    }

    const missingDeps = getDirectDependencies(mod.id, selectedSet)
      .filter(id => !selectedSet.has(id))
      .map(id => MOD_BY_ID.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (missingDeps.length > 0) {
      return {
        text: `Нужен ${missingDeps.join(' + ')}`,
        tone: 'sky',
      };
    }
  }

  if (bridge.viaBridge && mod.recipeEcosystem === 'jei-plugin') {
    return { text: bridge.viaBridge, tone: 'sky' };
  }

  if (mod.id === 'nvidium' && prefs && prefs.gpu !== 'nvidia') {
    return { text: 'Только NVIDIA GTX 16xx/RTX', tone: 'violet' };
  }
  if (mod.id === 'accelerated-rendering' && prefs && (prefs.goal === 'potato' || prefs.gpu === 'integrated')) {
    return { text: 'OpenGL 4.6 · жрёт VRAM (опасно для встройки)', tone: 'amber' };
  }
  return null;
}

export function isModIncompatibleWithSelection(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs?: AssemblyPreferences
): boolean {
  if (selectedSet.has(mod.id)) return false;
  if (isUnsupportedOnForge(mod)) return true;

  if (!getRecipeBridgeStatus(mod, selectedSet, prefs).compatible) {
    return true;
  }

  if (getRuleConflictingIds(mod.id).some(cid => selectedSet.has(cid))) {
    return true;
  }

  const deps = getTransitiveDependencies(mod.id, new Set(), selectedSet);
  if (
    deps.some(
      depId =>
        !selectedSet.has(depId) &&
        getRuleConflictingIds(depId).some(cid => selectedSet.has(cid))
    )
  ) {
    return true;
  }

  if (
    prefs &&
    !prefs.allowSinytra &&
    (mod.platform.includes('Sinytra') || deps.includes('sinytra-connector'))
  ) {
    return true;
  }

  return false;
}

export function shouldHideMod(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs: AssemblyPreferences | undefined,
  options: { hideIncompatible: boolean; hideUselessCovered: boolean }
): boolean {
  if (selectedSet.has(mod.id)) return false;
  if (options.hideUselessCovered) {
    if (mod.status === 'danger') return true;
    if (isUnsupportedOnForge(mod)) return true;
    if (getModSuperseder(mod, selectedSet, prefs, true) !== null) return true;
  }
  if (options.hideIncompatible && isModIncompatibleWithSelection(mod, selectedSet, prefs)) {
    return true;
  }
  return false;
}

export function getGroupMembersByRole(groupId: string) {
  const group = MOD_GROUPS.find(g => g.id === groupId);
  if (!group) return null;
  const leader = MODS_DATABASE.find(m => m.id === group.leaderId) || null;
  const addons = group.addonIds
    .map(id => MODS_DATABASE.find(m => m.id === id))
    .filter((m): m is ModItem => Boolean(m));
  const excludedSet = new Set([group.leaderId, ...group.addonIds]);
  const removedAnalogs = group.memberIds
    .filter(id => !excludedSet.has(id))
    .map(id => MODS_DATABASE.find(m => m.id === id))
    .filter((m): m is ModItem => Boolean(m));
  return { group, leader, addons, removedAnalogs };
}

export const MOD_LAST_UPDATED_MAP: Record<string, string> = {
  'embeddium': '08.2024 (заморожен 0.3.31)',
  'emberbium': '11.2026',
  'oculus': '12.2024 (заморожен)',
  'nvidium': '02.2024 (Fabric LTS)',
  'alloyium': '08.2026',
  'accelerated-rendering': '11.2026',
  'compact-f3-plus': '08.2026',
  'resourceful-config': '02.2025',
  'particle-core': '02.2026',
  'fzzy-config': '09.2026',
  'kotlin-for-forge': '12.2025',
  'matlib': '10.2026',
  'cupboard': '09.2026',
  'particull': '11.2026',
  'fast-sounds': '07.2026',
  'soundgc': '07.2026',
  'sodium-embeddium-options-api': '01.2025',
  'sodium-embeddium-dynamic-lights': '01.2025',
  'concurrent-chunk-management-engine-forge-c2me': '10.2026',
  'culllessleaves-reforged': '12.2023 (завершён)',
  'more-culling-reforged': '08.2026',
  'bobby-reforged': '07.2023 (заморожен)',
  'distant-horizons': '09.2026',
  'optimized-recipe-book-orb': '11.2025',
  'geckolibbetterfps': '08.2026',
  'fast-recipe-search': '01.2026',
  'faster-iris-shadow-mapper': '09.2026 (архив)',
  'better-biome-reblend': '01.2026 (архив)',
  'pluto': '04.2023 (устарел)',
  'dynamicrenderdistance': '2026',
  'alltheleaks-memory-leak-fix': '2026',
  'modernfix': '2025–2026',
  'ferritecore': '1.20.1 LTS',
  'badoptimizations': '2025–2026',
  'radium-re-reforged': '2025–2026',
  'immediatelyfast': '2025–2026',
  'entity-culling': '2026',
  'ixeris': '2026',
  'jasione': '2025–2026',
  'kerria': '2025–2026',
  'noisiumed': '2026',
  'packet-fixer': '2025–2026',
  'enhanced-block-entities-reloaded': '2025–2026',
  'immersive-optimization': '2025–2026',
  'sinytra-connector': '1.20.1 LTS',
  'forgified-fabric-api': '1.20.1 LTS',
  'connector-extras': '1.20.1 LTS',
  'capability-fix-revived': '2025–2026',
  'structure-layout-optimizer': '2025–2026',
  'spark': '1.20.1 LTS (1.10.53)',
  'solix': '2025–2026',
  'flerovium': '1.20.1 Forge',
  'threadtweak-reforged': '2025–2026',
  'krypton-reno': '2025–2026',
  'just-enough-items-jei': '2025–2026',
  'emi': '2025–2026',
  'sodium-chloride': '2025–2026',
  'clumps': '1.20.1 LTS',
  'dynamic-fps': '2025–2026',
  'servercore': '2025–2026',
  'connectivity': '2025–2026',
  'smooth-boot-reloaded': '1.20.1 Forge',
  'let-me-despawn': '1.20.1 LTS',
  'fastvancements': '1.20.1 LTS',
  'put-a-plug-in-it-papi': '1.20.1 Forge',
};

export function getModUpdatedLabel(mod: ModItem): string | undefined {
  return mod.lastUpdated || MOD_LAST_UPDATED_MAP[mod.id];
}

export interface AssemblyTreeChild {
  mod: ModItem;
  relationLabel: string;
}

export interface AssemblyTreeNode {
  parent: ModItem;
  children: AssemblyTreeChild[];
}

const ADDON_PARENT_PRIORITY: Record<string, { parents: string[]; relation: string }> = {
  // Core renderer (Embeddium / Emberbium) addons
  'embeddium-extras': { parents: ['embeddium'], relation: 'Аддон' },
  'sodium-chloride': { parents: ['embeddium', 'emberbium'], relation: 'Аддон' },
  'alloyium': { parents: ['embeddium', 'emberbium'], relation: 'GPU Compute аддон' },
  'flerovium': { parents: ['embeddium', 'emberbium'], relation: 'Аддон рендера' },
  'immediatelyfast': { parents: ['embeddium', 'emberbium'], relation: 'Аддон UI/шрифтов' },
  'accelerated-rendering': { parents: ['embeddium', 'emberbium'], relation: 'GPU-кэш (много VRAM)' },
  'accelerated-rendering-turned': { parents: ['embeddium', 'emberbium'], relation: 'GPU-кэш (много VRAM)' },
  'accelerated-recoiling': { parents: ['embeddium', 'emberbium'], relation: 'GPU-аддон' },
  'amd-fsr-upscaler-render-scale-for-embeddium': { parents: ['embeddium'], relation: 'FSR-аддон' },
  'revidium-accedium': { parents: ['embeddium', 'emberbium'], relation: 'Аддон чанков' },
  'nvidium': { parents: ['emberbium', 'embeddium', 'sinytra-connector'], relation: 'Mesh Shaders (Sinytra + .connector)' },
  'nvidium-forged': { parents: ['nvidium', 'emberbium', 'embeddium'], relation: 'Forge-фикс Nvidium' },
  'sodium-embeddium-options-api': { parents: ['emberbium', 'embeddium'], relation: 'API меню настроек' },
  'sodium-embeddium-dynamic-lights': { parents: ['emberbium', 'embeddium', 'sodium-embeddium-options-api'], relation: 'Аддон дин. света' },

  // Shader engines addons
  'faster-iris-shadow-mapper': { parents: ['oculus', 'embeddium'], relation: 'Аддон теней' },
  'gputape': { parents: ['oculus', 'emberlens', 'embeddium', 'emberbium'], relation: 'Фикс VRAM' },
  'bons-dlss-diet-complementary-unbound': { parents: ['oculus'], relation: 'Аддон шейдеров' },

  // Sinytra bridge modules
  'forgified-fabric-api': { parents: ['sinytra-connector'], relation: 'Зависимость' },
  'connector-extras': { parents: ['sinytra-connector'], relation: 'Мост совместимости' },
  'voxy': { parents: ['sinytra-connector', 'embeddium', 'emberbium'], relation: 'LOD через Sinytra' },
  'c2me-concurrent-chunk-management-engine': { parents: ['sinytra-connector'], relation: 'Чанки через Sinytra' },
  'very-many-players-vmp': { parents: ['sinytra-connector'], relation: 'Сеть/игроки через Sinytra' },

  // Required libraries & direct sub-addons
  'matlib': { parents: ['enhanced-block-entities-reloaded'], relation: 'Зависимость' },
  'fzzy-config': { parents: ['particle-core'], relation: 'Зависимость' },
  'kotlin-for-forge': { parents: ['particle-core', 'fzzy-config'], relation: 'Зависимость' },
  'particull': { parents: ['particle-core'], relation: 'Дубль куллинга' },
  'cupboard': { parents: ['connectivity'], relation: 'Зависимость' },
  'soundgc': { parents: ['fast-sounds', 'particle-core'], relation: 'Опц. аддон' },
  'reload-looping-sound-fix': { parents: ['fast-sounds', 'particle-core'], relation: 'Фикс звука' },
  'lightstar': { parents: ['solix'], relation: 'Клиентский кэш' },
  'light-config': { parents: ['solix'], relation: 'Конфиг света' },
  'optimized-fullbright': { parents: ['solix'], relation: 'Аддон яркости' },
  'distant-horizons-memory-fix-dh': { parents: ['distant-horizons'], relation: 'Фикс утечек DH' },
  'vanillin': { parents: ['flywheel'], relation: 'Аддон сущностей' },
  'chunkyborder': { parents: ['chunky'], relation: 'Аддон границ' },
  'drd-dynamic-render-distance': { parents: ['dynamicrenderdistance'], relation: 'Вариант DRD' },
  'config-preset-switch-low-medium-high-f10': { parents: ['dynamicrenderdistance'], relation: 'Пресеты F10' },

  // Recipe viewers & plugins
  'tmrv-updated': { parents: ['emi'], relation: 'Мост плагинов JEI' },
  'emi-loot': { parents: ['emi'], relation: 'Плагин дропа' },
  'emi-ores': { parents: ['emi'], relation: 'Плагин руд' },
  'emiffect': { parents: ['emi'], relation: 'Плагин эффектов' },
  'emi-trades': { parents: ['emi'], relation: 'Плагин торгов' },
  'emi-professions': { parents: ['emi'], relation: 'Плагин профессий' },
  'jeioptimizer': { parents: ['just-enough-items-jei'], relation: 'Оптимизатор JEI' },
  'just-enough-freezes': { parents: ['just-enough-items-jei'], relation: 'Фикс фризов JEI' },
  'just-enough-threads': { parents: ['just-enough-items-jei'], relation: 'Потоки JEI' },
  'jeir-jei-rewired': { parents: ['just-enough-items-jei'], relation: 'Поиск JEI' },
  'just-enough-resources-jer': { parents: ['just-enough-items-jei', 'tmrv-updated', 'emi'], relation: 'Плагин JEI' },
  'just-enough-professions-jep': { parents: ['just-enough-items-jei', 'tmrv-updated', 'emi'], relation: 'Плагин JEI' },
  'just-enough-effect-descriptions-jeed': { parents: ['just-enough-items-jei', 'tmrv-updated', 'emi'], relation: 'Плагин JEI' },
  'fastali': { parents: ['advanced-loot-info-ali'], relation: 'Оптимизатор ALI' },
};

const ROOT_PRIORITY_ORDER: Record<string, number> = {
  'emberbium': 10,
  'embeddium': 11,
  'oculus': 20,
  'emberlens': 21,
  'sinytra-connector': 30,
  'distant-horizons': 35,
  'solix': 40,
  'enhanced-block-entities-reloaded': 45,
  'particle-core': 50,
  'fast-sounds': 55,
  'flywheel': 60,
  'emi': 65,
  'just-enough-items-jei': 66,
  'connectivity': 70,
  'chunky': 75,
  'dynamicrenderdistance': 80,
};

export function organizeAssemblyTree(modIds: string[]): AssemblyTreeNode[] {
  const uniqueIds = Array.from(new Set(modIds));
  const selectedSet = new Set(uniqueIds);
  const mods = uniqueIds
    .map(id => MOD_BY_ID.get(id))
    .filter((m): m is ModItem => Boolean(m));

  const parentForChild = new Map<string, { parentId: string; relation: string }>();

  const wouldCreateCycle = (childId: string, candidateParentId: string): boolean => {
    let curr: string | undefined = candidateParentId;
    const visited = new Set<string>([childId]);
    while (curr) {
      if (visited.has(curr)) return true;
      visited.add(curr);
      curr = parentForChild.get(curr)?.parentId;
    }
    return false;
  };

  for (const mod of mods) {
    const spec = ADDON_PARENT_PRIORITY[mod.id];
    if (spec) {
      const parentId = spec.parents.find(
        pid => pid !== mod.id && selectedSet.has(pid) && !wouldCreateCycle(mod.id, pid)
      );
      if (parentId) {
        parentForChild.set(mod.id, { parentId, relation: spec.relation });
        continue;
      }
    }

    if (mod.recipeEcosystem === 'jei-plugin') {
      const fallbackParent = ['just-enough-items-jei', 'tmrv-updated', 'emi'].find(
        pid => pid !== mod.id && selectedSet.has(pid) && !wouldCreateCycle(mod.id, pid)
      );
      if (fallbackParent) {
        parentForChild.set(mod.id, { parentId: fallbackParent, relation: 'Плагин рецептов' });
        continue;
      }
    }

    const hardDeps = MOD_HARD_DEPENDENCIES[mod.id] || [];
    if (
      hardDeps.length === 1 &&
      selectedSet.has(hardDeps[0]) &&
      hardDeps[0] !== mod.id &&
      !ADDON_PARENT_PRIORITY[hardDeps[0]] &&
      !wouldCreateCycle(mod.id, hardDeps[0])
    ) {
      parentForChild.set(mod.id, { parentId: hardDeps[0], relation: 'Аддон' });
    }
  }

  // Collapse 2-level chains (e.g. if B -> A and C -> B, attach C directly under A if A is root)
  // so every node is clean 1-level: Parent Mod -> Addons/Dependencies to it.
  const resolveTopRoot = (startId: string): { rootId: string; relation: string } | null => {
    let curr = startId;
    const directRel = parentForChild.get(startId)?.relation;
    if (!directRel) return null;
    const seen = new Set<string>([startId]);
    while (parentForChild.has(curr)) {
      const next = parentForChild.get(curr)!.parentId;
      if (seen.has(next)) return null;
      seen.add(next);
      curr = next;
    }
    return curr !== startId ? { rootId: curr, relation: directRel } : null;
  };

  const childrenByRoot = new Map<string, AssemblyTreeChild[]>();
  const childSet = new Set<string>();

  for (const mod of mods) {
    const resolved = resolveTopRoot(mod.id);
    if (resolved) {
      childSet.add(mod.id);
      const list = childrenByRoot.get(resolved.rootId) || [];
      list.push({ mod, relationLabel: resolved.relation });
      childrenByRoot.set(resolved.rootId, list);
    }
  }

  const roots = mods.filter(m => !childSet.has(m.id));
  roots.sort((a, b) => {
    const aHasChildren = (childrenByRoot.get(a.id)?.length || 0) > 0;
    const bHasChildren = (childrenByRoot.get(b.id)?.length || 0) > 0;
    if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1;

    const prioA = ROOT_PRIORITY_ORDER[a.id] ?? 999;
    const prioB = ROOT_PRIORITY_ORDER[b.id] ?? 999;
    if (prioA !== prioB) return prioA - prioB;

    return a.name.localeCompare(b.name, 'ru');
  });

  return roots.map(parent => ({
    parent,
    children: childrenByRoot.get(parent.id) || [],
  }));
}

export function formatAssemblyTreeText(modIds: string[], includeUrls = true): string {
  const tree = organizeAssemblyTree(modIds);
  const lines: string[] = [];
  tree.forEach((node, idx) => {
    const pUpdated = getModUpdatedLabel(node.parent);
    const pMeta = pUpdated ? ` [обн. ${pUpdated}]` : '';
    const pUrl = includeUrls ? ` — ${node.parent.curseforgeUrl}` : '';
    lines.push(`${idx + 1}. ${node.parent.name}${pMeta}${pUrl}`);
    for (const child of node.children) {
      const cUpdated = getModUpdatedLabel(child.mod);
      const cMeta = cUpdated ? `, обн. ${cUpdated}` : '';
      const cUrl = includeUrls ? ` — ${child.mod.curseforgeUrl}` : '';
      lines.push(`   ↳ ${child.mod.name} (${child.relationLabel}${cMeta})${cUrl}`);
    }
  });
  return lines.join('\n');
}

export function generateReportText(): string {
  let out = `# ==============================================================================
# ПОЛНЫЙ АНАЛИЗ И СРАВНЕНИЕ МОДОВ ОПТИМИЗАЦИИ MINECRAFT (FORGE / NEOFORGE)
# Актуально на: ${DATABASE_UPDATED_AT} | Всего в базе: ${MODS_DATABASE.length} модов | Групп аналогов: ${MOD_GROUPS.length}
# ==============================================================================

`;

  const grouped: Record<string, ModItem[]> = {};
  MODS_DATABASE.forEach(m => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  let catIndex = 1;
  for (const [category, mods] of Object.entries(grouped)) {
    out += `================================================================================\n${catIndex++}. ${category.toUpperCase()}\n================================================================================\n\n`;
    mods.forEach(m => {
      const updated = getModUpdatedLabel(m);
      out += `• ${m.name} [${m.platform}] -> [${m.statusLabel.toUpperCase()}]${updated ? ` (Обновлён: ${updated})` : ''}\n`;
      out += `  - Описание: ${m.description}\n`;
      if (m.bestAlternative) out += `  - Вердикт / Аналог: ${m.bestAlternative}\n`;
      if (m.coveredBy) out += `  - Уже встроено в: ${m.coveredBy}\n`;
      if (m.warning) out += `  - Внимание: ${m.warning}\n`;
      out += `  - CurseForge: ${m.curseforgeUrl}\n\n`;
    });
  }

  out += `================================================================================\nПРАВИЛА НЕСОВМЕСТИМОСТИ:\n================================================================================\n`;
  INCOMPATIBILITY_RULES.forEach((r, idx) => {
    out += `${idx + 1}. ${r.title} (${r.category}):\n`;
    out += `   - Конфликтующие моды: ${r.conflictingMods.join(', ')}\n`;
    out += `   - Причина: ${r.explanation}\n`;
    out += `   - Решение: ${r.recommendation}\n\n`;
  });

  out += `================================================================================\nЗОЛОТОЙ СТАНДАРТ ИДЕАЛЬНОЙ СБОРКИ (МОД -> АДДОНЫ):\n================================================================================\n`;
  const goldenRoleById = new Map<string, string>();
  const goldenIds: string[] = [];
  GOLDEN_STANDARD_MODS.forEach(g => {
    const m = findModByDisplayName(g.name);
    if (m) {
      goldenIds.push(m.id);
      goldenRoleById.set(m.id, g.role);
    }
  });
  const goldenTree = organizeAssemblyTree(goldenIds);
  goldenTree.forEach((node, idx) => {
    out += `${idx + 1}. ${node.parent.name} — ${goldenRoleById.get(node.parent.id) || node.parent.statusLabel}\n`;
    node.children.forEach(ch => {
      out += `   ↳ ${ch.mod.name} (${ch.relationLabel}) — ${goldenRoleById.get(ch.mod.id) || ch.mod.statusLabel}\n`;
    });
  });

  return out;
}
