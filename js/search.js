// search.js - Suchfunktion für TuningHub mit Button

// Debug-Funktion
function log(message, data = null) {
    console.log(`[TuningHub Search] ${message}`, data || '');
}



// Suchverhaltens-Speicher
const SEARCH_HISTORY_KEY = 'tuninghub_search_history';
const MAX_HISTORY_ITEMS = 5;

// Suchverlauf laden/speichern
function loadSearchHistory() {
    try {
        const history = localStorage.getItem(SEARCH_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        log('Fehler beim Laden des Suchverlaufs', error);
        return [];
    }
}

function saveSearchHistory(history) {
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        log('Fehler beim Speichern des Suchverlaufs', error);
    }
}

function addToSearchHistory(query) {
    if (!query || query.trim() === '') return;
    
    const history = loadSearchHistory();
    const normalizedQuery = query.trim().toLowerCase();
    const filteredHistory = history.filter(item => item.toLowerCase() !== normalizedQuery);
    filteredHistory.unshift(query.trim());
    saveSearchHistory(filteredHistory.slice(0, MAX_HISTORY_ITEMS));
}

// Such-UI erstellen
function createSearchUI() {
    const searchWrapper = document.querySelector('.searchbar-wrapper');
    if (!searchWrapper || searchWrapper.querySelector('.search-button')) return;

    // Suchbutton erstellen
    const searchButton = document.createElement('button');
    searchButton.className = 'search-button';
    searchButton.innerHTML = '<svg xmlns="\img\search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>';
    
    // Suchleiste referenzieren
    const searchInput = searchWrapper.querySelector('.searchbar');
    
    // Button einfügen
    searchWrapper.style.position = 'relative';
    searchButton.style.position = 'absolute';
    searchButton.style.right = '10px';
    searchButton.style.top = '50%';
    searchButton.style.transform = 'translateY(-50%)';
    searchButton.style.background = 'none';
    searchButton.style.border = 'none';
    searchButton.style.cursor = 'pointer';
    searchButton.style.padding = '8px';
    searchWrapper.appendChild(searchButton);

    // Event-Listener für Button
    searchButton.addEventListener('click', () => performSearch(searchInput.value));
}

// Suche durchführen
async function performSearch(query) {
    query = query?.trim() || '';
    log(`Suche nach: "${query}"`);
    addToSearchHistory(query);

    const container = document.getElementById('angebot-container');
    if (!container) return;

    container.innerHTML = '<div class="loading">🔍 Suche läuft...</div>';

    try {
        const { data, error } = await supabase
            .from('parts')
            .select('*')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%,condition.ilike.%${query}%`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displaySearchResults(data, query);
    } catch (error) {
        log('Fehler bei der Suche:', error);
        container.innerHTML = `
            <div class="error">
                <p>Fehler bei der Suche: ${error.message}</p>
                <button id="retry-search" class="action-button">Erneut versuchen</button>
            </div>
        `;
        document.getElementById('retry-search')?.addEventListener('click', () => performSearch(query));
    }
}

// Suchergebnisse anzeigen
function displaySearchResults(results, query) {
    const container = document.getElementById('angebot-container');
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="empty-search">
                <p>Keine Ergebnisse für "${query}" gefunden</p>
                <button id="reset-search" class="action-button">Alle Teile anzeigen</button>
            </div>
        `;
        document.getElementById('reset-search')?.addEventListener('click', () => window.ladeAngebote?.());
        return;
    }

    container.innerHTML = '';
    results.forEach(teil => {
        const card = createResultCard(teil, query);
        container.appendChild(card);
    });
}

// Ergebnis-Karte erstellen
function createResultCard(teil, query) {
    const { name, preis, beschreibung, bild } = window.extractData?.(teil) || {
        name: teil.title || 'Unbekanntes Teil',
        preis: teil.price || 'Preis auf Anfrage',
        beschreibung: teil.description || '',
        bild: teil.image_url || null
    };

    const card = document.createElement('div');
    card.className = 'card';

    const imageUrl = bild || 'https://via.placeholder.com/300x200/e9ecef/666?text=Kein+Bild';
    const fallbackUrl = 'https://via.placeholder.com/300x200/f8f9fa/adb5bd?text=Bild+nicht+verfügbar';

    let preisText = preis;
    if (typeof preis === 'number') {
        preisText = `${preis.toLocaleString('de-DE')}€`;
    } else if (typeof preis === 'string' && !isNaN(parseFloat(preis))) {
        preisText = `${parseFloat(preis).toLocaleString('de-DE')}€`;
    }

    // Highlight-Funktion
    const highlight = (text) => {
        if (!text || !query) return text || '';
        return text.toString().replace(
            new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 
            match => `<span class="highlight">${match}</span>`
        );
    };

    card.innerHTML = `
        <img src="${imageUrl}" 
             alt="${name}" 
             onerror="this.src='${fallbackUrl}'" 
             loading="lazy" />
        <h2>${highlight(name)}</h2>
        ${beschreibung ? `<p>${highlight(beschreibung)}</p>` : ''}
        <p><strong>${preisText}</strong></p>
    `;

    card.addEventListener('click', () => window.openDetailView?.(teil));
    return card;
}

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    log('Search.js initialisiert');
    createSearchUI();
    
    const searchInput = document.querySelector('.searchbar');
    if (!searchInput) return;

    // Enter-Taste für Suche
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch(e.target.value);
        }
    });

    // Event-Listener für Suchbutton
    const searchButton = document.querySelector('.search-button');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
    }
});

// CSS für Suchkomponenten
const style = document.createElement('style');
style.textContent = `
    .searchbar-wrapper {
        position: relative;
        max-width: 500px;
        margin: 12px auto;
    }
    
    .searchbar {
        width: 100%;
        padding: 12px 40px 12px 16px;
        border-radius: 8px;
        border: 1px solid #ccc;
        font-size: 15px;
    }
    
    .search-button {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
    }
    
    .search-button svg {
        width: 18px;
        height: 18px;
        color: #666;
    }
    
    .search-button:hover svg {
        color: #007bff;
    }
    
    .highlight {
        background-color: #fff3cd;
        padding: 0 2px;
        border-radius: 2px;
    }
    
    .empty-search, .error {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }
    
    .action-button {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        margin-top: 10px;
        cursor: pointer;
    }
    
    .action-button:hover {
        background: #0069d9;
    }
`;
document.head.appendChild(style);