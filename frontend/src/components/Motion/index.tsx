/**
 * Reusable Framer Motion primitives for ShapeMint.
 *
 * Usage:
 *   <FadeIn>         — fade + optional translateY on mount or scroll
 *   <FadeInUp>       — shorthand for FadeIn with upward slide
 *   <RevealOnScroll>  — viewport-triggered reveal (once)
 *   <StaggerList>    — stagger children when the container enters viewport
 *   <StaggerItem>    — individual stagger child (use inside StaggerList)
 *   <MotionButton>   — premium tap/hover micro-interaction for buttons
 *
 * All components respect prefers-reduced-motion via the useReducedMotion hook.
 */

import React from 'react';
import {
  motion,
  useReducedMotion,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion';

// ── Shared easing & defaults ────────────────────────────────────────────

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]; // premium ease-out

const DEFAULT_DURATION = 0.6;
const DEFAULT_OFFSET = 24; // px

// ── FadeIn ──────────────────────────────────────────────────────────────

interface FadeInProps extends HTMLMotionProps<'div'> {
  /** Direction offset in px (positive = from below, negative = from above) */
  y?: number;
  x?: number;
  duration?: number;
  delay?: number;
  /** Trigger on viewport entry instead of mount */
  viewport?: boolean;
  children: React.ReactNode;
}

export function FadeIn({
  y = 0,
  x = 0,
  duration = DEFAULT_DURATION,
  delay = 0,
  viewport = false,
  children,
  className,
  ...rest
}: FadeInProps) {
  const reduced = useReducedMotion();

  const props: HTMLMotionProps<'div'> = {
    initial: reduced ? { opacity: 1 } : { opacity: 0, y, x },
    ...(viewport
      ? {
          whileInView: { opacity: 1, y: 0, x: 0 },
          viewport: { once: true, margin: '-60px' },
        }
      : {
          animate: { opacity: 1, y: 0, x: 0 },
        }),
    transition: { duration, delay, ease: EASE_OUT },
    className,
    ...rest,
  };

  return <motion.div {...props}>{children}</motion.div>;
}

// ── FadeInUp (convenience) ──────────────────────────────────────────────

export function FadeInUp(props: Omit<FadeInProps, 'y'> & { y?: number }) {
  return <FadeIn y={props.y ?? DEFAULT_OFFSET} {...props} />;
}

// ── RevealOnScroll ──────────────────────────────────────────────────────

interface RevealOnScrollProps extends HTMLMotionProps<'div'> {
  y?: number;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export function RevealOnScroll({
  y = DEFAULT_OFFSET,
  duration = DEFAULT_DURATION,
  delay = 0,
  children,
  className,
  ...rest
}: RevealOnScrollProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger container + item ────────────────────────────────────────────

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: DEFAULT_OFFSET },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DEFAULT_DURATION, ease: EASE_OUT },
  },
};

const staggerItemReducedVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

interface StaggerListProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export function StaggerList({ children, className, ...rest }: StaggerListProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: StaggerListProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={reduced ? staggerItemReducedVariants : staggerItemVariants}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ── MotionButton ────────────────────────────────────────────────────────

interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
}

export function MotionButton({ children, className, ...rest }: MotionButtonProps) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      whileHover={reduced ? {} : { scale: 1.02, y: -1 }}
      whileTap={reduced ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

// ── MotionLink (for wrapping Link-like elements) ────────────────────────

interface MotionDivButtonProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export function MotionDiv({ children, className, ...rest }: MotionDivButtonProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={reduced ? {} : { scale: 1.02, y: -1 }}
      whileTap={reduced ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
