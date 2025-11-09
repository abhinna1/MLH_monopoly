import React, { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useAppStore } from '../store'

/*
Contract:
- props.url: string path to the .glb model (public-relative)
- props.scale?: number | [x,y,z]
- props.position?: [x,y,z]
- props.rotation?: [x,y,z]
*/

export default function Model({ url = '/models/model.glb', scale = 1, position = [0,0,0], rotation = [0,0,0] }) {
  const { wireframe, color } = useAppStore()
  const { scene } = useGLTF(url)

  const materialize = useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material.wireframe = wireframe
        if (child.material.color) child.material.color.set(color)
      }
    })
    return scene
  }, [scene, wireframe, color])

  return (
    <primitive object={materialize} scale={scale} position={position} rotation={rotation} />
  )
}

useGLTF.preload('/models/model.glb')
