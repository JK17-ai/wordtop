"""Run with fonttools and brotli installed when banner copy changes.
Original OFL and copyright remain in public/fonts/NanumBrushScript-OFL.txt.
The subset has a distinct family name because the original reserves its name.
"""
from pathlib import Path
import re
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
text = (root / 'src/components/motivationData.js').read_text(encoding='utf-8')
titles = ''.join(re.findall(r"title:'([^']+)'", text))
font = TTFont(root / 'public/fonts/NanumBrushScript-Regular.ttf')
options = subset.Options()
options.flavor = 'woff2'
options.name_IDs = ['*']
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=titles + ' 0123456789.,!?')
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in (1, 3, 4, 6, 16):
        record.string = 'MoaBrushSubset'.encode(record.getEncoding())
font.flavor = 'woff2'
output = root / 'public/fonts/MoaBrushSubset.woff2'
font.save(output)
check = TTFont(output)
assert all(ord(char) in check.getBestCmap() for char in titles)
print(f'Banner font: {output.stat().st_size} bytes; all title glyphs present')
