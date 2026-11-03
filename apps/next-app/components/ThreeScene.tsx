"use client";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Stars } from "@react-three/drei";
import type { Mesh } from "three";

function Cube() {
  const ref = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) { ref.current.rotation.x += d; ref.current.rotation.y += d * 0.6; }
  });
  return (
    <Float speed={2} floatIntensity={1.5}>
      <mesh ref={ref}>
        <torusKnotGeometry args={[0.8, 0.28, 128, 32]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.6} roughness={0.2} />
      </mesh>
    </Float>
  );
}

export default function ThreeScene() {
  return (
    <div style={{ height: 320 }}>
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 3]} intensity={2} />
        <Stars />
        <Cube />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
