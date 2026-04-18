"""Generate mobile app icons for PyPath. Run once: `python make_icon.py`."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

OUT = Path(__file__).parent / "icons"
OUT.mkdir(exist_ok=True)

# Brand palette — green PyPath
BG_TOP    = (124, 224, 160)  # mint green
BG_BOT    = (34, 139, 77)    # deep forest green
ACCENT    = (245, 200, 66)   # yellow accent
GLYPH_FG  = (255, 255, 255)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded square background with vertical gradient
    radius = int(size * 0.22)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    # paint gradient first
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        bg_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # mask to rounded rect
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=255)
    bg.putalpha(mask)
    img = Image.alpha_composite(img, bg)

    draw = ImageDraw.Draw(img)

    # Subtle glow blob behind text
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        [(size * 0.1, size * 0.1), (size * 0.9, size * 0.9)],
        fill=(255, 255, 255, 40),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.08))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Try to load a bold system font that includes emoji/unicode fallback
    def pick_font(px):
        candidates = [
            # Windows
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/seguiemj.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            # Generic
            "DejaVuSans-Bold.ttf",
            "Arial Bold.ttf",
        ]
        for p in candidates:
            try:
                return ImageFont.truetype(p, px)
            except (OSError, IOError):
                continue
        return ImageFont.load_default()

    # Main glyph — big "</>" style symbol. Using "Py" since the app is Python-focused.
    label = "Py"
    font = pick_font(int(size * 0.48))
    # Compute bounding box for centering
    bbox = draw.textbbox((0, 0), label, font=font, stroke_width=0)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1] - size * 0.02

    # Soft drop shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((tx + size * 0.015, ty + size * 0.02), label, font=font, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=size * 0.012))
    img = Image.alpha_composite(img, shadow)

    draw = ImageDraw.Draw(img)
    draw.text((tx, ty), label, font=font, fill=GLYPH_FG)

    # Small yellow accent dot bottom-right (the "cursor"/progress hint)
    dot = int(size * 0.085)
    cx = int(size * 0.78)
    cy = int(size * 0.78)
    draw.ellipse(
        [(cx - dot, cy - dot), (cx + dot, cy + dot)],
        fill=ACCENT,
    )

    return img


# Classic set of mobile icon sizes
sizes = [
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("apple-touch-icon.png", 180),
    ("favicon-32.png", 32),
    ("favicon-16.png", 16),
]

for filename, sz in sizes:
    icon = make_icon(sz)
    icon.save(OUT / filename, "PNG", optimize=True)
    print(f"wrote {filename} ({sz}x{sz})")

# Also save a maskable version (extra padding inside a safe zone) for PWAs
def make_maskable(size: int) -> Image.Image:
    # Put the icon artwork inside a 70% safe zone centered on a solid bg
    inner = int(size * 0.72)
    core = make_icon(inner)
    bg = Image.new("RGBA", (size, size), BG_TOP + (255,))
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        ImageDraw.Draw(bg).line([(0, y), (size, y)], fill=(r, g, b, 255))
    # paste core centered
    off = (size - inner) // 2
    bg.alpha_composite(core, (off, off))
    return bg


for filename, sz in [("icon-maskable-192.png", 192), ("icon-maskable-512.png", 512)]:
    icon = make_maskable(sz)
    icon.save(OUT / filename, "PNG", optimize=True)
    print(f"wrote {filename} ({sz}x{sz})")

print("done.")
