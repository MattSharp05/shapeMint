/**
 * Sticky-stack scroll primitives.
 *
 * Wrap children in <ContainerScroll> and render each card as <CardSticky index={i}>.
 * Cards stick as the user scrolls, cascading behind one another.
 *
 * Props:
 *   index       — 0-based position of the card in the stack.
 *   incrementY  — px each subsequent card offsets downward (default 10).
 *   incrementZ  — stacking z offset (default 10).
 *   baseOffset  — px pushed below top of viewport (account for fixed header). Default 0.
 */

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface CardStickyProps extends HTMLMotionProps<'div'> {
  index: number;
  incrementY?: number;
  incrementZ?: number;
  baseOffset?: number;
}

export const ContainerScroll = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement>
>(({ children, className, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`relative w-full ${className ?? ''}`}
      style={{ perspective: '1000px', ...style }}
      {...props}
    >
      {children}
    </div>
  );
});
ContainerScroll.displayName = 'ContainerScroll';

export const CardSticky = React.forwardRef<HTMLDivElement, CardStickyProps>(
  (
    {
      index,
      incrementY = 10,
      incrementZ = 10,
      baseOffset = 0,
      children,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const y = baseOffset + index * incrementY;
    const z = index * incrementZ;

    return (
      <motion.div
        ref={ref}
        layout="position"
        style={{
          top: y,
          zIndex: z,
          backfaceVisibility: 'hidden',
          ...style,
        }}
        className={`static md:sticky ${className ?? ''}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
CardSticky.displayName = 'CardSticky';
