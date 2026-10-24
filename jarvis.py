import os
import sys
import re
import json
import time
import queue
import threading
import datetime
import subprocess
import webbrowser
import urllib.parse
import difflib
from flask import Flask, render_template, request, jsonify, Response
import speech_recognition as sr
import wikipedia
import pyautogui

# Set pyautogui safety pause
pyautogui.PAUSE = 0.05

# Ensure Homebrew and standard system paths are accessible
os.environ["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{os.environ.get('PATH', '')}"

# ---------------------------------------------------------
# Application & Web Shortcuts Mapping
# ---------------------------------------------------------
APP_MAP = {
    # Browsers
    "chrome": "Google Chrome",
    "google chrome": "Google Chrome",
    "crome": "Google Chrome",
    "safari": "Safari",
    "browser": "Google Chrome",
    # Development
    "code": "Visual Studio Code",
    "vs code": "Visual Studio Code",
    "vscode": "Visual Studio Code",
    "visual studio code": "Visual Studio Code",
    "android studio": "Android Studio",
    "xcode": "Xcode",
    "github": "GitHub Desktop",
    "github desktop": "GitHub Desktop",
    "terminal": "Terminal",
    "term": "Terminal",
    "claude": "Claude",
    "antigravity": "Antigravity",
    # Communication
    "whatsapp": "WhatsApp",
    "whats app": "WhatsApp",
    "telegram": "Telegram",
    "messages": "Messages",
    "imessage": "Messages",
    "message": "Messages",
    "mail": "Mail",
    "email": "Mail",
    "facetime": "FaceTime",
    # Tools & Productivity
    "calculator": "Calculator",
    "calc": "Calculator",
    "notes": "Notes",
    "note": "Notes",
    "calendar": "Calendar",
    "reminders": "Reminders",
    "reminder": "Reminders",
    "settings": "System Settings",
    "system settings": "System Settings",
    "preferences": "System Settings",
    "finder": "Finder",
    "preview": "Preview",
    "app store": "App Store",
    "textedit": "TextEdit",
    "music": "Music",
    "spotify": "Music",
    "photos": "Photos",
    "photo": "Photos",
    "maps": "Maps",
    "map": "Maps",
    "weather": "Weather",
    "imovie": "iMovie",
    "pages": "Pages",
}

WEB_SHORTCUTS = {
    "youtube": "https://www.youtube.com",
    "google": "https://www.google.com",
    "gmail": "https://mail.google.com",
    "chatgpt": "https://chatgpt.com",
    "github": "https://github.com",
    "reddit": "https://www.reddit.com",
    "netflix": "https://www.netflix.com",
    "maps": "https://maps.google.com",
    "twitter": "https://x.com",
    "instagram": "https://www.instagram.com",
    "linkedin": "https://www.linkedin.com",
    "amazon": "https://www.amazon.com",
}

# ---------------------------------------------------------
# TTS Engine (macOS native 'say')
# ---------------------------------------------------------
def speak_async(text):
    """Speaks text asynchronously without blocking."""
    def _run():
        try:
            clean = re.sub(r'[\*\#\_`\[\]]', '', text)
            subprocess.run(["say", "-r", "195", clean], check=True)
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()

# ---------------------------------------------------------
# Global Event Broadcast & State
# ---------------------------------------------------------
event_subscribers = []
mic_enabled = True

def broadcast_event(data):
    """Pushes a JSON event to all connected SSE clients."""
    msg = f"data: {json.dumps(data)}\n\n"
    for q in list(event_subscribers):
        try:
            q.put_nowait(msg)
        except Exception:
            if q in event_subscribers:
                event_subscribers.remove(q)

# ---------------------------------------------------------
# Live Real macOS Telemetry Daemon (CPU, RAM, Battery)
# ---------------------------------------------------------
def telemetry_daemon():
    while True:
        try:
            # 1. CPU & RAM via top
            out = subprocess.check_output(["top", "-l", "1", "-n", "0"]).decode()
            cpu_val = 25
            ram_val = 50

            for line in out.splitlines():
                if line.startswith("CPU usage:"):
                    # e.g. "CPU usage: 14.61% user, 15.98% sys, 69.40% idle"
                    m = re.search(r'([0-9\.]+)%\s*idle', line)
                    if m:
                        idle = float(m.group(1))
                        cpu_val = round(100.0 - idle, 1)
                elif line.startswith("PhysMem:"):
                    # e.g. "PhysMem: 14G used (1723M wired, 1169M compressor), 1027M unused."
                    m_used = re.search(r'([0-9\.]+)([MG])\s*used', line)
                    m_free = re.search(r'([0-9\.]+)([MG])\s*unused', line)
                    if m_used and m_free:
                        u_val = float(m_used.group(1)) * (1024 if m_used.group(2) == 'G' else 1)
                        f_val = float(m_free.group(1)) * (1024 if m_free.group(2) == 'G' else 1)
                        total = u_val + f_val
                        if total > 0:
                            ram_val = round((u_val / total) * 100.0, 1)

            # 2. Battery
            batt_val = "--%"
            try:
                b_out = subprocess.check_output(["pmset", "-g", "batt"]).decode()
                for line in b_out.splitlines():
                    if "%" in line:
                        batt_val = line.split("\t")[1].split(";")[0]
                        break
            except Exception:
                pass

            broadcast_event({
                "type": "telemetry",
                "cpu": cpu_val,
                "ram": ram_val,
                "battery": batt_val
            })
        except Exception:
            pass
        time.sleep(3.0)

# ---------------------------------------------------------
# Flask App Setup
# ---------------------------------------------------------
app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/events")
def sse_events():
    def event_stream():
        q = queue.Queue(maxsize=50)
        event_subscribers.append(q)
        try:
            while True:
                msg = q.get()
                yield msg
        except GeneratorExit:
            if q in event_subscribers:
                event_subscribers.remove(q)

    return Response(event_stream(), mimetype="text/event-stream")

@app.route("/api/command", methods=["POST"])
def handle_command():
    data = request.json or {}
    cmd = data.get("command", "").strip()
    if not cmd:
        return jsonify({"status": "empty", "response": ""})

    response_text = execute_universal_task(cmd)
    return jsonify({"status": "ok", "response": response_text})

@app.route("/api/send_message", methods=["POST"])
def handle_send_message():
    data = request.json or {}
    platform = data.get("platform", "whatsapp")
    recipient = data.get("recipient", "").strip()
    message = data.get("message", "").strip()

    res = transmit_text_message(platform, recipient, message)
    return jsonify({"status": "ok", "response": res})

@app.route("/api/toggle_mic", methods=["POST"])
def toggle_mic():
    global mic_enabled
    data = request.json or {}
    mic_enabled = data.get("enabled", True)
    return jsonify({"mic_enabled": mic_enabled})

# ---------------------------------------------------------
# Transmit Text / Message Engine (WhatsApp, iMessage, Mail)
# ---------------------------------------------------------
def transmit_text_message(platform, recipient, message):
    clean_num = re.sub(r'[^\d\+]', '', recipient)
    encoded_msg = urllib.parse.quote(message)

    if platform == "whatsapp" or "whatsapp" in platform:
        url = f"https://web.whatsapp.com/send?phone={clean_num}&text={encoded_msg}"
        webbrowser.open(url)
        msg = f"Opening WhatsApp chat with {recipient} to transmit: '{message}'"
        speak_async(f"Opening WhatsApp chat for {recipient}")
        return msg

    elif platform == "imessage" or "message" in platform or "sms" in platform:
        try:
            scpt = f'''
            tell application "Messages"
                set targetBuddy to participant "{clean_num or recipient}" of 1st account
                send "{message}" to targetBuddy
            end tell
            '''
            proc = subprocess.run(["osascript", "-e", scpt], capture_output=True, text=True, timeout=3)
            if proc.returncode == 0:
                msg = f"iMessage transmitted to {recipient}: '{message}'"
                speak_async(f"iMessage sent to {recipient}")
                return msg
        except Exception:
            pass

        sms_url = f"sms:{clean_num or recipient}&body={encoded_msg}"
        subprocess.run(["open", sms_url])
        msg = f"Opened Messages to text {recipient}: '{message}'"
        speak_async(f"Opened Messages for {recipient}")
        return msg

    elif platform == "mail" or "email" in platform:
        mail_url = f"mailto:{recipient}?subject=Message%20from%20Jarvis&body={encoded_msg}"
        subprocess.run(["open", mail_url])
        msg = f"Drafted email to {recipient} with message: '{message}'"
        speak_async(f"Drafted email to {recipient}")
        return msg

    return f"Unknown messaging platform: {platform}"

# ---------------------------------------------------------
# Universal Task Execution Engine (Fully Functional)
# ---------------------------------------------------------
def execute_universal_task(raw_command):
    cmd_clean = raw_command.lower().strip()
    clean = cmd_clean.replace("please", "").replace("can you", "").replace("jarvis", "").strip()
    broadcast_event({"type": "status", "state": "recognizing", "message": "EXECUTING COMMAND..."})

    # 1. Charts Controls
    if "show chart" in clean or "open chart" in clean or "view chart" in clean or clean == "charts":
        broadcast_event({"type": "ui_action", "action": "open_charts"})
        msg = "Opening holographic charts telemetry dashboard."
        speak_async(msg)
        return msg

    if "close chart" in clean or "hide chart" in clean:
        broadcast_event({"type": "ui_action", "action": "close_modals"})
        msg = "Closing charts telemetry."
        speak_async(msg)
        return msg

    # 2. Texting / Messaging Controls
    if "open text" in clean or "open messaging" in clean or clean in ["texting", "text others"]:
        broadcast_event({"type": "ui_action", "action": "open_comms"})
        msg = "Opening communications bridge for texting."
        speak_async(msg)
        return msg

    # WhatsApp Voice Command
    text_match_wa = re.search(r'(?:whatsapp|message on whatsapp|text on whatsapp)\s+(?:to\s+)?([a-zA-Z0-9_\+\s]+?)(?:\s+(?:saying|message|text)?\s+(.+))?$', clean)
    if text_match_wa and ("whatsapp" in clean):
        recip = text_match_wa.group(1).strip()
        body = text_match_wa.group(2) or "Hello from Jarvis!"
        return transmit_text_message("whatsapp", recip, body)

    # SMS / iMessage Voice Command
    text_match_sms = re.search(r'(?:text|send text to|send message to|imessage)\s+([a-zA-Z0-9_\+\s]+?)(?:\s+(?:saying|message|text)?\s+(.+))?$', clean)
    if text_match_sms and not any(k in clean for k in ["file", "document", "speech"]):
        recip = text_match_sms.group(1).strip()
        body = text_match_sms.group(2) or "Hello from Jarvis!"
        return transmit_text_message("imessage", recip, body)

    # 3. Media Player Controls (Apple Music / System)
    if clean in ["play music", "resume music", "play song"]:
        subprocess.run(["osascript", "-e", 'tell application "Music" to play'])
        msg = "Playing music."
        speak_async(msg)
        return msg
    if clean in ["pause music", "stop music", "pause"]:
        subprocess.run(["osascript", "-e", 'tell application "Music" to pause'])
        msg = "Paused music."
        speak_async(msg)
        return msg
    if clean in ["next song", "next track", "skip song"]:
        subprocess.run(["osascript", "-e", 'tell application "Music" to next track'])
        msg = "Skipped to next track."
        speak_async(msg)
        return msg
    if clean in ["previous song", "previous track"]:
        subprocess.run(["osascript", "-e", 'tell application "Music" to previous track'])
        msg = "Playing previous track."
        speak_async(msg)
        return msg

    # 4. Window Controls
    if clean in ["minimize window", "minimize"]:
        pyautogui.hotkey("command", "m")
        return "Minimized window."
    if clean in ["hide all", "show desktop"]:
        subprocess.run(["osascript", "-e", 'tell application "Finder" to set visible of every process whose visible is true and name is not "Finder" to false'])
        return "Showing desktop."
    if clean in ["fullscreen", "toggle fullscreen"]:
        pyautogui.hotkey("command", "control", "f")
        return "Toggled fullscreen."

    # 5. Shell / Terminal Command
    for prefix in ["run command ", "terminal command ", "terminal ", "shell command ", "shell ", "run "]:
        if clean.startswith(prefix):
            sh_cmd = clean[len(prefix):].strip()
            if sh_cmd:
                return _run_shell_command(sh_cmd)

    # 6. Close / Quit Apps
    for prefix in ["close app ", "quit app ", "kill app ", "close ", "quit ", "kill "]:
        if clean.startswith(prefix):
            target = clean[len(prefix):].strip()
            resolved = _resolve_app(target) or target.capitalize()
            return _quit_app(resolved)

    # 7. Open Apps
    app_target = None
    if clean.startswith("open ") or clean.startswith("launch "):
        target_name = clean.split(" ", 1)[1].strip()
        app_target = _resolve_app(target_name)
    else:
        app_target = _resolve_app(clean)

    if app_target:
        return _open_app(app_target)

    # 8. Web Shortcuts
    web_target = _resolve_web(clean)
    if web_target:
        return _open_url(web_target[0], web_target[1])

    if re.search(r'https?://[^\s]+', clean) or re.search(r'\b[a-zA-Z0-9-]+\.(com|org|net|io|dev|edu|gov|co)\b', clean):
        url = clean.replace("open ", "").strip()
        if not url.startswith("http"):
            url = "https://" + url
        return _open_url(url, url)

    # 9. Keyboard Typing & Shortcuts
    if clean.startswith("type ") or clean.startswith("write "):
        text_to_type = clean.split(" ", 1)[1]
        time.sleep(0.3)
        pyautogui.write(text_to_type, interval=0.02)
        speak_async("Typing completed")
        return f"Typed: '{text_to_type}'"

    if "press enter" in clean or clean == "enter":
        pyautogui.press("enter")
        return "Pressed [Enter]"
    if "press space" in clean or clean == "space":
        pyautogui.press("space")
        return "Pressed [Space]"
    if clean in ["copy", "copy this"]:
        pyautogui.hotkey("command", "c")
        speak_async("Copied")
        return "Copied to clipboard"
    if clean in ["paste", "paste this"]:
        pyautogui.hotkey("command", "v")
        speak_async("Pasted")
        return "Pasted from clipboard"
    if clean in ["select all"]:
        pyautogui.hotkey("command", "a")
        return "Selected all"
    if clean in ["save"]:
        pyautogui.hotkey("command", "s")
        speak_async("Saved")
        return "Saved"
    if clean in ["new tab"]:
        pyautogui.hotkey("command", "t")
        return "Opened new tab"
    if clean in ["close tab"]:
        pyautogui.hotkey("command", "w")
        return "Closed tab"

    # 10. File & Folder Operations
    if "create folder" in clean or "make directory" in clean:
        return _create_folder(clean)
    if "create file" in clean or "make file" in clean:
        return _create_file(clean)
    if "empty trash" in clean:
        subprocess.run(["osascript", "-e", 'tell app "Finder" to empty trash'])
        speak_async("Trash emptied.")
        return "Trash emptied."
    if "open desktop" in clean:
        subprocess.Popen(["open", os.path.expanduser("~/Desktop")])
        speak_async("Opened Desktop.")
        return "Opened Desktop."
    if "open downloads" in clean or "open download" in clean:
        subprocess.Popen(["open", os.path.expanduser("~/Downloads")])
        speak_async("Opened Downloads.")
        return "Opened Downloads."
    if "open documents" in clean:
        subprocess.Popen(["open", os.path.expanduser("~/Documents")])
        speak_async("Opened Documents.")
        return "Opened Documents."

    # 11. System Controls
    if "turn off wifi" in clean or "disable wifi" in clean:
        subprocess.run(["networksetup", "-setairportpower", "en0", "off"])
        speak_async("Wi-Fi turned off.")
        return "Wi-Fi turned off."
    if "turn on wifi" in clean or "enable wifi" in clean:
        subprocess.run(["networksetup", "-setairportpower", "en0", "on"])
        speak_async("Wi-Fi turned on.")
        return "Wi-Fi turned on."
    if "dark mode" in clean:
        subprocess.run(["osascript", "-e", 'tell app "System Events" to tell appearance preferences to set dark mode to not dark mode'])
        speak_async("Toggled dark mode.")
        return "Toggled dark mode."
    if "brightness up" in clean:
        subprocess.run(["osascript", "-e", 'tell application "System Events" to key code 144'])
        return "Brightness increased."
    if "brightness down" in clean:
        subprocess.run(["osascript", "-e", 'tell application "System Events" to key code 145'])
        return "Brightness decreased."
    if "volume up" in clean or "increase volume" in clean:
        return _change_volume(+15)
    if "volume down" in clean or "decrease volume" in clean:
        return _change_volume(-15)
    if "mute" in clean:
        subprocess.run(["osascript", "-e", "set volume output muted true"])
        speak_async("Muted audio.")
        return "Muted audio."
    if "unmute" in clean:
        subprocess.run(["osascript", "-e", "set volume output muted false"])
        speak_async("Unmuted audio.")
        return "Unmuted audio."
    if "battery" in clean or "power" in clean:
        return _check_battery()
    if "screenshot" in clean:
        return _take_screenshot()
    if "lock screen" in clean or clean == "lock":
        subprocess.run(["pmset", "displaysleepnow"])
        speak_async("Locking screen.")
        return "Screen locked."
    if "time" in clean:
        t = datetime.datetime.now().strftime("%I:%M %p")
        speak_async(f"The time is {t}")
        return f"The time is {t}"
    if "date" in clean or "today" in clean:
        d = datetime.datetime.now().strftime("%A, %B %d, %Y")
        speak_async(f"Today is {d}")
        return f"Today is {d}"
    if "joke" in clean:
        jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "Why do programmers prefer dark mode? Because light attracts bugs!",
            "There are 10 types of people: those who understand binary, and those who don't."
        ]
        import random
        j = random.choice(jokes)
        speak_async(j)
        return j

    # 12. Instant Math Solver
    if re.search(r'\b(calculate|what is|compute)\s+([0-9\.\s\+\-\*\/\^\(\)]+)', clean):
        math_match = re.search(r'([0-9\.\s\+\-\*\/\^\(\)]+)', clean)
        if math_match:
            expr = math_match.group(1).replace("^", "**").strip()
            try:
                res = eval(expr, {"__builtins__": None}, {})
                msg = f"The result is {res}"
                speak_async(msg)
                return msg
            except Exception:
                pass

    # 13. Media & Search Actions
    if clean.startswith("play "):
        song = clean[5:].strip()
        url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(song)}"
        webbrowser.open(url)
        speak_async(f"Playing {song} on YouTube")
        return f"Playing '{song}' on YouTube."

    if clean.startswith("search ") or clean.startswith("google "):
        query = clean.replace("search ", "", 1).replace("google ", "", 1).strip()
        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
        webbrowser.open(url)
        speak_async(f"Searching Google for {query}")
        return f"Searching Google for '{query}'."

    if clean.startswith("who is ") or clean.startswith("what is ") or clean.startswith("tell me about "):
        query = clean.replace("who is ", "").replace("what is ", "").replace("tell me about ", "").strip()
        try:
            summary = wikipedia.summary(query, sentences=2)
            speak_async(summary)
            return summary
        except Exception:
            webbrowser.open(f"https://www.google.com/search?q={urllib.parse.quote(query)}")
            speak_async(f"Searching Google for {query}")
            return f"Searching Google for '{query}'."

    # 14. Conversational Intelligence & Fallback
    conversational_map = {
        "hello": "Hello! Jarvis neural interface online. How can I assist you?",
        "hi": "Greetings! All systems functioning at peak efficiency.",
        "who are you": "I am Jarvis, your autonomous quantum AI companion.",
        "what can you do": "I can launch apps, control your Mac, execute shell scripts, text contacts, render live telemetry charts, and answer any query.",
        "how are you": "All processors running cool at nominal temperature. Ready for orders."
    }
    for k, resp in conversational_map.items():
        if k in clean:
            speak_async(resp)
            return resp

    # Fallback to direct web search
    url = f"https://www.google.com/search?q={urllib.parse.quote(clean)}"
    webbrowser.open(url)
    msg = f"Executed search for '{clean}'."
    speak_async(msg)
    return msg

# ---------------------------------------------------------
# Action Handlers
# ---------------------------------------------------------
def _run_shell_command(cmd_str):
    try:
        proc = subprocess.run(cmd_str, shell=True, executable="/bin/zsh", capture_output=True, text=True, timeout=15)
        out = proc.stdout.strip() or proc.stderr.strip() or "Done (no output)."
        speak_async("Command finished.")
        return f"Command Output:\n{out[:800]}"
    except Exception as e:
        speak_async("Command error.")
        return f"Command execution error: {e}"

def _resolve_app(query):
    if not query:
        return None
    if query in APP_MAP:
        return APP_MAP[query]
    for k, v in APP_MAP.items():
        if k == query or query.startswith(k) or query.endswith(k):
            return v
    matches = difflib.get_close_matches(query, list(APP_MAP.keys()), n=1, cutoff=0.7)
    if matches:
        return APP_MAP[matches[0]]
    return None

def _resolve_web(query):
    target = query.replace("open ", "").strip()
    if target in WEB_SHORTCUTS:
        return (target.capitalize(), WEB_SHORTCUTS[target])
    matches = difflib.get_close_matches(target, list(WEB_SHORTCUTS.keys()), n=1, cutoff=0.7)
    if matches:
        m = matches[0]
        return (m.capitalize(), WEB_SHORTCUTS[m])
    return None

def _open_app(app_name):
    subprocess.Popen(["open", "-a", app_name])
    msg = f"Opening {app_name}."
    speak_async(msg)
    return msg

def _quit_app(app_name):
    try:
        subprocess.run(["osascript", "-e", f'tell application "{app_name}" to quit'], timeout=3)
    except Exception:
        subprocess.run(["killall", app_name])
    msg = f"Closed {app_name}."
    speak_async(msg)
    return msg

def _open_url(name, url):
    webbrowser.open(url)
    msg = f"Opening {name}."
    speak_async(msg)
    return msg

def _change_volume(delta):
    try:
        cmd = "output volume of (get volume settings)"
        cur = int(subprocess.check_output(["osascript", "-e", cmd]).decode().strip())
        new_vol = max(0, min(100, cur + delta))
        subprocess.run(["osascript", "-e", f"set volume output volume {new_vol}"])
        msg = f"Volume set to {new_vol}%."
        speak_async(msg)
        return msg
    except Exception as e:
        return f"Volume error: {e}"

def _check_battery():
    try:
        out = subprocess.check_output(["pmset", "-g", "batt"]).decode()
        for line in out.splitlines():
            if "%" in line:
                part = line.split("\t")[1].split(";")[0]
                msg = f"Battery is at {part}."
                speak_async(msg)
                return msg
        return "Could not read battery."
    except Exception as e:
        return f"Battery error: {e}"

def _take_screenshot():
    desktop = os.path.expanduser("~/Desktop")
    ts = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = os.path.join(desktop, f"Jarvis_Screenshot_{ts}.png")
    subprocess.run(["screencapture", "-x", path])
    msg = "Screenshot saved to your Desktop."
    speak_async(msg)
    return msg

def _create_folder(query):
    m = re.search(r'(?:create folder|make directory)\s+([a-zA-Z0-9_\-\s]+?)(?:\s+on\s+(desktop|downloads|documents))?$', query)
    if m:
        name = m.group(1).strip()
        loc_key = m.group(2) or "desktop"
        path = os.path.join(os.path.expanduser(f"~/{loc_key.capitalize()}"), name)
        os.makedirs(path, exist_ok=True)
        subprocess.Popen(["open", path])
        msg = f"Folder '{name}' created on {loc_key.capitalize()}."
        speak_async(msg)
        return msg
    return "Could not parse folder name."

def _create_file(query):
    m = re.search(r'(?:create file|make file)\s+([a-zA-Z0-9_\-\.]+)(?:\s+with\s+text\s+(.+))?', query)
    if m:
        name = m.group(1).strip()
        content = m.group(2) or ""
        path = os.path.join(os.path.expanduser("~/Desktop"), name)
        with open(path, "w") as f:
            f.write(content)
        subprocess.Popen(["open", path])
        msg = f"File '{name}' created on Desktop."
        speak_async(msg)
        return msg
    return "Could not parse file creation."

# ---------------------------------------------------------
# Continuous Background Microphone Listener (Python Native)
# ---------------------------------------------------------
def background_voice_listener():
    recognizer = sr.Recognizer()
    recognizer.pause_threshold = 0.5
    recognizer.energy_threshold = 280
    recognizer.dynamic_energy_threshold = False

    mic = None
    for attempt in range(5):
        try:
            mic = sr.Microphone()
            with mic as source:
                print("Python microphone stream connected.")
            break
        except Exception:
            time.sleep(1)

    if mic is None:
        return

    while True:
        if not mic_enabled:
            time.sleep(0.5)
            continue

        try:
            with mic as source:
                audio = recognizer.listen(source, timeout=4, phrase_time_limit=8)

            broadcast_event({"type": "status", "state": "recognizing", "message": "ANALYZING AUDIO WAVE..."})
            text = recognizer.recognize_google(audio)
            if text and text.strip():
                clean_text = text.strip()
                broadcast_event({"type": "transcript", "role": "user", "text": clean_text})
                res = execute_universal_task(clean_text)
                broadcast_event({"type": "transcript", "role": "jarvis", "text": res})
                broadcast_event({"type": "status", "state": "speaking", "message": "JARVIS RESPONDING..."})
                time.sleep(2.0)
        except sr.WaitTimeoutError:
            continue
        except sr.UnknownValueError:
            continue
        except sr.RequestError:
            time.sleep(1)
        except Exception:
            time.sleep(0.5)

# ---------------------------------------------------------
# Launch Server & Open Futuristic HUD App Window
# ---------------------------------------------------------
def launch_app_window():
    time.sleep(1.0)
    url = "http://127.0.0.1:5005"
    chrome_app_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if os.path.exists(chrome_app_path):
        subprocess.Popen([
            chrome_app_path,
            f"--app={url}",
            "--window-size=1080,820",
            "--window-position=160,60",
            "--autoplay-policy=no-user-gesture-required",
            "--unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:5005"
        ])
    else:
        webbrowser.open(url)

if __name__ == "__main__":
    # 1. Start real Mac telemetry daemon
    threading.Thread(target=telemetry_daemon, daemon=True).start()

    # 2. Start voice listener thread
    threading.Thread(target=background_voice_listener, daemon=True).start()

    # 3. Start browser window launcher
    threading.Thread(target=launch_app_window, daemon=True).start()

    # Initial Greeting
    speak_async("Jarvis Mark 7 online. Full system integration active.")

    # Run Flask server
    app.run(host="127.0.0.1", port=5005, debug=False, use_reloader=False)
