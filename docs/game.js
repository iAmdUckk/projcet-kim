// Wizard's Rhythm Tower - Main Game Logic Engine

// Canvas and Rendering Context
let canvas = null;
let ctx = null;

// Game States
const STATE_BOOT = -1;        // Retro Arcade Cyber-Boot sequence
const STATE_TITLE = 0;
const STATE_ADVENTURE = 1;
const STATE_DIALOGUE = 2;
const STATE_TRANSITION = 3;
const STATE_RHYTHM = 4;
const STATE_RHYTHM_OUTRO = 5;
const STATE_DEATH = 6;
const STATE_VICTORY = 7;
const STATE_HIDDEN_RESULT = 9;
const STATE_BOSS_INTRO = 8;   // Boss entrance cinematic

let gameState = STATE_BOOT;

// Website Entrance / Cyber Boot State
let bootTimer = 0;
const BOOT_DURATION = 140; // ~2.3 seconds of cyber initialization

// Boss Intro State
let bossIntroTimer = 0;
const BOSS_INTRO_DURATION = 210; // ~3.5 seconds at 60fps

// Victory / Epilogue State (Story reveal & colossal enemy cliffhanger)
const VICTORY_RESULTS = -1;
let victoryPhase = 0; // 0: Awakening, 1: True Hero, 2: The Colossal Nemesis
let victoryTimer = 0;

// Key State Tracking
const keys = {
    // WASD (Adventure Mode)
    KeyW: false, KeyA: false, KeyS: false, KeyD: false,
    // DFJK (Rhythm Game Mode)
    KeyD_r: false, KeyF_r: false, KeyJ_r: false, KeyK_r: false,
    // System Keys
    Space: false
};

// Lane Key Bindings for Rhythm Game (D, F, J, K - classic 4-key rhythm layout)
const LANE_KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
const LANE_KEY_LABELS = ['D', 'F', 'J', 'K'];
// Sleek Cyber-Monochrome note palette (Pure White, Electric Silver, Platinum Steel, Bright Ice Silver)
const LANE_COLORS = ['#ffffff', '#cbd5e1', '#ffffff', '#cbd5e1'];

// Active Game Settings
let currentFloor = 0;
const maxFloors = 5;
const clearedFloorRatings = Array(maxFloors).fill(null);
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

function getNoteMissDamage() {
    const percent = 4 + Math.floor(Math.random() * 5);
    return maxLife * percent / 100;
}

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
const musicAnalysisVersion = [0, 0, 0, 0, 0];

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
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const version = ++musicAnalysisVersion[f];
                const audioStatus = document.getElementById('audio-status');
                if (audioStatus) audioStatus.textContent = `${f + 1}층 음악 박자 분석 중...`;
                if (fnameSpan) fnameSpan.textContent = '분석 중...';
                try {
                    if (!isAudioInitialized) initAudio();
                    if (!audioCtx) throw new Error('오디오를 사용할 수 없습니다.');
                    const decoded = await audioCtx.decodeAudioData(await file.arrayBuffer());
                    if (version !== musicAnalysisVersion[f]) return;
                    const notes = analyzeMusicNotes(decoded);
                    if (!notes.length) throw new Error('음의 시작점을 찾지 못했습니다.');
                    floorAudioSources[f] = {
                        name: file.name,
                        buffer: decoded,
                        duration: decoded.duration,
                        analyzedNotes: notes
                    };
                    if (fnameSpan) {
                        fnameSpan.textContent = file.name;
                        fnameSpan.className = 'music-fname loaded';
                    }
                    if (audioStatus) {
                        audioStatus.textContent = `${f + 1}층에 적용 완료: ${file.name} (${notes.length}개 노트). 해당 층 전투부터 적용됩니다.`;
                        audioStatus.style.color = '#39ff14';
                    }
                } catch (error) {
                    if (version !== musicAnalysisVersion[f]) return;
                    if (fnameSpan) fnameSpan.textContent = floorAudioSources[f]?.name || '기본 (합성)';
                    if (audioStatus) {
                        audioStatus.textContent = `음악 분석 실패: ${error.message}`;
                        audioStatus.style.color = '#ff6688';
                    }
                }
            });
        }
    }

    // Reset All Custom Audio Button
    const clearBtn = document.getElementById('btn-clear-music');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            for (let f = 0; f < 5; f++) {
                musicAnalysisVersion[f]++;
            }
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
            const contentType = resp.headers.get('content-type') || '';
            if (resp.ok && contentType.toLowerCase().startsWith('audio/') && musicAnalysisVersion[item.floor] === 0) {
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

// Update sidebar status UI & Site-wide floor theme ambiance
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

    // Decorate entire website background and lighting based on floor concept
    if (document.body) {
        for (let i = 0; i < 5; i++) {
            document.body.classList.remove(`floor-theme-${i}`);
        }
        document.body.classList.add(`floor-theme-${currentFloor}`);
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

        if (hiddenFight || gameState === STATE_HIDDEN_RESULT ||
            (hiddenUnlocked && gameState === STATE_TITLE && e.code === 'KeyH')) {
            if (e.repeat) return;
            if (e.code === 'Escape') {
                leaveHiddenStage();
                return;
            }
            if (hiddenFight) {
                const lane = LANE_KEYS.indexOf(e.code);
                if (lane >= 0) handleRhythmKeyPress(lane);
            } else if (gameState === STATE_TITLE || performance.now() - hiddenResult.time >= 650) {
                if (e.code === 'KeyH' || (!hiddenResult?.cleared && ['Space', 'Enter'].includes(e.code))) {
                    startHiddenStage();
                } else if (['Space', 'Enter'].includes(e.code)) {
                    leaveHiddenStage();
                }
            }
            return;
        }

        // Set movement key status (Adventure Mode)
        if (e.code === 'KeyW' || e.key === 'w' || e.key === 'W' || e.key === 'ㅈ') keys.KeyW = true;
        if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'ㅁ') keys.KeyA = true;
        if (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'ㄴ') keys.KeyS = true;
        if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === 'ㅇ') {
            keys.KeyD = true;
            // D key doubles as Lane 0 in Rhythm Mode
            if (gameState === STATE_RHYTHM) {
                keys.KeyD_r = true;
                handleRhythmKeyPress(0);
            }
        }
        
        // Rhythm Keys (D, F, J, K - 4K layout)
        if (gameState === STATE_RHYTHM) {
            if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'ㄹ') {
                keys.KeyF_r = true;
                handleRhythmKeyPress(1);
            }
            if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.key === 'ㅓ') {
                keys.KeyJ_r = true;
                handleRhythmKeyPress(2);
            }
            if (e.code === 'KeyK' || e.key === 'k' || e.key === 'K' || e.key === 'ㅏ') {
                keys.KeyK_r = true;
                handleRhythmKeyPress(3);
            }
        }

        // Action Keys
        if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) {
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
        if (e.code === 'KeyW' || e.key === 'w' || e.key === 'W' || e.key === 'ㅈ') keys.KeyW = false;
        if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'ㅁ') keys.KeyA = false;
        if (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'ㄴ') keys.KeyS = false;
        if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === 'ㅇ') {
            keys.KeyD = false;
            keys.KeyD_r = false;
            pressedLanes[0] = false;
        }
        
        if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'ㄹ') {
            keys.KeyF_r = false;
            pressedLanes[1] = false;
        }
        if (e.code === 'KeyJ' || e.key === 'j' || e.key === 'J' || e.key === 'ㅓ') {
            keys.KeyJ_r = false;
            pressedLanes[2] = false;
        }
        if (e.code === 'KeyK' || e.key === 'k' || e.key === 'K' || e.key === 'ㅏ') {
            keys.KeyK_r = false;
            pressedLanes[3] = false;
        }
        
        if (e.code === 'Space' || e.code === 'Enter') {
            keys.Space = false;
        }
    });
}

// Action Key (Space/Enter) triggers based on State
function handleActionKeyPress() {
    if (gameState === STATE_BOOT) {
        // Skip boot sequence immediately into Title screen
        gameState = STATE_TITLE;
        return;
    }
    else if (gameState === STATE_TITLE) {
        // Unlock Web Audio API inside user click
        initAudio();
        // Remove title fullscreen mode to reveal UI and sidebars smoothly
        const outerContainer = document.getElementById('game-outer-container');
        if (outerContainer) {
            outerContainer.classList.remove('title-fullscreen-mode');
            outerContainer.classList.remove('title-screen-shake');
        }
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
        const minPassScore = Math.max(100, Math.floor((activeSongData?.maxScore || 1000) * getPassThreshold(currentFloor)));
        
        if (score >= minPassScore) {
            // PASS: Reclaim body part!
            clearedFloorRatings[currentFloor] = { ...ratingCounts };
            reclaimLimbOnCurrentFloor();
            playSfx('limb-reclaim');
            
            // Advance state
            if (currentFloor === maxFloors - 1) {
                unlockHiddenStage();
                // Beat the Archmage! Go to Epic Victory & Truth Sequence
                gameState = STATE_VICTORY;
                victoryPhase = clearedFloorRatings.every(Boolean) ? VICTORY_RESULTS : 0;
                victoryTimer = 0;
                stopSong();
                updateSidebar();
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
        // Multi-stage cinematic epilogue navigation
        if (victoryPhase === VICTORY_RESULTS) {
            victoryPhase = 0;
            victoryTimer = 0;
        } else if (victoryPhase === 0) {
            victoryPhase = 1; // Awakening -> True Hero
            victoryTimer = 0;
            playSfx('limb-reclaim');
        } else if (victoryPhase === 1) {
            victoryPhase = 2; // True Hero -> The Colossal Nemesis Cliffhanger
            victoryTimer = 0;
            playSfx('portal-warp');
        } else {
            if (hiddenUnlocked) {
                startHiddenStage();
                return;
            }
            // Epilogue complete, return to title screen
            resetGameToStart();
            victoryPhase = 0;
            gameState = STATE_TITLE;
        }
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
    clearedFloorRatings.fill(null);
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

// Setup Battle Transition (goes via BOSS_INTRO first)
function startBattleTransition() {
    gameState = STATE_BOSS_INTRO;
    bossIntroTimer = 0;
    transitionTimer = 0;
    transitionState = 0;
    playSfx('portal-warp');

    // Clear rhythm game stats
    score = 0;
    combo = 0;
    maxCombo = 0;
    ratingCounts = { perfect: 0, great: 0, good: 0, miss: 0 };
    currentRatingText = "";
    currentRatingTimer = 0;
    gameNotes = [];
    life = 100;

    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// After intro completes, kick off the red-flash transition
function startRedFlashTransition() {
    gameState = STATE_TRANSITION;
    transitionTimer = 0;
    transitionState = 0;
}

// Rhythm Key Press Engine (QWER)
function handleRhythmKeyPress(laneIndex) {
    if (gameState !== STATE_RHYTHM) return;
    
    pressedLanes[laneIndex] = true;
    
    const elapsedSec = getSongSecondsElapsed();
    
    // Choose the closest note when two quick syllables share a lane.
    let foundNote = null;
    let closest = Infinity;
    const hitWindow = hiddenFight ? 0.070 : 0.135;
    for (let i = 0; i < gameNotes.length; i++) {
        const note = gameNotes[i];
        if (note.lane === laneIndex && note.hit === false) {
            // Note is close enough to target window
            const diff = note.targetTime - elapsedSec;
            if (diff >= (hiddenFight ? -hitWindow : -0.15) && diff <= (hiddenFight ? hitWindow : 0.20) && Math.abs(diff) < closest) {
                foundNote = note;
                closest = Math.abs(diff);
            }
        }
    }
    
    if (foundNote) {
        const diff = Math.abs(foundNote.targetTime - elapsedSec);
        let rating = "miss";
        let ratingColor = "#666";
        let points = 0;
        
        if (diff <= (hiddenFight ? 0.025 : 0.045)) { // Perfect
            rating = "PERFECT";
            ratingColor = varColor('--neon-blue');
            points = 100;
            ratingCounts.perfect++;
        } else if (diff <= (hiddenFight ? 0.045 : 0.090)) { // Great
            rating = "GREAT";
            ratingColor = varColor('--neon-green');
            points = 80;
            ratingCounts.great++;
        } else if (diff <= hitWindow) { // Good
            rating = "GOOD";
            ratingColor = varColor('--neon-yellow');
            points = 50;
            ratingCounts.good++;
        } else { // Miss/Early
            rating = "MISS";
            ratingColor = varColor('--neon-pink');
            points = 0;
            ratingCounts.miss++;
            playSfx('hit-miss');
            life = Math.max(0, life - getNoteMissDamage());
        }
        
        foundNote.hit = true;
        
        if (points > 0) {
            playSongHit();
            score += points;
            combo++;
            if (!hiddenFight && combo >= 15) life = Math.min(maxLife, life + maxLife * 0.02);
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
        if (hiddenFight) hiddenCounterattack(laneIndex, 5);
        else life = Math.max(0, life - 4);
        
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
    
    if (gameState === STATE_BOOT) {
        updateBootMode();
    }
    else if (gameState === STATE_ADVENTURE) {
        updateAdventureMode();
    } 
    else if (gameState === STATE_DIALOGUE) {
        updateDialogueMode();
    }
    else if (gameState === STATE_BOSS_INTRO) {
        updateBossIntroMode();
    }
    else if (gameState === STATE_TRANSITION) {
        updateTransitionMode();
    }
    else if (gameState === STATE_RHYTHM) {
        updateRhythmMode();
    }
    else if (gameState === STATE_VICTORY) {
        victoryTimer++;
    }
    else if (gameState === STATE_DEATH) {
        // Bob particles, do nothing else
    }
}

function updateBootMode() {
    bootTimer++;
    if (bootTimer >= BOOT_DURATION) {
        gameState = STATE_TITLE;
    }
}

function updateBossIntroMode() {
    bossIntroTimer++;
    if (bossIntroTimer >= BOSS_INTRO_DURATION) {
        startRedFlashTransition();
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
            spawnRhythmNote,
            // Song end callback
            () => {
                gameState = STATE_RHYTHM_OUTRO;
            }
        );
    }
}

function spawnRhythmNote(targetTime, lane, beat, noteIndex) {
    gameNotes.push({ targetTime, lane, beat, noteIndex, hit: false });
}

function triggerDeathSequence() {
    if (hiddenFight) {
        finishHiddenStage(false);
        return;
    }
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
            if (elapsedSec - note.targetTime > (hiddenFight ? 0.070 : 0.135)) {
                note.hit = 'miss';
                combo = 0;
                ratingCounts.miss++;
                currentRatingText = "MISS";
                currentRatingColor = varColor('--neon-pink');
                currentRatingTimer = 40;
                playSfx('hit-miss');
                
                // Drain life for auto-miss
                if (hiddenFight) hiddenCounterattack(note.lane, 7 + hiddenPhase(elapsedSec));
                else life = Math.max(0, life - getNoteMissDamage());
                
                // Check for death
                if (life <= 0) {
                    triggerDeathSequence();
                    return;
                }
            }
        }
    }
    
    // Check for early pass: if the player already has enough score, end the song
    if (!hiddenFight && activeSongData && score > 0) {
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
    if (gameState === STATE_BOOT) {
        renderBootScreen();
    }
    else if (gameState === STATE_TITLE) {
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
    else if (gameState === STATE_BOSS_INTRO) {
        renderBossIntro();
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
    } else if (gameState === STATE_HIDDEN_RESULT) {
        renderHiddenResult();
    }
}

// ═══════════════════════════════════════════════════════════
//  WEBSITE ENTRANCE / RETRO CYBER-BOOT SEQUENCE
//  Builds anticipation with CRT power-on and cyber diagnostics
// ═══════════════════════════════════════════════════════════
function renderBootScreen() {
    const W = canvas.width, H = canvas.height;
    const t = bootTimer;

    ctx.save();
    ctx.fillStyle = '#020005';
    ctx.fillRect(0, 0, W, H);

    // Stage 1: CRT Horizontal Phosphor Laser Power-on (0 ~ 25 frames)
    if (t < 25) {
        const lineH = Math.max(2, (t / 25) * 8);
        const lineW = Math.min(W, (t / 20) * W);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.fillRect((W - lineW) / 2, (H - lineH) / 2, lineW, lineH);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect((W - lineW) / 2, (H - 2) / 2, lineW, 2);
        ctx.restore();
        return;
    }

    // Stage 2: CRT Aperture Opening & Cyber Diagnostics (25 ~ 115 frames)
    const openProg = Math.min(1, (t - 25) / 20);
    const viewH = H * openProg;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, (H - viewH) / 2, W, viewH);
    ctx.clip();

    // Dark cyber grid
    ctx.strokeStyle = 'rgba(161, 36, 219, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Retro Terminal Header
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText("AGY-ARCADE SYSTEM // BIOS v2.0", 60, 90);
    ctx.shadowBlur = 0;

    // Diagnostic console logs
    const logs = [
        { text: "> CORE SYNTHESIZER SOUND ENGINE .......... [OK]", time: 32, col: '#39ff14' },
        { text: "> 4-KEY RHYTHM INTERFACE [ D F J K ] ..... [READY]", time: 50, col: '#00f0ff' },
        { text: "> RE; BODY 5-FLOOR SYSTEM MATRIX ......... [LOADED]", time: 68, col: '#ffd700' },
        { text: "> RECONNECTING SEALED HERO PROTOCOL ...... [SYNCHRONIZED]", time: 86, col: '#ff005b' }
    ];

    ctx.font = '22px "VT323"';
    let lineY = 145;
    for (let log of logs) {
        if (t >= log.time) {
            ctx.fillStyle = log.col;
            ctx.fillText(log.text, 60, lineY);
        }
        lineY += 36;
    }

    // High-tech Progress Bar
    const barW = 680;
    const fillProg = Math.min(1, (t - 30) / 75);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 310, barW, 26);
    
    // Gradient fill
    const barGrad = ctx.createLinearGradient(60, 0, 60 + barW, 0);
    barGrad.addColorStop(0, '#00f0ff');
    barGrad.addColorStop(0.5, '#bd00ff');
    barGrad.addColorStop(1, '#39ff14');
    ctx.fillStyle = barGrad;
    ctx.fillRect(63, 313, (barW - 6) * fillProg, 20);

    // Percentage
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.floor(fillProg * 100)}%`, 60 + barW, 365);

    // Pulse Logo reveal (Stage 3: 85+ frames)
    if (t >= 85) {
        const logoAlpha = Math.min(1, (t - 85) / 25);
        ctx.globalAlpha = logoAlpha;
        ctx.textAlign = 'center';
        ctx.font = '28px "Press Start 2P"';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.fillText("RE : BODY", W / 2, 436);
        
        ctx.font = '20px "VT323"';
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 0;
        ctx.fillText("✦ AWAKENING THE HERO CORE ✦", W / 2, 474);
        ctx.globalAlpha = 1.0;
    }

    // Skip Prompt
    ctx.font = '16px "VT323"';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText("[ SPACE 키를 누르면 즉시 게임으로 진입합니다 ]", W / 2, H - 35);

    ctx.restore();

    // Stage 4: Flash transition to Title screen (120 ~ 140 frames)
    if (t >= 120) {
        const flashAlpha = (t - 120) / 20;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.9})`;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════
//  HIGH-IMPACT TITLE SCREEN & THUMBNAIL RENDERER
//  Displays Wizard's Tower, D-F-J-K rhythm lanes, 5 boss crests,
//  and limb reclamation theme with arcade retro aesthetics.
// ═══════════════════════════════════════════════════════════
function renderTitleScreen() {
    const W = canvas.width, H = canvas.height;
    const t = player.animFrame;

    // Ensure title fullscreen mode is applied on container
    const outerContainer = document.getElementById('game-outer-container');
    if (outerContainer && !outerContainer.classList.contains('title-fullscreen-mode')) {
        outerContainer.classList.add('title-fullscreen-mode');
    }

    // 1. Sleek Cybernetic Void Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#020108');
    bgGrad.addColorStop(0.45, '#0a0319');
    bgGrad.addColorStop(0.8, '#100524');
    bgGrad.addColorStop(1, '#030109');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Elegant Perspective Rhythm Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(117, 225, 207, 0.12)';
    ctx.lineWidth = 1;
    const vpX = W / 2, vpY = 240;
    // Perspective lines radiating downwards
    for (let x = -200; x <= W + 200; x += 80) {
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    // Horizontal rhythm wave lines
    for (let y = vpY + 30; y < H; y += 35) {
        const lineAlpha = ((y - vpY) / (H - vpY)) * 0.25;
        ctx.strokeStyle = `rgba(161, 36, 219, ${lineAlpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    ctx.restore();

    // 3. Subtle Ambient Starfield
    for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + 13) % W;
        const sy = (i * 71 + 29) % (H - 120);
        const twinkle = Math.sin(t * 0.08 + i * 1.7) * 0.5 + 0.5;
        ctx.fillStyle = i % 2 === 0 ? `rgba(117, 225, 207, ${twinkle * 0.7})` : `rgba(255, 255, 255, ${twinkle * 0.6})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // 4. Centerpiece: Reclaimed Hero Silhouette with glowing cybernetic circuits
    const pedY = 295;
    ctx.save();
    // Mystic circular aura under hero
    const pulseRad = 46 + Math.sin(t * 0.1) * 4;
    const auraGrad = ctx.createRadialGradient(400, pedY + 12, 5, 400, pedY + 12, pulseRad);
    auraGrad.addColorStop(0, 'rgba(117, 225, 207, 0.35)');
    auraGrad.addColorStop(0.5, 'rgba(189, 0, 255, 0.2)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(400, pedY + 12, pulseRad, 0, Math.PI * 2);
    ctx.fill();

    // Hero silhouette in center
    const titleLimbs = { torso: true, lleg: false, rleg: false, larm: false, rarm: false, head: false };
    drawPlayer(ctx, 400, pedY - 8, titleLimbs, false, t);

    // Glowing Neon Reconstruction Circuit Nodes (Body parts to reclaim)
    const reclaimNodes = [
        { label: "L-LEG", col: "#91d6a9", x: 345, y: pedY + 20, tx: 382, ty: pedY + 16 },
        { label: "R-LEG", col: "#75e1cf", x: 455, y: pedY + 20, tx: 418, ty: pedY + 16 },
        { label: "L-ARM", col: "#f5c491", x: 330, y: pedY - 14, tx: 375, ty: pedY - 10 },
        { label: "R-ARM", col: "#ff9e76", x: 470, y: pedY - 14, tx: 425, ty: pedY - 10 },
        { label: "CORE",  col: "#bd00ff", x: 400, y: pedY - 48, tx: 400, ty: pedY - 26 }
    ];

    for (let node of reclaimNodes) {
        // Laser connection trace to missing limb socket
        ctx.strokeStyle = node.col;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6 + Math.sin(t * 0.15) * 0.3;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.tx, node.ty);
        ctx.stroke();

        // Node target dot
        ctx.fillStyle = node.col;
        ctx.shadowColor = node.col;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Small tech label
        ctx.font = '10px "VT323"';
        ctx.fillStyle = node.col;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y - 8);
        ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 5. Main logo
    ctx.save();
    ctx.textAlign = 'center';

    const logoY = 135;
    // Layer 1: Chromatic Neon Pink Offset (+4, +3)
    ctx.font = '900 58px "Orbitron", "Press Start 2P", sans-serif';
    ctx.fillStyle = '#ff9e76';
    ctx.shadowColor = '#ff9e76';
    ctx.shadowBlur = 18;
    ctx.fillText("RE; BODY", 404, logoY + 3);

    // Layer 2: Chromatic Neon Cyan Offset (-4, -3)
    ctx.fillStyle = '#75e1cf';
    ctx.shadowColor = '#75e1cf';
    ctx.shadowBlur = 18;
    ctx.fillText("RE; BODY", 396, logoY - 3);

    // Layer 3: Solid Gloss White with Laser Gradient Core
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.fillText("RE; BODY", 400, logoY);
    ctx.shadowBlur = 0;

    // Logo subtitle
    ctx.font = '28px "VT323", sans-serif';
    ctx.fillStyle = '#f5c491';
    ctx.shadowColor = '#f5c491';
    ctx.shadowBlur = 6;
    ctx.fillText("find my body", 400, logoY + 42);
    ctx.shadowBlur = 0;

    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = '#f1c8a4';
    ctx.fillText("잃어버린 사지를 되찾는 리듬 액션 RPG", 400, logoY + 70);
    ctx.restore();

    // 6. Clean 4-Key Rhythm Receptors [ D ] [ F ] [ J ] [ K ]
    const laneX = [250, 350, 450, 550];
    const laneCols = ['#75e1cf', '#91d6a9', '#ff9e76', '#f5c491'];
    const laneKeys = ['D', 'F', 'J', 'K'];
    const keyY = 405;

    for (let i = 0; i < 4; i++) {
        const lx = laneX[i];
        const col = laneCols[i];
        const activeWave = Math.sin(t * 0.12 + i * 1.5) * 0.5 + 0.5;

        ctx.save();
        // Receptor box
        ctx.fillStyle = 'rgba(15, 6, 28, 0.9)';
        ctx.fillRect(lx - 28, keyY, 56, 36);

        // Border & glow
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.shadowColor = col;
        ctx.shadowBlur = 10 + activeWave * 6;
        ctx.strokeRect(lx - 28, keyY, 56, 36);

        // Keycap Letter
        ctx.font = '18px "Press Start 2P"';
        ctx.fillStyle = activeWave > 0.6 ? '#ffffff' : col;
        ctx.textAlign = 'center';
        ctx.fillText(laneKeys[i], lx, keyY + 25);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // 7. PRESS SPACE TO START (High-Impact Arcade Button)
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    ctx.save();
    ctx.textAlign = 'center';

    const btnY = 470;
    // Outer button container
    ctx.fillStyle = blink ? 'rgba(117, 225, 207, 0.18)' : 'rgba(5, 2, 12, 0.75)';
    ctx.strokeStyle = blink ? '#75e1cf' : '#427f79';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#75e1cf';
    ctx.shadowBlur = blink ? 18 : 6;
    ctx.strokeRect(220, btnY, 360, 46);
    ctx.fillRect(220, btnY, 360, 46);

    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = blink ? '#ffffff' : '#75e1cf';
    ctx.shadowBlur = blink ? 10 : 0;
    ctx.fillText("▶ PRESS SPACE TO START ◀", 400, btnY + 30);
    ctx.restore();

    // 8. Clean Control Guide Footer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '22px "VT323"';
    ctx.fillStyle = '#d8efe5';
    ctx.fillText("WASD: 필드 이동   |   D · F · J · K: 리듬 타격   |   SPACE: 대화 및 시작", 400, 545);

    ctx.font = '16px "VT323"';
    ctx.fillStyle = 'rgba(245, 196, 145, 0.85)';
    ctx.fillText(hiddenUnlocked ? "H · 히든 스테이지 재도전" : "※ 게임 시작 후 사운드가 자동으로 출력됩니다", 400, 572);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════
//  THEMATIC ADVENTURE ROOM & BOSS ARENA RENDERER
//  Renders custom terrain, animated altars, pillars, and
//  elemental effects for each of the 5 wizard floors.
// ═══════════════════════════════════════════════════════════
function renderAdventureRoom() {
    const theme = FLOOR_THEMES[currentFloor];
    const frame = player.animFrame;

    // 1. Fill theme background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Floor Tiles with elemental checkerboard
    const tileSize = 40;
    for (let x = 60; x < 740; x += tileSize) {
        for (let y = 160; y < 560; y += tileSize) {
            ctx.fillStyle = ((x + y) / tileSize) % 2 === 0 ? theme.c1 : theme.c2;
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }

    // 3. Render Custom Floor-Specific Decorations (Altar, Pillars, Flora/Ice/Fire/Void)
    renderFloorDecorations(ctx, currentFloor, frame);

    // 4. Brick borders (walls)
    ctx.fillStyle = '#1c1524';
    ctx.fillRect(0, 0, canvas.width, 160); // Top brick band
    ctx.fillRect(0, 560, canvas.width, 40); // Bottom wall band
    ctx.fillRect(0, 0, 60, canvas.height); // Left wall band
    ctx.fillRect(740, 0, 60, canvas.height); // Right wall band

    // 5. Draw grid border lines
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 160, 680, 400);

    // 6. Draw Room Title Badge
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(75, 25, 420, 38);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(75, 25, 420, 38);

    ctx.fillStyle = '#ffd700';
    ctx.font = '24px "VT323"';
    ctx.textAlign = 'left';
    ctx.fillText(`마법의 탑 ${currentFloor + 1}층: ${theme.name}`, 90, 52);
    ctx.restore();

    // 7. Draw Staircase up (blocked or open)
    ctx.fillStyle = '#08030f';
    ctx.fillRect(360, 120, 80, 40);
    // Draw staircase steps
    ctx.fillStyle = '#3a2d48';
    ctx.fillRect(365, 125, 70, 6);
    ctx.fillRect(370, 135, 60, 6);
    ctx.fillRect(375, 145, 50, 6);

    const wizardDefeated = isWizardDefeatedOnCurrentFloor();
    if (!wizardDefeated) {
        // Draw Magic Barrier block (pulsing shield in front of stairs)
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
}

// ═══════════════════════════════════════════════════════════
//  ENVIRONMENTAL DECORATIONS PER BOSS FLOOR
// ═══════════════════════════════════════════════════════════
function renderFloorDecorations(ctx, floor, frame) {
    const t = frame;
    ctx.save();

    switch (floor) {
        case 0: { // FLORA: 초록 숲의 제단 (Nature)
            // Central Druidic Altar Circle at (400, 240)
            ctx.save();
            ctx.translate(400, 240);
            ctx.rotate(t * 0.01);
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(57, 255, 20, 0.25)' : 'rgba(39, 174, 63, 0.2)';
                ctx.beginPath();
                ctx.ellipse(Math.cos(angle) * 55, Math.sin(angle) * 55, 8, 16, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // 4 Mossy Forest Pillars
            drawMossyPillar(ctx, 110, 200, t);
            drawMossyPillar(ctx, 690, 200, t);
            drawMossyPillar(ctx, 110, 510, t);
            drawMossyPillar(ctx, 690, 510, t);

            // Flower patches
            drawFlowerCluster(ctx, 180, 320, '#ff69b4');
            drawFlowerCluster(ctx, 620, 360, '#00ffff');
            drawFlowerCluster(ctx, 230, 480, '#ffd700');
            drawFlowerCluster(ctx, 570, 470, '#ff77aa');

            // Floating Fireflies
            for (let f = 0; f < 8; f++) {
                const fx = 120 + ((f * 83 + t * 0.8) % 560);
                const fy = 200 + Math.sin(t * 0.04 + f * 1.5) * 60 + (f % 3) * 60;
                const glow = Math.sin(t * 0.1 + f * 2) * 0.4 + 0.6;
                ctx.fillStyle = `rgba(57, 255, 20, ${glow})`;
                ctx.shadowColor = '#39ff14';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Wall Lanterns
            drawWallLantern(ctx, 120, 110, t, '#39ff14', 'vine');
            drawWallLantern(ctx, 680, 110, t, '#39ff14', 'vine');
            break;
        }

        case 1: { // GLACIUS: 얼어붙은 회랑 (Ice / Frost)
            // Central Frost Mandala at (400, 240)
            ctx.save();
            ctx.translate(400, 240);
            ctx.rotate(-t * 0.008);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * 70, Math.sin(angle) * 70);
                ctx.stroke();
                const mx = Math.cos(angle) * 45;
                const my = Math.sin(angle) * 45;
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(mx + Math.cos(angle + 0.8) * 12, my + Math.sin(angle + 0.8) * 12);
                ctx.moveTo(mx, my);
                ctx.lineTo(mx + Math.cos(angle - 0.8) * 12, my + Math.sin(angle - 0.8) * 12);
                ctx.stroke();
            }
            ctx.restore();

            // 4 Ice Crystal Pillars
            drawIcePillar(ctx, 110, 200, t);
            drawIcePillar(ctx, 690, 200, t);
            drawIcePillar(ctx, 110, 510, t);
            drawIcePillar(ctx, 690, 510, t);

            // Ground crystal clusters
            drawCrystalCluster(ctx, 180, 300, t);
            drawCrystalCluster(ctx, 620, 340, t + 10);
            drawCrystalCluster(ctx, 240, 490, t + 20);
            drawCrystalCluster(ctx, 560, 480, t + 30);

            // Drifting Snowflakes
            for (let s = 0; s < 14; s++) {
                const sx = (s * 67 + t * 0.9) % 640 + 80;
                const sy = 180 + ((s * 91 + t * 1.2) % 340);
                ctx.fillStyle = 'rgba(180, 245, 255, 0.75)';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Wall Lanterns
            drawWallLantern(ctx, 120, 110, t, '#00f0ff', 'ice');
            drawWallLantern(ctx, 680, 110, t, '#00f0ff', 'ice');
            break;
        }

        case 2: { // AERO: 뇌우의 나락 (Storm / Thunder)
            // Central Lightning Ring at (400, 240)
            ctx.save();
            ctx.translate(400, 240);
            ctx.rotate(t * 0.02);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3;
                ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
                ctx.lineTo(Math.cos(a + 0.15) * 72, Math.sin(a + 0.15) * 72);
                ctx.lineTo(Math.cos(a) * 68, Math.sin(a) * 68);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // 4 Tesla Conductor Pillars
            drawTeslaPillar(ctx, 110, 200, t);
            drawTeslaPillar(ctx, 690, 200, t);
            drawTeslaPillar(ctx, 110, 510, t);
            drawTeslaPillar(ctx, 690, 510, t);

            // Periodic lightning spark across room
            if (t % 50 < 8) {
                drawLightningArc(ctx, 110, 200, 690, 200, '#ffd700');
            }

            // Floating Static Sparks
            for (let sp = 0; sp < 12; sp++) {
                const spx = 100 + ((sp * 73 + t * 2.2) % 600);
                const spy = 180 + ((sp * 53 + Math.sin(t * 0.2 + sp) * 30) % 360);
                ctx.strokeStyle = sp % 2 === 0 ? '#ffffff' : '#ffd700';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(spx, spy);
                ctx.lineTo(spx + (Math.sin(sp + t * 0.1)) * 8, spy + (Math.cos(sp + t * 0.1)) * 8);
                ctx.stroke();
            }

            // Wall Lanterns
            drawWallLantern(ctx, 120, 110, t, '#ffd700', 'storm');
            drawWallLantern(ctx, 680, 110, t, '#ffd700', 'storm');
            break;
        }

        case 3: { // IGNIS: 불타는 용암굴 (Inferno / Molten)
            // Central Magma Altar at (400, 240)
            ctx.save();
            ctx.translate(400, 240);
            ctx.rotate(t * 0.006);
            ctx.strokeStyle = 'rgba(255, 69, 0, 0.6)';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            for (let i = 0; i < 12; i++) {
                const a = (i * Math.PI) / 6;
                const r = i % 2 === 0 ? 65 : 55;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 69, 0, 0.5)' : 'rgba(255, 170, 0, 0.6)';
                ctx.beginPath();
                ctx.moveTo(Math.cos(a - 0.1) * 45, Math.sin(a - 0.1) * 45);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                ctx.lineTo(Math.cos(a + 0.1) * 45, Math.sin(a + 0.1) * 45);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // 4 Molten Basalt Pillars
            drawMagmaPillar(ctx, 110, 200, t);
            drawMagmaPillar(ctx, 690, 200, t);
            drawMagmaPillar(ctx, 110, 510, t);
            drawMagmaPillar(ctx, 690, 510, t);

            // Glowing Lava Cracks
            drawLavaCrack(ctx, 160, 260, 260, 390, t);
            drawLavaCrack(ctx, 640, 250, 540, 400, t + 5);
            drawLavaCrack(ctx, 280, 480, 520, 500, t + 10);

            // Floating Ascending Embers
            for (let e = 0; e < 16; e++) {
                const ex = 90 + ((e * 47 + t * 0.4) % 620);
                const progress = (t * 0.02 + e * 0.25) % 1;
                const ey = 540 - progress * 360;
                const er = 2 + Math.sin(e) * 1.5;
                ctx.fillStyle = `rgba(255, ${Math.floor(100 + (1 - progress) * 155)}, 0, ${1 - progress})`;
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(ex, ey, er, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Wall Lanterns
            drawWallLantern(ctx, 120, 110, t, '#ff4500', 'fire');
            drawWallLantern(ctx, 680, 110, t, '#ff4500', 'fire');
            break;
        }

        case 4: { // MALAKAR: 공허의 중심부 (Void)
            // Central Void Altar at (400, 240)
            ctx.save();
            ctx.translate(400, 240);
            ctx.rotate(t * 0.012);
            ctx.strokeStyle = 'rgba(189, 0, 255, 0.6)';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#cc00ff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4;
                ctx.strokeStyle = 'rgba(204, 0, 255, 0.7)';
                ctx.lineWidth = 2;
                const rx = Math.cos(a) * 58;
                const ry = Math.sin(a) * 58;
                ctx.strokeRect(rx - 4, ry - 4, 8, 8);
            }
            ctx.fillStyle = '#060010';
            ctx.beginPath();
            ctx.arc(0, 0, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // 4 Monolithic Void Obelisks
            drawVoidObelisk(ctx, 110, 200, t);
            drawVoidObelisk(ctx, 690, 200, t);
            drawVoidObelisk(ctx, 110, 510, t);
            drawVoidObelisk(ctx, 690, 510, t);

            // Void Rift Cracks
            drawVoidRift(ctx, 170, 320, 250, 420, t);
            drawVoidRift(ctx, 630, 310, 550, 430, t + 10);

            // Orbiting Cosmic Soul Orbs
            for (let so = 0; so < 10; so++) {
                const angle = t * 0.03 + (so * Math.PI) / 5;
                const dist = 120 + Math.sin(t * 0.05 + so) * 35;
                const ox = 400 + Math.cos(angle) * dist * 1.8;
                const oy = 240 + Math.sin(angle) * dist * 0.9;
                if (ox > 70 && ox < 730 && oy > 170 && oy < 550) {
                    ctx.fillStyle = so % 2 === 0 ? 'rgba(204, 0, 255, 0.8)' : 'rgba(120, 0, 255, 0.6)';
                    ctx.shadowColor = '#cc00ff';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            // Wall Lanterns
            drawWallLantern(ctx, 120, 110, t, '#cc00ff', 'void');
            drawWallLantern(ctx, 680, 110, t, '#cc00ff', 'void');
            break;
        }
    }
    ctx.restore();
}

// ── Environmental Pillar & Object Helpers ──
function drawMossyPillar(ctx, x, y, t) {
    ctx.save();
    // Pillar stone
    ctx.fillStyle = '#1b3b24';
    ctx.fillRect(x - 14, y - 24, 28, 48);
    ctx.fillStyle = '#2d5e3a';
    ctx.fillRect(x - 16, y - 28, 32, 6);
    ctx.fillRect(x - 16, y + 22, 32, 6);
    // Creeping vines
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 22);
    ctx.quadraticCurveTo(x + 10, y, x - 10, y - 20);
    ctx.stroke();
    // Glowing mushroom
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x + 10, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawIcePillar(ctx, x, y, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 40, 65, 0.85)';
    ctx.fillRect(x - 14, y - 24, 28, 48);
    // Cyan crystal cap
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, y - 36);
    ctx.lineTo(x + 16, y - 24);
    ctx.lineTo(x - 16, y - 24);
    ctx.closePath();
    ctx.fill();
    // Hanging icicles
    ctx.strokeStyle = '#80f8ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 24);
    ctx.lineTo(x - 8, y + 34);
    ctx.moveTo(x + 6, y + 24);
    ctx.lineTo(x + 8, y + 36);
    ctx.stroke();
    ctx.restore();
}

function drawTeslaPillar(ctx, x, y, t) {
    ctx.save();
    // Metallic base
    ctx.fillStyle = '#3a3410';
    ctx.fillRect(x - 12, y - 20, 24, 44);
    // Brass coils
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    for (let c = -14; c <= 18; c += 8) {
        ctx.strokeRect(x - 14, y + c, 28, 4);
    }
    // Glowing Tesla sphere
    const glow = Math.sin(t * 0.15 + x) * 0.4 + 0.6;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 12 * glow;
    ctx.beginPath();
    ctx.arc(x, y - 28, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawMagmaPillar(ctx, x, y, t) {
    ctx.save();
    // Black obsidian
    ctx.fillStyle = '#1c0705';
    ctx.fillRect(x - 14, y - 24, 28, 48);
    // Glowing lava vein
    const pulse = Math.sin(t * 0.1 + y) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(255, 69, 0, ${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 20);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x - 4, y + 20);
    ctx.stroke();
    // Cap
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x - 16, y - 28, 32, 5);
    ctx.restore();
}

function drawVoidObelisk(ctx, x, y, t) {
    ctx.save();
    // Monolith
    ctx.fillStyle = '#0d021c';
    ctx.fillRect(x - 14, y - 26, 28, 52);
    ctx.strokeStyle = '#8a2be2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 14, y - 26, 28, 52);
    // Pulsing Eye Glyph
    const eyeOpen = Math.sin(t * 0.08 + x) * 0.4 + 0.6;
    ctx.fillStyle = '#cc00ff';
    ctx.shadowColor = '#cc00ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 5 * eyeOpen, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2.5 * eyeOpen, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawFlowerCluster(ctx, x, y, col) {
    ctx.save();
    for (let f = 0; f < 3; f++) {
        const ox = (f === 0 ? 0 : f === 1 ? -8 : 8);
        const oy = (f === 0 ? -4 : 4);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawCrystalCluster(ctx, x, y, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.strokeStyle = '#80f8ff';
    ctx.lineWidth = 1;
    for (let c = -1; c <= 1; c++) {
        const h = (c === 0 ? 16 : 10);
        ctx.beginPath();
        ctx.moveTo(x + c * 8, y);
        ctx.lineTo(x + c * 8 - 4, y - h);
        ctx.lineTo(x + c * 8 + 4, y - h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

function drawLavaCrack(ctx, x1, y1, x2, y2, t) {
    ctx.save();
    const glow = Math.sin(t * 0.1) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(255, 69, 0, ${glow})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const mx = (x1 + x2) / 2 + Math.sin(t * 0.05) * 10;
    const my = (y1 + y2) / 2;
    ctx.lineTo(mx, my);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function drawVoidRift(ctx, x1, y1, x2, y2, t) {
    ctx.save();
    const glow = Math.sin(t * 0.08) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(204, 0, 255, ${glow})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#cc00ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo((x1 + x2) / 2 - 8, (y1 + y2) / 2);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function drawLightningArc(ctx, x1, y1, x2, y2, col) {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const segs = 6;
    for (let i = 1; i < segs; i++) {
        const px = x1 + ((x2 - x1) * i) / segs;
        const py = y1 + ((y2 - y1) * i) / segs + (Math.random() - 0.5) * 20;
        ctx.lineTo(px, py);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function drawWallLantern(ctx, x, y, frame, glowColor, style) {
    ctx.save();
    ctx.fillStyle = '#3a2012';
    ctx.fillRect(x - 6, y, 12, 16);
    
    // Light bulb glow with flicker
    const flicker = Math.sin(frame * 0.2 + x) * 3 + (Math.random() * 2);
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12 + flicker;
    ctx.beginPath();
    ctx.arc(x, y + 22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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

// ═══════════════════════════════════════════════════════════
//  THEMATIC RHYTHM BOARD BACKGROUND ENGINE
//  Decorates the rhythm game stage with custom environmental
//  visuals according to each boss's elemental domain.
// ═══════════════════════════════════════════════════════════
function renderRhythmThematicBackground(ctx, floor, frame) {
    const W = canvas.width, H = canvas.height;
    const t = frame;
    ctx.save();

    switch (floor) {
        case 0: { // FLORA: 초록 숲 (Nature / Enchanted Forest)
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#020b05');
            bg.addColorStop(0.5, '#071f11');
            bg.addColorStop(1, '#020d06');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Left & Right Ancient Forest Trees
            drawForestSilhouette(ctx, 0, 0, 195, H, t, false);
            drawForestSilhouette(ctx, 605, 0, 195, H, t, true);

            // Rotating Druidic Nature Seal behind target line
            ctx.save();
            ctx.translate(400, targetLineY);
            ctx.rotate(t * 0.008);
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.22)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 110, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4;
                ctx.fillStyle = 'rgba(57, 255, 20, 0.1)';
                ctx.beginPath();
                ctx.ellipse(Math.cos(a) * 80, Math.sin(a) * 80, 10, 22, a, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Floating luminous leaves & pollen motes
            for (let i = 0; i < 18; i++) {
                const px = (i * 47 + t * 0.6) % W;
                const py = (i * 61 + t * 0.9) % H;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(57, 255, 20, 0.45)' : 'rgba(160, 255, 100, 0.35)';
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case 1: { // GLACIUS: 얼어붙은 회랑 (Ice / Polar Glacier)
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#010814');
            bg.addColorStop(0.5, '#07182c');
            bg.addColorStop(1, '#020b18');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Shimmering Aurora Borealis curtains
            for (let a = 0; a < 3; a++) {
                const ax = 150 + a * 240 + Math.sin(t * 0.02 + a) * 60;
                const aGrad = ctx.createRadialGradient(ax, 80, 0, ax, 80, 260);
                aGrad.addColorStop(0, a === 1 ? 'rgba(0, 240, 255, 0.22)' : 'rgba(0, 180, 255, 0.15)');
                aGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = aGrad;
                ctx.fillRect(0, 0, W, 250);
            }

            // Left & Right Ice Glacier Walls & Icicles
            drawGlacierSilhouette(ctx, 0, 0, 195, H, t, false);
            drawGlacierSilhouette(ctx, 605, 0, 195, H, t, true);

            // Frost Snowflake Seal behind target line
            ctx.save();
            ctx.translate(400, targetLineY);
            ctx.rotate(-t * 0.006);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * 95, Math.sin(a) * 95);
                ctx.stroke();
            }
            ctx.restore();

            // Falling gentle snowflakes
            for (let s = 0; s < 22; s++) {
                const sx = (s * 41 + t * 0.8) % W;
                const sy = (s * 59 + t * 1.4) % H;
                ctx.fillStyle = 'rgba(180, 245, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case 2: { // AERO: 뇌우의 나락 (Storm / Lightning Chasm)
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0c0a02');
            bg.addColorStop(0.5, '#1e1a06');
            bg.addColorStop(1, '#0e0b02');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Storm clouds and wind dust
            for (let c = 0; c < 5; c++) {
                const cx = (c * 170 + t * 1.2) % (W + 200) - 100;
                const cy = 60 + (c * 75) % 300;
                ctx.fillStyle = 'rgba(255, 215, 0, 0.06)';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 120, 35, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Left & Right Tesla Conductor Towers
            drawTeslaTowerSilhouette(ctx, 25, H, t, false);
            drawTeslaTowerSilhouette(ctx, 775, H, t, true);

            // Occasional lightning strike across background
            if (t % 40 < 5) {
                const strikeX = 140 + (t % 4) * 160;
                ctx.strokeStyle = 'rgba(255, 255, 150, 0.5)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(strikeX, 0);
                ctx.lineTo(strikeX + 20, 180);
                ctx.lineTo(strikeX - 15, 340);
                ctx.lineTo(strikeX + 10, H);
                ctx.stroke();
            }

            // Rotating Storm Chevron Seal behind target line
            ctx.save();
            ctx.translate(400, targetLineY);
            ctx.rotate(t * 0.02);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.22)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 95, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Flying static spark motes
            for (let sp = 0; sp < 16; sp++) {
                const spx = (sp * 51 + t * 2.5) % W;
                const spy = (sp * 79 + Math.sin(t * 0.1 + sp) * 40) % H;
                ctx.fillStyle = sp % 2 === 0 ? '#ffd700' : '#ffffff';
                ctx.fillRect(spx, spy, 2, 2);
            }
            break;
        }

        case 3: { // IGNIS: 불타는 용암굴 (Inferno / Molten Core)
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#140202');
            bg.addColorStop(0.5, '#2b0606');
            bg.addColorStop(1, '#160202');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Left & Right Molten Lava Falls
            drawLavaFall(ctx, 0, 0, 195, H, t, false);
            drawLavaFall(ctx, 605, 0, 195, H, t, true);

            // Rotating Sunburst Magma Seal behind target line
            ctx.save();
            ctx.translate(400, targetLineY);
            ctx.rotate(t * 0.007);
            ctx.strokeStyle = 'rgba(255, 69, 0, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 95, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 12; i++) {
                const a = (i * Math.PI) / 6;
                ctx.fillStyle = 'rgba(255, 69, 0, 0.15)';
                ctx.beginPath();
                ctx.moveTo(Math.cos(a - 0.1) * 60, Math.sin(a - 0.1) * 60);
                ctx.lineTo(Math.cos(a) * 85, Math.sin(a) * 85);
                ctx.lineTo(Math.cos(a + 0.1) * 60, Math.sin(a + 0.1) * 60);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // Rising fire embers
            for (let e = 0; e < 24; e++) {
                const ex = (e * 37 + t * 0.5) % W;
                const ep = ((t * 0.02 + e * 0.15) % 1);
                const ey = H - ep * H;
                ctx.fillStyle = `rgba(255, ${Math.floor(80 + (1 - ep) * 175)}, 0, ${0.8 - ep * 0.6})`;
                ctx.beginPath();
                ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case 4: { // MALAKAR: 공허의 중심부 (Void / Cosmic Core)
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#04000c');
            bg.addColorStop(0.5, '#120022');
            bg.addColorStop(1, '#050010');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Giant Cosmic Spiral Galaxy in Center
            ctx.save();
            ctx.translate(400, 240);
            ctx.rotate(t * 0.003);
            for (let g = 0; g < 4; g++) {
                const gAngle = (g * Math.PI) / 2;
                ctx.strokeStyle = g % 2 === 0 ? 'rgba(204, 0, 255, 0.12)' : 'rgba(138, 43, 226, 0.1)';
                ctx.lineWidth = 14;
                ctx.beginPath();
                for (let r = 20; r < 280; r += 10) {
                    const theta = gAngle + r * 0.02;
                    const gx = Math.cos(theta) * r;
                    const gy = Math.sin(theta) * r * 0.6;
                    r === 20 ? ctx.moveTo(gx, gy) : ctx.lineTo(gx, gy);
                }
                ctx.stroke();
            }
            ctx.restore();

            // Left & Right Void Monolith Pillars & Tendrils
            drawVoidRhythmBorder(ctx, 0, 0, 195, H, t, false);
            drawVoidRhythmBorder(ctx, 605, 0, 195, H, t, true);

            // Rotating Void Singularity Seal behind target line
            ctx.save();
            ctx.translate(400, targetLineY);
            ctx.rotate(t * 0.01);
            ctx.strokeStyle = 'rgba(204, 0, 255, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 95, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4;
                const rx = Math.cos(a) * 75;
                const ry = Math.sin(a) * 75;
                ctx.strokeRect(rx - 4, ry - 4, 8, 8);
            }
            ctx.restore();

            // Orbiting Cosmic Soul Wisps
            for (let sw = 0; sw < 18; sw++) {
                const swx = (sw * 43 + t * 0.8) % W;
                const swy = (sw * 67 + Math.sin(t * 0.05 + sw) * 30) % H;
                ctx.fillStyle = sw % 2 === 0 ? 'rgba(204, 0, 255, 0.6)' : 'rgba(100, 200, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(swx, swy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
    }
    ctx.restore();
}

// Helper Silhouette Renderers for Rhythm Board Margins
function drawForestSilhouette(ctx, x, y, w, h, t, flip) {
    ctx.save();
    ctx.fillStyle = '#06170d';
    ctx.beginPath();
    if (!flip) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w * 0.7, y);
        ctx.quadraticCurveTo(x + w, y + h * 0.4, x + w * 0.5, y + h * 0.7);
        ctx.lineTo(x + w * 0.8, y + h);
        ctx.lineTo(x, y + h);
    } else {
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w * 0.3, y);
        ctx.quadraticCurveTo(x, y + h * 0.4, x + w * 0.5, y + h * 0.7);
        ctx.lineTo(x + w * 0.2, y + h);
        ctx.lineTo(x + w, y + h);
    }
    ctx.closePath();
    ctx.fill();

    // Creeping glowing ivy lines
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const bx = flip ? x + w * 0.4 : x + w * 0.6;
    ctx.moveTo(bx, y + 50);
    ctx.quadraticCurveTo(bx + (flip ? -20 : 20), y + 250, bx, y + h - 50);
    ctx.stroke();
    ctx.restore();
}

function drawGlacierSilhouette(ctx, x, y, w, h, t, flip) {
    ctx.save();
    ctx.fillStyle = '#061524';
    ctx.beginPath();
    if (!flip) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w * 0.8, y);
        ctx.lineTo(x + w * 0.5, y + 160);
        ctx.lineTo(x + w * 0.75, y + 320);
        ctx.lineTo(x + w * 0.4, y + h);
        ctx.lineTo(x, y + h);
    } else {
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w * 0.2, y);
        ctx.lineTo(x + w * 0.5, y + 160);
        ctx.lineTo(x + w * 0.25, y + 320);
        ctx.lineTo(x + w * 0.6, y + h);
        ctx.lineTo(x + w, y + h);
    }
    ctx.closePath();
    ctx.fill();

    // Ice crystal highlights
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5;
    const ix = flip ? x + w * 0.35 : x + w * 0.65;
    ctx.beginPath();
    ctx.moveTo(ix, y + 80);
    ctx.lineTo(ix, y + 200);
    ctx.moveTo(ix + (flip ? 15 : -15), y + 240);
    ctx.lineTo(ix + (flip ? 15 : -15), y + 420);
    ctx.stroke();
    ctx.restore();
}

function drawTeslaTowerSilhouette(ctx, x, h, t, flip) {
    ctx.save();
    ctx.fillStyle = '#221a05';
    ctx.fillRect(x - 12, 80, 24, h - 80);
    // Brass coils
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    for (let c = 120; c < h - 80; c += 40) {
        ctx.strokeRect(x - 16, c, 32, 6);
    }
    // Tesla top sphere
    const glow = Math.sin(t * 0.15 + (flip ? 2 : 0)) * 0.4 + 0.6;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 14 * glow;
    ctx.beginPath();
    ctx.arc(x, 70, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawLavaFall(ctx, x, y, w, h, t, flip) {
    ctx.save();
    // Obsidian wall
    ctx.fillStyle = '#160404';
    ctx.fillRect(x, y, w, h);

    // Cascading lava streams
    const lx = flip ? x + 40 : x + w - 40;
    const lGrad = ctx.createLinearGradient(0, 0, 0, h);
    lGrad.addColorStop(0, '#ff4500');
    lGrad.addColorStop(0.5, '#ffaa00');
    lGrad.addColorStop(1, '#cc2200');
    ctx.fillStyle = lGrad;
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 12;

    for (let s = -1; s <= 1; s++) {
        const streamX = lx + s * 18;
        const wave = Math.sin(t * 0.08 + s) * 6;
        ctx.beginPath();
        ctx.moveTo(streamX - 6 + wave, 0);
        ctx.lineTo(streamX + 6 + wave, 0);
        ctx.lineTo(streamX + 6 - wave, h);
        ctx.lineTo(streamX - 6 - wave, h);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function drawVoidRhythmBorder(ctx, x, y, w, h, t, flip) {
    ctx.save();
    // Dark void monolith
    ctx.fillStyle = '#080114';
    ctx.fillRect(x, y, w, h);

    // Occult eye markings
    const ox = flip ? x + 50 : x + w - 50;
    for (let oy = 120; oy < h - 80; oy += 140) {
        const open = Math.sin(t * 0.06 + oy) * 0.4 + 0.6;
        ctx.strokeStyle = '#cc00ff';
        ctx.shadowColor = '#cc00ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(ox, oy, 14, 8 * open, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(ox, oy, 3.5 * open, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Draw procedural Rhythm Combat Mode Board
function renderRhythmBoard() {
    // 1. Render Thematic Environmental Background per Floor
    const elapsedSec = getSongSecondsElapsed();
    if (hiddenFight) renderHiddenArena(elapsedSec);
    else {
        renderRhythmThematicBackground(ctx, currentFloor, player.animFrame);
        
        // Draw title/song metadata at the top with glowing banner
        const songName = activeSongData?.name || "Rhythm Battle";
        const songComposer = activeSongData?.composer || "Magical Melody";
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(160, 15, 480, 65);
        ctx.strokeStyle = FLOOR_THEMES[currentFloor].border;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(160, 15, 480, 65);

        ctx.textAlign = 'center';
        ctx.font = '24px "VT323"';
        ctx.fillStyle = '#fff';
        ctx.fillText(`현재 곡: ${songName}`, 400, 42);
        ctx.font = '15px "Press Start 2P"';
        ctx.fillStyle = varColor('--neon-yellow');
        ctx.fillText(`COMPOSER: ${songComposer}`, 400, 68);
        ctx.restore();

    }

    ctx.textAlign = 'center';
    // Render the 4 columns for notes
    const startX = 210;
    const laneWidth = 80;
    const laneGap = 20;

    for (let i = 0; i < 4; i++) {
        const lx = startX + i * (laneWidth + laneGap);
        
        // Draw column backing (semi-transparent obsidian glass)
        ctx.fillStyle = hiddenFight ? 'rgba(9, 18, 25, .38)' : 'rgba(8, 21, 24, .86)';
        ctx.fillRect(lx, 0, laneWidth, canvas.height);
        
        // Draw column borders with themed highlight
        ctx.strokeStyle = pressedLanes[i] ? '#ffffff' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = pressedLanes[i] ? 2.5 : 1.5;
        ctx.strokeRect(lx, 0, laneWidth, canvas.height);

        // Draw receptor on target line
        ctx.save();
        if (pressedLanes[i]) {
            // Glow receptor when pressed
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(lx, targetLineY - 10, laneWidth, 20);
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 12;
            ctx.strokeRect(lx, targetLineY - 10, laneWidth, 20);
        } else {
            // Standby receptor
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(lx, targetLineY - 10, laneWidth, 20);
        }
        ctx.restore();

        // Draw Lane label letter (D, F, J, K) at the bottom
        ctx.fillStyle = pressedLanes[i] ? '#ffffff' : '#9ca3af';
        ctx.font = '18px "Press Start 2P"';
        ctx.fillText(LANE_KEY_LABELS[i], lx + laneWidth/2, targetLineY + 45);
    }

    // Draw Target cross line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(180, targetLineY);
    ctx.lineTo(620, targetLineY);
    ctx.stroke();

    // Render active falling notes
    
    for (let i = 0; i < gameNotes.length; i++) {
        const note = gameNotes[i];
        if (note.hit === true || note.hit === 'miss') continue;
        
        // Calculate note Y position based on song time sync
        const timeDiff = note.targetTime - elapsedSec;
        const noteY = targetLineY - timeDiff * (hiddenFight ? 410 : scrollSpeed);
        
        // Only render if visible on screen
        if (noteY > (hiddenFight ? 195 : -50) && noteY < canvas.height + 50) {
            let lx = startX + note.lane * (laneWidth + laneGap);
            if (hiddenFight) {
                lx += hiddenNoteOffset(noteY, note.lane);
                renderHiddenNoteTrail(lx + laneWidth / 2, noteY);
            }
            
            ctx.save();
            ctx.fillStyle = LANE_COLORS[note.lane];
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 6;
            
            // Draw note capsule rounded rectangle
            ctx.beginPath();
            ctx.roundRect(lx + 4, noteY - 14, laneWidth - 8, 28, 7);
            ctx.fill();
            
            // Highlight inner line
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(lx + 10, noteY - 6, laneWidth - 20, 12, 3);
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
    if (hiddenFight) renderHiddenHud(elapsedSec);
    else renderRhythmHUD();
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
    ctx.fillText(`HP ${life}/${maxLife}`, 60, 145);
    
    // Background track
    ctx.fillStyle = '#1a001a';
    ctx.fillRect(60, 154, 120, 14);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 154, 120, 14);
    
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
    ctx.fillRect(61, 155, 118 * lifeRatio, 12);
    ctx.shadowBlur = 0;

    const totalNotes = activeSongData?.rhythmNotesCount ?? 0;
    const judgedNotes = ratingCounts.perfect + ratingCounts.great + ratingCounts.good + ratingCounts.miss;
    const remainingNotes = Math.max(0, totalNotes - judgedNotes);
    ctx.font = '18px "VT323"';
    ctx.fillStyle = '#fff';
    ctx.fillText(`남은 노트 ${remainingNotes}/${totalNotes}`, 60, 190, 140);
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

// ═══════════════════════════════════════════════════════════
//  EPIC STORY VICTORY & CLIFFHANGER EPILOGUE
//  Phase 0: Awakening of Ancient Memories (Hero's sealed truth)
//  Phase 1: Complete Restoration (The True Hero revealed)
//  Phase 2: The New Nemesis (Hero's back view confronting colossal threat)
// ═══════════════════════════════════════════════════════════
function renderRunResults() {
    const totals = { perfect: 0, great: 0, good: 0, miss: 0 };
    for (const floorRatings of clearedFloorRatings) {
        if (!floorRatings) continue;
        for (const rating of Object.keys(totals)) totals[rating] += floorRatings[rating];
    }
    const { perfect, great, good, miss } = totals;
    const judged = perfect + great + good + miss;
    const accuracy = judged ? (perfect * 100 + great * 80 + good * 50) / judged : 0;
    const center = canvas.width / 2;

    ctx.save();
    ctx.fillStyle = '#04010a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#101024';
    ctx.fillRect(108, 74, 584, 438);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(108, 74, 584, 438);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = '24px "Press Start 2P"';
    ctx.fillText('ALL CLEAR', center, 132);
    ctx.fillStyle = '#00f0ff';
    ctx.font = '30px "VT323", sans-serif';
    ctx.fillText(`정확도 ${accuracy.toFixed(1)}%`, center, 198);

    ctx.textAlign = 'left';
    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`PERFECT  ${perfect}`, 168, 278);
    ctx.fillStyle = '#39ff14';
    ctx.fillText(`GREAT  ${great}`, 440, 278);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`GOOD     ${good}`, 168, 332);
    ctx.fillStyle = '#ff779d';
    ctx.fillText(`MISS   ${miss}`, 440, 332);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '21px "VT323", sans-serif';
    ctx.fillText(`클리어한 전투에서 판정된 노트 ${judged}개 기준`, center, 414);
    ctx.fillStyle = '#fff';
    ctx.fillText('SPACE ▶ 엔딩 보기', center, 478);
    ctx.restore();
}

function renderVictoryScreen() {
    if (victoryPhase === VICTORY_RESULTS) {
        renderRunResults();
        return;
    }
    const W = canvas.width, H = canvas.height;
    const t = victoryTimer;
    const anim = player.animFrame;

    ctx.save();

    if (victoryPhase === 0) {
        // ──────────────────────────────────────────────────────────
        // PHASE 0: 기억의 각성 (Awakening of Memories)
        // ──────────────────────────────────────────────────────────
        ctx.fillStyle = '#04010a';
        ctx.fillRect(0, 0, W, H);

        // Pulsing divine sunburst behind hero
        ctx.save();
        ctx.translate(400, 185);
        ctx.rotate(anim * 0.01);
        for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI) / 8;
            ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 240, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 160, Math.sin(angle) * 160);
            ctx.stroke();
        }
        ctx.restore();

        // All 5 body parts glowing and converging
        const fullLimbs = { torso: true, lleg: true, rleg: true, larm: true, rarm: true, head: true };
        drawPlayer(ctx, 400, 180, fullLimbs, true, anim);

        // Holy aura particles
        for (let p = 0; p < 16; p++) {
            const pAngle = anim * 0.05 + p * 0.4;
            const pDist = 45 + Math.sin(anim * 0.1 + p) * 20;
            const px = 400 + Math.cos(pAngle) * pDist;
            const py = 180 + Math.sin(pAngle) * pDist * 0.8;
            ctx.fillStyle = p % 2 === 0 ? '#ffd700' : '#00f0ff';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Title
        ctx.textAlign = 'center';
        ctx.font = '22px "Press Start 2P"';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.fillText("✦ 기억의 각성 : 봉인의 진실 ✦", 400, 310);
        ctx.shadowBlur = 0;

        // Dialogue Story Box (Condensed & High Impact)
        ctx.fillStyle = 'rgba(6, 2, 14, 0.9)';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.fillRect(100, 345, 600, 150);
        ctx.strokeRect(100, 345, 600, 150);

        ctx.font = '24px "VT323"';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText("모든 사지가 하나로 이어지며, 봉인되었던 기억이 깨어난다.", 400, 385);
        ctx.fillStyle = '#ffd700';
        ctx.fillText("당신은 과거 세계를 구원했던 [전설의 용사].", 400, 420);
        ctx.fillStyle = '#ff99bb';
        ctx.fillText("마법사들은 용사의 압도적인 힘을 두려워해 사지를 봉인했던 것이다!", 400, 455);

        // Prompt
        if (Math.floor(Date.now() / 450) % 2 === 0) {
            ctx.font = '14px "Press Start 2P"';
            ctx.fillStyle = '#39ff14';
            ctx.fillText("PRESS SPACE ▶ 진정한 모습으로", 400, 545);
        }
    }
    else if (victoryPhase === 1) {
        // ──────────────────────────────────────────────────────────
        // PHASE 1: 완전한 부활 (The True Hero Restored)
        // ──────────────────────────────────────────────────────────
        ctx.fillStyle = '#050212';
        ctx.fillRect(0, 0, W, H);

        // Radiant halo
        const haloGrad = ctx.createRadialGradient(400, 180, 0, 400, 180, 230);
        haloGrad.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
        haloGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.15)');
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloGrad;
        ctx.fillRect(0, 0, W, H);

        // 5 Elemental Orbs hovering around the Hero in obedience
        const orbs = [
            { col: '#39ff14', name: '자연' },
            { col: '#00f0ff', name: '냉기' },
            { col: '#ffd700', name: '뇌우' },
            { col: '#ff4400', name: '화염' },
            { col: '#cc00ff', name: '공허' }
        ];
        for (let i = 0; i < 5; i++) {
            const angle = anim * 0.04 + (i * Math.PI * 2) / 5;
            const ox = 400 + Math.cos(angle) * 115;
            const oy = 180 + Math.sin(angle) * 45;
            ctx.fillStyle = orbs[i].col;
            ctx.shadowColor = orbs[i].col;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(ox, oy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw Transformed Hero (Front View with Cape and Holy Blade)
        drawHeroTransformed(ctx, 400, 180, anim);

        // Title
        ctx.textAlign = 'center';
        ctx.font = '22px "Press Start 2P"';
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 12;
        ctx.fillText("✦ 전 설 의  용 사  부 활 ✦", 400, 310);
        ctx.shadowBlur = 0;

        // Dialogue Box (Condensed & Dramatic)
        ctx.fillStyle = 'rgba(6, 2, 14, 0.9)';
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2;
        ctx.fillRect(100, 345, 600, 150);
        ctx.strokeRect(100, 345, 600, 150);

        ctx.font = '24px "VT323"';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText("마침내 성검 아르카디아와 완전한 힘을 되찾은 용사.", 400, 385);
        ctx.fillStyle = '#ffaa00';
        ctx.fillText("그러나 마법사들의 봉인은 단순한 두려움 때문만은 아니었다...", 400, 420);
        ctx.fillStyle = '#ff5577';
        ctx.fillText("탑 너머... 세계를 집어삼키려는 '태초의 심연'이 눈을 떴다!", 400, 455);

        // Prompt
        if (Math.floor(Date.now() / 450) % 2 === 0) {
            ctx.font = '14px "Press Start 2P"';
            ctx.fillStyle = '#00f0ff';
            ctx.fillText("PRESS SPACE ▶ 탑 정상 너머로", 400, 545);
        }
    }
    else {
        // ──────────────────────────────────────────────────────────
        // PHASE 2: 새로운 시작 — 엄청난 적 앞에 선 용사의 뒷모습
        // ──────────────────────────────────────────────────────────
        renderColossalNemesisScene(ctx, W, H, anim);
    }

    ctx.restore();
}

// Draw the Front-facing Transformed True Hero (for Phase 1) - Grand & Imposing
function drawHeroTransformed(ctx, x, y, anim) {
    ctx.save();
    const bob = Math.sin(anim * 0.1) * 3;
    const hy = y + bob;

    // 1. Grand Royal Crimson Cape with Gold Lining
    const capeSwing = Math.sin(anim * 0.12) * 8;
    ctx.fillStyle = '#990d25';
    ctx.beginPath();
    ctx.moveTo(x - 18, hy - 6);
    ctx.lineTo(x + 18, hy - 6);
    ctx.lineTo(x + 30 + capeSwing, hy + 42);
    ctx.lineTo(x - 30 + capeSwing, hy + 42);
    ctx.closePath();
    ctx.fill();

    // Cape inner gold border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 30 + capeSwing, hy + 42);
    ctx.lineTo(x + 30 + capeSwing, hy + 42);
    ctx.stroke();

    // 2. Full Plate Silver-Platinum Knight Armor
    ctx.fillStyle = '#dbe5f2';
    ctx.fillRect(x - 12, hy - 10, 24, 28);
    // Dark steel shading lines
    ctx.fillStyle = '#9cb0cb';
    ctx.fillRect(x - 12, hy - 10, 3, 28);
    ctx.fillRect(x + 9, hy - 10, 3, 28);

    // Golden Chest Crest & Runic Gem
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x, hy - 6);
    ctx.lineTo(x + 8, hy + 3);
    ctx.lineTo(x, hy + 13);
    ctx.lineTo(x - 8, hy + 3);
    ctx.closePath();
    ctx.fill();
    // Glowing Turquoise Soul Stone
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, hy + 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Winged Golden Pauldrons (Large layered shoulder armor)
    for (let s = -1; s <= 1; s += 2) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x + s * 14 - (s === 1 ? 0 : 9), hy - 12, 9, 14);
        ctx.fillStyle = '#fff080';
        ctx.fillRect(x + s * 14 - (s === 1 ? 0 : 7), hy - 14, 7, 4);
    }

    // Legs & Golden Greaves
    ctx.fillStyle = '#2f3b4d';
    ctx.fillRect(x - 10, hy + 18, 8, 16);
    ctx.fillRect(x + 2, hy + 18, 8, 16);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x - 11, hy + 28, 9, 7);
    ctx.fillRect(x + 2, hy + 28, 9, 7);

    // Hero Helmet & Crown Plume
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(x - 9, hy - 26, 18, 16);
    // Golden Tiara Crown with Wing Crests
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x - 11, hy - 29, 22, 5);
    // Wing tips
    ctx.beginPath();
    ctx.moveTo(x - 11, hy - 29); ctx.lineTo(x - 17, hy - 38); ctx.lineTo(x - 9, hy - 32); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 11, hy - 29); ctx.lineTo(x + 17, hy - 38); ctx.lineTo(x + 9, hy - 32); ctx.fill();
    // Center gem
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(x - 3, hy - 35, 6, 6);

    // Glowing Cyan Eyes
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(x - 6, hy - 20, 3, 3);
    ctx.fillRect(x + 3, hy - 20, 3, 3);
    ctx.shadowBlur = 0;

    // 3. Legendary Holy Rhythm Sword ("성검 아르카디아")
    ctx.save();
    ctx.translate(x + 20, hy + 2);
    ctx.rotate(0.18);
    // Golden Winged Crossguard
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-3, 2, 6, 10); // grip
    ctx.beginPath();
    ctx.moveTo(-10, 2); ctx.lineTo(10, 2); ctx.lineTo(14, -2); ctx.lineTo(-14, -2); ctx.fill(); // guard
    // Pommel jewel
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath(); ctx.arc(0, 14, 3, 0, Math.PI * 2); ctx.fill();

    // Broad Runic Blade with Cyan Glow
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.fillRect(-3, -38, 6, 36);
    // Sword tip
    ctx.beginPath();
    ctx.moveTo(-3, -38);
    ctx.lineTo(0, -46);
    ctx.lineTo(3, -38);
    ctx.fill();

    // Inscribed Rhythm Runes along the blade
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.fillRect(-1, -12, 2, 3);
    ctx.fillRect(-1, -22, 2, 3);
    ctx.fillRect(-1, -32, 2, 3);
    ctx.restore();

    ctx.restore();
}

// ═══════════════════════════════════════════════════════════
//  THE COLOSSAL NEMESIS CLIFFHANGER (Phase 2)
//  Shows the back view of the Hero standing on a precipice
//  gazing into the abyss at an overwhelmingly powerful titan!
// ═══════════════════════════════════════════════════════════
function renderColossalNemesisScene(ctx, W, H, anim, battle = false) {
    // 1. Apocalyptic Sky — Fractured Cosmic Vortex
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#1a0006');
    skyGrad.addColorStop(0.3, '#320215');
    skyGrad.addColorStop(0.65, '#160228');
    skyGrad.addColorStop(1, '#050010');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Dimensional Reality Tears (Swirling vortex nebula)
    ctx.save();
    ctx.translate(W / 2, 170);
    ctx.rotate(anim * 0.004);
    for (let r = 0; r < 5; r++) {
        const rad = 140 + r * 45;
        ctx.strokeStyle = r % 2 === 0 ? 'rgba(255, 0, 85, 0.18)' : 'rgba(189, 0, 255, 0.18)';
        ctx.lineWidth = 3 + r;
        ctx.beginPath();
        ctx.arc(0, 0, rad, Math.PI * 0.1, Math.PI * 1.6);
        ctx.stroke();
    }
    ctx.restore();

    // Apocalyptic lightning across shattered clouds
    if (anim % 45 < 6) {
        const lx = 200 + (anim % 3) * 200;
        ctx.strokeStyle = 'rgba(255, 60, 100, 0.85)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(lx, 20);
        ctx.lineTo(lx - 25, 110);
        ctx.lineTo(lx + 20, 180);
        ctx.lineTo(lx - 10, 260);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Floating shattered celestial islands in distance
    for (let i = 0; i < 4; i++) {
        const ix = 120 + i * 180 + Math.sin(anim * 0.02 + i) * 12;
        const iy = 150 + Math.sin(i * 2 + anim * 0.015) * 18;
        ctx.fillStyle = '#0f051c';
        ctx.strokeStyle = 'rgba(138, 43, 226, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix - 30, iy);
        ctx.lineTo(ix + 30, iy);
        ctx.lineTo(ix + 15, iy + 18);
        ctx.lineTo(ix - 15, iy + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // ──────────────────────────────────────────────────────────
    // 2. THE COLOSSAL ADVERSARY (엄청나게 강해보이는 태초의 심연신)
    // ──────────────────────────────────────────────────────────
    const titanX = W / 2;
    const titanY = 170;
    const titanBreathing = Math.sin(anim * 0.04) * 6;

    ctx.save();

    if (battle) {
        ctx.translate(titanX, 195);
        ctx.scale(1.22, 1.27);
        ctx.translate(-titanX, -195);
    }

    // Colossal Wings of Void & Dark Matter (Spanning whole screen)
    for (let w = -1; w <= 1; w += 2) {
        ctx.save();
        ctx.translate(titanX, titanY);
        ctx.scale(w, 1);
        const wingFlap = Math.sin(anim * 0.03) * 0.05;
        ctx.rotate(wingFlap);

        // Outer cosmic wing silhouette
        const wingGrad = ctx.createLinearGradient(0, -60, 340, 40);
        wingGrad.addColorStop(0, '#0e011a');
        wingGrad.addColorStop(0.7, '#1b0028');
        wingGrad.addColorStop(1, 'rgba(255, 0, 85, 0.2)');
        ctx.fillStyle = wingGrad;

        ctx.beginPath();
        ctx.moveTo(25, -20);
        ctx.bezierCurveTo(120, -140, 260, -110, 360, -40); // Top tip
        ctx.bezierCurveTo(310, 20, 260, 70, 220, 110);
        ctx.bezierCurveTo(170, 70, 120, 50, 40, 40);
        ctx.closePath();
        ctx.fill();

        // Glowing wing feather spine ribs
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, -10);
        ctx.lineTo(330, -35);
        ctx.moveTo(30, 0);
        ctx.lineTo(210, 100);
        ctx.stroke();
        ctx.restore();
    }

    // Colossal Shadow Torso & Shoulders
    const titanBodyGrad = ctx.createLinearGradient(titanX, titanY - 140, titanX, titanY + 140);
    titanBodyGrad.addColorStop(0, '#0a0014');
    titanBodyGrad.addColorStop(0.5, '#05000c');
    titanBodyGrad.addColorStop(1, '#000000');
    ctx.fillStyle = titanBodyGrad;

    ctx.beginPath();
    ctx.moveTo(titanX - 90, titanY + 120);
    ctx.lineTo(titanX - 110, titanY);
    ctx.lineTo(titanX - 50, titanY - 90);
    ctx.lineTo(titanX + 50, titanY - 90);
    ctx.lineTo(titanX + 110, titanY);
    ctx.lineTo(titanX + 90, titanY + 120);
    ctx.closePath();
    ctx.fill();

    // Colossal Demonic Horns / Spire Crown Piercing Clouds
    ctx.fillStyle = '#0d0018';
    ctx.strokeStyle = 'rgba(255, 0, 91, 0.7)';
    ctx.lineWidth = 2.5;

    // Left Horn
    ctx.beginPath();
    ctx.moveTo(titanX - 35, titanY - 80);
    ctx.quadraticCurveTo(titanX - 90, titanY - 140, titanX - 130, titanY - 165 + titanBreathing);
    ctx.quadraticCurveTo(titanX - 70, titanY - 115, titanX - 15, titanY - 85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(titanX + 35, titanY - 80);
    ctx.quadraticCurveTo(titanX + 90, titanY - 140, titanX + 130, titanY - 165 + titanBreathing);
    ctx.quadraticCurveTo(titanX + 70, titanY - 115, titanX + 15, titanY - 85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center Horn Spire
    ctx.beginPath();
    ctx.moveTo(titanX - 18, titanY - 85);
    ctx.lineTo(titanX, titanY - 155 + titanBreathing);
    ctx.lineTo(titanX + 18, titanY - 85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (battle) drawHiddenBossArmor(ctx, titanX, titanY, anim);

    // Pulsing Gravity Accretion Vortex in Chest
    ctx.save();
    ctx.translate(titanX, titanY + 25);
    ctx.rotate(anim * 0.02);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Piercing Eldritch Eyes Gaze (6 menacing glowing eyes staring down)
    const eyeFlicker = Math.sin(anim * 0.15) * 0.2 + 0.8;
    // Main Dominant Crimson Eyes
    ctx.fillStyle = '#ff0044';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 18 * eyeFlicker;
    ctx.beginPath();
    ctx.ellipse(titanX - 26, titanY - 45, 9, 4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(titanX + 26, titanY - 45, 9, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner Void Violet Eyes
    ctx.fillStyle = '#cc00ff';
    ctx.shadowColor = '#cc00ff';
    ctx.beginPath();
    ctx.ellipse(titanX - 14, titanY - 58, 6, 3, -0.1, 0, Math.PI * 2);
    ctx.ellipse(titanX + 14, titanY - 58, 6, 3, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Forehead Godly Third Eye
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 24 * eyeFlicker;
    ctx.beginPath();
    ctx.ellipse(titanX, titanY - 72, 7, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(titanX, titanY - 72, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ──────────────────────────────────────────────────────────
    // 3. CLIFF PRECIPICE (전장의 절벽)
    // ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#090412';
    ctx.strokeStyle = '#2b1040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(220, H);
    ctx.lineTo(260, 480);
    ctx.lineTo(320, 465);
    ctx.lineTo(400, 460); // Cliff edge where Hero stands
    ctx.lineTo(480, 465);
    ctx.lineTo(540, 480);
    ctx.lineTo(580, H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crag highlights
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.25)';
    ctx.beginPath();
    ctx.moveTo(260, 480); ctx.lineTo(340, 490);
    ctx.moveTo(460, 490); ctx.lineTo(540, 480);
    ctx.stroke();

    // ──────────────────────────────────────────────────────────
    // 4. THE HERO SEEN FROM BEHIND (주인공의 결연한 뒷모습 - UPGRADED)
    // ──────────────────────────────────────────────────────────
    if (battle) return;
    const heroX = 400;
    const heroY = 438;
    const heroAnim = anim;

    ctx.save();

    // Divine ground highlight cast by the Holy Blade
    const groundGlow = ctx.createRadialGradient(heroX + 25, heroY + 28, 5, heroX + 25, heroY + 28, 50);
    groundGlow.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    groundGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
    groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = groundGlow;
    ctx.fillRect(heroX - 25, heroY + 5, 85, 50);

    // Multi-layered Majestic Crimson Mantle Billowing in Storm Gale
    const capeFlutter1 = Math.sin(heroAnim * 0.15) * 16;
    const capeFlutter2 = Math.cos(heroAnim * 0.18) * 12;

    // Dark under-cape layer
    ctx.fillStyle = '#550514';
    ctx.beginPath();
    ctx.moveTo(heroX - 18, heroY - 14);
    ctx.lineTo(heroX + 18, heroY - 14);
    ctx.quadraticCurveTo(heroX + 35 + capeFlutter1, heroY + 18, heroX + 48 + capeFlutter1 * 1.2, heroY + 46);
    ctx.lineTo(heroX - 25 + capeFlutter2 * 0.5, heroY + 44);
    ctx.closePath();
    ctx.fill();

    // Main brilliant crimson cape
    const capeGrad = ctx.createLinearGradient(heroX, heroY - 15, heroX + 40, heroY + 45);
    capeGrad.addColorStop(0, '#f01e48');
    capeGrad.addColorStop(0.5, '#b81232');
    capeGrad.addColorStop(1, '#750a1d');
    ctx.fillStyle = capeGrad;

    ctx.beginPath();
    ctx.moveTo(heroX - 16, heroY - 14);
    ctx.lineTo(heroX + 16, heroY - 14);
    ctx.quadraticCurveTo(heroX + 32 + capeFlutter1, heroY + 15, heroX + 44 + capeFlutter1 * 1.2, heroY + 44);
    ctx.lineTo(heroX - 20 + capeFlutter2 * 0.5, heroY + 42);
    ctx.closePath();
    ctx.fill();

    // Cape Golden Trim Embroidery
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(heroX - 20 + capeFlutter2 * 0.5, heroY + 42);
    ctx.lineTo(heroX + 44 + capeFlutter1 * 1.2, heroY + 44);
    ctx.stroke();

    // Hero Back Armor Plate (Polished Knight Plate with Spinal Ridge)
    ctx.fillStyle = '#cbd6e8';
    ctx.fillRect(heroX - 14, heroY - 16, 28, 28);
    // Dark steel shading on sides
    ctx.fillStyle = '#8f9db5';
    ctx.fillRect(heroX - 14, heroY - 16, 3, 28);
    ctx.fillRect(heroX + 11, heroY - 16, 3, 28);
    // Golden spinal armor groove
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(heroX - 2.5, heroY - 14, 5, 24);

    // Large Golden Lion-crest Pauldrons (Shoulders)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(heroX - 21, heroY - 18, 9, 14);
    ctx.fillRect(heroX + 12, heroY - 18, 9, 14);
    ctx.fillStyle = '#fff080';
    ctx.fillRect(heroX - 20, heroY - 20, 7, 3);
    ctx.fillRect(heroX + 13, heroY - 20, 7, 3);

    // Sturdy Knight Stance - Legs & Greaves
    ctx.fillStyle = '#222b38';
    ctx.fillRect(heroX - 12, heroY + 12, 8, 24);
    ctx.fillRect(heroX + 4, heroY + 12, 8, 24);
    // Golden knee guards & sabatons
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(heroX - 13, heroY + 28, 10, 8);
    ctx.fillRect(heroX + 3, heroY + 28, 10, 8);

    // Head / Crowned Wing Helm from Behind
    ctx.fillStyle = '#1c1b24';
    ctx.fillRect(heroX - 9, heroY - 34, 18, 18);
    // Helm Golden Wing Crests
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(heroX - 8, heroY - 34); ctx.lineTo(heroX - 16, heroY - 44); ctx.lineTo(heroX - 4, heroY - 36); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(heroX + 8, heroY - 34); ctx.lineTo(heroX + 16, heroY - 44); ctx.lineTo(heroX + 4, heroY - 36); ctx.fill();
    // Flowing hair/plumage in gale wind
    const hairBlow = Math.sin(heroAnim * 0.2) * 10;
    ctx.fillStyle = '#ffbb00';
    ctx.beginPath();
    ctx.moveTo(heroX - 5, heroY - 35);
    ctx.lineTo(heroX + 5, heroY - 35);
    ctx.lineTo(heroX + 18 + hairBlow, heroY - 46);
    ctx.lineTo(heroX + 4, heroY - 30);
    ctx.closePath();
    ctx.fill();

    // Right Arm firmly holding the Glowing Rhythm Holy Blade ("성검 아르카디아")
    ctx.save();
    ctx.translate(heroX + 16, heroY - 3);
    ctx.rotate(0.38); // Poised toward the abyss
    // Arm in plate gauntlet
    ctx.fillStyle = '#cbd6e8';
    ctx.fillRect(-3, 0, 7, 18);
    // Golden Crossguard
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-10, 18, 20, 5);
    ctx.fillRect(-3, 21, 6, 9); // grip
    // Blazing Broad Holy Rhythm Blade
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 22;
    ctx.fillRect(-3, 23, 6, 52);
    // Sword Tip
    ctx.beginPath();
    ctx.moveTo(-3, 75);
    ctx.lineTo(0, 84);
    ctx.lineTo(3, 75);
    ctx.fill();

    // Runic light in the blade center
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(-1, 32, 2, 6);
    ctx.fillRect(-1, 46, 2, 6);
    ctx.fillRect(-1, 60, 2, 6);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Holy rhythm note motes drifting from blade into wind
    for (let s = 0; s < 5; s++) {
        const spProg = ((heroAnim * 0.08 + s * 0.2) % 1);
        const spx = heroX + 32 + Math.sin(s * 2 + heroAnim * 0.1) * 8 + spProg * 25;
        const spy = heroY + 22 + spProg * 50;
        ctx.fillStyle = s % 2 === 0 ? '#00f0ff' : '#ffd700';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(spx, spy, 2.5 * (1 - spProg), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.restore();

    // ──────────────────────────────────────────────────────────
    // 5. CINEMATIC LETTERBOX & EPILOGUE TITLE CARDS (Short & Impactful)
    // ──────────────────────────────────────────────────────────
    // Cinema Letterbox (Top & Bottom black bars)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, 48);
    ctx.fillRect(0, H - 65, W, 65);

    // Top Cinema Header
    ctx.font = '14px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 8;
    ctx.fillText("✦ EPILOGUE : 새로운 전설의 시작 ✦", W / 2, 30);
    ctx.shadowBlur = 0;

    // Narrative Text Bar (Short & Memorable)
    ctx.font = '24px "VT323"';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText("용사는 검을 굳게 고쳐 쥐었다. 세계의 운명을 건 진정한 싸움이 시작된다.", W / 2, H - 38);

    // "TO BE CONTINUED..." Floating Arc Title Card
    ctx.font = '24px "Press Start 2P"';
    ctx.fillStyle = varColor('--neon-pink');
    ctx.shadowColor = '#ff005b';
    ctx.shadowBlur = 16;
    ctx.fillText(hiddenUnlocked ? "HIDDEN STAGE UNLOCKED" : "TO BE CONTINUED...", W / 2, 85);
    ctx.shadowBlur = 0;

    // Subtext Prompt
    ctx.font = '13px "VT323"';
    ctx.fillStyle = '#8888aa';
    ctx.fillText(hiddenUnlocked ? "[ SPACE · 태초의 심연신에게 도전 ]" : "[ SPACE · 타이틀 화면 ]", W / 2, H - 14);
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

// ═══════════════════════════════════════════
//  BOSS ENTRANCE CINEMATIC RENDERER
//  Each floor has a unique, fully animated intro scene
// ═══════════════════════════════════════════
function renderBossIntro() {
    const t   = bossIntroTimer;                         // 0 → BOSS_INTRO_DURATION
    const pct = t / BOSS_INTRO_DURATION;                // 0.0 → 1.0
    const W   = canvas.width, H = canvas.height;
    const cx  = W / 2, cy = H / 2;

    // Shared helpers
    function easeOut(v) { return 1 - Math.pow(1 - v, 3); }
    function easeIn(v) { return v * v * v; }

    ctx.save();

    switch (currentFloor) {
        // ──────────────────────────────────────────────────────────
        case 0: { // FLORA — 자연의 등장: 땅에서 넝쿨이 솟아오름
            // Background — forest green
            ctx.fillStyle = '#030d06';
            ctx.fillRect(0, 0, W, H);

            // Pulsing radial nature aura
            const auraR = 80 + pct * 280;
            const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
            auraGrad.addColorStop(0, `rgba(39,174,64,${0.4 - pct * 0.1})`);
            auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = auraGrad;
            ctx.fillRect(0, 0, W, H);

            // Ground line
            ctx.fillStyle = '#0e3018';
            ctx.fillRect(0, cy + 80, W, H);

            // Rising vines from below
            const vineCount = 12;
            for (let v = 0; v < vineCount; v++) {
                const vx = 60 + v * (W / vineCount);
                const maxH = (100 + Math.sin(v * 1.3) * 60) * easeOut(pct);
                const bendX = vx + Math.sin(v * 2 + t * 0.05) * 20;

                ctx.strokeStyle = `rgba(39,255,20,${0.4 + Math.sin(v) * 0.2})`;
                ctx.lineWidth = 3 + Math.sin(v) * 2;
                ctx.beginPath();
                ctx.moveTo(vx, cy + 80);
                ctx.quadraticCurveTo(bendX, cy + 80 - maxH * 0.5, vx + Math.sin(v) * 15, cy + 80 - maxH);
                ctx.stroke();

                // Leaf at tip
                if (pct > 0.3) {
                    const leafAlpha = easeOut((pct - 0.3) / 0.7);
                    ctx.fillStyle = `rgba(57,255,20,${leafAlpha})`;
                    ctx.beginPath();
                    ctx.ellipse(vx + Math.sin(v) * 15, cy + 80 - maxH, 6, 12, Math.sin(v + t * 0.05), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Floating petals
            for (let p = 0; p < 20; p++) {
                const petalProgress = ((t * 0.008 + p * 0.18) % 1);
                const px2 = 50 + p * (W / 18) + Math.sin(p * 3 + t * 0.04) * 30;
                const py2 = H + 20 - petalProgress * (H + 40);
                ctx.fillStyle = `rgba(100,255,100,${0.5 - petalProgress * 0.4})`;
                ctx.beginPath();
                ctx.ellipse(px2, py2, 5, 9, t * 0.06 + p, 0, Math.PI * 2);
                ctx.fill();
            }

            // Boss sprite — rises from below
            const bossY = cy + 120 - easeOut(pct) * 120;
            const bossScale = 0.5 + easeOut(pct) * 1.2;
            ctx.save();
            ctx.translate(cx, bossY);
            ctx.scale(bossScale, bossScale);
            drawWizard(ctx, 0, 0, 0, t);
            ctx.restore();

            // Boss name card
            if (pct > 0.5) {
                const textAlpha = easeOut((pct - 0.5) / 0.5);
                ctx.globalAlpha = textAlpha;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#39ff14';
                ctx.shadowBlur = 20;
                ctx.font = '28px "Press Start 2P"';
                ctx.fillStyle = '#39ff14';
                ctx.fillText('FLORA', cx, cy - 100);
                ctx.font = '14px "VT323"';
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 0;
                ctx.fillText('자연의 마법사', cx, cy - 68);
                ctx.globalAlpha = 1;
            }

            // Flash white at very end
            if (pct > 0.88) {
                ctx.fillStyle = `rgba(255,255,255,${(pct - 0.88) / 0.12 * 0.8})`;
                ctx.fillRect(0, 0, W, H);
            }
            break;
        }

        // ──────────────────────────────────────────────────────────
        case 1: { // GLACIUS — 빙하 균열: 위에서 얼음이 내려꽂힘
            ctx.fillStyle = '#020c18';
            ctx.fillRect(0, 0, W, H);

            // Blue aurora background
            for (let a = 0; a < 4; a++) {
                const ax = cx + Math.sin(t * 0.02 + a * 1.5) * 180;
                const aGrad = ctx.createRadialGradient(ax, 60, 0, ax, 60, 250);
                aGrad.addColorStop(0, `rgba(0,200,255,${0.12 + Math.sin(t * 0.04 + a) * 0.06})`);
                aGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = aGrad;
                ctx.fillRect(0, 0, W, H);
            }

            // Floor — frozen
            ctx.fillStyle = '#0a2a40';
            ctx.fillRect(0, cy + 90, W, H);
            // Ice crack lines
            ctx.strokeStyle = 'rgba(0,240,255,0.3)';
            ctx.lineWidth = 1;
            for (let c = 0; c < 8; c++) {
                const startX = 100 + c * 80 + Math.sin(c) * 20;
                ctx.beginPath();
                ctx.moveTo(startX, cy + 90);
                ctx.lineTo(startX + Math.sin(c * 2) * 40, cy + 90 + 60 * easeOut(pct));
                ctx.lineTo(startX + Math.sin(c * 3) * 20, H);
                ctx.stroke();
            }

            // Icicles falling from top
            const iceCount = 14;
            for (let i = 0; i < iceCount; i++) {
                const ix = 40 + i * (W / iceCount);
                const iceH = 30 + Math.sin(i * 1.8) * 20;
                const delay = i * 0.07;
                const iceProgress = Math.max(0, easeOut(Math.min(1, (pct - delay) / 0.6)));
                const iceY = -iceH + (cy + 88 + iceH) * iceProgress;

                ctx.fillStyle = `rgba(0,220,255,${0.6 + Math.sin(i) * 0.2})`;
                ctx.beginPath();
                ctx.moveTo(ix - 8, iceY - iceH);
                ctx.lineTo(ix + 8, iceY - iceH);
                ctx.lineTo(ix, iceY);
                ctx.closePath();
                ctx.fill();

                // Shatter sparks when landing
                if (iceProgress > 0.9) {
                    const sparkAlpha = 1 - (iceProgress - 0.9) / 0.1;
                    for (let s = 0; s < 4; s++) {
                        ctx.fillStyle = `rgba(180,240,255,${sparkAlpha})`;
                        ctx.beginPath();
                        ctx.arc(ix + Math.cos(s * 1.57) * 14 * (1 - sparkAlpha),
                                iceY + Math.sin(s * 1.57) * 8 * (1 - sparkAlpha), 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Snowflakes
            for (let f = 0; f < 30; f++) {
                const fx = (f * 83 + t * 1.2 * (1 + f % 3 * 0.3)) % W;
                const fy = (f * 67 + t * 0.8) % H;
                ctx.fillStyle = `rgba(200,240,255,${0.4 + Math.sin(f * 1.3) * 0.2})`;
                ctx.beginPath();
                ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Boss — drops from above
            const iceDropY = -80 + easeOut(pct) * (cy + 150);
            const iceScale = 0.6 + easeOut(pct) * 1.0;
            ctx.save();
            ctx.translate(cx, iceDropY);
            ctx.scale(iceScale, iceScale);
            drawWizard(ctx, 0, 0, 1, t);
            ctx.restore();

            // Name card
            if (pct > 0.55) {
                const a2 = easeOut((pct - 0.55) / 0.45);
                ctx.globalAlpha = a2;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 22;
                ctx.font = '26px "Press Start 2P"';
                ctx.fillStyle = '#00f0ff';
                ctx.fillText('GLACIUS', cx, cy - 110);
                ctx.font = '14px "VT323"';
                ctx.fillStyle = '#aee8ff';
                ctx.shadowBlur = 0;
                ctx.fillText('냉기의 마법사', cx, cy - 78);
                ctx.globalAlpha = 1;
            }

            if (pct > 0.88) {
                ctx.fillStyle = `rgba(200,240,255,${(pct - 0.88) / 0.12 * 0.8})`;
                ctx.fillRect(0, 0, W, H);
            }
            break;
        }

        // ──────────────────────────────────────────────────────────
        case 2: { // AERO — 뇌우 강림: 번개가 내리치며 보스 현현
            ctx.fillStyle = '#0e0e04';
            ctx.fillRect(0, 0, W, H);

            // Storm clouds sweeping in
            const cloudAlpha = easeOut(pct) * 0.85;
            for (let c = 0; c < 5; c++) {
                const cxPos = 100 + c * 160 + Math.sin(t * 0.02 + c) * 20;
                const cyPos = 80 + Math.sin(c * 1.4) * 40;
                const cr = 70 + Math.sin(c * 2) * 30;
                const cGrad = ctx.createRadialGradient(cxPos, cyPos, 0, cxPos, cyPos, cr);
                cGrad.addColorStop(0, `rgba(50,40,10,${cloudAlpha})`);
                cGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = cGrad;
                ctx.beginPath();
                ctx.ellipse(cxPos, cyPos, cr, cr * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Rain streaks
            ctx.strokeStyle = `rgba(180,180,100,${0.2 + pct * 0.2})`;
            ctx.lineWidth = 1;
            for (let r = 0; r < 40; r++) {
                const rx = (r * 43 + t * 3) % W;
                const ry = (r * 71 + t * 6) % H;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 2, ry + 12);
                ctx.stroke();
            }

            // Lightning bolt strikes
            const boltCount = 3;
            for (let b = 0; b < boltCount; b++) {
                const boltPhase = (t - b * 30) % 60;
                if (boltPhase < 8) {
                    const bx = 150 + b * 250;
                    ctx.strokeStyle = `rgba(255,255,180,${1 - boltPhase / 8})`;
                    ctx.lineWidth = 4 - boltPhase * 0.3;
                    ctx.shadowColor = '#ffd700';
                    ctx.shadowBlur = 30;
                    ctx.beginPath();
                    ctx.moveTo(bx, 0);
                    ctx.lineTo(bx + 20, 100);
                    ctx.lineTo(bx - 15, 180);
                    ctx.lineTo(bx + 10, 280);
                    ctx.lineTo(bx - 5, H);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }

            // Main central lightning strike at peak
            if (pct > 0.35 && pct < 0.65) {
                const strikeAlpha = Math.sin((pct - 0.35) / 0.3 * Math.PI);
                ctx.strokeStyle = `rgba(255,255,100,${strikeAlpha})`;
                ctx.lineWidth = 8;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 50;
                ctx.beginPath();
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx + 30, cy - 60);
                ctx.lineTo(cx - 20, cy);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Screen flash
                ctx.fillStyle = `rgba(255,240,100,${strikeAlpha * 0.3})`;
                ctx.fillRect(0, 0, W, H);
            }

            // Boss — appears with lightning burst
            const aeroAppear = Math.max(0, easeOut((pct - 0.4) / 0.6));
            const aeroScale = 0.4 + aeroAppear * 1.2;
            const aeroAlpha = aeroAppear;
            ctx.save();
            ctx.globalAlpha = aeroAlpha;
            ctx.translate(cx, cy + 20);
            ctx.scale(aeroScale, aeroScale);
            drawWizard(ctx, 0, 0, 2, t);
            ctx.restore();

            // Name card
            if (pct > 0.6) {
                const a2 = easeOut((pct - 0.6) / 0.4);
                ctx.globalAlpha = a2;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 24;
                ctx.font = '24px "Press Start 2P"';
                ctx.fillStyle = '#ffd700';
                ctx.fillText('AERO', cx, cy - 110);
                ctx.font = '14px "VT323"';
                ctx.fillStyle = '#ffe87a';
                ctx.shadowBlur = 0;
                ctx.fillText('폭풍의 마법사', cx, cy - 78);
                ctx.globalAlpha = 1;
            }

            if (pct > 0.88) {
                ctx.fillStyle = `rgba(255,240,100,${(pct - 0.88) / 0.12 * 0.7})`;
                ctx.fillRect(0, 0, W, H);
            }
            break;
        }

        // ──────────────────────────────────────────────────────────
        case 3: { // IGNIS — 화산 폭발: 바닥에서 용암이 끓어오름
            ctx.fillStyle = '#0a0000';
            ctx.fillRect(0, 0, W, H);

            // Lava floor rising
            const lavaY = H - easeOut(pct) * (H * 0.55);
            const lavGrad = ctx.createLinearGradient(0, lavaY, 0, H);
            lavGrad.addColorStop(0, '#ff4500');
            lavGrad.addColorStop(0.3, '#cc2200');
            lavGrad.addColorStop(1, '#880000');
            ctx.fillStyle = lavGrad;

            // Lava surface — wavy
            ctx.beginPath();
            ctx.moveTo(0, H);
            ctx.lineTo(0, lavaY);
            for (let wx = 0; wx <= W; wx += 10) {
                const waveY = lavaY + Math.sin(wx * 0.04 + t * 0.08) * 12;
                ctx.lineTo(wx, waveY);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fill();

            // Lava bubbles
            for (let b = 0; b < 8; b++) {
                const bx = 80 + b * 95 + Math.sin(b * 2.3) * 20;
                const bubPhase = (t * 0.04 + b * 0.7) % 1;
                const bubY = lavaY - bubPhase * 60;
                const bubR = 8 + Math.sin(b * 3) * 4;
                if (bubY > lavaY - 60 && bubY < lavaY + 10) {
                    ctx.fillStyle = `rgba(255,100,0,${1 - bubPhase})`;
                    ctx.beginPath();
                    ctx.arc(bx, bubY, bubR * (1 - bubPhase * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Ember particles shooting up
            for (let e = 0; e < 25; e++) {
                const ep = (t * 0.05 + e * 0.2) % 1;
                const ex = 60 + e * 27 + Math.sin(e * 1.5) * 30;
                const ey = lavaY - ep * 200 + Math.sin(ep * 3 + e) * 20;
                const er = 3 + Math.sin(e * 2) * 2;
                ctx.fillStyle = `rgba(255,${150 + Math.floor(ep * 100)},0,${1 - ep})`;
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(ex, ey, er, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Heat shimmer background
            const shimmerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300);
            shimmerGrad.addColorStop(0, `rgba(80,10,0,${pct * 0.4})`);
            shimmerGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = shimmerGrad;
            ctx.fillRect(0, 0, W, H);

            // Boss — rises on a pillar of lava
            const ignisY = cy + 200 - easeOut(pct) * 200;
            const ignisScale = 0.5 + easeOut(pct) * 1.1;
            ctx.save();
            ctx.translate(cx, ignisY);
            ctx.scale(ignisScale, ignisScale);
            drawWizard(ctx, 0, 0, 3, t);
            ctx.restore();

            // Name card
            if (pct > 0.52) {
                const a2 = easeOut((pct - 0.52) / 0.48);
                ctx.globalAlpha = a2;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#ff4500';
                ctx.shadowBlur = 26;
                ctx.font = '24px "Press Start 2P"';
                ctx.fillStyle = '#ff4500';
                ctx.fillText('IGNIS', cx, cy - 115);
                ctx.font = '14px "VT323"';
                ctx.fillStyle = '#ffaa60';
                ctx.shadowBlur = 0;
                ctx.fillText('화염의 마법사', cx, cy - 83);
                ctx.globalAlpha = 1;
            }

            if (pct > 0.88) {
                ctx.fillStyle = `rgba(255,60,0,${(pct - 0.88) / 0.12 * 0.7})`;
                ctx.fillRect(0, 0, W, H);
            }
            break;
        }

        // ──────────────────────────────────────────────────────────
        case 4: { // MALAKAR — 공허의 틈새: 차원 균열에서 대마법사 등장
            ctx.fillStyle = '#020008';
            ctx.fillRect(0, 0, W, H);

            // Void rift portal — tears open from center
            const riftSize = easeOut(pct) * 240;
            const riftGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, riftSize);
            riftGrad.addColorStop(0, 'rgba(0,0,0,1)');
            riftGrad.addColorStop(0.4, 'rgba(80,0,160,0.9)');
            riftGrad.addColorStop(0.75, 'rgba(40,0,80,0.5)');
            riftGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = riftGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, riftSize, riftSize * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();

            // Void rift jagged edge
            ctx.strokeStyle = `rgba(200,0,255,${0.6 + Math.sin(t * 0.1) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#cc00ff';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            const edgePts = 24;
            for (let i = 0; i <= edgePts; i++) {
                const angle = (i / edgePts) * Math.PI * 2;
                const rJag = riftSize * (0.9 + Math.sin(i * 3 + t * 0.08) * 0.12);
                const ex = cx + Math.cos(angle) * rJag;
                const ey = cy + Math.sin(angle) * rJag * 0.55;
                i === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Star field distortion
            for (let s = 0; s < 60; s++) {
                const sAngle = (s / 60) * Math.PI * 2 + t * 0.01;
                const sDist = 40 + (s % 10) * 30;
                const pullFactor = Math.max(0, 1 - sDist / (riftSize + 60));
                const sx = cx + Math.cos(sAngle) * sDist * (1 - pullFactor * 0.5) - Math.cos(sAngle) * pullFactor * 30;
                const sy = cy + Math.sin(sAngle) * sDist * 0.55 * (1 - pullFactor * 0.5);
                ctx.fillStyle = `rgba(200,150,255,${0.5 - pullFactor * 0.3})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Soul orbs pouring out of portal
            const orbCount = Math.floor(pct * 16);
            for (let o = 0; o < orbCount; o++) {
                const oAngle = o * 0.7 + t * 0.04;
                const oDist = 30 + o * 14 + Math.sin(t * 0.05 + o) * 10;
                const ox2 = cx + Math.cos(oAngle) * oDist;
                const oy2 = cy + Math.sin(oAngle) * oDist * 0.45;
                const oR = 5 - o * 0.2;
                if (oR <= 0) continue;
                ctx.fillStyle = o % 2 === 0 ? 'rgba(204,0,255,0.8)' : 'rgba(100,0,200,0.6)';
                ctx.shadowColor = '#cc00ff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(ox2, oy2, oR, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Boss — materializes from void
            const malakarAlpha = easeOut(Math.max(0, (pct - 0.3) / 0.7));
            const malakarScale = 0.3 + easeOut(Math.max(0, (pct - 0.2) / 0.8)) * 1.3;
            const malakarY = cy + 20 + (1 - malakarAlpha) * 60;
            ctx.save();
            ctx.globalAlpha = malakarAlpha;
            ctx.translate(cx, malakarY);
            ctx.scale(malakarScale, malakarScale);
            drawWizard(ctx, 0, 0, 4, t);
            ctx.restore();

            // Name card — dramatic two-line reveal
            if (pct > 0.6) {
                const a2 = easeOut((pct - 0.6) / 0.4);
                ctx.globalAlpha = a2;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#cc00ff';
                ctx.shadowBlur = 30;
                ctx.font = '22px "Press Start 2P"';
                ctx.fillStyle = '#cc00ff';
                ctx.fillText('MALAKAR', cx, cy - 120);
                ctx.font = '15px "Press Start 2P"';
                ctx.fillStyle = '#8a2be2';
                ctx.fillText('THE ARCHMAGE', cx, cy - 95);
                ctx.font = '14px "VT323"';
                ctx.fillStyle = '#c080ff';
                ctx.shadowBlur = 0;
                ctx.fillText('대마법사', cx, cy - 68);
                ctx.globalAlpha = 1;
            }

            if (pct > 0.88) {
                ctx.fillStyle = `rgba(60,0,100,${(pct - 0.88) / 0.12 * 0.9})`;
                ctx.fillRect(0, 0, W, H);
            }
            break;
        }
    }

    ctx.restore();
}


// ═══════════════════════════════════════════
function drawWizard(ctx, x, y, type, frame) {
    ctx.save();

    const bob = Math.sin(frame * 0.08) * 5;
    const wy = y + bob;
    const t = frame;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 34, 28, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (type) {
        // ──────────────────────────────────────────
        case 0: { // FLORA — 자연의 마법사
            const gc = ctx.createLinearGradient(x, wy - 50, x, wy + 36);
            gc.addColorStop(0, '#1a5c28');
            gc.addColorStop(1, '#2d7a43');

            // Robe (wider, layered)
            ctx.fillStyle = gc;
            ctx.beginPath();
            ctx.moveTo(x - 20, wy + 36);
            ctx.lineTo(x - 22, wy);
            ctx.lineTo(x - 14, wy - 14);
            ctx.lineTo(x + 14, wy - 14);
            ctx.lineTo(x + 22, wy);
            ctx.lineTo(x + 20, wy + 36);
            ctx.closePath();
            ctx.fill();

            // Robe trim
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 20, wy + 36);
            ctx.lineTo(x - 22, wy);
            ctx.moveTo(x + 20, wy + 36);
            ctx.lineTo(x + 22, wy);
            ctx.stroke();

            // Belt / sash
            ctx.fillStyle = '#5a2e00';
            ctx.fillRect(x - 17, wy + 6, 34, 6);

            // Face
            ctx.fillStyle = '#f5c8a0';
            ctx.beginPath();
            ctx.ellipse(x, wy - 24, 13, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Leaf crown — animated
            for (let i = -2; i <= 2; i++) {
                const lx = x + i * 10;
                const lh = (i === 0 ? 14 : 10) + Math.sin(t * 0.1 + i) * 2;
                ctx.fillStyle = i % 2 === 0 ? '#39ff14' : '#27ae3f';
                ctx.beginPath();
                ctx.ellipse(lx, wy - 36 - lh / 2, 5, lh / 2, Math.sin(i) * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
            // Crown base
            ctx.fillStyle = '#2d7a43';
            ctx.fillRect(x - 18, wy - 36, 36, 6);

            // Glowing green eyes
            ctx.fillStyle = '#39ff14';
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(x - 5, wy - 24, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 5, wy - 24, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Floating vine particles
            for (let i = 0; i < 3; i++) {
                const angle = t * 0.04 + i * 2.1;
                const r = 32 + Math.sin(t * 0.07 + i) * 6;
                ctx.strokeStyle = `rgba(57,255,20,${0.3 + i * 0.15})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x + Math.cos(angle) * r, wy + Math.sin(angle) * r * 0.5 - 5, 4 + i, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Staff
            ctx.strokeStyle = '#5a2e00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 22, wy + 30);
            ctx.lineTo(x + 24, wy - 40);
            ctx.stroke();
            // Staff orb
            ctx.fillStyle = '#39ff14';
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(x + 24, wy - 42, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
        }

        // ──────────────────────────────────────────
        case 1: { // GLACIUS — 냉기의 마법사
            // Icy robe
            const gi = ctx.createLinearGradient(x, wy - 50, x, wy + 36);
            gi.addColorStop(0, '#1a4a6e');
            gi.addColorStop(1, '#0a2340');
            ctx.fillStyle = gi;
            ctx.beginPath();
            ctx.moveTo(x - 20, wy + 36);
            ctx.lineTo(x - 24, wy);
            ctx.lineTo(x - 15, wy - 14);
            ctx.lineTo(x + 15, wy - 14);
            ctx.lineTo(x + 24, wy);
            ctx.lineTo(x + 20, wy + 36);
            ctx.closePath();
            ctx.fill();

            // Ice crystal robe details
            ctx.strokeStyle = 'rgba(0,240,255,0.5)';
            ctx.lineWidth = 1.5;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * 8, wy);
                ctx.lineTo(x + i * 8 - 4, wy + 18);
                ctx.lineTo(x + i * 8, wy + 28);
                ctx.lineTo(x + i * 8 + 4, wy + 18);
                ctx.closePath();
                ctx.stroke();
            }

            // Face
            ctx.fillStyle = '#c8eaf0';
            ctx.beginPath();
            ctx.ellipse(x, wy - 24, 13, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Icicle horns / crown
            const iceColors = ['#00f0ff', '#80f8ff', '#00d4e0'];
            for (let i = -2; i <= 2; i++) {
                const h = [8, 14, 20, 14, 8][i + 2] + Math.sin(t * 0.05 + i) * 1.5;
                ctx.fillStyle = iceColors[Math.abs(i) % 3];
                ctx.beginPath();
                ctx.moveTo(x + i * 9 - 4, wy - 36);
                ctx.lineTo(x + i * 9, wy - 36 - h);
                ctx.lineTo(x + i * 9 + 4, wy - 36);
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = '#2b658f';
            ctx.fillRect(x - 18, wy - 37, 36, 5);

            // Glowing cyan eyes
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(x - 5, wy - 24, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 5, wy - 24, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Orbiting ice shards
            for (let i = 0; i < 4; i++) {
                const angle = -t * 0.05 + i * Math.PI / 2;
                const rx = x + Math.cos(angle) * 34;
                const ry = wy + Math.sin(angle) * 18 - 5;
                ctx.fillStyle = 'rgba(0,240,255,0.6)';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.moveTo(rx, ry - 7);
                ctx.lineTo(rx + 3, ry);
                ctx.lineTo(rx, ry + 7);
                ctx.lineTo(rx - 3, ry);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Staff — icicle wand
            ctx.strokeStyle = '#80f8ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 22, wy + 30);
            ctx.lineTo(x - 24, wy - 38);
            ctx.stroke();
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(x - 24, wy - 38);
            ctx.lineTo(x - 30, wy - 52);
            ctx.lineTo(x - 24, wy - 46);
            ctx.lineTo(x - 18, wy - 52);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
        }

        // ──────────────────────────────────────────
        case 2: { // AERO — 폭풍의 마법사
            // Storm cloak
            const ga = ctx.createLinearGradient(x, wy - 50, x, wy + 36);
            ga.addColorStop(0, '#8a7010');
            ga.addColorStop(1, '#3a2e08');
            ctx.fillStyle = ga;
            ctx.beginPath();
            ctx.moveTo(x - 20, wy + 36);
            ctx.lineTo(x - 26, wy + 10);
            ctx.lineTo(x - 20, wy - 14);
            ctx.lineTo(x + 20, wy - 14);
            ctx.lineTo(x + 26, wy + 10);
            ctx.lineTo(x + 20, wy + 36);
            ctx.closePath();
            ctx.fill();

            // Wind swirl lines on cloak
            ctx.strokeStyle = 'rgba(255,215,0,0.3)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(x - 8 + i * 8, wy + 15, 7, Math.PI * 0.1 + i * 0.3, Math.PI * 1.2 + i * 0.3);
                ctx.stroke();
            }

            // Face
            ctx.fillStyle = '#f0d890';
            ctx.beginPath();
            ctx.ellipse(x, wy - 24, 13, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Storm hat
            ctx.fillStyle = '#6b5900';
            ctx.beginPath();
            ctx.moveTo(x - 20, wy - 34);
            ctx.lineTo(x + 20, wy - 34);
            ctx.lineTo(x + 14, wy - 38);
            ctx.lineTo(x, wy - 58);
            ctx.lineTo(x - 14, wy - 38);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x - 22, wy - 36, 44, 4);

            // Lightning bolt eyes
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(x - 5, wy - 24, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 5, wy - 24, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Animated lightning wings
            const lFrame = t % 8 < 4;
            ctx.strokeStyle = lFrame ? '#ffd700' : '#ffaa00';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            // Left wing
            ctx.beginPath();
            ctx.moveTo(x - 22, wy - 10);
            ctx.lineTo(x - 38, wy - 28 + (lFrame ? 0 : 4));
            ctx.lineTo(x - 30, wy - 15);
            ctx.lineTo(x - 46, wy - 8 + (lFrame ? 0 : 4));
            ctx.stroke();
            // Right wing
            ctx.beginPath();
            ctx.moveTo(x + 22, wy - 10);
            ctx.lineTo(x + 38, wy - 28 + (lFrame ? 0 : 4));
            ctx.lineTo(x + 30, wy - 15);
            ctx.lineTo(x + 46, wy - 8 + (lFrame ? 0 : 4));
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Staff — thunder rod
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 24, wy + 28);
            ctx.lineTo(x + 24, wy - 44);
            ctx.stroke();
            // Spark orb
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(x + 24, wy - 46, 8, 0, Math.PI * 2);
            ctx.fill();
            // Zigzag bolt from orb
            if (lFrame) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + 24, wy - 38);
                ctx.lineTo(x + 18, wy - 28);
                ctx.lineTo(x + 26, wy - 20);
                ctx.lineTo(x + 20, wy - 10);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            break;
        }

        // ──────────────────────────────────────────
        case 3: { // IGNIS — 화염의 마법사
            // Lava armor robe
            const gf = ctx.createLinearGradient(x, wy - 50, x, wy + 36);
            gf.addColorStop(0, '#7a1a10');
            gf.addColorStop(0.5, '#9e2d25');
            gf.addColorStop(1, '#2a0808');
            ctx.fillStyle = gf;
            ctx.beginPath();
            ctx.moveTo(x - 22, wy + 36);
            ctx.lineTo(x - 26, wy + 6);
            ctx.lineTo(x - 18, wy - 14);
            ctx.lineTo(x + 18, wy - 14);
            ctx.lineTo(x + 26, wy + 6);
            ctx.lineTo(x + 22, wy + 36);
            ctx.closePath();
            ctx.fill();

            // Lava crack lines on armor
            ctx.strokeStyle = '#ff4500';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.moveTo(x - 12, wy + 5); ctx.lineTo(x - 6, wy + 20); ctx.lineTo(x - 14, wy + 30); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 8, wy + 8); ctx.lineTo(x + 14, wy + 22); ctx.lineTo(x + 6, wy + 32); ctx.stroke();
            ctx.shadowBlur = 0;

            // Shoulder spikes
            for (let s = -1; s <= 1; s += 2) {
                ctx.fillStyle = '#444';
                ctx.beginPath();
                ctx.moveTo(x + s * 22, wy - 5);
                ctx.lineTo(x + s * 32, wy - 18);
                ctx.lineTo(x + s * 24, wy + 2);
                ctx.closePath();
                ctx.fill();
            }

            // Face
            ctx.fillStyle = '#c07050';
            ctx.beginPath();
            ctx.ellipse(x, wy - 24, 14, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Flame crown — animated
            for (let i = -3; i <= 3; i++) {
                const fh = (Math.abs(i) === 3 ? 8 : Math.abs(i) === 2 ? 14 : Math.abs(i) === 1 ? 20 : 26)
                         + Math.sin(t * 0.15 + i * 1.5) * 4;
                const alpha = 0.7 + Math.sin(t * 0.15 + i) * 0.3;
                ctx.fillStyle = `rgba(255,${80 + Math.abs(i) * 20},0,${alpha})`;
                ctx.beginPath();
                ctx.moveTo(x + i * 8 - 5, wy - 36);
                ctx.quadraticCurveTo(x + i * 8, wy - 36 - fh * 0.5, x + i * 8, wy - 36 - fh);
                ctx.quadraticCurveTo(x + i * 8 + 3, wy - 36 - fh * 0.4, x + i * 8 + 5, wy - 36);
                ctx.fill();
            }
            ctx.fillStyle = '#3a1008';
            ctx.fillRect(x - 20, wy - 37, 40, 5);

            // Glowing red eyes
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(x - 5, wy - 24, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 5, wy - 24, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Flame particles orbiting
            for (let i = 0; i < 5; i++) {
                const angle = t * 0.08 + i * 1.26;
                const r = 36 + Math.sin(t * 0.12 + i) * 8;
                const px2 = x + Math.cos(angle) * r;
                const py2 = wy + Math.sin(angle) * r * 0.45 - 5;
                ctx.fillStyle = `rgba(255,${100 + i * 30},0,0.7)`;
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(px2, py2, 4 - i * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Staff — volcanic rod
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x - 24, wy + 28);
            ctx.lineTo(x - 26, wy - 44);
            ctx.stroke();
            // Lava orb
            ctx.fillStyle = '#ff4500';
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.arc(x - 26, wy - 46, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffaa00';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x - 26, wy - 48, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
        }

        // ──────────────────────────────────────────
        case 4: { // MALAKAR — 대마법사 (Final Boss)
            // Void robe — flowing
            const gm = ctx.createLinearGradient(x, wy - 60, x, wy + 40);
            gm.addColorStop(0, '#0e0020');
            gm.addColorStop(0.4, '#1b072b');
            gm.addColorStop(1, '#05010a');
            ctx.fillStyle = gm;
            ctx.beginPath();
            ctx.moveTo(x - 24, wy + 40);
            ctx.bezierCurveTo(x - 30, wy + 20, x - 26, wy, x - 20, wy - 14);
            ctx.lineTo(x + 20, wy - 14);
            ctx.bezierCurveTo(x + 26, wy, x + 30, wy + 20, x + 24, wy + 40);
            ctx.closePath();
            ctx.fill();

            // Void robe edge glow
            ctx.strokeStyle = 'rgba(138,43,226,0.7)';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#8a2be2';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(x - 24, wy + 40);
            ctx.bezierCurveTo(x - 30, wy + 20, x - 26, wy, x - 20, wy - 14);
            ctx.moveTo(x + 20, wy - 14);
            ctx.bezierCurveTo(x + 26, wy, x + 30, wy + 20, x + 24, wy + 40);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Rune markings on robe
            ctx.strokeStyle = 'rgba(138,43,226,0.5)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 4; i++) {
                const ry2 = wy + 5 + i * 8;
                const rw = 12 - i * 1.5;
                ctx.beginPath();
                ctx.moveTo(x - rw, ry2);
                ctx.lineTo(x + rw, ry2);
                ctx.stroke();
                if (i % 2 === 0) {
                    ctx.beginPath();
                    ctx.moveTo(x, ry2);
                    ctx.lineTo(x + rw * 0.5, ry2 + 5);
                    ctx.stroke();
                }
            }

            // Cowl (deep hood)
            ctx.fillStyle = '#0e0020';
            ctx.beginPath();
            ctx.ellipse(x, wy - 24, 18, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2f084d';
            ctx.beginPath();
            ctx.ellipse(x, wy - 28, 16, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            // Hood shadow inside
            ctx.fillStyle = '#030008';
            ctx.beginPath();
            ctx.ellipse(x, wy - 25, 11, 13, 0, 0, Math.PI * 2);
            ctx.fill();

            // Hollow glowing eyes
            ctx.fillStyle = '#cc00ff';
            ctx.shadowColor = '#cc00ff';
            ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(x - 6, wy - 26, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 6, wy - 26, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Floating void crown
            const crownAngle = t * 0.03;
            for (let i = 0; i < 5; i++) {
                const ca = crownAngle + i * 1.257;
                const crx = x + Math.cos(ca) * 22;
                const cry = wy - 46 + Math.sin(ca) * 7;
                ctx.fillStyle = i === 0 ? '#cc00ff' : '#8a2be2';
                ctx.shadowColor = '#8a2be2';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(crx, cry - 8);
                ctx.lineTo(crx + 4, cry + 2);
                ctx.lineTo(crx, cry - 1);
                ctx.lineTo(crx - 4, cry + 2);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Orbiting soul orbs (3 large rings)
            for (let ring = 0; ring < 3; ring++) {
                const rOrb = 28 + ring * 12;
                const rSpeed = 0.06 - ring * 0.015;
                const orbAngle = t * rSpeed + ring * 2.094;
                const orbx = x + Math.cos(orbAngle) * rOrb;
                const orby = wy + Math.sin(orbAngle) * rOrb * 0.4 - 5;

                ctx.fillStyle = ring === 0 ? 'rgba(204,0,255,0.9)' : ring === 1 ? 'rgba(138,43,226,0.7)' : 'rgba(64,0,128,0.5)';
                ctx.shadowColor = '#8a2be2';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.arc(orbx, orby, 5 - ring, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Shadow tendrils
            for (let i = 0; i < 6; i++) {
                const tendAngle = t * 0.04 + i * 1.047;
                const tendLen = 38 + Math.sin(t * 0.08 + i * 1.5) * 10;
                ctx.strokeStyle = `rgba(138,43,226,${0.15 + Math.sin(t * 0.1 + i) * 0.1})`;
                ctx.lineWidth = 3 - i * 0.3;
                ctx.beginPath();
                ctx.moveTo(x, wy + 20);
                ctx.quadraticCurveTo(
                    x + Math.cos(tendAngle) * tendLen * 0.6,
                    wy + 20 + Math.sin(tendAngle) * tendLen * 0.4,
                    x + Math.cos(tendAngle) * tendLen,
                    wy + 20 + Math.sin(tendAngle) * tendLen * 0.5
                );
                ctx.stroke();
            }

            // Staff — void scepter (both hands floating)
            ctx.strokeStyle = '#1a0033';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x - 28, wy + 30);
            ctx.lineTo(x - 28, wy - 54);
            ctx.stroke();
            // Void gem at top
            ctx.fillStyle = '#000';
            ctx.shadowColor = '#cc00ff';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(x - 28, wy - 58, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#cc00ff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(x - 28, wy - 60, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
        }
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
