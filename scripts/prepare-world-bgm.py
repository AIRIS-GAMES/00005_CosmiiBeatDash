"""World BGM: the music of each Cosmii game for its stage world.

Masters (as delivered, never bundled): Asset/masters/world-bgm/
Sources (beat-tracking timeline, never bundled): Asset/world-bgm/<id>.<ext>
Playback (bundled): Asset/audio/world-<id>.mp3, with the same 900 ms lead-in and
60 % offline attenuation as the other BGM, plus a measured per-track gain.

Run this, then scripts/generate-rhythm-beats.py (beat grids), then the tests.
Needs ffmpeg on PATH and librosa==0.11.0.
"""
import json, re, shutil, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MASTERS = ROOT / 'Asset/masters/world-bgm'
SOURCES = ROOT / 'Asset/world-bgm'
AUDIO = ROOT / 'Asset/audio'
TARGET_PEAK = float(subprocess.run(['node', '-p', "require('./scripts/audio-levels.js').BGM_TARGET_PEAK"],
                                   cwd=ROOT, capture_output=True, text=True, check=True).stdout)

# id -> master file; loop = (first beat, last beat, repeats) on the song's own
# beat grid: the bars in between are played `repeats` more times, seam on a
# downbeat, so a short game loop reaches the planned stage length.
WORLD_BGM = {
    'rescue': {'master': '00011_Rescue.mp3'},
    'rescue-normal': {'master': '00011_Rescue_Normal.mp3'},
    'cannon': {'master': '00010_Cannon.mp3'},
    'roll':   {'master': '00013_KOROGARE.m4a'},
    'sudoku': {'master': '00006_Sudoku.mp3'},
    'catch':  {'master': '00012_Catch.mp3'},
    'mogu':   {'master': '00004_MOGUMOGUPANIC.mp3', 'loop': (12, 76, 3)},
    'match':  {'master': '00002_3MatchPuzzle.mp3', 'loop': (40, 104, 1)},
}
SR = 44100


def decode(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(sr), 'pipe:1'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).copy()


def encode(samples, path, quality=('-b:a', '320k')):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', 'pipe:0',
                    '-codec:a', 'libmp3lame', *quality, str(path)], input=samples.astype('<f4').tobytes(), check=True)


def beat_times(samples):
    """Tracked beat times (the song's own beats; its tempo may waver a little)."""
    import librosa
    y = librosa.resample(samples.mean(axis=1), orig_sr=SR, target_sr=22050)
    hop = 256
    onset = librosa.onset.onset_strength(y=y, sr=22050, hop_length=hop)
    _, frames = librosa.beat.beat_track(onset_envelope=onset, sr=22050, hop_length=hop, tightness=100, trim=False)
    return librosa.frames_to_time(frames, sr=22050, hop_length=hop)


def looped(samples, loop):
    """Repeat the bars between two beats; 20 ms equal-power crossfade at each seam."""
    first, last, repeats = loop
    t = beat_times(samples)
    A, Bt = int(round(t[first] * SR)), int(round(t[last] * SR))
    fade = int(0.02 * SR)
    w = np.linspace(0, np.pi / 2, fade)[:, None]
    body = samples[A:Bt]
    out = samples[:Bt].copy()
    for _ in range(repeats):
        # The bar after the seam starts while the tail of the previous pass fades.
        tail = samples[Bt:Bt + fade] * np.cos(w)
        head = body.copy(); head[:fade] = head[:fade] * np.sin(w) + tail
        out = np.concatenate([out, head])
    out = np.concatenate([out, samples[Bt:]])
    print(f'  loop beats {first}-{last} ({(Bt - A) / SR:.2f}s) x{repeats}: {len(samples) / SR:.1f}s -> {len(out) / SR:.1f}s')
    return out


def main():
    SOURCES.mkdir(parents=True, exist_ok=True)
    tracks_file = AUDIO / 'tracks.js'
    tracks = json.loads(re.sub(r'^globalThis\.AUDIO_TRACKS = |;\s*$', '', tracks_file.read_text(encoding='utf-8')))
    for wid, spec in WORLD_BGM.items():
        master = MASTERS / spec['master']
        print(wid, master.name, flush=True)
        if 'loop' in spec:
            source = SOURCES / f'{wid}.mp3'
            encode(looped(decode(master), spec['loop']), source)
        else:
            source = SOURCES / f'{wid}{master.suffix}'
            shutil.copyfile(master, source)
        playback = AUDIO / f'world-{wid}.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-af', 'volume=0.6,adelay=900|900',
                        '-ac', '2', '-ar', '48000', '-codec:a', 'libmp3lame', '-q:a', '5', str(playback)], check=True)
        played = decode(playback, 48000)            # measure what ships
        peak = float(np.abs(played).max())
        duration = len(decode(source)) / SR
        key = 'Asset/world-bgm/' + source.name
        tracks[key] = {'duration': round(duration, 4), 'beats': [], 'playback': 'Asset/audio/' + playback.name,
                       'peak': round(peak, 5), 'gain': round(min(1, TARGET_PEAK / peak), 5)}
        print(f'  {key}: {duration:.2f}s, playback peak {peak:.4f}, gain {tracks[key]["gain"]}', flush=True)
    tracks_file.write_text('globalThis.AUDIO_TRACKS = ' + json.dumps(tracks, separators=(',', ':')) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    main()
