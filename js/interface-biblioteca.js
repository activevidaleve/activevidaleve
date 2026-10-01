import { alternarFavorito } from "./biblioteca-usuario.js";

export const idConteudo = (item = {}) => String(item.id || item.conteudo_id || "").trim();

export const aplicarCapa = (elemento, item = {}) => {
  if (!elemento || !item.imagem_url) return;
  elemento.classList.add("has-image");
  elemento.style.backgroundImage = `linear-gradient(135deg, rgba(38,62,50,.04), rgba(38,62,50,.24)), url("${String(item.imagem_url).replaceAll('"', '%22')}")`;
};

export const criarBotaoFavorito = ({ usuarioId, item, favoritos, className = "card-favorite", onChange }) => {
  const id = idConteudo(item);
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = className;

  const atualizar = () => {
    const salvo = favoritos.has(id);
    botao.classList.toggle("is-favorite", salvo);
    botao.setAttribute("aria-pressed", String(salvo));
    botao.setAttribute("aria-label", salvo ? "Remover dos favoritos" : "Salvar nos favoritos");
    botao.textContent = salvo ? "♥" : "♡";
  };

  atualizar();
  botao.addEventListener("click", async () => {
    if (!usuarioId || !id) return;
    botao.disabled = true;
    try {
      const salvo = await alternarFavorito(usuarioId, { ...item, id });
      if (salvo) favoritos.add(id); else favoritos.delete(id);
      atualizar();
      if (typeof onChange === "function") onChange(salvo, id);
    } catch (error) {
      console.warn("Não foi possível atualizar o favorito.", error);
    } finally {
      botao.disabled = false;
    }
  });

  return botao;
};

export const criarEstadoProgresso = (item, progressoMap, className = "card-progress-state") => {
  const progresso = progressoMap.get(idConteudo(item));
  if (!progresso) return null;
  const estado = document.createElement("span");
  estado.className = className;
  estado.textContent = progresso.status === "concluido"
    ? "✓ Concluído"
    : `${Math.max(1, Number(progresso.progresso || 0))}% visto`;
  return estado;
};

export const criarFatosConteudo = (item = {}, className = "card-facts") => {
  const fatos = [
    item.experiencia?.tempo,
    item.experiencia?.dificuldade,
    item.tipo === "receita" ? item.rendimento : item.experiencia?.formato
  ].filter(Boolean);
  if (!fatos.length) return null;

  const container = document.createElement("div");
  container.className = className;
  [...new Set(fatos)].slice(0, 3).forEach((texto) => {
    const chip = document.createElement("span");
    chip.textContent = texto;
    container.append(chip);
  });
  return container;
};
