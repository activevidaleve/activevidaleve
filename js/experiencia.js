import { normalizarPerfil, personalizarConteudos } from "./personalizacao.js";

const removerAcentos = (value = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const token = (value = "") => removerAcentos(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

const lista = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const idConteudo = (item = {}) => String(item?.conteudo_id || item?.id || "").trim();
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

const DIAS_EXERCICIO = {
  "1_2": "1–2 dias por semana",
  "3_4": "3–4 dias por semana",
  "5_mais": "5 ou mais dias por semana"
};

const NIVEIS_ATIVIDADE = {
  pouco_ativo: "uma rotina com pouco movimento",
  algumas_vezes_semana: "movimento algumas vezes por semana",
  ativo_frequente: "uma rotina ativa com frequência",
  muito_ativo: "uma rotina de movimento bem frequente"
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
  buscas = [],
  data = new Date()
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

  const raizBusca = (value = "") => {
    let word = token(value).replace(/_/g, "");
    if (word.length >= 5 && word.endsWith("s")) word = word.slice(0, -1);
    if (word.length >= 5 && /[ao]$/.test(word)) word = word.slice(0, -1);
    return word;
  };

  const termosBusca = buscas
    .filter((item) => item?.termo)
    .map((item) => {
      const termo = token(item.termo);
      const palavras = termo.split("_").map(raizBusca).filter((word) => word.length >= 3);
      return {
        termo,
        palavras: [...new Set(palavras)],
        peso: Math.min(5, Math.max(1, Number(item.contagem || 1)))
      };
    })
    .filter((item) => item.termo);

  const evidencias = favoritos.length * 2
    + Math.min(12, historico.length)
    + progresso.length * 2
    + Math.min(8, buscas.reduce((total, item) => total + Math.min(3, Number(item?.contagem || 1)), 0));
  const confianca = evidencias > 0 ? Math.min(1, evidencias / 12) : 0;

  return {
    ...mapas,
    termosBusca,
    confianca,
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
  let tendencia = 0;
  let scoreDireto = 0;
  const confianca = Math.max(0, Math.min(1, Number(sinais.confianca ?? 1)));
  const id = idConteudo(item);
  const tipo = token(item.tipo);
  const categoria = token(item.categoria);

  // Tendências amplas (tipo/categoria/tags) só ganham força à medida que há
  // evidência suficiente. Uma única interação pode destacar o item escolhido,
  // mas não deve reconstruir toda a home como se fosse uma preferência consolidada.
  tendencia += Math.min(12, (sinais.tipos.get(tipo) || 0) * 0.7);
  tendencia += Math.min(18, (sinais.categorias.get(categoria) || 0) * 0.85);
  lista(item.tags).forEach((tag) => { tendencia += Math.min(6, (sinais.tags.get(token(tag)) || 0) * 0.35); });
  lista(item.publico?.interesses || item.interesses).forEach((interest) => { tendencia += Math.min(8, (sinais.interesses.get(token(interest)) || 0) * 0.45); });
  lista(item.publico?.objetivos || item.objetivos).forEach((goal) => { tendencia += Math.min(5, (sinais.objetivos.get(token(goal)) || 0) * 0.25); });

  const searchText = token([
    item.titulo,
    item.resumo,
    item.categoria,
    ...lista(item.tags),
    ...lista(item.publico?.interesses || item.interesses)
  ].filter(Boolean).join(" "));
  const searchWords = searchText
    .split("_")
    .filter(Boolean)
    .map((word) => {
      let normalized = word;
      if (normalized.length >= 5 && normalized.endsWith("s")) normalized = normalized.slice(0, -1);
      if (normalized.length >= 5 && /[ao]$/.test(normalized)) normalized = normalized.slice(0, -1);
      return normalized;
    });
  const searchWordSet = new Set(searchWords);

  sinais.termosBusca.forEach(({ termo, palavras = [], peso }) => {
    const fraseExata = termo && searchText.includes(termo);
    const matches = palavras.filter((word) => searchWordSet.has(word)).length;
    if (fraseExata) tendencia += Math.min(12, 2.5 * peso);
    else if (matches) tendencia += Math.min(12, matches * 1.6 * peso);
  });

  const progress = sinais.progressoMap.get(id);
  if (progress?.status === "em_andamento") scoreDireto += 26;
  if (sinais.favoritosIds.has(id)) scoreDireto += 12;
  if (sinais.historicoIds.has(id) && progress?.status !== "em_andamento") scoreDireto -= 8;
  if (progress?.status === "concluido") scoreDireto -= 55;

  return tendencia * confianca + scoreDireto;
};

// `nivel_atividade` e `dias_exercicio` fazem parte do cadastro e precisam ter
// efeito perceptível, mas secundário. Eles nunca aumentam duração, dificuldade
// ou frequência prescrita; apenas ajudam a ordenar formatos de movimento que
// combinam melhor com a rotina declarada.
const afinidadeRotinaExercicio = (item, profileData = {}) => {
  if (item?.tipo !== "exercicio") return 0;
  const perfil = normalizarPerfil(profileData);
  const categoria = token(item.categoria);
  let bonus = 0;

  const porAtividade = {
    pouco_ativo: { pausas_ativas: 6, mobilidade: 5, cardio_leve: 3, alongamento: 3, forca: 2 },
    algumas_vezes_semana: { mobilidade: 4, cardio_leve: 4, forca: 4, alongamento: 3, pausas_ativas: 2 },
    ativo_frequente: { alongamento: 5, mobilidade: 4, forca: 4, cardio_leve: 3, pausas_ativas: 2 },
    muito_ativo: { alongamento: 6, mobilidade: 5, pausas_ativas: 4, forca: 2, cardio_leve: 2 }
  };

  const porDias = {
    "1_2": { forca: 4, cardio_leve: 3, mobilidade: 3, alongamento: 2, pausas_ativas: 2 },
    "3_4": { forca: 4, cardio_leve: 4, mobilidade: 4, alongamento: 3, pausas_ativas: 2 },
    "5_mais": { alongamento: 5, mobilidade: 5, pausas_ativas: 4, forca: 2, cardio_leve: 2 }
  };

  bonus += porAtividade[perfil.nivel_atividade]?.[categoria] || 0;
  bonus += porDias[perfil.dias_exercicio]?.[categoria] || 0;
  return Math.min(9, bonus);
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
  // A individualização por conta deve ser secundária. Perfil e comportamento
  // continuam sendo as forças principais; o UID serve apenas para um desempate leve
  // entre conteúdos quase equivalentes para aquela pessoa.
  const seed = `${usuarioId || "sem_usuario"}`;

  return personalizados
    .filter((item) => !item.personalizacao?.bloqueado)
    .map((item) => {
      const comportamento = afinidadeComportamento(item, sinais);
      const rotina = afinidadeRotinaExercicio(item, profileData);
      const base = Number(item.personalizacao?.pontuacao || 0);
      const novidade = sinais?.historicoIds?.has(idConteudo(item)) ? 0 : 5 + Number(estagio.nivel || 0);
      const baseExperiencia = base + comportamento + novidade + rotina;

      // Individualização controlada: no máximo ±0,45 ponto. Isso preserva a
      // coerência entre contas com o mesmo cadastro e ainda permite pequenas variações
      // quando dois conteúdos são praticamente equivalentes para o mesmo perfil.
      const unidade = (hash(`${seed}|${idConteudo(item)}`) % 10000) / 9999;
      const individualizacao = (unidade - 0.5) * 0.9;

      return {
        ...item,
        experiencia_usuario: {
          pontuacao: baseExperiencia,
          comportamento,
          rotina,
          novidade: novidade > 0,
          motivo: motivoComportamental(item, sinais, profileData)
        },
        __pontuacaoOrdenacao: baseExperiencia + individualizacao
      };
    })
    .sort((a, b) => {
      const diff = b.__pontuacaoOrdenacao - a.__pontuacaoOrdenacao;
      if (diff) return diff;
      return String(idConteudo(a)).localeCompare(String(idConteudo(b)), "pt-BR");
    })
    .map(({ __pontuacaoOrdenacao, ...item }) => item);
};

const selecionarEntreEquivalentes = (items = [], {
  usuarioId = "",
  chave = "selecao",
  margem = 4,
  limite = 12,
  preferir = null
} = {}) => {
  const candidatos = items.filter(Boolean);
  if (!candidatos.length) return null;

  const pontuacao = (item) => Number(item.experiencia_usuario?.pontuacao ?? item.personalizacao?.pontuacao ?? 0);
  const melhorPontuacao = Math.max(...candidatos.slice(0, 20).map(pontuacao));
  let equivalentes = candidatos
    .filter((item) => pontuacao(item) >= melhorPontuacao - margem)
    .slice(0, limite);

  if (typeof preferir === "function") {
    const preferidos = equivalentes.filter(preferir);
    if (preferidos.length) equivalentes = preferidos;
  }

  return [...equivalentes]
    .map((item) => ({
      item,
      ordem: hash(`${usuarioId || "sem_usuario"}|${chave}|${idConteudo(item)}`)
    }))
    .sort((a, b) => b.ordem - a.ordem)
    .map(({ item }) => item)[0] || candidatos[0];
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
  const afinidadeSucos = sinais?.categorias?.get("suco_detox") || 0;
  const afinidadeReceitas = sinais?.tipos?.get("receita") || 0;

  // Sucos Detox também têm tipo "receita". Sem este ajuste, um usuário que
  // explora principalmente sucos fortalecia a prateleira geral de receitas mais
  // do que a própria seção de sucos.
  receitas += Math.min(10, Math.max(0, afinidadeReceitas - afinidadeSucos * 0.8));
  alimentacao += Math.min(12, sinais?.tipos?.get("alimentacao") || 0);
  sucos += Math.min(18, afinidadeSucos * 1.5);

  return [
    ["exercicios", exercicio],
    ["receitas", receitas],
    ["sucos", sucos],
    ["alimentacao", alimentacao]
  ].sort((a, b) => b[1] - a[1]).map(([key]) => key);
};


const obterIdSemana = (date = new Date()) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

const periodoSemana = (date = new Date()) => {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = current.getDay() || 7;
  const monday = new Date(current);
  monday.setDate(current.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return `${format.format(monday)} a ${format.format(sunday)}`.replaceAll(".", "");
};

const ordenarComSeedSemanal = (items = [], usuarioId = "", semanaId = "") => [...items]
  .map((item) => {
    const base = Number(item.experiencia_usuario?.pontuacao ?? item.personalizacao?.pontuacao ?? 0);
    const jitter = (hash(`${usuarioId}|${semanaId}|${idConteudo(item)}`) % 1000) / 1000;
    return { item, valor: base + jitter * 3 };
  })
  .sort((a, b) => b.valor - a.valor)
  .map(({ item }) => item);

export const criarAssinaturaPerfilExperiencia = (profileData = {}) => {
  const perfil = normalizarPerfil(profileData);
  const payload = {
    objetivos: [...perfil.objetivos].sort(),
    interesses: [...perfil.interesses].sort(),
    nivel: perfil.nivel || "",
    duracao: perfil.duracao || "",
    local: perfil.local || "",
    equipamentos: [...perfil.equipamentos].sort(),
    perfil_alimentar: perfil.perfil_alimentar || "",
    tempo_preparo: perfil.tempo_preparo || "",
    nivel_atividade: perfil.nivel_atividade || "",
    dias_exercicio: perfil.dias_exercicio || "",
    restricoes: [...perfil.restricoes_detectadas].sort(),
    movimentos_evitar: [...perfil.movimentos_evitar_detectados].sort()
  };
  return hash(JSON.stringify(payload)).toString(16).padStart(8, "0");
};

export const montarRoteiroSemanal = ({
  usuarioId = "",
  profileData = {},
  ordenados = [],
  sinais = null,
  estagio = { id: "primeiros_passos", nivel: 0 },
  idsFixos = [],
  data = new Date()
} = {}) => {
  const semanaId = obterIdSemana(data);
  const perfil = normalizarPerfil(profileData);
  const assinaturaPerfil = criarAssinaturaPerfilExperiencia(profileData);
  const indice = new Map(ordenados.map((item) => [idConteudo(item), item]));
  const idsSalvos = lista(idsFixos).map(String).filter((id) => indice.has(id));
  const progressoMap = sinais?.progressoMap || new Map();

  const roleFor = (item) => {
    if (item?.tipo === "exercicio") return { id: "movimento", rotulo: "MOVIMENTO", icone: "↔" };
    if (item?.tipo === "alimentacao") return { id: "alimentacao", rotulo: "ALIMENTAÇÃO", icone: "◒" };
    if (item?.tipo === "receita" && item?.categoria === "suco_detox") return { id: "suco", rotulo: "SUCO DETOX", icone: "◉" };
    return { id: "receita", rotulo: "RECEITA", icone: "▱" };
  };

  let escolhidos = idsSalvos.map((id) => indice.get(id)).filter(Boolean);

  if (escolhidos.length < 4) {
    const naoConcluidos = ordenados.filter((item) => progressoMap.get(idConteudo(item))?.status !== "concluido");
    const grupos = {
      exercicios: naoConcluidos.filter((item) => item.tipo === "exercicio"),
      alimentacao: naoConcluidos.filter((item) => item.tipo === "alimentacao"),
      receitas: naoConcluidos.filter((item) => item.tipo === "receita" && item.categoria !== "suco_detox"),
      sucos: naoConcluidos.filter((item) => item.tipo === "receita" && item.categoria === "suco_detox")
    };
    const prioridade = prioridadeTema(profileData, sinais);
    const usados = new Set(escolhidos.map(idConteudo).filter(Boolean));

    prioridade.forEach((tema) => {
      if (escolhidos.length >= 4) return;
      const item = ordenarComSeedSemanal(grupos[tema] || [], usuarioId, semanaId)
        .find((candidate) => !usados.has(idConteudo(candidate)));
      if (!item) return;
      usados.add(idConteudo(item));
      escolhidos.push(item);
    });

    if (escolhidos.length < 4) {
      ordenarComSeedSemanal(naoConcluidos, usuarioId, semanaId).forEach((item) => {
        if (escolhidos.length >= 4) return;
        const id = idConteudo(item);
        if (!id || usados.has(id)) return;
        usados.add(id);
        escolhidos.push(item);
      });
    }
  }

  escolhidos = escolhidos.slice(0, 4).map((item) => ({
    ...item,
    roteiro_semana: roleFor(item)
  }));

  const explorados = escolhidos.filter((item) => {
    const id = idConteudo(item);
    return sinais?.historicoIds?.has(id) || progressoMap.has(id);
  }).length;
  const concluidos = escolhidos.filter((item) => progressoMap.get(idConteudo(item))?.status === "concluido").length;

  const primaryGoal = perfil.objetivos[0];
  const primaryInterest = perfil.interesses[0];
  const titleByStage = {
    primeiros_passos: "Quatro caminhos para começar pelo que combina com você.",
    descobrindo: "Uma seleção semanal ajustada ao que você começou a explorar.",
    em_ritmo: "Sua seleção da semana equilibra continuidade e novas descobertas.",
    recorrente: "Uma seleção renovada a partir do seu perfil e do seu histórico."
  };

  const partes = [];
  if (primaryGoal) partes.push(`seu objetivo de ${OBJETIVOS[primaryGoal] || label(primaryGoal)}`);
  if (perfil.duracao) partes.push(`seu tempo disponível de ${DURACOES[perfil.duracao] || label(perfil.duracao)}`);
  if (primaryInterest) partes.push(`seu interesse em ${INTERESSES[primaryInterest] || label(primaryInterest)}`);

  return {
    id: semanaId,
    assinatura_perfil: assinaturaPerfil,
    periodo: periodoSemana(data),
    itens: escolhidos,
    ids: escolhidos.map(idConteudo),
    explorados,
    concluidos,
    titulo: titleByStage[estagio.id] || titleByStage.primeiros_passos,
    descricao: partes.length
      ? `Esta seleção considera ${partes.slice(0, 3).join(", ")}. Explore apenas o que fizer sentido para sua rotina.`
      : "Esta seleção mistura conteúdos compatíveis com seu perfil e algumas descobertas novas. Explore no seu ritmo.",
    resumo: explorados
      ? `${explorados} de ${escolhidos.length} sugestões já foram exploradas por você.`
      : "As sugestões ficam estáveis durante a semana para você encontrá-las novamente."
  };
};

export const montarExperienciaHome = ({
  usuarioId = "",
  nome = "Usuário",
  profileData = {},
  catalogo = [],
  favoritos = [],
  historico = [],
  progresso = [],
  buscas = [],
  data = new Date()
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
    ? ["today", "week", "personalized", "continue", ...shelvesOrdenadas, "library", "areas", "profile"]
    : estagio.id === "descobrindo"
      ? ["continue", "week", "today", "personalized", ...shelvesOrdenadas, "library", "areas", "profile"]
      : ["continue", "week", "personalized", "today", ...shelvesOrdenadas.slice(0, 2), "library", ...shelvesOrdenadas.slice(2), "areas", "profile"];

  const sectionOrder = [...new Set(baseOrder)];
  const perfil = normalizarPerfil(profileData);
  const primaryGoal = perfil.objetivos[0];
  const primaryInterest = perfil.interesses[0];
  const heroByStage = {
    primeiros_passos: {
      eyebrow: "SEU PONTO DE PARTIDA",
      text: `Usei o que você informou no cadastro para montar seus primeiros caminhos no portal${primaryGoal ? `, com atenção ao objetivo de ${OBJETIVOS[primaryGoal] || label(primaryGoal)}` : ""}${perfil?.dias_exercicio ? ` e à frequência que você informou` : ""}.`
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
  const daysText = perfil.dias_exercicio ? DIAS_EXERCICIO[perfil.dias_exercicio] : "";
  const activityText = perfil.nivel_atividade ? NIVEIS_ATIVIDADE[perfil.nivel_atividade] : "";
  const foodText = PERFIS_ALIMENTARES[perfil.perfil_alimentar] || "suas preferências alimentares";
  const interestText = INTERESSES[primaryInterest] || "seus interesses";

  const statusConteudo = (item) => sinais.progressoMap.get(idConteudo(item))?.status || "novo";
  const disponiveis = ordenados.filter((item) => !["em_andamento", "concluido"].includes(statusConteudo(item)));
  // Não trazemos conteúdos concluídos de volta só para preencher prateleiras.
  // Se a pessoa já explorou quase toda a biblioteca, é melhor mostrar menos
  // novidades do que apresentar algo concluído como se fosse recomendação nova.
  const baseDisponivel = disponiveis;
  const bibliotecaSemNovidades = baseDisponivel.length === 0;
  const bibliotecaEsgotada = bibliotecaSemNovidades && emAndamento.length === 0;
  const sectionOrderFinal = bibliotecaEsgotada
    ? ["complete", "library", "areas", "profile"]
    : sectionOrder;

  const exerciciosDisponiveis = baseDisponivel.filter((item) => item.tipo === "exercicio");
  const alimentacaoDisponivel = baseDisponivel.filter((item) => item.tipo === "alimentacao");
  const receitasDisponiveisTodas = baseDisponivel.filter((item) => item.tipo === "receita");
  const sucosDisponiveis = receitasDisponiveisTodas.filter((item) => item.categoria === "suco_detox");
  const receitasDisponiveis = receitasDisponiveisTodas.filter((item) => item.categoria !== "suco_detox");

  const hojeExercicio = exerciciosDisponiveis[0] || null;

  // Para o destaque alimentar do dia, conteúdos com afinidade quase equivalente podem
  // alternar entre contas. Isso reduz a concentração em um único card sem escolher algo
  // fora do perfil: primeiro respeitamos a melhor faixa de pontuação e, quando possível,
  // o interesse principal informado no cadastro.
  const candidatosAlimentares = baseDisponivel.filter((item) => item.tipo !== "exercicio");
  const interessePrincipal = perfil.interesses[0];
  const hojeAlimentacao = selecionarEntreEquivalentes(candidatosAlimentares, {
    usuarioId,
    chave: "hoje_alimentacao",
    margem: 5,
    limite: 12,
    preferir: interessePrincipal
      ? (item) => lista(item.publico?.interesses || item.interesses).includes(interessePrincipal)
      : null
  }) || null;

  const usados = new Set([idConteudo(hojeExercicio), idConteudo(hojeAlimentacao)].filter(Boolean));
  const semUsados = (items) => items.filter((item) => !usados.has(idConteudo(item)));

  const categoriasHoje = new Set([hojeExercicio?.categoria, hojeAlimentacao?.categoria].filter(Boolean).map(token));
  const tiposHoje = new Set([hojeExercicio?.tipo, hojeAlimentacao?.tipo].filter(Boolean).map(token));
  const candidatosDescoberta = semUsados(baseDisponivel);
  const descobertaDiversa = candidatosDescoberta.filter((item) => {
    const categoria = token(item.categoria);
    const tipo = token(item.tipo);
    return !categoriasHoje.has(categoria) && !tiposHoje.has(tipo);
  });
  const descobertaCategoriaNova = candidatosDescoberta.filter((item) => !categoriasHoje.has(token(item.categoria)));
  const hojeDescoberta = selecionarEntreEquivalentes(
    descobertaDiversa.length ? descobertaDiversa : descobertaCategoriaNova.length ? descobertaCategoriaNova : candidatosDescoberta,
    { usuarioId, chave: "hoje_descoberta", margem: 7, limite: 12 }
  );
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

  const semana = montarRoteiroSemanal({
    usuarioId,
    profileData,
    ordenados,
    sinais,
    estagio,
    data
  });

  return {
    bibliotecaSemNovidades,
    bibliotecaEsgotada,
    novidadesRestantes: baseDisponivel.length,
    estagio,
    sinais,
    ordenados,
    semana,
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
      exerciseTitle: `Exercícios pensados para ${durationText}${perfil.local ? ` ${locationText}` : ""}${daysText ? `, considerando sua rotina de ${daysText}` : activityText ? `, considerando ${activityText}` : ""}.`,
      recipeTitle: `Receitas alinhadas à sua ${foodText}${primaryInterest ? ` e ao interesse em ${interestText}` : ""}.`,
      juiceTitle: primaryInterest === "sucos" ? "Sucos entre os temas que você escolheu explorar." : "Sucos para variar sua biblioteca de receitas.",
      foodTitle: primaryGoal ? `Conteúdos que conversam com seu objetivo de ${OBJETIVOS[primaryGoal] || label(primaryGoal)}.` : "Organização e variedade para sua rotina."
    },
    sectionOrder: sectionOrderFinal
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


const PRIMEIRO = (values = []) => Array.isArray(values) ? values.find(Boolean) : null;

const EQUIPAMENTOS_LABEL = {
  nenhum: "sem equipamento",
  halteres: "com halteres",
  elasticos: "com elásticos",
  colchonete: "com colchonete",
  academia: "com equipamentos de academia",
  outros: "com os equipamentos que você informou"
};

const NIVEL_LABEL = {
  iniciante: "iniciante",
  intermediario: "intermediário",
  experiente: "experiente"
};

const TEMPO_PREPARO_LABEL = {
  ate_15: "até 15 minutos",
  "15_30": "15–30 minutos",
  "30_60": "30–60 minutos",
  mais_60: "mais de 60 minutos"
};

const categoriaTemAfinidade = (item = {}, sinais = null) => {
  if (!sinais) return false;
  const categoria = token(item.categoria);
  return (sinais.categorias?.get(categoria) || 0) >= 6;
};

const haBuscaRelacionada = (item = {}, sinais = null) => {
  if (!sinais?.termosBusca?.length) return false;
  const texto = token([
    item.titulo,
    item.resumo,
    item.categoria,
    ...lista(item.tags),
    ...lista(item.publico?.interesses || item.interesses)
  ].filter(Boolean).join(" "));
  const palavrasTexto = new Set(texto.split("_").filter(Boolean).map((word) => {
    let normalized = word;
    if (normalized.length >= 5 && normalized.endsWith("s")) normalized = normalized.slice(0, -1);
    if (normalized.length >= 5 && /[ao]$/.test(normalized)) normalized = normalized.slice(0, -1);
    return normalized;
  }));
  return sinais.termosBusca.some(({ termo, palavras = [] }) => {
    if (termo && texto.includes(termo)) return true;
    return palavras.length > 0 && palavras.every((word) => palavrasTexto.has(word));
  });
};

export const criarApresentacaoPersonalizada = (item = {}, profileData = {}, contexto = {}) => {
  const perfil = normalizarPerfil(profileData);
  const publico = item.publico || {};
  const avaliacao = contexto.avaliacao || item.personalizacao || null;
  const sinais = contexto.sinais || null;
  const estagio = contexto.estagio || { id: "primeiros_passos", nivel: 0 };
  const status = contexto.status || "novo";
  const favorito = Boolean(contexto.favorito);
  const estadoPersonalizado = status !== "novo" || favorito;
  const pontos = [];
  const chips = [];

  const duracoes = lista(publico.duracoes || item.duracoes);
  const locais = lista(publico.locais || item.locais);
  const niveis = lista(publico.niveis || item.niveis);
  const equipamentos = lista(publico.equipamentos || item.equipamentos);
  const interesses = lista(publico.interesses || item.interesses);
  const objetivos = lista(publico.objetivos || item.objetivos);
  const perfisAlimentares = lista(publico.perfis_alimentares || item.perfis_alimentares);
  const temposPreparo = lista(publico.tempo_preparo || item.tempos_preparo || item.tempo_preparo);

  const objetivo = perfil.objetivos.find((value) => objetivos.includes(value));
  const interesse = perfil.interesses.find((value) => interesses.includes(value));
  const localCombina = perfil.local && (locais.includes(perfil.local) || locais.includes("variado"));
  const duracaoCombina = perfil.duracao && duracoes.includes(perfil.duracao);
  const nivelCombina = perfil.nivel && niveis.includes(perfil.nivel);
  const perfilAlimentarCombina = perfil.perfil_alimentar
    && (perfil.perfil_alimentar === "variada" || perfisAlimentares.includes(perfil.perfil_alimentar));
  const tempoPreparoCombina = perfil.tempo_preparo && temposPreparo.includes(perfil.tempo_preparo);

  let eyebrow = "SUA VERSÃO DESTE CONTEÚDO";
  let titulo = "Veja este conteúdo do jeito que combina com sua rotina.";
  let texto = "A base é a mesma, mas os destaques abaixo mudam de acordo com o seu perfil e com o que você vem explorando no Active Vida Leve.";
  let relatedTitle = "Mais conteúdos no seu ritmo";
  let recipePrepTitle = "Passo a passo";
  let exerciseStepsTitle = "Uma sequência simples";
  let ingredientsTitle = "Ingredientes-base";
  let variant = "geral";

  if (status === "em_andamento") {
    eyebrow = "CONTINUE DO SEU PONTO";
    titulo = "Você já começou este conteúdo.";
    texto = "Retome com calma a partir do que já faz sentido para você. Seu progresso continua salvo na sua conta.";
    chips.push("Em andamento");
  } else if (status === "concluido") {
    eyebrow = "CONTEÚDO JÁ EXPLORADO";
    titulo = "Você já concluiu este conteúdo.";
    texto = "Pode revisitá-lo quando quiser ou usar as sugestões personalizadas para descobrir algo diferente.";
    chips.push("Concluído");
    relatedTitle = "Novas descobertas para você";
  } else if (favorito) {
    eyebrow = "SALVO POR VOCÊ";
    titulo = "Este conteúdo já faz parte dos seus favoritos.";
    texto = "Além do seu cadastro, o portal usa suas escolhas para entender quais temas merecem mais espaço na sua experiência.";
    chips.push("Favorito");
  }

  if (item.tipo === "exercicio") {
    variant = perfil.nivel === "iniciante" ? "entrada" : perfil.nivel === "experiente" ? "continuidade" : "ritmo";

    if (!estadoPersonalizado && duracaoCombina && localCombina) {
      titulo = `Uma versão pensada para ${DURACOES[perfil.duracao] || label(perfil.duracao)}, ${LOCAIS[perfil.local] || label(perfil.local)}.`;
    } else if (!estadoPersonalizado && duracaoCombina) {
      titulo = `Este conteúdo cabe no tempo que você costuma reservar: ${DURACOES[perfil.duracao] || label(perfil.duracao)}.`;
    } else if (!estadoPersonalizado && nivelCombina) {
      titulo = `Uma proposta compatível com o nível ${NIVEL_LABEL[perfil.nivel] || label(perfil.nivel)} que você informou.`;
    }

    if (perfil.nivel === "iniciante") {
      pontos.push("Comece com movimentos confortáveis e faça pausas sempre que precisar.");
      exerciseStepsTitle = "Comece por estas etapas";
    } else if (perfil.nivel === "experiente") {
      pontos.push("Use a sequência como uma opção de variedade, mantendo execução controlada e confortável.");
      exerciseStepsTitle = "Sequência principal";
    } else {
      pontos.push("Mantenha um ritmo que permita executar cada etapa com controle.");
      exerciseStepsTitle = "Sequência para o seu ritmo";
    }

    if (duracaoCombina) {
      pontos.push(`A duração combina com o tempo que você informou: ${DURACOES[perfil.duracao] || label(perfil.duracao)}.`);
      chips.push(DURACOES[perfil.duracao] || label(perfil.duracao));
    }
    if (localCombina) {
      pontos.push(`Pode ser explorado ${LOCAIS[perfil.local] || label(perfil.local)}, como você indicou no cadastro.`);
      chips.push(LOCAIS[perfil.local] || label(perfil.local));
    }
    if (equipamentos.includes("nenhum")) {
      pontos.push("Não depende de equipamento específico.");
      chips.push("Sem equipamento");
    } else {
      const match = perfil.equipamentos.find((value) => equipamentos.includes(value));
      if (match) {
        pontos.push(`Usa um recurso que você informou ter disponível: ${EQUIPAMENTOS_LABEL[match] || label(match)}.`);
        chips.push(EQUIPAMENTOS_LABEL[match] || label(match));
      }
    }
    if (objetivo) pontos.push(`Também conversa com seu objetivo de ${OBJETIVOS[objetivo] || label(objetivo)}.`);
  } else {
    variant = item.categoria === "suco_detox" ? "suco" : item.tipo === "receita" ? "receita" : "alimentacao";

    if (!estadoPersonalizado && tempoPreparoCombina && interesse) {
      titulo = `Uma opção ligada ao seu interesse em ${INTERESSES[interesse] || label(interesse)} e ao seu tempo de preparo.`;
    } else if (!estadoPersonalizado && interesse) {
      titulo = `Este conteúdo conversa com seu interesse em ${INTERESSES[interesse] || label(interesse)}.`;
    }
  }

  if (item.tipo !== "exercicio") {
    if (interesse) {
      if (!estadoPersonalizado) {
        titulo = tempoPreparoCombina
          ? `Uma opção ligada ao seu interesse em ${INTERESSES[interesse] || label(interesse)} e ao seu tempo de preparo.`
          : `Este conteúdo conversa com seu interesse em ${INTERESSES[interesse] || label(interesse)}.`;
      }
      pontos.push(`Você marcou ${INTERESSES[interesse] || label(interesse)} entre os temas que quer explorar.`);
      chips.push(INTERESSES[interesse] || label(interesse));
    }
    if (perfilAlimentarCombina && perfil.perfil_alimentar && perfil.perfil_alimentar !== "variada") {
      pontos.push(`A proposta é compatível com sua ${PERFIS_ALIMENTARES[perfil.perfil_alimentar] || "preferência alimentar"}.`);
      chips.push(PERFIS_ALIMENTARES[perfil.perfil_alimentar] || "Preferência alimentar");
    }
    if (tempoPreparoCombina) {
      pontos.push(`O preparo se encaixa no tempo que você informou: ${TEMPO_PREPARO_LABEL[perfil.tempo_preparo] || label(perfil.tempo_preparo)}.`);
      chips.push(TEMPO_PREPARO_LABEL[perfil.tempo_preparo] || label(perfil.tempo_preparo));
      if (item.tipo === "receita") recipePrepTitle = "Preparo no seu tempo";
    }
    if (objetivo) pontos.push(`Também se relaciona ao seu objetivo de ${OBJETIVOS[objetivo] || label(objetivo)}.`);
    if (item.tipo === "receita") {
      ingredientsTitle = perfil.perfil_alimentar === "vegana" ? "Ingredientes da sua versão" : "Ingredientes";
    }
    if (item.categoria === "suco_detox") {
      relatedTitle = "Outras combinações para variar";
      pontos.push("Use como uma bebida dentro de uma alimentação variada; não precisa substituir refeições.");
    }
  }

  if (categoriaTemAfinidade(item, sinais)) {
    pontos.push("Você vem explorando outros conteúdos deste tema, então ele ganhou mais destaque para sua conta.");
    chips.push("Tema frequente");
  }
  if (haBuscaRelacionada(item, sinais)) {
    pontos.push("Ele também se relaciona a temas que você pesquisou recentemente no portal.");
    chips.push("Relacionado às suas buscas");
  }
  if (!sinais?.historicoIds?.has(String(item.id || item.conteudo_id || "")) && status === "novo") {
    pontos.push("É uma descoberta nova: você ainda não tinha aberto este conteúdo.");
  }

  if (avaliacao?.bloqueado) {
    eyebrow = "ATENÇÃO AO SEU PERFIL";
    titulo = "Este conteúdo não foi priorizado automaticamente.";
    texto = "Ele continua disponível para consulta, mas seu perfil indica uma preferência ou restrição que merece atenção antes de usar esta sugestão.";
    relatedTitle = "Alternativas mais compatíveis com seu perfil";
  }

  const fallbackPontos = item.tipo === "exercicio"
    ? ["Adapte a amplitude e faça pausas conforme necessário.", "Pare se sentir dor ou desconforto fora do esperado."]
    : ["Ajuste ingredientes e quantidades às suas preferências.", "Confira ingredientes e rótulos quando houver alergias ou restrições."];

  fallbackPontos.forEach((value) => {
    if (pontos.length < 3 && !pontos.includes(value)) pontos.push(value);
  });

  const stageCopy = {
    primeiros_passos: "O portal ainda está conhecendo suas preferências; o cadastro tem mais peso nesta escolha.",
    descobrindo: "Seu cadastro e suas primeiras interações já estão sendo combinados nesta apresentação.",
    em_ritmo: "Seu histórico recente ajuda a definir o que merece destaque nesta página.",
    recorrente: "Esta apresentação considera seu perfil e o padrão de uso que sua conta construiu ao longo do tempo."
  }[estagio.id];

  return {
    eyebrow,
    titulo,
    texto,
    pontos: [...new Set(pontos)].slice(0, 5),
    chips: [...new Set(chips)].slice(0, 4),
    notaEstagio: stageCopy || "",
    relatedTitle,
    recipePrepTitle,
    exerciseStepsTitle,
    ingredientsTitle,
    variant
  };
};

