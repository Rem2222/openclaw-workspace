"""Premium Floating Widget v3 - PyQt6 Glassmorphism + stdin IPC"""

import sys
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QLabel, QFrame, QMenu)
from PyQt6.QtGui import (QPainter, QColor, QLinearGradient, QFont, QPen)
from PyQt6.QtCore import (Qt, QPropertyAnimation, QEasingCurve, pyqtProperty, QTimer)

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
    def __init__(self, pct=0, prov="CL"):
        super().__init__()
        self.pct = pct
        self.prov = prov
        self.setWindowTitle("CodexBar")
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedSize(220,260)
        s = QApplication.primaryScreen().geometry()
        self.move((s.width()-220)//2, (s.height()-260)//2)
        self._drag = None
        self._ui()
        self.update_pct(pct, prov)
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
    def contextMenuEvent(self, e):
        m = QMenu(self)
        a=m.addAction("Close"); a.triggered.connect(lambda: self.close())
        m.exec(e.globalPos())

class StdinReader(QTimer):
    """Polls stdin for update commands: 'pct\\nprov\\n'"""
    def __init__(self, widget):
        super().__init__()
        self.w = widget
        self.timeout.connect(self._read)
        self.start(200)
    def _read(self):
        import select
        # Windows: use msvcrt
        try:
            import msvcrt
            if not msvcrt.kbhit():
                return
            line = input().strip()
        except ImportError:
            # Unix fallback
            if not select.select([sys.stdin],[],[],0)[0]:
                return
            line = sys.stdin.readline().strip()
        if not line:
            return
        parts = line.split("|")
        if len(parts) >= 2:
            try:
                pct = int(parts[0])
                prov = parts[1]
                self.w.update_pct(pct, prov)
                print(f"[PW] Updated: {pct}% {prov}", flush=True)
            except ValueError:
                pass
        elif parts[0] == "quit":
            QApplication.quit()

def main():
    app = QApplication(sys.argv)
    pct = int(sys.argv[1]) if len(sys.argv)>1 else 0
    prov = sys.argv[2] if len(sys.argv)>2 else "CL"
    w = PremiumWidget(pct=pct, prov=prov)
    w.show()
    w.raise_()
    reader = StdinReader(w)
    print("[PW] Ready", flush=True)
    sys.exit(app.exec())

if __name__=="__main__":
    main()
