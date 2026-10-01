import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { carregarConteudos } from "./conteudos.js";
import { personalizarConteudos } from "./personalizacao.js";
import { criarFatosConteudo } from "./interface-biblioteca.js";
import {
  alternarFavorito,
  listarFavoritos,
  listarHistorico,
  listarProgresso
} from "./biblioteca-usuario.js";

const app = document.querySelector("[data-portal-app]");
const loading = document.querySelector("[data-portal-loading]");
const logoutButton = document.querySelector("[data-logout]");
const firstName = document.querySelector("[data-user-first-name]");
const headerName = document.querySelector("[data-header-name]");
const userInitial = document.querySelector("[data-user-initial]");
const accessDescription = document.querySelector("[data-access-description]");
const profileTags = document.querySelector("[data-profile-tags]");

let currentUser = null;
let favoriteIds = new Set();
let historyIds = new Set();
let progressMap = new Map();

const mappings = {
  nivel_exercicio: { iniciante: "Iniciante", intermediario: "Intermediário", experiente: "Experiente" },
  dias_exercicio: { "1_2": "1–2 dias/semana", "3_4": "3–4 dias/semana", "5_mais": "5+ dias/semana" },
  duracao_treino: { ate_15: "Até 15 min", "15_30": "15–30 min", "30_45": "30–45 min", mais_45: "45+ min" },
  perfil_alimentar: { variada: "Variada", vegetariana: "Vegetariana", vegana: "Vegana", outra: "Outra" },
  nivel_atividade: { pouco_ativo: "Pouco ativo", algumas_vezes_semana: "Algumas vezes por semana", ativo_frequente: "Ativo com frequência", muito_ativo: "Muito ativo" },
  local_exercicio: { casa: "Em casa", academia: "Academia", ar_livre: "Ao ar livre", variado: "Locais variados", varia: "Locais variados" }
};

const typeLabels = { alimentacao: "Alimentação", exercicio: "Exercício", receita: "Receita" };
const mapped = (field, value) => mappings[field]?.[value] || value || "Não informado";
const normalizeList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const titleCase = (value = "") => String(value).replace(/_/g, " ").replace(/\b\p{L}/gu, (char) => char.toUpperCase());
const redirectToPayment = () => window.location.replace("./pagamento.html");
const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
const getItemId = (item = {}) => String(item.conteudo_id || item.id || "").trim();

const setFavoriteButton = (button, id) => {
  const saved = favoriteIds.has(id);
  button.classList.toggle("is-favorite", saved);
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", saved ? "Remover dos favoritos" : "Salvar nos favoritos");
  button.textContent = saved ? "♥" : "♡";
};

const bindFavoriteButton = (button, item) => {
  const id = getItemId(item);
  if (!button || !id) return;
  setFavoriteButton(button, id);
  button.addEventListener("click", async () => {
    if (!currentUser) return;
    button.disabled = true;
    try {
      const saved = await alternarFavorito(currentUser.uid, { ...item, id });
      if (saved) favoriteIds.add(id); else favoriteIds.delete(id);
      document.querySelectorAll(`[data-content-favorite="${CSS.escape(id)}"]`).forEach((candidate) => setFavoriteButton(candidate, id));
    } catch (error) {
      console.warn("Não foi possível atualizar o favorito.", error);
    } finally {
      button.disabled = false;
    }
  });
};

const createContentCard = (item, options = {}) => {
  const id = getItemId(item);
  if (!id) return null;

  const card = document.createElement("article");
  card.className = "portal-content-card";
  card.dataset.type = item.tipo || "";

  const cover = document.createElement("div");
  cover.className = "portal-content-cover";
  const icon = document.createElement("span");
  icon.className = "portal-content-card-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = item.icone || "✦";
  const favorite = document.createElement("button");
  favorite.type = "button";
  favorite.className = "portal-card-favorite";
  favorite.dataset.contentFavorite = id;
  bindFavoriteButton(favorite, item);
  cover.append(icon, favorite);
  if (item.imagem_url) {
    cover.classList.add("has-image");
    cover.style.backgroundImage = `linear-gradient(135deg, rgba(38,62,50,.04), rgba(38,62,50,.24)), url("${String(item.imagem_url).replaceAll('"', '%22')}")`;
  }

  const top = document.createElement("div");
  top.className = "portal-content-card-top";
  const meta = document.createElement("div");
  meta.className = "portal-content-card-meta";
  const kind = document.createElement("span");
  kind.textContent = typeLabels[item.tipo] || "Conteúdo";
  const category = document.createElement("small");
  category.textContent = item.categoria ? titleCase(item.categoria) : "Active Vida Leve";
  meta.append(kind, category);
  top.append(meta);

  const progress = progressMap.get(id);
  if (progress) {
    const state = document.createElement("span");
    state.className = "portal-card-state";
    state.textContent = progress.status === "concluido" ? "✓ Concluído" : `${Math.max(1, Number(progress.progresso || 0))}% visto`;
    top.append(state);
  }

  const title = document.createElement("h3");
  title.textContent = item.titulo || "Conteúdo";
  const summary = document.createElement("p");
  summary.textContent = item.resumo || "Abra para ver o conteúdo completo.";
  const facts = criarFatosConteudo(item, "portal-content-facts");
  const reason = document.createElement("span");
  reason.className = "portal-content-reason";
  const motive = item.personalizacao?.motivos?.[0];
  reason.textContent = options.reason || (motive ? titleCase(motive) : "Selecionado para sua biblioteca");
  const link = document.createElement("a");
  link.href = `./conteudo.html?id=${encodeURIComponent(id)}`;
  link.textContent = options.action || "Abrir conteúdo →";

  card.append(cover, top, title, summary);
  if (facts) card.append(facts);
  card.append(reason, link);
  return card;
};

const renderContentGrid = (selector, items = [], options = {}) => {
  const target = document.querySelector(selector);
  if (!target) return;
  target.innerHTML = "";
  const limit = options.limit || items.length;
  items.slice(0, limit).forEach((item) => {
    const card = createContentCard(item, options);
    if (card) target.append(card);
  });
};

const renderLibraryList = (selector, emptySelector, items = [], options = {}) => {
  const target = document.querySelector(selector);
  const empty = document.querySelector(emptySelector);
  if (!target || !empty) return;
  target.innerHTML = "";
  const visible = items.slice(0, 4);
  empty.hidden = visible.length > 0;

  visible.forEach((item) => {
    const row = document.createElement("article");
    row.className = "portal-library-item";
    row.dataset.type = item.tipo || "";
    const icon = document.createElement("div");
    icon.className = "portal-library-item-icon";
    icon.textContent = item.icone || "✦";
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.titulo || "Conteúdo";
    const meta = document.createElement("span");
    if (options.progress) {
      meta.textContent = item.status === "concluido" ? "Concluído" : `${Number(item.progresso || 0)}% explorado`;
    } else {
      meta.textContent = typeLabels[item.tipo] || "Conteúdo";
    }
    copy.append(name, meta);
    const link = document.createElement("a");
    link.href = `./conteudo.html?id=${encodeURIComponent(getItemId(item))}`;
    link.setAttribute("aria-label", `Abrir ${item.titulo || "conteúdo"}`);
    link.textContent = "→";
    row.append(icon, copy, link);
    target.append(row);
  });
};

const buildProfileTags = (profileData) => {
  if (!profileTags) return;
  const tags = [
    mapped("nivel_exercicio", profileData.nivel_exercicio),
    mapped("duracao_treino", profileData.duracao_treino),
    mapped("local_exercicio", profileData.local_exercicio),
    mapped("perfil_alimentar", profileData.perfil_alimentar)
  ].filter((value) => value && value !== "Não informado");
  profileTags.innerHTML = "";
  tags.slice(0, 4).forEach((label) => {
    const tag = document.createElement("span");
    tag.className = "portal-profile-tag";
    tag.textContent = label;
    profileTags.append(tag);
  });
};

const fallbackRecommendations = (profileData) => {
  const level = mapped("nivel_exercicio", profileData.nivel_exercicio);
  const duration = mapped("duracao_treino", profileData.duracao_treino);
  const location = mapped("local_exercicio", profileData.local_exercicio);
  const foodInterests = normalizeList(profileData.interesses_alimentares);
  const goals = normalizeList(profileData.objetivos);
  setText("[data-rec-move-title]", level !== "Não informado" ? `${level}: comece no seu ritmo` : "Movimento no seu ritmo");
  setText("[data-rec-move-text]", duration !== "Não informado"
    ? `Conteúdos de ${duration.toLowerCase()} e ${location.toLowerCase()} aparecem com mais relevância para o seu perfil.`
    : "Conteúdos são priorizados de acordo com seu nível, tempo e local disponíveis.");
  const foodLabel = foodInterests.length ? foodInterests.slice(0, 2).map(titleCase).join(" e ") : "Receitas práticas";
  setText("[data-rec-food-title]", `${foodLabel} em destaque`);
  setText("[data-rec-food-text]", "Alimentação e receitas são ordenadas a partir dos interesses e preferências informados no cadastro.");
  const goalLabel = goals.length ? titleCase(goals[0]) : "Sua rotina";
  setText("[data-rec-routine-title]", goalLabel);
  setText("[data-rec-routine-text]", goals.length
    ? "Seu objetivo principal funciona como uma das referências para organizar os conteúdos do portal."
    : "Consulte objetivos, preferências e dados que ajudam a organizar sua experiência.");
};

const recommendedPool = (items, profileData) => {
  const personalized = personalizarConteudos(items, profileData).filter((item) => !item.personalizacao?.bloqueado);
  const recommended = personalized.filter((item) => item.personalizacao?.recomendado);
  return recommended.length ? recommended : personalized;
};

const adaptToUse = (items = []) => [...items].sort((a, b) => {
  const idA = getItemId(a);
  const idB = getItemId(b);
  const progressA = progressMap.get(idA);
  const progressB = progressMap.get(idB);
  const score = (item, id, progress) => {
    let value = Number(item.personalizacao?.pontuacao || 0);
    if (favoriteIds.has(id)) value += 6;
    if (progress?.status === "em_andamento") value += 8;
    if (historyIds.has(id)) value -= 8;
    if (progress?.status === "concluido") value -= 60;
    return value;
  };
  return score(b, idB, progressB) - score(a, idA, progressA);
});

const buildRecommendations = (profileData, exerciseItems, foodItems, recipeItems) => {
  fallbackRecommendations(profileData);
  const exercise = adaptToUse(recommendedPool(exerciseItems, profileData))[0];
  const food = adaptToUse(recommendedPool([...foodItems, ...recipeItems], profileData))[0];
  if (exercise) {
    setText("[data-rec-move-title]", exercise.titulo);
    setText("[data-rec-move-text]", exercise.resumo);
    const link = document.querySelector(".portal-rec-move a");
    if (link) { link.href = `./conteudo.html?id=${encodeURIComponent(exercise.id)}`; link.firstChild.textContent = "Abrir conteúdo "; }
  }
  if (food) {
    setText("[data-rec-food-title]", food.titulo);
    setText("[data-rec-food-text]", food.resumo);
    const link = document.querySelector(".portal-rec-food a");
    if (link) { link.href = `./conteudo.html?id=${encodeURIComponent(food.id)}`; link.firstChild.textContent = food.tipo === "receita" ? "Ver receita " : "Abrir conteúdo "; }
  }
};

const dedupeById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = getItemId(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const buildPersonalizedHome = (profileData, foodItems, exerciseItems, recipeItems) => {
  const exercises = adaptToUse(recommendedPool(exerciseItems, profileData));
  const foods = adaptToUse(recommendedPool(foodItems, profileData));
  const recipes = adaptToUse(recommendedPool(recipeItems, profileData));
  const all = adaptToUse(recommendedPool([...exerciseItems, ...foodItems, ...recipeItems], profileData));
  const balancedSelection = dedupeById([exercises[0], recipes[0], foods[0], ...all].filter(Boolean)).slice(0, 4);
  renderContentGrid("[data-personalized-grid]", balancedSelection, { limit: 4, reason: "Recomendação ajustada ao seu perfil e uso" });
  renderContentGrid("[data-exercise-shelf]", exercises, { limit: 4, action: "Ver exercício →" });
  renderContentGrid("[data-recipe-shelf]", recipes, { limit: 4, action: "Ver receita →" });
  renderContentGrid("[data-food-shelf]", foods, { limit: 4, action: "Ler conteúdo →" });
  const duration = mapped("duracao_treino", profileData.duracao_treino);
  if (duration !== "Não informado") setText("[data-exercise-shelf-title]", `Opções que podem caber em ${duration.toLowerCase()}.`);
  const foodProfile = mapped("perfil_alimentar", profileData.perfil_alimentar);
  if (foodProfile !== "Não informado") setText("[data-recipe-shelf-title]", `Ideias relacionadas ao perfil ${foodProfile.toLowerCase()}.`);
};

const renderContinueSection = (progress = []) => {
  const section = document.querySelector("[data-continue-section]");
  if (!section) return;
  const inProgress = progress.filter((item) => item.status === "em_andamento" && Number(item.progresso || 0) > 0);
  if (!inProgress.length) { section.hidden = true; return; }
  renderContentGrid("[data-continue-grid]", inProgress, { limit: 4, action: "Continuar →" });
  section.hidden = false;
};

logoutButton?.addEventListener("click", async () => {
  try { await signOut(auth); } finally { window.location.replace("./login.html"); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.replace("./login.html"); return; }
  currentUser = user;

  try {
    const [userSnapshot, profileSnapshot, foodResult, exerciseResult, recipeResult] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid)),
      carregarConteudos("alimentacao"),
      carregarConteudos("exercicio"),
      carregarConteudos("receita")
    ]);

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";
    if (!productionAccess && !testAccess) { redirectToPayment(); return; }

    const name = userData.nome || user.displayName?.split(/\s+/)[0] || "Usuário";
    if (firstName) firstName.textContent = name;
    if (headerName) headerName.textContent = name;
    if (userInitial) userInitial.textContent = name.trim().charAt(0).toUpperCase() || "U";
    if (accessDescription) accessDescription.textContent = productionAccess ? "Pagamento confirmado e acesso ativo" : "Acesso liberado em ambiente de desenvolvimento";

    const profileBindings = {
      "[data-profile-level]": mapped("nivel_exercicio", profileData.nivel_exercicio),
      "[data-profile-days]": mapped("dias_exercicio", profileData.dias_exercicio),
      "[data-profile-duration]": mapped("duracao_treino", profileData.duracao_treino),
      "[data-profile-food]": mapped("perfil_alimentar", profileData.perfil_alimentar)
    };
    Object.entries(profileBindings).forEach(([selector, value]) => setText(selector, value));
    buildProfileTags(profileData);

    let favorites = [];
    let history = [];
    let progress = [];
    const [favoritesResult, historyResult, progressResult] = await Promise.allSettled([
      listarFavoritos(user.uid),
      listarHistorico(user.uid, 12),
      listarProgresso(user.uid)
    ]);
    if (favoritesResult.status === "fulfilled") favorites = favoritesResult.value;
    else console.warn("Favoritos indisponíveis.", favoritesResult.reason);
    if (historyResult.status === "fulfilled") history = historyResult.value;
    else console.warn("Histórico indisponível.", historyResult.reason);
    if (progressResult.status === "fulfilled") progress = progressResult.value;
    else console.warn("Progresso indisponível até as novas regras do Firestore serem publicadas.", progressResult.reason);
    favoriteIds = new Set(favorites.map(getItemId));
    historyIds = new Set(history.map(getItemId));
    progressMap = new Map(progress.map((item) => [getItemId(item), item]));

    buildRecommendations(profileData, exerciseResult.itens, foodResult.itens, recipeResult.itens);
    buildPersonalizedHome(profileData, foodResult.itens, exerciseResult.itens, recipeResult.itens);
    renderContinueSection(progress);
    renderLibraryList("[data-portal-favorites]", "[data-portal-favorites-empty]", favorites);
    renderLibraryList("[data-portal-history]", "[data-portal-history-empty]", history);
    renderLibraryList("[data-portal-completed]", "[data-portal-completed-empty]", progress.filter((item) => item.status === "concluido"), { progress: true });

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao validar acesso ao portal:", error);
    redirectToPayment();
  }
});
