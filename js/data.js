window.__VIDEOS_DATA = [
  {
    "id": "51a57577-c0a8-4444-8bf9-0c4a1ea826d0",
    "title": "YouTube Video (59YONYIcLGQ)",
    "description": "YouTube Video (59YONYIcLGQ)",
    "video_source": "youtube",
    "external_url": "https://www.youtube.com/watch?v=59YONYIcLGQ",
    "videoUrl": "https://www.youtube.com/watch?v=59YONYIcLGQ",
    "embed_code": "https://www.youtube.com/embed/59YONYIcLGQ",
    "thumbnail": "https://i.ytimg.com/vi/59YONYIcLGQ/maxresdefault.jpg",
    "views": 45,
    "likes": 23,
    "reactions": 12,
    "tags": ["aman"],
    "duration": "5:00",
    "publishDate": "2026-07-23",
    "status": "published",
    "creator": "Administrator"
  },
  {
    "id": "570681d2-58ab-48fc-9a46-3bb751725b6a",
    "title": "YouTube Video (42KrUd9EBF0)",
    "description": "",
    "video_source": "upload",
    "external_url": "https://www.youtube.com/watch?v=42KrUd9EBF0",
    "videoUrl": "https://www.youtube.com/watch?v=42KrUd9EBF0",
    "embed_code": null,
    "thumbnail": "https://i.ytimg.com/vi/42KrUd9EBF0/maxresdefault.jpg",
    "views": 7,
    "likes": 1,
    "reactions": 1,
    "tags": [],
    "duration": "",
    "publishDate": "2026-07-22",
    "status": "published",
    "creator": "Administrator"
  },
  {
    "id": "86e1b31f-bc8e-47c0-a800-abe297758d6d",
    "title": "CJP PROTEST",
    "description": "CJP PROTEST",
    "video_source": "upload",
    "external_url": "https://www.youtube.com/watch?v=59YONYIcLGQ",
    "videoUrl": "https://www.youtube.com/watch?v=59YONYIcLGQ",
    "embed_code": null,
    "thumbnail": "https://i.ytimg.com/vi/59YONYIcLGQ/maxresdefault.jpg",
    "views": 0,
    "likes": 13,
    "reactions": 14,
    "tags": [],
    "duration": "",
    "publishDate": "2026-07-22",
    "status": "published",
    "creator": "Administrator"
  }
];

try {
  localStorage.setItem('db-videos', JSON.stringify(window.__VIDEOS_DATA));
  console.log('data.js: Set localStorage with ' + window.__VIDEOS_DATA.length + ' videos');
} catch(e) {
  console.warn('data.js: Could not set localStorage', e);
}