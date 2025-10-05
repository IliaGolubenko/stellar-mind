export const NASA_EXOPLANETS_URL =
  'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=' +
  encodeURIComponent(
    'SELECT TOP 50 pl_name, hostname, discoverymethod, disc_year, pl_orbper, pl_rade, pl_bmasse, st_spectype, st_teff, st_rad, st_mass FROM ps ORDER BY disc_year DESC, pl_name',
  ) +
  '&format=json';
