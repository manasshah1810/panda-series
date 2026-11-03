import Gsap from "./demos/Gsap";
import ThreeScene from "./demos/ThreeScene";
import FramerMotion from "./demos/FramerMotion";
import Anime from "./demos/Anime";
import Spring from "./demos/Spring";
import ParticlesDemo from "./demos/Particles";
import MatterDemo from "./demos/Matter";
import Misc from "./demos/Misc";
import "./App.css";

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

export default function App() {
  return (
    <main>
      <h1>Animation Playground — React + Vite</h1>
      {sections.map(([title, node]) => (
        <section key={title}><h2>{title}</h2>{node}</section>
      ))}
    </main>
  );
}
