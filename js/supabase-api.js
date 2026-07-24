(function() {
  function getClient() { return window.__supabase || null; }
  function isOnline() { return getClient() !== null; }
  let videosCache = null;
  let tagsCache = null;

  window.SupabaseAuth = {
    async login(email, password) {
      var client = getClient();
      if (!client) return { user: null, error: new Error('Supabase not configured') };
      var { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error };
      return { user: data.user, error: null };
    },
    async logout() {
      var client = getClient();
      if (!client) return;
      await client.auth.signOut();
    },
    async getSession() {
      var client = getClient();
      if (!client) return { session: null, error: null };
      var { data, error } = await client.auth.getSession();
      if (error) return { session: null, error };
      return { session: data.session, error: null };
    },
    onAuthChange(callback) {
      var client = getClient();
      if (!client) { callback('SIGNED_OUT', null); return function(){}; }
      var { data: { subscription } } = client.auth.onAuthStateChange(callback);
      return subscription.unsubscribe.bind(subscription);
    },
    async isAuthenticated() {
      var { session } = await this.getSession();
      return !!session;
    }
  };

  function enrichVideo(row) {
    if (!row) return null;
    var vs = row.video_source || row.platform || '';
    var eu = row.external_url || row.video_url || '';
    var ec = row.embed_code || row.embed_url || '';
    var tags = Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : (row.tags_str ? row.tags_str.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : []));
    var label = vs === 'youtube' ? 'YouTube' : vs === 'vimeo' ? 'Vimeo' : vs === 'dailymotion' ? 'Dailymotion' : vs === 'streamable' ? 'Streamable' : vs === 'cloudflare' ? 'Cloudflare' : vs === 'peertube' ? 'PeerTube' : vs === 'wistia' ? 'Wistia' : vs === 'abyss' ? 'Abyss.to' : vs === 'pornhub' ? 'Pornhub' : vs === 'googledrive' ? 'Google Drive' : vs === 'screenpal' ? 'ScreenPal' : vs === 'dropbox' ? 'Dropbox' : vs === 'onedrive' ? 'OneDrive' : vs === 'embed' ? 'Embed' : vs === 'upload' ? 'Upload' : vs === 'direct' ? 'Direct URL' : 'Platform';
    var thumb = row.thumbnail_url || row.thumbnail || '';
    return {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      video_source: vs,
      external_url: eu,
      videoUrl: eu || row.videoUrl || row.video_url || row.embed_url || '',
      embed_code: ec,
      thumbnail: thumb,
      views: row.views || 0,
      likes: row.likes || 0,
      reactions: row.reactions || 0,
      tags: tags,
      duration: row.duration || '',
      publishDate: (row.created_at || '').split('T')[0],
      status: row.status || 'published',
      creator: row.creator || 'Administrator'
    };
  }

  window.SupabaseVideos = {
    lastInsertError: null,
    async fetchAll(tagFilter) {
      if (!window.__SUPABASE_URL) return null;
      try {
        var url = window.__SUPABASE_URL + '/rest/v1/videos?select=*&order=created_at.desc';
        if (tagFilter) url += '&tags=cs.%7B' + encodeURIComponent(tagFilter) + '%7D';
        var r = await fetch(url, {
          headers: { 'apikey': window.__SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + window.__SUPABASE_ANON_KEY }
        });
        if (!r.ok) {
          console.error('fetchAll HTTP ' + r.status);
          return null;
        }
        var data = await r.json();
        var enriched = (data || []).map(enrichVideo);
        if (!tagFilter) videosCache = enriched;
        return enriched;
      } catch(e) {
        console.error('fetchAll error', e);
        return null;
      }
    },
    async fetchById(id) {
      if (!window.__SUPABASE_URL) return null;
      try {
        var r = await fetch(window.__SUPABASE_URL + '/rest/v1/videos?id=eq.' + encodeURIComponent(id) + '&select=*', {
          headers: { 'apikey': window.__SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + window.__SUPABASE_ANON_KEY }
        });
        if (!r.ok) return null;
        var data = await r.json();
        if (data && data.length > 0) return enrichVideo(data[0]);
        return null;
      } catch(e) { console.error('fetchById error', e); return null; }
    },
    async insert(dataObj) {
      if (!window.__SUPABASE_URL) return null;
      var baseUrl = window.__SUPABASE_URL;
      var anonKey = window.__SUPABASE_ANON_KEY;

      async function restInsert(row, label) {
        try {
          var r = await fetch(baseUrl + '/rest/v1/videos', {
            method: 'POST',
            headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(row)
          });
          if (!r.ok) {
            var errText = await r.text().catch(function(){ return ''; });
            return { error: { message: label + ': HTTP ' + r.status + ' ' + errText } };
          }
          var data = await r.json();
          if (data && data.length > 0) {
            var enriched = enrichVideo(data[0]);
            if (videosCache) videosCache.unshift(enriched);
            window.SupabaseVideos.lastInsertError = null;
            return { success: enriched };
          }
          return { error: { message: label + ': empty response' } };
        } catch(e) {
          return { error: { message: label + ': ' + e.message } };
        }
      }

      var rowNew = {
        title: dataObj.title || '',
        description: dataObj.description || '',
        video_source: dataObj.video_source || '',
        external_url: dataObj.external_url || '',
        embed_code: dataObj.embed_code || '',
        thumbnail_url: dataObj.thumbnail || dataObj.thumbnail_url || '',
        tags: Array.isArray(dataObj.tags) ? dataObj.tags : [],
        duration: dataObj.duration || '',
        status: dataObj.status || 'published',
        creator: dataObj.creator || 'Administrator',
        views: 0, likes: 0, reactions: 0
      };
      var r1 = await restInsert(rowNew, 'new schema');
      if (r1.success) return r1.success;
      var err1 = r1.error;

      var rowOld = {
        title: dataObj.title || '',
        description: dataObj.description || '',
        video_url: dataObj.external_url || dataObj.videoUrl || '',
        embed_url: dataObj.embed_code || '',
        platform: dataObj.video_source || '',
        thumbnail_url: dataObj.thumbnail || dataObj.thumbnail_url || '',
        tags: Array.isArray(dataObj.tags) ? dataObj.tags : [],
        duration: dataObj.duration || '',
        status: dataObj.status || 'published',
        creator: dataObj.creator || 'Administrator',
        views: 0, likes: 0
      };
      var r2 = await restInsert(rowOld, 'old schema');
      if (r2.success) return r2.success;
      var err2 = r2.error;

      var rowTagStr = {
        title: dataObj.title || '',
        description: dataObj.description || '',
        video_url: dataObj.external_url || dataObj.videoUrl || '',
        embed_url: dataObj.embed_code || '',
        platform: dataObj.video_source || '',
        thumbnail_url: dataObj.thumbnail || dataObj.thumbnail_url || '',
        tags: Array.isArray(dataObj.tags) ? dataObj.tags.join(',') : (typeof dataObj.tags === 'string' ? dataObj.tags : ''),
        duration: dataObj.duration || '',
        status: dataObj.status || 'published',
        creator: dataObj.creator || 'Administrator',
        views: 0, likes: 0
      };
      var r3 = await restInsert(rowTagStr, 'text tags');
      if (r3.success) return r3.success;
      var err3 = r3.error;

      var errMsg = [
        'new schema: ' + (err1.message || JSON.stringify(err1)),
        'old schema: ' + (err2.message || JSON.stringify(err2)),
        'text tags: ' + (err3.message || JSON.stringify(err3))
      ].join(' | ');
      console.error('insert error —', errMsg);
      window.SupabaseVideos.lastInsertError = errMsg;
      return null;
    },
    async update(id, updates) {
      if (!window.__SUPABASE_URL) return null;
      var baseUrl = window.__SUPABASE_URL;
      var anonKey = window.__SUPABASE_ANON_KEY;

      async function restUpdate(row, label) {
        try {
          var r = await fetch(baseUrl + '/rest/v1/videos?id=eq.' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(row)
          });
          if (!r.ok) {
            var errText = await r.text().catch(function(){ return ''; });
            console.error('update ' + label + ' HTTP ' + r.status, errText);
            return null;
          }
          var data = await r.json();
          if (data && data.length > 0) return enrichVideo(data[0]);
          return null;
        } catch(e) {
          console.error('update ' + label + ' error', e);
          return null;
        }
      }

      var cleanNew = {};
      if (updates.title !== undefined) cleanNew.title = updates.title;
      if (updates.description !== undefined) cleanNew.description = updates.description;
      if (updates.thumbnail_url !== undefined) cleanNew.thumbnail_url = updates.thumbnail_url;
      if (updates.external_url !== undefined) cleanNew.external_url = updates.external_url;
      if (updates.embed_code !== undefined) cleanNew.embed_code = updates.embed_code;
      if (updates.video_source !== undefined) cleanNew.video_source = updates.video_source;
      if (updates.tags !== undefined) cleanNew.tags = updates.tags;
      var enriched = await restUpdate(cleanNew, 'new schema');
      if (enriched) {
        if (videosCache) {
          var idx = videosCache.findIndex(function(v) { return v.id === id; });
          if (idx !== -1) videosCache[idx] = enriched;
        }
        return enriched;
      }

      var cleanOld = {};
      if (updates.title !== undefined) cleanOld.title = updates.title;
      if (updates.description !== undefined) cleanOld.description = updates.description;
      if (updates.thumbnail_url !== undefined) cleanOld.thumbnail_url = updates.thumbnail_url;
      if (updates.external_url !== undefined) cleanOld.video_url = updates.external_url;
      if (updates.embed_code !== undefined) cleanOld.embed_url = updates.embed_code;
      if (updates.video_source !== undefined) cleanOld.platform = updates.video_source;
      if (updates.tags !== undefined) cleanOld.tags = updates.tags;
      var enriched2 = await restUpdate(cleanOld, 'old schema');
      if (enriched2) {
        if (videosCache) {
          var idx2 = videosCache.findIndex(function(v) { return v.id === id; });
          if (idx2 !== -1) videosCache[idx2] = enriched2;
        }
        return enriched2;
      }
      return null;
    },
    async remove(id) {
      if (videosCache) videosCache = videosCache.filter(function(v) { return v.id !== id; });
      if (window.__SUPABASE_URL) {
        try {
          await fetch(window.__SUPABASE_URL + '/rest/v1/videos?id=eq.' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: { 'apikey': window.__SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + window.__SUPABASE_ANON_KEY }
          });
        } catch(e) { console.warn('supabase delete background failed', e); }
      }
      return true;
    },
    async removeMany(ids) {
      if (videosCache) videosCache = videosCache.filter(function(v) { return !ids.includes(v.id); });
      if (window.__SUPABASE_URL) {
        try {
          var baseUrl = window.__SUPABASE_URL;
          var anonKey = window.__SUPABASE_ANON_KEY;
          var idList = ids.map(function(id) { return '"' + id + '"'; }).join(',');
          await fetch(baseUrl + '/rest/v1/videos?id=in.(' + idList + ')', {
            method: 'DELETE',
            headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey }
          });
        } catch(e) { console.warn('supabase removeMany background failed', e); }
      }
      return true;
    },
    async getCached() {
      if (videosCache) return videosCache;
      return await this.fetchAll();
    },
    invalidateCache() { videosCache = null; }
  };

  window.SupabaseStorage = {
    async uploadFile(bucket, filePath, file) {
      var client = getClient();
      if (!client) return null;
      var { data, error } = await client.storage.from(bucket).upload(filePath, file, { upsert: true });
      if (error) { console.error('uploadFile error', error); return null; }
      var { data: { publicUrl } } = client.storage.from(bucket).getPublicUrl(filePath);
      return publicUrl;
    },
    async deleteFile(bucket, filePath) {
      var client = getClient();
      if (!client) return false;
      var { error } = await client.storage.from(bucket).remove([filePath]);
      if (error) { console.error('deleteFile error', error); return false; }
      return true;
    },
    pathFromUrl(bucket, publicUrl) {
      try {
        var u = new URL(publicUrl);
        var parts = u.pathname.split('/');
        var bucketIdx = parts.indexOf(bucket);
        if (bucketIdx === -1) return null;
        return parts.slice(bucketIdx + 1).join('/');
      } catch(_) { return null; }
    }
  };

  window.SupabaseSettings = {
    async get(key) {
      var client = getClient();
      if (!client) return null;
      try {
        var { data, error } = await client.from('site_settings').select('value').eq('key', key).maybeSingle();
        if (!error && data) return data.value;
      } catch(_) {}
      try { return localStorage.getItem('setting-' + key); } catch(e) { return null; }
      return null;
    },
    async set(key, value) {
      var client = getClient();
      if (!client) { try { localStorage.setItem('setting-' + key, value); } catch(e) {} return; }
      try { localStorage.setItem('setting-' + key, value); } catch(e) {}
      try {
        var { error } = await client.from('site_settings').upsert({ key: key, value: value, updated_at: new Date().toISOString() }, { onConflict: 'key' }).select().maybeSingle();
        if (error) console.error('SupabaseSettings.set error', error);
      } catch(_) {}
    }
  };

  function updateLocalField(id, field, value) {
    if (videosCache) {
      var idx = videosCache.findIndex(function(v) { return v.id === id; });
      if (idx !== -1) { videosCache[idx][field] = value; }
    }
    var vids = window.App.getVideos ? window.App.getVideos() : [];
    var lidx = vids.findIndex(function(v) { return v.id === id; });
    if (lidx !== -1) { vids[lidx][field] = value; }
    try { localStorage.setItem('db-videos', JSON.stringify(vids)); } catch(e) {}
  }

  window.SupabaseEngagement = {
    async incrementViews(id) {
      updateLocalField(id, 'views', (function(){
        var vids = window.App.getVideos ? window.App.getVideos() : [];
        var v = vids.find(function(x) { return x.id === id; });
        return v ? Number(v.views) + 1 : 1;
      })());
      var client = getClient();
      if (!client) return;
      try {
        var { data, error } = await client.from('videos').select('views').eq('id', id).single();
        if (!error && data) {
          await client.from('videos').update({ views: (data.views || 0) + 1 }).eq('id', id);
        }
      } catch(e) {}
    },
    async incrementLikes(id) {
      updateLocalField(id, 'likes', (function(){
        var vids = window.App.getVideos ? window.App.getVideos() : [];
        var v = vids.find(function(x) { return x.id === id; });
        return v ? Number(v.likes) + 1 : 1;
      })());
      var client = getClient();
      if (!client) return;
      try {
        var { data, error } = await client.from('videos').select('likes').eq('id', id).single();
        if (!error && data) {
          await client.from('videos').update({ likes: (data.likes || 0) + 1 }).eq('id', id);
        }
      } catch(e) {}
    },
    async incrementReactions(id) {
      updateLocalField(id, 'reactions', (function(){
        var vids = window.App.getVideos ? window.App.getVideos() : [];
        var v = vids.find(function(x) { return x.id === id; });
        return v ? Number(v.reactions) + 1 : 1;
      })());
      var client = getClient();
      if (!client) return;
      try {
        var { data, error } = await client.from('videos').select('reactions').eq('id', id).single();
        if (!error && data) {
          await client.from('videos').update({ reactions: (data.reactions || 0) + 1 }).eq('id', id);
        }
      } catch(e) {}
    },
    subscribeToVideo(id, callback) {
      var client = getClient();
      if (!client) return function(){};
      var channel = client.channel('video-' + id)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos', filter: 'id=eq.' + id }, function(payload) {
          if (callback) callback({ id: payload.new.id, views: payload.new.views, likes: payload.new.likes, reactions: payload.new.reactions });
        })
        .subscribe();
      return function() { try { channel.unsubscribe(); } catch(e) {} };
    },
    subscribeToAllVideos(callback) {
      var client = getClient();
      if (!client) return function(){};
      var channel = client.channel('all-videos')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, function(payload) {
          if (callback) callback({ id: payload.new.id, views: payload.new.views, likes: payload.new.likes, reactions: payload.new.reactions });
        })
        .subscribe();
      return function() { try { channel.unsubscribe(); } catch(e) {} };
    }
  };

  function getLocalSubmissions(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(_) { return []; }
  }
  function saveLocalSubmissions(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch(_) {}
  }

  window.SupabaseSubmissions = {
    async insertFeedback(data) {
      var client = getClient();
      var row = { type: data.type || '', name: data.name || '', email: data.email || '', message: data.message || '' };
      if (client) {
        var { data: result, error } = await client.from('feedback').insert(row).select().single();
        if (!error) return result;
        console.error('insertFeedback error', error);
        return null;
      }
      var list = getLocalSubmissions('db-feedback');
      row.id = 'fb-' + Date.now();
      row.status = 'new';
      row.created_at = new Date().toISOString();
      list.unshift(row);
      saveLocalSubmissions('db-feedback', list);
      return row;
    },
    async insertBugReport(data) {
      var client = getClient();
      var row = { summary: data.summary || '', page: data.page || '', description: data.description || '', steps: data.steps || '', browser: data.browser || '', os: data.os || '' };
      if (client) {
        var { data: result, error } = await client.from('bug_reports').insert(row).select().single();
        if (!error) return result;
        console.error('insertBugReport error', error);
        return null;
      }
      var list = getLocalSubmissions('db-bug-reports');
      row.id = 'br-' + Date.now();
      row.status = 'new';
      row.created_at = new Date().toISOString();
      list.unshift(row);
      saveLocalSubmissions('db-bug-reports', list);
      return row;
    },
    async insertFeatureRequest(data) {
      var client = getClient();
      var row = { title: data.title || '', category: data.category || '', description: data.description || '', why: data.why || '' };
      if (client) {
        var { data: result, error } = await client.from('feature_requests').insert(row).select().single();
        if (!error) return result;
        console.error('insertFeatureRequest error', error);
        return null;
      }
      var list = getLocalSubmissions('db-feature-requests');
      row.id = 'fr-' + Date.now();
      row.status = 'new';
      row.created_at = new Date().toISOString();
      list.unshift(row);
      saveLocalSubmissions('db-feature-requests', list);
      return row;
    }
  };

  async function installSupabaseOverrides() {
    if (!getClient() || window.USE_SUPABASE) return;
    window.USE_SUPABASE = true;
    var client = getClient();
    var origGetVideos = window.App.getVideos.bind(window.App);
    var origSaveVideos = window.App.saveVideos.bind(window.App);
    var localVids = origGetVideos();

    try {
      var { data: { session } } = await client.auth.getSession();
      if (!session) {
        var { data: anonData, error: anonError } = await client.auth.signInAnonymously();
        if (anonError) console.warn('Supabase: anon sign-in not available, using anon key directly.');
        else console.log('Supabase: Anonymous session established.');
      } else {
        console.log('Supabase: Existing session restored.');
      }
    } catch (e) {
      console.warn('Supabase: Session init skipped.');
    }

    await window.SupabaseVideos.fetchAll();
    if (videosCache && videosCache.length > 0) {
      if (localVids && localVids.length > 0) {
        var localIds = localVids.map(function(v) { return v.id; });
        var orphans = videosCache.filter(function(v) { return !localIds.includes(v.id); });
        if (orphans.length > 0) {
          await window.SupabaseVideos.removeMany(orphans.map(function(v) { return v.id; }));
          await window.SupabaseVideos.fetchAll();
          var remaining = videosCache.filter(function(v) { return !localIds.includes(v.id); });
          if (remaining.length > 0) {
            console.warn('Supabase: orphan cleanup blocked (RLS), keeping local data.');
            videosCache = localVids;
          }
        }
      }
      localStorage.setItem('db-videos', JSON.stringify(videosCache));
      localStorage.setItem('db-videos-version', '2');
    } else if (!videosCache || videosCache.length === 0) {
      if (localVids && localVids.length > 0) videosCache = localVids;
    }
    window.App.getVideos = function() {
      if (videosCache) return videosCache;
      return origGetVideos();
    };
    window.App.saveVideos = function(list) {
      videosCache = list;
      localStorage.setItem('db-videos', JSON.stringify(list));
      localStorage.setItem('db-videos-version', '2');
    };
    window.App.getTags = function() {
      if (tagsCache) return tagsCache;
      var vids = window.App.getVideos();
      if (!vids || vids.length === 0) return [];
      var seen = {};
      var tags = [];
      vids.forEach(function(v) {
        if (v.tags && Array.isArray(v.tags)) {
          v.tags.forEach(function(t) {
            if (!seen[t]) { seen[t] = true; tags.push({ id: t, name: t, videoCount: 0 }); }
          });
        }
      });
      tags.forEach(function(tag) { tag.videoCount = vids.filter(function(v) { return v.tags && v.tags.includes(tag.id); }).length; });
      tagsCache = tags;
      return tags;
    };
    window.App.saveTags = function(list) {
      tagsCache = list;
      localStorage.setItem('db-tags', JSON.stringify(list));
    };
    document.dispatchEvent(new CustomEvent('supabase-active'));
    window.SUPABASE_SYNCED = true;
    console.log('Supabase: Integration active.');
  }

  document.addEventListener('supabase-ready', installSupabaseOverrides);
  if (window.__supabase) installSupabaseOverrides();
})();
