"""Widget4 - Pure progress bar only. No text, no ring, no label. v2.2.54"""

import sys, os, time, json
from PyQt6.QtWidgets import QApplication, QWidget, QFrame, QHBoxLayout
from PyQt6.QtGui import QPainter, QColor, QLinearGradient, QPen, QFont
from PyQt6.QtCore import Qt, QTimer

DATA_FILE = os.path.join(os.environ.get('TEMP', os.environ.get('TMP', '/tmp')), 'codexbar_widget.txt')
SETTINGS_FILE = None
_sp = os.environ.get("LOCALAPPDATA", "")
if _sp:
    SETTINGS_FILE = os.path.join(_sp, "CodexBar", "settings.json")
else:
    SETTINGS_FILE = os.path.join(os.path.expanduser("~"), ".codexbar", "settings.json")

THEME = {
    'low':      QColor(16,185,129),
    'medium':   QColor(245,158,11),
    'high':     QColor(239,68,68),
    'critical': QColor(255,0,102),
}

def get_theme(pct):
    if pct<=50: return "low"
    elif pct<=70: return "medium"
    elif pct<=90: return "high"
    else: return "critical"

class BarWidget(QWidget):
    def __init__(self, pos=None):
        super().__init__()
        self.pct = 0
        self.prov = ""
        self.setWindowTitle("CodexBar Bar")
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedSize(300, 12)
        if pos:
            self.move(pos[0], pos[1])
        else:
            s = QApplication.primaryScreen().geometry()
            self.move((s.width()-300)//2, s.height()-60)
        self._drag = None
        self._last_data = ""
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._poll_file)
        self._timer.start(200)

    def _poll_file(self):
        try:
            with open(DATA_FILE, 'r') as f:
                data = f.read().strip()
            if data == self._last_data or data in ("quit", "off"):
                return
            self._last_data = data
            parts = data.split("|")
            if len(parts) >= 2:
                self.pct = int(parts[0])
                self.prov = parts[1]
                self.update()
        except (FileNotFoundError, ValueError):
            pass

    def paintEvent(self, e):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        # Background
        bg = QLinearGradient(0,0,0,self.height())
        bg.setColorAt(0, QColor(20,22,30,200))
        bg.setColorAt(1, QColor(15,18,25,200))
        p.setBrush(bg)
        p.setPen(QPen(QColor(255,255,255,15),1))
        p.drawRoundedRect(self.rect().adjusted(1,1,-1,-1), 12, 12)
        # Fill
        fill_w = int((self.width()-8) * self.pct / 100)
        if fill_w > 0:
            t = THEME[get_theme(self.pct)]
            g = QLinearGradient(4,0,4+fill_w,0)
            g.setColorAt(0, t)
            g.setColorAt(1, QColor(t.red(), t.green(), t.blue(), 180))
            p.setBrush(g)
            p.setPen(Qt.PenStyle.NoPen)
            p.drawRoundedRect(4, 4, fill_w, self.height()-8, 8, 8)
        p.end()

    def mousePressEvent(self, e):
        if e.button()==Qt.MouseButton.LeftButton:
            self._drag = e.globalPosition().toPoint()-self.pos()
    def closeEvent(self, e):
        self._save_position()
        super().closeEvent(e)

    def _save_position(self):
        try:
            pos = self.pos()
            data = {}
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f) if os.path.getsize(SETTINGS_FILE) > 0 else {}
            data["bar_widget_pos"] = {"x": pos.x(), "y": pos.y()}
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def mouseMoveEvent(self, e):
        if self._drag and e.buttons()&Qt.MouseButton.LeftButton:
            self.move(e.globalPosition().toPoint()-self._drag)

def main():
    pos = None
    for i, arg in enumerate(sys.argv):
        if arg == "--pos" and i + 1 < len(sys.argv):
            parts = sys.argv[i + 1].split(",")
            if len(parts) == 2:
                pos = (int(parts[0]), int(parts[1]))
    app = QApplication(sys.argv)
    w = BarWidget(pos=pos)
    w.show()
    w.raise_()
    print("[W4] Ready", flush=True)
    sys.exit(app.exec())

if __name__=="__main__":
    main()