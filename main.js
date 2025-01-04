// API Key and Base URL for OpenWeatherMap
const apiKey = '85641630aa76b9afdb41cc4e97f36a57';
const baseWeatherUrl = 'https://api.openweathermap.org/data/2.5/';
const tileLayerUrl = 'https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=' + apiKey;

// DOM Elements
const currentTempElement = document.getElementById('currentTemp');
const weatherDescElement = document.getElementById('weatherDesc');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('windSpeed');
const weatherIconElement = document.getElementById('weatherIcon');
const timestampElement = document.getElementById('timestamp');
const hourlyForecastElement = document.getElementById('hourlyForecast');
const historicalChartElement = document.getElementById('historicalChart');
const mapElement = document.getElementById('weatherMap');

// Map control buttons
const showPrecipitationBtn = document.getElementById('showPrecipitation');
const showTemperatureBtn = document.getElementById('showTemperature');
const showWindBtn = document.getElementById('showWind');

// For unit toggle and map
let isCelsius = true;
let map;
let currentLayer;

// Check if Leaflet is loaded
function isLeafletLoaded() {
    return typeof L !== 'undefined';
}

// Initialize Map with retry mechanism
function initMap() {
    if (!isLeafletLoaded()) {
        console.log('Leaflet not loaded yet, retrying in 100ms...');
        setTimeout(initMap, 100);
        return;
    }

    try {
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }

        map = L.map('weatherMap').setView([12.8797, 121.7740], 6); // Center on Philippines

        // Add base OpenStreetMap layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add default weather layer (temperature)
        addWeatherLayer('temp_new');
        
        // Initialize map controls
        initMapControls();
    } catch (error) {
        console.error('Error initializing map:', error);
        showError('Failed to initialize weather map');
    }
}

// Initialize Map Controls
function initMapControls() {
    if (!showPrecipitationBtn || !showTemperatureBtn || !showWindBtn) {
        console.error('Map control buttons not found');
        return;
    }

    showPrecipitationBtn.addEventListener('click', () => {
        updateActiveButton(showPrecipitationBtn);
        addWeatherLayer('precipitation_new');
    });

    showTemperatureBtn.addEventListener('click', () => {
        updateActiveButton(showTemperatureBtn);
        addWeatherLayer('temp_new');
    });

    showWindBtn.addEventListener('click', () => {
        updateActiveButton(showWindBtn);
        addWeatherLayer('wind_new');
    });
}

// Update Active Button State
function updateActiveButton(activeButton) {
    [showPrecipitationBtn, showTemperatureBtn, showWindBtn].forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    activeButton.classList.remove('btn-outline-primary');
    activeButton.classList.add('btn-primary');
}

// Add Weather Layer to Map
function addWeatherLayer(layerType) {
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    currentLayer = L.tileLayer(tileLayerUrl.replace('{layer}', layerType), {
        opacity: 0.7,
        attribution: '© OpenWeatherMap'
    }).addTo(map);
}

// Fetch Current Weather Data
async function fetchCurrentWeather(location) {
    try {
        const url = `${baseWeatherUrl}weather?q=${location}&appid=${apiKey}&units=${isCelsius ? 'metric' : 'imperial'}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather data not available');
        const data = await response.json();
        
        updateCurrentWeather(data);
        
        // Update map center to the new location
        if (map && data.coord) {
            map.setView([data.coord.lat, data.coord.lon], 8);
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError('Unable to fetch current weather data');
    }
}

// Update Current Weather UI
function updateCurrentWeather(data) {
    const temperature = data.main.temp;
    const description = data.weather[0].description;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const iconCode = data.weather[0].icon;

    currentTempElement.textContent = `${Math.round(temperature)}°${isCelsius ? 'C' : 'F'}`;
    weatherDescElement.textContent = capitalizeFirstLetter(description);
    humidityElement.textContent = `${humidity}%`;
    windSpeedElement.textContent = `${Math.round(windSpeed)} ${isCelsius ? 'km/h' : 'mph'}`;
    weatherIconElement.className = `fas fa-${getWeatherIcon(iconCode)} weather-icon`;

    // Update timestamp
    const date = new Date();
    timestampElement.textContent = `Updated at ${date.toLocaleTimeString()}`;
}

// Fetch Hourly Forecast
async function fetchHourlyForecast(location) {
    try {
        const url = `${baseWeatherUrl}forecast?q=${location}&appid=${apiKey}&units=${isCelsius ? 'metric' : 'imperial'}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Forecast data not available');
        }
        
        const data = await response.json();
        updateHourlyForecast(data);
    } catch (error) {
        console.error('Error fetching forecast:', error);
        showError('Unable to fetch forecast data');
        
        if (hourlyForecastElement) {
            hourlyForecastElement.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-exclamation-circle mb-2"></i>
                    <p>Forecast temporarily unavailable</p>
                </div>
            `;
        }
    }
}

// Update Hourly Forecast UI
function updateHourlyForecast(data) {
    if (!hourlyForecastElement) {
        console.error('Hourly forecast element not found');
        return;
    }

    hourlyForecastElement.innerHTML = '';
    const hours = data.list.slice(0, 6); // Display next 6 hours

    hours.forEach(hour => {
        const time = new Date(hour.dt * 1000).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        const temp = Math.round(hour.main.temp);
        const iconCode = hour.weather[0].icon;
        const description = hour.weather[0].description;

        const forecastItem = `
            <div class="d-flex justify-content-between align-items-center mb-3 forecast-item">
                <div class="text-muted">${time}</div>
                <div class="d-flex align-items-center">
                    <i class="fas fa-${getWeatherIcon(iconCode)} me-2" title="${description}"></i>
                    <div class="fw-bold">${temp}°${isCelsius ? 'C' : 'F'}</div>
                </div>
            </div>
        `;
        hourlyForecastElement.insertAdjacentHTML('beforeend', forecastItem);
    });
}

// Theme switching functionality
function initThemeSwitch() {
    // Add theme toggle button to the body if it doesn't exist
    if (!document.querySelector('.theme-toggle')) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'theme-toggle';
        toggleButton.innerHTML = '<i class="fas fa-moon"></i>';
        document.body.appendChild(toggleButton);
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Theme toggle event listener
    document.querySelector('.theme-toggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

// Set theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update toggle button icon
    const toggleButton = document.querySelector('.theme-toggle');
    if (toggleButton) {
        toggleButton.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }

    // Update map tiles if map exists
    if (map) {
        map.invalidateSize();
    }
}

// Show Error Message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.textContent = message;
    
    // Clear existing error messages
    const existingError = document.querySelector('.error-state');
    if (existingError) existingError.remove();
    
    // Insert error message at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    // Remove error message after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
}

// Utility Functions
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'sun',
        '01n': 'moon',
        '02d': 'cloud-sun',
        '02n': 'cloud-moon',
        '03d': 'cloud',
        '03n': 'cloud',
        '04d': 'cloud-meatball',
        '04n': 'cloud-meatball',
        '09d': 'cloud-rain',
        '09n': 'cloud-rain',
        '10d': 'cloud-showers-heavy',
        '10n': 'cloud-showers-heavy',
        '11d': 'bolt',
        '11n': 'bolt',
        '13d': 'snowflake',
        '13n': 'snowflake',
        '50d': 'smog',
        '50n': 'smog'
    };
    return iconMap[iconCode] || 'sun';
}

// Event Listeners
document.getElementById('unitToggle').addEventListener('click', () => {
    isCelsius = !isCelsius;
    fetchCurrentWeather('Philippines');
    fetchHourlyForecast('Philippines');
});

document.getElementById('refreshData').addEventListener('click', (e) => {
    const button = e.currentTarget;
    const icon = button.querySelector('i');
    icon.classList.add('refreshing');
    fetchCurrentWeather('Philippines');
    fetchHourlyForecast('Philippines');
    setTimeout(() => icon.classList.remove('refreshing'), 1000);
});
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initThemeSwitch();
    fetchCurrentWeather('Philippines');
    fetchHourlyForecast('Philippines');
    
    if (showTemperatureBtn) {
        showTemperatureBtn.classList.remove('btn-outline-primary');
        showTemperatureBtn.classList.add('btn-primary');
    }
});