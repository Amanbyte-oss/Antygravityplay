// Upload video page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Admin Sidebar
  window.Components.injectAdminSidebar('upload');

  // 2. Setup Category Dropdown
  const categorySelect = document.getElementById('category-select');
  if (categorySelect) {
    const categories = window.App.getCategories();
    categorySelect.innerHTML = `
      <option value="" disabled selected>Select category</option>
      ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
  }

  // 3. Setup Drag and Drop Zone
  setupDragAndDrop();

  // 4. Setup Thumbnail Upload
  setupThumbnailUpload();

  // 5. Setup Tag Selection Chips
  const selectedTags = [];
  setupTagsSelector(selectedTags);

  // 6. Setup Form Submission with Progress Bar
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
      videoInput.files = files; // Sync input
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

// Tags Selector with chips
function setupTagsSelector(selectedTags) {
  const selectorWrapper = document.getElementById('tags-chips-wrapper');
  const optionsList = document.getElementById('tags-options-list');
  const allTags = window.App.getTags();

  if (!selectorWrapper || !optionsList) return;

  // Toggle list display
  selectorWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    optionsList.classList.toggle('active');
  });

  // Close dropdown on click outside
  document.addEventListener('click', () => {
    optionsList.classList.remove('active');
  });

  // Populate options
  const renderOptions = () => {
    optionsList.innerHTML = allTags.map(tag => {
      const isSelected = selectedTags.includes(tag.id);
      if (isSelected) return ''; // Hide if already chosen
      return `<div class="tag-option" data-tag-id="${tag.id}">#${tag.name}</div>`;
    }).join('');

    // Bind option click listeners
    optionsList.querySelectorAll('.tag-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagId = opt.dataset.tagId;
        selectedTags.push(tagId);
        renderChips();
        renderOptions();
        optionsList.classList.remove('active');
      });
    });
  };

  const renderChips = () => {
    // Keep the dropdown toggle indicator text placeholder if empty
    const placeholder = selectedTags.length === 0 ? '<span style="color:var(--text-muted); font-size:var(--text-sm)">Click to add tags...</span>' : '';
    
    const chipsHtml = selectedTags.map(tagId => {
      const tag = allTags.find(t => t.id === tagId);
      return `
        <span class="tag-chip">
          #${tag.name}
          <span class="tag-chip-close" data-tag-id="${tagId}">&times;</span>
        </span>
      `;
    }).join('');

    selectorWrapper.innerHTML = placeholder + chipsHtml;

    // Bind remove button listeners
    selectorWrapper.querySelectorAll('.tag-chip-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagId = closeBtn.dataset.tagId;
        const idx = selectedTags.indexOf(tagId);
        if (idx !== -1) {
          selectedTags.splice(idx, 1);
          renderChips();
          renderOptions();
        }
      });
    });
  };

  renderOptions();
  renderChips();
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
    const category = document.getElementById('category-select').value;
    const duration = document.getElementById('duration-input').value.trim() || "5:00";
    const publishToggle = document.getElementById('publish-toggle').checked;
    const thumbnailImg = document.getElementById('thumbnail-preview');
    
    // Checks
    const videoInput = document.getElementById('video-file-input');
    if (videoInput.files.length === 0) {
      window.App.showToast('Please select or drag a video file first.', 'error');
      return;
    }

    if (!title) {
      window.App.showToast('Video title is required.', 'error');
      return;
    }

    if (!category) {
      window.App.showToast('Please choose a video category.', 'error');
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
          category: category,
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
