import { useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAppStore } from '../store'
import * as THREE from 'three'

export default function AnimatedCharacter({ url = '/models/standing.glb', scale = 1.2 }) {
  const group = useRef()
  const { currentAction, setAction, setAvailableActions, movement, position, setPosition, velocity, setVelocity, showSkeleton } = useAppStore()
  const { scene, animations } = useGLTF(url)
  const { actions } = useAnimations(animations, group)

  // Populate available actions from the loaded GLB and pick a sensible default
  useEffect(() => {
    if (!actions) return
    const names = Object.keys(actions).filter(Boolean)
    if (names.length) {
      setAvailableActions(names)
      if (!actions[currentAction]) {
        const fallback = names.includes('Idle') ? 'Idle' : names[0]
        setAction(fallback)
      }
      // Helpful during setup: list animation names in console
      // console.log('Clips:', names)
    }
  }, [actions])

  // Play / fade animations (and set a comfy loop mode)
  useEffect(() => {
    if (!actions) return
    const next = actions[currentAction]
    Object.values(actions).forEach(a => {
      if (a && a !== next) a.fadeOut(0.2)
    })
    if (next) {
      next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.15).play()
    }
  }, [actions, currentAction])

  // Movement + auto action switching
  useFrame((_, dt) => {
    if (!group.current) return
    const dir = new THREE.Vector3()
    const forward = (movement.forward ? 1 : 0) - (movement.backward ? 1 : 0)
    const strafe = (movement.right ? 1 : 0) - (movement.left ? 1 : 0)
    const moving = !!(forward || strafe)

    if (moving) {
      dir.set(strafe, 0, forward).normalize()
      // Rotate character towards movement direction
      const targetRot = Math.atan2(dir.x, dir.z)
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRot, 0.15)
      // Update velocity
      const base = movement.run ? 4 : 2
      setVelocity([dir.x * base, 0, dir.z * base])
      // Auto-switch action
      const want = movement.run ? (actions?.Run ? 'Run' : (actions && Object.keys(actions).find(n=>/run/i.test(n)) || 'Walk')) : (actions?.Walk ? 'Walk' : (actions && Object.keys(actions).find(n=>/walk/i.test(n)) || 'Idle'))
      if (want && want !== currentAction) setAction(want)
    } else {
      setVelocity([0, 0, 0])
      const want = (actions?.Idle ? 'Idle' : (actions && Object.keys(actions).find(n=>/idle/i.test(n)) || currentAction))
      if (want && want !== currentAction) setAction(want)
    }

    // integrate position
    if (velocity.some(v => v !== 0)) {
      const newPos = [
        position[0] + velocity[0] * dt,
        position[1] + velocity[1] * dt,
        position[2] + velocity[2] * dt
      ]
      setPosition(newPos)
      group.current.position.set(...newPos)
    } else {
      group.current.position.set(...position)
    }
  })

  return (
    <group ref={group} dispose={null} scale={scale}>
      <primitive object={scene} />
      {/* Skeleton debug helper */}
      {showSkeleton && <primitive object={useMemo(() => new THREE.SkeletonHelper(group.current || scene), [scene, showSkeleton])} />}
    </group>
  )
}

useGLTF.preload('/models/standing.glb')
useGLTF.preload('/models/walking.glb')
useGLTF.preload('/models/victorEBull.glb')
useGLTF.preload('/models/MovingVictor.glb')
