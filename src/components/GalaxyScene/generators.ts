import { Color } from 'three'

import { gaussianRandom } from '../../utils/utils'
import {
  BACKGROUND_STAR_COLOR_PALETTE,
  HAZE_MAX_SIZE,
  HAZE_MIN_SIZE,
  HAZE_RATIO,
  NUM_GALAXY_ARMS,
  NUM_STARS,
  starTypes,
} from './constants'
import { clamp, randomBetween } from './utils'
import type { GalaxyStarData, HazeSpriteInfo } from './types'

const STAR_TYPE_COLORS = starTypes.color.map((hex) => new Color(hex))

export const generateGalaxyPositions = (radius = 95): GalaxyStarData => {
  const bucketCount = STAR_TYPE_COLORS.length
  const positionBuckets = Array.from({ length: bucketCount }, () => [] as number[])
  const colorBuckets = Array.from({ length: bucketCount }, () => [] as number[])
  const allPositions: number[] = []
  const allColors: number[] = []

  const totalPercentage = starTypes.percentage.reduce((total, value) => total + value, 0)
  const typeThresholds = starTypes.percentage.reduce<number[]>((acc, value, index) => {
    const cumulative = value / totalPercentage + (acc[index - 1] ?? 0)
    acc.push(cumulative)
    return acc
  }, [])

  for (let i = 0; i < NUM_STARS; i += 1) {
    const armIndex = i % NUM_GALAXY_ARMS
    const armAngle = (armIndex / NUM_GALAXY_ARMS) * Math.PI * 2
    const distance = Math.pow(Math.random(), 1.8) * radius
    const coreBias = Math.max(0, 1 - distance / (radius * 0.9))
    const armThickness = 6 + coreBias * 20
    const angleOffset = distance * 0.045 + clamp(gaussianRandom(0, 0.12), -0.4, 0.4)
    const angle = armAngle + angleOffset

    const radialFalloff = Math.max(0.3, 1 - distance / radius)
    const spread = armThickness * radialFalloff
    const verticalSpread = (0.9 + coreBias * 3.4) * radialFalloff
    const compression = 1 - coreBias * 0.35

    const x = Math.cos(angle) * distance * compression + gaussianRandom(0, spread / 2)
    const y = gaussianRandom(0, verticalSpread / 2) * compression
    const z = Math.sin(angle) * distance * compression + gaussianRandom(0, spread / 2)

    const randomPick = Math.random()
    const typeIndex = typeThresholds.findIndex((threshold) => randomPick <= threshold)
    const bucketIndex = typeIndex === -1 ? bucketCount - 1 : typeIndex

    const radialFactor = distance / radius
    const brightness = 1.1 - radialFactor * 0.85
    const baseColor = STAR_TYPE_COLORS[bucketIndex]
    const coreMultiplier = clamp(brightness, 0.35, 1.2)

    positionBuckets[bucketIndex].push(x, y, z)
    allPositions.push(x, y, z)
    const colorR = clamp(baseColor.r * coreMultiplier, 0, 1)
    const colorG = clamp(baseColor.g * coreMultiplier, 0, 1)
    const colorB = clamp(baseColor.b * coreMultiplier, 0, 1)

    colorBuckets[bucketIndex].push(colorR, colorG, colorB)
    allColors.push(colorR, colorG, colorB)
  }

  const buckets = positionBuckets.map((positions, index) => ({
    positions: new Float32Array(positions),
    colors: new Float32Array(colorBuckets[index]),
    sizeMultiplier: starTypes.size[Math.min(index, starTypes.size.length - 1)] ?? starTypes.size[0],
  }))

  return {
    buckets,
    positions: new Float32Array(allPositions),
    colors: new Float32Array(allColors),
  }
}

export const createStarField = (count = 3200, minRadius = 300, maxRadius = 480) => {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const baseColors = new Float32Array(count * 3)
  const flickerSpeeds = new Float32Array(count)
  const flickerOffsets = new Float32Array(count)
  const palette = BACKGROUND_STAR_COLOR_PALETTE.map((hex) => new Color(hex))

  for (let i = 0; i < count; i += 1) {
    const distanceRange = maxRadius - minRadius
    const distance = minRadius + distanceRange * Math.pow(Math.random(), 0.55)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(1 - 2 * Math.random())
    const sinPhi = Math.sin(phi)

    positions[i * 3] = distance * Math.cos(theta) * sinPhi
    positions[i * 3 + 1] = distance * Math.cos(phi) * 0.55
    positions[i * 3 + 2] = distance * Math.sin(theta) * sinPhi

    const paletteColor = palette[Math.floor(Math.random() * palette.length)]
    const baseIntensity = randomBetween(0.65, 1)

    baseColors[i * 3] = paletteColor.r * baseIntensity
    baseColors[i * 3 + 1] = paletteColor.g * baseIntensity
    baseColors[i * 3 + 2] = paletteColor.b * baseIntensity

    colors[i * 3] = baseColors[i * 3]
    colors[i * 3 + 1] = baseColors[i * 3 + 1]
    colors[i * 3 + 2] = baseColors[i * 3 + 2]

    flickerSpeeds[i] = randomBetween(0.6, 2.4)
    flickerOffsets[i] = Math.random() * Math.PI * 2
  }

  return { positions, colors, baseColors, flickerSpeeds, flickerOffsets } as const
}

export const createHazeField = (
  starPositions: Float32Array,
  ratio = HAZE_RATIO,
): HazeSpriteInfo[] => {
  const totalStars = starPositions.length / 3
  if (totalStars === 0 || ratio <= 0) {
    return []
  }

  const targetCount = Math.min(totalStars, Math.max(1, Math.floor(totalStars * ratio)))

  const usedIndices = new Set<number>()
  const haze: HazeSpriteInfo[] = []

  while (haze.length < targetCount) {
    const starIndex = Math.floor(Math.random() * totalStars)
    if (usedIndices.has(starIndex)) {
      continue
    }
    usedIndices.add(starIndex)

    const baseX = starPositions[starIndex * 3]
    const baseY = starPositions[starIndex * 3 + 1]
    const baseZ = starPositions[starIndex * 3 + 2]

    const position: [number, number, number] = [
      baseX + gaussianRandom(0, 2.4),
      baseY * 0.4 + gaussianRandom(0, 0.6),
      baseZ + gaussianRandom(0, 2.4),
    ]

    const size = clamp(
      HAZE_MIN_SIZE + Math.random() * (HAZE_MAX_SIZE - HAZE_MIN_SIZE),
      HAZE_MIN_SIZE,
      HAZE_MAX_SIZE,
    )

    haze.push({
      id: starIndex,
      position,
      size,
    })
  }

  return haze
}
