import { motion } from "framer-motion";

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

const AnimatedLogo = ({ size = 48, className = "" }: AnimatedLogoProps) => {
  const letterVariants = {
    hidden: { opacity: 0, y: 20, rotateX: -90 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.6,
        type: "spring" as const,
        bounce: 0.4,
      },
    }),
  };

  const letters = "בקלות".split("");
  const fontSize = size * 0.6;

  return (
    <motion.div
      className={`flex items-center gap-1 ${className}`}
      initial="hidden"
      animate="visible"
    >
      {/* Animated icon mark */}
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
      >
        <motion.svg
          width={size}
          height={size}
          viewBox="0 0 60 60"
        >
          {/* Outer ring */}
          <motion.circle
            cx="30"
            cy="30"
            r="27"
            fill="none"
            stroke="hsl(152, 45%, 38%)"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
          {/* Inner glow circle */}
          <motion.circle
            cx="30"
            cy="30"
            r="22"
            fill="hsl(152, 45%, 38%)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          />
          {/* Checkmark / hand symbol */}
          <motion.path
            d="M20 30 L27 37 L40 22"
            fill="none"
            stroke="hsl(42, 85%, 55%)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
          />
          {/* Sparkle dots */}
          {[
            { cx: 15, cy: 12, delay: 1.2 },
            { cx: 48, cy: 15, delay: 1.4 },
            { cx: 45, cy: 48, delay: 1.3 },
            { cx: 12, cy: 45, delay: 1.5 },
          ].map((dot, i) => (
            <motion.circle
              key={i}
              cx={dot.cx}
              cy={dot.cy}
              r="2"
              fill="hsl(42, 85%, 55%)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                delay: dot.delay,
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
          ))}
        </motion.svg>
      </motion.div>

      {/* Animated text letters */}
      <div className="flex" style={{ fontSize, direction: "rtl" }}>
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={letterVariants}
            className="font-black text-primary inline-block"
            style={{ perspective: "500px" }}
          >
            {letter}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

export default AnimatedLogo;
