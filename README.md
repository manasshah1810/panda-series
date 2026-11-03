# panda-series

Monorepo (npm workspaces) with two animation playgrounds sharing the same demos:

- `apps/vite-app` – React + Vite + TypeScript
- `apps/next-app` – Next.js (App Router) + TypeScript

## Run
```bash
npm install
npm run dev:vite   # http://localhost:5173
npm run dev:next   # http://localhost:3000
```

## Libraries included
GSAP (+ ScrollTrigger, @gsap/react), Three.js (+ @react-three/fiber, drei), Motion (Framer Motion),
Anime.js, React Spring, tsParticles, Matter.js, Lottie, AOS, Typed.js, react-type-animation,
auto-animate, ScrollReveal, Popmotion, Lenis.
