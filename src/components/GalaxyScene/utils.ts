import { SRGBColorSpace, Texture, TextureLoader } from 'three'

export const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const getStarTexture = (() => {
  let cachedTexture: Texture | null = null

  return () => {
    if (!cachedTexture && typeof window !== 'undefined') {
      const loader = new TextureLoader()
      cachedTexture = loader.load('/sprite120.png')
      cachedTexture.colorSpace = SRGBColorSpace
    }

    return cachedTexture
  }
})()

/**
 * ВХОД: объект NASA Exoplanet (поля как в твоём SELECT)
 * ВЫХОД: только логические свойства визуализации
 *  - type: 'rocky' | 'lava' | 'ocean' | 'ice' | 'gas'
 *  - temperature: 'cold' | 'temperate' | 'hot' | 'inferno'
 *  - atmosphere: 'none' | 'thin' | 'thick'
 *  - textureKey: строковый идентификатор из мэппинга (детерминистичен по свойствам)
 */
export function getPlanetVisual(p) {
  // -----------------------
  // 1) Температура планеты
  // -----------------------
  // приоритет: pl_eqt (K) → pl_insol (в S_earth) → оценка по звезде и орбите
  const Teq = estimateTeqK(p);
  const temperature = teqToBand(Teq);

  // -----------------------
  // 2) Класс/тип планеты
  // -----------------------
  const type = classifyType(p, temperature);

  // -----------------------
  // 3) Толщина атмосферы (очень грубо, но правдоподобно)
  // -----------------------
  const atmosphere = estimateAtmosphere(type, p, Teq);

  // -----------------------
  // 4) Детерминированный выбор текстуры
  // -----------------------
  // ВАЖНО: зависит ТОЛЬКО от бинов свойств (а не от имени).
  // Одинаковые свойства → одинаковая textureKey.
  const stableKey = buildStableKey({ type, temperature, atmosphere, bins: binProps(p) });
  const textureKey = pickTextureDeterministically(type, temperature, stableKey);

  return { type, temperature, atmosphere, textureKey };
}

/* ===================== ВСПОМОГАТЕЛЬНЫЕ ===================== */

/** Перевод равновесной температуры в температурную зону */
function teqToBand(TeqK) {
  if (!isFinite(TeqK)) return 'temperate';
  if (TeqK < 200) return 'cold';
  if (TeqK < 330) return 'temperate';
  if (TeqK < 1000) return 'hot';
  return 'inferno';
}

/**
 * Оценка равновесной температуры (K).
 * Приоритеты:
 *  1) pl_eqt (K)
 *  2) pl_insol (S_earth): Teq ≈ 278 * S^(1/4)
 *  3) По звезде и большой полуоси:
 *     - если st_lum есть: S ≈ st_lum / a^2
 *     - иначе L/Lsun ≈ (st_rad)^2 * (st_teff/5772)^4, и S ≈ L / a^2
 *     затем Teq ≈ 278 * S^(1/4)
 */
function estimateTeqK(p) {
  if (isFinite(p.pl_eqt)) return p.pl_eqt; // K

  if (isFinite(p.pl_insol) && p.pl_insol > 0) {
    const S = p.pl_insol; // в долях земной инсоляции
    return 278 * Math.pow(S, 0.25);
  }

  const a = isFinite(p.pl_orbsmax) && p.pl_orbsmax > 0 ? p.pl_orbsmax : null; // AU
  if (!a) return NaN;

  let L; // светимость в долях L_sun
  if (isFinite(p.st_lum) && p.st_lum > 0) {
    L = p.st_lum;
  } else {
    const R = isFinite(p.st_rad) && p.st_rad > 0 ? p.st_rad : null;   // в R_sun
    const T = isFinite(p.st_teff) && p.st_teff > 0 ? p.st_teff : null; // K
    if (!R || !T) return NaN;
    // L/Lsun ≈ R^2 * (T/5772)^4
    L = (R * R) * Math.pow(T / 5772, 4);
  }

  const S = L / (a * a);                 // относительно Земли
  return 278 * Math.pow(S, 0.25);        // очень грубая оценка без альбедо и парникового эффекта
}

/**
 * Классификация типа по радиусу/массе/плотности и температуре:
 *  r_e = pl_rade (в радиусах Земли), m_e = pl_bmasse (в массах Земли), dens = pl_dens (г/см^3)
 */
function classifyType(p, temperature) {
  const r = isFinite(p.pl_rade) ? p.pl_rade : null;
  const m = isFinite(p.pl_bmasse) ? p.pl_bmasse : null;
  const d = isFinite(p.pl_dens) ? p.pl_dens : null;

  // Явно газовый по радиусу
  if (r !== null) {
    if (r > 8) return 'gas';          // Юпитероподобные
    if (r > 3.5) return 'ice';        // Нептуноподобные / мини-нептуны
  }

  // Если плотность высока → скорее твёрдый мир
  if (d !== null) {
    if (d >= 5) {
      // железно-каменный (суперземля)
      if (temperature === 'inferno') return 'lava';
      return 'rocky';
    }
    // низкая плотность в умеренном климате → водный мир
    if (d > 1 && d < 3 && (temperature === 'temperate' || temperature === 'cold')) {
      return 'ocean';
    }
  }

  // По радиусу в "малом" диапазоне
  if (r !== null) {
    if (r <= 1.5) {
      return temperature === 'inferno' ? 'lava' : 'rocky';
    }
    if (r <= 3.5) {
      // промежуточная зона: решаем по плотности/температуре
      if (d !== null) {
        if (d >= 4) return temperature === 'inferno' ? 'lava' : 'rocky';
        if (d >= 1 && d < 3 && temperature !== 'inferno') return 'ocean';
      }
      // нет плотности — эвристика по температуре
      if (temperature === 'temperate' || temperature === 'cold') return 'ocean';
      return 'ice'; // горячие мини-нептуны визуально часто "газовые/ледяные"
    }
  }

  // Фолбэк по массе
  if (m !== null) {
    if (m > 50) return 'gas';
    if (m > 10) return 'ice';
    if (m <= 5) return temperature === 'inferno' ? 'lava' : 'rocky';
    // промежуток 5–10 — решаем по температуре
    return (temperature === 'temperate' || temperature === 'cold') ? 'ocean' : 'rocky';
  }

  // Совсем нет данных — предполагаем каменистую
  return temperature === 'inferno' ? 'lava' : 'rocky';
}

/**
 * Оценка толщины атмосферы (очень грубо):
 *  - gas/ice → thick
 *  - lava/очень горячие rocky (Teq > ~1200K) → none
 *  - лёгкие rocky (m < 0.5) → none
 *  - остальные rocky/ocean → thin (условно)
 */
function estimateAtmosphere(type, p, Teq) {
  if (type === 'gas' || type === 'ice') return 'thick';
  if (type === 'lava') return 'none';
  if (isFinite(Teq) && Teq > 1200) return 'none';
  if (isFinite(p.pl_bmasse) && p.pl_bmasse < 0.5) return 'none';
  return type === 'ocean' ? 'thick' : 'thin';
}

/** Бинируем ключевые параметры, чтобы одинаковые свойства → одинаковый ключ */
function binProps(p) {
  const bin = (x, step) => (isFinite(x) ? Math.floor(x / step) * step : 'na');

  return {
    r_bin:  bin(p.pl_rade,    0.25),  // радиус с шагом 0.25 R_earth
    m_bin:  bin(p.pl_bmasse,  1),     // масса с шагом 1 M_earth
    d_bin:  bin(p.pl_dens,    0.5),   // плотность с шагом 0.5 g/cc
    teq_bin:bin(estimateTeqK(p), 50), // Teq с шагом 50 K
    a_bin:  bin(p.pl_orbsmax, 0.05),  // большая полуось с шагом 0.05 AU
    insol_bin: bin(p.pl_insol, 0.25), // инсоляция с шагом 0.25 S_earth
    star_bin: [
      bin(p.st_teff, 200),
      bin(p.st_rad,  0.1),
      bin(p.st_mass, 0.1),
      bin(p.st_lum,  0.1),
      (p.st_spectype || 'na')
    ].join('|')
  };
}

function buildStableKey({ type, temperature, atmosphere, bins }) {
  return [
    `t=${type}`,
    `T=${temperature}`,
    `atm=${atmosphere}`,
    `r=${bins.r_bin}`,
    `m=${bins.m_bin}`,
    `d=${bins.d_bin}`,
    `Teq=${bins.teq_bin}`,
    `a=${bins.a_bin}`,
    `S=${bins.insol_bin}`,
    `star=${bins.star_bin}`
  ].join(';');
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export const TEXTURE_POOLS = {
  rocky: {
    cold: [
      'rock_frost_01',
      'rock_frost_02',
      'rock_grey_01',
      'rock_oxide_01',
    ],
    temperate: [
      'rock_cracked_01',
      'soil_dry_01',
      'rock_desert_01',
      'wet_rock_01',
      'rocks011',
      'rock035',
      'rock056',
    ],
    hot: [
      'basalt_dark_01',
      'ash_field_01',
      'scoria_01',
      'rock_oxide_01',
    ],
    inferno: [
      'lava_rock_01',
      'rock_oxide_01',
    ],
  },

  lava: {
    hot: [
      'lava_surface_01',
      'lava_surface_02',
      'lava_rock_01',
      'basalt_dark_01',
    ],
    inferno: [
      'lava_surface_01',
      'lava_surface_02',
      'lava_rock_01',
    ],
  },

  ocean: {
    cold: [
      'ocean_deep_01',
      'ice_02',
      'melting_ice_01',
    ],
    temperate: [
      'ocean_shallow_01',
      'ocean_deep_01',
      'wet_rock_01',
    ],
    hot: [
      'ocean_deep_01',
      'rock_oxide_01',
    ],
  },

  ice: {
    cold: [
      'ice_01',
      'ice_02',
      'snow_01',
    ],
    temperate: [
      'melting_ice_01',
      'ice_02',
    ],
    hot: [
      'melting_ice_01',
    ],
  },

  gas: {
    cold: [
      'gas_cold_01',
      'gas_cold_02',
    ],
    temperate: [
      'gas_medium_01',
    ],
    hot: [
      'gas_hot_01',
    ],
    inferno: [
      'gas_hot_01',
    ],
  },
};


type TextureAssetPaths = {
  color: string
  normal?: string
  roughness?: string
  emissive?: string
  displacement?: string
}

const TEXTURE_BASE_PATH = '/planet_surfaces'
const DEFAULT_TEXTURE_KEY = 'rock035'

type TextureExtension = 'png' | 'jpg'

type TextureDefinition = {
  key: string
  category: 'fallback' | 'rocky' | 'lava' | 'ocean' | 'ice' | 'gas'
  maps: {
    color: TextureExtension
    normal?: TextureExtension
    roughness?: TextureExtension
    displacement?: TextureExtension
    emissive?: TextureExtension
  }
}

const TEXTURE_DEFINITIONS: TextureDefinition[] = [
  { key: 'rock035', category: 'fallback', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rock056', category: 'fallback', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rocks011', category: 'fallback', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'gas_cold_01', category: 'gas', maps: { color: 'jpg' } },
  { key: 'gas_cold_02', category: 'gas', maps: { color: 'jpg' } },
  { key: 'gas_hot_01', category: 'gas', maps: { color: 'jpg' } },
  { key: 'gas_medium_01', category: 'gas', maps: { color: 'jpg' } },
  { key: 'ice_01', category: 'ice', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'ice_02', category: 'ice', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'melting_ice_01', category: 'ice', maps: { color: 'jpg', normal: 'png', roughness: 'jpg', displacement: 'png' } },
  { key: 'snow_01', category: 'ice', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'lava_rock_01', category: 'lava', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png', emissive: 'png' } },
  { key: 'lava_surface_01', category: 'lava', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png', emissive: 'png' } },
  { key: 'lava_surface_02', category: 'lava', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png', emissive: 'png' } },
  { key: 'ocean_deep_01', category: 'ocean', maps: { color: 'jpg', normal: 'jpg', displacement: 'png' } },
  { key: 'ocean_shallow_01', category: 'ocean', maps: { color: 'jpg', normal: 'jpg', roughness: 'jpg', displacement: 'png' } },
  { key: 'wet_rock_01', category: 'ocean', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'ash_field_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'basalt_dark_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rock_cracked_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rock_desert_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rock_frost_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rock_frost_02', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rock_grey_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'rock_oxide_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'scoria_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
  { key: 'soil_dry_01', category: 'rocky', maps: { color: 'png', normal: 'png', roughness: 'png', displacement: 'png' } },
]

const TEXTURE_ASSETS = TEXTURE_DEFINITIONS.reduce<Record<string, TextureAssetPaths>>(
  (acc, { key, category, maps }) => {
    const base = `${TEXTURE_BASE_PATH}/${category}/${key}/${key}`
    const asset: TextureAssetPaths = {
      color: `${base}_color.${maps.color}`,
    }

    if (maps.normal) {
      asset.normal = `${base}_normal.${maps.normal}`
    }
    if (maps.roughness) {
      asset.roughness = `${base}_roughness.${maps.roughness}`
    }
    if (maps.displacement) {
      asset.displacement = `${base}_displacement.${maps.displacement}`
    }
    if (maps.emissive) {
      asset.emissive = `${base}_emissive.${maps.emissive}`
    }

    acc[key] = asset
    return acc
  },
  {},
)

export const getTextureAssetPaths = (textureKey: string): TextureAssetPaths => {
  if (textureKey in TEXTURE_ASSETS) {
    return TEXTURE_ASSETS[textureKey]
  }
  return TEXTURE_ASSETS[DEFAULT_TEXTURE_KEY]
}

const PLANET_BASE_COLORS: Record<string, string> = {
  rocky: '#cbd5f5',
  lava: '#f59e0b',
  ocean: '#38bdf8',
  ice: '#bae6fd',
  gas: '#60a5fa',
}

export const getPlanetBaseColor = (type: string): string =>
  PLANET_BASE_COLORS[type] ?? PLANET_BASE_COLORS.rocky

/** Детерминированный выбор textureKey по пулу и стабильному ключу */
function pickTextureDeterministically(type, temp, stableKey) {
  const poolByType = TEXTURE_POOLS[type] || TEXTURE_POOLS.rocky;
  const pool = poolByType[temp] || poolByType.temperate || Object.values(poolByType)[0];
  const h = fnv1a(stableKey);
  const idx = pool.length ? h % pool.length : 0;
  return pool[idx] || DEFAULT_TEXTURE_KEY;
}
