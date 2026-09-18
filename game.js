// Wizard's Rhythm Tower - Main Game Logic Engine

// Canvas and Rendering Context
let canvas = null;
let ctx = null;

// Game States
const STATE_TITLE = 0;
const STATE_ADVENTURE = 1;
const STATE_DIALOGUE = 2;
const STATE_TRANSITION = 3;
const STATE_RHYTHM = 4;
const STATE_RHYTHM_OUTRO = 5;
const STATE_DEATH = 6;
const STATE_VICTORY = 7;

let gameState = STATE_TITLE;

// Key State Tracking
const keys = {
    // WASD (Adventure Mode)
    KeyW: false, KeyA: false, KeyS: false, KeyD: false,
    // QWER (Rhythm Game Mode)
    KeyQ: false, KeyW_r: false, KeyE: false, KeyR: false,
    // System Keys
    Space: false
};

// Lane Key Bindings for Rhythm Game
const LANE_KEYS = ['KeyQ', 'KeyW', 'KeyE', 'KeyR'];
const LANE_KEY_LABELS = ['Q', 'W', 'E', 'R'];
const LANE_COLORS = ['#00f0ff', '#39ff14', '#ff005b', '#ffd700'];

// Active Game Settings
let currentFloor = 0;
const maxFloors = 5;
let score = 0;
let combo = 0;
let maxCombo = 0;
let activeSongData = null;

// Scoring Ratings Counts
let ratingCounts = { perfect: 0, great: 0, good: 0, miss: 0 };
let currentRatingText = "";
let currentRatingColor = "#fff";
let currentRatingTimer = 0;
let rhythmPassScore = 0;

// Rhythm Game HP/Life Bar
let life = 100;
const maxLife = 100;

// Player Reclaimed Limbs Status
let reclaimedLimbs = {
    torso: true,
    lleg: false,
    rleg: false,
    larm: false,
    rarm: false,
    head: false
};

// Game Entities
let player = {
    x: 400,
    y: 400,
    speed: 3.5,
    width: 24,
    height: 32,
    isMoving: false,
    animFrame: 0
};

// Floor Theme Color Configurations (Floor grid)
const FLOOR_THEMES = [
    { name: "초록 숲의 제단 (Flora)", c1: "#0b1f13", c2: "#143a22", border: "#2d7a43", bg: "#040c07" },
    { name: "얼어붙은 회랑 (Glacius)", c1: "#081b29", c2: "#102f47", border: "#2b658f", bg: "#030c14" },
    { name: "뇌우의 나락 (Aero)", c1: "#242008", c2: "#423b0d", border: "#bfa51f", bg: "#121004" },
    { name: "불타는 용암굴 (Ignis)", c1: "#260a08", c2: "#4a120e", border: "#9e2d25", bg: "#140403" },
    { name: "공허의 중심부 (Malakar)", c1: "#170724", c2: "#2d0b46", border: "#8a2be2", bg: "#0a030f" }
];

// Wizard Dialogues Database
const DIALOGUES = [
    // Floor 1
    [
        "자연의 마법사 플로라:",
        "호호호... 가엾은 불청객이군.",
        "마법사 일당에게 다리를 빼앗겨 기어다니는 꼴이라니!",
        "내가 가진 너의 [왼쪽 다리]를 찾고 싶다면,",
        "내 대자연의 우아한 클래식 리듬을 따라해 보거라!",
        "(스페이스바를 눌러 대결 시작)"
    ],
    // Floor 2
    [
        "냉기의 마법사 글라키우스:",
        "하하! 1층의 플로라를 꺾었단 말인가?",
        "하지만 여긴 더욱 차가운 서리가 내리는 곳이지.",
        "네 [오른쪽 다리]는 내가 얼음 장식품으로 잘 쓰고 있다.",
        "이 차가운 눈보라의 선율을 견뎌낼 수 있을까?",
        "(스페이스바를 눌러 대결 시작)"
    ],
    // Floor 3
    [
        "폭풍의 마법사 에어로:",
        "앗! 벌써 다리 두 짝을 다 되찾았네? 제법인걸!",
        "하지만 팔이 없으면 아무것도 쥘 수 없겠지.",
        "내 번개의 폭풍 같은 템포 속에 네 [왼쪽 팔]이 춤추고 있다.",
        "눈 깜짝할 새 몰아치는 비트를 잡아봐라!",
        "(스페이스바를 눌러 대결 시작)"
    ],
    // Floor 4
    [
        "화염의 마법사 이그니스:",
        "뜨거워! 타오른다! 네놈의 [오른쪽 팔]은",
        "내 용암 가마솥을 젓는 데 아주 딱이었지!",
        "이 뜨거운 불꽃의 소나타에 재가 될 준비는 되었나?",
        "더 빠른 분노의 비트를 보여주마!",
        "(스페이스바를 눌러 대결 시작)"
    ],
    // Floor 5
    [
        "대마법사 말라카르:",
        "결국... 탑의 꼭대기까지 도달했군.",
        "두 팔과 두 다리를 모두 되찾았다 한들,",
        "마지막 머리가 없는 상태에서 무슨 의미가 있겠느냐.",
        "내 영혼의 마지막 카프리치오를 견뎌내어라.",
        "실패한다면, 모든 것은 처음으로 되돌아갈 뿐이다...",
        "(스페이스바를 눌러 최종 결전 시작)"
    ]
];

// Dialogue Engine variables
let dialogueIndex = 0;
let dialogueCharIndex = 0;
let dialogueTextBuffer = "";
let dialogueTimer = 0;
let isDialogueTextFinished = false;

// Rhythm Gameplay variables
let gameNotes = [];
const targetLineY = 500;
const scrollSpeed = 350; // Pixels per second
let rhythmVisualTimer = 0;
let pressedLanes = [false, false, false, false];
let activeParticles = [];

// Screen Transition variables
let transitionTimer = 0;
let transitionState = 0; // 0: fade-out, 1: flash, 2: fade-in

// System Initialization
window.addEventListener('load', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Setup controls
    setupInputHandlers();
    
    // Setup audio interface triggers
    document.getElementById('btn-audio-init').addEventListener('click', () => {
        const ok = initAudio();
        if (ok) {
            document.getElementById('btn-audio-init').style.display = 'none';
        }
    });

    const volSlider = document.getElementById('volume-slider');
    volSlider.addEventListener('input', (e) => {
        setMasterVolume(e.target.value);
    });

    // Per-floor Audio File Upload Handlers (Floor 1~5)
    for (let f = 0; f < 5; f++) {
        const fileInput = document.getElementById(`music-floor-${f}`);
        const fnameSpan = document.getElementById(`fname-floor-${f}`);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Create fast blob URL (no decoding lag!)
                const blobUrl = URL.createObjectURL(file);
                setFloorAudioUrl(f, blobUrl, file.name);

                if (fnameSpan) {
                    fnameSpan.textContent = file.name;
                    fnameSpan.className = "music-fname loaded";
                }
                
                const audioStatus = document.getElementById('audio-status');
                if (audioStatus) {
                    audioStatus.textContent = `${f + 1}층 음원 (${file.name}) 적용 완료!`;
                    audioStatus.style.color = "#39ff14";
                }
            });
        }
    }

    // Reset All Custom Audio Button
    const clearBtn = document.getElementById('btn-clear-music');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearAllFloorAudio();
            for (let f = 0; f < 5; f++) {
                const fnameSpan = document.getElementById(`fname-floor-${f}`);
                if (fnameSpan) {
                    fnameSpan.textContent = "기본 (합성)";
                    fnameSpan.className = "music-fname";
                }
                const fileInput = document.getElementById(`music-floor-${f}`);
                if (fileInput) fileInput.value = "";
            }
            const audioStatus = document.getElementById('audio-status');
            if (audioStatus) {
                audioStatus.textContent = "모든 음원이 기본값으로 초기화되었습니다.";
                audioStatus.style.color = "#00f0ff";
            }
        });
    }

    // Check localStorage high score
    const savedHighScore = localStorage.getItem('wiz_rhythm_high');
    const highScoreEl = document.getElementById('high-score-val');
    if (savedHighScore && highScoreEl) {
        highScoreEl.textContent = savedHighScore.padStart(6, '0');
    }

    // Auto-detect and preload any mp3s placed in the assets folder (assets/floor1.mp3 .. floor5.mp3)
    checkAndLoadServerAssets();

    // Set initial sidebar state
    updateSidebar();

    // Start game rendering loop
    requestAnimationFrame(gameLoop);
});

// Auto-loader for files placed in assets folder
async function checkAndLoadServerAssets() {
    const assetFiles = [
        { floor: 0, file: 'assets/floor1.mp3', label: 'In Hell We Live, Lament' },
        { floor: 1, file: 'assets/floor2.mp3', label: 'floor2.mp3' },
        { floor: 2, file: 'assets/floor3.mp3', label: 'floor3.mp3' },
        { floor: 3, file: 'assets/floor4.mp3', label: 'floor4.mp3' },
        { floor: 4, file: 'assets/floor5.mp3', label: 'Fly, My Wings' }
    ];

    for (const item of assetFiles) {
        try {
            const resp = await fetch(item.file, { method: 'HEAD' });
            if (resp.ok) {
                setFloorAudioUrl(item.floor, item.file, item.label);
                const fnameSpan = document.getElementById(`fname-floor-${item.floor}`);
                if (fnameSpan) {
                    fnameSpan.textContent = item.label;
                    fnameSpan.className = "music-fname loaded";
                }
                console.log(`[AutoLoad] Registered ${item.file} for Floor ${item.floor + 1}`);
            }
        } catch (e) {
            // Not found or not running on server, continue silently
        }
    }
}

// Update sidebar status UI
function updateSidebar() {
    const list = ['torso', 'lleg', 'rleg', 'larm', 'rarm', 'head'];
    list.forEach(part => {
        const el = document.getElementById(`part-${part}`);
        if (el) {
            if (reclaimedLimbs[part]) {
                el.className = 'body-part-item acquired';
            } else {
                el.className = 'body-part-item missing';
            }
        }
    });
    
    const floorLabel = document.getElementById('current-floor-lbl');
    if (floorLabel) {
        floorLabel.textContent = `FLOOR ${currentFloor + 1}`;
    }
}

// Input Handlers Setup
function setupInputHandlers() {
    window.addEventListener('keydown', (e) => {
        // Auto-initialize / resume audio on first user keypress
        if (!isAudioInitialized) {
            initAudio();
        } else if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // Prevent scrolling with keys
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }

        // Set key status
        if (e.code === 'KeyW') keys.KeyW = true;
        if (e.code === 'KeyA') keys.KeyA = true;
        if (e.code === 'KeyS') keys.KeyS = true;
        if (e.code === 'KeyD') keys.KeyD = true;
        
        // Rhythm Keys
        if (e.code === 'KeyQ') { keys.KeyQ = true; handleRhythmKeyPress(0); }
        if (e.code === 'KeyW' && gameState === STATE_RHYTHM) { keys.KeyW_r = true; handleRhythmKeyPress(1); }
        if (e.code === 'KeyE') { keys.KeyE = true; handleRhythmKeyPress(2); }
        if (e.code === 'KeyR') { keys.KeyR = true; handleRhythmKeyPress(3); }

        // Action Keys
        if (e.code === 'Space' || e.code === 'Enter') {
            keys.Space = true;
            handleActionKeyPress();
        }
        
        // Admin Shortcut: Shift = advance one floor (skip current battle)
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            if (gameState === STATE_ADVENTURE || gameState === STATE_RHYTHM || gameState === STATE_RHYTHM_OUTRO || gameState === STATE_DIALOGUE) {
                stopSong();
                reclaimLimbOnCurrentFloor();
                if (currentFloor < maxFloors - 1) {
                    currentFloor++;
                    player.x = 400;
                    player.y = 450;
                    gameState = STATE_ADVENTURE;
                    updateSidebar();
                    console.log(`[Admin] Advanced to Floor ${currentFloor + 1}`);
                } else {
                    // Already at last floor — trigger victory
                    reclaimedLimbs.head = true;
                    gameState = STATE_VICTORY;
                    updateSidebar();
                }
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') keys.KeyW = false;
        if (e.code === 'KeyA') keys.KeyA = false;
        if (e.code === 'KeyS') keys.KeyS = false;
        if (e.code === 'KeyD') keys.KeyD = false;
        
        if (e.code === 'KeyQ') { keys.KeyQ = false; pressedLanes[0] = false; }
        if (e.code === 'KeyW') { keys.KeyW_r = false; pressedLanes[1] = false; }
        if (e.code === 'KeyE') { keys.KeyE = false; pressedLanes[2] = false; }
        if (e.code === 'KeyR') { keys.KeyR = false; pressedLanes[3] = false; }
        
        if (e.code === 'Space' || e.code === 'Enter') {
            keys.Space = false;
        }
    });
}

// Action Key (Space/Enter) triggers based on State
function handleActionKeyPress() {
    if (gameState === STATE_TITLE) {
        // Unlock Web Audio API inside user click
        initAudio();
        // Go to Adventure Mode
        gameState = STATE_ADVENTURE;
        player.x = 400;
        player.y = 450;
        playSfx('portal-warp');
    } 
    else if (gameState === STATE_DIALOGUE) {
        const floorDialogues = DIALOGUES[currentFloor] || [];
        if (dialogueIndex >= floorDialogues.length) {
            startBattleTransition();
            return;
        }

        const currentLine = floorDialogues[dialogueIndex] || "";
        if (!isDialogueTextFinished) {
            // Instantly show the entire line
            dialogueCharIndex = currentLine.length;
            dialogueTextBuffer = currentLine;
            isDialogueTextFinished = true;
        } else {
            // Next line
            dialogueIndex++;
            if (dialogueIndex >= floorDialogues.length) {
                // Dialogue ends, trigger rhythm battle transition
                startBattleTransition();
            } else {
                // Initialize next line
                dialogueCharIndex = 0;
                dialogueTextBuffer = "";
                isDialogueTextFinished = false;
            }
        }
    }
    else if (gameState === STATE_RHYTHM_OUTRO) {
        // Evaluate pass/fail results
        const minPassScore = (activeSongData?.maxScore || 1000) * getPassThreshold(currentFloor);
        
        // Clear custom audio buffer after battle finishes
        customAudioBuffer = null;
        customAudioSourceName = "";
        document.getElementById('file-name').textContent = "선택된 파일 없음";
        
        if (score >= minPassScore) {
            // PASS: Reclaim body part!
            reclaimLimbOnCurrentFloor();
            playSfx('limb-reclaim');
            
            // Advance state
            if (currentFloor === 4) {
                // Beat the Archmage! Go to Victory
                gameState = STATE_VICTORY;
                stopSong();
            } else {
                // Open staircase
                gameState = STATE_ADVENTURE;
                player.y = 260; // Spawn player below the wizard
                updateSidebar();
            }
        } else {
            // FAIL: Death sequence
            gameState = STATE_DEATH;
            transitionTimer = 0;
            playSfx('death-explode');
            spawnDeathParticles(player.x, player.y);
        }
    }
    else if (gameState === STATE_DEATH) {
        // Reset back to current floor
        resetCurrentFloor();
        gameState = STATE_ADVENTURE;
    }
    else if (gameState === STATE_VICTORY) {
        // Reset completely and go to title
        resetGameToStart();
        gameState = STATE_TITLE;
    }
}

// Pass score requirements per floor
// Floors 1~4 classical songs: halved thresholds for accessibility
// Floors 0 & 4 (Mili YouTube songs): unchanged
function getPassThreshold(floor) {
    switch (floor) {
        case 0: return 0.65; // 65% — Mili Floor 1 (kept as-is)
        case 1: return 0.35; // 35% (was 70%, halved)
        case 2: return 0.375; // 37.5% (was 75%, halved)
        case 3: return 0.375; // 37.5% (was 75%, halved)
        case 4: return 0.80; // 80% — Mili Floor 5 (kept as-is)
        default: return 0.35;
    }
}

// Grant the corresponding body part
function reclaimLimbOnCurrentFloor() {
    switch (currentFloor) {
        case 0: reclaimedLimbs.lleg = true; break;
        case 1: reclaimedLimbs.rleg = true; break;
        case 2: reclaimedLimbs.larm = true; break;
        case 3: reclaimedLimbs.rarm = true; break;
        case 4: reclaimedLimbs.head = true; break;
    }
}

// Reset entire game status
function resetGameToStart() {
    currentFloor = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    ratingCounts = { perfect: 0, great: 0, good: 0, miss: 0 };
    currentRatingText = "";
    currentRatingColor = "#fff";
    currentRatingTimer = 0;
    gameNotes = [];
    life = 100;
    
    reclaimedLimbs = {
        torso: true,
        lleg: false,
        rleg: false,
        larm: false,
        rarm: false,
        head: false
    };
    player.x = 400;
    player.y = 450;
    stopSong();
    updateSidebar();
}

// Reset only the current floor (player restarts on current floor, keeping already reclaimed limbs)
function resetCurrentFloor() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    ratingCounts = { perfect: 0, great: 0, good: 0, miss: 0 };
    currentRatingText = "";
    currentRatingColor = "#fff";
    currentRatingTimer = 0;
    gameNotes = [];
    life = 100; // Reset life to full
    
    player.x = 400;
    player.y = 450;
    stopSong();
    updateSidebar();
}

// Setup Battle Transition
function startBattleTransition() {
    gameState = STATE_TRANSITION;
    transitionTimer = 0;
    transitionState = 0; // Flash screen
    playSfx('portal-warp');
    
    // Clear all rhythm game stats immediately
    score = 0;
    combo = 0;
    maxCombo = 0;
    ratingCounts = { perfect: 0, great: 0, good: 0, miss: 0 };
    currentRatingText = "";
    currentRatingTimer = 0;
    gameNotes = [];
    life = 100;
    
    // Proactively resume AudioContext to avoid timing jumps when starting the song
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext successfully resumed during transition.");
        });
    }
}

// Rhythm Key Press Engine (QWER)
function handleRhythmKeyPress(laneIndex) {
    if (gameState !== STATE_RHYTHM) return;
    
    pressedLanes[laneIndex] = true;
    
    const elapsedSec = getSongSecondsElapsed();
    
    // Find first unhit note in this lane
    let foundNote = null;
    for (let i = 0; i < gameNotes.length; i++) {
        const note = gameNotes[i];
        if (note.lane === laneIndex && note.hit === false) {
            // Note is close enough to target window
            const diff = note.targetTime - elapsedSec;
            if (diff > -0.15 && diff < 0.20) {
                foundNote = note;
                break;
            }
        }
    }
    
    if (foundNote) {
        const diff = Math.abs(foundNote.targetTime - elapsedSec);
        let rating = "miss";
        let ratingColor = "#666";
        let points = 0;
        
        if (diff <= 0.045) { // Perfect
            rating = "PERFECT";
            ratingColor = varColor('--neon-blue');
            points = 100;
            ratingCounts.perfect++;
            playSfx('hit-perfect');
            life = Math.min(100, life + 2);
        } else if (diff <= 0.090) { // Great
            rating = "GREAT";
            ratingColor = varColor('--neon-green');
            points = 80;
            ratingCounts.great++;
            playSfx('hit-great');
            life = Math.min(100, life + 1);
        } else if (diff <= 0.135) { // Good
            rating = "GOOD";
            ratingColor = varColor('--neon-yellow');
            points = 50;
            ratingCounts.good++;
            playSfx('hit-good');
        } else { // Miss/Early
            rating = "MISS";
            ratingColor = varColor('--neon-pink');
            points = 0;
            ratingCounts.miss++;
            playSfx('hit-miss');
            life = Math.max(0, life - 8);
        }
        
        foundNote.hit = true;
        
        if (points > 0) {
            score += points;
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            spawnHitParticles(210 + laneIndex * 100 + 40, targetLineY, LANE_COLORS[laneIndex]);
        } else {
            combo = 0;
        }
        
        currentRatingText = rating;
        currentRatingColor = ratingColor;
        currentRatingTimer = 40; // Render rating for 40 frames
        
        // Death check
        if (life <= 0) {
            triggerDeathSequence();
            return;
        }
    } else {
        // Ghost key penalty (pressing when no note is present)
        combo = 0;
        life = Math.max(0, life - 4);
        
        currentRatingText = "MISS";
        currentRatingColor = varColor('--neon-pink');
        currentRatingTimer = 25;
        playSfx('hit-miss');
        
        // Death check
        if (life <= 0) {
            triggerDeathSequence();
            return;
        }
    }
}

// Retrieve CSS Variables dynamically inside Canvas drawings
function varColor(cssVarName) {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
}

// -------------------------------------------------------------
// CORE GAME LOOP
// -------------------------------------------------------------
function gameLoop(timestamp) {
    updateGame();
    renderGame();
    requestAnimationFrame(gameLoop);
}

// 1. UPDATE LOGIC
function updateGame() {
    rhythmVisualTimer++;
    player.animFrame++;
    
    // Update particle systems
    updateParticles();
    
    if (gameState === STATE_ADVENTURE) {
        updateAdventureMode();
    } 
    else if (gameState === STATE_DIALOGUE) {
        updateDialogueMode();
    }
    else if (gameState === STATE_TRANSITION) {
        updateTransitionMode();
    }
    else if (gameState === STATE_RHYTHM) {
        updateRhythmMode();
    }
    else if (gameState === STATE_DEATH) {
        // Bob particles, do nothing else
    }
}

function updateAdventureMode() {
    // Determine player walking speed
    let currentSpeed = player.speed;
    // Stolen limbs reduction: Without legs, player floats slower!
    if (!reclaimedLimbs.lleg && !reclaimedLimbs.rleg) {
        currentSpeed = player.speed * 0.5; // Halved speed
    } else if (!reclaimedLimbs.lleg || !reclaimedLimbs.rleg) {
        currentSpeed = player.speed * 0.75; // 75% speed
    }

    let vx = 0;
    let vy = 0;

    if (keys.KeyW) vy = -currentSpeed;
    if (keys.KeyS) vy = currentSpeed;
    if (keys.KeyA) vx = -currentSpeed;
    if (keys.KeyD) vx = currentSpeed;

    player.isMoving = (vx !== 0 || vy !== 0);

    player.x += vx;
    player.y += vy;

    // Outer Boundary Collisions
    if (player.x < 74) player.x = 74;
    if (player.x > 726) player.x = 726;
    if (player.y < 170) player.y = 170;
    if (player.y > 550) player.y = 550;

    // Stairs block logic: Portal blocked at y < 200, x 360-440 unless current floor wizard is dead
    const wizardDefeated = isWizardDefeatedOnCurrentFloor();
    if (!wizardDefeated) {
        if (player.y < 210 && player.x > 340 && player.x < 460) {
            player.y = 210; // Block access to stairs
        }
    } else {
        // Stairs are open! Trigger floor ascension if player steps into them
        if (player.y < 175 && player.x > 360 && player.x < 440) {
            ascendToNextFloor();
        }
    }

    // Wizard Interaction (Wizard is placed at x: 400, y: 240)
    const dx = player.x - 400;
    const dy = player.y - 240;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 45 && !wizardDefeated) {
        // Trigger dialogue!
        gameState = STATE_DIALOGUE;
        dialogueIndex = 0;
        dialogueCharIndex = 0;
        dialogueTextBuffer = "";
        isDialogueTextFinished = false;
        keys.Space = false; // consume space press
    }
}

// Is current wizard defeated?
function isWizardDefeatedOnCurrentFloor() {
    switch (currentFloor) {
        case 0: return reclaimedLimbs.lleg;
        case 1: return reclaimedLimbs.rleg;
        case 2: return reclaimedLimbs.larm;
        case 3: return reclaimedLimbs.rarm;
        case 4: return reclaimedLimbs.head;
        default: return false;
    }
}

// Climb Stairs to Next Floor
function ascendToNextFloor() {
    playSfx('portal-warp');
    currentFloor++;
    if (currentFloor >= maxFloors) {
        gameState = STATE_VICTORY;
    } else {
        player.x = 400;
        player.y = 480; // Reset player position to bottom center of next floor
        updateSidebar();
    }
}

function updateDialogueMode() {
    dialogueTimer++;
    const floorDialogues = DIALOGUES[currentFloor] || [];
    if (dialogueIndex >= floorDialogues.length) {
        startBattleTransition();
        return;
    }
    const currentLine = floorDialogues[dialogueIndex] || "";
    
    if (!isDialogueTextFinished && dialogueTimer % 2 === 0) {
        if (dialogueCharIndex < currentLine.length) {
            dialogueTextBuffer += currentLine[dialogueCharIndex];
            dialogueCharIndex++;
            playSfx('text-bleep');
        } else {
            isDialogueTextFinished = true;
        }
    }
}

function updateTransitionMode() {
    transitionTimer++;
    if (transitionTimer > 45) { // 45 frames of screen flash
        // Transition ends, start rhythm gameplay
        gameState = STATE_RHYTHM;
        
        // Reset rhythm parameters
        score = 0;
        combo = 0;
        ratingCounts = { perfect: 0, great: 0, good: 0, miss: 0 };
        currentRatingText = "";
        currentRatingTimer = 0;
        gameNotes = [];
        
        // Start synthesizing the song
        activeSongData = startSong(
            currentFloor,
            // Visual note spawn callback
            (targetTime, lane, beat, noteIndex) => {
                gameNotes.push({
                    targetTime: targetTime,
                    lane: lane,
                    beat: beat,
                    noteIndex: noteIndex,
                    hit: false
                });
            },
            // Song end callback
            () => {
                gameState = STATE_RHYTHM_OUTRO;
            }
        );
    }
}

function triggerDeathSequence() {
    stopSong();
    gameState = STATE_DEATH;
    transitionTimer = 0;
    playSfx('death-explode');
    spawnDeathParticles(player.x, player.y);
}

function updateRhythmMode() {
    const elapsedSec = getSongSecondsElapsed();
    
    // Auto-detect Misses (note passed without input)
    for (let i = 0; i < gameNotes.length; i++) {
        const note = gameNotes[i];
        if (note.hit === false) {
            // Note has passed the target line without key press
            if (elapsedSec - note.targetTime > 0.135) {
                note.hit = 'miss';
                combo = 0;
                ratingCounts.miss++;
                currentRatingText = "MISS";
                currentRatingColor = varColor('--neon-pink');
                currentRatingTimer = 40;
                playSfx('hit-miss');
                
                // Drain life for auto-miss
                life = Math.max(0, life - 10);
                
                // Check for death
                if (life <= 0) {
                    triggerDeathSequence();
                    return;
                }
            }
        }
    }
    
    // Check for early pass: if the player already has enough score, end the song
    if (activeSongData && score > 0) {
        const maxScore = activeSongData.maxScore || 1000;
        const minPassScore = Math.max(100, Math.floor(maxScore * getPassThreshold(currentFloor)));
        if (score >= minPassScore) {
            // Stop song and go to outro immediately!
            stopSong();
            gameState = STATE_RHYTHM_OUTRO;
            return;
        }
    }
    
    // Decrease rating visual timer
    if (currentRatingTimer > 0) currentRatingTimer--;
}

// 2. RENDERING LOGIC
function renderGame() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render layers depending on State
    if (gameState === STATE_TITLE) {
        renderTitleScreen();
    } 
    else if (gameState === STATE_ADVENTURE) {
        renderAdventureRoom();
        drawWizard(ctx, 400, 240, currentFloor, player.animFrame);
        drawPlayer(ctx, player.x, player.y, reclaimedLimbs, player.isMoving, player.animFrame);
        renderParticles();
    }
    else if (gameState === STATE_DIALOGUE) {
        renderAdventureRoom();
        drawWizard(ctx, 400, 240, currentFloor, player.animFrame);
        drawPlayer(ctx, player.x, player.y, reclaimedLimbs, false, player.animFrame);
        
        // Draw dialog box safely
        const floorDialogues = DIALOGUES[currentFloor] || [];
        const currentLine = floorDialogues[dialogueIndex] || "";
        const speaker = currentLine.startsWith("(") ? "" : "마법사";
        drawDialogueBox(ctx, speaker, dialogueTextBuffer, isDialogueTextFinished ? "Space ▶" : "");
    }
    else if (gameState === STATE_TRANSITION) {
        // Red flashing Undertale-style battle transition
        renderAdventureRoom();
        drawWizard(ctx, 400, 240, currentFloor, player.animFrame);
        drawPlayer(ctx, player.x, player.y, reclaimedLimbs, false, player.animFrame);
        
        ctx.fillStyle = `rgba(255, 0, 91, ${Math.abs(Math.sin(transitionTimer * 0.2)) * 0.6})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    else if (gameState === STATE_RHYTHM) {
        renderRhythmBoard();
    }
    else if (gameState === STATE_RHYTHM_OUTRO) {
        renderRhythmEvaluation();
    }
    else if (gameState === STATE_DEATH) {
        renderDeathScreen();
    }
    else if (gameState === STATE_VICTORY) {
        renderVictoryScreen();
    }
}

// Title screen rendering
function renderTitleScreen() {
    ctx.fillStyle = '#05010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw decorative magical matrix circles
    ctx.strokeStyle = 'rgba(161, 36, 219, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(400, 300, 220, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(400, 300, 340, 0, Math.PI * 2);
    ctx.stroke();

    // Glitch title text shadow
    ctx.font = '36px "Press Start 2P"';
    ctx.textAlign = 'center';
    
    ctx.fillStyle = varColor('--neon-pink');
    ctx.fillText("WIZARD'S TOWER", 403, 183);
    ctx.fillStyle = varColor('--neon-blue');
    ctx.fillText("WIZARD'S TOWER", 397, 177);
    ctx.fillStyle = '#fff';
    ctx.fillText("WIZARD'S TOWER", 400, 180);
    
    ctx.font = '22px "Press Start 2P"';
    ctx.fillStyle = varColor('--neon-yellow');
    ctx.fillText("RHYTHM ADVENTURE", 400, 230);

    // Floating pixel silhouette of the character
    const fakeLimbs = { torso: true, lleg: false, rleg: false, larm: false, rarm: false, head: false };
    drawPlayer(ctx, 400, 310, fakeLimbs, false, player.animFrame);

    // Prompt to start
    ctx.font = '24px "VT323"';
    ctx.fillStyle = '#fff';
    ctx.fillText("WSAD 키로 탐험하고, QWER 키로 리듬 결투를 벌여라!", 400, 410);

    ctx.font = '18px "Press Start 2P"';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = varColor('--neon-green');
        ctx.fillText("PRESS SPACE TO ASCEND", 400, 480);
    } else {
        ctx.fillStyle = 'transparent';
        ctx.fillText("PRESS SPACE TO ASCEND", 400, 480);
    }

    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = '#666';
    ctx.fillText("※ 음악을 들으려면 우측의 '오디오 활성화'를 먼저 누르세요", 400, 530);
}

// Adventure room tile render
function renderAdventureRoom() {
    // Fill theme background
    const theme = FLOOR_THEMES[currentFloor];
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Floor Tiles
    const tileSize = 40;
    for (let x = 60; x < 740; x += tileSize) {
        for (let y = 160; y < 560; y += tileSize) {
            ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? theme.c1 : theme.c2;
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }

    // Draw Brick borders (walls)
    ctx.fillStyle = '#1c1524';
    ctx.fillRect(0, 0, canvas.width, 160); // Top brick band
    ctx.fillRect(0, 560, canvas.width, 40); // Bottom wall band
    ctx.fillRect(0, 0, 60, canvas.height); // Left wall band
    ctx.fillRect(740, 0, 60, canvas.height); // Right wall band

    // Draw grid border lines
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 160, 680, 400);

    // Draw Room Title
    ctx.fillStyle = '#ffd700';
    ctx.font = '24px "VT323"';
    ctx.textAlign = 'left';
    ctx.fillText(`마법의 탑 ${currentFloor + 1}층: ${theme.name}`, 80, 50);

    // Draw Staircase up (blocked or open)
    // Stairs are located at top center
    ctx.fillStyle = '#08030f';
    ctx.fillRect(360, 120, 80, 40);
    // Draw staircase steps
    ctx.fillStyle = '#3a2d48';
    ctx.fillRect(365, 125, 70, 6);
    ctx.fillRect(370, 135, 60, 6);
    ctx.fillRect(375, 145, 50, 6);

    const wizardDefeated = isWizardDefeatedOnCurrentFloor();
    if (!wizardDefeated) {
        // Draw Magic Barrier block (pulsing red/purple shield in front of stairs)
        ctx.save();
        const pulse = Math.abs(Math.sin(player.animFrame * 0.08)) * 0.6 + 0.4;
        ctx.strokeStyle = `rgba(255, 0, 91, ${pulse})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff005b';
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.moveTo(340, 160);
        ctx.lineTo(460, 160);
        ctx.stroke();
        
        // Draw neon lock emblem
        ctx.fillStyle = `rgba(255, 0, 91, ${pulse})`;
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText("LOCKED", 400, 150);
        ctx.restore();
    } else {
        // Draw active teleport spiral portal
        ctx.save();
        ctx.translate(400, 140);
        ctx.rotate(player.animFrame * 0.05);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // internal swirly arms
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(15, -15, 25, 0);
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15, 15, -25, 0);
        ctx.stroke();
        ctx.restore();
    }

    // Draw some wall decorations (magical lanterns)
    drawLantern(ctx, 120, 110, player.animFrame);
    drawLantern(ctx, 680, 110, player.animFrame);
}

function drawLantern(ctx, x, y, frame) {
    ctx.save();
    ctx.fillStyle = '#4a2c0f';
    ctx.fillRect(x - 5, y, 10, 15);
    
    // Light bulb glow
    const flicker = Math.random() * 4;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10 + flicker;
    ctx.beginPath();
    ctx.arc(x, y + 20, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Typewriter Dialogue Box rendering
function drawDialogueBox(ctx, speaker, text, progressText) {
    ctx.save();
    ctx.fillStyle = '#05010a';
    ctx.strokeStyle = '#a124db';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(161, 36, 219, 0.3)';
    ctx.shadowBlur = 10;
    
    // Draw dialogue frame
    ctx.fillRect(60, 420, 680, 130);
    ctx.strokeRect(60, 420, 680, 130);
    
    // Draw white inner outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(66, 426, 668, 118);

    // Draw speaker name
    ctx.fillStyle = '#ffd700';
    ctx.font = '22px "VT323"';
    ctx.textAlign = 'left';
    ctx.fillText(speaker, 90, 455);

    // Draw dialogue content text
    ctx.fillStyle = '#fff';
    ctx.font = '20px "VT323"';
    ctx.fillText(text, 90, 495);

    // Draw blink progress prompt
    if (progressText && Math.floor(Date.now() / 400) % 2 === 0) {
        ctx.fillStyle = varColor('--neon-blue');
        ctx.font = '18px "VT323"';
        ctx.textAlign = 'right';
        ctx.fillText(progressText, 710, 530);
    }
    ctx.restore();
}

// Draw procedural Rhythm Combat Mode Board
function renderRhythmBoard() {
    ctx.fillStyle = '#07020d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw glowing background grid lines
    ctx.strokeStyle = 'rgba(161, 36, 219, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Draw title/song metadata at the top safely
    const songName = activeSongData?.name || "Rhythm Battle";
    const songComposer = activeSongData?.composer || "Magical Melody";
    ctx.textAlign = 'center';
    ctx.font = '24px "VT323"';
    ctx.fillStyle = '#fff';
    ctx.fillText(`현재 곡: ${songName}`, 400, 40);
    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = varColor('--neon-yellow');
    ctx.fillText(`COMPOSER: ${songComposer}`, 400, 65);

    // Render the 4 columns for notes
    const startX = 210;
    const laneWidth = 80;
    const laneGap = 20;

    for (let i = 0; i < 4; i++) {
        const lx = startX + i * (laneWidth + laneGap);
        
        // Draw column backing
        ctx.fillStyle = 'rgba(13, 5, 23, 0.8)';
        ctx.fillRect(lx, 0, laneWidth, canvas.height);
        
        // Draw column borders
        ctx.strokeStyle = 'rgba(161, 36, 219, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(lx, 0, laneWidth, canvas.height);

        // Draw receptor on target line
        ctx.save();
        if (pressedLanes[i]) {
            // Glow receptor when pressed
            ctx.fillStyle = LANE_COLORS[i];
            ctx.globalAlpha = 0.4;
            ctx.fillRect(lx, targetLineY - 10, laneWidth, 20);
            ctx.globalAlpha = 1.0;
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.shadowColor = LANE_COLORS[i];
            ctx.shadowBlur = 15;
            ctx.strokeRect(lx, targetLineY - 10, laneWidth, 20);
        } else {
            // Standby receptor
            ctx.strokeStyle = LANE_COLORS[i];
            ctx.lineWidth = 2;
            ctx.strokeRect(lx, targetLineY - 10, laneWidth, 20);
        }
        ctx.restore();

        // Draw Lane label letter (Q, W, E, R) at the bottom
        ctx.fillStyle = LANE_COLORS[i];
        ctx.font = '18px "Press Start 2P"';
        ctx.fillText(LANE_KEY_LABELS[i], lx + laneWidth/2, targetLineY + 45);
    }

    // Draw Target cross line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(180, targetLineY);
    ctx.lineTo(620, targetLineY);
    ctx.stroke();

    // Render active falling notes
    const elapsedSec = getSongSecondsElapsed();
    
    for (let i = 0; i < gameNotes.length; i++) {
        const note = gameNotes[i];
        if (note.hit === true || note.hit === 'miss') continue;
        
        // Calculate note Y position based on song time sync
        const timeDiff = note.targetTime - elapsedSec;
        const noteY = targetLineY - (timeDiff * scrollSpeed);
        
        // Only render if visible on screen
        if (noteY > -50 && noteY < canvas.height + 50) {
            const lx = startX + note.lane * (laneWidth + laneGap);
            
            ctx.save();
            ctx.fillStyle = LANE_COLORS[note.lane];
            ctx.shadowColor = LANE_COLORS[note.lane];
            ctx.shadowBlur = 8;
            
            // Draw note capsule rounded rectangle
            ctx.beginPath();
            ctx.roundRect(lx + 4, noteY - 10, laneWidth - 8, 20, 6);
            ctx.fill();
            
            // Highlight inner line
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(lx + 12, noteY - 4, laneWidth - 24, 8, 3);
            ctx.fill();
            ctx.restore();
        }
    }

    // Render floating Hit Ratings (Perfect/Great/Good/Miss)
    if (currentRatingTimer > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '26px "Press Start 2P"';
        ctx.fillStyle = currentRatingColor;
        ctx.shadowColor = currentRatingColor;
        ctx.shadowBlur = 10;
        
        // subtle bob up as it fades
        const floatY = 240 - (40 - currentRatingTimer) * 0.5;
        ctx.fillText(currentRatingText, 400, floatY);
        ctx.restore();
    }

    // Render Combo Counter
    if (combo > 2) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${combo} COMBO`, 400, 300);
        ctx.restore();
    }

    // Draw particles
    renderParticles();

    // Draw user HUD (Score, purification bar)
    renderRhythmHUD();
}

// Render Rhythm score HUD
function renderRhythmHUD() {
    // Score board
    ctx.textAlign = 'left';
    ctx.font = '18px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.fillText(`SCORE: ${score.toString().padStart(6, '0')}`, 60, 50);

    // Target Pass Score Indicator safely
    const maxScore = activeSongData?.maxScore || 1000;
    const minPassScore = Math.max(1, Math.floor(maxScore * getPassThreshold(currentFloor)));
    ctx.fillStyle = varColor('--neon-yellow');
    ctx.fillText(`GOAL: ${minPassScore.toString().padStart(6, '0')}`, 60, 80);

    // Draw Success Progress Bar (Purification Bar)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 100, 120, 20);

    const progress = Math.min(score / minPassScore, 1.0);
    ctx.fillStyle = progress >= 1.0 ? varColor('--neon-green') : varColor('--neon-pink');
    ctx.fillRect(62, 102, 116 * progress, 16);
    
    // Status text on success bar
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(progress >= 1.0 ? "PASS" : "FAIL", 120, 115);
    
    // ---- Life/HP Bar ----
    ctx.textAlign = 'left';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.fillText("HP", 60, 145);
    
    // Background track
    ctx.fillStyle = '#1a001a';
    ctx.fillRect(83, 132, 100, 14);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(83, 132, 100, 14);
    
    // HP fill
    const lifeRatio = life / maxLife;
    let hpColor;
    if (lifeRatio > 0.5) {
        hpColor = '#39ff14'; // green
    } else if (lifeRatio > 0.25) {
        hpColor = '#ffd700'; // yellow
    } else {
        hpColor = '#ff005b'; // red (danger!)
        // Pulse when critical
        ctx.shadowColor = '#ff005b';
        ctx.shadowBlur = 8 + Math.abs(Math.sin(rhythmVisualTimer * 0.15)) * 6;
    }
    ctx.fillStyle = hpColor;
    ctx.fillRect(84, 133, 98 * lifeRatio, 12);
    ctx.shadowBlur = 0;
}

// Rhythm Evaluation Screen (Outro)
function renderRhythmEvaluation() {
    ctx.fillStyle = '#05010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.font = '28px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.fillText("결투 결과", 400, 120);

    // Calculations
    const minPassScore = Math.floor(activeSongData.maxScore * getPassThreshold(currentFloor));
    const passed = score >= minPassScore;

    // Display Pass / Fail large banners
    ctx.font = '32px "Press Start 2P"';
    if (passed) {
        ctx.fillStyle = varColor('--neon-green');
        ctx.shadowColor = varColor('--neon-green');
        ctx.shadowBlur = 15;
        ctx.fillText("결투 승리! (SUCCESS)", 400, 190);
    } else {
        ctx.fillStyle = varColor('--neon-pink');
        ctx.shadowColor = varColor('--neon-pink');
        ctx.shadowBlur = 15;
        ctx.fillText("결투 패배... (FAIL)", 400, 190);
    }
    ctx.shadowBlur = 0; // reset

    // Rating breakdown list
    ctx.textAlign = 'center';
    ctx.font = '22px "VT323"';
    ctx.fillStyle = '#ccc';
    
    const bx = 300;
    ctx.fillText(`PERFECT : ${ratingCounts.perfect}회`, bx + 100, 260);
    ctx.fillText(`GREAT   : ${ratingCounts.great}회`, bx + 100, 290);
    ctx.fillText(`GOOD    : ${ratingCounts.good}회`, bx + 100, 320);
    ctx.fillText(`MISS    : ${ratingCounts.miss}회`, bx + 100, 350);
    ctx.fillText(`최대 콤보: ${maxCombo}회`, bx + 100, 385);

    ctx.font = '24px "VT323"';
    ctx.fillStyle = '#fff';
    ctx.fillText(`최종 점수: ${score}  / 목표 점수: ${minPassScore}`, 400, 440);

    // Check high score
    const savedHighScore = parseInt(localStorage.getItem('wiz_rhythm_high') || '0', 10);
    if (score > savedHighScore) {
        localStorage.setItem('wiz_rhythm_high', score.toString());
        document.getElementById('high-score-val').textContent = score.toString().padStart(6, '0');
        ctx.fillStyle = varColor('--neon-yellow');
        ctx.fillText("NEW HIGH SCORE!", 400, 470);
    }

    // Action button blink prompt
    ctx.font = '20px "Press Start 2P"';
    if (Math.floor(Date.now() / 450) % 2 === 0) {
        ctx.fillStyle = varColor('--neon-blue');
        if (passed) {
            ctx.fillText("PRESS SPACE TO RECLAIM LIMB", 400, 520);
        } else {
            ctx.fillText("PRESS SPACE TO DIE...", 400, 520);
        }
    }
}

// Game Over Death Screen rendering
function renderDeathScreen() {
    ctx.fillStyle = '#05010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw flying death ashes
    renderParticles();

    ctx.textAlign = 'center';
    ctx.font = '40px "Press Start 2P"';
    ctx.fillStyle = varColor('--neon-pink');
    ctx.shadowColor = varColor('--neon-pink');
    ctx.shadowBlur = 20;
    ctx.fillText("GAME OVER", 400, 200);
    ctx.shadowBlur = 0;

    // Undertale-like flavor text
    ctx.font = '22px "VT323"';
    ctx.fillStyle = '#fff';
    ctx.fillText("의지가 부족하구나... 신체 조각들은 다시 마법사들의 손에 흩어졌다.", 400, 270);
    ctx.fillText("포기하지 말고, 다시 한 번 도전해 보아라!", 400, 310);

    ctx.font = '16px "Press Start 2P"';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = varColor('--neon-green');
        ctx.fillText("PRESS SPACE TO RETRY THIS FLOOR", 400, 440);
    }
}

// Game Finished Victory Screen
function renderVictoryScreen() {
    ctx.fillStyle = '#05010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing background circles
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(400, 230, 130 + Math.sin(player.animFrame * 0.05) * 5, 0, Math.PI * 2);
    ctx.stroke();

    // Renders the COMPLETE character floating in center stage
    const fullLimbs = { torso: true, lleg: true, rleg: true, larm: true, rarm: true, head: true };
    drawPlayer(ctx, 400, 220, fullLimbs, true, player.animFrame);

    ctx.textAlign = 'center';
    ctx.font = '24px "Press Start 2P"';
    ctx.fillStyle = varColor('--neon-green');
    ctx.shadowColor = varColor('--neon-green');
    ctx.shadowBlur = 12;
    ctx.fillText("머리를 되찾았습니다!", 400, 340);
    ctx.shadowBlur = 0;

    ctx.font = '22px "VT323"';
    ctx.fillStyle = '#fff';
    ctx.fillText("마침내 모든 신체 일부를 되찾아 완전한 육체가 되었습니다.", 400, 385);
    ctx.fillText("당신은 탑의 사악한 마법사 무리를 꺾어냈습니다!", 400, 415);

    // Credit rolls
    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = varColor('--neon-yellow');
    ctx.fillText("FIN.", 400, 470);

    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = '#666';
    ctx.fillText("Director: Antigravity & User", 400, 505);
    ctx.fillText("Music: Bach, Mozart, Beethoven, Vivaldi", 400, 525);
    
    ctx.font = '14px "Press Start 2P"';
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = varColor('--neon-blue');
        ctx.fillText("PRESS SPACE TO RESTART TOWER", 400, 565);
    }
}

// -------------------------------------------------------------
// PROCEDURAL SPRITES DRAWING & RENDERERS
// -------------------------------------------------------------

// Draw player sprite based on limb status
function drawPlayer(ctx, x, y, limbs, isMoving, frame) {
    ctx.save();
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 25, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating bobbing animation
    let bob = Math.sin(frame * 0.15) * 3;
    let py = y + bob;

    // 1. Draw Legs (if reclaimed)
    let legOffset = Math.sin(frame * 0.25) * 4;
    ctx.fillStyle = '#3a3a3a';
    if (limbs.lleg) {
        // Left Leg
        ctx.fillRect(x - 8, py + 12 + (isMoving ? legOffset : 0), 5, 12);
        // Left boot
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 10, py + 20 + (isMoving ? legOffset : 0), 7, 4);
    }
    ctx.fillStyle = '#3a3a3a';
    if (limbs.rleg) {
        // Right Leg
        ctx.fillRect(x + 3, py + 12 - (isMoving ? legOffset : 0), 5, 12);
        // Right boot
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 2, py + 20 - (isMoving ? legOffset : 0), 7, 4);
    }

    // 2. Draw Torso (Always present)
    ctx.fillStyle = '#4b2c85'; // wizard's tunic / dark vest
    ctx.fillRect(x - 12, py - 12, 24, 24);
    
    // Heart/Soul emblem in the center (Undertale flavor!)
    ctx.fillStyle = '#ff005b'; // red soul
    ctx.beginPath();
    ctx.moveTo(x, py - 4);
    ctx.lineTo(x + 4, py - 8);
    ctx.lineTo(x + 8, py - 4);
    ctx.lineTo(x, py + 4);
    ctx.lineTo(x - 8, py - 4);
    ctx.lineTo(x - 4, py - 8);
    ctx.closePath();
    ctx.fill();

    // 3. Draw Arms (if reclaimed)
    let armSwing = Math.sin(frame * 0.2) * 5;
    ctx.fillStyle = '#653ba8';
    if (limbs.larm) {
        // Left Arm
        ctx.fillRect(x - 20, py - 8 + (isMoving ? armSwing : 0), 8, 8);
        ctx.fillStyle = '#ffdbac'; // skin color
        ctx.fillRect(x - 23, py - 6 + (isMoving ? armSwing : 0), 4, 5);
    }
    ctx.fillStyle = '#653ba8';
    if (limbs.rarm) {
        // Right Arm
        ctx.fillRect(x + 12, py - 8 - (isMoving ? armSwing : 0), 8, 8);
        ctx.fillStyle = '#ffdbac'; // skin color
        ctx.fillRect(x + 19, py - 6 - (isMoving ? armSwing : 0), 4, 5);
    }

    // 4. Draw Head (if reclaimed)
    if (limbs.head) {
        // Neck
        ctx.fillStyle = '#ffdbac';
        ctx.fillRect(x - 3, py - 16, 6, 5);
        // Face
        ctx.fillRect(x - 10, py - 32, 20, 18);
        // Hair (retro brown hair)
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(x - 11, py - 35, 22, 6); // top
        ctx.fillRect(x - 11, py - 35, 4, 15); // left side
        ctx.fillRect(x + 7, py - 35, 4, 15); // right side
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 5, py - 25, 2, 3);
        ctx.fillRect(x + 3, py - 25, 2, 3);
        // Mouth
        ctx.fillStyle = '#e25858';
        ctx.fillRect(x - 2, py - 20, 4, 2);
    } else {
        // Missing Head: Draw a floating glowing cyan soul fragment/spark
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, py - 24, 6 + Math.sin(frame * 0.3) * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Draw wizard sprite depending on floor
function drawWizard(ctx, x, y, type, frame) {
    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 25, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    let bob = Math.sin(frame * 0.1) * 4;
    let wy = y + bob;

    switch (type) {
        case 0: // Flora, Nature Wizard (Green)
            // Robe
            ctx.fillStyle = '#2d7a43';
            ctx.fillRect(x - 16, wy - 10, 32, 32);
            // Skin
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(x - 10, wy - 24, 20, 15);
            // Leaf Crown
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(x - 12, wy - 27, 24, 4);
            ctx.fillRect(x - 8, wy - 30, 4, 4);
            ctx.fillRect(x + 4, wy - 30, 4, 4);
            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 5, wy - 18, 2, 3);
            ctx.fillRect(x + 3, wy - 18, 2, 3);
            break;
            
        case 1: // Glacius, Ice Wizard (Cyan)
            // Robe
            ctx.fillStyle = '#2b658f';
            ctx.fillRect(x - 16, wy - 10, 32, 32);
            // Skin
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(x - 10, wy - 24, 20, 15);
            // Ice Hat
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.moveTo(x - 14, wy - 24);
            ctx.lineTo(x + 14, wy - 24);
            ctx.lineTo(x, wy - 42);
            ctx.closePath();
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(x - 5, wy - 18, 2, 2);
            ctx.fillRect(x + 3, wy - 18, 2, 2);
            break;
            
        case 2: // Aero, Storm Wizard (Yellow)
            // Robe
            ctx.fillStyle = '#bfa51f';
            ctx.fillRect(x - 16, wy - 10, 32, 32);
            // Skin
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(x - 10, wy - 24, 20, 15);
            // Lightning aura
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            if (frame % 8 < 4) {
                ctx.beginPath();
                ctx.moveTo(x - 22, wy - 30);
                ctx.lineTo(x - 18, wy - 15);
                ctx.lineTo(x - 24, wy - 5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 22, wy - 30);
                ctx.lineTo(x + 18, wy - 15);
                ctx.lineTo(x + 24, wy - 5);
                ctx.stroke();
            }
            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 5, wy - 18, 2, 3);
            ctx.fillRect(x + 3, wy - 18, 2, 3);
            break;
            
        case 3: // Ignis, Fire Wizard (Red)
            // Robe
            ctx.fillStyle = '#9e2d25';
            ctx.fillRect(x - 16, wy - 10, 32, 32);
            // Skin
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(x - 10, wy - 24, 20, 15);
            // Fiery crown
            ctx.fillStyle = '#ff4d00';
            ctx.fillRect(x - 12, wy - 28, 24, 5);
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(x - 8, wy - 32, 4, 5);
            ctx.fillRect(x, wy - 34, 4, 7);
            ctx.fillRect(x + 8, wy - 32, 4, 5);
            // Eyes
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x - 5, wy - 18, 2, 3);
            ctx.fillRect(x + 3, wy - 18, 2, 3);
            break;
            
        case 4: // Archmage Malakar (Dark Purple final boss)
            // Dark purple robe
            ctx.fillStyle = '#1b072b';
            ctx.fillRect(x - 18, wy - 12, 36, 36);
            // Cowl / hood
            ctx.fillStyle = '#2f084d';
            ctx.fillRect(x - 12, wy - 28, 24, 18);
            // Inside of hood
            ctx.fillStyle = '#05010a';
            ctx.fillRect(x - 8, wy - 24, 16, 12);
            // Glowing white eyes in cowl
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 8;
            ctx.fillRect(x - 5, wy - 20, 3, 3);
            ctx.fillRect(x + 2, wy - 20, 3, 3);
            ctx.shadowBlur = 0; // reset
            
            // Orbiting magic rings
            ctx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, wy - 5, 28 + Math.sin(frame * 0.1) * 3, 0, Math.PI * 2);
            ctx.stroke();
            break;
    }
    
    ctx.restore();
}

// -------------------------------------------------------------
// RETRO SPARK PARTICLE ENGINE
// -------------------------------------------------------------
function updateParticles() {
    for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= 0.02;
        
        if (p.alpha <= 0) {
            activeParticles.splice(i, 1);
        }
    }
}

function renderParticles() {
    ctx.save();
    for (const p of activeParticles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
}

// Spawn colorful sparks on note hits
function spawnHitParticles(x, y, color) {
    const numParticles = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < numParticles; i++) {
        activeParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 6 - 2, // shoot upwards
            size: Math.random() * 4 + 2,
            alpha: 1.0,
            color: color,
            gravity: 0.15
        });
    }
}

// Spawn massive red ashes on player death explosion
function spawnDeathParticles(x, y) {
    const numParticles = 40;
    for (let i = 0; i < numParticles; i++) {
        activeParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 5 + 3,
            alpha: 1.0,
            color: '#ff005b',
            gravity: 0.08
        });
    }
}
