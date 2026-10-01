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

const app = document.querySelector("[data-recipes-app]");
const loading = document.querySelector("[data-recipes-loading]");
const logoutButton = document.querySelector("[data-logout]");
const profileChips = document.querySelector("[data-recipes-profile-chips]");
const recipesGrid = document.querySelector("[data-recipes-grid]");
const filters = [...document.querySelectorAll("[data-recipes-filter]")];
const emptyState = document.querySelector("[data-recipes-empty]");
let cards = [];

const labels = {
  perfil_alimentar: {
    variada: "Variada",
    vegetariana: "Vegetariana",
    vegana: "Vegana",
    outra: "Outra"
  },
  tempo_preparo: {
    ate_15: "Até 15 minutos",
    "15_30": "15–30 minutos",
    "30_60": "30–60 minutos",
    mais_60: "Mais de 60 minutos"
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

const visualClasses = {
  cafe_manha: "recipe-card-oats",
  almoco: "recipe-card-bowl",
  jantar: "recipe-card-pasta",
  lanches: "recipe-card-wrap",
  sucos: "recipe-card-juice",
  receitas_rapidas: "recipe-card-smoothie"
};

const getLabel = (group, value) => labels[group]?.[value] || value || "Não informado";

const listLabels = (group, values = []) => {
  if (!Array.isArray(values) || !values.length) return "Não informado";
  return values.map((value) => getLabel(group, value)).join(", ");
};

const setText = (selector, value, fallback = "Não informado") => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value || fallback;
};

const addChip = (text) => {
  if (!profileChips || !text || text === "Não informado") return;
  const chip = document.createElement("span");
  chip.className = "recipes-profile-chip";
  chip.textContent = text;
  profileChips.append(chip);
};

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const categoryLabel = (item) => {
  const first = item.categoria || item.categorias?.[0];
  return getLabel("interesses_alimentares", first);
};

const renderRecipeCards = (items) => {
  if (!recipesGrid) return;
  recipesGrid.innerHTML = "";

  items.forEach((item) => {
    const categories = item.categorias?.length ? item.categorias : [item.categoria].filter(Boolean);
    const primaryCategory = item.categoria || categories[0] || "receitas_rapidas";
    const article = createElement("article", `recipe-card ${visualClasses[primaryCategory] || ""}`.trim());
    article.dataset.recipeCard = "";
    article.dataset.category = categories.join(" ");
    article.dataset.profile = (item.perfis_alimentares || []).join(" ");
    article.dataset.time = item.tempo_preparo || "";

    const visual = createElement("div", "recipe-card-visual");
    visual.setAttribute("aria-hidden", "true");
    visual.append(createElement("span", "", item.icone || "✦"));

    const body = createElement("div", "recipe-card-body");
    const meta = createElement("div", "recipe-card-meta");
    meta.append(createElement("span", "", categoryLabel(item)));
    const badge = createElement("i", "", "Do seu perfil");
    badge.dataset.matchBadge = "";
    badge.hidden = true;
    meta.append(badge);

    body.append(meta);
    body.append(createElement("h3", "", item.titulo));
    body.append(createElement("p", "", item.resumo));

    const facts = createElement("div", "recipe-facts");
    const factsList = item.tags?.length
      ? item.tags
      : [getLabel("tempo_preparo", item.tempo_preparo)];
    factsList.slice(0, 3).forEach((fact) => facts.append(createElement("span", "", fact)));
    body.append(facts);

    if (item.ingredientes || item.preparo?.length) {
      const button = createElement("button", "recipe-open", "Ver receita");
      button.type = "button";
      button.dataset.recipeOpen = "";
      button.setAttribute("aria-expanded", "false");
      body.append(button);

      const details = createElement("div", "recipe-details");
      details.dataset.recipeDetails = "";
      details.hidden = true;

      if (item.ingredientes) {
        details.append(createElement("strong", "", "Ingredientes-base"));
        details.append(createElement("p", "", item.ingredientes));
      }

      if (item.preparo?.length) {
        details.append(createElement("strong", "", "Preparo"));
        const list = document.createElement("ol");
        item.preparo.forEach((step) => list.append(createElement("li", "", step)));
        details.append(list);
      }

      body.append(details);
    }

    article.append(visual, body);
    recipesGrid.append(article);
  });

  cards = [...recipesGrid.querySelectorAll("[data-recipe-card]")];
};

const timeScore = {
  ate_15: 1,
  "15_30": 2,
  "30_60": 3,
  mais_60: 4
};

const getCardCategories = (card) => (card.dataset.category || "").split(/\s+/).filter(Boolean);
const getCardProfiles = (card) => (card.dataset.profile || "").split(/\s+/).filter(Boolean);

const matchesProfile = (card, profile) => {
  const profiles = getCardProfiles(card);
  const profileMatch = !profile.foodProfile || profile.foodProfile === "outra" || !profiles.length || profiles.includes(profile.foodProfile);
  const cardTime = card.dataset.time || "";
  const timeMatch = !profile.prepTime || !cardTime || (timeScore[cardTime] || 99) <= (timeScore[profile.prepTime] || 99);
  const categories = getCardCategories(card);
  const interestMatch = !profile.interests.length || profile.interests.some((item) => categories.includes(item));

  return profileMatch && timeMatch && interestMatch;
};

const renderProfile = (userData, profileData, user) => {
  const name = userData.nome || user.displayName?.split(/\s+/)[0] || "você";
  const foodProfile = getLabel("perfil_alimentar", profileData.perfil_alimentar);
  const prepTime = getLabel("tempo_preparo", profileData.tempo_preparo);
  const interests = Array.isArray(profileData.interesses_alimentares) ? profileData.interesses_alimentares : [];

  setText("[data-user-name]", name, "você");
  setText("[data-recipes-profile]", foodProfile);
  setText("[data-recipes-time]", prepTime);
  setText("[data-recipes-interests]", listLabels("interesses_alimentares", interests));
  setText("[data-recipes-avoid]", profileData.alimentos_evitar || "Nenhum informado");
  setText("[data-recipes-restrictions]", profileData.restricoes_alimentares || "Nenhuma informada");

  if (profileChips) profileChips.innerHTML = "";
  addChip(foodProfile);
  addChip(prepTime);
  interests.slice(0, 2).forEach((interest) => addChip(getLabel("interesses_alimentares", interest)));

  return {
    foodProfile: profileData.perfil_alimentar || "",
    prepTime: profileData.tempo_preparo || "",
    interests
  };
};

const personalizeCards = (profile) => {
  if (!recipesGrid) return;

  cards.forEach((card) => {
    const isMatch = matchesProfile(card, profile);
    card.classList.toggle("is-profile-match", isMatch);
    const badge = card.querySelector("[data-match-badge]");
    if (badge) badge.hidden = !isMatch;
  });

  [...cards]
    .sort((a, b) => Number(!matchesProfile(a, profile)) - Number(!matchesProfile(b, profile)))
    .forEach((card) => recipesGrid.append(card));
};

const applyFilter = (filter) => {
  let visibleCount = 0;

  cards.forEach((card) => {
    const categories = getCardCategories(card);
    const show = filter === "todos" || categories.includes(filter);
    card.hidden = !show;
    if (show) visibleCount += 1;
  });

  if (emptyState) emptyState.hidden = visibleCount !== 0;

  filters.forEach((button) => {
    const active = button.dataset.recipesFilter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

filters.forEach((button) => {
  button.addEventListener("click", () => applyFilter(button.dataset.recipesFilter || "todos"));
});

recipesGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-recipe-open]");
  if (!button) return;

  const card = button.closest("[data-recipe-card]");
  const details = card?.querySelector("[data-recipe-details]");
  if (!details) return;

  const willOpen = details.hidden;
  details.hidden = !willOpen;
  button.setAttribute("aria-expanded", String(willOpen));
  button.textContent = willOpen ? "Fechar receita" : "Ver receita";
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
      carregarConteudos("receita")
    ]);

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

    if (!productionAccess && !testAccess) {
      window.location.replace("./pagamento.html");
      return;
    }

    renderRecipeCards(contentResult.itens);
    const profile = renderProfile(userData, profileData, user);
    personalizeCards(profile);
    applyFilter("todos");

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar a área de receitas:", error);
    window.location.replace("./portal.html");
  }
});
