import { memo, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { makeLabelTexture, makePlanetTexture, makeRingTexture } from './textures'

// Artistic scale: radii are compressed so every planet is visible; orbit spacing is compressed too.
export const VISUAL = {
  sun: { r: 2.6, orbit: 0, speed: 0, spin: 0.05 },
  mercury: { r: 0.36, orbit: 5.2, speed: 0.9, spin: 0.4 },
  venus: { r: 0.58, orbit: 7.2, speed: 0.65, spin: -0.2 },
  earth: { r: 0.62, orbit: 9.4, speed: 0.5, spin: 0.8 },
  mars: { r: 0.46, orbit: 11.6, speed: 0.4, spin: 0.7 },
  jupiter: { r: 1.5, orbit: 15.4, speed: 0.22, spin: 1.1 },
  saturn: { r: 1.25, orbit: 19.6, speed: 0.17, spin: 1.0, ring: true },
  uranus: { r: 0.9, orbit: 23.2, speed: 0.12, spin: -0.7 },
  neptune: { r: 0.85, orbit: 26.6, speed: 0.09, spin: 0.7 },
}

const positions = {} // live world positions, read by the camera rig

function Planet({ data, index, selected, onSelect, paused, lowPower }) {
  const v = VISUAL[data.slug]
  const group = useRef()
  const mesh = useRef()
  const angle0 = useMemo(() => index * 1.7, [index])
  const tex = useMemo(() => makePlanetTexture(data.slug, data.color), [data.slug, data.color])
  const ringTex = useMemo(() => (v.ring ? makeRingTexture() : null), [v.ring])
  const labelTex = useMemo(() => makeLabelTexture(data.name.replace('The ', '')), [data.name])
  const seg = lowPower ? 20 : 36

  useFrame(({ clock }, dt) => {
    if (!paused && v.orbit) {
      const a = angle0 + clock.elapsedTime * v.speed * 0.25
      group.current.position.set(Math.cos(a) * v.orbit, 0, Math.sin(a) * v.orbit)
    }
    if (!paused && mesh.current) mesh.current.rotation.y += dt * v.spin
    positions[data.slug] = group.current.position
  })

  const isSun = data.slug === 'sun'
  return (
    <>
      {v.orbit > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[v.orbit - 0.025, v.orbit + 0.025, 128]} />
          <meshBasicMaterial color={selected ? '#FFCB69' : '#8EA2D8'} transparent opacity={selected ? 0.8 : 0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      <group ref={group} position={[v.orbit, 0, 0]}>
        <mesh ref={mesh} onClick={(e) => { e.stopPropagation(); onSelect(data.slug) }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'auto' }}>
          <sphereGeometry args={[v.r, seg, seg]} />
          {isSun
            ? <meshBasicMaterial map={tex} />
            : <meshStandardMaterial map={tex} roughness={0.85} metalness={0} emissive={selected ? '#332200' : '#000'} />}
        </mesh>
        {isSun && <pointLight intensity={420} distance={160} decay={1.6} color="#FFF1CC" />}
        {isSun && (
          <mesh><sphereGeometry args={[v.r * 1.18, 24, 24]} /><meshBasicMaterial color="#FFB938" transparent opacity={0.22} /></mesh>
        )}
        {v.ring && (
          <mesh rotation={[-Math.PI / 2.4, 0.2, 0]}>
            <ringGeometry args={[v.r * 1.35, v.r * 2.3, 64]} />
            <meshBasicMaterial map={ringTex} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[v.r * 1.5, v.r * 1.62, 48]} />
            <meshBasicMaterial color="#FFCB69" side={THREE.DoubleSide} />
          </mesh>
        )}
        <sprite position={[0, v.r + 0.9, 0]} scale={[4.4, 1.1, 1]} renderOrder={10}>
          <spriteMaterial map={labelTex} transparent depthTest={false} opacity={selected ? 1 : 0.85} />
        </sprite>
      </group>
    </>
  )
}

function CameraRig({ selected, controls }) {
  const tmp = useRef(new THREE.Vector3())
  useFrame(() => {
    const c = controls.current
    if (!c) return
    const target = selected && positions[selected] ? positions[selected] : null
    if (target) {
      tmp.current.copy(target)
      c.target.lerp(tmp.current, 0.06)
    } else {
      c.target.lerp(new THREE.Vector3(0, 0, 0), 0.04)
    }
    c.update()
  })
  return null
}

function Scene({ planets, selected, onSelect, paused, lowPower }) {
  const controls = useRef()
  const { camera, size } = useThree()
  // Fit the whole system (out to Neptune) on screen for any canvas shape, including phones.
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const d = 28.5 / Math.tan((camera.fov * Math.PI) / 360) / Math.min(1, aspect * 1.05)
    camera.position.set(0, d * 0.5, d * 0.85)
    camera.lookAt(0, 0, 0)
    controls.current?.update()
  }, [camera, size.width, size.height])
  return (
    <>
      <ambientLight intensity={0.55} />
      <Stars radius={140} depth={50} count={lowPower ? 1200 : 3000} factor={5} saturation={0.6} fade speed={0.6} />
      {planets.map((p, i) => (
        <Planet key={p.slug} data={p} index={i} selected={selected === p.slug} onSelect={onSelect} paused={paused} lowPower={lowPower} />
      ))}
      <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08}
        minDistance={4} maxDistance={110} zoomSpeed={0.9} rotateSpeed={0.7} touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }} />
      <CameraRig selected={selected} controls={controls} />
    </>
  )
}

function SolarScene({ planets, selected, onSelect, paused = false, lowPower = false, onReady, onLost }) {
  return (
    <Canvas camera={{ position: [0, 24, 38], fov: 50, near: 0.1, far: 600 }} dpr={lowPower ? 1 : [1, 1.6]}
      gl={{ antialias: !lowPower, powerPreference: 'high-performance' }} frameloop="always"
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.() })
        onReady?.()
      }} onPointerMissed={() => onSelect(null)}>
      <Scene planets={planets} selected={selected} onSelect={onSelect} paused={paused} lowPower={lowPower} />
    </Canvas>
  )
}
export default memo(SolarScene)
