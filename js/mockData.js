// ─── Global Mock Datasets ───
// These datasets provide offline-compatible seed data for local file loading (CORS bypass).
// window.MOCK_TAGS: Array of tag objects used for categorizing videos
// window.MOCK_USERS: Array of user credentials for login authentication
// window.MOCK_VIDEOS: Array of video objects used as default seed data for the database

// ─── MOCK TAGS ───
// Each tag object has a unique id, display name, color for UI indicators,
// usageCount for popularity tracking, and a createdDate.
window.MOCK_TAGS = [
  // Used in design system tutorial, framework comparison, game engine coding
  {"id": "programming", "name": "Programming", "color": "#0070f3", "usageCount": 3, "createdDate": "2026-06-01"},
  // Used in framework comparison, travel guide, keyboard unboxing, quantum computing
  {"id": "review", "name": "Review", "color": "#7928ca", "usageCount": 4, "createdDate": "2026-06-02"},
  // Used in lo-fi session, standup comedy, acoustic blues
  {"id": "live", "name": "Live", "color": "#ff0080", "usageCount": 3, "createdDate": "2026-06-03"},
  // Used in speedrun, standup comedy, Iceland vlog, gym motivation
  {"id": "highlight", "name": "Highlight", "color": "#ffa42b", "usageCount": 3, "createdDate": "2026-06-04"},
  // Used in design system, pizza making, HIIT, quantum computing, film BTS, guitar lesson, game engine
  {"id": "tutorial", "name": "Tutorial", "color": "#50e3c2", "usageCount": 6, "createdDate": "2026-06-05"},
  // Used in Tokyo travel guide, Iceland road trip
  {"id": "vlogging", "name": "Vlogging", "color": "#539df5", "usageCount": 2, "createdDate": "2026-06-06"},
  // Used in Hollow Knight speedrun, Slay the Spire
  {"id": "gameplay", "name": "Gameplay", "color": "#1db954", "usageCount": 2, "createdDate": "2026-06-07"},
  // Used in Slay the Spire, indie game first impressions
  {"id": "indie", "name": "Indie", "color": "#f3727f", "usageCount": 2, "createdDate": "2026-06-08"},
  // Used in lo-fi session, acoustic blues
  {"id": "pop", "name": "Pop", "color": "#e91e63", "usageCount": 2, "createdDate": "2026-06-09"},
  // Used in lo-fi session, guitar tutorial
  {"id": "rock", "name": "Rock", "color": "#ff5722", "usageCount": 2, "createdDate": "2026-06-10"},
  // Used in design system, desk setup, film BTS
  {"id": "design", "name": "Design", "color": "#9c27b0", "usageCount": 2, "createdDate": "2026-06-11"},
  // Used in desk setup, keyboard unboxing
  {"id": "setup", "name": "Setup", "color": "#00bcd4", "usageCount": 2, "createdDate": "2026-06-12"},
  // Used in Neapolitan pizza, crispy salmon
  {"id": "food", "name": "Food", "color": "#ff9800", "usageCount": 2, "createdDate": "2026-06-13"},
  // Used in HIIT workout, gym motivation
  {"id": "workout", "name": "Workout", "color": "#4caf50", "usageCount": 2, "createdDate": "2026-06-14"},
  // Used in Hollow Knight speedrun
  {"id": "speedrun", "name": "Speedrun", "color": "#f44336", "usageCount": 1, "createdDate": "2026-06-15"},
  // Used in desk setup, keyboard unboxing, secret tech unboxing
  {"id": "unboxing", "name": "Unboxing", "color": "#3f51b5", "usageCount": 2, "createdDate": "2026-06-16"}
];

// ─── MOCK USERS ───
// Default admin credentials for login authentication.
// Password is stored in plaintext for demo purposes only.
window.MOCK_USERS = [
  {
    "email": "admin@videoshare.com",
    "password": "admin123",
    "name": "Alex Mercer",
    "role": "Administrator"
  }
];

// ─── MOCK VIDEOS ───
// Array of 21 video objects serving as the default seed data for the application.
// Each video includes metadata like title, description, URLs, view/like counts,
// tags, duration, publish date, status (published/draft), and creator name.
window.MOCK_VIDEOS = [
  // --- Video 1: Design System Tutorial ---
  {
    "id": "vid-01",
    "title": "Building a Modern Design System from Scratch",
    "description": "Learn the principles of building scalable design tokens, clean CSS architectures, and flexible components that work across teams and frameworks.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&auto=format&fit=crop",
    "views": 14205,
    "likes": 842,
    "tags": ["programming", "design", "tutorial"],
    "duration": "10:14",
    "publishDate": "2026-07-01",
    "status": "published",
    "creator": "DesignOps Weekly"
  },
  // --- Video 2: Lo-Fi Music Session ---
  {
    "id": "vid-02",
    "title": "Midnight Chill Lo-Fi - Acoustic Session",
    "description": "Relax and unwind with this live recorded acoustic lo-fi session, featuring gentle guitar riffs, analog synth pads, and warm ambient beats.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop",
    "views": 45892,
    "likes": 3204,
    "tags": ["live", "pop", "rock"],
    "duration": "14:53",
    "publishDate": "2026-07-05",
    "status": "published",
    "creator": "Lofi Labs"
  },
  // --- Video 3: Hollow Knight Speedrun ---
  {
    "id": "vid-03",
    "title": "Hollow Knight Speedrun - World Record Attempt",
    "description": "Pushing the limits of Hollow Knight movement tech in an attempt to beat the current Any% speedrun record. Analyzed live.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop",
    "views": 18204,
    "likes": 981,
    "tags": ["gameplay", "highlight", "speedrun"],
    "duration": "15:02",
    "publishDate": "2026-07-10",
    "status": "published",
    "creator": "SpeedyBug"
  },
  // --- Video 4: Framework Comparison ---
  {
    "id": "vid-04",
    "title": "React vs. Vue vs. Svelte: The 2026 Verdict",
    "description": "An honest, un-hyped evaluation of the top frontend frameworks, evaluating load times, rendering budgets, and developer experience in 2026.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop",
    "views": 29402,
    "likes": 1675,
    "tags": ["programming", "review"],
    "duration": "12:45",
    "publishDate": "2026-07-12",
    "status": "published",
    "creator": "WebDev Frontier"
  },
  // --- Video 5: Tokyo Travel Guide ---
  {
    "id": "vid-05",
    "title": "Ultimate Tokyo Travel Guide - Hidden Alleyways",
    "description": "Venturing off the tourist trail into Tokyo's historic districts. Exploring tiny Izakayas, vintage vinyl bars, and quiet temples.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=500&auto=format&fit=crop",
    "views": 84920,
    "likes": 5912,
    "tags": ["vlogging", "review"],
    "duration": "18:22",
    "publishDate": "2026-07-14",
    "status": "published",
    "creator": "Roam & Capture"
  },
  // --- Video 6: Pizza Making Tutorial ---
  {
    "id": "vid-06",
    "title": "Making the Perfect Neapolitan Pizza at Home",
    "description": "Mastering the dough formula, fermentation schedules, tomato selection, and cooking in a domestic high-heat portable pizza oven.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop",
    "views": 32049,
    "likes": 2180,
    "tags": ["food", "tutorial"],
    "duration": "8:30",
    "publishDate": "2026-07-15",
    "status": "published",
    "creator": "Kitchen Science"
  },
  // --- Video 7: HIIT Workout ---
  {
    "id": "vid-07",
    "title": "20-Minute Full Body HIIT - No Equipment",
    "description": "Follow-along bodyweight high-intensity interval training designed to build endurance and strength. Modifications included.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop",
    "views": 61204,
    "likes": 4012,
    "tags": ["workout", "tutorial"],
    "duration": "20:00",
    "publishDate": "2026-07-16",
    "status": "published",
    "creator": "Pulse Cardio"
  },
  // --- Video 8: Standup Comedy ---
  {
    "id": "vid-08",
    "title": "Standup Comedy - The Office Coffee Maker",
    "description": "A standup comedy bit about office kitchen politics, the complexity of modern espresso makers, and early morning small talk.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop",
    "views": 95204,
    "likes": 8420,
    "tags": ["live", "highlight"],
    "duration": "5:12",
    "publishDate": "2026-07-17",
    "status": "published",
    "creator": "Giggle Factory"
  },
  // --- Video 9: Quantum Computing Explained ---
  {
    "id": "vid-09",
    "title": "How Quantum Computers Actually Work",
    "description": "Breaking down qubits, superposition, entanglement, and quantum gates in plain English without the mathematical overload.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&auto=format&fit=crop",
    "views": 158902,
    "likes": 12890,
    "tags": ["tutorial", "review"],
    "duration": "22:15",
    "publishDate": "2026-07-18",
    "status": "published",
    "creator": "Deep Dive Science"
  },
  // --- Video 10: Desk Setup Makeover ---
  {
    "id": "vid-10",
    "title": "Retro Desk Setup Makeover - Minimalist Edition",
    "description": "Overhauling a messy workspace with a custom wood top, monitor arms, warm backlighting, and physical audio control knobs.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop",
    "views": 72403,
    "likes": 5012,
    "tags": ["setup", "design", "unboxing"],
    "duration": "9:45",
    "publishDate": "2026-07-19",
    "status": "published",
    "creator": "Desk Design Studio"
  },
  // --- Video 11: Slay the Spire Gameplay ---
  {
    "id": "vid-11",
    "title": "Slay the Spire - A Perfect Silent Run",
    "description": "Navigating the Spire with a poison-oriented Silent build. Every decision explained, from card picks to boss relics.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop",
    "views": 8420,
    "likes": 320,
    "tags": ["gameplay", "indie"],
    "duration": "48:10",
    "publishDate": "2026-07-19",
    "status": "published",
    "creator": "SlayMaster"
  },
  // --- Video 12: Sci-Fi Film BTS ---
  {
    "id": "vid-12",
    "title": "Behind the Scenes of a Sci-Fi Short Film",
    "description": "A walkthrough of CGI rendering pipelines, camera rigging, and color grading steps for our recent short film project.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop",
    "views": 12048,
    "likes": 745,
    "tags": ["design", "tutorial"],
    "duration": "14:22",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "VFX Lab"
  },
  // --- Video 13: Guitar Tutorial ---
  {
    "id": "vid-13",
    "title": "Acoustic Fingerstyle Tutorial - Autumn Leaves",
    "description": "Step-by-step guitar tutorial teaching bass-line integration, melody overlay, and minor chord voicings for fingerstyle players.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&auto=format&fit=crop",
    "views": 15402,
    "likes": 984,
    "tags": ["tutorial", "rock"],
    "duration": "11:05",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "Guitar Hub"
  },
  // --- Video 14: Keyboard Unboxing ---
  {
    "id": "vid-14",
    "title": "Unboxing the Ultimate Mechanical Keyboard",
    "description": "Testing a custom gasket-mounted hot-swap keyboard. Reviewing linear switches, aluminum casing sound test, and keycap designs.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&auto=format&fit=crop",
    "views": 22340,
    "likes": 1102,
    "tags": ["unboxing", "setup", "review"],
    "duration": "7:18",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "Switch Enthusiast"
  },
  // --- Video 15: Iceland Road Trip Vlog ---
  {
    "id": "vid-15",
    "title": "Iceland Road Trip Vlog - 7 Days on the Ring Road",
    "description": "Glaciers, black sand beaches, epic waterfalls, and sleeping in a 4x4 camper van under the midnight sun.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&auto=format&fit=crop",
    "views": 53049,
    "likes": 3204,
    "tags": ["vlogging", "highlight"],
    "duration": "24:50",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "Roam & Capture"
  },
  // --- Video 16: Salmon Cooking Tutorial ---
  {
    "id": "vid-16",
    "title": "Crispy Skin Salmon - Pro Chef Technique",
    "description": "A quick visual guide on moisture extraction, pan temperature regulation, and scoring skin to achieve restaurant-grade salmon.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop",
    "views": 19804,
    "likes": 1403,
    "tags": ["food", "tutorial"],
    "duration": "6:15",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "Kitchen Science"
  },
  // --- Video 17: Gym Motivation ---
  {
    "id": "vid-17",
    "title": "Gym Motivation - Breaking Plateaus",
    "description": "A compilation of progressive overload insights, mindset changes, and lifting techniques to break through strength stalls.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop",
    "views": 38402,
    "likes": 2840,
    "tags": ["workout", "highlight"],
    "duration": "4:40",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "Pulse Cardio"
  },
  // --- Video 18: Game Engine Programming ---
  {
    "id": "vid-18",
    "title": "Programming a Game Engine from Scratch in C",
    "description": "Deep coding session implementing a basic software rasterizer, math utilities, and win32 window event loops in raw C.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=500&auto=format&fit=crop",
    "views": 41209,
    "likes": 3049,
    "tags": ["programming", "tutorial"],
    "duration": "1:15:30",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "LowLevelDev"
  },
  // --- Video 19: Draft - Secret Tech Unboxing ---
  {
    "id": "vid-19",
    "title": "[DRAFT] Secret Tech Unboxing Video",
    "description": "A review of a prototype wearable console that hasn't been officially announced. Shh!",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop",
    "views": 0,
    "likes": 0,
    "tags": ["unboxing", "review"],
    "duration": "8:25",
    "publishDate": "2026-07-20",
    "status": "draft",
    "creator": "Desk Design Studio"
  },
  // --- Video 20: Draft - Indie Game First Impressions ---
  {
    "id": "vid-20",
    "title": "[DRAFT] New Indie Game First Impressions",
    "description": "Checking out the demo for a new pixel art metroidvania that mixes time travel mechanics with fluid sword combat.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop",
    "views": 0,
    "likes": 0,
    "tags": ["gameplay", "indie"],
    "duration": "14:15",
    "publishDate": "2026-07-20",
    "status": "draft",
    "creator": "SlayMaster"
  },
  // --- Video 21: Acoustic Blues Improvisation ---
  {
    "id": "vid-21",
    "title": "Acoustic Blues Improvisation in E",
    "description": "Live improvisation session focusing on E major blues riffs, sliding double stops, and hybrid picking techniques.",
    "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1525201548942-d8c8cd361db0?w=500&auto=format&fit=crop",
    "views": 3405,
    "likes": 210,
    "tags": ["live", "pop"],
    "duration": "5:45",
    "publishDate": "2026-07-20",
    "status": "published",
    "creator": "Guitar Hub"
  }
];
