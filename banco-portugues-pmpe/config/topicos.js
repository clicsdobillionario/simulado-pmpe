export const TOPICOS = [
  { id: 'compreensao', nome: 'Compreensão e interpretação de textos', qtd: 150 },
  { id: 'tipologias', nome: 'Tipologias e gêneros textuais', qtd: 40 },
  { id: 'ortografia', nome: 'Ortografia oficial', qtd: 40 },
  { id: 'acentuacao', nome: 'Acentuação gráfica', qtd: 40 },
  { id: 'classes', nome: 'Emprego das classes de palavras', qtd: 70 },
  { id: 'crase', nome: 'Emprego do sinal indicativo de crase', qtd: 60 },
  { id: 'sintaxe', nome: 'Sintaxe da oração e do período', qtd: 100 },
  { id: 'coesao', nome: 'Mecanismos de coesão textual', qtd: 50 },
  { id: 'pontuacao', nome: 'Pontuação', qtd: 80 },
  { id: 'concordancia', nome: 'Concordância nominal e verbal', qtd: 120 },
  { id: 'regencia', nome: 'Regência nominal e verbal', qtd: 120 },
  { id: 'colocacao', nome: 'Colocação pronominal', qtd: 50 },
  { id: 'significacao', nome: 'Significação das palavras', qtd: 30 },
  { id: 'variacao', nome: 'Variação linguística', qtd: 25 },
  { id: 'redacao', nome: 'Redação oficial — regras + modelo', qtd: 25 },
];

export const TOTAL_QUESTOES = TOPICOS.reduce((sum, t) => sum + t.qtd, 0); // 1000

export const TOPICO_POR_ID = Object.fromEntries(TOPICOS.map(t => [t.id, t]));

export function getTopicosFaltantes(questoesExistentes) {
  const contagem = {};
  for (const q of questoesExistentes) {
    contagem[q.topico] = (contagem[q.topico] || 0) + 1;
  }
  return TOPICOS.map(t => ({
    ...t,
    geradas: contagem[t.nome] || 0,
    faltantes: Math.max(0, t.qtd - (contagem[t.nome] || 0))
  })).filter(t => t.faltantes > 0);
}

export function getProximoTopico(questoesExistentes) {
  const faltantes = getTopicosFaltantes(questoesExistentes);
  if (!faltantes.length) return null;
  return faltantes.reduce((a, b) => a.faltantes > b.faltantes ? a : b);
}