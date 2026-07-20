document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('notifications');

  const state = {
    notifications: [],
    currentFilter: 'all',
    currentPage: 1,
    itemsPerPage: 10
  };

  if (window.location.protocol === 'file:') {
    state.notifications = getDefaultNotifications();
    initNotifications(state);
  } else {
    fetch('../data/notifications.json')
      .then(r => r.json())
      .catch(() => getDefaultNotifications())
      .then(data => {
        if (!Array.isArray(data)) {
          data = getDefaultNotifications();
        }
        state.notifications = data;
        initNotifications(state);
      });
  }

  document.getElementById('mark-all-read-btn').addEventListener('click', () => {
    state.notifications.forEach(n => n.read = true);
    window.App.showToast('All notifications marked as read.');
    renderNotifications(state);
  });

  document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (state.notifications.length === 0) return;
    window.App.showConfirmModal('Clear All Notifications', 'Are you sure you want to delete all notifications? This cannot be undone.', () => {
      state.notifications = [];
      window.App.showToast('All notifications cleared.');
      renderNotifications(state);
    });
  });

  document.querySelectorAll('.notification-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.notification-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      state.currentPage = 1;
      renderNotifications(state);
    });
  });
});

function getDefaultNotifications() {
  const types = ['upload_success', 'video_deleted', 'error', 'warning', 'info'];
  const titles = ['System Update', 'New Upload', 'Warning', 'Info Message', 'Error Occurred'];
  return Array.from({ length: 15 }, (_, i) => ({
    id: 'n' + String(i + 1).padStart(3, '0'),
    type: types[i % types.length],
    title: titles[i % titles.length],
    message: 'This is a sample notification message for demonstration purposes.',
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    read: i % 3 === 0
  }));
}

function initNotifications(state) {
  renderNotifications(state);
}

function renderNotifications(state) {
  const list = document.getElementById('notifications-list');
  const empty = document.getElementById('notifications-empty');
  const paginationWrapper = document.getElementById('pagination-wrapper');

  let filtered = [...state.notifications];
  if (state.currentFilter === 'unread') filtered = filtered.filter(n => !n.read);
  else if (state.currentFilter === 'read') filtered = filtered.filter(n => n.read);
  else if (state.currentFilter === 'uploads') filtered = filtered.filter(n => n.type === 'upload_success');
  else if (state.currentFilter === 'errors') filtered = filtered.filter(n => n.type === 'error' || n.type === 'warning');

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  const startIdx = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);

  if (pageItems.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    if (paginationWrapper) paginationWrapper.innerHTML = '';
    return;
  }

  empty.style.display = 'none';

  list.innerHTML = pageItems.map(n => {
    const timeAgo = getTimeAgo(n.timestamp);
    const icon = getNotificationIcon(n.type);
    const readClass = n.read ? 'read' : 'unread';
    return `
      <div class="notification-item ${readClass}" data-id="${n.id}">
        <div class="notification-icon ${n.type}">${icon}</div>
        <div class="notification-content">
          <div class="notification-header">
            <span class="notification-title">${n.title}</span>
            <span class="notification-time">${timeAgo}</span>
          </div>
          <div class="notification-message">${n.message}</div>
        </div>
        <div class="notification-unread-dot"></div>
        <button class="notification-delete-btn" data-id="${n.id}" aria-label="Delete notification">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.notification-delete-btn')) return;
      const id = item.dataset.id;
      const n = state.notifications.find(not => not.id === id);
      if (n) {
        n.read = !n.read;
        renderNotifications(state);
      }
    });
  });

  list.querySelectorAll('.notification-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      state.notifications = state.notifications.filter(n => n.id !== id);
      window.App.showToast('Notification deleted.');
      renderNotifications(state);
    });
  });

  renderPagination(state, totalItems, totalPages);
}

function renderPagination(state, totalItems, totalPages) {
  const wrapper = document.getElementById('pagination-wrapper');
  if (!wrapper) return;
  if (totalItems === 0) { wrapper.innerHTML = ''; return; }

  const startIdx = (state.currentPage - 1) * state.itemsPerPage + 1;
  let endIdx = state.currentPage * state.itemsPerPage;
  if (endIdx > totalItems) endIdx = totalItems;

  let pageBtns = '';
  for (let i = 1; i <= totalPages; i++) {
    pageBtns += `<button class="pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  wrapper.innerHTML = `
    <div class="pagination-container">
      <div>Showing <span style="font-weight:600;color:var(--text-primary);">${startIdx}-${endIdx}</span> of <span style="font-weight:600;color:var(--text-primary);">${totalItems}</span></div>
      <div class="pagination-controls">
        <button class="pagination-btn ${state.currentPage === 1 ? 'disabled' : ''}" id="notif-prev">&larr;</button>
        ${pageBtns}
        <button class="pagination-btn ${state.currentPage === totalPages ? 'disabled' : ''}" id="notif-next">&rarr;</button>
      </div>
    </div>
  `;

  if (state.currentPage > 1) {
    document.getElementById('notif-prev').addEventListener('click', () => {
      state.currentPage--;
      renderNotifications(state);
    });
  }
  if (state.currentPage < totalPages) {
    document.getElementById('notif-next').addEventListener('click', () => {
      state.currentPage++;
      renderNotifications(state);
    });
  }
  wrapper.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = Number(btn.dataset.page);
      renderNotifications(state);
    });
  });
}

function getNotificationIcon(type) {
  const icons = {
    upload_success: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
    video_deleted: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    error: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };
  return icons[type] || icons.info;
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + 'h ago';
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return diffDays + 'd ago';
  return date.toLocaleDateString();
}
