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
  st_spectype: string | null
  st_teff: number | null
  st_rad: number | null
  st_mass: number | null
  st_lum: number | null
}

export interface ExoplanetResponse extends Exoplanet {
  [key: string]: string | number | null
}
