const form = document.getElementById("form");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const resultContainer = document.getElementById("result");
const aqiResult = document.getElementById("aqi");
const coResult = document.getElementById("co");
const nh3Result = document.getElementById("nh3");
const noResult = document.getElementById("no");
const no2Result = document.getElementById("no2");
const o3Result = document.getElementById("o3");
const pm2Result = document.getElementById("pm2_5");
const pm10Result = document.getElementById("pm10");
const so2Result = document.getElementById("so2");

form.addEventListener("submit",(event)=>{
    event.preventDefault();
    const latitude = latitudeInput.value;
    const longitude = longitudeInput.value;
    const APIkey="4d2f3666fffa7c76219679308d645f73";
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${APIkey}`;
    
    
    fetch(url)
        .then(response=>response.json())
        .then(result=>{
            let readings = result.list[0].components;
            let readings2 = result.list[0].main;
            const aqiLevels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];

            
            aqiResult.textContent = `${readings2.aqi} (${aqiLevels[readings2.aqi - 1]})`;
            coResult.textContent=readings.co;
            nh3Result.textContent=readings.nh3;
            noResult.textContent=readings.no;
            no2Result.textContent=readings.no2;
            pm2Result.textContent=readings.pm2_5;
            o3Result.textContent=readings.o3;
            pm10Result.textContent=readings.pm10;
            so2Result.textContent=readings.so2;
         

            resultContainer.style.display = 'flex';
        })
        .catch(error => {
    console.error("Error fetching data:", error);
    resultContainer.textContent = "Failed to fetch air quality data.";
    resultContainer.style.display = 'flex';
  });


});
