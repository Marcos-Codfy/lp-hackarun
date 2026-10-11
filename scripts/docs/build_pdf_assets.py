# gera os assets estáticos dos PDFs: fontes da marca em TTF (o pdfkit não lê woff2 variável) e logos menores
# uso: python scripts/docs/build_pdf_assets.py   (precisa de fonttools, brotli e Pillow)
# rode de novo só se as fontes ou os logos oficiais mudarem; a saída fica versionada em scripts/docs/assets
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scripts/docs/assets"
FONTSOURCE = ROOT / "node_modules/@fontsource-variable"

# (arquivo de saída, fonte variável, peso, família, estilo)
FONTS = [
    # orbitron com o til corrigido (scripts/fonts/patch_orbitron_tilde.py), a mesma do site
    ("orbitron-800.ttf", ROOT / "src/assets/fonts/orbitron-pt-latin-wght.woff2", 800, "Orbitron", "ExtraBold"),
    ("montserrat-400.ttf", FONTSOURCE / "montserrat/files/montserrat-latin-wght-normal.woff2", 400, "Montserrat", "Regular"),
    ("montserrat-700.ttf", FONTSOURCE / "montserrat/files/montserrat-latin-wght-normal.woff2", 700, "Montserrat", "Bold"),
    ("jetbrains-mono-500.ttf", FONTSOURCE / "jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", 500, "JetBrains Mono", "Medium"),
]

# (saída, origem, largura máxima): o pdfkit embute o png inteiro, então reduz antes
IMAGES = [
    ("hackarun-logo.png", ROOT / "src/assets/brand/hackarun-logo.png", 800),
    ("unicatolica-white.png", ROOT / "src/assets/brand/unicatolica-white.png", 360),
    ("capim-dourado-white.png", ROOT / "src/assets/brand/capim-dourado-white.png", 420),
]


def rename(font: TTFont, family: str, style: str) -> None:
    # nome próprio por instância: o pdfkit deduplica fontes com a mesma tabela name
    full = f"{family} {style}"
    postscript = f"{family.replace(' ', '')}-{style}"
    table = font["name"]
    for name_id, value in ((1, full), (2, "Regular"), (4, full), (6, postscript), (16, family), (17, style)):
        table.setName(value, name_id, 3, 1, 0x409)


def build_font(out: str, src: Path, weight: int, family: str, style: str) -> None:
    font = TTFont(src)
    static = instantiateVariableFont(font, {"wght": weight})
    rename(static, family, style)
    static.flavor = None
    static.save(OUT / out)


def build_image(out: str, src: Path, max_width: int) -> None:
    image = Image.open(src).convert("RGBA")
    if image.width > max_width:
        height = round(image.height * max_width / image.width)
        image = image.resize((max_width, height), Image.LANCZOS)
    image.save(OUT / out, optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in FONTS:
        build_font(*spec)
    for spec in IMAGES:
        build_image(*spec)
    for f in sorted(OUT.iterdir()):
        print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
