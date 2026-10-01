import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

const FALLBACK_URL = "./dados/conteudos-exemplo.json";

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(/\s+/).filter(Boolean);
  return [];
};

const normalize = (id, data = {}) => ({
  id,
  tipo: String(data.tipo || "").trim(),
  categoria: String(data.categoria || "").trim(),
  categorias: asArray(data.categorias),
  titulo: String(data.titulo || "").trim(),
  resumo: String(data.resumo || "").trim(),
  texto_apoio: String(data.texto_apoio || "").trim(),
  icone: String(data.icone || "✦").trim(),
  ordem: Number.isFinite(Number(data.ordem)) ? Number(data.ordem) : 999,
  destaque: data.destaque === true,
  publicado: data.publicado !== false,
  tags: asArray(data.tags),
  perfis_alimentares: asArray(data.perfis_alimentares),
  tempo_preparo: String(data.tempo_preparo || "").trim(),
  niveis: asArray(data.niveis),
  locais: asArray(data.locais),
  equipamentos: asArray(data.equipamentos),
  duracoes: asArray(data.duracoes),
  ingredientes: String(data.ingredientes || "").trim(),
  preparo: Array.isArray(data.preparo) ? data.preparo.filter(Boolean).map(String) : []
});

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
      .filter((item) => item.publicado && item.tipo === tipo)
  );
};

export const carregarConteudos = async (tipo) => {
  try {
    const snapshot = await getDocs(collection(db, "conteudos"));
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
