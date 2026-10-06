import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { carregarConteudoPorId, carregarConteudos } from "./conteudos.js";
import { avaliarConteudo } from "./personalizacao.js";
import {
  construirSinaisComportamento,
  criarApresentacaoPersonalizada,
  criarIntroducaoPersonalizada,
  determinarEstagioUsuario,
  ordenarPorExperiencia,
  selecionarDiversificado
} from "./experiencia.js";
import {
  alternarFavorito,
  definirConclusao,
  listarBuscas,
  listarFavoritos,
  listarHistorico,
  listarProgresso,
  obterFavorito,
  obterProgresso,
  registrarVisualizacao,
  salvarProgresso
} from "./biblioteca-usuario.js";

const app = document.querySelector("[data-content-app]");
const loading = document.querySelector("[data-content-loading]");
const errorState = document.querySelector("[data-content-error]");
const logoutButton = document.querySelector("[data-logout]");
const hero = document.querySelector(".content-hero");
const heroVisual = document.querySelector(".content-hero-visual");
const favoriteButton = document.querySelector("[data-favorite-button]");
const completeButton = document.querySelector("[data-complete-button]");
const readingProgressBar = document.querySelector("[data-reading-progress-bar]");
const progressStatusBar = document.querySelector("[data-progress-status-bar]");
const progressLabel = document.querySelector("[data-progress-label]");

let currentUser = null;
let currentItem = null;
let currentProgress = 0;
let completed = false;
let lastPersistedProgress = 0;
let scrollTicking = false;
let currentProfileData = {};
let currentCatalog = [];
let currentExperienceContext = {};

const areaConfig = {
  alimentacao: { label: "Alimentação", url: "./alimentacao.html", typeLabel: "ALIMENTAÇÃO" },
  exercicio: { label: "Exercícios", url: "./exercicios.html", typeLabel: "EXERCÍCIO" },
  receita: { label: "Receitas", url: "./receitas.html", typeLabel: "RECEITA" },
  suco_detox: { label: "Sucos Detox", url: "./sucos.html", typeLabel: "SUCO DETOX" }
};

const categoryLabels = {
  cafe_manha: "Café da manhã", almoco: "Almoço", jantar: "Jantar", lanches: "Lanches",
  receitas_rapidas: "Receitas rápidas", marmitas: "Marmitas", sucos: "Sucos", suco_detox: "Sucos Detox",
  mobilidade: "Mobilidade", forca: "Força geral", cardio_leve: "Cardio leve",
  alongamento: "Alongamento", pausas_ativas: "Pausas ativas"
};

const create = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const setText = (selector, text) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = text || "";
};

const updateAreaLinks = (config) => {
  document.querySelectorAll("[data-area-link],[data-area-link-secondary],[data-area-link-tertiary]").forEach((link) => {
    link.href = config.url;
  });
  document.querySelectorAll("[data-area-link]").forEach((link) => { link.textContent = config.label; });
  setText("[data-area-label]", config.label);
};

const renderTags = (item) => {
  const target = document.querySelector("[data-content-tags]");
  if (!target) return;
  const values = [categoryLabels[item.categoria] || item.categoria, ...(item.tags || [])].filter(Boolean);
  target.innerHTML = "";
  [...new Set(values)].slice(0, 5).forEach((value) => target.append(create("span", "", value)));
};

const renderQuickFacts = (item) => {
  const target = document.querySelector("[data-content-facts]");
  if (!target) return;
  target.innerHTML = "";
  const facts = [
    ["Tempo", item.experiencia?.tempo],
    ["Nível", item.experiencia?.dificuldade],
    [item.tipo === "receita" ? "Rendimento" : "Formato", item.tipo === "receita" ? item.rendimento : item.experiencia?.formato],
    ...(item.categoria === "suco_detox" && item.perfil_sabor ? [["Perfil de sabor", item.perfil_sabor]] : [])
  ].filter(([, value]) => value);

  facts.forEach(([label, value]) => {
    const fact = create("div", "content-quick-fact");
    fact.append(create("span", "", label), create("strong", "", value));
    target.append(fact);
  });
  target.hidden = facts.length === 0;
};

const renderIngredients = (item) => {
  const fallback = document.querySelector("[data-content-ingredients]");
  const grid = document.querySelector("[data-content-ingredients-list]");
  if (!fallback || !grid) return;
  const ingredients = Array.isArray(item.ingredientes_lista) ? item.ingredientes_lista : [];
  grid.innerHTML = "";

  if (!ingredients.length) {
    fallback.hidden = false;
    fallback.textContent = item.ingredientes || "Ingredientes em atualização.";
    grid.hidden = true;
    return;
  }

  fallback.hidden = true;
  ingredients.forEach((ingredient) => {
    const row = create("div", "content-ingredient-item");
    const copy = create("div", "");
    copy.append(create("strong", "", ingredient.item));
    if (ingredient.observacao) copy.append(create("small", "", ingredient.observacao));
    row.append(copy, create("span", "", ingredient.quantidade || "a gosto"));
    grid.append(row);
  });
  grid.hidden = false;
};

const renderExerciseSteps = (item) => {
  const structured = document.querySelector("[data-content-exercise-steps]");
  const fallback = document.querySelector("[data-content-sequence]");
  if (!structured || !fallback) return;
  const steps = Array.isArray(item.etapas) ? item.etapas : [];
  structured.innerHTML = "";

  if (!steps.length) {
    structured.hidden = true;
    fallback.hidden = false;
    renderSteps("[data-content-sequence]", item.sequencia || []);
    return;
  }

  fallback.hidden = true;
  steps.forEach((step, index) => {
    const card = create("article", "content-exercise-step");
    const number = create("span", "content-exercise-step-number", String(index + 1).padStart(2, "0"));
    const body = create("div", "");
    const header = create("div", "content-exercise-step-header");
    header.append(create("h3", "", step.titulo || `Etapa ${index + 1}`));
    if (step.duracao) header.append(create("span", "", step.duracao));
    body.append(header, create("p", "", step.descricao || ""));
    card.append(number, body);
    structured.append(card);
  });
  structured.hidden = false;
};

const renderSteps = (selector, steps = []) => {
  const target = document.querySelector(selector);
  if (!target) return;
  target.innerHTML = "";
  steps.forEach((step) => target.append(create("li", "", step)));
};

const renderSections = (sections = []) => {
  const target = document.querySelector("[data-content-sections]");
  if (!target) return;
  target.innerHTML = "";
  sections.forEach((section) => {
    const block = create("section", "content-block");
    if (section.titulo) block.append(create("h2", "", section.titulo));
    if (section.texto) block.append(create("p", "", section.texto));
    if (section.itens?.length) {
      const list = create("ul", "content-info-list");
      section.itens.forEach((text) => list.append(create("li", "", text)));
      block.append(list);
    }
    target.append(block);
  });
};

const renderObservations = (observations = []) => {
  const note = document.querySelector("[data-content-note]");
  const list = document.querySelector("[data-content-observations]");
  if (!note || !list) return;
  list.innerHTML = "";
  observations.forEach((text) => list.append(create("li", "", text)));
  note.hidden = !observations.length;
};

const renderProfileMatch = (evaluation) => {
  const badge = document.querySelector("[data-recommended-badge]");
  const explanation = document.querySelector("[data-profile-explanation]");
  const list = document.querySelector("[data-match-list]");
  if (!evaluation || !list) return;

  const recommended = evaluation.recomendado && !evaluation.bloqueado;
  if (badge) badge.hidden = !recommended;
  if (explanation) {
    explanation.textContent = evaluation.bloqueado
      ? "Este conteúdo está disponível na biblioteca, mas não foi priorizado por causa das preferências ou restrições informadas no perfil."
      : recommended
        ? "Ele ganhou prioridade porque combina com informações que você registrou no seu perfil."
        : "Ele faz parte da biblioteca e pode ser explorado mesmo sem ser uma das primeiras recomendações para o seu perfil.";
  }

  list.innerHTML = "";
  const values = evaluation.bloqueado ? evaluation.alertas : evaluation.motivos;
  (values || []).slice(0, 4).forEach((text) => list.append(create("span", "", text)));
};

const renderRelated = (items, currentId, profileData, config, contexto = {}) => {
  const grid = document.querySelector("[data-related-grid]");
  if (!grid) return;
  grid.innerHTML = "";

  const ordered = ordenarPorExperiencia(
    items.filter((item) => item.id !== currentId),
    {
      usuarioId: contexto.usuarioId || "",
      profileData,
      sinais: contexto.sinais || null,
      estagio: contexto.estagio || { nivel: 0 }
    }
  ).filter((item) => !item.personalizacao?.bloqueado);

  const sameTheme = ordered.filter((item) => {
    if (currentItem?.categoria === "suco_detox") return item.categoria === "suco_detox";
    return item.tipo === currentItem?.tipo;
  });
  const discoveries = ordered.filter((item) => !sameTheme.some((same) => same.id === item.id));
  const sameCount = Number(contexto.estagio?.nivel || 0) >= 2 ? 1 : 2;
  const candidates = [...sameTheme.slice(0, sameCount), ...discoveries];
  const related = selecionarDiversificado(candidates, 3, { maxPorTipo: 2, maxPorCategoria: 1 });

  related.forEach((item) => {
    const link = create("a", "content-related-card");
    link.href = `./conteudo.html?id=${encodeURIComponent(item.id)}`;
    link.dataset.type = item.tipo || "";
    const cover = create("div", "content-related-cover");
    cover.append(create("span", "", item.icone || "✦"));
    if (item.imagem_url) {
      cover.classList.add("has-image");
      cover.style.backgroundImage = `linear-gradient(135deg, rgba(20,38,29,.08), rgba(20,38,29,.26)), url("${String(item.imagem_url).replaceAll('"', '%22')}")`;
    }
    link.append(cover);
    link.append(create("span", "", categoryLabels[item.categoria] || config.typeLabel));
    link.append(create("h3", "", item.titulo));
    link.append(create("p", "", item.experiencia_usuario?.motivo || item.resumo));
    link.append(create("strong", "", "Abrir conteúdo →"));
    grid.append(link);
  });
};
const renderJuiceMedia = (item) => {
  const section = document.querySelector("[data-juice-media-section]");
  if (!section) return;
  const isJuice = item.categoria === "suco_detox";
  section.hidden = !isJuice;
  if (!isJuice) return;

  const setSlot = (selector, url, alt, fallbackTitle, fallbackText) => {
    const slot = document.querySelector(selector);
    if (!slot) return;
    slot.classList.toggle("has-image", Boolean(url));
    if (url) {
      slot.style.backgroundImage = `linear-gradient(135deg, rgba(38,62,50,.03), rgba(38,62,50,.12)), url("${String(url).replaceAll('"', '%22')}")`;
      slot.setAttribute("role", "img");
      slot.setAttribute("aria-label", alt || fallbackTitle);
      slot.innerHTML = "";
    } else {
      slot.style.backgroundImage = "";
      slot.removeAttribute("role");
      slot.removeAttribute("aria-label");
      slot.innerHTML = `<strong>${fallbackTitle}</strong><small>${fallbackText}</small>`;
    }
  };

  const presentationUrl = item.midia?.imagem_apresentacao_url || item.imagem_url;
  const presentationCard = document.querySelector("[data-juice-presentation-card]");
  const readyCard = document.querySelector("[data-juice-ready-card]");
  const presentationLabel = document.querySelector("[data-juice-presentation-label]");
  section.classList.toggle("is-presentation", Boolean(presentationUrl));

  if (presentationUrl) {
    if (presentationCard) presentationCard.hidden = false;
    if (readyCard) readyCard.hidden = true;
    if (presentationLabel) presentationLabel.textContent = "APRESENTAÇÃO DA RECEITA";
    setSlot(
      "[data-juice-ingredients-image]",
      presentationUrl,
      item.midia?.imagem_apresentacao_alt || item.imagem_alt,
      "Apresentação da receita",
      item.midia?.legenda_apresentacao || "Ingredientes e bebida pronta na mesma imagem."
    );
    return;
  }

  if (presentationCard) presentationCard.hidden = false;
  if (readyCard) readyCard.hidden = false;
  if (presentationLabel) presentationLabel.textContent = "IMAGEM DOS INGREDIENTES";
  setSlot("[data-juice-ingredients-image]", item.midia?.imagem_ingredientes_url, item.midia?.imagem_ingredientes_alt, "Foto dos ingredientes", item.midia?.legenda_ingredientes || "Imagem dos ingredientes será inserida aqui.");
  setSlot("[data-juice-ready-image]", item.midia?.imagem_pronto_url, item.midia?.imagem_pronto_alt, "Foto do suco pronto", item.midia?.legenda_pronto || "Imagem do produto pronto será inserida aqui.");
};

const renderPersonalizedPresentation = (presentation = {}) => {
  const panel = document.querySelector("[data-personalized-panel]");
  const points = document.querySelector("[data-personalized-points]");
  const chips = document.querySelector("[data-personalized-chips]");

  if (!panel) return;
  panel.dataset.variant = presentation.variant || "geral";
  setText("[data-personalized-eyebrow]", presentation.eyebrow || "SUA VERSÃO DESTE CONTEÚDO");
  setText("[data-personalized-title]", presentation.titulo || "Veja este conteúdo do jeito que combina com sua rotina.");
  setText("[data-personalized-copy]", presentation.texto || "");
  setText("[data-personalized-stage]", presentation.notaEstagio || "");
  setText("[data-related-title]", presentation.relatedTitle || "Outros conteúdos para você");
  setText("[data-recipe-prep-title]", presentation.recipePrepTitle || "Passo a passo");
  setText("[data-exercise-steps-title]", presentation.exerciseStepsTitle || "Uma sequência simples");
  setText("[data-ingredients-title]", presentation.ingredientsTitle || "Ingredientes-base");

  if (chips) {
    chips.innerHTML = "";
    (presentation.chips || []).forEach((text) => chips.append(create("span", "", text)));
    chips.hidden = !(presentation.chips || []).length;
  }

  if (points) {
    points.innerHTML = "";
    (presentation.pontos || []).forEach((text) => points.append(create("li", "", text)));
    points.hidden = !(presentation.pontos || []).length;
  }
};

const refreshPersonalizedPresentation = () => {
  if (!currentItem) return;
  const evaluation = avaliarConteudo(currentItem, currentProfileData);
  const presentation = criarApresentacaoPersonalizada(currentItem, currentProfileData, {
    ...currentExperienceContext,
    avaliacao: evaluation
  });
  renderPersonalizedPresentation(presentation);
  setText("[data-content-intro]", criarIntroducaoPersonalizada(currentItem, currentProfileData, currentExperienceContext));
};

const renderContent = (item, profileData, catalogo, contexto = {}) => {
  const config = item.categoria === "suco_detox" ? areaConfig.suco_detox : (areaConfig[item.tipo] || areaConfig.alimentacao);
  const themeKey = item.categoria === "suco_detox" ? "suco_detox" : item.tipo;
  const theme = {
    alimentacao: { accent: "#22C55E", soft: "rgba(34,197,94,.08)" },
    exercicio: { accent: "#F97316", soft: "rgba(249,115,22,.09)" },
    receita: { accent: "#00C2A8", soft: "rgba(0,194,168,.09)" },
    suco_detox: { accent: "#84CC16", soft: "rgba(132,204,22,.10)" }
  }[themeKey] || { accent: "#22C55E", soft: "rgba(34,197,94,.08)" };
  document.documentElement.style.setProperty("--content-accent", theme.accent);
  document.documentElement.style.setProperty("--content-soft", theme.soft);
  if (hero) hero.dataset.contentTheme = item.tipo;
  updateAreaLinks(config);

  if (heroVisual && item.imagem_url) {
    heroVisual.classList.add("has-image");
    heroVisual.style.backgroundImage = `linear-gradient(135deg, rgba(38,62,50,.06), rgba(38,62,50,.28)), url("${String(item.imagem_url).replaceAll('"', '%22')}")`;
    heroVisual.setAttribute("role", "img");
    heroVisual.setAttribute("aria-label", item.imagem_alt || `Imagem ilustrativa para ${item.titulo}`);
    heroVisual.removeAttribute("aria-hidden");
  }

  document.title = `${item.titulo} | Active Vida Leve`;
  setText("[data-content-type]", config.typeLabel);
  setText("[data-content-title]", item.titulo);
  setText("[data-breadcrumb-title]", item.titulo);
  setText("[data-content-summary]", item.resumo);
  setText("[data-content-icon]", item.icone || "✦");
  const evaluation = avaliarConteudo(item, profileData);
  const presentation = criarApresentacaoPersonalizada(item, profileData, {
    ...contexto,
    avaliacao: evaluation
  });
  setText("[data-content-intro]", criarIntroducaoPersonalizada(item, profileData, contexto));
  renderPersonalizedPresentation(presentation);
  renderTags(item);
  renderQuickFacts(item);
  renderJuiceMedia(item);

  const recipe = document.querySelector("[data-recipe-section]");
  const exercise = document.querySelector("[data-exercise-section]");
  if (recipe) recipe.hidden = item.tipo !== "receita" || (!item.ingredientes && !item.ingredientes_lista?.length && !item.preparo?.length);
  if (exercise) exercise.hidden = item.tipo !== "exercicio" || (!item.sequencia?.length && !item.etapas?.length);
  if (item.tipo === "receita") {
    renderIngredients(item);
    renderSteps("[data-content-preparation]", item.preparo || []);
  }
  if (item.tipo === "exercicio") renderExerciseSteps(item);

  renderSections(item.secoes || []);
  renderObservations(item.observacoes || []);
  renderProfileMatch(evaluation);
  renderRelated(catalogo, item.id, profileData, config, contexto);
};

const updateProgressUI = (progress = 0, status = "novo") => {
  const value = status === "concluido" ? 100 : Math.max(0, Math.min(100, Math.round(progress || 0)));
  currentProgress = value;
  completed = status === "concluido";

  if (readingProgressBar) readingProgressBar.style.width = `${value}%`;
  if (progressStatusBar) progressStatusBar.style.width = `${value}%`;
  if (progressLabel) {
    progressLabel.textContent = completed
      ? "Conteúdo concluído"
      : value > 0
        ? `${value}% explorado`
        : "Novo conteúdo";
  }
  if (completeButton) {
    completeButton.classList.toggle("is-complete", completed);
    completeButton.setAttribute("aria-pressed", String(completed));
    completeButton.textContent = completed ? "✓ Conteúdo concluído" : "✓ Marcar como concluído";
  }
};

const calcularProgressoLeitura = () => {
  const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.max(0, Math.min(100, Math.round((window.scrollY / total) * 100)));
};

const setupReadingProgress = () => {
  const checkpoints = [20, 40, 60, 80, 95];
  window.addEventListener("scroll", () => {
    if (completed || scrollTicking || !currentUser || !currentItem) return;
    scrollTicking = true;
    window.requestAnimationFrame(async () => {
      scrollTicking = false;
      const live = calcularProgressoLeitura();
      const display = Math.max(currentProgress, live);
      updateProgressUI(display, "em_andamento");

      const checkpoint = [...checkpoints].reverse().find((value) => live >= value && value > lastPersistedProgress);
      if (!checkpoint) return;
      lastPersistedProgress = checkpoint;
      try {
        await salvarProgresso(currentUser.uid, currentItem, checkpoint);
      } catch (error) {
        console.warn("Não foi possível salvar o progresso de leitura.", error);
      }
    });
  }, { passive: true });
};

favoriteButton?.addEventListener("click", async () => {
  if (!currentUser || !currentItem) return;
  favoriteButton.disabled = true;
  try {
    const saved = await alternarFavorito(currentUser.uid, currentItem);
    favoriteButton.classList.toggle("is-favorite", saved);
    favoriteButton.setAttribute("aria-pressed", String(saved));
    favoriteButton.textContent = saved ? "♥ Salvo nos favoritos" : "♡ Salvar nos favoritos";
    currentExperienceContext = { ...currentExperienceContext, favorito: saved };
    refreshPersonalizedPresentation();
  } catch (error) {
    console.error("Erro ao atualizar favorito:", error);
  } finally {
    favoriteButton.disabled = false;
  }
});

completeButton?.addEventListener("click", async () => {
  if (!currentUser || !currentItem) return;
  completeButton.disabled = true;
  try {
    const nextCompleted = !completed;
    const liveProgress = Math.max(currentProgress, calcularProgressoLeitura());
    await definirConclusao(currentUser.uid, currentItem, nextCompleted, liveProgress);
    lastPersistedProgress = nextCompleted ? 100 : Math.min(95, liveProgress);
    const nextStatus = nextCompleted ? "concluido" : "em_andamento";
    updateProgressUI(nextCompleted ? 100 : liveProgress, nextStatus);
    currentExperienceContext = { ...currentExperienceContext, status: nextStatus };
    refreshPersonalizedPresentation();
  } catch (error) {
    console.error("Erro ao atualizar conclusão do conteúdo:", error);
  } finally {
    completeButton.disabled = false;
  }
});

logoutButton?.addEventListener("click", async () => {
  try { await signOut(auth); } finally { window.location.replace("./index.html?login=1"); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("./index.html?login=1");
    return;
  }

  currentUser = user;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    if (loading) loading.hidden = true;
    if (errorState) errorState.hidden = false;
    return;
  }

  try {
    const [userSnapshot, profileSnapshot, contentResult] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid)),
      carregarConteudoPorId(id)
    ]);

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";

    if (!productionAccess && !testAccess) {
      window.location.replace("./pagamento.html");
      return;
    }

    const item = contentResult.item;
    if (!item) {
      if (loading) loading.hidden = true;
      if (errorState) errorState.hidden = false;
      return;
    }

    currentItem = item;

    const [
      alimentacaoResult,
      exerciciosResult,
      receitasResult,
      favoriteResult,
      progressResult,
      favoritesListResult,
      historyListResult,
      progressListResult,
      searchesListResult
    ] = await Promise.allSettled([
      carregarConteudos("alimentacao"),
      carregarConteudos("exercicio"),
      carregarConteudos("receita"),
      obterFavorito(user.uid, item.id),
      obterProgresso(user.uid, item.id),
      listarFavoritos(user.uid),
      listarHistorico(user.uid, 16),
      listarProgresso(user.uid),
      listarBuscas(user.uid, 12)
    ]);

    const catalogo = [
      ...(alimentacaoResult.status === "fulfilled" ? alimentacaoResult.value.itens : []),
      ...(exerciciosResult.status === "fulfilled" ? exerciciosResult.value.itens : []),
      ...(receitasResult.status === "fulfilled" ? receitasResult.value.itens : [])
    ];

    const favoritos = favoritesListResult.status === "fulfilled" ? favoritesListResult.value : [];
    const historico = historyListResult.status === "fulfilled" ? historyListResult.value : [];
    const progressoLista = progressListResult.status === "fulfilled" ? progressListResult.value : [];
    const buscas = searchesListResult.status === "fulfilled" ? searchesListResult.value : [];
    const sinais = construirSinaisComportamento({ catalogo, favoritos, historico, progresso: progressoLista, buscas });
    const estagio = determinarEstagioUsuario({ favoritos, historico, progresso: progressoLista, buscas });
    const saved = favoriteResult.status === "fulfilled" ? favoriteResult.value : false;
    const progress = progressResult.status === "fulfilled" ? progressResult.value : null;
    const status = progress?.status || "novo";

    currentProfileData = profileData;
    currentCatalog = catalogo.length ? catalogo : [item];
    currentExperienceContext = {
      usuarioId: user.uid,
      sinais,
      estagio,
      favorito: saved,
      status
    };

    renderContent(item, profileData, currentCatalog, currentExperienceContext);

    if (favoriteButton) {
      favoriteButton.classList.toggle("is-favorite", saved);
      favoriteButton.setAttribute("aria-pressed", String(saved));
      favoriteButton.textContent = saved ? "♥ Salvo nos favoritos" : "♡ Salvar nos favoritos";
    }
    if (favoriteResult.status === "rejected") console.warn("Favorito indisponível.", favoriteResult.reason);

    if (progressResult.status === "fulfilled") {
      lastPersistedProgress = Number(progress?.progresso || 0);
      updateProgressUI(lastPersistedProgress, status);
    } else {
      console.warn("Progresso indisponível até as novas regras do Firestore serem publicadas.", progressResult.reason);
      updateProgressUI(0, "novo");
    }

    const historyResult = await Promise.allSettled([registrarVisualizacao(user.uid, item)]);
    if (historyResult[0].status === "rejected") console.warn("Histórico indisponível.", historyResult[0].reason);

    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
    setupReadingProgress();
  } catch (error) {
    console.error("Erro ao carregar conteúdo individual:", error);
    if (loading) loading.hidden = true;
    if (errorState) errorState.hidden = false;
  }
});
