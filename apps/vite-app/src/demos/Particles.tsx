import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ParticlesDemo() {
  return (
    <ParticlesProvider init={loadSlim}>
    <Particles
      id="tsparticles"
      style={{ height: 240, position: "relative" }}
      options={{
        background: { color: "#0b0b14" },
        particles: {
          number: { value: 60 }, color: { value: "#a78bfa" },
          links: { enable: true, color: "#a78bfa" },
          move: { enable: true, speed: 1.5 }, size: { value: 2 },
        },
        interactivity: { events: { onHover: { enable: true, mode: "repulse" } } },
      }}
    />
    </ParticlesProvider>
  );
}
