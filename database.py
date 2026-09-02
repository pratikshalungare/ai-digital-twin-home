"""
AI Digital Twin Smart Home - Database Management Module
Uses SQLite to store device states, water tank sensor readings, and system activity logs.
Automatically creates, seeds, and migrates database tables.
"""

import os
import sqlite3
from datetime import datetime

# Resolve database path relative to project root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "home.db")

# Complete list of 1-BHK Smart Devices
DEFAULT_DEVICES = [
    # Living Room
    ("living_light", "Living Room Light", "Living Room", "light", 1, 60.0),
    ("living_fan", "Living Room Fan", "Living Room", "fan", 1, 75.0),
    ("living_tv", "Living Room Smart TV", "Living Room", "appliance", 1, 100.0),
    # Bedroom
    ("bedroom_light", "Bedroom Light", "Bedroom", "light", 0, 40.0),
    ("bedroom_fan", "Bedroom Fan", "Bedroom", "fan", 0, 75.0),
    ("bedroom_cooler", "Bedroom Air Cooler", "Bedroom", "cooler", 1, 180.0),
    # Kitchen
    ("kitchen_fridge", "Kitchen Refrigerator", "Kitchen", "appliance", 1, 150.0),
    ("kitchen_exhaust", "Kitchen Exhaust Fan", "Kitchen", "fan", 0, 55.0),
    # Utility Area
    ("utility_pump", "Smart Water Pump", "Utility", "pump", 0, 350.0),
]


def get_db_connection():
    """Establish and return a database connection with dict-like row access."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create all required tables and populate/migrate devices if not present."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Devices Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            room TEXT NOT NULL,
            type TEXT NOT NULL,
            state INTEGER NOT NULL DEFAULT 0,
            power_watts REAL NOT NULL DEFAULT 50.0,
            last_changed TEXT NOT NULL
        )
    """)

    # 2. Water Readings Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS water_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level_percent REAL NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # 3. Activity Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            category TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # 4. System Settings Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    conn.commit()

    # Ensure all default devices exist (Migration/Seed)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for dev_id, name, room, dev_type, default_state, watts in DEFAULT_DEVICES:
        cursor.execute("SELECT id FROM devices WHERE id = ?", (dev_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO devices (id, name, room, type, state, power_watts, last_changed)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (dev_id, name, room, dev_type, default_state, watts, now_str))

    # Seed initial water tank reading if empty
    cursor.execute("SELECT COUNT(*) as count FROM water_readings")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
            INSERT INTO water_readings (level_percent, status, timestamp)
            VALUES (72.0, 'NORMAL', ?)
        """, (now_str,))

    # Seed system settings
    cursor.execute("""
        INSERT OR REPLACE INTO system_settings (key, value)
        VALUES ('auto_drain', '1'), ('tank_capacity', '1000'), ('active_scene', 'normal')
    """)

    # Seed welcome log if empty
    cursor.execute("SELECT COUNT(*) as count FROM activity_logs")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
            INSERT INTO activity_logs (message, category, timestamp)
            VALUES ('System initialized: AI Digital Twin 1-BHK ready with Smart Gadgets & TwinAI', 'system', ?)
        """, (now_str,))

    conn.commit()
    conn.close()


# ==========================================
# DEVICE OPERATIONS
# ==========================================

def get_all_devices():
    """Retrieve all devices as a list of dictionaries."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM devices ORDER BY room, name")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_device(device_id):
    """Retrieve a single device by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_device_state(device_id, state):
    """Update state of a device (0 or 1) and record an activity log."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM devices WHERE id = ?", (device_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    device_name = row["name"]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    state_int = 1 if state else 0
    state_text = "ON" if state_int == 1 else "OFF"
    
    cursor.execute("""
        UPDATE devices 
        SET state = ?, last_changed = ? 
        WHERE id = ?
    """, (state_int, now_str, device_id))
    
    # Log the action
    cursor.execute("""
        INSERT INTO activity_logs (message, category, timestamp)
        VALUES (?, 'device', ?)
    """, (f"{device_name} turned {state_text}", now_str))
    
    conn.commit()
    conn.close()
    return get_device(device_id)


def set_multiple_device_states(state_dict, scene_name=""):
    """Batch update multiple device states (e.g. for Smart Scenes)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for dev_id, state in state_dict.items():
        state_int = 1 if state else 0
        cursor.execute("""
            UPDATE devices 
            SET state = ?, last_changed = ? 
            WHERE id = ?
        """, (state_int, now_str, dev_id))

    if scene_name:
        cursor.execute("""
            INSERT INTO activity_logs (message, category, timestamp)
            VALUES (?, 'system', ?)
        """, (f"AI Smart Scene '{scene_name.upper()}' activated", now_str))
        cursor.execute("""
            INSERT OR REPLACE INTO system_settings (key, value)
            VALUES ('active_scene', ?)
        """, (scene_name,))

    conn.commit()
    conn.close()
    return get_all_devices()


# ==========================================
# WATER TANK OPERATIONS
# ==========================================

def get_latest_water():
    """Get the current water tank status, level, and remaining volume in Liters."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM water_readings ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {"level_percent": 70.0, "status": "NORMAL", "liters": 700, "capacity": 1000, "timestamp": "Now"}
    
    level = round(float(row["level_percent"]), 1)
    status = row["status"]
    capacity = 1000  # 1000 Liter overhead tank
    liters = round((level / 100.0) * capacity)
    
    return {
        "level_percent": level,
        "status": status,
        "liters": liters,
        "capacity": capacity,
        "timestamp": row["timestamp"]
    }


def add_water_reading(level_percent, log_reason="Manual adjustment"):
    """Record a new water level reading (clamped 0 to 100%) and log threshold events."""
    level_clamped = max(0.0, min(100.0, round(float(level_percent), 1)))
    
    if level_clamped < 10.0:
        status = "CRITICAL"
    elif level_clamped < 25.0:
        status = "WARNING"
    else:
        status = "NORMAL"
        
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO water_readings (level_percent, status, timestamp)
        VALUES (?, ?, ?)
    """, (level_clamped, status, now_str))
    
    # Check if threshold crossed to generate appropriate log
    if status == "CRITICAL":
        msg = f"CRITICAL: Water tank level dropped to {level_clamped}%!"
    elif status == "WARNING":
        msg = f"WARNING: Water tank level is low at {level_clamped}%"
    else:
        msg = f"Water level updated to {level_clamped}% ({log_reason})"
        
    cursor.execute("""
        INSERT INTO activity_logs (message, category, timestamp)
        VALUES (?, 'water', ?)
    """, (msg, now_str))
    
    conn.commit()
    conn.close()
    
    return get_latest_water()


def get_water_history(limit=25):
    """Get chronological recent water readings for AI analysis and charts."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT level_percent, status, timestamp 
        FROM water_readings 
        ORDER BY id DESC 
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]


# ==========================================
# ACTIVITY & SETTINGS
# ==========================================

def get_activity_logs(limit=15):
    """Get most recent activity events."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM activity_logs 
        ORDER BY id DESC 
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_setting(key, default=""):
    """Get system configuration value."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key, value):
    """Set system configuration value."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO system_settings (key, value)
        VALUES (?, ?)
    """, (key, str(value)))
    conn.commit()
    conn.close()


def get_energy_estimate():
    """Calculate simulated current power consumption in Watts and estimated daily kWh."""
    devices = get_all_devices()
    active_watts = sum(d["power_watts"] for d in devices if d["state"] == 1)
    
    # Hourly & estimated daily kWh
    hourly_kwh = active_watts / 1000.0
    est_daily_kwh = round(hourly_kwh * 24 * 0.40, 2)
    
    breakdown = []
    for d in devices:
        breakdown.append({
            "id": d["id"],
            "name": d["name"],
            "room": d["room"],
            "type": d["type"],
            "state": d["state"],
            "watts": d["power_watts"],
            "active_watts": d["power_watts"] if d["state"] == 1 else 0.0,
            "est_kwh": round((d["power_watts"] / 1000.0) * (24 * 0.35 if d["state"] == 1 else 0), 2)
        })
        
    return {
        "current_watts": active_watts,
        "est_daily_kwh": est_daily_kwh,
        "breakdown": breakdown
    }
