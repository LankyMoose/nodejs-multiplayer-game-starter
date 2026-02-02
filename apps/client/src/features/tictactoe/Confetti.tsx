import { useEffect, useState } from "kiru";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  wobbleDuration: number;
  wobbleDirection: number;
}

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#fbbf24", "#a855f7"];

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 150; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100, // %
          y: -10 - Math.random() * 20, // start above screen
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 2,
          wobbleDuration: 1 + Math.random() * 1, // 1-2s wobble
          wobbleDirection: Math.random() < 0.5 ? 1 : -1,
        });
      }
      setParticles(newParticles);
      
      const timer = setTimeout(() => setParticles([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `fall 3s linear ${p.delay}s forwards`,
          }}
        >
          <div
            className="w-3 h-3"
            style={{
              backgroundColor: p.color,
              animation: `wobble ${p.wobbleDuration}s ease-in-out infinite alternate`,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(150vh);
          }
        }
        @keyframes wobble {
          from {
            transform: translateX(-15px) rotate(-77deg);
          }
          to {
            transform: translateX(15px) rotate(69deg);
          }
        }
      `}</style>
    </div>
  );
}
