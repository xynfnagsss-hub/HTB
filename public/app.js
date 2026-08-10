/**
 * HTB (HIT THE BLOCK) OFFICIAL MARKETPLACE
 * Real In-Server Roles, Access Passes & Command Tiers (Lifetime & Monthly)
 * Discord & Google OAuth Authentication System
 */

const BOT_CLIENT_ID = '1535426505599881297';

const MARKET_ITEMS = [
  // 1. Entry & Custom Roles
  {
    id: 'htb-noted',
    title: 'HTB | Noted Member',
    category: 'roles',
    tier: 'MEMBER',
    lifetimePrice: 2.00,
    monthlyPrice: 0.99,
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
    lifetimePrice: 3.00,
    monthlyPrice: 1.49,
    badge: 'POPULAR',
    icon: 'fa-solid fa-paintbrush',
    desc: 'Create your own fully customized colored role with custom name and icon.',
    perks: ['Custom Hex Color', 'Custom Role Name & Emoji', 'Permanent / Active Role Access'],
  },

  // 2. Access Passes
  {
    id: 'htb-half-access',
    title: 'HTB | Half Access',
    category: 'access',
    tier: 'ACCESS',
    lifetimePrice: 5.00,
    monthlyPrice: 2.49,
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
    lifetimePrice: 7.00,
    monthlyPrice: 3.49,
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
    lifetimePrice: 9.00,
    monthlyPrice: 4.49,
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
    lifetimePrice: 22.00,
    monthlyPrice: 9.99,
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
    lifetimePrice: 25.00,
    monthlyPrice: 11.99,
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
    lifetimePrice: 32.00,
    monthlyPrice: 14.99,
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
    lifetimePrice: 38.00,
    monthlyPrice: 17.99,
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
    lifetimePrice: 44.00,
    monthlyPrice: 19.99,
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
    lifetimePrice: 49.00,
    monthlyPrice: 22.99,
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
    lifetimePrice: 75.00,
    monthlyPrice: 34.99,
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
    lifetimePrice: 80.00,
    monthlyPrice: 37.99,
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
    lifetimePrice: 123.00,
    monthlyPrice: 54.99,
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
    lifetimePrice: 150.00,
    monthlyPrice: 69.99,
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
    lifetimePrice: 175.00,
    monthlyPrice: 79.99,
    badge: 'SUPREME #1',
    icon: 'fa-solid fa-trophy',
    desc: 'The pinnacle of leadership in Hit The Block. Highest obtainable command rank.',
    perks: ['1st In Command Apex Authority', 'Direct Ownership Partner', 'Maximum Server Power'],
  },
];

// State
let cart = JSON.parse(localStorage.getItem('htb_market_cart_v2') || '[]');
let currentUser = JSON.parse(localStorage.getItem('htb_auth_user') || 'null');
let activeCategory = 'all';
let billingCycle = 'lifetime'; // 'lifetime' | 'monthly'

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const filterTabs = document.getElementById('filterTabs');
const billingToggle = document.getElementById('billingToggle');
const authContainer = document.getElementById('authContainer');
const loginModalBackdrop = document.getElementById('loginModalBackdrop');
const loginModalBtn = document.getElementById('loginModalBtn');
const loginModalCloseBtn = document.getElementById('loginModalCloseBtn');
const discordAuthBtn = document.getElementById('discordAuthBtn');
const googleAuthBtn = document.getElementById('googleAuthBtn');

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

// Check OAuth Hash Callback from Discord
function handleOAuthCallback() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');

    if (accessToken) {
      // Fetch user profile from Discord
      fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      .then(res => res.json())
      .then(userData => {
        if (userData && userData.id) {
          const avatarUrl = userData.avatar
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0') % 5}.png`;

          currentUser = {
            id: userData.id,
            username: userData.global_name || userData.username,
            tag: userData.discriminator !== '0' ? `${userData.username}#${userData.discriminator}` : `@${userData.username}`,
            avatar: avatarUrl,
            provider: 'discord',
          };

          localStorage.setItem('htb_auth_user', JSON.stringify(currentUser));
          updateAuthUI();
          showToast(`Logged in as ${currentUser.username}!`);
          window.history.replaceState(null, null, window.location.pathname);
        }
      })
      .catch(err => {
        console.error('Discord Auth Error:', err);
      });
    }
  }
}

// Auth UI Manager
const ADMIN_IDS = ['674218467041345536', '1508174981396168755'];

function updateAuthUI() {
  if (!authContainer) return;
  const navAdminBtn = document.getElementById('navAdminBtn');
  const isUserAdmin = currentUser && currentUser.provider === 'discord' && ADMIN_IDS.includes(String(currentUser.id));

  // ONLY show Admin Panel button if logged in as one of the 2 authorized Discord IDs
  if (navAdminBtn) {
    navAdminBtn.style.display = isUserAdmin ? 'inline-flex' : 'none';
  }

  if (currentUser) {
    const adminBadge = isUserAdmin ? '<span class="user-status-tag" style="color: #ffd700;"><i class="fa-solid fa-crown"></i> Admin</span>' : '<span class="user-status-tag"><i class="fa-solid fa-circle"></i> Verified</span>';

    authContainer.innerHTML = `
      <div class="user-profile-pill" title="Logged in as ${currentUser.tag}">
        <img src="${currentUser.avatar}" alt="Avatar" class="user-avatar-img">
        <div class="user-info-text">
          <span class="user-display-name">${currentUser.username}</span>
          ${adminBadge}
        </div>
        <button class="btn-logout-pill" onclick="logoutUser()" title="Logout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-auth" id="loginModalBtn" onclick="openLoginModal()">
        <i class="fa-solid fa-user-lock"></i>
        <span>Login</span>
      </button>
    `;
  }
}

function openLoginModal() {
  if (loginModalBackdrop) {
    const baseOrigin = window.location.origin.replace(/\/+$/, '') + '/';
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(baseOrigin)}&scope=identify+guilds+guilds.join`;
    if (discordAuthBtn) discordAuthBtn.href = discordAuthUrl;
    loginModalBackdrop.classList.add('open');
  }
}

function closeLoginModal() {
  if (loginModalBackdrop) loginModalBackdrop.classList.remove('open');
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('htb_auth_user');
  updateAuthUI();
  showToast('Logged out');
}

// Google Auth Simulation / Popup
if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', () => {
    const email = prompt('Enter your Google email for HTB account sync:');
    if (email && email.includes('@')) {
      const name = email.split('@')[0];
      currentUser = {
        id: 'G-' + Math.floor(100000 + Math.random() * 900000),
        username: name,
        tag: email,
        avatar: 'https://cdn-icons-png.flaticon.com/512/300/300221.png',
        provider: 'google',
      };
      localStorage.setItem('htb_auth_user', JSON.stringify(currentUser));
      updateAuthUI();
      closeLoginModal();
      showToast(`Logged in as ${currentUser.username}!`);
    }
  });
}

if (loginModalBtn) loginModalBtn.addEventListener('click', openLoginModal);
if (loginModalCloseBtn) loginModalCloseBtn.addEventListener('click', closeLoginModal);
if (loginModalBackdrop) {
  loginModalBackdrop.addEventListener('click', (e) => {
    if (e.target === loginModalBackdrop) closeLoginModal();
  });
}

function renderProducts() {
  const filtered = activeCategory === 'all'
    ? MARKET_ITEMS
    : MARKET_ITEMS.filter(p => p.category === activeCategory);

  productsGrid.innerHTML = filtered.map(item => {
    const isMonthly = billingCycle === 'monthly';
    const price = isMonthly ? item.monthlyPrice : item.lifetimePrice;
    const priceSuffix = isMonthly ? '/mo' : ' (Lifetime)';

    return `
      <div class="product-card">
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
            <span class="price-lbl">${isMonthly ? 'Monthly Price' : 'Lifetime Access'}</span>
            <span class="price-amount">$${price.toFixed(2)}<span class="price-suffix">${priceSuffix}</span></span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="addToCart('${item.id}', '${billingCycle}')">
            <i class="fa-solid fa-cart-plus"></i> Select
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Billing Toggle Handler
if (billingToggle) {
  billingToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.billing-btn');
    if (!btn) return;

    document.querySelectorAll('.billing-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    billingCycle = btn.dataset.cycle;
    renderProducts();
    showToast(`Switched to ${billingCycle === 'monthly' ? 'Monthly Subscriptions' : 'Lifetime Access'}`);
  });
}

// Filter Tabs Handler
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
function addToCart(productId, cycle = billingCycle) {
  const item = MARKET_ITEMS.find(p => p.id === productId);
  if (!item) return;

  const cartId = `${item.id}-${cycle}`;
  const price = cycle === 'monthly' ? item.monthlyPrice : item.lifetimePrice;
  const planLabel = cycle === 'monthly' ? 'Monthly Sub' : 'Lifetime';

  const existing = cart.find(i => i.cartId === cartId);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({
      cartId,
      id: item.id,
      title: `${item.title} (${planLabel})`,
      price,
      cycle,
      quantity: 1,
    });
  }

  saveCart();
  updateCartUI();
  showToast(`Added "${item.title} (${planLabel})" to order`);
}

function removeFromCart(cartId) {
  cart = cart.filter(item => item.cartId !== cartId);
  saveCart();
  updateCartUI();
  showToast('Role removed from order');
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  showToast('Order selection cleared');
}

function saveCart() {
  localStorage.setItem('htb_market_cart_v2', JSON.stringify(cart));
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
          <span class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity || 1} ${item.cycle === 'monthly' ? '/mo' : ''}</span>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.cartId}')" title="Remove">
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

// Checkout & Discord Order Ticket Generation
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) {
      showToast('Your order selection is empty!');
      return;
    }

    const orderId = 'HTB-' + Math.floor(100000 + Math.random() * 900000);
    const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0).toFixed(2);
    const itemList = cart.map(i => `• ${i.title} (${i.quantity || 1}x) — $${(i.price * (i.quantity || 1)).toFixed(2)}`).join('\n');
    const userTag = currentUser ? `${currentUser.tag} (ID: ${currentUser.id})` : 'Unlinked (Authorize on site for auto-grant)';

    // Save order to server database / memory
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          buyerTag: currentUser ? currentUser.tag : 'Unlinked Member',
          buyerId: currentUser ? currentUser.id : 'N/A',
          items: cart,
          totalAmount: parseFloat(total),
        }),
      });
    } catch (e) {
      console.log('Order save local fallback:', e);
    }

    modalContent.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(0,214,50,0.12); border: 1px solid #00D632; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #00D632; font-size: 2rem; box-shadow: 0 0 25px rgba(0,214,50,0.3);">
          <i class="fa-solid fa-dollar-sign"></i>
        </div>
        <h2 style="font-family: var(--font-heading); font-size: 1.7rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; color: #fff;">COMPLETE YOUR PURCHASE</h2>
        <p style="color: #8892a7; font-size: 0.92rem; margin-bottom: 16px;">Order ID: <strong style="color: var(--gold-light); font-family: var(--font-mono); font-size: 1.15rem;">${orderId}</strong></p>
        
        <div style="background: #080a0e; border: 1px solid var(--border-gold); border-radius: var(--radius-md); padding: 16px; text-align: left; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--gold-light); font-weight: 800; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
            <span>Selected Roles / Access</span>
            <span style="color: #00D632; font-size: 1rem;">Total: $${total}</span>
          </div>
          <pre style="font-family: var(--font-mono); font-size: 0.84rem; color: #f1f3f9; white-space: pre-wrap; margin: 0 0 8px 0; line-height: 1.5;">${itemList}</pre>
          <div style="font-size: 0.8rem; color: #8892a7; border-top: 1px solid var(--border-subtle); padding-top: 6px;">
            Buyer: <strong style="color: #57f287;">${userTag}</strong>
          </div>
        </div>

        <!-- Option 1: Direct CashApp Purchase (No Ticket Needed) -->
        <div style="background: rgba(0, 214, 50, 0.05); border: 1px solid rgba(0, 214, 50, 0.3); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px; text-align: left;">
          <div style="font-family: var(--font-heading); font-size: 0.95rem; font-weight: 800; color: #00D632; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-bolt"></i> <span>DIRECT CASHAPP PURCHASE (NO TICKET NEEDED)</span>
          </div>
          <p style="font-size: 0.82rem; color: #a3b2c9; margin-bottom: 12px; line-height: 1.4;">
            Send <strong>$${total}</strong> to the official HTB CashApp below and include <code style="color: var(--gold-light); background: #000; padding: 2px 6px; border-radius: 4px;">${orderId}</code> in the payment note:
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="https://cash.app/$itsnabula/${total}" target="_blank" rel="noopener" class="btn btn-cashapp btn-block" style="padding: 13px; font-size: 1rem;">
              <i class="fa-solid fa-dollar-sign"></i> Pay with CashApp: $itsnabula
            </a>
          </div>
        </div>

        <!-- Option 2: Discord Ticket -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.82rem; color: #768196; margin-bottom: 8px; text-transform: uppercase; font-weight: 700;">— OR OPEN A TICKET IN DISCORD —</div>
          <a href="https://discord.gg/xqz5TztwNM" target="_blank" rel="noopener" class="btn btn-discord btn-block" style="padding: 12px; font-size: 0.95rem;">
            <i class="fa-brands fa-discord"></i> Open Ticket In Discord (17k+)
          </a>
        </div>

        <div style="background: rgba(255, 75, 75, 0.08); border: 1px solid rgba(255, 75, 75, 0.25); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 0.78rem; color: #ff8585; text-align: left;">
          <i class="fa-solid fa-triangle-exclamation"></i> <strong>POLICY:</strong> All sales final. NO REFUNDS. Roles granted upon payment verification.
        </div>
      </div>
    `;

    closeCart();
    modalBackdrop.classList.add('open');
  });
}

// ==========================================================================
// ADMIN PANEL & ORDER VERIFICATION LOGIC
// ==========================================================================
const adminModalBackdrop = document.getElementById('adminModalBackdrop');
const adminAuthScreen = document.getElementById('adminAuthScreen');
const adminDashboardScreen = document.getElementById('adminDashboardScreen');
const verifyOrderIdInput = document.getElementById('verifyOrderIdInput');
const verifyResultContainer = document.getElementById('verifyResultContainer');
const adminOrdersTableBody = document.getElementById('adminOrdersTableBody');

function openAdminPanel() {
  if (!adminModalBackdrop) return;

  const isUserAdmin = currentUser && currentUser.provider === 'discord' && ADMIN_IDS.includes(String(currentUser.id));

  if (!isUserAdmin) {
    showToast('Admin Panel is locked. Please login with an authorized Discord account.');
    openLoginModal();
    return;
  }

  if (adminAuthScreen) adminAuthScreen.style.display = 'none';
  if (adminDashboardScreen) adminDashboardScreen.style.display = 'flex';
  fetchRecentOrders();
  adminModalBackdrop.classList.add('open');
}

function closeAdminPanel() {
  if (adminModalBackdrop) adminModalBackdrop.classList.remove('open');
}

function lockAdminPanel() {
  closeAdminPanel();
  showToast('Admin Panel Closed');
}

async function verifyOrderOnWeb(orderIdToVerify) {
  const orderId = orderIdToVerify || (verifyOrderIdInput ? verifyOrderIdInput.value : '').trim();
  if (!orderId) {
    showToast('Please enter an Order ID');
    return;
  }

  try {
    const res = await fetch('/api/orders/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();

    if (!data.success || !data.order) {
      if (verifyResultContainer) {
        verifyResultContainer.style.display = 'block';
        verifyResultContainer.innerHTML = `
          <div class="verify-result-card" style="border-color: #ef4444;">
            <p style="color: #ef4444; font-weight: 800;"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'Order ID not found'}</p>
          </div>
        `;
      }
      return;
    }

    const order = data.order;
    const itemsText = (order.items || []).map(i => `• ${i.title} (${i.quantity || 1}x) - $${(i.price * (i.quantity || 1)).toFixed(2)}`).join('\n');
    const badgeClass = `badge-${(order.status || 'pending').toLowerCase()}`;

    if (verifyResultContainer) {
      verifyResultContainer.style.display = 'block';
      verifyResultContainer.innerHTML = `
        <div class="verify-result-card">
          <div class="verify-result-header">
            <div>
              <strong style="font-family: var(--font-mono); font-size: 1.1rem; color: var(--gold-light);">${order.orderId}</strong>
              <div style="font-size: 0.8rem; color: #8c97af; margin-top: 2px;">Created: ${new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <span class="verify-badge ${badgeClass}">${order.status}</span>
          </div>

          <div style="font-size: 0.88rem; margin-bottom: 8px;">
            <span style="color: #8c97af;">Buyer Discord:</span> <strong style="color: #fff;">${order.buyerTag}</strong> (ID: <code>${order.buyerId}</code>)
          </div>
          <div style="font-size: 0.88rem; margin-bottom: 12px;">
            <span style="color: #8c97af;">Total Amount:</span> <strong style="color: var(--gold-glow); font-size: 1.1rem;">$${parseFloat(order.totalAmount || 0).toFixed(2)}</strong>
          </div>

          <pre style="background: #0d1017; border: 1px solid var(--border-subtle); padding: 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.82rem; color: #cfd6e4; white-space: pre-wrap; margin-bottom: 12px;">${itemsText}</pre>

          <div class="verify-actions-row">
            <button class="btn btn-primary btn-sm" onclick="updateOrderStatusOnWeb('${order.orderId}', 'VERIFIED')">
              <i class="fa-solid fa-check"></i> Mark Verified
            </button>
            <button class="btn btn-discord btn-sm" onclick="updateOrderStatusOnWeb('${order.orderId}', 'DELIVERED')">
              <i class="fa-solid fa-shield-check"></i> Mark Delivered
            </button>
            <button class="btn btn-secondary btn-sm" onclick="updateOrderStatusOnWeb('${order.orderId}', 'REJECTED')">
              <i class="fa-solid fa-ban"></i> Reject
            </button>
          </div>
        </div>
      `;
    }
  } catch (err) {
    showToast('Failed to verify order: ' + err.message);
  }
}

async function updateOrderStatusOnWeb(orderId, newStatus) {
  try {
    const adminId = currentUser ? currentUser.id : 'ADMIN';
    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        status: newStatus,
        adminId,
        adminKey: ADMIN_PASSCODE,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order ${orderId} marked as ${newStatus}`);
      verifyOrderOnWeb(orderId);
      fetchRecentOrders();
    } else {
      showToast('Error: ' + (data.error || 'Failed to update'));
    }
  } catch (e) {
    showToast('Update failed: ' + e.message);
  }
}

async function fetchRecentOrders() {
  if (!adminOrdersTableBody) return;
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    const orders = data.orders || [];

    if (orders.length === 0) {
      adminOrdersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8c97af; padding: 20px;">No web orders recorded yet.</td></tr>`;
      return;
    }

    adminOrdersTableBody.innerHTML = orders.map(o => `
      <tr>
        <td><strong style="color: var(--gold-light); font-family: var(--font-mono);">${o.orderId}</strong></td>
        <td>${o.buyerTag || 'Unlinked'}</td>
        <td style="color: var(--gold-glow); font-weight: 800;">$${parseFloat(o.totalAmount || 0).toFixed(2)}</td>
        <td><span class="verify-badge badge-${(o.status || 'pending').toLowerCase()}">${o.status || 'PENDING'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="verifyOrderOnWeb('${o.orderId}')" style="padding: 4px 10px; font-size: 0.76rem;">
            Inspect
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.log('Orders fetch err:', e);
  }
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

// Toast System
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

// Init & OAuth Check
handleOAuthCallback();
updateAuthUI();
renderProducts();
updateCartUI();
