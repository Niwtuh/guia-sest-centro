/* 
=========================================================================
 * mapa.js — Renderização e interatividade do Mapa da Unidade Centro
 * -------------------------------------------------------------------------
 * ESTRATÉGIA: Abordagem B (Grid Esquemático Responsivo).
 * Cada sala/consultório é um bloco <div> clicável organizado por andar,
 * gerado dinamicamente a partir de data/locais.json.
 *
 * Não usamos Leaflet/Mapbox porque a planta é INTERNA e precisa funcionar
 * 100% offline. CSS Grid do Tailwind resolve com simplicidade.
========================================================================= */

let LOCAIS_CACHE = []; // cache local da lista de locais
let CATEGORIAS_CACHE = []; // cache das categorias
let FILTRO_ATUAL = "todos"; // filtro ativo no momento
let TERMO_BUSCA = ""; // texto da busca rápida

/**
 * Carrega o arquivo data/locais.json e guarda em cache.
 * Retorna uma Promise resolvida com { categorias, locais }.
 */
async function carregarLocais() {
  try {
    const resposta = await fetch("data/locais.json");
    const dados = await resposta.json();
    CATEGORIAS_CACHE = dados.categorias || [];
    LOCAIS_CACHE = dados.locais || [];
    return dados;
  } catch (erro) {
    console.error("mapa.carregarLocais: erro ao carregar JSON", erro);
    // Em caso de erro (offline primeiro uso sem SW ativo), avisa o usuário
    return { categorias: [], locais: [], erro: true };
  }
}

/**
 * Retorna a cor da categoria de um local (para aplicar no bloco visual).
 */
function corDoLocal(local) {
  if (local.cor) return local.cor; // consultórios têm cor própria
  const cat = CATEGORIAS_CACHE.find((c) => c.id === local.categoria);
  return cat ? cat.cor : "#94A3B8"; // cinza fallback
}

/**
 * Renderiza os botões de filtro no topo do mapa.
 */
function renderizarFiltros() {
  const container = document.getElementById("mapa-filtros");
  if (!container) return;

  const opcoes = [
    { id: "todos", rotulo: "Todos", cor: "#1D4ED8" },
    ...CATEGORIAS_CACHE
  ];

  container.innerHTML = opcoes.map((op) => `
    <button onclick="aplicarFiltro('${op.id}')"
      class="px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap min-h-[44px] transition-colors
      ${FILTRO_ATUAL === op.id ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
      style="${FILTRO_ATUAL === op.id ? `background-color:${op.cor}` : ''}">
      ${op.rotulo}
    </button>
  `).join("");
}

/**
 * Aplica um filtro de categoria e re-renderiza os blocos do mapa.
 */
function aplicarFiltro(categoriaId) {
  FILTRO_ATUAL = categoriaId;
  renderizarFiltros();
  renderizarBlocosMapa();
}

/**
 * Filtra os locais por termo de busca (nome, tipo ou uso).
 */
function filtrarPorBusca(termo) {
  TERMO_BUSCA = (termo || "").toLowerCase().trim();
  renderizarBlocosMapa();
}

/**
 * Verifica se um local passa no filtro ativo e na busca.
 */
function localVisivel(local) {
  // Filtro por categoria
  if (FILTRO_ATUAL !== "todos" && local.categoria !== FILTRO_ATUAL) return false;

  // Busca rápida: checa nome, tipo, especialidades e uso
  if (TERMO_BUSCA) {
    const haystack = [
      local.nome,
      local.tipo,
      local.uso,
      (local.especialidades || []).join(" "),
      local.observacao || ""
    ].join(" ").toLowerCase();

    if (!haystack.includes(TERMO_BUSCA)) return false;
  }

  return true;
}

/**
 * Renderiza os blocos (cards) do mapa, agrupados por andar.
 * Os blocos invisíveis ficam "esmaecidos" (opacity-25) para manter o layout.
 */
function renderizar
