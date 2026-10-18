"""Bake Traditional Chinese signs with a user-supplied, legally usable CJK font.

Needs Pillow and fontTools. Font is used locally, never copied into the game.
Fails on missing glyphs instead of baking replacement squares into signs.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'unity/TaipeiDrive/Assets/Generated/Source'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--font', type=Path, required=True, help='CJK TTF/OTF/TTC font path')
    args = parser.parse_args()
    data = json.loads((SOURCE / 'streetfront.json').read_text())
    face = TTFont(str(args.font), fontNumber=0)
    supported = set().union(*(set(t.cmap) for t in face['cmap'].tables if t.isUnicode()))
    for style in data['styles']:
        colors = {p['name']: p['color'] for p in style['palette']}
        for sign in style['signs']:
            text = sign['text']
            missing = [c for c in text if ord(c) not in supported]
            if missing:
                raise ValueError('Font lacks glyphs: ' + ''.join(missing))
            vertical = sign['id'] == 'vertical'
            width, height = (192, 512) if vertical else (1024, 128)
            image = Image.new('RGB', (width, height), colors['signBg'])
            draw = ImageDraw.Draw(image)
            draw.rectangle((4, 4, width - 5, height - 5), outline=colors['signText'], width=3)
            size = 96
            while size > 10:
                font = ImageFont.truetype(str(args.font), size)
                box = draw.textbbox((0, 0), text, font=font)
                if vertical or box[2] - box[0] < width - 48:
                    break
                size -= 2
            if vertical:
                for i, c in enumerate(text):
                    draw.text((width / 2, height * (i + .5) / len(text)), c, font=font,
                              fill=colors['signText'], anchor='mm')
            else:
                draw.text((width / 2, height / 2), text, font=font, fill=colors['signText'], anchor='mm')
            image.save(SOURCE / (style['style'] + '_' + sign['id'] + '.png'))
    face.close()
    print('Baked six Traditional Chinese sign textures.')


if __name__ == '__main__':
    main()
