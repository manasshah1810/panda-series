"use client";
import dynamic from "next/dynamic";
import "./playground.css";

const d = (loader: () => Promise<{ default: React.ComponentType }>) => dynamic(loader, { ssr: false });
const Gsap = d(() => import("@/components/Gsap"));
const ThreeScene = d(() => import("@/components/ThreeScene"));
const FramerMotion = d(() => import("@/components/FramerMotion"));
const Anime = d(() => import("@/components/Anime"));
const Spring = d(() => import("@/components/Spring"));
const ParticlesDemo = d(() => import("@/components/Particles"));
const MatterDemo = d(() => import("@/components/Matter"));
const Misc = d(() => import("@/components/Misc"));

const sections: [string, React.ReactNode][] = [
  ["GSAP + ScrollTrigger", <Gsap />],
  ["Three.js (react-three-fiber + drei)", <ThreeScene />],
  ["Motion (Framer Motion)", <FramerMotion />],
  ["Anime.js", <Anime />],
  ["React Spring", <Spring />],
  ["tsParticles", <ParticlesDemo />],
  ["Matter.js", <MatterDemo />],
  ["Lottie, AOS, Typed.js, auto-animate, ScrollReveal, Popmotion, Lenis", <Misc />],
];

export default function Playground() {
  return (
    <main>
      <h1>Animation Playground — Next.js</h1>
      {sections.map(([title, node]) => (<section key={title}><h2>{title}</h2>{node}</section>))}
    </main>
  );
}
