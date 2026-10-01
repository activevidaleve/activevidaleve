import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

const FALLBACK_URL = "./dados/conteudos-exemplo.json";

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) {
    return value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const asObjectList = (value) => Array.isArray(value)
  ? value.filter((item) => item && typeof item === "object").map((item) => ({ ...item }))
  : [];

const normalizeExperience = (data = {}) => {
  const experiencia = data.experiencia && typeof data.experiencia === "object" ? data.experiencia : {};
  return {
    tempo: String(experiencia.tempo || data.tempo_label || "").trim(),
    dificuldade: String(experiencia.dificuldade || data.dificuldade || "").trim(),
    formato: String(experiencia.formato || data.formato || "").trim()
  };
};

const normalizeMedia = (data = {}) => {
  const midia = data.midia && typeof data.midia === "object" ? data.midia : {};
  return {
    imagem_url: String(midia.imagem_url || data.imagem_url || "").trim(),
    imagem_alt: String(midia.imagem_alt || data.imagem_alt || "").trim(),
    foco: String(midia.foco || "centro").trim(),
    proporcao_card: String(midia.proporcao_card || "4:3").trim(),
    proporcao_detalhe: String(midia.proporcao_detalhe || "16:9").trim()
  };
};

const normalizedPublic = (data = {}) => {
  const publico = data.publico && typeof data.publico === "object" ? data.publico : {};
  return {
    objetivos: asArray(publico.objetivos ?? data.objetivos),
    interesses: asArray(publico.interesses ?? data.interesses),
    niveis: asArray(publico.niveis ?? data.niveis),
    duracoes: asArray(publico.duracoes ?? data.duracoes),
    locais: asArray(publico.locais ?? data.locais),
    equipamentos: asArray(publico.equipamentos ?? data.equipamentos),
    perfis_alimentares: asArray(publico.perfis_alimentares ?? data.perfis_alimentares),
    tempo_preparo: asArray(publico.tempo_preparo ?? data.tempos_preparo ?? data.tempo_preparo),
    niveis_atividade: asArray(publico.niveis_atividade ?? data.niveis_atividade)
  };
};

const normalize = (id, data = {}) => {
  const publico = normalizedPublic(data);
  const tempoPreparo = String(data.tempo_preparo || publico.tempo_preparo[0] || "").trim();
  const experiencia = normalizeExperience(data);
  const midia = normalizeMedia(data);

  return {
    id,
    tipo: String(data.tipo || "").trim(),
    categoria: String(data.categoria || "").trim(),
    categorias: asArray(data.categorias),
    titulo: String(data.titulo || "").trim(),
    resumo: String(data.resumo || "").trim(),
    texto_apoio: String(data.texto_apoio || "").trim(),
    icone: String(data.icone || "✦").trim(),
    imagem_url: midia.imagem_url,
    imagem_alt: midia.imagem_alt,
    midia,
    experiencia,
    rendimento: String(data.rendimento || "").trim(),
    ordem: Number.isFinite(Number(data.ordem)) ? Number(data.ordem) : 999,
    destaque: data.destaque === true,
    publicado: data.publicado !== false,
    tags: asArray(data.tags),
    publico,

    // Compatibilidade com os componentes existentes enquanto a migração é gradual.
    objetivos: publico.objetivos,
    interesses: publico.interesses,
    perfis_alimentares: publico.perfis_alimentares,
    tempo_preparo: tempoPreparo,
    niveis: publico.niveis,
    locais: publico.locais,
    equipamentos: publico.equipamentos,
    duracoes: publico.duracoes,
    niveis_atividade: publico.niveis_atividade,

    ingredientes: String(data.ingredientes || "").trim(),
    ingredientes_lista: asObjectList(data.ingredientes_lista).map((ingrediente) => ({
      item: String(ingrediente.item || "").trim(),
      quantidade: String(ingrediente.quantidade || "").trim(),
      observacao: String(ingrediente.observacao || "").trim()
    })).filter((ingrediente) => ingrediente.item),
    preparo: Array.isArray(data.preparo) ? data.preparo.filter(Boolean).map(String) : [],
    ingredientes_tags: asArray(data.ingredientes_tags),
    alergenos: asArray(data.alergenos),
    movimentos_tags: asArray(data.movimentos_tags),
    introducao: String(data.introducao || "").trim(),
    secoes: Array.isArray(data.secoes)
      ? data.secoes.filter((section) => section && typeof section === "object").map((section) => ({
          titulo: String(section.titulo || "").trim(),
          texto: String(section.texto || "").trim(),
          itens: asArray(section.itens)
        })).filter((section) => section.titulo || section.texto || section.itens.length)
      : [],
    sequencia: Array.isArray(data.sequencia) ? data.sequencia.filter(Boolean).map(String) : [],
    etapas: asObjectList(data.etapas).map((etapa) => ({
      titulo: String(etapa.titulo || "").trim(),
      descricao: String(etapa.descricao || "").trim(),
      duracao: String(etapa.duracao || "").trim()
    })).filter((etapa) => etapa.titulo || etapa.descricao),
    observacoes: asArray(data.observacoes)
  };
};

const sortItems = (items) => [...items].sort((a, b) => {
  const featured = Number(Boolean(b.destaque)) - Number(Boolean(a.destaque));
  if (featured) return featured;
  const order = a.ordem - b.ordem;
  if (order) return order;
  return a.titulo.localeCompare(b.titulo, "pt-BR");
});

const loadFallback = async (tipo) => {
  const response = await fetch(FALLBACK_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Falha ao carregar conteúdo de exemplo (${response.status}).`);

  const payload = await response.json();
  const items = Array.isArray(payload?.conteudos) ? payload.conteudos : [];

  return sortItems(
    items
      .map((item) => normalize(item.id || item.slug || crypto.randomUUID(), item))
      .filter((item) => item.publicado && item.tipo === tipo && item.titulo)
  );
};

export const carregarConteudos = async (tipo) => {
  try {
    const snapshot = await getDocs(query(collection(db, "conteudos"), where("publicado", "==", true)));
    const firestoreItems = snapshot.docs
      .map((documentSnapshot) => normalize(documentSnapshot.id, documentSnapshot.data()))
      .filter((item) => item.publicado && item.tipo === tipo && item.titulo);

    if (firestoreItems.length) {
      return { itens: sortItems(firestoreItems), origem: "firestore" };
    }
  } catch (error) {
    console.warn("Conteúdos do Firestore indisponíveis; usando exemplos locais.", error);
  }

  try {
    return { itens: await loadFallback(tipo), origem: "local" };
  } catch (error) {
    console.error("Não foi possível carregar os conteúdos locais.", error);
    return { itens: [], origem: "vazio" };
  }
};

export const lista = asArray;

const loadFallbackById = async (id) => {
  const response = await fetch(FALLBACK_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Falha ao carregar conteúdo de exemplo (${response.status}).`);

  const payload = await response.json();
  const items = Array.isArray(payload?.conteudos) ? payload.conteudos : [];
  const raw = items.find((item) => String(item.id || item.slug || "") === String(id));
  if (!raw) return null;
  const item = normalize(raw.id || raw.slug || id, raw);
  return item.publicado ? item : null;
};

export const carregarConteudoPorId = async (id) => {
  const safeId = String(id || "").trim();
  if (!safeId) return { item: null, origem: "vazio" };

  try {
    const snapshot = await getDoc(doc(db, "conteudos", safeId));
    if (snapshot.exists()) {
      const item = normalize(snapshot.id, snapshot.data());
      if (item.publicado && item.titulo) return { item, origem: "firestore" };
    }
  } catch (error) {
    console.warn("Conteúdo individual do Firestore indisponível; tentando exemplo local.", error);
  }

  try {
    return { item: await loadFallbackById(safeId), origem: "local" };
  } catch (error) {
    console.error("Não foi possível carregar o conteúdo individual local.", error);
    return { item: null, origem: "vazio" };
  }
};

