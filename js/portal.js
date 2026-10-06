import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { carregarConteudos } from "./conteudos.js";
import { criarFatosConteudo } from "./interface-biblioteca.js";
import { montarExperienciaHome, montarRoteiroSemanal } from "./experiencia.js";
import {
  alternarFavorito,
  listarFavoritos,
  listarHistorico,
  listarProgresso,
  listarBuscas,
  obterRoteiroSemanal,
  salvarRoteiroSemanal
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
let progressMap = new Map();

const mappings = {
  nivel_exercicio: { iniciante: "Iniciante", intermediario: "Intermediário", experiente: "Experiente" },
  dias_exercicio: { "1_2": "1–2 dias/semana", "3_4": "3–4 dias/semana", "5_mais": "5+ dias/semana" },
  duracao_treino: { ate_15: "Até 15 min", "15_30": "15–30 min", "30_45": "30–45 min", mais_45: "45+ min" },
  perfil_alimentar: { variada: "Variada", vegetariana: "Vegetariana", vegana: "Vegana", outra: "Outra" },
  local_exercicio: { casa: "Em casa", academia: "Academia", ar_livre: "Ao ar livre", variado: "Locais variados", varia: "Locais variados" }
};

const typeLabels = { alimentacao: "Alimentação", exercicio: "Exercício", receita: "Receita" };
const mapped = (field, value) => mappings[field]?.[value] || value || "Não informado";
const titleCase = (value = "") => String(value).replace(/_/g, " ").replace(/\b\p{L}/gu, (char) => char.toUpperCase());
const redirectToPayment = () => window.location.replace("./pagamento.html");
const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value || ""; };
const getItemId = (item = {}) => String(item.conteudo_id || item.id || "").trim();
const score = (item = {}) => Number(item.experiencia_usuario?.pontuacao ?? item.personalizacao?.pontuacao ?? 0);

const saudacaoAtual = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};


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
  kind.textContent = item.categoria === "suco_detox" ? "Suco Detox" : (typeLabels[item.tipo] || "Conteúdo");
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
  const motive = options.reason || item.experiencia_usuario?.motivo || item.personalizacao?.motivos?.[0];
  reason.textContent = motive ? titleCase(motive) : "Selecionado para o seu momento";
  const link = document.createElement("a");
  link.href = `./conteudo.html?id=${encodeURIComponent(id)}`;
  link.textContent = options.action || (progress?.status === "em_andamento" ? "Continuar →" : "Abrir conteúdo →");

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
    meta.textContent = options.progress
      ? (item.status === "concluido" ? "Concluído" : `${Number(item.progresso || 0)}% explorado`)
      : (item.categoria === "suco_detox" ? "Suco Detox" : (typeLabels[item.tipo] || "Conteúdo"));
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

const setRecommendation = (selector, item, fallback) => {
  const card = document.querySelector(selector);
  if (!card) return;
  const kicker = card.querySelector(".portal-rec-kicker");
  const icon = card.querySelector(".portal-rec-icon");
  const heading = card.querySelector("h3");
  const paragraph = card.querySelector("p");
  const link = card.querySelector("a");

  if (!item) {
    if (kicker) kicker.textContent = fallback.kicker;
    if (icon) icon.textContent = fallback.icon;
    if (heading) heading.textContent = fallback.title;
    if (paragraph) paragraph.textContent = fallback.text;
    if (link) { link.href = fallback.href; link.firstChild.textContent = fallback.action; }
    return;
  }

  const label = item.categoria === "suco_detox" ? "SUCO DETOX" : (typeLabels[item.tipo] || "CONTEÚDO").toUpperCase();
  if (kicker) kicker.textContent = label;
  if (icon) icon.textContent = item.icone || "✦";
  if (heading) heading.textContent = item.titulo;
  if (paragraph) paragraph.textContent = item.experiencia_usuario?.motivo ? `${item.experiencia_usuario.motivo}. ${item.resumo}` : item.resumo;
  if (link) {
    link.href = `./conteudo.html?id=${encodeURIComponent(getItemId(item))}`;
    link.firstChild.textContent = item.tipo === "receita" ? "Ver receita " : "Abrir conteúdo ";
  }
};

const renderToday = (experience) => {
  const exercise = experience.hoje?.exercicio || experience.secoes.exercise[0];
  const food = experience.hoje?.alimentacao || [...experience.secoes.recipe, ...experience.secoes.food, ...experience.secoes.juice].sort((a, b) => score(b) - score(a))[0];
  const discovery = experience.hoje?.descoberta || experience.secoes.personalized[0];

  setRecommendation(".portal-rec-move", exercise, {
    kicker: "MOVIMENTO", icon: "↔", title: "Movimento no seu ritmo",
    text: "Conteúdos são escolhidos de acordo com seu nível e tempo disponível.", href: "./exercicios.html", action: "Explorar exercícios "
  });
  setRecommendation(".portal-rec-food", food, {
    kicker: "ALIMENTAÇÃO", icon: "◒", title: "Ideias práticas para o dia a dia",
    text: "Receitas e conteúdos são organizados conforme seus interesses.", href: "./alimentacao.html", action: "Explorar alimentação "
  });
  setRecommendation(".portal-rec-routine", discovery, {
    kicker: "MINHA ROTINA", icon: "✓", title: "Seu perfil em um só lugar",
    text: "Consulte objetivos e preferências usados para organizar sua experiência.", href: "./rotina.html", action: "Ver minha rotina "
  });
};


const renderWeeklySection = (week = null) => {
  const section = document.querySelector('[data-section-key="week"]');
  const grid = document.querySelector("[data-week-grid]");
  if (!section || !grid || !week?.itens?.length) {
    if (section) section.hidden = true;
    return;
  }

  setText("[data-week-title]", week.titulo);
  setText("[data-week-description]", week.descricao);
  setText("[data-week-period]", week.periodo ? `Semana: ${week.periodo}` : "Esta semana");
  setText("[data-week-summary]", week.resumo);

  grid.innerHTML = "";
  week.itens.forEach((item) => {
    const card = createContentCard(item, {
      reason: item.experiencia_usuario?.motivo,
      action: progressMap.get(getItemId(item))?.status === "em_andamento" ? "Continuar →" : "Explorar →"
    });
    if (!card) return;
    card.classList.add("portal-week-card");
    const role = document.createElement("span");
    role.className = "portal-week-role";
    role.textContent = item.roteiro_semana?.rotulo || "PARA VOCÊ";
    const cover = card.querySelector(".portal-content-cover");
    if (cover) cover.append(role);
    grid.append(card);
  });

  section.hidden = false;
};

const renderContinueSection = (progress = [], catalogMap = new Map()) => {
  const section = document.querySelector("[data-continue-section]");
  if (!section) return;
  const inProgress = progress
    .filter((item) => item.status === "em_andamento" && Number(item.progresso || 0) > 0)
    .map((item) => ({ ...(catalogMap.get(getItemId(item)) || item), ...item, id: getItemId(item) }))
    .sort((a, b) => Number(b.progresso || 0) - Number(a.progresso || 0));
  if (!inProgress.length) { section.hidden = true; return; }
  renderContentGrid("[data-continue-grid]", inProgress, { limit: 4, action: "Continuar →" });
  section.hidden = false;
};

const applyExperienceText = (experience) => {
  setText("[data-hero-eyebrow]", experience.textos.heroEyebrow);
  setText("[data-hero-description]", experience.textos.heroText);
  setText("[data-experience-stage]", experience.textos.stageLabel);
  setText("[data-personalized-eyebrow]", experience.textos.personalizedEyebrow);
  setText("[data-personalized-title]", experience.textos.personalizedTitle);
  setText("[data-continue-title]", experience.textos.continueTitle);
  setText("[data-exercise-shelf-title]", experience.textos.exerciseTitle);
  setText("[data-recipe-shelf-title]", experience.textos.recipeTitle);
  setText("[data-juice-shelf-title]", experience.textos.juiceTitle);
  setText("[data-food-shelf-title]", experience.textos.foodTitle);
};

const reorderSections = (order = []) => {
  if (!app) return;
  order.forEach((key) => {
    const section = app.querySelector(`[data-section-key="${key}"]`);
    if (section) app.append(section);
  });
};

const setSectionVisible = (key, visible) => {
  const section = document.querySelector(`[data-section-key="${key}"]`);
  if (section) section.hidden = !visible;
};

const renderCompletionState = (experience) => {
  const section = document.querySelector('[data-section-key="complete"]');
  if (!section) return;
  section.hidden = !experience.bibliotecaEsgotada;
  if (!experience.bibliotecaEsgotada) return;
  setText("[data-complete-title]", "Você explorou toda a biblioteca atual.");
  setText("[data-complete-text]", "Seus conteúdos concluídos continuam na sua biblioteca. Quando novos conteúdos forem adicionados, eles voltarão a aparecer automaticamente nas recomendações personalizadas.");
};

const renderExperience = (experience, progress, catalogMap) => {
  applyExperienceText(experience);
  renderCompletionState(experience);

  setSectionVisible("today", !experience.bibliotecaEsgotada);
  if (!experience.bibliotecaEsgotada) renderToday(experience);

  renderWeeklySection(experience.semana);
  renderContentGrid("[data-personalized-grid]", experience.secoes.personalized, { limit: 4 });
  renderContentGrid("[data-exercise-shelf]", experience.secoes.exercise, { limit: 4, action: "Ver exercício →" });
  renderContentGrid("[data-recipe-shelf]", experience.secoes.recipe, { limit: 4, action: "Ver receita →" });
  renderContentGrid("[data-juice-shelf]", experience.secoes.juice, { limit: 4, action: "Ver suco →" });
  renderContentGrid("[data-food-shelf]", experience.secoes.food, { limit: 4, action: "Ler conteúdo →" });

  setSectionVisible("personalized", experience.secoes.personalized.length > 0);
  setSectionVisible("exercise", experience.secoes.exercise.length > 0);
  setSectionVisible("recipe", experience.secoes.recipe.length > 0);
  setSectionVisible("juice", experience.secoes.juice.length > 0);
  setSectionVisible("food", experience.secoes.food.length > 0);

  renderContinueSection(progress, catalogMap);
  reorderSections(experience.sectionOrder);
};

logoutButton?.addEventListener("click", async () => {
  try { await signOut(auth); } finally { window.location.replace("./index.html?login=1"); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.replace("./index.html?login=1"); return; }
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
    setText("[data-greeting]", saudacaoAtual());
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
    let searches = [];
    const [favoritesResult, historyResult, progressResult, searchesResult] = await Promise.allSettled([
      listarFavoritos(user.uid),
      listarHistorico(user.uid, 20),
      listarProgresso(user.uid),
      listarBuscas(user.uid, 12)
    ]);
    if (favoritesResult.status === "fulfilled") favorites = favoritesResult.value;
    else console.warn("Favoritos indisponíveis.", favoritesResult.reason);
    if (historyResult.status === "fulfilled") history = historyResult.value;
    else console.warn("Histórico indisponível.", historyResult.reason);
    if (progressResult.status === "fulfilled") progress = progressResult.value;
    else console.warn("Progresso indisponível até as regras do Firestore serem publicadas.", progressResult.reason);
    if (searchesResult.status === "fulfilled") searches = searchesResult.value;
    else console.warn("Sinais de busca indisponíveis até as regras do Firestore serem publicadas.", searchesResult.reason);

    favoriteIds = new Set(favorites.map(getItemId));
    progressMap = new Map(progress.map((item) => [getItemId(item), item]));

    const catalog = [...foodResult.itens, ...exerciseResult.itens, ...recipeResult.itens];
    const catalogMap = new Map(catalog.map((item) => [getItemId(item), item]));
    const experience = montarExperienciaHome({
      usuarioId: user.uid,
      nome: name,
      profileData,
      catalogo: catalog,
      favoritos: favorites,
      historico: history,
      progresso: progress,
      buscas: searches
    });

    try {
      const salvo = await obterRoteiroSemanal(user.uid, experience.semana.id);
      const roteiroCompatível = salvo?.conteudos?.length
        && salvo.assinatura_perfil
        && salvo.assinatura_perfil === experience.semana.assinatura_perfil;

      if (roteiroCompatível) {
        experience.semana = montarRoteiroSemanal({
          usuarioId: user.uid,
          profileData,
          ordenados: experience.ordenados,
          sinais: experience.sinais,
          estagio: experience.estagio,
          idsFixos: salvo.conteudos
        });
      } else if (experience.semana.ids.length) {
        salvarRoteiroSemanal(user.uid, experience.semana).catch((error) => {
          console.warn("Roteiro semanal não persistido até as regras do Firestore serem publicadas.", error);
        });
      }
    } catch (error) {
      console.warn("Roteiro semanal indisponível; usando seleção calculada localmente.", error);
    }

    renderExperience(experience, progress, catalogMap);
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
