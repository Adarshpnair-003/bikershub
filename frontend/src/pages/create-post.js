/**
 * Create Post page for Bikers Hub
 * Allows users to compose a new post with text and up to 5 images
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser, isGuest } from '../utils/auth.js';
import { renderTabBar } from '../components/tabbar.js';

export function render() {
  return `
    <style>
      .create-post-textarea {
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 16px;
        color: #f9fafb;
        padding: 16px;
        min-height: 120px;
        font-family: 'Nunito', sans-serif;
        font-size: 15px;
        resize: vertical;
        width: 100%;
        box-sizing: border-box;
        outline: none;
      }
      .create-post-textarea::placeholder {
        color: #6b7280;
      }
      .create-post-textarea:focus {
        border-color: #ef4444;
      }
      .create-post-preview-row {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 12px 0;
      }
      .create-post-thumb {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
      }
      .create-post-media-btn {
        background: none;
        border: 1px solid #374151;
        border-radius: 12px;
        color: #9ca3af;
        padding: 10px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-family: 'Nunito', sans-serif;
      }
      .create-post-media-btn:hover {
        border-color: #6b7280;
        color: #f9fafb;
      }
      .create-post-submit {
        background: #ef4444;
        color: #fff;
        border: none;
        border-radius: 12px;
        padding: 14px;
        width: 100%;
        font-size: 16px;
        font-weight: 700;
        font-family: 'Nunito', sans-serif;
        cursor: pointer;
        letter-spacing: 1px;
        margin-top: 16px;
      }
      .create-post-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .create-post-submit:hover:not(:disabled) {
        background: #dc2626;
      }

      /* Poll composer */
      .cp-poll-toggle {
        background: none;
        border: 1px solid #374151;
        border-radius: 12px;
        color: #9ca3af;
        padding: 10px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-family: 'Nunito', sans-serif;
        margin-top: 8px;
        width: 100%;
        justify-content: center;
      }
      .cp-poll-toggle.active {
        border-color: #E53935;
        color: #E53935;
      }
      .cp-poll-card {
        margin-top: 12px;
        border: 1px solid #374151;
        border-radius: 14px;
        padding: 14px;
        background: #1E1E1E;
        display: none;
        flex-direction: column;
        gap: 10px;
      }
      .cp-poll-card.show { display: flex; }
      .cp-poll-row { display: flex; align-items: center; gap: 8px; }
      .cp-poll-input {
        flex: 1;
        background: #0C0C0C;
        border: 1px solid #374151;
        border-radius: 10px;
        color: #F3F3F3;
        padding: 10px 12px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        outline: none;
      }
      .cp-poll-input:focus { border-color: #E53935; }
      .cp-poll-remove {
        background: transparent;
        border: 1px solid #374151;
        border-radius: 999px;
        width: 30px;
        height: 30px;
        color: #9ca3af;
        cursor: pointer;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        line-height: 1;
      }
      .cp-poll-add {
        background: transparent;
        border: 1px dashed #374151;
        border-radius: 10px;
        color: #9ca3af;
        padding: 10px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-size: 13px;
      }
      .cp-poll-add:disabled { opacity: 0.4; cursor: not-allowed; }
      .cp-poll-controls {
        display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;
        align-items: center;
      }
      .cp-poll-control-label {
        font-size: 11.5px;
        color: rgba(243,243,243,0.55);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .cp-poll-select {
        background: #0C0C0C;
        border: 1px solid #374151;
        border-radius: 10px;
        color: #F3F3F3;
        padding: 8px 10px;
        font-family: 'Poppins', sans-serif;
        font-size: 13px;
        outline: none;
      }
      .cp-poll-multi {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 13px; color: #F3F3F3; cursor: pointer; user-select: none;
      }
    </style>
    <div class="page-dark">
      <div class="app-header">
        <button class="app-header-btn" id="create-post-back" style="margin-right: 8px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div class="app-header-title" style="flex:1;">New Post</div>
      </div>

      <div style="padding: 16px 20px;">
        <textarea class="create-post-textarea" id="create-post-content" placeholder="Share your ride experience..." maxlength="2000"></textarea>

        <div class="create-post-preview-row" id="create-post-previews"></div>

        <input type="file" id="create-post-file" accept="image/*" multiple style="display:none;" />
        <button class="create-post-media-btn" id="create-post-add-media">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Add Photos (max 5)
        </button>

        <button class="cp-poll-toggle" id="cp-poll-toggle" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
          </svg>
          <span id="cp-poll-toggle-label">Add a poll</span>
        </button>

        <div class="cp-poll-card" id="cp-poll-card">
          <div id="cp-poll-options"></div>
          <button class="cp-poll-add" id="cp-poll-add" type="button">+ Add option</button>
          <div class="cp-poll-controls">
            <label class="cp-poll-multi"><input type="checkbox" id="cp-poll-multi" /> Allow multiple choices</label>
            <span class="cp-poll-control-label">Closes</span>
            <select class="cp-poll-select" id="cp-poll-closes">
              <option value="">Never</option>
              <option value="1">In 1 day</option>
              <option value="3">In 3 days</option>
              <option value="7">In 1 week</option>
            </select>
          </div>
        </div>

        <button class="create-post-submit" id="create-post-btn">POST</button>
      </div>

      ${renderTabBar('')}
    </div>
  `;
}

export function mount() {
  const backBtn = document.getElementById('create-post-back');
  const fileInput = document.getElementById('create-post-file');
  const addMediaBtn = document.getElementById('create-post-add-media');
  const previewRow = document.getElementById('create-post-previews');
  const contentEl = document.getElementById('create-post-content');
  const submitBtn = document.getElementById('create-post-btn');

  // Poll composer state
  const pollToggle = document.getElementById('cp-poll-toggle');
  const pollLabel = document.getElementById('cp-poll-toggle-label');
  const pollCard = document.getElementById('cp-poll-card');
  const pollOptionsEl = document.getElementById('cp-poll-options');
  const pollAddBtn = document.getElementById('cp-poll-add');
  const pollMultiEl = document.getElementById('cp-poll-multi');
  const pollClosesEl = document.getElementById('cp-poll-closes');
  let pollEnabled = false;
  let pollOptionLabels = ['', ''];

  function renderPollOptions() {
    if (!pollOptionsEl) return;
    pollOptionsEl.innerHTML = pollOptionLabels.map((value, idx) => `
      <div class="cp-poll-row" data-idx="${idx}">
        <input type="text" class="cp-poll-input" placeholder="Option ${idx + 1}" maxlength="60" value="${value.replace(/"/g, '&quot;')}" />
        ${pollOptionLabels.length > 2 ? `<button class="cp-poll-remove" type="button" aria-label="Remove">×</button>` : ''}
      </div>
    `).join('');
    pollOptionsEl.querySelectorAll('.cp-poll-row').forEach((row) => {
      const idx = Number(row.dataset.idx);
      const inp = row.querySelector('.cp-poll-input');
      inp?.addEventListener('input', () => { pollOptionLabels[idx] = inp.value; });
      const rm = row.querySelector('.cp-poll-remove');
      rm?.addEventListener('click', () => {
        pollOptionLabels.splice(idx, 1);
        renderPollOptions();
        if (pollAddBtn) pollAddBtn.disabled = pollOptionLabels.length >= 4;
      });
    });
  }

  if (pollToggle) {
    pollToggle.addEventListener('click', () => {
      pollEnabled = !pollEnabled;
      pollToggle.classList.toggle('active', pollEnabled);
      if (pollLabel) pollLabel.textContent = pollEnabled ? 'Remove poll' : 'Add a poll';
      if (pollCard) pollCard.classList.toggle('show', pollEnabled);
      if (pollEnabled) {
        pollOptionLabels = ['', ''];
        renderPollOptions();
        if (pollAddBtn) pollAddBtn.disabled = false;
      }
    });
  }

  if (pollAddBtn) {
    pollAddBtn.addEventListener('click', () => {
      if (pollOptionLabels.length >= 4) return;
      pollOptionLabels.push('');
      renderPollOptions();
      pollAddBtn.disabled = pollOptionLabels.length >= 4;
    });
  }

  let selectedFiles = [];

  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('/home'));
  }

  if (addMediaBtn && fileInput) {
    addMediaBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const newFiles = Array.from(fileInput.files);
      selectedFiles = selectedFiles.concat(newFiles).slice(0, 5);
      renderPreviews();
      fileInput.value = '';
    });
  }

  function renderPreviews() {
    if (!previewRow) return;
    previewRow.innerHTML = '';
    selectedFiles.forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      img.className = 'create-post-thumb';
      img.alt = `Preview ${i + 1}`;
      img.addEventListener('click', () => {
        URL.revokeObjectURL(url);
        selectedFiles.splice(i, 1);
        renderPreviews();
      });
      previewRow.appendChild(img);
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const content = contentEl ? contentEl.value.trim() : '';

      if (!content && selectedFiles.length === 0 && !pollEnabled) {
        alert('Please write something, add a photo, or create a poll.');
        return;
      }

      // Validate poll if enabled
      let pollPayload = null;
      if (pollEnabled) {
        const cleaned = pollOptionLabels.map((s) => s.trim()).filter(Boolean);
        if (cleaned.length < 2) {
          alert('A poll needs at least 2 non-empty options.');
          return;
        }
        const lower = cleaned.map((s) => s.toLowerCase());
        if (new Set(lower).size !== lower.length) {
          alert('Poll options must be unique.');
          return;
        }
        const days = parseInt(pollClosesEl?.value, 10);
        let closesAt = null;
        if (Number.isFinite(days) && days > 0) {
          closesAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }
        pollPayload = {
          options: cleaned.map((label) => ({ label })),
          multiSelect: !!pollMultiEl?.checked,
          closesAt
        };
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'POSTING...';

      try {
        const formData = new FormData();
        if (content) {
          formData.append('content', content);
        }
        selectedFiles.forEach((file) => {
          formData.append('media', file);
        });
        if (pollPayload) {
          formData.append('poll', JSON.stringify(pollPayload));
        }

        const res = await api.upload('/api/posts', formData);

        if (res.success) {
          navigate('/home');
        } else {
          alert(res.error?.message || 'Failed to create post.');
        }
      } catch (err) {
        alert('Network error. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'POST';
      }
    });
  }
}
