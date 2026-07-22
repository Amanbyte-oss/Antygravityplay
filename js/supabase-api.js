// ─── SUPABASE API LAYER ───
// Provides Supabase-backed replacements for window.App data functions,
// plus auth, storage, and CRUD operations. Falls back gracefully to
// localStorage/mock data when Supabase is not configured.
// Depends on supabase.js (loaded first).

(function() {

  // ─── HELPERS ───
  function getClient() { return window.__supabase || null; }

  function isOnline() { return getClient() !== null; }

  // In-memory cache for videos to avoid repeated fetches
  let videosCache = null;
  let tagsCache = null;

  // ─── AUTH ───
  window.SupabaseAuth = {
    /** Log in with email + password. Returns { user, error }. */
    async login(email, password) {
      const client = getClient();
      if (!client) return { user: null, error: new Error('Supabase not configured') };
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error };
      return { user: data.user, error: null };
    },

    /** Log out current session. */
    async logout() {
      const client = getClient();
      if (!client) return;
      await client.auth.signOut();
    },

    /** Get current session. Returns { session, error }. */
    async getSession() {
      const client = getClient();
      if (!client) return { session: null, error: null };
      const { data, error } = await client.auth.getSession();
      if (error) return { session: null, error };
      return { session: data.session, error: null };
    },

    /** Listen for auth state changes. Returns unsubscribe function. */
    onAuthChange(callback) {
      const client = getClient();
      if (!client) { callback('SIGNED_OUT', null); return function(){}; }
      const { data: { subscription } } = client.auth.onAuthStateChange(callback);
      return subscription.unsubscribe.bind(subscription);
    },

    /** Check if user is authenticated (client-side). */
    async isAuthenticated() {
      const { session } = await this.getSession();
      return !!session;
    }
  };

  function guessPlatform(url) {
    if (!url) return '';
    var u = url.toLowerCase();
    if (u.indexOf('youtube.com') !== -1 || u.indexOf('youtu.be') !== -1) return 'youtube';
    if (u.indexOf('vimeo.com') !== -1) return 'vimeo';
    if (u.indexOf('dailymotion.com') !== -1) return 'dailymotion';
    return url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'direct' : '';
  }

  function toEmbedUrl(url, plat) {
    if (!url) return '';
    if (plat === 'youtube') {
      var ym = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ym) return 'https://www.youtube.com/embed/' + ym[1];
      if (url.indexOf('youtube.com/embed/') !== -1) return url;
      return '';
    }
    if (plat === 'vimeo') {
      var vm = url.match(/vimeo\.com\/(\d+)/);
      if (vm) return 'https://player.vimeo.com/video/' + vm[1];
      return '';
    }
    if (plat === 'dailymotion') {
      var dm = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
      if (dm) return 'https://www.dailymotion.com/embed/video/' + dm[1];
      return '';
    }
    return url;
  }

  function enrichVideo(row) {
    if (!row) return null;
    var vu = row.video_url || row.videoUrl || '';
    var eu = row.embed_url || row.embedUrl || '';
    var plat = row.platform || row.platformLabel || guessPlatform(eu || vu);
    var platLabel = plat === 'youtube' ? 'YouTube' : plat === 'vimeo' ? 'Vimeo' : plat === 'dailymotion' ? 'Dailymotion' : 'Platform';
    var resolvedEmbed = eu || (plat === 'youtube' || plat === 'vimeo' || plat === 'dailymotion' ? toEmbedUrl(vu, plat) : '');
    var ta = Array.isArray(row.tags) ? row.tags : (row.tags_str ? row.tags_str.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : []);
    return {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      videoUrl: vu,
      thumbnail: row.thumbnail_url || row.thumbnail || '',
      embedUrl: resolvedEmbed,
      platform: plat,
      platformLabel: platLabel,
      views: row.views || 0,
      likes: row.likes || 0,
      tags: ta,
      duration: row.duration || '',
      publishDate: (row.created_at || '').split('T')[0],
      status: row.status || 'published',
      creator: row.creator || 'Administrator'
    };
  }

  // ─── VIDEOS CRUD ───
  window.SupabaseVideos = {

    /** Fetch videos, optionally filtered by tags using .contains() */
    async fetchAll(tagFilter) {
      const client = getClient();
      if (!client) return null;
      var query = client.from('videos').select('*');
      if (tagFilter) {
        query = query.contains('tags', [tagFilter]);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) { console.error('Supabase: fetchAll error', error); return null; }
      var enriched = (data || []).map(enrichVideo);
      if (!tagFilter) videosCache = enriched;
      return enriched;
    },

    /** Fetch a single video by id. */
    async fetchById(id) {
      const client = getClient();
      if (!client) return null;
      const { data, error } = await client
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) { console.error('Supabase: fetchById error', error); return null; }
      return enrichVideo(data);
    },

    async insert(videoObj) {
      const client = getClient();
      if (!client) return null;
      var vu = videoObj.videoUrl || videoObj.video_url || '';
      var vt = Array.isArray(videoObj.tags) ? videoObj.tags : [];
      const row = {
        title: videoObj.title || '',
        description: videoObj.description || '',
        thumbnail_url: videoObj.thumbnail || videoObj.thumbnail_url || '',
        video_url: vu,
        tags: vt
      };
      const { data, error } = await client
        .from('videos')
        .insert(row)
        .select()
        .single();
      if (error) { console.error('Supabase: insert error', error); return null; }
      const enriched = enrichVideo(data);
      if (videosCache) videosCache.unshift(enriched);
      return enriched;
    },

    async update(id, updates) {
      const client = getClient();
      if (!client) return null;
      const clean = {};
      if (updates.title !== undefined) clean.title = updates.title;
      if (updates.description !== undefined) clean.description = updates.description;
      if (updates.thumbnail_url !== undefined) clean.thumbnail_url = updates.thumbnail_url;
      if (updates.video_url !== undefined) clean.video_url = updates.video_url;
      if (updates.tags !== undefined) clean.tags = updates.tags;
      const { data, error } = await client
        .from('videos')
        .update(clean)
        .eq('id', id)
        .select()
        .single();
      if (error) { console.error('Supabase: update error', error); return null; }
      const enriched = enrichVideo(data);
      if (videosCache) {
        const idx = videosCache.findIndex(v => v.id === id);
        if (idx !== -1) videosCache[idx] = enriched;
      }
      return enriched;
    },

    /** Delete a video row by id. Returns true on success. */
    async remove(id) {
      const client = getClient();
      if (!client) return false;
      const { error } = await client
        .from('videos')
        .delete()
        .eq('id', id);
      if (error) { console.error('Supabase: delete error', error); return false; }
      // Update local cache
      if (videosCache) videosCache = videosCache.filter(v => v.id !== id);
      return true;
    },

    /** Delete multiple video rows by ids. */
    async removeMany(ids) {
      const client = getClient();
      if (!client) return false;
      const { error } = await client
        .from('videos')
        .delete()
        .in('id', ids);
      if (error) { console.error('Supabase: removeMany error', error); return false; }
      if (videosCache) videosCache = videosCache.filter(v => !ids.includes(v.id));
      return true;
    },

    /** Get the in-memory cache (fallback to fresh fetch). */
    async getCached() {
      if (videosCache) return videosCache;
      return await this.fetchAll();
    },

    /** Invalidate cache so next fetch hits the server. */
    invalidateCache() { videosCache = null; }
  };

  // ─── STORAGE ───
  window.SupabaseStorage = {

    /** Upload a file to the specified bucket. Returns the public URL or null. */
    async uploadFile(bucket, filePath, file) {
      const client = getClient();
      if (!client) return null;
      const { data, error } = await client
        .storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });
      if (error) {
        console.error('Supabase: uploadFile error', error);
        // Check for common errors
        if (error.message && error.message.includes('quota')) {
          window.App.showToast('Storage quota exceeded. Contact admin.', 'error');
        } else {
          window.App.showToast('Upload failed: ' + error.message, 'error');
        }
        return null;
      }
      // Get the public URL
      const { data: { publicUrl } } = client
        .storage
        .from(bucket)
        .getPublicUrl(filePath);
      return publicUrl;
    },

    /** Delete a file from a bucket. Returns true on success. */
    async deleteFile(bucket, filePath) {
      const client = getClient();
      if (!client) return false;
      const { error } = await client
        .storage
        .from(bucket)
        .remove([filePath]);
      if (error) { console.error('Supabase: deleteFile error', error); return false; }
      return true;
    },

    /** Extract the file path from a public URL for deletion. */
    pathFromUrl(bucket, publicUrl) {
      try {
        const u = new URL(publicUrl);
        const parts = u.pathname.split('/');
        // Path is everything after the bucket name
        const bucketIdx = parts.indexOf(bucket);
        if (bucketIdx === -1) return null;
        return parts.slice(bucketIdx + 1).join('/');
      } catch (_) { return null; }
    }
  };

  // ─── PATCH window.App ───
  // If Supabase is configured, override video data functions so existing
  // admin and frontend code works without modification.

  document.addEventListener('supabase-ready', async function() {
    if (!getClient()) return;

    // Set a global flag
    window.USE_SUPABASE = true;

    // Save originals before any overrides
    const origGetVideos = window.App.getVideos;
    const origSaveVideos = window.App.saveVideos;

    // Preload the video list from Supabase into cache
    await window.SupabaseVideos.fetchAll();

    // If Supabase returned data, cache it to localStorage so ALL browsers
    // see the same data immediately (not mock data) on the very first visit
    if (videosCache && videosCache.length > 0) {
      localStorage.setItem('db-videos', JSON.stringify(videosCache));
      localStorage.setItem('db-videos-version', '2');
    } else if (!videosCache || videosCache.length === 0) {
      // Supabase returned no data — try to use any existing localStorage data
      // to avoid losing user edits. If localStorage is also empty, it will
      // fall back to mock data via origGetVideos().
      var localVids = origGetVideos();
      if (localVids && localVids.length > 0) {
        videosCache = localVids;
      }
    }

    // ─── OVERRIDE: getVideos() ───
    window.App.getVideos = function() {
      if (videosCache) return videosCache;
      return origGetVideos();
    };

    // ─── OVERRIDE: saveVideos() ───
    // Persists to the in-memory cache and localStorage so views/likes/edits
    // are not lost. Individual mutations should also call SupabaseVideos
    // functions for server sync when needed.
    window.App.saveVideos = function(list) {
      videosCache = list;
      localStorage.setItem('db-videos', JSON.stringify(list));
      localStorage.setItem('db-videos-version', '2');
    };

    // ─── OVERRIDE: getTags() ───
    // Derive unique tags from video objects (no separate tags table needed)
    window.App.getTags = function() {
      if (tagsCache) return tagsCache;
      var vids = window.App.getVideos();
      if (!vids || vids.length === 0) return [];
      var seen = {};
      var tags = [];
      vids.forEach(function(v) {
        if (v.tags && Array.isArray(v.tags)) {
          v.tags.forEach(function(t) {
            if (!seen[t]) {
              seen[t] = true;
              tags.push({ id: t, name: t, videoCount: 0 });
            }
          });
        }
      });
      tags.forEach(function(tag) {
        tag.videoCount = vids.filter(function(v) {
          return v.tags && v.tags.includes(tag.id);
        }).length;
      });
      tagsCache = tags;
      return tags;
    };

    window.App.saveTags = function(list) {
      tagsCache = list;
      localStorage.setItem('db-tags', JSON.stringify(list));
    };

    console.log('Supabase: Integration active. Data now served from Supabase.');
  });

})();
