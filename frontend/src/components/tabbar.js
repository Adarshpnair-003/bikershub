/**
 * Bottom tab bar component for Bikers Hub
 * 5 tabs: Home, Clubs, + Create, Search, Profile
 */

const tabs = [
  {
    id: 'home',
    label: 'Home',
    path: '/home',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>`,
  },
  {
    id: 'clubs',
    label: 'Clubs',
    path: '/clubs',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>`,
  },
  {
    id: 'create',
    label: '',
    path: '/create-post',
    isCreate: true,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`,
  },
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`,
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`,
  },
];

/**
 * Render the bottom tab bar HTML
 * @param {string} activeTab - The currently active tab id
 * @returns {string} HTML string
 */
export function renderTabBar(activeTab) {
  const tabItems = tabs
    .map((tab) => {
      const isActive = tab.id === activeTab;

      if (tab.isCreate) {
        return `
          <button class="tab-bar-item tab-bar-create" onclick="navigate('${tab.path}')">
            <div class="tab-bar-create-circle">
              ${tab.icon}
            </div>
          </button>
        `;
      }

      return `
        <button class="tab-bar-item${isActive ? ' active' : ''}" onclick="navigate('${tab.path}')">
          ${tab.icon}
          <span>${tab.label}</span>
          ${isActive ? '<div class="tab-bar-dot"></div>' : ''}
        </button>
      `;
    })
    .join('');

  return `
    <div class="tab-bar-spacer"></div>
    <nav class="tab-bar">
      ${tabItems}
    </nav>
  `;
}
