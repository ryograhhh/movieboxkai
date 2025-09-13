const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE_URL = 'https://animekai-6wq1.onrender.com';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper function to make API calls
async function apiCall(endpoint) {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Routes

// Home page - Display anime collections
app.get('/', async (req, res) => {
  try {
    const homeData = await apiCall('/api/v1/home');
    
    if (homeData.success) {
      res.render('home', { 
        data: homeData.data,
        title: 'AnimeKai - Home'
      });
    } else {
      res.render('error', { 
        message: 'Failed to load home data',
        title: 'Error'
      });
    }
  } catch (error) {
    res.render('error', { 
      message: 'Server error occurred',
      title: 'Error'
    });
  }
});

// Anime details page
app.get('/anime/:id', async (req, res) => {
  try {
    const animeId = req.params.id;
    const animeData = await apiCall(`/api/v1/anime/${animeId}`);
    
    if (animeData.success) {
      res.render('anime-details', { 
        anime: animeData.data,
        title: `${animeData.data.title} - AnimeKai`
      });
    } else {
      res.render('error', { 
        message: 'Anime not found',
        title: 'Error'
      });
    }
  } catch (error) {
    res.render('error', { 
      message: 'Failed to load anime details',
      title: 'Error'
    });
  }
});

// Episodes page
app.get('/anime/:id/episodes', async (req, res) => {
  try {
    const animeId = req.params.id;
    const [animeData, episodesData] = await Promise.all([
      apiCall(`/api/v1/anime/${animeId}`),
      apiCall(`/api/v1/episodes/${animeId}`)
    ]);
    
    if (animeData.success && episodesData.success) {
      res.render('episodes', { 
        anime: animeData.data,
        episodes: episodesData.data,
        title: `${animeData.data.title} Episodes - AnimeKai`
      });
    } else {
      res.render('error', { 
        message: 'Failed to load episodes',
        title: 'Error'
      });
    }
  } catch (error) {
    res.render('error', { 
      message: 'Failed to load episodes',
      title: 'Error'
    });
  }
});

// Watch anime episode
app.get('/watch/:animeId', async (req, res) => {
  try {
    const animeId = req.params.animeId;
    const episodeParam = req.query.ep || '1';
    const serverParam = req.query.server || 'HD-1';
    const typeParam = req.query.type || 'sub';
    
    const serverId = `${animeId}::ep=${episodeParam}`;
    
    const [animeData, serversData, streamData] = await Promise.all([
      apiCall(`/api/v1/anime/${animeId.split('?')[0]}`),
      apiCall(`/api/v1/servers?id=${serverId}`),
      apiCall(`/api/v1/stream?server=${serverParam}&type=${typeParam}&id=${serverId}`)
    ]);
    
    if (animeData.success) {
      res.render('watch', { 
        anime: animeData.data,
        servers: serversData.success ? serversData.data : null,
        streamData: streamData.success ? streamData.data : null,
        currentEpisode: episodeParam,
        currentServer: serverParam,
        currentType: typeParam,
        title: `Watch ${animeData.data.title} Episode ${episodeParam} - AnimeKai`
      });
    } else {
      res.render('error', { 
        message: 'Failed to load watch page',
        title: 'Error'
      });
    }
  } catch (error) {
    res.render('error', { 
      message: 'Failed to load watch page',
      title: 'Error'
    });
  }
});

// Search page
app.get('/search', async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    const page = req.query.page || 1;
    
    if (!keyword) {
      return res.render('search', { 
        results: null,
        keyword: '',
        title: 'Search - AnimeKai'
      });
    }
    
    const searchData = await apiCall(`/api/v1/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
    
    res.render('search', { 
      results: searchData.success ? searchData.data : null,
      keyword: keyword,
      currentPage: parseInt(page),
      title: `Search: ${keyword} - AnimeKai`
    });
  } catch (error) {
    res.render('search', { 
      results: null,
      keyword: req.query.keyword || '',
      title: 'Search - AnimeKai'
    });
  }
});

// Browse by category
app.get('/browse/:query/:category?', async (req, res) => {
  try {
    const query = req.params.query;
    const category = req.params.category || '';
    const page = req.query.page || 1;
    
    let endpoint = `/api/v1/animes/${query}`;
    if (category) {
      endpoint += `/${category}`;
    }
    endpoint += `?page=${page}`;
    
    const browseData = await apiCall(endpoint);
    
    if (browseData.success) {
      res.render('browse', { 
        data: browseData.data,
        query: query,
        category: category,
        currentPage: parseInt(page),
        title: `Browse ${query.replace('-', ' ').toUpperCase()} - AnimeKai`
      });
    } else {
      res.render('error', { 
        message: 'Failed to load browse data',
        title: 'Error'
      });
    }
  } catch (error) {
    res.render('error', { 
      message: 'Failed to load browse data',
      title: 'Error'
    });
  }
});

// API Routes for AJAX calls

// Search suggestions
app.get('/api/suggestions', async (req, res) => {
  try {
    const keyword = req.query.keyword;
    if (!keyword) {
      return res.json({ success: false, message: 'Keyword required' });
    }
    
    const suggestions = await apiCall(`/api/v1/search/suggestion?keyword=${encodeURIComponent(keyword)}`);
    res.json(suggestions);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get servers for episode
app.get('/api/servers', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.json({ success: false, message: 'ID required' });
    }
    
    const servers = await apiCall(`/api/v1/servers?id=${id}`);
    res.json(servers);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get streaming link
app.get('/api/stream', async (req, res) => {
  try {
    const { id, server, type } = req.query;
    if (!id || !server || !type) {
      return res.json({ success: false, message: 'Missing required parameters' });
    }
    
    const stream = await apiCall(`/api/v1/stream?server=${server}&type=${type}&id=${id}`);
    res.json(stream);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    title: '404 - Not Found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    title: '500 - Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AnimeKai server running on http://localhost:${PORT}`);
  console.log(`📺 API Base URL: ${API_BASE_URL}`);
});

module.exports = app;
