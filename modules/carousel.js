export function initCarousel() {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const slides = [...root.querySelectorAll("[data-slide]")];
  const indicators = [...root.querySelectorAll("[data-indicator]")];
  const previousButton = root.querySelector("[data-prev]");
  const nextButton = root.querySelector("[data-next]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (slides.length === 0) return;

  let currentIndex = 0;
  let autoTimer = null;
  let touchStartX = null;

  const showSlide = (newIndex) => {
    currentIndex = (newIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      const active = index === currentIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });

    indicators.forEach((indicator, index) => {
      const active = index === currentIndex;
      indicator.classList.toggle("is-active", active);
      indicator.setAttribute("aria-pressed", String(active));
    });
  };

  const stopAuto = () => {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    if (reduceMotion) return;
    stopAuto();
    autoTimer = window.setInterval(() => showSlide(currentIndex + 1), 6000);
  };

  const moveBy = (direction) => {
    showSlide(currentIndex + direction);
    startAuto();
  };

  previousButton?.addEventListener("click", () => moveBy(-1));
  nextButton?.addEventListener("click", () => moveBy(1));

  indicators.forEach((indicator, index) => {
    indicator.addEventListener("click", () => {
      showSlide(index);
      startAuto();
    });
  });

  root.addEventListener("pointerenter", stopAuto);
  root.addEventListener("pointerleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", startAuto);

  root.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.touches[0]?.clientX ?? null;
    },
    { passive: true },
  );

  root.addEventListener(
    "touchend",
    (event) => {
      if (touchStartX === null) return;

      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const distance = touchEndX - touchStartX;

      if (Math.abs(distance) > 45) {
        moveBy(distance < 0 ? 1 : -1);
      }

      touchStartX = null;
    },
    { passive: true },
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  showSlide(0);
  startAuto();
}
