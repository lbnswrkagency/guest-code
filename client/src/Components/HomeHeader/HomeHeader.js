import React, { Suspense, useRef, useEffect, useState } from "react";
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

// Helper to determine screen size category
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState("mobile");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 2560) {
        setScreenSize("desktop-extra-large");
      } else if (width >= 1920) {
        setScreenSize("desktop-large");
      } else if (width >= 1500) {
        setScreenSize("desktop");
      } else if (width >= 1200) {
        setScreenSize("laptop");
      } else if (width >= 768) {
        setScreenSize("tablet");
      } else {
        setScreenSize("mobile");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return screenSize;
};

// Camera controller to position the view optimally
const CameraController = ({ scrollProgress, isInteracting, screenSize }) => {
  const { camera } = useThree();
  const initialPos = useRef({
    x: 0,
    y: 0,
    z:
      screenSize === "desktop-extra-large"
        ? 40
        : screenSize === "desktop-large"
        ? 38
        : screenSize === "desktop"
        ? 35
        : screenSize === "laptop"
        ? 32
        : 30,
  });

  useEffect(() => {
    // Position camera for a better view of the 3D elements
    camera.position.set(
      initialPos.current.x,
      initialPos.current.y,
      initialPos.current.z
    );
    camera.lookAt(0, 0, 0);
  }, [camera, screenSize]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Only apply gentle camera movement if not actively interacting
    if (!isInteracting) {
      // Gentle camera movement
      camera.position.y = Math.sin(t * 0.2) * 2 + initialPos.current.y;
      camera.position.x = Math.sin(t * 0.1) * 3 + initialPos.current.x;

      // Move the camera forward based on scroll position
      const targetZ =
        initialPos.current.z -
        scrollProgress *
          (screenSize === "desktop-extra-large"
            ? 70
            : screenSize === "desktop-large"
            ? 60
            : screenSize === "desktop"
            ? 50
            : screenSize === "laptop"
            ? 45
            : 40);

      camera.position.z = THREE.MathUtils.lerp(
        camera.position.z,
        targetZ,
        0.05
      );

      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

// Floating particles effect - similar to the Welcome example but customized
const GoldenParticles = ({ count = 500, screenSize }) => {
  const particleCount =
    screenSize === "desktop-extra-large"
      ? 900
      : screenSize === "desktop-large"
      ? 750
      : screenSize === "desktop"
      ? 600
      : screenSize === "laptop"
      ? 550
      : 500;

  const mesh = useRef();
  const dummy = new THREE.Object3D();

  useFrame(({ clock }) => {
    if (!mesh.current) return;

    const time = clock.getElapsedTime();

    // Update each particle
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const x = (i % 20) * 4 - 40;
      const y = Math.floor(i / 20) * 4 - 30;
      const z = Math.sin((i + time) * 0.1) * 3;

      // Random movements
      const angle = time * 0.1 + i * 0.001;
      const scale = 0.4 + Math.sin(time * 0.3 + i) * 0.2;

      // Scale particles for larger screens
      const sizeMultiplier =
        screenSize === "desktop-extra-large"
          ? 1.5
          : screenSize === "desktop-large"
          ? 1.3
          : screenSize === "desktop"
          ? 1.2
          : screenSize === "laptop"
          ? 1.1
          : 1;

      dummy.position.set(
        x + Math.sin(angle) * 2,
        y + Math.cos(angle) * 2,
        z - 5 // Bring forward
      );
      dummy.scale.set(
        scale * sizeMultiplier,
        scale * sizeMultiplier,
        scale * sizeMultiplier
      );
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
    <instancedMesh ref={mesh} args={[null, null, particleCount]}>
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
const FloatingRing = ({
  position,
  rotation,
  scale = 1,
  color = "#FFD700",
  screenSize,
}) => {
  const sizeMultiplier =
    screenSize === "desktop-extra-large"
      ? 1.5
      : screenSize === "desktop-large"
      ? 1.3
      : screenSize === "desktop"
      ? 1.2
      : screenSize === "laptop"
      ? 1.1
      : 1;

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
    <mesh ref={ringRef} position={position} scale={scale * sizeMultiplier}>
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
const GoldenSphere = ({ position, size, speed, screenSize }) => {
  const sizeMultiplier =
    screenSize === "desktop-extra-large"
      ? 1.5
      : screenSize === "desktop-large"
      ? 1.3
      : screenSize === "desktop"
      ? 1.2
      : screenSize === "laptop"
      ? 1.1
      : 1;

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
      <sphereGeometry args={[size * sizeMultiplier, 24, 24]} />
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
const EnhancedStars = ({ screenSize }) => {
  const starCount =
    screenSize === "desktop-extra-large"
      ? 5000
      : screenSize === "desktop-large"
      ? 4000
      : screenSize === "desktop"
      ? 3500
      : screenSize === "laptop"
      ? 3000
      : 2500;

  return (
    <Stars
      radius={80}
      depth={50}
      count={starCount}
      factor={5}
      saturation={0.5}
      fade
      speed={0.3}
    />
  );
};

// Main scene component
const Scene = ({ scrollProgress, isInteracting, screenSize }) => {
  const controlsRef = useRef();

  // Use effect to configure controls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  }, []);

  return (
    <>
      {/* Camera control for better viewing angle */}
      <CameraController
        scrollProgress={scrollProgress}
        isInteracting={isInteracting}
        screenSize={screenSize}
      />

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
      <EnhancedStars screenSize={screenSize} />

      {/* Decorative elements */}
      <GoldenParticles screenSize={screenSize} />

      {/* Larger rings positioned closer to viewer */}
      <FloatingRing
        position={[0, 0, -10]}
        rotation={[0, 0, 0]}
        scale={3.5}
        color="#FFD700"
        screenSize={screenSize}
      />
      <FloatingRing
        position={[15, -5, -15]}
        rotation={[0.5, 0.5, 0]}
        scale={2.5}
        color="#FFD700"
        screenSize={screenSize}
      />
      <FloatingRing
        position={[-15, 5, -12]}
        rotation={[0.2, -0.3, 0.1]}
        scale={2}
        color="#FFD700"
        screenSize={screenSize}
      />

      {/* Add floating golden spheres */}
      <Float speed={1} rotationIntensity={0.5} floatIntensity={2}>
        <GoldenSphere
          position={[20, 5, -25]}
          size={2}
          speed={0.5}
          screenSize={screenSize}
        />
      </Float>
      <Float speed={0.8} rotationIntensity={0.3} floatIntensity={1}>
        <GoldenSphere
          position={[-15, -8, -20]}
          size={1.5}
          speed={0.7}
          screenSize={screenSize}
        />
      </Float>
      <Float speed={1.2} rotationIntensity={0.7} floatIntensity={1.5}>
        <GoldenSphere
          position={[10, 15, -15]}
          size={1}
          speed={0.9}
          screenSize={screenSize}
        />
      </Float>

      {/* Environment for better reflections */}
      <Environment preset="city" />

      {/* Camera controls - enhanced for better navigation */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={200}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
        rotateSpeed={0.6}
        zoomSpeed={1.0}
        panSpeed={0.8}
        enableDamping={true}
        dampingFactor={0.15}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />
    </>
  );
};

// Main HomeHeader component - serves as a 3D backdrop for the header content
const HomeHeader = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef(null);
  const screenSize = useScreenSize();

  // Handle scroll events to update progress
  useEffect(() => {
    const handleScroll = () => {
      // Calculate how far down the page we've scrolled
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Calculate scroll progress from 0 to 1
      const totalScrollable = docHeight - windowHeight;
      const progress = Math.min(scrollTop / totalScrollable, 1);

      setScrollProgress(progress);
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Clean up
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent default scroll behavior when mouse is over the Canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (isInteracting) {
        e.preventDefault();
      }
    };

    const handleMouseDown = () => setIsInteracting(true);
    const handleMouseUp = () => setIsInteracting(false);
    const handleMouseLeave = () => setIsInteracting(false);

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isInteracting]);

  // Adjust camera FOV based on screen size
  const getFOV = () => {
    switch (screenSize) {
      case "desktop-extra-large":
        return 50;
      case "desktop-large":
        return 55;
      case "desktop":
        return 60;
      default:
        return 60;
    }
  };

  return (
    <div
      className={`home-header-container screen-${screenSize}`}
      ref={containerRef}
    >
      <Canvas
        className="home-header-canvas"
        camera={{ position: [0, 0, 30], fov: getFOV() }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{
          powerPreference: "high-performance",
          antialias: true,
          stencil: false,
          depth: true,
        }}
      >
        <Suspense
          fallback={
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#FFD700" />
            </mesh>
          }
        >
          <Scene
            scrollProgress={scrollProgress}
            isInteracting={isInteracting}
            screenSize={screenSize}
          />
        </Suspense>
      </Canvas>
      {isInteracting && (
        <div className="interaction-notice">Moving in 3D space</div>
      )}
    </div>
  );
};

export default HomeHeader;
