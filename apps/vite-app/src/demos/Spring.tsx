import { useState } from "react";
import { useSpring, animated } from "@react-spring/web";

export default function Spring() {
  const [on, setOn] = useState(false);
  const style = useSpring({ x: on ? 200 : 0, scale: on ? 1.4 : 1, config: { tension: 200, friction: 12 } });
  return <animated.div className="box" style={style} onClick={() => setOn(!on)} />;
}
