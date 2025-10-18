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

export function getPlanetVisual(p) {
  const Teq = estimateTeqK(p);
  const temperature = teqToBand(Teq);
  const type = classifyType(p, temperature);
  const atmosphere = estimateAtmosphere(type, p, Teq);
  const stableKey = buildStableKey({ type, temperature, atmosphere, bins: binProps(p) });
  const textureKey = pickTextureDeterministically(type, temperature, stableKey);

  return { type, temperature, atmosphere, textureKey };
}

function teqToBand(TeqK) {
  if (!isFinite(TeqK)) return 'temperate';
  if (TeqK < 200) return 'cold';
  if (TeqK < 330) return 'temperate';
  if (TeqK < 1000) return 'hot';
  return 'inferno';
}

function estimateTeqK(p) {
  if (isFinite(p.pl_eqt)) return p.pl_eqt; 

  if (isFinite(p.pl_insol) && p.pl_insol > 0) {
    const S = p.pl_insol; 
    return 278 * Math.pow(S, 0.25);
  }

  const a = isFinite(p.pl_orbsmax) && p.pl_orbsmax > 0 ? p.pl_orbsmax : null; 
  if (!a) return NaN;

  let L; 
  if (isFinite(p.st_lum) && p.st_lum > 0) {
    L = p.st_lum;
  } else {
    const R = isFinite(p.st_rad) && p.st_rad > 0 ? p.st_rad : null;   
    const T = isFinite(p.st_teff) && p.st_teff > 0 ? p.st_teff : null; 
    if (!R || !T) return NaN;
    
    L = (R * R) * Math.pow(T / 5772, 4);
  }

  const S = L / (a * a);
  return 278 * Math.pow(S, 0.25);
}

function classifyType(p, temperature) {
  const r = isFinite(p.pl_rade) ? p.pl_rade : null;
  const m = isFinite(p.pl_bmasse) ? p.pl_bmasse : null;
  const d = isFinite(p.pl_dens) ? p.pl_dens : null;

  
  if (r !== null) {
    if (r > 8) return 'gas';          
    if (r > 3.5) {
      if (temperature === 'hot' || temperature === 'inferno') {
        return 'gas'; 
      }
      return 'ice';        
    }
  }

  
  if (d !== null) {
    if (d >= 5) {
      
      if (temperature === 'inferno') return 'lava';
      return 'rocky';
    }
    
    if (d > 1 && d < 3 && (temperature === 'temperate' || temperature === 'cold')) {
      return 'ocean';
    }
  }

  
  if (r !== null) {
    if (r <= 1.5) {
      return temperature === 'inferno' ? 'lava' : 'rocky';
    }
    if (r <= 3.5) {
      
      if (d !== null) {
        if (d >= 4) return temperature === 'inferno' ? 'lava' : 'rocky';
        if (d >= 1 && d < 3 && temperature !== 'inferno') return 'ocean';
      }
      
      if (temperature === 'temperate' || temperature === 'cold') return 'ocean';
      return 'ice'; 
    }
  }

  
  if (m !== null) {
    if (m > 50) return 'gas';
    if (m > 10) {
      return (temperature === 'hot' || temperature === 'inferno') ? 'gas' : 'ice';
    }
    if (m <= 5) return temperature === 'inferno' ? 'lava' : 'rocky';
    
    return (temperature === 'temperate' || temperature === 'cold') ? 'ocean' : 'rocky';
  }

  
  return temperature === 'inferno' ? 'lava' : 'rocky';
}

function estimateAtmosphere(type, p, Teq) {
  if (type === 'gas' || type === 'ice') return 'thick';
  if (type === 'lava') return 'none';
  if (isFinite(Teq) && Teq > 1200) return 'none';
  if (isFinite(p.pl_bmasse) && p.pl_bmasse < 0.5) return 'none';
  return type === 'ocean' ? 'thick' : 'thin';
}

function binProps(p) {
  const bin = (x, step) => (isFinite(x) ? Math.floor(x / step) * step : 'na');

  return {
    r_bin:  bin(p.pl_rade,    0.25),  
    m_bin:  bin(p.pl_bmasse,  1),     
    d_bin:  bin(p.pl_dens,    0.5),   
    teq_bin:bin(estimateTeqK(p), 50), 
    a_bin:  bin(p.pl_orbsmax, 0.05),  
    insol_bin: bin(p.pl_insol, 0.25), 
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

function pickTextureDeterministically(type, temp, stableKey) {
  const poolByType = TEXTURE_POOLS[type] || TEXTURE_POOLS.rocky;
  const pool = poolByType[temp] || poolByType.temperate || Object.values(poolByType)[0];
  const h = fnv1a(stableKey);
  const idx = pool.length ? h % pool.length : 0;
  return pool[idx] || DEFAULT_TEXTURE_KEY;
}
