import { Canvas } from '@react-three/fiber'

import type { GalaxySceneProps } from './GalaxyScene/types'
import SceneContents from './GalaxyScene/SceneContents'

const GalaxyScene = ({ planets, onPlanetSelect, onPlanetHover }: GalaxySceneProps) => (
  <Canvas camera={{ position: [0, 18, 65], fov: 55 }}>
    <SceneContents
      planets={planets}
      onPlanetSelect={onPlanetSelect}
      onPlanetHover={onPlanetHover}
    />
  </Canvas>
)

export default GalaxyScene
