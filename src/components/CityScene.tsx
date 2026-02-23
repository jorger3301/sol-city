"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Building3D, { createWindowAtlas } from "./Building3D";
import type { CityBuilding } from "@/lib/github";
import type { BuildingColors } from "./CityCanvas";

const LOD_NEAR = 500;           // enter near set when closer than this
const LOD_FAR = 600;            // leave near set when farther than this (hysteresis)
const LOD_NEAR_INTRO = 300;     // tighter radius during intro to reduce mount count
const LOD_FAR_INTRO = 400;
const LOD_UPDATE_INTERVAL = 0.2; // seconds
const GRID_CELL_SIZE = 200;      // spatial grid cell size
const INTRO_MAX_NEW_PER_TICK = 4; // max new Building3D mounts per LOD tick during intro
const MAX_NEW_PER_TICK = 8;      // throttle new mounts even after intro to spread GC pressure

// Pre-allocated temp objects to avoid GC pressure in useFrame
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();

export interface FocusInfo {
  dist: number;
  screenX: number;
  screenY: number;
}

// ─── Spatial Grid ───────────────────────────────────────────────

interface GridIndex {
  cells: Map<string, number[]>; // cell key -> building indices
  cellSize: number;
}

function buildSpatialGrid(buildings: CityBuilding[], cellSize: number): GridIndex {
  const cells = new Map<string, number[]>();
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const cx = Math.floor(b.position[0] / cellSize);
    const cz = Math.floor(b.position[2] / cellSize);
    const key = `${cx},${cz}`;
    let arr = cells.get(key);
    if (!arr) {
      arr = [];
      cells.set(key, arr);
    }
    arr.push(i);
  }
  return { cells, cellSize };
}

function querySpatialGrid(grid: GridIndex, x: number, z: number, radius: number): number[] {
  const result: number[] = [];
  const minCx = Math.floor((x - radius) / grid.cellSize);
  const maxCx = Math.floor((x + radius) / grid.cellSize);
  const minCz = Math.floor((z - radius) / grid.cellSize);
  const maxCz = Math.floor((z + radius) / grid.cellSize);
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const arr = grid.cells.get(`${cx},${cz}`);
      if (arr) {
        for (let i = 0; i < arr.length; i++) {
          result.push(arr[i]);
        }
      }
    }
  }
  return result;
}

// ─── Pre-computed building data (avoid per-tick allocations) ────

interface BuildingLookup {
  indexByLogin: Map<string, number>; // lowercased login -> index
}

function buildLookup(buildings: CityBuilding[]): BuildingLookup {
  const indexByLogin = new Map<string, number>();
  for (let i = 0; i < buildings.length; i++) {
    indexByLogin.set(buildings[i].login.toLowerCase(), i);
  }
  return { indexByLogin };
}

// ─── Component ──────────────────────────────────────────────────

interface CitySceneProps {
  buildings: CityBuilding[];
  colors: BuildingColors;
  focusedBuilding?: string | null;
  focusedBuildingB?: string | null;
  accentColor?: string;
  onBuildingClick?: (building: CityBuilding) => void;
  onFocusInfo?: (info: FocusInfo) => void;
  introMode?: boolean;
}

export default function CityScene({
  buildings,
  colors,
  focusedBuilding,
  focusedBuildingB,
  accentColor,
  onBuildingClick,
  onFocusInfo,
  introMode,
}: CitySceneProps) {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const lastUpdate = useRef(-1);
  const nearSetRef = useRef(new Set<string>());
  const [nearBuildings, setNearBuildings] = useState<CityBuilding[]>([]);

  // Shared geometry for far building instances (unit box, scaled per instance)
  const sharedGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  // Material for far buildings (flat color, no textures)
  const farMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
    []
  );

  // Single atlas texture for all building windows (created once per theme)
  const atlasTexture = useMemo(() => createWindowAtlas(colors), [colors]);

  // Build spatial grid + lookup when buildings change
  const grid = useMemo(() => buildSpatialGrid(buildings, GRID_CELL_SIZE), [buildings]);
  const lookup = useMemo(() => buildLookup(buildings), [buildings]);

  // Populate instanced mesh with ALL buildings once (static setup)
  const instancedInitialized = useRef(false);
  useEffect(() => {
    instancedInitialized.current = false;
  }, [buildings]);

  // Update material when theme changes
  useEffect(() => {
    farMaterial.color.set(colors.face);
    farMaterial.emissive.set(colors.roof);
    farMaterial.emissiveIntensity = 1.2;
    farMaterial.needsUpdate = true;
  }, [colors.face, colors.roof, farMaterial]);

  // Dim far buildings when one is focused
  useEffect(() => {
    if (focusedBuilding || focusedBuildingB) {
      farMaterial.transparent = true;
      farMaterial.opacity = 0.55;
      farMaterial.emissiveIntensity = 0.4;
    } else {
      farMaterial.transparent = false;
      farMaterial.opacity = 1;
      farMaterial.emissiveIntensity = 1.2;
    }
    farMaterial.needsUpdate = true;
  }, [focusedBuilding, focusedBuildingB, farMaterial]);

  // Force recalculation when buildings array changes or intro mode changes.
  // Reset near set in BOTH directions so buildings re-enter through mount throttle.
  useEffect(() => {
    lastUpdate.current = -1;
    nearSetRef.current = new Set<string>();
    setNearBuildings([]);
  }, [buildings, introMode]);

  // Dispose shared resources on unmount / theme change
  useEffect(() => {
    return () => {
      sharedGeo.dispose();
      farMaterial.dispose();
    };
  }, [sharedGeo, farMaterial]);

  useEffect(() => {
    return () => atlasTexture.dispose();
  }, [atlasTexture]);

  // Cache lowercase focus names
  const focusedLower = focusedBuilding?.toLowerCase() ?? null;
  const focusedBLower = focusedBuildingB?.toLowerCase() ?? null;

  // Centralized LOD check
  useFrame(({ camera, clock, size }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;

    // Static init: populate ALL building instances once
    if (!instancedInitialized.current) {
      instancedInitialized.current = true;
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        _position.set(b.position[0], b.height / 2, b.position[2]);
        _scale.set(b.width, b.height, b.depth);
        _matrix.compose(_position, _quaternion, _scale);
        mesh.setMatrixAt(i, _matrix);
        _color.set(b.custom_color ?? colors.face);
        mesh.setColorAt(i, _color);
      }
      mesh.count = buildings.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    const elapsed = clock.elapsedTime;
    if (elapsed - lastUpdate.current < LOD_UPDATE_INTERVAL) return;
    lastUpdate.current = elapsed;

    // Use tighter LOD radius during intro to reduce mount count & GC pressure
    const effectiveNear = introMode ? LOD_NEAR_INTRO : LOD_NEAR;
    const effectiveFar = introMode ? LOD_FAR_INTRO : LOD_FAR;

    // Query spatial grid for candidates (use effectiveFar as radius to catch hysteresis zone)
    const candidates = querySpatialGrid(grid, camera.position.x, camera.position.z, effectiveFar);

    const nearDistSq = effectiveNear * effectiveNear;
    const farDistSq = effectiveFar * effectiveFar;
    const newNearSet = new Set<string>();

    for (let c = 0; c < candidates.length; c++) {
      const idx = candidates[c];
      const b = buildings[idx];
      const dx = camera.position.x - b.position[0];
      const dz = camera.position.z - b.position[2];
      const distSq = dx * dx + dz * dz;

      const alreadyNear = nearSetRef.current.has(b.login);

      // Hysteresis: enter at LOD_NEAR, leave at LOD_FAR
      if (distSq < nearDistSq || (alreadyNear && distSq < farDistSq)) {
        newNearSet.add(b.login);
      }
    }

    // Always include focused buildings regardless of distance
    if (focusedLower) {
      const fi = lookup.indexByLogin.get(focusedLower);
      if (fi !== undefined) newNearSet.add(buildings[fi].login);
    }
    if (focusedBLower) {
      const fi = lookup.indexByLogin.get(focusedBLower);
      if (fi !== undefined) newNearSet.add(buildings[fi].login);
    }

    // Intro: additive-only (never remove buildings during flyover)
    if (introMode) {
      for (const login of nearSetRef.current) {
        newNearSet.add(login);
      }
    }

    // Universal mount throttle: limit new Building3D mounts per tick to spread GC pressure.
    // Applies during intro AND after (e.g. when intro ends and buildings re-enter).
    const maxNew = introMode ? INTRO_MAX_NEW_PER_TICK : MAX_NEW_PER_TICK;
    let newCount = 0;
    const throttled = new Set<string>();
    for (const login of newNearSet) {
      if (nearSetRef.current.has(login)) {
        throttled.add(login);
      } else {
        newCount++;
        if (newCount <= maxNew) {
          throttled.add(login);
        }
      }
    }
    if (newCount > maxNew) {
      newNearSet.clear();
      for (const login of throttled) {
        newNearSet.add(login);
      }
    }

    // Emit focus info for focused buildings
    if (onFocusInfo && (focusedLower || focusedBLower)) {
      const fi = focusedLower ? lookup.indexByLogin.get(focusedLower) : undefined;
      const fbi = focusedBLower ? lookup.indexByLogin.get(focusedBLower) : undefined;
      const targetIdx = fi ?? fbi;
      if (targetIdx !== undefined) {
        const b = buildings[targetIdx];
        const dx = camera.position.x - b.position[0];
        const dz = camera.position.z - b.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        _position.set(b.position[0], b.height * 0.65, b.position[2]);
        _position.project(camera);
        const screenX = (_position.x * 0.5 + 0.5) * size.width;
        const screenY = (-_position.y * 0.5 + 0.5) * size.height;
        onFocusInfo({ dist, screenX, screenY });
      }
    }

    // Only trigger React re-render when the near set actually changes
    let changed = newNearSet.size !== nearSetRef.current.size;
    if (!changed) {
      for (const login of newNearSet) {
        if (!nearSetRef.current.has(login)) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      nearSetRef.current = newNearSet;
      setNearBuildings(buildings.filter((b) => newNearSet.has(b.login)));
    }
  });

  return (
    <>
      {/* All buildings as instanced mesh (always visible, Building3D renders on top) */}
      <instancedMesh
        ref={instancedRef}
        args={[sharedGeo, farMaterial, buildings.length]}
        frustumCulled={false}
      />

      {/* Near buildings: individual components with username label + effects */}
      {nearBuildings.map((b) => {
        const loginLower = b.login.toLowerCase();
        const isA = focusedLower === loginLower;
        const isB = focusedBLower === loginLower;
        return (
          <Building3D
            key={b.login}
            building={b}
            colors={colors}
            atlasTexture={atlasTexture}
            introMode={introMode}
            focused={isA || isB}
            dimmed={
              !!(focusedBuilding || focusedBuildingB) && !isA && !isB
            }
            accentColor={accentColor}
            onClick={onBuildingClick}
          />
        );
      })}
    </>
  );
}
