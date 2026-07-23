(function() {
  var channel = null;
  var activeSubscriptions = [];

  function getClient() { return window.__supabase || null; }

  function getLocalVideos() { return window.App ? window.App.getVideos() : []; }

  function saveLocalVideos(list) { if (window.App) window.App.saveVideos(list); }

  function updateLocalField(id, field, value) {
    var vids = getLocalVideos();
    var idx = vids.findIndex(function(v) { return v.id === id; });
    if (idx !== -1) {
      vids[idx][field] = value;
      saveLocalVideos(vids);
    }
  }

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  window.Engagement = {

    incrementView: async function(videoId) {
      var client = getClient();
      if (client) {
        try {
          var { data, error } = await client.from('videos').select('views').eq('id', videoId).single();
          if (!error && data) {
            var newVal = (data.views || 0) + 1;
            await client.from('videos').update({ views: newVal }).eq('id', videoId);
          }
        } catch(e) { /* fallback to local */ }
      }
      updateLocalField(videoId, 'views', (function() {
        var vids = getLocalVideos();
        var v = vids.find(function(x) { return x.id === videoId; });
        return v ? (v.views || 0) + 1 : 1;
      })());
    },

    incrementLike: async function(videoId) {
      var client = getClient();
      if (client) {
        try {
          var { data, error } = await client.from('videos').select('likes').eq('id', videoId).single();
          if (!error && data) {
            var newVal = (data.likes || 0) + 1;
            await client.from('videos').update({ likes: newVal }).eq('id', videoId);
          }
        } catch(e) { /* fallback to local */ }
      }
      updateLocalField(videoId, 'likes', (function() {
        var vids = getLocalVideos();
        var v = vids.find(function(x) { return x.id === videoId; });
        return v ? (v.likes || 0) + 1 : 1;
      })());
    },

    incrementReaction: async function(videoId) {
      var client = getClient();
      if (client) {
        try {
          var { data, error } = await client.from('videos').select('reactions').eq('id', videoId).single();
          if (!error && data) {
            var newVal = (data.reactions || 0) + 1;
            await client.from('videos').update({ reactions: newVal }).eq('id', videoId);
          }
        } catch(e) { /* fallback to local */ }
      }
      updateLocalField(videoId, 'reactions', (function() {
        var vids = getLocalVideos();
        var v = vids.find(function(x) { return x.id === videoId; });
        return v ? (v.reactions || 0) + 1 : 1;
      })());
    },

    subscribe: function(videoId, onChange) {
      var client = getClient();
      if (!client) {
        if (onChange) onChange();
        return function() {};
      }
      if (!channel) {
        channel = client.channel('videos')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, function(payload) {
            var sub;
            for (var i = 0; i < activeSubscriptions.length; i++) {
              sub = activeSubscriptions[i];
              if (sub.id === payload.new.id) {
                sub.fn({ views: payload.new.views, likes: payload.new.likes, reactions: payload.new.reactions });
              }
            }
          })
          .subscribe();
      }
      var entry = { id: videoId, fn: onChange };
      activeSubscriptions.push(entry);
      var unsubscribed = false;
      return function() {
        if (unsubscribed) return;
        unsubscribed = true;
        for (var i = 0; i < activeSubscriptions.length; i++) {
          if (activeSubscriptions[i] === entry) {
            activeSubscriptions.splice(i, 1);
            break;
          }
        }
        if (activeSubscriptions.length === 0 && channel) {
          try { channel.unsubscribe(); } catch(e) {}
          channel = null;
        }
      };
    },

    subscribeAll: function(onChange) {
      var client = getClient();
      if (!client) return function() {};
      if (!channel) {
        channel = client.channel('videos')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, function(payload) {
            onChange({ id: payload.new.id, views: payload.new.views, likes: payload.new.likes, reactions: payload.new.reactions });
          })
          .subscribe();
      } else {
        var orig = channel.on;
        /* already subscribed, just track */
      }
      return function() {
        if (channel) {
          try { channel.unsubscribe(); } catch(e) {}
          channel = null;
        }
      };
    },

    formatNum: formatNum
  };
})();
