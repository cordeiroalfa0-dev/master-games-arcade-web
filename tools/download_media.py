#!/usr/bin/env python3
"""
Master Games Arcade - Media Downloader (Snaps, Icons, Videos)
Baixa e atualiza imagens (snaps), icones e previews de video para todos os jogos da lista.
"""
import os
import sys
import json
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_PATH = os.path.join(BASE_DIR, 'roms-catalog.json')
TITLES_PATH = os.path.join(BASE_DIR, 'game-titles.json')
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
SNAPS_DIR = os.path.join(ASSETS_DIR, 'snaps')
ICONS_DIR = os.path.join(ASSETS_DIR, 'icons')
VIDEOS_DIR = os.path.join(ASSETS_DIR, 'videos')
MANIFEST_PATH = os.path.join(ASSETS_DIR, 'media-manifest.json')

PRIMARY_CDN_SNAP = 'https://cdn.jsdelivr.net/gh/cordeiroalfa0-dev/master-games-arcade-system@main/snaps/{rom}.png'
RAW_GITHUB_SNAP = 'https://raw.githubusercontent.com/cordeiroalfa0-dev/master-games-arcade-system/main/snaps/{rom}.png'
LIBRETRO_MAME = 'https://raw.githubusercontent.com/libretro/libretro-thumbnails/master/MAME/Named_Snaps/{title}.png'

def fetch_url(url, timeout=10):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = resp.read()
                if len(data) > 100:
                    return data
    except Exception:
        pass
    return None

def download_asset(rom, clean_rom, title):
    # 1. Snap
    snap_dest = os.path.join(SNAPS_DIR, f'{rom}.png')
    snap_data = None
    if not os.path.exists(snap_dest) or os.path.getsize(snap_dest) < 100:
        urls = [
            PRIMARY_CDN_SNAP.format(rom=clean_rom),
            RAW_GITHUB_SNAP.format(rom=clean_rom),
        ]
        if title:
            enc = urllib.parse.quote(title)
            urls.append(LIBRETRO_MAME.format(title=enc))
        for u in urls:
            snap_data = fetch_url(u)
            if snap_data:
                with open(snap_dest, 'wb') as f:
                    f.write(snap_data)
                break
    else:
        with open(snap_dest, 'rb') as f:
            snap_data = f.read()

    # 2. Icon (derivado ou baixado)
    icon_dest = os.path.join(ICONS_DIR, f'{rom}.png')
    if not os.path.exists(icon_dest) or os.path.getsize(icon_dest) < 100:
        if snap_data:
            with open(icon_dest, 'wb') as f:
                f.write(snap_data)

    return rom, bool(snap_data or os.path.exists(snap_dest))

def main():
    os.makedirs(SNAPS_DIR, exist_ok=True)
    os.makedirs(ICONS_DIR, exist_ok=True)
    os.makedirs(VIDEOS_DIR, exist_ok=True)

    if not os.path.exists(CATALOG_PATH):
        print(f'Erro: {CATALOG_PATH} nao encontrado.')
        sys.exit(1)

    with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    titles = {}
    if os.path.exists(TITLES_PATH):
        with open(TITLES_PATH, 'r', encoding='utf-8') as f:
            titles = json.load(f)

    tasks = []
    for item in catalog.get('files', []):
        name = item.get('name', '')
        if not name.endswith('.zip'):
            continue
        rom = name.replace('.zip', '')
        clean_rom = rom.replace(' (1)', '').strip()
        title = titles.get(rom) or titles.get(clean_rom) or ''
        tasks.append((rom, clean_rom, title))

    print(f'Baixando e sincronizando midias para {len(tasks)} jogos...')
    with ThreadPoolExecutor(max_workers=16) as executor:
        results = list(executor.map(lambda t: download_asset(*t), tasks))

    success_count = sum(1 for _, ok in results if ok)
    print(f'Concluido: {success_count}/{len(tasks)} jogos com imagens e icones prontos.')

    manifest = {}
    for rom, clean_rom, title in tasks:
        snap_path = f'assets/snaps/{rom}.png'
        icon_path = f'assets/icons/{rom}.png'
        video_path = f'assets/videos/{rom}.mp4'
        manifest[rom] = {
            'title': title or rom.upper(),
            'has_snap': os.path.exists(os.path.join(BASE_DIR, snap_path)),
            'snap_url': f'https://cdn.jsdelivr.net/gh/cordeiroalfa0-dev/master-games-arcade-system@main/snaps/{clean_rom}.png',
            'icon_url': f'https://cdn.jsdelivr.net/gh/cordeiroalfa0-dev/master-games-arcade-system@main/snaps/{clean_rom}.png',
            'video_preview_url': f'https://archive.org/download/mame-video-previews/{clean_rom}.mp4',
            'local_snap': snap_path if os.path.exists(os.path.join(BASE_DIR, snap_path)) else None,
            'local_icon': icon_path if os.path.exists(os.path.join(BASE_DIR, icon_path)) else None,
            'local_video': video_path if os.path.exists(os.path.join(BASE_DIR, video_path)) else None
        }

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f'Manifesto gravado em {MANIFEST_PATH}')

if __name__ == '__main__':
    main()
