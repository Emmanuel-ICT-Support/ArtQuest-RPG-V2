from pathlib import Path
from statistics import median

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parents[1]
SOURCE_BASE = ROOT_DIR / "public/assets/door sequences"
OUTPUT_BASE = ROOT_DIR / "public/assets/door-sequences-normalized"
TARGET_SIZE = (1254, 1254)
DARK_BACKGROUND_THRESHOLD = 12
FINAL_EDGE_DARK_THRESHOLD = 30

SEQUENCES = {
    "Line sequence": [
        "Line closed.png",
        "line opening 1.png",
        "line opening 2.png",
        "line opening 3.png",
        "line opening 4.png",
        "line open.png",
    ],
    "colour sequence": [
        "colour closed.png",
        "colour opening 1.png",
        "colour opening 2.png",
        "colour opening 3.png",
        "colour opening 4.png",
        "colour open.png",
    ],
    "Shape sequence": [
        "Shape closed.png",
        "shape opening 1.png",
        "shape opening 2.png",
        "shape opening 3.png",
        "shape opening 4.png",
        "Shape open.png",
    ],
    "Texture sequence": [
        "texture closed.png",
        "texture opening 1.png",
        "texture opening 2.png",
        "texture opening 3.png",
        "texture opening 4.png",
        "texture open.png",
    ],
    "space sequence": [
        "Space closed.png",
        "space opening 1.png",
        "space opening 2.png",
        "space opening 3.png",
        "space opening 4.png",
        "Space open.png",
    ],
    "Value sequence": [
        "value closed.png",
        "value opening 1.png",
        "value opening 2.png",
        "value opening 3.png",
        "value opening 4.png",
        "value open.png",
    ],
    "Balance sequence": [
        "balance closed.png",
        "balance opening 1.png",
        "balance opening 2.png",
        "balance opening 3.png",
        "balance opening 4.png",
        "balance open.png",
    ],
    "Emphasis sequence": [
        "emphasis closed.png",
        "emphasis opening 1.png",
        "emphasis opening 2.png",
        "emphasis opening 3.png",
        "emphasis opening 4.png",
        "emphasis open.png",
    ],
    "Unity sequence": [
        "Unity closed.png",
        "unity opening 1.png",
        "unity opening 2.png",
        "unity opening 3.png",
        "unity opening 4.png",
        "Unity open.png",
    ],
    "Pattern Sequence": [
        "pattern closed.png",
        "pattern opening 1.png",
        "pattern opening 2.png",
        "pattern opening 3.png",
        "pattern opening 4.png",
        "pattern open.png",
    ],
    "Movement sequence": [
        "movement closed.png",
        "movement opening 1.png",
        "movement opening 2.png",
        "movement opening 3.png",
        "movement opening 4.png",
        "movement open.png",
    ],
    "Final room sequence": [
        "final room closed.png",
        "final room opening 1.png",
        "final room opening 2.png",
        "final room opening 3.png",
        "final room opening 4.png",
        "final room open.png",
    ],
}


def visible_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    min_x, min_y, max_x, max_y = width, height, -1, -1

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 8 and max(red, green, blue) > 18:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x:
        return (0, 0, width, height)

    return (min_x, min_y, max_x + 1, max_y + 1)


def strip_connected_dark_background(image: Image.Image, threshold: int = DARK_BACKGROUND_THRESHOLD) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    stack: list[tuple[int, int]] = []
    seen: set[tuple[int, int]] = set()

    def is_dark_background_pixel(x: int, y: int) -> bool:
        red, green, blue, alpha = pixels[x, y]
        return alpha > 0 and max(red, green, blue) <= threshold

    for x in range(width):
        if is_dark_background_pixel(x, 0):
            stack.append((x, 0))
        if is_dark_background_pixel(x, height - 1):
            stack.append((x, height - 1))

    for y in range(height):
        if is_dark_background_pixel(0, y):
            stack.append((0, y))
        if is_dark_background_pixel(width - 1, y):
            stack.append((width - 1, y))

    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not is_dark_background_pixel(x, y):
            continue

        seen.add((x, y))
        pixels[x, y] = (0, 0, 0, 0)

        if x > 0:
            stack.append((x - 1, y))
        if x < width - 1:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y < height - 1:
            stack.append((x, y + 1))

    return rgba


def normalize_frame(image: Image.Image, target_box: tuple[int, int, int, int]) -> Image.Image:
    rgba = strip_connected_dark_background(image)
    bbox = visible_bbox(rgba)
    bbox_width = bbox[2] - bbox[0]
    bbox_height = bbox[3] - bbox[1]
    target_width = target_box[2] - target_box[0]
    target_height = target_box[3] - target_box[1]
    scale = min(target_width / bbox_width, target_height / bbox_height)

    resized_width = round(rgba.width * scale)
    resized_height = round(rgba.height * scale)
    resized = rgba.resize((resized_width, resized_height), Image.Resampling.LANCZOS)

    scaled_bbox = tuple(round(value * scale) for value in bbox)
    target_center_x = (target_box[0] + target_box[2]) / 2
    target_center_y = (target_box[1] + target_box[3]) / 2
    source_center_x = (scaled_bbox[0] + scaled_bbox[2]) / 2
    source_center_y = (scaled_bbox[1] + scaled_bbox[3]) / 2

    canvas = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        (
            round(target_center_x - source_center_x),
            round(target_center_y - source_center_y),
        ),
    )
    return strip_connected_dark_background(canvas, FINAL_EDGE_DARK_THRESHOLD)


def normalize_sequence(sequence_name: str, frame_names: list[str]) -> None:
    source_dir = SOURCE_BASE / sequence_name
    output_dir = OUTPUT_BASE / sequence_name
    output_dir.mkdir(parents=True, exist_ok=True)

    frames = [strip_connected_dark_background(Image.open(source_dir / frame_name)) for frame_name in frame_names]
    boxes = [visible_bbox(frame) for frame in frames]
    target_width = round(median(box[2] - box[0] for box in boxes))
    target_height = round(median(box[3] - box[1] for box in boxes))
    target_box = (
        (TARGET_SIZE[0] - target_width) // 2,
        (TARGET_SIZE[1] - target_height) // 2,
        (TARGET_SIZE[0] + target_width) // 2,
        (TARGET_SIZE[1] + target_height) // 2,
    )

    for frame, frame_name in zip(frames, frame_names):
        normalize_frame(frame, target_box).save(output_dir / frame_name)


def main() -> None:
    for sequence_name, frame_names in SEQUENCES.items():
        normalize_sequence(sequence_name, frame_names)


if __name__ == "__main__":
    main()
