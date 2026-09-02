"""
AI Digital Twin Smart Home - Main Flask Application Server
Handles REST APIs for device controls, water tank management, AI predictions,
NLP voice/chat assistant, smart scenes, anomalies, and serves the 3D Dashboard.
"""

import os
import threading
import time
from datetime import datetime
from flask import Flask, render_template, jsonify, request

import database as db
import ai_prediction as ai

app = Flask(__name__)

# Initialize SQLite database and seed/migrate devices
db.init_db()


def background_water_simulation():
    """
    Background worker thread:
    1. If Smart Water Pump is ON, smoothly refilling water (+2.5%/tick) until 95% (auto shut-off).
    2. If Auto-drain simulation enabled and pump is OFF, slowly drain (-0.3%/tick).
    """
    while True:
        try:
            time.sleep(10)
            pump_device = db.get_device("utility_pump")
            is_pump_on = pump_device and pump_device["state"] == 1
            current = db.get_latest_water()
            current_level = current["level_percent"]

            if is_pump_on:
                # Pump is actively refilling the tank
                if current_level < 95.0:
                    new_level = min(100.0, round(current_level + 3.0, 1))
                    db.add_water_reading(new_level, "Smart Water Pump refilling")
                else:
                    # Auto shut-off at 95% capacity
                    db.update_device_state("utility_pump", 0)
                    db.add_water_reading(current_level, "Smart Pump auto-stopped at 95% capacity")
            else:
                # Normal slow drain simulation
                auto_enabled = db.get_setting("auto_drain", "1") == "1"
                if auto_enabled and current_level > 2.0:
                    new_level = round(current_level - 0.3, 1)
                    db.add_water_reading(new_level, "Simulated household usage")
        except Exception as e:
            print(f"[Simulation Error] {e}")


# Start daemon background thread
sim_thread = threading.Thread(target=background_water_simulation, daemon=True)
sim_thread.start()


# ==========================================
# PAGE ROUTE
# ==========================================

@app.route("/")
def index():
    """Serve the 3D Digital Twin Home Dashboard."""
    return render_template("index.html")


# ==========================================
# UNIFIED STATUS API
# ==========================================

@app.route("/api/status", methods=["GET"])
def get_full_status():
    """Consolidated status payload for high-performance UI synchronization."""
    devices = db.get_all_devices()
    water = db.get_latest_water()
    water_history = db.get_water_history(limit=15)
    ai_water = ai.predict_water_status(water_history, water)
    ai_energy = ai.analyze_energy_efficiency(devices)
    ai_anomalies = ai.detect_anomalies(water_history, devices, water)
    energy_stats = db.get_energy_estimate()
    logs = db.get_activity_logs(limit=12)
    auto_drain = db.get_setting("auto_drain", "1") == "1"
    active_scene = db.get_setting("active_scene", "normal")

    devices_on = sum(1 for d in devices if d["state"] == 1)
    devices_off = len(devices) - devices_on

    return jsonify({
        "success": True,
        "system": {
            "online": True,
            "status": "OPERATIONAL",
            "server_time": datetime.now().strftime("%I:%M:%S %p"),
            "devices_on": devices_on,
            "devices_off": devices_off,
            "auto_drain": auto_drain,
            "active_scene": active_scene
        },
        "devices": devices,
        "water": water,
        "water_history": water_history,
        "ai_prediction": {
            "water": ai_water,
            "energy": ai_energy,
            "anomalies": ai_anomalies
        },
        "energy": energy_stats,
        "activity_logs": logs
    })


# ==========================================
# DEVICE APIS
# ==========================================

@app.route("/api/devices", methods=["GET"])
def list_devices():
    """Get list of all smart home devices."""
    devices = db.get_all_devices()
    return jsonify({"success": True, "devices": devices})


@app.route("/api/devices/<device_id>/toggle", methods=["POST"])
def toggle_device(device_id):
    """Toggle device state between ON (1) and OFF (0)."""
    device = db.get_device(device_id)
    if not device:
        return jsonify({"success": False, "error": "Device not found"}), 404
    
    new_state = 0 if device["state"] == 1 else 1
    updated = db.update_device_state(device_id, new_state)
    return jsonify({"success": True, "device": updated})


@app.route("/api/devices/<device_id>/set", methods=["POST"])
def set_device_state(device_id):
    """Explicitly set device state to 1 (ON) or 0 (OFF)."""
    data = request.get_json(silent=True) or {}
    if "state" not in data:
        return jsonify({"success": False, "error": "Missing 'state' parameter"}), 400
    
    state = int(data["state"])
    updated = db.update_device_state(device_id, state)
    if not updated:
        return jsonify({"success": False, "error": "Device not found"}), 404
    
    return jsonify({"success": True, "device": updated})


# ==========================================
# AI VOICE & CHAT ASSISTANT (TWINAI) API
# ==========================================

@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    """Process natural language voice/text commands and trigger digital twin actions."""
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()
    
    if not user_message:
        return jsonify({"success": False, "error": "Empty message"}), 400

    devices = db.get_all_devices()
    water = db.get_latest_water()

    parsed = ai.parse_natural_language_intent(user_message, devices, water)
    
    # Execute any actions requested by the AI
    for action in parsed.get("actions", []):
        act_type = action.get("type")
        if act_type == "DEVICE_SET":
            db.update_device_state(action["id"], action["state"])
        elif act_type == "SCENE":
            preset = ai.get_scene_preset(action["scene"])
            db.set_multiple_device_states(preset, action["scene"])
        elif act_type == "WATER_RESET":
            db.add_water_reading(85.0, "Refill requested via TwinAI")

    return jsonify({
        "success": True,
        "reply": parsed["reply"],
        "intent": parsed["intent"],
        "actions_taken": parsed.get("actions", [])
    })


# ==========================================
# SMART SCENES API
# ==========================================

@app.route("/api/scenes/<scene_name>", methods=["POST"])
def set_scene(scene_name):
    """Activate pre-configured AI smart scene (eco, night, away, normal)."""
    preset = ai.get_scene_preset(scene_name)
    updated_devices = db.set_multiple_device_states(preset, scene_name)
    return jsonify({
        "success": True,
        "scene": scene_name,
        "devices": updated_devices
    })


# ==========================================
# ANOMALY DETECTION API
# ==========================================

@app.route("/api/ai/anomalies", methods=["GET"])
def get_anomalies():
    """Get real-time anomaly & leak status."""
    water_history = db.get_water_history(limit=15)
    devices = db.get_all_devices()
    water = db.get_latest_water()
    report = ai.detect_anomalies(water_history, devices, water)
    return jsonify({"success": True, "report": report})


# ==========================================
# WATER TANK APIS
# ==========================================

@app.route("/api/water", methods=["GET"])
def get_water():
    """Get current water tank telemetry."""
    water = db.get_latest_water()
    return jsonify({"success": True, "water": water})


@app.route("/api/water/adjust", methods=["POST"])
def adjust_water():
    """Adjust water level by delta (e.g. +10% or -10%)."""
    data = request.get_json(silent=True) or {}
    delta = float(data.get("delta", 0.0))
    current = db.get_latest_water()
    new_level = current["level_percent"] + delta
    
    reason = f"Manual adjustment ({'+' if delta >= 0 else ''}{delta}%)"
    updated = db.add_water_reading(new_level, reason)
    return jsonify({"success": True, "water": updated})


@app.route("/api/water/set", methods=["POST"])
def set_water():
    """Explicitly set water level to a target percentage."""
    data = request.get_json(silent=True) or {}
    if "level" not in data:
        return jsonify({"success": False, "error": "Missing 'level' parameter"}), 400
    
    target_level = float(data["level"])
    updated = db.add_water_reading(target_level, "Manual slider override")
    return jsonify({"success": True, "water": updated})


@app.route("/api/water/reset", methods=["POST"])
def reset_water():
    """Refill tank to 85% capacity."""
    updated = db.add_water_reading(85.0, "Tank refilled via Smart Refill button")
    return jsonify({"success": True, "water": updated})


@app.route("/api/water/toggle_auto_drain", methods=["POST"])
def toggle_auto_drain():
    """Toggle background water consumption simulation ON/OFF."""
    current = db.get_setting("auto_drain", "1") == "1"
    new_val = "0" if current else "1"
    db.set_setting("auto_drain", new_val)
    status_text = "Enabled" if new_val == "1" else "Paused"
    db.add_water_reading(db.get_latest_water()["level_percent"], f"Auto-drain simulation {status_text.lower()}")
    return jsonify({"success": True, "auto_drain": new_val == "1"})


# ==========================================
# HISTORY & ENERGY APIS
# ==========================================

@app.route("/api/history", methods=["GET"])
def get_history():
    """Get system activity logs."""
    logs = db.get_activity_logs(limit=20)
    return jsonify({"success": True, "history": logs})


@app.route("/api/energy", methods=["GET"])
def get_energy():
    """Get simulated power consumption statistics."""
    stats = db.get_energy_estimate()
    return jsonify({"success": True, "energy": stats})


# ==========================================
# APPLICATION ENTRYPOINT
# ==========================================

if __name__ == "__main__":
    print("=" * 65)
    print("  AI DIGITAL TWIN SMART HOME - 1-BHK MONITORING & CONTROL")
    print("=" * 65)
    print("  * Local Web Dashboard:   http://127.0.0.1:5000")
    print("  * Mobile / LAN Access:   http://0.0.0.0:5000")
    print("  * AI Engine:             TwinAI Voice + Regression + Anomaly")
    print("  * Smart Gadgets:         Cooler, Pump, Exhaust, Fridge, TV, Lights")
    print("=" * 65)
    app.run(host="0.0.0.0", port=5000, debug=True)
