from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen
import time

root=Path(__file__).resolve().parents[1]/'dist/assets'
base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/emerald/animated'
tasks=[(f'{base}/{n}.png',root/'animated'/f'{n}.png') for n in range(1,152)]
def download(task):
    url,path=task
    if path.exists() and path.stat().st_size>100:return
    path.parent.mkdir(parents=True,exist_ok=True)
    for attempt in range(3):
        try:
            data=urlopen(url,timeout=25).read()
            assert len(data)>100
            path.write_bytes(data)
            return
        except Exception:
            if attempt==2:raise
            time.sleep(.3)
with ThreadPoolExecutor(max_workers=12) as pool:
    for future in as_completed([pool.submit(download,t) for t in tasks]):future.result()
print(f'{len(tasks)} animation assets ready.')
