#!/usr/bin/env python3
"""
generate-icons.py

Single entrypoint to regenerate all TaskTrove icon assets from one square PNG source.

What it covers (mirrors current repo state):
- packages/branding/icons/tasktrove-icon.(png|svg)
- Public copies: apps/import.pro/public/tasktrove-icon.svg, apps/docs.pro/docs/public/tasktrove-icon.svg
- App icons (web, web.pro, mobile.pro): icon0.svg, icon1.png, apple-icon.png, favicon.ico, icon-rounded.svg
- Mobile app extra icon.png (legacy) and public/icon-rounded.svg
- Android launcher bitmaps (padded) for all densities + adaptive foreground
- Android launcher XML helpers (foreground bitmap reference, white background)
- Android notification small icon: white glyph, padded, on transparent

Usage:
  python scripts/generate-icons.py /path/to/source.png [--radius 0.2]

Notes:
- Source should be a square RGBA PNG.
- Radius controls the rounded variant used for icon-rounded.svg (default 0.2).
- Padding for launcher icons is fixed at 2/3 of the canvas to stay inside the adaptive safe zone.
- Notification icon is 96x96 with a 64x64 white glyph centered on transparent.
"""

from __future__ import annotations

import argparse
import base64
import io
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Regenerate all TaskTrove icons from a single PNG")
    p.add_argument("source", type=Path, help="Square RGBA PNG")
    p.add_argument("--radius", type=float, default=0.2, help="Rounded corner radius fraction (default 0.2)")
    return p.parse_args()


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def save_png(img: Image.Image, dest: Path) -> None:
    ensure_parent(dest)
    img.save(dest)
    print(f"png -> {dest}")


def save_ico(base: Image.Image, dest: Path, sizes: Iterable[int] = (16, 32, 48, 64)) -> None:
    ensure_parent(dest)
    imgs = [base.resize((s, s), Image.LANCZOS) for s in sizes]
    imgs[-1].save(dest, format="ICO", sizes=[(s, s) for s in sizes])
    print(f"ico -> {dest}")


def save_svg_from_png(img: Image.Image, dest: Path) -> None:
    ensure_parent(dest)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = (
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{img.width}' height='{img.height}' viewBox='0 0 {img.width} {img.height}'>"
        f"<image href='data:image/png;base64,{b64}' width='{img.width}' height='{img.height}'/>"
        "<style>@media (prefers-color-scheme: light){:root{filter:none;}}@media (prefers-color-scheme: dark){:root{filter:none;}}</style>"
        "</svg>"
    )
    dest.write_text(svg)
    print(f"svg -> {dest}")


def rounded(img: Image.Image, radius_frac: float) -> Image.Image:
    w, h = img.size
    r = int(min(w, h) * radius_frac)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w, h], radius=r, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, mask=mask)
    return out


def padded(img: Image.Image, canvas_size: int, scale: float) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    inner = int(canvas_size * scale)
    resized = img.resize((inner, inner), Image.LANCZOS)
    offset = ((canvas_size - inner) // 2, (canvas_size - inner) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


def main() -> None:
    args = parse_args()
    src = args.source.resolve()
    if not src.exists():
        raise SystemExit(f"Source not found: {src}")

    base = Image.open(src).convert("RGBA")
    rounded_img = rounded(base, args.radius)

    # 1) Branding sources
    save_png(base, ROOT / "packages/branding/icons/tasktrove-icon.png")
    save_svg_from_png(base, ROOT / "packages/branding/icons/tasktrove-icon.svg")

    # 2) Public tasktrove-icon copies
    for dest in [
        ROOT / "apps/import.pro/public/tasktrove-icon.svg",
        ROOT / "apps/docs.pro/docs/public/tasktrove-icon.svg",
    ]:
        save_svg_from_png(base, dest)

    # 3) App icon0 (square) and icon-rounded
    icon0_targets = [
        ROOT / "apps/web/app/icon0.svg",
        ROOT / "apps/web.pro/app/icon0.svg",
        ROOT / "apps/mobile.pro/app/icon0.svg",
    ]
    for dest in icon0_targets:
        save_svg_from_png(base, dest)

    icon_rounded_targets = [
        ROOT / "apps/web/app/icon-rounded.svg",
        ROOT / "apps/web.pro/app/icon-rounded.svg",
        ROOT / "apps/mobile.pro/app/icon-rounded.svg",
        ROOT / "apps/web/public/icon-rounded.svg",
        ROOT / "apps/web.pro/public/icon-rounded.svg",
        ROOT / "apps/mobile.pro/public/icon-rounded.svg",
    ]
    for dest in icon_rounded_targets:
        save_svg_from_png(rounded_img, dest)

    # 4) PNG sizes (96 avatar, 180 apple)
    png_sizes = {
        ROOT / "apps/web/app/icon1.png": 96,
        ROOT / "apps/mobile.pro/app/icon1.png": 96,
        ROOT / "apps/mobile.pro/app/icon.png": 96,
        ROOT / "apps/web/app/apple-icon.png": 180,
        ROOT / "apps/mobile.pro/app/apple-icon.png": 180,
    }
    for dest, size in png_sizes.items():
        save_png(base.resize((size, size), Image.LANCZOS), dest)

    # 5) Favicons (ico)
    for dest in [
        ROOT / "apps/web/app/favicon.ico",
        ROOT / "apps/import.pro/app/favicon.ico",
        ROOT / "apps/mobile.pro/app/favicon.ico",
    ]:
        save_ico(base, dest)

    # 6) Android launcher bitmaps (padded to 2/3 canvas)
    classic = {"mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96, "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192}
    foreground = {"mipmap-mdpi": 108, "mipmap-hdpi": 162, "mipmap-xhdpi": 216, "mipmap-xxhdpi": 324, "mipmap-xxxhdpi": 432}
    res_root = ROOT / "apps/mobile.pro/android/app/src/main/res"
    for folder, size in classic.items():
        icon = padded(base, size, scale=2 / 3)
        for name in ["ic_launcher.png", "ic_launcher_round.png"]:
            save_png(icon, res_root / folder / name)
    for folder, size in foreground.items():
        icon = padded(base, size, scale=2 / 3)
        save_png(icon, res_root / folder / "ic_launcher_foreground.png")

    # 7) Adaptive icon XML helpers
    fg_xml = res_root / "drawable-v24/ic_launcher_foreground.xml"
    fg_xml_content = """
<bitmap xmlns:android=\"http://schemas.android.com/apk/res/android\"
    android:src=\"@mipmap/ic_launcher_foreground\"
    android:gravity=\"center\" />
""".strip()
    ensure_parent(fg_xml)
    fg_xml.write_text(fg_xml_content)
    print(f"xml -> {fg_xml}")

    bg_xml = res_root / "drawable/ic_launcher_background.xml"
    bg_xml_content = """
<?xml version=\"1.0\" encoding=\"utf-8\"?>
<vector xmlns:android=\"http://schemas.android.com/apk/res/android\"
    android:width=\"108dp\"
    android:height=\"108dp\"
    android:viewportHeight=\"108\"
    android:viewportWidth=\"108\">
    <path android:fillColor=\"#FFFFFFFF\" android:pathData=\"M0,0h108v108h-108z\" />
</vector>
""".strip()
    ensure_parent(bg_xml)
    bg_xml.write_text(bg_xml_content)
    print(f"xml -> {bg_xml}")

    # 8) Notification small icon (color TaskTrove mark on transparent bg)
    notif_canvas = 96
    notif_inner = 96  # keep full-size color mark like web/mobile assets
    notif = Image.new("RGBA", (notif_canvas, notif_canvas), (0, 0, 0, 0))
    glyph = base.resize((notif_inner, notif_inner), Image.LANCZOS)
    off = ((notif_canvas - notif_inner) // 2, (notif_canvas - notif_inner) // 2)
    notif.paste(glyph, off, glyph)
    save_png(notif, res_root / "drawable/ic_stat_tasktrove.png")

    print("done")


if __name__ == "__main__":
    main()
