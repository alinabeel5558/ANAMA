// Optimized JavaScript with Modern Features
class AnimeStreamingApp {
    #player;
    #hls;
    #observer;
    #watchlist = new Set();
  
    constructor() {
      this.init();
    }
  
    async init() {
      this.initPlayer();
      this.initIntersectionObserver();
      this.restoreWatchlist();
      this.setupEventListeners();
      this.setupRouter();
      this.loadInitialData();
    }
  
    initPlayer() {
      this.#player = new Plyr('#player', {
        controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
        keyboard: { global: true },
        ratio: '16:9',
        quality: { default: 720, options: [1080, 720, 480] }
      });
    }
  
    initIntersectionObserver() {
      this.#observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadAnimeDetails(entry.target.dataset.id);
            this.#observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
    }
  
    async loadInitialData() {
      try {
        const [trending, seasonal] = await Promise.all([
          this.fetchData('top/anime?limit=12'),
          this.fetchData('seasons/now?limit=12')
        ]);
        
        this.cacheData('trending', trending.data);
        this.cacheData('seasonal', seasonal.data);
        this.renderContent();
      } catch (error) {
        this.showError(error);
      }
    }
  
    async fetchData(endpoint) {
      const response = await fetch(`https://api.jikan.moe/v4/${endpoint}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    }
  
    renderContent() {
      const container = document.getElementById('content');
      const template = this.getTemplateForRoute();
      container.innerHTML = template;
      this.observeCards();
    }
  
    getTemplateForRoute() {
      const route = window.location.hash.substring(1) || 'home';
      const data = this.getCachedData(route);
      
      return data.map(anime => `
        <article class="anime-card" data-id="${anime.mal_id}">
          <img class="anime-card__image" 
               data-src="${anime.images.webp.large_image_url}" 
               alt="${anime.title}">
          <div class="anime-card__content">
            <h3 class="anime-card__title">${anime.title}</h3>
            <div class="anime-card__actions">
              <button class="btn-watch" data-id="${anime.mal_id}">
                ${this.#watchlist.has(anime.mal_id) ? 'Remove from' : 'Add to'} Watchlist
              </button>
              <button class="btn-trailer" data-id="${anime.mal_id}">Watch Trailer</button>
            </div>
          </div>
        </article>
      `).join('');
    }
  
    observeCards() {
      document.querySelectorAll('.anime-card').forEach(card => {
        this.#observer.observe(card);
      });
    }
  
    async loadAnimeDetails(id) {
      try {
        const data = await this.fetchData(`anime/${id}`);
        this.updateCardContent(id, data.data);
      } catch (error) {
        console.error('Failed to load anime details:', error);
      }
    }
  
    updateCardContent(id, details) {
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) {
        card.querySelector('.anime-card__title').textContent = details.title;
        card.querySelector('img').src = details.images.webp.large_image_url;
      }
    }
  
    setupEventListeners() {
      document.addEventListener('click', async (e) => {
        const card = e.target.closest('.anime-card');
        if (e.target.matches('.btn-trailer')) {
          this.handleTrailerClick(e.target.dataset.id);
        }
        if (e.target.matches('.btn-watch')) {
          this.toggleWatchlist(card.dataset.id, e.target);
        }
      });
  
      window.addEventListener('resize', this.debounce(() => {
        this.adjustLayout();
      }, 200));
    }
  
    async handleTrailerClick(id) {
      try {
        const { data } = await this.fetchData(`anime/${id}`);
        this.playMedia(data.trailer?.embed_url || data.streaming[0]?.url);
      } catch (error) {
        this.showError('Trailer not available');
      }
    }
  
    playMedia(url) {
      if (this.#hls) this.#hls.destroy();
      
      if (url.includes('youtube')) {
        this.#player.source = { type: 'video', sources: [{ src: url, provider: 'youtube' }] };
      } else {
        if (Hls.isSupported()) {
          this.#hls = new Hls();
          this.#hls.loadSource(url);
          this.#hls.attachMedia(this.#player.media);
        }
      }
      
      this.toggleVideoOverlay(true);
      this.#player.play();
    }
  
    toggleWatchlist(id, button) {
      this.#watchlist[this.#watchlist.has(id) ? 'delete' : 'add'](id);
      button.textContent = 
        `${this.#watchlist.has(id) ? 'Remove from' : 'Add to'} Watchlist`;
      this.persistWatchlist();
    }
  
    persistWatchlist() {
      localStorage.setItem('watchlist', JSON.stringify([...this.#watchlist]));
    }
  
    restoreWatchlist() {
      const saved = localStorage.getItem('watchlist');
      if (saved) this.#watchlist = new Set(JSON.parse(saved));
    }
  
    debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
      };
    }
  
    adjustLayout() {
      document.documentElement.style.setProperty(
        '--card-size',
        window.innerWidth < 768 ? 'minmax(250px, 1fr)' : 'minmax(300px, 1fr)'
      );
    }
  }
  
  // Initialize the app
  new AnimeStreamingApp();