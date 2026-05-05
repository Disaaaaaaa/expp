import React, { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';

interface AnimatedElementProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const AnimatedElement = ({ 
  children, 
  delay = 0, 
  duration = 0.5,
  className = "" 
}: AnimatedElementProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { 
          opacity: 0, 
          y: 20,
          scale: 0.95
        },
        visible: { 
          opacity: 1, 
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            damping: 20,
            stiffness: 100,
            duration,
            delay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}; 