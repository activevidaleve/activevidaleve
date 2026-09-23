export function initCarousel() {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const slides = [...root.querySelectorAll("[data-slide]")];
  const dots = [...root.querySelectorAll("[data-dot]")];
  const prev = root.querySelector("[data-prev]");
  const next = root.querySelector("[data-next]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let index = 0;
  let timer = null;
  let startX = null;

  function show(newIndex) {
    index = (newIndex + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });

    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
    });
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startAuto() {
    if (reduceMotion) return;
    stopAuto();
    timer = setInterval(() => show(index + 1), 6000);
  }

  prev?.addEventListener("click", () => {
    show(index - 1);
    startAuto();
  });

  next?.addEventListener("click", () => {
    show(index + 1);
    startAuto();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      show(i);
      startAuto();
    });
  });

  root.addEventListener("pointerenter", stopAuto);
  root.addEventListener("pointerleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", startAuto);

  // Swipe para celulares/tablets
  root.addEventListener("touchstart", (event) => {
    startX = event.touches[0]?.clientX ?? null;
  }, { passive: true });

  root.addEventListener("touchend", (event) => {
    if (startX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;

    if (Math.abs(delta) > 45) {
      show(index + (delta < 0 ? 1 : -1));
      startAuto();
    }
    startX = null;
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopAuto() : startAuto();
  });

  show(0);
  startAuto();
}
