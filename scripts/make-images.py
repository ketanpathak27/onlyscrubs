#!/usr/bin/env python3
"""Generate committed raster icons and the Open Graph image. Pure local fonts."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "client" / "static"
ICONS = OUT / "icons"
ICONS.mkdir(parents=True, exist_ok=True)

SANS = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
REGULAR = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"

TEAL = (12, 107, 104, 255)
TEAL_DEEP = (8, 58, 57, 255)
CREAM = (244, 247, 245, 255)
CORAL = (227, 106, 82, 255)
INK = (20, 36, 40, 255)
WHITE = (255, 255, 255, 255)


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if maskable:
        draw.rectangle((0, 0, size, size), fill=TEAL)
        pad = int(size * 0.18)
    else:
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=TEAL)
        pad = int(size * 0.16)
    # V-neck scrub mark
    cx, top, bot = size // 2, int(size * 0.34), int(size * 0.74)
    half = int(size * 0.22)
    neck = int(size * 0.07)
    draw.polygon(
        [
            (cx - half, top),
            (cx - neck, top + int(size * 0.1)),
            (cx, top + int(size * 0.16)),
            (cx + neck, top + int(size * 0.1)),
            (cx + half, top),
            (cx + half, bot),
            (cx - half, bot),
        ],
        fill=CREAM,
    )
    font = ImageFont.truetype(SANS, int(size * (0.16 if maskable else 0.18)))
    label = "OS"
    box = draw.textbbox((0, 0), label, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.text(((size - tw) / 2, bot - th * 0.15), label, font=font, fill=TEAL_DEEP)
    if not maskable:
        masked = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        masked.paste(img, (0, 0))
        img.putalpha(rounded_mask(size, int(size * 0.22)))
    return img


def og():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), TEAL_DEEP)
    draw = ImageDraw.Draw(img)
    draw.ellipse((860, -80, 1280, 340), fill=TEAL)
    draw.ellipse((-120, 380, 320, 820), fill=(14, 90, 87, 255))
    draw.rounded_rectangle((78, 78, 1122, 552), radius=42, fill=CREAM)
    draw.rounded_rectangle((118, 128, 198, 208), radius=18, fill=TEAL)
    small = ImageFont.truetype(SANS, 36)
    draw.text((132, 146), "OS", font=small, fill=WHITE)
    display = ImageFont.truetype(SERIF, 92)
    draw.text((118, 230), "OnlyScrubs", font=display, fill=INK)
    body = ImageFont.truetype(REGULAR, 36)
    draw.text((120, 360), "For Australian nurses, midwives,", font=body, fill=(40, 70, 74, 255))
    draw.text((120, 412), "students and night-shift survivors.", font=body, fill=(40, 70, 74, 255))
    draw.rounded_rectangle((120, 478, 168, 510), radius=8, fill=CORAL)
    return img.convert("RGB")


icon(192).save(ICONS / "icon-192.png")
icon(512).save(ICONS / "icon-512.png")
icon(512, maskable=True).save(ICONS / "icon-maskable-512.png")
icon(180).save(OUT / "apple-touch-icon.png")
og().save(OUT / "og.png", quality=90)
# Real ICO for browsers that request /favicon.ico
icon(32).save(OUT / "favicon.ico", sizes=[(32, 32)])
print("wrote icons and og image")
