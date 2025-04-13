import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  useTexture,
  Environment,
  Float,
} from "@react-three/drei";
import * as THREE from "three";
import "./HomeHeader.scss";

// Camera controller to position the view optimally
const CameraController = () => {
  const { camera } = useThree();

  useEffect(() => {
    // Position camera for a better view of the 3D elements
    camera.position.set(0, 0, 35);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Gentle camera movement
    camera.position.y = Math.sin(t * 0.2) * 2;
    camera.position.x = Math.sin(t * 0.1) * 3;
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Floating particles effect - similar to the Welcome example but customized
const GoldenParticles = ({ count = 500 }) => {
  const mesh = useRef();
  const dummy = new THREE.Object3D();

  useFrame(({ clock }) => {
    if (!mesh.current) return;

    const time = clock.getElapsedTime();

    // Update each particle
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = (i % 20) * 4 - 40;
      const y = Math.floor(i / 20) * 4 - 30;
      const z = Math.sin((i + time) * 0.1) * 3;

      // Random movements
      const angle = time * 0.1 + i * 0.001;
      const scale = 0.4 + Math.sin(time * 0.3 + i) * 0.2;

      dummy.position.set(
        x + Math.sin(angle) * 2,
        y + Math.cos(angle) * 2,
        z - 5 // Bring forward
      );
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(
        Math.sin(time * 0.1 + i),
        Math.cos(time * 0.1 + i * 2),
        0
      );
      dummy.updateMatrix();

      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
    // Very slow rotation of entire particle system
    mesh.current.rotation.y = time * 0.03;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[0.4, 10, 10]} />
      <meshStandardMaterial
        color="#FFD700"
        metalness={0.9}
        roughness={0.1}
        emissive="#FFD700"
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
};

// Floating ring with animation
const FloatingRing = ({ position, rotation, scale = 1, color = "#FFD700" }) => {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(t * 0.2) * 0.2 + rotation[0];
      ringRef.current.rotation.y = t * 0.1 + rotation[1];
      ringRef.current.rotation.z = Math.cos(t * 0.3) * 0.1 + rotation[2];

      // Gentle floating motion
      ringRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.5;
      ringRef.current.position.z = position[2] + Math.sin(t * 0.2) * 1;
    }
  });

  return (
    <mesh ref={ringRef} position={position} scale={scale}>
      <torusGeometry args={[5, 0.3, 20, 100]} />
      <meshStandardMaterial
        color={color}
        metalness={0.9}
        roughness={0.1}
        emissive={color}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
};

// Floating spheres for additional visual interest
const GoldenSphere = ({ position, size, speed }) => {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t) * 2;
      ref.current.position.x = position[0] + Math.sin(t * 0.5) * 2;
      ref.current.rotation.y = t * 0.2;
      ref.current.rotation.x = t * 0.1;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 24, 24]} />
      <meshStandardMaterial
        color="#FFD700"
        metalness={0.9}
        roughness={0.1}
        emissive="#FFD700"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
};

// More visible stars with better distribution
const EnhancedStars = () => {
  return (
    <Stars
      radius={80}
      depth={50}
      count={3000}
      factor={5}
      saturation={0.5}
      fade
      speed={0.3}
    />
  );
};

// Main scene component
const Scene = () => {
  return (
    <>
      {/* Camera control for better viewing angle */}
      <CameraController />

      {/* Improved lighting for better visibility */}
      <ambientLight intensity={0.3} />
      <pointLight
        position={[0, 0, 0]}
        intensity={2}
        color="#FFD700"
        distance={100}
      />
      <pointLight position={[20, 30, -10]} intensity={1} color="#FFF" />
      <spotLight
        position={[0, 30, 10]}
        intensity={0.8}
        angle={0.3}
        penumbra={1}
      />

      {/* Enhanced stars */}
      <EnhancedStars />

      {/* Decorative elements */}
      <GoldenParticles count={600} />

      {/* Larger rings positioned closer to viewer */}
      <FloatingRing
        position={[0, 0, -10]}
        rotation={[0, 0, 0]}
        scale={3.5}
        color="#FFD700"
      />
      <FloatingRing
        position={[15, -5, -15]}
        rotation={[0.5, 0.5, 0]}
        scale={2.5}
        color="#FFD700"
      />
      <FloatingRing
        position={[-15, 5, -12]}
        rotation={[0.2, -0.3, 0.1]}
        scale={2}
        color="#FFD700"
      />

      {/* Add floating golden spheres */}
      <Float speed={1} rotationIntensity={0.5} floatIntensity={2}>
        <GoldenSphere position={[20, 5, -25]} size={2} speed={0.5} />
      </Float>
      <Float speed={0.8} rotationIntensity={0.3} floatIntensity={1}>
        <GoldenSphere position={[-15, -8, -20]} size={1.5} speed={0.7} />
      </Float>
      <Float speed={1.2} rotationIntensity={0.7} floatIntensity={1.5}>
        <GoldenSphere position={[10, 15, -15]} size={1} speed={0.9} />
      </Float>

      {/* Environment for better reflections */}
      <Environment preset="city" />

      {/* Camera controls - enhanced for full navigation */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={5}
        maxDistance={200}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        enableDamping={true}
        dampingFactor={0.1}
      />
    </>
  );
};

// Main HomeHeader component - serves as a 3D backdrop for the header content
const HomeHeader = () => {
  return (
    <div className="home-header-container">
      <Canvas
        className="home-header-canvas"
        camera={{ position: [0, 0, 30], fov: 60 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HomeHeader;
