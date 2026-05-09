const axios = require('axios');

// Helper to get weather using Open-Meteo (NO API KEY NEEDED!)
// Helper to get weather using Open-Meteo (NO API KEY NEEDED!)
async function getWeatherOpenMeteo(rawLocation) {
    try {
        // 1. Handle common aliases/corrections
        const LOCATION_ALIASES = {
            "jammu kashmir": "Srinagar, Jammu and Kashmir",
            "jammu & kashmir": "Srinagar, Jammu and Kashmir",
            "jk": "Srinagar, Jammu and Kashmir",
            "j&k": "Srinagar, Jammu and Kashmir",
            "delhi": "New Delhi, Delhi",
            "bengaluru": "Bengaluru, Karnataka", // Updated to current official spelling just in case
            "odisha": "Bhubaneswar"
        };

        let location = rawLocation.trim();
        const lowerLoc = location.toLowerCase();

        if (LOCATION_ALIASES[lowerLoc]) {
            console.log(`  - Mapping '${location}' -> '${LOCATION_ALIASES[lowerLoc]}'`);
            location = LOCATION_ALIASES[lowerLoc];
        }

        // 2. Define Geocoding Helper
        const fetchCoordinates = async (query) => {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
            const res = await axios.get(url);
            if (res.data.results && res.data.results.length > 0) {
                return res.data.results[0];
            }
            return null;
        };

        // 3. First Attempt
        console.log(`  - Getting coordinates for '${location}'...`);
        let place = await fetchCoordinates(location);

        // 4. Retry Logic if not found
        if (!place) {
            // Retry A: Try adding "India" if acceptable (most users are likely Indian based on context)
            if (!location.toLowerCase().includes("india")) {
                console.log(`  - Retrying with '${location}, India'...`);
                place = await fetchCoordinates(`${location}, India`);
            }
        }

        // Retry B: If it matched nothing, maybe try splitting or simplified name? 
        // (Skipping complex logic for now to keep it fast)

        if (!place) {
            console.log("  - Location not found in geocoding");
            return null;
        }

        const { latitude, longitude, name, country, admin1 } = place;

        // Now get weather data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&temperature_unit=celsius`;
        console.log("  - Fetching weather from Open-Meteo...");

        const weatherResponse = await axios.get(weatherUrl);
        const current = weatherResponse.data.current;

        // Map weather codes to descriptions
        const weatherCode = current.weather_code;
        let condition = "clear";
        let description = "clear sky";

        if (weatherCode === 0) {
            condition = "clear";
            description = "clear sky";
        } else if (weatherCode <= 3) {
            condition = "clouds";
            description = "partly cloudy";
        } else if (weatherCode <= 48) {
            condition = "fog";
            description = "foggy";
        } else if (weatherCode <= 67) {
            condition = "rain";
            description = "rainy";
        } else if (weatherCode <= 77) {
            condition = "snow";
            description = "snowy";
        } else if (weatherCode <= 82) {
            condition = "rain";
            description = "rain showers";
        } else if (weatherCode <= 86) {
            condition = "snow";
            description = "snow showers";
        } else if (weatherCode >= 95) {
            condition = "thunderstorm";
            description = "thunderstorm";
        }

        console.log("✅ Weather data fetched from Open-Meteo (FREE, NO API KEY!)");

        return {
            temp: Math.round(current.temperature_2m),
            feelsLike: Math.round(current.apparent_temperature),
            condition: condition,
            description: description,
            humidity: current.relative_humidity_2m,
            location: `${name}${admin1 ? `, ${admin1}` : ''}${country ? `, ${country}` : ''}`
        };
    } catch (error) {
        console.error("  - Open-Meteo error:", error.message);
        return null;
    }
}

module.exports = { getWeatherOpenMeteo };
