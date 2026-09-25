export function initFeedbackCarousel() {
  const root = document.querySelector("[data-feedback-carousel]");
  if (!root) return;

  const track = root.querySelector("[data-feedback-track]");
  const cards = [...root.querySelectorAll("[data-feedback-card]")];
  const previousButton = root.querySelector("[data-feedback-prev]");
  const nextButton = root.querySelector("[data-feedback-next]");
  const currentLabel = root.querySelector("[data-feedback-current]");
  const totalLabel = root.querySelector("[data-feedback-total]");
  const progress = root.querySelector("[data-feedback-progress]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!track || cards.length === 0) return;

  let currentIndex = 0;
  let autoTimer = null;
  let touchStartX = null;
  let resizeTimer = null;

  const visibleCount = () => {
    if (window.matchMedia("(max-width: 760px)").matches) return 1;
    if (window.matchMedia("(max-width: 980px)").matches) return 2;
    return 3;
  };

  const maxIndex = () => Math.max(0, cards.length - visibleCount());

  const render = (animate = true) => {
    currentIndex = Math.min(Math.max(currentIndex, 0), maxIndex());
    track.style.transition = animate ? "" : "none";
    track.style.transform = `translate3d(-${cards[currentIndex].offsetLeft}px, 0, 0)`;

    const visible = visibleCount();
    cards.forEach((card, index) => {
      const hidden = index < currentIndex || index >= currentIndex + visible;
      card.setAttribute("aria-hidden", String(hidden));
    });

    if (currentLabel) currentLabel.textContent = String(currentIndex + 1).padStart(2, "0");
    if (totalLabel) totalLabel.textContent = String(cards.length).padStart(2, "0");
    if (progress) {
      const steps = maxIndex() + 1;
      progress.style.width = `${((currentIndex + 1) / steps) * 100}%`;
    }

    if (!animate) requestAnimationFrame(() => { track.style.transition = ""; });
  };

  const stopAuto = () => {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    if (reduceMotion) return;
    stopAuto();
    autoTimer = window.setInterval(() => {
      currentIndex = currentIndex >= maxIndex() ? 0 : currentIndex + 1;
      render();
    }, 6000);
  };

  const moveBy = (direction) => {
    const limit = maxIndex();
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = limit;
    if (currentIndex > limit) currentIndex = 0;
    render();
    startAuto();
  };

  previousButton?.addEventListener("click", () => moveBy(-1));
  nextButton?.addEventListener("click", () => moveBy(1));

  root.addEventListener("pointerenter", stopAuto);
  root.addEventListener("pointerleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", startAuto);

  root.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0]?.clientX ?? null;
  }, { passive: true });

  root.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = touchEndX - touchStartX;
    if (Math.abs(distance) > 45) moveBy(distance < 0 ? 1 : -1);
    touchStartX = null;
  }, { passive: true });

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => render(false), 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  render(false);
  startAuto();
}
