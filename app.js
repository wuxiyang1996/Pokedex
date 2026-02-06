/* ============================================
   POKÉDEX PIXEL EDITION - APP LOGIC
   Uses PokeAPI (https://pokeapi.co/)
   ============================================ */

// ─── State ───────────────────────────────────
const state = {
  allPokemon: [],        // { id, name, url } for current gen
  currentPage: 0,
  perPage: 20,
  selectedIndex: 0,      // index within current page
  selectedPokemon: null,  // full pokemon data object
  selectedSpecies: null,  // full species data object
  currentGen: 1,
  genStart: 1,
  genEnd: 151,
  searchTerm: '',
  viewMode: 'grid',      // 'grid' or 'detail'
  detailTab: 'info',
  isLoading: false,
  cache: {},             // pokemon detail cache
  speciesCache: {},      // species detail cache
};

const POKE_API = 'https://pokeapi.co/api/v2';

// ─── DOM References ──────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  titleScreen: $('#title-screen'),
  app: $('#pokedex-app'),
  topScreen: $('#top-screen'),
  pokemonDisplay: $('#pokemon-display'),
  detailView: $('#detail-view'),
  pokemonSprite: $('#pokemon-sprite'),
  pokemonName: $('#pokemon-name'),
  pokemonNumber: $('#pokemon-number'),
  typeBadges: $('#type-badges'),
  genusText: $('#genus-text'),
  shinySparkle: $('#shiny-sparkle'),
  // Card elements
  pokemonCard: $('#pokemon-card'),
  cardStage: $('#card-stage'),
  cardHpVal: $('#card-hp-val'),
  cardTypeIcon: $('#card-type-icon'),
  cardArtFrame: $('#card-art-frame'),
  cardArtBg: $('#card-art-bg'),
  cardWeight: $('#card-weight'),
  cardHeight: $('#card-height'),
  cardRaritySymbol: $('#card-rarity-symbol'),
  // Detail - Info tab
  pokemonHeight: $('#pokemon-height'),
  pokemonWeight: $('#pokemon-weight'),
  pokemonAbility: $('#pokemon-ability'),
  pokemonHiddenAbility: $('#pokemon-hidden-ability'),
  pokemonBaseExp: $('#pokemon-base-exp'),
  pokemonCatchRate: $('#pokemon-catch-rate'),
  pokemonGrowthRate: $('#pokemon-growth-rate'),
  pokemonRarity: $('#pokemon-rarity'),
  flavorText: $('#flavor-text'),
  statsList: $('#stats-list'),
  bstValue: $('#bst-value'),
  movesList: $('#moves-list'),
  // Detail - About tab
  pokemonEggGroups: $('#pokemon-egg-groups'),
  pokemonGender: $('#pokemon-gender'),
  pokemonHabitat: $('#pokemon-habitat'),
  pokemonHappiness: $('#pokemon-happiness'),
  pokemonHatch: $('#pokemon-hatch'),
  pokemonShape: $('#pokemon-shape'),
  pokemonColor: $('#pokemon-color'),
  pokemonGeneration: $('#pokemon-generation'),
  // Bottom screen
  pokemonGrid: $('#pokemon-grid'),
  searchInput: $('#search-input'),
  genFilterBtn: $('#gen-filter-btn'),
  prevPage: $('#prev-page'),
  nextPage: $('#next-page'),
  pageInfo: $('#page-info'),
  // Modal
  genModal: $('#gen-modal'),
  closeGenModal: $('#close-gen-modal'),
  // Loading
  loading: $('#loading'),
  // Cry
  pokemonCry: $('#pokemon-cry'),
};

// ─── Generation Labels ───────────────────────
const GEN_LABELS = {
  1: 'GEN I',   2: 'GEN II',  3: 'GEN III',
  4: 'GEN IV',  5: 'GEN V',   6: 'GEN VI',
  7: 'GEN VII', 8: 'GEN VIII', 9: 'GEN IX',
};

// ─── Stat Short Names ────────────────────────
const STAT_NAMES = {
  'hp': 'HP',
  'attack': 'ATK',
  'defense': 'DEF',
  'special-attack': 'SP.ATK',
  'special-defense': 'SP.DEF',
  'speed': 'SPD',
};

const STAT_CLASSES = {
  'hp': 'stat-hp',
  'attack': 'stat-attack',
  'defense': 'stat-defense',
  'special-attack': 'stat-sp-atk',
  'special-defense': 'stat-sp-def',
  'speed': 'stat-speed',
};

// ─── Rarity Tiers ────────────────────────────
// Rarity symbols match TCG: ● common, ◆ uncommon, ★ rare, ★★ legendary, ✦ mythical
const RARITY = {
  COMMON: { key: 'common', label: 'Common', symbol: '●', cssClass: 'rarity-common' },
  UNCOMMON: { key: 'uncommon', label: 'Uncommon', symbol: '◆', cssClass: 'rarity-uncommon' },
  RARE: { key: 'rare', label: 'Rare', symbol: '★', cssClass: 'rarity-rare' },
  LEGENDARY: { key: 'legendary', label: 'Legendary', symbol: '★★', cssClass: 'rarity-legendary' },
  MYTHICAL: { key: 'mythical', label: 'Mythical', symbol: '✦', cssClass: 'rarity-mythical' },
};

// Type-to-energy-symbol mapping (TCG style)
const TYPE_SYMBOLS = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡',
  psychic: '👁', ice: '❄', dragon: '🐉', dark: '🌑',
  fairy: '🌸', fighting: '👊', poison: '☠', ground: '⛰',
  flying: '🌀', bug: '🐛', rock: '🪨', ghost: '👻',
  steel: '⚙', normal: '⭐',
};

// ─── Helpers ─────────────────────────────────
function padId(id) {
  return '#' + String(id).padStart(3, '0');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeWords(str) {
  return str.split(/[-\s]/).map(capitalize).join(' ');
}

function getSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function getPixelSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getAnimatedSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
}

function getShinySpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`;
}

function showLoading() {
  state.isLoading = true;
  dom.loading.classList.remove('hidden');
}

function hideLoading() {
  state.isLoading = false;
  dom.loading.classList.add('hidden');
}

function computeRarity(species, pokemon) {
  if (species.is_mythical) return RARITY.MYTHICAL;
  if (species.is_legendary) return RARITY.LEGENDARY;
  // Pseudo-legendary: BST >= 600 and 3-stage evo line (we approximate with BST)
  const bst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  if (bst >= 600) return RARITY.RARE;
  // Catch rate based: very hard to catch = uncommon
  if (species.capture_rate <= 45) return RARITY.UNCOMMON;
  return RARITY.COMMON;
}

function getEvolutionStage(species) {
  // evolves_from_species tells us if this is a later stage
  if (!species.evolves_from_species) return 'Basic';
  return 'Stage 1+';
}

// ─── API Fetch ───────────────────────────────
async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API Error: ${resp.status}`);
  return resp.json();
}

async function fetchPokemonList(start, end) {
  const limit = end - start + 1;
  const offset = start - 1;
  const data = await fetchJson(`${POKE_API}/pokemon?limit=${limit}&offset=${offset}`);
  return data.results.map((p, i) => ({
    id: start + i,
    name: p.name,
    url: p.url,
  }));
}

async function fetchPokemonDetail(idOrName) {
  const key = String(idOrName);
  if (state.cache[key]) return state.cache[key];
  const data = await fetchJson(`${POKE_API}/pokemon/${key}`);
  state.cache[key] = data;
  return data;
}

async function fetchSpecies(id) {
  const key = String(id);
  if (state.speciesCache[key]) return state.speciesCache[key];
  const data = await fetchJson(`${POKE_API}/pokemon-species/${id}`);
  state.speciesCache[key] = data;
  return data;
}

// ─── Title Screen ────────────────────────────
function initTitleScreen() {
  function startApp() {
    dom.titleScreen.classList.remove('active');
    dom.app.classList.add('active');
    loadGeneration(1, 1, 151);
    // Play a little "power on" sound effect feel with screen flash
    dom.topScreen.style.background = '#fff';
    setTimeout(() => {
      dom.topScreen.style.background = '';
    }, 100);
  }

  dom.titleScreen.addEventListener('click', startApp);
  document.addEventListener('keydown', (e) => {
    if (dom.titleScreen.classList.contains('active') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      startApp();
    }
  });
}

// ─── Load Generation ─────────────────────────
async function loadGeneration(gen, start, end) {
  showLoading();
  try {
    state.currentGen = gen;
    state.genStart = start;
    state.genEnd = end;
    state.currentPage = 0;
    state.searchTerm = '';
    dom.searchInput.value = '';
    dom.genFilterBtn.textContent = GEN_LABELS[gen] || `GEN ${gen}`;
    state.allPokemon = await fetchPokemonList(start, end);
    renderGrid();
    // Auto-select first pokemon
    if (state.allPokemon.length > 0) {
      selectPokemon(state.allPokemon[0].id);
    }
  } catch (err) {
    console.error('Failed to load generation:', err);
  } finally {
    hideLoading();
  }
}

// ─── Filtered Pokemon ────────────────────────
function getFilteredPokemon() {
  if (!state.searchTerm) return state.allPokemon;
  const term = state.searchTerm.toLowerCase();
  return state.allPokemon.filter(p =>
    p.name.includes(term) || String(p.id).includes(term)
  );
}

// ─── Known Legendary / Mythical IDs (for grid badges without fetching species) ──
const LEGENDARY_IDS = new Set([
  144,145,146,150, // Gen I
  243,244,245,249,250, // Gen II
  377,378,379,380,381,382,383,384, // Gen III
  480,481,482,483,484,485,486,487,488, // Gen IV
  638,639,640,641,642,643,644,645,646, // Gen V
  716,717,718, // Gen VI
  772,773,785,786,787,788,789,790,791,792,800, // Gen VII
  888,889,890,891,892,894,895,896,897,898, // Gen VIII
  1001,1002,1003,1004,1007,1008,1014,1015,1016,1017,1024, // Gen IX
]);

const MYTHICAL_IDS = new Set([
  151, // Mew
  251, // Celebi
  385,386, // Jirachi, Deoxys
  489,490,491,492,493, // Gen IV
  494,647,648,649, // Gen V
  719,720,721, // Gen VI
  801,802,807,808,809, // Gen VII
  893, // Zarude
  1025, // Pecharunt
]);

// ─── Render Grid ─────────────────────────────
function renderGrid() {
  const filtered = getFilteredPokemon();
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
  state.currentPage = Math.min(state.currentPage, totalPages - 1);

  const startIdx = state.currentPage * state.perPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.perPage);

  dom.pokemonGrid.innerHTML = '';
  pageItems.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    if (state.selectedPokemon && state.selectedPokemon.id === p.id) {
      card.classList.add('selected');
    }
    // Rarity indicators on grid
    let rarityBadge = '';
    if (MYTHICAL_IDS.has(p.id)) {
      card.classList.add('grid-mythical');
      rarityBadge = '<span class="grid-rarity" style="color:#b060d0;">✦</span>';
    } else if (LEGENDARY_IDS.has(p.id)) {
      card.classList.add('grid-legendary');
      rarityBadge = '<span class="grid-rarity" style="color:#d0a020;">★</span>';
    }
    card.dataset.id = p.id;
    card.dataset.index = i;
    card.innerHTML = `
      ${rarityBadge}
      <img src="${getPixelSpriteUrl(p.id)}" alt="${p.name}" loading="lazy">
      <span class="card-number">${padId(p.id)}</span>
      <span class="card-name">${p.name}</span>
    `;
    card.addEventListener('click', () => {
      state.selectedIndex = i;
      selectPokemon(p.id);
      highlightCard(p.id);
    });
    dom.pokemonGrid.appendChild(card);
  });

  dom.pageInfo.textContent = `${state.currentPage + 1} / ${totalPages}`;
  dom.prevPage.disabled = state.currentPage === 0;
  dom.nextPage.disabled = state.currentPage >= totalPages - 1;
}

function highlightCard(id) {
  $$('.pokemon-card').forEach(c => c.classList.remove('selected'));
  const card = $(`.pokemon-card[data-id="${id}"]`);
  if (card) card.classList.add('selected');
}

// ─── Select & Display Pokemon ────────────────
async function selectPokemon(id) {
  try {
    const [pokemon, species] = await Promise.all([
      fetchPokemonDetail(id),
      fetchSpecies(id),
    ]);

    state.selectedPokemon = pokemon;
    state.selectedSpecies = species;

    // Show the display view, hide detail if it was open
    showDisplayView();

    // ── Card Header ──
    dom.pokemonName.textContent = capitalize(pokemon.name);
    dom.pokemonNumber.textContent = padId(pokemon.id);

    // HP = base HP stat
    const hpStat = pokemon.stats.find(s => s.stat.name === 'hp');
    dom.cardHpVal.textContent = hpStat ? hpStat.base_stat : '??';

    // Evolution stage
    dom.cardStage.textContent = getEvolutionStage(species);

    // Primary type
    const primaryType = pokemon.types[0].type.name;
    dom.cardTypeIcon.className = 'card-type-icon type-' + primaryType;
    dom.cardTypeIcon.textContent = TYPE_SYMBOLS[primaryType] || '?';

    // ── Card Art Background ──
    dom.cardArtBg.className = 'card-art-bg art-' + primaryType;

    // Card background color by type
    dom.pokemonCard.className = 'poke-card type-bg-' + primaryType;

    // ── Rarity ──
    const rarity = computeRarity(species, pokemon);
    dom.pokemonCard.classList.add(rarity.cssClass);
    dom.cardRaritySymbol.textContent = rarity.symbol;
    dom.cardRaritySymbol.className = 'card-rarity-symbol ' + rarity.cssClass;
    dom.cardRaritySymbol.title = rarity.label;

    // ── Card Footer ──
    const heightM = (pokemon.height / 10).toFixed(1);
    const weightKg = (pokemon.weight / 10).toFixed(1);
    dom.cardWeight.textContent = weightKg + ' kg';
    dom.cardHeight.textContent = heightM + ' m';

    // ── Sprite ──
    const animUrl = getAnimatedSpriteUrl(pokemon.id);
    const officialUrl = getSpriteUrl(pokemon.id);
    const pixelUrl = getPixelSpriteUrl(pokemon.id);

    dom.pokemonSprite.classList.remove('shake');
    dom.pokemonSprite.style.animation = 'none';
    void dom.pokemonSprite.offsetHeight;
    dom.pokemonSprite.style.animation = '';

    dom.pokemonSprite.onerror = function() {
      this.onerror = function() {
        this.onerror = null;
        this.src = pixelUrl;
      };
      this.src = officialUrl;
    };
    dom.pokemonSprite.src = animUrl;

    // ── Types ──
    dom.typeBadges.innerHTML = pokemon.types.map(t =>
      `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`
    ).join('');

    // ── Genus ──
    const genusEntry = species.genera.find(g => g.language.name === 'en');
    dom.genusText.textContent = genusEntry ? genusEntry.genus : '';

    // ── Prepare detail data ──
    updateDetailView(pokemon, species);

    // ── Highlight in grid ──
    highlightCard(id);

    // ── Sprite click: cry + shiny toggle ──
    dom.pokemonSprite.onclick = () => {
      playCry(pokemon.id);
      toggleShiny(pokemon.id);
    };

    // ── Card tilt effect on mouse move (for holo) ──
    setupCardTilt();

  } catch (err) {
    console.error('Failed to load pokemon:', err);
  }
}

// ─── Card Tilt for Holographic Effect ────────
function setupCardTilt() {
  const card = dom.pokemonCard;
  const holoOverlay = card.querySelector('.card-holo-overlay');

  card.onmousemove = (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;

    // Move holo gradient with mouse
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;
    holoOverlay.style.backgroundPosition = `${pctX}% ${pctY}%`;
  };

  card.onmouseleave = () => {
    card.style.transform = '';
    holoOverlay.style.backgroundPosition = '';
  };
}

let isShiny = false;

function toggleShiny(id) {
  isShiny = !isShiny;
  if (isShiny) {
    dom.pokemonSprite.src = getShinySpriteUrl(id);
    dom.pokemonSprite.onerror = () => {
      dom.pokemonSprite.src = getSpriteUrl(id);
      isShiny = false;
      dom.shinySparkle.classList.add('hidden');
    };
    dom.shinySparkle.classList.remove('hidden');
    // Play a sparkle effect
    dom.pokemonSprite.classList.add('shake');
    setTimeout(() => dom.pokemonSprite.classList.remove('shake'), 300);
  } else {
    const animUrl = getAnimatedSpriteUrl(id);
    dom.pokemonSprite.onerror = () => {
      dom.pokemonSprite.src = getSpriteUrl(id);
    };
    dom.pokemonSprite.src = animUrl;
    dom.shinySparkle.classList.add('hidden');
  }

  // Try to play cry
  playCry(id);
}

function playCry(id) {
  try {
    dom.pokemonCry.src = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
    dom.pokemonCry.volume = 0.3;
    dom.pokemonCry.play().catch(() => {});
  } catch (e) {
    // Cry not available, no worries
  }
}

// ─── Detail View ─────────────────────────────
function updateDetailView(pokemon, species) {
  // ── INFO TAB ──
  const heightM = (pokemon.height / 10).toFixed(1);
  const weightKg = (pokemon.weight / 10).toFixed(1);
  const heightFt = (pokemon.height / 10 * 3.281).toFixed(1);
  const weightLbs = (pokemon.weight / 10 * 2.205).toFixed(1);
  dom.pokemonHeight.textContent = `${heightM}m (${heightFt}ft)`;
  dom.pokemonWeight.textContent = `${weightKg}kg (${weightLbs}lb)`;

  // Abilities
  const abilities = pokemon.abilities;
  const mainAbility = abilities.find(a => !a.is_hidden);
  const hiddenAbility = abilities.find(a => a.is_hidden);
  dom.pokemonAbility.textContent = mainAbility
    ? capitalizeWords(mainAbility.ability.name)
    : '—';
  dom.pokemonHiddenAbility.textContent = hiddenAbility
    ? capitalizeWords(hiddenAbility.ability.name)
    : '—';

  // Base experience
  dom.pokemonBaseExp.textContent = pokemon.base_experience || '—';

  // Catch rate
  dom.pokemonCatchRate.textContent = species.capture_rate != null
    ? `${species.capture_rate} (${((species.capture_rate / 255) * 100).toFixed(1)}%)`
    : '—';

  // Growth rate
  dom.pokemonGrowthRate.textContent = species.growth_rate
    ? capitalizeWords(species.growth_rate.name)
    : '—';

  // Rarity
  const rarity = computeRarity(species, pokemon);
  dom.pokemonRarity.textContent = rarity.label;

  // Flavor text
  const flavorEntry = species.flavor_text_entries.find(f => f.language.name === 'en');
  dom.flavorText.textContent = flavorEntry
    ? flavorEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ')
    : 'No data available.';

  // ── STATS TAB ──
  renderStats(pokemon.stats);
  const bst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  dom.bstValue.textContent = bst;

  // ── MOVES TAB ──
  renderMoves(pokemon.moves);

  // ── ABOUT TAB ──
  // Egg groups
  dom.pokemonEggGroups.textContent = species.egg_groups
    ? species.egg_groups.map(g => capitalizeWords(g.name)).join(', ')
    : '—';

  // Gender ratio
  if (species.gender_rate === -1) {
    dom.pokemonGender.innerHTML = '<span class="gender-genderless">Genderless</span>';
  } else {
    const femalePercent = (species.gender_rate / 8) * 100;
    const malePercent = 100 - femalePercent;
    dom.pokemonGender.innerHTML =
      `<span class="gender-male">♂ ${malePercent}%</span> ` +
      `<span class="gender-female">♀ ${femalePercent}%</span>`;
  }

  // Habitat
  dom.pokemonHabitat.textContent = species.habitat
    ? capitalizeWords(species.habitat.name)
    : 'Unknown';

  // Base happiness
  dom.pokemonHappiness.textContent = species.base_happiness != null
    ? species.base_happiness
    : '—';

  // Hatch counter (steps = counter * 255)
  dom.pokemonHatch.textContent = species.hatch_counter != null
    ? `${(species.hatch_counter + 1) * 255} steps`
    : '—';

  // Shape
  dom.pokemonShape.textContent = species.shape
    ? capitalizeWords(species.shape.name)
    : '—';

  // Color
  dom.pokemonColor.textContent = species.color
    ? capitalizeWords(species.color.name)
    : '—';

  // Generation
  if (species.generation) {
    const genName = species.generation.name; // e.g. "generation-i"
    const genNum = genName.split('-')[1].toUpperCase();
    dom.pokemonGeneration.textContent = 'Gen ' + genNum;
  } else {
    dom.pokemonGeneration.textContent = '—';
  }

  // Evolution chain
  loadEvolutionChain(species, pokemon.id);
}

function renderStats(stats) {
  dom.statsList.innerHTML = '';
  stats.forEach(s => {
    const name = STAT_NAMES[s.stat.name] || s.stat.name;
    const val = s.base_stat;
    const pct = Math.min(100, (val / 255) * 100);
    const cls = STAT_CLASSES[s.stat.name] || 'stat-hp';

    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-name">${name}</span>
      <span class="stat-value">${val}</span>
      <div class="stat-bar-bg">
        <div class="stat-bar ${cls}" style="width: 0%"></div>
      </div>
    `;
    dom.statsList.appendChild(row);

    // Animate bar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector('.stat-bar').style.width = pct + '%';
      });
    });
  });
}

function renderMoves(moves) {
  // Get level-up moves, sorted by level
  const levelMoves = moves
    .map(m => {
      const versionDetail = m.version_group_details.find(v =>
        v.move_learn_method.name === 'level-up'
      );
      return versionDetail ? {
        name: m.move.name,
        level: versionDetail.level_learned_at,
        url: m.move.url,
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.level - b.level)
    .slice(0, 30); // Limit to 30 moves

  dom.movesList.innerHTML = '';
  if (levelMoves.length === 0) {
    dom.movesList.innerHTML = '<p style="font-size:8px;color:#5a8a5a;text-align:center;padding:20px;">No level-up moves found.</p>';
    return;
  }

  levelMoves.forEach(m => {
    const item = document.createElement('div');
    item.className = 'move-item';
    item.innerHTML = `
      <span class="move-level">Lv.${m.level}</span>
      <span class="move-name">${m.name.replace(/-/g, ' ')}</span>
    `;
    dom.movesList.appendChild(item);
  });
}

// ─── Evolution Chain ─────────────────────────
async function loadEvolutionChain(speciesData, currentId) {
  try {
    const evoChainUrl = speciesData.evolution_chain.url;
    const evoData = await fetchJson(evoChainUrl);
    const chain = [];

    function walkChain(node) {
      const speciesName = node.species.name;
      const urlParts = node.species.url.split('/');
      const speciesId = parseInt(urlParts[urlParts.length - 2]);
      chain.push({ name: speciesName, id: speciesId });
      if (node.evolves_to && node.evolves_to.length > 0) {
        // Just follow the first evolution path for simplicity
        walkChain(node.evolves_to[0]);
      }
    }

    walkChain(evoData.chain);

    // Only show if there's more than 1 stage
    const evoContainer = document.getElementById('evo-chain');
    if (!evoContainer) return;

    if (chain.length <= 1) {
      evoContainer.innerHTML = '<span style="font-size:7px;color:#5a8a5a;">No evolutions</span>';
      return;
    }

    evoContainer.innerHTML = '';
    chain.forEach((evo, i) => {
      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'evo-arrow';
        arrow.textContent = '►';
        evoContainer.appendChild(arrow);
      }
      const stage = document.createElement('div');
      stage.className = 'evo-stage' + (evo.id === currentId ? ' current' : '');
      stage.innerHTML = `
        <img src="${getPixelSpriteUrl(evo.id)}" alt="${evo.name}">
        <span>${evo.name}</span>
      `;
      stage.addEventListener('click', () => {
        // Check if this pokemon is in our current gen range
        if (evo.id >= state.genStart && evo.id <= state.genEnd) {
          selectPokemon(evo.id);
          showDisplayView();
        } else {
          selectPokemon(evo.id);
          showDisplayView();
        }
      });
      evoContainer.appendChild(stage);
    });
  } catch (err) {
    console.warn('Could not load evolution chain:', err);
  }
}

// ─── View Switching ──────────────────────────
function showDisplayView() {
  isShiny = false;
  dom.shinySparkle.classList.add('hidden');
  dom.pokemonDisplay.style.display = 'flex';
  dom.detailView.classList.add('hidden');
  state.viewMode = 'grid';
}

function showDetailView() {
  if (!state.selectedPokemon) return;
  dom.pokemonDisplay.style.display = 'none';
  dom.detailView.classList.remove('hidden');
  state.viewMode = 'detail';
  // Reset to info tab
  switchTab('info');
}

function switchTab(tab) {
  state.detailTab = tab;
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab-content').forEach(c => c.classList.toggle('hidden', c.id !== `tab-${tab}`));
  $(`#tab-${tab}`).classList.toggle('active', true);
}

// ─── Event Listeners ─────────────────────────
function initEvents() {
  // Search
  dom.searchInput.addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    state.currentPage = 0;
    renderGrid();
  });

  // Pagination
  dom.prevPage.addEventListener('click', () => {
    if (state.currentPage > 0) {
      state.currentPage--;
      renderGrid();
    }
  });

  dom.nextPage.addEventListener('click', () => {
    const filtered = getFilteredPokemon();
    const totalPages = Math.ceil(filtered.length / state.perPage);
    if (state.currentPage < totalPages - 1) {
      state.currentPage++;
      renderGrid();
    }
  });

  // Gen filter
  dom.genFilterBtn.addEventListener('click', () => {
    dom.genModal.classList.remove('hidden');
  });

  dom.closeGenModal.addEventListener('click', () => {
    dom.genModal.classList.add('hidden');
  });

  // Gen buttons
  $$('.gen-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gen-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const gen = parseInt(btn.dataset.gen);
      const start = parseInt(btn.dataset.start);
      const end = parseInt(btn.dataset.end);
      dom.genModal.classList.add('hidden');
      loadGeneration(gen, start, end);
    });
  });

  // Detail tabs
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // D-Pad navigation
  dom.dpadUp = $('#dpad-up');
  dom.dpadDown = $('#dpad-down');
  dom.dpadLeft = $('#dpad-left');
  dom.dpadRight = $('#dpad-right');
  dom.btnA = $('#btn-a');
  dom.btnB = $('#btn-b');

  dom.dpadUp.addEventListener('click', () => navigateGrid('up'));
  dom.dpadDown.addEventListener('click', () => navigateGrid('down'));
  dom.dpadLeft.addEventListener('click', () => navigateGrid('left'));
  dom.dpadRight.addEventListener('click', () => navigateGrid('right'));
  dom.btnA.addEventListener('click', () => pressA());
  dom.btnB.addEventListener('click', () => pressB());

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (dom.titleScreen.classList.contains('active')) return;
    if (document.activeElement === dom.searchInput) {
      if (e.key === 'Escape') {
        dom.searchInput.blur();
        e.preventDefault();
      }
      return;
    }

    switch(e.key) {
      case 'ArrowUp':
      case 'w':
        e.preventDefault();
        navigateGrid('up');
        break;
      case 'ArrowDown':
      case 's':
        e.preventDefault();
        navigateGrid('down');
        break;
      case 'ArrowLeft':
      case 'a':
        e.preventDefault();
        navigateGrid('left');
        break;
      case 'ArrowRight':
      case 'd':
        e.preventDefault();
        navigateGrid('right');
        break;
      case 'Enter':
      case 'z':
        e.preventDefault();
        pressA();
        break;
      case 'Escape':
      case 'x':
      case 'Backspace':
        e.preventDefault();
        pressB();
        break;
      case '/':
        e.preventDefault();
        dom.searchInput.focus();
        break;
    }
  });

  // Click outside modal to close
  dom.genModal.addEventListener('click', (e) => {
    if (e.target === dom.genModal) {
      dom.genModal.classList.add('hidden');
    }
  });
}

// ─── Grid Navigation ─────────────────────────
function navigateGrid(direction) {
  const cards = $$('.pokemon-card');
  if (cards.length === 0) return;

  const cols = 5; // grid columns
  let idx = state.selectedIndex;

  switch(direction) {
    case 'up':
      idx = Math.max(0, idx - cols);
      break;
    case 'down':
      idx = Math.min(cards.length - 1, idx + cols);
      break;
    case 'left':
      if (idx > 0) idx--;
      break;
    case 'right':
      if (idx < cards.length - 1) idx++;
      break;
  }

  state.selectedIndex = idx;
  const card = cards[idx];
  if (card) {
    const pokemonId = parseInt(card.dataset.id);
    selectPokemon(pokemonId);
  }
}

function pressA() {
  if (state.viewMode === 'grid') {
    // Switch to detail view
    showDetailView();
  } else if (state.viewMode === 'detail') {
    // Cycle through tabs
    const tabs = ['info', 'stats', 'moves', 'about'];
    const currentIdx = tabs.indexOf(state.detailTab);
    const nextIdx = (currentIdx + 1) % tabs.length;
    switchTab(tabs[nextIdx]);
  }
}

function pressB() {
  if (state.viewMode === 'detail') {
    showDisplayView();
  }
}

// ─── Init ────────────────────────────────────
function init() {
  initTitleScreen();
  initEvents();
}

document.addEventListener('DOMContentLoaded', init);
