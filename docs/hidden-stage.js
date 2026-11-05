// The epilogue boss uses the main game's rhythm engine and four original lanes.
const HIDDEN_UNLOCK = 'rebody_hidden_unlocked';
const HIDDEN_PHASE_LENGTH = 8 * 4;
const HIDDEN_BPM = 176;
const HIDDEN_PATTERNS = [
    [[0, 0], [.5, 2], [1, 1], [1.5, 3], [2, 0], [2.75, 1], [3, 2], [3.5, 3]],
    [[0, 0], [.5, 1], [.75, 2], [1, 3], [1.5, 0], [2, 1, 3], [2.5, 2], [3, 0, 3], [3.5, 1]],
    [[0, 0, 3], [.5, 1], [.75, 2], [1, 3], [1.25, 1], [1.5, 0, 2], [2, 1, 3], [2.5, 2], [2.75, 1], [3, 0, 3], [3.5, 2]]
];
let hiddenUnlocked = false;
let hiddenFight = null;
let hiddenResult = null;

try {
    hiddenUnlocked = localStorage.getItem(HIDDEN_UNLOCK) === '1';
} catch {}

function unlockHiddenStage() {
    hiddenUnlocked = true;
    try {
        localStorage.setItem(HIDDEN_UNLOCK, '1');
    } catch {}
}

function makeHiddenSong() {
    const notes = [];
    const roots = [NOTES.E3, NOTES.E3, NOTES.C3, NOTES['D#3']];
    const pitches = [NOTES.E4, NOTES.G4, NOTES.B4, NOTES['D#5']];
    let rhythmNotesCount = 0;
    for (let bar = 0; bar < 24; bar++) {
        const phase = Math.floor(bar / 8);
        const pattern = HIDDEN_PATTERNS[phase];
        const start = 4 + bar * 4;
        for (const [offset, ...lanes] of pattern) {
            for (const lane of lanes) {
                const mappedLane = bar % 2 ? 3 - lane : lane;
                notes.push({ beat: start + offset, duration: .4, pitch: pitches[mappedLane],
                    lane: mappedLane, track: 'melody' });
                rhythmNotesCount++;
            }
        }
        for (let beat = 0; beat < 4; beat++) {
            notes.push({ beat: start + beat, pitch: beat % 2 ? 'S' : 'K', lane: null, track: 'drums' });
            notes.push({ beat: start + beat, pitch: roots[bar % roots.length] / 2,
                duration: .9, lane: null, track: 'harmony' });
        }
    }
    notes.sort((a, b) => a.beat - b.beat);
    return { name: 'THE HOLLOW CROWN', composer: 'RE; BODY', bpm: HIDDEN_BPM,
        totalBeats: 100, notes, rhythmNotesCount, maxScore: rhythmNotesCount * 100 };
}

function startHiddenStage() {
    if (!hiddenUnlocked) return;
    initAudio();
    resetCurrentFloor();
    hiddenResult = null;
    hiddenFight = { attackAt: -Infinity, attackLane: 0, damage: 0, displayedLife: maxLife };
    gameState = STATE_RHYTHM;
    document.body.classList.add('hidden-theme');
    document.getElementById('game-outer-container').classList.remove('title-fullscreen-mode', 'title-screen-shake');
    document.getElementById('current-floor-lbl').textContent = 'HIDDEN';
    pressedLanes.fill(false);
    playSfx('portal-warp');
    activeSongData = startSynthSequence(makeHiddenSong(), spawnRhythmNote, () => finishHiddenStage(true));
}

function hiddenCounterattack(lane, damage) {
    hiddenFight.attackAt = performance.now();
    hiddenFight.attackLane = lane;
    hiddenFight.damage = damage;
    life = Math.max(0, life - damage);
}

function finishHiddenStage(cleared) {
    stopSong();
    const total = activeSongData.rhythmNotesCount;
    if (cleared) {
        // The audio clock can finish while rendering is suspended in a background tab.
        const pending = total - ratingCounts.perfect - ratingCounts.great - ratingCounts.good - ratingCounts.miss;
        ratingCounts.miss += pending;
        life = Math.max(0, life - pending * 9);
        cleared = life > 0;
    }
    hiddenResult = { cleared, time: performance.now(), misses: ratingCounts.miss,
        total, attackLane: hiddenFight.attackLane,
        attackAt: hiddenFight.attackAt, damage: hiddenFight.damage };
    hiddenFight = null;
    gameState = STATE_HIDDEN_RESULT;
    playSfx(cleared ? 'limb-reclaim' : 'death-explode');
}

function leaveHiddenStage() {
    stopSong();
    hiddenFight = null;
    hiddenResult = null;
    document.body.classList.remove('hidden-theme');
    resetGameToStart();
    gameState = STATE_TITLE;
}

function hiddenPhase(elapsed) {
    const beat = elapsed * HIDDEN_BPM / 60;
    return Math.max(0, Math.min(2, Math.floor((beat - 4) / HIDDEN_PHASE_LENGTH)));
}

function drawHiddenBossArmor(ctx, x, y, anim) {
    for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(x, y + Math.sin(anim * .035) * 4);
        ctx.scale(side, 1);
        for (let feather = 0; feather < 6; feather++) {
            const tip = 194 + feather * 31;
            const rise = 102 - feather * 20;
            const steel = ctx.createLinearGradient(46, 28, tip, -rise);
            steel.addColorStop(0, '#080d19');
            steel.addColorStop(.55, '#31243a');
            steel.addColorStop(1, '#6e3e42');
            ctx.fillStyle = steel;
            ctx.strokeStyle = 'rgba(255, 155, 121, .52)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(46, 15 + feather * 8);
            ctx.quadraticCurveTo(120, -rise - 25, tip, -rise);
            ctx.quadraticCurveTo(tip - 32, -rise + 18, 100, 42 + feather * 9);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        for (let plate = 0; plate < 5; plate++) {
            const top = -54 + plate * 25;
            const width = 83 - Math.abs(plate - 2) * 8;
            ctx.fillStyle = plate % 2 ? '#1a1929' : '#2b2133';
            ctx.strokeStyle = '#8e5250';
            ctx.beginPath();
            ctx.moveTo(22, top + 20);
            ctx.lineTo(width, top);
            ctx.lineTo(width + 11, top + 12);
            ctx.lineTo(42, top + 43);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#ff956c';
            ctx.beginPath();
            ctx.moveTo(width - 15, top + 6);
            ctx.lineTo(width - 23, top + 16);
            ctx.lineTo(width - 31, top + 15);
            ctx.lineTo(width - 38, top + 25);
            ctx.stroke();
        }
        ctx.restore();
    }
}

function renderHiddenArena(elapsed) {
    const phase = hiddenPhase(elapsed);
    const anim = player.animFrame;
    renderColossalNemesisScene(ctx, canvas.width, canvas.height, anim, true);
    ctx.save();
    ctx.translate(400, 195);
    const tint = ['#ffc481', '#fe8b98', '#ffe4aa'][phase];
    for (let ring = 0; ring < 3; ring++) {
        ctx.save();
        ctx.rotate(anim * (ring % 2 ? -.008 : .012));
        ctx.strokeStyle = tint;
        ctx.globalAlpha = .35 - ring * .07;
        ctx.lineWidth = 2;
        ctx.setLineDash([8 + ring * 5, 7, 2, 8]);
        ctx.beginPath();
        ctx.ellipse(0, 0, 126 + ring * 78, 63 + ring * 45, -.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

// Notes begin at the boss core, fan outward, then line up above their receptors.
function hiddenNoteOffset(noteY, lane) {
    const progress = Math.min(1, Math.max(0, (noteY - 195) / 110));
    return (400 - (250 + lane * 100)) * (1 - progress) ** 2;
}

function renderHiddenNoteTrail(noteX, noteY) {
    if (noteY > 315) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, (315 - noteY) / 120) * .85;
    ctx.strokeStyle = '#ffd29a';
    ctx.shadowColor = '#ff934e';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 195);
    ctx.quadraticCurveTo(400, noteY - 16, noteX, noteY);
    ctx.stroke();
    ctx.restore();
}

function renderHiddenAttack(fight, now) {
    const age = now - fight.attackAt;
    if (age >= 450) return;
    const impact = 1 - age / 450;
    const laneX = 250 + fight.attackLane * 100;
    ctx.save();
    ctx.globalAlpha = impact * .8;
    ctx.strokeStyle = '#ff774f';
    ctx.shadowColor = '#ff3838';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 13 * impact + 2;
    ctx.beginPath();
    ctx.moveTo(400, 195);
    ctx.lineTo(laneX + 35, 380);
    ctx.lineTo(laneX, targetLineY);
    ctx.lineTo(120, 244);
    ctx.stroke();
    ctx.globalAlpha = impact * .36;
    ctx.lineWidth = 22;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.restore();
}

function renderHiddenHud(elapsed) {
    const now = performance.now();
    const fight = hiddenFight;
    const phase = hiddenPhase(elapsed);
    const hitCount = ratingCounts.perfect + ratingCounts.great + ratingCounts.good;
    const total = activeSongData.rhythmNotesCount;
    fight.displayedLife = life + (fight.displayedLife - life) * .82;
    renderHiddenAttack(fight, now);
    ctx.save();
    ctx.fillStyle = 'rgba(8, 19, 23, .94)';
    ctx.fillRect(184, 14, 432, 66);
    ctx.strokeStyle = '#bc8059';
    ctx.strokeRect(184, 14, 432, 66);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe0ae';
    ctx.font = '16px "Press Start 2P"';
    ctx.fillText('THE HOLLOW CROWN', 400, 42);
    ctx.font = '16px sans-serif';
    ctx.fillText(`태초의 심연신   /   PHASE 0${phase + 1} · ${['강림', '분열', '종말'][phase]}`, 400, 66);

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffe0ae';
    ctx.fillText('실패 게이지', 25, 220);
    ctx.fillStyle = '#2e1b21';
    ctx.fillRect(25, 232, 165, 19);
    ctx.fillStyle = '#ff946b';
    ctx.fillRect(25, 232, 165 * fight.displayedLife / maxLife, 19);
    ctx.strokeStyle = '#ffceac';
    ctx.strokeRect(25, 232, 165, 19);
    ctx.fillStyle = '#fff1df';
    ctx.fillText(`${life}%`, 25, 274);
    if (now - fight.attackAt < 450) {
        ctx.fillStyle = '#ff946b';
        ctx.fillText(`반격 −${fight.damage}%`, 25, 302);
    }
    ctx.fillStyle = '#ffe0ae';
    ctx.fillText(`막아낸 노드 ${hitCount}`, 605, 220);
    ctx.fillText(`남은 노드 ${Math.max(0, total - hitCount - ratingCounts.miss)}`, 605, 247);
    ctx.restore();
}

function renderHiddenResult() {
    const result = hiddenResult;
    const now = performance.now();
    const age = now - result.time;
    if (result.cleared) {
        const dawn = ctx.createLinearGradient(0, 0, 0, canvas.height);
        dawn.addColorStop(0, '#061c25');
        dawn.addColorStop(.6, '#205e60');
        dawn.addColorStop(1, '#e79b69');
        ctx.fillStyle = dawn;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawHeroTransformed(ctx, 400, 420, player.animFrame);
    } else {
        renderHiddenArena(100);
        renderHiddenAttack(result, now);
    }
    ctx.save();
    ctx.fillStyle = 'rgba(7, 18, 23, .93)';
    ctx.fillRect(85, 112, 630, 290);
    ctx.strokeStyle = '#dbac80';
    ctx.strokeRect(85, 112, 630, 290);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8b68b';
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(result.cleared ? 'TRUE ENDING' : 'HIDDEN STAGE', 400, 153);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#fff3d9';
    ctx.fillText(result.cleared ? '새벽이 돌아왔다' : '심연에 삼켜졌다', 400, 203);
    ctx.font = '19px sans-serif';
    ctx.fillText(result.cleared ? '마지막 왕관이 부서지자, 탑 위로 첫 햇살이 들었다.'
        : '보스의 반격으로 실패 게이지가 바닥났다.', 400, 245);
    ctx.fillText(result.cleared ? '되찾은 몸으로 용사는 새벽 속을 걸어 나갔다.'
        : '다시 일어서면 심연의 문은 열려 있다.', 400, 275);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffd095';
    const failureRate = (result.misses / result.total * 100).toFixed(1);
    ctx.fillText(result.cleared ? `노드 실패율  ${failureRate}%  (${result.misses}/${result.total})`
        : '실패 게이지  0%', 400, 330);
    if (age >= 650) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#fff3d9';
        ctx.fillText(result.cleared ? 'SPACE · 타이틀    /    H · 다시 도전'
            : 'SPACE · 다시 도전    /    ESC · 타이틀', 400, 376);
    }
    ctx.restore();
}
