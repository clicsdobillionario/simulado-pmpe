import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { TOPICOS, TOTAL_QUESTOES, getTopicosFaltantes, getProximoTopico } from '../config/topicos.js';
import { MODELS, RETRY_STATUS_CODES, MAX_RETRIES_PER_MODEL, MAX_TOTAL_ATTEMPTS, BATCH_SIZE, REQUEST_DELAY_MS, parseRetryAfter, getModelForAttempt, calculateBackoff } from '../config/modelos.js';
import { SYSTEM_PROMPT, getPrompt } from '../config/prompts.js';
import { validaLote, enriquecerQuestao } from './validar-questao.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

const QUESTOES_FILE = path.join(DATA_DIR, 'questoes.json');
const LOG_FILE = path.join(LOGS_DIR, `geracao-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.log`);

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('ERRO: GEMINI_API_KEY não definida. Configure no ambiente.');
  process.exit(1);
}

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function carregarProgresso() {
  if (!fs.existsSync(QUESTOES_FILE)) return [];
  try {
    const data = fs.readFileSync(QUESTOES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    log(`ERRO ao ler ${QUESTOES_FILE}: ${e.message}`);
    return [];
  }
}

function salvarProgresso(questoes) {
  const tmp = QUESTOES_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(questoes, null, 2));
  fs.renameSync(tmp, QUESTOES_FILE);
  log(`Progresso salvo: ${questoes.length}/${TOTAL_QUESTOES} questões`);
}

async function chamarGemini(prompt, modelo) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8000 },
    }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

function extrairQuestoes(responseData) {
  const cand = responseData.candidates?.[0];
  if (!cand) return null;
  const txt = (cand.content?.parts || []).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function gerarLote(topico, qtdNecessaria, hashesExistentes) {
  const qtd = Math.min(qtdNecessaria, BATCH_SIZE);
  const prompt = getPrompt(topico.id, qtd);
  log(`[${topico.nome}] Gerando lote de ${qtd} (faltam ${qtdNecessaria})`);

  for (let tentativa = 0; tentativa < MAX_TOTAL_ATTEMPTS; tentativa++) {
    const modelo = getModelForAttempt(tentativa);
    log(`[${topico.nome}] Tentativa ${tentativa + 1}/${MAX_TOTAL_ATTEMPTS} com ${modelo}`);
    
    const { ok, status, data } = await chamarGemini(prompt, modelo);
    
    if (!ok) {
      if (RETRY_STATUS_CODES.includes(status)) {
        const retryAfter = parseRetryAfter(data?.error?.message);
        const delay = calculateBackoff(tentativa, retryAfter);
        log(`[${topico.nome}] Status ${status}, aguardando ${delay}ms antes de retry`);
        await sleep(delay);
        continue;
      }
      log(`[${topico.nome}] Erro API ${status}: ${JSON.stringify(data).slice(0, 300)}`);
      continue;
    }

    const bruto = extrairQuestoes(data);
    if (!bruto || !Array.isArray(bruto)) {
      log(`[${topico.nome}] Resposta inválida ou vazia`);
      continue;
    }

    const { validas, erros, hashesNovos } = validaLote(bruto, hashesExistentes);
    
    if (erros.length) {
      log(`[${topico.nome}] ${erros.length} questões inválidas: ${erros.map(e => e.erro).join(', ')}`);
    }

    if (validas.length > 0) {
      const enriquecidas = validas.slice(0, qtd).map(q => 
        enriquecerQuestao(q, topico.nome, modelo, JSON.stringify(q).length)
      );
      log(`[${topico.nome}] Sucesso: ${enriquecidas.length} questões válidas`);
      return { questoes: enriquecidas, hashes: hashesNovos };
    }

    log(`[${topico.nome}] Nenhuma questão válida no lote`);
  }

  log(`[${topico.nome}] FALHOU após ${MAX_TOTAL_ATTEMPTS} tentativas`);
  return { questoes: [], hashes: hashesExistentes };
}

async function main() {
  const args = process.argv.slice(2);
  const resume = args.includes('--resume');
  
  log(`=== INÍCIO GERAÇÃO BANCO PORTUGUÊS PM-PE ===`);
  log(`Total alvo: ${TOTAL_QUESTOES} questões`);
  log(`Modo: ${resume ? 'RESUME' : 'NOVO'}`);

  const questoes = resume ? carregarProgresso() : [];
  const hashes = new Set(questoes.map(q => q.hash).filter(Boolean));
  
  log(`Carregadas: ${questoes.length} questões existentes`);

  while (true) {
    const topico = getProximoTopico(questoes);
    if (!topico) {
      log('✅ TODOS OS TÓPICOS COMPLETOS!');
      break;
    }

    log(`\n--- Próximo: ${topico.nome} (faltam ${topico.faltantes}) ---`);
    
    const { questoes: novas, hashes: novosHashes } = await gerarLote(topico, topico.faltantes, hashes);
    
    if (novas.length > 0) {
      const ids = questoes.length > 0 ? Math.max(...questoes.map(q => q.id)) : 0;
      const comIds = novas.map((q, i) => ({ ...q, id: ids + i + 1 }));
      questoes.push(...comIds);
      hashes.clear(); novosHashes.forEach(h => hashes.add(h));
      salvarProgresso(questoes);
    }

    if (questoes.length >= TOTAL_QUESTOES) {
      log('✅ META DE 1000 ATINGIDA!');
      break;
    }

    log(`Aguardando ${REQUEST_DELAY_MS}ms antes do próximo lote...`);
    await sleep(REQUEST_DELAY_MS);
  }

  log(`\n=== GERAÇÃO CONCLUÍDA ===`);
  log(`Total final: ${questoes.length} questões`);
  gerarEstatisticas(questoes);
}

function gerarEstatisticas(questoes) {
  const stats = {
    total: questoes.length,
    porTopico: {},
    porDificuldade: { facil: 0, media: 0, dificil: 0 },
    porModelo: {},
    dataGeracao: new Date().toISOString()
  };

  for (const q of questoes) {
    stats.porTopico[q.topico] = (stats.porTopico[q.topico] || 0) + 1;
    stats.porDificuldade[q.dificuldade] = (stats.porDificuldade[q.dificuldade] || 0) + 1;
    stats.porModelo[q.modelo] = (stats.porModelo[q.modelo] || 0) + 1;
  }

  const statsFile = path.join(DATA_DIR, 'estatisticas.json');
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  log(`Estatísticas salvas em ${statsFile}`);
  log(JSON.stringify(stats, null, 2));
}

main().catch(e => {
  log(`ERRO FATAL: ${e.message}`);
  console.error(e);
  process.exit(1);
});