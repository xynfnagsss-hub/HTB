from PIL import Image, ImageDraw, ImageFont
import os

base = r'c:\Users\Old man\HTB Bot\public'
os.makedirs(base, exist_ok=True)

# create logo matching the provided black-and-white circular mockup
logo = Image.new('RGBA', (1024, 1024), (0, 0, 0, 255))
d = ImageDraw.Draw(logo)
for ring in range(470, 10, -24):
    d.ellipse((512 - ring, 512 - ring, 512 + ring, 512 + ring), outline=(255, 255, 255, 255), width=2)
d.ellipse((60, 60, 964, 964), outline=(255, 255, 255, 255), width=10)
# gray silhouette inner mass
for box in [(250, 420, 774, 720), (320, 260, 704, 520), (300, 520, 724, 770)]:
    d.ellipse(box, fill=(120, 120, 120, 220))
try:
    title_font = ImageFont.truetype('arial.ttf', 150)
    subtitle_font = ImageFont.truetype('arial.ttf', 28)
except Exception:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
d.text((512, 500), 'TNM', anchor='mm', fill=(255, 255, 255, 255), font=title_font)
d.text((512, 590), 'TRUST NO MOB', anchor='mm', fill=(230, 230, 230, 230), font=subtitle_font)
d.rounded_rectangle((300, 630, 724, 654), radius=4, fill=(255, 255, 255, 255))
logo.save(os.path.join(base, 'logo.png'))

# create ticket banner matching the circular TNM branding and save as JPG
banner = Image.new('RGBA', (1600, 900), (8, 8, 10, 255))
db = ImageDraw.Draw(banner)
for r in range(700, 70, -60):
    db.ellipse((800 - r, 450 - r, 800 + r, 450 + r), outline=(255, 255, 255, 140), width=2)
db.ellipse((70, -10, 1530, 910), outline=(255, 255, 255, 255), width=8)
for shape in [(520, 270, 1080, 740), (620, 330, 980, 700), (470, 480, 1130, 790)]:
    db.ellipse(shape, fill=(100, 100, 100, 220))
try:
    banner_title_font = ImageFont.truetype('arial.ttf', 180)
    banner_sub_font = ImageFont.truetype('arial.ttf', 54)
except Exception:
    banner_title_font = ImageFont.load_default()
    banner_sub_font = ImageFont.load_default()
db.text((800, 470), 'TNM', anchor='mm', fill=(255, 255, 255, 255), font=banner_title_font)
db.text((800, 590), 'TRUST NO MOB', anchor='mm', fill=(230, 230, 230, 230), font=banner_sub_font)
db.rounded_rectangle((420, 640, 1180, 670), radius=4, fill=(255, 255, 255, 255))
banner.convert('RGB').save(os.path.join(base, 'ticket_banner.jpg'))

print('created logo and ticket banner from script')
