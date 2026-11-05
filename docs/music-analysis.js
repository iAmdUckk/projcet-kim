const MIN_RHYTHM_NOTE_GAP = 0.22;
const FAST_MELODY_NOTE_GAP = 0.16;

// Track attacks and sustained pitch changes in the uploaded recording.
function analyzeMusicNotes(buffer) {
    const size = 1024;
    const stride = Math.max(1, Math.floor(buffer.sampleRate / 12000));
    const rate = buffer.sampleRate / stride;
    const hop = Math.round(rate * 0.01);
    const secondsPerFrame = hop / rate;
    const frames = Math.ceil(buffer.length / stride / hop);
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    const bins = size / 2;
    const magnitude = new Float32Array(bins);
    const earlier = [new Float32Array(bins), new Float32Array(bins)];
    const window = Float32Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / size));
    const reversed = Uint16Array.from({ length: size }, (_, i) => {
        let result = 0;
        for (let bits = size; bits > 1; bits >>= 1, i >>= 1) result = (result << 1) | (i & 1);
        return result;
    });
    const cos = Float32Array.from({ length: bins }, (_, i) => Math.cos(2 * Math.PI * i / size));
    const sin = Float32Array.from({ length: bins }, (_, i) => -Math.sin(2 * Math.PI * i / size));
    const novelty = new Float32Array(frames);
    const level = new Float32Array(frames);
    const pitch = new Float32Array(frames);
    const bassPeak = new Float32Array(frames);
    const prefix = new Float64Array(frames + 1);

    for (let frame = 0; frame < frames; frame++) {
        const start = (frame * hop - size / 2) * stride;
        let energy = 0;
        for (let i = 0; i < size; i++) {
            const index = start + i * stride;
            let sample = 0;
            for (const channel of channels) sample += channel[index] || 0;
            sample = sample / channels.length * window[i];
            real[reversed[i]] = sample;
            energy += sample * sample;
        }
        level[frame] = Math.sqrt(energy / size);
        imag.fill(0);
        for (let width = 2; width <= size; width *= 2) {
            const half = width / 2;
            for (let offset = 0; offset < size; offset += width) {
                for (let j = 0; j < half; j++) {
                    const a = offset + j, b = a + half, twiddle = j * size / width;
                    const r = real[b] * cos[twiddle] - imag[b] * sin[twiddle];
                    const v = real[b] * sin[twiddle] + imag[b] * cos[twiddle];
                    real[b] = real[a] - r;
                    imag[b] = imag[a] - v;
                    real[a] += r;
                    imag[a] += v;
                }
            }
        }

        const past = earlier[frame % earlier.length];
        let flux = 0;
        for (let bin = 2; bin < bins; bin++) {
            const power = Math.sqrt(real[bin] * real[bin] + imag[bin] * imag[bin]);
            magnitude[bin] = power;
            if (bin * rate / size <= 200) bassPeak[frame] = Math.max(bassPeak[frame], power);
            const compressed = Math.log1p(power);
            // New harmonics and consonants count even when the overall volume stays steady.
            flux += Math.max(0, compressed - past[bin]);
            past[bin] = compressed;
        }
        novelty[frame] = flux;
        prefix[frame + 1] = prefix[frame] + flux;

        if (level[frame] < 0.0002) continue;
        let strongest = 0, peak = 0;
        for (let bin = Math.ceil(70 * size / rate); bin < Math.floor(1800 * size / rate); bin++) {
            const power = magnitude[bin];
            if (power < magnitude[bin - 1] || power <= magnitude[bin + 1]) continue;
            const frequency = bin * rate / size;
            // Support the lead with its overtones, and reduce the influence of strong bass.
            const second = Math.max(magnitude[bin * 2 - 1] || 0, magnitude[bin * 2] || 0, magnitude[bin * 2 + 1] || 0);
            const third = Math.max(magnitude[bin * 3 - 1] || 0, magnitude[bin * 3] || 0, magnitude[bin * 3 + 1] || 0);
            const leadWeight = 0.45 + 0.55 * Math.min(1, frequency / 220);
            const score = (power + 0.45 * second + 0.25 * third) * leadWeight;
            if (score > strongest) {
                strongest = score;
                peak = bin;
            }
        }
        if (peak) {
            const left = Math.log1p(magnitude[peak - 1]);
            const center = Math.log1p(magnitude[peak]);
            const right = Math.log1p(magnitude[peak + 1]);
            const refined = peak + 0.5 * (left - right) / (left - 2 * center + right);
            pitch[frame] = 69 + 12 * Math.log2(refined * rate / size / 440);
        }
    }

    const events = [];
    let stablePitch = 0;
    for (let frame = 1; frame < frames - 4; frame++) {
        if (level[frame] < 0.0002) {
            stablePitch = 0;
            continue;
        }
        const from = Math.max(0, frame - 35), to = Math.min(frames, frame + 36);
        const mean = (prefix[to] - prefix[from]) / (to - from);
        const flux = novelty[frame];
        const fading = frame >= 3 && level[frame - 3] > level[frame] * 0.8 &&
            level[frame + 3] < level[frame - 3] * 0.4;
        const next = pitch[frame + 2];
        const stableAfter = next && Math.abs(pitch[frame + 3] - next) < 0.65 &&
            Math.abs(pitch[frame + 4] - next) < 0.65;
        // A ringing bass can become the loudest pitch when the lead stops.
        const exposedBass = frame >= 4 && stableAfter && next <= 55 && pitch[frame - 4] - next >= 12 &&
            bassPeak[frame + 3] <= bassPeak[frame - 4] * 1.2;
        if (!fading && !exposedBass && flux > Math.max(0.12, mean * 1.65) && flux >= novelty[frame - 1] && flux > novelty[frame + 1]) {
            const strength = flux / Math.max(mean, 0.12);
            events.push({ frame, strength, pitch: stableAfter ? next : 0, attack: strength >= 2.4 });
        }
        if (stableAfter && Math.abs(pitch[frame] - next) < 0.65 &&
            Math.abs(pitch[frame + 1] - next) < 0.65 && Math.abs(next - stablePitch) >= 0.95) {
            if (stablePitch && !exposedBass && level[frame + 2] >= level[frame - 1] * 0.7) {
                events.push({ frame, strength: 1.5, pitch: next, attack: false });
            }
            stablePitch = next;
        }
    }

    // Keep a tighter gap for clear melodic changes and distinct repeated attacks.
    const gapFrames = Math.ceil(MIN_RHYTHM_NOTE_GAP / secondsPerFrame);
    events.sort((a, b) => b.strength - a.strength);
    const used = new Array(frames);
    const selected = [];
    for (const event of events) {
        const time = event.frame <= 2 ? 0 : (event.frame + 1) * secondsPerFrame;
        if (time >= buffer.duration - 0.035) continue;
        let collides = false;
        for (let frame = Math.max(0, event.frame - gapFrames); frame < Math.min(frames, event.frame + gapFrames + 1); frame++) {
            const other = used[frame];
            if (!other) continue;
            const distinct = event.pitch && other.pitch &&
                (Math.abs(event.pitch - other.pitch) >= 0.95 || (event.attack && other.attack));
            const minimumGap = distinct ? FAST_MELODY_NOTE_GAP : MIN_RHYTHM_NOTE_GAP;
            if (Math.abs(time - other.time) + 1e-8 < minimumGap) {
                collides = true;
                break;
            }
        }
        if (collides) continue;
        const note = { ...event, time };
        selected.push(note);
        used[event.frame] = note;
    }
    selected.sort((a, b) => a.time - b.time);
    let lane = 0;
    let phrase = 0;
    return selected.map((note, index) => {
        const previous = selected[index - 1];
        if (!previous || note.time - previous.time > 0.50) {
            const next = selected[index + 1];
            const direction = next?.pitch && note.pitch ? next.pitch - note.pitch : 0;
            lane = direction > 0.8 ? phrase % 2 : direction < -0.8 ? 3 - phrase % 2 : [0, 2, 1, 3][phrase % 4];
            phrase++;
        } else if (note.pitch && previous.pitch && Math.abs(note.pitch - previous.pitch) >= 0.8) {
            const interval = note.pitch - previous.pitch;
            const step = Math.sign(interval) * (Math.abs(interval) >= 3.5 ? 2 : 1);
            lane = (lane + step + 4) % 4;
        } else {
            lane ^= note.time - previous.time < 0.24 ? 1 : 2;
        }
        return { beat: note.time, pitch: 0, duration: 0.1, lane, track: 'melody', spawned: false };
    });
}
