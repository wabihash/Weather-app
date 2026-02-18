const apiKey = "2809084e3c5fe5926182b5e1ac73a834";
const apiUrl = "https://api.openweathermap.org/data/2.5/";

const searchBox = document.querySelector('.search input');
const searchBtn = document.querySelector('.search-btn');
const locBtn = document.querySelector('.location-btn');
const favBtn = document.querySelector('.fav-btn');
const weatherIcon = document.querySelector('.weather-icon');
const weatherDiv = document.querySelector(".weather");
const errorDiv = document.querySelector(".error");
const loadingDiv = document.querySelector(".loading");
const card = document.querySelector(".card");
const unitSwitch = document.getElementById('unit-switch');
const forecastContainer = document.querySelector('.forecast-container');
const favoritesBar = document.querySelector('.favorites-bar');
const autocompleteResults = document.querySelector('.autocomplete-results');

let currentUnit = "metric";
let currentCity = "";
let cityTimezoneOffset = 0; // Offset in seconds from UTC
let favorites = JSON.parse(localStorage.getItem("favCities")) || [];

/**
 * Updates the card background based on weather condition
 */
function updateBackground(condition) {
    card.classList.remove('bg-clear', 'bg-clouds', 'bg-rain', 'bg-drizzle', 'bg-mist', 'bg-snow', 'bg-thunderstorm');
    const cond = condition.toLowerCase();
    if (cond.includes('clear')) card.classList.add('bg-clear');
    else if (cond.includes('cloud')) card.classList.add('bg-clouds');
    else if (cond.includes('rain')) card.classList.add('bg-rain');
    else if (cond.includes('drizzle')) card.classList.add('bg-drizzle');
    else if (cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) card.classList.add('bg-mist');
    else if (cond.includes('snow')) card.classList.add('bg-snow');
    else if (cond.includes('thunder')) card.classList.add('bg-thunderstorm');
}

/**
 * Air Quality Index (AQI) Fetching
 */
async function fetchAQI(lat, lon) {
    try {
        const response = await fetch(`${apiUrl}air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        const data = await response.json();
        const aqi = data.list[0].main.aqi;
        
        const aqiMap = {
            1: { label: "Good", color: "#00feba" },
            2: { label: "Fair", color: "#ffff00" },
            3: { label: "Moderate", color: "#ff9800" },
            4: { label: "Poor", color: "#f44336" },
            5: { label: "Very Poor", color: "#9c27b0" }
        };

        const display = aqiMap[aqi];
        document.querySelector('.aqi-value').innerHTML = aqi;
        document.querySelector('.aqi-value').style.color = display.color;
        document.querySelector('.aqi-desc').innerHTML = display.label;
    } catch (error) {
        console.error("AQI error:", error);
    }
}

/**
 * 5-Day Forecast Fetching
 */
async function fetchForecast(query) {
    try {
        const url = query.lat 
            ? `${apiUrl}forecast?lat=${query.lat}&lon=${query.lon}&units=${currentUnit}&appid=${apiKey}` 
            : `${apiUrl}forecast?q=${query}&units=${currentUnit}&appid=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        forecastContainer.innerHTML = "";
        const dailyData = data.list.filter(item => item.dt_txt.includes("12:00:00"));

        dailyData.forEach((day, index) => {
            const date = new Date(day.dt * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const temp = Math.round(day.main.temp);
            const icon = day.weather[0].icon;

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.style.animationDelay = `${index * 0.1}s`;
            
            forecastItem.innerHTML = `
                <p>${dayName}</p>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather">
                <p class="forecast-temp">${temp}°${currentUnit === "metric" ? "C" : "F"}</p>
            `;
            forecastContainer.appendChild(forecastItem);
        });
    } catch (error) {
        console.error("Forecast error:", error);
    }
}

/**
 * Main Weather Check
 */
async function checkWeather(query) {
    if (!query) return;

    errorDiv.style.display = 'none';
    weatherDiv.style.display = "none";
    loadingDiv.style.display = "block";
    autocompleteResults.style.display = "none";

    try {
        const url = query.lat 
            ? `${apiUrl}weather?lat=${query.lat}&lon=${query.lon}&units=${currentUnit}&appid=${apiKey}` 
            : `${apiUrl}weather?q=${query}&units=${currentUnit}&appid=${apiKey}`;
        
        const response = await fetch(url);

        if (!response.ok) {
            errorDiv.style.display = 'block';
            loadingDiv.style.display = "none";
            return;
        }

        const data = await response.json();
        currentCity = data.name;
        cityTimezoneOffset = data.timezone; // Get timezone offset in seconds

        // Update UI
        document.querySelector('.city').innerHTML = data.name;
        document.querySelector('.temp').innerHTML = `${Math.round(data.main.temp)}°${currentUnit === "metric" ? "C" : "F"}`;
        document.querySelector('.wind').innerHTML = `${data.wind.speed} ${currentUnit === "metric" ? "km/hr" : "mph"}`;
        document.querySelector('.humidity').innerHTML = `${data.main.humidity}%`;

        updateBackground(data.weather[0].main);
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
        
        // Update Favorite Star
        favBtn.classList.toggle('active', favorites.includes(currentCity));

        loadingDiv.style.display = "none";
        weatherDiv.style.display = "block";
        
        localStorage.setItem("lastCity", currentCity);
        
        fetchForecast(query);
        fetchAQI(data.coord.lat, data.coord.lon);

    } catch (error) {
        console.error("Weather error:", error);
        loadingDiv.style.display = "none";
    }
}

/**
 * Autocomplete Logic (Nominatim)
 */
let debounceTimer;
async function fetchAutocomplete(query) {
    if (query.length < 3) {
        autocompleteResults.style.display = "none";
        return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`);
            const data = await response.json();
            
            autocompleteResults.innerHTML = "";
            if (data.length > 0) {
                data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.innerHTML = item.display_name;
                    div.onclick = () => {
                        searchBox.value = item.display_name;
                        checkWeather(item.display_name);
                    };
                    autocompleteResults.appendChild(div);
                });
                autocompleteResults.style.display = "block";
            } else {
                autocompleteResults.style.display = "none";
            }
        } catch (error) {
            console.error("Autocomplete error:", error);
        }
    }, 500);
}

/**
 * Favorites Logic
 */
function updateFavoritesBar() {
    favoritesBar.innerHTML = "";
    favorites.forEach(city => {
        const span = document.createElement('span');
        span.className = 'fav-item';
        span.innerHTML = city;
        span.onclick = () => checkWeather(city);
        favoritesBar.appendChild(span);
    });
}

function toggleFavorite() {
    if (!currentCity) return;
    
    if (favorites.includes(currentCity)) {
        favorites = favorites.filter(c => c !== currentCity);
    } else {
        favorites.push(currentCity);
    }
    
    localStorage.setItem("favCities", JSON.stringify(favorites));
    favBtn.classList.toggle('active');
    updateFavoritesBar();
}

/**
 * Handle Geolocation
 */
function getLocation() {
    if (navigator.geolocation) {
        loadingDiv.style.display = "block";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                checkWeather({ lat: position.coords.latitude, lon: position.coords.longitude });
            },
            () => {
                loadingDiv.style.display = "none";
                alert("Location access denied.");
            }
        );
    }
}

// --- Event Listeners ---

searchBtn.addEventListener("click", () => checkWeather(searchBox.value));
searchBox.addEventListener("keydown", (e) => e.key === "Enter" && checkWeather(searchBox.value));
searchBox.addEventListener("input", (e) => fetchAutocomplete(e.target.value));
locBtn.addEventListener("click", getLocation);
favBtn.addEventListener("click", toggleFavorite);

unitSwitch.addEventListener("change", () => {
    currentUnit = unitSwitch.checked ? "imperial" : "metric";
    document.querySelectorAll('.unit-label').forEach(label => label.classList.toggle('active'));
    if (currentCity) checkWeather(currentCity);
});

/**
 * Share Weather Logic
 */
async function shareWeather() {
    if (!currentCity) return;
    
    const tempText = document.querySelector('.temp').innerHTML;
    const shareText = `Check out the weather in ${currentCity}: ${tempText}! Shared via SkyCast Weather Station.`;
    const shareUrl = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'SkyCast Weather',
                text: shareText,
                url: shareUrl
            });
        } catch (err) {
            console.error("Share failed:", err);
        }
    } else {
        // Fallback: Copy to clipboard
        try {
            await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
            alert("Weather summary copied to clipboard! 📋");
        } catch (err) {
            console.error("Copy failed:", err);
        }
    }
}

document.querySelector('.share-btn').addEventListener('click', shareWeather);

// Close autocomplete on click away
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-container')) {
        autocompleteResults.style.display = "none";
    }
});

/**
 * PWA Registration
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW failed', err));
    });
}

/**
 * Live Clock Logic with Timezone Support
 */
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (!clockElement) return;

    // 1. Get current UTC time (absolute)
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    
    // 2. Create a new Date object representing the city's local time
    const cityDate = new Date(utcTime + (cityTimezoneOffset * 1000));
    
    // 3. Extract hours/minutes from the CALCULATED date
    let hours = cityDate.getUTCHours();
    const minutes = cityDate.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    // 4. Update the display (including city name for verification)
    const cityPrefix = currentCity ? `${currentCity}: ` : "";
    clockElement.innerText = `${cityPrefix}${displayHours}:${minutes} ${ampm}`;
}

setInterval(updateClock, 1000);

window.addEventListener("load", () => {
    updateClock();
    updateFavoritesBar();
    const savedCity = localStorage.getItem("lastCity") || "New York";
    checkWeather(savedCity);
});
