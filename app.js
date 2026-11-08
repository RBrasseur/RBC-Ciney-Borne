/**
 * APPLICATION DE PRISE DE COMMANDES — RBC CINEY (VERSION BLINDÉE ANDROID & APPLE)
 * - Auto-réparation si un ancien index.html était resté en cache
 * - Générateur de QR Code 100% intégré hors-ligne (zéro librairie externe)
 * - Restauration automatique de la carte si la mémoire locale est vide
 */
(function() {
  if (window.__RBC_CINEY_LOADED__) return;
  window.__RBC_CINEY_LOADED__ = true;

  const STORAGE_KEY_MENU = 'rbc_ciney_menu_v2';
  const STORAGE_KEY_ORDER = 'rbc_ciney_current_order_v2';

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

  // =========================================================================
  // GÉNÉRATEUR QR CODE AUTONOME (ISO/IEC 18004 - ZÉRO DÉPENDANCE EXTERNE)
  // =========================================================================
  const SimpleQR = (function() {
    const VERSIONS = [
      null,
      [17,  26, 7, 1, 19, 0, 0],
      [32,  44, 10, 1, 34, 0, 0],
      [53,  70, 15, 1, 55, 0, 0],
      [78,  100, 20, 1, 80, 0, 0],
      [106, 134, 26, 1, 108, 0, 0],
      [134, 172, 18, 2, 68, 0, 0],
      [154, 196, 20, 2, 78, 0, 0],
      [192, 242, 24, 2, 97, 0, 0],
      [230, 292, 30, 2, 116, 0, 0],
      [271, 346, 18, 2, 68, 2, 69]
    ];
    const ALIGNMENT_POS = [
      null, [], [6, 18], [6, 22], [6, 26], [6, 30],
      [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
    ];
    const EXP = new Uint8Array(512);
    const LOG = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

    function gfMul(a, b) {
      return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
    }
    function rsGenPoly(degree) {
      let poly = [1];
      for (let i = 0; i < degree; i++) {
        const nxt = new Array(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
          nxt[j] ^= poly[j];
          nxt[j + 1] ^= gfMul(poly[j], EXP[i]);
        }
        poly = nxt;
      }
      return poly;
    }
    function rsEncode(data, ecLen) {
      const gen = rsGenPoly(ecLen);
      const res = new Uint8Array(ecLen);
      for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ res[0];
        for (let j = 0; j < ecLen - 1; j++) res[j] = res[j + 1];
        res[ecLen - 1] = 0;
        if (factor !== 0) {
          for (let j = 0; j < ecLen; j++) res[j] ^= gfMul(gen[j + 1], factor);
        }
      }
      return res;
    }
    function encodeUTF8(str) {
      const utf8 = [];
      for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) utf8.push(c);
        else if (c < 0x800) utf8.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        else utf8.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
      return utf8;
    }
    function createMatrix(text) {
      const bytes = encodeUTF8(text);
      let ver = 1;
      while (ver <= 10 && bytes.length > VERSIONS[ver][0]) ver++;
      if (ver > 10) ver = 10;
      const [, , ecLen, g1Blocks, g1Data, g2Blocks, g2Data] = VERSIONS[ver];
      const totalDataCW = g1Blocks * g1Data + g2Blocks * g2Data;
      const bits = [];
      function pushBits(val, len) {
        for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
      }
      pushBits(0b0100, 4);
      pushBits(bytes.length, ver < 10 ? 8 : 16);
      for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
      const maxBits = totalDataCW * 8;
      pushBits(0, Math.min(4, maxBits - bits.length));
      while (bits.length % 8 !== 0) bits.push(0);
      const dataCW = [];
      for (let i = 0; i < bits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
        dataCW.push(b);
      }
      let padToggle = true;
      while (dataCW.length < totalDataCW) {
        dataCW.push(padToggle ? 0xEC : 0x11);
        padToggle = !padToggle;
      }
      const dataBlocks = [], ecBlocks = [];
      let offset = 0;
      for (let i = 0; i < g1Blocks; i++) {
        const blk = dataCW.slice(offset, offset + g1Data);
        offset += g1Data;
        dataBlocks.push(blk);
        ecBlocks.push(rsEncode(blk, ecLen));
      }
      for (let i = 0; i < g2Blocks; i++) {
        const blk = dataCW.slice(offset, offset + g2Data);
        offset += g2Data;
        dataBlocks.push(blk);
        ecBlocks.push(rsEncode(blk, ecLen));
      }
      const finalCW = [];
      const maxDataLen = Math.max(g1Data, g2Data);
      for (let i = 0; i < maxDataLen; i++) {
        for (let b = 0; b < dataBlocks.length; b++) {
          if (i < dataBlocks[b].length) finalCW.push(dataBlocks[b][i]);
        }
      }
      for (let i = 0; i < ecLen; i++) {
        for (let b = 0; b < ecBlocks.length; b++) finalCW.push(ecBlocks[b][i]);
      }
      const size = ver * 4 + 17;
      const modules = Array.from({ length: size }, () => new Int8Array(size));
      const isFunc = Array.from({ length: size }, () => new Uint8Array(size));
      function setFunc(x, y, val) {
        if (x >= 0 && x < size && y >= 0 && y < size) {
          modules[y][x] = val ? 1 : 0;
          isFunc[y][x] = 1;
        }
      }
      function drawFinder(cx, cy) {
        for (let dy = -1; dy <= 7; dy++) {
          for (let dx = -1; dx <= 7; dx++) {
            const xx = cx + dx, yy = cy + dy;
            if (xx < 0 || xx >= size || yy < 0 || yy >= size) continue;
            const inOuter = (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) || (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6));
            const inInner = (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
            setFunc(xx, yy, inOuter || inInner);
          }
        }
      }
      drawFinder(0, 0);
      drawFinder(size - 7, 0);
      drawFinder(0, size - 7);
      for (let i = 8; i < size - 8; i++) {
        setFunc(i, 6, i % 2 === 0);
        setFunc(6, i, i % 2 === 0);
      }
      const pos = ALIGNMENT_POS[ver];
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
          const cx = pos[i], cy = pos[j];
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) setFunc(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      }
      setFunc(8, size - 8, true);
      for (let i = 0; i < 9; i++) {
        if (!isFunc[8][i]) setFunc(i, 8, false);
        if (!isFunc[i][8]) setFunc(8, i, false);
      }
      for (let i = 0; i < 8; i++) {
        if (!isFunc[8][size - 1 - i]) setFunc(size - 1 - i, 8, false);
        if (!isFunc[size - 1 - i][8]) setFunc(8, size - 1 - i, false);
      }
      let bitIdx = 0;
      const totalBits = finalCW.length * 8;
      let upward = true;
      for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
          const y = upward ? size - 1 - vert : vert;
          for (let j = 0; j < 2; j++) {
            const x = right - j;
            if (!isFunc[y][x]) {
              let bit = 0;
              if (bitIdx < totalBits) {
                bit = (finalCW[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
                bitIdx++;
              }
              if ((y + x) % 2 === 0) bit ^= 1;
              modules[y][x] = bit;
            }
          }
        }
        upward = !upward;
      }
      const formatBits = 0x77C4;
      for (let i = 0; i <= 5; i++) setFunc(8, i, ((formatBits >> i) & 1) === 1);
      setFunc(8, 7, ((formatBits >> 6) & 1) === 1);
      setFunc(8, 8, ((formatBits >> 7) & 1) === 1);
      setFunc(7, 8, ((formatBits >> 8) & 1) === 1);
      for (let i = 9; i < 15; i++) setFunc(14 - i, 8, ((formatBits >> i) & 1) === 1);
      for (let i = 0; i < 8; i++) setFunc(size - 1 - i, 8, ((formatBits >> i) & 1) === 1);
      for (let i = 8; i < 15; i++) setFunc(8, size - 15 + i, ((formatBits >> i) & 1) === 1);
      return modules;
    }
    function renderSVG(text, pixelSize = 220) {
      const matrix = createMatrix(text);
      const n = matrix.length;
      const quiet = 2;
      const total = n + quiet * 2;
      let paths = '';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c]) paths += `M${c + quiet},${r + quiet}h1v1h-1z`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#FFFFFF"/><path d="${paths}" fill="#002266"/></svg>`;
    }
    return { renderSVG };
  })();

  let menuData = [];
  let currentOrder = {};
  let activeCategoryId = null;
  let lastAddedKey = null;
  let toastTimeout = null;

  function cloneDefaultMenu() {
    return JSON.parse(JSON.stringify(DEFAULT_MENU));
  }

  function loadState() {
    try {
      const savedMenu = localStorage.getItem(STORAGE_KEY_MENU) || localStorage.getItem('rbc_ciney_menu_v1');
      if (savedMenu) {
        const parsed = JSON.parse(savedMenu);
        if (Array.isArray(parsed) && parsed.length > 0) {
          menuData = parsed;
        } else {
          menuData = cloneDefaultMenu();
        }
      } else {
        menuData = cloneDefaultMenu();
      }
    } catch (e) {
      menuData = cloneDefaultMenu();
    }

    try {
      const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER) || localStorage.getItem('rbc_ciney_current_order_v1');
      currentOrder = savedOrder ? JSON.parse(savedOrder) : {};
      if (!currentOrder || typeof currentOrder !== 'object') currentOrder = {};
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

  function ensureShareUIExists() {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('btnShareApp')) {
      headerActions.style.display = 'flex';
      headerActions.style.gap = '8px';
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.id = 'btnShareApp';
      shareBtn.className = 'btn-header-outline';
      shareBtn.textContent = 'QR Code';
      headerActions.insertBefore(shareBtn, headerActions.firstChild);
    }

    if (!document.getElementById('modalShare')) {
      const modalDiv = document.createElement('div');
      modalDiv.id = 'modalShare';
      modalDiv.className = 'modal-overlay hidden';
      modalDiv.setAttribute('role', 'dialog');
      modalDiv.setAttribute('aria-modal', 'true');
      modalDiv.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <div>
              <span class="modal-kicker">PARTAGER L'APPLICATION</span>
              <h2 id="modalShareTitle" class="modal-title">QR Code RBC Ciney</h2>
            </div>
            <button type="button" id="btnCloseShare" class="btn-close-modal" aria-label="Fermer">&times;</button>
          </div>
          <div class="modal-body" style="text-align: center; display: flex; flex-direction: column; align-items: center;">
            <p class="modal-instruction">
              Faites scanner ce QR code avec l'appareil photo d'un autre téléphone pour ouvrir l'application :
            </p>
            <div id="qrCodeContainer" class="qr-box-wrapper"></div>
            <div id="shareUrlText" class="qr-url-box"></div>
            <div class="share-buttons-row">
              <button type="button" id="btnCopyShareUrl" class="btn-secondary">Copier le lien</button>
              <button type="button" id="btnNativeShare" class="btn-validate">Envoyer le lien</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalDiv);
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

  function incrementItem(catId, itemName, redirectToGeneral = false) {
    const category = menuData.find(c => c.id === catId);
    const catName = category ? category.name : 'Autre';
    const key = makeOrderKey(catId, itemName);

    if (!currentOrder[key]) {
      currentOrder[key] = { catId, catName, itemName, qty: 0 };
    }
    currentOrder[key].qty += 1;
    lastAddedKey = key;
    saveOrder();

    showToast(`+1 ${itemName} ajouté`, key);

    if (redirectToGeneral) {
      showGeneralView();
    } else {
      renderGeneralView();
      if (activeCategoryId) renderCategoryItems(activeCategoryId);
    }
  }

  function decrementItem(catId, itemName) {
    const key = makeOrderKey(catId, itemName);
    if (!currentOrder[key]) return;

    currentOrder[key].qty -= 1;
    if (currentOrder[key].qty <= 0) {
      delete currentOrder[key];
    }
    saveOrder();

    renderGeneralView();
    if (activeCategoryId) renderCategoryItems(activeCategoryId);
  }

  function showToast(message) {
    const banner = document.getElementById('toastBanner');
    const textEl = document.getElementById('toastText');
    if (!banner || !textEl) return;
    textEl.textContent = message;
    banner.classList.remove('hidden');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, 4000);
  }

  function showGeneralView() {
    activeCategoryId = null;
    const viewCat = document.getElementById('viewCategory');
    const viewGen = document.getElementById('viewGeneral');
    if (viewCat) viewCat.classList.add('hidden');
    if (viewGen) viewGen.classList.remove('hidden');
    renderGeneralView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openCategoryView(catId) {
    const category = menuData.find(c => c.id === catId);
    if (!category) return;

    activeCategoryId = catId;
    const titleEl = document.getElementById('currentCategoryTitle');
    if (titleEl) titleEl.textContent = category.name;
    document.getElementById('viewGeneral').classList.add('hidden');
    document.getElementById('viewCategory').classList.remove('hidden');
    renderCategoryItems(catId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderGeneralView() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!Array.isArray(menuData) || menuData.length === 0) {
      menuData = cloneDefaultMenu();
      saveMenu();
    }

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

  function renderOrderSummary() {
    const entries = Object.values(currentOrder);
    const totalCount = getTotalOrderCount();

    const totalEl = document.getElementById('totalItemsCount');
    const validCountEl = document.getElementById('btnValidateCount');
    if (totalEl) totalEl.textContent = totalCount;
    if (validCountEl) validCountEl.textContent = totalCount;

    const emptyState = document.getElementById('orderEmptyState');
    const listEl = document.getElementById('orderItemsList');
    const btnClear = document.getElementById('btnClearOrder');
    const btnValidate = document.getElementById('btnValidateOrder');
    if (!emptyState || !listEl || !btnClear || !btnValidate) return;

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

  function renderCategoryItems(catId) {
    const category = menuData.find(c => c.id === catId);
    if (!category) return;

    const container = document.getElementById('categoryItemsList');
    if (!container) return;
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
        minusBtn.addEventListener('click', () => decrementItem(catId, itemName));
      }

      const plusBtn = card.querySelector('.btn-item-plus');
      plusBtn.addEventListener('click', () => incrementItem(catId, itemName, true));

      container.appendChild(card);
    });
  }

  function openValidationModal() {
    const totalCount = getTotalOrderCount();
    if (totalCount === 0) return;

    document.getElementById('validatedTotalCount').textContent = totalCount;
    const container = document.getElementById('validatedGroupsContainer');
    container.innerHTML = '';

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
        row.addEventListener('click', () => row.classList.toggle('served'));
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

  function openManageMenuModal() {
    renderAdminMenuModal();
    document.getElementById('modalManageMenu').classList.remove('hidden');
  }

  function closeManageMenuModal() {
    document.getElementById('modalManageMenu').classList.add('hidden');
    renderGeneralView();
    if (activeCategoryId) renderCategoryItems(activeCategoryId);
  }

  function renderAdminMenuModal() {
    const selectCat = document.getElementById('selectAdminCategory');
    if (!selectCat) return;
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
        removeCategory(btn.getAttribute('data-cat-id'));
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
    delete currentOrder[makeOrderKey(catId, itemName)];
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
    menuData.push({ id: slug, name: cleanName, items: [] });
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
      if (currentOrder[key].catId === catId) delete currentOrder[key];
    });
    if (activeCategoryId === catId) activeCategoryId = null;
    saveMenu();
    saveOrder();
    renderAdminMenuModal();
  }

  function getCleanShareUrl() {
    let url = window.location.href.split('?')[0].split('#')[0];
    if (url.endsWith('index.html')) {
      url = url.slice(0, -'index.html'.length);
    }
    return url;
  }

  function openShareModal() {
    ensureShareUIExists();
    const modal = document.getElementById('modalShare');
    const qrContainer = document.getElementById('qrCodeContainer');
    const urlText = document.getElementById('shareUrlText');
    const shareUrl = getCleanShareUrl();

    if (urlText) urlText.textContent = shareUrl;
    if (qrContainer) {
      try {
        qrContainer.innerHTML = SimpleQR.renderSVG(shareUrl, 220);
      } catch (err) {
        qrContainer.innerHTML = `<p style="color:#DC2626;font-weight:700;">Lien : ${escapeHtml(shareUrl)}</p>`;
      }
    }
    if (modal) modal.classList.remove('hidden');
  }

  function closeShareModal() {
    const modal = document.getElementById('modalShare');
    if (modal) modal.classList.add('hidden');
  }

  function on(id, eventName, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventName, handler);
  }

  function bindEvents() {
    ensureShareUIExists();

    on('btnShareApp', 'click', openShareModal);
    on('btnCloseShare', 'click', closeShareModal);

    on('btnCopyShareUrl', 'click', () => {
      const shareUrl = getCleanShareUrl();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          const btn = document.getElementById('btnCopyShareUrl');
          if (btn) {
            const orig = btn.textContent;
            btn.textContent = 'Lien copié !';
            setTimeout(() => { btn.textContent = orig; }, 2000);
          }
        });
      }
    });

    on('btnNativeShare', 'click', () => {
      const shareUrl = getCleanShareUrl();
      if (navigator.share) {
        navigator.share({
          title: 'RBC Ciney — Commandes',
          text: 'Application de prise de commandes du RBC Ciney',
          url: shareUrl
        }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        alert('Lien copié : ' + shareUrl);
      }
    });

    on('btnHomeHeader', 'click', showGeneralView);
    on('btnBackToGeneral', 'click', showGeneralView);

    on('btnToastUndo', 'click', () => {
      if (!lastAddedKey || !currentOrder[lastAddedKey]) {
        document.getElementById('toastBanner').classList.add('hidden');
        return;
      }
      const { catId, itemName } = currentOrder[lastAddedKey];
      decrementItem(catId, itemName);
      document.getElementById('toastBanner').classList.add('hidden');
    });

    on('btnClearOrder', 'click', () => {
      if (getTotalOrderCount() === 0) return;
      currentOrder = {};
      lastAddedKey = null;
      saveOrder();
      document.getElementById('toastBanner').classList.add('hidden');
      renderGeneralView();
    });

    on('btnValidateOrder', 'click', openValidationModal);
    on('btnModifyOrder', 'click', closeValidationModal);
    on('btnNewOrder', 'click', startNewOrder);

    on('formQuickAddItem', 'submit', (e) => {
      e.preventDefault();
      if (!activeCategoryId) return;
      const input = document.getElementById('inputQuickItemName');
      if (input && addMenuItem(activeCategoryId, input.value)) {
        input.value = '';
        renderCategoryItems(activeCategoryId);
      }
    });

    on('btnManageMenu', 'click', openManageMenuModal);
    on('btnCloseManageModal', 'click', closeManageMenuModal);
    on('btnDoneManageModal', 'click', closeManageMenuModal);

    on('formAdminAddItem', 'submit', (e) => {
      e.preventDefault();
      const catId = document.getElementById('selectAdminCategory').value;
      const input = document.getElementById('inputAdminItemName');
      if (input && addMenuItem(catId, input.value)) {
        input.value = '';
        renderAdminMenuModal();
      }
    });

    on('formAdminAddCategory', 'submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('inputAdminCategoryName');
      if (input) {
        addCategory(input.value);
        input.value = '';
      }
    });

    on('btnResetDefaultMenu', 'click', () => {
      menuData = cloneDefaultMenu();
      saveMenu();
      renderAdminMenuModal();
      renderGeneralView();
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

  function initApp() {
    loadState();
    renderGeneralView();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
