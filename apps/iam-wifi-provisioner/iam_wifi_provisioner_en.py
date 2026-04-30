import sys
import os
import json
import time
import threading
import ctypes
import ctypes.wintypes
import requests
import subprocess
import re
from datetime import datetime
from pathlib import Path

APP_VERSION = "v1.0"
DEFAULT_API_PATH = "/api/setwifiadv"
DEFAULT_SSID_PREFIX = "iMeter"
DEFAULT_WIFI_SSID = "iammeter"
DEFAULT_WIFI_PASSWORD = "12345678"

# ──────────────────────────────────────────────
# WlanScan via wlanapi.dll
# ──────────────────────────────────────────────
_wlanapi = None
try:
    _wlanapi = ctypes.windll.LoadLibrary("wlanapi.dll")
except Exception:
    pass


def _hidden_subprocess_kwargs() -> dict:
    """Hide console windows for child CLI tools when running as a GUI app on Windows."""
    kwargs = {}
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        kwargs["startupinfo"] = startupinfo
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return kwargs

class _GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", ctypes.c_ulong),
        ("Data2", ctypes.c_ushort),
        ("Data3", ctypes.c_ushort),
        ("Data4", ctypes.c_ubyte * 8),
    ]

class _WLAN_INTERFACE_INFO(ctypes.Structure):
    _fields_ = [
        ("InterfaceGuid",        _GUID),
        ("strInterfaceDescription", ctypes.c_wchar * 256),
        ("isState",              ctypes.c_uint),
    ]

class _WLAN_INTERFACE_INFO_LIST(ctypes.Structure):
    _fields_ = [
        ("dwNumberOfItems", ctypes.c_ulong),
        ("dwIndex",         ctypes.c_ulong),
        ("InterfaceInfo",   _WLAN_INTERFACE_INFO * 64),
    ]

def _force_wlan_scan():
    """
    Trigger a real-time scan on all wireless adapters via WlanScan,
    then wait for results to refresh.
    Return True if the scan was triggered successfully, otherwise False.
    """
    if _wlanapi is None:
        return False
    try:
        handle = ctypes.wintypes.HANDLE()
        negotiated = ctypes.c_ulong(0)
        ret = _wlanapi.WlanOpenHandle(2, None, ctypes.byref(negotiated), ctypes.byref(handle))
        if ret != 0:
            return False
        iface_list_ptr = ctypes.POINTER(_WLAN_INTERFACE_INFO_LIST)()
        ret = _wlanapi.WlanEnumInterfaces(handle, None, ctypes.byref(iface_list_ptr))
        if ret == 0 and iface_list_ptr:
            count = iface_list_ptr.contents.dwNumberOfItems
            for i in range(count):
                guid = iface_list_ptr.contents.InterfaceInfo[i].InterfaceGuid
                _wlanapi.WlanScan(handle, ctypes.byref(guid), None, None, None)
            _wlanapi.WlanFreeMemory(iface_list_ptr)
        _wlanapi.WlanCloseHandle(handle, None)
        return True
    except Exception:
        return False
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit, QGroupBox, QSpinBox,
    QTableWidget, QTableWidgetItem, QHeaderView, QSplitter, QCheckBox
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QMutex
from PyQt5.QtGui import QFont, QColor

# ──────────────────────────────────────────────
# Global lock protecting the processed-device state
# ──────────────────────────────────────────────
_lock = QMutex()


def timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ──────────────────────────────────────────────
# Scan and provisioning worker
# ──────────────────────────────────────────────
class ProvisionWorker(QThread):
    log_signal   = pyqtSignal(str)          # Log text
    sn_signal    = pyqtSignal(str, str)     # (ssid, sn) on provisioning success
    done_signal  = pyqtSignal()

    def __init__(self, ssid_prefix, target_ssid, target_pwd,
                 api_path, max_retry, interval, parent=None):
        super().__init__(parent)
        self.ssid_prefix  = ssid_prefix
        self.target_ssid  = target_ssid
        self.target_pwd   = target_pwd
        self.api_path     = api_path
        self.max_retry    = max_retry
        self.interval     = interval
        self._running     = True

        # {device_ssid: success_timestamp} for successfully provisioned devices.
        # Remove entries after WIN_CACHE_TTL seconds to allow retries after
        # Windows scan cache expires.
        self._success: dict[str, float] = {}
        self.WIN_CACHE_TTL = 90  # Seconds to skip a device after success

    def stop(self):
        self._running = False

    def reset_state(self):
        """Clear success records so all devices can be provisioned again."""
        self._success.clear()
        self.log_signal.emit(f"[{timestamp()}] Reset all device state. Provisioning will retry.")

    # Scan nearby Wi-Fi networks
    def _scan_wifi(self) -> list[str]:
        """Trigger a real-time scan via WlanScan, then read results with netsh."""
        triggered = _force_wlan_scan()
        if triggered:
            time.sleep(2.5)  # Wait for the async scan to complete
        try:
            out = subprocess.check_output(
                ["netsh", "wlan", "show", "networks", "mode=bssid"],
                encoding="gbk", errors="ignore", timeout=15,
                **_hidden_subprocess_kwargs(),
            )
            ssids = re.findall(r"SSID\s+\d+\s*:\s*(.+)", out)
            return [s.strip() for s in ssids if s.strip()]
        except Exception as e:
            self.log_signal.emit(f"[{timestamp()}] Scan failed: {e}")
            return []

    # Connect to the device hotspot
    def _connect_to_device(self, ssid: str) -> bool:
        """Try to connect to the specified open SSID via netsh."""
        self.log_signal.emit(f"[{timestamp()}] Connecting to hotspot: {ssid}")
        # Build a temporary profile XML first
        profile_xml = f"""<?xml version=\"1.0\"?>
<WLANProfile xmlns=\"http://www.microsoft.com/networking/WLAN/profile/v1\">
    <name>{ssid}</name>
    <SSIDConfig>
        <SSID><name>{ssid}</name></SSID>
    </SSIDConfig>
    <connectionType>ESS</connectionType>
    <connectionMode>manual</connectionMode>
    <MSM>
        <security>
            <authEncryption>
                <authentication>open</authentication>
                <encryption>none</encryption>
                <useOneX>false</useOneX>
            </authEncryption>
        </security>
    </MSM>
</WLANProfile>"""
        profile_file = f"tmp_profile_{ssid}.xml"
        try:
            with open(profile_file, "w", encoding="utf-8") as f:
                f.write(profile_xml)
            subprocess.check_output(
                ["netsh", "wlan", "add", "profile", f"filename={profile_file}"],
                encoding="gbk", errors="ignore", timeout=10,
                **_hidden_subprocess_kwargs(),
            )
            subprocess.check_output(
                ["netsh", "wlan", "connect", f"name={ssid}"],
                encoding="gbk", errors="ignore", timeout=10,
                **_hidden_subprocess_kwargs(),
            )
            time.sleep(5)  # Wait for the connection to settle
            return True
        except Exception as e:
            self.log_signal.emit(f"[{timestamp()}] Failed to connect hotspot: {e}")
            return False
        finally:
            import os
            try:
                os.remove(profile_file)
            except Exception:
                pass

    # Send the provisioning request
    def _provision(self, device_ssid: str) -> tuple[bool, str]:
        """
        Send the provisioning POST request and return (success, sn, reason).
        Success is defined as response JSON containing successful == 1.
        SN is derived from the part after the last underscore in the SSID.
        """
        url = f"http://11.11.11.1{self.api_path}"
        payload = {
            "ssid": self.target_ssid,
            "pwd":  self.target_pwd,
            "dhcp": 1
        }
        masked_url = "http://11.11.11.1/******"
        self.log_signal.emit(
            f"[{timestamp()}] 📡 POST {masked_url}  payload={json.dumps(payload, ensure_ascii=False)}"
        )
        # Derive SN from the substring after the last underscore
        sn = device_ssid.rsplit("_", 1)[-1] if "_" in device_ssid else device_ssid
        try:
            resp = requests.post(url, json=payload, timeout=10)
            data = resp.json()
            if resp.status_code == 200 and data.get("successful") == 1:
                self.log_signal.emit(
                    f"[{timestamp()}] Provisioning succeeded. device={device_ssid} SN={sn} response={resp.text[:200]}"
                )
                return True, sn, ""
            else:
                # Extract device-side error code or message when available
                err_parts = []
                for key in ("code", "errcode", "error_code", "error", "msg", "message"):
                    val = data.get(key)
                    if val is not None:
                        err_parts.append(f"{key}={val}")
                err_info = "  " + "  ".join(err_parts) if err_parts else ""
                reason = f"HTTP {resp.status_code}{err_info}  response={resp.text[:100]}"
                self.log_signal.emit(
                    f"[{timestamp()}] Unexpected provisioning response: {reason}"
                )
                return False, "", reason
        except requests.exceptions.ConnectionError as e:
            # Reduce noisy connection-pool details to a short reason
            cause = e.args[0] if e.args else e
            if "ConnectTimeoutError" in str(cause) or "timed out" in str(cause).lower():
                reason = f"Connection timed out ({url} did not respond)"
            elif "ConnectionResetError" in str(cause) or "10054" in str(cause):
                reason = f"Connection reset by remote host ({url})"
            elif "ConnectionRefusedError" in str(cause) or "10061" in str(cause):
                reason = f"Connection refused ({url})"
            else:
                reason = f"Network connection failed ({url})"
            self.log_signal.emit(f"[{timestamp()}] {reason}")
            return False, "", reason
        except requests.exceptions.Timeout:
            reason = "Request timed out (>10s), device did not respond"
            self.log_signal.emit(f"[{timestamp()}] {reason}")
            return False, "", reason
        except Exception as e:
            reason = f"{type(e).__name__}: {e}"
            self.log_signal.emit(f"[{timestamp()}] Provisioning request error: {reason}")
            return False, "", reason

    # Main loop
    def run(self):
        self.log_signal.emit(
            f"[{timestamp()}] Start scanning. prefix=\"{self.ssid_prefix}\", max_retry={self.max_retry}"
        )
        while self._running:
            ssids = self._scan_wifi()
            matched = [s for s in ssids if s.startswith(self.ssid_prefix)]

            if matched:
                self.log_signal.emit(
                    f"[{timestamp()}] Found {len(matched)} matching device(s): {matched}"
                )
            else:
                self.log_signal.emit(f"[{timestamp()}] No matching devices found. Continuing scan...")

            for dev in matched:
                if not self._running:
                    break

                # Skip devices already provisioned within the cache window
                if dev in self._success:
                    elapsed = time.time() - self._success[dev]
                    if elapsed < self.WIN_CACHE_TTL:
                        self.log_signal.emit(
                            f"[{timestamp()}] Skip {dev}. Already provisioned {elapsed:.0f}s ago; waiting for cache expiry."
                        )
                        continue
                    else:
                        # Cache expired, remove and allow a retry
                        del self._success[dev]

                self.log_signal.emit(
                    f"[{timestamp()}] Processing device {dev}"
                )

                connected = self._connect_to_device(dev)
                if not connected:
                    continue

                ok, sn, reason = self._provision(dev)
                if ok:
                    self._success[dev] = time.time()
                    self.sn_signal.emit(dev, sn)
                else:
                    self.log_signal.emit(
                        f"[{timestamp()}] Provisioning failed for {dev}. reason: {reason}"
                    )
            # Delay between scan rounds
            for _ in range(self.interval):
                if not self._running:
                    break
                time.sleep(1)

        self.log_signal.emit(f"[{timestamp()}] Scanning stopped")
        self.done_signal.emit()


# ──────────────────────────────────────────────
# Main window
# ──────────────────────────────────────────────
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"iam WiFi Provisioner {APP_VERSION}")
        self.resize(900, 900)
        self._worker: ProvisionWorker | None = None
        self._sn_rows: dict[str, int] = {}   # ssid -> row index
        # Log directory
        self._log_dir = Path("log")
        self._log_dir.mkdir(exist_ok=True)
        self._run_log_file = self._log_dir / f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        self._sn_record_file = self._log_dir / "success_records.csv"
        # Config directory
        self._cfg_dir = Path("config")
        self._cfg_dir.mkdir(exist_ok=True)
        self._cfg_file = self._cfg_dir / "settings.json"
        self._build_ui()
        self._load_config()

    # Build UI
    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        root = QVBoxLayout(central)
        root.setSpacing(8)

        # Parameter section
        param_box = QGroupBox("Parameters")
        param_layout = QVBoxLayout(param_box)

        row1 = QHBoxLayout()
        row1.addWidget(QLabel("Device SSID Prefix:"))
        self.prefix_edit = QLineEdit(DEFAULT_SSID_PREFIX)
        self.prefix_edit.setFixedWidth(150)
        row1.addWidget(self.prefix_edit)
        row1.addSpacing(20)
        row1.addWidget(QLabel("Max Retries:"))
        self.retry_spin = QSpinBox()
        self.retry_spin.setRange(1, 10)
        self.retry_spin.setValue(3)
        self.retry_spin.setFixedWidth(60)
        row1.addWidget(self.retry_spin)
        row1.addSpacing(20)
        row1.addWidget(QLabel("Scan Interval (s):"))
        self.interval_spin = QSpinBox()
        self.interval_spin.setRange(3, 300)
        self.interval_spin.setValue(10)
        self.interval_spin.setFixedWidth(60)
        row1.addWidget(self.interval_spin)
        row1.addStretch()
        param_layout.addLayout(row1)

        row2 = QHBoxLayout()
        row2.addWidget(QLabel("Target Wi-Fi SSID:"))
        self.wifi_ssid_edit = QLineEdit(DEFAULT_WIFI_SSID)
        self.wifi_ssid_edit.setFixedWidth(200)
        row2.addWidget(self.wifi_ssid_edit)
        row2.addSpacing(20)
        row2.addWidget(QLabel("Target Wi-Fi Password:"))
        self.wifi_pwd_edit = QLineEdit(DEFAULT_WIFI_PASSWORD)
        self.wifi_pwd_edit.setFixedWidth(200)
        row2.addWidget(self.wifi_pwd_edit)
        row2.addStretch()
        param_layout.addLayout(row2)

        root.addWidget(param_box)

        # Control buttons
        btn_row = QHBoxLayout()
        self.toggle_btn = QPushButton("▶ Start Scan")
        self.toggle_btn.setFixedHeight(36)
        self.toggle_btn.setStyleSheet("background:#4CAF50;color:white;font-weight:bold;border-radius:4px;")
        self.toggle_btn.clicked.connect(self._toggle)
        btn_row.addWidget(self.toggle_btn)

        self.clear_log_btn = QPushButton("Clear Log")
        self.clear_log_btn.setFixedHeight(36)
        self.clear_log_btn.clicked.connect(self._clear_log)
        btn_row.addWidget(self.clear_log_btn)

        self.reset_btn = QPushButton("↺ Reset State")
        self.reset_btn.setFixedHeight(36)
        self.reset_btn.setToolTip(
            "Clear processed-device records so all devices can be provisioned again."
        )
        self.reset_btn.clicked.connect(self._reset_state)
        btn_row.addWidget(self.reset_btn)

        self.save_log_chk = QCheckBox("Save Logs To File")
        self.save_log_chk.setChecked(True)
        self.save_log_chk.setToolTip("Logs are saved to log/ and success records to log/success_records.csv")
        btn_row.addWidget(self.save_log_chk)
        btn_row.addStretch()
        root.addLayout(btn_row)

        # Split area: logs + SN table
        splitter = QSplitter(Qt.Vertical)

        # Logs
        log_box = QGroupBox("Run Log")
        log_layout = QVBoxLayout(log_box)
        self.log_edit = QTextEdit()
        self.log_edit.setReadOnly(True)
        self.log_edit.setFont(QFont("Consolas", 9))
        log_layout.addWidget(self.log_edit)
        splitter.addWidget(log_box)

        # SN table
        sn_box = QGroupBox("Provisioned Devices (SN)")
        sn_layout = QVBoxLayout(sn_box)
        self.sn_table = QTableWidget(0, 4)
        self.sn_table.setHorizontalHeaderLabels(["No.", "Device Hotspot SSID", "SN", "Time"])
        self.sn_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.sn_table.setEditTriggers(QTableWidget.NoEditTriggers)
        sn_layout.addWidget(self.sn_table)
        splitter.addWidget(sn_box)

        splitter.setSizes([480, 280])
        root.addWidget(splitter)

    # Load and save config
    def _load_config(self):
        if not self._cfg_file.exists():
            return
        try:
            cfg = json.loads(self._cfg_file.read_text(encoding="utf-8"))
            self.prefix_edit.setText(cfg.get("ssid_prefix", DEFAULT_SSID_PREFIX))
            self.retry_spin.setValue(cfg.get("max_retry", 3))
            self.interval_spin.setValue(cfg.get("interval", 10))
            self.wifi_ssid_edit.setText(cfg.get("wifi_ssid", DEFAULT_WIFI_SSID))
            self.wifi_pwd_edit.setText(cfg.get("wifi_pwd", DEFAULT_WIFI_PASSWORD))
            self.save_log_chk.setChecked(cfg.get("save_log", True))
        except Exception:
            pass

    def _save_config(self):
        cfg = {
            "ssid_prefix": self.prefix_edit.text().strip(),
            "max_retry":   self.retry_spin.value(),
            "interval":    self.interval_spin.value(),
            "wifi_ssid":   self.wifi_ssid_edit.text().strip(),
            "wifi_pwd":    self.wifi_pwd_edit.text().strip(),
            "save_log":    self.save_log_chk.isChecked(),
        }
        try:
            self._cfg_file.write_text(
                json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception:
            pass

    def closeEvent(self, event):
        self._save_config()
        super().closeEvent(event)

    # Toggle start/stop
    def _toggle(self):
        if self._worker and self._worker.isRunning():
            self._stop()
        else:
            self._start()

    # Start
    def _start(self):
        prefix   = self.prefix_edit.text().strip()
        w_ssid   = self.wifi_ssid_edit.text().strip()
        w_pwd    = self.wifi_pwd_edit.text().strip()
        max_retry = self.retry_spin.value()
        interval  = self.interval_spin.value()

        if not prefix:
            self._append_log(f"[{timestamp()}] Please enter a device SSID prefix")
            return
        if not w_ssid:
            self._append_log(f"[{timestamp()}] Please enter the target Wi-Fi SSID")
            return

        self.toggle_btn.setText("■ Stop Scan")
        self.toggle_btn.setStyleSheet("background:#f44336;color:white;font-weight:bold;border-radius:4px;")

        self._worker = ProvisionWorker(prefix, w_ssid, w_pwd, DEFAULT_API_PATH, max_retry, interval)
        self._worker.log_signal.connect(self._append_log)
        self._worker.sn_signal.connect(self._add_sn_record)
        self._worker.done_signal.connect(self._on_done)
        self._worker.start()

    # Stop
    def _stop(self):
        if self._worker:
            self._worker.stop()
        self.toggle_btn.setEnabled(False)

    def _on_done(self):
        self.toggle_btn.setText("▶ Start Scan")
        self.toggle_btn.setStyleSheet("background:#4CAF50;color:white;font-weight:bold;border-radius:4px;")
        self.toggle_btn.setEnabled(True)

    # Reset processed state
    def _reset_state(self):
        if self._worker and self._worker.isRunning():
            self._worker.reset_state()
        else:
            self._append_log(f"[{timestamp()}] State reset. Changes will apply on the next scan run.")

    # Log output
    def _append_log(self, text: str):
        self.log_edit.append(text)
        self.log_edit.verticalScrollBar().setValue(
            self.log_edit.verticalScrollBar().maximum()
        )
        if self.save_log_chk.isChecked():
            try:
                with open(self._run_log_file, "a", encoding="utf-8") as f:
                    f.write(text + "\n")
            except Exception:
                pass

    def _clear_log(self):
        self.log_edit.clear()

    # Add an SN record
    def _add_sn_record(self, device_ssid: str, sn: str):
        row = self.sn_table.rowCount()
        ts = timestamp()
        self.sn_table.insertRow(row)
        self.sn_table.setItem(row, 0, QTableWidgetItem(str(row + 1)))
        self.sn_table.setItem(row, 1, QTableWidgetItem(device_ssid))
        self.sn_table.setItem(row, 2, QTableWidgetItem(sn))
        self.sn_table.setItem(row, 3, QTableWidgetItem(ts))
        # Highlight successful rows in green
        for col in range(4):
            item = self.sn_table.item(row, col)
            if item:
                item.setBackground(QColor("#c8e6c9"))
        self._sn_rows[device_ssid] = row
        # Always append to the success CSV regardless of the log toggle
        try:
            write_header = not self._sn_record_file.exists()
            with open(self._sn_record_file, "a", encoding="utf-8", newline="") as f:
                if write_header:
                    f.write("Time,DeviceHotspotSSID,SN\n")
                f.write(f"{ts},{device_ssid},{sn}\n")
        except Exception:
            pass


# ──────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────
if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    win = MainWindow()
    win.show()
    sys.exit(app.exec_())
