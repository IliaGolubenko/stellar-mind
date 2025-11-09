const TAP_BASE_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'

const BASE_COLUMNS =
  'pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_orbeccen,pl_rade,pl_bmasse,pl_dens,pl_insol,pl_eqt,st_spectype,st_teff,st_rad,st_mass,st_lum,st_age,st_met,st_logg,st_dens,sy_dist,ra,dec'

export const sanitizeTapValue = (value: string) => value.replace(/'/g, "''")

const buildPagedQuery = ({
  limit,
  offset,
  whereClause,
  orderClause,
  extraSelect,
  columns: columnsOverride,
}: {
  limit: number
  offset: number
  whereClause: string
  orderClause: string
  extraSelect?: string
  columns?: string
}) => {
  const baseColumns = columnsOverride ?? BASE_COLUMNS
  const columns = extraSelect ? `${baseColumns},${extraSelect}` : baseColumns
  const start = offset + 1
  const end = offset + limit

  return `SELECT ${columns} FROM (SELECT ${columns}, ROW_NUMBER() OVER (ORDER BY ${orderClause}) AS rn FROM ps WHERE ${whereClause}) WHERE rn BETWEEN ${start} AND ${end}`
}

const logExpr = (value: string) => `LOG(10, ${value})`

const earthlikeScoreExpr = [
  { expr: logExpr('pl_rade/1.0'), weight: 0.25 },
  { expr: logExpr('pl_bmasse/1.0'), weight: 0.2 },
  { expr: logExpr('pl_insol/1.0'), weight: 0.2 },
  { expr: logExpr('pl_eqt/288.0'), weight: 0.15 },
  { expr: logExpr('pl_dens/5.51'), weight: 0.1 },
  { expr: logExpr('pl_orbsmax/1.0'), weight: 0.1 },
]
  .map(({ expr, weight }) => `COALESCE(ABS(${expr}),9)*${weight.toFixed(2)}`)
  .join(' + ')

export const NASA_TAP_QUERY =
  'SELECT TOP 100 pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_orbsmax,pl_orbeccen,pl_rade,pl_bmasse,pl_dens,pl_insol,pl_eqt,st_spectype,st_teff,st_rad,st_mass,st_lum,st_age,st_met,st_logg,st_dens,sy_dist,ra,dec FROM ps WHERE default_flag=1 ORDER BY disc_year DESC,pl_name'

export const buildEarthlikeQuery = (limit = 25, offset = 0) =>
  buildPagedQuery({
    limit,
    offset,
    whereClause:
      'default_flag=1 AND pl_rade IS NOT NULL AND pl_bmasse IS NOT NULL AND pl_eqt IS NOT NULL AND pl_insol IS NOT NULL AND pl_dens IS NOT NULL AND pl_orbsmax IS NOT NULL',
    orderClause: `${earthlikeScoreExpr},disc_year DESC,pl_name`,
    extraSelect: `(${earthlikeScoreExpr}) AS earth_like_score`,
  })

export const buildDistanceQuery = (limit = 25, offset = 0) =>
  buildPagedQuery({
    limit,
    offset,
    whereClause: 'default_flag=1 AND sy_dist IS NOT NULL',
    orderClause: 'sy_dist ASC,pl_name',
  })

export type HabitableStrictness = 'relaxed' | 'strict'

export const buildHabitableZoneQuery = (
  limit = 25,
  offset = 0,
  strictness: HabitableStrictness = 'strict',
) => {
  const whereClause =
    strictness === 'strict'
      ? 'default_flag=1 AND pl_insol BETWEEN 0.35 AND 1.5 AND pl_eqt BETWEEN 230 AND 330 AND pl_rade BETWEEN 0.5 AND 2.0 AND pl_bmasse IS NOT NULL AND pl_rade IS NOT NULL AND (pl_orbeccen IS NULL OR pl_orbeccen < 0.2) AND (pl_bmasse / POWER(pl_rade, 2)) BETWEEN 0.5 AND 2.0'
      : 'default_flag=1 AND pl_insol BETWEEN 0.2 AND 2.5 AND pl_eqt BETWEEN 200 AND 400 AND pl_rade BETWEEN 0.4 AND 2.5 AND pl_bmasse IS NOT NULL AND pl_rade IS NOT NULL AND (pl_orbeccen IS NULL OR pl_orbeccen < 0.35) AND (pl_bmasse / POWER(pl_rade, 2)) BETWEEN 0.3 AND 2.5'

  return buildPagedQuery({
    limit,
    offset,
    whereClause,
    orderClause: 'ABS(pl_insol-1.0) ASC,ABS(pl_eqt-288) ASC,pl_name',
    extraSelect: `(${earthlikeScoreExpr}) AS earth_like_score`,
  })
}

export const buildPreciseSearchQuery = (planetName: string, limit = 25, offset = 0) =>
  buildPagedQuery({
    limit,
    offset,
    whereClause: `default_flag=1 AND UPPER(pl_name) LIKE UPPER('%${sanitizeTapValue(planetName)}%')`,
    orderClause: 'pl_name ASC',
  })

export const buildPlanetDetailQuery = (planetName: string) =>
  `SELECT TOP 1 * FROM ps WHERE default_flag=1 AND UPPER(pl_name)=UPPER('${sanitizeTapValue(planetName)}')`

const TAP_PARAMS = new URLSearchParams({
  query: NASA_TAP_QUERY,
  format: 'json',
})

const DIRECT_TAP_URL = `${TAP_BASE_URL}?${TAP_PARAMS.toString()}`

const DEV_PROXY_URL = `/api/nasa/exoplanets?${TAP_PARAMS.toString()}`

const PROD_FALLBACK_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(DIRECT_TAP_URL)}`

export const NASA_EXOPLANETS_URL =
  import.meta.env.VITE_NASA_EXOPLANETS_URL ??
  (import.meta.env.DEV ? DEV_PROXY_URL : PROD_FALLBACK_URL)

export const IS_DEV = Boolean(import.meta.env?.DEV)

export const buildTapUrl = (query: string) => {
  const params = new URLSearchParams({
    query,
    format: 'json',
  })
  const paramsString = params.toString()

  if (import.meta.env.VITE_NASA_EXOPLANETS_URL) {
    const base = import.meta.env.VITE_NASA_EXOPLANETS_URL
    const separator = base.includes('?') ? '&' : '?'
    return `${base}${separator}${paramsString}`
  }

  if (import.meta.env.DEV) {
    return `/api/nasa/exoplanets?${paramsString}`
  }

  const directUrl = `${TAP_BASE_URL}?${paramsString}`
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`
}
