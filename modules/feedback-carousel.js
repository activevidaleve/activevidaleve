export function initFeedbackCarousel() {
  const root = document.querySelector("[data-feedback]");
  if (!root) return;

  const track = root.querySelector("[data-feedback-track]");
  const prev = root.querySelector("[data-feedback-prev]");
  const next = root.querySelector("[data-feedback-next]");
  if (!track) return;

  const cardWidth = () => {
    const card = track.querySelector(".feedback-card");
    if (!card) return 360;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap) || 20;
    return card.offsetWidth + gap;
  };

  const scrollBy = (dir) => {
    track.scrollBy({ left: dir * cardWidth(), behavior: "smooth" });
  };

  prev?.addEventListener("click", () => scrollBy(-1));
  next?.addEventListener("click", () => scrollBy(1));
}
