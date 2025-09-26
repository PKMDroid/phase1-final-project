// API Config 
const API_KEY = "2b66189a28124f20aaddc182f229985d"; 
const API_BASE = "https://newsapi.org/v2/top-headlines?country=us&pageSize=100&apiKey=";
const DEFAULT_IMAGE = "https://via.placeholder.com/800x400?text=No+Image";
const CACHE_KEY = 'news-cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const elements = {
  mainStory: document.getElementById('main-story'),
  peekStories: document.getElementById('peek-stories'),
  categoriesContainer: document.getElementById('categories-container'),
  error: document.getElementById('error'),
  quota: document.getElementById('quota-info'),
  navLinks: document.querySelectorAll('.nav-link'),
  signupBtn: document.getElementById('signup-btn')
};

// Category Mapping (Infer from source.name for grouping)
const categoryMap = {
  general: ['CNN', 'BBC News', 'Associated Press', 'Reuters', 'ABC News', 'CBS News'],
  technology: ['TechCrunch', 'The Verge', 'Wired', 'Ars Technica', 'Mashable'],
  sports: ['ESPN', 'Bleacher Report', 'Sky Sports', 'Fox Sports'],
  entertainment: ['Variety', 'TMZ', 'Hollywood Reporter', 'Billboard'],
  business: ['Bloomberg', 'Forbes', 'Financial Times', 'CNBC', 'Wall Street Journal']
};

function getCategory(sourceName) {
  if (!sourceName) return 'general';
  for (const [cat, sources] of Object.entries(categoryMap)) {
    if (sources.some(s => sourceName.toLowerCase().includes(s.toLowerCase()))) {
      return cat;
    }
  }
  return 'general';
}

// Cache Helpers
function getCachedData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log('Using cached news data');
      return data;
    }
  }
  return null;
}

function setCachedData(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

// Show Loading States
function showLoading() {
  if (elements.error) elements.error.innerHTML = '';
  if (elements.mainStory) elements.mainStory.innerHTML = '<div class="loading">Loading top story...</div>';
  if (elements.peekStories) elements.peekStories.innerHTML = '<div class="loading">Loading peeks...</div>';
  if (elements.categoriesContainer) elements.categoriesContainer.innerHTML = '<div class="loading">Loading categories...</div>';
}

// Render Hero & Peeks
function renderHeroAndPeeks(articles) {
  if (!articles || articles.length === 0) return;

  const top = articles[0];
  if (elements.mainStory) {
    elements.mainStory.innerHTML = `
      <img src="${top.urlToImage || DEFAULT_IMAGE}" alt="${top.title}">
      <h1>${top.title}</h1>
      <p>${top.description || 'No description available.'}</p>
    `;
  }

  if (elements.peekStories) {
    elements.peekStories.innerHTML = articles.slice(1, 4).map(a => `
      <div class="peek-item">
        <img src="${a.urlToImage || DEFAULT_IMAGE}" alt="${a.title}">
        <h3>${a.title.substring(0, 30)}...</h3>
      </div>
    `).join('');
  }
}

// Render Categories
function renderCategories(articles) {
  if (!articles || articles.length === 0) return;

  const grouped = {};
  articles.forEach(a => {
    const cat = getCategory(a.source?.name || '');
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  // Render sections (only for categories with articles)
  if (elements.categoriesContainer) {
    elements.categoriesContainer.innerHTML = Object.keys(grouped).map(catKey => {
      const catName = catKey.charAt(0).toUpperCase() + catKey.slice(1);
      const id = catKey;
      return `
        <section id="${id}" class="category-section">
          <h2>${catName}</h2>
          <div class="horizontal-scroll">
            ${grouped[catKey].slice(0, 10).map(article => `
              <div class="story-card" 
                   data-title="${article.title.replace(/"/g, '&quot;')}" 
                   data-desc="${(article.description || '').replace(/"/g, '&quot;')}" 
                   data-source="${article.source?.name || 'Unknown'}"
                   data-image="${article.urlToImage || DEFAULT_IMAGE}">
                <img src="${article.urlToImage || DEFAULT_IMAGE}" alt="${article.title}">
                <p>${article.title.substring(0, 50)}...</p>
                <small>${article.source?.name || 'Unknown'}</small>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');

    // Setup expansions and scroll reveals after render
    setupStoryCards();
    setupScrollReveals();
  }
}

// Setup Story Card Expansions
function setupStoryCards() {
  // Remove existing listeners to avoid duplicates
  document.querySelectorAll('.story-card').forEach(card => {
    card.removeEventListener('click', handleCardClick);
  });

  // Add listeners to new cards
  document.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', handleCardClick);
  });
}

function handleCardClick(e) {
  e.stopPropagation();
  const card = e.currentTarget;
  card.classList.toggle('expanded');

  if (card.classList.contains('expanded')) {
    // Populate expanded content
    const title = card.dataset.title;
    const desc = card.dataset.desc;
    const source = card.dataset.source;
    const image = card.dataset.image;

    // Insert content div if not exists
    if (!card.querySelector('.content')) {
      card.innerHTML = `
        <img src="${image}" alt="${title}">
        <div class="content">
          <h1>${title}</h1>
          <p>${desc}</p>
          <small>Source: ${source}</small>
        </div>
      `;
    }
  } else {
    // Collapse: Restore original HTML (you could cache original, but for simplicity, re-render from data)
    const title = card.dataset.title;
    const source = card.dataset.source;
    const image = card.dataset.image;
    card.innerHTML = `
      <img src="${image}" alt="${title}">
      <p>${title.substring(0, 50)}...</p>
      <small>${source}</small>
    `;
  }
}

// Setup Scroll Reveals (Slide Up Animation)
function setupScrollReveals() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px' // Trigger a bit before entering view
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        // Optional: Fade out previous as next reveals (remove 'visible' when scrolling up past)
        // entry.target.classList.remove('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.category-section').forEach(section => {
    observer.observe(section);
  });
}

// Nav Links: Smooth Scroll to Categories
function setupNavLinks() {
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1); // Remove #
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Update active class
      elements.navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Set initial active (General)
  elements.navLinks[0].classList.add('active');
}

// Signup Button (Placeholder - Replace with real modal/form)
function setupSignupBtn() {
  if (elements.signupBtn) {
    elements.signupBtn.addEventListener('click', () => {
      alert('Sign up modal would open here! (e.g., email form)'); // Or integrate a real form
    });
  }
}

// Main Fetch & Render
async function fetchNews(forceRefresh = false) {
  const apiUrl = API_BASE + API_KEY;
  if (!API_KEY || API_KEY === 'YOUR_NEWSAPI_KEY_HERE') {
    showError('Please add your NewsAPI key to script.js!');
    return;
  }

  // Try cache first
  if (!forceRefresh) {
    const cached = getCachedData();
    if (cached && cached.articles) {
      renderNews(cached.articles);
      return;
    }
  }

  showLoading();

  try {
    const res = await fetch(apiUrl);
    
    // Quota check
    const remaining = res.headers.get('X-RateLimit-Remaining') || 'Unknown';
    console.log(`Remaining requests: ${remaining}/100`);
    if (elements.quota) {
      elements.quota.innerHTML = `Quota left: ${remaining}/100`;
    }
    if (parseInt(remaining) === 0) {
      throw new Error('Daily quota reached. Using cache next time.');
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Fetched news:', data);
    const articles = data.articles || [];

    if (articles.length === 0) {
      throw new Error('No articles found.');
    }

    // Cache and render
    setCachedData(data);
    renderNews(articles);

  } catch (err) {
    console.error('Fetch error:', err);
    showError(`Failed to load news: ${err.message}. Check your API key or try later.`);
    
    // Fallback to cache
    const cached = getCachedData();
    if (cached && cached.articles) {
      renderNews(cached.articles);
    } else {
      if (elements.mainStory) elements.mainStory.innerHTML = '<p>Unable to load content.</p>';
      if (elements.categoriesContainer) elements.categoriesContainer.innerHTML = '<p>No news available.</p>';
    }
  }
}

function renderNews(articles) {
  renderHeroAndPeeks(articles);
  renderCategories(articles);
}

function showError(message) {
  if (elements.error) {
    elements.error.innerHTML = message;
    setTimeout(() => { elements.error.innerHTML = ''; }, 5000);
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupNavLinks();
  setupSignupBtn();
  fetchNews(); // Initial load
});

// Optional: Refresh on demand (e.g., add a button in HTML if needed)
window.refreshNews = () => fetchNews(true);
