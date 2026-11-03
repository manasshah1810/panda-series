"use client";
import { useEffect, useRef } from "react";
import Matter from "matter-js";

export default function MatterDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;
    const engine = Engine.create();
    const render = Render.create({ element: el, engine, options: { width: 500, height: 280, wireframes: false, background: "#0b0b14" } });
    const bodies = Array.from({ length: 20 }, (_, i) =>
      i % 2 ? Bodies.circle(60 + i * 20, 20, 16, { render: { fillStyle: "#f472b6" } })
            : Bodies.rectangle(60 + i * 20, 20, 30, 30, { render: { fillStyle: "#38bdf8" } }));
    Composite.add(engine.world, [
      ...bodies, Bodies.rectangle(250, 290, 520, 30, { isStatic: true }),
      MouseConstraint.create(engine, { mouse: Mouse.create(render.canvas) }),
    ]);
    const runner = Runner.create();
    Runner.run(runner, engine); Render.run(render);
    return () => { Render.stop(render); Runner.stop(runner); Composite.clear(engine.world, false); render.canvas.remove(); };
  }, []);
  return <div ref={ref} />;
}
