from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen, Request
import time

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen'

def get(task):
    url, dest = task
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 100:
        return
    for attempt in range(3):
        try:
            data = urlopen(Request(url, headers={'User-Agent':'KantoChampionLoop/1.0'}), timeout=25).read()
            if len(data) < 100:
                raise ValueError('empty asset')
            dest.write_bytes(data)
            return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(0.4)

tasks = [(f'{BASE}/{"back/" if view == "back" else ""}{n}.png', ROOT / f'dist/assets/{view}/{n}.png') for n in range(1,152) for view in ['front','back']]
tasks += [
    ('https://raw.githubusercontent.com/google/fonts/main/ofl/silkscreen/Silkscreen-Regular.ttf',ROOT / 'dist/assets/pixel.ttf'),
    ('https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf',ROOT / 'dist/assets/grotesk.ttf'),
    ('https://play.pokemonshowdown.com/sprites/trainers/blue.png',ROOT / 'dist/assets/blue.png'),
    ('https://raw.githubusercontent.com/google/fonts/main/ofl/silkscreen/OFL.txt',ROOT / 'dist/licenses/silkscreen.txt'),
    ('https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/OFL.txt',ROOT / 'dist/licenses/space-grotesk.txt'),
]
with ThreadPoolExecutor(max_workers=12) as pool:
    futures = [pool.submit(get, t) for t in tasks]
    errors=[]
    for f in as_completed(futures):
        try: f.result()
        except Exception as e: errors.append(str(e))
print(f'Assets: {len(tasks)-len(errors)}/{len(tasks)} downloaded')
if errors:
    print(errors)
    raise SystemExit(1)
