"""Premium Floating Widget v4 - PyQt6 + file-based IPC (no stdin needed)"""

import sys, os, time
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, QMenu)
from PyQt6.QtGui import (QPainter, QColor, QLinearGradient, QFont, QPen)
from PyQt6.QtCore import (Qt, QPropertyAnimation, QEasingCurve, pyqtProperty, QTimer)

DATA_FILE = os.path.join(os.environ.get('TEMP', os.environ.get('TMP', '/tmp')), 'codexbar_widget.txt')

THEME = {
    'low':      {'p': QColor(16,185,129), 's': QColor(5,150,105)},
    'medium':   {'p': QColor(245,158,11), 's': QColor(217,119,6)},
    'high':     {'p': QColor(239,68,68),   's': QColor(220,38,38)},
    'critical': {'p': QColor(255,0,102),   's': QColor(204,0,80)},
}

def get_theme(pct):
    if pct<=50: return "low"
    elif pct<=70: return "medium"
    elif pct<=90: return "high"
    else: return "critical"

class Ring(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._v = 0.0
        self.setFixedSize(80,80)
        self._a = QPropertyAnimation(self, b"val")
        self._a.setDuration(600)
        self._a.setEasingCurve(QEasingCurve.Type.InOutCubic)
    @pyqtProperty(float)
    def val(self): return self._v
    @val.setter
    def val(self, v): self._v = v; self.update()
    def set_val(self, v):
        self._a.stop()
        self._a.setStartValue(self._v)
        self._a.setEndValue(v)
        self._a.start()
    def paintEvent(self, e):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        t = THEME[get_theme(int(self._v*100))]
        cx,cy,r = 40,40,30
        p.setPen(QPen(QColor(255,255,255,30),6))
        p.drawEllipse(cx-r,cy-r,r*2,r*2)
        if self._v > 0:
            g = QLinearGradient(cx-r,cy,cx+r,cy)
            g.setColorAt(0, t['p'])
            g.setColorAt(1, t['s'])
            p.setPen(QPen(g,6,Qt.PenStyle.SolidLine,Qt.PenCapStyle.RoundCap))
            p.drawArc(cx-r,cy-r,r*2,r*2,-90*16,int(self._v*360*16))
        p.end()

class PremiumWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.pct = 0
        self.prov = "CL"
        self.setWindowTitle("CodexBar")
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedSize(220,260)
        s = QApplication.primaryScreen().geometry()
        self.move((s.width()-220)//2, (s.height()-260)//2)
        self._drag = None
        self._ui()
        self.update_pct(0, "CL")
        # Poll data file every 200ms
        self._last_data = ""
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._poll_file)
        self._timer.start(200)

    def _poll_file(self):
        """Read data file on main thread."""
        try:
            with open(DATA_FILE, 'r') as f:
                data = f.read().strip()
            if data == self._last_data:
                return
            self._last_data = data
            if data == "quit":
                QApplication.quit()
                return
            if data == "off":
                return
            parts = data.split("|")
            if len(parts) >= 2:
                pct = int(parts[0])
                prov = parts[1]
                self.update_pct(pct, prov)
        except (FileNotFoundError, ValueError):
            pass

    def _ui(self):
        lo = QVBoxLayout(self)
        lo.setContentsMargins(16,12,16,12)
        lo.setSpacing(4)
        self.pl = QLabel(self.prov)
        self.pl.setFont(QFont("Segoe UI",11,QFont.Weight.Bold))
        self.pl.setStyleSheet("color:rgba(255,255,255,0.85);")
        self.pl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lo.addWidget(self.pl)
        self.ring = Ring(self)
        lo.addWidget(self.ring, alignment=Qt.AlignmentFlag.AlignCenter)
        self.pcl = QLabel("0%")
        self.pcl.setFont(QFont("Segoe UI",36,QFont.Weight.Bold))
        self.pcl.setStyleSheet("color:white;")
        self.pcl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lo.addWidget(self.pcl)
        # ── Progress Bar ──────────────────────────────────────
        bar_row = QHBoxLayout()
        bar_row.setContentsMargins(8,4,8,0)
        bar_row.setSpacing(0)
        self.bar_bg = QFrame(self)
        self.bar_bg.setFixedHeight(6)
        self.bar_bg.setStyleSheet("background:rgba(255,255,255,20);border-radius:3px;")
        self.bar_fill = QFrame(self.bar_bg)
        self.bar_fill.setGeometry(0,0,0,6)
        self.bar_fill.setStyleSheet("background:rgba(16,185,129,255);border-radius:3px;")
        bar_row.addWidget(self.bar_bg)
        lo.addLayout(bar_row)
        # ── Status ─────────────────────────────────────────────
        self.sl = QLabel("Active")
        self.sl.setFont(QFont("Segoe UI",9))
        self.sl.setStyleSheet("color:rgba(255,255,255,0.5);")
        self.sl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        lo.addWidget(self.sl)

    def update_pct(self, pct, prov=None):
        self.pct = pct
        if prov: self.prov = prov
        t = THEME[get_theme(pct)]
        self.pcl.setText(f'{pct}%')
        self.pl.setText(self.prov)
        self.pcl.setStyleSheet(f"color:{t['p'].name()};")
        self.ring.set_val(pct/100.0)
        # Update progress bar fill
        bar_w = self.bar_bg.width()
        fill_w = int(bar_w * pct / 100)
        self.bar_fill.setGeometry(0, 0, fill_w, 6)
        self.bar_fill.setStyleSheet(f"background:{t['p'].name()};border-radius:3px;")

    def paintEvent(self, e):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        g = QLinearGradient(0,0,0,self.height())
        g.setColorAt(0, QColor(26,31,46,220))
        g.setColorAt(1, QColor(15,20,30,220))
        p.setBrush(g)
        p.setPen(QPen(QColor(255,255,255,30),1))
        p.drawRoundedRect(self.rect().adjusted(1,1,-1,-1),16,16)
        p.end()

    def mousePressEvent(self, e):
        if e.button()==Qt.MouseButton.LeftButton:
            self._drag = e.globalPosition().toPoint()-self.pos()
    def mouseMoveEvent(self, e):
        if self._drag and e.buttons()&Qt.MouseButton.LeftButton:
            self.move(e.globalPosition().toPoint()-self._drag)
    def resizeEvent(self, e):
        super().resizeEvent(e)
        # Re-apply bar fill on layout changes
        bar_w = self.bar_bg.width()
        fill_w = int(bar_w * self.pct / 100)
        self.bar_fill.setGeometry(0, 0, fill_w, 6)

    def contextMenuEvent(self, e):
        m = QMenu(self)
        a=m.addAction("Close"); a.triggered.connect(lambda: self.close())
        m.exec(e.globalPos())

def main():
    app = QApplication(sys.argv)
    w = PremiumWidget()
    w.show()
    w.raise_()
    print("[PW] Ready", flush=True)
    sys.exit(app.exec())

if __name__=="__main__":
    main()
