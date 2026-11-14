"""Junior Astronaut certificate PDF (ReportLab, drawn with vector shapes — no external images)."""
import io
import math
import random
from datetime import datetime

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

NAVY = HexColor("#101C3D")
NAVY_2 = HexColor("#1B2B5C")
PURPLE = HexColor("#C99BFA")
BLUE = HexColor("#66CDEB")
YELLOW = HexColor("#FFCB69")
PINK = HexColor("#FFB8D0")
MINT = HexColor("#A8E6CF")


def _star(c: canvas.Canvas, x: float, y: float, r: float, color) -> None:
    p = c.beginPath()
    for i in range(10):
        ang = math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.45
        px, py = x + rad * math.cos(ang), y + rad * math.sin(ang)
        p.moveTo(px, py) if i == 0 else p.lineTo(px, py)
    p.close()
    c.setFillColor(color)
    c.drawPath(p, stroke=0, fill=1)


def _planet(c, x, y, r, color, ring=None):
    c.setFillColor(color)
    c.circle(x, y, r, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFillAlpha(0.25)
    c.circle(x - r * 0.35, y + r * 0.35, r * 0.35, stroke=0, fill=1)
    c.setFillAlpha(1)
    if ring:
        c.saveState()
        c.translate(x, y)
        c.rotate(-15)
        c.setStrokeColor(ring)
        c.setLineWidth(3)
        c.ellipse(-r * 1.8, -r * 0.45, r * 1.8, r * 0.45, stroke=1, fill=0)
        c.restoreState()


def _rocket(c, x, y, s=1.0):
    c.saveState()
    c.translate(x, y)
    c.scale(s, s)
    c.rotate(-25)
    # flame
    c.setFillColor(YELLOW)
    p = c.beginPath(); p.moveTo(-10, -40); p.lineTo(0, -75); p.lineTo(10, -40); p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.setFillColor(HexColor("#FF8A65"))
    p = c.beginPath(); p.moveTo(-6, -40); p.lineTo(0, -60); p.lineTo(6, -40); p.close()
    c.drawPath(p, stroke=0, fill=1)
    # fins
    c.setFillColor(PINK)
    p = c.beginPath(); p.moveTo(-16, -10); p.lineTo(-30, -42); p.lineTo(-16, -36); p.close()
    c.drawPath(p, stroke=0, fill=1)
    p = c.beginPath(); p.moveTo(16, -10); p.lineTo(30, -42); p.lineTo(16, -36); p.close()
    c.drawPath(p, stroke=0, fill=1)
    # body
    c.setFillColor(white)
    c.roundRect(-16, -40, 32, 70, 10, stroke=0, fill=1)
    # nose
    c.setFillColor(PINK)
    p = c.beginPath(); p.moveTo(-16, 28); p.curveTo(-14, 50, -4, 62, 0, 66)
    p.curveTo(4, 62, 14, 50, 16, 28); p.close()
    c.drawPath(p, stroke=0, fill=1)
    # window
    c.setFillColor(BLUE); c.setStrokeColor(NAVY); c.setLineWidth(3)
    c.circle(0, 8, 8, stroke=1, fill=1)
    c.restoreState()


def build_certificate_pdf(nickname: str, level_name: str, total_xp: int, issued_at: datetime,
                          certificate_code: str, missions_completed: int) -> bytes:
    buf = io.BytesIO()
    w, h = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(w, h))
    c.setTitle(f"Junior Astronaut Certificate - {nickname}")
    c.setAuthor("AstroKids Academy")

    # Background with soft vertical bands (gradient look)
    steps = 40
    for i in range(steps):
        t = i / steps
        r = 0x10 + (0x2A - 0x10) * t
        g = 0x1C + (0x1F - 0x1C) * t
        b = 0x3D + (0x5E - 0x3D) * t
        c.setFillColorRGB(r / 255, g / 255, b / 255)
        c.rect(0, h * i / steps, w, h / steps + 1, stroke=0, fill=1)

    rnd = random.Random(certificate_code)
    for _ in range(90):
        c.setFillColor(white)
        c.setFillAlpha(rnd.uniform(0.3, 0.9))
        c.circle(rnd.uniform(0, w), rnd.uniform(0, h), rnd.uniform(0.5, 1.8), stroke=0, fill=1)
    c.setFillAlpha(1)

    # Decorations
    _planet(c, 70, h - 80, 34, PURPLE, ring=YELLOW)
    _planet(c, w - 78, 80, 34, BLUE, ring=PINK)
    _planet(c, w - 60, h - 150, 16, MINT)
    _planet(c, 110, 150, 20, PINK)
    _rocket(c, w - 92, h - 84, 0.72)
    for (sx, sy, sr, col) in [(170, h - 60, 9, YELLOW), (w - 200, 60, 8, YELLOW), (60, 260, 7, PINK),
                              (w - 40, 260, 7, MINT), (w / 2 - 260, 70, 6, BLUE), (w / 2 + 260, h - 45, 7, PURPLE)]:
        _star(c, sx, sy, sr, col)

    # Card
    m = 46
    c.setFillColor(white)
    c.setFillAlpha(0.06)
    c.roundRect(m, m, w - 2 * m, h - 2 * m, 26, stroke=0, fill=1)
    c.setFillAlpha(1)
    c.setStrokeColor(YELLOW); c.setLineWidth(4)
    c.roundRect(m, m, w - 2 * m, h - 2 * m, 26, stroke=1, fill=0)
    c.setStrokeColor(PURPLE); c.setLineWidth(1.5)
    c.roundRect(m + 10, m + 10, w - 2 * m - 20, h - 2 * m - 20, 20, stroke=1, fill=0)

    cx = w / 2
    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(cx, h - 100, "ASTROKIDS ACADEMY  •  JUNIOR ASTRONAUT MISSION TRAINER")
    c.setFillColor(YELLOW)
    c.setFont("Helvetica-Bold", 40)
    c.drawCentredString(cx, h - 150, "Junior Astronaut Certificate")
    c.setFillColor(white)
    c.setFont("Helvetica", 16)
    c.drawCentredString(cx, h - 190, "This certificate is proudly awarded to")

    c.setFillColor(PINK)
    c.setFont("Helvetica-Bold", 46)
    c.drawCentredString(cx, h - 250, nickname[:30])
    c.setStrokeColor(PINK); c.setLineWidth(2)
    c.line(cx - 200, h - 262, cx + 200, h - 262)

    c.setFillColor(white)
    c.setFont("Helvetica", 15)
    c.drawCentredString(cx, h - 295, f"for successfully completing all {missions_completed} astronaut training missions")
    c.drawCentredString(cx, h - 316, "and showing the curiosity, courage and teamwork of a true space explorer!")

    # Stat pills
    pills = [("TRAINING LEVEL", level_name, PURPLE), ("TOTAL XP", f"{total_xp:,} XP", YELLOW),
             ("COMPLETED ON", issued_at.strftime("%d %B %Y"), MINT)]
    pw, ph, gap = 190, 54, 24
    x0 = cx - (3 * pw + 2 * gap) / 2
    for i, (label, value, col) in enumerate(pills):
        x = x0 + i * (pw + gap)
        y = h - 400
        c.setFillColor(NAVY_2)
        c.roundRect(x, y, pw, ph, 16, stroke=0, fill=1)
        c.setStrokeColor(col); c.setLineWidth(2)
        c.roundRect(x, y, pw, ph, 16, stroke=1, fill=0)
        c.setFillColor(col); c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(x + pw / 2, y + ph - 18, label)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 15)
        c.drawCentredString(x + pw / 2, y + 13, value)

    # Signatures
    c.setStrokeColor(BLUE); c.setLineWidth(1)
    c.line(cx - 290, 112, cx - 110, 112)
    c.line(cx + 110, 112, cx + 290, 112)
    c.setFillColor(white); c.setFont("Helvetica-Oblique", 14)
    c.drawCentredString(cx - 200, 120, "AstroBot")
    c.drawCentredString(cx + 200, 120, "Commander Nova")
    c.setFont("Helvetica", 10); c.setFillColor(BLUE)
    c.drawCentredString(cx - 200, 98, "Chief Training Robot")
    c.drawCentredString(cx + 200, 98, "Academy Director")

    # Medal
    _star(c, cx, 115, 30, YELLOW)
    c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(cx, 110, "JR")

    c.setFillColor(HexColor("#8EA2D8")); c.setFont("Helvetica", 7.5)
    c.drawCentredString(cx, 66, f"Certificate code {certificate_code}  •  A fun learning-game certificate — not a real astronaut qualification.")
    c.showPage()
    c.save()
    return buf.getvalue()
