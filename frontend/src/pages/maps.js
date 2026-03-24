/**
 * Maps page for Bikers Hub
 * Placeholder for ride tracking features
 */

import { renderTabBar } from '../components/tabbar.js';

export function render() {
  return `
    <div class="page-dark">
      <div class="app-header">
        <div class="app-header-title">Maps &amp; Ride Tracking</div>
      </div>

      <div class="maps-placeholder">
        <div class="maps-placeholder-title">Maps &amp; Ride Tracking</div>
        <div class="maps-placeholder-subtitle">Coming soon</div>
      </div>

      ${renderTabBar('maps')}
    </div>
  `;
}

export function mount() {
  // No interactive elements yet
}
