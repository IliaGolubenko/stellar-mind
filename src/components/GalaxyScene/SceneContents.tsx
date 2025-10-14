import { useMemo } from 'react'
import { OrbitControls } from '@react-three/drei'

import { GALAXY_TILT } from './constants'
import GalaxyArms from './GalaxyArms'
import GalaxyHazeField from './GalaxyHazeField'
import PlanetsField from './PlanetsField'
import BackgroundStars from './BackgroundStars'
import { generateGalaxyPositions } from './generators'
import type { GalaxySceneProps } from './types'

const SceneContents = ({ planets, onPlanetSelect, onPlanetHover }: GalaxySceneProps) => {
  const galaxyData = useMemo(() => generateGalaxyPositions(), [])

  return (
    <>
      <ambientLight intensity={0.38} />
      <pointLight position={[0, 26, 0]} intensity={1} color="#f8fafc" />
      <BackgroundStars />
      <group rotation={[GALAXY_TILT, 0, 0]}>
        <GalaxyArms galaxyData={galaxyData} />
        <GalaxyHazeField starPositions={galaxyData.positions} />
        <PlanetsField
          planets={planets}
          onSelect={onPlanetSelect}
          onHover={onPlanetHover ?? (() => {})}
        />
      </group>
      <OrbitControls
        enableZoom
        enablePan={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={(Math.PI * 3) / 4}
        minDistance={24}
        maxDistance={210}
        zoomSpeed={0.65}
      />
    </>
  )
}

export default SceneContents
