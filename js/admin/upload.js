// Upload video page logic
let _hasDroppedFile = false;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Admin Sidebar
  window.Components.injectAdminSidebar('upload');

  // 2. Setup Tag System (Existing checkable pills + custom tag creator)
  const selectedTags = [];
  const TAG_COLORS = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
  
  setupExistingTags(selectedTags);
  setupCustomTagCreator(selectedTags);

  // 3. Setup Drag and Drop Zone
  setupDragAndDrop();

  // 4. Setup Thumbnail Upload
  setupThumbnailUpload();

  // 5. Setup Form Submission with Progress Bar
  setupFormSubmission(selectedTags);
});

// Drag and drop setup
function setupDragAndDrop() {
  const dropzone = document.getElementById('dropzone');
  const videoInput = document.getElementById('video-file-input');
  const fileBanner = document.getElementById('file-banner');
  const fileNameSpan = document.getElementById('file-name-span');
  const fileRemoveBtn = document.getElementById('file-remove-btn');

  if (!dropzone || !videoInput) return;

  // Open file dialog on dropzone click
  dropzone.addEventListener('click', () => {
    videoInput.click();
  });

  // Handle file select
  videoInput.addEventListener('change', () => {
    if (videoInput.files.length > 0) {
      _hasDroppedFile = false;
      handleFileSelected(videoInput.files[0].name);
    }
  });

  // Drag listeners
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      _hasDroppedFile = true;
      handleFileSelected(files[0].name);
    }
  });

  function handleFileSelected(name) {
    fileNameSpan.innerText = name;
    fileBanner.classList.add('active');
    dropzone.style.display = 'none';
  }

  // Remove selected file
  if (fileRemoveBtn) {
    fileRemoveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      videoInput.value = '';
      _hasDroppedFile = false;
      fileBanner.classList.remove('active');
      dropzone.style.display = 'flex';
    });
  }
}

// Thumbnail visual uploader preview
function setupThumbnailUpload() {
  const thumbInput = document.getElementById('thumbnail-file-input');
  const thumbBox = document.getElementById('thumbnail-box');
  const thumbPreview = document.getElementById('thumbnail-preview');
  const thumbPlaceholder = document.getElementById('thumbnail-placeholder');

  if (!thumbBox || !thumbInput) return;

  thumbBox.addEventListener('click', () => {
    thumbInput.click();
  });

  thumbInput.addEventListener('change', () => {
    if (thumbInput.files.length > 0) {
      const file = thumbInput.files[0];
      const reader = new FileReader();

      reader.onload = function(e) {
        thumbPreview.src = e.target.result;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
      };

      reader.readAsDataURL(file);
    }
  });
}

// Compute real video count per tag
function getTagVideoCount(tagId) {
  const videos = window.App.getVideos();
  return videos.reduce((c, v) => c + ((v.tags || []).includes(tagId) ? 1 : 0), 0);
}

// Render existing tags HTML (no listeners attached)
function renderExistingTags(selectedTags) {
  const container = document.getElementById('existing-tags-container');
  if (!container) return;
  const allTags = window.App.getTags();
  container.innerHTML = allTags.map(tag => {
    const isSelected = selectedTags.includes(tag.id);
    return `
      <button type="button" class="tag-checkable-pill ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border-radius:9999px; font-size:var(--text-xs); font-weight:500; border:1px solid ${tag.color}; background-color:${isSelected ? tag.color : 'transparent'}; color:${isSelected ? '#fff' : 'inherit'}; cursor:pointer; transition:all var(--transition-fast);">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${tag.color};"></span>
        ${tag.name}
        <span style="opacity:0.6; font-size:10px;">(${getTagVideoCount(tag.id)})</span>
      </button>
    `;
  }).join('');
}

// Setup existing tags as checkable pills
function setupExistingTags(selectedTags) {
  const container = document.getElementById('existing-tags-container');
  if (!container) return;

  renderExistingTags(selectedTags);

  // Delegate click on container (listener added once)
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-checkable-pill');
    if (!btn) return;

    const tagId = btn.dataset.tagId;
    const idx = selectedTags.indexOf(tagId);

    if (idx !== -1) {
      selectedTags.splice(idx, 1);
    } else {
      if (selectedTags.length >= 10) {
        window.App.showToast('Maximum 10 tags per video.', 'error');
        return;
      }
      selectedTags.push(tagId);
    }

    renderExistingTags(selectedTags);
    renderSelectedChips(selectedTags);
  });
}

// Setup custom tag creator
function setupCustomTagCreator(selectedTags) {
  const input = document.getElementById('custom-tag-input');
  const addBtn = document.getElementById('add-custom-tag-btn');
  if (!input) return;

  const addCustomTag = () => {
    const name = input.value.trim();
    if (!name) return;

    if (selectedTags.length >= 10) {
      window.App.showToast('Maximum 10 tags per video.', 'error');
      return;
    }

    // Check for duplicates (case-insensitive)
    const allTags = window.App.getTags();
    const existingTag = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    
    if (existingTag) {
      // Use existing tag
      if (selectedTags.includes(existingTag.id)) {
        window.App.showToast('Tag already selected.', 'error');
        input.value = '';
        return;
      }
      selectedTags.push(existingTag.id);
    } else {
      // Create new tag
      const newId = 'tag-' + Date.now();
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const newTag = { id: newId, name: name, color: color, usageCount: 0 };
      
      allTags.push(newTag);
      window.App.saveTags(allTags);
      selectedTags.push(newId);
      
      // Re-render existing tags (no listener re-attach)
      renderExistingTags(selectedTags);
    }

    input.value = '';
    renderSelectedChips(selectedTags);
    window.App.showToast(`Tag "${name}" added.`);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  });

  if (addBtn) {
    addBtn.addEventListener('click', addCustomTag);
  }
}

// Render selected tag chips
function renderSelectedChips(selectedTags) {
  const display = document.getElementById('selected-tags-display');
  const countEl = document.getElementById('selected-tags-count');
  if (!display) return;
  
  if (countEl) countEl.innerText = selectedTags.length;

  if (selectedTags.length === 0) {
    display.innerHTML = '<span style="color:var(--text-muted); font-size:var(--text-sm);">No tags selected</span>';
    return;
  }

  const allTags = window.App.getTags();
  display.innerHTML = selectedTags.map(tagId => {
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) return '';
    return `
      <span class="tag-chip" style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:9999px; font-size:var(--text-xs); font-weight:500; background-color:${tag.color}20; border:1px solid ${tag.color};">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${tag.color};"></span>
        ${tag.name}
        <span class="tag-chip-remove" data-tag-id="${tagId}" style="cursor:pointer; margin-left:2px; opacity:0.7; font-size:14px; line-height:1;">&times;</span>
      </span>
    `;
  }).join('');

  // Bind remove buttons
  display.querySelectorAll('.tag-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagId = btn.dataset.tagId;
      const idx = selectedTags.indexOf(tagId);
      if (idx !== -1) {
        selectedTags.splice(idx, 1);
        renderSelectedChips(selectedTags);
        renderExistingTags(selectedTags);
      }
    });
  });
}

// Form Validation and Simulated Progress Bar Upload
function setupFormSubmission(selectedTags) {
  const form = document.getElementById('upload-video-form');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Fields
    const title = document.getElementById('title-input').value.trim();
    const description = document.getElementById('description-input').value.trim();
    const duration = document.getElementById('duration-input').value.trim() || "5:00";
    const publishToggle = document.getElementById('publish-toggle').checked;
    const thumbnailImg = document.getElementById('thumbnail-preview');
    
    // Checks
    const videoInput = document.getElementById('video-file-input');
    if (!_hasDroppedFile && videoInput.files.length === 0) {
      window.App.showToast('Please select or drag a video file first.', 'error');
      return;
    }

    if (!title) {
      window.App.showToast('Video title is required.', 'error');
      return;
    }

    if (selectedTags.length === 0) {
      window.App.showToast('Please select or create at least one tag.', 'error');
      return;
    }

    // Default placeholder thumbnail if none uploaded
    const thumbnailSrc = thumbnailImg.style.display === 'block' 
      ? thumbnailImg.src 
      : 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&auto=format&fit=crop';

    // Disable form submissions
    submitBtn.disabled = true;
    progressContainer.classList.add('active');

    // Run simulated upload
    let progress = 0;
    progressFill.style.width = '0%';
    progressPercent.innerText = '0%';

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        // Perform DB Insert
        const dbVideos = window.App.getVideos();
        const nextId = 'vid-' + (dbVideos.length + 1).toString().padStart(2, '0');
        
        const newVideoObj = {
          id: nextId,
          title: title,
          description: description,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Fallback URL
          thumbnail: thumbnailSrc,
          views: 0,
          likes: 0,
          tags: [...selectedTags],
          duration: duration,
          publishDate: new Date().toISOString().split('T')[0],
          status: publishToggle ? 'published' : 'draft',
          creator: 'Administrator'
        };

        dbVideos.push(newVideoObj);
        window.App.saveVideos(dbVideos);

        window.App.showToast('Video uploaded successfully!', 'success');

        // Redirect to videos management
        setTimeout(() => {
          window.location.href = './videos.html';
        }, 1000);
      }
      progressFill.style.width = `${progress}%`;
      progressPercent.innerText = `${progress}%`;
    }, 150);
  });
}
