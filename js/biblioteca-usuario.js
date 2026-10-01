import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

const resumoConteudo = (item = {}) => ({
  conteudo_id: String(item.id || item.conteudo_id || "").trim(),
  tipo: String(item.tipo || "").trim(),
  categoria: String(item.categoria || "").trim(),
  titulo: String(item.titulo || "").trim(),
  resumo: String(item.resumo || "").trim(),
  icone: String(item.icone || "✦").trim(),
  imagem_url: String(item.imagem_url || "").trim()
});

const normalizarProgresso = (valor) => Math.max(0, Math.min(100, Math.round(Number(valor) || 0)));

export const obterFavorito = async (usuarioId, conteudoId) => {
  if (!usuarioId || !conteudoId) return false;
  const snapshot = await getDoc(doc(db, "usuarios", usuarioId, "favoritos", conteudoId));
  return snapshot.exists();
};

export const alternarFavorito = async (usuarioId, item) => {
  const conteudoId = String(item?.id || item?.conteudo_id || "").trim();
  if (!usuarioId || !conteudoId) throw new Error("Conteúdo inválido para favoritos.");

  const referencia = doc(db, "usuarios", usuarioId, "favoritos", conteudoId);
  const snapshot = await getDoc(referencia);

  if (snapshot.exists()) {
    await deleteDoc(referencia);
    return false;
  }

  await setDoc(referencia, {
    ...resumoConteudo(item),
    salvo_em: serverTimestamp()
  });
  return true;
};

export const listarFavoritos = async (usuarioId) => {
  if (!usuarioId) return [];
  const snapshot = await getDocs(collection(db, "usuarios", usuarioId, "favoritos"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const aMs = a.salvo_em?.toMillis?.() || 0;
      const bMs = b.salvo_em?.toMillis?.() || 0;
      return bMs - aMs;
    });
};

export const registrarVisualizacao = async (usuarioId, item) => {
  const conteudoId = String(item?.id || item?.conteudo_id || "").trim();
  if (!usuarioId || !conteudoId) return;

  const referencia = doc(db, "usuarios", usuarioId, "historico", conteudoId);
  await setDoc(referencia, {
    ...resumoConteudo(item),
    ultima_visualizacao_em: serverTimestamp(),
    visualizacoes: increment(1)
  }, { merge: true });
};

export const listarHistorico = async (usuarioId, quantidade = 8) => {
  if (!usuarioId) return [];
  const referencia = collection(db, "usuarios", usuarioId, "historico");
  try {
    const snapshot = await getDocs(query(referencia, orderBy("ultima_visualizacao_em", "desc"), limit(quantidade)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn("Histórico ordenado indisponível; carregando lista simples.", error);
    const snapshot = await getDocs(referencia);
    return snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const aMs = a.ultima_visualizacao_em?.toMillis?.() || 0;
        const bMs = b.ultima_visualizacao_em?.toMillis?.() || 0;
        return bMs - aMs;
      })
      .slice(0, quantidade);
  }
};

export const obterProgresso = async (usuarioId, conteudoId) => {
  if (!usuarioId || !conteudoId) return null;
  const snapshot = await getDoc(doc(db, "usuarios", usuarioId, "progresso", conteudoId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const salvarProgresso = async (usuarioId, item, progresso = 0) => {
  const conteudoId = String(item?.id || item?.conteudo_id || "").trim();
  if (!usuarioId || !conteudoId) return null;

  const valor = normalizarProgresso(progresso);
  const referencia = doc(db, "usuarios", usuarioId, "progresso", conteudoId);
  const snapshot = await getDoc(referencia);
  const anterior = snapshot.exists() ? snapshot.data() : {};
  const anteriorValor = normalizarProgresso(anterior.progresso);
  const concluido = anterior.status === "concluido";

  if (concluido || valor <= anteriorValor) {
    return { id: conteudoId, ...anterior, progresso: concluido ? 100 : anteriorValor };
  }

  const dados = {
    ...resumoConteudo(item),
    progresso: valor,
    status: "em_andamento",
    atualizado_em: serverTimestamp()
  };

  if (!snapshot.exists()) dados.iniciado_em = serverTimestamp();

  await setDoc(referencia, dados, { merge: true });
  return { id: conteudoId, ...anterior, ...dados };
};

export const definirConclusao = async (usuarioId, item, concluido = true, progressoAtual = 0) => {
  const conteudoId = String(item?.id || item?.conteudo_id || "").trim();
  if (!usuarioId || !conteudoId) throw new Error("Conteúdo inválido para progresso.");

  const referencia = doc(db, "usuarios", usuarioId, "progresso", conteudoId);
  const snapshot = await getDoc(referencia);
  const dados = {
    ...resumoConteudo(item),
    progresso: concluido ? 100 : Math.min(95, normalizarProgresso(progressoAtual)),
    status: concluido ? "concluido" : "em_andamento",
    atualizado_em: serverTimestamp(),
    concluido_em: concluido ? serverTimestamp() : null
  };

  if (!snapshot.exists()) dados.iniciado_em = serverTimestamp();
  await setDoc(referencia, dados, { merge: true });
  return { id: conteudoId, ...dados };
};

export const listarProgresso = async (usuarioId) => {
  if (!usuarioId) return [];
  const referencia = collection(db, "usuarios", usuarioId, "progresso");
  const snapshot = await getDocs(referencia);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const aMs = a.atualizado_em?.toMillis?.() || 0;
      const bMs = b.atualizado_em?.toMillis?.() || 0;
      return bMs - aMs;
    });
};

export const listarConcluidos = async (usuarioId, quantidade = 8) => {
  const itens = await listarProgresso(usuarioId);
  return itens.filter((item) => item.status === "concluido").slice(0, quantidade);
};

const idBusca = (termo = "") => String(termo)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "")
  .slice(0, 70);

export const registrarBusca = async (usuarioId, termo) => {
  const termoLimpo = String(termo || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const identificador = idBusca(termoLimpo);
  if (!usuarioId || termoLimpo.length < 2 || !identificador) return;

  const referencia = doc(db, "usuarios", usuarioId, "buscas", identificador);
  await setDoc(referencia, {
    termo: termoLimpo,
    contagem: increment(1),
    atualizado_em: serverTimestamp()
  }, { merge: true });
};

export const listarBuscas = async (usuarioId, quantidade = 12) => {
  if (!usuarioId) return [];
  const referencia = collection(db, "usuarios", usuarioId, "buscas");
  try {
    const snapshot = await getDocs(query(referencia, orderBy("atualizado_em", "desc"), limit(quantidade)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn("Buscas ordenadas indisponíveis; carregando lista simples.", error);
    const snapshot = await getDocs(referencia);
    return snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const aMs = a.atualizado_em?.toMillis?.() || 0;
        const bMs = b.atualizado_em?.toMillis?.() || 0;
        return bMs - aMs;
      })
      .slice(0, quantidade);
  }
};

