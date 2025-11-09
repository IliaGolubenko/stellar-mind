const NASA_TAP_QUERY =
  'SELECT TOP 100 pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_orbeccen,pl_rade,pl_bmasse,pl_dens,pl_insol,pl_eqt,st_spectype,st_teff,st_rad,st_mass,st_lum,st_age,st_met,st_logg,st_dens,sy_dist,ra,dec FROM ps WHERE default_flag=1 ORDER BY disc_year DESC,pl_name'

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
