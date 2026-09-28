import crypto from 'node:crypto';

export function validaQuestao(q) {
  if (!q || typeof q !== 'object') return { valida: false, erro: 'Não é objeto' };
  if (typeof q.enunciado !== 'string' || q.enunciado.trim().length < 10) {
    return { valida: false, erro: 'Enunciado inválido ou muito curto' };
  }
  if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
    return { valida: false, erro: 'Deve ter exatamente 5 alternativas' };
  }
  if (!q.alternativas.every(a => typeof a === 'string' && a.trim().length > 0)) {
    return { valida: false, erro: 'Alternativas inválidas' };
  }
  const unicas = new Set(q.alternativas.map(a => a.trim().toLowerCase()));
  if (unicas.size !== 5) {
    return { valida: false, erro: 'Alternativas duplicadas' };
  }
  if (!Number.isInteger(q.correta) || q.correta < 0 || q.correta > 4) {
    return { valida: false, erro: 'Índice correta inválido (0-4)' };
  }
  if (typeof q.explicacao !== 'string' || q.explicacao.trim().length < 5) {
    return { valida: false, erro: 'Explicação inválida ou muito curta' };
  }
  const proibidas = ['todas as anteriores', 'nenhuma das anteriores', 'todas estão corretas', 'todas as alternativas'];
  const temProibida = q.alternativas.some(a => proibidas.some(p => a.toLowerCase().includes(p)));
  if (temProibida) {
    return { valida: false, erro: 'Contém alternativa proibida (todas/nenhuma anterior)' };
  }
  return { valida: true };
}

export function embaralhaAlternativas(q) {
  const indices = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
  return {
    ...q,
    alternativas: indices.map(i => q.alternativas[i]),
    correta: indices.indexOf(q.correta)
  };
}

export function hashEnunciado(enunciado) {
  return crypto.createHash('md5').update(enunciado.trim().slice(0, 120)).digest('hex');
}

export function validaLote(questoes, hashesExistentes = new Set()) {
  const validas = [];
  const erros = [];
  const hashesNovos = new Set(hashesExistentes);
  
  for (const q of questoes) {
    const validacao = validaQuestao(q);
    if (!validacao.valida) {
      erros.push({ questao: q, erro: validacao.erro });
      continue;
    }
    const hash = hashEnunciado(q.enunciado);
    if (hashesNovos.has(hash)) {
      erros.push({ questao: q, erro: 'Enunciado duplicado (hash)' });
      continue;
    }
    hashesNovos.add(hash);
    validas.push(q);
  }
  
  return { validas, erros, hashesNovos };
}

export function calcularDificuldade(q) {
  const texto = (q.enunciado + ' ' + q.alternativas.join(' ') + ' ' + q.explicacao).toLowerCase();
  let score = 0;
  
  const complexos = ['subordinação', 'coordenação', 'mesóclise', 'próclise', 'ênclise', 'syllepse', 'atração', 'regência', 'concordância nominal', 'concordância verbal', 'crase obrigatória', 'crase facultativa'];
  const medios = ['pontuação', 'coesão', 'referenciação', 'conectivo', 'sujeito composto', 'predicado', 'objeto direto', 'objeto indireto'];
  
  for (const t of complexos) if (texto.includes(t)) score += 3;
  for (const t of medios) if (texto.includes(t)) score += 1;
  
  if (q.enunciado.length > 300) score += 2;
  if (q.explicacao.length > 200) score += 1;
  
  if (score >= 6) return 'dificil';
  if (score >= 3) return 'media';
  return 'facil';
}

export function enriquecerQuestao(q, topico, modelo, tokens) {
  const embaralhada = embaralhaAlternativas(q);
  const dificuldade = calcularDificuldade(q);
  return {
    ...embaralhada,
    topico,
    dificuldade,
    modelo,
    tokens,
    gerado_em: new Date().toISOString(),
    hash: hashEnunciado(q.enunciado)
  };
}