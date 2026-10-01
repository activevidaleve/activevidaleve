import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { carregarConteudos } from "./conteudos.js";
import { listarFavoritos, listarHistorico, listarProgresso, listarBuscas } from "./biblioteca-usuario.js";
import { criarBotaoFavorito } from "./interface-biblioteca.js";
import { construirSinaisComportamento, determinarEstagioUsuario, ordenarPorExperiencia } from "./experiencia.js";

const app = document.querySelector("[data-juices-app]");
const loading = document.querySelector("[data-juices-loading]");
const grid = document.querySelector("[data-juices-grid]");
const empty = document.querySelector("[data-juices-empty]");
const logout = document.querySelector("[data-logout]");
const headerName = document.querySelector("[data-header-name]");
const userInitial = document.querySelector("[data-user-initial]");
const chips = document.querySelector("[data-juices-profile-chips]");
let favoriteIds = new Set();
let progressMap = new Map();

const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const setMedia = (slot, url, label, alt) => {
  if (url) {
    slot.classList.add("has-image");
    slot.style.backgroundImage = `linear-gradient(135deg,rgba(38,62,50,.02),rgba(38,62,50,.10)),url("${String(url).replaceAll('"', '%22')}")`;
    slot.setAttribute("role", "img");
    slot.setAttribute("aria-label", alt || label);
  } else {
    slot.append(make("span", "", label), make("small", "", "Espaço reservado para a imagem."));
  }
};

const render = (userId, items) => {
  if (!grid) return;
  grid.innerHTML = "";

  items.forEach((item) => {
    const card = make("article", "juice-card");
    const recommended = item.personalizacao?.recomendado && !item.personalizacao?.bloqueado;
    card.classList.toggle("is-profile-match", Boolean(recommended));
    if (item.experiencia_usuario?.motivo) card.title = `Por que aparece aqui: ${item.experiencia_usuario.motivo}.`;

    const media = make("div", "juice-card-media");
    const ingredients = make("div", "juice-media-slot");
    setMedia(ingredients, item.midia?.imagem_ingredientes_url, "INGREDIENTES", item.midia?.imagem_ingredientes_alt);
    const ready = make("div", "juice-media-slot");
    setMedia(ready, item.midia?.imagem_pronto_url || item.imagem_url, "SUCO PRONTO", item.midia?.imagem_pronto_alt || item.imagem_alt);
    const favorite = criarBotaoFavorito({ usuarioId: userId, item, favoritos: favoriteIds, className: "juice-card-favorite" });
    ready.append(favorite);
    media.append(ingredients, ready);

    const body = make("div", "juice-card-body");
    const meta = make("div", "juice-card-meta");
    meta.append(make("span", "", "SUCO DETOX"));
    if (recommended) meta.append(make("i", "", "Do seu perfil"));
    body.append(meta, make("h3", "", item.titulo), make("p", "", item.resumo));

    const reason = make("small", "juice-card-reason", item.experiencia_usuario?.motivo || "Selecionado para variar sua biblioteca de receitas");
    body.append(reason);

    const facts = make("div", "juice-card-facts");
    [item.experiencia?.tempo, item.experiencia?.dificuldade, item.rendimento].filter(Boolean).slice(0, 3).forEach((value) => facts.append(make("span", "", value)));
    body.append(facts);

    const progress = progressMap.get(item.id);
    if (progress) body.append(make("span", "juice-card-progress", progress.status === "concluido" ? "✓ Concluído" : `${Number(progress.progresso || 0)}% explorado`));

    const link = make("a", "juice-open", progress?.status === "em_andamento" ? "Continuar receita →" : "Ver receita completa →");
    link.href = `./conteudo.html?id=${encodeURIComponent(item.id)}`;
    body.append(link);
    card.append(media, body);
    grid.append(card);
  });

  if (empty) empty.hidden = items.length > 0;
};

const renderProfile = (profile) => {
  if (!chips) return;
  chips.innerHTML = "";
  const values = [
    profile.perfil_alimentar,
    profile.tempo_preparo,
    ...(Array.isArray(profile.interesses_alimentares) ? profile.interesses_alimentares : [])
  ].filter(Boolean).slice(0, 4);
  values.forEach((value) => chips.append(make("span", "", String(value).replaceAll("_", " "))));
};

logout?.addEventListener("click", async () => {
  try { await signOut(auth); } finally { window.location.replace("./login.html"); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.replace("./login.html"); return; }

  try {
    const [userSnapshot, profileSnapshot, contentResult] = await Promise.all([
      getDoc(doc(db, "usuarios", user.uid)),
      getDoc(doc(db, "perfis", user.uid)),
      carregarConteudos("receita")
    ]);

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
    const allowed = (userData.status_acesso === "ativo" && userData.status_pagamento === "pago")
      || (profile.acesso_teste === true && profile.pagamento_teste_status === "aprovado");
    if (!allowed) { window.location.replace("./pagamento.html"); return; }

    const juices = contentResult.itens.filter((item) => item.categoria === "suco_detox");
    const [favoritesResult, progressResult, historyResult, searchesResult] = await Promise.allSettled([
      listarFavoritos(user.uid),
      listarProgresso(user.uid),
      listarHistorico(user.uid, 20),
      listarBuscas(user.uid, 12)
    ]);

    const favorites = favoritesResult.status === "fulfilled" ? favoritesResult.value : [];
    const progress = progressResult.status === "fulfilled" ? progressResult.value : [];
    const history = historyResult.status === "fulfilled" ? historyResult.value : [];
    const searches = searchesResult.status === "fulfilled" ? searchesResult.value : [];
    favoriteIds = new Set(favorites.map((item) => item.conteudo_id || item.id));
    progressMap = new Map(progress.map((item) => [item.conteudo_id || item.id, item]));

    const signals = construirSinaisComportamento({ catalogo: juices, favoritos: favorites, historico: history, progresso: progress, buscas: searches });
    const stage = determinarEstagioUsuario({ favoritos: favorites, historico: history, progresso: progress, buscas: searches });
    const heroDescription = document.querySelector("[data-juices-hero-description]");
    if (heroDescription) {
      heroDescription.textContent = stage.id === "primeiros_passos"
        ? "As combinações são organizadas a partir das preferências do seu cadastro. “Detox” é apenas o nome popular da seção: os sucos não eliminam toxinas e não substituem refeições."
        : "A ordem dos sucos também considera o que você vem buscando, abrindo e salvando. “Detox” continua sendo apenas o nome popular da seção, sem promessa de limpeza do organismo.";
    }
    const personalized = ordenarPorExperiencia(juices, { usuarioId: user.uid, profileData: profile, sinais: signals, estagio: stage });

    render(user.uid, personalized);
    renderProfile(profile);

    const name = userData.nome || user.displayName?.split(/\s+/)[0] || "Usuário";
    if (headerName) headerName.textContent = name;
    if (userInitial) userInitial.textContent = name.charAt(0).toUpperCase();
    if (loading) loading.hidden = true;
    if (app) app.hidden = false;
  } catch (error) {
    console.error("Erro ao carregar Sucos Detox:", error);
    window.location.replace("./portal.html");
  }
});
