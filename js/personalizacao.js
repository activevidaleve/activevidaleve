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
  gluten: ["gluten", "trigo"],
  peixe: ["peixe", "peixes"],
  soja: ["soja"],
  frango: ["frango"],
  carne: ["carne", "carne bovina", "bovina"],
  porco: ["porco", "suino", "suina"],
  cogumelos: ["cogumelo", "cogumelos"],
  pimenta: ["pimenta", "apimentado", "apimentada"]
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

  const keywords = [
    "corrida", "correr", "salto", "saltos", "pulo", "pulos", "agachamento",
    "burpee", "burpees", "prancha", "flexao", "flexoes", "abdominal", "abdominais"
  ];

  return keywords.filter((term) => textoContemTermo(source, [term]));
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

const pontuarLista = (avaliacao, profileValues, contentValues, weight, reason) => {
  if (!profileValues.length || !contentValues.length) return;
  avaliacao.maximo += weight;
  if (intersecao(profileValues, contentValues).length) {
    avaliacao.pontuacao += weight;
    avaliacao.motivos.push(reason);
  } else {
    avaliacao.pontuacao -= Math.round(weight * 0.35);
  }
};

const pontuarValor = (avaliacao, profileValue, contentValues, weight, reason, options = {}) => {
  if (!profileValue || !contentValues.length) return;
  avaliacao.maximo += weight;
  const match = contentValues.includes(profileValue)
    || (options.acceptAny && contentValues.includes(options.acceptAny));

  if (match) {
    avaliacao.pontuacao += weight;
    avaliacao.motivos.push(reason);
  } else {
    avaliacao.pontuacao -= Math.round(weight * 0.35);
  }
};

const avaliarTempo = (avaliacao, profileValue, contentValues, weight, reason) => {
  if (!profileValue || !contentValues.length) return;
  avaliacao.maximo += weight;

  const profileOrder = ORDEM_TEMPO[profileValue];
  const contentOrders = contentValues.map((item) => ORDEM_TEMPO[item]).filter(Boolean);

  if (!profileOrder || !contentOrders.length) return;
  const fits = contentOrders.some((order) => order <= profileOrder);

  if (fits) {
    avaliacao.pontuacao += weight;
    avaliacao.motivos.push(reason);
  } else {
    avaliacao.pontuacao -= Math.round(weight * 0.5);
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

  pontuarLista(avaliacao, perfil.objetivos, objetivos, PESOS.objetivos, "relacionado aos seus objetivos");
  pontuarLista(avaliacao, perfil.interesses, interesses, PESOS.interesses, "relacionado aos seus interesses");
  pontuarValor(avaliacao, perfil.nivel, niveis, PESOS.nivel, "compatível com seu nível");
  avaliarTempo(avaliacao, perfil.duracao, duracoes, PESOS.duracao, "cabe no seu tempo de exercício");
  pontuarValor(avaliacao, perfil.local, locais, PESOS.local, "compatível com seu local", { acceptAny: "variado" });

  if (perfil.equipamentos.length && equipamentos.length) {
    avaliacao.maximo += PESOS.equipamento;
    const semEquipamento = equipamentos.includes("nenhum");
    const equipmentMatch = semEquipamento || intersecao(perfil.equipamentos, equipamentos).length > 0;
    if (equipmentMatch) {
      avaliacao.pontuacao += PESOS.equipamento;
      avaliacao.motivos.push(semEquipamento ? "não exige equipamento" : "usa equipamento que você informou");
    } else {
      avaliacao.pontuacao -= Math.round(PESOS.equipamento * 0.4);
    }
  }

  avaliarPerfilAlimentar(avaliacao, perfil.perfil_alimentar, perfisAlimentares);
  avaliarTempo(avaliacao, perfil.tempo_preparo, temposPreparo, PESOS.tempo_preparo, "cabe no seu tempo de preparo");
  pontuarValor(avaliacao, perfil.nivel_atividade, niveisAtividade, PESOS.nivel_atividade, "compatível com sua rotina de atividade");
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
    recomendado: !avaliacao.bloqueado && (relevancia >= 45 || avaliacao.pontuacao >= 30),
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
  tempo_preparo: ["ate_15", "15_30", "30_60", "mais_60"]
});
