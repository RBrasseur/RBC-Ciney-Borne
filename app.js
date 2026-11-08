/**
 * APPLICATION DE PRISE DE COMMANDES — RBC CINEY
 * Fonctionnement :
 * - Sélection par catégories (Bières, Crémants & Vins, Softs, Boissons chaudes, Soupes, Snacks)
 * - Un appui sur '+' ajoute l'article et redirige immédiatement vers la sélection générale
 * - Un appui sur '-' permet de corriger/retirer un article en cas d'erreur
 * - Aucune gestion de prix (uniquement les quantités et le total d'articles)
 * - Carte 100% modifiable et sauvegardée dans le navigateur (localStorage)
 */

const STORAGE_KEY_MENU = 'rbc_ciney_menu_v1';
const STORAGE_KEY_ORDER = 'rbc_ciney_current_order_v1';

// Carte officielle basée sur la feuille du RBC Ciney + ajustements demandés
const DEFAULT_MENU = [
  {
    id: 'bieres',
    name: 'Bières',
    items: [
      'BIERE',
      'TANGO',
      'MAZOUT',
      'PANACHE',
      'WITTEKERKE ROSEE',
      'RADLER CITRON',
      'LEONARD TRIPLE',
      'CUVEE CINEY BLONDE',
      'ORVAL',
      'CHIMAY DOREE',
      'KWARMONT',
      'KWARMONT 0%'
    ]
  },
  {
    id: 'vins-cremants',
    name: 'Crémants & Vins',
    items: [
      'VIN BLANC',
      'VIN ROUGE',
      'CREMANT'
    ]
  },
  {
    id: 'softs',
    name: 'Softs',
    items: [
      'EAU PLATE',
      'EAU PETILLANTE',
      'COCA 0%',
      'COCA',
      'FANTA',
      'JUS MULTIFRUITS',
      'JUS POMME CERISE',
      'TONIC BLISS',
      'LIPTON 0%',
      'FUZE TEA PECHE',
      'FUZE TEA GREEN',
      'AGRUME',
      'AQUARIUS CITRON',
      'AQUARIUS BLEU',
      'AQUARIUS ROUGE',
      'AQUARIUS CHERRY'
    ]
  },
  {
    id: 'boissons-chaudes',
    name: 'Boissons chaudes',
    items: [
      'CAFE',
      'CHOCO CHAUD',
      'THE NATURE',
      'THE MENTHE',
      'THE CITRON'
    ]
  },
  {
    id: 'soupes',
    name: 'Soupes',
    items: [
      'SOUPE LEGUMES',
      'SOUPE POULET',
      'SOUPE TOMATES'
    ]
  },
  {
    id: 'snacks',
    name: 'Snacks',
    items: [
      'CHIPS SEL',
      'CHIPS PAPRIKA',
      'CHIPS POIVRE SEL',
      'CHIPS THAI CURRY',
      'SAUCISSE SECHE',
      'CROQUE MONSIEUR'
    ]
  }
];

// État de l'application
let menuData = [];
let currentOrder = {}; // clé: "catId::itemName" -> { catId, catName, itemName, qty }
let activeCategoryId = null;
let lastAddedKey = null;
let toastTimeout = null;

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  bindEvents();
  renderGeneralView();
});

function loadState() {
  try {
    const savedMenu = localStorage.getItem(STORAGE_KEY_MENU);
    menuData = savedMenu ? JSON.parse(savedMenu) : JSON.parse(JSON.stringify(DEFAULT_MENU));
  } catch (e) {
    menuData = JSON.parse(JSON.stringify(DEFAULT_MENU));
  }

  try {
    const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
    currentOrder = savedOrder ? JSON.parse(savedOrder) : {};
  } catch (e) {
    currentOrder = {};
  }
}

function saveMenu() {
  try {
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menuData));
  } catch (e) {
    console.error('Impossible de sauvegarder la carte :', e);
  }
}

function saveOrder() {
  try {
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(currentOrder));
  } catch (e) {
    console.error('Impossible de sauvegarder la commande :', e);
  }
}

function makeOrderKey(catId, itemName) {
  return `${catId}::${itemName}`;
}

function getItemQty(catId, itemName) {
  const key = makeOrderKey(catId, itemName);
  return currentOrder[key] ? currentOrder[key].qty : 0;
}

function getCategorySelectedCount(catId) {
  return Object.values(currentOrder)
    .filter(entry => entry.catId === catId)
    .reduce((sum, entry) => sum + entry.qty, 0);
}

function getTotalOrderCount() {
  return Object.values(currentOrder).reduce((sum, entry) => sum + entry.qty, 0);
}

// Ajout d'un article (+1)
function incrementItem(catId, itemName, redirectToGeneral = false) {
  const category = menuData.find(c => c.id === catId);
  const catName = category ? category.name : 'Autre';
  const key = makeOrderKey(catId, itemName);

  if (!currentOrder[key]) {
    currentOrder[key] = {
      catId,
      catName,
      itemName,
      qty: 0
    };
  }
  currentOrder[key].qty += 1;
  lastAddedKey = key;
  saveOrder();

  showToast(`+1 ${itemName} ajouté`, key);

  if (redirectToGeneral) {
    showGeneralView();
  } else {
    renderGeneralView();
    if (activeCategoryId) {
      renderCategoryItems(activeCategoryId);
    }
  }
}

// Retrait d'un article (-1)
function decrementItem(catId, itemName) {
  const key = makeOrderKey(catId, itemName);
  if (!currentOrder[key]) return;

  currentOrder[key].qty -= 1;
  if (currentOrder[key].qty <= 0) {
    delete currentOrder[key];
  }
  saveOrder();

  renderGeneralView();
  if (activeCategoryId) {
    renderCategoryItems(activeCategoryId);
  }
}

// Notification rapide avec bouton d'annulation (-1)
function showToast(message, key) {
  const banner = document.getElementById('toastBanner');
  const textEl = document.getElementById('toastText');
  textEl.textContent = message;
  banner.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    banner.classList.add('hidden');
  }, 4000);
}

// Navigation entre Sélection Générale et Catégorie
function showGeneralView() {
  activeCategoryId = null;
  document.getElementById('viewCategory').classList.add('hidden');
  document.getElementById('viewGeneral').classList.remove('hidden');
  renderGeneralView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openCategoryView(catId) {
  const category = menuData.find(c => c.id === catId);
  if (!category) return;

  activeCategoryId = catId;
  document.getElementById('currentCategoryTitle').textContent = category.name;
  document.getElementById('viewGeneral').classList.add('hidden');
  document.getElementById('viewCategory').classList.remove('hidden');
  renderCategoryItems(catId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Rendu de la Sélection Générale (Grille des catégories + Résumé)
function renderGeneralView() {
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = '';

  menuData.forEach(category => {
    const selectedCount = getCategorySelectedCount(category.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-card ${selectedCount > 0 ? 'has-selected' : ''}`;
    btn.innerHTML = `
      <div class="category-card-top">
        <span class="category-card-title">${escapeHtml(category.name)}</span>
        ${selectedCount > 0 ? `<span class="category-badge-count">${selectedCount}</span>` : ''}
      </div>
      <div class="category-card-meta">
        ${category.items.length} option${category.items.length > 1 ? 's' : ''} disponible${category.items.length > 1 ? 's' : ''}
      </div>
    `;
    btn.addEventListener('click', () => openCategoryView(category.id));
    grid.appendChild(btn);
  });

  renderOrderSummary();
}

// Rendu du résumé de la commande et du total
function renderOrderSummary() {
  const entries = Object.values(currentOrder);
  const totalCount = getTotalOrderCount();

  document.getElementById('totalItemsCount').textContent = totalCount;
  document.getElementById('btnValidateCount').textContent = totalCount;

  const emptyState = document.getElementById('orderEmptyState');
  const listEl = document.getElementById('orderItemsList');
  const btnClear = document.getElementById('btnClearOrder');
  const btnValidate = document.getElementById('btnValidateOrder');

  if (entries.length === 0) {
    emptyState.classList.remove('hidden');
    listEl.classList.add('hidden');
    listEl.innerHTML = '';
    btnClear.disabled = true;
    btnValidate.disabled = true;
    return;
  }

  emptyState.classList.add('hidden');
  listEl.classList.remove('hidden');
  btnClear.disabled = false;
  btnValidate.disabled = false;

  listEl.innerHTML = '';
  entries.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'order-item-row';
    li.innerHTML = `
      <div class="order-item-info">
        <div class="order-item-name">${escapeHtml(entry.itemName)}</div>
        <div class="order-item-cat">${escapeHtml(entry.catName)}</div>
      </div>
      <div class="qty-controls">
        <button type="button" class="btn-qty-minus" aria-label="Retirer 1 ${escapeHtml(entry.itemName)}">&minus;</button>
        <span class="qty-value">${entry.qty}</span>
        <button type="button" class="btn-qty-plus" aria-label="Ajouter 1 ${escapeHtml(entry.itemName)}">+</button>
      </div>
    `;

    li.querySelector('.btn-qty-minus').addEventListener('click', () => {
      decrementItem(entry.catId, entry.itemName);
    });
    li.querySelector('.btn-qty-plus').addEventListener('click', () => {
      incrementItem(entry.catId, entry.itemName, false);
    });

    listEl.appendChild(li);
  });
}

// Rendu des articles d'une catégorie
// Un appui sur '+' ajoute l'article et redirige immédiatement vers la sélection générale
function renderCategoryItems(catId) {
  const category = menuData.find(c => c.id === catId);
  if (!category) return;

  const container = document.getElementById('categoryItemsList');
  container.innerHTML = '';

  category.items.forEach(itemName => {
    const qty = getItemQty(catId, itemName);
    const card = document.createElement('div');
    card.className = `item-card ${qty > 0 ? 'item-selected' : ''}`;

    card.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escapeHtml(itemName)}</div>
        ${qty > 0 ? `<span class="item-current-qty">Déjà pris : ${qty}</span>` : ''}
      </div>
      <div class="item-actions">
        ${qty > 0 ? `<button type="button" class="btn-item-minus" title="Retirer 1" aria-label="Retirer 1 ${escapeHtml(itemName)}">&minus;</button>` : ''}
        <button type="button" class="btn-item-plus" title="Ajouter 1 et revenir à la sélection générale" aria-label="Ajouter 1 ${escapeHtml(itemName)}">+</button>
      </div>
    `;

    const minusBtn = card.querySelector('.btn-item-minus');
    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        decrementItem(catId, itemName);
      });
    }

    const plusBtn = card.querySelector('.btn-item-plus');
    plusBtn.addEventListener('click', () => {
      // Redirection directe vers la sélection générale comme demandé
      incrementItem(catId, itemName, true);
    });

    container.appendChild(card);
  });
}

// Modale de validation de la commande
function openValidationModal() {
  const totalCount = getTotalOrderCount();
  if (totalCount === 0) return;

  document.getElementById('validatedTotalCount').textContent = totalCount;
  const container = document.getElementById('validatedGroupsContainer');
  container.innerHTML = '';

  // Regrouper par catégorie pour faciliter le service au bar
  menuData.forEach(category => {
    const catEntries = Object.values(currentOrder).filter(e => e.catId === category.id);
    if (catEntries.length === 0) return;

    const groupCard = document.createElement('div');
    groupCard.className = 'validated-group-card';

    const title = document.createElement('div');
    title.className = 'validated-group-title';
    title.textContent = category.name;
    groupCard.appendChild(title);

    catEntries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'validated-item-row';
      row.innerHTML = `
        <span class="validated-item-name">${escapeHtml(entry.itemName)}</span>
        <span class="validated-item-qty">&times; ${entry.qty}</span>
      `;
      row.addEventListener('click', () => {
        row.classList.toggle('served');
      });
      groupCard.appendChild(row);
    });

    container.appendChild(groupCard);
  });

  document.getElementById('modalValidation').classList.remove('hidden');
}

function closeValidationModal() {
  document.getElementById('modalValidation').classList.add('hidden');
}

function startNewOrder() {
  currentOrder = {};
  lastAddedKey = null;
  saveOrder();
  closeValidationModal();
  document.getElementById('toastBanner').classList.add('hidden');
  showGeneralView();
}

// Modale d'administration de la carte (ajout d'options si la carte se modifie)
function openManageMenuModal() {
  renderAdminMenuModal();
  document.getElementById('modalManageMenu').classList.remove('hidden');
}

function closeManageMenuModal() {
  document.getElementById('modalManageMenu').classList.add('hidden');
  renderGeneralView();
  if (activeCategoryId) {
    renderCategoryItems(activeCategoryId);
  }
}

function renderAdminMenuModal() {
  const selectCat = document.getElementById('selectAdminCategory');
  selectCat.innerHTML = '';
  menuData.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    selectCat.appendChild(opt);
  });

  const container = document.getElementById('adminMenuContainer');
  container.innerHTML = '';

  menuData.forEach(cat => {
    const box = document.createElement('div');
    box.className = 'admin-category-box';

    const header = document.createElement('div');
    header.className = 'admin-category-header';
    header.innerHTML = `
      <span>${escapeHtml(cat.name)} (${cat.items.length})</span>
      <button type="button" class="btn-danger-outline btn-del-cat" data-cat-id="${escapeHtml(cat.id)}">Supprimer catégorie</button>
    `;
    box.appendChild(header);

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'admin-items-tags';

    cat.items.forEach(itemName => {
      const tag = document.createElement('span');
      tag.className = 'admin-item-tag';
      tag.innerHTML = `
        <span>${escapeHtml(itemName)}</span>
        <button type="button" class="btn-delete-tag" title="Supprimer cet article" aria-label="Supprimer ${escapeHtml(itemName)}">&times;</button>
      `;
      tag.querySelector('.btn-delete-tag').addEventListener('click', () => {
        removeMenuItem(cat.id, itemName);
      });
      tagsDiv.appendChild(tag);
    });

    box.appendChild(tagsDiv);
    container.appendChild(box);
  });

  container.querySelectorAll('.btn-del-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-cat-id');
      removeCategory(catId);
    });
  });
}

function addMenuItem(catId, rawName) {
  const cleanName = rawName.trim().toUpperCase();
  if (!cleanName) return false;

  const category = menuData.find(c => c.id === catId);
  if (!category) return false;

  if (!category.items.includes(cleanName)) {
    category.items.push(cleanName);
    saveMenu();
    return true;
  }
  return false;
}

function removeMenuItem(catId, itemName) {
  const category = menuData.find(c => c.id === catId);
  if (!category) return;

  category.items = category.items.filter(i => i !== itemName);
  const key = makeOrderKey(catId, itemName);
  delete currentOrder[key];
  saveMenu();
  saveOrder();
  renderAdminMenuModal();
}

function addCategory(rawName) {
  const cleanName = rawName.trim();
  if (!cleanName) return;

  const slug = cleanName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;

  if (menuData.some(c => c.id === slug)) return;

  menuData.push({
    id: slug,
    name: cleanName,
    items: []
  });
  saveMenu();
  renderAdminMenuModal();
}

function removeCategory(catId) {
  if (menuData.length <= 1) {
    alert('Il doit rester au moins une catégorie sur la carte.');
    return;
  }
  menuData = menuData.filter(c => c.id !== catId);
  Object.keys(currentOrder).forEach(key => {
    if (currentOrder[key].catId === catId) {
      delete currentOrder[key];
    }
  });
  if (activeCategoryId === catId) {
    activeCategoryId = null;
  }
  saveMenu();
  saveOrder();
  renderAdminMenuModal();
}

// Liaison des événements de l'interface
function bindEvents() {
  document.getElementById('btnHomeHeader').addEventListener('click', showGeneralView);
  document.getElementById('btnBackToGeneral').addEventListener('click', showGeneralView);

  // Annulation rapide dans le bandeau toast (-1)
  document.getElementById('btnToastUndo').addEventListener('click', () => {
    if (!lastAddedKey || !currentOrder[lastAddedKey]) {
      document.getElementById('toastBanner').classList.add('hidden');
      return;
    }
    const { catId, itemName } = currentOrder[lastAddedKey];
    decrementItem(catId, itemName);
    document.getElementById('toastBanner').classList.add('hidden');
  });

  // Tout effacer
  document.getElementById('btnClearOrder').addEventListener('click', () => {
    if (getTotalOrderCount() === 0) return;
    currentOrder = {};
    lastAddedKey = null;
    saveOrder();
    document.getElementById('toastBanner').classList.add('hidden');
    renderGeneralView();
  });

  // Valider la commande
  document.getElementById('btnValidateOrder').addEventListener('click', openValidationModal);
  document.getElementById('btnModifyOrder').addEventListener('click', closeValidationModal);
  document.getElementById('btnNewOrder').addEventListener('click', startNewOrder);

  // Ajout rapide d'un article depuis une catégorie ouverte
  document.getElementById('formQuickAddItem').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeCategoryId) return;
    const input = document.getElementById('inputQuickItemName');
    const added = addMenuItem(activeCategoryId, input.value);
    if (added) {
      input.value = '';
      renderCategoryItems(activeCategoryId);
    }
  });

  // Gestion de la carte (Modale)
  document.getElementById('btnManageMenu').addEventListener('click', openManageMenuModal);
  document.getElementById('btnCloseManageModal').addEventListener('click', closeManageMenuModal);
  document.getElementById('btnDoneManageModal').addEventListener('click', closeManageMenuModal);

  document.getElementById('formAdminAddItem').addEventListener('submit', (e) => {
    e.preventDefault();
    const catId = document.getElementById('selectAdminCategory').value;
    const input = document.getElementById('inputAdminItemName');
    if (addMenuItem(catId, input.value)) {
      input.value = '';
      renderAdminMenuModal();
    }
  });

  document.getElementById('formAdminAddCategory').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('inputAdminCategoryName');
    addCategory(input.value);
    input.value = '';
  });

  document.getElementById('btnResetDefaultMenu').addEventListener('click', () => {
    menuData = JSON.parse(JSON.stringify(DEFAULT_MENU));
    saveMenu();
    renderAdminMenuModal();
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
