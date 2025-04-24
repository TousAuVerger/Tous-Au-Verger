const CONFIG = {
    disableCache: false // Set to true to disable caching completely
};

document.addEventListener('DOMContentLoaded', function() {
    // Check URL parameters for cache control
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('nocache') || urlParams.has('disable_cache')) {
        CONFIG.disableCache = true;
        console.log('Cache disabled via URL parameter');
    }

    const publishedSheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQGs5jLZ5O8hINJqv9GoR-GG4P57ceLdZIyzBo8oMC7lHI0HYQEsHv0U1gYyatjciroHZ4Z2L-j7oKZ/pub?gid=0&single=true&output=csv';
    const eventsContainers = document.querySelectorAll('.events-container');
    const CACHE_KEY = 'tousauverger_events';
    const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

    // Immediately check cache and display events without waiting for DOM
    const cachedData = getCachedEvents();
    if (cachedData) {
        console.log('Using cached events data immediately');
        requestAnimationFrame(() => {
            displayEvents(cachedData, eventsContainers);
        });
    } else {
        // Show loading indicators right away
        requestAnimationFrame(showLoadingIndicator);
    }

    // Main async function to handle events loading
    async function initEvents() {
        try {
            if (cachedData) {
                // If we've already displayed cached data, refresh in background
                fetchAndProcessEvents(true);
                return;
            }

            // If no cache, fetch fresh data
            await fetchAndProcessEvents(false);
        } catch (error) {
            console.error('Error initializing events:', error);
            displayError(`Unable to load events: ${error.message}`);
        }
    }

    // Function to fetch and process events with optional background mode
    async function fetchAndProcessEvents(isBackgroundRefresh) {
        try {
            const csvData = await fetchCSVData(publishedSheetURL);

            // Use requestIdleCallback if available for non-critical parsing
            const parseFunc = window.requestIdleCallback || setTimeout;

            const parseAndDisplay = () => {
                const events = parseCSV(csvData);
                cacheEvents(events);

                if (!isBackgroundRefresh) {
                    displayEvents(events, eventsContainers);
                }
                return events;
            };

            if (isBackgroundRefresh) {
                parseFunc(parseAndDisplay);
            } else {
                return parseAndDisplay();
            }
        } catch (error) {
            if (!isBackgroundRefresh) {
                displayError(`Error loading events: ${error.message}`);
            }
            throw error;
        }
    }

    // Show loading indicator
    function showLoadingIndicator() {
        eventsContainers.forEach(container => {
            // Only add loading indicator if it doesn't exist
            if (!container.querySelector('.events-loading')) {
                const loadingEl = document.createElement('div');
                loadingEl.className = 'events-loading';
                loadingEl.innerHTML = '<div class="spinner"></div><p>Chargement des événements...</p>';
                container.appendChild(loadingEl);
            }
        });
    }

    // Cache events in localStorage with expiry time
    function cacheEvents(events) {
        // Skip caching if disabled
        if (CONFIG.disableCache) {
            console.log('Caching skipped - disabled by configuration');
            return;
        }

        try {
            const cacheData = {
                timestamp: Date.now(),
                data: events
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            console.log('Events cached successfully');
        } catch (error) {
            console.warn('Failed to cache events:', error);
            localStorage.removeItem(CACHE_KEY);
        }
    }

    // Get cached events if valid and caching is enabled
    function getCachedEvents() {
        // Return null immediately if caching is disabled
        if (CONFIG.disableCache) {
            console.log('Cache disabled by configuration');
            return null;
        }

        try {
            const cacheItem = localStorage.getItem(CACHE_KEY);
            if (!cacheItem) return null;

            const cache = JSON.parse(cacheItem);
            const now = Date.now();

            // Check if cache is expired
            if (now - cache.timestamp > CACHE_EXPIRY) {
                console.log('Cache expired, removing');
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            return cache.data;
        } catch (error) {
            console.warn('Error reading cache:', error);
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
    }

    // Optimized function to fetch CSV data with priority
    async function fetchCSVData(url) {
        console.log('Fetching data from Google Sheet...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            // Use fetch with high priority for important data
            const response = await fetch(url, {
                signal: controller.signal,
                priority: 'high',
                cache: 'no-store'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again later.');
            }
            throw error;
        }
    }

    // Function to preprocess CSV data to handle line breaks within quoted fields
    function preprocessCSV(csvText) {
        let inQuotes = false;
        let processedText = '';
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            if (char === '"') {
                inQuotes = !inQuotes;
                processedText += char;
            } else if (char === '\n' && inQuotes) {
                processedText += '[[NEWLINE]]';
            } else {
                processedText += char;
            }
        }
        return processedText;
    }

    // Function to display error messages
    function displayError(message) {
        console.error(message);
        eventsContainers.forEach(container => {
            // Clear any loading indicators
            const loader = container.querySelector('.events-loading');
            if (loader) loader.remove();

            // Display error message
            const errorEl = document.createElement('div');
            errorEl.className = 'events-error';
            errorEl.innerHTML = `<p>⚠️ ${message}</p><button class="retry-button">Réessayer</button>`;

            // Add retry functionality
            const retryButton = errorEl.querySelector('.retry-button');
            if (retryButton) {
                retryButton.addEventListener('click', () => {
                    errorEl.remove();
                    showLoadingIndicator();
                    fetchAndProcessEvents(false);
                });
            }

            container.appendChild(errorEl);
        });
    }


    // Function to parse CSV data into an array of event objects
    function parseCSV(csvText) {
        // Normalize line endings to \n
        csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Preprocess the CSV text
        csvText = preprocessCSV(csvText);

        const lines = csvText.split('\n');
        const numLines = lines.length;
        console.log(`Parsing ${numLines} lines of CSV data.`);
        const headers = lines[0].split(',');
        const events = [];
        let dataFound = 0;
        let dataNotFound = 0;

        for (let i = 1; i < lines.length; i++) {
            let line = lines[i];
            let fields = [];
            let inQuotes = false;
            let currentField = "";

            for (let k = 0; k < line.length; k++) {
                const char = line[k];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    fields.push(currentField.trim());
                    currentField = "";
                } else {
                    currentField += char;
                }
            }
            fields.push(currentField.trim());

            if (fields.length === headers.length) {
                const event = {};
                for (let j = 0; j < headers.length; j++) {
                    let header = headers[j].trim();
                    let value = fields[j].trim();
                    event[header] = value;
                }
                events.push(event);
                dataFound++;
            } else {
                dataNotFound++;
            }
        }

        console.log(`Found ${dataFound} valid event(s).`);
        console.log(`Skipped ${dataNotFound} incomplete line(s).`);
        return events;
    }

    // Helper function to capitalize first letter of a string
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Function to format date in French
    function formatDateInFrench(dateStr) {
        let date;
        
        // Check if the date is in DD/MM/YYYY format
        const frenchDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = dateStr.match(frenchDateRegex);
        
        if (match) {
            // French format: DD/MM/YYYY
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in JS Date
            const year = parseInt(match[3], 10);
            date = new Date(year, month, day);
        } else {
            // Try standard date parsing
            date = new Date(dateStr);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return null;
        }
        
        // Arrays for French day and month names
        const frenchDays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        const frenchMonths = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
        
        const dayName = frenchDays[date.getDay()];
        const day = date.getDate();
        const month = frenchMonths[date.getMonth()];
        const year = date.getFullYear();
        
        // Simple date format without numeric format
        return `${dayName} ${day} ${month} ${year}`;
    }

    // Helper function to format time, ensuring it has hours and minutes with "h" format
    function formatTime(timeStr) {
        if (!timeStr || timeStr.trim() === '') {
            return 'h00';  // Default time if not specified
        }
        
        timeStr = timeStr.trim();
        
        // If only a number is provided (e.g., "14"), assume it's hours and add minutes
        if (/^\d+$/.test(timeStr)) {
            return timeStr + 'h00';
        }
        
        // If it contains a colon (e.g., "14:30"), replace with "h"
        if (timeStr.includes(':')) {
            return timeStr.replace(':', 'h');
        }
        
        // If it already has the "h" format but no minutes (e.g., "14h"), add minutes
        if (/^\d+h$/.test(timeStr)) {
            return timeStr + '00';
        }
        
        // If it's already in the correct format (e.g., "14h30"), return as is
        return timeStr;
    }

    // Function to create and display event cards
    function displayEvents(events, containers) {
        if (NodeList.prototype.isPrototypeOf(containers)) {
            // If containers is a NodeList, process each container
            containers.forEach(container => {
                processContainer(events, container);
            });
        } else {
            // If containers is a single element
            processContainer(events, containers);
        }

        function processContainer(events, container) {
            container.innerHTML = ''; // Clear existing events

            // Get attributes from the eventsContainer
            const view = container.dataset.view || 'all'; // Default to 'all' if not specified
            const order = container.dataset.order || 'ordered'; // Default to 'ordered'
            const color = container.dataset.color || 'color'; // Default to 'color'
            const imageColor = container.dataset.imageColor || 'color'; // Default to 'color'

            // Filter events based on the 'view' attribute
            let filteredEvents = events;
            const today = new Date();
            if (view === 'future') {
                filteredEvents = events.filter(event => {
                    if (event.date) {
                        const eventDate = parseEventDate(event.date);
                        return eventDate && eventDate >= today;
                    }
                    return false; // Exclude events without a valid date
                });
            } else if (view === 'past') {
                filteredEvents = events.filter(event => {
                    if (event.date) {
                        const eventDate = parseEventDate(event.date);
                        return eventDate && eventDate < today;
                    }
                    return false; // Exclude events without a valid date
                });
            }

            // Sort events based on the 'order' attribute
            if (order === 'reversed') {
                filteredEvents.sort((a, b) => {
                    // If date is missing, put at the end
                    if (!a.date) return 1;
                    if (!b.date) return -1;

                    // Parse dates for comparison
                    const dateA = parseEventDate(a.date);
                    const dateB = parseEventDate(b.date);

                    // If dates couldn't be parsed, keep original order
                    if (!dateA || !dateB) {
                        return 0;
                    }

                    // Primary sort: by date (descending)
                    if (dateB.getTime() !== dateA.getTime()) {
                        return dateB - dateA;
                    }

                    // Secondary sort: by start time if dates are equal (descending)
                    const timeB = parseTimeToMinutes(b.debut);
                    const timeA = parseTimeToMinutes(a.debut);
                    return timeB - timeA;
                });
            } else if (order === 'ordered') {
                filteredEvents.sort((a, b) => {
                    // If date is missing, put at the end
                    if (!a.date) return 1;
                    if (!b.date) return -1;

                    // Parse dates for comparison
                    const dateA = parseEventDate(a.date);
                    const dateB = parseEventDate(b.date);

                    // If dates couldn't be parsed, keep original order
                    if (!dateA || !dateB) {
                        return 0;
                    }

                    // Primary sort: by date (ascending)
                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateA - dateB;
                    }

                    // Secondary sort: by start time if dates are equal (ascending)
                    const timeA = parseTimeToMinutes(a.debut);
                    const timeB = parseTimeToMinutes(b.debut);
                    return timeA - timeB;
                });
            } else if (order === 'raw') {
                // do nothing
            }

            if (filteredEvents.length === 0) {
                console.warn('No events found in the CSV data.');
                container.textContent = 'Aucun événement trouvé.';
                return;
            }

            filteredEvents.forEach(event => {
                console.log('Event data:', event);

                // Create the HTML elements to display the event
                const eventDiv = document.createElement('div');
                eventDiv.classList.add('event');
                eventDiv.classList.add('card'); // Add card class

                // Apply color styling based on the 'color' attribute
                if (imageColor === 'grey') {
                    eventDiv.classList.add('grey-card'); // Add a class for grey styling
                } else if (imageColor === 'auto') {
                    // Logic to automatically determine the color
                    const eventDate = parseEventDate(event.date);
                    if (eventDate && eventDate < today) {
                        eventDiv.classList.add('grey-card');
                    }
                }

                // Check if event is in the past
                let isPastEvent = false;
                if (event.date) {
                    const eventDate = parseEventDate(event.date);
                    if (eventDate && eventDate < new Date()) {
                        // Event is in the past
                        isPastEvent = true;
                        eventDiv.classList.add('past-event');
                    }
                }

                // Always create an image element, use default image if none specified
                const image = document.createElement('img');
                let imageUrl = event.image; // Store the image URL

                // If no image is specified, use default image
                if (!imageUrl || imageUrl.trim() === '') {
                    imageUrl = 'images/cards/greffage.jpg';
                    console.log('No image specified. Using default image.');
                } else {
                    console.log('Original image URL:', event.image);

                    if (typeof event.image === 'string' && event.image.startsWith('images/')) {
                        // Local image
                        console.log('Treating as local image.  Final URL:', imageUrl);
                    } else {
                        // Remote image
                        console.log('Treating as remote image. Final URL:', imageUrl);
                    }
                }

                console.log('Image URL:', imageUrl); // Log the final image URL

                image.onload = () => {
                    console.log('Image loaded successfully:', imageUrl);
                };

                image.onerror = () => {
                    console.error('Error loading image:', imageUrl);
                    // If image fails to load, fallback to default
                    image.src = 'images/cards/greffage.jpg';
                };

                image.src = imageUrl;
                image.alt = event.type || 'Tous Au Verger Event';
                image.classList.add('card-image-top'); // Add class for image styling
                eventDiv.appendChild(image);

                const cardBody = document.createElement('div');
                cardBody.classList.add('card-body'); // Add card body

                if (event.titre || event.type) {
                    const title = document.createElement('p'); // Change from h3 to p
                    title.classList.add('card-title'); // Add card title class
                    let titleText = '';
                    if (event.titre) {
                        titleText += capitalizeFirstLetter(event.titre); // Apply capitalization to title
                    }
                    if (event.type) {
                        let typeText = capitalizeFirstLetter(event.type);
                        titleText += ` - (${typeText})`;
                    }
                    title.textContent = titleText;
                    cardBody.appendChild(title);
                }

                const date = document.createElement('p');
                if (event.date) {
                    const formattedDate = formatDateInFrench(event.date);
                    if (formattedDate) {
                        let dateText = `Date: ${formattedDate}`;

                        // Add time information if available
                        if (event.debut || event.fin) {
                            let timeText = '';
                            if (event.debut) {
                                timeText += ` de ${formatTime(event.debut)}`;
                            } else {
                                timeText += ` de h00`;
                            }
                            if (event.fin) {
                                timeText += ` à ${formatTime(event.fin)}`;
                            } else {
                                timeText += ` à h00`;
                            }

                            dateText += timeText;
                        }

                        date.textContent = dateText;

                        // Add calendar link if date is valid
                        const calendarLinkContainer = document.createElement("span");
                        calendarLinkContainer.style.fontStyle = "italic";
                        calendarLinkContainer.innerHTML = " (";

                        const calendarLink = document.createElement("a");
                        calendarLink.textContent = "ajouter à mon agenda";

                        // Create Google Calendar link
                        let calendarUrl = "https://www.google.com/calendar/render?action=TEMPLATE";

                        // Parse date for calendar
                        let eventDate = null;
                        const frenchDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
                        const match = event.date.match(frenchDateRegex);

                        if (match) {
                            // French format: DD/MM/YYYY
                            const day = parseInt(match[1], 10);
                            const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in JS Date
                            const year = parseInt(match[3], 10);
                            eventDate = new Date(year, month, day);
                        } else {
                            // Try standard date parsing
                            eventDate = new Date(event.date);
                        }

                        if (!isNaN(eventDate.getTime())) {
                            // Format date in YYYYMMDD format for calendar
                            const yyyy = eventDate.getFullYear();
                            const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(eventDate.getDate()).padStart(2, '0');

                            let startDate = `${yyyy}${mm}${dd}`;
                            let endDate = startDate;

                            // Add time if available
                            if (event.debut) {
                                // Extract hours and minutes from debut
                                let hours = "00";
                                let minutes = "00";

                                if (/^\d+$/.test(event.debut)) {
                                    // Just a number, treat as hours
                                    hours = String(event.debut).padStart(2, '0');
                                } else if (event.debut.includes(':')) {
                                    // Format with colon
                                    const timeParts = event.debut.split(':');
                                    hours = String(timeParts[0]).padStart(2, '0');
                                    minutes = String(timeParts[1]).padStart(2, '0');
                                } else if (event.debut.includes('h')) {
                                    // Format with 'h'
                                    const timeParts = event.debut.split('h');
                                    hours = String(timeParts[0]).padStart(2, '0');
                                    minutes = (timeParts[1] || "00").padStart(2, '0');
                                }

                                startDate += `T${hours}${minutes}00`;
                            } else {
                                // If no debut time, default to 00:00
                                startDate += "T000000";
                            }

                            if (event.fin) {
                                // Similar extraction for end time
                                let hours = "00";
                                let minutes = "00";

                                if (/^\d+$/.test(event.fin)) {
                                    hours = String(event.fin).padStart(2, '0');
                                } else if (event.fin.includes(':')) {
                                    const timeParts = event.fin.split(':');
                                    hours = String(timeParts[0]).padStart(2, '0');
                                    minutes = String(timeParts[1]).padStart(2, '0');
                                } else if (event.fin.includes('h')) {
                                    const timeParts = event.fin.split('h');
                                    hours = String(timeParts[0]).padStart(2, '0');
                                    minutes = (timeParts[1] || "00").padStart(2, '0');
                                }

                                endDate += `T${hours}${minutes}00`;
                            } else if (event.debut) {
                                // If end time is not provided but start time is, set end time to start time + 1 hour
                                const startHour = parseInt(startDate.substring(9, 11));
                                const endHour = String(Math.min(startHour + 1, 23)).padStart(2, '0');
                                endDate = startDate.substring(0, 9) + endHour + startDate.substring(11);
                            } else {
                                // If no times are provided, make it a all-day event
                                endDate = `${yyyy}${mm}${String(eventDate.getDate() + 1).padStart(2, '0')}T000000`;
                            }

                            calendarUrl += `&dates=${startDate}/${endDate}`;

                            // Add title and location if available
                            let eventTitle = event.titre || event.type || "Événement Tous au Verger";
                            calendarUrl += `&text=${encodeURIComponent(eventTitle)}`;

                            if (event.lieu) {
                                calendarUrl += `&location=${encodeURIComponent(event.lieu)}`;
                            }

                            if (event.description) {
                                calendarUrl += `&details=${encodeURIComponent(event.description.replace(/\[\[NEWLINE]]/g, '\n'))}`;
                            }

                            calendarLink.href = calendarUrl;
                            calendarLink.target = "_blank"; // Open in new tab
                        }

                        calendarLinkContainer.appendChild(calendarLink);
                        calendarLinkContainer.innerHTML += ")";

                        date.appendChild(calendarLinkContainer);
                    } else {
                        date.textContent = `Date: à définir`;
                        date.style.color = 'orange';
                    }
                } else {
                    date.textContent = `Date: à définir`;
                    date.style.color = 'orange';
                }
                date.classList.add('card-text');
                cardBody.appendChild(date);

                const location = document.createElement('p');
                if (event.lieu) {
                    location.textContent = `Lieu: ${capitalizeFirstLetter(event.lieu)}`;

                    // Add Google Maps directions link if location is available
                    const mapLinkContainer = document.createElement("span");
                    mapLinkContainer.style.fontStyle = "italic";
                    mapLinkContainer.innerHTML = " (";

                    const mapLink = document.createElement("a");
                    mapLink.textContent = "créer mon itinéraire";
                    // URL encode the location
                    const encodedLocation = encodeURIComponent(event.lieu);
                    mapLink.href = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
                    mapLink.target = "_blank"; // Open in new tab

                    mapLinkContainer.appendChild(mapLink);
                    mapLinkContainer.innerHTML += ")";

                    location.appendChild(mapLinkContainer);
                }
                location.classList.add('card-text');
                cardBody.appendChild(location);

                if (event.description) {
                    const description = document.createElement('p');
                    description.innerHTML = event.description.replace(/\[\[NEWLINE]]/g, '<br>');
                    description.classList.add('card-text');
                    cardBody.appendChild(description);
                }

                if (event.url) {
                    const container = document.createElement('p');
                    container.classList.add('card-text');

                    const linkText = document.createElement("span");
                    linkText.textContent = "Commentaires et inscriptions sur notre ";

                    const facebookLink = document.createElement('a');
                    facebookLink.href = event.url;
                    facebookLink.textContent = "Facebook";

                    container.appendChild(linkText);
                    container.appendChild(facebookLink);

                    cardBody.appendChild(container);
                }

                eventDiv.appendChild(cardBody);
                // Append the eventDiv to the eventsContainer
                container.appendChild(eventDiv);
            });
            console.log('Events displayed successfully.');
        }
    }

    // Helper function to parse time to minutes for comparison
    function parseTimeToMinutes(timeStr) {
        if (!timeStr || timeStr.trim() === '') {
            return 0; // Default to 0 minutes (midnight) if time not specified
        }
        
        timeStr = timeStr.trim();
        let hours = 0;
        let minutes = 0;
        
        if (/^\d+$/.test(timeStr)) {
            // Just a number - treat as hours
            hours = parseInt(timeStr, 10);
        } else if (timeStr.includes(':')) {
            // Format with colon (e.g., "14:30")
            const parts = timeStr.split(':');
            hours = parseInt(parts[0], 10);
            minutes = parseInt(parts[1], 10);
        } else if (timeStr.includes('h')) {
            // Format with 'h' (e.g., "14h30")
            const parts = timeStr.split('h');
            hours = parseInt(parts[0], 10);
            minutes = parseInt(parts[1] || '0', 10);
        }
        
        return hours * 60 + minutes; // Convert to total minutes for easier comparison
    }
//
//    // Main function to orchestrate the data fetching and display
//    function main() {
//        fetchCSVData(publishedSheetURL)
//            .then(csvData => {
//                console.log('CSV data received. Parsing...');
//                try {
//                    const events = parseCSV(csvData);
//                    console.log('CSV data parsed successfully.');
//
//                    // Sort events by date (chronological order), then by start time
//                    events.sort((a, b) => {
//                        // If date is missing, put at the end
//                        if (!a.date) return 1;
//                        if (!b.date) return -1;
//
//                        // Parse dates for comparison
//                        const dateA = parseEventDate(a.date);
//                        const dateB = parseEventDate(b.date);
//
//                        // If dates couldn't be parsed, keep original order
//                        if (!dateA || !dateB) {
//                            return 0;
//                        }
//
//                        // Primary sort: by date
//                        if (dateA.getTime() !== dateB.getTime()) {
//                            return dateA - dateB;
//                        }
//
//                        // Secondary sort: by start time if dates are equal
//                        const timeA = parseTimeToMinutes(a.debut);
//                        const timeB = parseTimeToMinutes(b.debut);
//                        return timeA - timeB;
//                    });
//
//                    eventsContainers.forEach(container => {
//                        displayEvents(events, container);
//                    });
//
//                } catch (parseError) {
//                    displayError(`Error parsing CSV data: ${parseError.message}`);
//                }
//            })
//            .catch(error => {
//                console.error('Error in main function:', error);
//            });
//    }
    
    // Helper function to parse event date
    function parseEventDate(dateStr) {
        // Check if the date is in DD/MM/YYYY format
        const frenchDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = dateStr.match(frenchDateRegex);
        
        if (match) {
            // French format: DD/MM/YYYY
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in JS Date
            const year = parseInt(match[3], 10);
            return new Date(year, month, day);
        } else {
            // Try standard date parsing
            return new Date(dateStr);
        }
    }

//    main();

    // Start events initialization after a small delay to prioritize page render
    if (window.requestIdleCallback) {
        requestIdleCallback(() => initEvents());
    } else {
        setTimeout(initEvents, 100);
    }
});
