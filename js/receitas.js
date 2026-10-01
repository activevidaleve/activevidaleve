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
import { personalizarConteudos } from "./personalizacao.js";
import { listarFavoritos, listarProgresso } from "./biblioteca-usuario.js";
import { aplicarCapa, criarBotaoFavorito, criarEstadoProgresso, criarFatosConteudo } from "./interface-biblioteca.js";

const app = document.querySelector("[data-recipes-app]");
const loading = document.querySelector("[data-recipes-loading]");
const logoutButton = document.querySelector("[data-logout]");
const profileChips = document.querySelector("[data-recipes-profile-chips]");
const recipesGrid = document.querySelector("[data-recipes-grid]");
const filters = [...document.querySelectorAll("[data-recipes-filter]")];
const emptyState = document.querySelector("[data-recipes-empty]");
let cards = [];
let currentUserId = null;
let favoriteIds = new Set();
let progressMap = new Map();

const labels = {
  perfil_alimentar: { variada: "Variada", vegetariana: "Vegetariana", vegana: "Vegana", outra: "Outra" },
  tempo_preparo: { ate_15: "Até 15 minutos", "15_30": "15–30 minutos", "30_60": "30–60 minutos", mais_60: "Mais de 60 minutos" },
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
const listLabels = (group, values = []) => Array.isArray(values) && values.length
  ? values.map((value) => getLabel(group, value)).join(", ")
  : "Não informado";

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

const categoryLabel = (item) => getLabel("interesses_alimentares", item.categoria || item.categorias?.[0]);

const renderRecipeCards = (items) => {
  if (!recipesGrid) return;
  recipesGrid.innerHTML = "";

  items.forEach((item) => {
    const categories = item.categorias?.length ? item.categorias : [item.categoria].filter(Boolean);
    const primaryCategory = item.categoria || categories[0] || "receitas_rapidas";
    const article = createElement("article", `recipe-card ${visualClasses[primaryCategory] || ""}`.trim());
    article.dataset.recipeCard = "";
    article.dataset.category = categories.join(" ");

    const recommended = item.personalizacao?.recomendado === true && !item.personalizacao?.bloqueado;
    article.classList.toggle("is-profile-match", recommended);
    if (item.personalizacao?.motivos?.length) {
      article.title = `Por que aparece aqui: ${item.personalizacao.motivos.join("; ")}.`;
    }

    const visual = createElement("div", "recipe-card-visual");
    const visualIcon = createElement("span", "", item.icone || "✦");
    visualIcon.setAttribute("aria-hidden", "true");
    visual.append(visualIcon);
    aplicarCapa(visual, item);
    if (currentUserId) {
      const favorite = criarBotaoFavorito({ usuarioId: currentUserId, item, favoritos: favoriteIds, className: "recipe-card-favorite" });
      visual.append(favorite);
    }

    const body = createElement("div", "recipe-card-body");
    const meta = createElement("div", "recipe-card-meta");
    meta.append(createElement("span", "", categoryLabel(item)));
    const badge = createElement("i", "", "Recomendado para você");
    badge.dataset.matchBadge = "";
    badge.hidden = !recommended;
    meta.append(badge);
    const progressState = criarEstadoProgresso(item, progressMap, "recipe-card-progress");
    if (progressState) meta.append(progressState);

    body.append(meta);
    body.append(createElement("h3", "", item.titulo));
    body.append(createElement("p", "", item.resumo));

    const experienceFacts = criarFatosConteudo(item, "recipe-experience-facts");
    if (experienceFacts) body.append(experienceFacts);
    const facts = createElement("div", "recipe-facts");
    const factsList = item.tags?.length ? item.tags : [getLabel("tempo_preparo", item.tempo_preparo)];
    factsList.slice(0, 2).forEach((fact) => facts.append(createElement("span", "", fact)));
    body.append(facts);

    if (item.personalizacao?.bloqueado && item.personalizacao.alertas?.length) {
      const warning = createElement("small", "", "Confira suas preferências e restrições antes de escolher esta receita.");
      warning.title = item.personalizacao.alertas.join("; ");
      body.append(warning);
    }

    const link = createElement("a", "recipe-open", "Ver receita completa →");
    link.href = `./conteudo.html?id=${encodeURIComponent(item.id)}`;
    link.setAttribute("aria-label", `Ver receita ${item.titulo}`);
    body.append(link);

    article.append(visual, body);
    recipesGrid.append(article);
  });

  cards = [...recipesGrid.querySelectorAll("[data-recipe-card]")];
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
};

const getCardCategories = (card) => (card.dataset.category || "").split(/\s+/).filter(Boolean);

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

  currentUserId = user.uid;
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

    const [favoritesResult, progressResult] = await Promise.allSettled([listarFavoritos(user.uid), listarProgresso(user.uid)]);
    if (favoritesResult.status === "fulfilled") favoriteIds = new Set(favoritesResult.value.map((item) => item.conteudo_id || item.id));
    else console.warn("Favoritos indisponíveis.", favoritesResult.reason);
    if (progressResult.status === "fulfilled") progressMap = new Map(progressResult.value.map((item) => [item.conteudo_id || item.id, item]));
    else console.warn("Progresso indisponível até as novas regras do Firestore serem publicadas.", progressResult.reason);

    const personalized = personalizarConteudos(contentResult.itens, profileData);
    renderRecipeCards(personalized);
    renderProfile(userData, profileData, user);
    applyFilter("todos");

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar a área de receitas:", error);
    window.location.replace("./portal.html");
  }
});
