/* 
=========================================================================
 * calculadora.js — Regras de negócio: faltas, notas e eficiência acadêmica
 * -------------------------------------------------------------------------
 * Regras institucionais adotadas (padrão SEST SENAT / MEC):
 * - Frequência mínima exigida: 75%
 * - Limite máximo de faltas permitidas: 25% do total de aulas
 * - Média final: aritmética das avaliações parciais (N1, N2, N3)
 * - Média para aprovação por nota: >= 6,0
========================================================================= */

/**
 * Calcula o limite máximo de faltas permitidas para um componente.
 * Regra: 25% do total de aulas, sempre arredondado para BAIXO (Math.floor).
 * @param {number} totalAulas
 * @returns {number}
 */
function calcularLimiteFaltas(totalAulas) {
  return Math.floor(totalAulas * 0.25);
}

/**
 * Calcula a porcentagem de presença atual do aluno.
 * Fórmula: ((totalAulas - faltasAtuais) / totalAulas) * 100
 * @returns {number} Percentual (0–100), arredondado a 1 casa decimal
 */
function calcularPercentualPresenca(totalAulas, faltasAtuais) {
  if (!totalAulas || totalAulas <= 0) return 0;
  const presenca = ((totalAulas - faltasAtuais) / totalAulas) * 100;
  return Math.round(presenca * 10) / 10;
}

/**
 * Calcula quantas faltas o aluno ainda pode ter antes de ser reprovado.
 * @returns {number} número >= 0 enquanto está OK; < 0 se já passou do limite
 */
function calcularFaltasRestantes(totalAulas, faltasAtuais) {
  return calcularLimiteFaltas(totalAulas) - faltasAtuais;
}

/**
 * FAZ A AVALIAÇÃO VISUAL do status de presença — usado para colorir a barra.
 * Retorna um OBJETO com status, cor (hexadecimal), ícone e mensagem amigável.
 *
 * Regras:
 * - >= 85% → "Seguro" (verde emerald)
 * - >= 75% e < 85% → "Atenção" (âmbar)
 * - < 75% → "Reprovado por Falta" (vermelho rose)
 */
function avaliarStatusPresenca(totalAulas, faltasAtuais) {
  const freq = calcularPercentualPresenca(totalAulas, faltasAtuais);
  const restantes = calcularFaltasRestantes(totalAulas, faltasAtuais);

  if (freq >= 85) {
    return {
      status: "Seguro",
      cor: "#10B981", // emerald-500
      classeTailwind: "bg-emerald-500 text-white",
      mensagem: `Sua frequência está em ${freq}%. Você ainda pode faltar ${restantes} aula(s) sem risco.`
    };
  }

  if (freq >= 75) {
    return {
      status: "Atenção",
      cor: "#F59E0B", // amber-500
      classeTailwind: "bg-amber-500 text-white",
      mensagem: `Atenção: frequência de ${freq}%. Faltam apenas ${restantes} falta(s) para a reprovação por frequência.`
    };
  }

  return {
    status: "Reprovado por Falta",
    cor: "#E11D48", // rose-600
    classeTailwind: "bg-rose-600 text-white",
    mensagem: `Frequência crítica: ${freq}%. Você atingiu o limite de faltas permitidas. Procure a coordenação.`
  };
}

// ────────────────────────────────────────────────────────────────────────
// NOTAS E MÉDIA
// ────────────────────────────────────────────────────────────────────────

/**
 * Calcula a média de um componente a partir das notas parciais.
 * Aceita de 1 a 3 avaliações; ignora campos vazios.
 * @param {number[]} notas Ex.: [7.5, 6.0, 8.2]
 * @returns {number} média aritmética (0–10), 1 casa decimal
 */
function calcularMedia(notas) {
  const validas = (notas || []).filter((n) => typeof n === "number" && !isNaN(n));
  if (validas.length === 0) return 0;
  const soma = validas.reduce((acc, n) => acc + n, 0);
  return Math.round((soma / validas.length) * 10) / 10;
}

/**
 * Avalia o status da média final do aluno.
 * Regra: media >= 6.0 → Aprovado por nota | < 6.0 → Reprovado por nota
 */
function avaliarStatusNota(media) {
  if (media >= 6.0) {
    return { status: "Aprovado por Nota", cor: "#10B981", classeTailwind: "text-emerald-600 font-semibold" };
  }
  if (media >= 4.0) {
    return { status: "Recuperação", cor: "#F59E0B", classeTailwind: "text-amber-600 font-semibold" };
  }
  return { status: "Reprovado por Nota", cor: "#E11D48", classeTailwind: "text-rose-600 font-semibold" };
}

// ────────────────────────────────────────────────────────────────────────
// INDICADOR DE EFICIÊNCIA GERAL (média global do semestre)
// ────────────────────────────────────────────────────────────────────────

/**
 * Calcula o Indicador de Eficiência Geral (IEG) do aluno no semestre.
 * Soma das médias de todos os componentes dividida pelo número de componentes.
 * @param {Array} componentes lista de matérias (cada uma tem campo .notas)
 * @returns {{ ieg: number, status: object }}
 */
function calcularIEG(componentes) {
  if (!componentes || componentes.length === 0) {
    return { ieg: 0, status: { status: "Sem dados", cor: "#94A3B8", classeTailwind: "text-slate-400" } };
  }

  const medias = componentes.map((c) => calcularMedia(c.notas));
  const ieg = medias.reduce((acc, m) => acc + m, 0) / medias.length;

  return {
    ieg: Math.round(ieg * 10) / 10,
    status: avaliarStatusNota(Math.round(ieg * 10) / 10)
  };
    }
