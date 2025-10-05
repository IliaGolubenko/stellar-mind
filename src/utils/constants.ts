const NASA_TAP_QUERY =
  'SELECT TOP 50 pl_name, hostname, discoverymethod, disc_year, pl_orbper, pl_rade, pl_bmasse, st_spectype, st_teff, st_rad, st_mass FROM ps ORDER BY disc_year DESC, pl_name';

const TAP_PARAMS = new URLSearchParams({
  query: NASA_TAP_QUERY,
  format: 'json',
});

const DIRECT_TAP_URL = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?${TAP_PARAMS.toString()}`;

const DEV_PROXY_URL = `/api/nasa/exoplanets?${TAP_PARAMS.toString()}`;

const PROD_FALLBACK_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(DIRECT_TAP_URL)}`;

export const NASA_EXOPLANETS_URL =
  import.meta.env.VITE_NASA_EXOPLANETS_URL ??
  (import.meta.env.DEV ? DEV_PROXY_URL : PROD_FALLBACK_URL);
