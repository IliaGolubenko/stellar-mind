export interface Exoplanet {
  pl_name: string
  hostname: string | null
  discoverymethod: string | null
  disc_year: number | null
  pl_orbper: number | null
  pl_rade: number | null
  pl_bmasse: number | null
  pl_insol: number | null
  pl_dens: number | null
  pl_eqt: number | null
  pl_orbsmax: number | null
  pl_orbeccen: number | null
  st_spectype: string | null
  st_teff: number | null
  st_rad: number | null
  st_mass: number | null
  st_lum: number | null
  st_age: number | null
  st_met: number | null
  st_logg: number | null
  st_dens: number | null
  sy_dist: number | null
  ra: number | null
  dec: number | null
  [key: string]: string | number | null | undefined
  earth_like_score?: number | null
}

export interface ExoplanetResponse extends Exoplanet {
  [key: string]: string | number | null
}
