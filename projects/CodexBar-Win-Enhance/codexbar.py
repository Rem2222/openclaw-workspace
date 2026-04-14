"""
CodexBar for Windows v1.0.0
============================
System tray app that shows your REAL Claude usage.
Native customtkinter popup - no browser hack needed.

Requirements: pip install pystray Pillow customtkinter
Usage: python codexbar.py
"""

import os
import sys
import json
import time
import re
import sqlite3
import shutil
import subprocess
import threading
import ctypes
import ctypes.wintypes
import base64
import tempfile
import webbrowser
from pathlib import Path
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("ERROR: Pillow not found. Run: python -m pip install Pillow")
    sys.exit(1)

try:
    import pystray
    from pystray import MenuItem, Menu
except ImportError:
    print("ERROR: pystray not found. Run: python -m pip install pystray")
    sys.exit(1)

try:
    import customtkinter as ctk
except ImportError:
    print("ERROR: customtkinter not found. Run: python -m pip install customtkinter")
    sys.exit(1)

try:
    from winpty import PtyProcess
except ImportError:
    PtyProcess = None
    print("[CodexBar] winpty not found (pip install pywinpty). CLI /usage disabled.")


def _resource_path(relative_path):
    """Get absolute path to resource - works for dev and PyInstaller .exe."""
    if getattr(sys, 'frozen', False):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).parent
    return base / relative_path


# ─────────────────────────────────────────────
# Chromium cookie decryptor  (DPAPI + AES-GCM)
# ─────────────────────────────────────────────

class _CookieDecryptor:
    """Read and decrypt the sessionKey cookie from Chrome, Edge, or Brave.

    Chromium v80-126 encrypts cookies with AES-256-GCM (``v10`` prefix).
    Chromium 127+ uses App-Bound Encryption (``v20`` prefix).

    v10: The AES key lives in ``Local State``, encrypted with Windows DPAPI.
    v20: Requires Chrome's elevation-service COM object - attempted here,
         falls back gracefully if the service is unavailable.

    All crypto is pure ctypes (DPAPI via crypt32, AES-GCM via bcrypt.dll).
    """

    _LOCAL = os.environ.get("LOCALAPPDATA", "")
    BROWSERS = [
        ("Chrome", Path(_LOCAL) / "Google"         / "Chrome"        / "User Data"),
        ("Edge",   Path(_LOCAL) / "Microsoft"      / "Edge"          / "User Data"),
        ("Brave",  Path(_LOCAL) / "BraveSoftware"  / "Brave-Browser" / "User Data"),
    ]

    # ── public entry point ──────────────────────



    @classmethod
    def get_session_key(cls):
        """Return ``(cookie_value, browser_name)`` or ``(None, None)``."""
        for name, user_data in cls.BROWSERS:
            cookie_db   = user_data / "Default" / "Network" / "Cookies"
            local_state = user_data / "Local State"
            if not cookie_db.exists() or not local_state.exists():
                continue
            try:
                master_key = cls._master_key(local_state)
                if master_key is None:
                    print(f"    {name}: could not decrypt master key")
                    continue
                value = cls._read_cookie(cookie_db, master_key)
                if value:
                    return value, name
            except Exception as e:
                print(f"    {name} cookie err: {e}")
        return None, None

    @classmethod
    def get_cookies(cls, host: str, *cookie_names: str) -> dict:
        """Return ``{cookie_name: value}`` for arbitrary cookies from any browser.

        Searches Chrome, Edge, and Brave for cookies matching ``host`` and the
        given ``cookie_names``.  Handles v10 (AES-GCM), v20 (App-Bound, skipped),
        and legacy DPAPI encryption.  Returns an empty dict if no cookies are found.
        """
        result = {}
        for name, user_data in cls.BROWSERS:
            cookie_db   = user_data / "Default" / "Network" / "Cookies"
            local_state = user_data / "Local State"
            if not cookie_db.exists() or not local_state.exists():
                continue
            try:
                master_key = cls._master_key(local_state)
                if master_key is None:
                    continue
                found = cls._read_cookies(cookie_db, master_key, host, *cookie_names)
                if found:
                    result.update(found)
                    break  # one browser is enough
            except Exception as e:
                print(f"    {name} get_cookies err: {e}")
        return result

    # ── DPAPI via ctypes ────────────────────────

    class _BLOB(ctypes.Structure):
        _fields_ = [
            ("cbData", ctypes.wintypes.DWORD),
            ("pbData", ctypes.POINTER(ctypes.c_char)),
        ]

    @classmethod
    def _dpapi_decrypt(cls, data: bytes) -> bytes | None:
        blob_in = cls._BLOB(len(data),
                            ctypes.create_string_buffer(data, len(data)))
        blob_out = cls._BLOB()
        ok = ctypes.windll.crypt32.CryptUnprotectData(
            ctypes.byref(blob_in), None, None, None, None, 0,
            ctypes.byref(blob_out),
        )
        if not ok:
            return None
        raw = ctypes.string_at(blob_out.pbData, blob_out.cbData)
        ctypes.windll.kernel32.LocalFree(blob_out.pbData)
        return raw

    # ── AES-256-GCM via Windows BCrypt ──────────

    class _BCRYPT_AUTH_INFO(ctypes.Structure):
        _fields_ = [
            ("cbSize",       ctypes.c_ulong),
            ("dwInfoVersion",ctypes.c_ulong),
            ("pbNonce",      ctypes.c_void_p),
            ("cbNonce",      ctypes.c_ulong),
            ("pbAuthData",   ctypes.c_void_p),
            ("cbAuthData",   ctypes.c_ulong),
            ("pbTag",        ctypes.c_void_p),
            ("cbTag",        ctypes.c_ulong),
            ("pbMacContext", ctypes.c_void_p),
            ("cbMacContext", ctypes.c_ulong),
            ("cbAAD",        ctypes.c_ulong),
            ("cbData",       ctypes.c_ulonglong),
            ("dwFlags",      ctypes.c_ulong),
        ]

    @classmethod
    def _aes_gcm_decrypt(cls, key: bytes, nonce: bytes,
                         ciphertext: bytes, tag: bytes) -> bytes:
        _b = ctypes.windll.bcrypt

        # open AES provider
        hAlg = ctypes.c_void_p()
        st = _b.BCryptOpenAlgorithmProvider(
            ctypes.byref(hAlg), ctypes.c_wchar_p("AES"), None,
            ctypes.c_ulong(0))
        if st != 0:
            raise OSError(f"BCryptOpenAlgorithmProvider 0x{st & 0xFFFFFFFF:08x}")

        try:
            # set GCM chaining mode - property value is raw UTF-16LE bytes
            mode_bytes = "ChainingModeGCM\0".encode("utf-16-le")
            mode_buf = (ctypes.c_ubyte * len(mode_bytes))(*mode_bytes)
            st = _b.BCryptSetProperty(
                hAlg, ctypes.c_wchar_p("ChainingMode"),
                mode_buf, ctypes.c_ulong(len(mode_bytes)),
                ctypes.c_ulong(0))
            if st != 0:
                raise OSError(f"BCryptSetProperty 0x{st & 0xFFFFFFFF:08x}")

            # import symmetric key
            hKey = ctypes.c_void_p()
            key_buf = (ctypes.c_ubyte * len(key))(*key)
            st = _b.BCryptGenerateSymmetricKey(
                hAlg, ctypes.byref(hKey), None, ctypes.c_ulong(0),
                key_buf, ctypes.c_ulong(len(key)), ctypes.c_ulong(0))
            if st != 0:
                raise OSError(f"BCryptGenerateSymmetricKey 0x{st & 0xFFFFFFFF:08x}")

            try:
                # build auth-info struct
                ai = cls._BCRYPT_AUTH_INFO()
                ai.cbSize        = ctypes.sizeof(ai)
                ai.dwInfoVersion = 1
                nonce_buf = (ctypes.c_ubyte * len(nonce))(*nonce)
                ai.pbNonce  = ctypes.cast(nonce_buf, ctypes.c_void_p)
                ai.cbNonce  = len(nonce)
                tag_buf = (ctypes.c_ubyte * len(tag))(*tag)
                ai.pbTag    = ctypes.cast(tag_buf, ctypes.c_void_p)
                ai.cbTag    = len(tag)

                # decrypt
                ct_buf   = (ctypes.c_ubyte * len(ciphertext))(*ciphertext)
                pt_buf   = (ctypes.c_ubyte * len(ciphertext))()
                cb_out   = ctypes.c_ulong()
                st = _b.BCryptDecrypt(
                    hKey,
                    ct_buf, ctypes.c_ulong(len(ciphertext)),
                    ctypes.byref(ai),
                    None, ctypes.c_ulong(0),
                    pt_buf, ctypes.c_ulong(len(ciphertext)),
                    ctypes.byref(cb_out), ctypes.c_ulong(0))
                if st != 0:
                    raise OSError(f"BCryptDecrypt 0x{st & 0xFFFFFFFF:08x}")
                return bytes(pt_buf[:cb_out.value])
            finally:
                _b.BCryptDestroyKey(hKey)
        finally:
            _b.BCryptCloseAlgorithmProvider(hAlg, ctypes.c_ulong(0))

    # ── master key from Local State ─────────────

    @classmethod
    def _master_key(cls, local_state_path: Path) -> bytes | None:
        with open(local_state_path, "r", encoding="utf-8") as f:
            js = json.load(f)
        b64 = js.get("os_crypt", {}).get("encrypted_key")
        if not b64:
            return None
        raw = base64.b64decode(b64)
        if raw[:5] != b"DPAPI":
            return None
        return cls._dpapi_decrypt(raw[5:])

    # ── read cookie from (possibly locked) DB ───

    @classmethod
    def _copy_locked_file(cls, src: Path, dst: str):
        """Copy a file that another process holds open (e.g. browser DB).

        Uses CreateFileW with full sharing flags to bypass the lock that
        ``shutil.copy2`` trips on.
        """
        _k = ctypes.windll.kernel32
        _k.CreateFileW.restype = ctypes.wintypes.HANDLE
        INVALID = ctypes.wintypes.HANDLE(-1).value

        hFile = _k.CreateFileW(
            str(src),
            0x80000000,         # GENERIC_READ
            0x7,                # FILE_SHARE_READ | WRITE | DELETE
            None,
            3,                  # OPEN_EXISTING
            0, None)
        if hFile == INVALID:
            err = ctypes.GetLastError()
            if err == 32:
                raise OSError("DB locked by browser (close it to read cookies)")
            raise OSError(f"CreateFileW error {err}")

        try:
            size = _k.GetFileSize(hFile, None)
            if size == 0xFFFFFFFF or size == 0:
                raise OSError("GetFileSize failed")
            buf = (ctypes.c_ubyte * size)()
            read = ctypes.wintypes.DWORD()
            _k.ReadFile(hFile, buf, size, ctypes.byref(read), None)
            with open(dst, "wb") as f:
                f.write(bytes(buf[:read.value]))
        finally:
            _k.CloseHandle(hFile)

    @classmethod
    def _read_cookie(cls, cookie_db: Path, master_key: bytes) -> str | None:
        """Query the Cookies SQLite DB and decrypt the sessionKey value."""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        tmp.close()
        try:
            # try shutil first, fall back to CreateFileW for locked DBs
            try:
                shutil.copy2(cookie_db, tmp.name)
            except (PermissionError, OSError):
                cls._copy_locked_file(cookie_db, tmp.name)

            conn = sqlite3.connect(tmp.name)
            conn.text_factory = bytes
            rows = conn.execute(
                "SELECT encrypted_value, value "
                "FROM cookies "
                "WHERE host_key IN ('.claude.ai','claude.ai') "
                "  AND name = 'sessionKey' "
                "ORDER BY last_access_utc DESC LIMIT 1"
            ).fetchall()
            conn.close()
            if not rows:
                return None
            enc_val, plain_val = rows[0]
            # some Chromium builds store the value in plaintext
            if plain_val and plain_val != b"":
                return plain_val.decode("utf-8", errors="replace")
            if not enc_val or len(enc_val) < 4:
                return None
            return cls._decrypt_value(enc_val, master_key)
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass

    @classmethod
    def _read_cookies(cls, cookie_db: Path, master_key: bytes,
                      host: str, *cookie_names: str) -> dict:
        """Query arbitrary cookies from the SQLite DB and decrypt them."""
        if not cookie_names:
            return {}
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        tmp.close()
        result = {}
        try:
            try:
                shutil.copy2(cookie_db, tmp.name)
            except (PermissionError, OSError):
                cls._copy_locked_file(cookie_db, tmp.name)

            conn = sqlite3.connect(tmp.name)
            conn.text_factory = bytes
            placeholders = ",".join("?" * len(cookie_names))
            rows = conn.execute(
                f"SELECT name, encrypted_value, value "
                f"FROM cookies "
                f"WHERE host_key = ? AND name IN ({placeholders}) "
                f"ORDER BY last_access_utc DESC",
                (host,) + cookie_names
            ).fetchall()
            conn.close()
            for row in rows:
                cname, enc_val, plain_val = row
                cname_str = cname.decode("utf-8", errors="replace") if isinstance(cname, bytes) else cname
                # plaintext cookie
                if plain_val and plain_val != b"":
                    result[cname_str] = plain_val.decode("utf-8", errors="replace")
                    continue
                # encrypted cookie
                if not enc_val or len(enc_val) < 4:
                    continue
                dec = cls._decrypt_value(enc_val, master_key)
                if dec:
                    result[cname_str] = dec
            return result
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass

    @classmethod
    def _decrypt_value(cls, enc: bytes, key: bytes) -> str | None:
        prefix = enc[:3]
        # v10: standard AES-256-GCM with DPAPI-decrypted key
        if prefix == b"v10":
            nonce      = enc[3:15]
            ct_and_tag = enc[15:]
            if len(ct_and_tag) < 16:
                return None
            ciphertext = ct_and_tag[:-16]
            tag        = ct_and_tag[-16:]
            plain = cls._aes_gcm_decrypt(key, nonce, ciphertext, tag)
            return plain.decode("utf-8", errors="replace")
        # v20: App-Bound Encryption (Chrome 127+) - needs elevation service
        if prefix == b"v20":
            print("      cookie is v20 (App-Bound Encryption)")
            print("      v20 requires Chrome's elevation service; skipping")
            return None
        # Legacy: raw DPAPI blob (very old Chromium)
        plain = cls._dpapi_decrypt(enc)
        if plain:
            return plain.decode("utf-8", errors="replace")
        return None


# ─────────────────────────────────────────────
# Data fetcher
# ─────────────────────────────────────────────

class ClaudeDataFetcher:
    def __init__(self):
        self.data = self._empty()

    def _empty(self):
        return {
            "provider": "Claude", "plan": "Unknown", "updated": "Never",
            "session_used_pct": 0, "session_reset": "unknown",
            "weekly_used_pct": 0, "weekly_reset": "unknown",
            "opus_used_pct": 0,
            "cost_today": 0.0, "cost_today_tokens": "0",
            "cost_30d": 0.0, "cost_30d_tokens": "0",
            "source": "none", "error": None,
            "installed": False,
        }

    def _is_claude_installed(self):
        """Check if Claude Code is installed (CLI in PATH or ~/.claude exists)."""
        claude_dir = Path.home() / ".claude"
        if claude_dir.exists():
            return True
        if self._find_claude():
            return True
        if shutil.which("claude") or shutil.which("claude.cmd"):
            return True
        return False

    def fetch_all(self):
        print("[CodexBar] Fetching real usage data...")
        got_usage = False

        # 1) Try CLI
        cli = self._fetch_cli()
        if cli and cli.get("source") == "cli":
            self.data = cli
            got_usage = True
            print(f"  OK CLI: session {cli['session_used_pct']}%, weekly {cli['weekly_used_pct']}%")
        else:
            print("  -- CLI: not available")

        # 2) Try OAuth token from ~/.claude/.credentials.json
        if not got_usage:
            api = self._fetch_oauth_api()
            if api and api.get("source") == "api":
                self.data = api
                got_usage = True
                print(f"  OK OAuth: session {api['session_used_pct']}%, weekly {api['weekly_used_pct']}%")
            else:
                print("  -- OAuth: not available")

        # 3) Try browser cookie → Claude API
        if not got_usage:
            api = self._fetch_cookie_api()
            if api and api.get("source") == "api":
                self.data = api
                got_usage = True
                print(f"  OK Cookie: session {api['session_used_pct']}%, weekly {api['weekly_used_pct']}%")
            else:
                print("  -- Cookie: not available")

        # 4) Always try JSONL for cost data
        cost = self._fetch_jsonl()
        if cost:
            self.data["cost_today"] = cost["cost_today"]
            self.data["cost_today_tokens"] = cost["cost_today_tokens"]
            self.data["cost_30d"] = cost["cost_30d"]
            self.data["cost_30d_tokens"] = cost["cost_30d_tokens"]
            if self.data["source"] == "none":
                self.data["source"] = "logs"
            print(f"  OK Logs: today ${cost['cost_today']:.2f}, 30d ${cost['cost_30d']:.2f}")
        else:
            print("  -- Logs: no JSONL found")

        self.data["updated"] = datetime.now().strftime("Updated %H:%M")
        self.data["installed"] = self._is_claude_installed()
        return self.data

    def _fetch_cli(self):
        """Spawn an interactive Claude session via PTY, send /usage, parse."""
        if PtyProcess is None:
            return None
        cmd = self._find_claude()
        if not cmd:
            return None
        try:
            raw = self._pty_usage(cmd)
            if raw and "%" in raw and ("session" in raw.lower() or "week" in raw.lower()):
                return self._parse_usage(raw)
        except Exception as e:
            print(f"    CLI err: {e}")
        return None

    @staticmethod
    def _pty_usage(cmd, startup_wait=5, trust_wait=3, cmd_wait=8):
        """Open claude in a PTY, send /usage, collect output, send /exit."""
        # Use home dir as cwd to avoid "Pty is closed" conflict when another
        # Claude Code session is active in the current working directory.
        neutral_cwd = str(Path.home())
        # Use simple 'cmd.exe /c claude' to avoid quoting issues with paths.
        proc = PtyProcess.spawn(
            "cmd.exe /c claude",
            dimensions=(40, 120),
            cwd=neutral_cwd,
        )
        chunks = []
        stop = threading.Event()

        def reader():
            while not stop.is_set():
                try:
                    d = proc.read(8192)
                    if d:
                        chunks.append(d)
                except EOFError:
                    break
                except Exception:
                    time.sleep(0.1)

        t = threading.Thread(target=reader, daemon=True)
        t.start()

        try:
            time.sleep(startup_wait)       # wait for welcome / trust prompt
            # Accept the workspace trust prompt if shown ("Yes, I trust...")
            proc.write("\r")
            time.sleep(trust_wait)         # wait for welcome screen after trust
            proc.write("/usage\r")         # select from autocomplete + execute
            time.sleep(cmd_wait)           # wait for usage data to render
        finally:
            stop.set()
            try:
                proc.write("/exit\r")
            except Exception:
                pass
            time.sleep(1)
            try:
                proc.close(force=True)
            except Exception:
                pass
            t.join(timeout=3)

        return "".join(chunks)

    def _find_claude(self):
        places = [
            Path(os.environ.get("APPDATA", "")) / "npm" / "claude.cmd",
            Path(os.environ.get("APPDATA", "")) / "npm" / "claude",
            Path.home() / ".claude" / "local" / "claude.exe",
            Path.home() / "scoop" / "shims" / "claude.cmd",
        ]
        for p in places:
            if p.exists():
                print(f"    Found claude: {p}")
                return str(p)
        r = shutil.which("claude") or shutil.which("claude.cmd")
        if r:
            print(f"    Found claude in PATH: {r}")
        return r

    def _parse_usage(self, raw):
        """Parse the /usage output from the interactive Claude CLI.

        After ANSI stripping, the PTY output has this line structure
        (one piece of data per line, section header on its own line):

            L0: Current session
            L1: ███                 6%used
            L2: Reses4pm (Europe/Malta)        ← "Resets" mangled
            L3: Current week (all models)
            L4: ███▌                7%used
            L5: Resets Mar 27, 9:59am (Europe/Malta)
        """
        # strip VT100 / ANSI / OSC / control chars
        clean = re.sub(r'\x1b\[[0-9;?]*[A-Za-z]', '', raw)
        clean = re.sub(r'\x1b\][^\x07\x1b]*[\x07]', '', clean)
        clean = re.sub(r'\x1b[()>][0-9A-Z]', '', clean)
        clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', clean)

        d = self._empty()
        d["source"] = "cli"

        # After ANSI stripping the Windows PTY often puts all fields on
        # one line.  Insert newlines before known section headers and
        # before "Resets" / "%used" so the line-by-line parser works.
        clean = re.sub(r'(Current\s+session)', r'\n\1', clean, flags=re.I)
        clean = re.sub(r'(Current\s+week)', r'\n\1', clean, flags=re.I)
        clean = re.sub(r'(\d+\s*%\s*used)', r'\n\1', clean, flags=re.I)
        clean = re.sub(r'([Rr]es(?:et)?s?\s+\w)', r'\n\1', clean)

        lines = clean.split("\n")

        section = None        # "session" | "weekly" | "sonnet"
        for line in lines:
            lo = line.lower().strip()

            # ── section headers ──
            # Don't 'continue' - the header and data can land on the
            # same line after ANSI stripping in the Windows PTY.
            if "current session" in lo:
                section = "session"
            elif "current week" in lo and "sonnet" not in lo:
                section = "weekly"
            elif "sonnet" in lo and "week" in lo:
                section = "sonnet"

            if not section:
                continue

            # ── percentage: "6%used" / "6% used" ──
            m = re.search(r'(\d+)\s*%\s*used', line, re.I)
            if m:
                pct = int(m.group(1))
                if section == "session":
                    d["session_used_pct"] = pct
                elif section == "weekly":
                    d["weekly_used_pct"] = pct

            # ── reset: tolerant pattern for "Resets"/"Reses"/"Reset" ──
            # ANSI stripping can eat characters, so match broadly:
            #   "Resets 4pm ...", "Reses4pm ...", "Reset Mar 27 ..."
            rm = re.search(
                r'[Rr]es[et]*s?\s*(.+)', line)
            if rm:
                val = rm.group(1).strip()
                # drop trailing noise ("Esc to cancel", timezone in parens)
                val = re.sub(r'\s*Esc.*$', '', val).rstrip(". ")
                val = re.sub(r'\s*\([^)]*\)\s*$', '', val).strip()
                if val and len(val) > 2:
                    if section == "session":
                        d["session_reset"] = val
                    elif section == "weekly":
                        d["weekly_reset"] = val

        # ── plan from welcome screen: "Claude Max" / "ClaudeMax" ──
        m = re.search(r'Claude\s*(Max|Pro|Team|Enterprise|Free)',
                       clean, re.I)
        if m:
            d["plan"] = m.group(1).title()

        return d

    # ── OAuth token fetcher ───────────────────

    _CREDS_PATH = Path.home() / ".claude" / ".credentials.json"

    def _fetch_oauth_api(self):
        """Read the OAuth access token that Claude Code stores locally,
        then call the Claude.ai API to get live usage data."""
        if not self._CREDS_PATH.exists():
            return None
        try:
            with open(self._CREDS_PATH, "r", encoding="utf-8") as f:
                creds = json.load(f)
            oauth = creds.get("claudeAiOauth") or {}
            token = oauth.get("accessToken")
            if not token:
                return None

            # pre-fill plan from local credentials (no network needed)
            tier = oauth.get("rateLimitTier") or oauth.get("subscriptionType") or ""
            plan_local = tier.replace("default_claude_", "").replace("_", " ").title() or "Pro"

            print(f"    OAuth token found ({len(token)} chars), plan hint: {plan_local}")
        except Exception as e:
            print(f"    OAuth creds err: {e}")
            return None

        result = self._call_claude_api(
            auth_header=("Authorization", f"Bearer {token}"),
            plan_hint=plan_local,
            source_label="api",
        )
        # Even if the API call failed, populate plan from local creds
        if result is None and plan_local:
            self.data["plan"] = plan_local
        return result

    # ── cookie-based API fetcher ────────────────

    def _fetch_cookie_api(self):
        """Read sessionKey from browser cookies, call Claude API."""
        session_key, browser = _CookieDecryptor.get_session_key()
        if not session_key:
            return None
        print(f"    Got sessionKey from {browser} ({len(session_key)} chars)")

        return self._call_claude_api(
            auth_header=("Cookie", f"sessionKey={session_key}"),
            plan_hint=None,
            source_label="api",
        )

    # ── shared API call logic ──────────────────

    def _call_claude_api(self, *, auth_header, plan_hint, source_label):
        """GET /organizations → /usage using the given auth header.

        ``auth_header`` is a (name, value) tuple, e.g.
        ("Authorization", "Bearer ...") or ("Cookie", "sessionKey=...").
        """
        headers = {
            auth_header[0]: auth_header[1],
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }

        # step 1: get organizations
        try:
            req = Request("https://api.claude.ai/api/organizations",
                          headers=headers)
            with urlopen(req, timeout=15) as resp:
                orgs = json.loads(resp.read())
        except (URLError, HTTPError, json.JSONDecodeError) as e:
            print(f"    API /organizations err: {e}")
            return None

        if not isinstance(orgs, list) or len(orgs) == 0:
            print("    API: empty org list")
            return None

        org = orgs[0]
        org_id = org.get("uuid") or org.get("id") or org.get("organization_id")
        if not org_id:
            print(f"    API: no org id in {list(org.keys())}")
            return None
        print(f"    Org: {org.get('name', '?')} ({org_id[:12]}...)")

        # step 2: get usage
        try:
            req = Request(
                f"https://api.claude.ai/api/organizations/{org_id}/usage",
                headers=headers)
            with urlopen(req, timeout=15) as resp:
                usage = json.loads(resp.read())
        except (URLError, HTTPError, json.JSONDecodeError) as e:
            print(f"    API /usage err: {e}")
            return None

        return self._parse_api_usage(usage, org, plan_hint, source_label)

    def _parse_api_usage(self, usage, org, plan_hint=None, source_label="api"):
        """Turn the /usage JSON into our standard data dict.

        The response structure is not publicly documented, so this
        tries several known field patterns defensively.
        """
        d = self._empty()
        d["source"] = source_label

        # plan name: prefer org data, then local hint
        plan_found = False
        for key in ("rate_limit_tier", "plan", "billing_type"):
            v = org.get(key)
            if v:
                d["plan"] = str(v).replace("_", " ").replace("default claude ", "").title()
                plan_found = True
                break
        if not plan_found and plan_hint:
            d["plan"] = plan_hint

        # ── helper: dig a percentage out of a sub-dict ──
        def pct_from(blob, *keys):
            """Return an int 0-100 or None."""
            if blob is None:
                return None
            # direct "X_pct" / "X_percent" / "X_percentage" field
            for k in keys:
                for suffix in ("_pct", "_percent", "_percentage", "_used_pct"):
                    v = blob.get(f"{k}{suffix}")
                    if v is not None:
                        return max(0, min(100, int(v)))
            # compute from used / limit
            used = blob.get("used") or blob.get("tokens_used") or 0
            limit = blob.get("limit") or blob.get("max_tokens") or blob.get("allowed") or 0
            if limit > 0:
                return max(0, min(100, int(used / limit * 100)))
            return None

        def reset_from(blob):
            """Return a human string like '3h 20m' or None."""
            if blob is None:
                return None
            for k in ("reset_at", "resets_at", "reset_time", "expires_at"):
                v = blob.get(k)
                if not v:
                    continue
                try:
                    dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
                    delta = dt - datetime.now(dt.tzinfo)
                    secs = max(0, int(delta.total_seconds()))
                    h, m = divmod(secs // 60, 60)
                    if h >= 24:
                        return f"{h // 24}d {h % 24}h"
                    return f"{h}h {m:02d}m"
                except Exception:
                    pass
            return None

        # The API may return:
        #   {"daily_usage": {...}, "monthly_usage": {...}}
        #   {"session_limit": {...}, "weekly_limit": {...}}
        #   {"messageLimit": {"remaining": N, ...}}
        #   or a flat dict with percentage fields

        # try nested blobs first
        session_blob = (usage.get("daily_usage")
                        or usage.get("session_limit")
                        or usage.get("session")
                        or usage.get("messageLimit"))
        weekly_blob  = (usage.get("monthly_usage")
                        or usage.get("weekly_limit")
                        or usage.get("weekly")
                        or usage.get("longTermUsage"))

        sp = pct_from(session_blob, "daily", "session", "message", "used")
        wp = pct_from(weekly_blob,  "monthly", "weekly", "long_term", "used")

        # if nothing nested, try flat fields
        if sp is None:
            sp = pct_from(usage, "daily", "session", "message")
        if wp is None:
            wp = pct_from(usage, "monthly", "weekly", "long_term")

        # remaining-based: messageLimit.remaining / total
        if sp is None and isinstance(session_blob, dict):
            rem = session_blob.get("remaining")
            tot = session_blob.get("total") or session_blob.get("limit")
            if rem is not None and tot:
                sp = max(0, min(100, int((1 - rem / tot) * 100)))

        if sp is not None:
            d["session_used_pct"] = sp
        if wp is not None:
            d["weekly_used_pct"] = wp

        sr = reset_from(session_blob) or reset_from(usage)
        wr = reset_from(weekly_blob)
        if sr:
            d["session_reset"] = sr
        if wr:
            d["weekly_reset"] = wr

        # debug: show raw keys so user can report the shape
        print(f"    API usage keys: {list(usage.keys())}")
        if session_blob and isinstance(session_blob, dict):
            print(f"    session blob keys: {list(session_blob.keys())}")

        return d

    def _fetch_jsonl(self):
        dirs = [Path.home() / ".claude" / "projects", Path.home() / ".claude"]
        total_in = total_out = total_cache = today_in = today_out = 0
        seen = set()
        today = datetime.now().date()
        nfiles = 0

        for d in dirs:
            if not d.exists(): continue
            for f in d.rglob("*.jsonl"):
                nfiles += 1
                try:
                    with open(f, 'r', encoding='utf-8', errors='ignore') as fh:
                        for line in fh:
                            line = line.strip()
                            if not line or len(line) < 10: continue
                            try: entry = json.loads(line)
                            except Exception: continue
                            if entry.get("type") != "assistant": continue
                            usage = entry.get("message",{}).get("usage",{})
                            if not usage: continue
                            mid = entry.get("message",{}).get("id","")
                            rid = entry.get("requestId","")
                            key = f"{mid}:{rid}"
                            if key in seen: continue
                            seen.add(key)
                            inp = usage.get("input_tokens",0)
                            out = usage.get("output_tokens",0)
                            cr = usage.get("cache_read_input_tokens",0)
                            cc = usage.get("cache_creation_input_tokens",0)
                            total_in += inp; total_out += out; total_cache += cr+cc
                            ts = entry.get("timestamp","")
                            if ts:
                                try:
                                    if datetime.fromisoformat(ts.replace("Z","+00:00")).date() == today:
                                        today_in += inp; today_out += out
                                except Exception: pass
                except Exception: continue

        print(f"    Scanned {nfiles} files, {len(seen)} messages")
        if total_in + total_out == 0: return None

        c30 = (total_in*3 + total_out*15 + total_cache*1.5) / 1e6
        ct = (today_in*3 + today_out*15) / 1e6

        def fmt(n):
            if n >= 1e6: return f"{n/1e6:.0f}M"
            if n >= 1e3: return f"{n/1e3:.0f}K"
            return str(n)

        return {
            "cost_today": round(ct,2), "cost_today_tokens": fmt(today_in+today_out),
            "cost_30d": round(c30,2), "cost_30d_tokens": fmt(total_in+total_out+total_cache),
        }


# ─────────────────────────────────────────────
# Tray icon  (unchanged)
# ─────────────────────────────────────────────

def _load_logo(name="claude-logo.png", size=28):
    """Load and resize a logo from assets/."""
    logo_path = _resource_path("assets") / name
    if not logo_path.exists():
        return None
    try:
        img = Image.open(logo_path).convert("RGBA")
        w, h = img.size
        # If aspect ratio is very wide (wordmark), crop to leftmost square
        if w / h > 1.5:
            square = min(w, h)
            img = img.crop((0, 0, square, square))
        img = img.resize((size, size), Image.LANCZOS)
        return img
    except Exception:
        return None


def _make_openai_icon(size=28):
    """Generate a simple OpenAI-style icon (green hexagonal knot)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    import math
    cx, cy = size / 2, size / 2
    r = size * 0.42
    # draw a hexagon outline
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    d.polygon(pts, outline=(16, 163, 127, 255), fill=None)
    # draw inner lines connecting alternating vertices
    lw = max(1, size // 14)
    for i in range(6):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 2) % 6]
        d.line([(x1, y1), (x2, y2)], fill=(16, 163, 127, 255), width=lw)
    # draw the hexagon outline again on top
    for i in range(6):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % 6]
        d.line([(x1, y1), (x2, y2)], fill=(16, 163, 127, 255), width=lw)
    return img


def make_icon(sp=0, wp=0, sz=64, provider="claude"):
    """Generate a system-tray icon with provider logo, percentage overlay, and status dot.

    Args:
        sp: Session percentage (0-100) for dot color
        wp: Weekly percentage (unused, kept for compatibility)
        sz: Icon size in pixels
        provider: "claude", "openai", or "zai"
    """
    # Color palette per provider
    COLORS = {
        "claude": {
            "logo": "claude-logo.png",
            "accent": (217, 119, 87),  # CL_ACCENT
            "green": (217, 119, 87),   #Same as accent for claude
        },
        "openai": {
            "logo": "openai-icon.png",
            "accent": (16, 163, 127),  # OA_GREEN
            "green": (16, 163, 127),
        },
        "zai": {
            "logo": "zai-logo.png",
            "accent": (74, 108, 247),  # ZA_ACCENT
            "green": (74, 108, 247),
        },
        "minimax": {
            "logo": "minimax-logo.png",
            "accent": (255, 106, 0),  # MM_ACCENT
            "green": (255, 106, 0),
        },
        "opencode": {
            "logo": "opencode-logo.png",
            "accent": (0, 212, 170),  # OC_ACCENT
            "green": (0, 212, 170),
        },
    }

    colors = COLORS.get(provider, COLORS["claude"])

    # Create base transparent image
    img = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Try to load provider logo
    pct = int(sp) if isinstance(sp, (int, float)) else 0

    logo = _load_logo(colors["logo"], sz)
    # Draw percentage-colored background circle
    margin = 4
    if pct < 50:
        circle_color = (74, 180, 100)   # Green
    elif pct < 70:
        circle_color = (232, 168, 62)   # Yellow
    else:
        circle_color = (226, 75, 74)    # Red
    d.ellipse([margin, margin, sz - margin, sz - margin], fill=circle_color)
    if logo:
        img.paste(logo, (0, 0), logo if logo.mode == 'RGBA' else None)
    else:
        pass  # Circle already drawn above


    # Draw percentage text centered on icon - FIXED for Windows compatibility
    if True:
        try:
            font_size = max(16, sz // 3)
            
            # Try common Windows fonts with absolute paths
            fonts_to_try = [
                ("C:/Windows/Fonts/seguiemj.ttf", font_size),    # Segoe UI Emoji
                ("C:/Windows/Fonts/seguisb.ttf", font_size),     # Segoe UI Semibold
                ("C:/Windows/Fonts/segoeuib.ttf", font_size),   # Segoe UI Bold
                ("C:/Windows/Fonts/arialbd.ttf", font_size),    # Arial Bold
                ("C:/Windows/Fonts/tahomabd.ttf", font_size),   # Tahoma Bold
                ("C:/Windows/Fonts/verdana.ttf", font_size),    # Verdana
                ("C:/Windows/Fonts/arial.ttf", font_size),      # Arial
                ("C:/Windows/Fonts/consola.ttf", font_size),    # Consolas
                ("C:/Windows/Fonts/cour.ttf", font_size),       # Courier New
            ]
            
            font = None
            for font_path, fsize in fonts_to_try:
                try:
                    font = ImageDraw.ImageFont.truetype(font_path, fsize)
                    print(f"[TRAY] Loaded font: {font_path}", flush=True)
                    break
                except Exception:
                    pass
            
            if font is None:
                font = ImageDraw.ImageFont.load_default()
                print(f"[TRAY] Using default font", flush=True)
            
            text = f"{pct}%"
            bbox = d.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            text_x = (sz - text_w) // 2
            text_y = (sz - text_h) // 2 - 2
            
            # Draw thick white outline
            outline_color = (255, 255, 255, 255)
            for ox in [-2, -1, 0, 1, 2]:
                for oy in [-2, -1, 0, 1, 2]:
                    if abs(ox) + abs(oy) <= 3:
                        d.text((text_x + ox, text_y + oy), text, font=font, fill=outline_color)
            d.text((text_x, text_y), text, font=font, fill=(0, 0, 0, 255))
            print(f"[TRAY] Drew text '{text}' at ({text_x},{text_y})", flush=True)
        except Exception as e:
            print(f"[TRAY] Text draw error: {e}", flush=True)
            pass

    # Draw colored dot indicator in bottom-right corner

    # Draw colored dot indicator in bottom-right corner
    # Color based on percentage:
    # <50%: green/accent, 50-70%: yellow, >70%: red
    dot_radius = max(3, sz // 10)
    dot_margin = 2
    dot_x = sz - dot_radius - dot_margin
    dot_y = sz - dot_radius - dot_margin

    if pct < 50:
        dot_color = colors["green"] + (255,)  # Green/accent
    elif pct < 70:
        dot_color = (232, 168, 62, 255)  # Yellow #E8A83E
    else:
        dot_color = (226, 75, 74, 255)  # Red #E24B4A

    # Draw dot with white outline for visibility
    d.ellipse(
        [dot_x - dot_radius, dot_y - dot_radius, dot_x + dot_radius, dot_y + dot_radius],
        fill=dot_color,
        outline=(255, 255, 255, 200),
        width=1
    )

    return img


# ─────────────────────────────────────────────
# OpenAI Codex data fetcher
# ─────────────────────────────────────────────

class CodexDataFetcher:
    """Fetch usage data from OpenAI Codex local session files (~/.codex/)."""

    CODEX_DIR = Path.home() / ".codex"

    @staticmethod
    def _empty():
        return {
            "provider": "Codex", "plan": "Plus",
            "updated": "Never", "source": "none",
            "session_used_pct": 0, "session_reset": "unknown",
            "weekly_used_pct": 0, "weekly_reset": "unknown",
            "cost_today": 0, "cost_today_tokens": "0",
            "cost_30d": 0, "cost_30d_tokens": "0",
            "model": "",
            "error": None, "available": False,
        }

    def fetch(self):
        d = self._empty()

        if not self.CODEX_DIR.exists():
            d["error"] = "Codex not installed"
            return d

        d["available"] = True

        # read config for model
        try:
            config = self.CODEX_DIR / "config.toml"
            if config.exists():
                for line in config.read_text().splitlines():
                    if line.startswith("model"):
                        d["model"] = line.split("=", 1)[1].strip().strip('"')
                        break
        except Exception:
            pass

        # read auth for plan type
        try:
            auth = self.CODEX_DIR / "auth.json"
            if auth.exists():
                aj = json.loads(auth.read_text(encoding="utf-8"))
                # plan is embedded in the JWT claims
                tokens = aj.get("tokens", {})
                at = tokens.get("access_token", "")
                if at:
                    # decode JWT payload (base64 middle segment)
                    parts = at.split(".")
                    if len(parts) >= 2:
                        payload = parts[1] + "=" * (4 - len(parts[1]) % 4)
                        claims = json.loads(base64.b64decode(payload))
                        plan = claims.get("https://api.openai.com/auth", {}).get(
                            "chatgpt_plan_type", "")
                        if plan:
                            d["plan"] = plan.capitalize()
        except Exception:
            pass

        # scan session JSONL files for rate_limits + token usage
        self._scan_sessions(d)

        d["updated"] = datetime.now().strftime("Updated %H:%M")
        return d

    def _scan_sessions(self, d):
        """Scan ~/.codex/sessions/ JSONL files for rate limits and tokens."""
        sessions_dir = self.CODEX_DIR / "sessions"
        if not sessions_dir.exists():
            d["source"] = "config"
            return

        # find all JSONL rollout files
        jsonl_files = sorted(sessions_dir.rglob("*.jsonl"),
                             key=lambda f: f.stat().st_mtime, reverse=True)
        if not jsonl_files:
            d["source"] = "config"
            return

        print(f"    Codex: scanning {len(jsonl_files)} session files")

        # get rate limits from most recent file (last token_count entry)
        latest_limits = None
        for jf in jsonl_files[:5]:  # check latest 5 files
            limits = self._extract_rate_limits(jf)
            if limits:
                latest_limits = limits
                break

        if latest_limits:
            rl = latest_limits
            # primary = 5h window
            primary = rl.get("primary", {})
            if primary:
                d["session_used_pct"] = int(primary.get("used_percent", 0))
                resets_at = primary.get("resets_at")
                if resets_at:
                    d["session_reset"] = self._format_reset(resets_at)

            # secondary = weekly window
            secondary = rl.get("secondary", {})
            if secondary:
                d["weekly_used_pct"] = int(secondary.get("used_percent", 0))
                resets_at = secondary.get("resets_at")
                if resets_at:
                    d["weekly_reset"] = self._format_reset(resets_at)

            plan = rl.get("plan_type", "")
            if plan:
                d["plan"] = plan.capitalize()
            d["source"] = "sessions"
        else:
            d["source"] = "config"

        # sum token usage across all sessions for cost estimate
        total_in = total_out = today_in = today_out = 0
        today = datetime.now().date()

        for jf in jsonl_files:
            try:
                tokens = self._extract_total_tokens(jf)
                if not tokens:
                    continue
                inp = tokens.get("input_tokens", 0)
                out = tokens.get("output_tokens", 0)
                total_in += inp
                total_out += out

                # check if file is from today
                try:
                    ts_str = jf.stem.split("rollout-")[1][:10]  # "2026-03-22"
                    if datetime.strptime(ts_str, "%Y-%m-%d").date() == today:
                        today_in += inp
                        today_out += out
                except Exception:
                    pass
            except Exception:
                continue

        # OpenAI pricing estimate (gpt-4o class: ~$2.50/M input, ~$10/M output)
        c30 = (total_in * 2.5 + total_out * 10) / 1e6
        ct = (today_in * 2.5 + today_out * 10) / 1e6

        def fmt(n):
            if n >= 1e6: return f"{n / 1e6:.1f}M"
            if n >= 1e3: return f"{n / 1e3:.0f}K"
            return str(n)

        d["cost_today"] = round(ct, 2)
        d["cost_today_tokens"] = fmt(today_in + today_out)
        d["cost_30d"] = round(c30, 2)
        d["cost_30d_tokens"] = fmt(total_in + total_out)

    @staticmethod
    def _extract_rate_limits(jsonl_path):
        """Return the last rate_limits dict from a JSONL file."""
        last = None
        try:
            with open(jsonl_path, "r", encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    line = line.strip()
                    if not line or "rate_limits" not in line:
                        continue
                    try:
                        e = json.loads(line)
                        p = e.get("payload", {})
                        if isinstance(p, dict) and p.get("type") == "token_count":
                            rl = p.get("rate_limits")
                            if rl:
                                last = rl
                    except Exception:
                        pass
        except Exception:
            pass
        return last

    @staticmethod
    def _extract_total_tokens(jsonl_path):
        """Return total_token_usage from the last token_count entry."""
        last = None
        try:
            with open(jsonl_path, "r", encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    line = line.strip()
                    if not line or "total_token_usage" not in line:
                        continue
                    try:
                        e = json.loads(line)
                        p = e.get("payload", {})
                        if isinstance(p, dict) and p.get("type") == "token_count":
                            t = p.get("info", {}).get("total_token_usage")
                            if t:
                                last = t
                    except Exception:
                        pass
        except Exception:
            pass
        return last

    @staticmethod
    def _format_reset(epoch):
        """Convert epoch timestamp to human-readable countdown."""
        try:
            dt = datetime.fromtimestamp(epoch)
            delta = dt - datetime.now()
            secs = max(0, int(delta.total_seconds()))
            h, m = divmod(secs // 60, 60)
            if h >= 24:
                return f"{h // 24}d {h % 24}h"
            return f"{h}h {m:02d}m"
        except Exception:
            return "unknown"


# ─────────────────────────────────────────────
# Z.AI data fetcher  (added by Romul)
# ─────────────────────────────────────────────

class ZaiDataFetcher:
    """Fetch usage quota from Z.AI API.

    Uses Bearer token from env var ZAI_API_TOKEN.
    Endpoint: https://api.z.ai/api/monitor/usage/quota/limit
    """

    API_URL = "https://api.z.ai/api/monitor/usage/quota/limit"
    TIMEOUT = 10

    @staticmethod
    def _empty():
        return {
            "provider": "Z.AI",
            "plan": "Unknown",
            "updated": "Never",
            "source": "none",
            "session_used_pct": 0,
            "session_reset": "unknown",
            "weekly_used_pct": 0,
            "weekly_reset": "unknown",
            "mcp_used_pct": 0,
            "mcp_reset": "unknown",
            "cost_today": 0,
            "cost_today_tokens": "0",
            "cost_30d": 0,
            "cost_30d_tokens": "0",
            "model": "",
            "error": None,
            "available": False,
        }

    def fetch(self):
        d = self._empty()
        token = os.environ.get("ZAI_API_TOKEN", "")
        if not token:
            d["error"] = "ZAI_API_TOKEN not set"
            return d

        d["available"] = True
        result = self._fetch_from_api(token)
        if result is not None:
            d.update(result)
            d["source"] = "api"
        else:
            d["error"] = d.get("error") or "API request failed"

        d["updated"] = datetime.now().strftime("Updated %H:%M")
        return d

    def _fetch_from_api(self, token):
        """Call Z.AI quota API. Returns partial dict or None on error."""
        try:
            req = Request(self.API_URL, headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            })
            with urlopen(req, timeout=self.TIMEOUT) as resp:
                data = json.loads(resp.read())
        except HTTPError as e:
            if e.code in (401, 403):
                print(f"    Z.AI: auth error {e.code}")
            else:
                print(f"    Z.AI: HTTP {e.code}")
            return None
        except (URLError, TimeoutError) as e:
            print(f"    Z.AI: connection error: {e}")
            return None
        except Exception as e:
            print(f"    Z.AI: error: {e}")
            return None

        # Parse actual Z.AI response structure:
        # {"data": {"limits": [...], "level": "..."}}
        result = {}
        try:
            data_root = data.get("data", {})
            limits = data_root.get("limits", [])
            tok_limits = [l for l in limits if l.get("type") == "TOKENS_LIMIT"]
            time_limits = [l for l in limits if l.get("type") == "TIME_LIMIT"]

            for lim in tok_limits:
                unit = lim.get("unit")  # unit 3 = session, 6 = weekly
                pct = lim.get("percentage", 0)
                if unit == 3:
                    result["session_used_pct"] = min(100, pct)
                elif unit == 6:
                    result["weekly_used_pct"] = min(100, pct)

            # Parse TIME_LIMIT (unit 5) for MCP servers usage
            for lim in time_limits:
                unit = lim.get("unit")
                if unit == 5:  # MCP servers usage
                    result["mcp_used_pct"] = min(100, lim.get("percentage", 0))
                    ts_ms = lim.get("nextResetTime")
                    if ts_ms:
                        ts_sec = ts_ms / 1000
                        delta = ts_sec - datetime.now().timestamp()
                        if delta < 0:
                            delta = 0
                        h, m = divmod(int(delta) // 60, 60)
                        result["mcp_reset"] = f"{h}h {m:02d}m" if h < 24 else f"{h // 24}d {h % 24}h"

            for lim in limits:
                ts_ms = lim.get("nextResetTime")
                if not ts_ms:
                    continue
                ts_sec = ts_ms / 1000
                delta = ts_sec - datetime.now().timestamp()
                if delta < 0:
                    delta = 0
                h, m = divmod(int(delta) // 60, 60)
                label = f"{h}h {m:02d}m" if h < 24 else f"{h // 24}d {h % 24}h"
                unit = lim.get("unit")
                if unit == 3:
                    result["session_reset"] = label
                elif unit == 6:
                    result["weekly_reset"] = label

            result["plan"] = data_root.get("level", "Unknown")
            result["source"] = "api"
            return result
        except Exception as e:
            print(f"    Z.AI: parse error: {e}")
            return None

        return result


VERSION = "2.2.29"

# ─────────────────────────────────────────────
# MiniMax data fetcher  (added by Romul)
# ─────────────────────────────────────────────

class MiniMaxDataFetcher:
    """Fetch usage quota from MiniMax AI.

    Primary auth: Bearer token (API key from MINIMAX_API_KEY env or settings.json).
    Fallback: browser cookie (HMACCCS from .minimax.io).
    """

    TIMEOUT = 15
    API_URL = "https://api.minimax.io/v1/api/openplatform/coding_plan/remains"
    LOG_FILE = "minimax_debug.log"

    def __init__(self):
        self.data = self._empty()

    def _log(self, *args):
        """Write debug line to log file."""
        try:
            log_path = Path(__file__).parent / self.LOG_FILE
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(" ".join(str(a) for a in args) + "\n")
        except Exception:
            pass

    def _empty(self):
        return {
            "provider": "MiniMax",
            "plan": "—",
            "updated": "Never",
            "source": "none",
            "session_used_pct": 0,
            "session_reset": "—",
            "weekly_used_pct": 0,
            "weekly_reset": "—",
            "error": None,
            "available": False,
        }

    @staticmethod
    def _settings_token() -> str:
        # Read directly from settings.json - CodexBarApp writes this on startup
        settings_path = Path(os.environ.get("LOCALAPPDATA", "")) / "CodexBar" / "settings.json"
        if not settings_path.exists():
            settings_path = Path.home() / ".codexbar" / "settings.json"
        try:
            if settings_path.exists():
                data = json.loads(settings_path.read_text())
                return data.get("minimax_token", "")
        except Exception:
            pass
        return os.environ.get("MINIMAX_API_KEY", "")

    def _load(self) -> dict:
        """Load bearer token (API key) or browser cookies from .minimax.io."""
        # First try env var (set by app on startup from settings.json)
        token = os.environ.get("MINIMAX_API_KEY", "")
        if not token:
            # Try reading directly from settings.json
            settings_path = Path(os.environ.get("LOCALAPPDATA", "")) / "CodexBar" / "settings.json"
            if not settings_path.exists():
                settings_path = Path.home() / ".codexbar" / "settings.json"
            try:
                if settings_path.exists():
                    data = json.loads(settings_path.read_text())
                    token = data.get("minimax_token", "")
            except Exception:
                pass
        if token:
            return {"__bearer_token__": token}
        return _CookieDecryptor.get_cookies(".minimax.io", "HMACCCS", "locale")

    def fetch(self):
        d = self._empty()
        self._log("=== MiniMax fetch() start")
        auth = self._load()
        self._log("_load() returned:", auth)
        bearer = auth.get("__bearer_token__", "")
        hmac = auth.get("HMACCCS", "")
        locale = auth.get("locale", "en")
        self._log(f"bearer={'YES' if bearer else 'EMPTY'}, hmac={'YES' if hmac else 'EMPTY'}")

        if bearer:
            self._log("Using Bearer token")
            result = self._call_api(bearer, hmac, locale)
        elif hmac:
            self._log("Using HMAC cookie")
            result = self._call_api(bearer, hmac, locale)
        else:
            self._log("No auth available!")
            d["error"] = "no MiniMax auth; set token in Settings or login to browser"
            d["available"] = False
            d["updated"] = datetime.now().strftime("Updated %H:%M")
            return d

        self._log(f"_call_api() returned: {result}")
        if result is not None:
            d.update(result)
        self._log(f"Final d: {d}")
        d["updated"] = datetime.now().strftime("Updated %H:%M")
        return d

    def _call_api(self, token: str, hmac: str, locale: str):
        """Call /coding_plan/remains with Bearer token or HMACCCS cookie."""
        print(f"    MiniMax API call: URL={self.API_URL}, token={'YES' if token else 'EMPTY'}, hmac={'YES' if hmac else 'EMPTY'}")
        try:
            headers = {
                "Authorization": f"Bearer {token}" if token else None,
                "Cookie": f"HMACCCS={hmac}; locale={locale}" if hmac else None,
                "MM-API-Source": "web",
                "Accept": "application/json",
            }
            headers = {k: v for k, v in headers.items() if v is not None}
            self._log(f"Request: GET {self.API_URL}")
            self._log(f"Headers: {headers}")
            req = Request(self.API_URL, headers=headers)
            with urlopen(req, timeout=self.TIMEOUT) as resp:
                raw = json.loads(resp.read())
                self._log(f"Response OK, bytes: {len(json.dumps(raw))}")
                self._log(f"Response preview: {str(raw)[:300]}")
        except HTTPError as e:
            body = e.read().decode()[:200] if e.response else ""
            self._log(f"HTTPError {e.code}: {body}")
            print(f"    MiniMax HTTP {e.code}: {body}")
            if e.code in (401, 403):
                return {"error": "invalid token or expired"}
            return None
        except Exception as e:
            self._log(f"Exception: {e}")
            print(f"    MiniMax: {e}")
            return None

        return self._parse(raw)

    def _parse(self, data: dict):
        self._log("_parse() received:", str(data)[:400])
        result = {}
        base = data.get("base_resp", {})
        if base.get("status_code", -1) != 0:
            msg = base.get("status_msg", "error")
            self._log(f"API error: {msg}")
            return {"error": msg}

        items = data.get("data", {}).get("model_remains", [])
        if not items:
            # Try flat model_remains
            items = data.get("model_remains", [])

        if not items:
            return {"error": "no usage data in response"}

        # Find coding-plan entry
        cp = None
        for item in items:
            name = item.get("model_name", "")
            total = item.get("current_interval_total_count", 0) or item.get("max_calls", 0)
            if total > 0 or "coding" in name.lower():
                cp = item
                if "coding" in name.lower():
                    break
        if not cp:
            cp = items[0]

        total = cp.get("current_interval_total_count", 0) or cp.get("max_calls", 0)
        # MiniMax API returns remaining count in current_interval_usage_count (NOT used count!)
        # So used = total - remaining, and remaining% = 100 - used%
        remaining = cp.get("current_interval_usage_count", 0) or cp.get("used_calls", 0)
        used = max(0, total - remaining)
        pct = min(100, round(used / total * 100)) if total > 0 else 0
        result["session_used_pct"] = pct

        w_total = cp.get("current_weekly_total_count", 0)
        # MiniMax API: current_weekly_usage_count is also remaining, not used
        w_remaining = cp.get("current_weekly_usage_count", 0)
        w_used = max(0, w_total - w_remaining)
        wpct = min(100, round(w_used / w_total * 100)) if w_total > 0 else 0
        result["weekly_used_pct"] = wpct

        # Weekly reset time (if available)
        weekly_end = cp.get("current_weekly_end_time") or cp.get("week_end_time")
        if weekly_end:
            ts = weekly_end / 1000 if weekly_end > 1e12 else weekly_end
            remaining = max(0, ts - datetime.now().timestamp())
            h, m = divmod(int(remaining // 60), 60)
            result["weekly_reset"] = f"{h}h {m:02d}m" if h < 24 else f"{h // 24}d {h % 24}h"
        else:
            result["weekly_reset"] = "—"

        end = cp.get("end_time")
        if end:
            ts = end / 1000 if end > 1e12 else end
            remaining = max(0, ts - datetime.now().timestamp())
            h, m = divmod(int(remaining // 60), 60)
            result["session_reset"] = f"{h}h {m:02d}m" if h < 24 else f"{h // 24}d {h % 24}h"

        sub = data.get("data", {}).get("current_subscribe_title", "")
        result["plan"] = sub if sub else "—"
        result["available"] = True
        return result


class OpenCodeDataFetcher:
    LOG_FILE = "opencode_debug.log"

    def _log(self, *args):
        try:
            log_path = Path(__file__).parent / self.LOG_FILE
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(" ".join(str(a) for a in args) + "\n")
        except Exception:
            pass

    """Fetch usage quota from OpenCode.ai via browser cookies (auto-read).

    Reads ``auth`` and ``oc_locale`` cookies from .opencode.ai in Chrome, Edge, or
    Brave, then fetches the workspace page to extract embedded usage data.

    Matches the CodexBar macOS v0.20 approach: cookie extraction + workspace page parsing.
    """

    TIMEOUT = 15
    USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "Chrome/131.0.0.0 Safari/537.36")

    _cookie_header = None  # manually set cookie (fallback)

    @classmethod
    def _load_cookies_from_browser(cls) -> str | None:
        """Extract auth cookie from .opencode.ai in any browser. Returns cookie header or None."""
        cookies = _CookieDecryptor.get_cookies(".opencode.ai", "auth", "oc_locale")
        if not cookies:
            return None
        # Build header: auth=<value>; oc_locale=<value>
        parts = []
        if "auth" in cookies and cookies["auth"]:
            parts.append(f"auth={cookies['auth']}")
        if "oc_locale" in cookies and cookies["oc_locale"]:
            parts.append(f"oc_locale={cookies['oc_locale']}")
        return "; ".join(parts) if parts else None

    @staticmethod
    def _load_cookie_from_settings() -> str:
        """Load manually saved cookie from settings file (fallback)."""
        try:
            if SettingsPopup._config_path().exists():
                data = json.loads(SettingsPopup._config_path().read_text())
                return data.get("opencode_cookie", "") or os.environ.get("OPENCODE_COOKIE", "")
        except Exception:
            pass
        return os.environ.get("OPENCODE_COOKIE", "")

    @classmethod
    def set_cookie(cls, cookie_header: str):
        cls._cookie_header = cookie_header

    @staticmethod
    def _empty():
        return {
            "provider": "OpenCode", "plan": "Go", "updated": "Never",
            "source": "none", "session_used_pct": 0, "session_reset": "unknown",
            "weekly_used_pct": 0, "weekly_reset": "unknown",
            "cost_today": 0, "cost_today_tokens": "0",
            "cost_30d": 0, "cost_30d_tokens": "0", "model": "", "error": None, "available": False,
        }

    @staticmethod
    def _workspace_url() -> str:
        # Try to load saved workspace_id, default to the known one
        try:
            if SettingsPopup._config_path().exists():
                data = json.loads(SettingsPopup._config_path().read_text())
                ws_id = data.get("opencode_workspace_id", "").strip()
                if ws_id:
                    return f"https://opencode.ai/workspace/{ws_id}/go"
        except Exception:
            pass
        # Fallback to hardcoded workspace (also used in old code)
        return "https://opencode.ai/workspace/wrk_01KMQEY05J8B7SBJW3HH57JNVY/go"

    def fetch(self):
        d = self._empty()

        # Priority: manual cookie > browser cookie
        cookie = self._cookie_header or self._load_cookie_from_settings()
        if not cookie:
            # Try auto-read from browser
            cookie = self._load_cookies_from_browser()
        if not cookie:
            d["error"] = "cookie not found in browser; please login at opencode.ai"
            return d
        d["available"] = True

        import re as _re
        url = self._workspace_url()

        # Normalise to auth= prefix if raw session key passed
        cookie_header = cookie if cookie.startswith("auth=") else f"auth={cookie}"

        try:
            req = Request(url, headers={"Cookie": cookie_header, "User-Agent": self.USER_AGENT})
            with urlopen(req, timeout=self.TIMEOUT) as resp:
                html = resp.read().decode("utf-8", errors="replace")

            def _parse_usage(html, label):
                # HTML: rollingUsage:$R[31]={status:'ok',resetInSec:3600,usagePercent:15}
                # Uses SINGLE QUOTES - json.loads can't parse, use regex extraction instead
                pattern = label + r':\$R\[\d+\]=\{([^}]+)\}'
                m = _re.search(pattern, html)
                if m:
                    try:
                        fields = m.group(1)
                        secs_m = _re.search(r'resetInSec:(\d+)', fields)
                        pct_m = _re.search(r'usagePercent:(\d+)', fields)
                        if secs_m and pct_m:
                            secs = int(secs_m.group(1))
                            pct = int(pct_m.group(1))
                            self._log(f"  {label}: secs={secs}, pct={pct}")
                            h, mn = divmod(secs // 60, 60)
                            if h >= 24:
                                reset = f"{h // 24}d {h % 24}h"
                            else:
                                reset = f"{h}h {mn:02d}m"
                            return pct, reset
                    except Exception as e:
                        self._log(f"  {label}: parse error: {e}")
                self._log(f"  {label}: no match")
                return None, "unknown"

            session_pct, session_reset = _parse_usage(html, "rollingUsage")
            weekly_pct, weekly_reset = _parse_usage(html, "weeklyUsage")
            monthly_pct, monthly_reset = _parse_usage(html, "monthlyUsage")

            if monthly_pct is None and weekly_pct is None and session_pct is None:
                self._log(f"ERROR: no usage data. session={session_pct}, weekly={weekly_pct}, monthly={monthly_pct}")
                d["error"] = "no usage data found in page"
                return d

            d["session_used_pct"] = session_pct if session_pct is not None else 0
            d["session_reset"] = session_reset
            d["weekly_used_pct"] = weekly_pct if weekly_pct is not None else 0
            d["weekly_reset"] = weekly_reset
            d["session_used_pct"] = monthly_pct if monthly_pct is not None else d["session_used_pct"]
            d["session_reset"] = monthly_reset if monthly_reset != "unknown" else d["session_reset"]
            d["source"] = "html"
            d["updated"] = datetime.now().strftime("Updated %H:%M")

        except HTTPError as e:
            if e.code in (401, 403):
                d["error"] = "session expired; please re-login in browser"
            else:
                d["error"] = f"HTTP {e.code}"
        except Exception as e:
            d["error"] = str(e)

        return d

class CodexBarPopup(ctk.CTkToplevel):
    """Borderless popup with Claude + OpenAI tabs and smooth transitions."""

    WIDTH = 370
    FINAL_ALPHA = 0.94

   
    # ── Claude palette (white+blue — unified Z.AI style, warm accent) ──
    CL_BG       = "#F8FAFE"
    CL_SURFACE  = "#EEF2F8"
    CL_PRIMARY  = "#1A1A2E"
    CL_SECOND   = "#5A607A"
    CL_TERTIARY = "#8E94AE"
    CL_ACCENT   = "#D97757"
    CL_ACCENT_LT= "#E8EDFE"
    CL_LITE     = "#FCEEE8"
    CL_BADGE_FG = "#C25B3B"
    CL_BADGE_BG = "#FCEEE8"
    CL_TRACK    = "#E4E8F0"
    CL_DIVIDER  = "#D8DCE8"
    CL_HOVER    = "#EAEFF8"
    CL_CARD     = "#F0F3FA"

    # ── Z.AI palette (blue-toned) ──
    ZA_BG       = "#F8FAFE"
    ZA_SURFACE  = "#EEF2F8"
    ZA_PRIMARY  = "#1A1A2E"
    ZA_SECOND   = "#5A607A"
    ZA_TERTIARY = "#8E94AE"
    ZA_ACCENT   = "#4A6CF7"
    ZA_ACCENT_LT= "#E8EDFE"
    ZA_TRACK    = "#C5CDE0"
    ZA_DIVIDER  = "#D8DCE8"
    ZA_HOVER    = "#EAEFF8"
    ZA_CARD     = "#F0F3FA"

    # ── OpenAI palette (white+blue — unified Z.AI style) ──
    OA_BG       = "#F8FAFE"
    OA_SURFACE  = "#EEF2F8"
    OA_PRIMARY  = "#1A1A2E"
    OA_SECOND   = "#5A607A"
    OA_TERTIARY = "#8E94AE"
    OA_GREEN    = "#10A37F"
    OA_GREEN_LT = "#E8EDFE"
    OA_TRACK    = "#E4E8F0"
    OA_DIVIDER  = "#D8DCE8"
    OA_HOVER    = "#EAEFF8"
    OA_CARD     = "#F0F3FA"

    # ── MiniMax palette (white+blue — unified Z.AI style, orange accent) ──
    MM_BG       = "#F8FAFE"
    MM_SURFACE  = "#EEF2F8"
    MM_ACCENT   = "#FF6A00"
    MM_TEXT     = "#1A1A2E"
    MM_SECOND   = "#5A607A"
    MM_TERTIARY = "#8E94AE"
    MM_LITE     = "#FFE8D0"
    MM_TRACK    = "#E4E8F0"
    MM_DIVIDER  = "#D8DCE8"
    MM_HOVER    = "#EAEFF8"
    MM_CARD     = "#F0F3FA"

    # ── OpenCode palette (white+blue — unified Z.AI style, teal accent) ──
    OC_BG       = "#F8FAFE"
    OC_SURFACE  = "#EEF2F8"
    OC_ACCENT   = "#00D4AA"
    OC_TEXT     = "#1A1A2E"
    OC_SECOND   = "#5A607A"
    OC_TERTIARY = "#8E94AE"
    OC_LITE     = "#E8EDFE"
    OC_TRACK    = "#E4E8F0"
    OC_DIVIDER  = "#D8DCE8"
    OC_HOVER    = "#EAEFF8"
    OC_CARD     = "#F0F3FA"


    def __init__(self, master, claude_data, codex_data=None, *,
                 on_close=None, on_refresh=None, on_quit=None,
                 on_tab_switch=None, on_settings=None,
                 zai_data=None, minimax_data=None, opencode_data=None):
        super().__init__(master)
        self._claude = claude_data
        self._codex = codex_data or CodexDataFetcher._empty()
        self._on_close = on_close
        self._on_refresh = on_refresh
        self._on_quit = on_quit
        self._on_settings = on_settings
        self._zai = zai_data or ZaiDataFetcher._empty()
        self._minimax = minimax_data or MiniMaxDataFetcher._empty()
        self._opencode = opencode_data or OpenCodeDataFetcher._empty()
        self._on_tab_switch = on_tab_switch
        self._active_tab = SettingsPopup.load_last_tab()

        self.overrideredirect(True)
        self.configure(fg_color=self.CL_BG)
        self.attributes("-topmost", True)
        self.attributes("-alpha", 0.0)

        # load logos - tiny for tab buttons, bigger for panel headers
        cl_tab = _load_logo("claude-logo.png", 18)
        self._cl_tab_icon = ctk.CTkImage(cl_tab, size=(18, 18)) if cl_tab else None
        oa_tab = _load_logo("openai-icon.png", 18)
        self._oa_tab_icon = ctk.CTkImage(oa_tab, size=(18, 18)) if oa_tab else None

        cl_big = _load_logo("claude-logo.png", 32)
        self._cl_logo_big = ctk.CTkImage(cl_big, size=(32, 32)) if cl_big else None
        oa_big = _load_logo("openai-icon.png", 28)
        self._oa_logo_big = ctk.CTkImage(oa_big, size=(28, 28)) if oa_big else None
        zai_tab = _load_logo("zai-logo.png", 18)
        self._zai_tab_icon = ctk.CTkImage(zai_tab, size=(18, 18)) if zai_tab else None
        zai_big = _load_logo("zai-logo.png", 32)
        self._zai_logo_big = ctk.CTkImage(zai_big, size=(32, 32)) if zai_big else None

        # MiniMax & OpenCode - text-only tabs (no logos)
        self._mm_tab_icon = None
        self._mm_logo_big = None
        self._oc_tab_icon = None
        self._oc_logo_big = None

        self._build_ui()

        self.update_idletasks()
        work = self._work_area()
        w = self.WIDTH
        tab_h = self._tab_bar.winfo_reqheight()
        foot_h = self._footer_frame.winfo_reqheight()
        h = tab_h + self._fixed_panel_h + foot_h
        self._target_x = max(work[2] + 8, work[0] - w - 12)
        self._target_y = max(work[3] + 8, work[1] - h - 12)
        self.geometry(f"{w}x{h}+{self._target_x}+{self._target_y + 14}")

        self.after(30, self._apply_dwm)
        self.bind("<Escape>", lambda e: self._close())
        self.bind("<FocusOut>", self._on_focus_out)
        self.focus_force()
        self.after(40, self._animate_in, 0)
        print(f"[POPUP] Init complete, geometry={self.geometry()}, state={self.state()}, alpha={self.attributes('-alpha')}", flush=True)

    # ── DWM ──

    def _work_area(self):
        """Return (right, bottom, left, top) of the usable screen area
        in logical pixels (what customtkinter geometry() expects).

        customtkinter sets Per-Monitor DPI awareness, so Win32 APIs
        return physical pixels.  Divide by the CTk scaling factor
        to convert to the logical coordinate space that geometry() uses.
        """
        try:
            from ctypes import wintypes
            rect = wintypes.RECT()
            ctypes.windll.user32.SystemParametersInfoW(48, 0, ctypes.byref(rect), 0)
            scale = self._get_window_scaling()
            return (int(rect.right / scale), int(rect.bottom / scale),
                    int(rect.left / scale), int(rect.top / scale))
        except Exception:
            return (self.winfo_screenwidth(), self.winfo_screenheight(), 0, 0)

    def _apply_dwm(self):
        try:
            hwnd = ctypes.windll.user32.GetParent(self.winfo_id())
            pref = ctypes.c_int(2)
            ctypes.windll.dwmapi.DwmSetWindowAttribute(
                hwnd, 33, ctypes.byref(pref), ctypes.sizeof(pref))
            class MARGINS(ctypes.Structure):
                _fields_ = [("l", ctypes.c_int), ("r", ctypes.c_int),
                            ("t", ctypes.c_int), ("b", ctypes.c_int)]
            m = MARGINS(0, 0, 1, 0)
            ctypes.windll.dwmapi.DwmExtendFrameIntoClientArea(hwnd, ctypes.byref(m))
        except Exception:
            pass

    # ── animation ──

    def _animate_in(self, step, total=14):
        if step > total:
            return
        t = step / total
        ease = 1.0 - (1.0 - t) ** 3
        y = int(self._target_y + 18 * (1.0 - ease))
        alpha = min(ease * 1.0, self.FINAL_ALPHA)
        try:
            self.geometry(f"+{self._target_x}+{y}")
            self.attributes("-alpha", alpha)
            self.after(14, self._animate_in, step + 1, total)
        except Exception:
            pass

    # ── focus ──

    def _on_focus_out(self, event):
        self.after(120, self._check_focus)

    def _check_focus(self):
        try:
            fw = self.focus_get()
            if fw is not None and str(fw).startswith(str(self)):
                return
        except Exception:
            pass
        self._close()

    # ── Apple-style tab transition ──
    #
    # Only animate alpha (GPU-accelerated via DWM).
    # Phase 1  "out": ease-in  alpha 0.94 → 0.0   (~100ms)
    # Instant:  swap content, colors, resize, reposition
    # Phase 2  "in":  ease-out alpha 0.0 → 0.94  (~180ms) + 8px slide-up

    def _switch_tab(self, tab):
        if tab == self._active_tab:
            return
        self._active_tab = tab
        SettingsPopup.save_last_tab(tab)
        if self._on_tab_switch:
            self._on_tab_switch(tab)
        self._m_step = 0
        self._m_phase = "out"
        self._morph_tick()

    def _do_swap(self):
        """Instant swap while window is invisible."""
        tab = self._active_tab

        # Reset all tab buttons to inactive (use track color for visibility in both modes)
        track_bg = self.CL_TRACK  # Will be updated per-tab below
        for btn in (self._cl_tab_btn, self._oa_tab_btn, self._zai_tab_btn, self._mm_tab_btn, self._oc_tab_btn):
            btn.configure(fg_color=self.CL_TRACK)  # Visible background

        # tab button + footer styles — unified white+blue theme
        # Active tab: ZA_TRACK bg (#E4E8F0), white text. Footer/buttons: ZA_ACCENT blue
        if tab == "claude":
            bg, track, divider, accent, accent_hover, hover = (
                self.ZA_BG, self.ZA_TRACK, self.ZA_DIVIDER,
                self.ZA_ACCENT, self.ZA_HOVER, self.ZA_HOVER)
            self._cl_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
        elif tab == "openai":
            bg, track, divider, accent, accent_hover, hover = (
                self.ZA_BG, self.ZA_TRACK, self.ZA_DIVIDER,
                self.ZA_ACCENT, self.ZA_HOVER, self.ZA_HOVER)
            self._oa_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
        elif tab == "zai":
            bg, track, divider, accent, accent_hover, hover = (
                self.ZA_BG, self.ZA_TRACK, self.ZA_DIVIDER,
                self.ZA_ACCENT, self.ZA_HOVER, self.ZA_HOVER)
            self._zai_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
        elif tab == "minimax":
            bg, track, divider, accent, accent_hover, hover = (
                self.ZA_BG, self.ZA_TRACK, self.ZA_DIVIDER,
                self.ZA_ACCENT, self.ZA_HOVER, self.ZA_HOVER)
            self._mm_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
        elif tab == "opencode":
            bg, track, divider, accent, accent_hover, hover = (
                self.ZA_BG, self.ZA_TRACK, self.ZA_DIVIDER,
                self.ZA_ACCENT, self.ZA_HOVER, self.ZA_HOVER)
            self._oc_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
        else:
            bg, track, divider, accent, accent_hover, hover = (
                self.ZA_BG, self.ZA_TRACK, self.ZA_DIVIDER,
                self.ZA_ACCENT, self.ZA_HOVER, self.ZA_HOVER)

# All inactive tabs: unified Z.AI style (ZA_TRACK bg, ZA_PRIMARY text)
        if tab != "claude":
            self._cl_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
        if tab != "openai":
            self._oa_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
        if tab != "zai":
            self._zai_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
        if tab != "minimax":
            self._mm_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
        if tab != "opencode":
            self._oc_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)

        self._tab_bar.configure(fg_color=bg)
        self._tab_inner.configure(fg_color=track)
        self.configure(fg_color=bg)
        self._footer_frame.configure(fg_color=bg)
        self._footer_divider.configure(fg_color=divider)
        self._dash_btn.configure(text_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER)
        self._quit_btn.configure(text_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER)
        self._refresh_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER)

        # swap frames
        for frame in (self._claude_frame, self._openai_frame, self._zai_frame, self._minimax_frame, self._opencode_frame):
            frame.pack_forget()
        self._footer_frame.pack_forget()
        if tab == "claude":
            self._claude_frame.pack(fill="both", expand=True)
        elif tab == "openai":
            self._openai_frame.pack(fill="both", expand=True)
        elif tab == "zai":
            self._zai_frame.pack(fill="both", expand=True)
        elif tab == "minimax":
            self._minimax_frame.pack(fill="both", expand=True)
        elif tab == "opencode":
            self._opencode_frame.pack(fill="both", expand=True)
        self._footer_frame.pack(fill="x", side="bottom")

        # resize to fixed height + reposition anchored to bottom
        self.update_idletasks()
        tab_h = self._tab_bar.winfo_reqheight()
        foot_h = self._footer_frame.winfo_reqheight()
        h = tab_h + self._fixed_panel_h + foot_h
        work = self._work_area()
        self._target_x = max(work[2] + 8, work[0] - self.WIDTH - 12)
        self._target_y = max(work[3] + 8, work[1] - h - 12)
        self.geometry(f"{self.WIDTH}x{h}+{self._target_x}+{self._target_y}")

    def _morph_tick(self):
        try:
            if self._m_phase == "out":
                # Fade out: 7 steps × 14ms = ~100ms, ease-in (accelerate)
                total = 7
                s = self._m_step
                if s >= total:
                    # hide: alpha=0 + move off-screen to prevent any flash
                    self.attributes("-alpha", 0.0)
                    self.geometry(f"+{self._target_x}+-9999")
                    self._do_swap()
                    # window is now resized off-screen, invisible
                    self.attributes("-alpha", 0.0)
                    self._m_step = 0
                    self._m_phase = "in"
                    self.after(20, self._morph_tick)
                    return
                t = s / total
                ease = t * t  # ease-in
                alpha = self.FINAL_ALPHA * (1.0 - ease)
                self.attributes("-alpha", max(alpha, 0.0))
                self._m_step += 1
                self.after(14, self._morph_tick)

            elif self._m_phase == "in":
                # Fade in: 12 steps × 14ms = ~170ms, ease-out + slide up 8px
                total = 12
                s = self._m_step
                if s >= total:
                    self.attributes("-alpha", self.FINAL_ALPHA)
                    self.geometry(f"+{self._target_x}+{self._target_y}")
                    return
                t = s / total
                ease = 1.0 - (1.0 - t) ** 3  # ease-out (decelerate)
                alpha = self.FINAL_ALPHA * ease
                # subtle slide up
                y_off = int(8 * (1.0 - ease))
                self.attributes("-alpha", alpha)
                self.geometry(f"+{self._target_x}+{self._target_y + y_off}")
                self._m_step += 1
                self.after(14, self._morph_tick)
        except Exception:
            pass

    # ── bar colour helpers ──

    @staticmethod
    def _cl_bar_color(pct):
        if pct <= 50:  return "#D97757"
        if pct <= 80:  return "#E8943E"
        return "#D94A3D"

    @staticmethod
    def _oa_bar_color(pct):
        if pct <= 50:  return "#10A37F"
        if pct <= 80:  return "#E8A83E"
        return "#E24B4A"

    # ═══════════════════════════════════════
    # MAIN UI BUILD
    # ═══════════════════════════════════════

    def _build_ui(self):
        # ── TAB BAR - tiny icon pills, top-left ──
        tab_bar = ctk.CTkFrame(self, fg_color=self.CL_BG, corner_radius=0, height=34)
        tab_bar.pack(fill="x")
        tab_bar.pack_propagate(False)
        self._tab_bar = tab_bar

        self._tab_inner = ctk.CTkFrame(tab_bar, fg_color=self.CL_TRACK, corner_radius=9)
        self._tab_inner.pack(side="left", padx=14, pady=4)
        tab_inner = self._tab_inner

        self._cl_tab_btn = ctk.CTkButton(
            tab_inner,
            text="CL" if not self._cl_tab_icon else "",
            image=self._cl_tab_icon,
            font=("Segoe UI Semibold", 11),
            text_color="#1A1A2E",
            fg_color=self.CL_LITE,
            hover_color=self.ZA_HOVER,
            corner_radius=8, height=26, width=34,
            command=lambda: self._switch_tab("claude"))
        self._cl_tab_btn.pack(side="left", padx=(2, 1), pady=2)

        self._oa_tab_btn = ctk.CTkButton(
            tab_inner,
            text="Codex" if not self._oa_tab_icon else "",
            image=self._oa_tab_icon,
            font=("Segoe UI Semibold", 11),
            text_color="#1A1A2E",
            fg_color=self.CL_TRACK,
            hover_color=self.ZA_HOVER,
            corner_radius=8, height=26, width=48,
            command=lambda: self._switch_tab("openai"))
        self._oa_tab_btn.pack(side="left", padx=(1, 1), pady=2)

        self._zai_tab_btn = ctk.CTkButton(
            tab_inner,
            text="Z.AI",
            image=None,  # Always show text, no image
            font=("Segoe UI Semibold", 11),
            text_color="#1A1A2E",
            fg_color=self.CL_TRACK,  # Visible background in both light/dark modes
            hover_color=self.ZA_HOVER,
            corner_radius=8, height=26, width=42,
            command=lambda: self._switch_tab("zai"))
        self._zai_tab_btn.pack(side="left", padx=(1, 2), pady=2)

        # ── MiniMax tab button (orange) ──
        self._mm_tab_btn = ctk.CTkButton(
            tab_inner,
            text="MM",
            image=None,
            font=("Segoe UI Semibold", 11),
            text_color="#1A1A2E",
            fg_color=self.CL_TRACK,
            hover_color=self.ZA_HOVER,
            corner_radius=8, height=26, width=34,
            command=lambda: self._switch_tab("minimax"))
        self._mm_tab_btn.pack(side="left", padx=(1, 2), pady=2)

        # ── OpenCode tab button (teal) ──
        self._oc_tab_btn = ctk.CTkButton(
            tab_inner,
            text="OC",
            image=None,
            font=("Segoe UI Semibold", 11),
            text_color="#1A1A2E",
            fg_color=self.CL_TRACK,
            hover_color=self.ZA_HOVER,
            corner_radius=8, height=26, width=34,
            command=lambda: self._switch_tab("opencode"))
        self._oc_tab_btn.pack(side="left", padx=(1, 2), pady=2)

        # ── CLAUDE CONTENT ──
        self._claude_frame = ctk.CTkFrame(self, fg_color=self.CL_BG, corner_radius=0)
        self._build_claude_panel(self._claude_frame)
        self._claude_frame.pack(fill="both", expand=True)

        # ── OPENAI CONTENT ──
        self._openai_frame = ctk.CTkFrame(self, fg_color=self.OA_BG, corner_radius=0)
        self._build_openai_panel(self._openai_frame)
        # starts hidden

        # ── Z.AI CONTENT ──
        self._zai_frame = ctk.CTkFrame(self, fg_color=self.ZA_BG, corner_radius=0)
        self._build_zai_panel(self._zai_frame)
        # starts hidden

        # ── MiniMax CONTENT ──
        self._minimax_frame = ctk.CTkFrame(self, fg_color=self.MM_BG, corner_radius=0)
        self._build_minimax_panel(self._minimax_frame)
        # starts hidden

        # ── OpenCode CONTENT ──
        self._opencode_frame = ctk.CTkFrame(self, fg_color=self.OC_BG, corner_radius=0)
        self._build_opencode_panel(self._opencode_frame)
        # starts hidden

        # ── measure all panel heights to equalize later ──
        self.update_idletasks()
        heights = [self._claude_frame.winfo_reqheight()]
        for frame in (self._openai_frame, self._zai_frame, self._minimax_frame, self._opencode_frame):
            frame.pack(fill="both", expand=True)
            self.update_idletasks()
            heights.append(frame.winfo_reqheight())
            frame.pack_forget()
        self._fixed_panel_h = max(heights)

        # ── FOOTER (always visible, bottom) ──
        self._footer_frame = ctk.CTkFrame(self, fg_color="transparent", corner_radius=0)
        self._build_footer(self._footer_frame)
        self._footer_frame.pack(fill="x", side="bottom")

        # Apply initial tab state based on saved tab — unified Z.AI white+blue theme
        if self._active_tab != "claude":
            self._claude_frame.pack_forget()
            # Reset ALL tab buttons to inactive state (ZA_TRACK, ZA_PRIMARY text)
            self._cl_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
            self._oa_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
            self._zai_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
            self._mm_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
            self._oc_tab_btn.configure(fg_color=self.ZA_TRACK, hover_color=self.ZA_HOVER, text_color=self.ZA_PRIMARY)
            # Footer buttons: unified blue (ZA_ACCENT) everywhere
            self._dash_btn.configure(text_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER)
            self._refresh_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER)
            if self._active_tab == "openai":
                self._oa_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
                self._tab_bar.configure(fg_color=self.ZA_BG)
                self._tab_inner.configure(fg_color=self.ZA_TRACK)
                self.configure(fg_color=self.ZA_BG)
                self._openai_frame.pack(fill="both", expand=True)
                self._footer_frame.configure(fg_color=self.ZA_BG)
                self._footer_divider.configure(fg_color=self.ZA_DIVIDER)
            elif self._active_tab == "zai":
                self._zai_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
                self._tab_bar.configure(fg_color=self.ZA_BG)
                self._tab_inner.configure(fg_color=self.ZA_TRACK)
                self.configure(fg_color=self.ZA_BG)
                self._zai_frame.pack(fill="both", expand=True)
                self._footer_frame.configure(fg_color=self.ZA_BG)
                self._footer_divider.configure(fg_color=self.ZA_DIVIDER)
            elif self._active_tab == "minimax":
                self._mm_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
                self._tab_bar.configure(fg_color=self.ZA_BG)
                self._tab_inner.configure(fg_color=self.ZA_TRACK)
                self.configure(fg_color=self.ZA_BG)
                self._minimax_frame.pack(fill="both", expand=True)
                self._footer_frame.configure(fg_color=self.ZA_BG)
                self._footer_divider.configure(fg_color=self.ZA_DIVIDER)
            elif self._active_tab == "opencode":
                self._oc_tab_btn.configure(fg_color=self.ZA_ACCENT, hover_color=self.ZA_HOVER, text_color="#FFFFFF")
                self._tab_bar.configure(fg_color=self.ZA_BG)
                self._tab_inner.configure(fg_color=self.ZA_TRACK)
                self.configure(fg_color=self.ZA_BG)
                self._opencode_frame.pack(fill="both", expand=True)
                self._footer_frame.configure(fg_color=self.ZA_BG)
                self._footer_divider.configure(fg_color=self.ZA_DIVIDER)

    # ═══════════════════════════════════════
    # CLAUDE PANEL
    # ═══════════════════════════════════════

    def _build_claude_panel(self, parent):
        d = self._claude
        sp = d["session_used_pct"]
        wp = d["weekly_used_pct"]
        op = d["opus_used_pct"]
        has_data = d["source"] != "none"
        has_cost = d["cost_today"] > 0 or d["cost_30d"] > 0

        # unified header
        ctk.CTkFrame(parent, fg_color=self.ZA_BG, height=10, corner_radius=0).pack(fill="x")

        # header
        hero = ctk.CTkFrame(parent, fg_color="transparent")
        hero.pack(fill="x", padx=22, pady=(4, 0))

        row = ctk.CTkFrame(hero, fg_color="transparent")
        row.pack(fill="x")
        if self._cl_logo_big:
            ctk.CTkLabel(row, text="", image=self._cl_logo_big,
                         width=32, height=32).pack(side="left", padx=(0, 10))
        ctk.CTkLabel(row, text="Claude", font=("Segoe UI Semibold", 22),
                     text_color=self.CL_PRIMARY).pack(side="left")
        ctk.CTkLabel(row, text=f"  {d['plan']}  ", font=("Segoe UI Semibold", 11),
                     text_color=self.CL_BADGE_FG, fg_color=self.CL_BADGE_BG,
                     corner_radius=10).pack(side="right")

        meta = ctk.CTkFrame(hero, fg_color="transparent")
        meta.pack(fill="x", pady=(5, 0))
        ctk.CTkFrame(meta, fg_color=self.ZA_ACCENT, corner_radius=4,
                     width=7, height=7).pack(side="left", padx=(1, 7), pady=5)
        ctk.CTkLabel(meta, text=d["updated"], font=("Segoe UI", 12),
                     text_color=self.CL_SECOND).pack(side="left")
        ctk.CTkLabel(meta, text=f"  {d['source']}", font=("Segoe UI", 11),
                     text_color=self.CL_TERTIARY).pack(side="left")

        if has_data:
            ctk.CTkFrame(parent, fg_color=self.CL_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            ctk.CTkLabel(parent, text="Usage", font=("Segoe UI Semibold", 13),
                         text_color=self.CL_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(10, 2))
            self._cl_usage_bar(parent, "Session", sp, d["session_reset"])
            self._cl_usage_bar(parent, "Weekly", wp, d["weekly_reset"])
            if op > 0:
                self._cl_usage_bar(parent, "Opus", op)

        if has_cost:
            ctk.CTkFrame(parent, fg_color=self.CL_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(8, 0))
            ctk.CTkLabel(parent, text="API Cost Estimate",
                         font=("Segoe UI Semibold", 13),
                         text_color=self.CL_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(10, 0))
            ctk.CTkLabel(parent, text="Estimated API equivalent - not billed",
                         font=("Segoe UI", 10),
                         text_color=self.CL_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(0, 4))
            card = ctk.CTkFrame(parent, fg_color=self.CL_SURFACE, corner_radius=10)
            card.pack(fill="x", padx=20, pady=(0, 2))
            inner = ctk.CTkFrame(card, fg_color="transparent")
            inner.pack(fill="x", padx=14, pady=10)
            for label, val in [("Today", f"${d['cost_today']:.2f}"),
                               ("Last 30 days", f"${d['cost_30d']:.2f}")]:
                r = ctk.CTkFrame(inner, fg_color="transparent")
                r.pack(fill="x", pady=1)
                ctk.CTkLabel(r, text=label, font=("Segoe UI", 12),
                             text_color=self.CL_SECOND).pack(side="left")
                ctk.CTkLabel(r, text=val, font=("Segoe UI Semibold", 13),
                             text_color=self.CL_PRIMARY).pack(side="right")

        if not d.get("installed", True) and not has_data and not has_cost:
            ctk.CTkFrame(parent, fg_color=self.CL_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=(20, 8))
            ctk.CTkLabel(nd, text="Claude Code not detected",
                         font=("Segoe UI Semibold", 14),
                         text_color=self.CL_PRIMARY).pack(pady=(0, 4))
            ctk.CTkLabel(nd, text="Install the CLI to see your usage",
                         font=("Segoe UI", 11),
                         text_color=self.CL_SECOND).pack(pady=(0, 12))
            ctk.CTkButton(nd, text="Install Claude Code",
                          font=("Segoe UI Semibold", 13),
                          text_color="#FFFFFF", fg_color=self.CL_ACCENT,
                          hover_color=self.ZA_TERTIARY, corner_radius=10,
                          height=38, width=200,
                          command=lambda: self._open_url(
                              "https://docs.anthropic.com/en/docs/claude-code/overview")
                          ).pack()
        elif not has_data and not has_cost:
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=24)
            ctk.CTkLabel(nd, text="No session data yet", font=("Segoe UI", 13),
                         text_color=self.CL_SECOND).pack()
            ctk.CTkLabel(nd, text="Run /usage in Claude Code",
                         font=("Segoe UI", 11),
                         text_color=self.CL_TERTIARY).pack(pady=(4, 0))

        ctk.CTkFrame(parent, fg_color="transparent", height=6).pack(fill="x")

    def _cl_usage_bar(self, parent, label, pct, reset=None):
        color = self._cl_bar_color(pct)
        sec = ctk.CTkFrame(parent, fg_color="transparent")
        sec.pack(fill="x", padx=20, pady=(3, 2))
        row = ctk.CTkFrame(sec, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text=label, font=("Segoe UI Semibold", 13),
                     text_color=self.CL_PRIMARY).pack(side="left")
        ctk.CTkLabel(row, text=f"{pct}%", font=("Segoe UI Semibold", 13),
                     text_color=color).pack(side="right")
        track = ctk.CTkFrame(sec, fg_color=self.CL_TRACK, height=8, corner_radius=4)
        track.pack(fill="x", pady=(4, 3))
        track.pack_propagate(False)
        ctk.CTkFrame(track, fg_color=color, corner_radius=4, height=8).place(relx=0, rely=0, relwidth=max(pct / 100, 0.015) if pct > 0 else 0, relheight=1)
        if reset and reset != "unknown":
            ctk.CTkLabel(sec, text=f"Resets {reset}", font=("Segoe UI", 11),
                         text_color=self.CL_TERTIARY, anchor="w").pack(fill="x")

    # ═══════════════════════════════════════
    # OPENAI PANEL - mirrors Claude layout
    # ═══════════════════════════════════════

    def _build_openai_panel(self, parent):
        d = self._codex
        available = d.get("available", False)
        sp = d["session_used_pct"]
        wp = d["weekly_used_pct"]
        has_data = d["source"] not in ("none", "config")
        has_cost = d["cost_today"] > 0 or d["cost_30d"] > 0

        ctk.CTkFrame(parent, fg_color=self.ZA_BG, height=10, corner_radius=0).pack(fill="x")

        # header
        hero = ctk.CTkFrame(parent, fg_color="transparent")
        hero.pack(fill="x", padx=22, pady=(4, 0))

        row = ctk.CTkFrame(hero, fg_color="transparent")
        row.pack(fill="x")
        if self._oa_logo_big:
            ctk.CTkLabel(row, text="", image=self._oa_logo_big,
                         width=28, height=28).pack(side="left", padx=(0, 10))
        ctk.CTkLabel(row, text="Codex", font=("Segoe UI Semibold", 22),
                     text_color=self.OA_PRIMARY).pack(side="left")
        plan_text = d["plan"]
        if d["model"]:
            plan_text = d["model"]
        ctk.CTkLabel(row, text=f"  {plan_text}  ", font=("Segoe UI Semibold", 11),
                     text_color=self.OA_GREEN, fg_color=self.OA_GREEN_LT,
                     corner_radius=10).pack(side="right")

        meta = ctk.CTkFrame(hero, fg_color="transparent")
        meta.pack(fill="x", pady=(5, 0))
        dot_color = self.ZA_ACCENT if available else self.OA_TERTIARY
        ctk.CTkFrame(meta, fg_color=dot_color, corner_radius=4,
                     width=7, height=7).pack(side="left", padx=(1, 7), pady=5)
        ctk.CTkLabel(meta, text=d["updated"], font=("Segoe UI", 12),
                     text_color=self.OA_SECOND).pack(side="left")
        ctk.CTkLabel(meta, text=f"  {d['source']}", font=("Segoe UI", 11),
                     text_color=self.OA_TERTIARY).pack(side="left")

        if not available:
            ctk.CTkFrame(parent, fg_color=self.OA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=(20, 8))
            ctk.CTkLabel(nd, text="Codex not detected",
                         font=("Segoe UI Semibold", 14),
                         text_color=self.OA_PRIMARY).pack(pady=(0, 4))
            ctk.CTkLabel(nd, text="Install the CLI to see your usage",
                         font=("Segoe UI", 11),
                         text_color=self.OA_SECOND).pack(pady=(0, 12))
            ctk.CTkButton(nd, text="Install Codex",
                          font=("Segoe UI Semibold", 13),
                          text_color="#FFFFFF", fg_color=self.ZA_ACCENT,
                          hover_color=self.ZA_HOVER, corner_radius=10,
                          height=38, width=200,
                          command=lambda: self._open_url(
                              "https://github.com/openai/codex")
                          ).pack()
            ctk.CTkFrame(parent, fg_color="transparent", height=6).pack(fill="x")
            return

        if has_data:
            ctk.CTkFrame(parent, fg_color=self.OA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            ctk.CTkLabel(parent, text="Usage", font=("Segoe UI Semibold", 13),
                         text_color=self.OA_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(10, 2))
            self._oa_usage_bar(parent, "Session (5h)", sp, d["session_reset"])
            self._oa_usage_bar(parent, "Weekly", wp, d["weekly_reset"])

        if has_cost:
            ctk.CTkFrame(parent, fg_color=self.OA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(8, 0))
            ctk.CTkLabel(parent, text="API Cost Estimate",
                         font=("Segoe UI Semibold", 13),
                         text_color=self.OA_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(10, 0))
            ctk.CTkLabel(parent, text="Estimated API equivalent - not billed",
                         font=("Segoe UI", 10),
                         text_color=self.OA_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(0, 4))
            card = ctk.CTkFrame(parent, fg_color=self.OA_CARD, corner_radius=10)
            card.pack(fill="x", padx=20, pady=(0, 2))
            inner = ctk.CTkFrame(card, fg_color="transparent")
            inner.pack(fill="x", padx=14, pady=10)
            for label, val in [("Today", f"${d['cost_today']:.2f}"),
                               ("All sessions", f"${d['cost_30d']:.2f}")]:
                r = ctk.CTkFrame(inner, fg_color="transparent")
                r.pack(fill="x", pady=1)
                ctk.CTkLabel(r, text=label, font=("Segoe UI", 12),
                             text_color=self.OA_SECOND).pack(side="left")
                ctk.CTkLabel(r, text=val, font=("Segoe UI Semibold", 13),
                             text_color=self.OA_PRIMARY).pack(side="right")

        if not has_data and not has_cost:
            ctk.CTkFrame(parent, fg_color=self.OA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=24)
            ctk.CTkLabel(nd, text="No session data yet", font=("Segoe UI", 13),
                         text_color=self.OA_SECOND).pack()
            ctk.CTkLabel(nd, text="Run a session in Codex CLI",
                         font=("Segoe UI", 11),
                         text_color=self.OA_TERTIARY).pack(pady=(4, 0))

        ctk.CTkFrame(parent, fg_color="transparent", height=6).pack(fill="x")

    def _oa_usage_bar(self, parent, label, pct, reset=None):
        color = self._oa_bar_color(pct)
        sec = ctk.CTkFrame(parent, fg_color="transparent")
        sec.pack(fill="x", padx=20, pady=(3, 2))
        row = ctk.CTkFrame(sec, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text=label, font=("Segoe UI Semibold", 13),
                     text_color=self.OA_PRIMARY).pack(side="left")
        ctk.CTkLabel(row, text=f"{pct}%", font=("Segoe UI Semibold", 13),
                     text_color=color).pack(side="right")
        track = ctk.CTkFrame(sec, fg_color=self.OA_TRACK, height=8, corner_radius=4)
        track.pack(fill="x", pady=(4, 3))
        track.pack_propagate(False)
        ctk.CTkFrame(track, fg_color=color, corner_radius=4, height=8).place(relx=0, rely=0, relwidth=max(pct / 100, 0.015) if pct > 0 else 0, relheight=1)
        if reset and reset != "unknown":
            ctk.CTkLabel(sec, text=f"Resets {reset}", font=("Segoe UI", 11),
                         text_color=self.OA_TERTIARY, anchor="w").pack(fill="x")

    # ═══════════════════════════════════════
    # Z.AI PANEL
    # ═══════════════════════════════════════

    def _build_zai_panel(self, parent):
        d = self._zai
        available = d.get("available", False)
        has_data = d["source"] not in ("none", "config")

        # subtle gradient flare (light blue tones)
        ctk.CTkFrame(parent, fg_color=self.ZA_BG, height=10, corner_radius=0).pack(fill="x")

        # header
        hero = ctk.CTkFrame(parent, fg_color="transparent")
        hero.pack(fill="x", padx=22, pady=(4, 0))

        row = ctk.CTkFrame(hero, fg_color="transparent")
        row.pack(fill="x")
        if self._zai_logo_big:
            ctk.CTkLabel(row, text="", image=self._zai_logo_big,
                         width=32, height=32).pack(side="left", padx=(0, 10))
        ctk.CTkLabel(row, text="Z.AI", font=("Segoe UI Semibold", 22),
                     text_color=self.ZA_PRIMARY).pack(side="left")
        plan_text = d.get("plan", "")
        if d.get("model"):
            plan_text = d["model"]
        if plan_text and plan_text != "Unknown":
            ctk.CTkLabel(row, text=f"  {plan_text}  ", font=("Segoe UI Semibold", 11),
                         text_color=self.ZA_ACCENT, fg_color=self.ZA_ACCENT_LT,
                         corner_radius=10).pack(side="right")

        meta = ctk.CTkFrame(hero, fg_color="transparent")
        meta.pack(fill="x", pady=(5, 0))
        dot_color = self.ZA_ACCENT if available else self.ZA_TERTIARY
        ctk.CTkFrame(meta, fg_color=dot_color, corner_radius=4,
                     width=7, height=7).pack(side="left", padx=(1, 7), pady=5)
        ctk.CTkLabel(meta, text=d["updated"], font=("Segoe UI", 12),
                     text_color=self.ZA_SECOND).pack(side="left")
        if d.get("source") and d["source"] != "none":
            ctk.CTkLabel(meta, text=f"  {d['source']}", font=("Segoe UI", 11),
                         text_color=self.ZA_TERTIARY).pack(side="left")

        if not available:
            ctk.CTkFrame(parent, fg_color=self.ZA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=(20, 8))
            ctk.CTkLabel(nd, text="Z.AI token not set",
                         font=("Segoe UI Semibold", 14),
                         text_color=self.ZA_PRIMARY).pack(pady=(0, 4))
            ctk.CTkLabel(nd, text="Set ZAI_API_TOKEN env var to see usage",
                         font=("Segoe UI", 11),
                         text_color=self.ZA_SECOND).pack(pady=(0, 12))
            ctk.CTkFrame(parent, fg_color="transparent", height=6).pack(fill="x")
            return

        if d.get("error") and d["source"] == "none":
            ctk.CTkFrame(parent, fg_color=self.ZA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=(20, 8))
            ctk.CTkLabel(nd, text="Could not fetch data",
                         font=("Segoe UI Semibold", 14),
                         text_color=self.ZA_PRIMARY).pack(pady=(0, 4))
            ctk.CTkLabel(nd, text=d["error"],
                         font=("Segoe UI", 11),
                         text_color=self.ZA_SECOND).pack(pady=(0, 12))
            ctk.CTkFrame(parent, fg_color="transparent", height=6).pack(fill="x")
            return

        if has_data:
            ctk.CTkFrame(parent, fg_color=self.ZA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            ctk.CTkLabel(parent, text="Usage", font=("Segoe UI Semibold", 13),
                         text_color=self.ZA_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(10, 2))
            sp = d["session_used_pct"]
            wp = d.get("weekly_used_pct", 0)

            # Session quota bar (5-hour window)
            self._zai_usage_bar(parent, "5 Hours Quota", sp, d.get("session_reset"))

            # Weekly quota bar
            self._zai_usage_bar(parent, "Weekly Quota", wp, d.get("weekly_reset"))

            # MCP servers usage bar
            mp = d.get("mcp_used_pct", 0)
            self._zai_usage_bar(parent, "MCP Servers", mp, d.get("mcp_reset"))

        # Show plan level (monthly)
        plan_level = d.get("plan", "")
        if plan_level and plan_level != "Unknown":
            ctk.CTkFrame(parent, fg_color=self.ZA_DIVIDER,
                         height=1, corner_radius=0).pack(fill="x", padx=20, pady=(8, 0))
            ctk.CTkLabel(parent, text="Plan", font=("Segoe UI Semibold", 13),
                         text_color=self.ZA_TERTIARY,
                         anchor="w").pack(fill="x", padx=22, pady=(10, 2))
            plan_card = ctk.CTkFrame(parent, fg_color=self.ZA_CARD, corner_radius=10)
            plan_card.pack(fill="x", padx=20, pady=(0, 2))
            plan_inner = ctk.CTkFrame(plan_card, fg_color="transparent")
            plan_inner.pack(fill="x", padx=14, pady=10)
            ctk.CTkLabel(plan_inner, text="Monthly Plan", font=("Segoe UI", 12),
                         text_color=self.ZA_SECOND).pack(side="left")
            ctk.CTkLabel(plan_inner, text=plan_level.capitalize(), font=("Segoe UI Semibold", 13),
                         text_color=self.ZA_ACCENT).pack(side="right")

        ctk.CTkFrame(parent, fg_color="transparent", height=6).pack(fill="x")

    def _zai_usage_bar(self, parent, label, pct, reset=None):
        color = self._za_bar_color(pct)
        sec = ctk.CTkFrame(parent, fg_color="transparent")
        sec.pack(fill="x", padx=20, pady=(3, 2))
        row = ctk.CTkFrame(sec, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text=label, font=("Segoe UI Semibold", 13),
                     text_color=self.ZA_PRIMARY).pack(side="left")
        ctk.CTkLabel(row, text=f"{pct}%", font=("Segoe UI Semibold", 13),
                     text_color=color).pack(side="right")
        track = ctk.CTkFrame(sec, fg_color=self.ZA_TRACK, height=8, corner_radius=4)
        track.pack(fill="x", pady=(4, 3))
        track.pack_propagate(False)
        ctk.CTkFrame(track, fg_color=color, corner_radius=4, height=8).place(relx=0, rely=0, relwidth=max(pct / 100, 0.015) if pct > 0 else 0, relheight=1)
        if reset and reset != "unknown":
            ctk.CTkLabel(sec, text=f"Resets in {reset}", font=("Segoe UI", 11),
                         text_color=self.ZA_TERTIARY, anchor="w").pack(fill="x")

    @staticmethod
    def _za_bar_color(pct):
        if pct <= 50:  return "#4A6CF7"  # Blue/accent for low usage
        if pct <= 70:  return "#E8A83E"  # Yellow for medium
        return "#E24B4A"  # Red for high usage

    # ═══════════════════════════════════════
    # FOOTER (shared between tabs)
    # ═══════════════════════════════════════

    def _build_footer(self, parent):
        self._footer_divider = ctk.CTkFrame(parent, fg_color=self.CL_DIVIDER,
                     height=1, corner_radius=0)
        self._footer_divider.pack(fill="x", padx=20)

        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=14, pady=(6, 6))

        self._dash_btn = ctk.CTkButton(
            row, text="Dashboard", font=("Segoe UI", 12),
            text_color=self.CL_ACCENT, fg_color="transparent",
            hover_color=self.ZA_HOVER, anchor="w", height=30,
            corner_radius=8, width=80,
            command=lambda: self._open_url(
                {"openai": "https://platform.openai.com/usage",
                 "zai": "https://z.ai",
                 }.get(self._active_tab, "https://claude.ai/settings/billing")))
        self._dash_btn.pack(side="left", padx=2)

        self._quit_btn = ctk.CTkButton(
            row, text="Quit", font=("Segoe UI", 12),
            text_color=self.CL_TERTIARY, fg_color="transparent",
            hover_color=self.ZA_HOVER, anchor="center", height=30,
            corner_radius=8, width=50, command=self._do_quit)
        self._quit_btn.pack(side="right", padx=2)

        self._settings_btn = ctk.CTkButton(
            row, text="⚙", font=("Segoe UI", 14),
            text_color=self.CL_SECOND, fg_color="transparent",
            hover_color=self.ZA_HOVER, anchor="center", height=30,
            corner_radius=8, width=36, command=self._do_settings)
        self._settings_btn.pack(side="right", padx=2)

        self._refresh_btn = ctk.CTkButton(
            row, text="Refresh", font=("Segoe UI Semibold", 12),
            text_color="#FFFFFF", fg_color=self.CL_ACCENT,
            hover_color=self.ZA_TERTIARY, anchor="center", height=30,
            corner_radius=8, width=70, command=self._do_refresh)
        self._refresh_btn.pack(side="right", padx=2)

        # version label on far left
        vl = ctk.CTkLabel(row, text=f"v{VERSION}", font=("Segoe UI", 10), text_color=self.ZA_TERTIARY)
        vl.pack(side="left", padx=(0, 8))

    # ── helpers ──

    def _open_url(self, url):
        webbrowser.open(url)
        self._close()

    def _close(self):
        try:
            self.destroy()
        except Exception:
            pass
        if self._on_close:
            self._on_close()

    def _do_settings(self):
        self._close()
        if self._on_settings:
            self._on_settings()

    def _do_refresh(self):
        self._close()
        if self._on_refresh:
            self._on_refresh()

    def _do_quit(self):
        self._close()
        if self._on_quit:
            self._on_quit()


# ─────────────────────────────────────────────
# App  (tkinter main loop + pystray background)
# ─────────────────────────────────────────────


    # ── MiniMax panel ──────────────────────────────────────────

    def _build_minimax_panel(self, parent):
        d = self._minimax
        available = not d.get("error") and d.get("available", False)

        ctk.CTkFrame(parent, fg_color=self.ZA_BG, height=10, corner_radius=0).pack(fill="x")

        hero = ctk.CTkFrame(parent, fg_color="transparent")
        hero.pack(fill="x", padx=22, pady=(4, 0))
        row = ctk.CTkFrame(hero, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text="MiniMax", font=("Segoe UI Semibold", 22),
                     text_color=self.ZA_PRIMARY).pack(side="left")
        plan = d.get("plan", "")
        if plan and plan != "Unknown":
            ctk.CTkLabel(row, text=f"  {plan}  ", font=("Segoe UI Semibold", 11),
                         text_color=self.ZA_PRIMARY, fg_color=self.ZA_ACCENT_LT,
                         corner_radius=10).pack(side="right")

        meta = ctk.CTkFrame(hero, fg_color="transparent")
        meta.pack(fill="x", pady=(5, 0))
        dot_color = "#FF6A00" if available else self.ZA_TERTIARY
        ctk.CTkFrame(meta, fg_color=dot_color, corner_radius=4,
                     width=7, height=7).pack(side="left", padx=(1, 7), pady=5)
        ctk.CTkLabel(meta, text=d.get("updated", ""), font=("Segoe UI", 12),
                     text_color=self.ZA_PRIMARY).pack(side="left")

        if not available:
            ctk.CTkFrame(parent, fg_color=self.ZA_ACCENT_LT, height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=(20, 8))
            ctk.CTkLabel(nd, text=d.get("error", "MiniMax token not set"),
                         font=("Segoe UI Semibold", 14),
                         text_color=self.ZA_PRIMARY).pack(pady=(0, 4))
            ctk.CTkLabel(nd, text="Auto-reads cookies from browser (login to minimaxi.com)",
                         font=("Segoe UI", 11),
                         text_color=self.ZA_PRIMARY).pack(pady=(0, 12))
            return

        sp = d.get("session_used_pct", 0)
        self._zai_usage_bar(parent, "Session Quota", sp, d.get("session_reset"))

        wp = d.get("weekly_used_pct", 0)
        if wp > 0:
            self._zai_usage_bar(parent, "Weekly Quota", wp, d.get("weekly_reset"))

    # ── OpenCode panel ─────────────────────────────────────────

    def _build_opencode_panel(self, parent):
        d = self._opencode
        available = not d.get("error") and d.get("available", False)

        ctk.CTkFrame(parent, fg_color=self.ZA_BG, height=10, corner_radius=0).pack(fill="x")

        hero = ctk.CTkFrame(parent, fg_color="transparent")
        hero.pack(fill="x", padx=22, pady=(4, 0))
        row = ctk.CTkFrame(hero, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text="OpenCode", font=("Segoe UI Semibold", 22),
                     text_color=self.ZA_PRIMARY).pack(side="left")
        plan = d.get("plan", "")
        if plan and plan != "Unknown":
            ctk.CTkLabel(row, text=f"  {plan}  ", font=("Segoe UI Semibold", 11),
                         text_color=self.ZA_PRIMARY, fg_color=self.ZA_ACCENT_LT,
                         corner_radius=10).pack(side="right")

        meta = ctk.CTkFrame(hero, fg_color="transparent")
        meta.pack(fill="x", pady=(5, 0))
        dot_color = self.ZA_ACCENT if available else self.ZA_TERTIARY
        ctk.CTkFrame(meta, fg_color=dot_color, corner_radius=4,
                     width=7, height=7).pack(side="left", padx=(1, 7), pady=5)
        ctk.CTkLabel(meta, text=d.get("updated", ""), font=("Segoe UI", 12),
                     text_color=self.ZA_TERTIARY).pack(side="left")

        # Debug panel
        if not available:
            ctk.CTkFrame(parent, fg_color=self.ZA_ACCENT_LT, height=1, corner_radius=0).pack(fill="x", padx=20, pady=(12, 0))
            nd = ctk.CTkFrame(parent, fg_color="transparent")
            nd.pack(fill="x", padx=20, pady=(20, 8))
            ctk.CTkLabel(nd, text=d.get("error", "OpenCode cookie not set"),
                         font=("Segoe UI Semibold", 14),
                         text_color=self.ZA_PRIMARY).pack(pady=(0, 4))
            ctk.CTkLabel(nd, text="Auto-reads cookies from browser (or set OPENCODE_COOKIE)",
                         font=("Segoe UI", 11),
                         text_color=self.ZA_TERTIARY).pack(pady=(0, 12))
            return

        sp = d.get("session_used_pct", 0)
        self._zai_usage_bar(parent, "Session Quota", sp, d.get("session_reset"))

class SettingsPopup(ctk.CTkToplevel):
    """Settings window for API tokens."""

    @classmethod
    def _config_path(cls):
        """Return settings path: LOCALAPPDATA/CodexBar/settings.json or ~/.codexbar/settings.json."""
        p = Path(os.environ.get("LOCALAPPDATA", "")) / "CodexBar" / "settings.json"
        if not p.parent.exists():
            p = Path.home() / ".codexbar" / "settings.json"
        return p

    @classmethod
    def load_last_tab(cls):
        """Load last active tab from settings file."""
        try:
            # Use same path logic as _load(): LOCALAPPDATA first (Windows), then ~/.codexbar/
            settings_path = Path(os.environ.get("LOCALAPPDATA", "")) / "CodexBar" / "settings.json"
            if not settings_path.parent.exists():
                settings_path = Path.home() / ".codexbar" / "settings.json"
            if settings_path.exists():
                data = json.loads(settings_path.read_text())
                return data.get("last_tab", "claude")
        except Exception:
            pass
        return "claude"

    @classmethod
    def save_last_tab(cls, tab):
        """Save last active tab to settings file."""
        try:
            # Use same path logic as save_all_tokens(): LOCALAPPDATA first (Windows), then ~/.codexbar/
            settings_path = Path(os.environ.get("LOCALAPPDATA", "")) / "CodexBar" / "settings.json"
            if not settings_path.parent.exists():
                settings_path = Path.home() / ".codexbar" / "settings.json"
            settings_path.parent.mkdir(parents=True, exist_ok=True)
            data = {}
            if settings_path.exists():
                data = json.loads(settings_path.read_text())
            data["last_tab"] = tab
            settings_path.write_text(json.dumps(data, indent=2))
        except Exception:
            pass

    def __init__(self, master, on_save=None):
        super().__init__(master)
        self.title("CodexBar Settings")
        self.geometry("420x700")
        self.resizable(False, False)
        self.configure(fg_color="#F8FAFE")
        self.attributes("-topmost", True)
        self.grab_set()
        self._on_save = on_save

        # ── z.ai section ──
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(16, 8))
        ctk.CTkLabel(header, text="Z.AI API Token",
                     font=("Segoe UI Semibold", 14),
                     text_color="#1A1A2E").pack(side="left")

        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(fill="x", padx=20, pady=4)

        saved_token = self._load_token()
        self._token_entry = ctk.CTkEntry(
            row, show="*", placeholder_text="Enter Z.AI API token...",
            font=("Segoe UI", 12), height=32, corner_radius=6,
            fg_color="#FFFFFF", border_color="#D8DCE8")
        self._token_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        if saved_token:
            self._token_entry.insert(0, saved_token)

        self._test_btn = ctk.CTkButton(
            row, text="Test", font=("Segoe UI Semibold", 12),
            width=60, height=32, corner_radius=6,
            fg_color="#4A6CF7", hover_color="#3A5CE5",
            text_color="#FFFFFF", command=self._test_token)
        self._test_btn.pack(side="left")

        # ── test result label ──
        self._test_result = ctk.CTkLabel(
            self, text="", font=("Segoe UI", 11),
            text_color="#8E94AE", anchor="w")
        self._test_result.pack(fill="x", padx=20, pady=(4, 0))

        # ── MiniMax section ──
        mm_header = ctk.CTkFrame(self, fg_color="#F0F2F8")
        mm_header.pack(fill="x", padx=20, pady=(12, 4))
        ctk.CTkLabel(mm_header, text="MiniMax",
                     font=("Segoe UI Semibold", 13),
                     text_color="#1A1A2E").pack(side="left")
        ctk.CTkLabel(mm_header,
                     text=" Auto-reads cookies from browser",
                     font=("Segoe UI", 10),
                     text_color="#8E94AE").pack(side="left", padx=(4, 0))

        mm_hint = ctk.CTkLabel(self,
                               text="Make sure you.re logged in at minimaxi.com / platform.minimax.io",
                               font=("Segoe UI", 10), text_color="#8E94AE",
                               anchor="w")
        mm_hint.pack(fill="x", padx=20, pady=(0, 2))

        mm_row = ctk.CTkFrame(self, fg_color="#F0F2F8")
        mm_row.pack(fill="x", padx=20, pady=4)
        saved_mm = self._load_token("minimax_token")
        self._mm_entry = ctk.CTkEntry(
            mm_row, show="*", placeholder_text="API token (fallback)",
            font=("Segoe UI", 12), height=30, corner_radius=6,
            fg_color="#FFFFFF", border_color="#D8DCE8")
        self._mm_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        if saved_mm:
            self._mm_entry.insert(0, saved_mm)

        self._mm_test_btn = ctk.CTkButton(
            mm_row, text="Test", font=("Segoe UI Semibold", 12),
            width=60, height=30, corner_radius=6,
            fg_color="#4A6CF7", hover_color="#3A5CE5",
            text_color="#FFFFFF", command=self._test_minimax)
        self._mm_test_btn.pack(side="left")

        self._mm_result = ctk.CTkLabel(
            self, text="", font=("Segoe UI", 11),
            text_color="#8E94AE", anchor="w")
        self._mm_result.pack(fill="x", padx=20, pady=(2, 0))

        # ── OpenCode section ──
        oc_header = ctk.CTkFrame(self, fg_color="#F0F2F8")
        oc_header.pack(fill="x", padx=20, pady=(12, 4))
        ctk.CTkLabel(oc_header, text="OpenCode",
                     font=("Segoe UI Semibold", 13),
                     text_color="#1A1A2E").pack(side="left")
        ctk.CTkLabel(oc_header,
                     text=" Auto-reads cookies from browser",
                     font=("Segoe UI", 10),
                     text_color="#8E94AE").pack(side="left", padx=(4, 0))

        oc_hint = ctk.CTkLabel(self,
                               text="Make sure you're logged in at opencode.ai",
                               font=("Segoe UI", 10), text_color="#8E94AE",
                               anchor="w")
        oc_hint.pack(fill="x", padx=20, pady=(0, 2))

        oc_row = ctk.CTkFrame(self, fg_color="#F0F2F8")
        oc_row.pack(fill="x", padx=20, pady=4)
        saved_oc = self._load_token("opencode_cookie")
        self._oc_entry = ctk.CTkEntry(
            oc_row, show="*", placeholder_text="Cookie (fallback; auto-read if blank)",
            font=("Segoe UI", 12), height=30, corner_radius=6,
            fg_color="#FFFFFF", border_color="#D8DCE8")
        self._oc_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        if saved_oc:
            self._oc_entry.insert(0, saved_oc)

        self._oc_test_btn = ctk.CTkButton(
            oc_row, text="Test", font=("Segoe UI Semibold", 12),
            width=60, height=30, corner_radius=6,
            fg_color="#4A6CF7", hover_color="#3A5CE5",
            text_color="#FFFFFF", command=self._test_opencode)
        self._oc_test_btn.pack(side="left")

        self._oc_result = ctk.CTkLabel(
            self, text="", font=("Segoe UI", 11),
            text_color="#8E94AE", anchor="w")
        self._oc_result.pack(fill="x", padx=20, pady=(2, 0))

        self._token_entry.focus_set()

        # ── DEBUG: version label ──
        ver_frame = ctk.CTkFrame(self, fg_color="#FFE0B2", height=24)
        ver_frame.pack(fill="x", padx=0, pady=(0, 2))
        ctk.CTkLabel(
            ver_frame,
            text=f"Settings v{VERSION}",
            font=("Segoe UI", 9, "bold"),
            text_color="#1A1A2E", fg_color="#FFE0B2"
        ).pack(pady=3)


        # ── Bottom buttons ──
        bottom_row = ctk.CTkFrame(self, fg_color="#F0F2F8")
        bottom_row.pack(side="bottom", fill="x", padx=20, pady=(8, 16))

        ctk.CTkButton(
            bottom_row, text="Save", font=("Segoe UI Semibold", 12),
            width=100, height=34, corner_radius=6,
            fg_color="#4A6CF7", hover_color="#3A5CE5",
            text_color="#FFFFFF", command=self._save_and_close
        ).pack(side="right")

        ctk.CTkButton(
            bottom_row, text="Cancel", font=("Segoe UI", 12),
            width=80, height=34, corner_radius=6,
            fg_color="#D0D4E0", hover_color="#B0B4C0",
            text_color="#1A1A2E", command=self.destroy
        ).pack(side="right", padx=(0, 8))

    @classmethod
    def _load_token(cls, key="zai_token"):
        """Load saved z.ai token from config file."""
        try:
            if cls._config_path().exists():
                data = json.loads(cls._config_path().read_text())
                return data.get(key, "")
        except Exception:
            pass
        return ""

    def save_all_tokens(self):
        """Save all tokens to config file and set env vars."""
        try:
            # Use same path logic as _load(): LOCALAPPDATA first (Windows), then ~/.codexbar/
            settings_path = Path(os.environ.get("LOCALAPPDATA", "")) / "CodexBar" / "settings.json"
            if not settings_path.parent.exists():
                settings_path = Path.home() / ".codexbar" / "settings.json"
            settings_path.parent.mkdir(parents=True, exist_ok=True)
            data = {}
            if settings_path.exists():
                try:
                    data = json.loads(settings_path.read_text())
                except Exception:
                    pass

            zai_tok = self._token_entry.get().strip()
            mm_tok = self._mm_entry.get().strip()
            oc_cook = self._oc_entry.get().strip()

            # Guard against duplicated tokens (if same string concatenated >2x, truncate to first occurrence)
            def dedup(tok):
                if not tok:
                    return tok
                # If token is repeated 2+ times (e.g. "abcabcabc"), keep only first
                mid = len(tok) // 2
                first_half = tok[:mid]
                if tok == first_half * 2 or tok == first_half * 3:
                    return first_half
                # Also check via repetition
                for n in [2, 3, 4]:
                    candidate = tok[:len(tok)//n]
                    if len(tok) % len(candidate) == 0 and candidate * n == tok:
                        return candidate
                return tok

            data["zai_token"] = dedup(zai_tok)
            data["minimax_token"] = dedup(mm_tok)
            data["opencode_cookie"] = oc_cook

            settings_path.write_text(json.dumps(data, indent=2))
            os.environ["ZAI_API_TOKEN"] = data.get("zai_token", "")
            os.environ["MINIMAX_API_KEY"] = data.get("minimax_token", "")
            os.environ["OPENCODE_COOKIE"] = data.get("opencode_cookie", "")
        except Exception:
            pass

    def _test_token(self):
        token = self._token_entry.get().strip()
        if not token:
            self._test_result.configure(text="✗ Enter a token first", text_color="#E04040")
            return
        self._test_btn.configure(text="...", state="disabled")
        self._test_result.configure(text="Testing...", text_color="#8E94AE")
        self.update_idletasks()

        def do_test():
            try:
                req = Request(ZaiDataFetcher.API_URL, headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                })
                with urlopen(req, timeout=10) as resp:
                    json.loads(resp.read())
                self.after(0, lambda: self._test_result.configure(
                    text="✓ Token valid", text_color="#2E9E5A"))
            except HTTPError as e:
                msg = "✗ Invalid token" if e.code in (401, 403) else f"✗ HTTP {e.code}"
                self.after(0, lambda: self._test_result.configure(
                    text=msg, text_color="#E04040"))
            except Exception as e:
                self.after(0, lambda: self._test_result.configure(
                    text=f"✗ Connection error", text_color="#E04040"))
            finally:
                self.after(0, lambda: self._test_btn.configure(
                    text="Test", state="normal"))

        threading.Thread(target=do_test, daemon=True).start()

    def _test_minimax(self):
        # Try browser cookie first, then fall back to API token
        browser_cookies = _CookieDecryptor.get_cookies(".minimax.io", "HMACCCS", "locale")
        token = self._mm_entry.get().strip() or SettingsPopup._load_token("minimax_token")

        def do_test_cookie():
            hmac = browser_cookies.get("HMACCCS", "")
            locale = browser_cookies.get("locale", "en")
            try:
                req = Request("https://api.minimax.io/v1/api/openplatform/coding_plan/remains",
                             headers={"Cookie": f"HMACCCS={hmac}; locale={locale}",
                                      "MM-API-Source": "CodexBar"})
                with urlopen(req, timeout=10) as resp:
                    json.loads(resp.read())
                return "✓ Browser cookie works", "#2E9E5A"
            except HTTPError as e:
                if e.code in (401, 403):
                    return "✗ Session expired; re-login in browser", "#E04040"
                return f"✗ HTTP {e.code}", "#E04040"
            except Exception as e:
                return f"✗ {type(e).__name__}", "#E04040"

        def do_test_token(tok):
            try:
                req = Request("https://api.minimax.io/v1/api/openplatform/coding_plan/remains",
                             headers={"Authorization": f"Bearer {tok}", "MM-API-Source": "web"})
                with urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read())
                # Check API-level status code (not just HTTP status)
                base = data.get("base_resp", {})
                if base.get("status_code", -1) != 0:
                    msg = base.get("status_msg", "API error")
                    return f"✗ {msg}", "#E04040"
                return "✓ API token works", "#2E9E5A"
            except HTTPError as e:
                if e.code in (401, 403):
                    return "✗ Invalid token", "#E04040"
                return f"✗ HTTP {e.code}", "#E04040"
            except Exception:
                return "✗ Connection error", "#E04040"

        def run():
            self._mm_test_btn.configure(text="...", state="disabled")
            self.update_idletasks()

            if browser_cookies.get("HMACCCS"):
                self._mm_result.configure(text="Testing browser cookie...", text_color="#8E94AE")
                self.update_idletasks()
                msg, color = do_test_cookie()
                self.after(0, lambda m=msg, c=color:
                    self._mm_result.configure(text=m, text_color=c))
                # If cookie test succeeded, refresh main panel
                if "✓" in msg:
                    self.after(100, lambda: self.root._do_refresh())
            elif token:
                self._mm_result.configure(text="Testing API token...", text_color="#8E94AE")
                self.update_idletasks()
                msg, color = do_test_token(token)
                self.after(0, lambda m=msg, c=color:
                    self._mm_result.configure(text=m, text_color=c))
                # If token test succeeded, save and refresh main panel
                if "✓" in msg:
                    self.after(100, lambda: (self.save_all_tokens(),
                                             self.root._do_refresh()))
            else:
                self.after(0, lambda: self._mm_result.configure(
                    text="✗ No browser cookie; enter API token", text_color="#E04040"))

            self.after(0, lambda: self._mm_test_btn.configure(text="Test", state="normal"))

        threading.Thread(target=run, daemon=True).start()

    def _test_opencode(self):
        # Try browser cookies first, then fall back to manual entry
        browser_cookies = _CookieDecryptor.get_cookies(".opencode.ai", "auth", "oc_locale")
        raw = self._oc_entry.get().strip()

        def do_test(cookie_header):
            try:
                url = OpenCodeDataFetcher._workspace_url()
                req = Request(url, headers={"Cookie": cookie_header,
                                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0"})
                with urlopen(req, timeout=15) as resp:
                    html = resp.read().decode("utf-8", errors="replace")
                    if "rollingUsage" in html or "weeklyUsage" in html:
                        return "✓ Browser cookie works", "#2E9E5A"
                    return "✓ Connected (no usage data)", "#5A607A"
            except HTTPError as e:
                if e.code in (401, 403):
                    return "✗ Session expired; re-login in browser", "#E04040"
                return f"✗ HTTP {e.code}", "#E04040"
            except Exception as e:
                return f"✗ {type(e).__name__}: {e}", "#E04040"

        def run():
            self._oc_test_btn.configure(text="...", state="disabled")
            self._oc_result.configure(text="Testing browser cookie...", text_color="#8E94AE")
            self.update_idletasks()

            # Try browser cookie
            if browser_cookies.get("auth"):
                parts = [f"auth={browser_cookies['auth']}"]
                if browser_cookies.get("oc_locale"):
                    parts.append(f"oc_locale={browser_cookies['oc_locale']}")
                cookie_header = "; ".join(parts)
                msg, color = do_test(cookie_header)
                self.after(0, lambda m=msg, c=color:
                    self._oc_result.configure(text=m, text_color=c))
            elif raw:
                # Fall back to manual entry
                self._oc_result.configure(text="Testing manual cookie...", text_color="#8E94AE")
                self.update_idletasks()
                cookie_header = raw if raw.startswith("auth=") else f"auth={raw}"
                msg, color = do_test(cookie_header)
                self.after(0, lambda m=msg, c=color:
                    self._oc_result.configure(text=m, text_color=c))
            else:
                self.after(0, lambda: self._oc_result.configure(
                    text="✗ No cookie; browser auto-read failed", text_color="#E04040"))

            self.after(0, lambda: self._oc_test_btn.configure(text="Test", state="normal"))

        threading.Thread(target=run, daemon=True).start()

    def _save_and_close(self):
        self.save_all_tokens()
        if self._on_save:
            self._on_save()
        self.destroy()


class CodexBarApp:
    def __init__(self):
        # ── Single-instance mutex ──────────────────────────────────
        import os as _os, ctypes as _ctypes, ctypes.wintypes as _wt
        _MUTEX_NAME = "CodexBar_SingleInstance_Mutex"
        _mutex = _ctypes.windll.kernel32.CreateMutexW(None, False, _MUTEX_NAME)
        _err = _ctypes.windll.kernel32.GetLastError()
        if _err == 183:  # ERROR_ALREADY_EXISTS — another instance running
            import tkinter as _tk
            _tk.Tk().withdraw()  # create root only for messagebox
            _tk.messagebox.showwarning(
                "CodexBar already running",
                "CodexBar is already open. Close the existing window first.")
            raise SystemExit(0)
        # ── Kill stale lock file PID ────────────────────────────────
        lock_file = _os.path.join(_os.environ.get('LOCALAPPDATA', _os.path.expanduser('~')),
                                  'CodexBar', 'codexbar.lock')
        try:
            _os.makedirs(_os.path.dirname(lock_file), exist_ok=True)
            if _os.path.exists(lock_file):
                old_pid = int(open(lock_file).read().strip())
                try:
                    _os.kill(old_pid, 0)
                    import subprocess as _subprocess
                    _subprocess.run(['taskkill', '/F', '/PID', str(old_pid)],
                                  capture_output=True, timeout=3)
                except (OSError, ProcessLookupError, ValueError, subprocess.TimeoutExpired):
                    pass
        except Exception:
            pass
        try:
            with open(lock_file, 'w') as f:
                f.write(str(_os.getpid()))
        except Exception:
            pass

        self.fetcher = ClaudeDataFetcher()
        self.codex_fetcher = CodexDataFetcher()
        self.zai_fetcher = ZaiDataFetcher()          # added by Romul
        self.minimax_fetcher = MiniMaxDataFetcher()  # added by Romul
        self.opencode_fetcher = OpenCodeDataFetcher()  # added by Romul
        self.root = None
        self.tray = None
        self.popup = None
        self.settings_popup = None
        self.running = True
        self.codex_data = None
        self.zai_data = None                          # added by Romul
        self.minimax_data = None                      # added by Romul
        self.opencode_data = None                     # added by Romul
        self._active_provider = "claude"  # Track currently active provider for icon

        # Load saved tokens on startup
        saved = SettingsPopup._load_token()
        if saved:
            os.environ.setdefault("ZAI_API_TOKEN", saved)
        saved_mm = SettingsPopup._load_token("minimax_token")
        if saved_mm:
            os.environ.setdefault("MINIMAX_API_KEY", saved_mm)
        saved_oc = SettingsPopup._load_token("opencode_cookie")
        if saved_oc:
            os.environ.setdefault("OPENCODE_COOKIE", saved_oc)

    def start(self):
        print("[CodexBar] Fetching your real usage data...\n")
        self.fetcher.fetch_all()
        print(f"\n[CodexBar] Source: {self.fetcher.data['source']}")
        try:
            self.codex_data = self.codex_fetcher.fetch()
            print(f"[CodexBar] Codex: {'available' if self.codex_data.get('available') else 'not found'}")
        except Exception as e:
            print(f"[CodexBar] Codex fetch err: {e}")
            self.codex_data = CodexDataFetcher._empty()

        # --- Z.AI fetch (added by Romul) ---
        try:
            self.zai_data = self.zai_fetcher.fetch()
            print(f"[CodexBar] Z.AI: {'available' if self.zai_data.get('available') else 'token not set'}")
        except Exception as e:
            print(f"[CodexBar] Z.AI fetch err: {e}")
            self.zai_data = ZaiDataFetcher._empty()

        # --- MiniMax fetch (added by Romul) ---
        try:
            self.minimax_data = self.minimax_fetcher.fetch()
            print(f"[CodexBar] MiniMax: {'available' if not self.minimax_data.get('error') else self.minimax_data.get('error')}")
        except Exception as e:
            print(f"[CodexBar] MiniMax fetch err: {e}")
            self.minimax_data = MiniMaxDataFetcher._empty()

        # --- OpenCode fetch (added by Romul) ---
        try:
            self.opencode_data = self.opencode_fetcher.fetch()
            print(f"[CodexBar] OpenCode: {'available' if not self.opencode_data.get('error') else self.opencode_data.get('error')}")
        except Exception as e:
            print(f"[CodexBar] OpenCode fetch err: {e}")
            self.opencode_data = OpenCodeDataFetcher._empty()

        # ── hidden tkinter root ──
        ctk.set_appearance_mode("light")
        self.root = ctk.CTk()
        self.root.withdraw()

        # ── tray icon (background thread) ──
        d = self.fetcher.data
        sp = d.get("session_used_pct", 0)

        menu = Menu(
            MenuItem('Open CodexBar', self._tray_open, default=True),
            MenuItem('Refresh', self._tray_refresh),
            Menu.SEPARATOR,
            MenuItem('Quit', self._tray_quit),
        )
        self.tray = pystray.Icon('CodexBar', make_icon(sp=sp), 'CodexBar', menu)
        threading.Thread(target=self.tray.run, daemon=True).start()

        # ── auto-refresh every 5 min ──
        self.root.after(300_000, self._auto_refresh)

        print("\n" + "=" * 50)
        print("  CodexBar running in system tray!")
        print("  Look for the icon near the clock.")
        print("  Click ^ (arrow) if hidden.")
        print("  Double-click = open panel.")
        print("=" * 50 + "\n")

        # ── mainloop (blocks) ──
        self.root.mainloop()

    # ── tray callbacks (called from pystray thread) ──

    def _tray_open(self, *_):
        self.root.after(0, self._show_popup)

    def _tray_refresh(self, *_):
        self.root.after(0, self._do_refresh)

    def _tray_quit(self, *_):
        self.root.after(0, self._do_quit)

    # ── popup ──

    def _show_popup(self):
        import sys
        print(f"[POPUP] _show_popup called, popup={self.popup}", flush=True)
        if self.popup is not None:
            try:
                self.popup.destroy()
            except Exception:
                pass
            self.popup = None

        print("[POPUP] Creating CodexBarPopup...", flush=True)
        self.popup = CodexBarPopup(
            self.root,
            self.fetcher.data,
            codex_data=self.codex_data,
            zai_data=self.zai_data,
            minimax_data=self.minimax_data,
            opencode_data=self.opencode_data,
            on_close=self._on_popup_closed,
            on_refresh=lambda: self.root.after(0, self._do_refresh),
            on_quit=lambda: self.root.after(0, self._do_quit),
            on_tab_switch=self._on_tab_switch,
            on_settings=lambda: self.root.after(0, self._show_settings),
        )

    def _on_popup_closed(self):
        self.popup = None

    def _show_settings(self):
        if self.settings_popup is not None:
            try:
                self.settings_popup.destroy()
            except Exception:
                pass
        self.settings_popup = SettingsPopup(
            self.root, on_save=self._on_settings_saved)

    def _on_settings_saved(self):
        self._do_refresh()

    def _on_tab_switch(self, tab):
        # Store the active provider for icon refresh
        self._active_provider = tab if tab in ("openai", "zai", "minimax", "opencode") else "claude"
        self._set_tray_icon(tab)

    def _set_tray_icon(self, provider):
        try:
            # Map provider to data source
            provider_map = {
                "claude": (self.fetcher.data, "session_used_pct"),
                "openai": (self.codex_data, "session_used_pct"),
                "zai": (self.zai_data, "session_used_pct"),
                "minimax": (self.minimax_data, "session_used_pct"),
                "opencode": (self.opencode_data, "session_used_pct"),
            }
            p = provider if provider in provider_map else "claude"
            data_src, key = provider_map.get(p, (self.fetcher.data, "session_used_pct"))
            sp = data_src.get(key, 0) if data_src else 0
            print(f"[TRAY] _set_tray_icon provider={provider} -> p={p}, sp={sp}, key={key}, data_keys={list(data_src.keys()) if data_src else None}")
            self.tray.icon = make_icon(sp=sp, provider=p)
        except Exception as e:
            print(f"[TRAY] _set_tray_icon ERROR: {e}")

    # ── refresh ──

    def _do_refresh(self):
        def bg():
            self.fetcher.fetch_all()
            try:
                self.codex_data = self.codex_fetcher.fetch()
            except Exception:
                pass
            try:                                       # added by Romul
                self.zai_data = self.zai_fetcher.fetch()
            except Exception:
                pass
            try:
                self.minimax_data = self.minimax_fetcher.fetch()
            except Exception:
                pass
            try:
                self.opencode_data = self.opencode_fetcher.fetch()
            except Exception:
                pass
            # Update tray icon with current session percentage for active provider
            self._set_tray_icon(self._active_provider)
            print("[CodexBar] Refreshed")
        threading.Thread(target=bg, daemon=True).start()

    def _auto_refresh(self):
        if not self.running:
            return
        self._do_refresh()
        self.root.after(300_000, self._auto_refresh)

    # ── quit ──

    def _do_quit(self):
        print("[CodexBar] Bye!")
        self.running = False
        try:
            self.tray.stop()
        except Exception:
            pass
        try:
            self.root.quit()
            self.root.destroy()
        except Exception:
            pass
        sys.exit(0)


# ─────────────────────────────────────────────

if __name__ == '__main__':
    print(r"""
   ========================================
    CodexBar for Windows v1.0.0
    Native popup - no browser needed
   ========================================
    """)
    CodexBarApp().start()
