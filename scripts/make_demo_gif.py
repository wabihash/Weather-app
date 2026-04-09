from PIL import Image, ImageDraw

paths = [
    "assets/screenshots/desktop-home.png",
    "assets/screenshots/forecast-focus.png",
    "assets/screenshots/mobile-panel.png",
]
labels = [
    "Search + Current Weather",
    "5-Day Forecast + AQI",
    "Mobile-Friendly Experience",
]

frames = []
hold_frames = 12
transition_frames = 5

processed = []
for path, label in zip(paths, labels):
    image = Image.open(path).convert("RGB")
    target_width = 960
    ratio = target_width / image.width
    image = image.resize((target_width, int(image.height * ratio)))

    title_band = Image.new("RGB", (image.width, 80), (9, 18, 34))
    draw = ImageDraw.Draw(title_band)
    draw.text((24, 24), f"SkyCast Demo - {label}", fill=(235, 245, 255))

    composed = Image.new("RGB", (image.width, image.height + 80), (9, 18, 34))
    composed.paste(title_band, (0, 0))
    composed.paste(image, (0, 80))
    processed.append(composed)

max_width = max(frame.width for frame in processed)
max_height = max(frame.height for frame in processed)
normalized = []
for frame in processed:
    canvas = Image.new("RGB", (max_width, max_height), (9, 18, 34))
    x = (max_width - frame.width) // 2
    y = (max_height - frame.height) // 2
    canvas.paste(frame, (x, y))
    normalized.append(canvas)

processed = normalized

for frame in processed:
    for _ in range(hold_frames):
        frames.append(frame.copy())

for index in range(len(processed) - 1):
    current_frame = processed[index]
    next_frame = processed[index + 1]
    for step in range(1, transition_frames + 1):
        alpha = step / (transition_frames + 1)
        frames.append(Image.blend(current_frame, next_frame, alpha))

output = "assets/screenshots/skycast-demo.gif"
frames[0].save(
    output,
    save_all=True,
    append_images=frames[1:],
    duration=140,
    loop=0,
    optimize=True,
)

print(output)
