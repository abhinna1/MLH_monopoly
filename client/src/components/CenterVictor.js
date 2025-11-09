// components/CenterVictor.js
import React, { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls } from "@react-three/drei";

function VictorModel({ mode = "standing" }) {
  const group = useRef();
  
  // Map mode to model file (using actual files that exist)
  const modelFiles = {
    standing: "/models/standing.glb",
    talking: "/models/talking.glb",    // talking.glb exists
    samba: "/models/samba1.glb",       // samba1.glb exists
    flare: "/models/flare.glb"
  };
  
  const modelFile = modelFiles[mode] || modelFiles.standing;
  const { scene, animations } = useGLTF(modelFile);
  const { actions } = useAnimations(animations, group);

  React.useEffect(() => {
    if (actions) {
      // Stop all animations first
      Object.values(actions).forEach(action => action?.stop());
      
      // Play appropriate animation based on mode
      // Just play the first available animation for each model
      const firstAction = Object.values(actions)[0];
      if (firstAction) {
        firstAction.play();
      }
    }
  }, [actions, mode]);

  // Smooth rotation animation within bounds (less rotation for talking/samba)
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    let yRotation, xRotation;
    
    if (mode === "flare") {
      // More dramatic rotation for flare mode
      yRotation = Math.sin(time * 0.8) * 0.785; // 45 degrees
      xRotation = Math.sin(time * 0.9) * 0.262; // 15 degrees
    } else if (mode === "samba") {
      // Bouncy rotation for samba
      yRotation = Math.sin(time * 1.2) * 0.524; // 30 degrees, faster
      xRotation = Math.sin(time * 1.5) * 0.175; // 10 degrees, faster
    } else if (mode === "talking") {
      // Gentle nodding for talking
      yRotation = Math.sin(time * 0.3) * 0.262; // 15 degrees, slower
      xRotation = Math.sin(time * 0.4) * 0.087; // 5 degrees, slower
    } else {
      // Default standing rotation
      yRotation = Math.sin(time * 0.5) * 0.524; // 30 degrees
      xRotation = Math.sin(time * 0.7) * 0.175; // 10 degrees
    }
    
    if (group.current) {
      group.current.rotation.y = yRotation;
      group.current.rotation.x = xRotation;
    }
  });

  if (!scene) {
    return null;
  }

  return (
    <group ref={group}>
      <primitive object={scene} scale={1.2} position={[0, -1, 0]} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-2">⚡</div>
        <div className="text-sm text-slate-600">Loading Victor...</div>
      </div>
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-2">🐂</div>
        <div className="text-sm text-slate-600">Victor E. Bull</div>
      </div>
    </div>
  );
}

export default function CenterVictor({ mode = "standing" }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <ErrorFallback />;
  }

  return (
    <div className="w-full h-full min-h-[400px]" style={{ minHeight: "400px" }}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0.5, 4], fov: 50 }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
          onError={(error) => {
            console.error("Canvas error:", error);
            setHasError(true);
          }}
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
          
          <VictorModel mode={mode} />
          
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
