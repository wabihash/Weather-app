const apiKey = (window.__OWM_API_KEY__ || "").trim();
const apiUrl = "https://api.openweathermap.org/data/2.5/";

const searchBox = document.querySelector(".search input");
const searchBtn = document.querySelector(".search-btn");
const locBtn = document.querySelector(".location-btn");
const favBtn = document.querySelector(".fav-btn");
const weatherIcon = document.querySelector(".weather-icon");
const weatherDiv = document.querySelector(".weather");
const errorDiv = document.querySelector(".error");
const loadingDiv = document.querySelector(".loading");
const card = document.querySelector(".card");
const unitSwitch = document.getElementById("unit-switch");
const forecastContainer = document.querySelector(".forecast-container");
const favoritesBar = document.querySelector(".favorites-bar");
const autocompleteResults = document.querySelector(".autocomplete-results");
const shareBtn = document.querySelector(".share-btn");
const installBtn = document.getElementById("install-button");
const cityEl = document.querySelector(".city");
const tempEl = document.querySelector(".temp");
const windEl = document.querySelector(".wind");
const humidityEl = document.querySelector(".humidity");
const aqiValueEl = document.querySelector(".aqi-value");
const aqiDescEl = document.querySelector(".aqi-desc");
const clockElement = document.getElementById("clock");

const WEATHER_BG_CLASSES = [
    "bg-clear",
    "bg-clouds",
    "bg-rain",
    "bg-drizzle",
    "bg-mist",
    "bg-snow",
    "bg-thunderstorm"
];

let currentUnit = "metric";
let currentCity = "";
let cityTimezoneOffset = 0;
let deferredPrompt;
let debounceTimer;
let favorites = JSON.parse(localStorage.getItem("favCities") || "[]");
const hasApiKey = Boolean(apiKey);

function isCoordinateQuery(query) {
    return typeof query === "object" && query !== null && "lat" in query && "lon" in query;
}

function setVisible(element, shouldShow, displayType = "block") {
    if (!element) return;
    element.style.display = shouldShow ? displayType : "none";
}

function setText(element, text) {
    if (!element) return;
    element.textContent = text;
}

function showApiKeyMissingMessage() {
    const message = "API key missing. Set window.__OWM_API_KEY__ in index.html to enable live weather data.";
    const errorText = errorDiv?.querySelector("p");
    if (errorText) {
        errorText.textContent = message;
    }
    setVisible(loadingDiv, false);
    setVisible(weatherDiv, false);
    setVisible(errorDiv, true);
}

function toWeatherUrl(endpoint, query) {
    if (isCoordinateQuery(query)) {
        return `${apiUrl}${endpoint}?lat=${query.lat}&lon=${query.lon}&units=${currentUnit}&appid=${apiKey}`;
    }
    return `${apiUrl}${endpoint}?q=${encodeURIComponent(query)}&units=${currentUnit}&appid=${apiKey}`;
}

function getWindDisplay(speed) {
    if (currentUnit === "metric") {
        const kmh = Math.round(speed * 3.6);
        return `${kmh} km/h`;
    }
    return `${Math.round(speed)} mph`;
}

function resetAqi() {
    setText(aqiValueEl, "--");
    setText(aqiDescEl, "--");
    if (aqiValueEl) aqiValueEl.style.color = "#ffffff";
}

function updateBackground(condition) {
    if (!card || !condition) return;
    card.classList.remove(...WEATHER_BG_CLASSES);
    const cond = condition.toLowerCase();
    if (cond.includes("clear")) card.classList.add("bg-clear");
    else if (cond.includes("cloud")) card.classList.add("bg-clouds");
    else if (cond.includes("rain")) card.classList.add("bg-rain");
    else if (cond.includes("drizzle")) card.classList.add("bg-drizzle");
    else if (cond.includes("mist") || cond.includes("haze") || cond.includes("fog")) card.classList.add("bg-mist");
    else if (cond.includes("snow")) card.classList.add("bg-snow");
    else if (cond.includes("thunder")) card.classList.add("bg-thunderstorm");
}

async function fetchAQI(lat, lon) {
    const aqiMap = {
        1: { label: "Good", color: "#00feba" },
        2: { label: "Fair", color: "#ffff00" },
        3: { label: "Moderate", color: "#ff9800" },
        4: { label: "Poor", color: "#f44336" },
        5: { label: "Very Poor", color: "#9c27b0" }
    };

    try {
        const response = await fetch(`${apiUrl}air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        if (!response.ok) throw new Error(`AQI request failed (${response.status})`);
        const data = await response.json();
        const aqi = data?.list?.[0]?.main?.aqi;
        const display = aqiMap[aqi];
        if (!display) {
            resetAqi();
            return;
        }

        setText(aqiValueEl, String(aqi));
        setText(aqiDescEl, display.label);
        if (aqiValueEl) aqiValueEl.style.color = display.color;
    } catch (error) {
        console.error("AQI error:", error);
        resetAqi();
    }
}

function renderForecastItems(forecastList) {
    if (!forecastContainer) return;
    forecastContainer.innerHTML = "";

    forecastList.forEach((day, index) => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        const temp = Math.round(day.main.temp);
        const icon = day.weather[0].icon;

        const forecastItem = document.createElement("div");
        forecastItem.className = "forecast-item";
        forecastItem.style.animationDelay = `${index * 0.1}s`;

        const dayP = document.createElement("p");
        dayP.textContent = dayName;

        const iconImg = document.createElement("img");
        iconImg.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        iconImg.alt = `${dayName} weather icon`;

        const tempP = document.createElement("p");
        tempP.className = "forecast-temp";
        tempP.textContent = `${temp}°${currentUnit === "metric" ? "C" : "F"}`;

        forecastItem.append(dayP, iconImg, tempP);
        forecastContainer.appendChild(forecastItem);
    });
}

async function fetchForecast(query) {
    try {
        const response = await fetch(toWeatherUrl("forecast", query));
        if (!response.ok) throw new Error(`Forecast request failed (${response.status})`);
        const data = await response.json();
        const dailyData = (data.list || []).filter((item) => item.dt_txt?.includes("12:00:00")).slice(0, 5);
        renderForecastItems(dailyData);
    } catch (error) {
        console.error("Forecast error:", error);
        if (forecastContainer) forecastContainer.innerHTML = "";
    }
}

function updateWeatherUI(data) {
    currentCity = data.name;
    cityTimezoneOffset = data.timezone;

    setText(cityEl, data.name);
    setText(tempEl, `${Math.round(data.main.temp)}°${currentUnit === "metric" ? "C" : "F"}`);
    setText(windEl, getWindDisplay(data.wind.speed));
    setText(humidityEl, `${data.main.humidity}%`);

    updateBackground(data.weather[0].main);
    if (weatherIcon) {
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
        weatherIcon.alt = `${data.weather[0].description} icon`;
    }

    favBtn?.classList.toggle("active", favorites.includes(currentCity));
    localStorage.setItem("lastCity", currentCity);
}

async function checkWeather(query) {
    if (!query || (typeof query === "string" && !query.trim())) return;

    if (!hasApiKey) {
        showApiKeyMissingMessage();
        return;
    }

    setVisible(errorDiv, false);
    setVisible(weatherDiv, false);
    setVisible(loadingDiv, true);
    setVisible(autocompleteResults, false);

    try {
        const response = await fetch(toWeatherUrl("weather", query));
        if (!response.ok) {
            setVisible(errorDiv, true);
            setVisible(loadingDiv, false);
            resetAqi();
            return;
        }

        const data = await response.json();
        updateWeatherUI(data);
        await Promise.all([
            fetchForecast(query),
            fetchAQI(data.coord.lat, data.coord.lon)
        ]);

        setVisible(loadingDiv, false);
        setVisible(weatherDiv, true);
    } catch (error) {
        console.error("Weather error:", error);
        setVisible(loadingDiv, false);
        setVisible(errorDiv, true);
    }
}

function renderAutocomplete(data) {
    if (!autocompleteResults) return;
    autocompleteResults.innerHTML = "";

    if (!data.length) {
        setVisible(autocompleteResults, false);
        return;
    }

    data.forEach((item) => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        div.textContent = item.display_name;
        div.addEventListener("click", () => {
            searchBox.value = item.display_name;
            checkWeather(item.display_name);
        });
        autocompleteResults.appendChild(div);
    });

    setVisible(autocompleteResults, true);
}

function fetchAutocomplete(query) {
    const cleaned = query.trim();
    if (cleaned.length < 3) {
        setVisible(autocompleteResults, false);
        return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}&limit=5`);
            if (!response.ok) throw new Error(`Autocomplete request failed (${response.status})`);
            const data = await response.json();
            renderAutocomplete(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Autocomplete error:", error);
            setVisible(autocompleteResults, false);
        }
    }, 400);
}

function updateFavoritesBar() {
    if (!favoritesBar) return;
    favoritesBar.innerHTML = "";

    favorites.forEach((city) => {
        const span = document.createElement("span");
        span.className = "fav-item";
        span.textContent = city;
        span.addEventListener("click", () => checkWeather(city));
        favoritesBar.appendChild(span);
    });
}

function toggleFavorite() {
    if (!currentCity) return;

    if (favorites.includes(currentCity)) {
        favorites = favorites.filter((city) => city !== currentCity);
    } else {
        favorites = [...new Set([...favorites, currentCity])];
    }

    localStorage.setItem("favCities", JSON.stringify(favorites));
    favBtn?.classList.toggle("active", favorites.includes(currentCity));
    updateFavoritesBar();
}

function getLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported in this browser.");
        return;
    }

    setVisible(loadingDiv, true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            checkWeather({ lat: position.coords.latitude, lon: position.coords.longitude });
        },
        () => {
            setVisible(loadingDiv, false);
            alert("Location access denied.");
        }
    );
}

async function shareWeather() {
    if (!currentCity || !tempEl) return;

    const tempText = tempEl.textContent || "";
    const shareText = `Check out the weather in ${currentCity}: ${tempText}. Shared via SkyCast.`;
    const shareUrl = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({
                title: "SkyCast Weather",
                text: shareText,
                url: shareUrl
            });
        } catch (error) {
            console.error("Share failed:", error);
        }
        return;
    }

    try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("Weather summary copied to clipboard.");
    } catch (error) {
        console.error("Clipboard copy failed:", error);
    }
}

function updateClock() {
    if (!clockElement) return;

    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const cityDate = new Date(utcTime + cityTimezoneOffset * 1000);

    const hours = cityDate.getUTCHours();
    const minutes = cityDate.getUTCMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const cityPrefix = currentCity ? `${currentCity}: ` : "";

    clockElement.textContent = `${cityPrefix}${displayHours}:${minutes} ${ampm}`;
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
            console.error("Service worker registration failed:", error);
        });
    });
}

function setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event;
        setVisible(installBtn, true, "inline-flex");
    });

    if (installBtn) {
        installBtn.addEventListener("click", async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            setVisible(installBtn, false);
        });
    }

    window.addEventListener("appinstalled", () => {
        setVisible(installBtn, false);
        deferredPrompt = null;
    });
}

function setupEventListeners() {
    searchBtn?.addEventListener("click", () => checkWeather(searchBox.value));
    searchBox?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") checkWeather(searchBox.value);
    });
    searchBox?.addEventListener("input", (event) => fetchAutocomplete(event.target.value));
    locBtn?.addEventListener("click", getLocation);
    favBtn?.addEventListener("click", toggleFavorite);
    shareBtn?.addEventListener("click", shareWeather);

    unitSwitch?.addEventListener("change", () => {
        currentUnit = unitSwitch.checked ? "imperial" : "metric";
        document.querySelectorAll(".unit-label").forEach((label) => {
            const isActive = label.dataset.unit === currentUnit;
            label.classList.toggle("active", isActive);
        });
        if (currentCity) checkWeather(currentCity);
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".search-input-container")) {
            setVisible(autocompleteResults, false);
        }
    });
}

function initialize() {
    updateClock();
    setInterval(updateClock, 1000);
    updateFavoritesBar();
    setupEventListeners();
    setupInstallPrompt();
    registerServiceWorker();

    if (!hasApiKey) {
        showApiKeyMissingMessage();
        return;
    }

    checkWeather(localStorage.getItem("lastCity") || "New York");
}

window.addEventListener("load", initialize);
