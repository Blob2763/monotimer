const bigNumber = 999999999999999;

const url = window.location.href;
const urlObj = new URL(url);
const params = new URLSearchParams(urlObj.search);

const sessionName = params.get('session');
const solveIdx = params.get('solveIdx');

if (getSolve(sessionName, solveIdx)) {
    document.getElementById('session-name').innerText = sessionName.toUpperCase();
    document.getElementById('solve-number').innerText = parseInt(solveIdx) + 1;

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            updateSolveText();
        }
    });

    updateSolveText();

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

    function updateSolveText() {
        const solve = getSolve(sessionName, solveIdx);

        const timeElement = document.getElementById('solve-time');
        timeElement.innerText = formatDuration(solve.time);

        timeElement.className = 'neutral '
        timeElement.innerText = formatDuration(solve.time);
        if (solve.isDNF) {
            timeElement.className += 'dnf '
        }
        if (solve.isPlusTwo) {
            timeElement.className += 'plus-2 '
        }
        if (solve.isPersonalBest) {
            timeElement.className += 'personal-best '
        }

        const scrambleElement = document.getElementById('solve-scramble');
        scrambleElement.innerText = solve.scramble;
    }

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

    function getSetting(settingName) {
        const settingsObject = JSON.parse(localStorage.settings);

        return settingsObject[settingName];
    }

    // Marks the most recent solve as a DNF
    function handleDNF(sessionName) {
        editSolve(sessionName, solveIdx, false, true);

        updateSolveText();
    }

    // Marks the most recent solve as a +2
    function handlePlusTwo(sessionName) {
        editSolve(sessionName, solveIdx, true, false);

        updateSolveText();
    }

    // Deletes the most recent solve
    function handleDeleteSolve(sessionName) {
        deleteSolve(sessionName, solveIdx);

        window.close();
    }

    // Removes any flags from the most recent solve
    function handleOkSolve(sessionName) {
        editSolve(sessionName, solveIdx, false, false);

        updateSolveText();
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
                solveObject.isPlusTwo = false

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
                solveObject.isDNF = false
            }
        }

        solveObject.score = solveScore(solveObject);
        localStorage.sessions = JSON.stringify(sessionsObject);

        updateStats(sessionName);
        console.log(solveObject.score, getSession(sessionName).bests.score);
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

    function solveScore(solve) {
        return solve.time + solve.isDNF * bigNumber;
    }

    function getSession(sessionName) {
        let sessionsObject = JSON.parse(localStorage.sessions);

        return sessionsObject[sessionName];
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

        solvesArray.forEach(solve => {
            solves.push(solve);

            // Singles
            const currentTime = solve.isDNF ? 'DNF' : solve.time;
            if (currentTime < bestSingle || bestSingle === bigNumber || bestSingle === 'DNF') {
                bestSingle = currentTime
            }

            bestSingles.push(bestSingle);
            times.push(currentTime);

            // Scores
            const currentScore = solve.score;
            if (currentScore < bestScore) {
                bestScore = currentScore
            }

            bestScores.push(bestScore);
            scores.push(currentScore);
        });

        bestSingle = times.length > 0 ? bestSingle : '-';
        const currentSingle = times.length > 0 ? times[times.length - 1] : '-';

        bestScore = times.length > 0 ? bestScore : '-';
        const currentScore = times.length > 0 ? times[times.length - 1] : '-';

        return {
            'bestSingle': bestSingle,
            'currentSingle': currentSingle,
            'bestScore': bestScore,
            'currentScore': currentScore,
        };
    }

    function updateStats(sessionName) {
        const stats = calculateStats(sessionName);

        // Update localStorage
        let sessionsObject = JSON.parse(localStorage.sessions);
        let sessionObject = sessionsObject[sessionName];
        let bestsObject = sessionObject.bests;

        bestsObject.single = stats.bestSingle === '-' ? bigNumber : stats.bestSingle;
        bestsObject.score = stats.bestScore === '-' ? bigNumber * 2 : stats.bestScore;

        localStorage.sessions = JSON.stringify(sessionsObject);
    }
} else {
    document.getElementById('header-text').innerText = 'SOLVE NOT FOUND!';
    document.getElementById('content').innerHTML = '';
}

function getSolve(sessionName, solveIdx) {
    let sessionsObject = JSON.parse(localStorage.sessions);
    let sessionObject = sessionsObject[sessionName];

    return sessionObject.solves[solveIdx];
}