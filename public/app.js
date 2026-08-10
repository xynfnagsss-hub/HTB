/**
 * HTB (HIT THE BLOCK) OFFICIAL MARKETPLACE
 * Real In-Server Roles, Access Passes & Command Tiers
 */

const MARKET_ITEMS = [
  // 1. Entry & Custom Roles
  {
    id: 'htb-noted',
    title: 'HTB | Noted Member',
    category: 'roles',
    tier: 'MEMBER',
    price: 2.00,
    badge: 'ENTRY',
    icon: 'fa-solid fa-tag',
    desc: 'Official recognized community status with special chat privileges and hoisted role.',
    perks: ['Hoisted Noted Member Role', 'Custom Chat Badge', 'Access to exclusive member channels'],
  },
  {
    id: 'htb-custom-role',
    title: 'CUSTOM ROLE',
    category: 'roles',
    tier: 'EXCLUSIVE',
    price: 3.00,
    badge: 'POPULAR',
    icon: 'fa-solid fa-paintbrush',
    desc: 'Create your own fully customized colored role with custom name and icon.',
    perks: ['Custom Hex Color', 'Custom Role Name & Emoji', 'Permanent Lifetime Access'],
  },

  // 2. Access Passes
  {
    id: 'htb-half-access',
    title: 'HTB | Half Access',
    category: 'access',
    tier: 'ACCESS',
    price: 5.00,
    badge: 'PASS',
    icon: 'fa-solid fa-unlock-keyhole',
    desc: 'Unlocks half server permissions, media channels, and priority bot usage.',
    perks: ['Half Server Permissions', 'Voice Channel Priority', 'Bypass Slowmode'],
  },
  {
    id: 'htb-hitta-access',
    title: 'HTB | Hitta Access',
    category: 'access',
    tier: 'ACCESS',
    price: 7.00,
    badge: 'HITTA',
    icon: 'fa-solid fa-key',
    desc: 'Hitta tier clearance with access to private lobbies and underground channels.',
    perks: ['Hitta Channel Access', 'Private VC Creation', 'Custom Chat Glow'],
  },
  {
    id: 'htb-onetap-access',
    title: 'HTB | ONE-TAP ACCESS',
    category: 'access',
    tier: 'TOP ACCESS',
    price: 9.00,
    badge: 'BEST VALUE',
    icon: 'fa-solid fa-bolt',
    desc: 'Full one-tap access across private rooms, giveaways, and drops.',
    perks: ['One-Tap Full Access', 'VIP Role Pass', 'Double Entry in HTB Giveaways'],
  },

  // 3. Staff & Moderation
  {
    id: 'htb-chat-vc-mod',
    title: 'HTB | CHAT/VC MOD',
    category: 'staff',
    tier: 'STAFF (CANT SELL)',
    price: 22.00,
    badge: 'STAFF',
    icon: 'fa-solid fa-shield-halved',
    desc: 'Official Chat & Voice Channel moderation privileges in the 17k server.',
    perks: ['Chat & VC Timeout perms', 'Mod-Only Channels', 'Official Staff Badge'],
  },
  {
    id: 'htb-ticket-support',
    title: 'HTB | Ticket Support',
    category: 'staff',
    tier: 'STAFF',
    price: 25.00,
    badge: 'SUPPORT',
    icon: 'fa-solid fa-ticket',
    desc: 'Join the support team to claim, manage, and assist member tickets.',
    perks: ['Ticket Panel Management', 'Claim Member Tickets', 'Support Role Hoist'],
  },
  {
    id: 'htb-administrator',
    title: 'HTB | Administrator',
    category: 'staff',
    tier: 'ADMIN (CANT SELL)',
    price: 32.00,
    badge: 'ADMIN',
    icon: 'fa-solid fa-gears',
    desc: 'High-tier administrator clearance with broad server management tools.',
    perks: ['Administrator Channel Access', 'Full Audit Log Visibility', 'Staff Meeting Access'],
  },
  {
    id: 'htb-lead-moderator',
    title: 'HTB | Lead Moderator',
    category: 'staff',
    tier: 'LEAD (CANT SELL)',
    price: 38.00,
    badge: 'LEAD',
    icon: 'fa-solid fa-clipboard-check',
    desc: 'Direct and oversee junior moderators with elevated moderation tools.',
    perks: ['Lead Mod Authority', 'Override Mod Actions', 'Direct High-Command Line'],
  },
  {
    id: 'htb-ranking-staff',
    title: 'HTB | Ranking Staff',
    category: 'staff',
    tier: 'RANKING',
    price: 44.00,
    badge: 'RANKING',
    icon: 'fa-solid fa-chart-simple',
    desc: 'Executive ranking staff permissions across server management and operations.',
    perks: ['Staff Performance Reviews', 'Promotions Voting Access', 'Top Tier Staff Tag'],
  },

  // 4. High Command
  {
    id: 'htb-overseer',
    title: 'HTB | OVERSEER',
    category: 'command',
    tier: 'OVERSEER',
    price: 49.00,
    badge: 'OVERSEER',
    icon: 'fa-solid fa-eye',
    desc: 'Direct server oversight authority with top-level administrative access.',
    perks: ['Overseer Authority', 'All Staff Channel Visibility', 'Permanent High Rank'],
  },
  {
    id: 'htb-sergeant',
    title: 'HTB | Sergeant',
    category: 'command',
    tier: 'HIGH COMMAND',
    price: 75.00,
    badge: 'HIGH COMMAND',
    icon: 'fa-solid fa-shield',
    desc: 'Elite disciplinary and tactical leadership role over all server divisions.',
    perks: ['Command Level Privileges', 'Host Server Operations', 'Priority Support'],
  },
  {
    id: 'htb-command-officer',
    title: 'HTB | Command Officer',
    category: 'command',
    tier: 'HIGH COMMAND',
    price: 80.00,
    badge: 'OFFICER',
    icon: 'fa-solid fa-medal',
    desc: 'High-ranking command officer authority over server security and moderation.',
    perks: ['Command Officer Role', 'Direct Admin Communication', 'Custom Profile Badge'],
  },

  // 5. Supreme Leadership (In Command)
  {
    id: 'htb-third-in-command',
    title: 'HTB | Third in Command',
    category: 'supreme',
    tier: '3RD IN COMMAND',
    price: 123.00,
    badge: 'SUPREME',
    icon: 'fa-solid fa-award',
    desc: 'Third-highest executive leadership rank in the entire 17,000+ member server.',
    perks: ['3rd In Command Role & Hoist', 'Ultimate Decision Making', 'Server-Wide Authority'],
  },
  {
    id: 'htb-second-in-command',
    title: 'HTB | Second in Command',
    category: 'supreme',
    tier: '2ND IN COMMAND',
    price: 150.00,
    badge: 'SUPREME',
    icon: 'fa-solid fa-crown',
    desc: 'Direct second-in-command to server ownership with full executive authority.',
    perks: ['2nd In Command Authority', 'Full High-Command Veto', 'Permanent Crown Tag'],
  },
  {
    id: 'htb-first-in-command',
    title: 'HTB | First in Command',
    category: 'supreme',
    tier: '1ST IN COMMAND',
    price: 175.00,
    badge: 'SUPREME #1',
    icon: 'fa-solid fa-trophy',
    desc: 'The pinnacle of leadership in Hit The Block. Highest obtainable command rank.',
    perks: ['1st In Command Apex Authority', 'Direct Ownership Partner', 'Maximum Server Power'],
  },
];

// State
let cart = JSON.parse(localStorage.getItem('htb_market_cart') || '[]');
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

function renderProducts() {
  const filtered = activeCategory === 'all'
    ? MARKET_ITEMS
    : MARKET_ITEMS.filter(p => p.category === activeCategory);

  productsGrid.innerHTML = filtered.map(item => `
    <div class="product-card">
      <div class="card-glow"></div>
      <div class="card-header-top">
        <span class="tier-tag">${item.tier}</span>
        <span class="product-badge">${item.badge}</span>
      </div>
      
      <div class="card-content">
        <div class="product-icon-wrap">
          <i class="${item.icon}"></i>
        </div>
        <h3 class="product-title">${item.title}</h3>
        <p class="product-desc">${item.desc}</p>
        
        <ul class="product-perks">
          ${item.perks.map(perk => `<li><i class="fa-solid fa-circle-check"></i> ${perk}</li>`).join('')}
        </ul>
      </div>

      <div class="product-footer">
        <div class="product-price-box">
          <span class="price-lbl">Official Price</span>
          <span class="price-amount">$${item.price.toFixed(2)}</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="addToCart('${item.id}')">
          <i class="fa-solid fa-cart-plus"></i> Select
        </button>
      </div>
    </div>
  `).join('');
}

// Filter Tabs
if (filterTabs) {
  filterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeCategory = tab.dataset.category;
    renderProducts();
  });
}

// Cart System
function addToCart(productId) {
  const item = MARKET_ITEMS.find(p => p.id === productId);
  if (!item) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  saveCart();
  updateCartUI();
  showToast(`Added "${item.title}" to order list`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
  showToast('Item removed');
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  showToast('Order list cleared');
}

function saveCart() {
  localStorage.setItem('htb_market_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if (cartCountBadge) cartCountBadge.textContent = totalCount;

  if (cart.length === 0) {
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty">
          <i class="fa-solid fa-shield-halved"></i>
          <p style="font-weight: 700; color: #fff;">No roles selected.</p>
          <p style="font-size: 0.82rem; margin-top: 6px; color: #8892a7;">Select any HTB role or pass from the market above.</p>
        </div>
      `;
    }
    if (cartSubtotal) cartSubtotal.textContent = '$0.00';
    if (cartTotal) cartTotal.textContent = '$0.00';
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  if (cartItemsContainer) {
    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.title}</h4>
          <span class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity || 1}</span>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');
  }

  if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  if (cartTotal) cartTotal.textContent = `$${subtotal.toFixed(2)}`;
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

if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);
if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);

// Checkout & Discord Order Ticket Flow
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
      showToast('Your order list is empty!');
      return;
    }

    const orderId = 'HTB-' + Math.floor(100000 + Math.random() * 900000);
    const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0).toFixed(2);
    const itemList = cart.map(i => `• ${i.title} (${i.quantity || 1}x) — $${(i.price * (i.quantity || 1)).toFixed(2)}`).join('\n');

    modalContent.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 68px; height: 68px; background: rgba(245,175,25,0.12); border: 1px solid var(--gold-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; color: var(--gold-primary); font-size: 2rem; box-shadow: var(--shadow-gold);">
          <i class="fa-solid fa-ticket"></i>
        </div>
        <h2 style="font-family: var(--font-heading); font-size: 1.8rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px; color: #fff;">TICKET ORDER READY</h2>
        <p style="color: #8892a7; font-size: 0.95rem; margin-bottom: 20px;">Order Code: <strong style="color: var(--gold-light); font-family: var(--font-mono); font-size: 1.15rem;">${orderId}</strong></p>
        
        <div style="background: #080a0e; border: 1px solid var(--border-gold); border-radius: var(--radius-md); padding: 18px; text-align: left; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--gold-light); font-weight: 800; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
            <span>Selected Roles / Access</span>
            <span>Total: $${total}</span>
          </div>
          <pre style="font-family: var(--font-mono); font-size: 0.88rem; color: #f1f3f9; white-space: pre-wrap; margin: 0; line-height: 1.6;">${itemList}</pre>
        </div>

        <div style="background: rgba(255, 75, 75, 0.08); border: 1px solid rgba(255, 75, 75, 0.25); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 22px; font-size: 0.84rem; color: #ff8585; text-align: left;">
          <i class="fa-solid fa-triangle-exclamation"></i> <strong>POLICY:</strong> NO REFUNDS. Open a ticket in Discord to purchase.
        </div>

        <a href="https://discord.gg/htbw" target="_blank" rel="noopener" class="btn btn-primary btn-block" style="padding: 15px; font-size: 1.05rem;">
          <i class="fa-brands fa-discord"></i> Open Ticket In Discord (17k+)
        </a>
      </div>
    `;

    closeCart();
    modalBackdrop.classList.add('open');
  });
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    modalBackdrop.classList.remove('open');
  });
}

if (modalBackdrop) {
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      modalBackdrop.classList.remove('open');
    }
  });
}

// Toast
function showToast(message) {
  if (!toastContainer) return;
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
if (faqAccordion) {
  faqAccordion.addEventListener('click', (e) => {
    const questionBtn = e.target.closest('.faq-question');
    if (!questionBtn) return;

    const item = questionBtn.closest('.faq-item');
    const wasActive = item.classList.contains('active');

    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('active');
      i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
    });

    if (!wasActive) {
      item.classList.add('active');
      questionBtn.setAttribute('aria-expanded', 'true');
    }
  });
}

// Init
renderProducts();
updateCartUI();
