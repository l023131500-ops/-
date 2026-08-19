import { motion } from "framer-motion";

const shapes = [
  { size: 6, color: "hsl(var(--secondary))", x: "5%", y: "20%", duration: 18 },
  { size: 8, color: "hsl(var(--primary))", x: "90%", y: "15%", duration: 22 },
  { size: 5, color: "hsl(var(--secondary) / 0.5)", x: "15%", y: "70%", duration: 16 },
  { size: 10, color: "hsl(var(--primary) / 0.3)", x: "80%", y: "60%", duration: 20 },
  { size: 4, color: "hsl(var(--secondary) / 0.4)", x: "50%", y: "10%", duration: 14 },
  { size: 7, color: "hsl(var(--primary) / 0.2)", x: "30%", y: "85%", duration: 24 },
  { size: 5, color: "hsl(var(--secondary) / 0.3)", x: "70%", y: "40%", duration: 19 },
  { size: 9, color: "hsl(var(--primary) / 0.15)", x: "95%", y: "80%", duration: 21 },
];

const FloatingElements = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {shapes.map((s, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: s.size,
          height: s.size,
          left: s.x,
          top: s.y,
          background: s.color,
        }}
        animate={{
          y: [0, -60, 20, -30, 0],
          x: [0, i % 2 === 0 ? 30 : -30, 0],
          scale: [1, 1.5, 0.8, 1.2, 1],
          opacity: [0.15, 0.4, 0.2, 0.35, 0.15],
        }}
        transition={{
          duration: s.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

export default FloatingElements;
