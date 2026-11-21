"""Re-encode every BGM playback file from its source at one quality and re-measure
its playback gain (Asset/audio/tracks.js). The beat timeline is unchanged: the
same 900 ms lead-in and 60 % attenuation as generate-audio-assets.js.

VBR -q:a 5 (~135 kbps) is the shipping quality: game music on phone speakers and
earphones, ~30 % smaller than -q:a 2 (~190 kbps).
Needs ffmpeg on PATH. Usage: python3 scripts/encode-bgm.py
"""
import json, re, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
QUALITY = '5'
# World songs are only played as long as their longest stage (+6 s): the rest
# is cut off with a 1.5 s fade, and tracks.js gets the real length.
KEEP = {'Asset/world-bgm/cannon.mp3': 39.1, 'Asset/world-bgm/roll.m4a': 45.1, 'Asset/world-bgm/sudoku.mp3': 65.1,
        'Asset/world-bgm/catch.mp3': 95.1, 'Asset/world-bgm/mogu.mp3': 120.1, 'Asset/world-bgm/rescue-normal.mp3': 31.0}
TARGET_PEAK = float(subprocess.run(['node', '-p', "require('./scripts/audio-levels.js').BGM_TARGET_PEAK"],
                                   cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def peak(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', '48000', 'pipe:1'],
                         capture_output=True, check=True).stdout
    return float(np.abs(np.frombuffer(raw, dtype='<f4')).max())


def main():
    tracks_file = ROOT / 'Asset/audio/tracks.js'
    tracks = json.loads(re.sub(r'^globalThis\.AUDIO_TRACKS = |;\s*$', '', tracks_file.read_text(encoding='utf-8')))
    for key, t in tracks.items():
        src, out = ROOT / key, ROOT / t['playback']
        before = out.stat().st_size
        keep = KEEP.get(key)
        af = 'volume=0.6,adelay=900|900' + (f',atrim=0:{keep + 0.9},afade=t=out:st={keep - 0.6}:d=1.5' if keep else '')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', af, '-ac', '2', '-ar', '48000',
                        '-codec:a', 'libmp3lame', '-q:a', QUALITY, str(out)], check=True)
        if keep: t['duration'] = keep
        p = peak(out)
        t['peak'] = round(p, 5); t['gain'] = round(min(1, TARGET_PEAK / p), 5)
        print(f'{key}: {before / 1048576:.1f}MB -> {out.stat().st_size / 1048576:.1f}MB, gain {t["gain"]}', flush=True)
    tracks_file.write_text('globalThis.AUDIO_TRACKS = ' + json.dumps(tracks, separators=(',', ':')) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    main()
