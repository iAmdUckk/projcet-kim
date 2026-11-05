// Web Audio API Synthesizer & Sequencer for Wizard's Rhythm Tower

// Note Frequencies Table
const NOTES = {
    // Rests
    'R': 0,
    // Octave 2
    'G2': 98.00, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
    // Octave 3
    'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56,
    'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'Gb3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'Ab3': 207.65,
    'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
    // Octave 4
    'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13,
    'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'Ab4': 415.30,
    'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
    // Octave 5
    'C5': 523.25, 'C#5': 554.37, 'Db5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25,
    'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'Gb5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'Ab5': 830.61,
    'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
    // Octave 6
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F#6': 1479.98, 'G6': 1567.98
};

// Core Audio State
let audioCtx = null;
let masterGain = null;
let musicGain = null;
let noiseBuffer = null;
let isAudioInitialized = false;

// Sequencer Variables
let activeSong = null;
let isSongPlaying = false;
let songStartTime = 0;
let nextNoteIndex = 0;
let nextVisualNoteIndex = 0;
let schedulerTimer = null;
let onNoteSpawnCallback = null;
let onSongEndCallback = null;

// Scheduler Timing Constants
const scheduleAheadTime = 0.15; // 150ms audio scheduling lookahead
const lookahead = 25;           // scheduler interval in ms
const visualSpawnAheadTime = 2.0; // spawn visual notes 2 sec ahead

// YouTube Player State
let ytPlayer = null;
let isYtPlayerReady = false;
let isPlayingYt = false;
let ytSchedulerStarted = false;

// Uploaded recordings play on the same audio clock as their notes.
let customAudioSourceNode = null;

// Floor Audio Sources (0 = Floor 1, 4 = Floor 5)
// Default to the two KakaoTalk Mili MP3 files in assets/
const floorAudioSources = [
    null, // Optional asset is registered only after it is found
    null, // Floor 2: classical
    null, // Floor 3: classical
    null, // Floor 4: classical
    null
];

let currentAudioElement = null;
let currentAudioElementSource = null;
let currentAudioStarted = false;

// API to register audio
function setFloorAudioUrl(floorIndex, url, name, bpm = 135) {
    if (floorIndex >= 0 && floorIndex < 5) {
        floorAudioSources[floorIndex] = {
            url: url,
            name: name,
            duration: 180,
            bpm: bpm
        };
        const testAudio = new Audio(url);
        testAudio.addEventListener('loadedmetadata', () => {
            if (testAudio.duration && !isNaN(testAudio.duration)) {
                if (floorAudioSources[floorIndex] && floorAudioSources[floorIndex].url === url) {
                    floorAudioSources[floorIndex].duration = testAudio.duration;
                }
            }
        });
        console.log(`[Audio] Floor ${floorIndex + 1} audio set: ${name}`);
    }
}

// Fallback compatibility functions
function setFloorAudioBuffer(floorIndex, buffer, filename) {
    setFloorAudioUrl(floorIndex, 'assets/floor' + (floorIndex + 1) + '.mp3', filename);
}

function clearAllFloorAudio() {
    for (let i = 0; i < 5; i++) {
        floorAudioSources[i] = null;
    }
    console.log('[Audio] All floor audio reset.');
}

function setCustomAudioBuffer(buffer, filename) {
    setFloorAudioUrl(0, 'assets/floor1.mp3', filename);
}

// Initialize YouTube Player API script dynamically
function initYoutubePlayer() {
    if (document.getElementById('yt-api-script')) return;
    
    const tag = document.createElement('script');
    tag.id = 'yt-api-script';
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Global Callback required by YouTube Player API
window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('youtube-player-container', {
        height: '200',
        width: '200',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'modestbranding': 1,
            'rel': 0,
            'origin': 'http://localhost:8080'
        },
        events: {
            'onReady': (event) => {
                isYtPlayerReady = true;
                event.target.mute(); // Keep muted until we actually start a song
                console.log("[YT] YouTube Player API Ready! isYtPlayerReady =", isYtPlayerReady);
            },
            'onStateChange': (event) => {
                console.log("[YT] State changed:", event.data);
                // YT.PlayerState.PLAYING = 1
                if (event.data === 1 && isPlayingYt && !ytSchedulerStarted) {
                    ytSchedulerStarted = true;
                    ytPlayer.unMute();
                    const volEl = document.getElementById('volume-slider');
                    const vol = volEl ? parseInt(volEl.value) : 50;
                    ytPlayer.setVolume(vol);
                    schedulerTimer = setInterval(scheduler, lookahead);
                    console.log("[YT] Playback confirmed — scheduler started! Time:", ytPlayer.getCurrentTime());
                }
                // YT.PlayerState.ENDED = 0
                if (event.data === 0 && isPlayingYt) {
                    isPlayingYt = false;
                    stopSong();
                    if (onSongEndCallback) onSongEndCallback();
                }
            },
            'onError': (event) => {
                console.error("[YT] Player error:", event.data);
            }
        }
    });
};

// ── Dynamic Rhythm Chart Engine ──
// Comprehensive pattern library inspired by DJMAX, SDVX, and Osu!mania
const RHYTHM_PATTERNS = [
    // 1. Beginner Single Hits (Floor 1 focus)
    { name: "single_d",         lanes: [0],                    subDiv: 1,    minFloor: 0 },
    { name: "single_f",         lanes: [1],                    subDiv: 1,    minFloor: 0 },
    { name: "single_j",         lanes: [2],                    subDiv: 1,    minFloor: 0 },
    { name: "single_k",         lanes: [3],                    subDiv: 1,    minFloor: 0 },
    { name: "two_beat_alternate",lanes: [0, 2],                subDiv: 1,    minFloor: 0 },
    { name: "two_beat_in",      lanes: [1, 2],                subDiv: 1,    minFloor: 0 },
    { name: "two_beat_out",     lanes: [0, 3],                subDiv: 1,    minFloor: 0 },

    // 2. Fundamental Steps & Stairs (Quarter-note)
    { name: "stair_up",         lanes: [0, 1, 2, 3],          subDiv: 1,    minFloor: 0 },
    { name: "stair_down",       lanes: [3, 2, 1, 0],          subDiv: 1,    minFloor: 0 },
    { name: "stair_wave",       lanes: [0, 1, 2, 1],          subDiv: 1,    minFloor: 0 },
    { name: "stair_pendulum",   lanes: [3, 2, 1, 2],          subDiv: 1,    minFloor: 0 },

    // 3. 8th-note Stairs (Floor 2+)
    { name: "stair_fast_up",    lanes: [0, 1, 2, 3],          subDiv: 0.5,  minFloor: 1 },
    { name: "stair_fast_down",  lanes: [3, 2, 1, 0],          subDiv: 0.5,  minFloor: 1 },
    { name: "double_stair_up",  lanes: [0, 1, 2, 3, 1, 2, 3], subDiv: 0.5,  minFloor: 2 },
    { name: "double_stair_down",lanes: [3, 2, 1, 0, 2, 1, 0], subDiv: 0.5,  minFloor: 2 },

    // 4. Trills (Alternations)
    { name: "trill_in",         lanes: [1, 2, 1, 2],          subDiv: 0.5,  minFloor: 1 },
    { name: "trill_out",        lanes: [0, 3, 0, 3],          subDiv: 0.5,  minFloor: 1 },
    { name: "trill_left",       lanes: [0, 1, 0, 1],          subDiv: 0.5,  minFloor: 1 },
    { name: "trill_right",      lanes: [2, 3, 2, 3],          subDiv: 0.5,  minFloor: 1 },
    { name: "extended_trill_l", lanes: [0, 1, 0, 1, 0, 1],   subDiv: 0.5,  minFloor: 2 },
    { name: "extended_trill_r", lanes: [3, 2, 3, 2, 3, 2],   subDiv: 0.5,  minFloor: 2 },

    // 5. Rolls & Waves
    { name: "roll_in",          lanes: [0, 2, 1, 3],          subDiv: 0.5,  minFloor: 1 },
    { name: "roll_out",         lanes: [3, 1, 2, 0],          subDiv: 0.5,  minFloor: 1 },
    { name: "butterfly",        lanes: [0, 3, 1, 2],          subDiv: 0.5,  minFloor: 1 },
    { name: "butterfly_reverse",lanes: [1, 2, 0, 3],          subDiv: 0.5,  minFloor: 1 },
    { name: "zigzag_6",         lanes: [0, 2, 1, 3, 1, 2],   subDiv: 0.5,  minFloor: 2 },
    { name: "zigzag_8",         lanes: [0, 2, 1, 3, 2, 0, 3, 1], subDiv: 0.5, minFloor: 2 },
    { name: "cascade_wave",     lanes: [0, 1, 0, 2, 1, 3],   subDiv: 0.5,  minFloor: 2 },

    // 6. Jacks (Repeated Same-Key Taps)
    { name: "jacks_split",      lanes: [0, 0, 3, 3],          subDiv: 0.5,  minFloor: 1 },
    { name: "jacks_mid",        lanes: [1, 1, 2, 2],          subDiv: 0.5,  minFloor: 1 },
    { name: "jack_alternating", lanes: [0, 0, 1, 2, 2, 3],   subDiv: 0.5,  minFloor: 2 },
    { name: "rapid_jack_left",  lanes: [0, 0, 0, 1, 2],      subDiv: 0.5,  minFloor: 3 },
    { name: "rapid_jack_right", lanes: [3, 3, 3, 2, 1],      subDiv: 0.5,  minFloor: 3 },

    // 7. Chords & Dual Hits (Floor 2+)
    { name: "chord_pulse",      lanes: [[0,3],[1,2]],         subDiv: 1,    minFloor: 1 },
    { name: "chord_sweep",      lanes: [[0,1],[2,3]],         subDiv: 1,    minFloor: 1 },
    { name: "chord_mirror",     lanes: [[0,2],[1,3]],         subDiv: 1,    minFloor: 2 },
    { name: "outer_inner",      lanes: [[0,3],[1,2],[0,3],[1,2]], subDiv: 1, minFloor: 2 },
    { name: "chord_stair",      lanes: [[0,1], 2, [2,3], 1], subDiv: 0.5,  minFloor: 2 },
    { name: "flam_dual",        lanes: [0, [1,3], 2, [0,2]], subDiv: 0.5,  minFloor: 3 },

    // 8. Syncopated Grooves & Gallops (Floor 3+)
    { name: "gallop_left",      lanes: [0, 0, 1, 2],          subDiv: 0.5,  minFloor: 2 },
    { name: "gallop_right",     lanes: [3, 3, 2, 1],          subDiv: 0.5,  minFloor: 2 },
    { name: "polyrhythm_groove",lanes: [0, 2, 1, 3, 0, 3],   subDiv: 0.5,  minFloor: 3 },
    { name: "cross_lr",         lanes: [0, 3, 1, 2, 0, 3],   subDiv: 0.5,  minFloor: 2 },
    { name: "cross_rl",         lanes: [3, 0, 2, 1, 3, 0],   subDiv: 0.5,  minFloor: 2 },

    // 9. 16th-note Bursts & Complex Poly Streams (Floor 4 ~ 5 Boss)
    { name: "burst_left",       lanes: [0, 1, 0, 1, 2, 1],   subDiv: 0.25, minFloor: 3 },
    { name: "burst_right",      lanes: [3, 2, 3, 2, 1, 2],   subDiv: 0.25, minFloor: 3 },
    { name: "burst_full_stream",lanes: [0, 1, 2, 3, 2, 1, 0, 1], subDiv: 0.25, minFloor: 4 },
    { name: "burst_dual_ending",lanes: [0, 2, 1, 3, [0,3]],  subDiv: 0.25, minFloor: 4 },
    { name: "triple_chord",     lanes: [[0,1,2],[1,2,3],[0,2,3]], subDiv: 1, minFloor: 3 }
];

// Fisher-Yates shuffle (in-place)
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Universal Chart Generator — Floor-based progressive difficulty & rich varied patterns
function createDynamicChart(durationSec, bpm, floorOrDiff = 0) {
    const validDuration = (typeof durationSec === 'number' && durationSec > 5) ? durationSec : 120;
    const validBpm = (typeof bpm === 'number' && bpm > 30) ? bpm : 128;
    const notes = [];
    const beatsPerSec = validBpm / 60;
    const totalBeats = Math.floor(validDuration * beatsPerSec);

    // Normalize floor level (0 to 4)
    let floorIndex = 0;
    if (typeof floorOrDiff === 'number') {
        floorIndex = Math.max(0, Math.min(4, floorOrDiff));
    } else if (floorOrDiff === 'easy') {
        floorIndex = 0;
    } else if (floorOrDiff === 'normal') {
        floorIndex = 1;
    } else if (floorOrDiff === 'hard') {
        floorIndex = 3;
    } else if (floorOrDiff === 'boss') {
        floorIndex = 4;
    }

    let currentBeat = 4; // 4-beat lead-in (no notes)

    // Filter pattern pool eligible for this floor level
    const floorEligiblePatterns = RHYTHM_PATTERNS.filter(p => p.minFloor <= floorIndex);
    let patternPool = shuffleArray([...floorEligiblePatterns]);
    let poolIndex = 0;
    const recentHistory = [];
    const HISTORY_BLOCK = Math.min(8, Math.max(3, Math.floor(floorEligiblePatterns.length / 2)));

    function pickNextPattern(allowedNames) {
        for (let attempt = 0; attempt < patternPool.length * 2; attempt++) {
            if (poolIndex >= patternPool.length) {
                patternPool = shuffleArray([...floorEligiblePatterns]);
                poolIndex = 0;
            }
            const candidate = patternPool[poolIndex++];
            if (recentHistory.includes(candidate.name)) continue;
            if (allowedNames && !allowedNames.includes(candidate.name)) continue;
            return candidate;
        }
        const fallback = floorEligiblePatterns.filter(p => !recentHistory.includes(p.name));
        return fallback.length > 0
            ? fallback[Math.floor(Math.random() * fallback.length)]
            : floorEligiblePatterns[0];
    }

    while (currentBeat < totalBeats - 4) {
        const progress = currentBeat / totalBeats; // 0.0 → 1.0

        // ── Section-based intensity & density calibrated per Floor ──
        let intensity = 0.5 + floorIndex * 0.3; // Floor 0: 0.5, Floor 1: 0.8, Floor 2: 1.1, Floor 3: 1.4, Floor 4: 1.7
        let densityBias = 'any';
        let restChance = Math.max(0.04, 0.40 - floorIndex * 0.08); // Floor 0: 40% rests, Floor 4: ~8% rests
        let restLength = Math.max(0.5, 2.0 - floorIndex * 0.35);

        if (floorIndex === 0) {
            // Floor 1 (Easy & accessible intro): Single hits and slow quarter stairs
            if (progress < 0.3) {
                densityBias = 'sparse'; restChance = 0.50; restLength = 2.0;
            } else if (progress < 0.75) {
                densityBias = 'sparse'; restChance = 0.35; restLength = 1.0;
            } else {
                densityBias = 'any'; restChance = 0.25; restLength = 1.0;
            }
        } else if (floorIndex === 1) {
            // Floor 2 (Normal): Introducing trills and alternating rolls
            if (progress < 0.2) {
                densityBias = 'sparse'; restChance = 0.40; restLength = 1.5;
            } else if (progress < 0.7) {
                densityBias = 'any'; restChance = 0.25; restLength = 1.0;
            } else {
                densityBias = 'dense'; restChance = 0.15; restLength = 0.5;
            }
        } else if (floorIndex === 2) {
            // Floor 3 (Intermediate): Chords, gallops, and 6-note zigzags
            if (progress < 0.15) {
                densityBias = 'sparse'; restChance = 0.30; restLength = 1.0;
            } else if (progress < 0.6) {
                densityBias = 'any'; restChance = 0.18; restLength = 0.5;
            } else {
                densityBias = 'dense'; restChance = 0.10; restLength = 0.5;
            }
        } else if (floorIndex === 3) {
            // Floor 4 (Hard): Rapid 16th bursts and extended polyrhythms
            if (progress < 0.1) {
                densityBias = 'any'; restChance = 0.20; restLength = 0.5;
            } else if (progress < 0.6) {
                densityBias = 'dense'; restChance = 0.12; restLength = 0.5;
            } else {
                densityBias = 'dense'; restChance = 0.05; restLength = 0.25;
            }
        } else {
            // Floor 5 (Boss / Malakar Core): Maximum intensity, complex dual chords & streams
            if (progress < 0.08) {
                densityBias = 'any'; restChance = 0.15; restLength = 0.5;
            } else {
                densityBias = 'dense'; restChance = 0.04; restLength = 0.25;
            }
        }

        // Build allowed-names filter based on floor eligible patterns
        let allowedNames = null;
        if (densityBias === 'sparse') {
            allowedNames = floorEligiblePatterns
                .filter(p => p.subDiv >= 1 || p.lanes.length <= 2)
                .map(p => p.name);
        } else if (densityBias === 'dense') {
            allowedNames = floorEligiblePatterns
                .filter(p => p.subDiv <= 0.5 || Array.isArray(p.lanes[0]))
                .map(p => p.name);
        }

        const chosenPattern = pickNextPattern(allowedNames);
        recentHistory.push(chosenPattern.name);
        if (recentHistory.length > HISTORY_BLOCK) recentHistory.shift();

        // ── Place notes quantized to 16th-note grid (0.25 beats) ──
        const GRID   = 0.25;
        const lanesList = chosenPattern.lanes;
        const subDiv    = chosenPattern.subDiv;

        for (let i = 0; i < lanesList.length; i++) {
            const rawBeat  = currentBeat + (i * subDiv);
            const noteBeat = Math.round(rawBeat / GRID) * GRID;
            if (noteBeat >= totalBeats - 4) break;

            const laneEntry = lanesList[i];
            if (Array.isArray(laneEntry)) {
                for (const lane of laneEntry) {
                    notes.push({ beat: noteBeat, pitch: 0, duration: subDiv, lane, track: 'melody', spawned: false });
                }
            } else {
                notes.push({ beat: noteBeat, pitch: 0, duration: subDiv, lane: laneEntry, track: 'melody', spawned: false });

                // Occasional offbeat syncopation at high intensity
                if (intensity > 1.4 && Math.random() < 0.22 && subDiv >= 0.5) {
                    const extraLane = (laneEntry + 2) % 4;
                    const extraBeat = Math.round((noteBeat + 0.5) / GRID) * GRID;
                    if (extraBeat < totalBeats - 4) {
                        notes.push({ beat: extraBeat, pitch: 0, duration: 0.5, lane: extraLane, track: 'melody', spawned: false });
                    }
                }
            }
        }

        // ── Advance position ──
        const patternDuration = lanesList.length * subDiv;
        currentBeat += patternDuration + (Math.random() < restChance ? restLength : 0);
    }

    // Deduplicate notes at same beat+lane
    const seen = new Set();
    const deduped = notes.filter(n => {
        const key = `${Math.round(n.beat * 100)}_${n.lane}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    deduped.sort((a, b) => a.beat - b.beat);
    return deduped;
}

// Chart Generators
function generateArchmageChart(durationSec, bpm) {
    return createDynamicChart(durationSec, bpm, 'boss');
}

function generateLamentChart(durationSec, bpm) {
    return createDynamicChart(durationSec, bpm, 'hard');
}

function generateProceduralChart(durationSec, bpm) {
    return createDynamicChart(durationSec, bpm, 'normal');
}

// Expand database songs to last at least 3 minutes by looping their notations
function extendSongsDatabase() {
    for (let i = 0; i < SONGS_DATABASE.length; i++) {
        const song = SONGS_DATABASE[i];
        const targetSec = 90; // 90 seconds (enough for classical floors limited to 60s)
        const beatsPerSec = song.bpm / 60;
        const targetBeats = targetSec * beatsPerSec;
        
        const parsed = parseNotes(song.melody, 'melody');
        const loopBeats = parsed.totalBeats;
        
        if (loopBeats > 0) {
            const loopCount = Math.ceil(targetBeats / loopBeats);
            
            let finalMelody = "";
            let finalHarmony = "";
            let finalDrums = "";
            
            for (let l = 0; l < loopCount; l++) {
                finalMelody += song.melody + " ";
                if (song.harmony) finalHarmony += song.harmony + " ";
                if (song.drums) finalDrums += song.drums + " ";
            }
            
            song.melody = finalMelody.trim();
            if (song.harmony) song.harmony = finalHarmony.trim();
            if (song.drums) song.drums = finalDrums.trim();
        }
    }
}

// 1. Initialize Audio Context and Assets
function initAudio() {
    if (isAudioInitialized) return true;

    try {
        // Create audio context
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master Volume
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.5; // Default volume 50%
        masterGain.connect(audioCtx.destination);
        musicGain = audioCtx.createGain();
        musicGain.connect(masterGain);
        
        // Create noise buffer for retro drums and explosions
        const bufferSize = audioCtx.sampleRate * 2;
        noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }

        isAudioInitialized = true;
        extendSongsDatabase(); // Loop notes to reach 3+ minutes!
        initYoutubePlayer(); // Start loading YouTube Iframe Player API script
        document.getElementById('audio-status').textContent = "오디오 작동 중";
        document.getElementById('audio-status').style.color = "#39ff14";
        
        // Play start chime
        playSfx('game-start');
        return true;
    } catch (e) {
        console.error("Failed to initialize audio:", e);
        document.getElementById('audio-status').textContent = "오디오 초기화 실패";
        document.getElementById('audio-status').style.color = "#ff005b";
        return false;
    }
}

// Volume controller
function setMasterVolume(volPercent) {
    const fraction = Math.max(0, Math.min(1, volPercent / 100));
    if (masterGain) {
        masterGain.gain.value = fraction;
    }
    
    // Set YouTube player volume if active
    if (ytPlayer && isYtPlayerReady && typeof ytPlayer.setVolume === 'function') {
        try {
            ytPlayer.setVolume(volPercent);
        } catch (e) {}
    }
}

// 2. Play Retro Sound Effects
function playSfx(type) {
    if (!isAudioInitialized || !audioCtx) return;
    
    // Resume audio context if suspended (browser security)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    switch (type) {
        case 'text-bleep': {
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(160 + Math.random() * 50, now);
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
                osc.connect(gain);
                if (masterGain) gain.connect(masterGain);
                osc.start(now);
                osc.stop(now + 0.05);
            } catch (e) {}
            break;
        }
        case 'hit-perfect': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        }
        case 'hit-great': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(783.99, now); // G5
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        }
        case 'hit-good': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }
        case 'hit-miss': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(75, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.2);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        }
        case 'death-explode': {
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, now);
            filter.frequency.exponentialRampToValueAtTime(40, now + 1.2);
            
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            noise.start(now);
            noise.stop(now + 1.2);
            break;
        }
        case 'portal-warp': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(1500, now + 0.7);
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.7);
            
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.7);
            break;
        }
        case 'limb-reclaim': {
            // Shiny ascending arpeggio
            const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const noteTime = now + idx * 0.08;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
                
                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(noteTime);
                osc.stop(noteTime + 0.3);
            });
            break;
        }
        case 'game-start': {
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            notes.forEach((freq, idx) => {
                const noteTime = now + idx * 0.08;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, noteTime);
                gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
                
                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(noteTime);
                osc.stop(noteTime + 0.25);
            });
            break;
        }
    }
}

// 3. Audio Synthesis for Notes
function playSynthNote(time, frequency, duration, track) {
    if (!audioCtx || frequency <= 0) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    if (track === 'melody') {
        // Retro Lead Synth (Bright Square)
        osc.type = 'square';
        osc.frequency.value = frequency;
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, time);
        filter.frequency.exponentialRampToValueAtTime(700, time + 0.15);
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.18, time + 0.01); // Quick attack
        gainNode.gain.setValueAtTime(0.18, time + duration - 0.03);
        gainNode.gain.linearRampToValueAtTime(0, time + duration); // Smooth release
        
        osc.connect(filter);
        filter.connect(gainNode);
    } else if (track === 'harmony') {
        // Soft Backing Chords / Bass (Triangle/Sawtooth blend or Triangle)
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.12, time + 0.04);
        gainNode.gain.setValueAtTime(0.12, time + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, time + duration);
        
        osc.connect(gainNode);
    }
    
    gainNode.connect(musicGain);
    osc.start(time);
    osc.stop(time + duration);
}

function playSongHit() {
    if (!isSongPlaying || !musicGain) return;
    const now = audioCtx.currentTime;
    const volume = musicGain.gain;
    volume.cancelScheduledValues(now);
    volume.setValueAtTime(1, now);
    volume.linearRampToValueAtTime(1.24, now + 0.008);
    volume.linearRampToValueAtTime(1, now + 0.09);
}

function playDrum(time, type) {
    if (!audioCtx) return;
    
    switch (type) {
        case 'K': { // Kick Drum (Pitch Sweep Sine)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.setValueAtTime(140, time);
            osc.frequency.exponentialRampToValueAtTime(45, time + 0.1);
            
            gain.gain.setValueAtTime(0.35, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
            
            osc.connect(gain);
            gain.connect(musicGain);
            osc.start(time);
            osc.stop(time + 0.12);
            break;
        }
        case 'S': { // Snare Drum (Bandpassed Noise + brief sine snap)
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1100;
            
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(musicGain);
            
            noise.start(time);
            noise.stop(time + 0.15);
            
            // Add tone snap
            const snap = audioCtx.createOscillator();
            const snapGain = audioCtx.createGain();
            snap.frequency.setValueAtTime(180, time);
            snap.frequency.exponentialRampToValueAtTime(80, time + 0.06);
            snapGain.gain.setValueAtTime(0.15, time);
            snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
            snap.connect(snapGain);
            snapGain.connect(musicGain);
            snap.start(time);
            snap.stop(time + 0.06);
            break;
        }
        case 'H': { // Hi-hat (Highpassed Noise)
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 8000;
            
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(musicGain);
            
            noise.start(time);
            noise.stop(time + 0.05);
            break;
        }
    }
}

// 4. Parser Helper for Shorthand Music Notation
function parseNotes(notesString, trackName = 'melody') {
    const list = [];
    if (!notesString) return { notes: list, totalBeats: 0 };
    
    const tokens = notesString.trim().split(/\s+/);
    let currentBeat = 0;
    
    for (const token of tokens) {
        if (!token) continue;
        
        // Format: Pitch:Duration:Lane
        // e.g. D5:1:0 (Note D5, 1 beat, lane 0)
        // e.g. B4:0.5 (Note B4, 0.5 beat, no rhythm note)
        // e.g. R:1 (Rest for 1 beat)
        const parts = token.split(':');
        const pitchSymbol = parts[0];
        const duration = parts[1] ? parseFloat(parts[1]) : 1;
        const lane = parts[2] !== undefined ? parseInt(parts[2], 10) : null;
        
        if (pitchSymbol !== 'R') {
            const freq = NOTES[pitchSymbol];
            if (freq !== undefined) {
                list.push({
                    beat: currentBeat,
                    pitch: freq,
                    pitchName: pitchSymbol,
                    duration: duration,
                    lane: lane,
                    track: trackName,
                    spawned: false // Track visual spawning in game.js
                });
            }
        }
        currentBeat += duration;
    }
    return { notes: list, totalBeats: currentBeat };
}

function parseDrums(drumString) {
    const list = [];
    if (!drumString) return { notes: list, totalBeats: 0 };
    
    const tokens = drumString.trim().split(/\s+/);
    let currentBeat = 0;
    
    for (const token of tokens) {
        if (!token) continue;
        
        // Format: DrumType:Duration (K:Kick, S:Snare, H:Hihat, R:Rest)
        const parts = token.split(':');
        const type = parts[0];
        const duration = parts[1] ? parseFloat(parts[1]) : 1;
        
        if (type !== 'R' && (type === 'K' || type === 'S' || type === 'H')) {
            list.push({
                beat: currentBeat,
                pitch: type,
                duration: duration,
                lane: null,
                track: 'drums',
                spawned: false
            });
        }
        currentBeat += duration;
    }
    return { notes: list, totalBeats: currentBeat };
}

function loadSong(songDef) {
    const melody = parseNotes(songDef.melody, 'melody');
    const harmony = parseNotes(songDef.harmony, 'harmony');
    const drums = parseDrums(songDef.drums);
    
    // Merge all note tracks
    const allNotes = [...melody.notes, ...harmony.notes, ...drums.notes];
    // Sort chronologically by beat
    allNotes.sort((a, b) => a.beat - b.beat);
    
    return {
        name: songDef.name,
        composer: songDef.composer,
        bpm: songDef.bpm,
        notes: allNotes,
        totalBeats: Math.max(melody.totalBeats, harmony.totalBeats, drums.totalBeats)
    };
}

function limitRhythmNoteDensity(song) {
    const minGapBeats = MIN_RHYTHM_NOTE_GAP * song.bpm / 60;
    let lastBeat = -Infinity;
    let playableCount = 0;
    for (const note of song.notes) {
        if (note.lane === null) continue;
        if (note.beat - lastBeat + 1e-8 < minGapBeats) {
            // Keep the note audible in the backing track and hide its input cue.
            note.lane = null;
            continue;
        }
        lastBeat = note.beat;
        playableCount++;
    }
    song.rhythmNotesCount = playableCount;
    song.maxScore = playableCount * 100;
}

// 5. Classic Music Arrangements Database
const SONGS_DATABASE = [
    // FLOOR 1: Bach - Minuet in G (Easy, 110 BPM)
    {
        name: "Minuet in G",
        composer: "J.S. Bach",
        bpm: 110,
        melody: 
            "D5:1:0 G4:0.5:1 A4:0.5:2 B4:0.5:3 C5:0.5:2 D5:1:1 G4:1 G4:1 " +
            "E5:1:3 C5:0.5:2 D5:0.5:1 E5:0.5:0 F#5:0.5:1 G5:1:2 G4:1 G4:1 " +
            "C5:1:3 D5:0.5:2 C5:0.5:1 B4:1:0 C5:0.5:1 B4:0.5:2 A4:1:3 B4:0.5:2 A4:0.5:1 G4:1:0 F#4:0.5:1 G4:0.5:2 A4:1:3 " +
            "A4:2 R:1 " +
            "D5:1:0 G4:0.5:1 A4:0.5:2 B4:0.5:3 C5:0.5:2 D5:1:1 G4:1 G4:1 " +
            "E5:1:3 C5:0.5:2 D5:0.5:1 E5:0.5:0 F#5:0.5:1 G5:1:2 G4:1 G4:1 " +
            "C5:1:3 D5:0.5:2 C5:0.5:1 B4:1:2 A4:1:1 G4:1:0 F#4:1:1 A4:1:2 D5:1:3 " +
            "B4:1:2 A4:1:1 G4:2 R:1",
        harmony:
            "G3:1 B3:1 G3:1 B3:2 C4:1 " +
            "C3:1 E3:1 C3:1 B3:2 A3:1 " +
            "A3:1 F#3:1 D3:1 G3:1 B3:1 G3:1 " +
            "C4:1 D4:1 C4:1 D3:2 R:1 " +
            "G3:1 B3:1 G3:1 B3:2 C4:1 " +
            "C3:1 E3:1 C3:1 B3:2 A3:1 " +
            "A3:1 F#3:1 D3:1 G3:1 D4:1 F#3:1 " +
            "G3:1 D3:1 D3:1 G3:2 R:1",
        drums:
            "K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 " +
            "K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 " +
            "K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 " +
            "K:1 H:1 H:1 K:2 R:1 " +
            "K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 " +
            "K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 " +
            "K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 K:1 H:1 H:1 " +
            "K:1 H:1 H:1 K:2 R:1"
    },
    // FLOOR 2: Mozart - Turkish March (Medium, 125 BPM)
    {
        name: "Turkish March",
        composer: "W.A. Mozart",
        bpm: 125,
        melody:
            "B4:0.5:0 A4:0.5:1 G#4:0.5:0 A4:0.5:1 C5:1:2 R:1 " +
            "C5:0.5:2 B4:0.5:3 A#4:0.5:2 B4:0.5:3 D5:1:1 R:1 " +
            "D5:0.5:1 C5:0.5:0 B4:0.5:1 C5:0.5:0 E5:1:2 R:1 " +
            "D5:0.5:3 C5:0.5:2 B4:0.5:1 A4:0.5:0 G#4:1:1 A4:1:2 " +
            "B4:0.5:3 A4:0.5:2 G#4:0.5:3 A4:0.5:2 C5:1:1 R:1 " +
            "C5:0.5:1 B4:0.5:0 A#4:0.5:1 B4:0.5:0 D5:1:2 R:1 " +
            "D5:0.5:2 C5:0.5:3 B4:0.5:2 C5:0.5:3 E5:1:1 R:1 " +
            "D5:0.5:0 C5:0.5:1 B4:0.5:2 A4:0.5:3 E5:1:2 G#4:1:1 A4:2:0 R:2",
        harmony:
            "R:2 A3:1 E3:1 A3:1 E3:1 " +
            "R:2 B3:1 F#3:1 B3:1 F#3:1 " +
            "R:2 C4:1 G3:1 C4:1 G3:1 " +
            "R:2 D4:1 D3:1 E3:1 E3:1 " +
            "R:2 A3:1 E3:1 A3:1 E3:1 " +
            "R:2 B3:1 F#3:1 B3:1 F#3:1 " +
            "R:2 C4:1 G3:1 C4:1 G3:1 " +
            "R:2 E4:1 E3:1 A3:1 E3:1 A3:2 R:2",
        drums:
            "K:1 S:1 K:1 S:1 K:1 S:1 K:1 S:1 " +
            "K:1 S:1 K:1 S:1 K:1 S:1 K:1 S:1 " +
            "K:1 S:1 K:1 S:1 K:1 S:1 K:1 S:1 " +
            "K:1 S:1 K:1 S:1 K:1 S:1 K:2 R:2"
    },
    // FLOOR 3: Beethoven - Für Elise (Upbeat Synth, 130 BPM)
    {
        name: "Für Elise (Upbeat)",
        composer: "L. van Beethoven",
        bpm: 130,
        melody:
            "E5:0.5:0 D#5:0.5:1 E5:0.5:0 D#5:0.5:1 E5:0.5:0 B4:0.5:2 D5:0.5:3 C5:0.5:2 " +
            "A4:2:0 R:0.5 C4:0.5:1 E4:0.5:2 A4:0.5:3 B4:2:2 R:0.5 E4:0.5:1 G#4:0.5:2 B4:0.5:3 " +
            "C5:2:0 R:0.5 E4:0.5:1 E5:0.5:0 D#5:0.5:1 E5:0.5:0 D#5:0.5:1 E5:0.5:0 B4:0.5:2 D5:0.5:3 C5:0.5:2 " +
            "A4:2:0 R:0.5 C4:0.5:1 E4:0.5:2 A4:0.5:3 B4:2:2 R:0.5 E4:0.5:1 C5:0.5:2 B4:0.5:3 A4:3 R:1",
        harmony:
            "R:4 " +
            "A2:1 E3:1 A3:2 E2:1 G#3:1 B3:2 " +
            "A2:1 E3:1 A3:2 R:4 " +
            "A2:1 E3:1 A3:2 E2:1 G#3:1 B3:2 " +
            "A2:1 E3:1 A3:2 A2:3 R:1",
        drums:
            "K:1 H:0.5 H:0.5 S:1 H:1 K:1 H:0.5 H:0.5 S:1 H:1 " +
            "K:1 H:0.5 H:0.5 S:1 H:1 K:1 H:0.5 H:0.5 S:1 H:1 " +
            "K:1 H:0.5 H:0.5 S:1 H:1 K:1 H:0.5 H:0.5 S:1 H:1 " +
            "K:1 H:0.5 H:0.5 S:1 H:1 K:1 H:1 S:1 K:1"
    },
    // FLOOR 4: Vivaldi - Summer (Presto Violin, 155 BPM)
    {
        name: "Summer - Presto",
        composer: "A. Vivaldi",
        bpm: 155,
        melody:
            "G5:0.25:0 G5:0.25:1 G5:0.25:0 G5:0.25:1 G5:0.25:2 G5:0.25:3 G5:0.25:2 G5:0.25:3 " +
            "D5:0.25:0 D5:0.25:1 D5:0.25:0 D5:0.25:1 D5:0.25:2 D5:0.25:3 D5:0.25:2 D5:0.25:3 " +
            "Bb5:0.25:0 Bb5:0.25:1 A5:0.25:2 G5:0.25:3 F#5:0.5:2 G5:0.5:3 A5:0.5:2 D5:0.5:1 " +
            "G5:0.25:0 G5:0.25:1 G5:0.25:0 G5:0.25:1 G5:0.25:2 G5:0.25:3 G5:0.25:2 G5:0.25:3 " +
            "D5:0.25:0 D5:0.25:1 D5:0.25:0 D5:0.25:1 D5:0.25:2 D5:0.25:3 D5:0.25:2 D5:0.25:3 " +
            "Bb5:0.25:0 Bb5:0.25:1 A5:0.25:2 G5:0.25:3 F#5:1:2 G5:1:3 D5:1:1 R:1",
        harmony:
            "G3:1 G3:1 G3:1 G3:1 D3:1 D3:1 D3:1 D3:1 " +
            "G3:1 D3:1 D3:1 D3:1 G3:1 G3:1 G3:1 G3:1 " +
            "D3:1 D3:1 D3:1 D3:1 G3:1 D3:1 G3:1 R:1",
        drums:
            "K:0.5 H:0.5 S:0.5 H:0.5 K:0.5 H:0.5 S:0.5 H:0.5 " +
            "K:0.5 H:0.5 S:0.5 H:0.5 K:0.5 H:0.5 S:0.5 H:0.5 " +
            "K:0.5 H:0.5 S:0.5 H:0.5 K:0.5 H:0.5 S:0.5 H:0.5 " +
            "K:0.5 H:0.5 S:0.5 H:0.5 K:0.5 H:0.5 S:0.5 H:0.5 " +
            "K:0.5 H:0.5 S:0.5 H:0.5 K:0.5 H:0.5 S:0.5 H:0.5 " +
            "K:0.5 H:0.5 S:0.5 H:0.5 K:1 R:1"
    },
    // FLOOR 5: Bach - Toccata and Fugue in D minor (The Archmage, 140 BPM)
    {
        name: "Toccata and Fugue",
        composer: "J.S. Bach",
        bpm: 140,
        melody:
            "A5:1:0 G5:0.25:1 F5:0.25:2 E5:0.25:3 D5:1:2 C#5:0.5:1 D5:2:0 R:1 " +
            "A4:1:1 C5:0.25:2 D5:0.25:3 E5:0.25:2 F5:1:1 C#5:0.5:0 D5:2:1 R:1 " +
            "D5:0.5:0 F5:0.5:1 E5:0.5:2 D5:0.5:3 C#5:0.5:2 D5:0.5:3 A4:0.5:1 A4:0.5:0 " +
            "D5:0.5:0 F5:0.5:1 E5:0.5:2 D5:0.5:3 C#5:0.5:2 D5:0.5:3 A4:0.5:1 A4:0.5:0 " +
            "F5:0.5:1 G5:0.5:2 A5:0.5:3 F5:0.5:2 E5:0.5:1 D5:0.5:0 C#5:0.5:1 A4:0.5:0 " +
            "D5:0.5:0 E5:0.5:1 F5:0.5:2 G5:0.5:3 A5:0.5:2 F5:0.5:1 E5:1:0 D5:2:1 R:2",
        harmony:
            "D3:3 D3:3 R:1 " +
            "A2:3 A2:3 R:1 " +
            "D3:1 R:1 A2:1 R:1 D3:1 R:1 A2:1 R:1 " +
            "D3:1 R:1 A2:1 R:1 D3:1 R:1 A2:1 R:1 " +
            "F3:1 R:1 C3:1 R:1 D3:1 R:1 A2:1 R:1 " +
            "Bb2:1 R:1 G2:1 R:1 A2:1 A2:1 D3:2 R:2",
        drums:
            "R:7 R:7 " +
            "K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 " +
            "K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 " +
            "K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 " +
            "K:0.5 K:0.5 S:1 K:0.5 K:0.5 S:1 K:1 K:1 K:2 R:2"
    }
];

// 6. Scheduler Engine
function scheduler() {
    if (!isSongPlaying || !activeSong || !audioCtx) return;
    
    const now = getSongSecondsElapsed(); // Get elapsed relative seconds in current song
    const beatsPerSec = activeSong.bpm / 60;
    
    // 1. Process Visual Note Spawning (2.0 seconds ahead)
    while (nextVisualNoteIndex < activeSong.notes.length) {
        const note = activeSong.notes[nextVisualNoteIndex];
        const noteSec = note.beat / beatsPerSec;
        
        if (noteSec > now + visualSpawnAheadTime) {
            break; // Outside visual spawning window
        }
        
        // Visual note spawn - pass noteSec (relative target time)
        if (note.lane !== null && !note.spawned && onNoteSpawnCallback) {
            onNoteSpawnCallback(noteSec, note.lane, note.beat, nextVisualNoteIndex);
            note.spawned = true;
        }
        
        nextVisualNoteIndex++;
    }
    
    // 2. Process Audio Note Synthesis (150ms ahead)
    while (nextNoteIndex < activeSong.notes.length) {
        const note = activeSong.notes[nextNoteIndex];
        
        // Calculate relative target time in seconds
        const noteSec = note.beat / beatsPerSec;
        
        // If the note is outside our schedule lookahead window, stop scheduling for now
        if (noteSec > now + scheduleAheadTime) {
            break;
        }
        
        // Only play synths if we are NOT playing a custom audio file and NOT playing YouTube
        if (!currentAudioElement && !customAudioSourceNode && !isPlayingYt) {
            const targetTime = songStartTime + noteSec;
            if (note.track === 'drums') {
                playDrum(targetTime, note.pitch);
            } else {
                const durationSec = note.duration / beatsPerSec;
                playSynthNote(targetTime, note.pitch, durationSec, note.track);
            }
        }
        
        nextNoteIndex++;
    }
    
    // Check for song completion
    const songDurationSec = activeSong.totalBeats / beatsPerSec;
    if (now > songDurationSec + 1.0) {
        stopSong();
        if (onSongEndCallback) {
            onSongEndCallback();
        }
    }
}

// 7. Sequencer Control API
// 7. Sequencer Control API
function startSong(floorIndex, onSpawn, onEnd) {
    if (!isAudioInitialized) {
        initAudio();
    }
    
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    stopSong(); // Stop any currently playing song
    
    // 1. IF A CUSTOM MP3/AUDIO FILE IS REGISTERED FOR THIS FLOOR, USE IT!
    const customSource = floorAudioSources[floorIndex];
    if (customSource) {
        const duration = (customSource.duration && customSource.duration > 0) ? customSource.duration : 180;
        const bpm = customSource.analyzedNotes ? 60 : (customSource.bpm || 135);
        const beatsPerSec = bpm / 60;
        // Generate dynamic chart with floor-calibrated progressive difficulty
        const rhythmNotes = customSource.analyzedNotes
            ? customSource.analyzedNotes.map(note => ({ ...note, spawned: false }))
            : createDynamicChart(duration, bpm, floorIndex);
        const songName = customSource.name || `Floor ${floorIndex + 1} Battle Track`;
        
        activeSong = {
            name: songName,
            composer: "Mili / Custom Track",
            bpm: bpm,
            notes: rhythmNotes,
            totalBeats: duration * beatsPerSec,
            rhythmNotesCount: rhythmNotes.length,
            maxScore: rhythmNotes.length * 100
        };
        if (!customSource.analyzedNotes) limitRhythmNoteDensity(activeSong);
        
        nextNoteIndex = 0;
        nextVisualNoteIndex = 0;
        onNoteSpawnCallback = onSpawn;
        onSongEndCallback = onEnd;
        
        songStartTime = getAudioTime() + 2.0;
        isSongPlaying = true;

        if (customSource.buffer) {
            customAudioSourceNode = audioCtx.createBufferSource();
            customAudioSourceNode.buffer = customSource.buffer;
            customAudioSourceNode.connect(musicGain);
            customAudioSourceNode.start(songStartTime);
            schedulerTimer = setInterval(scheduler, lookahead);
            scheduler();
            return activeSong;
        }

        // Optional hosted audio files use the existing streaming path.
        try {
            currentAudioElement = new Audio(customSource.url);
            currentAudioElementSource = audioCtx.createMediaElementSource(currentAudioElement);
            currentAudioElementSource.connect(musicGain);
            currentAudioElement.addEventListener('ended', () => {
                stopSong();
                if (onSongEndCallback) onSongEndCallback();
            });
        } catch (e) {
            console.error("Failed to create Audio instance:", e);
        }
        
        currentAudioStarted = false;
        
        // Start streaming playback after 2.0s lead-in delay
        const audioToStart = currentAudioElement;
        setTimeout(() => {
            if (isSongPlaying && currentAudioElement === audioToStart && audioToStart) {
                audioToStart.currentTime = 0;
                audioToStart.play().then(() => { if (currentAudioElement === audioToStart) currentAudioStarted = true; })
                    .catch(err => console.error("Audio play error:", err));
            }
        }, 2000);
        
        // Start note spawning scheduler
        if (schedulerTimer) clearInterval(schedulerTimer);
        schedulerTimer = setInterval(scheduler, lookahead);
        
        console.log(`Starting Floor ${floorIndex + 1} Audio: ${songName}. Duration: ${Math.floor(duration)}s. Notes: ${activeSong.rhythmNotesCount}`);
        return activeSong;
    }
    
    // 2. Classical Synthesizer fallback
    const rawSong = SONGS_DATABASE[floorIndex] || SONGS_DATABASE[0];
    activeSong = loadSong(rawSong);
    
    // For classical floors (Floor 2, 3, 4), limit activeSong to 60 seconds of playback
    if (floorIndex === 1 || floorIndex === 2 || floorIndex === 3) {
        const durationLimitSec = 60.0;
        const beatsPerSec = activeSong.bpm / 60;
        const maxBeat = durationLimitSec * beatsPerSec;
        
        activeSong.notes = activeSong.notes.filter(note => (note.beat / beatsPerSec) <= durationLimitSec);
        activeSong.totalBeats = Math.floor(maxBeat);
    }
    limitRhythmNoteDensity(activeSong);
    return startSynthSequence(activeSong, onSpawn, onEnd);
}

function startSynthSequence(song, onSpawn, onEnd) {
    stopSong();
    activeSong = song;
    nextNoteIndex = 0;
    nextVisualNoteIndex = 0;
    onNoteSpawnCallback = onSpawn;
    onSongEndCallback = onEnd;
    
    songStartTime = (audioCtx ? audioCtx.currentTime : 0) + 2.0;
    isSongPlaying = true;
    
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = setInterval(scheduler, lookahead);
    
    console.log(`Starting synthesized song: ${activeSong.name}. Rhythm notes: ${activeSong.rhythmNotesCount}`);
    return activeSong;
}

function stopSong() {
    isSongPlaying = false;
    currentAudioStarted = false;
    if (musicGain) {
        const now = audioCtx.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setValueAtTime(1, now);
    }
    
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }

    if (customAudioSourceNode) {
        customAudioSourceNode.stop();
        customAudioSourceNode.disconnect();
        customAudioSourceNode = null;
    }
    
    // Stop HTML5 Audio if playing
    if (currentAudioElement) {
        try {
            currentAudioElement.pause();
            currentAudioElement.currentTime = 0;
        } catch (e) {}
        currentAudioElementSource?.disconnect();
        currentAudioElementSource = null;
        currentAudioElement = null;
    }
    
    // Stop YouTube video if it is playing
    if (isPlayingYt && ytPlayer) {
        try {
            ytPlayer.stopVideo();
        } catch (e) {}
        isPlayingYt = false;
    }
    
    activeSong = null;
    nextNoteIndex = 0;
    nextVisualNoteIndex = 0;
}

function getAudioTime() {
    if (!audioCtx) return performance.now() / 1000;
    return audioCtx.currentTime;
}

// Helper to determine seconds elapsed in current song
function getSongSecondsElapsed() {
    if (!isSongPlaying) return 0;
    let nowTime = getAudioTime();
    if (customAudioSourceNode && audioCtx.getOutputTimestamp) {
        const timestamp = audioCtx.getOutputTimestamp();
        if (timestamp.performanceTime > 0) {
            nowTime = Math.min(nowTime, timestamp.contextTime + (performance.now() - timestamp.performanceTime) / 1000);
        }
    }
    const leadInOffset = nowTime - songStartTime;
    
    // During 2-second lead-in, report negative offset so notes drop smoothly from top
    if (leadInOffset < 0) {
        return leadInOffset;
    }
    
    // If streaming HTML5 audio element is playing
    if (currentAudioElement && currentAudioStarted) {
        return currentAudioElement.currentTime;
    }
    
    return leadInOffset;
}
