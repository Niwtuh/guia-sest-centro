/* 
=========================================================================
 * app.js — Orquestrador principal do Guia Acadêmico SEST SENAT Centro
 * -------------------------------------------------------------------------
 * Responsabilidades deste arquivo:
 * 1) Inicializar o aplicativo quando o DOM estiver pronto.
 * 2) Registrar o Service Worker (PWA/offline).
 * 3) Controlar a navegação entre as 4 abas (Início, Mapa, Desempenho, Ouvidoria).
 * 4) Renderizar a lista de componentes curriculares do aluno.
 * 5) Implementar a Calculadora de Faltas (interface com botões + / -).
 * 6) Implementar a Calculadora de Notas + Indicador de Eficiência.
 * 7) Implementar o gatilho do Feedback Anônimo a cada 2 componentes concluídos.
 * 8) Implementar o Canal de Denúncia 100% anônimo.
 *
 * Dependências (carregadas via <script> no index.html):
 * - storage.js → funções carregarDados / salvarDados / CHAVES
 * - calculadora.js → todas as funções de cálculo
 * - mapa.js → inicializarMapa()
========================================================================= */

// ────────────────────────────────────────────────────────────────────────
// 1) INICIALIZAÇÃO
// ────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  registrarServiceWorker();
  configurarNavegacao();
  configurarBuscaMapa();
  renderizarTudo();
});

/**
 * Registra o Service Worker (sw.js) para ativar o modo offline e a
 * instalação do app na tela inicial do celular.
 */
function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => console.log("SW registrado:", reg.scope))
      .catch((err) => console.warn("SW não registrado:", err));
  }
}

// ────────────────────────────────────────────────────────────────────────
// 2) NAVEGAÇÃO ENTRE ABAS
// ────────────────────────────────────────────────────────────────────────
/**
 * Alterna a aba visível. Cada "página" é uma <section data-pagina="x">.
 * Esconde todas, mostra apenas a selecionada.
 */
function trocarAba(nomeAba) {
  // Esconde todas as páginas
  document.querySelectorAll("[data-pagina]").forEach((el) => {
    el.classList.add("hidden");
  });
  // Mostra a página escolhida
  const alvo = document.querySelector(`[data-pagina="${nomeAba}"]`);
  if (alvo) alvo.classList.remove("hidden");

  // Marca o botão da barra inferior como ativo
  document.querySelectorAll("[data-aba]").forEach((btn) => {
    btn.classList.remove("text-blue-700");
    btn.classList.add("text-slate-500");
  });
  const botaoAtivo = document.querySelector(`[data-aba="${nomeAba}"]`);
  if (botaoAtivo) {
    botaoAtivo.classList.add("text-blue-700");
    botaoAtivo.classList.remove("text-slate-500");
  }

  // Ao entrar no mapa, garante que os dados foram carregados
  if (nomeAba === "mapa") {
    if (typeof inicializarMapa === "function") inicializarMapa();
  }

  // Salva a última aba aberta (preferência do usuário)
  salvarDados(CHAVES.PREFERENCIAS, { ultimaAba: nomeAba });
}

/**
 * Configura os cliques na barra de navegação inferior.
 */
function configurarNavegacao() {
  document.querySelectorAll("[data-aba]").forEach((btn) => {
    btn.addEventListener("click", () => trocarAba(btn.dataset.aba));
  });

  // Restaura a última aba visualizada (se houver)
  const prefs = carregarDados(CHAVES.PREFERENCIAS);
  if (prefs && prefs.ultimaAba) trocarAba(prefs.ultimaAba);
}

/**
 * Configura a caixa de busca rápida do mapa.
 */
function configurarBuscaMapa() {
  const input = document.getElementById("mapa-busca");
  if (input) {
    input.addEventListener("input", (e) => filtrarPorBusca(e.target.value));
  }
}

// ────────────────────────────────────────────────────────────────────────
// 3) GERENCIAMENTO DE COMPONENTES CURRICULARES
// ────────────────────────────────────────────────────────────────────────
/**
 * Retorna a lista de matérias do aluno (ou vazio se for 1º uso).
 */
function obterComponentes() {
  return carregarDados(CHAVES.COMPONENTES) || [];
}

/**
 * Salva a lista de matérias no localStorage.
 */
function salvarComponentes(lista) {
  salvarDados(CHAVES.COMPONENTES, lista);
  renderizarTudo();
}

/**
 * Adiciona um novo componente a partir do formulário da tela Início.
 */
function adicionarComponente(evento) {
  evento.preventDefault();
  const form = evento.target;
  const novo = {
    id: "comp-" + Date.now(),
    nome: form.nome.value.trim(),
    professor: form.professor.value.trim(),
    sala: form.sala.value.trim(),
    totalAulas: parseInt(form.totalAulas.value) || 0,
    faltasAtuais: 0,
    notas: [],
    concluido: false
  };

  if (!novo.nome || !novo.totalAulas) {
    alert("Preencha pelo menos o nome da matéria e o total de aulas.");
    return;
  }

  const lista = obterComponentes();
  lista.push(novo);
  salvarComponentes(lista);
  form.reset();
}

/**
 * Remove uma matéria cadastrada pelo id.
 */
function removerComponente(id) {
  if (!confirm("Excluir este componente? Esta ação não pode ser desfeita.")) return;
  const lista = obterComponentes().filter((c) => c.id !== id);
  salvarComponentes(lista);
}

/**
 * Marca/desmarca uma matéria como "concluída".
 * A cada 2 marcações, dispara o gatilho de feedback anônimo.
 */
function toggleConcluido(id) {
  const lista = obterComponentes();
  const comp = lista.find((c) => c.id === id);
  if (!comp) return;

  comp.concluido = !comp.concluido;
  salvarComponentes(lista);

  // GATILHO DE FEEDBACK a cada 2 componentes concluídos
  const totalConcluidos = lista.filter((c) => c.concluido).length;
  if (totalConcluidos > 0 && totalConcluidos % 2 === 0) {
    sugerirFeedback();
  }
}

// ────────────────────────────────────────────────────────────────────────
// 4) CALCULADORA DE FALTAS — botões + e -
// ────────────────────────────────────────────────────────────────────────
function adicionarFalta(id) {
  const lista = obterComponentes();
  const comp = lista.find((c) => c.id === id);
  if (!comp) return;
  comp.faltasAtuais++;
  salvarComponentes(lista);
}

function removerFalta(id) {
  const lista = obterComponentes();
  const comp = lista.find((c) => c.id === id);
  if (!comp) return;
  if (comp.faltasAtuais > 0) comp.faltasAtuais--;
  salvarComponentes(lista);
}

// ────────────────────────────────────────────────────────────────────────
// 5) CALCULADORA DE NOTAS
// ────────────────────────────────────────────────────────────────────────
function atualizarNota(idComp, indice, valor) {
  const lista = obterComponentes();
  const comp = lista.find((c) => c.id === idComp);
  if (!comp) return;

  const num = parseFloat(valor);
  if (isNaN(num)) return;

  comp.notas[indice] = Math.max(0, Math.min(10, num));
  salvarComponentes(lista);
}

// ────────────────────────────────────────────────────────────────────────
// 6) FEEDBACK ANÔNIMO (a cada 2 concluídos)
// ────────────────────────────────────────────────────────────────────────
function sugerirFeedback() {
  const card = document.getElementById("card-feedback-gatilho");
  if (!card) return;
  card.classList.remove("hidden");
}

async function enviarFeedback(evento) {
  evento.preventDefault();
  const form = evento.target;
  const payload = {
    didatica: form.didatica.value,
    pontualidade: form.pontualidade.value,
    clareza: form.clareza.value,
    sugestao: form.sugestao.value.trim(),
    enviadoEm: new Date().toISOString()
  };

  const feedbacks = carregarDados(CHAVES.FEEDBACKS) || [];
  feedbacks.push(payload);
  salvarDados(CHAVES.FEEDBACKS, feedbacks);

  const ENDPOINT_FORMSPREE = "https://formspree.io/f/SEU_ID_AQUI";
  try {
    await fetch(ENDPOINT_FORMSPREE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
    alert("Feedback enviado! Obrigado por contribuir com a melhoria do curso.");
  } catch (erro) {
    alert("Sem conexão agora, mas seu feedback foi salvo no aparelho e será consolidado depois.");
  }

  form.reset();
  document.getElementById("card-feedback-gatilho").classList.add("hidden");
}

// ────────────────────────────────────────────────────────────────────────
// 7) CANAL DE DENÚNCIA 100% ANÔNIMO
// ────────────────────────────────────────────────────────────────────────
async function enviarDenuncia(evento) {
  evento.preventDefault();
  const form = evento.target;
  const denuncia = {
    tipo: form.tipo.value,
    turno: form.turno.value,
    dataAproximada: form.dataAproximada.value,
    relato: form.relato.value.trim(),
    registradoEm: new Date().toISOString()
  };

  if (!denuncia.relato || denuncia.relato.length < 10) {
    alert("Por favor, descreva o ocorrido com mais detalhes (mínimo 10 caracteres).");
    return;
  }

  const denuncias = carregarDados(CHAVES.DENUNCIAS) || [];
  denuncias.push(denuncia);
  salvarDados(CHAVES.DENUNCIAS, denuncias);

  const ENDPOINT_OUVIDORIA = "https://formspree.io/f/SEU_ID_OUVIDORIA";
  try {
    await fetch(ENDPOINT_OUVIDORIA, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(denuncia)
    });
    alert("Denúncia registrada com sucesso. Nenhum dado pessoal foi coletado.");
  } catch (erro) {
    alert("Sem conexão agora. A denúncia foi salva no aparelho e será enviada quando houver internet.");
  }

  form.reset();
}

// ────────────────────────────────────────────────────────────────────────
// 8) RENDERIZAÇÃO DAS TELAS
// ────────────────────────────────────────────────────────────────────────
function renderizarTudo() {
  const comps = obterComponentes();
  renderListaComponentes(comps);
  renderDesempenho(comps);
  renderIEG(comps);
  renderResumoInicio(comps);
}

function renderListaComponentes(comps) {
  const container = document.g
