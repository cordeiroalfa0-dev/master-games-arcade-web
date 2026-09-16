#!/usr/bin/env python3
"""Gera perfis de dificuldade Fácil/Difícil por ROM para o Master Games Arcade.

A dificuldade de arcades é definida por DIP switches do jogo, não por uma
opção universal do core. Este utilitário analisa o catálogo, identifica a
família/core/BIOS e gera um arquivo de perfis auditável para orientar a
aplicação futura no menu de serviço ou em um core recompilado.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "roms-manifest.json"
TITLES = ROOT / "game-titles.json"
DEFAULT_OUTPUT = ROOT / "difficulty-profiles.generated.json"

SYSTEM_FILES = {
    "ar_bios.zip", "awbios.zip", "naomi.zip", "neogeo.zip", "nss.zip",
    "pgm.zip", "qsound.zip", "isgsm.zip", "dir.txt",
}
CPS2 = {
    "avsp", "avspu", "ddsom", "ddtod", "dino", "dstlk", "hsf2", "megaman2",
    "msh", "mshvsf", "mvsc", "nwarr", "nwarru", "sfa", "sfa2", "sfa2u",
    "sfa3", "sfz2al", "sfz2ald", "sgemf", "spf2t", "ssf2", "ssf2t", "vhunt2",
    "vsav", "vsavj", "xmcota", "xmvsf", "xmvsfe", "xmvsfu", "xmvsfur1",
    "xmvsfj", "armwar", "cybots", "gigawing", "mmatrix", "progear",
}
NEOGEO = {
    "aof3", "bjourney", "breakers", "breakrev", "eightman", "fatfursp",
    "fatfury3", "garou", "kizuna", "kof94", "kof95", "kof96", "kof97",
    "kof98", "kof99", "kof2000", "kof2001", "kof2002", "kof2003", "lastbld2",
    "lbowling", "magdrop3", "matrim", "mslug", "mslug2", "mslug3", "mslug4",
    "mslug5", "mslugx", "samsho", "samsho2", "samsho3", "samsho4", "sengoku3",
    "sonicwi2", "sonicwi3", "svc", "svcsplus", "twinspri", "wakuwak7", "whp",
}


def base_name(name: str) -> str:
    return re.sub(r"\.(zip|7z|chd)$", "", name, flags=re.I).lower()


def family_for(rom: str) -> tuple[str, str, str | None]:
    base = base_name(rom)
    if base in CPS2:
        return "cps2", "fbalpha2012_cps2", "qsound.zip"
    if base in NEOGEO:
        return "neogeo", "arcade", "neogeo.zip"
    return "arcade", "arcade", None


def difficulty_profile(family: str, difficulty: str) -> dict:
    # Nomes são intenções DIP, não valores aplicados cegamente: cada driver
    is_hard = difficulty == "Hard"
    # pode chamar as opções de forma diferente. O campo status deixa isso claro.
    if family == "cps2":
        return {
            "status": "needs-driver-dip-application",
            "difficulty": difficulty,
            "suggested_dips": [
                {"label": "Difficulty", "value": "Hard" if is_hard else "Easy"},
                {"label": "Lives", "value": "2" if is_hard else "5"},
                {"label": "Continue", "value": "Disabled" if is_hard else "Enabled"},
            ],
        }
    if family == "neogeo":
        return {
            "status": "needs-driver-dip-application",
            "difficulty": difficulty,
            "suggested_dips": [
                {"label": "Difficulty", "value": "Hard" if is_hard else "Easy"},
                {"label": "Player Stock", "value": "2" if is_hard else "5"},
                {"label": "Continue", "value": "Disabled" if is_hard else "Enabled"},
            ],
        }
    return {
        "status": "needs-game-service-menu",
        "difficulty": difficulty,
        "suggested_dips": [
            {"label": "Difficulty", "value": "Hard" if is_hard else "Easy"},
            {"label": "Lives", "value": "2" if is_hard else "5"},
            {"label": "Continue", "value": "Disabled" if is_hard else "Enabled"},
        ],
    }


def load_catalog() -> tuple[list[dict], dict]:
    manifest = json.loads(MANIFEST.read_text())
    titles = json.loads(TITLES.read_text())
    entries = manifest.get("files", [])
    return entries, titles


def build_profiles() -> dict:
    entries, titles = load_catalog()
    profiles = {}
    for entry in entries:
        name = entry.get("name", "")
        if not name or name.lower() in SYSTEM_FILES or not re.search(r"\.(zip|7z|chd)$", name, re.I):
            continue
        rom = base_name(name)
        family, core, bios = family_for(name)
        profile = difficulty_profile(family, "Easy")
        hard_profile = difficulty_profile(family, "Hard")
        profiles[rom] = {
            "rom": name,
            "title": titles.get(rom, rom),
            "family": family,
            "core": core,
            "bios": bios,
            "profile": profile,
            "modes": {"easy": profile, "hard": hard_profile},
            "apply": {
                "automatic": False,
                "method": "service-menu-or-driver-patch",
                "note": "DIP switches are game-specific; verify labels before applying.",
            },
        }
    return {
        "schema": "mga-difficulty-profile-v1",
        "generated_from": ["roms-manifest.json", "game-titles.json"],
        "total_playable_roms": len(profiles),
        "warning": "Profiles are suggestions until a core exposes a safe DIP-switch API.",
        "profiles": profiles,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Analisa ROMs e gera perfis fáceis por jogo")
    parser.add_argument("command", choices=["generate", "list", "inspect"], nargs="?", default="generate")
    parser.add_argument("rom", nargs="?", help="nome da ROM para inspect, por exemplo avsp")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    data = build_profiles()
    if args.command == "generate":
        args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        print(f"Gerados {data['total_playable_roms']} perfis em {args.output}")
    elif args.command == "list":
        for key, item in data["profiles"].items():
            print(f"{key:14} {item['family']:7} {item['core']:20} {item['profile']['status']}")
    else:
        key = base_name(args.rom or "")
        item = data["profiles"].get(key)
        if not item:
            raise SystemExit(f"ROM não encontrada no catálogo: {args.rom}")
        print(json.dumps(item, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
