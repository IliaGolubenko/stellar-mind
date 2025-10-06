import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import type { Exoplanet } from '../types/exoplanet';
import {
  AdditiveBlending,
  Color,
  Texture,
  type Sprite,
  SpriteMaterial,
  type BufferAttribute,
  type Group,
  type Mesh,
  type Points,
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

interface FogPatch {
  id: number;
  position: [number, number, number];
  rotation: number;
  scale: number;
  stretch: number;
  color: string;
  opacity: number;
}

const GALAXY_COLORS = ['#7dd3fc', '#a855f7', '#f472b6', '#f9a8d4', '#fef08a'];
const STAR_COLOR_PALETTE = ['#fefefe', '#fcd34d', '#f97316', '#fb7185', '#60a5fa', '#a855f7'];
const FOG_COLORS = ['#6366f1', '#7c3aed', '#8b5cf6', '#22d3ee'];
const GALAXY_TILT = 0.2;
const GALAXY_ROTATION_SPEED = 0.025;

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createCircleTexture = () => {
  if (typeof document === 'undefined') {
    return null;
  }

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new Texture(canvas);
  texture.needsUpdate = true;

  return texture;
};

const getCircleTexture = (() => {
  let cachedTexture: Texture | null = null;
  return () => {
    if (!cachedTexture) {
      cachedTexture = createCircleTexture();
    }
    return cachedTexture;
  };
})();

const generateGalaxyPositions = (points = 12000, arms = 5, radius = 95) => {
  const positions = new Float32Array(points * 3);
  const colors = new Float32Array(points * 3);
  const color = new Color();

  for (let i = 0; i < points; i += 1) {
    const armIndex = i % arms;
    const armAngle = (armIndex / arms) * Math.PI * 2;
    const distance = Math.pow(Math.random(), 1.35) * radius;
    const coreBias = Math.max(0, 1 - distance / (radius * 0.9));
    const armThickness = 6 + coreBias * 20;
    const angleOffset = distance * 0.045 + randomBetween(-0.16, 0.16);
    const angle = armAngle + angleOffset;

    const radialFalloff = Math.max(0.3, 1 - distance / radius);
    const spread = armThickness * radialFalloff;
    const verticalSpread = (0.9 + coreBias * 3.4) * radialFalloff;
    const compression = 1 - coreBias * 0.35;

    const x = Math.cos(angle) * distance * compression + randomBetween(-spread, spread);
    const y = randomBetween(-verticalSpread, verticalSpread) * compression;
    const z = Math.sin(angle) * distance * compression + randomBetween(-spread, spread);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const radialFactor = distance / radius;
    const brightness = 1.1 - radialFactor * 0.85;
    const hue = 0.58 + randomBetween(-0.05, 0.05) - radialFactor * 0.05;
    const saturation = 0.65 + radialFactor * 0.2;
    const lightness = 0.6 + (1 - radialFactor) * 0.25;

    color.setHSL(hue, saturation, lightness);

    colors[i * 3] = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
  }

  return { positions, colors };
};

const createStarField = (count = 3200, minRadius = 300, maxRadius = 480) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColors = new Float32Array(count * 3);
  const flickerSpeeds = new Float32Array(count);
  const flickerOffsets = new Float32Array(count);
  const palette = STAR_COLOR_PALETTE.map((hex) => new Color(hex));

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

const createFogPatches = (count = 60, arms = 5): FogPatch[] =>
  Array.from({ length: count }, (_, index) => {
    const armIndex = index % arms;
    const radius = randomBetween(26, 90);
    const armAngle = (armIndex / arms) * Math.PI * 2;
    const curveOffset = radius * 0.05;
    const angle = armAngle + curveOffset + randomBetween(-0.18, 0.18);
    const tangent = angle + Math.PI / 2;
    const coreBias = Math.max(0, 1 - radius / 140);
    const radialFalloff = Math.max(0.25, 1 - radius / 200);

    const position: [number, number, number] = [
      Math.cos(angle) * radius + randomBetween(-2.5, 2.5) * radialFalloff,
      randomBetween(-0.5, 0.5) * (0.25 + coreBias * 0.5),
      Math.sin(angle) * radius + randomBetween(-2.5, 2.5) * radialFalloff,
    ];

    return {
      id: index,
      position,
      rotation: tangent + randomBetween(-0.35, 0.35),
      scale: randomBetween(12, 26) * (1 - radius / 280) + coreBias * 6,
      stretch: 1.8 + coreBias * 1.3 + Math.random() * 0.35,
      color: FOG_COLORS[Math.floor(Math.random() * FOG_COLORS.length)],
      opacity: randomBetween(0.18, 0.32) + coreBias * 0.06,
    };
  });

const GalaxyArms = () => {
  const groupRef = useRef<Points>(null);
  const { positions, colors } = useMemo(() => generateGalaxyPositions(), []);
  const sprite = getCircleTexture();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * GALAXY_ROTATION_SPEED;
  });

  return (
    <points ref={groupRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        vertexColors
        size={1.25}
        sizeAttenuation
        transparent
        opacity={1}
        depthWrite={false}
        blending={AdditiveBlending}
        map={sprite ?? undefined}
        alphaMap={sprite ?? undefined}
        alphaTest={0.05}
      />
    </points>
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

const ColoredStars = () => {
  const groupRef = useRef<Group>(null);
  const haloGroupRef = useRef<Group>(null);
  const colorAttributeRef = useRef<BufferAttribute | null>(null);
  const starField = useMemo(() => createStarField(), []);
  const sprite = getCircleTexture();

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
            vertexColors
            size={1.6}
            sizeAttenuation
            transparent
            opacity={0.95}
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
            color="#fdf8ff"
            transparent
            opacity={0.16}
            size={4.2}
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

const GalaxyFog = () => {
  const patches = useMemo(() => createFogPatches(), []);
  const fogGroupRef = useRef<Group>(null);
  const spriteRefs = useRef<Sprite[]>([]);
  const hazeTexture = useTexture('/feathered60.png');

  useFrame(({ clock, camera }) => {
    if (fogGroupRef.current) {
      fogGroupRef.current.rotation.y = clock.elapsedTime * GALAXY_ROTATION_SPEED;
    }

    spriteRefs.current.forEach((sprite, index) => {
      if (!sprite) {
        return;
      }
      const patch = patches[index];
      const material = sprite.material as SpriteMaterial;
      const dist = sprite.position.distanceTo(camera.position) / 250;
      material.opacity = clamp(patch.opacity * Math.pow(dist / 2.5, 2), 0, patch.opacity);
      material.needsUpdate = true;
      material.rotation = patch.rotation;
    });
  });

  return (
    <group ref={fogGroupRef}>
      {patches.map((patch, index) => (
        <sprite
          key={patch.id}
          ref={(node) => {
            if (node) {
              spriteRefs.current[index] = node;
            }
          }}
          position={patch.position}
          scale={[patch.scale * patch.stretch, patch.scale * 0.35, 1]}
        >
          <spriteMaterial
            map={hazeTexture}
            color={patch.color}
            transparent
            depthTest={false}
            depthWrite={false}
            blending={AdditiveBlending}
            opacity={patch.opacity}
          />
        </sprite>
      ))}
    </group>
  );
};

const SceneContents = ({ planets, onPlanetSelect, onPlanetHover }: GalaxySceneProps) => (
  <>
    <ambientLight intensity={0.38} />
    <pointLight position={[0, 26, 0]} intensity={1} color="#f8fafc" />
    <ColoredStars />
    <group rotation={[GALAXY_TILT, 0, 0]}>
      <GalaxyArms />
      <GalaxyFog />
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
      minDistance={54}
      maxDistance={210}
      zoomSpeed={0.65}
    />
  </>
);

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
