import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface FlyingEmojiProps {
  isVisible: boolean;
  startPosition: { x: number; y: number };
  onComplete: () => void;
}

export function FlyingEmoji({ isVisible, startPosition, onComplete }: FlyingEmojiProps) {
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isVisible) {
      // Find cart button position (top right corner area)
      const cartButton = document.querySelector('[data-cart-button]');
      if (cartButton) {
        const rect = cartButton.getBoundingClientRect();
        setTargetPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      } else {
        // Fallback to top right
        setTargetPosition({
          x: window.innerWidth - 60,
          y: 150,
        });
      }
    }
  }, [isVisible]);

  const foodEmojis = ['🍔', '🍕', '🍗', '🍜', '🥗', '🍱', '🌮', '🍣'];
  const randomEmoji = foodEmojis[Math.floor(Math.random() * foodEmojis.length)];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            position: 'fixed',
            left: startPosition.x,
            top: startPosition.y,
            scale: 1,
            opacity: 1,
            zIndex: 9999,
          }}
          animate={{
            left: targetPosition.x - 20,
            top: [startPosition.y, startPosition.y - 150, targetPosition.y],
            scale: [1, 1.4, 0.6],
            opacity: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.3,
            transition: { duration: 0.15 }
          }}
          transition={{
            duration: 1.4,
            ease: "easeInOut",
            times: [0, 0.35, 1],
          }}
          onAnimationComplete={onComplete}
          className="pointer-events-none text-4xl"
          style={{ position: 'fixed' }}
        >
          {randomEmoji}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
