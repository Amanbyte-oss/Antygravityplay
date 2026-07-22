// ============================================================
// Notifications.js - Notifications list with filters, mark-as-read,
// delete, clear all, and pagination
// ============================================================

// This file handles all notification-related functionality for the admin panel
// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {  // Register the DOMContentLoaded callback to boot up the notifications page
  // Inject the admin sidebar, highlighting "notifications" as active
  window.Components.injectAdminSidebar('notifications');  // Call the component injector to render the admin sidebar with "notifications" as the active highlighted page
  // Central state for the notifications page
  const state = {  // Declare the central state object that holds all notifications page data and UI state
    notifications: [],  // Initialize the notifications array as empty; will be populated from server fetch or default data
    currentFilter: 'all',  // Initialize the current filter to 'all'; can be 'all', 'unread', 'read', 'uploads', or 'errors'
    currentPage: 1,  // Start on page 1 for pagination
    itemsPerPage: 10  // Show exactly 10 notifications per page (pagination chunk size)
  };  // End of state object literal declaration
  // If running from file:// protocol, use generated default data
  if (window.location.protocol === 'file:') {  // Check if the page was opened via the file:// protocol (local file system) instead of a web server
    state.notifications = getDefaultNotifications();  // Assign the array of 15 generated sample notification objects to the state
    initNotifications(state);  // Initialize the notifications page with the default sample data
  } else {  // Otherwise, the page is being served from a web server (not file://)
    // Try to fetch notifications.json from the server; fallback to defaults
    fetch('../data/notifications.json')  // Initiate an HTTP GET request to fetch notifications data from the server's JSON file
      .then(r => r.json())  // When the fetch resolves, parse the response body as JSON and return the parsed array
      .catch(() => getDefaultNotifications())  // If the fetch or JSON parsing fails, silently catch the error and return the default generated notifications instead
      .then(data => {  // Handle the resolved data (either from the server or the fallback default data)
        // Ensure the response is an array
        if (!Array.isArray(data)) {  // Guard: verify that the fetched/fallback data is actually a JavaScript array and not some other type
          data = getDefaultNotifications();  // If data is not an array, override it with the default generated notifications
        }  // End of the array validation if block
        state.notifications = data;  // Assign the validated notification array (either server data or defaults) to the state object
        initNotifications(state);  // Initialize and render the notifications page UI using the populated state
      });  // End of the second .then() callback
  }  // End of the if/else protocol check block
  // -------- "Mark All Read" button --------
  var markAllBtn = document.getElementById('mark-all-read-btn');
  if (markAllBtn) markAllBtn.addEventListener('click', () => {  // Attach a click event listener to the "Mark All Read" button element
    // Set every notification's read flag to true
    state.notifications.forEach(n => n.read = true);  // Iterate over every notification in the state array and set its read property to true (marking it as read)
    window.App.showToast('All notifications marked as read.');  // Display a success toast notification confirming the operation
    renderNotifications(state);  // Re-render the notifications list to reflect the updated read/unread states visually
  });  // End of the "Mark All Read" click event listener callback
  // -------- "Clear All" button (with confirmation) --------
  var clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) clearAllBtn.addEventListener('click', () => {  // Attach a click event listener to the "Clear All" button element
    if (state.notifications.length === 0) return;  // Guard: if there are no notifications, exit early and do nothing since there's nothing to clear
    // Show a confirmation modal before deleting all
    window.App.showConfirmModal('Clear All Notifications', 'Are you sure you want to delete all notifications? This cannot be undone.', () => {  // Display a confirmation dialog asking the user to confirm the destructive action
      state.notifications = [];  // Reset the notifications array to empty, effectively deleting all notifications from the state
      window.App.showToast('All notifications cleared.');  // Display a success toast notification confirming that all notifications were deleted
      renderNotifications(state);  // Re-render the notifications list (which will now show the empty state)
    });  // End of the confirmation modal callback
  });  // End of the "Clear All" click event listener callback
  // -------- Filter button listeners --------
  document.querySelectorAll('.notification-filter-btn').forEach(btn => {  // Select all filter button elements and iterate over each one
    btn.addEventListener('click', () => {  // Attach a click event listener to each individual filter button
      // Deactivate all filter buttons, then activate the clicked one
      document.querySelectorAll('.notification-filter-btn').forEach(b => b.classList.remove('active'));  // Loop through every filter button and remove the 'active' CSS class to deactivate them all
      btn.classList.add('active');  // Add the 'active' CSS class to the clicked button to visually indicate it is the currently selected filter
      state.currentFilter = btn.dataset.filter;  // Update the state's filter to the clicked button's data-filter attribute value ('all', 'unread', 'read', 'uploads', or 'errors')
      state.currentPage = 1;  // Reset the pagination back to page 1 whenever the filter changes to avoid showing an empty page
      renderNotifications(state);  // Re-render the notifications list with the newly applied filter
    });  // End of the filter button click event listener callback
  });  // End of the forEach iteration over all filter buttons
});  // End of the DOMContentLoaded event listener callback

// ============================================================
// Generate default sample notifications for demo/offline use
// ============================================================
/**
 * Creates an array of 15 sample notification objects with various types,
 * spread across the last 15 hours, with every 3rd one marked as read.
 * @returns {Array} Array of notification objects
 */
function getDefaultNotifications() {  // Define the function that generates 15 sample notifications for demo or file:// fallback scenarios
  const types = ['upload_success', 'video_deleted', 'error', 'warning', 'info'];  // Declare an array of 5 possible notification type strings used to cycle through for sample data
  const titles = ['System Update', 'New Upload', 'Warning', 'Info Message', 'Error Occurred'];  // Declare an array of 5 sample title strings corresponding to each type
  return Array.from({ length: 15 }, (_, i) => ({  // Create an array of 15 elements using Array.from, then map each index to a notification object and return the resulting array
    id: 'n' + String(i + 1).padStart(3, '0'),  // Generate a padded ID string like "n001", "n002", etc. using the loop index padded to 3 digits
    type: types[i % types.length],  // Assign a type by cycling through the types array using the modulo operator to wrap around
    title: titles[i % titles.length],  // Assign a title by cycling through the titles array using the modulo operator to wrap around
    message: 'This is a sample notification message for demonstration purposes.',  // Assign a static sample message string to every notification
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),  // Create a timestamp by subtracting i hours from the current time, formatted as an ISO string (each notification is 1 hour apart)
    read: i % 3 === 0  // Mark every 3rd notification as read (indices 0, 3, 6, 9, 12) and the rest as unread
  }));  // End of Array.from() callback and return statement
}  // End of getDefaultNotifications function definition

// ============================================================
// Initialize notifications (currently just delegates to render)
// ============================================================
/**
 * Sets up the notifications page. Currently just calls render.
 * @param {Object} state - The notifications state object
 */
function initNotifications(state) {  // Define the initialization function that sets up the notifications page with the given state object
  renderNotifications(state);  // Delegate to the renderNotifications function to apply the filter, paginate, and draw the notification list in the DOM
}  // End of initNotifications function definition

// ============================================================
// Main render function: filter, paginate, and display notifications
// ============================================================
/**
 * Applies the current filter, paginates the results, renders the
 * notification list items, and sets up event handlers for toggle-read
 * and delete actions on each item. Also renders pagination controls.
 * @param {Object} state - The notifications state object
 */
function renderNotifications(state) {  // Define the main render function that filters, paginates, and draws the notification list and pagination controls
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  // DOM element references
  const list = document.getElementById('notifications-list');  // Get the DOM element that serves as the container for the notification item list
  const empty = document.getElementById('notifications-empty');  // Get the DOM element that displays the "no notifications" empty state message
  const paginationWrapper = document.getElementById('pagination-wrapper');  // Get the DOM element that wraps the pagination controls (prev/next, page numbers)
  // Step 1: Apply the current filter to the full notifications array
  let filtered = [...state.notifications];  // Create a shallow copy of the full notifications array so we don't mutate the original during filtering
  if (state.currentFilter === 'unread') filtered = filtered.filter(n => !n.read);  // If filter is 'unread', keep only notifications where read is false (unread)
  else if (state.currentFilter === 'read') filtered = filtered.filter(n => n.read);  // If filter is 'read', keep only notifications where read is true (already read)
  else if (state.currentFilter === 'uploads') filtered = filtered.filter(n => n.type === 'upload_success');  // If filter is 'uploads', keep only notifications with type 'upload_success'
  else if (state.currentFilter === 'errors') filtered = filtered.filter(n => n.type === 'error' || n.type === 'warning');  // If filter is 'errors', keep only notifications with type 'error' or 'warning'
  // Step 2: Paginate the filtered results
  const totalItems = filtered.length;  // Calculate the total number of items remaining after filtering
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;  // Calculate the total number of pages needed, defaulting to 1 if there are zero items
  if (state.currentPage > totalPages) state.currentPage = totalPages;  // Clamp the current page number so it doesn't exceed the total number of available pages
  const startIdx = (state.currentPage - 1) * state.itemsPerPage;  // Calculate the starting index for slicing the filtered array for the current page
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);  // Slice the filtered array to get only the items that belong on the current page
  // Step 3: Handle empty state (no items match the current filter)
  if (pageItems.length === 0) {  // Check if the current page has no items (either no notifications at all or none match the current filter)
    list.innerHTML = '';  // Clear the notification list container by setting its innerHTML to an empty string
    empty.style.display = 'block';  // Show the empty state message by setting its CSS display property to 'block'
    if (paginationWrapper) paginationWrapper.innerHTML = '';  // If the pagination wrapper exists, clear its content to hide the pagination controls
    return;  // Exit the function early since there are no items to render in the list
  }  // End of the empty state handling block
  empty.style.display = 'none';  // Hide the empty state message since we have items to display
  // Step 4: Generate HTML for each notification item
  list.innerHTML = pageItems.map(n => {  // Map each notification object on the current page to an HTML string, then join them and set as the list container's innerHTML
    const timeAgo = getTimeAgo(n.timestamp);  // Call getTimeAgo to convert the notification's ISO timestamp into a human-readable relative time string (e.g., "5 min ago")
    const icon = getNotificationIcon(n.type);  // Call getNotificationIcon to get the appropriate SVG icon HTML string based on the notification's type
    const readClass = n.read ? 'read' : 'unread';  // Determine the CSS class: 'read' if the notification's read flag is true, otherwise 'unread' for visual styling
    return `  // Return the HTML template string for a single notification list item using a template literal for dynamic values
      <div class="notification-item ${readClass}" data-id="${n.id}">  // Render the outer notification item div with dynamic class (read/unread) and data-id attribute for identification
        <div class="notification-icon ${esc(n.type)}">${icon}</div>  // Render the notification icon div with the type-specific CSS class and the SVG icon HTML embedded inside
        <div class="notification-content">  // Begin the notification content area containing the header and message
          <div class="notification-header">  // Begin the notification header row that holds the title and timestamp side by side
            <span class="notification-title">${esc(n.title)}</span>  // Render the notification title inside a span with the appropriate CSS class
            <span class="notification-time">${timeAgo}</span>  // Render the human-readable relative time string inside a span
          </div>  // End of the notification header row
          <div class="notification-message">${esc(n.message)}</div>  // Render the notification message text inside a div
        </div>  // End of the notification content area
        <!-- Unread indicator dot (only visible for unread items) -->  // HTML comment indicating the purpose of the unread dot element
        <div class="notification-unread-dot"></div>  // Render the unread indicator dot that is visually shown when the notification is marked as unread
        <!-- Delete button -->  // HTML comment indicating the delete button that follows
        <button class="notification-delete-btn" data-id="${n.id}" aria-label="Delete notification">  // Render the delete button with the notification's ID in a data attribute and an accessibility label
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">  // Begin the SVG inline graphic for the X (close/delete) icon
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>  // Draw two diagonal lines forming an X shape for the delete icon
          </svg>  // End of the delete icon SVG
        </button>  // End of the delete button element
      </div>  // End of the outer notification item div
    `;  // End of the template literal for a single notification item
  }).join('');  // End of the map() call; join all the HTML strings into one continuous string for assignment to innerHTML
  // Step 5: Attach click-to-toggle-read handler on each notification item
  list.querySelectorAll('.notification-item').forEach(item => {  // Select all rendered notification item divs and iterate over each one
    item.addEventListener('click', (e) => {  // Attach a click event listener to each notification item for toggling the read/unread state
      // Ignore clicks on the delete button (handled separately)
      if (e.target.closest('.notification-delete-btn')) return;  // Guard: if the click target is inside a delete button, exit early since deletion is handled by a separate handler
      const id = item.dataset.id;  // Get the notification's unique ID from the data-id attribute of the clicked item
      const n = state.notifications.find(not => not.id === id);  // Find the corresponding notification object in the full state array by matching the ID
      if (n) {  // Check if a notification with that ID was actually found in the state array (defensive check)
        n.read = !n.read;  // Toggle the notification's read flag to the opposite of its current value (true becomes false, false becomes true)
        renderNotifications(state);  // Re-render the entire notifications list to reflect the toggled read/unread state visually
      }  // End of the if block checking that the notification object exists
    });  // End of the click event listener callback for toggling read state
  });  // End of the forEach iteration over notification items
  // Step 6: Attach delete handler on each delete button
  list.querySelectorAll('.notification-delete-btn').forEach(btn => {  // Select all rendered delete buttons and iterate over each one
    btn.addEventListener('click', (e) => {  // Attach a click event listener to each delete button to handle notification deletion
      e.stopPropagation();  // Stop the click event from bubbling up to the parent notification item, preventing the toggle-read handler from also firing
      const id = btn.dataset.id;  // Get the notification's unique ID from the data-id attribute of the delete button
      // Remove the notification from the array
      state.notifications = state.notifications.filter(n => n.id !== id);  // Filter out the notification with the matching ID from the full state array, effectively deleting it
      window.App.showToast('Notification deleted.');  // Display a toast notification confirming the deletion
      renderNotifications(state);  // Re-render the notifications list to reflect the removal
    });  // End of the delete button click event listener callback
  });  // End of the forEach iteration over delete buttons
  // Step 7: Render pagination controls
  renderPagination(state, totalItems, totalPages);  // Call the renderPagination function to build and inject the pagination UI (prev/next, page numbers, summary)
}  // End of renderNotifications function definition

// ============================================================
// Render pagination controls for notifications
// ============================================================
/**
 * Builds the pagination UI (prev/next buttons, page numbers, "Showing X-Y of Z").
 * @param {Object} state       - The notifications state object
 * @param {number} totalItems  - Total filtered items count
 * @param {number} totalPages  - Total number of pages
 */
function renderPagination(state, totalItems, totalPages) {  // Define the pagination render function that builds and injects the HTML for page navigation controls
  const wrapper = document.getElementById('pagination-wrapper');  // Get the DOM element that serves as the container for all pagination controls
  if (!wrapper) return;  // Guard: if the pagination wrapper element does not exist in the DOM, exit the function early to avoid errors
  if (totalItems === 0) { wrapper.innerHTML = ''; return; }  // If there are no items total, clear the wrapper content and exit early since there's nothing to paginate
  // Calculate start and end item indices for display
  const startIdx = (state.currentPage - 1) * state.itemsPerPage + 1;  // Calculate the 1-based start index of the current page for the "Showing X-Y of Z" display
  let endIdx = state.currentPage * state.itemsPerPage;  // Calculate the naive end index of the current page by multiplying the page number by the items per page
  if (endIdx > totalItems) endIdx = totalItems;  // Clamp the end index to not exceed the total number of items (last page may have fewer items)
  // Build page number buttons
  let pageBtns = '';  // Initialize an empty string that will accumulate the HTML for each page number button
  for (let i = 1; i <= totalPages; i++) {  // Loop from page 1 to the total number of pages to generate a button for each page
    pageBtns += `<button class="pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;  // Append a page button HTML string; add 'active' class if this loop index matches the current page
  }  // End of the page button generation loop
  // Inject pagination HTML
  wrapper.innerHTML = `  // Set the wrapper's innerHTML to the complete pagination UI HTML template using a template literal
    <div class="pagination-container">  // Begin the outer pagination container div
      <div>Showing <span style="font-weight:600;color:var(--text-primary);">${startIdx}-${endIdx}</span> of <span style="font-weight:600;color:var(--text-primary);">${totalItems}</span></div>  // Render the "Showing X-Y of Z" summary with bold styling for the dynamic numbers
      <div class="pagination-controls">  // Begin the pagination controls row that holds the prev/next buttons and page number buttons
        <button class="pagination-btn ${state.currentPage === 1 ? 'disabled' : ''}" id="notif-prev">&larr;</button>  // Render the "previous page" button; add 'disabled' class if on page 1, and assign a specific ID for event binding
        ${pageBtns}  // Inject the dynamically generated page number buttons HTML into the controls row
        <button class="pagination-btn ${state.currentPage === totalPages ? 'disabled' : ''}" id="notif-next">&rarr;</button>  // Render the "next page" button; add 'disabled' class if on the last page, and assign a specific ID for event binding
      </div>  // End of the pagination controls row
    </div>  // End of the outer pagination container div
  `;  // End of the pagination HTML template literal
  // Attach click handlers to prev/next/page buttons
  if (state.currentPage > 1) {  // Check if the current page is greater than 1 (previous page navigation is only possible if we are not on the first page)
    var notifPrev = document.getElementById('notif-prev');
    if (notifPrev) notifPrev.addEventListener('click', () => {  // Attach a click listener to the "previous page" button by its element ID
      state.currentPage--;  // Decrement the current page number by 1 to navigate to the previous page
      renderNotifications(state);  // Re-render the notifications list to show the previous page's content
    });  // End of the previous page button click listener callback
  }  // End of the previous page condition block
  if (state.currentPage < totalPages) {  // Check if the current page is less than the total pages (next page navigation is only possible if we are not on the last page)
    var notifNext = document.getElementById('notif-next');
    if (notifNext) notifNext.addEventListener('click', () => {  // Attach a click listener to the "next page" button by its element ID
      state.currentPage++;  // Increment the current page number by 1 to navigate to the next page
      renderNotifications(state);  // Re-render the notifications list to show the next page's content
    });  // End of the next page button click listener callback
  }  // End of the next page condition block
  wrapper.querySelectorAll('[data-page]').forEach(btn => {  // Select all elements that have a data-page attribute (the page number buttons) and iterate over each one
    btn.addEventListener('click', () => {  // Attach a click listener to each page number button
      state.currentPage = Number(btn.dataset.page);  // Set the current page number to the parsed integer value of the clicked button's data-page attribute
      renderNotifications(state);  // Re-render the notifications list to show the chosen page's content
    });  // End of the page number button click listener callback
  });  // End of the forEach iteration over page number buttons
}  // End of renderPagination function definition

// ============================================================
// Get the SVG icon HTML for a given notification type
// ============================================================
/**
 * Returns the SVG markup for the given notification type's icon.
 * Falls back to the "info" icon if the type is unknown.
 * @param {string} type - Notification type string
 * @returns {string} SVG HTML string
 */
function getNotificationIcon(type) {  // Define the function that returns the appropriate SVG icon HTML string based on the notification's type
  const icons = {  // Declare an object literal mapping each notification type string to its corresponding SVG icon HTML
    upload_success: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',  // Define an upload/arrow SVG icon for upload_success type notifications
    video_deleted: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',  // Define a trash/delete SVG icon for video_deleted type notifications
    error: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',  // Define an X-in-circle SVG icon for error type notifications
    warning: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',  // Define a triangle-exclamation SVG icon for warning type notifications
    info: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'  // Define an info-circle SVG icon for info type notifications
  };  // End of the icons object literal
  return icons[type] || icons.info;  // Look up the icon HTML by the provided type string; if not found, fall back to the info icon as a default
}  // End of getNotificationIcon function definition

// ============================================================
// Convert a timestamp to a human-readable relative time string
// ============================================================
/**
 * Calculates how long ago a timestamp was and returns a friendly string.
 * e.g., "Just now", "5 min ago", "3h ago", "2d ago", or a full date.
 * @param {string} timestamp - ISO date string
 * @returns {string} Human-readable relative time
 */
function getTimeAgo(timestamp) {  // Define the function that converts an ISO timestamp string into a human-readable relative time description
  const now = new Date();  // Create a new Date object representing the current moment in time
  const date = new Date(timestamp);  // Parse the provided ISO timestamp string into a Date object
  const diffMs = now - date;  // Calculate the difference between now and the notification timestamp in milliseconds
  const diffMins = Math.floor(diffMs / 60000);  // Convert the millisecond difference into minutes by dividing by 60000 and rounding down
  if (diffMins < 1) return 'Just now';  // If less than 1 minute has passed, return the string "Just now"
  if (diffMins < 60) return diffMins + ' min ago';  // If less than 60 minutes have passed, return the number of minutes followed by " min ago"
  const diffHours = Math.floor(diffMins / 60);  // Calculate how many whole hours have passed by dividing minutes by 60 and rounding down
  if (diffHours < 24) return diffHours + 'h ago';  // If less than 24 hours have passed, return the number of hours followed by "h ago"
  const diffDays = Math.floor(diffHours / 24);  // Calculate how many whole days have passed by dividing hours by 24 and rounding down
  if (diffDays < 7) return diffDays + 'd ago';  // If less than 7 days have passed, return the number of days followed by "d ago"
  // Older than 7 days: show the full date
  return date.toLocaleDateString();  // For notifications older than 7 days, return the full localized date string instead of a relative time
}  // End of getTimeAgo function definition
