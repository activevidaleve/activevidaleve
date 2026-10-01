import fs from "node:fs";
import assert from "node:assert/strict";
import {
  montarExperienciaHome,
  montarRoteiroSemanal,
  construirSinaisComportamento,
  determinarEstagioUsuario,
  criarAssinaturaPerfilExperiencia
} from "../js/experiencia.js";
import { avaliarConteudo } from "../js/personalizacao.js";

const raw = JSON.parse(fs.readFileSync(new URL("../dados/conteudos-exemplo.json", import.meta.url), "utf8"));
const catalogo = raw.conteudos;
const id = (x = {}) => String(x?.id || x?.conteudo_id || "").trim();
const ids = (arr = []) => arr.filter(Boolean).map(id).filter(Boolean);
const set = (arr = []) => new Set(arr);
const jaccard = (a = [], b = []) => {
  const A = set(a), B = set(b);
  const union = new Set([...A, ...B]);
  if (!union.size) return 1;
  let inter = 0;
  A.forEach((value) => { if (B.has(value)) inter += 1; });
  return inter / union.size;
};
const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const pct = (n,d) => d ? n/d : 0;
const core = (e) => [
  id(e.hoje?.exercicio), id(e.hoje?.alimentacao), id(e.hoje?.descoberta),
  ...ids(e.secoes?.personalized), ...ids(e.secoes?.exercise), ...ids(e.secoes?.recipe), ...ids(e.secoes?.juice), ...ids(e.secoes?.food)
].filter(Boolean);
const newCore = (e, progressMap = new Map()) => core(e).filter((contentId) => progressMap.get(contentId)?.status !== "concluido");
const exerciseCompatible = (item, profile) => {
  if (!item || item.tipo !== "exercicio") return true;
  const pub = item.publico || {};
  const levels = pub.niveis || [];
  const places = pub.locais || [];
  const eq = pub.equipamentos || [];
  const durations = pub.duracoes || [];
  const order = { ate_15:1, "15_30":2, "30_45":3, mais_45:4 };
  if (profile.nivel_exercicio && levels.length && !levels.includes(profile.nivel_exercicio)) return false;
  if (profile.local_exercicio && places.length && !places.includes(profile.local_exercicio) && !places.includes("variado") && !places.includes("varia")) return false;
  const userEq = Array.isArray(profile.equipamentos) ? profile.equipamentos : [];
  if (userEq.includes("nenhum") && eq.length && !eq.includes("nenhum")) return false;
  if (userEq.length && !userEq.includes("nenhum") && eq.length && !eq.includes("nenhum") && !eq.some((x)=>userEq.includes(x))) return false;
  if (profile.duracao_treino && durations.length) {
    const p = order[profile.duracao_treino];
    const min = Math.min(...durations.map((x)=>order[x]).filter(Boolean));
    if (p && min > p) return false;
  }
  return true;
};

const perfis = {
  casaCurto: {
    objetivos:["movimentar_mais","constancia_exercicios","bem_estar"], nivel_exercicio:"iniciante", dias_exercicio:"1_2",
    duracao_treino:"ate_15", local_exercicio:"casa", equipamentos:["nenhum"], nivel_atividade:"pouco_ativo",
    perfil_alimentar:"variada", interesses_alimentares:["receitas_rapidas","cafe_manha"], tempo_preparo:"ate_15"
  },
  academiaLongo: {
    objetivos:["melhorar_condicionamento","movimentar_mais","rotina_organizada"], nivel_exercicio:"intermediario", dias_exercicio:"5_mais",
    duracao_treino:"mais_45", local_exercicio:"academia", equipamentos:["academia","halteres"], nivel_atividade:"muito_ativo",
    perfil_alimentar:"variada", interesses_alimentares:["marmitas","almoco"], tempo_preparo:"30_60"
  },
  veganoSucos: {
    objetivos:["organizar_alimentacao","receitas_praticas","variar_refeicoes"], nivel_exercicio:"iniciante", dias_exercicio:"3_4",
    duracao_treino:"15_30", local_exercicio:"casa", equipamentos:["nenhum"], nivel_atividade:"algumas_vezes_semana",
    perfil_alimentar:"vegana", interesses_alimentares:["sucos","receitas_rapidas","cafe_manha"], tempo_preparo:"ate_15"
  }
};

// A) Biblioteca perto do esgotamento e totalmente concluída.
const exhaustionCounts = [0, 20, 40, 60, 75, 79, 80];
const exhaustion = [];
for (const completedCount of exhaustionCounts) {
  const progresso = catalogo.slice(0, completedCount).map((item) => ({ conteudo_id:item.id, status:"concluido", progresso:100 }));
  const progressMap = new Map(progresso.map((x)=>[id(x),x]));
  const exp = montarExperienciaHome({ usuarioId:`exaustao_${completedCount}`, profileData:perfis.veganoSucos, catalogo, progresso });
  const shown = core(exp);
  const concludedShown = shown.filter((contentId) => progressMap.get(contentId)?.status === "concluido").length;
  exhaustion.push({ completedCount, shown:shown.length, concludedShown, week:exp.semana.itens.length, esgotada:exp.bibliotecaEsgotada });
  assert.equal(concludedShown, 0, `Conteúdo concluído reapareceu como novidade com ${completedCount} concluídos.`);
  if (completedCount === 80) {
    assert.equal(exp.bibliotecaEsgotada, true, "Biblioteca totalmente concluída não foi marcada como esgotada.");
    assert.equal(shown.length, 0, "Biblioteca totalmente concluída ainda exibiu recomendações novas.");
    assert.equal(exp.semana.itens.length, 0, "Roteiro semanal deveria ficar vazio quando tudo foi concluído.");
  }
}

// B) Alteração relevante de perfil deve invalidar a assinatura do roteiro semanal.
const oldExp = montarExperienciaHome({ usuarioId:"mudanca_perfil", profileData:perfis.academiaLongo, catalogo });
const oldWeek = oldExp.semana;
const newExp = montarExperienciaHome({ usuarioId:"mudanca_perfil", profileData:perfis.casaCurto, catalogo });
assert.notEqual(oldWeek.assinatura_perfil, newExp.semana.assinatura_perfil, "Mudança relevante de perfil não alterou a assinatura do roteiro.");
assert.ok(newExp.semana.itens.every((item) => exerciseCompatible(item, perfis.casaCurto)), "Novo roteiro contém exercício incompatível com o perfil atualizado.");
assert.equal(criarAssinaturaPerfilExperiencia(perfis.casaCurto), newExp.semana.assinatura_perfil);

// C) Mudanças irrelevantes para personalização não devem invalidar a assinatura.
const sigBase = criarAssinaturaPerfilExperiencia(perfis.casaCurto);
const sigIrrelevante = criarAssinaturaPerfilExperiencia({ ...perfis.casaCurto, altura:199, peso:110, data_nascimento:"1990-01-01", observacao:"teste" });
assert.equal(sigBase, sigIrrelevante, "Campos neutros alteraram a assinatura de personalização.");

// D) Evolução longitudinal: 26 semanas, 120 contas, consumo progressivo.
const longitudinal = [];
let concludedAsNew = 0;
let stageRegressions = 0;
let usersReachedRecurring = 0;
let totalUnique = 0;
for (let u=0; u<120; u++) {
  const profile = u % 3 === 0 ? perfis.casaCurto : u % 3 === 1 ? perfis.academiaLongo : perfis.veganoSucos;
  const progresso = [];
  const historico = [];
  const favoritos = [];
  const buscas = [];
  const seen = new Set();
  let prevStage = -1;
  for (let w=0; w<26; w++) {
    const date = new Date(2026, 0, 5 + w*7, 12, 0, 0);
    const exp = montarExperienciaHome({ usuarioId:`long_${u}`, profileData:profile, catalogo, progresso, historico, favoritos, buscas, data:date });
    const pmap = new Map(progresso.map((x)=>[id(x),x]));
    const visible = newCore(exp,pmap);
    visible.forEach((x)=>seen.add(x));
    concludedAsNew += core(exp).filter((x)=>pmap.get(x)?.status === "concluido").length;
    if (exp.estagio.nivel < prevStage) stageRegressions += 1;
    prevStage = exp.estagio.nivel;

    // Usuário explora até 2 itens da seleção semanal; quando ela acaba, usa as recomendações principais.
    const candidates = [...ids(exp.semana.itens), ...visible].filter((x,idx,arr)=>x && arr.indexOf(x)===idx && !pmap.has(x));
    candidates.slice(0,2).forEach((contentId, idx) => {
      progresso.push({ conteudo_id:contentId, status:"concluido", progresso:100 });
      historico.unshift({ conteudo_id:contentId });
      if ((w + idx + u) % 5 === 0) favoritos.push({ conteudo_id:contentId });
    });
    if (w === 6) buscas.push({ termo: profile.interesses_alimentares?.[0]?.replaceAll("_"," ") || "rotina", contagem:2 });
    if (w === 14) buscas.unshift({ termo: profile === perfis.academiaLongo ? "academia halteres" : profile === perfis.veganoSucos ? "sucos frutas" : "exercicios casa", contagem:4 });
  }
  const finalStage = determinarEstagioUsuario({favoritos,historico,progresso,buscas});
  if (finalStage.id === "recorrente") usersReachedRecurring += 1;
  totalUnique += seen.size;
  longitudinal.push(seen.size);
}
assert.equal(concludedAsNew, 0, "Conteúdo concluído reapareceu como novidade na simulação longitudinal.");
assert.equal(stageRegressions, 0, "Estágio do usuário regrediu durante uso cumulativo.");
assert.ok(usersReachedRecurring >= 115, "Poucas contas atingiram estágio recorrente após 26 semanas de uso.");
assert.ok(avg(longitudinal) >= 40, "A experiência longitudinal explorou pouca variedade da biblioteca.");

// E) Microinteração vs. mudança comportamental persistente.
const microJ = [];
const sustainedJ = [];
let sustainedSectionShift = 0;
for (let i=0;i<180;i++) {
  const profile = { ...perfis.casaCurto, objetivos:["bem_estar","rotina_organizada"], interesses_alimentares:["receitas_rapidas","sucos"] };
  const base = montarExperienciaHome({ usuarioId:`shift_${i}`, profileData:profile, catalogo });
  const micro = montarExperienciaHome({ usuarioId:`shift_${i}`, profileData:profile, catalogo, buscas:[{termo:"suco",contagem:1}] });
  microJ.push(jaccard(core(base),core(micro)));

  const ex = catalogo.filter((x)=>x.tipo==="exercicio").slice((i%5), (i%5)+8);
  const juice = catalogo.filter((x)=>x.categoria==="suco_detox").slice((i%6), (i%6)+8);
  const phaseA = montarExperienciaHome({
    usuarioId:`shift_${i}`, profileData:profile, catalogo,
    favoritos:ex.slice(0,3).map((x)=>({conteudo_id:x.id})), historico:ex.map((x)=>({conteudo_id:x.id})), buscas:[{termo:"exercicio mobilidade casa",contagem:5}]
  });
  const phaseB = montarExperienciaHome({
    usuarioId:`shift_${i}`, profileData:profile, catalogo,
    favoritos:juice.slice(0,5).map((x)=>({conteudo_id:x.id})), historico:[...juice.map((x)=>({conteudo_id:x.id})),...ex.slice(0,2).map((x)=>({conteudo_id:x.id}))], buscas:[{termo:"sucos frutas hortela",contagem:5}]
  });
  sustainedJ.push(jaccard(core(phaseA),core(phaseB)));
  if (phaseA.sectionOrder.indexOf("exercise") < phaseA.sectionOrder.indexOf("juice") && phaseB.sectionOrder.indexOf("juice") < phaseB.sectionOrder.indexOf("exercise")) sustainedSectionShift += 1;
}
assert.ok(avg(microJ) >= 0.82, "Uma única busca altera demais a experiência.");
assert.ok(avg(sustainedJ) <= 0.72, "Mudança comportamental persistente altera pouco a experiência.");
assert.ok(pct(sustainedSectionShift,180) >= 0.75, "A ordem das seções reage pouco a uma mudança comportamental clara.");

// F) Casos raros, incompletos e entradas inesperadas.
const weirdProfiles = [
  {}, null, {objetivos:[]}, {equipamentos:"nenhum",interesses_alimentares:"sucos"},
  {nivel_exercicio:"desconhecido",duracao_treino:"mais_que_uma_hora",local_exercicio:"hotel",perfil_alimentar:"outra"},
  {objetivos:["bem_estar","bem_estar",null],equipamentos:["nenhum","nenhum"],interesses_alimentares:["sucos",null]},
  {restricoes_alimentares:"celíaca; lactose",exercicios_evitar:"flexões; agachamento",perfil_alimentar:"vegetariana"},
  {nivel_atividade:"muito_ativo",dias_exercicio:"5_mais",duracao_treino:"ate_15",local_exercicio:"ar_livre",equipamentos:["nenhum"],perfil_alimentar:"vegana",tempo_preparo:"mais_60"}
];
let robust = 0;
for (let i=0;i<weirdProfiles.length;i++) {
  const exp = montarExperienciaHome({ usuarioId:`weird_${i}`, profileData:weirdProfiles[i] || {}, catalogo });
  if (exp && exp.secoes && Array.isArray(exp.secoes.personalized)) robust += 1;
}
assert.equal(robust,weirdProfiles.length,"Perfil incompleto/atípico quebrou a montagem da experiência.");

// G) Biblioteca cresce: conteúdo novo e altamente compatível precisa entrar no radar sem quebrar o restante.
const novoConteudo = {
  id:"exercicio-novo-super-compativel", tipo:"exercicio", categoria:"mobilidade", titulo:"Mobilidade curta em casa — nova",
  resumo:"Nova opção curta para casa.", destaque:true, publicado:true,
  publico:{ objetivos:["movimentar_mais","constancia_exercicios","bem_estar"], niveis:["iniciante"], duracoes:["ate_15"], locais:["casa"], equipamentos:["nenhum"] },
  tags:["mobilidade","casa","curto"]
};
const expanded = [...catalogo,novoConteudo];
let newContentSurfaced=0;
for(let i=0;i<120;i++){
  const e=montarExperienciaHome({usuarioId:`growth_${i}`,profileData:perfis.casaCurto,catalogo:expanded});
  const firstTen=ids(e.ordenados.slice(0,10));
  if(firstTen.includes(novoConteudo.id)) newContentSurfaced += 1;
}
assert.ok(pct(newContentSurfaced,120) >= 0.95,"Conteúdo novo fortemente compatível quase não entra no radar.");

// H) Fronteiras semanais: roteiro muda na segunda, não no meio da semana.
const sunday = new Date(2026,9,4,12,0,0);
const monday = new Date(2026,9,5,12,0,0);
const tuesday = new Date(2026,9,6,12,0,0);
const expSun = montarExperienciaHome({usuarioId:"calendar",profileData:perfis.casaCurto,catalogo,data:sunday});
const expMon = montarExperienciaHome({usuarioId:"calendar",profileData:perfis.casaCurto,catalogo,data:monday});
const expTue = montarExperienciaHome({usuarioId:"calendar",profileData:perfis.casaCurto,catalogo,data:tuesday});
assert.notEqual(expSun.semana.id,expMon.semana.id,"Identificador semanal não mudou na virada de domingo para segunda.");
assert.equal(expMon.semana.id,expTue.semana.id,"Identificador semanal mudou dentro da mesma semana.");
assert.deepEqual(ids(expMon.semana.itens),ids(expTue.semana.itens),"Roteiro mudou dentro da mesma semana sem novos sinais.");

// I) Perfil atual continua vencendo histórico antigo mesmo em carga extrema.
const gym = catalogo.filter((x)=>x.tipo==="exercicio" && ((x.publico?.locais||[]).includes("academia") || (x.publico?.equipamentos||[]).includes("halteres")));
let switchProtected=0;
for(let i=0;i<150;i++){
  const behavior={
    favoritos:gym.slice(0,6).map((x)=>({conteudo_id:x.id})),
    historico:Array.from({length:3},()=>gym).flat().slice(0,20).map((x)=>({conteudo_id:x.id})),
    progresso:gym.slice(0,5).map((x)=>({conteudo_id:x.id,status:"concluido",progresso:100})),
    buscas:[{termo:"academia halteres força",contagem:5}]
  };
  const e=montarExperienciaHome({usuarioId:`hard_switch_${i}`,profileData:perfis.casaCurto,catalogo,...behavior});
  if(exerciseCompatible(e.hoje.exercicio,perfis.casaCurto)) switchProtected += 1;
}
assert.ok(pct(switchProtected,150)>=0.98,"Histórico antigo intenso venceu o perfil atual em exercícios.");

const metrics = {
  versao:"v41",
  conteudos:catalogo.length,
  esgotamento:exhaustion,
  roteiro_perfil:{assinatura_muda_com_perfil:oldWeek.assinatura_perfil!==newExp.semana.assinatura_perfil,assinatura_ignora_campos_neutros:sigBase===sigIrrelevante},
  longitudinal:{contas:120,semanas:26,media_conteudos_unicos:Number(avg(longitudinal).toFixed(2)),min_conteudos_unicos:Math.min(...longitudinal),max_conteudos_unicos:Math.max(...longitudinal),concluidos_reaparecendo:concludedAsNew,regressoes_estagio:stageRegressions,taxa_recorrente:pct(usersReachedRecurring,120)},
  comportamento:{amostras:180,sobreposicao_apos_microinteracao:Number(avg(microJ).toFixed(4)),sobreposicao_apos_mudanca_persistente:Number(avg(sustainedJ).toFixed(4)),taxa_inversao_exercicio_para_sucos:Number(pct(sustainedSectionShift,180).toFixed(4))},
  robustez:{casos:weirdProfiles.length,aprovados:robust},
  crescimento_biblioteca:{amostras:120,taxa_novo_conteudo_top10:Number(pct(newContentSurfaced,120).toFixed(4))},
  calendario:{domingo:expSun.semana.id,segunda:expMon.semana.id,terca:expTue.semana.id},
  perfil_atual_vs_historico:{amostras:150,taxa:Number(pct(switchProtected,150).toFixed(4))}
};

fs.writeFileSync(new URL("../relatorios/metricas-casos-extremos-v41.json",import.meta.url),JSON.stringify(metrics,null,2));
console.log("TERCEIRA RODADA — CASOS EXTREMOS E EVOLUÇÃO — APROVADA");
console.log(JSON.stringify(metrics,null,2));
