import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorIconRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorIcon = cursorIconRef.current;

    if (!cursor || !cursorIcon) return;

    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Only show custom cursor on interactive elements
      const target = e.target;
      if (!(target instanceof Element)) return;

      if (
        target.closest('[data-theme="degenify"]') ||
        target.closest('[data-theme="higherify"]') ||
        target.closest('[data-theme="scrollify"]') ||
        target.closest('[data-theme="wowowify"]')
      ) {
        setIsVisible(true);
        cursor.style.opacity = "1";
      } else {
        setIsVisible(false);
        cursor.style.opacity = "0";
      }

      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    };

    const onMouseEnter = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      // Check for button classes to determine theme
      if (target.closest('[data-theme="degenify"]')) {
        cursorIcon.textContent = "🎩";
        cursorIcon.style.color = "#7C3AED"; // violet-600
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1.2)`;
        setIsVisible(true);
        cursor.style.opacity = "1";
      } else if (target.closest('[data-theme="higherify"]')) {
        cursorIcon.textContent = "↑";
        cursorIcon.style.color = "#059669"; // emerald-600
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1.2)`;
        setIsVisible(true);
        cursor.style.opacity = "1";
      } else if (target.closest('[data-theme="scrollify"]')) {
        cursorIcon.textContent = "📜";
        cursorIcon.style.color = "#D97706"; // amber-600
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1.2)`;
        setIsVisible(true);
        cursor.style.opacity = "1";
      } else if (target.closest('[data-theme="wowowify"]')) {
        cursorIcon.textContent = "🤯";
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1.2)`;
        setIsVisible(true);
        cursor.style.opacity = "1";
      } else {
        setIsVisible(false);
        cursor.style.opacity = "0";
      }
    };

    const onMouseLeave = () => {
      cursorIcon.textContent = "•";
      cursorIcon.style.color = "currentColor";
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1)`;
      setIsVisible(false);
      cursor.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseEnter, true);
    document.addEventListener("mouseleave", onMouseLeave, true);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseEnter, true);
      document.removeEventListener("mouseleave", onMouseLeave, true);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`cursor fixed top-0 left-0 pointer-events-none z-50 opacity-0 mix-blend-difference transition-transform duration-150 ${
        !isVisible ? "!cursor-auto" : ""
      }`}
      style={{ display: isVisible ? "block" : "none" }}
    >
      <div
        ref={cursorIconRef}
        className="absolute -translate-x-1/2 -translate-y-1/2 text-xl transition-all duration-150"
      >
        •
      </div>
    </div>
  );
}
