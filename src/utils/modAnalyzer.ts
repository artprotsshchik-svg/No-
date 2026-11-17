import {
  MODS_DATABASE,
  MOD_GROUPS,
  INCOMPATIBILITY_RULES,
  type ModItem,
} from '../data/modsData.ts';
import type {
  AssemblyPreferences,
  CheckerTier,
  ConflictDetection,
  DependencyWarning,
  DualPortPair,
  MissingSlotWarning,
  RecipeBridgeStatus,
  SupersederInfo,
} from './modTypes.ts';

export const MOD_BY_ID = new Map<string, ModItem>(MODS_DATABASE.map(m => [m.id, m]));

export function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
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
      const others = selectedMods.filter(
        m => m.id !== 'nvidium' && rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(m.name))
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
