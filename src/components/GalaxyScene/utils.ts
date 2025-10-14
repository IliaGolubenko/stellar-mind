import { SRGBColorSpace, Texture, TextureLoader } from 'three'

export const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const getStarTexture = (() => {
  let cachedTexture: Texture | null = null

  return () => {
    if (!cachedTexture && typeof window !== 'undefined') {
      const loader = new TextureLoader()
      cachedTexture = loader.load('/sprite120.png')
      cachedTexture.colorSpace = SRGBColorSpace
    }

    return cachedTexture
  }
})()
