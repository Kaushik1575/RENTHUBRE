const { GoogleGenerativeAI } = require("@google/generative-ai");
const SupabaseDB = require('../models/supabaseDB');
const axios = require('axios');
const { getWeatherOpenMeteo } = require('./weatherHelper');

// Helper to get formatted vehicle list text
async function getVehicleContext() {
    try {
        const bikes = await SupabaseDB.getVehicles('bikes');
        const cars = await SupabaseDB.getVehicles('cars');
        const scooty = await SupabaseDB.getVehicles('scooty');

        // Simplify lists to just critical info to save tokens
        const simplify = (list, type) => list.map(v => `${v.name} (${type}, ₹${v.price}/hr, ID:${v.id})`).join(', ');

        return `
Available Vehicles:
BIKES: ${simplify(bikes || [], 'bikes')}
CARS: ${simplify(cars || [], 'cars')}
SCOOTY: ${simplify(scooty || [], 'scooty')}
        `;
    } catch (e) {
        console.error("Error fetching vehicle context:", e);
        return "";
    }
}

// Helper to get weather information for a location
const WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1/current.json?key=ffa3e13e30af45349e0164721252308";

const getWeatherDataForCity = async (city) => {
    try {
        const response = await axios.get(`${WEATHER_API_BASE_URL}&q=${encodeURIComponent(city)}&aqi=yes`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getWeatherDataForLocation = async (lat, lon) => {
    try {
        const response = await axios.get(`${WEATHER_API_BASE_URL}&q=${lat},${lon}&aqi=yes`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

async function getWeatherInfo(location) {
    try {
        let searchQuery = location.trim();
        const lowerLoc = searchQuery.toLowerCase();

        // Handle Aliases
        if (lowerLoc === 'jammu and kashmir' || lowerLoc === 'jammu kashmir' || lowerLoc === 'j&k' || lowerLoc === 'jk') {
            searchQuery = "Jammu City, Jammu and Kashmir";
        } else if (lowerLoc === 'odisha' || lowerLoc === 'orissa') {
            searchQuery = "Bhubaneswar, Odisha";
        }

        console.log(`🌤️ Weather Check for: ${searchQuery}`);

        let data;
        try {
            // Try fetching by city/location string
            data = await getWeatherDataForCity(searchQuery);
        } catch (error) {
            // Retry with ", India" if it failed and didn't already have it
            if (!searchQuery.toLowerCase().includes("india")) {
                console.log("  - Exact match failed. Retrying with ', India'...");
                try {
                    data = await getWeatherDataForCity(`${searchQuery}, India`);
                } catch (retryError) {
                    console.error("  - Retry failed:", retryError.message);
                }
            }
        }

        if (data) {
            console.log("✅ Weather data fetched successfully");
            return {
                temp: Math.round(data.current.temp_c),
                feelsLike: Math.round(data.current.feelslike_c),
                condition: data.current.condition.text.toLowerCase(),
                description: data.current.condition.text.toLowerCase(),
                humidity: data.current.humidity,
                // Return Exact Location: City, Region, Country
                location: `${data.location.name}, ${data.location.region}, ${data.location.country}`
            };
        }

        // PRIORITY 2: Try Open-Meteo (Fallback)
        console.log("  - Attempting Open-Meteo (Fallback)...");
        const openMeteoData = await getWeatherOpenMeteo(location);
        if (openMeteoData) {
            console.log("✅ Weather data fetched from Open-Meteo");
            return openMeteoData;
        }

        console.error("❌ All weather services failed");
        return null;

    } catch (error) {
        console.error("❌ Weather Info Error:", error.message);
        return null;
    }
}

// Helper to get weather-based recommendations
function getWeatherRecommendations(weatherInfo) {
    if (!weatherInfo) {
        return "I couldn't fetch the weather information. Please check the location name.";
    }

    const { temp, feelsLike, condition, description, humidity, location } = weatherInfo;

    let recommendations = `🌤️ **Weather in ${location}**: ${description}, ${temp}°C (feels like ${feelsLike}°C)\n\n`;
    recommendations += `📦 **What to pack for your ride:**\n`;

    // Temperature-based recommendations
    if (temp > 30) {
        recommendations += `\n🔥 **Hot Weather Essentials:**\n`;
        recommendations += `• Sunscreen (SPF 30+)\n`;
        recommendations += `• Sunglasses & Cap/Hat\n`;
        recommendations += `• Water bottle (stay hydrated!)\n`;
        recommendations += `• Light, breathable clothing\n`;
        recommendations += `• Cooling towel\n`;
    } else if (temp < 15) {
        recommendations += `\n❄️ **Cold Weather Essentials:**\n`;
        recommendations += `• Warm jacket/windcheater\n`;
        recommendations += `• Gloves for riding\n`;
        recommendations += `• Scarf or neck warmer\n`;
        recommendations += `• Full-sleeve clothes\n`;
        recommendations += `• Thermal wear (if below 10°C)\n`;
    } else {
        recommendations += `\n🌡️ **Pleasant Weather:**\n`;
        recommendations += `• Light jacket (just in case)\n`;
        recommendations += `• Comfortable riding clothes\n`;
        recommendations += `• Sunglasses\n`;
    }

    // Condition-based recommendations
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm')) {
        recommendations += `\n🌧️ **Rainy Weather Extras:**\n`;
        recommendations += `• Raincoat/Rain jacket (MUST)\n`;
        recommendations += `• Waterproof bag for belongings\n`;
        recommendations += `• Extra pair of socks\n`;
        recommendations += `• Waterproof phone cover\n`;
        recommendations += `• Anti-fog solution for helmet visor\n`;
        recommendations += `⚠️ **Ride carefully - roads may be slippery!**\n`;
    }

    if (condition.includes('snow')) {
        recommendations += `\n🌨️ **Snowy Conditions:**\n`;
        recommendations += `• Heavy winter jacket\n`;
        recommendations += `• Insulated gloves\n`;
        recommendations += `• Snow boots\n`;
        recommendations += `⚠️ **Consider postponing if roads are icy!**\n`;
    }

    if (humidity > 80) {
        recommendations += `\n💧 **High Humidity:**\n`;
        recommendations += `• Extra towel/handkerchief\n`;
        recommendations += `• Deodorant\n`;
    }

    // General recommendations
    recommendations += `\n✅ **Always Carry:**\n`;
    recommendations += `• Valid ID & Driving License\n`;
    recommendations += `• Phone & Charger\n`;
    recommendations += `• First-aid kit\n`;
    recommendations += `• Helmet (provided by RentHub)\n`;

    return recommendations;
}

exports.chat = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing");
            return res.status(500).json({ error: "Server configuration error: API Key missing" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Fetch real-time vehicle context
        const vehicleContext = await getVehicleContext();

        // Fetch User Context (Coins) if authenticated
        let userContext = "";
        if (req.user && req.user.id) {
            try {
                const coins = await SupabaseDB.getUserCoins(req.user.id);
                userContext = `\n**USER CONTEXT:**\n- User ID: ${req.user.id}\n- Reward Points Balance: ${coins}\n- Reward Status: ${coins >= 1000 ? "ELIGIBLE for Free 2-Hour Ride (Redeem in Profile)" : `${1000 - coins} points needed for Free Ride`}\n`;
            } catch (e) {
                console.error("Error fetching user coins for chatbot:", e);
            }
        } else {
            userContext = `\n**USER CONTEXT:**\n- User is NOT logged in. If they ask about their coins, ask them to log in first.`;
        }

        let formattedHistory = [];

        const systemPrompt = `You are the friendly and helpful AI assistant for RentHub.

${vehicleContext}
${userContext}

**GUIDELINES:**
1. **BE CONCISE**: Do not write long paragraphs. Keep it chatty.
2. **LISTING VEHICLES**:
   - If asked for recommendations (e.g., "Show me bikes"), list **5** distinct options.
   - Include Name (**Bolded**) and Price/hr.
   - **Wait** for the user to choose one before asking for dates.

3. **BOOKING FLOW (STEP-BY-STEP)**:
   - Do NOT ask for Date, Time, and Duration all at once. It overwhelms the user.
   - **Step 1**: Confirm the Vehicle.
   - **Step 2**: Ask for the **Start Date**.
   - **Step 3**: Ask for the **Start Time** (please specify AM/PM, e.g., 09:00 AM) and **Duration**.
   - **Step 4**: Only when you have ALL details, generate the Booking Action (ensure startTime is in 24-hour HH:MM format).

4. **MANAGING EXISTING BOOKINGS (CRITICAL)**:
   - If the user provides a **Booking ID** (e.g., "RH...", "BK...", or a number) for tracking or status check, you **MUST** output the TRACK_BOOKING action immediately. Do not say you cannot do it.
   - If the user provides a **Booking ID** for cancellation, output the CANCEL_BOOKING action.
   - Example matches: "RH260116-045", "rh-1234", "101".

5. **USER REGISTRATION (PRIORITY)**:
   - If the user says "Create Account", "Register", "Register Issues", or "I want to sign up", you **MUST** immediately ask for their details: Full Name, Email, Phone Number, and a Password.
   - If the user provides details (Name, Email, Phone), you **MUST** output the REGISTER_USER action.
   - If the user provides a password, include it in the action. If not, do NOT invent one.
   - Example: "Register me: John, 9991234567, john@test.com, pass123" -> Output REGISTER_USER action.

6. **WEATHER & PACKING SUGGESTIONS**:
   - If the user asks about weather, destination weather, or what to pack/carry for their trip, you **MUST** output the CHECK_WEATHER action.
   - Ask for the destination location if not provided.
   - Example queries: "What's the weather in Mumbai?", "What should I pack for Goa?", "Check weather for my destination"
   - Output: CHECK_WEATHER action with the location.

{/* Reward system decommissioned */}

8. **CONTACT SUPPORT / SOMETHING ELSE**:
   - If the user asks for "Support", "Customer Care", "Phone Number", or says "Something else", you **MUST** output the CALL_SUPPORT action.
   - Limit: "+919090598756".

**ACTIONS (Output ONLY the JSON block):**

**To Book:**
||| ACTION: BOOK_VEHICLE {"vehicleId": 123, "type": "bikes", "startDate": "YYYY-MM-DD", "startTime": "HH:MM", "duration": 5} |||

**To Track:**
||| ACTION: TRACK_BOOKING {"bookingId": "RH123456-789"} |||

**To Cancel:**
||| ACTION: CANCEL_BOOKING {"bookingId": "RH123456-789"} |||

**To Register:**
||| ACTION: REGISTER_USER {"fullName": "John Doe", "email": "john@example.com", "phoneNumber": "9876543210", "password": "optional_password"} |||

**To Check Weather:**
||| ACTION: CHECK_WEATHER {"location": "Mumbai"} |||

**To Call Support:**
||| ACTION: CALL_SUPPORT {"number": "+919090598756"} |||

(TYPE must be 'bikes', 'cars', or 'scooty').
Do NOT wrap the output in markdown.`;

        formattedHistory.push({
            role: "user",
            parts: [{ text: systemPrompt }]
        });
        formattedHistory.push({
            role: "model",
            parts: [{ text: "Understood. I have the vehicle list and will follow the booking protocol." }]
        });

        if (Array.isArray(history) && history.length > 0) {
            const recentHistory = history.slice(-10);

            recentHistory.forEach(msg => {
                const role = msg.sender === 'user' ? 'user' : 'model';
                if (msg.text && msg.text.trim() !== "") {
                    formattedHistory.push({
                        role: role,
                        parts: [{ text: msg.text }]
                    });
                }
            });
        }

        // Helper to try models in sequence
        // Prioritize 'gemini-flash-latest' as it was verified to work (others hit 429 quota limits or 404)
        const modelsToTry = ["gemini-flash-latest", "gemini-1.5-flash-latest", "gemini-2.0-flash"];
        let model;
        let chat;
        let lastError;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Trying to initialize model: ${modelName}`);
                model = genAI.getGenerativeModel({ model: modelName });

                // Start chat session
                chat = model.startChat({
                    history: formattedHistory,
                    generationConfig: {
                        maxOutputTokens: 400,
                    },
                });

                // Test connection with a dummy generation (optional but safer)
                // actually startChat doesn't validate until sendMessage is called.
                // so we proceed to sendMessage.

                break; // If startChat doesn't throw (it usually doesn't), we break and try sending.
                // Re-attempting logic needs to be around sendMessage actually if we want to be robust,
                // but usually getGenerativeModel is where the config might fail if invalid? 
                // No, getGenerativeModel is synchronous config. The error happens at usage time.
            } catch (e) {
                console.log(`Failed to init ${modelName}:`, e.message);
                lastError = e;
            }
        }

        // We will wrap sendMessage in the retry logic actually, or better:
        // iterate models AND send message.

        let text;
        let success = false;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting generation with: ${modelName}`);
                const currentModel = genAI.getGenerativeModel({ model: modelName });
                const currentChat = currentModel.startChat({
                    history: formattedHistory,
                    generationConfig: {
                        maxOutputTokens: 400,
                    },
                });

                const result = await currentChat.sendMessage(message);
                const response = await result.response;
                text = response.text();

                console.log(`SUCCESS with ${modelName}`);
                success = true;
                break; // Exit loop on success
            } catch (e) {
                console.warn(`FAILED with ${modelName}: ${e.message}`);
                lastError = e;
                // Continue to next model
            }
        }

        if (!success) {
            throw lastError || new Error("All models failed to generate response.");
        }

        console.log("Gemini Reply:", text); // Debugging

        res.json({ reply: text });
    } catch (error) {
        console.error("Chatbot Error:", error.message);

        // Check for Quota Exceeded (429) or Not Found (404)
        if (error.message.includes("429") || error.message.includes("Quota")) {
            return res.status(429).json({ reply: "I'm currently experiencing very high traffic. Please ask me again in a minute!" });
        }

        if (error.message.includes("404")) {
            // This usually means the API key is valid but the Model ID is wrong OR the API is not enabled for this project.
            return res.status(503).json({ error: "AI Service Unavailable: Model not found or API not enabled. Please check server logs." });
        }

        res.status(500).json({ error: "Failed to process your request." });
    }
};

// Weather check endpoint
exports.checkWeather = async (req, res) => {
    try {
        const { location } = req.body;

        if (!location) {
            return res.status(400).json({ error: "Location is required" });
        }

        const weatherInfo = await getWeatherInfo(location);

        if (!weatherInfo) {
            // Provide helpful fallback response
            const fallbackResponse = `I'm having trouble connecting to the weather service right now, but here are **essential packing tips for ${location}**:

📦 **Smart Packing Checklist:**

🌡️ **For Any Weather:**
• Light jacket or windcheater (versatile for temperature changes)
• Comfortable riding clothes
• Sunglasses (UV protection)
• Water bottle (stay hydrated)

🌧️ **Rain Protection (Just in Case):**
• Raincoat or rain jacket
• Waterproof bag for belongings
• Extra pair of socks

☀️ **Sun Protection:**
• Sunscreen (SPF 30+)
• Cap or hat
• Cooling towel

✅ **Always Carry:**
• Valid ID & Driving License
• Phone & Charger
• First-aid kit
• Helmet (provided by RentHub)

💡 **Pro Tip:** Check the local weather forecast before your trip for the most accurate conditions!

⚠️ **Note:** Weather service is temporarily unavailable. For real-time weather, please check your weather app or try again in a few minutes.`;

            return res.json({ reply: fallbackResponse });
        }

        const recommendations = getWeatherRecommendations(weatherInfo);
        res.json({ reply: recommendations });

    } catch (error) {
        console.error("Weather Check Error:", error.message);
        res.status(500).json({ error: "Failed to fetch weather information." });
    }
};
