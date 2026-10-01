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

const app = document.querySelector("[data-workout-app]");
const loading = document.querySelector("[data-workout-loading]");
const logoutButton = document.querySelector("[data-logout]");
const profileChips = document.querySelector("[data-workout-profile-chips]");
const contentGrid = document.querySelector("[data-workout-content-grid]");
const filters = [...document.querySelectorAll("[data-workout-filter]")];
const emptyState = document.querySelector("[data-workout-empty]");
let contentCards = [];

const labels = {
  nivel_exercicio: {
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    experiente: "Experiente"
  },
  dias_exercicio: {
    "1_2": "1–2 dias/semana",
    "3_4": "3–4 dias/semana",
    "5_mais": "5+ dias/semana"
  },
  duracao_treino: {
    ate_15: "Até 15 min",
    "15_30": "15–30 min",
    "30_45": "30–45 min",
    mais_45: "Mais de 45 min"
  },
  local_exercicio: {
    casa: "Em casa",
    academia: "Academia",
    ar_livre: "Ao ar livre",
    varia: "Locais variados"
  },
  equipamentos: {
    nenhum: "Nenhum",
    halteres: "Halteres",
    elasticos: "Elásticos",
    colchonete: "Colchonete",
    equipamentos_academia: "Equipamentos de academia",
    outros: "Outros"
  },
  objetivos: {
    movimentar_mais: "Me movimentar mais",
    condicionamento: "Melhorar meu condicionamento",
    constancia_exercicios: "Criar constância nos exercícios",
    organizar_alimentacao: "Organizar melhor minha alimentação",
    receitas_praticas: "Aprender receitas práticas",
    variedade_refeicoes: "Ter mais variedade nas refeições",
    rotina_organizada: "Criar uma rotina mais organizada",
    bem_estar: "Melhorar hábitos de bem-estar"
  },
  categorias: {
    mobilidade: "Mobilidade",
    forca: "Força geral",
    cardio_leve: "Cardio leve",
    alongamento: "Alongamento",
    pausas_ativas: "Pausas ativas"
  }
};

const cardClasses = {
  mobilidade: "workout-card-mobility",
  forca: "workout-card-strength",
  cardio_leve: "workout-card-cardio",
  alongamento: "workout-card-stretch",
  pausas_ativas: "workout-card-break"
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
  chip.className = "workout-profile-chip";
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
    const article = createElement("article", `workout-content-card ${cardClasses[item.categoria] || ""}`.trim());
    article.dataset.workoutCard = "";
    article.dataset.category = item.categoria || "outros";
    article.dataset.level = (item.niveis || []).join(" ");
    article.dataset.location = (item.locais || []).join(" ");
    article.dataset.equipment = (item.equipamentos || []).join(" ");

    const visual = createElement("div", "workout-card-visual");
    visual.setAttribute("aria-hidden", "true");
    visual.append(createElement("span", "", item.icone || "✦"));

    const body = createElement("div", "workout-card-body");
    const meta = createElement("div", "workout-card-meta");
    meta.append(createElement("span", "", getLabel("categorias", item.categoria)));
    const badge = createElement("i", "", "Combina com seu perfil");
    badge.dataset.matchBadge = "";
    badge.hidden = true;
    meta.append(badge);

    body.append(meta);
    body.append(createElement("h3", "", item.titulo));
    body.append(createElement("p", "", item.resumo));

    const tags = createElement("div", "workout-card-tags");
    (item.tags || []).slice(0, 3).forEach((tag) => tags.append(createElement("span", "", tag)));
    if (!tags.children.length) tags.append(createElement("span", "", "Conteúdo geral"));
    body.append(tags);

    article.append(visual, body);
    contentGrid.append(article);
  });

  contentCards = [...contentGrid.querySelectorAll("[data-workout-card]")];
};

const renderProfile = (userData, profileData, user) => {
  const name = userData.nome || user.displayName?.split(/\s+/)[0] || "você";
  const level = getLabel("nivel_exercicio", profileData.nivel_exercicio);
  const days = getLabel("dias_exercicio", profileData.dias_exercicio);
  const duration = getLabel("duracao_treino", profileData.duracao_treino);
  const location = getLabel("local_exercicio", profileData.local_exercicio);
  const equipment = Array.isArray(profileData.equipamentos) ? profileData.equipamentos : [];
  const goals = Array.isArray(profileData.objetivos) ? profileData.objetivos : [];

  setText("[data-user-name]", name, "você");
  setText("[data-workout-level]", level);
  setText("[data-workout-days]", days);
  setText("[data-workout-duration]", duration);
  setText("[data-workout-location]", location);
  setText("[data-workout-equipment]", listLabels("equipamentos", equipment));
  setText("[data-workout-goals]", listLabels("objetivos", goals));
  setText("[data-workout-avoid]", profileData.exercicios_evitar || "Nenhum informado");

  if (profileChips) profileChips.innerHTML = "";
  addChip(level);
  addChip(duration);
  addChip(location);
  if (equipment.length) addChip(equipment.includes("nenhum") ? "Sem equipamento" : getLabel("equipamentos", equipment[0]));

  return {
    level: profileData.nivel_exercicio || "",
    location: profileData.local_exercicio || "",
    equipment,
    duration: profileData.duracao_treino || ""
  };
};

const matchesProfile = (card, profile) => {
  const levels = (card.dataset.level || "").split(/\s+/).filter(Boolean);
  const locations = (card.dataset.location || "").split(/\s+/).filter(Boolean);
  const equipment = (card.dataset.equipment || "").split(/\s+/).filter(Boolean);

  const levelMatch = !profile.level || !levels.length || levels.includes(profile.level);
  const locationMatch = !profile.location || !locations.length || locations.includes(profile.location);

  let equipmentMatch = true;
  if (profile.equipment.length && equipment.length) {
    equipmentMatch = profile.equipment.some((item) => equipment.includes(item));
    if (profile.equipment.includes("nenhum") && equipment.includes("nenhum")) equipmentMatch = true;
  }

  return levelMatch && locationMatch && equipmentMatch;
};

const personalizeCards = (profile) => {
  if (!contentGrid) return;

  contentCards.forEach((card) => {
    const isMatch = matchesProfile(card, profile);
    card.classList.toggle("is-profile-match", isMatch);
    const badge = card.querySelector("[data-match-badge]");
    if (badge) badge.hidden = !isMatch;
  });

  [...contentCards]
    .sort((a, b) => Number(!matchesProfile(a, profile)) - Number(!matchesProfile(b, profile)))
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
    const active = button.dataset.workoutFilter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

filters.forEach((button) => {
  button.addEventListener("click", () => applyFilter(button.dataset.workoutFilter || "todos"));
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
      carregarConteudos("exercicio")
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
    const profile = renderProfile(userData, profileData, user);
    personalizeCards(profile);
    applyFilter("todos");

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar a área de exercícios:", error);
    window.location.replace("./portal.html");
  }
});
