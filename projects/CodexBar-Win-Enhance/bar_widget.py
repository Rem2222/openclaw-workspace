"""Widget4 - Pure progress bar only. No text, no ring, no label. v2.3"""

import sys, os, time, json
from PyQt6.QtWidgets import QApplication, QWidget, QFrame, QHBoxLayout
from PyQt6.QtGui import QPainter, QColor, QLinearGradient, QPen, QFont
from PyQt6.QtCore import Qt, QTimer

DATA_FILE = os.path.join(os.environ.get('TEMP', os.environ.get('TMP', '/tmp')), 'codexbar_widget.txt')

# Debug log next to bar_widget.py
import __main__
_DEBUG_FILE = __import__('pathlib').Path(__import__('os').path.dirname(__file__) or __import__('os').getcwd()) / 'bar_widget_debug.log'

def _d(msg):
    try:
        with open(_DEBUG_FILE, 'a', encoding='utf-8') as f:
            from datetime import datetime
            f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")
            f.flush()
    except Exception:
        pass
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
        """Load opacity_idx and click_through from settings file.
        Reads widgets_click_through (from Settings popup) as primary,
        falls back to bar_click_through (legacy/restarted widget).
        """
        try:
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f)
                idx = data.get("bar_opacity_idx", 3)
                ct = data.get("widgets_click_through", data.get("bar_click_through", False))
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
            _d(f"__init__: applied click_through=True on startup")
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
            if data in ("quit", "off"):
                return
            parts = data.split("|")
            if len(parts) >= 2:
                new_pct = int(parts[0])
                new_prov = parts[1]
                new_wp = int(parts[2]) if len(parts) >= 3 else None
                # Update if any value changed (including provider switch)
                if new_pct != self.pct or new_prov != self.prov or (new_wp is not None and new_wp != getattr(self, '_wp', None)):
                    self.pct = new_pct
                    self.prov = new_prov
                    if new_wp is not None:
                        self._wp = new_wp
                    self.update()
                self._last_data = data
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
            _d(f"right-click: toggle click_through to {self._click_through}")
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
        """Make this widget click-through (mouse events pass to windows behind it).
        
        WS_EX_TRANSPARENT alone is sufficient - no SetLayeredWindowAttributes needed.
        The widget stays VISIBLE, only mouse events pass through.
        """
        try:
            import ctypes
            GWL_EXSTYLE = -20
            WS_EX_TRANSPARENT = 0x00000020
            WS_EX_NOACTIVATE  = 0x08000000

            hwnd = int(self.winId())
            style = ctypes.windll.user32.GetWindowLongPtrW(hwnd, GWL_EXSTYLE)

            if enabled:
                style |= (WS_EX_TRANSPARENT | WS_EX_NOACTIVATE)
            else:
                style &= ~(WS_EX_TRANSPARENT | WS_EX_NOACTIVATE)

            ctypes.windll.user32.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style)

            # Force window to recalculate non-client area so new styles take effect
            ctypes.windll.user32.SetWindowPos(
                hwnd, 0, 0, 0, 0, 0,
                0x0020 | 0x0001)  # SWP_FRAMECHANGED | SWP_NOSIZE | SWP_NOMOVE

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
    _d(f"main() argv={sys.argv}")
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