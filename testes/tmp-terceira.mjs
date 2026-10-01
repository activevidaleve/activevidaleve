import fs from 'node:fs';
import { montarExperienciaHome, montarRoteiroSemanal, construirSinaisComportamento, determinarEstagioUsuario } from '../js/experiencia.js';
const catalogo=JSON.parse(fs.readFileSync(new URL('../dados/conteudos-exemplo.json',import.meta.url),'utf8')).conteudos;
const perfil={objetivos:['movimentar_mais','constancia_exercicios'],nivel_exercicio:'iniciante',dias_exercicio:'1_2',duracao_treino:'ate_15',local_exercicio:'casa',equipamentos:['nenhum'],perfil_alimentar:'vegana',interesses_alimentares:['sucos','receitas_rapidas'],tempo_preparo:'ate_15',nivel_atividade:'pouco_ativo'};
const progresso=catalogo.map(x=>({conteudo_id:x.id,status:'concluido',progresso:100}));
const exp=montarExperienciaHome({usuarioId:'all_done',profileData:perfil,catalogo,progresso});
console.log('all complete today',exp.hoje.exercicio?.id, exp.hoje.alimentacao?.id, exp.hoje.descoberta?.id);
console.log('shelves',Object.fromEntries(Object.entries(exp.secoes).map(([k,v])=>[k,v.map(x=>x.id)])));
console.log('week',exp.semana.itens?.map(x=>x.id));

const perfilGym={...perfil,nivel_exercicio:'intermediario',duracao_treino:'mais_45',local_exercicio:'academia',equipamentos:['halteres','academia'],dias_exercicio:'5_mais'};
const expGym=montarExperienciaHome({usuarioId:'switch',profileData:perfilGym,catalogo});
const fixed=expGym.semana.itens.map(x=>x.id);
console.log('gym week',fixed,expGym.semana.itens.map(x=>[x.titulo,x.publico?.locais,x.publico?.equipamentos,x.publico?.duracoes]));
const perfilHome={...perfil,nivel_exercicio:'iniciante',duracao_treino:'ate_15',local_exercicio:'casa',equipamentos:['nenhum'],dias_exercicio:'1_2'};
const expHome=montarExperienciaHome({usuarioId:'switch',profileData:perfilHome,catalogo});
const withFixed=montarRoteiroSemanal({usuarioId:'switch',profileData:perfilHome,ordenados:expHome.ordenados,sinais:expHome.sinais,estagio:expHome.estagio,idsFixos:fixed});
console.log('home recomputed week with fixed',withFixed.itens.map(x=>[x.id,x.titulo,x.publico?.locais,x.publico?.equipamentos,x.publico?.duracoes]));
