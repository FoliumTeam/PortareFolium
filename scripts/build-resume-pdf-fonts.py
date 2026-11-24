# 이력서 PDF 글꼴 생성: Pretendard JP 정적 OTF → 부수·호환 한자 cmap 제거 → woff2
# 이유: 같은 모양을 쓰는 康熙 부수(U+2F00–) 대응이 남아 있으면 PDF 글자 추출이 부수 문자로 나옴
# 사용: python scripts/build-resume-pdf-fonts.py <Regular.otf> <Bold.otf>
# 필요: pip install fonttools brotli
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "resume-pdf-fonts"
DROP = [(0x2E80, 0x2FDF), (0xF900, 0xFAFF), (0x2F800, 0x2FA1F)]


def dropped(cp: int) -> bool:
    return any(lo <= cp <= hi for lo, hi in DROP)


def build(src: str) -> None:
    font = TTFont(src)
    removed = 0
    for table in font["cmap"].tables:
        if not table.isUnicode():
            continue
        for cp in [cp for cp in table.cmap if dropped(cp)]:
            del table.cmap[cp]
            removed += 1
    font.flavor = "woff2"
    out = OUT / (Path(src).stem + ".woff2")
    OUT.mkdir(parents=True, exist_ok=True)
    font.save(out)
    print(f"{out.name}: cmap {removed}개 제거, {out.stat().st_size} bytes")


if __name__ == "__main__":
    for path in sys.argv[1:]:
        build(path)
