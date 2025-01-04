const apiBaseUrl = 'http://127.0.0.1:5000';

async function fetchAQI(city) {
    try {
        console.log(`Fetching AQI data for ${city}...`);
        const response = await fetch(`${apiBaseUrl}/predict?city=${city}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data for ${city}. Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Data for ${city}:`, data);
        return data;
    } catch (error) {
        console.error(`Error fetching AQI for ${city}:`, error);
        return null;
    }
}

// Update AQI data for Lahore and Multan
async function updateAQI() {
    const cities = ['Lahore', 'Multan', 'Bahawalpur', 'Rawalpindi', 'Faisalabad']; // Add cities dynamically as needed
    const cityContainer = document.getElementById('cities');
    cityContainer.innerHTML = ''; // Clear existing content

    for (const city of cities) {
        // Dynamically create city cards if they don’t exist
        const cityId = city.toLowerCase();
        if (!document.getElementById(`city-${cityId}`)) {
            cityContainer.innerHTML += `
                <div class="city" id="city-${cityId}">
                    <h2>${city}</h2>
                    <p><strong>Current AQI:</strong> <span id="current-${cityId}">Loading...</span></p>
                    <p><strong>Predicted AQI:</strong> <span id="predicted-${cityId}">Loading...</span></p>
                    <div id="aqiColorBlocks-${cityId} " style="display: flex; width: 100%; height: 50px; margin-top: 10px;">
                        <div style="flex: 1; background: #008000;"></div>
                        <div style="flex: 1; background: #ADFF2F;"></div>
                        <div style="flex: 1; background: #FFFF00;"></div>
                        <div style="flex: 1; background: #FFA500;"></div>
                        <div style="flex: 1; background: #FF0000;"></div>
                    </div>
                    <div id="aqiIndicator-${cityId}" style="position: relative; width: 4px; height: 50px; background: black; top: -50px;"></div>
                    <p id="aqiCategory-${cityId}" style="text-align: center; margin-top: 10px; font-weight: bold;">Category: Loading...</p>
                </div>`;
        }

        const data = await fetchAQI(city);
        if (data) {
            document.getElementById(`current-${cityId}`).innerText = data['Current AQI'] || 'N/A';
            document.getElementById(`predicted-${cityId}`).innerText = 
                data['Predicted AQI'] ? parseFloat(data['Predicted AQI']).toFixed(3) : 'N/A';

            renderAQIStrip(city, data['Current AQI'], data['Category']);
        }
    }
}
// Render AQI classification chart
function renderAQIStrip(city, aqiValue, category) {
    const indicator = document.getElementById(`aqiIndicator-${city.toLowerCase()}`);
    const categoryLabel = document.getElementById(`aqiCategory-${city.toLowerCase()}`);

    // Define AQI category ranges
    const aqiRanges = [
        { category: "Good", max: 50 },
        { category: "Moderate", max: 100 },
        { category: "Unhealthy for Sensitive Groups", max: 150 },
        { category: "Unhealthy", max: 200 },
        { category: "Very Unhealthy", max: 300 },
        { category: "Hazardous", max: 500 }
    ];

    // Cap AQI value to the maximum range
    const cappedAQI = Math.min(aqiValue, 500);

    // Determine block index based on capped AQI value
    let blockIndex = aqiRanges.findIndex(range => cappedAQI <= range.max);
    if (blockIndex === -1) blockIndex = aqiRanges.length - 1;

    // Calculate left position based on block index and capped value
    const blockWidthPercentage = 100 / aqiRanges.length;
    const rangeMin = blockIndex === 0 ? 0 : aqiRanges[blockIndex - 1].max;
    const rangeMax = aqiRanges[blockIndex].max;
    const rangePercentage = ((cappedAQI - rangeMin) / (rangeMax - rangeMin)) * blockWidthPercentage;

    const positionPercentage = blockIndex * blockWidthPercentage + rangePercentage;

    // Move the indicator
    indicator.style.left = `${positionPercentage}%`;

    // Update category label
    categoryLabel.innerText = `Category: ${category}`;
}

// Fetch data on page load
window.onload = updateAQI;
