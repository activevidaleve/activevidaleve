import fs from "node:fs";
import assert from "node:assert/strict";
import {
  montarExperienciaHome,
  montarRoteiroSemanal,
  construirSinaisComportamento,
  determinarEstagioUsuario,
  ordenarPorExperiencia
} from "../js/experiencia.js";
import {
  avaliarConteudo,
  personalizarConteudos,
  taxonomiaPersonalizacao
} from "../js/personalizacao.js";

const catalogoJson = JSON.parse(fs.readFileSync(new URL("../dados/conteudos-exemplo.json", import.meta.url), "utf8"));
const catalogo = catalogoJson.conteudos;
const indice = new Map(catalogo.map((item) => [item.id, item]));
const primeiro = (predicate) => catalogo.find(predicate);
const varios = (predicate, limite = 5) => catalogo.filter(predicate).slice(0, limite);
const registro = (item, extra = {}) => ({ conteudo_id: item.id, ...extra });
const ids = (items = []) => items.filter(Boolean).map((item) => item.id);

const ORDEM_EXERCICIO = { ate_15: 1, "15_30": 2, "30_45": 3, mais_45: 4 };
const ORDEM_PREPARO = { ate_15: 1, "15_30": 2, "30_60": 3, mais_60: 4 };

const marmitas = varios((item) => item.tipo === "receita" && item.categoria === "marmitas", 4);
const exerciciosCasa = varios((item) => item.tipo === "exercicio" && (item.publico?.locais || []).includes("casa"), 6);

const cenarios = [
  {
    id: "iniciante_casa_15min",
    perfil: {
      objetivos: ["movimentar_mais", "constancia_exercicios", "melhorar_condicionamento"],
      nivel_exercicio: "iniciante",
      dias_exercicio: "3_4",
      duracao_treino: "ate_15",
      local_exercicio: "casa",
      equipamentos: ["nenhum"],
      perfil_alimentar: "variada",
      interesses_alimentares: ["receitas_rapidas", "cafe_manha"],
      tempo_preparo: "ate_15",
      nivel_atividade: "pouco_ativo"
    },
    esperado: { estagio: "primeiros_passos", exercicioLocal: "casa", exercicioDuracaoMax: "ate_15" }
  },
  {
    id: "intermediario_academia_longo",
    perfil: {
      objetivos: ["melhorar_condicionamento", "movimentar_mais", "rotina_organizada"],
      nivel_exercicio: "intermediario",
      dias_exercicio: "5_mais",
      duracao_treino: "mais_45",
      local_exercicio: "academia",
      equipamentos: ["halteres", "academia"],
      perfil_alimentar: "variada",
      interesses_alimentares: ["marmitas", "almoco"],
      tempo_preparo: "30_60",
      nivel_atividade: "muito_ativo"
    },
    esperado: { estagio: "primeiros_passos", exercicioLocal: "academia", exercicioDuracaoMax: "mais_45" }
  },
  {
    id: "vegano_rapido_sucos",
    perfil: {
      objetivos: ["organizar_alimentacao", "receitas_praticas", "variar_refeicoes"],
      nivel_exercicio: "iniciante",
      duracao_treino: "15_30",
      local_exercicio: "casa",
      equipamentos: ["nenhum"],
      perfil_alimentar: "vegana",
      interesses_alimentares: ["sucos", "receitas_rapidas", "cafe_manha"],
      tempo_preparo: "ate_15"
    },
    esperado: { estagio: "primeiros_passos", perfilAlimentar: "vegana" }
  },
  {
    id: "experiente_ar_livre",
    perfil: {
      objetivos: ["melhorar_condicionamento", "movimentar_mais", "bem_estar"],
      nivel_exercicio: "experiente",
      duracao_treino: "30_45",
      local_exercicio: "ar_livre",
      equipamentos: ["nenhum"],
      perfil_alimentar: "variada",
      interesses_alimentares: ["almoco"],
      tempo_preparo: "30_60",
      nivel_atividade: "muito_ativo"
    },
    esperado: { estagio: "primeiros_passos", exercicioLocal: "ar_livre", exercicioDuracaoMax: "30_45" }
  },
  {
    id: "recorrente_marmitas",
    perfil: {
      objetivos: ["organizar_alimentacao", "receitas_praticas", "rotina_organizada"],
      nivel_exercicio: "iniciante",
      duracao_treino: "ate_15",
      local_exercicio: "casa",
      equipamentos: ["nenhum"],
      perfil_alimentar: "variada",
      interesses_alimentares: ["marmitas", "almoco", "receitas_rapidas"],
      tempo_preparo: "15_30"
    },
    interacoes: {
      favoritos: marmitas.slice(0, 2).map((item) => registro(item)),
      historico: marmitas.map((item, index) => registro(item, { ordem_teste: index })),
      progresso: marmitas.slice(0, 2).map((item, index) => registro(item, {
        status: index === 0 ? "em_andamento" : "concluido",
        progresso: index === 0 ? 45 : 100
      })),
      buscas: [{ termo: "marmita", contagem: 4 }, { termo: "almoço rápido", contagem: 2 }]
    },
    esperado: { estagio: "descobrindo" }
  },
  {
    id: "recorrente_exercicios",
    perfil: {
      objetivos: ["constancia_exercicios", "melhorar_condicionamento", "movimentar_mais"],
      nivel_exercicio: "intermediario",
      duracao_treino: "15_30",
      local_exercicio: "casa",
      equipamentos: ["elasticos", "colchonete"],
      perfil_alimentar: "variada",
      interesses_alimentares: ["jantar"],
      tempo_preparo: "15_30"
    },
    interacoes: {
      favoritos: exerciciosCasa.slice(0, 3).map((item) => registro(item)),
      historico: exerciciosCasa.map((item, index) => registro(item, { ordem_teste: index })),
      progresso: exerciciosCasa.slice(0, 5).map((item, index) => registro(item, {
        status: index < 2 ? "concluido" : "em_andamento",
        progresso: index < 2 ? 100 : 35 + index * 10
      })),
      buscas: [{ termo: "mobilidade", contagem: 3 }, { termo: "alongamento", contagem: 2 }]
    },
    esperado: { estagio: "em_ritmo" }
  },
  {
    id: "restricoes_lactose_gluten",
    perfil: {
      objetivos: ["receitas_praticas", "variar_refeicoes"],
      nivel_exercicio: "iniciante",
      duracao_treino: "ate_15",
      local_exercicio: "casa",
      equipamentos: ["nenhum"],
      perfil_alimentar: "variada",
      interesses_alimentares: ["cafe_manha", "lanches", "receitas_rapidas"],
      tempo_preparo: "ate_15",
      restricoes_alimentares: "intolerância à lactose e evitar glúten",
      alimentos_evitar: "leite, trigo"
    },
    esperado: { estagio: "primeiros_passos" }
  }
];

const idsPrincipais = (experiencia) => [
  experiencia.hoje.exercicio,
  experiencia.hoje.alimentacao,
  experiencia.hoje.descoberta,
  ...experiencia.secoes.personalized
].filter(Boolean).map((item) => item.id);

const idsHomeSemRoteiro = (experiencia) => [
  experiencia.hoje.exercicio,
  experiencia.hoje.alimentacao,
  experiencia.hoje.descoberta,
  ...Object.values(experiencia.secoes).flat()
].filter(Boolean).map((item) => item.id);

// 1) Estrutura e taxonomia da biblioteca.
assert.equal(catalogo.length, 80, "A biblioteca deve ter 80 conteúdos na baseline validada.");
assert.equal(new Set(catalogo.map((item) => item.id)).size, catalogo.length, "IDs de conteúdo precisam ser únicos.");
assert.equal(catalogo.filter((item) => item.tipo === "alimentacao").length, 20, "Devem existir 20 conteúdos de alimentação.");
assert.equal(catalogo.filter((item) => item.tipo === "exercicio").length, 20, "Devem existir 20 exercícios.");
assert.equal(catalogo.filter((item) => item.tipo === "receita" && item.categoria !== "suco_detox").length, 20, "Devem existir 20 receitas regulares.");
assert.equal(catalogo.filter((item) => item.tipo === "receita" && item.categoria === "suco_detox").length, 20, "Devem existir 20 sucos detox.");

const camposTaxonomia = {
  objetivos: new Set(taxonomiaPersonalizacao.objetivos),
  niveis: new Set(taxonomiaPersonalizacao.niveis),
  duracoes: new Set(taxonomiaPersonalizacao.duracoes),
  locais: new Set(taxonomiaPersonalizacao.locais),
  equipamentos: new Set(taxonomiaPersonalizacao.equipamentos),
  perfis_alimentares: new Set(taxonomiaPersonalizacao.perfis_alimentares),
  interesses: new Set(taxonomiaPersonalizacao.interesses),
  tempo_preparo: new Set(taxonomiaPersonalizacao.tempo_preparo)
};

catalogo.forEach((item) => {
  assert.ok(item.id && item.tipo && item.titulo && item.publico, `${item.id || item.titulo || "conteúdo"}: estrutura mínima ausente.`);
  Object.entries(camposTaxonomia).forEach(([campo, permitidos]) => {
    const values = item.publico?.[campo] || [];
    values.forEach((value) => assert.ok(permitidos.has(value), `${item.id}: valor inválido em publico.${campo}: ${value}`));
  });
});

// 2) Sete cenários representativos, estabilidade e ausência de bloqueados/repetições.
const resultados = [];
for (const cenario of cenarios) {
  const interacoes = { favoritos: [], historico: [], progresso: [], buscas: [], ...(cenario.interacoes || {}) };
  const args = {
    usuarioId: `teste_${cenario.id}`,
    nome: "Pessoa teste",
    profileData: cenario.perfil,
    catalogo,
    ...interacoes
  };

  const experiencia = montarExperienciaHome(args);
  const repeticao = montarExperienciaHome(args);
  const principais = idsPrincipais(experiencia);

  assert.equal(experiencia.estagio.id, cenario.esperado.estagio, `${cenario.id}: estágio inesperado.`);
  assert.deepEqual(idsPrincipais(experiencia), idsPrincipais(repeticao), `${cenario.id}: a experiência deve ser estável com a mesma entrada.`);
  assert.equal(new Set(principais).size, principais.length, `${cenario.id}: não deve repetir conteúdo entre Hoje e Selecionado para você.`);
  const homeSemRoteiro = idsHomeSemRoteiro(experiencia);
  assert.equal(new Set(homeSemRoteiro).size, homeSemRoteiro.length, `${cenario.id}: a home não deve repetir cards entre prateleiras dinâmicas.`);
  const semanaIds = experiencia.semana.itens.map((item) => item.id);
  assert.equal(new Set(semanaIds).size, semanaIds.length, `${cenario.id}: a seleção semanal deve ter itens únicos.`);
  assert.equal(semanaIds.length, 4, `${cenario.id}: a seleção semanal deve conter quatro itens.`);

  const bloqueadosPrincipais = principais
    .map((id) => indice.get(id))
    .filter(Boolean)
    .filter((item) => avaliarConteudo(item, cenario.perfil).bloqueado);
  assert.equal(bloqueadosPrincipais.length, 0, `${cenario.id}: conteúdo bloqueado apareceu em área principal.`);

  const exercicioHoje = experiencia.hoje.exercicio;
  if (cenario.esperado.exercicioLocal && exercicioHoje) {
    const locais = exercicioHoje.publico?.locais || [];
    assert.ok(
      locais.includes(cenario.esperado.exercicioLocal) || locais.includes("variado"),
      `${cenario.id}: exercício principal não combina com o local informado.`
    );
  }
  if (cenario.esperado.exercicioDuracaoMax && exercicioHoje) {
    const ordens = (exercicioHoje.publico?.duracoes || []).map((value) => ORDEM_EXERCICIO[value]).filter(Boolean);
    assert.ok(ordens.length && Math.min(...ordens) <= ORDEM_EXERCICIO[cenario.esperado.exercicioDuracaoMax], `${cenario.id}: exercício principal excede o tempo informado.`);
  }

  if (cenario.esperado.perfilAlimentar) {
    const alimentares = [experiencia.hoje.alimentacao, ...experiencia.secoes.recipe, ...experiencia.secoes.juice]
      .filter((item) => item?.publico?.perfis_alimentares?.length);
    alimentares.forEach((item) => {
      assert.ok(
        item.publico.perfis_alimentares.includes(cenario.esperado.perfilAlimentar),
        `${cenario.id}: conteúdo alimentar incompatível com ${cenario.esperado.perfilAlimentar}.`
      );
    });
  }

  resultados.push({
    cenario: cenario.id,
    estagio: experiencia.estagio.id,
    hoje: [experiencia.hoje.exercicio, experiencia.hoje.alimentacao, experiencia.hoje.descoberta].filter(Boolean).map((item) => item.titulo),
    selecao_personalizada: experiencia.secoes.personalized.map((item) => item.titulo),
    selecao_semana: experiencia.semana.itens.map((item) => item.titulo)
  });
}

const academia = resultados.find((item) => item.cenario === "intermediario_academia_longo");
const casa = resultados.find((item) => item.cenario === "iniciante_casa_15min");
assert.notDeepEqual(academia.hoje, casa.hoje, "Perfis muito diferentes não devem receber a mesma seleção principal.");

// 3) Matriz de exercícios: 288 combinações de nível, duração, local e equipamento.
const niveis = ["iniciante", "intermediario", "experiente"];
const duracoes = ["ate_15", "15_30", "30_45", "mais_45"];
const locais = ["casa", "academia", "ar_livre", "variado"];
const equipamentos = [["nenhum"], ["halteres"], ["elasticos"], ["colchonete"], ["academia"], ["halteres", "academia"]];
let exercicioTotal = 0;
let duracaoExata = 0;
let duracaoExataPossivel = 0;

for (const nivel_exercicio of niveis) {
  for (const duracao_treino of duracoes) {
    for (const local_exercicio of locais) {
      for (const equipamentoPerfil of equipamentos) {
        const perfil = {
          objetivos: ["movimentar_mais", "melhorar_condicionamento", "constancia_exercicios"],
          nivel_exercicio,
          duracao_treino,
          local_exercicio,
          equipamentos: equipamentoPerfil,
          perfil_alimentar: "variada",
          interesses_alimentares: ["receitas_rapidas"],
          tempo_preparo: "ate_15"
        };
        const experiencia = montarExperienciaHome({ usuarioId: `matriz_ex_${exercicioTotal}`, profileData: perfil, catalogo });
        const principal = experiencia.hoje.exercicio;
        exercicioTotal += 1;
        assert.ok(principal, "Matriz de exercício: deve existir exercício principal.");
        assert.equal(avaliarConteudo(principal, perfil).bloqueado, false, "Matriz de exercício: principal não pode estar bloqueado.");
        assert.ok((principal.publico?.niveis || []).includes(nivel_exercicio), "Matriz de exercício: nível principal precisa coincidir com o cadastro.");
        assert.ok((principal.publico?.locais || []).includes(local_exercicio) || (principal.publico?.locais || []).includes("variado"), "Matriz de exercício: local incompatível.");

        const ordens = (principal.publico?.duracoes || []).map((value) => ORDEM_EXERCICIO[value]).filter(Boolean);
        assert.ok(ordens.length && Math.min(...ordens) <= ORDEM_EXERCICIO[duracao_treino], "Matriz de exercício: conteúdo principal excedeu o tempo disponível.");

        if (equipamentoPerfil.includes("nenhum")) {
          assert.ok((principal.publico?.equipamentos || []).includes("nenhum"), "Matriz de exercício: usuário sem equipamento recebeu exercício que exige equipamento.");
        }

        const candidatosExatos = catalogo.filter((item) => item.tipo === "exercicio"
          && (item.publico?.niveis || []).includes(nivel_exercicio)
          && (item.publico?.duracoes || []).includes(duracao_treino)
          && ((item.publico?.locais || []).includes(local_exercicio) || (item.publico?.locais || []).includes("variado"))
          && !avaliarConteudo(item, perfil).bloqueado);
        if (candidatosExatos.length) {
          duracaoExataPossivel += 1;
          if ((principal.publico?.duracoes || []).includes(duracao_treino)) duracaoExata += 1;
        }
      }
    }
  }
}

const taxaDuracaoExata = duracaoExataPossivel ? duracaoExata / duracaoExataPossivel : 0;
assert.ok(taxaDuracaoExata >= 0.75, `Matriz de exercício: prioridade de duração exata caiu para ${(taxaDuracaoExata * 100).toFixed(1)}%.`);

// 4) Matriz alimentar: 84 combinações de perfil alimentar, tempo e interesse.
const perfisAlimentares = ["variada", "vegetariana", "vegana"];
const temposPreparo = ["ate_15", "15_30", "30_60", "mais_60"];
const interesses = ["cafe_manha", "almoco", "jantar", "lanches", "sucos", "receitas_rapidas", "marmitas"];
let alimentacaoTotal = 0;

for (const perfil_alimentar of perfisAlimentares) {
  for (const tempo_preparo of temposPreparo) {
    for (const interesse of interesses) {
      const perfil = {
        objetivos: ["organizar_alimentacao", "receitas_praticas", "variar_refeicoes"],
        nivel_exercicio: "iniciante",
        duracao_treino: "15_30",
        local_exercicio: "casa",
        equipamentos: ["nenhum"],
        perfil_alimentar,
        interesses_alimentares: [interesse],
        tempo_preparo
      };
      const experiencia = montarExperienciaHome({ usuarioId: `matriz_food_${alimentacaoTotal}`, profileData: perfil, catalogo });
      const principal = experiencia.hoje.alimentacao;
      alimentacaoTotal += 1;
      assert.ok(principal, "Matriz alimentar: deve existir conteúdo alimentar principal.");
      assert.equal(avaliarConteudo(principal, perfil).bloqueado, false, "Matriz alimentar: principal não pode estar bloqueado.");

      const perfisItem = principal.publico?.perfis_alimentares || [];
      if (perfil_alimentar !== "variada" && perfisItem.length) {
        assert.ok(perfisItem.includes(perfil_alimentar), `Matriz alimentar: item incompatível com perfil ${perfil_alimentar}.`);
      }

      const temposItem = principal.publico?.tempo_preparo || [];
      const ordens = temposItem.map((value) => ORDEM_PREPARO[value]).filter(Boolean);
      if (ordens.length) {
        assert.ok(Math.min(...ordens) <= ORDEM_PREPARO[tempo_preparo], "Matriz alimentar: preparo principal excede o tempo informado.");
      }

      const candidatosInteresse = catalogo.filter((item) => item.tipo !== "exercicio"
        && (item.publico?.interesses || []).includes(interesse)
        && !avaliarConteudo(item, perfil).bloqueado);
      if (candidatosInteresse.length) {
        assert.ok((principal.publico?.interesses || []).includes(interesse), `Matriz alimentar: interesse ${interesse} não foi priorizado quando havia opção compatível.`);
      }
    }
  }
}

// 5) Restrições e movimentos a evitar: variantes de escrita precisam convergir para a mesma proteção.
const comLeite = primeiro((item) => (item.alergenos || []).includes("leite"));
const comGluten = primeiro((item) => (item.alergenos || []).includes("gluten"));
const comFlexao = primeiro((item) => (item.movimentos_tags || []).includes("flexao"));
assert.ok(comLeite && comGluten && comFlexao, "A biblioteca precisa conter itens de teste para leite, glúten e flexão.");
["lactose", "intolerância à lactose", "evitar leite"].forEach((texto) => {
  assert.equal(avaliarConteudo(comLeite, { restricoes_alimentares: texto }).bloqueado, true, `Restrição '${texto}' deveria bloquear leite.`);
});
["glúten", "trigo", "celíaco", "celíaca", "doença celíaca"].forEach((texto) => {
  assert.equal(avaliarConteudo(comGluten, { restricoes_alimentares: texto }).bloqueado, true, `Restrição '${texto}' deveria bloquear glúten.`);
});
["flexão", "flexões", "evitar flexões", "não quero fazer flexão"].forEach((texto) => {
  assert.equal(avaliarConteudo(comFlexao, { exercicios_evitar: texto }).bloqueado, true, `Movimento '${texto}' deveria bloquear conteúdo com flexão.`);
});

// 6) Roteiro semanal persistido: se um item salvo deixar de ser válido, a seleção precisa voltar a quatro itens.
{
  const perfil = cenarios[0].perfil;
  const sinais = construirSinaisComportamento({ catalogo });
  const estagio = determinarEstagioUsuario({});
  const ordenados = ordenarPorExperiencia(catalogo, { usuarioId: "roteiro_teste", profileData: perfil, sinais, estagio });
  const tresFixos = ordenados.slice(0, 3).map((item) => item.id);
  const roteiro = montarRoteiroSemanal({ usuarioId: "roteiro_teste", profileData: perfil, ordenados, sinais, estagio, idsFixos: tresFixos });
  assert.equal(roteiro.ids.length, 4, "Roteiro semanal com três IDs válidos deve ser recomposto para quatro itens.");
  assert.deepEqual(roteiro.ids.slice(0, 3), tresFixos, "Roteiro semanal deve preservar os três itens fixos válidos antes de completar a seleção.");
}

// 7) Busca comportamental: termos compostos devem influenciar conteúdos relacionados mesmo sem frase literal contígua.
{
  const alvo = indice.get("alimentacao-rapida-componentes");
  assert.ok(alvo, "Conteúdo-alvo da validação de busca não encontrado.");
  const perfil = {
    objetivos: ["organizar_alimentacao", "receitas_praticas"],
    nivel_exercicio: "iniciante",
    duracao_treino: "ate_15",
    local_exercicio: "casa",
    equipamentos: ["nenhum"],
    perfil_alimentar: "variada",
    interesses_alimentares: ["almoco"],
    tempo_preparo: "ate_15"
  };
  const semBusca = construirSinaisComportamento({ catalogo });
  const comBusca = construirSinaisComportamento({ catalogo, buscas: [{ termo: "almoço rápido", contagem: 5 }] });
  const estagioSem = determinarEstagioUsuario({});
  const estagioCom = determinarEstagioUsuario({ buscas: [{ termo: "almoço rápido", contagem: 5 }] });
  const base = ordenarPorExperiencia(catalogo, { usuarioId: "busca", profileData: perfil, sinais: semBusca, estagio: estagioSem }).find((item) => item.id === alvo.id);
  const buscado = ordenarPorExperiencia(catalogo, { usuarioId: "busca", profileData: perfil, sinais: comBusca, estagio: estagioCom }).find((item) => item.id === alvo.id);
  assert.ok(buscado.experiencia_usuario.comportamento > base.experiencia_usuario.comportamento, "Busca composta deveria aumentar a afinidade comportamental do conteúdo relacionado.");
}

// 8) Estágios precisam evoluir de modo previsível.
assert.equal(determinarEstagioUsuario({}).id, "primeiros_passos");
assert.equal(determinarEstagioUsuario({ historico: [{}, {}, {}] }).id, "descobrindo");
assert.equal(determinarEstagioUsuario({ historico: Array.from({ length: 10 }, () => ({})), favoritos: [{}, {}] }).id, "em_ritmo");
assert.equal(determinarEstagioUsuario({ historico: Array.from({ length: 20 }, () => ({})), favoritos: Array.from({ length: 4 }, () => ({})), progresso: Array.from({ length: 3 }, () => ({ status: "concluido" })) }).id, "recorrente");

// 9) O selo "recomendado" precisa ser seletivo, não marcar praticamente toda a biblioteca.
for (const cenario of [cenarios[0], cenarios[1], cenarios[2]]) {
  const personalizados = personalizarConteudos(catalogo, cenario.perfil).filter((item) => !item.personalizacao.bloqueado);
  const recomendados = personalizados.filter((item) => item.personalizacao.recomendado);
  assert.ok(recomendados.length > 0, `${cenario.id}: deve haver ao menos um conteúdo fortemente recomendado.`);
  assert.ok(recomendados.length / personalizados.length < 0.75, `${cenario.id}: selo recomendado ficou amplo demais (${recomendados.length}/${personalizados.length}).`);
}

const resumo = {
  cenarios_representativos: cenarios.length,
  conteudos: catalogo.length,
  matriz_exercicios: exercicioTotal,
  matriz_alimentar: alimentacaoTotal,
  combinacoes_matriciais: exercicioTotal + alimentacaoTotal,
  taxa_duracao_exata_exercicio: `${(taxaDuracaoExata * 100).toFixed(1)}%`,
  duracao_exercicio_nunca_excedida: true,
  tempo_preparo_nunca_excedido: true,
  restricoes_variantes_validadas: true,
  roteiro_semanal_recomposto: true,
  busca_composta_influencia_motor: true
};

console.log("Validação minuciosa concluída sem falhas.");
console.log(JSON.stringify(resumo, null, 2));
resultados.forEach((item) => {
  console.log(`- ${item.cenario}: ${item.estagio} | hoje: ${item.hoje.join(" / ")}`);
});
