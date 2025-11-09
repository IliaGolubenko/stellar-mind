import type { Exoplanet } from '../types/exoplanet'

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return String(value)
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export const transformExoplanetEntry = (entry: Record<string, unknown>): Exoplanet => ({
  pl_name: String(entry.pl_name ?? 'Unknown'),
  hostname: toNullableString(entry.hostname),
  discoverymethod: toNullableString(entry.discoverymethod),
  disc_year: toNullableNumber(entry.disc_year),
  pl_orbper: toNullableNumber(entry.pl_orbper),
  pl_rade: toNullableNumber(entry.pl_rade),
  pl_bmasse: toNullableNumber(entry.pl_bmasse),
  pl_insol: toNullableNumber(entry.pl_insol),
  pl_dens: toNullableNumber(entry.pl_dens),
  pl_eqt: toNullableNumber(entry.pl_eqt),
  pl_orbsmax: toNullableNumber(entry.pl_orbsmax),
  pl_orbeccen: toNullableNumber(entry.pl_orbeccen),
  st_spectype: toNullableString(entry.st_spectype),
  st_teff: toNullableNumber(entry.st_teff),
  st_rad: toNullableNumber(entry.st_rad),
  st_mass: toNullableNumber(entry.st_mass),
  st_lum: toNullableNumber(entry.st_lum),
  st_age: toNullableNumber(entry.st_age),
  st_met: toNullableNumber(entry.st_met),
  st_logg: toNullableNumber(entry.st_logg),
  st_dens: toNullableNumber(entry.st_dens),
  sy_dist: toNullableNumber(entry.sy_dist),
  ra: toNullableNumber(entry.ra),
  dec: toNullableNumber(entry.dec),
  earth_like_score: toNullableNumber(entry.earth_like_score),
})

export type { Exoplanet }
