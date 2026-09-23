export function initMobileMenu() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");

  if (!header || !toggle) return;

  const setState = (open) => {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  };

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.contains("menu-open");
    setState(!isOpen);
  });

  header.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => setState(false));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 880) setState(false);
  });
}
