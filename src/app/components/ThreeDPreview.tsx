import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../state/store';
import { computeAssemblyPoses } from '../../core/model/assembly3d';
import type { Panel } from '../../core/model/types';

function panelToShape(panel: Panel): THREE.Shape {
  const shape = new THREE.Shape(panel.outline.map((p) => new THREE.Vector2(p.x, p.y)));
  for (const hole of panel.holes) {
    shape.holes.push(new THREE.Path(hole.map((p) => new THREE.Vector2(p.x, p.y))));
  }
  return shape;
}

function PanelMesh({ panel, color }: { panel: Panel; color: string }) {
  const design = useAppStore((s) => s.design)!;
  const explodeFactor = useAppStore((s) => s.explodeFactor);

  const geometry = useMemo(() => {
    const shape = panelToShape(panel);
    return new THREE.ExtrudeGeometry(shape, { depth: panel.thickness, bevelEnabled: false });
  }, [panel]);

  const poses = useMemo(() => computeAssemblyPoses(design, explodeFactor), [design, explodeFactor]);
  const pose = poses[panel.id] ?? { position: [0, 0, 0] as [number, number, number], rotationDeg: [0, 0, 0] as [number, number, number] };

  return (
    <mesh
      geometry={geometry}
      position={pose.position}
      rotation={pose.rotationDeg.map((d) => (d * Math.PI) / 180) as [number, number, number]}
    >
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color="#000000" opacity={0.3} transparent />
      </lineSegments>
    </mesh>
  );
}

export function ThreeDPreview() {
  const design = useAppStore((s) => s.design);
  const explodeFactor = useAppStore((s) => s.explodeFactor);
  const setExplodeFactor = useAppStore((s) => s.setExplodeFactor);

  if (!design) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Generišite model da vidite 3D pregled.
      </div>
    );
  }

  const maxDim = Math.max(design.meta.outerDimensionsMm.width, design.meta.outerDimensionsMm.depth, design.meta.outerDimensionsMm.height, 100);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-400">
        <span>Eksplodirani prikaz</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explodeFactor}
          onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
          className="w-40 accent-fuchsia-500"
        />
        <span className="text-neutral-600">Vuci mišem za rotaciju · točkić za zoom</span>
      </div>
      <div className="flex-1">
        <Canvas camera={{ position: [maxDim * 1.4, -maxDim * 1.4, maxDim * 1.1], up: [0, 0, 1], fov: 40 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[maxDim, -maxDim, maxDim * 2]} intensity={0.8} />
          <Grid args={[maxDim * 4, maxDim * 4]} rotation={[Math.PI / 2, 0, 0]} cellColor="#333" sectionColor="#555" />
          {design.panels.map((panel) => (
            <PanelMesh key={panel.id} panel={panel} color={design.material.swatch} />
          ))}
          <OrbitControls makeDefault target={[0, 0, maxDim * 0.3]} />
        </Canvas>
      </div>
    </div>
  );
}
