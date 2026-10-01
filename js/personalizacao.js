const ALIASES = {
  objetivos: {
    condicionamento: "melhorar_condicionamento",
    variedade_refeicoes: "variar_refeicoes"
  },
  local_exercicio: {
    varia: "variado"
  },
  equipamentos: {
    equipamentos_academia: "academia"
  },
  nivel_atividade: {
    ativo_algumas_vezes: "algumas_vezes_semana"
  }
};

const PESOS = Object.freeze({
  objetivos: 30,
  interesses: 24,
  nivel: 25,
  duracao: 20,
  local: 15,
  equipamento: 15,
  perfil_alimentar: 30,
  tempo_preparo: 18,
  nivel_atividade: 10,
  destaque: 4
});

const ORDEM_TEMPO = Object.freeze({
  ate_15: 1,
  "15_30": 2,
  "30_45": 3,
  "30_60": 3,
  mais_45: 4,
  mais_60: 4
});

const TERMOS_RESTRICAO = Object.freeze({
  leite: ["leite", "lactose", "laticinio", "laticinios"],
  ovo: ["ovo", "ovos"],
  amendoim: ["amendoim", "amendoins"],
  castanhas: ["castanha", "castanhas", "nozes", "noz"],
  gluten: ["gluten", "trigo", "celiaco", "celiaca", "doenca celiaca"],
  peixe: ["peixe", "peixes"],
  soja: ["soja"],
  frango: ["frango"],
  carne: ["carne", "carne bovina", "bovina"],
  porco: ["porco", "suino", "suina"],
  cogumelos: ["cogumelo", "cogumelos"],
  pimenta: ["pimenta", "apimentado", "apimentada"]
});

const MOVIMENTOS_EVITAR = Object.freeze({
  corrida: ["corrida", "correr"],
  salto: ["salto", "saltos", "pulo", "pulos"],
  agachamento: ["agachamento", "agachamentos"],
  burpee: ["burpee", "burpees"],
  prancha: ["prancha", "pranchas"],
  flexao: ["flexao", "flexoes"],
  abdominal: ["abdominal", "abdominais"]
});

const removerAcentos = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const normalizarToken = (value, group = "") => {
  const token = removerAcentos(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return ALIASES[group]?.[token] || token;
};

const lista = (value, group = "") => {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? value.split(/[;,|]/)
      : [];

  return [...new Set(values.map((item) => normalizarToken(item, group)).filter(Boolean))];
};

const intersecao = (left = [], right = []) => {
  if (!left.length || !right.length) return [];
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
};

const textoContemTermo = (text, aliases) => {
  const normalized = ` ${removerAcentos(text).toLowerCase()} `;
  return aliases.some((alias) => {
    const term = removerAcentos(alias).toLowerCase().trim();
    if (!term) return false;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(normalized);
  });
};

const detectarRestricoes = (profileData = {}) => {
  const source = [profileData.restricoes_alimentares, profileData.alimentos_evitar]
    .filter(Boolean)
    .join(" ");

  if (!source.trim()) return [];

  return Object.entries(TERMOS_RESTRICAO)
    .filter(([, aliases]) => textoContemTermo(source, aliases))
    .map(([key]) => key);
};

const detectarMovimentosEvitar = (profileData = {}) => {
  const source = String(profileData.exercicios_evitar || "");
  if (!source.trim()) return [];

  return Object.entries(MOVIMENTOS_EVITAR)
    .filter(([, aliases]) => textoContemTermo(source, aliases))
    .map(([key]) => key);
};

export const normalizarPerfil = (profileData = {}) => ({
  objetivos: lista(profileData.objetivos, "objetivos"),
  interesses: lista(profileData.interesses_alimentares),
  nivel: normalizarToken(profileData.nivel_exercicio),
  duracao: normalizarToken(profileData.duracao_treino),
  local: normalizarToken(profileData.local_exercicio, "local_exercicio"),
  equipamentos: lista(profileData.equipamentos, "equipamentos"),
  perfil_alimentar: normalizarToken(profileData.perfil_alimentar),
  tempo_preparo: normalizarToken(profileData.tempo_preparo),
  nivel_atividade: normalizarToken(profileData.nivel_atividade, "nivel_atividade"),
  dias_exercicio: normalizarToken(profileData.dias_exercicio),
  restricoes_detectadas: detectarRestricoes(profileData),
  movimentos_evitar_detectados: detectarMovimentosEvitar(profileData)
});

const criarAvaliacao = () => ({
  pontuacao: 0,
  maximo: 0,
  bloqueado: false,
  motivos: [],
  alertas: []
});

const fatorEspecificidade = (quantidade = 1, totalPossivel = 0) => {
  if (!totalPossivel || quantidade <= 1) return 1;
  const cobertura = Math.min(1, quantidade / totalPossivel);
  return Math.max(0.68, 1 - cobertura * 0.32);
};

const pontuarLista = (avaliacao, profileValues, contentValues, weight, reason, options = {}) => {
  if (!profileValues.length || !contentValues.length) return;
  avaliacao.maximo += weight;
  const matches = intersecao(profileValues, contentValues);
  if (matches.length) {
    const coberturaPerfil = Math.min(1, matches.length / Math.max(1, Math.min(profileValues.length, 2)));
    const especificidade = fatorEspecificidade(contentValues.length, options.totalPossivel || 0);
    const fator = Math.min(1, (0.78 + coberturaPerfil * 0.22) * especificidade);
    avaliacao.pontuacao += Math.round(weight * fator);
    avaliacao.motivos.push(reason);
  } else {
    avaliacao.pontuacao -= Math.round(weight * 0.35);
  }
};

const pontuarValor = (avaliacao, profileValue, contentValues, weight, reason, options = {}) => {
  if (!profileValue || !contentValues.length) return;
  avaliacao.maximo += weight;
  const exactMatch = contentValues.includes(profileValue);
  const genericMatch = !exactMatch && options.acceptAny && contentValues.includes(options.acceptAny);

  if (exactMatch || genericMatch) {
    const especificidade = fatorEspecificidade(contentValues.length, options.totalPossivel || 0);
    const qualidade = genericMatch ? 0.62 : especificidade;
    avaliacao.pontuacao += Math.round(weight * qualidade);
    avaliacao.motivos.push(reason);
  } else {
    avaliacao.pontuacao -= Math.round(weight * 0.35);
  }
};

const avaliarTempo = (avaliacao, profileValue, contentValues, weight, reason, options = {}) => {
  if (!profileValue || !contentValues.length) return;
  avaliacao.maximo += weight;

  const profileOrder = ORDEM_TEMPO[profileValue];
  const contentOrders = [...new Set(contentValues.map((item) => ORDEM_TEMPO[item]).filter(Boolean))];
  if (!profileOrder || !contentOrders.length) return;

  const exact = contentOrders.includes(profileOrder);
  const menores = contentOrders.filter((order) => order < profileOrder);
  const maiores = contentOrders.filter((order) => order > profileOrder);
  const especificidade = fatorEspecificidade(contentOrders.length, options.totalPossivel || 4);

  if (exact) {
    avaliacao.pontuacao += Math.round(weight * especificidade);
    avaliacao.motivos.push(reason);
    return;
  }

  if (menores.length) {
    const distancia = profileOrder - Math.max(...menores);
    const fator = distancia === 1 ? 0.74 : 0.56;
    avaliacao.pontuacao += Math.round(weight * fator * especificidade);
    avaliacao.motivos.push(reason);
    return;
  }

  if (maiores.length) {
    avaliacao.pontuacao -= Math.round(weight * 0.55);
  }
};

const avaliarPerfilAlimentar = (avaliacao, profileValue, contentValues) => {
  if (!profileValue || !contentValues.length || profileValue === "outra") return;
  avaliacao.maximo += PESOS.perfil_alimentar;

  const variedUser = profileValue === "variada";
  const compatible = variedUser || contentValues.includes(profileValue);

  if (compatible) {
    avaliacao.pontuacao += PESOS.perfil_alimentar;
    avaliacao.motivos.push("compatível com sua preferência alimentar");
  } else {
    avaliacao.bloqueado = true;
    avaliacao.alertas.push("perfil alimentar incompatível");
  }
};

const avaliarRestricoesEstruturadas = (avaliacao, conteudo, perfil) => {
  const alergenos = lista(conteudo.alergenos);
  const ingredientesTags = lista(conteudo.ingredientes_tags);
  const bloqueios = new Set([...alergenos, ...ingredientesTags]);

  const conflitoAlimentar = perfil.restricoes_detectadas.find((item) => bloqueios.has(item));
  if (conflitoAlimentar) {
    avaliacao.bloqueado = true;
    avaliacao.alertas.push(`pode conflitar com a preferência/restrição informada: ${conflitoAlimentar}`);
  }

  const movimentos = lista(conteudo.movimentos_tags);
  const conflitoMovimento = perfil.movimentos_evitar_detectados.find((item) => movimentos.includes(item));
  if (conflitoMovimento) {
    avaliacao.bloqueado = true;
    avaliacao.alertas.push(`movimento marcado para evitar: ${conflitoMovimento}`);
  }
};

export const avaliarConteudo = (conteudo = {}, profileData = {}) => {
  const perfil = normalizarPerfil(profileData);
  const avaliacao = criarAvaliacao();

  const publico = conteudo.publico || {};
  const objetivos = lista(publico.objetivos ?? conteudo.objetivos, "objetivos");
  const interesses = lista(publico.interesses ?? conteudo.interesses);
  const niveis = lista(publico.niveis ?? conteudo.niveis);
  const duracoes = lista(publico.duracoes ?? conteudo.duracoes);
  const locais = lista(publico.locais ?? conteudo.locais, "local_exercicio");
  const equipamentos = lista(publico.equipamentos ?? conteudo.equipamentos, "equipamentos");
  const perfisAlimentares = lista(publico.perfis_alimentares ?? conteudo.perfis_alimentares);
  const temposPreparo = lista(publico.tempo_preparo ?? conteudo.tempos_preparo ?? conteudo.tempo_preparo);
  const niveisAtividade = lista(publico.niveis_atividade ?? conteudo.niveis_atividade, "nivel_atividade");

  pontuarLista(avaliacao, perfil.objetivos, objetivos, PESOS.objetivos, "relacionado aos seus objetivos", { totalPossivel: 8 });
  pontuarLista(avaliacao, perfil.interesses, interesses, PESOS.interesses, "relacionado aos seus interesses", { totalPossivel: 7 });
  pontuarValor(avaliacao, perfil.nivel, niveis, PESOS.nivel, "compatível com seu nível", { totalPossivel: 3 });
  avaliarTempo(avaliacao, perfil.duracao, duracoes, PESOS.duracao, "cabe no seu tempo de exercício", { totalPossivel: 4 });
  pontuarValor(avaliacao, perfil.local, locais, PESOS.local, "compatível com seu local", { acceptAny: "variado", totalPossivel: 4 });

  if (perfil.equipamentos.length && equipamentos.length) {
    avaliacao.maximo += PESOS.equipamento;
    const matches = intersecao(perfil.equipamentos, equipamentos);
    const usuarioSemEquipamento = perfil.equipamentos.includes("nenhum");
    const conteudoSemEquipamento = equipamentos.includes("nenhum");
    const especificidade = fatorEspecificidade(equipamentos.length, 6);

    if (matches.length) {
      avaliacao.pontuacao += Math.round(PESOS.equipamento * especificidade);
      avaliacao.motivos.push(usuarioSemEquipamento && conteudoSemEquipamento ? "não exige equipamento" : "usa equipamento que você informou");
    } else if (conteudoSemEquipamento) {
      avaliacao.pontuacao += Math.round(PESOS.equipamento * 0.55);
      avaliacao.motivos.push("não exige equipamento");
    } else {
      avaliacao.pontuacao -= Math.round(PESOS.equipamento * 0.45);
    }
  }

  avaliarPerfilAlimentar(avaliacao, perfil.perfil_alimentar, perfisAlimentares);
  avaliarTempo(avaliacao, perfil.tempo_preparo, temposPreparo, PESOS.tempo_preparo, "cabe no seu tempo de preparo", { totalPossivel: 4 });
  pontuarValor(avaliacao, perfil.nivel_atividade, niveisAtividade, PESOS.nivel_atividade, "compatível com sua rotina de atividade", { totalPossivel: 4 });
  avaliarRestricoesEstruturadas(avaliacao, conteudo, perfil);

  if (conteudo.destaque === true && !avaliacao.bloqueado) {
    avaliacao.pontuacao += PESOS.destaque;
  }

  const relevancia = avaliacao.maximo > 0
    ? Math.max(0, Math.min(100, Math.round((avaliacao.pontuacao / avaliacao.maximo) * 100)))
    : 0;

  return {
    pontuacao: avaliacao.pontuacao,
    relevancia,
    recomendado: !avaliacao.bloqueado && relevancia >= 60 && avaliacao.pontuacao >= 40,
    bloqueado: avaliacao.bloqueado,
    motivos: [...new Set(avaliacao.motivos)].slice(0, 4),
    alertas: [...new Set(avaliacao.alertas)]
  };
};

export const personalizarConteudos = (items = [], profileData = {}) => items
  .map((item) => ({
    ...item,
    personalizacao: avaliarConteudo(item, profileData)
  }))
  .sort((a, b) => {
    const blocked = Number(a.personalizacao.bloqueado) - Number(b.personalizacao.bloqueado);
    if (blocked) return blocked;

    const score = b.personalizacao.pontuacao - a.personalizacao.pontuacao;
    if (score) return score;

    const featured = Number(Boolean(b.destaque)) - Number(Boolean(a.destaque));
    if (featured) return featured;

    const order = Number(a.ordem || 999) - Number(b.ordem || 999);
    if (order) return order;

    return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR");
  });

export const melhorConteudo = (items = [], profileData = {}) =>
  personalizarConteudos(items, profileData).find((item) => !item.personalizacao.bloqueado) || null;

export const taxonomiaPersonalizacao = Object.freeze({
  objetivos: [
    "movimentar_mais",
    "melhorar_condicionamento",
    "constancia_exercicios",
    "organizar_alimentacao",
    "receitas_praticas",
    "variar_refeicoes",
    "rotina_organizada",
    "bem_estar"
  ],
  niveis: ["iniciante", "intermediario", "experiente"],
  duracoes: ["ate_15", "15_30", "30_45", "mais_45"],
  locais: ["casa", "academia", "ar_livre", "variado"],
  equipamentos: ["nenhum", "halteres", "elasticos", "colchonete", "academia", "outros"],
  perfis_alimentares: ["variada", "vegetariana", "vegana", "outra"],
  interesses: ["cafe_manha", "almoco", "jantar", "lanches", "sucos", "receitas_rapidas", "marmitas"],
  tempo_preparo: ["ate_15", "15_30", "30_60", "mais_60"],
  niveis_atividade: ["pouco_ativo", "algumas_vezes_semana", "ativo_frequente", "muito_ativo"],
  dias_exercicio: ["1_2", "3_4", "5_mais"]
});
