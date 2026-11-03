"use client";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Gsap() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.to(".g-box", { rotation: 360, x: 120, duration: 2, repeat: -1, yoyo: true, ease: "power2.inOut", stagger: 0.2 });
      gsap.from(".g-scroll", {
        opacity: 0, y: 60, duration: 1,
        scrollTrigger: { trigger: ".g-scroll", start: "top 90%" },
      });
    },
    { scope: root },
  );
  return (
    <div ref={root}>
      <div className="row">
        {[0, 1, 2].map((i) => (<div key={i} className="g-box box" />))}
      </div>
      <p className="g-scroll">Revealed via ScrollTrigger</p>
    </div>
  );
}
