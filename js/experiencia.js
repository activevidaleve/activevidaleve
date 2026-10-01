import { normalizarPerfil, personalizarConteudos } from "./personalizacao.js";

const removerAcentos = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const token = (value = "") => removerAcentos(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

const lista = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const idConteudo = (item = {}) => String(item.conteudo_id || item.id || "").trim();
const dataSeed = () => new Date().toISOString().slice(0, 10);

const hash = (text = "") => {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

const label = (value = "") => String(value)
  .replace(/_/g, " ")
  .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());

const DURACOES = {
  ate_15: "até 15 minutos",
  "15_30": "15–30 minutos",
  "30_45": "30–45 minutos",
  mais_45: "mais de 45 minutos"
};

const LOCAIS = {
  casa: "em casa",
  academia: "na academia",
  ar_livre: "ao ar livre",
  variado: "em locais variados",
  varia: "em locais variados"
};

const PERFIS_ALIMENTARES = {
  variada: "alimentação variada",
  vegetariana: "alimentação vegetariana",
  vegana: "alimentação vegana",
  outra: "preferência alimentar informada"
};

const OBJETIVOS = {
  movimentar_mais: "se movimentar mais",
  melhorar_condicionamento: "melhorar o condicionamento",
  constancia_exercicios: "ganhar constância nos exercícios",
  organizar_alimentacao: "organizar melhor a alimentação",
  receitas_praticas: "encontrar receitas práticas",
  variar_refeicoes: "variar as refeições",
  rotina_organizada: "deixar a rotina mais organizada",
  bem_estar: "cuidar do bem-estar"
};

const INTERESSES = {
  cafe_manha: "café da manhã",
  almoco: "almoço",
  jantar: "jantar",
  lanches: "lanches",
  sucos: "sucos",
  receitas_rapidas: "receitas rápidas",
  marmitas: "marmitas"
};

const criarIndiceCatalogo = (catalogo = []) => new Map(catalogo.map((item) => [idConteudo(item), item]));

const addPeso = (mapa, chave, peso) => {
  if (!chave) return;
  mapa.set(chave, (mapa.get(chave) || 0) + peso);
};

const absorverItem = (mapas, item, peso = 1) => {
  if (!item) return;
  addPeso(mapas.tipos, token(item.tipo), 2 * peso);
  addPeso(mapas.categorias, token(item.categoria), 4 * peso);
  lista(item.tags).forEach((tag) => addPeso(mapas.tags, token(tag), 2 * peso));
  lista(item.publico?.interesses || item.interesses).forEach((interest) => addPeso(mapas.interesses, token(interest), 3 * peso));
  lista(item.publico?.objetivos || item.objetivos).forEach((goal) => addPeso(mapas.objetivos, token(goal), 2 * peso));
};

export const construirSinaisComportamento = ({
  catalogo = [],
  favoritos = [],
  historico = [],
  progresso = [],
  buscas = []
} = {}) => {
  const indice = criarIndiceCatalogo(catalogo);
  const mapas = {
    tipos: new Map(),
    categorias: new Map(),
    tags: new Map(),
    interesses: new Map(),
    objetivos: new Map()
  };

  favoritos.forEach((registro) => absorverItem(mapas, indice.get(idConteudo(registro)) || registro, 3));
  historico.slice(0, 12).forEach((registro, index) => absorverItem(mapas, indice.get(idConteudo(registro)) || registro, Math.max(0.8, 2.2 - index * 0.1)));
  progresso.forEach((registro) => {
    const item = indice.get(idConteudo(registro)) || registro;
    const peso = registro.status === "concluido" ? 2.4 : 3.2;
    absorverItem(mapas, item, peso);
  });

  const termosBusca = buscas
    .filter((item) => item?.termo)
    .map((item) => ({ termo: token(item.termo), peso: Math.min(5, Math.max(1, Number(item.contagem || 1))) }))
    .filter((item) => item.termo);

  return {
    ...mapas,
    termosBusca,
    favoritosIds: new Set(favoritos.map(idConteudo).filter(Boolean)),
    historicoIds: new Set(historico.map(idConteudo).filter(Boolean)),
    progressoMap: new Map(progresso.map((item) => [idConteudo(item), item]).filter(([id]) => id))
  };
};

export const determinarEstagioUsuario = ({ favoritos = [], historico = [], progresso = [], buscas = [] } = {}) => {
  const concluidos = progresso.filter((item) => item.status === "concluido").length;
  const emAndamento = progresso.filter((item) => item.status === "em_andamento").length;
  const interacoes = Math.min(20, historico.length)
    + favoritos.length * 2
    + concluidos * 3
    + emAndamento * 2
    + Math.min(8, buscas.length);

  if (historico.length <= 1 && concluidos === 0 && favoritos.length === 0 && emAndamento === 0 && buscas.length === 0) {
    return { id: "primeiros_passos", nivel: 0, interacoes };
  }
  if (interacoes < 14) return { id: "descobrindo", nivel: 1, interacoes };
  if (interacoes < 35) return { id: "em_ritmo", nivel: 2, interacoes };
  return { id: "recorrente", nivel: 3, interacoes };
};

const afinidadeComportamento = (item, sinais) => {
  if (!sinais) return 0;
  let score = 0;
  const id = idConteudo(item);
  const tipo = token(item.tipo);
  const categoria = token(item.categoria);

  score += Math.min(12, (sinais.tipos.get(tipo) || 0) * 0.7);
  score += Math.min(18, (sinais.categorias.get(categoria) || 0) * 0.85);
  lista(item.tags).forEach((tag) => { score += Math.min(6, (sinais.tags.get(token(tag)) || 0) * 0.35); });
  lista(item.publico?.interesses || item.interesses).forEach((interest) => { score += Math.min(8, (sinais.interesses.get(token(interest)) || 0) * 0.45); });
  lista(item.publico?.objetivos || item.objetivos).forEach((goal) => { score += Math.min(5, (sinais.objetivos.get(token(goal)) || 0) * 0.25); });

  const searchText = token([
    item.titulo,
    item.resumo,
    item.categoria,
    ...lista(item.tags),
    ...lista(item.publico?.interesses || item.interesses)
  ].filter(Boolean).join(" "));
  sinais.termosBusca.forEach(({ termo, peso }) => {
    if (termo && searchText.includes(termo)) score += Math.min(12, 2.5 * peso);
  });

  const progress = sinais.progressoMap.get(id);
  if (progress?.status === "em_andamento") score += 26;
  if (sinais.favoritosIds.has(id)) score += 12;
  if (sinais.historicoIds.has(id) && progress?.status !== "em_andamento") score -= 8;
  if (progress?.status === "concluido") score -= 55;

  return score;
};

const motivoComportamental = (item, sinais, profileData = {}) => {
  const id = idConteudo(item);
  const progress = sinais?.progressoMap?.get(id);
  if (progress?.status === "em_andamento") return "Continue de onde você parou";
  if (sinais?.favoritosIds?.has(id)) return "Você salvou este conteúdo";

  const perfil = normalizarPerfil(profileData);
  const publico = item.publico || {};
  const duracoes = lista(publico.duracoes || item.duracoes);
  const locais = lista(publico.locais || item.locais);
  const interesses = lista(publico.interesses || item.interesses);
  const objetivos = lista(publico.objetivos || item.objetivos);

  if (item.tipo === "exercicio" && perfil.duracao && duracoes.includes(perfil.duracao)) {
    return `Combina com seu tempo de ${DURACOES[perfil.duracao] || label(perfil.duracao)}`;
  }
  if (item.tipo === "exercicio" && perfil.local && (locais.includes(perfil.local) || locais.includes("variado"))) {
    return `Compatível com sua preferência de se exercitar ${LOCAIS[perfil.local] || label(perfil.local)}`;
  }
  const interest = perfil.interesses.find((value) => interesses.includes(value));
  if (interest) return `Relacionado ao seu interesse em ${INTERESSES[interest] || label(interest)}`;
  const goal = perfil.objetivos.find((value) => objetivos.includes(value));
  if (goal) return `Relacionado ao objetivo de ${OBJETIVOS[goal] || label(goal)}`;
  if (!sinais?.historicoIds?.has(id)) return "Uma descoberta nova para sua rotina";
  return item.personalizacao?.motivos?.[0] ? label(item.personalizacao.motivos[0]) : "Selecionado para o seu momento";
};

export const ordenarPorExperiencia = (items = [], {
  usuarioId = "",
  profileData = {},
  sinais = null,
  estagio = { nivel: 0 }
} = {}) => {
  const personalizados = items[0]?.personalizacao ? [...items] : personalizarConteudos(items, profileData);
  const seed = `${usuarioId}|${dataSeed()}`;

  return personalizados
    .filter((item) => !item.personalizacao?.bloqueado)
    .map((item) => {
      const comportamento = afinidadeComportamento(item, sinais);
      const base = Number(item.personalizacao?.pontuacao || 0);
      const novidade = sinais?.historicoIds?.has(idConteudo(item)) ? 0 : 5 + Number(estagio.nivel || 0);
      const desempate = (hash(`${seed}|${idConteudo(item)}`) % 1000) / 1000;
      return {
        ...item,
        experiencia_usuario: {
          pontuacao: base + comportamento + novidade,
          comportamento,
          novidade: novidade > 0,
          motivo: motivoComportamental(item, sinais, profileData)
        },
        __desempate: desempate
      };
    })
    .sort((a, b) => {
      const diff = b.experiencia_usuario.pontuacao - a.experiencia_usuario.pontuacao;
      if (diff) return diff;
      return b.__desempate - a.__desempate;
    })
    .map(({ __desempate, ...item }) => item);
};

export const selecionarDiversificado = (items = [], limit = 4, options = {}) => {
  const maxPorTipo = options.maxPorTipo ?? 2;
  const maxPorCategoria = options.maxPorCategoria ?? 1;
  const used = new Set();
  const tipos = new Map();
  const categorias = new Map();
  const result = [];

  const tryAdd = (item, relax = false) => {
    const id = idConteudo(item);
    if (!id || used.has(id)) return false;
    const tipo = token(item.tipo);
    const categoria = token(item.categoria);
    if (!relax) {
      if ((tipos.get(tipo) || 0) >= maxPorTipo) return false;
      if (categoria && (categorias.get(categoria) || 0) >= maxPorCategoria) return false;
    }
    used.add(id);
    tipos.set(tipo, (tipos.get(tipo) || 0) + 1);
    if (categoria) categorias.set(categoria, (categorias.get(categoria) || 0) + 1);
    result.push(item);
    return true;
  };

  items.forEach((item) => { if (result.length < limit) tryAdd(item, false); });
  if (result.length < limit) items.forEach((item) => { if (result.length < limit) tryAdd(item, true); });
  return result;
};

const prioridadeTema = (profileData = {}, sinais = null) => {
  const perfil = normalizarPerfil(profileData);
  const exerciseGoals = new Set(["movimentar_mais", "melhorar_condicionamento", "constancia_exercicios"]);
  const foodGoals = new Set(["organizar_alimentacao", "receitas_praticas", "variar_refeicoes", "rotina_organizada"]);
  let exercicio = perfil.objetivos.filter((goal) => exerciseGoals.has(goal)).length * 4;
  let receitas = perfil.objetivos.filter((goal) => foodGoals.has(goal)).length * 3 + perfil.interesses.length * 2;
  let alimentacao = perfil.objetivos.filter((goal) => ["organizar_alimentacao", "rotina_organizada", "bem_estar"].includes(goal)).length * 3;
  let sucos = perfil.interesses.includes("sucos") ? 6 : 0;

  exercicio += Math.min(10, sinais?.tipos?.get("exercicio") || 0);
  receitas += Math.min(10, sinais?.tipos?.get("receita") || 0);
  alimentacao += Math.min(8, sinais?.tipos?.get("alimentacao") || 0);
  sucos += Math.min(8, sinais?.categorias?.get("suco_detox") || 0);

  return [
    ["exercicios", exercicio],
    ["receitas", receitas],
    ["sucos", sucos],
    ["alimentacao", alimentacao]
  ].sort((a, b) => b[1] - a[1]).map(([key]) => key);
};

export const montarExperienciaHome = ({
  usuarioId = "",
  nome = "Usuário",
  profileData = {},
  catalogo = [],
  favoritos = [],
  historico = [],
  progresso = [],
  buscas = []
} = {}) => {
  const estagio = determinarEstagioUsuario({ favoritos, historico, progresso, buscas });
  const sinais = construirSinaisComportamento({ catalogo, favoritos, historico, progresso, buscas });
  const ordenados = ordenarPorExperiencia(catalogo, { usuarioId, profileData, sinais, estagio });
  const porTipo = (tipo) => ordenados.filter((item) => item.tipo === tipo);
  const exercicios = porTipo("exercicio");
  const alimentacao = porTipo("alimentacao");
  const receitasTodas = porTipo("receita");
  const sucos = receitasTodas.filter((item) => item.categoria === "suco_detox");
  const receitas = receitasTodas.filter((item) => item.categoria !== "suco_detox");
  const emAndamento = progresso.filter((item) => item.status === "em_andamento" && Number(item.progresso || 0) > 0);

  const prioridade = prioridadeTema(profileData, sinais);
  const shelfMap = { exercicios: "exercise", receitas: "recipe", sucos: "juice", alimentacao: "food" };
  const shelvesOrdenadas = prioridade.map((key) => shelfMap[key]);

  const baseOrder = estagio.id === "primeiros_passos"
    ? ["today", "personalized", "continue", ...shelvesOrdenadas, "library", "areas", "profile"]
    : estagio.id === "descobrindo"
      ? ["continue", "today", "personalized", ...shelvesOrdenadas, "library", "areas", "profile"]
      : ["continue", "personalized", "today", ...shelvesOrdenadas.slice(0, 2), "library", ...shelvesOrdenadas.slice(2), "areas", "profile"];

  const sectionOrder = [...new Set(baseOrder)];
  const perfil = normalizarPerfil(profileData);
  const primaryGoal = perfil.objetivos[0];
  const primaryInterest = perfil.interesses[0];
  const heroByStage = {
    primeiros_passos: {
      eyebrow: "SEU PONTO DE PARTIDA",
      text: `Usei o que você informou no cadastro para montar seus primeiros caminhos no portal${primaryGoal ? `, com atenção ao objetivo de ${OBJETIVOS[primaryGoal] || label(primaryGoal)}` : ""}.`
    },
    descobrindo: {
      eyebrow: "SEU ESPAÇO ESTÁ SE AJUSTANDO",
      text: `Além do seu cadastro, o portal já considera o que você abriu e salvou para deixar as próximas sugestões mais próximas da sua rotina.`
    },
    em_ritmo: {
      eyebrow: "SUA EXPERIÊNCIA ACTIVE",
      text: `Sua página combina seu perfil com o que você vem explorando. Conteúdos concluídos dão espaço a novas opções sem perder seus temas preferidos.`
    },
    recorrente: {
      eyebrow: "SEU ACTIVE, DO SEU JEITO",
      text: `Sua página usa seu histórico, favoritos, progresso e preferências para equilibrar continuidade, novidades e temas que fazem sentido para você.`
    }
  }[estagio.id];

  const personalizedTitle = estagio.id === "primeiros_passos"
    ? "Escolhas para começar com o que combina com você."
    : estagio.id === "descobrindo"
      ? "Novidades próximas do que você começou a explorar."
      : "Uma seleção que muda conforme você usa o portal.";

  const personalizedEyebrow = estagio.id === "primeiros_passos" ? "COMECE POR AQUI" : "NOVOS PARA VOCÊ";
  const continueTitle = emAndamento.length === 1
    ? "Você tem um conteúdo em andamento."
    : `Você tem ${emAndamento.length} conteúdos em andamento.`;

  const durationText = perfil.duracao ? DURACOES[perfil.duracao] : "seu tempo disponível";
  const locationText = perfil.local ? LOCAIS[perfil.local] : "seu local preferido";
  const foodText = PERFIS_ALIMENTARES[perfil.perfil_alimentar] || "suas preferências alimentares";
  const interestText = INTERESSES[primaryInterest] || "seus interesses";

  const statusConteudo = (item) => sinais.progressoMap.get(idConteudo(item))?.status || "novo";
  const disponiveis = ordenados.filter((item) => !["em_andamento", "concluido"].includes(statusConteudo(item)));
  const baseDisponivel = disponiveis.length >= 12 ? disponiveis : ordenados.filter((item) => statusConteudo(item) !== "em_andamento");

  const exerciciosDisponiveis = baseDisponivel.filter((item) => item.tipo === "exercicio");
  const alimentacaoDisponivel = baseDisponivel.filter((item) => item.tipo === "alimentacao");
  const receitasDisponiveisTodas = baseDisponivel.filter((item) => item.tipo === "receita");
  const sucosDisponiveis = receitasDisponiveisTodas.filter((item) => item.categoria === "suco_detox");
  const receitasDisponiveis = receitasDisponiveisTodas.filter((item) => item.categoria !== "suco_detox");

  const hojeExercicio = exerciciosDisponiveis[0] || exercicios[0] || null;
  const hojeAlimentacao = [...receitasDisponiveis, ...alimentacaoDisponivel, ...sucosDisponiveis]
    .sort((a, b) => b.experiencia_usuario.pontuacao - a.experiencia_usuario.pontuacao)[0] || null;
  const usados = new Set([idConteudo(hojeExercicio), idConteudo(hojeAlimentacao)].filter(Boolean));
  const semUsados = (items) => items.filter((item) => !usados.has(idConteudo(item)));

  const hojeDescoberta = semUsados(baseDisponivel)[0] || null;
  if (hojeDescoberta) usados.add(idConteudo(hojeDescoberta));

  const escolher = (items, limit, options) => {
    const escolhidos = selecionarDiversificado(semUsados(items), limit, options);
    escolhidos.forEach((item) => usados.add(idConteudo(item)));
    return escolhidos;
  };

  const secoes = {
    personalized: escolher(baseDisponivel, 4, { maxPorTipo: 2, maxPorCategoria: 1 }),
    exercise: [],
    recipe: [],
    juice: [],
    food: []
  };

  const fontes = {
    exercise: exerciciosDisponiveis,
    recipe: receitasDisponiveis,
    juice: sucosDisponiveis,
    food: alimentacaoDisponivel
  };
  shelvesOrdenadas.forEach((key) => {
    const limitOptions = key === "juice"
      ? { maxPorTipo: 4, maxPorCategoria: 4 }
      : { maxPorTipo: 4, maxPorCategoria: 1 };
    secoes[key] = escolher(fontes[key] || [], 4, limitOptions);
  });

  return {
    estagio,
    sinais,
    ordenados,
    hoje: {
      exercicio: hojeExercicio,
      alimentacao: hojeAlimentacao,
      descoberta: hojeDescoberta
    },
    secoes,
    textos: {
      nome,
      heroEyebrow: heroByStage.eyebrow,
      heroText: heroByStage.text,
      stageLabel: {
        primeiros_passos: "Primeiros passos",
        descobrindo: "Descobrindo seu ritmo",
        em_ritmo: "Experiência em evolução",
        recorrente: "Experiência personalizada"
      }[estagio.id],
      personalizedEyebrow,
      personalizedTitle,
      continueTitle,
      exerciseTitle: `Exercícios pensados para ${durationText}${perfil.local ? ` ${locationText}` : ""}.`,
      recipeTitle: `Receitas alinhadas à sua ${foodText}${primaryInterest ? ` e ao interesse em ${interestText}` : ""}.`,
      juiceTitle: primaryInterest === "sucos" ? "Sucos entre os temas que você escolheu explorar." : "Sucos para variar sua biblioteca de receitas.",
      foodTitle: primaryGoal ? `Conteúdos que conversam com seu objetivo de ${OBJETIVOS[primaryGoal] || label(primaryGoal)}.` : "Organização e variedade para sua rotina."
    },
    sectionOrder
  };
};

export const criarIntroducaoPersonalizada = (item = {}, profileData = {}, contexto = {}) => {
  const perfil = normalizarPerfil(profileData);
  const partes = [];
  const publico = item.publico || {};
  const duracoes = lista(publico.duracoes || item.duracoes);
  const locais = lista(publico.locais || item.locais);
  const interesses = lista(publico.interesses || item.interesses);
  const objetivos = lista(publico.objetivos || item.objetivos);

  if (item.tipo === "exercicio") {
    if (perfil.duracao && duracoes.includes(perfil.duracao)) partes.push(`Você informou que costuma reservar ${DURACOES[perfil.duracao] || label(perfil.duracao)} para se movimentar`);
    if (perfil.local && (locais.includes(perfil.local) || locais.includes("variado"))) partes.push(`e prefere opções ${LOCAIS[perfil.local] || label(perfil.local)}`);
  } else {
    const interest = perfil.interesses.find((value) => interesses.includes(value));
    if (interest) partes.push(`Este conteúdo conversa com seu interesse em ${INTERESSES[interest] || label(interest)}`);
    if (perfil.perfil_alimentar && lista(publico.perfis_alimentares || item.perfis_alimentares).includes(perfil.perfil_alimentar)) {
      partes.push(partes.length
        ? `e é compatível com sua ${PERFIS_ALIMENTARES[perfil.perfil_alimentar] || "preferência alimentar"}`
        : `Este conteúdo é compatível com sua ${PERFIS_ALIMENTARES[perfil.perfil_alimentar] || "preferência alimentar"}`);
    }
  }

  const goal = perfil.objetivos.find((value) => objetivos.includes(value));
  if (!partes.length && goal) partes.push(`Ele também se relaciona ao objetivo de ${OBJETIVOS[goal] || label(goal)}`);

  const prefixo = partes.length ? `${partes.join(" ")}. ` : "";
  const continuidade = contexto.status === "em_andamento" ? "Você já começou este conteúdo; continue do ponto em que parou. " : "";
  return `${continuidade}${prefixo}${item.introducao || item.resumo || ""}`.trim();
};
