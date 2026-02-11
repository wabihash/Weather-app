const apiKey = "2809084e3c5fe5926182b5e1ac73a834";
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q="
const searchBox = document.querySelector('.search input');
const searchBtn = document.querySelector('.search button');
const weatherIcon = document.querySelector('.weather-icon');
async function checkWeather(city) {
    const response = await fetch(apiUrl + city + `&appid=${apiKey}`);
   if (response.status == 404) {
       document.querySelector(".error").style.display = 'block';
       document.querySelector(".weather").style.display = "none";
        return;
    }
    var data = await response.json();
    document.querySelector('.city').innerHTML = data.name;
    document.querySelector('.temp').innerHTML = Math.round(data.main.temp) + "°C";
    document.querySelector('.wind').innerHTML = data.wind.speed + " km/hr";
    document.querySelector('.humidity').innerHTML = data.main.humidity + "%";
  
if (data.weather[0].main == "Clouds") {
  weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/414/414825.png";
} else if (data.weather[0].main == "Clear") {
  weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/869/869869.png";
} else if (data.weather[0].main == "Rain") {
  weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/414/414974.png";
} else if (data.weather[0].main == "Drizzle") {
  weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/1163/1163624.png";
} else if (data.weather[0].main == "Mist") {
  weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/1779/1779940.png";
    }
    document.querySelector(".weather").style.display = "block";
}


searchBtn.addEventListener("click", () => {
    checkWeather(searchBox.value);
});