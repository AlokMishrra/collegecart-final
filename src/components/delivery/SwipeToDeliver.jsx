import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { CheckCircle, ChevronRight } from "lucide-react";

export default function SwipeToDeliver({ onDeliver, isLoading }) {
  const [isComplete, setIsComplete] = useState(false);
  const x = useMotionValue(0);
  const containerRef = useRef(null);

  const handleDragEnd = (event, info) => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const threshold = containerWidth * 0.7; // 70% of container width

    if (info.offset.x > threshold && !isComplete) {
      // Swipe successful
      animate(x, containerWidth - 60, { duration: 0.2 });
      setIsComplete(true);
      setTimeout(() => {
        onDeliver();
      }, 300);
    } else {
      // Reset swipe
      animate(x, 0, { duration: 0.3 });
    }
  };

  const background = useTransform(
    x,
    [0, 300],
    ["rgb(220, 252, 231)", "rgb(34, 197, 94)"]
  );

  const textOpacity = useTransform(x, [0, 100], [1, 0]);
  const checkOpacity = useTransform(x, [200, 300], [0, 1]);

  if (isLoading) {
    return (
      <div className="relative w-full h-14 bg-gray-100 rounded-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-14 rounded-full overflow-hidden shadow-lg"
      style={{ touchAction: "none" }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background }}
      />

      <motion.div
        className="absolute inset-0 flex items-center justify-center text-white font-semibold"
        style={{ opacity: checkOpacity }}
      >
        <CheckCircle className="w-6 h-6" />
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center text-green-700 font-semibold pointer-events-none"
        style={{ opacity: textOpacity }}
      >
        <ChevronRight className="w-5 h-5 mr-2" />
        Swipe to Mark as Delivered
        <ChevronRight className="w-5 h-5 ml-2" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: containerRef.current ? containerRef.current.offsetWidth - 60 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="absolute left-1 top-1 w-12 h-12 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center"
      >
        {isComplete ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <ChevronRight className="w-6 h-6 text-green-600" />
        )}
      </motion.div>
    </div>
  );
}