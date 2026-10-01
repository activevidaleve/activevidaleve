import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { carregarConteudos } from "./conteudos.js";

const app = document.querySelector("[data-food-app]");
const loading = document.querySelector("[data-food-loading]");
const logoutButton = document.querySelector("[data-logout]");
const profileChips = document.querySelector("[data-food-profile-chips]");
const contentGrid = document.querySelector("[data-food-content-grid]");
const filters = [...document.querySelectorAll("[data-food-filter]")];
const emptyState = document.querySelector("[data-food-empty]");
let contentCards = [];

const labels = {
  perfil_alimentar: {
    variada: "Alimentação variada",
    vegetariana: "Vegetariana",
    vegana: "Vegana",
    outra: "Outra preferência"
  },
  tempo_preparo: {
    ate_15: "Até 15 min",
    "15_30": "15–30 min",
    "30_60": "30–60 min",
    mais_60: "Mais de 60 min"
  },
  interesses_alimentares: {
    cafe_manha: "Café da manhã",
    almoco: "Almoço",
    jantar: "Jantar",
    lanches: "Lanches",
    sucos: "Sucos",
    receitas_rapidas: "Receitas rápidas",
    marmitas: "Marmitas"
  }
};

const cardClasses = {
  cafe_manha: "food-card-breakfast",
  almoco: "food-card-lunch",
  jantar: "food-card-dinner",
  lanches: "food-card-snack",
  receitas_rapidas: "food-card-fast",
  marmitas: "food-card-mealprep",
  sucos: "food-card-juice"
};

const getLabel = (group, value) => labels[group]?.[value] || value || "Não informado";

const listLabels = (values = []) => {
  if (!Array.isArray(values) || !values.length) return "Não informado";
  return values.map((value) => getLabel("interesses_alimentares", value)).join(", ");
};

const setText = (selector, value, fallback = "Não informado") => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value || fallback;
};

const addProfileChip = (text) => {
  if (!profileChips || !text || text === "Não informado") return;
  const chip = document.createElement("span");
  chip.className = "food-profile-chip";
  chip.textContent = text;
  profileChips.append(chip);
};

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const renderContentCards = (items) => {
  if (!contentGrid) return;
  contentGrid.innerHTML = "";

  items.forEach((item) => {
    const article = createElement("article", `food-content-card ${cardClasses[item.categoria] || ""}`.trim());
    article.dataset.foodCard = "";
    article.dataset.category = item.categoria || "outros";

    const visual = createElement("div", "food-card-visual");
    visual.setAttribute("aria-hidden", "true");
    visual.append(createElement("span", "", item.icone || "✦"));

    const body = createElement("div", "food-card-body");
    const meta = createElement("div", "food-card-meta");
    meta.append(createElement("span", "", getLabel("interesses_alimentares", item.categoria)));
    const badge = createElement("i", "", "Do seu perfil");
    badge.dataset.matchBadge = "";
    badge.hidden = true;
    meta.append(badge);

    body.append(meta);
    body.append(createElement("h3", "", item.titulo));
    body.append(createElement("p", "", item.resumo));
    body.append(createElement("small", "", item.texto_apoio || "Conteúdo educativo do portal."));

    article.append(visual, body);
    contentGrid.append(article);
  });

  contentCards = [...contentGrid.querySelectorAll("[data-food-card]")];
};

const renderProfile = (userData, profileData, user) => {
  const name = userData.nome || user.displayName?.split(/\s+/)[0] || "você";
  setText("[data-user-name]", name, "você");

  const foodProfile = getLabel("perfil_alimentar", profileData.perfil_alimentar);
  const prepTime = getLabel("tempo_preparo", profileData.tempo_preparo);
  const interests = Array.isArray(profileData.interesses_alimentares)
    ? profileData.interesses_alimentares
    : [];

  setText("[data-food-profile]", foodProfile);
  setText("[data-food-time]", prepTime);
  setText("[data-food-interests]", listLabels(interests));
  setText("[data-food-avoid]", profileData.alimentos_evitar || "Nenhum informado");
  setText("[data-food-restrictions]", profileData.restricoes_alimentares || "Nenhuma informada");

  if (profileChips) profileChips.innerHTML = "";
  addProfileChip(foodProfile);
  addProfileChip(prepTime !== "Não informado" ? `Preparo: ${prepTime}` : "");
  interests.slice(0, 2).forEach((interest) => addProfileChip(getLabel("interesses_alimentares", interest)));

  return interests;
};

const personalizeCards = (interests) => {
  if (!contentGrid) return;
  const selected = new Set(interests);

  contentCards.forEach((card) => {
    const category = card.dataset.category;
    const isMatch = selected.has(category);
    card.classList.toggle("is-profile-match", isMatch);
    const badge = card.querySelector("[data-match-badge]");
    if (badge) badge.hidden = !isMatch;
  });

  [...contentCards]
    .sort((a, b) => Number(!selected.has(a.dataset.category)) - Number(!selected.has(b.dataset.category)))
    .forEach((card) => contentGrid.append(card));
};

const applyFilter = (filter) => {
  let visibleCount = 0;

  contentCards.forEach((card) => {
    const show = filter === "todos" || card.dataset.category === filter;
    card.hidden = !show;
    if (show) visibleCount += 1;
  });

  if (emptyState) emptyState.hidden = visibleCount !== 0;

  filters.forEach((button) => {
    const active = button.dataset.foodFilter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

filters.forEach((button) => {
  button.addEventListener("click", () => applyFilter(button.dataset.foodFilter || "todos"));
});

logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.replace("./login.html");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  try {
    const [userSnapshot, profileSnapshot, contentResult] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid)),
      carregarConteudos("alimentacao")
    ]);

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

    if (!productionAccess && !testAccess) {
      window.location.replace("./pagamento.html");
      return;
    }

    renderContentCards(contentResult.itens);
    const interests = renderProfile(userData, profileData, user);
    personalizeCards(interests);
    applyFilter("todos");

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar a área de alimentação:", error);
    window.location.replace("./portal.html");
  }
});
