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

const app = document.querySelector("[data-workout-app]");
const loading = document.querySelector("[data-workout-loading]");
const logoutButton = document.querySelector("[data-logout]");
const profileChips = document.querySelector("[data-workout-profile-chips]");
const contentGrid = document.querySelector("[data-workout-content-grid]");
const filters = [...document.querySelectorAll("[data-workout-filter]")];
const emptyState = document.querySelector("[data-workout-empty]");
let contentCards = [];
let currentUserId = null;
let favoriteIds = new Set();
let progressMap = new Map();

const labels = {
  nivel_exercicio: { iniciante: "Iniciante", intermediario: "Intermediário", experiente: "Experiente" },
  dias_exercicio: { "1_2": "1–2 dias/semana", "3_4": "3–4 dias/semana", "5_mais": "5+ dias/semana" },
  duracao_treino: { ate_15: "Até 15 min", "15_30": "15–30 min", "30_45": "30–45 min", mais_45: "Mais de 45 min" },
  local_exercicio: { casa: "Em casa", academia: "Academia", ar_livre: "Ao ar livre", variado: "Locais variados", varia: "Locais variados" },
  equipamentos: { nenhum: "Nenhum", halteres: "Halteres", elasticos: "Elásticos", colchonete: "Colchonete", academia: "Academia", equipamentos_academia: "Academia", outros: "Outros" },
  objetivos: {
    movimentar_mais: "Me movimentar mais",
    melhorar_condicionamento: "Melhorar meu condicionamento",
    condicionamento: "Melhorar meu condicionamento",
    constancia_exercicios: "Criar constância nos exercícios",
    organizar_alimentacao: "Organizar melhor minha alimentação",
    receitas_praticas: "Aprender receitas práticas",
    variar_refeicoes: "Ter mais variedade nas refeições",
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

    const recommended = item.personalizacao?.recomendado === true && !item.personalizacao?.bloqueado;
    article.classList.toggle("is-profile-match", recommended);
    if (item.personalizacao?.motivos?.length) {
      article.title = `Por que aparece aqui: ${item.personalizacao.motivos.join("; ")}.`;
    }

    const visual = createElement("div", "workout-card-visual");
    const visualIcon = createElement("span", "", item.icone || "✦");
    visualIcon.setAttribute("aria-hidden", "true");
    visual.append(visualIcon);
    aplicarCapa(visual, item);
    if (currentUserId) {
      const favorite = criarBotaoFavorito({ usuarioId: currentUserId, item, favoritos: favoriteIds, className: "workout-card-favorite" });
      visual.append(favorite);
    }

    const body = createElement("div", "workout-card-body");
    const meta = createElement("div", "workout-card-meta");
    meta.append(createElement("span", "", getLabel("categorias", item.categoria)));
    const badge = createElement("i", "", "Recomendado para você");
    badge.dataset.matchBadge = "";
    badge.hidden = !recommended;
    meta.append(badge);
    const progressState = criarEstadoProgresso(item, progressMap, "workout-card-progress");
    if (progressState) meta.append(progressState);

    body.append(meta);
    body.append(createElement("h3", "", item.titulo));
    body.append(createElement("p", "", item.resumo));
    const facts = criarFatosConteudo(item, "workout-card-facts");
    if (facts) body.append(facts);

    const tags = createElement("div", "workout-card-tags");
    (item.tags || []).slice(0, 3).forEach((tag) => tags.append(createElement("span", "", tag)));
    if (!tags.children.length) tags.append(createElement("span", "", "Conteúdo geral"));
    body.append(tags);

    const link = createElement("a", "workout-card-link", "Abrir conteúdo →");
    link.href = `./conteudo.html?id=${encodeURIComponent(item.id)}`;
    link.setAttribute("aria-label", `Abrir ${item.titulo}`);
    body.append(link);

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

  currentUserId = user.uid;
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

    const [favoritesResult, progressResult] = await Promise.allSettled([listarFavoritos(user.uid), listarProgresso(user.uid)]);
    if (favoritesResult.status === "fulfilled") favoriteIds = new Set(favoritesResult.value.map((item) => item.conteudo_id || item.id));
    else console.warn("Favoritos indisponíveis.", favoritesResult.reason);
    if (progressResult.status === "fulfilled") progressMap = new Map(progressResult.value.map((item) => [item.conteudo_id || item.id, item]));
    else console.warn("Progresso indisponível até as novas regras do Firestore serem publicadas.", progressResult.reason);

    const personalized = personalizarConteudos(contentResult.itens, profileData);
    renderContentCards(personalized);
    renderProfile(userData, profileData, user);
    applyFilter("todos");

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar a área de exercícios:", error);
    window.location.replace("./portal.html");
  }
});
