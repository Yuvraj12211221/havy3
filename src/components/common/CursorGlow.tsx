import React, { useEffect, useRef } from 'react';
import { useTimeTheme } from '../../hooks/useTimeTheme';

const CursorGlow: React.FC = () => {
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  const wrapperRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const secondaryGlowRef = useRef<HTMLDivElement>(null);

  // Position references. Default to center of typical viewport
  const mouse = useRef({ x: 500, y: 500 });
  const current = useRef({ x: 500, y: 500 });
  const isHovering = useRef(false);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Only run if dark mode and on large screens
    if (!isDark || window.innerWidth < 768) return;

    // Center cursor glow initially relative to parent if possible
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      mouse.current.x = rect.width / 2;
      mouse.current.y = rect.height / 2;
      current.current.x = rect.width / 2;
      current.current.y = rect.height / 2;
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      // Calculate mouse position relative to the wrapper bounds
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };

    // Increase intensity when hovering interactive elements
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.card')
      ) {
        isHovering.current = true;
      } else {
        isHovering.current = false;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);

    // Animation Loop with Lerp
    const animate = () => {
      current.current.x += (mouse.current.x - current.current.x) * 0.12;
      current.current.y += (mouse.current.y - current.current.y) * 0.12;

      if (glowRef.current && secondaryGlowRef.current) {
        glowRef.current.style.transform = `translate3d(${current.current.x - 200}px, ${current.current.y - 200}px, 0) scale(${isHovering.current ? 1.15 : 1})`;
        secondaryGlowRef.current.style.transform = `translate3d(${current.current.x - 300}px, ${current.current.y - 300}px, 0) scale(${isHovering.current ? 1.05 : 1})`;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isDark]);

  if (!isDark) return null;

  return (
    <div ref={wrapperRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden md:block" aria-hidden="true">
      {/* Secondary Glow Layer */}
      <div 
        ref={secondaryGlowRef}
        className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] will-change-transform transition-colors duration-700 bg-gradient-to-tr from-purple-900/40 via-blue-900/20 to-cyan-900/30 mix-blend-screen opacity-50"
      />

      {/* Primary Glow Layer */}
      <div 
        ref={glowRef}
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full blur-[80px] will-change-transform transition-colors duration-700 bg-gradient-to-br from-cyan-400/40 via-blue-500/30 to-purple-500/40 mix-blend-screen opacity-60"
      />
    </div>
  );
};

export default CursorGlow;
