const defaults = {
    'timerHoldDuration': 300,
    'decimalPlaces': 3,
    'hasConfetti': true,
}

// Populate inputs with current values
Object.keys(defaults).forEach(settingName => {
    const settingInputElement = document.getElementById(settingName);

    if (settingInputElement.type === 'checkbox') {  
        settingInputElement.checked = getSetting(settingName);
    } else if (settingInputElement.type === 'number') {
        settingInputElement.value = getSetting(settingName);
        settingInputElement.placeholder = defaults[settingName];
    }
});

// Listen for changes in any settings
const inputs = document.querySelectorAll('.setting-input');
inputs.forEach(input => {
    input.addEventListener('input', (event) => {
        const inputId = event.target.id;
        const settingInputElement = document.getElementById(inputId);

        if (settingInputElement.type === 'checkbox') {
            setSetting(inputId, event.target.checked);
        } else if (settingInputElement.type === 'number') {
            setSetting(inputId, event.target.value);
        }
    });
});

// Functions for settings
function setDefault(settingName) {
    setSetting(settingName, defaults[settingName]);
}

function setSetting(settingName, value) {
    const settingInputElement = document.getElementById(settingName);

    if (settingInputElement.type === 'checkbox') {
        settingInputElement.checked = value;
    } else if (settingInputElement.type === 'number') {
        if (value) {
            const minValue = parseInt(settingInputElement.min);
            const maxValue = parseInt(settingInputElement.max);
            value = parseInt(value);
    
            if (minValue !== NaN) { if (value < minValue) { value = minValue; } }
            if (maxValue !== NaN) { if (value > maxValue) { value = maxValue; } }
    
            settingInputElement.value = value;
        } else {
            value = defaults[settingName];
        }
    }

    const settingsObject = JSON.parse(localStorage.settings);
    settingsObject[settingName] = value;
    localStorage.settings = JSON.stringify(settingsObject);
}

function getSetting(settingName) {
    const settingsObject = JSON.parse(localStorage.settings);

    return settingsObject[settingName];
}