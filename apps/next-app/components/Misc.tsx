"use client";
import { useEffect, useRef } from "react";
import { Lottie } from "lottie-react";
import AOS from "aos";
import "aos/dist/aos.css";
import Typed from "typed.js";
import autoAnimate from "@formkit/auto-animate";
import { TypeAnimation } from "react-type-animation";
import ScrollReveal from "scrollreveal";
import { animate as popAnimate } from "popmotion";
import Lenis from "lenis";
import { useState } from "react";

// Minimal inline Lottie animation (pulsing circle)
const lottieData = {
  v: "5.7.0", fr: 30, ip: 0, op: 60, w: 100, h: 100, nm: "pulse", ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: "c", sr: 1, ip: 0, op: 60, st: 0,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [50, 50, 0] }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [
        { t: 0, s: [60, 60, 100], i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
        { t: 30, s: [100, 100, 100], i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
        { t: 60, s: [60, 60, 100] },
      ] },
    },
    shapes: [{ ty: "gr", it: [
      { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [60, 60] } },
      { ty: "fl", c: { a: 0, k: [0.55, 0.36, 0.96, 1] }, o: { a: 0, k: 100 } },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
    ] }],
  }],
};

export default function Misc() {
  const typedEl = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState([1, 2, 3]);

  useEffect(() => {
    AOS.init({ duration: 800 });
    const typed = new Typed(typedEl.current!, { strings: ["Typed.js", "animations"], typeSpeed: 60, loop: true });
    if (list.current) autoAnimate(list.current);
    ScrollReveal().reveal(".sr", { distance: "40px", origin: "bottom", duration: 900 });
    const p = pop.current && popAnimate({
      from: 0, to: 120, repeat: Infinity, repeatType: "mirror", duration: 1200,
      onUpdate: (v) => { pop.current!.style.transform = `translateX(${v}px)`; },
    });
    const lenis = new Lenis();
    let raf = requestAnimationFrame(function loop(t) { lenis.raf(t); raf = requestAnimationFrame(loop); });
    return () => { typed.destroy(); p?.stop(); cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  return (
    <div>
      <div style={{ width: 100 }}><Lottie src={lottieData as never} loop autoplay /></div>
      <p>Typed.js: <span ref={typedEl} /></p>
      <p><TypeAnimation sequence={["react-type-animation", 1500, "works too", 1500]} repeat={Infinity} /></p>
      <div data-aos="fade-up" className="box">AOS</div>
      <div className="sr box">ScrollReveal</div>
      <div ref={pop} className="box">Popmotion</div>
      <button onClick={() => setItems([...items, items.length + 1])}>auto-animate: add</button>
      <ul ref={list}>{items.map((i) => (<li key={i} onClick={() => setItems(items.filter((x) => x !== i))}>Item {i}</li>))}</ul>
    </div>
  );
}
