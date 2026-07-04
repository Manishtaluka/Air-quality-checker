const form = document.getElementById("form");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const resultContainer = document.getElementById("result");
const errorEl = document.getElementById("error");
const submitBtn = document.getElementById("submitBtn");

const aqiResult = document.getElementById("aqi");
const dominantResult = document.getElementById("dominant");
const coResult = document.getElementById("co");
const nh3Result = document.getElementById("nh3");
const noResult = document.getElementById("no");
const no2Result = document.getElementById("no2");
const o3Result = document.getElementById("o3");
const pm2Result = document.getElementById("pm2_5");
const pm10Result = document.getElementById("pm10");
const so2Result = document.getElementById("so2");

// NOTE: For a real deployed app, never ship an API key in client-side JS.
// Proxy this request through your own backend so the key stays secret.
const APIkey = "4d2f3666fffa7c76219679308d645f73";

/* ---------------------------------------------------------
   US EPA AQI calculation
   OpenWeatherMap returns pollutant concentrations in μg/m³.
   The EPA breakpoint tables use ppm/ppb for gases, so we
   convert those first, then run the standard linear
   interpolation formula:

   AQI = ((AQIhigh - AQIlow) / (Chigh - Clow)) * (C - Clow) + AQIlow
--------------------------------------------------------- */

// Breakpoints: [Clow, Chigh, AQIlow, AQIhigh]
const BREAKPOINTS = {
    pm2_5: [
        [0.0, 12.0, 0, 50],
        [12.1, 35.4, 51, 100],
        [35.5, 55.4, 101, 150],
        [55.5, 150.4, 151, 200],
        [150.5, 250.4, 201, 300],
        [250.5, 350.4, 301, 400],
        [350.5, 500.4, 401, 500],
    ],
    pm10: [
        [0, 54, 0, 50],
        [55, 154, 51, 100],
        [155, 254, 101, 150],
        [255, 354, 151, 200],
        [355, 424, 201, 300],
        [425, 504, 301, 400],
        [505, 604, 401, 500],
    ],
    co: [ // ppm
        [0.0, 4.4, 0, 50],
        [4.5, 9.4, 51, 100],
        [9.5, 12.4, 101, 150],
        [12.5, 15.4, 151, 200],
        [15.5, 30.4, 201, 300],
        [30.5, 40.4, 301, 400],
        [40.5, 50.4, 401, 500],
    ],
    so2: [ // ppb
        [0, 35, 0, 50],
        [36, 75, 51, 100],
        [76, 185, 101, 150],
        [186, 304, 151, 200],
        [305, 604, 201, 300],
        [605, 804, 301, 400],
        [805, 1004, 401, 500],
    ],
    no2: [ // ppb
        [0, 53, 0, 50],
        [54, 100, 51, 100],
        [101, 360, 101, 150],
        [361, 649, 151, 200],
        [650, 1249, 201, 300],
        [1250, 1649, 301, 400],
        [1650, 2049, 401, 500],
    ],
    o3: [ // ppm (8-hour table)
        [0.000, 0.054, 0, 50],
        [0.055, 0.070, 51, 100],
        [0.071, 0.085, 101, 150],
        [0.086, 0.105, 151, 200],
        [0.106, 0.200, 201, 300],
    ],
};

function ugm3ToPpm_CO(v) { return v * 0.000873; }   // MW 28.01
function ugm3ToPpb_SO2(v) { return v * 0.3816; }    // MW 64.07
function ugm3ToPpb_NO2(v) { return v * 0.5316; }    // MW 46.01
function ugm3ToPpm_O3(v) { return v * 0.0005094; }  // MW 48.00

function calcAQIForPollutant(concentration, table) {
    for (const [cLow, cHigh, aLow, aHigh] of table) {
        if (concentration >= cLow && concentration <= cHigh) {
            return Math.round(
                ((aHigh - aLow) / (cHigh - cLow)) * (concentration - cLow) + aLow
            );
        }
    }
    // Above the top of the table: clamp to the max band instead of failing
    const last = table[table.length - 1];
    if (concentration > last[1]) return last[3];
    return null;
}

const POLLUTANT_LABELS = {
    pm2_5: "PM2.5",
    pm10: "PM10",
    co: "CO",
    so2: "SO2",
    no2: "NO2",
    o3: "O3",
};

function calculateUSAqi(components) {
    const candidates = {
        pm2_5: calcAQIForPollutant(components.pm2_5, BREAKPOINTS.pm2_5),
        pm10: calcAQIForPollutant(components.pm10, BREAKPOINTS.pm10),
        co: calcAQIForPollutant(ugm3ToPpm_CO(components.co), BREAKPOINTS.co),
        so2: calcAQIForPollutant(ugm3ToPpb_SO2(components.so2), BREAKPOINTS.so2),
        no2: calcAQIForPollutant(ugm3ToPpb_NO2(components.no2), BREAKPOINTS.no2),
        o3: calcAQIForPollutant(ugm3ToPpm_O3(components.o3), BREAKPOINTS.o3),
    };

    let dominant = null;
    let maxAqi = -1;
    for (const [pollutant, value] of Object.entries(candidates)) {
        if (value !== null && value > maxAqi) {
            maxAqi = value;
            dominant = pollutant;
        }
    }

    return { aqi: maxAqi, dominant: dominant ? POLLUTANT_LABELS[dominant] : "N/A" };
}

function getAqiCategory(aqi) {
    if (aqi <= 50) return { label: "Good", className: "aqi-good" };
    if (aqi <= 100) return { label: "Moderate", className: "aqi-moderate" };
    if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", className: "aqi-usg" };
    if (aqi <= 200) return { label: "Unhealthy", className: "aqi-unhealthy" };
    if (aqi <= 300) return { label: "Very Unhealthy", className: "aqi-very-unhealthy" };
    return { label: "Hazardous", className: "aqi-hazardous" };
}

function isValidCoordinate(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorEl.textContent = "";

    const latitude = latitudeInput.value.trim();
    const longitude = longitudeInput.value.trim();

    if (!latitude || !longitude) {
        errorEl.textContent = "Please enter both latitude and longitude.";
        return;
    }
    if (!isValidCoordinate(latitude, -90, 90)) {
        errorEl.textContent = "Latitude must be a number between -90 and 90.";
        return;
    }
    if (!isValidCoordinate(longitude, -180, 180)) {
        errorEl.textContent = "Longitude must be a number between -180 and 180.";
        return;
    }

    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${APIkey}`;

    submitBtn.disabled = true;
    submitBtn.textContent = "Checking...";

    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return response.json();
        })
        .then((result) => {
            const components = result.list[0].components;

            const { aqi, dominant } = calculateUSAqi(components);
            const category = getAqiCategory(aqi);

            aqiResult.textContent = `${aqi} (${category.label})`;
            aqiResult.className = category.className;
            dominantResult.textContent = dominant;

            coResult.textContent = components.co;
            nh3Result.textContent = components.nh3;
            noResult.textContent = components.no;
            no2Result.textContent = components.no2;
            o3Result.textContent = components.o3;
            pm2Result.textContent = components.pm2_5;
            pm10Result.textContent = components.pm10;
            so2Result.textContent = components.so2;

            resultContainer.style.display = "flex";
        })
        .catch((error) => {
            console.error("Error fetching data:", error);
            errorEl.textContent = "Failed to fetch air quality data. Please check your coordinates and try again.";
            resultContainer.style.display = "none";
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "Check Air Quality";
        });
});