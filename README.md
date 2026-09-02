# AI DIGITAL TWIN HOME — Smart 1-BHK Home Monitoring & Control System

A complete, beginner-friendly **AI Digital Twin Smart Home** web application for college projects. It connects a real-time **Flask backend** and **SQLite database** with an interactive **Three.js 3D isometric 1-BHK virtual home**, **AI water level depletion forecasting (Linear Regression)**, and **smart energy optimization**.

---

## 📁 Project Structure

```
ai-digital-twin-home/
│
├── app.py                  # Main Flask Server & REST API endpoints
├── database.py             # SQLite database manager (auto-creates tables)
├── ai_prediction.py        # AI Linear Regression & Energy optimization engine
├── requirements.txt        # Python package dependencies
├── README.md               # Complete Project & Presentation Guide
│
├── templates/
│   └── index.html          # Responsive Web Dashboard UI
│
├── static/
│   ├── css/
│   │   └── style.css       # Modern Futuristic Dark IoT CSS Design
│   └── js/
│       ├── house3d.js      # Three.js 3D 1-BHK Model Engine (Fans, Lights, Tank)
│       └── app.js          # Frontend Controller & Telemetry Polling
│
└── data/
    └── home.db             # Auto-generated SQLite Database
```

---

## 🚀 Quick Start Guide (For Absolute Beginners)

### STEP 1: Install Python
* Download Python 3.10+ from [python.org](https://www.python.org/downloads/).
* **CRITICAL**: Check the box **"Add Python to PATH"** before clicking Install.

### STEP 2: Install VS Code
* Download & install Visual Studio Code from [code.visualstudio.com](https://code.visualstudio.com/).

### STEP 3: Open Project Folder in VS Code
* Open VS Code, go to **File > Open Folder...** and select the `ai-digital-twin-home` folder.

### STEP 4: Open VS Code Terminal
* In VS Code, click top menu **Terminal > New Terminal** (or press ``Ctrl + ` ``).

### STEP 5: Create Python Virtual Environment
Type this in the terminal and press Enter:
```bash
python -m venv venv
```

### STEP 6: Activate Virtual Environment
* On **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If you get a script execution policy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first)*
* On **Windows (Command Prompt / CMD)**:
  ```cmd
  venv\Scripts\activate.bat
  ```
* On **Mac/Linux**:
  ```bash
  source venv/bin/activate
  ```

### STEP 7: Install Requirements
```bash
pip install -r requirements.txt
```

### STEP 8: Run the Application
```bash
python app.py
```

### STEP 9: Open in Browser
Open Google Chrome or any modern browser and visit:
```
http://127.0.0.1:5000
```

---

## 📱 How to Open from Mobile Phone (Same Wi-Fi)

1. Connect both your Laptop and Mobile Phone to the **same Wi-Fi network** (or phone mobile hotspot).
2. Find your Laptop's Local IP Address:
   * On Windows: Open a new terminal / Command Prompt and type:
     ```cmd
     ipconfig
     ```
   * Look for **IPv4 Address** under your Wi-Fi adapter (e.g. `192.168.1.15` or `192.168.43.50`).
3. Make sure `python app.py` is running on your laptop.
4. On your Mobile Browser (Chrome/Safari), type:
   ```
   http://YOUR_LAPTOP_IP:5000
   ```
   *(Example: `http://192.168.1.15:5000`)*
5. You can now toggle lights, spin fans, adjust water level, and watch the 3D twin react in real-time from your phone!

---

## 👥 Two-Person Team Division

| Role | Student | Responsibilities |
| :--- | :--- | :--- |
| **Person 1** | Backend & AI Engineer | Python Flask APIs, SQLite database (`database.py`), AI linear regression model (`ai_prediction.py`), water telemetry simulator, backend testing. |
| **Person 2** | Frontend & 3D Designer | HTML structure (`index.html`), UI/UX Glassmorphic CSS (`style.css`), Three.js 3D 1-BHK house model & animations (`house3d.js`), JavaScript sync controller (`app.js`). |

---

## 📅 7-Day Realistic Project Timeline

* **Day 1**: Setup Python environment, install Flask, test SQLite schema creation.
* **Day 2**: Build Flask REST APIs for devices, water level, and activity logs.
* **Day 3**: Design modern dashboard UI with device cards, stats row, and water gauge.
* **Day 4**: Build Three.js 1-BHK procedural 3D model (rooms, walls, furniture, lights, fans, tank).
* **Day 5**: Connect 3D twin to backend: glowing lights, spinning fans, dynamic water height.
* **Day 6**: Implement AI Linear Regression depletion forecasting + test mobile Wi-Fi connectivity.
* **Day 7**: End-to-end verification, take report screenshots, practice 3-minute demo script.

---

## 🛠️ Troubleshooting Guide

1. **`python is not recognized`**:
   * Reinstall Python and ensure you check **"Add Python to PATH"** on the first installation screen.
2. **`pip is not recognized`**:
   * Run `python -m pip install -r requirements.txt` instead.
3. **Port 5000 already in use**:
   * Change the port at the bottom of `app.py` from `5000` to `5050` or `8000`, then open `http://127.0.0.1:5050`.
4. **Three.js 3D house not showing / blank card**:
   * Make sure your laptop has an active internet connection on first load to fetch Three.js from the CDN, or check browser console (F12) for JavaScript errors.
5. **Mobile phone cannot connect**:
   * Verify both devices are on the exact same Wi-Fi.
   * Allow Python through Windows Defender Firewall when prompted.
6. **How to restart application**:
   * Press `Ctrl + C` in the terminal to stop the server, then run `python app.py` again.
