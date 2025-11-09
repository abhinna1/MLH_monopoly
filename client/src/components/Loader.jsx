import React from 'react'
import { Html } from '@react-three/drei'

export default function Loader() {
  return (
    <Html center>
      <div className="flex items-center gap-2 text-white">
        <span className="inline-block h-3 w-3 animate-pulse bg-emerald-400 rounded-full" />
        <span>Loading model…</span>
      </div>
    </Html>
  )
}
