import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

/**
 * A quiet section reveal: 18px rise and fade, played once when the block
 * enters the viewport. With `prefers-reduced-motion` the content is rendered
 * immediately and never moves.
 */
export default function Reveal({ children, delay = 0, y = 18, className = '', as = 'div' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={className}
    >
      {children}
    </Tag>
  );
}
