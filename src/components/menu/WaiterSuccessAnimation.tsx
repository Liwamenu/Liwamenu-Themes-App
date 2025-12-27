import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

interface WaiterSuccessAnimationProps {
  onComplete: () => void;
}

// 3D Waiter Character Component
function WaiterCharacter() {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const trayRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      // Slight rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
    
    // Wave animation for right arm (holding tray)
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -Math.PI / 4 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
    
    // Tray bobbing
    if (trayRef.current) {
      trayRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Head */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
      
      {/* Hair */}
      <mesh position={[0, 2.0, 0]}>
        <sphereGeometry args={[0.3, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2c1810" />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.12, 1.85, 0.28]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.12, 1.85, 0.28]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Smile */}
      <mesh position={[0, 1.7, 0.3]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#c44" />
      </mesh>
      
      {/* Body - White Shirt */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Vest */}
      <mesh position={[0, 1.1, 0.05]}>
        <cylinderGeometry args={[0.36, 0.41, 0.75, 32, 1, false, -Math.PI / 3, Math.PI * 2 / 3]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Bow Tie */}
      <mesh position={[0, 1.45, 0.32]}>
        <boxGeometry args={[0.2, 0.08, 0.05]} />
        <meshStandardMaterial color="#c00" />
      </mesh>
      
      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.5, 1.1, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Right Arm (holding tray) */}
      <mesh ref={rightArmRef} position={[0.5, 1.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Tray Group */}
      <group ref={trayRef} position={[0.8, 1.2, 0]}>
        {/* Tray */}
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.03, 32]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Glass on tray */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.08, 0.06, 0.2, 16]} />
          <meshStandardMaterial color="#88ccff" transparent opacity={0.6} />
        </mesh>
      </group>
      
      {/* Pants */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.35, 0.3, 0.5, 32]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Left Leg */}
      <mesh position={[-0.15, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[0.15, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Shoes */}
      <mesh position={[-0.15, -0.2, 0.05]}>
        <boxGeometry args={[0.12, 0.08, 0.2]} />
        <meshStandardMaterial color="#2c1810" />
      </mesh>
      <mesh position={[0.15, -0.2, 0.05]}>
        <boxGeometry args={[0.12, 0.08, 0.2]} />
        <meshStandardMaterial color="#2c1810" />
      </mesh>
    </group>
  );
}

export function WaiterSuccessAnimation({ onComplete }: WaiterSuccessAnimationProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div 
        className="absolute inset-0 bg-black/70"
        style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
      />
      
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* 3D Canvas */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-64 h-64"
        >
          <Canvas camera={{ position: [0, 1, 4], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <directionalLight position={[-5, 3, -5]} intensity={0.4} />
            <WaiterCharacter />
          </Canvas>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-2">
            {t('waiter.success')}
          </h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white/80 text-sm"
          >
            {t('waiter.coming')}
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
