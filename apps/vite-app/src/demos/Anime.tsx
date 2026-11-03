import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

export default function Anime() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const a = animate(ref.current.querySelectorAll(".dot"), {
      translateY: [-20, 20], delay: stagger(100), loop: true, alternate: true, duration: 600,
    });
    return () => { a.revert(); };
  }, []);
  return (
    <div ref={ref} className="row">
      {Array.from({ length: 8 }, (_, i) => (<div key={i} className="dot" />))}
    </div>
  );
}
