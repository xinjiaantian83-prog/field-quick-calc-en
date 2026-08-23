from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "store-assets" / "raw-ios-web"

SCREENS = [
    ("01-fast-jobsite-calculator", "Fast Jobsite", "Calculator", "01-home.png"),
    ("02-slope-angle-pitch", "Slope, Angle", "& Pitch", "02-slope.png"),
    ("03-radius-arc-layout", "Radius & Arc", "Layout", "03-radius.png"),
    ("04-tapered-shape-checks", "Tapered Shape", "Checks", "04-tapered.png"),
    ("05-quick-stair-layout", "Quick Stair", "Layout", "05-stairs.png"),
    ("06-material-weight-notes", "Material Weight", "& Notes", "01-home.png"),
]

FONT_BOLD = "/System/Library/Fonts/HelveticaNeue.ttc"
BG = (2, 17, 13)
GRID = (10, 54, 42)
WHITE = (241, 250, 246)
GREEN = (27, 238, 148)
FRAME = (77, 93, 87)


def cover_background(width: int, height: int) -> Image.Image:
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)
    step = max(64, round(width / 13.4))
    for x in range(0, width + step, step):
        draw.line((x, 0, x, height), fill=GRID, width=max(1, width // 700))
    for y in range(0, height + step, step):
        draw.line((0, y, width, y), fill=GRID, width=max(1, width // 700))
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-width // 2, -height // 5, width, height // 2), fill=(0, 140, 80, 45))
    glow = glow.filter(ImageFilter.GaussianBlur(width // 6))
    return Image.alpha_composite(image.convert("RGBA"), glow)


def fit_font(text: str, max_width: int, start_size: int) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 40:
        font = ImageFont.truetype(FONT_BOLD, size, index=1)
        if font.getbbox(text)[2] <= max_width:
            return font
        size -= 2
    return ImageFont.truetype(FONT_BOLD, size, index=1)


def rounded_screen(source: Image.Image, width: int, radius: int) -> Image.Image:
    height = round(source.height * width / source.width)
    resized = source.resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", resized.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, height - 1), radius=radius, fill=255)
    resized.putalpha(mask)
    return resized


def build(target_dir: Path, width: int, height: int) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    margin = round(width * 0.075)
    badge_size = round(width * 0.073)
    headline_size = round(width * 0.104)
    headline_y = round(height * 0.083)
    phone_y = round(height * 0.248)
    phone_width = round(width * 0.82)
    frame_pad = round(width * 0.012)
    radius = round(width * 0.064)

    for index, (filename, line1, line2, source_name) in enumerate(SCREENS, start=1):
        canvas = cover_background(width, height)
        draw = ImageDraw.Draw(canvas)

        draw.rounded_rectangle(
            (margin, round(height * 0.032), margin + badge_size, round(height * 0.032) + badge_size),
            radius=round(badge_size * 0.13), outline=GREEN, width=max(3, width // 320)
        )
        number_font = ImageFont.truetype(FONT_BOLD, round(badge_size * 0.66), index=1)
        number_box = draw.textbbox((0, 0), str(index), font=number_font)
        nx = margin + (badge_size - (number_box[2] - number_box[0])) / 2
        ny = round(height * 0.032) + (badge_size - (number_box[3] - number_box[1])) / 2 - number_box[1]
        draw.text((nx, ny), str(index), font=number_font, fill=GREEN)

        font1 = fit_font(line1, width - 2 * margin, headline_size)
        font2 = fit_font(line2, width - 2 * margin, headline_size)
        draw.text((margin, headline_y), line1, font=font1, fill=WHITE)
        line_height = max(font1.getbbox(line1)[3], round(headline_size * 0.95))
        draw.text((margin, headline_y + line_height), line2, font=font2, fill=GREEN)

        source = Image.open(RAW / source_name)
        phone = rounded_screen(source, phone_width, radius - frame_pad)
        px = (width - phone_width) // 2

        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle(
            (px - frame_pad, phone_y - frame_pad, px + phone_width + frame_pad, phone_y + phone.height + frame_pad),
            radius=radius, fill=(0, 0, 0, 180)
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(round(width * 0.018)))
        canvas = Image.alpha_composite(canvas, shadow)
        draw = ImageDraw.Draw(canvas)
        draw.rounded_rectangle(
            (px - frame_pad, phone_y - frame_pad, px + phone_width + frame_pad, phone_y + phone.height + frame_pad),
            radius=radius, fill=FRAME
        )
        canvas.alpha_composite(phone, (px, phone_y))
        canvas.convert("RGB").save(target_dir / f"{filename}.png", "PNG", optimize=True)


if __name__ == "__main__":
    build(ROOT / "store-assets" / "ios-1284x2778", 1284, 2778)
    build(ROOT / "store-assets" / "android-1080x1920", 1080, 1920)
