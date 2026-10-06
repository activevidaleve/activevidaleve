import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { carregarConteudos } from "./conteudos.js";
import { criarFatosConteudo } from "./interface-biblioteca.js";
import { alternarFavorito, listarFavoritos, listarHistorico, listarProgresso, listarBuscas, registrarBusca } from "./biblioteca-usuario.js";
import { construirSinaisComportamento, determinarEstagioUsuario, ordenarPorExperiencia } from "./experiencia.js";

const app = document.querySelector("[data-search-app]");
const loading = document.querySelector("[data-search-loading]");
const form = document.querySelector("[data-search-form]");
const input = document.querySelector("[data-search-input]");
const results = document.querySelector("[data-search-results]");
const empty = document.querySelector("[data-search-empty]");
const count = document.querySelector("[data-search-count]");
const title = document.querySelector("[data-search-title]");
const logoutButton = document.querySelector("[data-logout]");
const typeButtons = [...document.querySelectorAll("[data-search-type]")];
const favoritesButton = document.querySelector("[data-search-favorites]");
const completedButton = document.querySelector("[data-search-completed]");

let currentUser = null;
let profileData = {};
let allItems = [];
let favoriteIds = new Set();
let progressMap = new Map();
let activeType = "todos";
let favoritesOnly = false;
let completedOnly = false;

const typeLabels = { alimentacao: "ALIMENTAÇÃO", exercicio: "EXERCÍCIO", receita: "RECEITA" };
const normalizeText = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const raizBusca = (value = "") => {
  let word = normalizeText(value).replace(/[^a-z0-9]+/g, "");
  if (word.length >= 5 && word.endsWith("s")) word = word.slice(0, -1);
  if (word.length >= 5 && /[ao]$/.test(word)) word = word.slice(0, -1);
  return word;
};
const termosBusca = (value = "") => normalizeText(value)
  .split(/[^a-z0-9]+/)
  .map(raizBusca)
  .filter((word) => word.length >= 2);
const searchable = (item) => normalizeText([
  item.titulo,
  item.resumo,
  item.categoria,
  item.tipo,
  ...(item.tags || []),
  item.experiencia?.tempo,
  item.experiencia?.dificuldade,
  item.rendimento,
  ...(item.ingredientes_lista || []).map((ingrediente) => ingrediente.item),
  ...(item.publico?.objetivos || []),
  ...(item.publico?.interesses || [])
].filter(Boolean).join(" "));
const categoryLabel = (value = "") => value.replace(/_/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());

const setFavoriteButton = (button, id) => {
  const saved = favoriteIds.has(id);
  button.classList.toggle("is-favorite", saved);
  button.setAttribute("aria-label", saved ? "Remover dos favoritos" : "Salvar nos favoritos");
  button.setAttribute("aria-pressed", String(saved));
  button.textContent = saved ? "♥" : "♡";
};

const render = () => {
  const term = normalizeText(input?.value || "");
  const visible = allItems.filter((item) => {
    if (activeType !== "todos" && item.tipo !== activeType) return false;
    if (favoritesOnly && !favoriteIds.has(item.id)) return false;
    if (completedOnly && progressMap.get(item.id)?.status !== "concluido") return false;
    if (term) {
      const haystack = searchable(item);
      const palavras = new Set(termosBusca(haystack));
      const queryWords = termosBusca(term);
      if (!queryWords.every((word) => palavras.has(word))) return false;
    }
    return true;
  });

  if (results) results.innerHTML = "";
  visible.forEach((item) => {
    const card = document.createElement("article");
    card.className = "search-card";
    card.dataset.type = item.tipo;

    const cover = document.createElement("div");
    cover.className = "search-card-cover";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.icone || "✦";
    cover.append(icon);
    if (item.imagem_url) {
      cover.classList.add("has-image");
      cover.style.backgroundImage = `linear-gradient(135deg, rgba(38,62,50,.04), rgba(38,62,50,.24)), url("${String(item.imagem_url).replaceAll('"', '%22')}")`;
    }

    const top = document.createElement("div");
    top.className = "search-card-top";
    const type = document.createElement("span");
    type.className = "search-card-type";
    type.textContent = typeLabels[item.tipo] || "CONTEÚDO";

    const actions = document.createElement("div");
    actions.className = "search-card-actions";
    const progress = progressMap.get(item.id);
    if (progress) {
      const state = document.createElement("span");
      state.className = "search-card-state";
      state.textContent = progress.status === "concluido" ? "✓ Concluído" : `${Number(progress.progresso || 0)}%`;
      actions.append(state);
    }

    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "search-card-favorite";
    setFavoriteButton(favorite, item.id);
    favorite.addEventListener("click", async () => {
      if (!currentUser) return;
      favorite.disabled = true;
      try {
        const saved = await alternarFavorito(currentUser.uid, item);
        if (saved) favoriteIds.add(item.id); else favoriteIds.delete(item.id);
        setFavoriteButton(favorite, item.id);
        if (favoritesOnly && !saved) render();
      } catch (error) {
        console.error("Erro ao atualizar favorito:", error);
      } finally {
        favorite.disabled = false;
      }
    });
    actions.append(favorite);
    top.append(type, actions);

    const heading = document.createElement("h3");
    heading.textContent = item.titulo;
    const summary = document.createElement("p");
    summary.textContent = item.resumo;
    const facts = criarFatosConteudo(item, "search-card-facts");
    const meta = document.createElement("div");
    meta.className = "search-card-meta";
    [categoryLabel(item.categoria), ...(item.personalizacao?.motivos || []).slice(0, 1)].filter(Boolean).forEach((value) => {
      const chip = document.createElement("span");
      chip.textContent = value;
      meta.append(chip);
    });
    const link = document.createElement("a");
    link.href = `./conteudo.html?id=${encodeURIComponent(item.id)}`;
    link.textContent = progress?.status === "em_andamento" ? "Continuar conteúdo →" : "Abrir conteúdo →";
    link.addEventListener("click", (event) => {
      const rawTerm = input?.value?.trim() || "";
      if (!currentUser || rawTerm.length < 2) return;
      event.preventDefault();
      const destination = link.href;
      Promise.race([
        registrarBusca(currentUser.uid, rawTerm).catch(() => null),
        new Promise((resolve) => setTimeout(resolve, 220))
      ]).finally(() => { window.location.href = destination; });
    });
    card.append(cover, top, heading, summary);
    if (facts) card.append(facts);
    card.append(meta, link);
    results?.append(card);
  });

  if (count) count.textContent = `${visible.length} ${visible.length === 1 ? "conteúdo" : "conteúdos"}`;
  if (title) {
    title.textContent = term
      ? `Resultados para “${input.value.trim()}”`
      : completedOnly
        ? "Conteúdos concluídos"
        : favoritesOnly
          ? "Seus favoritos"
          : "Conteúdos para explorar";
  }
  if (empty) empty.hidden = visible.length > 0;
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  render();
  const rawTerm = input?.value?.trim() || "";
  if (currentUser && rawTerm.length >= 2) {
    try { await registrarBusca(currentUser.uid, rawTerm); }
    catch (error) { console.warn("Não foi possível registrar a busca.", error); }
  }
});
input?.addEventListener("input", render);

typeButtons.forEach((button) => button.addEventListener("click", () => {
  activeType = button.dataset.searchType || "todos";
  typeButtons.forEach((candidate) => {
    const active = candidate === button;
    candidate.classList.toggle("is-active", active);
    candidate.setAttribute("aria-pressed", String(active));
  });
  render();
}));

favoritesButton?.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  favoritesButton.classList.toggle("is-active", favoritesOnly);
  favoritesButton.setAttribute("aria-pressed", String(favoritesOnly));
  render();
});

completedButton?.addEventListener("click", () => {
  completedOnly = !completedOnly;
  completedButton.classList.toggle("is-active", completedOnly);
  completedButton.setAttribute("aria-pressed", String(completedOnly));
  render();
});

logoutButton?.addEventListener("click", async () => {
  try { await signOut(auth); } finally { window.location.replace("./index.html?login=1"); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.replace("./index.html?login=1"); return; }
  currentUser = user;

  try {
    const [userSnapshot, profileSnapshot, food, workout, recipes] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid)),
      carregarConteudos("alimentacao"),
      carregarConteudos("exercicio"),
      carregarConteudos("receita")
    ]);

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const productionAccess = userData.status_acesso === "ativo" && userData.status_pagamento === "pago";
    const testAccess = profileData.acesso_teste === true && profileData.pagamento_teste_status === "aprovado";
    if (!productionAccess && !testAccess) { window.location.replace("./pagamento.html"); return; }

    const catalog = [...food.itens, ...workout.itens, ...recipes.itens];

    const [favoritesResult, progressResult, historyResult, searchesResult] = await Promise.allSettled([
      listarFavoritos(user.uid),
      listarProgresso(user.uid),
      listarHistorico(user.uid, 20),
      listarBuscas(user.uid, 12)
    ]);
    if (favoritesResult.status === "fulfilled") {
      favoriteIds = new Set(favoritesResult.value.map((item) => item.conteudo_id || item.id));
    } else {
      console.warn("Favoritos indisponíveis.", favoritesResult.reason);
    }
    if (progressResult.status === "fulfilled") {
      progressMap = new Map(progressResult.value.map((item) => [item.conteudo_id || item.id, item]));
    } else {
      console.warn("Progresso indisponível até as novas regras do Firestore serem publicadas.", progressResult.reason);
    }

    const favorites = favoritesResult.status === "fulfilled" ? favoritesResult.value : [];
    const progress = progressResult.status === "fulfilled" ? progressResult.value : [];
    const history = historyResult.status === "fulfilled" ? historyResult.value : [];
    const searches = searchesResult.status === "fulfilled" ? searchesResult.value : [];
    const sinais = construirSinaisComportamento({ catalogo: catalog, favoritos: favorites, historico: history, progresso: progress, buscas: searches });
    const estagio = determinarEstagioUsuario({ favoritos: favorites, historico: history, progresso: progress, buscas: searches });
    allItems = ordenarPorExperiencia(catalog, { usuarioId: user.uid, profileData, sinais, estagio });

    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q") || "";
    favoritesOnly = params.get("favoritos") === "1";
    completedOnly = params.get("concluidos") === "1";
    if (input) input.value = initialQuery;
    if (favoritesButton) {
      favoritesButton.classList.toggle("is-active", favoritesOnly);
      favoritesButton.setAttribute("aria-pressed", String(favoritesOnly));
    }
    if (completedButton) {
      completedButton.classList.toggle("is-active", completedOnly);
      completedButton.setAttribute("aria-pressed", String(completedOnly));
    }
    render();
    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar busca:", error);
    window.location.replace("./portal.html");
  }
});
