"use client";
import { motion } from "motion/react";

export default function FramerMotion() {
  return (
    <motion.div
      className="box"
      whileHover={{ scale: 1.3, rotate: 10 }}
      whileTap={{ scale: 0.85 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300 }}
    />
  );
}
