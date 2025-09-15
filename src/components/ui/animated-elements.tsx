// src/components/ui/animated-elements.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({ 
  children, 
  className, 
  delay = 0 
}) => {
  return (
    <div 
      className={cn(
        "animate-float",
        className
      )}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out'
      }}
    >
      {children}
    </div>
  );
};

interface PulseElementProps {
  children: React.ReactNode;
  className?: string;
}

export const PulseElement: React.FC<PulseElementProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div 
      className={cn(
        "animate-pulse-slow",
        className
      )}
    >
      {children}
    </div>
  );
};

interface GlowElementProps {
  children: React.ReactNode;
  className?: string;
  color?: 'orange' | 'red' | 'yellow';
}

export const GlowElement: React.FC<GlowElementProps> = ({ 
  children, 
  className,
  color = 'orange'
}) => {
  const glowColors = {
    orange: 'shadow-orange-500/50',
    red: 'shadow-red-500/50',
    yellow: 'shadow-yellow-500/50'
  };

  return (
    <div 
      className={cn(
        "animate-glow",
        glowColors[color],
        className
      )}
    >
      {children}
    </div>
  );
};
