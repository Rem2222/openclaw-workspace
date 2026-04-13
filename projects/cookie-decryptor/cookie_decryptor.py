#!/usr/bin/env python3
"""
Chromium Cookie Decryptor - Standalone Module
=============================================

Извлечено из CodexBar-Win 0.2 (https://github.com/babakarto/CodexBar-Win)

Поддерживает:
- Google Chrome
- Microsoft Edge
- Brave

Алгоритмы:
- v10: AES-256-GCM + DPAPI (Chromium v80-126)
- v20: App-Bound Encryption (Chromium 127+) - НЕ поддерживается

Требования: Windows, Python 3.8+

Использование:
    from cookie_decryptor import CookieDecryptor
    
    # Получить sessionKey для Claude
    value, browser = CookieDecryptor.get_session_key()
    
    # Получить произвольные куки
    cookies = CookieDecryptor.get_cookies('.opencode.ai', 'sessionKey', 'auth_token')
    print(cookies)
"""

import os
import sys
import json
import base64
import sqlite3
import tempfile
import shutil
import ctypes
import ctypes.wintypes
from pathlib import Path
from typing import Optional

__version__ = "1.0.0"


class CookieDecryptor:
    """
    Read and decrypt cookies from Chromium-based browsers.
    
    Supports Chrome, Edge, and Brave on Windows.
    Uses DPAPI for master key extraction and AES-256-GCM for cookie decryption.
    """
    
    _LOCAL = os.environ.get("LOCALAPPDATA", "")
    BROWSERS = [
        ("Chrome", Path(_LOCAL) / "Google"         / "Chrome"        / "User Data"),
        ("Edge",   Path(_LOCAL) / "Microsoft"      / "Edge"          / "User Data"),
        ("Brave",  Path(_LOCAL) / "BraveSoftware"  / "Brave-Browser" / "User Data"),
    ]

    # ── public entry points ──────────────────────

    @classmethod
    def get_session_key(cls) -> tuple[Optional[str], Optional[str]]:
        """Return (cookie_value, browser_name) for sessionKey cookie from Claude.
        
        Searches Chrome, Edge, and Brave.
        Returns (None, None) if no cookie found.
        """
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
                print(f"    {name} cookie err: {e}", file=sys.stderr)
        return None, None

    @classmethod
    def get_cookies(cls, host: str, *cookie_names: str) -> dict:
        """Return {cookie_name: value} for arbitrary cookies from any browser.
        
        Args:
            host: Host key (e.g., '.opencode.ai', 'claude.ai')
            cookie_names: One or more cookie names to retrieve
            
        Returns:
            Dict with cookie_name: value pairs. Empty if none found.
            
        Example:
            cookies = CookieDecryptor.get_cookies('.opencode.ai', 'sessionKey')
            print(cookies.get('sessionKey'))
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
                print(f"    {name} get_cookies err: {e}", file=sys.stderr)
        return result

    @classmethod
    def get_all_cookies(cls, host: str) -> dict:
        """Return ALL cookies for a given host.
        
        Args:
            host: Host key (e.g., '.opencode.ai')
            
        Returns:
            Dict with cookie_name: value for all cookies found.
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
                found = cls._read_all_cookies(cookie_db, master_key, host)
                if found:
                    result.update(found)
            except Exception as e:
                print(f"    {name} get_all_cookies err: {e}", file=sys.stderr)
        return result

    # ── DPAPI via ctypes ────────────────────────

    class _BLOB(ctypes.Structure):
        _fields_ = [
            ("cbData", ctypes.wintypes.DWORD),
            ("pbData", ctypes.POINTER(ctypes.c_char)),
        ]

    @classmethod
    def _dpapi_decrypt(cls, data: bytes) -> bytes | None:
        """Decrypt data using Windows DPAPI (CryptUnprotectData)."""
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
        """Decrypt using AES-256-GCM via Windows BCrypt."""
        _b = ctypes.windll.bcrypt

        # open AES provider
        hAlg = ctypes.c_void_p()
        st = _b.BCryptOpenAlgorithmProvider(
            ctypes.byref(hAlg), ctypes.c_wchar_p("AES"), None,
            ctypes.c_ulong(0))
        if st != 0:
            raise OSError(f"BCryptOpenAlgorithmProvider 0x{st & 0xFFFFFFFF:08x}")

        try:
            # set GCM chaining mode
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
        """Extract master key from browser's Local State file."""
        with open(local_state_path, "r", encoding="utf-8") as f:
            js = json.load(f)
        b64 = js.get("os_crypt", {}).get("encrypted_key")
        if not b64:
            return None
        raw = base64.b64decode(b64)
        if raw[:5] != b"DPAPI":
            return None
        return cls._dpapi_decrypt(raw[5:])

    # ── locked file handling ─────────────────────

    @classmethod
    def _copy_locked_file(cls, src: Path, dst: str):
        """Copy a file that another process holds open (e.g. browser DB).
        
        Uses CreateFileW with full sharing flags to bypass the lock.
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

    # ── cookie reading ───────────────────────────

    @classmethod
    def _read_cookie(cls, cookie_db: Path, master_key: bytes) -> str | None:
        """Query the Cookies SQLite DB and decrypt the sessionKey value."""
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        tmp.close()
        try:
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
                if plain_val and plain_val != b"":
                    result[cname_str] = plain_val.decode("utf-8", errors="replace")
                    continue
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
    def _read_all_cookies(cls, cookie_db: Path, master_key: bytes, host: str) -> dict:
        """Query ALL cookies for a host from the SQLite DB and decrypt them."""
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
            rows = conn.execute(
                "SELECT name, encrypted_value, value "
                "FROM cookies "
                "WHERE host_key = ? "
                "ORDER BY last_access_utc DESC",
                (host,)
            ).fetchall()
            conn.close()

            for row in rows:
                cname, enc_val, plain_val = row
                cname_str = cname.decode("utf-8", errors="replace") if isinstance(cname, bytes) else cname
                if plain_val and plain_val != b"":
                    result[cname_str] = plain_val.decode("utf-8", errors="replace")
                    continue
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
        """Decrypt an encrypted cookie value."""
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
            print("      cookie is v20 (App-Bound Encryption) - not supported")
            return None
        # Legacy: raw DPAPI blob
        plain = cls._dpapi_decrypt(enc)
        if plain:
            return plain.decode("utf-8", errors="replace")
        return None


# ── CLI Interface ─────────────────────────────────

def main():
    """CLI interface for testing."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Chromium Cookie Decryptor")
    parser.add_argument("--host", "-h", help="Host key (e.g., .opencode.ai)")
    parser.add_argument("--cookies", "-c", nargs="+", help="Cookie names to retrieve")
    parser.add_argument("--all", "-a", action="store_true", help="Get all cookies for host")
    parser.add_argument("--session", "-s", action="store_true", help="Get Claude sessionKey")
    
    args = parser.parse_args()
    
    if args.session:
        value, browser = CookieDecryptor.get_session_key()
        if value:
            print(f"Found sessionKey in {browser}: {value[:20]}...")
        else:
            print("No sessionKey found")
        return
    
    if args.host:
        if args.all:
            cookies = CookieDecryptor.get_all_cookies(args.host)
            print(f"All cookies for {args.host}:")
            for name, value in cookies.items():
                print(f"  {name}: {value[:30]}...")
        elif args.cookies:
            cookies = CookieDecryptor.get_cookies(args.host, *args.cookies)
            print(f"Cookies for {args.host}:")
            for name, value in cookies.items():
                print(f"  {name}: {value[:30]}...")
        else:
            print("Specify --cookies or --all")
        return
    
    # Default: get sessionKey
    value, browser = CookieDecryptor.get_session_key()
    if value:
        print(f"sessionKey from {browser}: {value[:20]}...")
    else:
        print("No sessionKey found in Chrome/Edge/Brave")


if __name__ == "__main__":
    main()
