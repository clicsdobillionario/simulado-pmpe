import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const QUESTOES_FILE = path.join(DATA_DIR, 'questoes.json');
const SIMULADO_FILE = path.join(DATA_DIR, 'simulado-15.txt');
const GABARITO_SIMULADO_FILE = path.join(DATA_DIR, 'gabarito-simulado.json');

const TOPICOS_OBRIGATORIOS = [
  'Concordância nominal e verbal',
  'Regência nominal e verbal',
  'Sintaxe da oração e do período',
  'Pontuação',
  'Mecanismos de coesão textual'
];

function carregarQuestoes() {
  if (!fs.existsSync(QUESTOES_FILE)) {
    console.error('Arquivo questoes.json não encontrado. Rode "npm run gerar" primeiro.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(QUESTOES_FILE, 'utf-8'));
}

function fisherYatesShuffle(array, seed = null) {
  const arr = [...array];
  let rng;
  
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    rng = mulberry32(Math.abs(hash));
  } else {
    rng = Math.random;
  }
  
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function letra(idx) {
  return String.fromCharCode(65 + idx);
}

function sortear15(questoes, seed = null) {
  const embaralhadas = fisherYatesShuffle(questoes, seed);
  
  const selecionadas = [];
  const topicosCobertos = new Set();
  const obrigatoriosSet = new Set(TOPICOS_OBRIGATORIOS);
  
  for (const q of embaralhadas) {
    if (selecionadas.length >= 15) break;
    
    const precisaTopico = obrigatoriosSet.has(q.topico) && !topicosCobertos.has(q.topico);
    const espacoLivre = 15 - selecionadas.length;
    const topicosFaltantes = TOPICOS_OBRIGATORIOS.filter(t => !topicosCobertos.has(t)).length;
    
    if (precisaTopico || espacoLivre > topicosFaltantes) {
      selecionadas.push(q);
      topicosCobertos.add(q.topico);
    }
  }
  
  while (selecionadas.length < 15) {
    for (const q of embaralhadas) {
      if (!selecionadas.includes(q)) {
        selecionadas.push(q);
        topicosCobertos.add(q.topico);
        if (selecionadas.length >= 15) break;
      }
    }
  }
  
  return selecionadas.slice(0, 15);
}

function formatarSimuladoTxt(questoes) {
  const linhas = [];
  const dataGeracao = new Date().toLocaleString('pt-BR');
  
  linhas.push('='.repeat(60));
  linhas.push('SIMULADO PM-PE - LÍNGUA PORTUGUESA (BANCA AOCP)');
  linhas.push(`15 Questões sorteadas | Gerado em: ${dataGeracao}`);
  linhas.push('='.repeat(60));
  linhas.push('');

  for (let i = 0; i < questoes.length; i++) {
    const q = questoes[i];
    linhas.push(`QUESTÃO ${i + 1} - ${q.topico}`);
    linhas.push(q.enunciado);
    linhas.push('');
    q.alternativas.forEach((alt, j) => {
      linhas.push(`${letra(j)}) ${alt}`);
    });
    linhas.push('');
    linhas.push('---');
    linhas.push('');
  }

  linhas.push('='.repeat(60));
  linhas.push('GABARITO');
  linhas.push('='.repeat(60));
  for (let i = 0; i < questoes.length; i++) {
    const q = questoes[i];
    linhas.push(`${String(i + 1).padStart(2, ' ')}.  ${letra(q.correta)}`);
  }
  linhas.push('');
  linhas.push('='.repeat(60));
  linhas.push('EXPLICAÇÕES');
  linhas.push('='.repeat(60));
  for (let i = 0; i < questoes.length; i++) {
    const q = questoes[i];
    linhas.push(`${String(i + 1).padStart(2, ' ')}. ${q.explicacao}`);
  }

  return linhas.join('\n');
}

function gerarGabaritoSimulado(questoes) {
  const gabarito = {};
  for (let i = 0; i < questoes.length; i++) {
    gabarito[String(i + 1)] = {
      correta: questoes[i].correta,
      letra: letra(questoes[i].correta),
      topico: questoes[i].topico,
      dificuldade: questoes[i].dificuldade,
      explicacao: questoes[i].explicacao
    };
  }
  return gabarito;
}

function main() {
  const args = process.argv.slice(2);
  const seedArg = args.find(a => a.startsWith('--seed'));
  const seed = seedArg ? seedArg.split('=')[1] : null;
  
  console.log('Carregando banco de questões...');
  const questoes = carregarQuestoes();
  console.log(`${questoes.length} questões disponíveis.`);
  
  if (questoes.length < 15) {
    console.error('Banco tem menos de 15 questões. Gere mais questões primeiro.');
    process.exit(1);
  }

  console.log(`Sorteando 15 questões${seed ? ` (seed: ${seed})` : ''}...`);
  const sorteadas = sortear15(questoes, seed);
  
  console.log('\nQuestões selecionadas:');
  sorteadas.forEach((q, i) => {
    console.log(`  ${i + 1}. [${q.topico}] ${q.dificuldade} - ${q.enunciado.slice(0, 80)}...`);
  });

  const txt = formatarSimuladoTxt(sorteadas);
  fs.writeFileSync(SIMULADO_FILE, txt, 'utf-8');
  console.log(`\n✅ Simulado salvo: ${SIMULADO_FILE}`);

  const gabarito = gerarGabaritoSimulado(sorteadas);
  fs.writeFileSync(GABARITO_SIMULADO_FILE, JSON.stringify(gabarito, null, 2), 'utf-8');
  console.log(`✅ Gabarito salvo: ${GABARITO_SIMULADO_FILE}`);

  console.log('\n=== SORTEIO CONCLUÍDO ===');
}

main();