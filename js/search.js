// search.js - Suchfunktion für TuningHub mit Button

// Debug-Funktion
function log(message, data = null) {
    console.log(`[TuningHub Search] ${message}`, data || '');
}

// Suchverlauf-Speicher (In-Memory statt localStorage)
let searchHistory = [];
const MAX_HISTORY_ITEMS = 5;

// Suchverlauf-Funktionen (vereinfacht für In-Memory)
function loadSearchHistory() {
    return searchHistory;
}

function saveSearchHistory(history) {
    searchHistory = history;
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
    searchButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>';
    
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

// Tracking-Funktion für Suchanfragen (verbessert)
async function trackSearchEvent(query) {
    log(`Tracking Search Event: "${query}"`);
    
    try {
        // Prüfen ob supabase verfügbar ist
        if (typeof supabase === 'undefined') {
            log('Supabase ist nicht verfügbar');
            return;
        }

        // User abrufen (mit besserer Fehlerbehandlung)
        let userId = null;
        try {
            if (supabase.auth && supabase.auth.getUser) {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) {
                    log('Fehler beim Abrufen des Users:', error);
                } else {
                    userId = user?.id || null;
                }
            }
        } catch (authError) {
            log('Auth-Fehler:', authError);
            // Weiter ohne User-ID
        }

        log(`Tracking mit User-ID: ${userId}`);

        // Tracking-Event senden
        const trackingData = {
            event_type: 'search',
            user_id: userId,
            metadata: {
                query: query || '',
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        };

        log('Sende Tracking-Daten:', trackingData);

        // Methode 1: Über Supabase Client (empfohlen)
        if (supabase.from) {
            try {
                const { data, error } = await supabase
                    .from('tracking_events')
                    .insert([trackingData]);

                if (error) {
                    log('Supabase Insert Fehler:', error);
                    throw error;
                } else {
                    log('Such-Tracking erfolgreich über Supabase Client', data);
                    return;
                }
            } catch (supabaseError) {
                log('Supabase Client Fehler, verwende Fetch:', supabaseError);
            }
        }

        // Methode 2: Direkte Fetch-Anfrage (Fallback)
        const response = await fetch('https://lhxcnrogjjskgaclqxtm.supabase.co/rest/v1/tracking_events', {
            method: 'POST',
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeGNucm9nampza2dhY2xxeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjU0MzUsImV4cCI6MjA2ODEwMTQzNX0.vOr_Esi9IIesFixkkvYQjYEqghrKCMeqbrPKW27zqww',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeGNucm9nampza2dhY2xxeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjU0MzUsImV4cCI6MjA2ODEwMTQzNX0.vOr_Esi9IIesFixkkvYQjYEqghrKCMeqbrPKW27zqww',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(trackingData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            log('HTTP Fehler:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        log('Such-Tracking erfolgreich über Fetch');

    } catch (error) {
        log('Fehler beim Such-Tracking:', error);
        // Optional: Fallback-Tracking (z.B. in lokalen Storage)
        try {
            const fallbackData = {
                query,
                timestamp: new Date().toISOString(),
                error: error.message
            };
            console.log('Fallback Tracking:', fallbackData);
        } catch (fallbackError) {
            log('Auch Fallback-Tracking fehlgeschlagen:', fallbackError);
        }
    }
}

// Suche durchführen
async function performSearch(query) {
    query = query?.trim() || '';
    log(`Suche nach: "${query}"`);
    
    // Tracking VOR der Suche aufrufen
    await trackSearchEvent(query);
    
    addToSearchHistory(query);

    const container = document.getElementById('angebot-container');
    if (!container) return;

    container.innerHTML = '<div class="loading">🔍 Suche läuft...</div>';

    try {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase ist nicht verfügbar');
        }

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

// Debug-Funktion zum Testen des Trackings
window.testTracking = async function(testQuery = 'test-suche') {
    log('Starte Tracking-Test...');
    await trackSearchEvent(testQuery);
    log('Tracking-Test abgeschlossen');
};

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

    // Debug: Tracking-Test nach 2 Sekunden (optional)
    // setTimeout(() => window.testTracking?.(), 2000);
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