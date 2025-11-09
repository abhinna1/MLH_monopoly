import React, { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';

// Victor Model from GLB file with animation
function VictorModel({ url = '/models/standing.glb', scale = 0.6 }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  // Play the first animation if available
  useEffect(() => {
    if (actions) {
      const actionNames = Object.keys(actions);
      if (actionNames.length > 0) {
        const idleAction = actions['Idle'] || actions[actionNames[0]];
        if (idleAction) {
          idleAction.reset().play();
        }
      }
    }
  }, [actions]);

  // Gentle rotation
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={group} dispose={null} position={[0, -0.5, 0]}>
      <primitive 
        object={scene} 
        scale={scale}
      />
    </group>
  );
}

// Victor 3D Container Component - Properly centered and lit
export default function Victor3D() {
  return (
    <div style={{ 
      width: '80px',
      height: '80px', 
      position: 'absolute',
      bottom: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <Canvas 
        camera={{ position: [0, 0.3, 1.2], fov: 50 }}
        style={{ 
          width: '100%',
          height: '100%'
        }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 4, 3]} intensity={2} />
        <directionalLight position={[-3, 3, -2]} intensity={1.2} />
        <pointLight position={[0, 2, 2]} intensity={1} />
        <spotLight position={[0, 3, 0]} intensity={0.8} angle={0.5} penumbra={1} />
        
        <Suspense fallback={null}>
          <VictorModel />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload the model
useGLTF.preload('/models/standing.glb');


