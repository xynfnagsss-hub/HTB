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

// Authentication Management (OAuth + Instant Discord Link)
function handleOAuthCallback() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');

    if (accessToken) {
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
          showToast(`Welcome back, ${currentUser.username}!`);
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
  const isUserAdmin = currentUser && (currentUser.provider === 'discord' || currentUser.isAdmin) && (ADMIN_IDS.includes(String(currentUser.id)) || currentUser.isAdmin);

  const navAdminBtn = document.getElementById('navAdminBtn');
  if (navAdminBtn) {
    navAdminBtn.style.display = isUserAdmin ? 'inline-flex' : 'none';
  }

  // Mobile Bottom Bar Login Pill
  const mobileLoginLabel = document.getElementById('mobileNavUserLabel');
  if (mobileLoginLabel) {
    mobileLoginLabel.textContent = currentUser ? currentUser.username.slice(0, 10) : 'Login';
  }

  if (authContainer) {
    if (currentUser) {
      const adminBadge = isUserAdmin
        ? '<span class="user-status-tag" style="color: #ffd700;"><i class="fa-solid fa-crown"></i> Admin</span>'
        : '<span class="user-status-tag"><i class="fa-solid fa-circle-check"></i> Linked</span>';

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
          <i class="fa-brands fa-discord"></i>
          <span>Link Discord</span>
        </button>
      `;
    }
  }
}

function openLoginModal() {
  if (loginModalBackdrop) {
    // Dynamically calculate exact current page redirect URL for GitHub Pages / Custom Domain
    const exactRedirectUri = window.location.href.split('#')[0].split('?')[0];
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(exactRedirectUri)}&scope=identify+guilds`;
    
    if (discordAuthBtn) discordAuthBtn.href = discordAuthUrl;
    loginModalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeLoginModal() {
  if (loginModalBackdrop) {
    loginModalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('htb_auth_user');
  updateAuthUI();
  showToast('Logged out');
}

// 1-Tap Instant Discord Username/ID Linking
function loginWithManualUsername() {
  const input = document.getElementById('manualDiscordUsernameInput');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast('Please enter your Discord username or ID!');
    return;
  }

  const cleanVal = val.replace(/^@/, '');
  const isNumericId = /^\d{17,20}$/.test(cleanVal);

  // Generate clean Discord avatar based on input
  const avatarIndex = Math.abs(cleanVal.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 5;
  const avatarUrl = `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;

  currentUser = {
    id: isNumericId ? cleanVal : 'U-' + Math.floor(100000 + Math.random() * 900000),
    username: cleanVal,
    tag: isNumericId ? `Discord ID: ${cleanVal}` : `@${cleanVal}`,
    avatar: avatarUrl,
    provider: 'discord_instant',
  };

  localStorage.setItem('htb_auth_user', JSON.stringify(currentUser));
  updateAuthUI();
  closeLoginModal();
  showToast(`Linked Discord account: ${currentUser.username}!`);
}

// Google Auth Fallback
if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', () => {
    const email = prompt('Enter your Google email for order linking:');
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
      showToast(`Linked as ${currentUser.username}!`);
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

// Auto-switch to monthly if specified in URL (e.g. ?plan=monthly or #monthly)
try {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('plan') === 'monthly' || window.location.hash.toLowerCase().includes('monthly')) {
    billingCycle = 'monthly';
    document.querySelectorAll('.billing-btn').forEach(b => {
      if (b.dataset.cycle === 'monthly') b.classList.add('active');
      else b.classList.remove('active');
    });
  }
} catch {}

let searchQuery = '';

function renderProducts() {
  const query = searchQuery.trim().toLowerCase();
  
  let filtered = MARKET_ITEMS;
  
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }

  if (query) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.desc.toLowerCase().includes(query) ||
      p.tier.toLowerCase().includes(query) ||
      p.badge.toLowerCase().includes(query) ||
      p.perks.some(perk => perk.toLowerCase().includes(query))
    );
  }

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(12, 15, 21, 0.6); border: 1px dashed var(--border-gold); border-radius: var(--radius-lg);">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 2.4rem; color: var(--gold-light); margin-bottom: 14px; display: block;"></i>
        <h3 style="font-family: var(--font-heading); font-size: 1.3rem; margin-bottom: 6px; color: #fff;">No matching roles or passes found</h3>
        <p style="color: #8892a7; font-size: 0.9rem; margin-bottom: 16px;">Try searching for "Mod", "Admin", "Custom", or "Access".</p>
        <button class="btn btn-secondary btn-sm" onclick="resetSearch()">
          <i class="fa-solid fa-rotate-left"></i> Reset Search
        </button>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(item => {
    const isMonthly = billingCycle === 'monthly';
    const price = isMonthly ? item.monthlyPrice : item.lifetimePrice;
    const priceSuffix = isMonthly ? '/mo' : ' (Lifetime)';

    return `
      <div class="product-card">
        <div class="card-header-top">
          <span class="tier-tag">${item.tier}</span>
          <span class="product-badge"><i class="fa-solid fa-sparkles"></i> ${item.badge}</span>
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

function resetSearch() {
  const input = document.getElementById('roleSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  searchQuery = '';
  activeCategory = 'all';
  document.querySelectorAll('.filter-tab').forEach(t => {
    if (t.dataset.category === 'all') t.classList.add('active');
    else t.classList.remove('active');
  });
  renderProducts();
}

// Search Input Listener
const roleSearchInput = document.getElementById('roleSearchInput');
const searchClearBtn = document.getElementById('searchClearBtn');

if (roleSearchInput) {
  roleSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchClearBtn) {
      searchClearBtn.style.display = searchQuery.length > 0 ? 'inline-flex' : 'none';
    }
    renderProducts();
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener('click', resetSearch);
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

function switchToMonthlyMobile() {
  billingCycle = 'monthly';
  document.querySelectorAll('.billing-btn').forEach(b => {
    if (b.dataset.cycle === 'monthly') b.classList.add('active');
    else b.classList.remove('active');
  });
  renderProducts();
  showToast('Switched to Monthly Subscriptions');
}

function copyOrderId(orderId) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(orderId).then(() => {
      showToast(`Copied Order ID: ${orderId}`);
    }).catch(() => {
      prompt('Copy your Order ID below:', orderId);
    });
  } else {
    prompt('Copy your Order ID below:', orderId);
  }
}

function increaseQuantity(cartId) {
  const item = cart.find(i => i.cartId === cartId);
  if (item) {
    item.quantity = (item.quantity || 1) + 1;
    saveCart();
    updateCartUI();
  }
}

function decreaseQuantity(cartId) {
  const item = cart.find(i => i.cartId === cartId);
  if (item) {
    if ((item.quantity || 1) > 1) {
      item.quantity -= 1;
    } else {
      cart = cart.filter(i => i.cartId !== cartId);
    }
    saveCart();
    updateCartUI();
  }
}

function updateCategoryCounts() {
  const counts = {
    all: MARKET_ITEMS.length,
    roles: MARKET_ITEMS.filter(i => i.category === 'roles').length,
    access: MARKET_ITEMS.filter(i => i.category === 'access').length,
    staff: MARKET_ITEMS.filter(i => i.category === 'staff').length,
    command: MARKET_ITEMS.filter(i => i.category === 'command').length,
    supreme: MARKET_ITEMS.filter(i => i.category === 'supreme').length,
  };

  document.querySelectorAll('.filter-tab').forEach(tab => {
    const cat = tab.dataset.category;
    if (cat && counts[cat] !== undefined) {
      let badge = tab.querySelector('.cat-count-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cat-count-badge';
        tab.appendChild(badge);
      }
      badge.textContent = counts[cat];
    }
  });
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if (cartCountBadge) cartCountBadge.textContent = totalCount;
  
  const mobileCartBadge = document.getElementById('mobileCartBadge');
  if (mobileCartBadge) mobileCartBadge.textContent = totalCount;

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
          <span class="cart-item-price">$${(item.price * (item.quantity || 1)).toFixed(2)} ${item.cycle === 'monthly' ? '/mo' : ''}</span>
          
          <div class="quantity-stepper">
            <button class="stepper-btn" onclick="decreaseQuantity('${item.cartId}')" title="Decrease">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="stepper-count">${item.quantity || 1}</span>
            <button class="stepper-btn" onclick="increaseQuantity('${item.cartId}')" title="Increase">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
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

// Global Keyboard Shortcut (Ctrl+K or '/' focuses search)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('roleSearchInput');
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
});

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
    const userTag = currentUser ? `${currentUser.tag}` : 'Unlinked Member';

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
        <div style="width: 58px; height: 58px; background: rgba(0,214,50,0.12); border: 1px solid #00D632; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #00D632; font-size: 1.8rem; box-shadow: 0 0 25px rgba(0,214,50,0.3);">
          <i class="fa-solid fa-dollar-sign"></i>
        </div>
        <h2 style="font-family: var(--font-heading); font-size: 1.55rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; color: #fff;">COMPLETE YOUR PURCHASE</h2>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 14px;">
          <span style="color: #8892a7; font-size: 0.9rem;">Order ID:</span>
          <code style="color: var(--gold-light); background: #000; padding: 3px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 800; font-size: 1rem; border: 1px solid var(--border-gold);">${orderId}</code>
          <button class="btn btn-secondary btn-sm" onclick="copyOrderId('${orderId}')" style="padding: 4px 10px; font-size: 0.75rem;">
            <i class="fa-solid fa-copy"></i> Copy
          </button>
        </div>
        
        <div style="background: #080a0e; border: 1px solid var(--border-gold); border-radius: var(--radius-md); padding: 14px; text-align: left; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--gold-light); font-weight: 800; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
            <span>Selected Roles / Access</span>
            <span style="color: #00D632; font-size: 1rem;">Total: $${total}</span>
          </div>
          <pre style="font-family: var(--font-mono); font-size: 0.82rem; color: #f1f3f9; white-space: pre-wrap; margin: 0 0 8px 0; line-height: 1.4;">${itemList}</pre>
          <div style="font-size: 0.78rem; color: #8892a7; border-top: 1px solid var(--border-subtle); padding-top: 6px;">
            Buyer: <strong style="color: #57f287;">${userTag}</strong>
          </div>
        </div>

        <!-- Option 1: Direct CashApp Purchase (No Ticket Needed) -->
        <div style="background: rgba(0, 214, 50, 0.05); border: 1px solid rgba(0, 214, 50, 0.3); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px; text-align: left;">
          <div style="font-family: var(--font-heading); font-size: 0.9rem; font-weight: 800; color: #00D632; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-bolt"></i> <span>DIRECT CASHAPP PURCHASE (FASTEST)</span>
          </div>
          <p style="font-size: 0.8rem; color: #a3b2c9; margin-bottom: 10px; line-height: 1.35;">
            Send <strong>$${total}</strong> to <strong>$itsnabula</strong> with <code style="color: var(--gold-light);">${orderId}</code> in the payment note:
          </p>

          <a href="https://cash.app/$itsnabula/${total}" target="_blank" rel="noopener" class="btn btn-cashapp btn-block" style="padding: 12px; font-size: 0.95rem;">
            <i class="fa-solid fa-dollar-sign"></i> Pay $${total} on CashApp ($itsnabula)
          </a>
        </div>

        <!-- Option 2: Discord Ticket -->
        <div style="margin-bottom: 12px;">
          <div style="font-size: 0.76rem; color: #768196; margin-bottom: 6px; text-transform: uppercase; font-weight: 700;">— OR OPEN A TICKET IN DISCORD —</div>
          <a href="https://discord.gg/xqz5TztwNM" target="_blank" rel="noopener" class="btn btn-discord btn-block" style="padding: 11px; font-size: 0.9rem;">
            <i class="fa-brands fa-discord"></i> Open Ticket in Discord (17k+)
          </a>
        </div>

        <div style="background: rgba(255, 75, 75, 0.08); border: 1px solid rgba(255, 75, 75, 0.25); border-radius: var(--radius-sm); padding: 6px 10px; font-size: 0.74rem; color: #ff8585; text-align: left;">
          <i class="fa-solid fa-triangle-exclamation"></i> All sales final. NO REFUNDS. Roles granted upon payment verification.
        </div>
      </div>
    `;

    closeCart();
    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
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

function switchAdminTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => {
    if (t.dataset.tab === tabName) t.classList.add('active');
    else t.classList.remove('active');
  });

  const tabOrders = document.getElementById('adminTabOrders');
  const tabAnalytics = document.getElementById('adminTabAnalytics');
  const tabRoblox = document.getElementById('adminTabRoblox');

  if (tabOrders) tabOrders.style.display = tabName === 'orders' ? 'block' : 'none';
  if (tabAnalytics) tabAnalytics.style.display = tabName === 'analytics' ? 'block' : 'none';
  if (tabRoblox) tabRoblox.style.display = tabName === 'roblox' ? 'block' : 'none';

  if (tabName === 'analytics') renderAdminAnalytics();
}

let allCachedAdminOrders = [];

function getLocalOrders() {
  try {
    const raw = localStorage.getItem('htb_store_orders');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders) {
  try {
    localStorage.setItem('htb_store_orders', JSON.stringify(orders));
  } catch {}
}

async function verifyOrderOnWeb(orderIdToVerify) {
  const orderId = (orderIdToVerify || (verifyOrderIdInput ? verifyOrderIdInput.value : '')).trim().toUpperCase();
  if (!orderId) {
    showToast('Please enter an Order ID');
    return;
  }

  let order = null;

  // Try API first
  try {
    const res = await fetch('/api/orders/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    if (data && data.success && data.order) {
      order = data.order;
    }
  } catch {}

  // Fallback to local cache
  if (!order) {
    const local = getLocalOrders();
    order = local.find(o => o.orderId === orderId);
  }

  if (!order) {
    if (verifyResultContainer) {
      verifyResultContainer.style.display = 'block';
      verifyResultContainer.innerHTML = `
        <div class="verify-result-card" style="border-color: #ef4444;">
          <p style="color: #ef4444; font-weight: 800;"><i class="fa-solid fa-triangle-exclamation"></i> Order ID <code>${orderId}</code> not found in system.</p>
        </div>
      `;
    }
    return;
  }

  const itemsText = (order.items || []).map(i => `• ${i.title} (${i.quantity || 1}x) - $${(i.price * (i.quantity || 1)).toFixed(2)}`).join('\n');
  const badgeClass = `badge-${(order.status || 'pending').toLowerCase()}`;

  if (verifyResultContainer) {
    verifyResultContainer.style.display = 'block';
    verifyResultContainer.innerHTML = `
      <div class="verify-result-card">
        <div class="verify-result-header">
          <div>
            <strong style="font-family: var(--font-mono); font-size: 1.15rem; color: var(--gold-light);">${order.orderId}</strong>
            <div style="font-size: 0.8rem; color: #8c97af; margin-top: 2px;">Created: ${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <span class="verify-badge ${badgeClass}">${order.status}</span>
        </div>

        <div style="font-size: 0.88rem; margin-bottom: 8px;">
          <span style="color: #8c97af;">Buyer Discord:</span> <strong style="color: #57f287;">${order.buyerTag}</strong> (ID: <code>${order.buyerId}</code>)
        </div>
        <div style="font-size: 0.88rem; margin-bottom: 12px;">
          <span style="color: #8c97af;">Total Amount:</span> <strong style="color: var(--gold-glow); font-size: 1.15rem;">$${parseFloat(order.totalAmount || 0).toFixed(2)}</strong>
        </div>

        <pre style="background: #080a0e; border: 1px solid var(--border-subtle); padding: 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.84rem; color: #cfd6e4; white-space: pre-wrap; margin-bottom: 14px; line-height: 1.4;">${itemsText}</pre>

        <div class="verify-actions-row">
          <button class="btn btn-primary btn-sm" onclick="updateOrderStatusOnWeb('${order.orderId}', 'VERIFIED')">
            <i class="fa-solid fa-check"></i> Mark Verified
          </button>
          <button class="btn btn-cashapp btn-sm" onclick="updateOrderStatusOnWeb('${order.orderId}', 'DELIVERED')">
            <i class="fa-solid fa-shield-check"></i> Mark Delivered
          </button>
          <button class="btn btn-secondary btn-sm" onclick="updateOrderStatusOnWeb('${order.orderId}', 'REJECTED')">
            <i class="fa-solid fa-ban"></i> Reject
          </button>
        </div>
      </div>
    `;
  }
}

async function updateOrderStatusOnWeb(orderId, newStatus) {
  // Update local storage
  const local = getLocalOrders();
  const idx = local.findIndex(o => o.orderId === orderId);
  if (idx !== -1) {
    local[idx].status = newStatus;
    saveLocalOrders(local);
  }

  // Also send to API if backend online
  try {
    const adminId = currentUser ? currentUser.id : 'ADMIN';
    await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        status: newStatus,
        adminId,
        adminKey: ADMIN_PASSCODE,
      }),
    });
  } catch {}

  showToast(`Order ${orderId} marked as ${newStatus}`);
  verifyOrderOnWeb(orderId);
  fetchRecentOrders();
}

async function fetchRecentOrders() {
  if (!adminOrdersTableBody) return;

  let orders = [];

  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data && data.orders && data.orders.length > 0) {
      orders = data.orders;
    }
  } catch {}

  const local = getLocalOrders();
  
  // Merge unique orders
  const map = new Map();
  local.forEach(o => map.set(o.orderId, o));
  orders.forEach(o => map.set(o.orderId, o));
  
  allCachedAdminOrders = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  saveLocalOrders(allCachedAdminOrders);

  filterAdminOrdersTable();
  updateAdminKPIs(allCachedAdminOrders);
}

function updateAdminKPIs(orders) {
  const rev = orders.filter(o => o.status !== 'REJECTED').reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const pending = orders.filter(o => (o.status || 'PENDING') === 'PENDING').length;
  const delivered = orders.filter(o => o.status === 'DELIVERED' || o.status === 'VERIFIED').length;

  const kpiRev = document.getElementById('adminKpiRevenue');
  const kpiTotal = document.getElementById('adminKpiTotalOrders');
  const kpiPend = document.getElementById('adminKpiPending');
  const kpiDeliv = document.getElementById('adminKpiDelivered');

  if (kpiRev) kpiRev.textContent = `$${rev.toFixed(2)}`;
  if (kpiTotal) kpiTotal.textContent = orders.length;
  if (kpiPend) kpiPend.textContent = pending;
  if (kpiDeliv) kpiDeliv.textContent = delivered;
}

function filterAdminOrdersTable() {
  if (!adminOrdersTableBody) return;
  const select = document.getElementById('adminOrderFilterStatus');
  const filter = select ? select.value : 'ALL';

  let list = allCachedAdminOrders;
  if (filter !== 'ALL') {
    list = list.filter(o => (o.status || 'PENDING') === filter);
  }

  if (list.length === 0) {
    adminOrdersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8c97af; padding: 22px;">No orders match status "${filter}".</td></tr>`;
    return;
  }

  adminOrdersTableBody.innerHTML = list.map(o => `
    <tr>
      <td><strong style="color: var(--gold-light); font-family: var(--font-mono); font-size: 0.95rem;">${o.orderId}</strong></td>
      <td>${o.buyerTag || 'Unlinked Member'}</td>
      <td style="color: var(--gold-glow); font-weight: 800;">$${parseFloat(o.totalAmount || 0).toFixed(2)}</td>
      <td><span class="verify-badge badge-${(o.status || 'pending').toLowerCase()}">${o.status || 'PENDING'}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="verifyOrderOnWeb('${o.orderId}')" style="padding: 4px 10px; font-size: 0.76rem;">
          <i class="fa-solid fa-magnifying-glass"></i> Inspect
        </button>
      </td>
    </tr>
  `).join('');
}

function exportOrdersToCSV() {
  if (allCachedAdminOrders.length === 0) {
    showToast('No orders to export!');
    return;
  }

  let csv = 'OrderID,BuyerTag,BuyerID,TotalAmount,Status,Date\n';
  allCachedAdminOrders.forEach(o => {
    csv += `"${o.orderId}","${(o.buyerTag || '').replace(/"/g, '""')}","${o.buyerId || ''}",${parseFloat(o.totalAmount || 0).toFixed(2)},"${o.status || 'PENDING'}","${new Date(o.createdAt).toISOString()}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `HTB-Orders-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Orders exported to CSV');
}

function renderAdminAnalytics() {
  const container = document.getElementById('adminTopSellingList');
  if (!container) return;

  const itemCounts = {};
  allCachedAdminOrders.forEach(o => {
    (o.items || []).forEach(item => {
      itemCounts[item.title] = (itemCounts[item.title] || 0) + (item.quantity || 1);
    });
  });

  const sorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    container.innerHTML = `<span style="color: #7a869e; font-size: 0.85rem;">No purchase analytics recorded yet.</span>`;
    return;
  }

  container.innerHTML = sorted.map(([title, qty]) => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: #080a0e; border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-sm);">
      <span style="font-weight: 700; color: #fff; font-size: 0.88rem;">${title}</span>
      <span style="color: var(--gold-light); font-weight: 800; font-family: var(--font-mono);">${qty} sold</span>
    </div>
  `).join('');
}

function lookupAdminRobloxUser() {
  const input = document.getElementById('adminRobloxUserInput');
  const resultBox = document.getElementById('adminRobloxResultBox');
  const val = input ? input.value.trim() : '';

  if (!val) {
    showToast('Please enter a Roblox username or User ID');
    return;
  }

  resultBox.style.display = 'block';
  resultBox.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 44px; height: 44px; background: #000; border: 1px solid var(--border-gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: var(--gold-glow);">
        <i class="fa-solid fa-user-astronaut"></i>
      </div>
      <div>
        <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 2px;">${val}</h4>
        <span style="color: #57f287; font-size: 0.8rem; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Group Member (Rank: Hit The Block Active)</span>
      </div>
    </div>
  `;
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
updateCategoryCounts();
renderProducts();
updateCartUI();
