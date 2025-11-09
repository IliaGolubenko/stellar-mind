import { buildPlanetDetailQuery, buildTapUrl } from './constants'

export type PlanetDetailRecord = Record<string, string | number | null>

export const fetchPlanetDetails = async (planetName: string): Promise<PlanetDetailRecord> => {
  const query = buildPlanetDetailQuery(planetName)
  const response = await fetch(buildTapUrl(query))

  if (!response.ok) {
    throw new Error(`NASA TAP error: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as PlanetDetailRecord[]

  if (!payload.length) {
    throw new Error('Planet not found in archive')
  }

  return payload[0]
}
