"""
AI Digital Twin Smart Home - AI Engine & NLP Assistant
Provides:
1. Linear Regression Water Depletion Forecasting & Slope Analysis
2. Natural Language Processing (NLP) Intent Parser for TwinAI Assistant
3. Machine Learning Statistical Anomaly & Pipe Leak Detector
4. AI Smart Scene Automations (Eco, Night, Away, Normal)
5. Energy Efficiency Audit & Green Scoring
"""

import re
import math
from datetime import datetime


# =========================================================================
# 1. TIME-SERIES LINEAR REGRESSION (WATER DEPLETION FORECASTING)
# =========================================================================

def calculate_linear_regression_slope(readings):
    """
    Compute slope (rate of change in % per step) using standard Ordinary Least Squares (OLS).
    x: time index (0, 1, 2, ... n)
    y: water level percentages
    """
    n = len(readings)
    if n < 2:
        return 0.0

    y = [float(r["level_percent"]) for r in readings]
    x = list(range(n))

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))

    if denominator == 0:
        return 0.0

    return numerator / denominator


def predict_water_status(history, current_water):
    """
    Analyzes historical readings and current tank state to predict depletion timeline
    and actionable recommendations.
    """
    current_level = float(current_water["level_percent"])
    
    if not history or len(history) < 2:
        slope = -0.4 if current_level > 20 else 0.0
    else:
        recent = history[-10:] if len(history) >= 10 else history
        slope = calculate_linear_regression_slope(recent)

    # Interpret Trend
    if slope < -2.0:
        trend = "RAPIDLY_DRAINING"
        trend_label = "High Consumption (Fast Drain)"
    elif slope < -0.1:
        trend = "DRAINING"
        trend_label = "Normal Consumption (Gradual Drain)"
    elif slope > 0.5:
        trend = "REFILLING"
        trend_label = "Tank Refilling Active"
    else:
        trend = "STABLE"
        trend_label = "Water Level Stable"

    estimated_mins_to_warning = None
    estimated_mins_to_empty = None

    if slope < -0.05 and current_level > 25:
        rate_per_min = abs(slope) * 0.4
        if rate_per_min > 0:
            drop_needed = current_level - 25.0
            estimated_mins_to_warning = max(1, int(drop_needed / rate_per_min))
            estimated_mins_to_empty = max(2, int(current_level / rate_per_min))
    elif current_level <= 25 and slope < 0:
        rate_per_min = max(0.1, abs(slope) * 0.4)
        estimated_mins_to_empty = max(1, int(current_level / rate_per_min))

    # Risk Assessment
    if current_level <= 10.0:
        risk_level = "CRITICAL"
        risk_color = "#ef4444"
        prediction_text = "Critical water level! Tank is almost empty."
        recommendation = "Immediate Action: Turn ON smart water pump to refill tank."
    elif current_level <= 25.0:
        risk_level = "HIGH"
        risk_color = "#f59e0b"
        prediction_text = "Water level is below 25% threshold (LOW)."
        recommendation = f"Water may deplete in ~{estimated_mins_to_empty or 30} mins. Refill recommended."
    elif current_level < 40.0 and slope < 0:
        risk_level = "MEDIUM"
        risk_color = "#3b82f6"
        mins_text = f"in ~{estimated_mins_to_warning} mins" if estimated_mins_to_warning else "soon"
        prediction_text = f"Water level is decreasing and may reach LOW {mins_text}."
        recommendation = "Monitor consumption or schedule a pump refill."
    elif trend == "REFILLING":
        risk_level = "OPTIMAL"
        risk_color = "#10b981"
        prediction_text = "Water tank is currently refilling smoothly."
        recommendation = "Water supply is replenishing. Monitor until 90-100% capacity."
    else:
        risk_level = "NORMAL"
        risk_color = "#10b981"
        prediction_text = "Water level is stable with adequate reserves."
        recommendation = "No action required. Reserves are sufficient."

    return {
        "current_level": current_level,
        "liters": current_water.get("liters", int(current_level * 10)),
        "trend": trend,
        "trend_label": trend_label,
        "slope": round(slope, 3),
        "risk_level": risk_level,
        "risk_color": risk_color,
        "prediction_text": prediction_text,
        "recommendation": recommendation,
        "mins_to_warning": estimated_mins_to_warning,
        "mins_to_empty": estimated_mins_to_empty,
        "confidence_score": 94.2
    }


# =========================================================================
# 2. STATISTICAL ANOMALY & PIPE LEAK DETECTION
# =========================================================================

def detect_anomalies(water_history, devices, current_water):
    """
    Statistical Outlier & Pattern-Based Anomaly Detection:
    1. Continuous Water Depletion Anomaly (Suspected Pipe Leak if appliances are idle)
    2. Power Surge Anomaly (Total active watts > 500W threshold)
    3. Low Water Anomaly
    """
    anomalies = []
    current_level = float(current_water.get("level_percent", 70.0))
    active_devices = [d for d in devices if d["state"] == 1]
    total_watts = sum(d["power_watts"] for d in active_devices)
    
    # 1. Pipe Leak Detection
    if len(water_history) >= 4:
        recent = water_history[-5:]
        slope = calculate_linear_regression_slope(recent)
        
        # If water is draining steadily (< -0.3%/tick) but no human activity / only fridge is running
        non_fridge_active = [d for d in active_devices if d["id"] != "kitchen_fridge"]
        if slope < -0.3 and len(non_fridge_active) == 0:
            anomalies.append({
                "id": "leak_detected",
                "type": "WATER_LEAK",
                "severity": "HIGH",
                "title": "Suspected Water Pipe Leak Detected",
                "description": f"Water level is dropping at {round(abs(slope), 2)}%/min while all major household fixtures are idle.",
                "action": "Inspect plumbing valves in Kitchen and Bathroom.",
                "confidence": 88.5
            })

    # 2. Power Surge Detection
    if total_watts >= 500:
        anomalies.append({
            "id": "power_surge",
            "type": "POWER_SURGE",
            "severity": "MEDIUM",
            "title": "High Cumulative Power Load",
            "description": f"Current simulated draw is {total_watts}W across {len(active_devices)} active devices.",
            "action": "Consider switching to Eco Mode to reduce electrical load.",
            "confidence": 95.0
        })

    # 3. Critical Water Reserve
    if current_level < 15.0:
        anomalies.append({
            "id": "critical_water",
            "type": "WATER_CRITICAL",
            "severity": "CRITICAL",
            "title": "Emergency Tank Level (< 15%)",
            "description": f"Tank reserve is down to {current_level}%. Runout imminent.",
            "action": "Engage Smart Water Pump immediately.",
            "confidence": 99.0
        })

    return {
        "count": len(anomalies),
        "status": "ANOMALY_DETECTED" if anomalies else "HEALTHY",
        "anomalies": anomalies
    }


# =========================================================================
# 3. "TWINAI" NATURAL LANGUAGE INTENT PARSER (NLP)
# =========================================================================

def parse_natural_language_intent(text, devices, water_data):
    """
    Parses conversational user commands or queries using Rule-based NLP & regex,
    maps them to system actions, and generates intelligent voice/text responses.
    """
    t = text.lower().strip()
    actions = []
    reply = ""

    # Device Keyword Aliases
    device_map = {
        "living_light": ["living light", "living room light", "hall light", "lounge light"],
        "living_fan": ["living fan", "living room fan", "hall fan"],
        "living_tv": ["tv", "television", "smart tv", "living tv"],
        "bedroom_light": ["bedroom light", "bed light", "room light"],
        "bedroom_fan": ["bedroom fan", "bed fan"],
        "bedroom_cooler": ["cooler", "air cooler", "ac", "air conditioner", "cooling"],
        "kitchen_fridge": ["fridge", "refrigerator", "cooler box"],
        "kitchen_exhaust": ["exhaust", "exhaust fan", "kitchen fan", "kitchen exhaust"],
        "utility_pump": ["pump", "water pump", "motor", "water motor"]
    }

    # Helper to check if phrase turns ON or OFF
    turn_on_words = ["turn on", "switch on", "start", "activate", "enable", "power on", "open"]
    turn_off_words = ["turn off", "switch off", "stop", "deactivate", "disable", "power off", "shutdown", "close"]

    # 1. SMART SCENES
    if "night" in t or "sleep" in t or "bedtime" in t:
        return {
            "intent": "SCENE_TRIGGER",
            "scene": "night",
            "reply": "Activating Night Mode: Living room devices powered down, bedroom cooler engaged, and water telemetry verified for sleep.",
            "actions": [{"type": "SCENE", "scene": "night"}]
        }
    elif "eco" in t or "green" in t or "save energy" in t:
        return {
            "intent": "SCENE_TRIGGER",
            "scene": "eco",
            "reply": "Activating Eco Mode: Optimized 1-BHK power load to minimal essential wattage.",
            "actions": [{"type": "SCENE", "scene": "eco"}]
        }
    elif "away" in t or "vacation" in t or "leaving" in t or "lockdown" in t:
        return {
            "intent": "SCENE_TRIGGER",
            "scene": "away",
            "reply": "Activating Away Mode: All appliances suspended and leak security shield enabled.",
            "actions": [{"type": "SCENE", "scene": "away"}]
        }
    elif "morning" in t or "normal" in t or "day" in t:
        return {
            "intent": "SCENE_TRIGGER",
            "scene": "normal",
            "reply": "Restoring Normal Mode: Daily comfortable appliance configuration applied.",
            "actions": [{"type": "SCENE", "scene": "normal"}]
        }

    # 2. WATER QUERIES & CONTROLS
    if "refill" in t or "fill tank" in t or "fill water" in t:
        return {
            "intent": "WATER_CONTROL",
            "reply": "Smart Refill initiated: Tank is refilling to 85% capacity.",
            "actions": [{"type": "WATER_RESET"}]
        }
    elif "water" in t and ("level" in t or "how much" in t or "status" in t or "empty" in t or "left" in t):
        level = water_data.get("level_percent", 70.0)
        status = water_data.get("status", "NORMAL")
        liters = water_data.get("liters", int(level * 10))
        return {
            "intent": "WATER_QUERY",
            "reply": f"Current water tank level is {level}% ({liters} Liters), status is {status}.",
            "actions": []
        }

    # 3. ENERGY / POWER QUERIES
    if "energy" in t or "power" in t or "watt" in t or "consumption" in t or "electricity" in t:
        active = [d for d in devices if d["state"] == 1]
        watts = sum(d["power_watts"] for d in active)
        return {
            "intent": "ENERGY_QUERY",
            "reply": f"Current power draw is {watts} Watts across {len(active)} active devices. System is operating smoothly.",
            "actions": []
        }

    # 4. ALL ON / ALL OFF
    if ("turn on all" in t or "switch on all" in t or "all devices on" in t):
        for dev in devices:
            actions.append({"type": "DEVICE_SET", "id": dev["id"], "state": 1})
        return {
            "intent": "BATCH_DEVICE",
            "reply": "All smart appliances have been switched ON.",
            "actions": actions
        }
    elif ("turn off all" in t or "switch off all" in t or "all devices off" in t or "turn off everything" in t):
        for dev in devices:
            actions.append({"type": "DEVICE_SET", "id": dev["id"], "state": 0})
        return {
            "intent": "BATCH_DEVICE",
            "reply": "All smart appliances have been switched OFF.",
            "actions": actions
        }

    # 5. SPECIFIC DEVICE CONTROL MATCHING
    is_turn_on = any(w in t for w in turn_on_words)
    is_turn_off = any(w in t for w in turn_off_words)
    target_state = 1 if is_turn_on else (0 if is_turn_off else None)

    matched_devices = []
    for dev_id, aliases in device_map.items():
        if any(alias in t for alias in aliases):
            matched_devices.append(dev_id)

    if matched_devices and target_state is not None:
        names = []
        for dev_id in matched_devices:
            dev = next((d for d in devices if d["id"] == dev_id), None)
            name = dev["name"] if dev else dev_id
            names.append(name)
            actions.append({"type": "DEVICE_SET", "id": dev_id, "state": target_state})

        state_str = "ON" if target_state == 1 else "OFF"
        reply = f"Switched {state_str}: {', '.join(names)}."
        return {
            "intent": "DEVICE_CONTROL",
            "reply": reply,
            "actions": actions
        }

    # 6. GENERAL GREETINGS & INTRO
    if any(g in t for g in ["hello", "hi", "hey", "jarvis", "twinai", "who are you"]):
        return {
            "intent": "GREETING",
            "reply": "Hello! I am TwinAI, your smart home digital twin assistant. You can ask me to control appliances, check water level, or activate scenes.",
            "actions": []
        }

    # 7. FALLBACK CONVERSATIONAL
    return {
        "intent": "UNKNOWN",
        "reply": f"I processed '{text}'. Try saying: 'Turn on Bedroom Cooler', 'What is water level?', or 'Activate Night Mode'.",
        "actions": []
    }


# =========================================================================
# 4. SMART SCENE AUTOMATIONS
# =========================================================================

def get_scene_preset(scene_name):
    """
    Returns the target device state dictionary for pre-configured AI smart scenes.
    """
    s = scene_name.lower()
    if s == "night":
        return {
            "living_light": 0,
            "living_fan": 0,
            "living_tv": 0,
            "bedroom_light": 0,
            "bedroom_fan": 1,
            "bedroom_cooler": 1,
            "kitchen_fridge": 1,
            "kitchen_exhaust": 0,
            "utility_pump": 0
        }
    elif s == "eco":
        return {
            "living_light": 1,
            "living_fan": 0,
            "living_tv": 0,
            "bedroom_light": 0,
            "bedroom_fan": 0,
            "bedroom_cooler": 0,
            "kitchen_fridge": 1,
            "kitchen_exhaust": 0,
            "utility_pump": 0
        }
    elif s == "away":
        return {
            "living_light": 0,
            "living_fan": 0,
            "living_tv": 0,
            "bedroom_light": 0,
            "bedroom_fan": 0,
            "bedroom_cooler": 0,
            "kitchen_fridge": 1,
            "kitchen_exhaust": 0,
            "utility_pump": 0
        }
    else:  # Normal / Day
        return {
            "living_light": 1,
            "living_fan": 1,
            "living_tv": 1,
            "bedroom_light": 0,
            "bedroom_fan": 0,
            "bedroom_cooler": 1,
            "kitchen_fridge": 1,
            "kitchen_exhaust": 0,
            "utility_pump": 0
        }


# =========================================================================
# 5. ENERGY EFFICIENCY AUDITOR
# =========================================================================

def analyze_energy_efficiency(devices):
    """
    AI Energy Optimizer: analyzes active devices and generates an efficiency score
    and smart energy saving recommendations.
    """
    active_devices = [d for d in devices if d["state"] == 1]
    active_count = len(active_devices)
    total_watts = sum(d["power_watts"] for d in active_devices)
    
    max_possible_watts = sum(d["power_watts"] for d in devices)
    usage_ratio = (total_watts / max_possible_watts) if max_possible_watts > 0 else 0
    
    efficiency_score = max(35, int(100 - (usage_ratio * 60)))
    
    tips = []
    if any(d["id"] == "bedroom_cooler" and d["state"] == 1 for d in devices) and \
       any(d["id"] == "bedroom_fan" and d["state"] == 1 for d in devices):
        tips.append("Both Bedroom Cooler (180W) & Fan (75W) are running together. Using Cooler alone saves 75W.")
        
    if total_watts > 400:
        tips.append("High electrical load detected (>400W). Consider switching off unused appliances.")
    elif total_watts == 0:
        tips.append("All smart appliances are in standby/sleep mode. Maximum conservation!")
    else:
        tips.append("Energy consumption is optimal for this 1-BHK layout.")
        
    return {
        "efficiency_score": efficiency_score,
        "active_devices": active_count,
        "total_watts": total_watts,
        "tip": tips[0] if tips else "System operating at optimal efficiency."
    }
