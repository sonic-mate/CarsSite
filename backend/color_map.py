"""
Normalize raw auction color strings (English/Japanese codes) to Russian.
"""
import re

_MAP: list[tuple[list[str], str]] = [
    (["WHITE PEARL", "PEARL WHITE", "WHITE P", "WH/P", "W/P", "パールホワイト", "PEARL "], "Белый перламутр"),
    (["WHITE", "БЕЛЫЙ", "WH", "W ", " W", "^W$"], "Белый"),
    (["^PEARL$", "PEARL2", "PEARL 2"], "Белый перламутр"),
    (["BLACK", "ЧЕРНЫЙ", "BK", "^B$", "BLK"], "Чёрный"),
    (["SILVER METALLIC", "SILVER MET", "S/M", "SIL MET"], "Серебристый металлик"),
    (["SILVER", "СЕРЫЙ", "SIL", "^S$"], "Серебристый"),
    (["GRAY METALLIC", "GREY METALLIC", "GR MET", "G/M"], "Серый металлик"),
    (["DARK GRAY", "DARK GREY", "GRAPHITE", "CHARCOAL"], "Тёмно-серый"),
    (["GRAY", "GREY", "^GR$", "^G$"], "Серый"),
    (["DARK BLUE", "NAVY", "ТЕМНО-СИНИЙ", "^CON$", "CON "], "Тёмно-синий"),
    (["BLUE METALLIC", "BL MET", "BL/M"], "Синий металлик"),
    (["BLUE", "СИНИЙ", "^BL$", "^B/B$"], "Синий"),
    (["RED METALLIC", "R/M", "RED MET"], "Красный металлик"),
    (["DARK RED", "MAROON", "BURGUNDY", "WINE"], "Бордовый"),
    (["RED", "КРАСНЫЙ", "^R$"], "Красный"),
    (["GREEN METALLIC", "GR/M", "GREEN MET"], "Зелёный металлик"),
    (["DARK GREEN"], "Тёмно-зелёный"),
    (["GREEN", "ЗЕЛЕНЫЙ", "^GR$"], "Зелёный"),
    (["BEIGE", "CREAM", "IVORY", "БЕЖЕВЫЙ"], "Бежевый"),
    (["BROWN", "BRONZE", "КОРИЧНЕВЫЙ"], "Коричневый"),
    (["GOLD", "ЗОЛОТОЙ"], "Золотистый"),
    (["CHAMPAGNE"], "Шампань"),
    (["ORANGE", "ОРАНЖЕВЫЙ"], "Оранжевый"),
    (["YELLOW", "ЖЕЛТЫЙ", "^Y$"], "Жёлтый"),
    (["PINK", "РОЗОВЫЙ"], "Розовый"),
    (["PURPLE", "VIOLET", "ФИОЛЕТОВЫЙ"], "Фиолетовый"),
    (["TURQUOISE", "TEAL"], "Бирюзовый"),
    (["LIGHT BLUE", "SKY BLUE"], "Голубой"),
    (["TWO TONE", "2-TONE", "2TONE", "TWO-TONE"], "Двухцветный"),
]

def normalize(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip().upper()
    if not s:
        return None

    for keys, ru in _MAP:
        for k in keys:
            # treat keys starting/ending with ^ or $ as regex, else substring
            if k.startswith("^") or k.endswith("$"):
                if re.fullmatch(k.strip("^$"), s):
                    return ru
            else:
                if k.upper() in s:
                    return ru

    # return original stripped if no match — better than None
    return raw.strip()
