/**
 * HTB Storefront Logic & Cart Manager
 * Domain: htbwshop.jo3.org
 */

// Official Inventory Data
const PRODUCTS = [
  {
    id: 'robux-1k',
    title: '1,000 Robux Package',
    category: 'currency',
    price: 4.99,
    badge: 'HOT',
    badgeClass: 'badge-hot',
    icon: 'fa-solid fa-coins',
    desc: 'Instant clean Robux transfer via gamepass or VIP group funds.',
    perks: ['Instant automated payout', '100% Tax Covered', 'Safe & Clean Source'],
  },
  {
    id: 'robux-5k',
    title: '5,000 Robux Package',
    category: 'currency',
    price: 19.99,
    badge: 'POPULAR',
    badgeClass: 'badge-popular',
    icon: 'fa-solid fa-sack-dollar',
    desc: 'Most popular bulk pack with bonus in-server economy XP.',
    perks: ['Instant transfer', 'Bonus 250k HTB XP', 'Tax 100% Covered'],
  },
  {
    id: 'robux-10k',
    title: '10,000 Robux Whale Pack',
    category: 'currency',
    price: 37.99,
    badge: 'BEST VALUE',
    badgeClass: 'badge-vip',
    icon: 'fa-solid fa-gem',
    desc: 'Maximum value bulk Robux package for serious community collectors.',
    perks: ['Instant direct transfer', 'Free VIP Role in Discord', 'Priority Staff Ticket'],
  },
  {
    id: 'htb-starter-bundle',
    title: 'HTB Ultimate Starter Bundle',
    category: 'bundles',
    price: 14.99,
    badge: 'LIMITED',
    badgeClass: 'badge-hot',
    icon: 'fa-solid fa-box-open',
    desc: 'Complete jumpstart pack with exclusive weapons, cash, and gear.',
    perks: ['3x Weapon Crates', '500,000 In-Game Cash', 'Special Discord Chat Tag'],
  },
  {
    id: 'htb-vip-pass',
    title: 'Lifetime HTB VIP Rank',
    category: 'ranks',
    price: 9.99,
    badge: 'VIP PERK',
    badgeClass: 'badge-vip',
    icon: 'fa-solid fa-crown',
    desc: 'Permanent VIP status in the 17,000+ member server and game servers.',
    perks: ['Exclusive VIP Channels', '2x Daily Level XP multiplier', 'Exclusive Color Role'],
  },
  {
    id: 'custom-role-service',
    title: 'Custom Server Role & Icon',
    category: 'services',
    price: 7.49,
    badge: 'CUSTOM',
    badgeClass: 'badge-service',
    icon: 'fa-solid fa-palette',
    desc: 'Create your own custom colored role with custom icon hoisted in server.',
    perks: ['Custom Color & Name', 'Custom Role Emoji Icon', 'Permanent Lifetime Access'],
  },
  {
    id: 'level-boost-pass',
    title: 'Instant Level 100 Boost',
    category: 'services',
    price: 11.99,
    badge: 'BOOST',
    badgeClass: 'badge-service',
    icon: 'fa-solid fa-bolt',
    desc: 'Instantly unlock high-tier commands, market slots, and perks.',
    perks: ['100,000,000 HTB XP', 'Unlocks Max Market Slots', 'Instant Bot Auto-Grant'],
  },
  {
    id: 'htb-syndicate-bundle',
    title: 'Syndicate Boss In-Game Pack',
    category: 'bundles',
    price: 24.99,
    badge: 'EXCLUSIVE',
    badgeClass: 'badge-popular',
    icon: 'fa-solid fa-skull',
    desc: 'Exclusive armor set, rare title, and maxed-out starting inventory.',
    perks: ['Syndicate Custom Armor', '1,500,000 In-Game Cash', 'Exclusive In-Game Title'],
  },
];

// State
let cart = JSON.parse(localStorage.getItem('htb_cart') || '[]');
let activeCategory = 'all';

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const filterTabs = document.getElementById('filterTabs');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartToggleBtn = document.getElementById('cartToggleBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTotal = document.getElementById('cartTotal');
const cartCountBadge = document.getElementById('cartCountBadge');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const toastContainer = document.getElementById('toastContainer');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalContent = document.getElementById('modalContent');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const faqAccordion = document.getElementById('faqAccordion');

// Render Products
function renderProducts() {
  const filtered = activeCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory);

  productsGrid.innerHTML = filtered.map(product => `
    <div class="product-card">
      <span class="product-badge ${product.badgeClass}">${product.badge}</span>
      
      <div>
        <div class="product-icon-wrap">
          <i class="${product.icon}"></i>
        </div>
        <h3 class="product-title">${product.title}</h3>
        <p class="product-desc">${product.desc}</p>
        
        <ul class="product-perks">
          ${product.perks.map(perk => `<li><i class="fa-solid fa-check"></i> ${perk}</li>`).join('')}
        </ul>
      </div>

      <div class="product-footer">
        <div class="product-price-box">
          <span class="price-lbl">Price</span>
          <span class="price-amount">$${product.price.toFixed(2)}</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')">
          <i class="fa-solid fa-cart-plus"></i> Add
        </button>
      </div>
    </div>
  `).join('');
}

// Filter Tab Handler
filterTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;

  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeCategory = tab.dataset.category;
  renderProducts();
});

// Cart Functions
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  updateCartUI();
  showToast(`Added "${product.title}" to cart!`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
  showToast('Item removed from cart');
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  showToast('Cart cleared');
}

function saveCart() {
  localStorage.setItem('htb_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  cartCountBadge.textContent = totalCount;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-cart-arrow-down"></i>
        <p>Your cart is empty.</p>
        <p style="font-size: 0.82rem; margin-top: 6px;">Browse our marketplace to add items!</p>
      </div>
    `;
    cartSubtotal.textContent = '$0.00';
    cartTotal.textContent = '$0.00';
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <h4>${item.title}</h4>
        <span class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity || 1}</span>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove item">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');

  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartTotal.textContent = `$${subtotal.toFixed(2)}`;
}

// Drawer Controls
function openCart() {
  cartDrawer.classList.add('open');
  cartBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

cartToggleBtn.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
clearCartBtn.addEventListener('click', clearCart);

// Checkout & Discord Order Generation
checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }

  const orderId = 'HTB-' + Math.floor(100000 + Math.random() * 900000);
  const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0).toFixed(2);
  const itemList = cart.map(i => `• ${i.title} (${i.quantity || 1}x)`).join('\n');

  modalContent.innerHTML = `
    <div style="text-align: center;">
      <div style="width: 60px; height: 60px; background: rgba(88,101,242,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; color: #5865f2; font-size: 1.8rem;">
        <i class="fa-brands fa-discord"></i>
      </div>
      <h2 style="font-family: var(--font-heading); font-size: 1.6rem; margin-bottom: 8px;">Order Ready!</h2>
      <p style="color: #929db2; font-size: 0.95rem; margin-bottom: 20px;">Order ID: <strong style="color: #00f0ff; font-family: var(--font-mono);">${orderId}</strong></p>
      
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; text-align: left; margin-bottom: 22px;">
        <div style="font-size: 0.82rem; color: #8892a7; text-transform: uppercase; margin-bottom: 6px;">Order Summary ($${total})</div>
        <pre style="font-family: var(--font-mono); font-size: 0.85rem; color: #f1f3f9; white-space: pre-wrap; margin: 0;">${itemList}</pre>
      </div>

      <p style="font-size: 0.9rem; color: #a9b3c7; margin-bottom: 24px; line-height: 1.5;">
        Join our 17k+ Discord server and open a ticket or paste your Order ID in <strong>#store-orders</strong> for instant delivery!
      </p>

      <a href="https://discord.gg" target="_blank" rel="noopener" class="btn btn-primary btn-block" style="padding: 14px;">
        <i class="fa-brands fa-discord"></i> Open Ticket In Discord
      </a>
    </div>
  `;

  closeCart();
  modalBackdrop.classList.add('open');
});

modalCloseBtn.addEventListener('click', () => {
  modalBackdrop.classList.remove('open');
});

modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) {
    modalBackdrop.classList.remove('open');
  }
});

// Toast System
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// FAQ Accordion
faqAccordion.addEventListener('click', (e) => {
  const questionBtn = e.target.closest('.faq-question');
  if (!questionBtn) return;

  const item = questionBtn.closest('.faq-item');
  const wasActive = item.classList.contains('active');

  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('active');
    i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
  });

  if (!wasActive) {
    item.classList.add('active');
    questionBtn.setAttribute('aria-expanded', 'true');
  }
});

// Initial Render
renderProducts();
updateCartUI();
