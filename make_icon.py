"""Generate mobile app icons for PyPath. Run once: `python make_icon.py`."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

OUT = Path(__file__).parent / "icons"
OUT.mkdir(exist_ok=True)

# Brand palette — green PyPath
BG_TOP = (124, 224, 160)  # mint green
BG_BOT = (34, 139, 77)    # deep forest green


def _blob(size, fill, cx, cy, rx, ry):
    """Draw a single soft ellipse with antialiasing via supersampling."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry], fill=fill
    )
    return layer


def _load_emoji_font(px):
    """Pick a system color-emoji font, largest first."""
    candidates = [
        "C:/Windows/Fonts/seguiemj.ttf",     # Windows color emoji
        "/System/Library/Fonts/Apple Color Emoji.ttc",  # macOS
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",  # Linux (Noto)
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, px)
        except (OSError, IOError):
            continue
    return None


def draw_snake_emoji(img: Image.Image, size: int) -> None:
    """Render the 🐍 emoji (same glyph used in the app's path-hero) centered on img."""
    # Segoe UI Emoji bitmap strikes come in discrete sizes; 109 is the largest
    # built-in strike. Load at that size then downscale to the target icon size.
    STRIKE = 109
    emoji_font = _load_emoji_font(STRIKE)
    if emoji_font is None:
        raise RuntimeError("No color emoji font found; cannot render 🐍.")

    # Render at the strike size to a transparent square, then resize.
    strike_size = STRIKE * 5  # generous pad so antialiased edges aren't clipped
    glyph = Image.new("RGBA", (strike_size, strike_size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glyph)
    try:
        bbox = gd.textbbox((0, 0), "🐍", font=emoji_font, embedded_color=True)
    except TypeError:
        bbox = gd.textbbox((0, 0), "🐍", font=emoji_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (strike_size - tw) / 2 - bbox[0]
    ty = (strike_size - th) / 2 - bbox[1]
    try:
        gd.text((tx, ty), "🐍", font=emoji_font, embedded_color=True)
    except TypeError:
        gd.text((tx, ty), "🐍", font=emoji_font)

    # Trim to glyph bounds for a tighter resize
    alpha = glyph.split()[-1]
    ab = alpha.getbbox()
    if ab:
        glyph = glyph.crop(ab)

    # Scale snake to ~74% of icon width, preserving aspect
    target_w = int(size * 0.74)
    ratio = target_w / glyph.width
    target_h = int(glyph.height * ratio)
    glyph = glyph.resize((target_w, target_h), Image.LANCZOS)

    # Soft drop shadow behind the snake for depth on the green bg
    shadow = Image.new("RGBA", glyph.size, (0, 0, 0, 0))
    shadow_from_alpha = glyph.split()[-1].point(lambda a: int(a * 0.55))
    shadow.putalpha(shadow_from_alpha)
    # Recolor shadow to solid dark
    dark = Image.new("RGBA", glyph.size, (0, 0, 0, 255))
    dark.putalpha(shadow_from_alpha)
    blurred = dark.filter(ImageFilter.GaussianBlur(radius=size * 0.02))

    # Place on the icon, centered with a slight vertical lift (optical centering)
    ox = (size - glyph.width) // 2
    oy = (size - glyph.height) // 2 - int(size * 0.015)

    img.alpha_composite(blurred, (ox + int(size * 0.01), oy + int(size * 0.02)))
    img.alpha_composite(glyph,   (ox, oy))


def draw_snake(img: Image.Image, size: int) -> None:
    """Paint a stylized coiled snake. Head top-left, body curves down and right, tapered tail."""
    s = size  # shorthand

    # Cubic bezier from just-below-head down to bottom-right tail, passing through a
    # leftward then rightward control point to produce a clean S-swoop.
    # Coordinates in icon space (0,0 top-left → size,size bottom-right).
    p0 = (s * 0.42, s * 0.34)   # body anchor just below the head
    p1 = (s * 0.82, s * 0.36)   # control: pull to the upper right
    p2 = (s * 0.18, s * 0.78)   # control: pull to the lower left (creates S)
    p3 = (s * 0.72, s * 0.82)   # tail: lower-right, pointing off-screen

    # Render the body by stepping along the curve and stamping circles with a taper.
    # Head-end (t=0) is thick; tail-end (t=1) tapers to a point.
    body_thick = s * 0.18
    tail_thick = s * 0.028
    steps = 300

    draw = ImageDraw.Draw(img)
    for i in range(steps):
        t = i / (steps - 1)
        x, y = _bezier_point(p0, p1, p2, p3, t)
        # Ease-out taper so most of the body stays thick, quickly thinning at the tail
        thick = body_thick + (tail_thick - body_thick) * (t ** 1.8)
        r = thick / 2
        draw.ellipse([x - r, y - r, x + r, y + r], fill=BODY)

    # ---- HEAD ----
    # Centered above p0, slightly left-leaning (the classic cobra angle).
    head_cx = s * 0.38
    head_cy = s * 0.26
    head_w  = s * 0.175
    head_h  = s * 0.14

    # Soft shadow under the head (gives it depth against the body)
    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse(
        [head_cx - head_w + s * 0.012, head_cy - head_h + s * 0.022,
         head_cx + head_w + s * 0.012, head_cy + head_h + s * 0.022],
        fill=(0, 0, 0, 90),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=s * 0.02))
    img.alpha_composite(shadow)

    draw = ImageDraw.Draw(img)
    draw.ellipse(
        [head_cx - head_w, head_cy - head_h,
         head_cx + head_w, head_cy + head_h],
        fill=BODY,
    )

    # Darker belly shading on the underside of the head for form
    shade = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shade).ellipse(
        [head_cx - head_w * 0.85, head_cy + head_h * 0.1,
         head_cx + head_w * 0.85, head_cy + head_h * 1.05],
        fill=BODY_DARK + (140,),
    )
    shade = shade.filter(ImageFilter.GaussianBlur(radius=s * 0.012))
    img.alpha_composite(shade)

    draw = ImageDraw.Draw(img)

    # ---- TONGUE (draw before eye so eye sits on top) ----
    # Tongue exits the LEFT side of the head (snake looks left)
    tongue_start = (head_cx - head_w * 0.85, head_cy + head_h * 0.05)
    tongue_end   = (head_cx - head_w * 1.75, head_cy - head_h * 0.05)
    tongue_thick = max(2, int(s * 0.018))
    # Stem
    draw.line([tongue_start, tongue_end], fill=TONGUE, width=tongue_thick)
    # Forks
    fork = s * 0.05
    draw.line(
        [tongue_end, (tongue_end[0] - fork * 0.9, tongue_end[1] - fork * 0.55)],
        fill=TONGUE, width=max(2, tongue_thick - 1),
    )
    draw.line(
        [tongue_end, (tongue_end[0] - fork * 0.9, tongue_end[1] + fork * 0.55)],
        fill=TONGUE, width=max(2, tongue_thick - 1),
    )

    # ---- EYE ----
    eye_r = head_w * 0.22
    # Looking left (toward the tongue)
    ex = head_cx - head_w * 0.3
    ey = head_cy - head_h * 0.25
    draw.ellipse([ex - eye_r, ey - eye_r, ex + eye_r, ey + eye_r], fill=EYE)
    # White highlight
    hl_r = eye_r * 0.38
    hx  = ex - eye_r * 0.25
    hy  = ey - eye_r * 0.3
    draw.ellipse([hx - hl_r, hy - hl_r, hx + hl_r, hy + hl_r], fill=(255, 255, 255, 255))


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Rounded square background with vertical gradient
    radius = int(size * 0.22)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        bg_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size - 1, size - 1)], radius=radius, fill=255
    )
    bg.putalpha(mask)
    img = Image.alpha_composite(img, bg)

    # Soft radial glow behind the snake
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [(size * 0.12, size * 0.12), (size * 0.88, size * 0.88)],
        fill=(255, 255, 255, 36),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.09))
    img = Image.alpha_composite(img, glow)

    # Draw the snake (uses the same 🐍 emoji as the app's hero banner)
    draw_snake_emoji(img, size)

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
