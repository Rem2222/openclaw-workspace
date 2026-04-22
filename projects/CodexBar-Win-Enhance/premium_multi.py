"""Premium Multi-Provider Widget v2.3 — 2x3 grid showing all providers (REM-94)"""

import sys, os, time, json
from PyQt6.QtWidgets import QApplication, QWidget
from PyQt6.QtGui import QPainter, QColor, QLinearGradient, QFont, QPen
from PyQt6.QtCore import Qt, QTimer

DATA_FILE = os.path.join(os.environ.get('TEMP', os.environ.get('TMP', '/tmp')), 'codexbar_widget.txt')

import __main__
_DEBUG_FILE = __import__('pathlib').Path(__import__('os').path.dirname(__file__) or __import__('os').getcwd()) / 'premium_multi_debug.log'

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

class PremiumMultiWidget(QWidget):
    _OPACITY_LEVELS = [0.25, 0.50, 0.75, 1.0]

    @staticmethod
    def _load_settings():
        try:
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f)
                idx = data.get("premium_opacity_idx", 3)
                ct = data.get("widgets_click_through", data.get("premium_click_through", False))
                return idx, ct
        except Exception:
            pass
        return 3, False

    def __init__(self, pos=None):
        _d(f"__init__: pos={pos}, argv={sys.argv}")
        super().__init__()
        self._all_providers = {}
        self._active_cell = -1
        self._opacity_idx, self._click_through = self._load_settings()
        self.setWindowOpacity(self._OPACITY_LEVELS[self._opacity_idx])
        if self._click_through:
            self._set_click_through(True)
        self.setWindowTitle("CodexBar Multi")
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint|Qt.WindowType.Tool|Qt.WindowType.WindowStaysOnTopHint)
        self.setFixedSize(260, 200)
        if pos:
            self.move(pos[0], pos[1])
        else:
            s = QApplication.primaryScreen().geometry()
            self.move((s.width()-260)//2, (s.height()-200)//2)
        self._drag = None
        self._poll_count = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._poll_file)
        self._timer.start(200)

    def _set_click_through(self, enabled):
        try:
            import ctypes
            GWL_EXSTYLE = -20
            WS_EX_TRANSPARENT = 0x00000020
            WS_EX_NOACTIVATE = 0x08000000
            hwnd = int(self.winId())
            style = ctypes.windll.user32.GetWindowLongPtrW(hwnd, GWL_EXSTYLE)
            if enabled:
                style |= WS_EX_TRANSPARENT | WS_EX_NOACTIVATE
            else:
                style &= ~WS_EX_TRANSPARENT
            ctypes.windll.user32.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style)
            ctypes.windll.user32.SetWindowPos(hwnd, None, 0, 0, 0, 0,
                0x0020|0x0001|0x0004|0x0010)
            _d(f"_set_click_through({enabled}): OK")
        except Exception as e:
            _d(f"_set_click_through exception: {e}")

    def _poll_file(self):
        _d(f"_poll: checking {DATA_FILE}")
        try:
            with open(DATA_FILE, 'r') as f:
                data = f.read().strip()
            if data in ("quit", "off"):
                return
            parts = data.split("|")
            _d(f"_poll parsed: {len(parts)} parts, raw={data[:100]}")
            if len(parts) < 2:
                return
            pct = int(parts[0])
            prov = parts[1]
            wp = int(parts[2]) if len(parts) >= 3 else 0
            all_prov = None
            if len(parts) >= 4:
                json_str = '|'.join(parts[3:])  # Rejoin in case JSON contains |
                if json_str.startswith('{'):
                    try:
                        all_prov = json.loads(json_str)
                    except Exception:
                        pass
            self._poll_count += 1
            print(f"[PM] poll #{self._poll_count}: pct={pct} prov={prov} wp={wp} keys={list(all_prov.keys()) if all_prov else None}", flush=True)
            self.update_display(pct, prov, wp, all_prov)
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"[PM] poll error: {e}", flush=True)

    def update_display(self, pct, prov, wp, all_prov):
        _d(f"update_display: pct={pct}, prov={prov}, wp={wp}, providers={list(all_prov.keys()) if all_prov else None}")
        try:
            if all_prov:
                self._all_providers = all_prov
                labels = {"claude": 0, "openai": 1, "zai": 2,
                          "minimax": 3, "opencode": 4, "ollama": 5}
                self._active_cell = labels.get(prov.lower(), -1)
            self.update()
        except Exception as e:
            print(f"[PM] update_display error: {e}", flush=True)

    def paintEvent(self, e):
        _d(f"paintEvent: _all_providers={len(self._all_providers) if self._all_providers else 0}")
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Background
        g = QLinearGradient(0, 0, 0, self.height())
        g.setColorAt(0, QColor(26, 31, 46, 235))
        g.setColorAt(1, QColor(15, 20, 30, 235))
        p.setBrush(g)
        p.setPen(QPen(QColor(255,255,255,25), 1))
        p.drawRoundedRect(self.rect().adjusted(1,1,-1,-1), 16, 16)

        PAD = 12
        GAP = 8
        W = self.width()   # 260
        H = self.height()  # 200
        CELL_W = (W - PAD*2 - GAP*2) // 3
        CELL_H = (H - PAD*2 - GAP) // 2

        PROVIDERS = [
            ("claude",   "CL", QColor(99,102,241)),
            ("openai",   "OA", QColor(168,85,247)),
            ("zai",      "ZA", QColor(6,182,212)),
            ("minimax",  "MM", QColor(34,197,94)),
            ("opencode", "OC", QColor(249,115,22)),
            ("ollama",   "OL", QColor(148,163,184)),
        ]

        for i, (key, abbr, accent) in enumerate(PROVIDERS):
            row = i // 3
            col = i % 3
            x = PAD + col * (CELL_W + GAP)
            y = PAD + row * (CELL_H + GAP)
            info = self._all_providers.get(key, {})
            pct = info.get("pct", 0) if info else 0
            reset = info.get("reset", "—") if info else "—"
            is_active = (i == self._active_cell)
            has_data = bool(info and pct >= 0)

            # Active cell border
            if is_active and has_data:
                p.setPen(QPen(QColor(255,255,255,80), 1))
                p.setBrush(Qt.BrushStyle.NoBrush)
                p.drawRoundedRect(x, y, CELL_W, CELL_H, 6, 6)
                p.setPen(Qt.PenStyle.NoPen)

            # Accent stripe top
            p.setBrush(QColor(accent.red(), accent.green(), accent.blue(), max(40, accent.alpha())))
            p.setPen(Qt.PenStyle.NoPen)
            p.drawRoundedRect(x+2, y+2, CELL_W-4, 3, 2, 2)

            # Abbreviation
            p.setPen(QColor(255,255,255, max(100, int(0.7*255))))
            fnt = QFont("Segoe UI", 9, QFont.Weight.Medium)
            p.setFont(fnt)
            p.drawText(x+4, y+16, abbr)

            # Percentage
            pct_clr = QColor(255,255,255, 150)
            if has_data and pct > 0:
                tk = get_theme(pct)
                pct_clr = QColor(THEME[tk]['p'].red(), THEME[tk]['p'].green(), THEME[tk]['p'].blue(), 255)
            p.setPen(pct_clr)
            fnt_big = QFont("Segoe UI", 16, QFont.Weight.Bold)
            p.setFont(fnt_big)
            p.drawText(x+4, y+44, f"{pct}%" if has_data else "—")

            # Progress bar background
            bar_x = x + 4
            bar_y = y + 50
            bar_w = CELL_W - 8
            bar_h = 5
            p.setBrush(QColor(255,255,255,15))
            p.setPen(Qt.PenStyle.NoPen)
            p.drawRoundedRect(bar_x, bar_y, bar_w, bar_h, 3, 3)
            # Progress bar fill
            if has_data and pct > 0:
                fill_w = max(4, int(bar_w * pct / 100.0))
                if pct <= 50:
                    fill_c = QColor(16,185,129)
                elif pct <= 70:
                    fill_c = QColor(245,158,11)
                else:
                    fill_c = QColor(239,68,68)
                p.setBrush(fill_c)
                p.drawRoundedRect(bar_x, bar_y, fill_w, bar_h, 3, 3)

            # Reset text
            p.setPen(QColor(255,255,255, max(60, int(0.4*255))))
            fnt_sm = QFont("Segoe UI", 7)
            p.setFont(fnt_sm)
            reset_short = reset if len(reset) <= 12 else reset[:11]+"…"
            p.drawText(x+4, y+CELL_H-4, reset_short)

        p.end()

    def mousePressEvent(self, e):
        _d(f"mousePress: btn={e.button()}, pos={e.globalPosition().toPoint()}, widget={self.pos()}")
        if e.button() == Qt.MouseButton.LeftButton:
            self._click_pos = e.globalPosition().toPoint()
            self._drag = self._click_pos - self.pos()
        elif e.button() == Qt.MouseButton.RightButton:
            self._click_through = not self._click_through
            _d(f"CT toggle: {self._click_through}")
            self._set_click_through(self._click_through)
            self._save_settings()

    def mouseMoveEvent(self, e):
        if self._drag and e.buttons() & Qt.MouseButton.LeftButton:
            self.move(e.globalPosition().toPoint() - self._drag)
            self._save_position()

    def mouseReleaseEvent(self, e):
        _d(f"mouseRelease: btn={e.button()}, widget={self.pos()}")
        if e.button() == Qt.MouseButton.LeftButton and self._drag:
            moved = (e.globalPosition().toPoint() - self._click_pos).manhattanLength() > 5
            if not moved:
                self._opacity_idx = (self._opacity_idx + 1) % len(self._OPACITY_LEVELS)
                self.setWindowOpacity(self._OPACITY_LEVELS[self._opacity_idx])
                self._save_settings()
        self._drag = None

    def _save_settings(self):
        _d(f"_save_settings: pos={self.pos()}, ct={self._click_through}")
        try:
            data = {}
            if os.path.exists(SETTINGS_FILE):
                try:
                    with open(SETTINGS_FILE, 'r') as f:
                        data = json.load(f)
                except Exception:
                    pass
            data["premium_opacity_idx"] = self._opacity_idx
            data["premium_click_through"] = self._click_through
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            _d(f"_save_settings error: {e}")

    def _save_position(self):
        try:
            data = {}
            if os.path.exists(SETTINGS_FILE):
                try:
                    with open(SETTINGS_FILE, 'r') as f:
                        data = json.load(f)
                except Exception:
                    pass
            data["premium_widget_pos"] = [self.x(), self.y()]
            os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(data, f)
        except Exception:
            pass


if __name__ == "__main__":
    app = QApplication([])
    pos = None
    for i, arg in enumerate(sys.argv):
        if arg == "--pos" and i+1 < len(sys.argv):
            parts = sys.argv[i+1].split(",")
            if len(parts) >= 2:
                try:
                    pos = (int(parts[0]), int(parts[1]))
                except ValueError:
                    pass
    w = PremiumMultiWidget(pos)
    w.show()
    app.exec()
