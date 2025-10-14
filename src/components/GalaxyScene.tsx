import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import type { Exoplanet } from '../types/exoplanet';
import { gaussianRandom } from '../utils/utils';
import {
  AdditiveBlending,
  Color,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  type BufferAttribute,
  type Group,
  type PointsMaterial,
  type Mesh,
  type Sprite,
  SpriteMaterial,
} from 'three';

interface GalaxySceneProps {
  planets: Exoplanet[];
  onPlanetSelect: (planet: Exoplanet) => void;
  onPlanetHover?: (planet: Exoplanet | null) => void;
}

interface PlanetInstance {
  planet: Exoplanet;
  position: [number, number, number];
  color: string;
  scale: number;
}

interface HazeSpriteInfo {
  id: number;
  position: [number, number, number];
  size: number;
}

const GALAXY_COLORS = ['#7dd3fc', '#a855f7', '#f472b6', '#f9a8d4', '#fef08a'];
const BACKGROUND_STAR_COLOR_PALETTE = [
  '#fefefe',
  '#fcd34d',
  '#f97316',
  '#fb7185',
  '#60a5fa',
  '#a855f7',
];
const starTypes = {
  percentage: [76.45, 12.1, 7.6, 3.0, 0.6, 0.13],
  color: [0xffcc6f, 0xffd2a1, 0xfff4ea, 0xf8f7ff, 0xcad7ff, 0xaabfff],
  size: [0.7, 0.7, 1.15, 1.48, 2.0, 2.5, 3.5],
} as const;

const NUM_STARS = 20000;
const NUM_GALAXY_ARMS = 5;
const HAZE_RATIO = 0.005;

const GALAXY_TILT = 0.2;
const GALAXY_ROTATION_SPEED = 0.025;
const GALAXY_CORE_BASE_SIZE = 0.1;
const STAR_FIELD_BASE_SIZE = 2.6;
const STAR_HALO_BASE_SIZE = 4.2;
const BASE_CAMERA_DISTANCE = 24;
const MAX_STAR_SIZE_MULTIPLIER = 8.4;
const BASE_LAYER = 0;
const HAZE_MIN_SIZE = 30;
const HAZE_MAX_SIZE = 60;
const HAZE_OPACITY = 0.85;
const HAZE_COLOR = '#0082ff';

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getStarTexture = (() => {
  let cachedTexture: Texture | null = null;

  return () => {
    if (!cachedTexture && typeof window !== 'undefined') {
      const loader = new TextureLoader();
      cachedTexture = loader.load('/sprite120.png');
      cachedTexture.colorSpace = SRGBColorSpace;
    }

    return cachedTexture;
  };
})();

const STAR_TYPE_COLORS = starTypes.color.map((hex) => new Color(hex));

interface GalaxyStarBucket {
  positions: Float32Array;
  colors: Float32Array;
  sizeMultiplier: number;
}

interface GalaxyStarData {
  buckets: GalaxyStarBucket[];
  positions: Float32Array;
  colors: Float32Array;
}

const generateGalaxyPositions = (radius = 95): GalaxyStarData => {
  const bucketCount = STAR_TYPE_COLORS.length;
  const positionBuckets = Array.from({ length: bucketCount }, () => [] as number[]);
  const colorBuckets = Array.from({ length: bucketCount }, () => [] as number[]);
  const allPositions: number[] = [];
  const allColors: number[] = [];

  const totalPercentage = starTypes.percentage.reduce((total, value) => total + value, 0);
  const typeThresholds = starTypes.percentage.reduce<number[]>((acc, value, index) => {
    const cumulative = value / totalPercentage + (acc[index - 1] ?? 0);
    acc.push(cumulative);
    return acc;
  }, []);

  for (let i = 0; i < NUM_STARS; i += 1) {
    const armIndex = i % NUM_GALAXY_ARMS;
    const armAngle = (armIndex / NUM_GALAXY_ARMS) * Math.PI * 2;
    const distance = Math.pow(Math.random(), 1.35) * radius;
    const coreBias = Math.max(0, 1 - distance / (radius * 0.9));
    const armThickness = 6 + coreBias * 20;
    const angleOffset = distance * 0.045 + clamp(gaussianRandom(0, 0.12), -0.4, 0.4);
    const angle = armAngle + angleOffset;

    const radialFalloff = Math.max(0.3, 1 - distance / radius);
    const spread = armThickness * radialFalloff;
    const verticalSpread = (0.9 + coreBias * 3.4) * radialFalloff;
    const compression = 1 - coreBias * 0.35;

    const x = Math.cos(angle) * distance * compression + gaussianRandom(0, spread / 2);
    const y = gaussianRandom(0, verticalSpread / 2) * compression;
    const z = Math.sin(angle) * distance * compression + gaussianRandom(0, spread / 2);

    const randomPick = Math.random();
    const typeIndex = typeThresholds.findIndex((threshold) => randomPick <= threshold);
    const bucketIndex = typeIndex === -1 ? bucketCount - 1 : typeIndex;

    const radialFactor = distance / radius;
    const brightness = 1.1 - radialFactor * 0.85;
    const baseColor = STAR_TYPE_COLORS[bucketIndex];
    const coreMultiplier = clamp(brightness, 0.35, 1.2);

    positionBuckets[bucketIndex].push(x, y, z);
    allPositions.push(x, y, z);
    const colorR = clamp(baseColor.r * coreMultiplier, 0, 1);
    const colorG = clamp(baseColor.g * coreMultiplier, 0, 1);
    const colorB = clamp(baseColor.b * coreMultiplier, 0, 1);

    colorBuckets[bucketIndex].push(colorR, colorG, colorB);
    allColors.push(colorR, colorG, colorB);
  }

  const buckets = positionBuckets.map((positions, index) => ({
    positions: new Float32Array(positions),
    colors: new Float32Array(colorBuckets[index]),
    sizeMultiplier: starTypes.size[Math.min(index, starTypes.size.length - 1)] ?? starTypes.size[0],
  }));

  return {
    buckets,
    positions: new Float32Array(allPositions),
    colors: new Float32Array(allColors),
  };
};

const createStarField = (count = 3200, minRadius = 300, maxRadius = 480) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColors = new Float32Array(count * 3);
  const flickerSpeeds = new Float32Array(count);
  const flickerOffsets = new Float32Array(count);
  const palette = BACKGROUND_STAR_COLOR_PALETTE.map((hex) => new Color(hex));

  for (let i = 0; i < count; i += 1) {
    const distanceRange = maxRadius - minRadius;
    const distance = minRadius + distanceRange * Math.pow(Math.random(), 0.55);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - 2 * Math.random());
    const sinPhi = Math.sin(phi);

    positions[i * 3] = distance * Math.cos(theta) * sinPhi;
    positions[i * 3 + 1] = distance * Math.cos(phi) * 0.55;
    positions[i * 3 + 2] = distance * Math.sin(theta) * sinPhi;

    const paletteColor = palette[Math.floor(Math.random() * palette.length)];
    const baseIntensity = randomBetween(0.65, 1);

    baseColors[i * 3] = paletteColor.r * baseIntensity;
    baseColors[i * 3 + 1] = paletteColor.g * baseIntensity;
    baseColors[i * 3 + 2] = paletteColor.b * baseIntensity;

    colors[i * 3] = baseColors[i * 3];
    colors[i * 3 + 1] = baseColors[i * 3 + 1];
    colors[i * 3 + 2] = baseColors[i * 3 + 2];

    flickerSpeeds[i] = randomBetween(0.6, 2.4);
    flickerOffsets[i] = Math.random() * Math.PI * 2;
  }

  return { positions, colors, baseColors, flickerSpeeds, flickerOffsets } as const;
};

const createHazeField = (starPositions: Float32Array, ratio = HAZE_RATIO): HazeSpriteInfo[] => {
  const totalStars = starPositions.length / 3;
  if (totalStars === 0 || ratio <= 0) {
    return [];
  }

  const targetCount = Math.min(totalStars, Math.max(1, Math.floor(totalStars * ratio)));

  const usedIndices = new Set<number>();
  const haze: HazeSpriteInfo[] = [];

  while (haze.length < targetCount) {
    const starIndex = Math.floor(Math.random() * totalStars);
    if (usedIndices.has(starIndex)) {
      continue;
    }
    usedIndices.add(starIndex);

    const baseX = starPositions[starIndex * 3];
    const baseY = starPositions[starIndex * 3 + 1];
    const baseZ = starPositions[starIndex * 3 + 2];

    const position: [number, number, number] = [
      baseX + gaussianRandom(0, 2.4),
      baseY * 0.4 + gaussianRandom(0, 0.6),
      baseZ + gaussianRandom(0, 2.4),
    ];

    const size = clamp(
      HAZE_MIN_SIZE + Math.random() * (HAZE_MAX_SIZE - HAZE_MIN_SIZE),
      HAZE_MIN_SIZE,
      HAZE_MAX_SIZE,
    );

    haze.push({
      id: starIndex,
      position,
      size,
    });
  }

  return haze;
};

const GalaxyHazeField = ({ starPositions }: { starPositions: Float32Array }) => {
  const hazeTexture = useTexture('/feathered60.png') as Texture;
  const hazePatches = useMemo(() => createHazeField(starPositions), [starPositions]);
  const spriteRefs = useRef<Sprite[]>([]);

  useEffect(() => {
    hazeTexture.colorSpace = SRGBColorSpace;
    hazeTexture.needsUpdate = true;
  }, [hazeTexture]);

  useFrame(({ camera }) => {
    spriteRefs.current.forEach((sprite) => {
      if (!sprite) {
        return;
      }
      const material = sprite.material as SpriteMaterial;
      const distance = sprite.position.distanceTo(camera.position) / 250;
      const targetOpacity = clamp(HAZE_OPACITY * Math.pow(distance / 2.5, 2), 0, HAZE_OPACITY);

      if (Math.abs(material.opacity - targetOpacity) > 0.001) {
        material.opacity = targetOpacity;
        material.needsUpdate = true;
      }
    });
  });

  return (
    <group>
      {hazePatches.map((patch, index) => (
        <sprite
          key={`haze-${patch.id}-${index}`}
          position={patch.position}
          scale={[patch.size, patch.size, patch.size]}
          ref={(sprite) => {
            if (sprite) {
              sprite.layers.set(BASE_LAYER);
            }
            spriteRefs.current[index] = sprite ?? null;
          }}
        >
          <spriteMaterial
            map={hazeTexture}
            color={HAZE_COLOR}
            opacity={HAZE_OPACITY}
            transparent
            depthTest={false}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
};

const GalaxyArms = ({ galaxyData }: { galaxyData: GalaxyStarData }) => {
  const groupRef = useRef<Group>(null);
  const coreMaterialRefs = useRef<Array<PointsMaterial | null>>([]);
  const starBuckets = galaxyData.buckets;
  const sprite = useMemo(() => getStarTexture(), []);

  useFrame(({ clock, camera }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * GALAXY_ROTATION_SPEED;
    }

    const distance = camera.position.length();
    const scale = clamp(distance / BASE_CAMERA_DISTANCE, 1, MAX_STAR_SIZE_MULTIPLIER);
    const baseSize = GALAXY_CORE_BASE_SIZE * scale;

    starBuckets.forEach((bucket, index) => {
      const coreMat = coreMaterialRefs.current[index];
      if (coreMat) {
        const targetSize = baseSize * bucket.sizeMultiplier;
        if (Math.abs(coreMat.size - targetSize) > 0.001) {
          coreMat.size = targetSize;
          coreMat.needsUpdate = true;
        }
      }
    });
  });

  coreMaterialRefs.current.length = starBuckets.length;

  return (
    <group ref={groupRef}>
      {starBuckets.map((bucket, index) => {
        if (bucket.positions.length === 0) {
          return null;
        }

        const key = `galaxy-arm-type-${index}`;

        return (
          <points key={key}>
            <bufferGeometry attach="geometry">
              <bufferAttribute
                attach="attributes-position"
                array={bucket.positions}
                count={bucket.positions.length / 3}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-color"
                array={bucket.colors}
                count={bucket.colors.length / 3}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              ref={(material) => {
                coreMaterialRefs.current[index] = material;
              }}
              vertexColors
              size={GALAXY_CORE_BASE_SIZE * bucket.sizeMultiplier}
              sizeAttenuation
              depthWrite
              map={sprite ?? undefined}
              alphaMap={sprite ?? undefined}
              alphaTest={0.25}
            />
          </points>
        );
      })}
    </group>
  );
};

const Planet = ({
  instance,
  onSelect,
  onHover,
}: {
  instance: PlanetInstance;
  onSelect: (planet: Exoplanet) => void;
  onHover: (planet: Exoplanet | null) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.elapsedTime * 0.1;
  });

  return (
    <mesh
      ref={meshRef}
      position={instance.position}
      scale={hovered ? instance.scale * 1.12 : instance.scale}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(instance.planet);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        onHover(instance.planet);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
      castShadow
    >
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color={instance.color}
        roughness={0.42}
        metalness={0.25}
        emissive={instance.color}
        emissiveIntensity={0.35}
      />
    </mesh>
  );
};

const PlanetsField = ({
  planets,
  onSelect,
  onHover,
}: {
  planets: Exoplanet[];
  onSelect: (planet: Exoplanet) => void;
  onHover: (planet: Exoplanet | null) => void;
}) => {
  const groupRef = useRef<Group>(null);
  const instances = useMemo<PlanetInstance[]>(() => {
    if (planets.length === 0) {
      return [];
    }

    const baseRadius = 28;
    const armSeparation = (Math.PI * 2) / Math.max(planets.length, 1);

    return planets.map((planet, index) => {
      const angle = index * armSeparation + randomBetween(-0.18, 0.18);
      const radius = baseRadius + index * 8 + randomBetween(-3, 3);
      const verticalFalloff = Math.max(0.3, 1 - radius / 180);
      const height = randomBetween(-2, 2) * verticalFalloff;
      const position: [number, number, number] = [
        Math.cos(angle) * radius * 1.5,
        height,
        Math.sin(angle) * radius,
      ];

      return {
        planet,
        position,
        color: GALAXY_COLORS[index % GALAXY_COLORS.length],
        scale: 3.1 + Math.random() * 1.4,
      };
    });
  }, [planets]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * GALAXY_ROTATION_SPEED;
  });

  return (
    <group ref={groupRef}>
      {instances.map((instance) => (
        <Planet
          key={instance.planet.pl_name}
          instance={instance}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </group>
  );
};

const BackgroundStars = () => {
  const groupRef = useRef<Group>(null);
  const haloGroupRef = useRef<Group>(null);
  const colorAttributeRef = useRef<BufferAttribute | null>(null);
  const starField = useMemo(() => createStarField(), []);
  const sprite = useMemo(() => getStarTexture(), []);
  const starMaterialRef = useRef<PointsMaterial | null>(null);
  const haloMaterialRef = useRef<PointsMaterial | null>(null);

  useFrame(({ clock }) => {
    const attribute = colorAttributeRef.current;
    if (!attribute) {
      return;
    }

    const { colors, baseColors, flickerSpeeds, flickerOffsets } = starField;
    const elapsed = clock.elapsedTime;

    for (let i = 0; i < colors.length; i += 3) {
      const starIndex = i / 3;
      const flicker =
        0.65 + 0.35 * Math.sin(elapsed * flickerSpeeds[starIndex] + flickerOffsets[starIndex]);
      colors[i] = baseColors[i] * flicker;
      colors[i + 1] = baseColors[i + 1] * flicker;
      colors[i + 2] = baseColors[i + 2] * flicker;
    }

    attribute.needsUpdate = true;
  });

  return (
    <>
      <group ref={groupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={starField.positions}
              count={starField.positions.length / 3}
              itemSize={3}
            />
            <bufferAttribute
              ref={(attribute) => {
                colorAttributeRef.current = attribute ?? null;
              }}
              attach="attributes-color"
              array={starField.colors}
              count={starField.colors.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={starMaterialRef}
            vertexColors
            size={STAR_FIELD_BASE_SIZE}
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            blending={AdditiveBlending}
            map={sprite ?? undefined}
            alphaMap={sprite ?? undefined}
            alphaTest={0.06}
          />
        </points>
      </group>
      <group ref={haloGroupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={starField.positions}
              count={starField.positions.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={haloMaterialRef}
            color="#fdf8ff"
            transparent
            opacity={0.16}
            size={STAR_HALO_BASE_SIZE}
            sizeAttenuation
            depthWrite={false}
            blending={AdditiveBlending}
            map={sprite ?? undefined}
            alphaMap={sprite ?? undefined}
            alphaTest={0.04}
          />
        </points>
      </group>
    </>
  );
};

const SceneContents = ({ planets, onPlanetSelect, onPlanetHover }: GalaxySceneProps) => {
  const galaxyData = useMemo(() => generateGalaxyPositions(), []);

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
  );
};

const GalaxyScene = ({ planets, onPlanetSelect, onPlanetHover }: GalaxySceneProps) => (
  <Canvas camera={{ position: [0, 18, 65], fov: 55 }}>
    <SceneContents
      planets={planets}
      onPlanetSelect={onPlanetSelect}
      onPlanetHover={onPlanetHover}
    />
  </Canvas>
);

export default GalaxyScene;
