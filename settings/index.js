const defaults = {
    'timerHoldDuration': 300
}

// Populate inputs with current values
Object.keys(defaults).forEach(settingName => {
    const settingInputElement = document.getElementById(settingName);
    settingInputElement.value = getSetting(settingName);
    settingInputElement.placeholder = defaults[settingName];
});

// Listen for changes in any settings
const inputs = document.querySelectorAll('.setting-input');
inputs.forEach(input => {
    input.addEventListener('input', (event) => {
        const inputId = event.target.id;
        const newValue = event.target.value;
        
        setSetting(inputId, newValue);
    });
});

// Functions for settings
function setDefault(settingName) {
    setSetting(settingName, defaults[settingName]);
}

function setSetting(settingName, value) {
    const settingsObject = JSON.parse(localStorage.settings);
    settingsObject[settingName] = value;
    document.getElementById(settingName).value = value;
    localStorage.settings = JSON.stringify(settingsObject);
}

function getSetting(settingName) {
    const settingsObject = JSON.parse(localStorage.settings);

    return settingsObject[settingName];
}