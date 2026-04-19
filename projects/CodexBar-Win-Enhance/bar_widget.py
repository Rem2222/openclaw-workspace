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
    _OPACITY_LEVELS = [0.25, 0.50, 0.75, 1.0]  # click cycles through these

    @staticmethod
    def _load_widget_settings():
        """Load opacity_idx and click_through from settings file."""
        try:
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f)
                idx = data.get("bar_opacity_idx", 3)
                ct = data.get("bar_click_through", False)
                return idx, ct
        except Exception:
            pass
        return 3, False

    def __init__(self, pos=None):
        super().__init__()
        self.pct = 0
        self.prov = ""
        self._opacity_idx, self._click_through = self._load_widget_settings()
        self.setWindowOpacity(self._OPACITY_LEVELS[self._opacity_idx])
        if self._click_through:
            self._set_click_through(True)
        self.setWindowTitle("CodexBar Bar")
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedSize(300, 24)
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
        if e.button() == Qt.MouseButton.LeftButton:
            self._click_pos = e.globalPosition().toPoint()
            self._drag = self._click_pos - self.pos()
        elif e.button() == Qt.MouseButton.RightButton:
            self._click_through = not self._click_through
            self._set_click_through(self._click_through)
            self._save_settings()

    def mouseMoveEvent(self, e):
        if self._drag and e.buttons()&Qt.MouseButton.LeftButton:
            self.move(e.globalPosition().toPoint()-self._drag)
            self._save_position()

    def mouseReleaseEvent(self, e):
        if e.button() == Qt.MouseButton.LeftButton and self._drag:
            moved = (e.globalPosition().toPoint() - self._click_pos).manhattanLength() > 5
            if not moved:
                # Click (no drag) → cycle opacity
                self._opacity_idx = (self._opacity_idx + 1) % len(self._OPACITY_LEVELS)
                self.setWindowOpacity(self._OPACITY_LEVELS[self._opacity_idx])
                self._save_settings()
        self._drag = None

    def _set_click_through(self, enabled):
        """Make this widget click-through (mouse events pass to windows behind it)."""
        try:
            import ctypes
            GWL_EXSTYLE = -20
            WS_EX_TRANSPARENT = 0x00000020
            WS_EX_NOACTIVATE = 0x08000000
            style = ctypes.windll.user32.GetWindowLongPtrW(self.winId(), GWL_EXSTYLE)
            if enabled:
                style |= (WS_EX_TRANSPARENT | WS_EX_NOACTIVATE)
            else:
                style &= ~(WS_EX_TRANSPARENT | WS_EX_NOACTIVATE)
            ctypes.windll.user32.SetWindowLongPtrW(self.winId(), GWL_EXSTYLE, style)
            print(f"[BW] click_through={'ON' if enabled else 'OFF'}", flush=True)
        except Exception as e:
            print(f"[BW] click_through error: {e}", flush=True)

    def closeEvent(self, e):
        self._save_position()
        super().closeEvent(e)

    def _save_position(self):
        self._save_settings()

    def _save_settings(self):
        """Save position + opacity + click_through to settings."""
        try:
            pos = self.pos()
            data = {}
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f) if os.path.getsize(SETTINGS_FILE) > 0 else {}
            data["bar_widget_pos"] = {"x": pos.x(), "y": pos.y()}
            data["bar_opacity_idx"] = self._opacity_idx
            data["bar_click_through"] = self._click_through
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass


def main():
    pos = None
    opacity_idx = 3
    click_through = False
    for i, arg in enumerate(sys.argv):
        if arg == "--pos" and i + 1 < len(sys.argv):
            parts = sys.argv[i + 1].split(",")
            if len(parts) == 2:
                pos = (int(parts[0]), int(parts[1]))
        elif arg == "--opacity" and i + 1 < len(sys.argv):
            try:
                opacity_idx = int(sys.argv[i + 1])
            except ValueError:
                pass
        elif arg == "--click-through" and i + 1 < len(sys.argv):
            click_through = sys.argv[i + 1] == "1"
    app = QApplication(sys.argv)
    w = BarWidget.__new__(BarWidget)
    QWidget.__init__(w)
    w.pct = 0
    w.prov = ""
    w._opacity_idx = opacity_idx
    w._click_through = click_through
    w._drag = None
    w._click_pos = None
    w.setWindowTitle("CodexBar Bar")
    w.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
    w.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
    w.setFixedSize(300, 24)
    if pos:
        w.move(pos[0], pos[1])
    else:
        s = QApplication.primaryScreen().geometry()
        w.move((s.width()-300)//2, s.height()-60)
    w._last_data = ""
    w._timer = QTimer(w)
    w._timer.timeout.connect(w._poll_file)
    w._timer.start(200)
    w._poll_count = 0
    w.setWindowOpacity(w._OPACITY_LEVELS[w._opacity_idx])
    if w._click_through:
        w._set_click_through(True)
    w.show()
    w.raise_()
    print("[W4] Ready", flush=True)
    sys.exit(app.exec())

if __name__=="__main__":
    main()