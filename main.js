const apiKey = "2809084e3c5fe5926182b5e1ac73a834";
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";

const searchBox = document.querySelector('.search input');
const searchBtn = document.querySelector('.search button');
const weatherIcon = document.querySelector('.weather-icon');
const weatherDiv = document.querySelector(".weather");
const errorDiv = document.querySelector(".error");

async function checkWeather(city) {
    if (!city) return; // Don't do anything if input is empty

    const response = await fetch(apiUrl + city + `&appid=${apiKey}`);

    if (response.status == 404) {
        errorDiv.style.display = 'block';
        weatherDiv.style.display = "none";
    } else {
        const data = await response.json();

        // Update Text Content
        document.querySelector('.city').innerHTML = data.name;
        document.querySelector('.temp').innerHTML = Math.round(data.main.temp) + "°C";
        document.querySelector('.wind').innerHTML = data.wind.speed + " km/hr";
        document.querySelector('.humidity').innerHTML = data.main.humidity + "%";

        // Update Weather Icon based on condition
        const condition = data.weather[0].main;
        if (condition == "Clouds") {
            weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/414/414825.png";
        } else if (condition == "Clear") {
            weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/869/869869.png";
        } else if (condition == "Rain") {
            weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/414/414974.png";
        } else if (condition == "Drizzle") {
            weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/1163/1163624.png";
        } else if (condition == "Mist" || condition == "Haze") {
            weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/1779/1779940.png";
        }

        // Show weather and hide error
        weatherDiv.style.display = "block";
        errorDiv.style.display = "none";
    }
}

// Click Event
searchBtn.addEventListener("click", () => {
    checkWeather(searchBox.value);
});

// Enter Key Event
searchBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        checkWeather(searchBox.value);
    }
});