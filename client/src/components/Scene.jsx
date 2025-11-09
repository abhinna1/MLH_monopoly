import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import AnimatedCharacter from './AnimatedCharacter'
import { useAppStore } from '../store'
import Loader from './Loader'

export default function Scene() {
  const { autoRotate, modelType, glbUrl } = useAppStore()
  const { availableModels } = useAppStore()
  const selected = availableModels.find(m => m.path === glbUrl)
  const modelScale = selected?.scale ?? 1.2
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }} shadows>
      <color attach="background" args={[ '#0f0f0f' ]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5,5,5]} intensity={1.2} castShadow />
      <Suspense fallback={<Loader />}> 
        {modelType === 'glb' ? <AnimatedCharacter url={glbUrl} scale={modelScale} /> : <AnimatedFBX />}
        <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
          <planeGeometry args={[50,50]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <Environment preset="city" />
      </Suspense>
      <OrbitControls enableDamping autoRotate={autoRotate} autoRotateSpeed={0.8} />
    </Canvas>
  )
}
