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

      if (!content && selectedFiles.length === 0) {
        alert('Please write something or add a photo.');
        return;
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
