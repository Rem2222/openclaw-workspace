"""Premium Floating Widget v2.3 - Square layout with weekly progress bar"""

import sys, os, time, json
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, QMenu)
from PyQt6.QtGui import (QPainter, QColor, QLinearGradient, QFont, QPen)
from PyQt6.QtCore import (Qt, QPropertyAnimation, QEasingCurve, pyqtProperty, QTimer)

DATA_FILE = os.path.join(os.environ.get('TEMP', os.environ.get('TMP', '/tmp')), 'codexbar_widget.txt')

# Debug log next to premium_widget.py
import __main__
_DEBUG_FILE = __import__('pathlib').Path(__import__('os').path.dirname(__file__) or __import__('os').getcwd()) / 'premium_widget_debug.log'

def _d(msg):
    try:
        with open(_DEBUG_FILE, 'a', encoding='utf-8') as f:
            from datetime import datetime
            f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")
            f.flush()
    except Exception:
        pass
SETTINGS_FILE = None  # set from argv

# Determine settings path
_sp = os.environ.get("LOCALAPPDATA", "")
if _sp:
    SETTINGS_FILE = os.path.join(_sp, "CodexBar", "settings.json")
else:
    SETTINGS_FILE = os.path.join(os.path.expanduser("~"), ".codexbar", "settings.json")

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

def get_week_theme(pct):
    """Same thresholds as session: <=50 green, <=70 orange, >70 red"""
    if pct <= 50: return THEME['low']
    elif pct <= 70: return THEME['medium']
    else: return THEME['high']

class Ring(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._v = 0.0
        self.setFixedSize(65, 65)  # Smaller ring for square layout
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
        cx, cy, r = 32, 32, 26  # Centered in 65x65 frame
        pen_w = 10  # Thicker ring (was 5)
        # Background arc
        p.setPen(QPen(QColor(255,255,255,20), pen_w))
        p.drawEllipse(cx-r, cy-r, r*2, r*2)
        # Foreground arc
        if self._v > 0:
            g = QLinearGradient(cx-r, cy, cx+r, cy)
            g.setColorAt(0, t['p'])
            g.setColorAt(1, t['s'])
            p.setPen(QPen(g, pen_w, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
            p.drawArc(cx-r, cy-r, r*2, r*2, -90*16, int(self._v*360*16))
        p.end()

class WeeklyBar(QFrame):
    """Horizontal progress bar showing weekly usage percentage."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self._wp = 0
        self.setFixedHeight(24)
    @pyqtProperty(float)
    def wp(self): return self._wp
    @wp.setter
    def wp(self, v): self._wp = v; self.update()
    def set_wp(self, v):
        self._a = QPropertyAnimation(self, b"wp")
        self._a.setDuration(400)
        self._a.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._a.setStartValue(self._wp)
        self._a.setEndValue(v)
        self._a.start()
    def paintEvent(self, e):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        _wp = max(self._wp, 1)  # show bar at 1% minimum so it always renders
        t = get_week_theme(_wp)
        rect = self.rect()
        # Semi-transparent background
        bg = QColor(255,255,255,15)
        p.setBrush(bg)
        p.setPen(Qt.PenStyle.NoPen)
        p.drawRoundedRect(rect, 6, 6)
        # Foreground bar
        bar_w = int(rect.width() * (_wp / 100.0))
        if bar_w > 0:
            g = QLinearGradient(rect.left(), 0, rect.right(), 0)
            g.setColorAt(0, t['p'])
            g.setColorAt(1, t['s'])
            p.setBrush(g)
            p.drawRoundedRect(0, 0, bar_w, rect.height(), 6, 6)
        # Label overlay
        p.setPen(QColor(255,255,255,230))
        font = QFont("Segoe UI", 9, QFont.Weight.Bold)
        p.setFont(font)
        label = f"Wk: {self._wp:.0f}%"
        p.drawText(rect, Qt.AlignmentFlag.AlignCenter, label)
        p.end()

class PremiumWidget(QWidget):
    _OPACITY_LEVELS = [0.25, 0.50, 0.75, 1.0]  # click cycles through these

    @staticmethod
    def _load_widget_settings():
        """Load opacity_idx and click_through from settings file.
        Reads widgets_click_through (from Settings popup) as primary,
        falls back to premium_click_through (legacy/restarted widget).
        """
        try:
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f)
                idx = data.get("premium_opacity_idx", 3)
                # Settings popup writes widgets_click_through; widget writes premium_click_through
                ct = data.get("widgets_click_through", data.get("premium_click_through", False))
                _d(f"_load_widget_settings: file={SETTINGS_FILE}, ct={ct}, raw={data.get('widgets_click_through')}")
                return idx, ct
        except Exception:
            pass
        return 3, False  # defaults: 100% opacity, click-through OFF

    def __init__(self, pos=None):
        super().__init__()
        self.pct = 0
        self.prov = "CL"
        self.wp = 0  # Weekly percentage
        # Load saved settings
        self._opacity_idx, self._click_through = self._load_widget_settings()
        _d(f"__init__: _load_widget_settings returned opacity={self._opacity_idx}, ct={self._click_through}, SETTINGS_FILE={SETTINGS_FILE}")
        self.setWindowOpacity(self._OPACITY_LEVELS[self._opacity_idx])
        self.setWindowTitle("CodexBar")
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
        # WA_TranslucentBackground conflicts with WS_EX_TRANSPARENT - DWM drops rounded corners
        # self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)  # REMOVED: breaks CT
        # Apply click-through AFTER setWindowFlags so it doesn't get overwritten
        if self._click_through:
            _d(f"__init__: calling _set_click_through True")
            self._set_click_through(True)
        else:
            _d(f"__init__: _click_through is False, skipping _set_click_through")
        # Square: 220x220
        side = 220
        self.setFixedSize(side, side)
        if pos:
            self.move(pos[0], pos[1])
        else:
            s = QApplication.primaryScreen().geometry()
            self.move((s.width()-side)//2, (s.height()-side)//2)
        self._drag = None
        self._ui()
        # Poll data file every 200ms - let it read the initial data
        self._last_data = ""
        self._poll_count = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._poll_file)
        self._timer.start(200)

    def _poll_file(self):
        """Read data file on main thread."""
        self._poll_count += 1
        try:
            with open(DATA_FILE, 'r') as f:
                data = f.read().strip()
            if data == self._last_data:
                return
            self._last_data = data
            if data == "quit":
                print("[PW] quit signal received", flush=True)
                QApplication.quit()
                return
            if data == "off":
                return
            parts = data.split("|")
            if len(parts) >= 2:
                pct = int(parts[0])
                prov = parts[1]
                wp = int(parts[2]) if len(parts) >= 3 else 0
                print(f"[PW] poll #{self._poll_count}: pct={pct} prov={prov} wp={wp} raw={data!r}", flush=True)
                self.update_pct(pct, prov, wp=wp)
        except FileNotFoundError:
            pass  # Normal - file not created yet
        except ValueError:
            print(f"[PW] ValueError in poll: raw={data!r}", flush=True)
        except Exception as e:
            print(f"[PW] poll error: {e}", flush=True)

    def _ui(self):
        # Main vertical layout, evenly distributed
        main_lo = QVBoxLayout(self)
        main_lo.setContentsMargins(12, 10, 12, 10)
        main_lo.setSpacing(0)
        
        # Top: Provider label (small, subtle)
        self.pl = QLabel(self.prov)
        self.pl.setFont(QFont("Segoe UI", 10, QFont.Weight.Medium))
        self.pl.setStyleSheet("color: rgba(255,255,255,0.6);")
        self.pl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_lo.addWidget(self.pl, alignment=Qt.AlignmentFlag.AlignCenter)
        
        # Center: Large percentage number
        self.pcl = QLabel("0%")
        self.pcl.setFont(QFont("Segoe UI", 38, QFont.Weight.Bold))
        self.pcl.setStyleSheet("color: white;")
        self.pcl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_lo.addWidget(self.pcl, alignment=Qt.AlignmentFlag.AlignCenter)
        
        # Below percentage: Ring (smaller, 65x65)
        self.ring = Ring(self)
        main_lo.addWidget(self.ring, alignment=Qt.AlignmentFlag.AlignCenter)
        
        # Spacer to push weekly bar to bottom
        main_lo.addStretch(1)
        
        # Bottom: Weekly progress bar
        self.wb = WeeklyBar(self)
        self.wb.setFixedWidth(196)  # 220 - 12*2 padding
        main_lo.addWidget(self.wb, alignment=Qt.AlignmentFlag.AlignCenter)

    def update_pct(self, pct, prov=None, wp=0):
        """
        Update percentage display.
        pct: session percentage (0-100)
        prov: provider name (optional)
        wp: weekly percentage (0 = no data, don't show bar)
        """
        try:
            self.pct = pct
            if prov: self.prov = prov
            self.wp = wp
            t = THEME[get_theme(pct)]
            self.pcl.setText(f'{pct}%')
            self.pl.setText(self.prov)
            self.pcl.setStyleSheet(f"color: {t['p'].name()};")
            self.ring.set_val(pct / 100.0)
            self.wb.set_wp(wp)
            self.wb.setFixedHeight(24)
            self.wb.show()
            self._wp = wp
        except Exception as e:
            print(f"[PW] update_pct error: {e}", flush=True)

    def paintEvent(self, e):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        g = QLinearGradient(0, 0, 0, self.height())
        g.setColorAt(0, QColor(26, 31, 46, 230))
        g.setColorAt(1, QColor(15, 20, 30, 230))
        p.setBrush(g)
        p.setPen(QPen(QColor(255,255,255,25), 1))
        p.drawRoundedRect(self.rect().adjusted(1,1,-1,-1), 16, 16)
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
        if self._drag and e.buttons() & Qt.MouseButton.LeftButton:
            self.move(e.globalPosition().toPoint() - self._drag)
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
                0x0020 | 0x0001 | 0x0004 | 0x0010)  # SWP_FRAMECHANGED | SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE
            _d(f"_set_click_through({enabled}): hwnd={hwnd}, style=0x{style:08x}, GWL_EXSTYLE={GWL_EXSTYLE}")
            print(f"[PW] click_through={'ON' if enabled else 'OFF'} (hwnd={hwnd}, style=0x{style:08x})", flush=True)
        except Exception as e:
            _d(f"_set_click_through exception: {e}")
            print(f"[PW] click_through error: {e}", flush=True)
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
                    data = json.load(f)
            data["premium_widget_pos"] = {"x": pos.x(), "y": pos.y()}
            data["premium_opacity_idx"] = self._opacity_idx
            data["premium_click_through"] = self._click_through
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def contextMenuEvent(self, e):
        m = QMenu(self)
        a = m.addAction("Close")
        a.triggered.connect(lambda: self.close())
        m.exec(e.globalPos())

def main():
    pos = None
    opacity_idx = 3  # default 100%
    click_through = False  # default OFF
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
    w = PremiumWidget.__new__(PremiumWidget)
    QWidget.__init__(w)
    w.pct = 0
    w.prov = "CL"
    w.wp = 0
    w._opacity_idx = opacity_idx
    w._click_through = click_through
    w._drag = None
    w._click_pos = None
    w.setWindowTitle("CodexBar")
    w.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
    w.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
    if w._click_through:
        w._set_click_through(True)
    # _ui() must be after opacity/flags so child widgets inherit correctly
    w._ui()
    w.setWindowOpacity(w._OPACITY_LEVELS[w._opacity_idx])
    side = 220
    w.setFixedSize(side, side)
    if pos:
        w.move(pos[0], pos[1])
    else:
        s = QApplication.primaryScreen().geometry()
        w.move((s.width()-side)//2, (s.height()-side)//2)
    w._last_data = ""
    w._poll_count = 0
    w._timer = QTimer(w)
    w._timer.timeout.connect(w._poll_file)
    w._timer.start(200)
    w._ui()
    w.setWindowOpacity(w._OPACITY_LEVELS[w._opacity_idx])
    w.show()
    w.raise_()
    print("[PW] Ready", flush=True)
    sys.exit(app.exec())
    w.show()
    w.raise_()
    print("[PW] Ready", flush=True)
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
