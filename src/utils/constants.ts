const NASA_TAP_QUERY =
  'SELECT TOP 100 pl_name, hostname, discoverymethod, disc_year, pl_orbper, pl_rade, pl_bmasse, st_spectype, st_teff, st_rad, st_mass, pl_insol, pl_dens, pl_eqt, pl_orbsmax, st_lum FROM ps WHERE default_flag=1 ORDER BY disc_year DESC, pl_name'


const TAP_PARAMS = new URLSearchParams({
  query: NASA_TAP_QUERY,
  format: 'json',
})

const DIRECT_TAP_URL = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?${TAP_PARAMS.toString()}`

const DEV_PROXY_URL = `/api/nasa/exoplanets?${TAP_PARAMS.toString()}`

const PROD_FALLBACK_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(DIRECT_TAP_URL)}`

export const NASA_EXOPLANETS_URL =
  import.meta.env.VITE_NASA_EXOPLANETS_URL ??
  (import.meta.env.DEV ? DEV_PROXY_URL : PROD_FALLBACK_URL)

export const IS_DEV = Boolean(import.meta.env?.DEV)
