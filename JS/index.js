let spaceHeldStart = 0;
let spaceHeldEnd = 0;

let timerStart = 0;
let timerEnd = 0;
let timerDuration = 0;
let timerInterval;

let inspectionStart = 0;
let inspectionEnd = 0;
let inspectionDuration = 0;
let inspectionInterval;

let currentScramble = '';

const headerElement = document.getElementById('header');
const timesElement = document.getElementById('times');
const timesTableElement = document.getElementById('times-table');
const scrambleElement = document.getElementById('scramble-text');
const timerElement = document.getElementById('timer-time');
const announcementElement = document.getElementById('announcement');
const differenceElement = document.getElementById('difference');
const averagesElement = document.getElementById('averages');
const moreStatsElement = document.getElementById('more-stats');
const footerElement = document.getElementById('footer');

const toHide = [
    headerElement,
    timesElement,
    scrambleElement,
    differenceElement,
    averagesElement,
    moreStatsElement,
    footerElement
];

const bigNumber = 999999999999999;

// Populate localStorage
if (!localStorage.sessions) {
    localStorage.sessions = JSON.stringify(
        {
            'Session 1': {
                'solves': [],
                'bests': {
                    'single': bigNumber,
                    'score': bigNumber * 2,
                    'mo3': bigNumber,
                    'ao5': bigNumber,
                    'ao12': bigNumber
                }
            }
        }
    );
}

if (!localStorage.settings) {
    localStorage.settings = JSON.stringify(
        {
            'timerHoldDuration': 300,
            'decimalPlaces': 3,
            'hasConfetti': true,
            'inspectionDuration': 15000,
        }
    );
}

// Gives a solve a score based on its time, and whether it is a DNF
function solveScore(solve) {
    return solve.time + solve.isDNF * bigNumber;
}

// Generate scramble
currentScramble = generateScramble().toString().replaceAll(',', ' ');
scrambleElement.innerText = currentScramble;

// Hide announcements to start with (TODO: show previous announcement no matter what)
announcementElement.style.visibility = 'hidden';

// Regenerate things if the user re-focuses the tab. This allows for seamless setting changes
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        updateText('Session 1');
    }
});

// Update times and stats
updateText('Session 1');


function updateText(sessionName) {
    // Fill in time list
    updateTimelist(sessionName);

    // Fill in time difference
    updateDifference(sessionName);

    // Fill in default time
    timerElement.innerText = formatDuration(0);

    // Make the time say the most recent time if possible
    const solvesArray = getSession(sessionName).solves;
    if (solvesArray.length > 0) {
        timerElement.innerText = formatDuration(solvesArray[solvesArray.length - 1].time);
    }

    // Fill in stats
    updateStats(sessionName);
}

// Timer event listeners
document.addEventListener('keydown', function (event) {
    if (event.key === ' ') {
        // Spacebar pressed
        if (spaceHeldStart === 0 && timerStart === 0 && (inspectionStart !== 0 || !getSetting('inspectionDuration'))) {
            // Try to start the timer

            spaceHeldStart = performance.now();
        }

        if (timerStart !== 0 && timerEnd === 0) {
            // Timer is running, so the user is pressing the spacebar to stop the timer

            // Stop updating the timer
            clearInterval(timerInterval);

            // Clear announcements
            let isAnnouncement = false;

            // Show final time
            timerEnd = performance.now();
            timerDuration = timerEnd - timerStart;
            updateTimer(timerEnd);

            // Add time to localStorage
            const isPersonalBest = timerDuration < getSession('Session 1').bests.score;
            const isPlusTwo = inspectionDuration < 0 && inspectionDuration >= -2000;
            const isDNF = inspectionDuration < -2000;

            if (isPlusTwo) {
                timerDuration += 2000;
            }

            newSolve('Session 1', timerDuration, isPlusTwo, isDNF, isPersonalBest, currentScramble);

            if (isPersonalBest) {
                editBest('Session 1', 'single', timerDuration);
                editBest('Session 1', 'score', timerDuration);

                if (getSetting('hasConfetti')) {
                    launchConfetti();
                }

                isAnnouncement = true;
                announcementElement.innerText = 'Session best single!';
            }

            // Generate new scramble
            currentScramble = generateScramble().toString().replaceAll(',', ' ');
            scrambleElement.innerText = currentScramble;

            // Update time list
            updateTimelist('Session 1');

            // Update difference
            updateDifference('Session 1');

            // Update stats
            updateStats('Session 1');

            // Show all hidden elements
            toHide.forEach(element => {
                element.style.visibility = 'visible';
            });

            // If there is an announcement, show it
            if (isAnnouncement) {
                announcementElement.style.visibility = 'visible';
            }
        }
    }
});

document.addEventListener('keyup', function (event) {
    if (event.key === ' ') {
        // Spacebar released
        if (spaceHeldStart === 0 && timerStart === 0 && inspectionStart === 0 && getSetting('inspectionDuration')) {
            // Start inspection
            inspectionInterval = setInterval(updateInspection, 1);
            inspectionStart = performance.now();

            // Hide each element except the timer
            toHide.forEach(element => {
                element.style.visibility = 'hidden';
            });
            announcementElement.style.visibility = 'hidden';
        } else if (timerStart === 0 && (inspectionStart !== 0 || !getSetting('inspectionDuration'))) {
            // Try to start the timer

            spaceHeldEnd = performance.now();
            const holdDuration = spaceHeldEnd - spaceHeldStart;
            spaceHeldStart = 0;

            if (holdDuration >= getSetting('timerHoldDuration')) {
                // Hide each element except the timer
                toHide.forEach(element => {
                    element.style.visibility = 'hidden';
                });
                announcementElement.style.visibility = 'hidden';

                // Spacebar has been held for long enough to start the timer

                inspectionEnd = spaceHeldEnd;
                inspectionDuration = getSetting('inspectionDuration') - (inspectionEnd - inspectionStart);

                clearInterval(inspectionInterval);

                timerStart = spaceHeldEnd;
                timerInterval = setInterval(updateTimer, 1);
            }
        } else {
            // Timer has stopped and the user is releasing the spacebar

            // Reset timer
            spaceHeldStart = 0;
            spaceHeldEnd = 0;

            timerStart = 0;
            timerEnd = 0;
            timerDuration = 0;

            inspectionStart = 0;
            inspectionEnd = 0;
            inspectionDuration = 0;
        }
    }
});

// Returns a time in the format mm:SS.XXX (capital letters are required digits)
function formatDuration(ms, decimalPlaces = getSetting('decimalPlaces')) {
    if (typeof ms === 'string') {
        return ms;
    }

    const microseconds = Math.round(ms * 1000) % 1000000;

    if (decimalPlaces < 2) { decimalPlaces = 2; }
    if (decimalPlaces > 4) { decimalPlaces = 4; }

    let fractionalPart = Math.floor(microseconds / 10 ** (6 - decimalPlaces));
    fractionalPart = fractionalPart.toString().padStart(decimalPlaces, '0');

    if (ms < 1000) {
        // If the duration is less than 1 second

        return `0.${fractionalPart}`;
    } else if (ms < 60000) {
        // If the duration is less than 1 minute

        const seconds = Math.floor(ms / 1000);

        return `${seconds}.${fractionalPart}`;
    } else {
        // If the duration is 1 minute or more

        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);

        return `${minutes}:${seconds.toString().padStart(2, '0')}.${fractionalPart}`;
    }
}

// Functions for updating parts of the web page
function updateTimelist(sessionName) {
    const solvesArray = getSession(sessionName).solves;

    timesTableElement.innerHTML = '<tr><th></th><th>time</th></tr>';

    for (let i = 0; i < solvesArray.length; i++) {
        const solve = solvesArray[i];

        const rowElement = document.createElement('tr');
        const numberElement = document.createElement('th');
        const timeElement = document.createElement('td');

        numberElement.innerText = i + 1;

        timeElement.className += 'neutral '
        timeElement.innerText = formatDuration(solve.time);
        if (solve.isDNF) {
            timeElement.className += 'dnf ';
        }
        if (solve.isPlusTwo) {
            timeElement.className += 'plus-2 ';
        }
        if (solve.isPersonalBest) {
            timeElement.className += 'personal-best ';
        }

        rowElement.appendChild(numberElement);
        rowElement.appendChild(timeElement);
        rowElement.className = 'time-row';
        rowElement.onclick = function() {
            window.open(`/monotimer/solve/?session=${sessionName}&solveIdx=${i}`);
        };

        timesTableElement.appendChild(rowElement);
    }
}

function updateDifference(sessionName) {
    const solvesArray = getSession(sessionName).solves;

    let timeDifference;
    if (solvesArray.length <= 1) {
        timeDifference = 0;
    } else {
        timeDifference = solvesArray[solvesArray.length - 1].time - solvesArray[solvesArray.length - 2].time;
    }

    differenceElement.innerText = formatDuration(Math.abs(timeDifference));

    if (timeDifference < 0) {
        differenceElement.className = 'faster';
    }

    if (timeDifference === 0) {
        differenceElement.className = 'same';
    }

    if (timeDifference > 0) {
        differenceElement.className = 'slower';
    }
}

function mean(times) {
    const sum = times.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    return sum / times.length;
}

function average(recentSolves) {
    // Get middle times for averaging
    let middleTimes = [...recentSolves];

    // Remove worst
    let worstIdx;
    let worstScore;
    for (let i = 0; i < middleTimes.length; i++) {
        const solve = middleTimes[i];
        const score = solveScore(solve);

        if (i === 0 || score > worstScore) {
            worstIdx = i;
            worstScore = score;
        }
    }
    middleTimes.splice(worstIdx, 1);

    // Remove best
    let bestIdx;
    let bestScore;
    for (let i = 0; i < middleTimes.length; i++) {
        const solve = middleTimes[i];
        const score = solveScore(solve);

        if (i === 0 || score < bestScore) {
            bestIdx = i;
            bestScore = score;
        }
    }
    middleTimes.splice(bestIdx, 1);

    for (let i = 0; i < middleTimes.length; i++) {
        middleTimes[i] = middleTimes[i].time;
    }

    return mean(middleTimes);
}

function calculateStats(sessionName) {
    const sessionObject = getSession(sessionName);
    const solvesArray = sessionObject.solves;

    let solves = [];

    let times = [];
    let bestSingle = bigNumber;
    let bestSingles = [];

    let scores = [];
    let bestScore = bigNumber * 2;
    let bestScores = [];

    let mo3s = [];
    let bestMo3 = bigNumber;
    let bestMo3s = [];

    let ao5s = [];
    let bestAo5 = bigNumber;
    let bestAo5s = [];

    let ao12s = [];
    let bestAo12 = bigNumber;
    let bestAo12s = [];

    solvesArray.forEach(solve => {
        solves.push(solve);

        // Singles
        const currentTime = solve.isDNF ? 'DNF' : solve.time;
        if (currentTime < bestSingle || bestSingle === bigNumber || bestSingle === 'DNF') {
            bestSingle = currentTime;
        }

        bestSingles.push(bestSingle);
        times.push(currentTime);

        // Scores
        const currentScore = solve.score;
        if (currentScore < bestScore) {
            bestScore = currentScore;
        }

        bestScores.push(bestScore);
        scores.push(currentScore);

        // Means of 3
        let currentMo3;
        const recent3Solves = solves.slice(-3);
        const recent3Times = times.slice(-3);

        if (recent3Times.length === 3) {
            // Check if any solve is a DNF
            recent3Solves.forEach(solve => {
                if (solve.isDNF) {
                    currentMo3 = 'DNF';
                }
            });

            if (currentMo3 !== 'DNF') {
                currentMo3 = mean(recent3Times);
            }
        } else {
            currentMo3 = '-';
        }

        if (currentMo3 !== '-' && (currentMo3 < bestMo3 || bestMo3 === bigNumber || (bestMo3 === 'DNF' && typeof currentMo3 === 'number'))) {
            bestMo3 = currentMo3;
        }

        bestMo3s.push(bestMo3);
        mo3s.push(currentMo3);

        // Averages of 5
        let currentAo5;
        const recent5Solves = solves.slice(-5);

        if (recent5Solves.length === 5) {
            // Check if any solve is a DNF
            recent5Solves.forEach(solve => {
                if (solve.isDNF) {
                    currentAo5 = 'DNF';
                }
            });

            if (currentAo5 !== 'DNF') {
                currentAo5 = average(recent5Solves);
            }
        } else {
            currentAo5 = '-';
        }

        if (currentAo5 !== '-' && (currentAo5 < bestAo5 || bestAo5 === bigNumber || (bestAo5 === 'DNF' && typeof currentAo5 === 'number'))) {
            bestAo5 = currentAo5;
        }

        bestAo5s.push(bestAo5);
        ao5s.push(currentAo5);

        // Averages of 12
        let currentAo12;
        const recent12Solves = solves.slice(-12);

        if (recent12Solves.length === 12) {
            // Check if any solve is a DNF
            recent12Solves.forEach(solve => {
                if (solve.isDNF) {
                    currentAo12 = 'DNF';
                }
            });

            if (currentAo12 !== 'DNF') {
                currentAo12 = average(recent12Solves);
            }
        } else {
            currentAo12 = '-';
        }

        if (currentAo12 !== '-' && (currentAo12 < bestAo12 || bestAo12 === bigNumber || (bestAo12 === 'DNF' && typeof currentAo12 === 'number'))) {
            bestAo12 = currentAo12;
        }

        bestAo12s.push(bestAo12);
        ao12s.push(currentAo12);
    });

    bestSingle = times.length > 0 ? bestSingle : '-';
    const currentSingle = times.length > 0 ? times[times.length - 1] : '-';

    bestScore = times.length > 0 ? bestScore : '-';
    const currentScore = times.length > 0 ? times[times.length - 1] : '-';

    bestMo3 = times.length >= 3 ? bestMo3 : '-';
    const currentMo3 = times.length >= 3 ? mo3s[mo3s.length - 1] : '-';

    bestAo5 = times.length >= 5 ? bestAo5 : '-';
    const currentAo5 = times.length >= 4 ? ao5s[ao5s.length - 1] : '-';

    bestAo12 = times.length >= 12 ? bestAo12 : '-';
    const currentAo12 = times.length >= 11 ? ao12s[ao12s.length - 1] : '-';

    return {
        'bestSingle': bestSingle,
        'currentSingle': currentSingle,
        'bestScore': bestScore,
        'currentScore': currentScore,
        'bestMo3': bestMo3,
        'currentMo3': currentMo3,
        'bestAo5': bestAo5,
        'currentAo5': currentAo5,
        'bestAo12': bestAo12,
        'currentAo12': currentAo12
    };
}

function updateStats(sessionName) {
    const stats = calculateStats(sessionName);

    // Update visuals
    document.getElementById('best-single').innerText = formatDuration(stats.bestSingle);
    document.getElementById('current-single').innerText = formatDuration(stats.currentSingle);

    document.getElementById('best-mo3').innerText = formatDuration(stats.bestMo3);
    document.getElementById('current-mo3').innerText = formatDuration(stats.currentMo3);
    document.getElementById('mo3').innerText = formatDuration(stats.currentMo3);
    if (stats.currentMo3 !== '-') {
        document.getElementById('mo3').className = stats.currentMo3 === stats.bestMo3 ? 'best' : '';
    } else {
        document.getElementById('mo3').className = '';
    }

    document.getElementById('best-ao5').innerText = formatDuration(stats.bestAo5);
    document.getElementById('current-ao5').innerText = formatDuration(stats.currentAo5);
    document.getElementById('ao5').innerText = formatDuration(stats.currentAo5);
    if (stats.currentAo5 !== '-') {
        document.getElementById('ao5').className = stats.currentAo5 === stats.bestAo5 ? 'best' : '';
    } else {
        document.getElementById('ao5').className = '';
    }

    document.getElementById('best-ao12').innerText = formatDuration(stats.bestAo12);
    document.getElementById('current-ao12').innerText = formatDuration(stats.currentAo12);
    document.getElementById('ao12').innerText = formatDuration(stats.currentAo12);
    if (stats.currentAo12 !== '-') {
        document.getElementById('ao12').className = stats.currentAo12 === stats.bestAo12 ? 'best' : '';
    } else {
        document.getElementById('ao12').className = '';
    }

    // Update localStorage
    let sessionsObject = JSON.parse(localStorage.sessions);
    let sessionObject = sessionsObject[sessionName];
    let bestsObject = sessionObject.bests;

    bestsObject.single = stats.bestSingle === '-' ? bigNumber : stats.bestSingle;
    bestsObject.score = stats.bestScore === '-' ? bigNumber * 2 : stats.bestScore;
    bestsObject.mo3 = stats.bestMo3 === '-' ? bigNumber : stats.bestMo3;
    bestsObject.ao5 = stats.bestAo5 === '-' ? bigNumber : stats.bestAo5;
    bestsObject.ao12 = stats.bestAo12 === '-' ? bigNumber : stats.bestAo12;

    localStorage.sessions = JSON.stringify(sessionsObject);
}

function updateTimer(end = performance.now()) {
    timerDuration = end - timerStart;
    const formattedDuration = formatDuration(timerDuration);
    timerElement.innerText = formattedDuration;
}

function updateInspection(end = performance.now()) {
    inspectionDuration = getSetting('inspectionDuration') - (end - inspectionStart);

    if (inspectionDuration < 0 && inspectionDuration > -2000) {
        timerElement.innerText = '+2';
    } else if (inspectionDuration < -2000) {
        timerElement.innerText = 'DNF';
    } else {
        const formattedDuration = formatDuration(inspectionDuration, 2);
        timerElement.innerText = formattedDuration;
    }
}

// Generates a scramble of a given length (default 20)
function generateScramble(length = 20) {
    const faces = ['F', 'B', 'U', 'D', 'L', 'R'];
    const turns = ['', "'", '2'];

    let scramble = [];
    while (scramble.length < length) {
        const randomFace = faces[Math.floor(Math.random() * faces.length)];
        const randomTurn = turns[Math.floor(Math.random() * turns.length)];
        const randomMove = randomFace + randomTurn;

        if (scramble.length > 1) {
            const previousMove = scramble[scramble.length - 1];

            if (previousMove[0] === randomMove[0]) {
                continue;
            }
        }

        scramble.push(randomMove);
    }

    return scramble;
}

// Functions for adding/editing/deleting/retrieving solves and sessions
function newSession(sessionName) {
    let sessionsObject = JSON.parse(localStorage.sessions);

    sessionsObject[sessionName] = {
        'solves': [],
        'bests': {
            'single': bigNumber,
            'mo3': bigNumber,
            'ao5': bigNumber,
            'ao12': bigNumber
        }
    };

    localStorage.sessions = JSON.stringify(sessionsObject);
}

function deleteSession(sessionName) {
    let sessionsObject = JSON.parse(localStorage.sessions);
    delete sessionsObject[sessionName];

    localStorage.sessions = JSON.stringify(sessionsObject);
}

function getSession(sessionName) {
    let sessionsObject = JSON.parse(localStorage.sessions);

    return sessionsObject[sessionName];
}

function newSolve(sessionName, finalTime, isPlusTwo, isDNF, isPersonalBest, scramble) {
    let sessionsObject = JSON.parse(localStorage.sessions);
    let sessionObject = sessionsObject[sessionName];

    sessionObject.solves.push(
        {
            'time': finalTime,
            'isPlusTwo': isPlusTwo,
            'isDNF': isDNF,
            'isPersonalBest': isPersonalBest,
            'scramble': scramble,
            'score': solveScore({ 'time': finalTime + 2 * isPlusTwo, 'isDNF': isDNF })
        }
    );

    localStorage.sessions = JSON.stringify(sessionsObject);
}

function getSolve(sessionName, solveIdx) {
    let sessionsObject = JSON.parse(localStorage.sessions);
    let sessionObject = sessionsObject[sessionName];

    return sessionObject.solves[solveIdx];
}

function editBest(sessionName, bestType, value) {
    let sessionsObject = JSON.parse(localStorage.sessions);
    let sessionObject = sessionsObject[sessionName];

    sessionObject.bests[bestType] = value;

    localStorage.sessions = JSON.stringify(sessionsObject);
}

function editSolve(sessionName, solveIdx, isPlusTwo, isDNF) {
    // undefined - leave alone
    // true      - toggle
    // false     - turn off

    let sessionsObject = JSON.parse(localStorage.sessions);
    let sessionObject = sessionsObject[sessionName];
    let solveObject = sessionObject.solves[solveIdx];

    if (isPlusTwo !== undefined) {
        const previousState = solveObject.isPlusTwo;

        // handle toggles and turning off
        if (isPlusTwo) {
            solveObject.isPlusTwo = !previousState;

            if (previousState) {
                solveObject.time -= 2000;
            } else {
                solveObject.time += 2000;
            }
        } else {
            solveObject.isPlusTwo = false;

            if (previousState) {
                solveObject.time -= 2000;
            }
        }
    }

    if (isDNF !== undefined) {
        // handle toggles and turning off
        if (isDNF) {
            solveObject.isDNF = !solveObject.isDNF;
        } else {
            solveObject.isDNF = false;
        }
    }

    solveObject.score = solveScore(solveObject);
    localStorage.sessions = JSON.stringify(sessionsObject);

    updateStats(sessionName);
    const isPersonalBest = solveObject.score <= getSession(sessionName).bests.score;
    solveObject.isPersonalBest = isPersonalBest;

    localStorage.sessions = JSON.stringify(sessionsObject);

    updateStats(sessionName);
}

function deleteSolve(sessionName, solveIdx) {
    let sessionsObject = JSON.parse(localStorage.sessions);
    let sessionObject = sessionsObject[sessionName];
    sessionObject.solves.splice(solveIdx, 1);

    localStorage.sessions = JSON.stringify(sessionsObject);
}

// function exampleFunction() {
//     let sessionsObject = JSON.parse(localStorage.sessions);
//     // code goes here
//     localStorage.sessions = JSON.stringify(sessionsObject);
// }

// Confetti!
function launchConfetti() {
    // Locate the timer element
    const timerRect = timerElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const timerX = (timerRect.x + timerRect.width / 2);
    const timerY = (timerRect.y + timerRect.height / 2);

    // Use the full-screen confetti option
    confetti({
        particleCount: 500,
        spread: 360,
        origin: {
            // Normalise the values to be between 0 and 1
            x: timerX / viewportWidth,
            y: timerY / viewportHeight
        },
        colors: [
            '#FF6188',
            '#FC9867',
            '#FFD866',
            '#A9DC76',
            '#78DCE8',
            '#AB9DF2'
        ],
        startVelocity: 70
    });
}

// Handle user editing a solve
// Event listener for keyboard shortcuts
document.addEventListener('keydown', function (event) {
    // Check if Shift key is pressed
    if (event.shiftKey) {
        switch (event.key) {
            case 'D':
                if (confirm('Are you sure you want to mark this solve as DNF?')) {
                    handleDNF('Session 1');
                }
                break;
            case 'P':
                if (confirm('Are you sure you want to add a +2 penalty to this solve?')) {
                    handlePlusTwo('Session 1');
                }
                break;
            case 'X':
                if (confirm('Are you sure you want to delete this solve? (This can not be undone)')) {
                    handleDeleteSolve('Session 1');
                }
                break;
            case 'O':
                if (confirm('Are you sure you want to mark this solve as OK?')) {
                    handleOkSolve('Session 1');
                }
                break;
            default:
                break;
        }
    }
});

// Marks the most recent solve as a DNF
function handleDNF(sessionName) {
    editSolve(sessionName, getSession(sessionName).solves.length - 1, false, true);

    updateTimelist(sessionName);
    updateStats(sessionName);
}

// Marks the most recent solve as a +2
function handlePlusTwo(sessionName) {
    editSolve(sessionName, getSession(sessionName).solves.length - 1, true, false);

    updateTimelist(sessionName);
    updateStats(sessionName);
}

// Deletes the most recent solve
function handleDeleteSolve(sessionName) {
    deleteSolve(sessionName, getSession(sessionName).solves.length - 1);

    updateTimelist(sessionName);
    updateStats(sessionName);
}

// Removes any flags from the most recent solve
function handleOkSolve(sessionName) {
    editSolve(sessionName, getSession(sessionName).solves.length - 1, false, false);

    updateTimelist(sessionName);
    updateStats(sessionName);
}

// Functions for settings
function getSetting(settingName) {
    const settingsObject = JSON.parse(localStorage.settings);

    return settingsObject[settingName];
}