// components/CenterVictor.js
import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls } from "@react-three/drei";

function VictorModel() {
  const group = useRef();
  const { scene, animations } = useGLTF("/models/standing.glb");
  const { actions } = useAnimations(animations, group);

  React.useEffect(() => {
    if (actions && actions.idle) {
      actions.idle.play();
    }
  }, [actions]);

  if (!scene) {
    return null;
  }

  return (
    <group ref={group}>
      <primitive object={scene} scale={1.2} position={[0, -1, 0]} />
    </group>
  );
}

export default function CenterVictor() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1.5} />
        {/* 8 directional lights surrounding Victor */}
        <directionalLight position={[5, 5, 5]} intensity={2.5} />
        <directionalLight position={[-5, 5, 5]} intensity={2.5} />
        <directionalLight position={[5, 5, -5]} intensity={2.5} />
        <directionalLight position={[-5, 5, -5]} intensity={2.5} />
        <directionalLight position={[0, 5, 5]} intensity={2.5} />
        <directionalLight position={[0, 5, -5]} intensity={2.5} />
        <directionalLight position={[5, 5, 0]} intensity={2.5} />
        <directionalLight position={[-5, 5, 0]} intensity={2.5} />
        <pointLight position={[0, 5, 0]} intensity={2.0} />
        <pointLight position={[5, 2, 5]} intensity={1.5} />
        <pointLight position={[-5, 2, 5]} intensity={1.5} />
        <spotLight 
          position={[0, 10, 0]} 
          angle={0.4} 
          penumbra={0.5} 
          intensity={2.5}
          castShadow
        />
        
        <VictorModel />
        
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
