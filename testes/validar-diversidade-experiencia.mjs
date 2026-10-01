import assert from "node:assert/strict";
import fs from "node:fs";
import {
  montarExperienciaHome,
  montarRoteiroSemanal
} from "../js/experiencia.js";
import { avaliarConteudo } from "../js/personalizacao.js";

const dados = JSON.parse(fs.readFileSync(new URL("../dados/conteudos-exemplo.json", import.meta.url), "utf8"));
const catalogo = dados.conteudos;
const id = (item) => String(item?.id || item?.conteudo_id || "");

const media = (arr) => arr.reduce((s, x) => s + x, 0) / Math.max(1, arr.length);
const percentil = (arr, q) => {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * q)] ?? 0;
};
const jaccard = (a, b) => {
  const A = new Set(a); const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uniao = new Set([...A, ...B]).size;
  return uniao ? inter / uniao : 1;
};
const flattenCore = (exp) => [
  exp.hoje.exercicio,
  exp.hoje.alimentacao,
  exp.hoje.descoberta,
  ...exp.secoes.personalized,
  ...exp.secoes.exercise,
  ...exp.secoes.recipe,
  ...exp.secoes.juice,
  ...exp.secoes.food
].filter(Boolean).map(id);
const assinatura = (exp) => JSON.stringify({
  hoje: [exp.hoje.exercicio, exp.hoje.alimentacao, exp.hoje.descoberta].filter(Boolean).map(id),
  personalizado: exp.secoes.personalized.map(id),
  ordem: exp.sectionOrder
});

let state = 0xC0FFEE;
const rnd = () => {
  state = Math.imul(state ^ (state >>> 15), 1 | state);
  state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => rnd() - 0.5).slice(0, n);

const objetivos = [
  "movimentar_mais", "melhorar_condicionamento", "constancia_exercicios",
  "organizar_alimentacao", "receitas_praticas", "variar_refeicoes",
  "rotina_organizada", "bem_estar"
];
const niveis = ["iniciante", "intermediario", "experiente"];
const duracoes = ["ate_15", "15_30", "30_45", "mais_45"];
const locais = ["casa", "academia", "ar_livre", "variado"];
const equipamentos = [["nenhum"], ["halteres"], ["elasticos"], ["colchonete"], ["academia"], ["halteres", "academia"]];
const perfisAlimentares = ["variada", "vegetariana", "vegana"];
const interesses = ["cafe_manha", "almoco", "jantar", "lanches", "sucos", "receitas_rapidas", "marmitas"];
const temposPreparo = ["ate_15", "15_30", "30_60", "mais_60"];
const niveisAtividade = ["pouco_ativo", "algumas_vezes_semana", "ativo_frequente", "muito_ativo"];

const gerarPerfil = () => ({
  objetivos: sample(objetivos, 1 + Math.floor(rnd() * 3)),
  nivel_exercicio: pick(niveis),
  duracao_treino: pick(duracoes),
  local_exercicio: pick(locais),
  equipamentos: pick(equipamentos),
  perfil_alimentar: pick(perfisAlimentares),
  interesses_alimentares: sample(interesses, 1 + Math.floor(rnd() * 3)),
  tempo_preparo: pick(temposPreparo),
  nivel_atividade: pick(niveisAtividade)
});

const pools = {
  exercise: catalogo.filter((x) => x.tipo === "exercicio"),
  food: catalogo.filter((x) => x.tipo === "alimentacao"),
  recipe: catalogo.filter((x) => x.tipo === "receita" && x.categoria !== "suco_detox"),
  juice: catalogo.filter((x) => x.categoria === "suco_detox")
};
const termoPorFoco = {
  exercise: "mobilidade em casa",
  food: "marmita almoço",
  recipe: "receita rápida",
  juice: "suco frutas"
};
const gerarComportamento = (foco, intensidade = 8, offset = 0) => {
  const pool = pools[foco];
  const escolhidos = Array.from({ length: intensidade }, (_, i) => pool[(offset * 5 + i * 7) % pool.length]);
  return {
    historico: escolhidos.slice(0, Math.min(8, intensidade)).map((x) => ({ conteudo_id: x.id })),
    favoritos: escolhidos.slice(1, Math.min(5, intensidade)).map((x) => ({ conteudo_id: x.id })),
    progresso: escolhidos.slice(0, Math.min(4, intensidade)).map((x, i) => ({
      conteudo_id: x.id,
      status: i === 1 ? "concluido" : "em_andamento",
      progresso: i === 1 ? 100 : 40 + i * 10
    })),
    buscas: [{ termo: termoPorFoco[foco], contagem: 4 }]
  };
};

const distanciaPerfil = (a, b) => {
  let d = 0;
  for (const campo of ["nivel_exercicio", "duracao_treino", "local_exercicio", "perfil_alimentar", "tempo_preparo", "nivel_atividade"]) {
    if (a[campo] !== b[campo]) d += 1;
  }
  const setA = new Set(a.objetivos); const setB = new Set(b.objetivos);
  if (![...setA].some((x) => setB.has(x))) d += 1;
  const intA = new Set(a.interesses_alimentares); const intB = new Set(b.interesses_alimentares);
  if (![...intA].some((x) => intB.has(x))) d += 1;
  return d;
};

assert.equal(catalogo.length, 80, "A rodada pressupõe a biblioteca atual com 80 conteúdos.");

// 1) 1.500 contas sintéticas: estabilidade, bloqueios e diversidade global.
const simulacoes = [];
for (let i = 0; i < 1500; i += 1) {
  const perfil = gerarPerfil();
  const foco = ["exercise", "food", "recipe", "juice"][i % 4];
  const comportamento = i % 3 === 0 ? {} : gerarComportamento(foco, i % 3 === 1 ? 4 : 9, i);
  const args = { usuarioId: `sim_${i}`, nome: "Pessoa", profileData: perfil, catalogo, ...comportamento };
  const exp = montarExperienciaHome(args);
  const repetida = montarExperienciaHome(args);

  assert.deepEqual(flattenCore(exp), flattenCore(repetida), `sim_${i}: mesma entrada deve gerar mesma experiência principal.`);
  const visiveis = [exp.hoje.exercicio, exp.hoje.alimentacao, exp.hoje.descoberta, ...exp.secoes.personalized]
    .filter(Boolean);
  visiveis.forEach((item) => {
    assert.equal(avaliarConteudo(item, perfil).bloqueado, false, `sim_${i}: conteúdo bloqueado em área principal.`);
  });
  simulacoes.push({ perfil, exp, comportamento, assinatura: assinatura(exp) });
}

const taxaAssinaturasUnicas = new Set(simulacoes.map((x) => x.assinatura)).size / simulacoes.length;
assert.ok(taxaAssinaturasUnicas >= 0.72, `Diversidade global insuficiente: ${(taxaAssinaturasUnicas * 100).toFixed(1)}% de assinaturas únicas.`);

// 2) Perfis distantes devem receber vitrines materialmente diferentes.
const overlapsDistantes = [];
for (let i = 0; i < 5000; i += 1) {
  const a = simulacoes[Math.floor(rnd() * simulacoes.length)];
  const b = simulacoes[Math.floor(rnd() * simulacoes.length)];
  if (a === b || distanciaPerfil(a.perfil, b.perfil) < 5) continue;
  overlapsDistantes.push(jaccard(flattenCore(a.exp), flattenCore(b.exp)));
}
assert.ok(media(overlapsDistantes) <= 0.42, `Perfis distantes ainda se parecem demais em média: ${media(overlapsDistantes).toFixed(3)}.`);
assert.ok(percentil(overlapsDistantes, 0.90) <= 0.58, `P90 de sobreposição entre perfis distantes alto: ${percentil(overlapsDistantes, 0.90).toFixed(3)}.`);

// 3) Mesmo cadastro, sem comportamento: o conteúdo principal deve ser coerente entre contas.
const overlapsMesmoPerfil = [];
const overlapsSemanaContas = [];
for (let i = 0; i < 180; i += 1) {
  const perfil = gerarPerfil();
  const a = montarExperienciaHome({ usuarioId: `mesmoA_${i}`, profileData: perfil, catalogo });
  const b = montarExperienciaHome({ usuarioId: `mesmoB_${i}`, profileData: perfil, catalogo });
  overlapsMesmoPerfil.push(jaccard(flattenCore(a), flattenCore(b)));
  overlapsSemanaContas.push(jaccard(a.semana.ids, b.semana.ids));
}
assert.ok(media(overlapsMesmoPerfil) >= 0.70, `O UID está mudando demais a vitrine antes de existir comportamento próprio: ${media(overlapsMesmoPerfil).toFixed(3)}.`);
assert.ok(media(overlapsSemanaContas) >= 0.20 && media(overlapsSemanaContas) <= 0.75, "A seleção semanal deve manter afinidade, com alguma variedade entre contas equivalentes.");

// 4) Mesmo cadastro, comportamento diferente: o portal deve se separar de forma clara.
const overlapsComportamento = [];
let ordemMudou = 0;
for (let i = 0; i < 220; i += 1) {
  const perfil = gerarPerfil();
  const a = montarExperienciaHome({ usuarioId: `beh_${i}`, profileData: perfil, catalogo, ...gerarComportamento("exercise", 9, i) });
  const b = montarExperienciaHome({ usuarioId: `beh_${i}`, profileData: perfil, catalogo, ...gerarComportamento("recipe", 9, i) });
  overlapsComportamento.push(jaccard(flattenCore(a), flattenCore(b)));
  if (JSON.stringify(a.sectionOrder) !== JSON.stringify(b.sectionOrder)) ordemMudou += 1;
}
assert.ok(media(overlapsComportamento) <= 0.60, `Comportamentos diferentes não separaram o suficiente a experiência: ${media(overlapsComportamento).toFixed(3)}.`);
assert.ok(ordemMudou / 220 >= 0.85, "O comportamento deveria alterar a prioridade das seções na grande maioria dos pares." );

// 5) Direcionalidade: histórico concentrado em um tema precisa empurrar esse tema para cima sem apagar o perfil.
const sucessoFoco = { exercise: 0, food: 0, recipe: 0, juice: 0 };
const totalFoco = 140;
for (const foco of Object.keys(sucessoFoco)) {
  for (let i = 0; i < totalFoco; i += 1) {
    const perfil = gerarPerfil();
    const exp = montarExperienciaHome({ usuarioId: `focus_${foco}_${i}`, profileData: perfil, catalogo, ...gerarComportamento(foco, 9, i) });
    const temas = exp.sectionOrder.filter((x) => ["exercise", "food", "recipe", "juice"].includes(x));
    if (temas[0] === foco) sucessoFoco[foco] += 1;
  }
}
assert.ok(sucessoFoco.exercise / totalFoco >= 0.90, "Foco comportamental em exercícios fraco.");
assert.ok(sucessoFoco.recipe / totalFoco >= 0.90, "Foco comportamental em receitas fraco.");
assert.ok(sucessoFoco.juice / totalFoco >= 0.90, "Foco comportamental em sucos fraco.");
assert.ok(sucessoFoco.food / totalFoco >= 0.80, "Foco comportamental em alimentação fraco.");

// 6) Alterar apenas um dado relevante deve mudar parte da experiência, não destruí-la por completo.
const overlapsProximos = [];
const overlapsExercicioProximos = [];
for (let i = 0; i < 220; i += 1) {
  const perfil = gerarPerfil();
  const idx = duracoes.indexOf(perfil.duracao_treino);
  const vizinho = { ...perfil, duracao_treino: duracoes[(idx + 1) % duracoes.length] };
  const a = montarExperienciaHome({ usuarioId: `near_${i}`, profileData: perfil, catalogo });
  const b = montarExperienciaHome({ usuarioId: `near_${i}`, profileData: vizinho, catalogo });
  overlapsProximos.push(jaccard(flattenCore(a), flattenCore(b)));
  overlapsExercicioProximos.push(jaccard(
    [a.hoje.exercicio, ...a.secoes.exercise].filter(Boolean).map(id),
    [b.hoje.exercicio, ...b.secoes.exercise].filter(Boolean).map(id)
  ));
}
assert.ok(media(overlapsProximos) >= 0.75, `Mudar um único campo está desmontando demais o restante da home: ${media(overlapsProximos).toFixed(3)}.`);
assert.ok(media(overlapsExercicioProximos) <= 0.65, `A duração mudou, mas a área de exercícios reagiu pouco: ${media(overlapsExercicioProximos).toFixed(3)}.`);

// 7) Estágios: mesma pessoa deve evoluir de forma previsível conforme acumula uso.
for (let i = 0; i < 80; i += 1) {
  const perfil = gerarPerfil();
  const base = montarExperienciaHome({ usuarioId: `stage_${i}`, profileData: perfil, catalogo });
  const descobrindo = montarExperienciaHome({
    usuarioId: `stage_${i}`, profileData: perfil, catalogo,
    historico: pools.exercise.slice(0, 2).map((x) => ({ conteudo_id: x.id }))
  });
  const ritmo = montarExperienciaHome({ usuarioId: `stage_${i}`, profileData: perfil, catalogo, ...gerarComportamento("exercise", 9, i) });
  const rico = {
    historico: catalogo.slice(0, 18).map((x) => ({ conteudo_id: x.id })),
    favoritos: catalogo.slice(18, 24).map((x) => ({ conteudo_id: x.id })),
    progresso: catalogo.slice(24, 32).map((x, n) => ({ conteudo_id: x.id, status: n < 5 ? "concluido" : "em_andamento", progresso: n < 5 ? 100 : 55 })),
    buscas: [{ termo: "marmita", contagem: 4 }, { termo: "mobilidade", contagem: 3 }, { termo: "suco", contagem: 2 }]
  };
  const recorrente = montarExperienciaHome({ usuarioId: `stage_${i}`, profileData: perfil, catalogo, ...rico });
  assert.equal(base.estagio.id, "primeiros_passos");
  assert.equal(descobrindo.estagio.id, "descobrindo");
  assert.ok(["em_ritmo", "recorrente"].includes(ritmo.estagio.id));
  assert.equal(recorrente.estagio.id, "recorrente");
}

// 8) Conteúdo concluído não deve voltar às vitrines novas enquanto existir conteúdo não concluído.
for (const quantidade of [5, 20, 40, 60, 75]) {
  const perfil = gerarPerfil();
  const progresso = catalogo.slice(0, quantidade).map((x) => ({ conteudo_id: x.id, status: "concluido", progresso: 100 }));
  const concluidos = new Set(progresso.map((x) => x.conteudo_id));
  const exp = montarExperienciaHome({ usuarioId: `done_${quantidade}`, profileData: perfil, catalogo, progresso });
  const visiveis = flattenCore(exp);
  assert.equal(visiveis.filter((x) => concluidos.has(x)).length, 0, `${quantidade} concluídos: conteúdo concluído reapareceu como novidade.`);
  assert.equal(exp.semana.ids.filter((x) => concluidos.has(x)).length, 0, `${quantidade} concluídos: roteiro semanal reutilizou concluído.`);
}

// 9) Semana: mesma conta/mesma semana é estável; semana seguinte deve renovar parte da seleção.
const overlapsSemanaSeguinte = [];
for (let i = 0; i < 120; i += 1) {
  const perfil = gerarPerfil();
  const exp = montarExperienciaHome({ usuarioId: `week_${i}`, profileData: perfil, catalogo });
  const d1 = new Date(2026, 9, 1);
  const d2 = new Date(2026, 9, 8);
  const w1 = montarRoteiroSemanal({ usuarioId: `week_${i}`, profileData: perfil, ordenados: exp.ordenados, sinais: exp.sinais, estagio: exp.estagio, data: d1 });
  const w1b = montarRoteiroSemanal({ usuarioId: `week_${i}`, profileData: perfil, ordenados: exp.ordenados, sinais: exp.sinais, estagio: exp.estagio, data: d1 });
  const w2 = montarRoteiroSemanal({ usuarioId: `week_${i}`, profileData: perfil, ordenados: exp.ordenados, sinais: exp.sinais, estagio: exp.estagio, data: d2 });
  assert.deepEqual(w1.ids, w1b.ids, "Roteiro semanal deve ser estável dentro da mesma semana.");
  overlapsSemanaSeguinte.push(jaccard(w1.ids, w2.ids));
}
assert.ok(media(overlapsSemanaSeguinte) <= 0.70, "A semana seguinte está renovando pouco a seleção." );

const resumo = {
  contas_sinteticas: simulacoes.length,
  taxa_assinaturas_unicas: taxaAssinaturasUnicas,
  perfis_distantes: {
    pares: overlapsDistantes.length,
    jaccard_medio: media(overlapsDistantes),
    p90: percentil(overlapsDistantes, 0.90)
  },
  mesmo_perfil_sem_comportamento: {
    pares: overlapsMesmoPerfil.length,
    jaccard_medio: media(overlapsMesmoPerfil),
    semana_jaccard_medio: media(overlapsSemanaContas)
  },
  mesmo_perfil_comportamentos_opostos: {
    pares: overlapsComportamento.length,
    jaccard_medio: media(overlapsComportamento),
    ordem_secoes_mudou_pct: ordemMudou / 220
  },
  foco_comportamental: Object.fromEntries(Object.entries(sucessoFoco).map(([k, v]) => [k, v / totalFoco])),
  perfis_proximos_um_campo: {
    pares: overlapsProximos.length,
    jaccard_home_medio: media(overlapsProximos),
    jaccard_area_exercicios_medio: media(overlapsExercicioProximos)
  },
  semana_seguinte: {
    pares: overlapsSemanaSeguinte.length,
    jaccard_medio: media(overlapsSemanaSeguinte)
  }
};

console.log("\nVALIDAÇÃO DE DIVERSIDADE DA EXPERIÊNCIA — APROVADA\n");
console.log(JSON.stringify(resumo, null, 2));
