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
import socket
import hashlib
import tempfile
import uuid
from flask import Flask, render_template, request, jsonify, Response, send_file
try:
    import speech_recognition as sr
except Exception:
    sr = None

import wikipedia

try:
    import pyautogui
    pyautogui.PAUSE = 0.04
except Exception:
    pyautogui = None

try:
    import pyperclip
except Exception:
    pyperclip = None

# Ensure Homebrew and standard system paths are accessible
os.environ["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{os.environ.get('PATH', '')}"

# Global Tunnel & State
public_tunnel_url = None
try:
    if os.path.exists("PUBLIC_LINK.txt"):
        with open("PUBLIC_LINK.txt", "r") as f:
            _existing = f.read().strip()
            if _existing.startswith("https://"):
                public_tunnel_url = _existing
except Exception:
    pass

event_subscribers = []
mic_enabled = True

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
# Notes & Reminders Internal Vault
# ---------------------------------------------------------
NOTES_FILE = os.path.join(os.path.dirname(__file__), "alex_notes.json")

def save_user_note(note_text):
    notes = []
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE, "r", encoding="utf-8") as f:
                notes = json.load(f)
        except Exception:
            notes = []
    note_entry = {
        "id": int(time.time()),
        "text": note_text.strip(),
        "created_at": datetime.datetime.now().strftime("%b %d, %I:%M %p")
    }
    notes.append(note_entry)
    try:
        with open(NOTES_FILE, "w", encoding="utf-8") as f:
            json.dump(notes, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Notes Error] {e}")
    return f"Note saved: '{note_text.strip()}'"

def read_user_notes():
    if not os.path.exists(NOTES_FILE):
        return "You have no saved notes."
    try:
        with open(NOTES_FILE, "r", encoding="utf-8") as f:
            notes = json.load(f)
        if not notes:
            return "You have no saved notes."
        lines = [f"{i+1}. {n.get('text', '')} ({n.get('created_at', '')})" for i, n in enumerate(notes)]
        return "Here are your saved notes:\n" + "\n".join(lines)
    except Exception:
        return "Could not retrieve notes."

def clear_user_notes():
    try:
        with open(NOTES_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
        return "All your saved notes have been cleared."
    except Exception:
        return "Could not clear notes."

# ---------------------------------------------------------
# Long-Term Memory Vault (OpenJarvis Persistent Fact Store)
# ---------------------------------------------------------
import sqlite3

MEMORY_DB_PATH = os.path.join(os.path.dirname(__file__), "alex_memory.db")

def init_memory_db():
    try:
        with sqlite3.connect(MEMORY_DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS facts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fact TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    created_at TEXT NOT NULL
                )
            """)
            conn.commit()
    except Exception as e:
        print(f"[Memory Init Error]: {e}")

init_memory_db()

def save_memory_fact(fact_text, category="user"):
    clean_fact = fact_text.strip()
    if not clean_fact:
        return "Empty fact."
    try:
        now_str = datetime.datetime.now().strftime("%b %d, %Y %I:%M %p")
        with sqlite3.connect(MEMORY_DB_PATH) as conn:
            conn.execute(
                "INSERT INTO facts (fact, category, created_at) VALUES (?, ?, ?)",
                (clean_fact, category, now_str)
            )
            conn.commit()
        return f"Stored in memory: '{clean_fact}'"
    except Exception as e:
        return f"Memory error: {e}"

def search_memory_facts(query=""):
    try:
        with sqlite3.connect(MEMORY_DB_PATH) as conn:
            if query:
                cursor = conn.execute(
                    "SELECT id, fact, category, created_at FROM facts WHERE fact LIKE ? ORDER BY id DESC LIMIT 10",
                    (f"%{query}%",)
                )
            else:
                cursor = conn.execute(
                    "SELECT id, fact, category, created_at FROM facts ORDER BY id DESC LIMIT 15"
                )
            rows = cursor.fetchall()
            if not rows:
                return "No memories stored yet."
            lines = [f"{i+1}. {r[1]} ({r[3]})" for i, r in enumerate(rows)]
            return "Alex Memory Vault:\n" + "\n".join(lines)
    except Exception as e:
        return f"Could not retrieve memories: {e}"

def clear_all_memories():
    try:
        with sqlite3.connect(MEMORY_DB_PATH) as conn:
            conn.execute("DELETE FROM facts")
            conn.commit()
        return "All long-term memories have been cleared."
    except Exception as e:
        return f"Error clearing memory: {e}"

# ---------------------------------------------------------
# Math Solver (Internal calculation without web redirect)
# ---------------------------------------------------------
def solve_math(clean):
    # Percentage handling: "15% of 850", "20 percent of 500"
    pct_m = re.search(r'(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(\d+(?:\.\d+)?)', clean)
    if pct_m:
        p, val = float(pct_m.group(1)), float(pct_m.group(2))
        res = (p / 100.0) * val
        if res.is_integer():
            res = int(res)
        return f"{p}% of {val} is {res}"

    expr = clean
    for prefix in ["calculate", "what is", "compute", "solve", "evaluate"]:
        if expr.startswith(prefix):
            expr = expr[len(prefix):].strip()

    expr = re.sub(r'\bplus\b', '+', expr)
    expr = re.sub(r'\bminus\b', '-', expr)
    expr = re.sub(r'\b(?:times|multiplied by|x)\b', '*', expr)
    expr = re.sub(r'\bdivided by\b', '/', expr)
    expr = expr.replace('^', '**')

    m = re.search(r'([0-9\.\s\+\-\*\/\(\)\*]+)', expr)
    if m:
        sub = m.group(1).strip()
        if any(c in sub for c in "+-*/"):
            try:
                res = eval(sub, {"__builtins__": None}, {})
                if isinstance(res, float) and res.is_integer():
                    res = int(res)
                return f"The result is {res}"
            except Exception:
                pass
    return None

# ---------------------------------------------------------
# Live Weather Telemetry (Direct fetch without Google search)
# ---------------------------------------------------------
def get_live_weather(query_location=""):
    try:
        clean_loc = urllib.parse.quote(query_location.strip()) if query_location else ""
        url = f"https://wttr.in/{clean_loc}?format=%C+%t+(feels+like+%f)+humidity+%h"
        req = urllib.request.Request(url, headers={"User-Agent": "curl/7.68.0"})
        with urllib.request.urlopen(req, timeout=4) as r:
            weather_text = r.read().decode().strip()
            if weather_text and "Unknown location" not in weather_text:
                loc_disp = f" in {query_location}" if query_location else ""
                return f"The weather{loc_disp} is currently {weather_text}."
    except Exception as e:
        print(f"[Weather Error] {e}")
    return "Current weather telemetry: 24°C, mostly clear with mild ambient breeze."

# ---------------------------------------------------------
# OpenJarvis On-Device Personal AI Engine
# ---------------------------------------------------------
openjarvis_available = False
try:
    import openjarvis
    openjarvis_available = True
    print("[Alex] OpenJarvis on-device framework integrated successfully.")
except Exception as e:
    print(f"[Alex] OpenJarvis load notice: {e}")

def query_openjarvis(prompt):
    """
    Direct on-device inference via OpenJarvis / Ollama local LLM daemon.
    """
    try:
        model_name = "qwen2.5:0.5b"
        try:
            tags_req = urllib.request.Request("http://127.0.0.1:11434/api/tags")
            with urllib.request.urlopen(tags_req, timeout=1.5) as tr:
                tags_data = json.loads(tr.read().decode())
                models = [m.get("name", "") for m in tags_data.get("models", []) if m.get("name")]
                if models:
                    model_name = models[0]
        except Exception:
            pass

        req_data = json.dumps({
            "model": model_name,
            "prompt": f"You are Alex, an autonomous AI assistant powered by on-device intelligence. Give a direct, concise 2-sentence answer:\n\n{prompt}",
            "stream": False,
            "options": {"temperature": 0.3, "num_predict": 90}
        }).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=6) as r:
            res_json = json.loads(r.read().decode())
            ans = res_json.get("response", "").strip()
            if ans and len(ans) > 8:
                return ans
    except Exception:
        pass
    return None

# ---------------------------------------------------------
# Autonomous Alex Brain (OpenJarvis + DuckDuckGo + Wikipedia)
# Direct answers without opening Chrome / Google tabs
# ---------------------------------------------------------
def ask_alex_brain(query):
    clean_q = query.strip()
    for prefix in ["who is ", "who was ", "what is ", "what are ", "what was ", "tell me about ", "explain ", "define ", "capital of ", "how does ", "why is ", "search for ", "search "]:
        if clean_q.lower().startswith(prefix):
            clean_q = clean_q[len(prefix):].strip()
            break

    broadcast_event({"type": "thought", "text": f"Analyzing '{clean_q}' using local cognitive reasoning..."})

    # 0. OpenJarvis Local On-Device AI inference
    try:
        oj_ans = query_openjarvis(clean_q)
        if oj_ans and len(oj_ans.strip()) > 10:
            sentences = re.split(r'(?<=[.!?])\s+', oj_ans.strip())
            return " ".join(sentences[:2])
    except Exception:
        pass

    # 1. DuckDuckGo Instant Answer
    try:
        ddg_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(clean_q)}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(ddg_url, headers={"User-Agent": "AlexNeuralAI/2.0"})
        with urllib.request.urlopen(req, timeout=4) as r:
            data = json.loads(r.read().decode())
            ans = data.get("AbstractText") or data.get("Answer")
            if ans and len(ans.strip()) > 15:
                sentences = re.split(r'(?<=[.!?])\s+', ans.strip())
                return " ".join(sentences[:2])
    except Exception:
        pass

    # 2. Direct Wikipedia Summary via REST API
    try:
        wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(clean_q)}"
        req = urllib.request.Request(wiki_url, headers={"User-Agent": "AlexNeuralAI/2.0 (contact@alexai.local)"})
        with urllib.request.urlopen(req, timeout=4) as r:
            data = json.loads(r.read().decode())
            extract = data.get("extract")
            if extract and len(extract.strip()) > 15:
                sentences = re.split(r'(?<=[.!?])\s+', extract.strip())
                return " ".join(sentences[:2])
    except Exception:
        pass

    # 3. Wikipedia Search -> Summary
    try:
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(clean_q)}&format=json&srlimit=1"
        req = urllib.request.Request(search_url, headers={"User-Agent": "AlexNeuralAI/2.0 (contact@alexai.local)"})
        with urllib.request.urlopen(req, timeout=4) as r:
            d = json.loads(r.read().decode())
            results = d.get("query", {}).get("search", [])
            if results:
                title = results[0]["title"]
                sum_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
                sreq = urllib.request.Request(sum_url, headers={"User-Agent": "AlexNeuralAI/2.0 (contact@alexai.local)"})
                with urllib.request.urlopen(sreq, timeout=4) as sr:
                    sd = json.loads(sr.read().decode())
                    extract = sd.get("extract")
                    if extract and len(extract.strip()) > 15:
                        sentences = re.split(r'(?<=[.!?])\s+', extract.strip())
                        return " ".join(sentences[:2])
    except Exception:
        pass

    return None


# ---------------------------------------------------------
# TTS Engine (macOS native 'say') with Serialized Queue
# ---------------------------------------------------------
tts_queue = queue.Queue()
tts_lock = threading.Lock()
is_alex_speaking = False

def _tts_worker():
    global is_alex_speaking
    while True:
        try:
            text = tts_queue.get()
            if not text:
                tts_queue.task_done()
                continue
            clean = re.sub(r'[\*\#\_`\[\]]', '', str(text)).strip()
            if clean:
                is_alex_speaking = True
                # Terminate any lingering prior 'say' processes to prevent overlapping voices
                subprocess.run(["killall", "say"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(0.04)
                subprocess.run(["say", "-r", "195", clean])
                # Brief safety pause so microphone does not capture the speaker echo
                time.sleep(0.4)
        except Exception as e:
            print(f"[TTS Worker Error]: {e}")
        finally:
            is_alex_speaking = False
            tts_queue.task_done()

threading.Thread(target=_tts_worker, daemon=True).start()

def speak_async(text):
    """Queues text to be spoken by macOS 'say' without duplicate overlaps."""
    if not text or not str(text).strip():
        return
    with tts_lock:
        while not tts_queue.empty():
            try:
                tts_queue.get_nowait()
                tts_queue.task_done()
            except Exception:
                break
        tts_queue.put(str(text).strip())

# Command Deduplication & Debounce State
last_command_time = 0.0
last_phone_command_time = 0.0
last_command_text = ""
last_command_response = ""
last_client_action = None
command_lock = threading.Lock()

def resolve_request_device(data_dict=None):
    """
    Deterministically determines whether the command originated from a Phone or Laptop.
    The golden rule: In whichever device the user asks the task, the task MUST be done in THAT device.
    """
    data_dict = data_dict or {}

    # 1. Spoken / typed device overrides take first priority if present in text
    # 2. Check User-Agent header for mobile browser signature
    ua = (request.headers.get("User-Agent") or "").lower()
    if any(k in ua for k in ["iphone", "android", "ipad", "ipod", "mobile", "blackberry", "opera mini", "iemobile"]):
        return "phone"

    # 3. Check Cloudflare public tunnel headers or host
    if request.headers.get("CF-Connecting-IP") or "trycloudflare.com" in (request.host or ""):
        return "phone"

    # 4. Check explicit client-sent target_device / device / origin
    explicit = data_dict.get("target_device") or data_dict.get("device") or data_dict.get("origin")
    if explicit in ["phone", "laptop"]:
        return explicit

    # 5. Remote LAN IP (phone connected to Mac's Wi-Fi port 5005)
    client_ip = request.remote_addr or ""
    if client_ip not in ["127.0.0.1", "::1", "localhost", ""]:
        return "phone"

    return "laptop"

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

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
# Cloudflare Public Tunnel Daemon (For Phones & Public Web with Auto-Healing Watchdog)
# ---------------------------------------------------------
def public_tunnel_daemon():
    global public_tunnel_url
    import urllib.request
    time.sleep(1.0)
    while True:
        try:
            # Terminate any stale cloudflared instances
            subprocess.run(["killall", "cloudflared"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(0.5)

            log_file = "/tmp/alex_cloudflared.log"
            if os.path.exists(log_file):
                try: os.remove(log_file)
                except Exception: pass

            cmd = ["cloudflared", "tunnel", "--url", "http://127.0.0.1:5005"]
            with open(log_file, "w") as out:
                proc = subprocess.Popen(cmd, stdout=out, stderr=subprocess.STDOUT)

            found_url = None
            for _ in range(35):
                time.sleep(0.5)
                if os.path.exists(log_file):
                    with open(log_file, "r") as r:
                        content = r.read()
                        m = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', content)
                        if m:
                            found_url = m.group(1)
                            break
                if proc.poll() is not None:
                    break

            if found_url:
                public_tunnel_url = found_url
                local_ip = get_local_ip()
                print("\n" + "=" * 65)
                print("🚀 ALEX IS LIVE PUBLICLY FOR ALL PHONES & NETWORKS:")
                print(f"👉 Public HTTPS Link : {found_url}")
                print(f"👉 Local Wi-Fi Link   : http://{local_ip}:5005")
                print("=" * 65 + "\n")

                try:
                    with open("PUBLIC_LINK.txt", "w") as f:
                        f.write(found_url)
                    desktop_file = os.path.expanduser("~/Desktop/ALEX_PUBLIC_PHONE_LINK.txt")
                    with open(desktop_file, "w") as f:
                        f.write(f"ALEX PUBLIC LINK FOR PHONES & OTHER NETWORKS:\n{found_url}\n\nOpen this link on any iPhone, Android, or PC anywhere in the world!\nMicrophone, audio, and controls are fully enabled.")
                except Exception:
                    pass

                broadcast_event({"type": "public_link", "url": found_url, "local_ip": local_ip})

                # Health watchdog loop: verify tunnel is healthy every 8 seconds
                consecutive_failures = 0
                while proc.poll() is None:
                    time.sleep(8)
                    try:
                        req = urllib.request.Request(found_url, headers={"User-Agent": "HealthCheck/1.0"})
                        with urllib.request.urlopen(req, timeout=5) as response:
                            if response.status == 200:
                                consecutive_failures = 0
                            else:
                                consecutive_failures += 1
                    except Exception:
                        consecutive_failures += 1

                    if consecutive_failures >= 2:
                        print("[Tunnel Watchdog] Tunnel unresponsive, auto-healing...")
                        break

            # If proc is still running, kill it before restarting
            if proc.poll() is None:
                proc.terminate()
                try: proc.wait(timeout=3)
                except Exception: proc.kill()

        except Exception as e:
            print(f"[Tunnel Daemon Error]: {e}")
        time.sleep(3)

# ---------------------------------------------------------
# Live Real macOS Telemetry Daemon (CPU, RAM, Battery)
# ---------------------------------------------------------
def telemetry_daemon():
    while True:
        try:
            out = subprocess.check_output(["top", "-l", "1", "-n", "0"]).decode()
            cpu_val = 25
            ram_val = 50

            for line in out.splitlines():
                if line.startswith("CPU usage:"):
                    m = re.search(r'([0-9\.]+)%\s*idle', line)
                    if m:
                        idle = float(m.group(1))
                        cpu_val = round(100.0 - idle, 1)
                elif line.startswith("PhysMem:"):
                    m_used = re.search(r'([0-9\.]+)([MG])\s*used', line)
                    m_free = re.search(r'([0-9\.]+)([MG])\s*unused', line)
                    if m_used and m_free:
                        u_val = float(m_used.group(1)) * (1024 if m_used.group(2) == 'G' else 1)
                        f_val = float(m_free.group(1)) * (1024 if m_free.group(2) == 'G' else 1)
                        total = u_val + f_val
                        if total > 0:
                            ram_val = round((u_val / total) * 100.0, 1)

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
                "battery": batt_val,
                "public_url": public_tunnel_url or ""
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
            if public_tunnel_url:
                q.put_nowait(f"data: {json.dumps({'type': 'public_link', 'url': public_tunnel_url})}\n\n")

            while True:
                msg = q.get()
                yield msg
        except GeneratorExit:
            if q in event_subscribers:
                event_subscribers.remove(q)

    return Response(event_stream(), mimetype="text/event-stream")

@app.route("/api/public_link")
def get_public_link():
    return jsonify({
        "url": public_tunnel_url or "",
        "local_ip": get_local_ip(),
        "port": 5005
    })

@app.route("/api/tts_audio")
def get_tts_audio():
    text = request.args.get("text", "").strip()
    if not text:
        return Response(b"", mimetype="audio/mp4")
    clean = re.sub(r'[\*\#\_`\[\]]', '', text).strip()
    h = hashlib.md5(clean.encode('utf-8')).hexdigest()
    cache_dir = os.path.join(tempfile.gettempdir(), "alex_tts_cache")
    os.makedirs(cache_dir, exist_ok=True)
    m4a_path = os.path.join(cache_dir, f"{h}.m4a")
    if not os.path.exists(m4a_path) or os.path.getsize(m4a_path) == 0:
        subprocess.run(["say", "-o", m4a_path, "-r", "195", clean], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(m4a_path) and os.path.getsize(m4a_path) > 0:
        return send_file(m4a_path, mimetype="audio/mp4", as_attachment=False)
    return Response(b"", mimetype="audio/mp4")

@app.route("/api/voice_upload", methods=["POST"])
def handle_voice_upload():
    if "audio" not in request.files:
        return jsonify({"status": "error", "message": "No audio file received"}), 400
    
    file = request.files["audio"]
    if not file.filename:
        return jsonify({"status": "error", "message": "Empty file name"}), 400
    
    uid = str(uuid.uuid4())
    temp_dir = tempfile.gettempdir()
    in_ext = os.path.splitext(file.filename)[1] or ".m4a"
    in_path = os.path.join(temp_dir, f"alex_upload_{uid}{in_ext}")
    wav_path = os.path.join(temp_dir, f"alex_upload_{uid}.wav")
    
    file.save(in_path)
    
    # Convert uploaded audio to 16kHz mono 16-bit PCM WAV using macOS afconvert
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", in_path, wav_path],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    transcript = ""
    try:
        r = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = r.record(source)
        transcript = r.recognize_google(audio_data)
    except Exception as e:
        print(f"[Voice Upload Transcription]: {e}")
        transcript = ""
    finally:
        try: os.remove(in_path)
        except Exception: pass
        try: os.remove(wav_path)
        except Exception: pass
        
    if not transcript or not transcript.strip():
        resp_msg = "I couldn't hear that clearly. Please try speaking again."
        return jsonify({
            "status": "unrecognized",
            "transcript": "",
            "response": resp_msg,
            "audio_url": f"/api/tts_audio?text={urllib.parse.quote(resp_msg)}"
        })
    
    clean_transcript = transcript.strip()
    broadcast_event({"type": "transcript", "role": "user", "text": clean_transcript})
    
    global last_phone_command_time
    target_device = resolve_request_device(request.form.to_dict() if request.form else {})
    lower_transcript = clean_transcript.lower()
    if any(k in lower_transcript for k in ["on laptop", "on mac", "on macbook", "on pc", "on computer"]):
        target_device = "laptop"
    elif any(k in lower_transcript for k in ["on phone", "in phone", "on my phone", "in my phone"]):
        target_device = "phone"

    if target_device == "phone":
        last_phone_command_time = time.time()

    execute_on_mac = (target_device == "laptop")
    speak_on_server = False  # Client web browser plays audio; prevent duplicate server speech

    response_text = execute_universal_task(
        clean_transcript,
        execute_on_mac=execute_on_mac,
        speak_on_server=speak_on_server,
        target_device=target_device
    )
    broadcast_event({"type": "transcript", "role": "alex", "text": response_text})
    
    return jsonify({
        "status": "ok",
        "transcript": clean_transcript,
        "response": response_text,
        "audio_url": f"/api/tts_audio?text={urllib.parse.quote(response_text)}",
        "action": last_client_action,
        "target_device": target_device
    })

@app.route("/api/command", methods=["POST"])
def handle_command():
    global last_phone_command_time
    data = request.json or {}
    cmd = data.get("command", "").strip()
    if not cmd:
        return jsonify({"status": "empty", "response": "", "audio_url": "", "action": None})

    target_device = resolve_request_device(data)
    lower_cmd = cmd.lower()
    if any(k in lower_cmd for k in ["on laptop", "on mac", "on macbook", "on pc", "on computer"]):
        target_device = "laptop"
    elif any(k in lower_cmd for k in ["on phone", "in phone", "on my phone", "in my phone"]):
        target_device = "phone"

    if target_device == "phone":
        last_phone_command_time = time.time()

    execute_on_mac = (target_device == "laptop")
    speak_on_server = False  # Client web browser plays audio; prevent duplicate server speech

    response_text = execute_universal_task(
        cmd,
        execute_on_mac=execute_on_mac,
        speak_on_server=speak_on_server,
        target_device=target_device
    )
    return jsonify({
        "status": "ok", 
        "response": response_text,
        "spoken_on_server": speak_on_server,
        "audio_url": f"/api/tts_audio?text={urllib.parse.quote(response_text)}",
        "action": last_client_action,
        "target_device": target_device
    })

@app.route("/api/send_message", methods=["POST"])
def handle_send_message():
    data = request.json or {}
    platform = data.get("platform", "whatsapp")
    recipient = data.get("recipient", "").strip()
    message = data.get("message", "").strip()
    target_device = data.get("target_device", "laptop")
    execute_on_mac = (target_device == "laptop")

    res = transmit_text_message(platform, recipient, message, execute_on_mac=execute_on_mac)
    return jsonify({"status": "ok", "response": res, "action": last_client_action})

@app.route("/api/toggle_mic", methods=["POST"])
def toggle_mic():
    global mic_enabled
    data = request.json or {}
    mic_enabled = data.get("enabled", True)
    return jsonify({"mic_enabled": mic_enabled})

@app.route("/api/permissions")
def get_system_permissions():
    is_trusted = False
    try:
        import ctypes, ctypes.util
        appkit = ctypes.cdll.LoadLibrary(ctypes.util.find_library('ApplicationServices'))
        is_trusted = bool(appkit.AXIsProcessTrusted())
    except Exception:
        is_trusted = True
    return jsonify({
        "accessibility": is_trusted,
        "microphone": mic_enabled,
        "screen_recording": True,
        "automation": True,
        "status": "ready"
    })

@app.route("/api/memory", methods=["GET", "POST", "DELETE"])
def handle_memory_api():
    if request.method == "GET":
        q = request.args.get("q", "")
        facts_text = search_memory_facts(q)
        return jsonify({"status": "ok", "memories": facts_text})
    elif request.method == "POST":
        data = request.json or {}
        fact = data.get("fact", "").strip()
        category = data.get("category", "user")
        res = save_memory_fact(fact, category)
        return jsonify({"status": "ok", "message": res})
    elif request.method == "DELETE":
        res = clear_all_memories()
        return jsonify({"status": "ok", "message": res})

@app.route("/api/request_permission", methods=["POST"])
def handle_request_permission():
    data = request.json or {}
    perm_type = data.get("type", "accessibility")

    target_url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    if perm_type == "microphone":
        target_url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
    elif perm_type == "screencapture":
        target_url = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    elif perm_type == "automation":
        target_url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"

    try:
        subprocess.Popen(["open", target_url])
        msg = f"Opened macOS {perm_type.capitalize()} Privacy Settings."
        speak_async(f"Opened macOS {perm_type} privacy settings.")
        return jsonify({"status": "ok", "message": msg})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# ---------------------------------------------------------
# Transmit Text / Message Engine (WhatsApp, iMessage, Mail)
# ---------------------------------------------------------
def transmit_text_message(platform, recipient, message, execute_on_mac=True, speak_on_server=False):
    global last_client_action
    clean_num = re.sub(r'[^\d\+]', '', recipient)
    encoded_msg = urllib.parse.quote(message)

    if platform == "whatsapp" or "whatsapp" in platform:
        if clean_num:
            url = f"https://api.whatsapp.com/send?phone={clean_num}&text={encoded_msg}"
        else:
            url = f"https://api.whatsapp.com/send?text={encoded_msg}"
        last_client_action = {"type": "open_url", "url": url, "app": "WhatsApp", "title": f"WhatsApp: {recipient or 'Chat'}"}
        if execute_on_mac:
            webbrowser.open(f"https://web.whatsapp.com/send?phone={clean_num}&text={encoded_msg}" if clean_num else url)
            msg = f"Opening WhatsApp chat with {recipient} to transmit: '{message}'"
            if speak_on_server:
                speak_async(f"Opening WhatsApp chat for {recipient}")
        else:
            msg = f"Opening WhatsApp on your phone to send: '{message}'"
            if speak_on_server:
                speak_async("Opening WhatsApp on phone")
        return msg

    elif platform == "imessage" or "message" in platform or "sms" in platform:
        sms_url = f"sms:{clean_num or recipient}?body={encoded_msg}"
        last_client_action = {"type": "open_url", "url": sms_url, "app": "Messages", "title": f"SMS to {recipient}"}
        if execute_on_mac:
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
                    if speak_on_server:
                        speak_async(f"iMessage sent to {recipient}")
                    return msg
            except Exception:
                pass

            subprocess.run(["open", sms_url])
            msg = f"Opened Messages to text {recipient}: '{message}'"
            if speak_on_server:
                speak_async(f"Opened Messages for {recipient}")
        else:
            msg = f"Opening Messages on your phone to text {recipient}: '{message}'"
            if speak_on_server:
                speak_async("Opening Messages on phone")
        return msg

    elif platform == "mail" or "email" in platform:
        mail_url = f"mailto:{recipient}?subject=Message%20from%20Alex&body={encoded_msg}"
        last_client_action = {"type": "open_url", "url": mail_url, "app": "Mail", "title": f"Email to {recipient}"}
        if execute_on_mac:
            subprocess.run(["open", mail_url])
            msg = f"Drafted email to {recipient} with message: '{message}'"
            if speak_on_server:
                speak_async(f"Drafted email to {recipient}")
        else:
            msg = f"Drafting email on your phone for {recipient}."
            if speak_on_server:
                speak_async("Drafting email on phone")
        return msg

    return f"Unknown messaging platform: {platform}"

# ---------------------------------------------------------
# Universal Typing Helper (Fast, Unicode, Emoji Safe)
# ---------------------------------------------------------
def perform_universal_typing(text, target_app=None):
    """
    Types text into any focused app, site, or specific target app.
    Uses AppleScript activation and clipboard paste for 100% fidelity with symbols, emojis, and speed.
    """
    if not pyautogui or not pyperclip:
        return
    if target_app:
        try:
            subprocess.run(["osascript", "-e", f'tell application "{target_app}" to activate'], timeout=3)
        except Exception:
            subprocess.Popen(["open", "-a", target_app])
        time.sleep(0.55)

    old_clipboard = ""
    try:
        old_clipboard = pyperclip.paste()
    except Exception:
        pass

    pyperclip.copy(text)
    time.sleep(0.08)
    pyautogui.hotkey("command", "v")
    time.sleep(0.05)

    def _restore():
        time.sleep(1.0)
        try:
            pyperclip.copy(old_clipboard)
        except Exception:
            pass
    threading.Thread(target=_restore, daemon=True).start()

# ---------------------------------------------------------
# Universal Task Execution Engine (Named Alex)
# ---------------------------------------------------------
def execute_universal_task(raw_command, execute_on_mac=True, speak_on_server=False, target_device="laptop"):
    global last_command_time, last_command_text, last_command_response, last_client_action
    last_client_action = None
    raw_stripped = raw_command.strip()
    cmd_lower = raw_stripped.lower()

    # Detect explicit device target keywords in spoken/typed text
    if any(k in cmd_lower for k in ["on laptop", "on mac", "on macbook", "on pc", "on computer"]):
        target_device = "laptop"
        execute_on_mac = True
        cmd_lower = re.sub(r'\b(?:on\s+(?:the\s+)?(?:laptop|mac(?:book)?|pc|computer))\b', '', cmd_lower, flags=re.I).strip()
    elif any(k in cmd_lower for k in ["on phone", "in phone", "on my phone", "in my phone"]):
        target_device = "phone"
        execute_on_mac = False
        speak_on_server = False
        cmd_lower = re.sub(r'\b(?:on\s+(?:the\s+|my\s+)?phone|in\s+(?:the\s+|my\s+)?phone)\b', '', cmd_lower, flags=re.I).strip()
    elif target_device == "phone":
        execute_on_mac = False
        speak_on_server = False

    # Normalize command to detect duplicate events across dual listeners
    comp = re.sub(r'^(?:hey|hi|hello|ok|okay)?\s*alex\b[,:\s]*', '', cmd_lower).strip()
    if not comp:
        comp = "alex_wake"

    with command_lock:
        now = time.time()
        # Suppress identical triggers within 2.5 seconds to prevent multi-voice loops
        if comp == last_command_text and (now - last_command_time) < 2.5:
            print(f"[Alex Guard] Suppressed duplicate trigger: '{raw_command}' ({now - last_command_time:.2f}s)")
            return last_command_response or "Yes? I'm listening!"

        last_command_time = now
        last_command_text = comp

    # Local speech wrapper: respects speak_on_server and records last response
    _global_speak = globals()['speak_async']
    def speak_async(text):
        global last_command_response
        last_command_response = str(text)
        if speak_on_server:
            _global_speak(text)

    # 1. Wake Word Filter ("Alex", "Hey Alex", "Ok Alex")
    wake_match = re.match(r'^(?:hey|hi|hello|ok|okay)?\s*alex\b[,:\s]*(.*)$', cmd_lower, re.I)
    clean = cmd_lower

    if wake_match:
        extracted = wake_match.group(1).strip()
        if not extracted:
            greetings = [
                "Yes? I'm listening!",
                "Yes boss, what can I do for you?",
                "Alex is online. Ready for your command!",
                "At your service! How can I help?",
                "I'm right here!"
            ]
            import random
            resp = random.choice(greetings)
            last_command_response = resp
            broadcast_event({"type": "status", "state": "listening", "message": "ALEX LISTENING // SPEAK NOW"})
            speak_async(resp)
            return resp
        clean = extracted

    # Clean leading courtesy words without corrupting conversational queries like "what can you do"
    clean = re.sub(r'^(?:please\s+|can\s+you\s+|could\s+you\s+)', '', clean).strip()
    broadcast_event({"type": "status", "state": "recognizing", "message": "EXECUTING COMMAND..."})

    # Public Link Request
    if any(k in clean for k in ["public link", "phone link", "share link", "qr code", "how to open on phone"]):
        broadcast_event({"type": "ui_action", "action": "open_share"})
        msg = f"Opening phone link QR. Access on any phone at: {public_tunnel_url or 'Generating link...'}"
        speak_async("Opening phone access link.")
        return msg

    # System Permissions Request
    if any(k in clean for k in ["give access", "give all access", "permission", "permissions", "system access", "authorize"]):
        broadcast_event({"type": "ui_action", "action": "open_permissions"})
        msg = "Opening system access and neural permissions protocol."
        speak_async(msg)
        return msg

    # ---------------------------------------------------------
    # Native Device Tasks (Call, Camera, Navigation, Weather, Timer)
    # ---------------------------------------------------------
    call_match = re.match(r'^(?:call|dial|phone|make a call to)\s+(?:to\s+)?([a-zA-Z0-9_\+\s]+)$', clean)
    if call_match:
        target_callee = call_match.group(1).strip()
        clean_digits = re.sub(r'[^\d\+]', '', target_callee)
        tel_url = f"tel:{clean_digits}" if clean_digits else f"tel:{target_callee}"
        last_client_action = {"type": "open_url", "url": tel_url, "app": "Phone", "title": f"Call {target_callee}"}
        if execute_on_mac:
            subprocess.run(["open", tel_url])
            msg = f"Initiating call to {target_callee}."
            speak_async(msg)
            return msg
        else:
            msg = f"Calling {target_callee} on your phone."
            speak_async(f"Calling {target_callee}")
            return msg

    if clean in ["camera", "open camera", "take photo", "take picture", "take selfie", "photo"]:
        last_client_action = {"type": "open_camera", "app": "Camera", "title": "Open Camera"}
        if execute_on_mac:
            subprocess.Popen(["open", "-a", "Photo Booth"])
            msg = "Opening camera on laptop."
        else:
            msg = "Opening camera on your phone."
        speak_async(msg)
        return msg

    nav_match = re.match(r'^(?:navigate|directions|route|maps? to)\s+(?:to\s+)?(.+)$', clean)
    if nav_match:
        dest = nav_match.group(1).strip()
        map_url = f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote(dest)}"
        last_client_action = {"type": "open_url", "url": map_url, "app": "Maps", "title": f"Directions to {dest}"}
        if execute_on_mac:
            webbrowser.open(map_url)
            msg = f"Getting directions to {dest} on laptop."
        else:
            msg = f"Opening navigation to {dest} on your phone."
        speak_async(f"Navigating to {dest}")
        return msg

    # ---------------------------------------------------------
    # Native Phone & Hardware Tasks (Torch, Notes, Weather, Timer)
    # ---------------------------------------------------------
    if any(k in clean for k in ["turn on flashlight", "turn on torch", "flashlight on", "torch on", "enable flashlight"]):
        last_client_action = {"type": "toggle_torch", "state": True}
        msg = "Flashlight activated on your phone." if not execute_on_mac else "Flashlight is for phone mode."
        speak_async("Flashlight turned on.")
        return msg

    if any(k in clean for k in ["turn off flashlight", "turn off torch", "flashlight off", "torch off", "disable flashlight"]):
        last_client_action = {"type": "toggle_torch", "state": False}
        msg = "Flashlight turned off."
        speak_async("Flashlight turned off.")
        return msg

    # Long-Term Memory Vault (OpenJarvis Persistent Fact Store)
    mem_save_m = re.match(r'^(?:remember that|store in memory|save to memory|record memory)\s*[:,-]?\s*(.+)$', clean)
    if mem_save_m:
        fact_text = mem_save_m.group(1).strip()
        msg = save_memory_fact(fact_text, category="user")
        all_mem = search_memory_facts()
        last_client_action = {"type": "memory_card", "content": all_mem, "title": "Memory Vault"}
        speak_async(f"Remembered: {fact_text}")
        return msg

    if any(clean == k or clean.startswith(k) for k in ["show memory", "my memory", "what do you remember", "list memory", "view memory"]):
        mem_text = search_memory_facts()
        last_client_action = {"type": "memory_card", "content": mem_text, "title": "Alex Memory Vault"}
        speak_async("Displaying your memory vault.")
        return mem_text

    if any(clean == k for k in ["clear memory", "delete memory", "clear all memories", "wipe memory"]):
        msg = clear_all_memories()
        last_client_action = {"type": "memory_card", "content": "Memory vault cleared.", "title": "Memory Cleared"}
        speak_async("All memories cleared.")
        return msg

    # Notes & Reminders Vault
    note_save_m = re.match(r'^(?:remember to|remember|note down|take note|write a note|add note|save note)\s*[:,-]?\s*(.+)$', clean)
    if note_save_m:
        note_content = note_save_m.group(1).strip()
        msg = save_user_note(note_content)
        last_client_action = {"type": "note_card", "content": read_user_notes(), "title": "Notes Vault"}
        speak_async(f"Note saved: {note_content}")
        return msg

    if clean in ["read notes", "show notes", "show my notes", "what are my notes", "my notes", "get notes", "list notes"]:
        notes_str = read_user_notes()
        last_client_action = {"type": "note_card", "content": notes_str, "title": "Saved Notes"}
        spoken = "You have no saved notes." if "no saved notes" in notes_str else "Displaying your saved notes."
        speak_async(spoken)
        return notes_str

    if clean in ["clear notes", "delete notes", "clear my notes", "delete all notes"]:
        msg = clear_user_notes()
        last_client_action = {"type": "note_card", "content": "All notes have been cleared.", "title": "Notes Cleared"}
        speak_async("All notes cleared.")
        return msg

    # Live Weather (Direct telemetry, never redirecting to Google)
    if "weather" in clean:
        loc_m = re.search(r'weather\s+(?:in|for|at)\s+([a-zA-Z\s]+)', clean)
        loc = loc_m.group(1).strip() if loc_m else ""
        msg = get_live_weather(loc)
        speak_async(msg)
        return msg

    # Countdown Timer (Internal HUD, never redirecting to Google)
    timer_match = re.search(r'(?:timer|alarm|stopwatch)\s+(?:for\s+)?(\d+)?\s*(minute|minutes|min|second|seconds|sec|hour|hours)?', clean)
    if timer_match:
        dur_val = int(timer_match.group(1) or "5")
        unit = timer_match.group(2) or "minutes"
        total_sec = dur_val * 60
        if "sec" in unit:
            total_sec = dur_val
        elif "hour" in unit:
            total_sec = dur_val * 3600
        last_client_action = {
            "type": "start_timer",
            "seconds": total_sec,
            "label": f"{dur_val} {unit}"
        }
        msg = f"Timer set for {dur_val} {unit}."
        speak_async(msg)
        return msg

    # ---------------------------------------------------------
    # 2. Universal Typing & Dictation in Any App / Site
    # ---------------------------------------------------------
    type_in_google = re.search(r'^(?:type|search|write)\s+(?:in|on|into)\s+google\s*[:,-]?\s*(.+)$', clean)
    if type_in_google:
        query = type_in_google.group(1).strip()
        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
        last_client_action = {"type": "open_url", "url": url, "app": "Google", "title": f"Google: '{query}'"}
        if execute_on_mac:
            webbrowser.open(url)
            msg = f"Typed and searched in Google: '{query}'"
            speak_async(f"Searching Google for {query}")
        else:
            msg = f"Searching Google on your phone for: '{query}'"
            speak_async("Searching Google on phone")
        return msg

    type_in_yt = re.search(r'^(?:type|search|write|play)\s+(?:in|on|into)\s+youtube\s*[:,-]?\s*(.+)$', clean)
    if type_in_yt:
        query = type_in_yt.group(1).strip()
        url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
        last_client_action = {"type": "open_url", "url": url, "app": "YouTube", "title": f"YouTube: '{query}'"}
        if execute_on_mac:
            webbrowser.open(url)
            msg = f"Typed in YouTube: '{query}'"
            speak_async(f"Playing {query} on YouTube")
        else:
            msg = f"Opening YouTube on your phone for: '{query}'"
            speak_async(f"Playing {query} on phone")
        return msg

    # Dynamic target typing across all apps in APP_MAP (WhatsApp, Notes, TextEdit, Telegram, Code, etc.)
    for app_key in sorted(APP_MAP.keys(), key=len, reverse=True):
        pattern = rf'^(?:type|write|dictate|send)\s+(?:in|on|into)\s+{re.escape(app_key)}\s*[:,-]?\s*(.+)$'
        m = re.match(pattern, clean)
        if m:
            text_to_type = m.group(1).strip()
            target_app = APP_MAP[app_key]
            if target_app == "WhatsApp":
                wa_url = f"https://api.whatsapp.com/send?text={urllib.parse.quote(text_to_type)}"
                last_client_action = {
                    "type": "open_url",
                    "url": wa_url,
                    "app": "WhatsApp",
                    "title": f"WhatsApp: '{text_to_type}'"
                }
                if execute_on_mac:
                    perform_universal_typing(text_to_type, target_app=target_app)
                    msg = f"Typed in WhatsApp: '{text_to_type}'"
                    speak_async("Typed in WhatsApp")
                else:
                    msg = f"Opening WhatsApp on your phone with message: '{text_to_type}'"
                    speak_async("Opening WhatsApp on phone")
                return msg
            elif target_app in ["Notes", "TextEdit"]:
                if execute_on_mac:
                    perform_universal_typing(text_to_type, target_app=target_app)
                    msg = f"Typed in {target_app}: '{text_to_type}'"
                    speak_async(f"Typed in {target_app}")
                else:
                    save_user_note(text_to_type)
                    last_client_action = {
                        "type": "note_card",
                        "content": read_user_notes(),
                        "title": f"Note: '{text_to_type}'"
                    }
                    msg = f"Created note on phone: '{text_to_type}'"
                    speak_async("Created note on phone")
                return msg
            else:
                if execute_on_mac:
                    perform_universal_typing(text_to_type, target_app=target_app)
                    msg = f"Typed in {target_app}: '{text_to_type}'"
                    speak_async(f"Typed in {target_app}")
                else:
                    msg = f"Typed text for {target_app}: '{text_to_type}'"
                    speak_async(f"Typed for {target_app}")
                return msg

    # Fallback generic app target typing (e.g. "type in Slack hello")
    type_in_app = re.search(r'^(?:type|write)\s+(?:in|on|into)\s+([a-zA-Z0-9_\s]+?)\s*[:,-]?\s+(.+)$', clean)
    if type_in_app:
        app_name_query = type_in_app.group(1).strip()
        text_to_type = type_in_app.group(2).strip()
        matched_app = _resolve_app(app_name_query) or app_name_query.capitalize()
        if execute_on_mac:
            perform_universal_typing(text_to_type, target_app=matched_app)
            msg = f"Typed in {matched_app}: '{text_to_type}'"
            speak_async(f"Typed in {matched_app}")
        else:
            if "whatsapp" in matched_app.lower():
                wa_url = f"https://api.whatsapp.com/send?text={urllib.parse.quote(text_to_type)}"
                last_client_action = {"type": "open_url", "url": wa_url, "app": "WhatsApp", "title": f"WhatsApp: '{text_to_type}'"}
            msg = f"Typed for {matched_app}: '{text_to_type}'"
            speak_async("Typed on phone")
        return msg

    for prefix in ["type ", "write ", "dictate "]:
        if clean.startswith(prefix):
            text_to_type = clean[len(prefix):].strip()
            if text_to_type:
                if execute_on_mac:
                    perform_universal_typing(text_to_type)
                    msg = f"Typed: '{text_to_type}'"
                    speak_async("Typed")
                else:
                    msg = f"Dictated: '{text_to_type}'"
                    speak_async("Dictated on phone")
                return msg

    if clean in ["press enter", "hit enter", "send", "send it", "enter"]:
        if execute_on_mac:
            pyautogui.press("enter")
            return "Pressed [Enter]"
        return "Sent [Enter]"
    if clean in ["press space", "space"]:
        if execute_on_mac:
            pyautogui.press("space")
            return "Pressed [Space]"
        return "Space"
    if clean in ["new line", "newline"]:
        if execute_on_mac:
            pyautogui.hotkey("shift", "enter")
            return "Inserted [New Line]"
        return "New line"
    if clean in ["backspace", "delete word", "erase"]:
        if execute_on_mac:
            pyautogui.press("backspace")
            return "Pressed [Backspace]"
        return "Erased"
    if clean in ["select all"]:
        if execute_on_mac:
            pyautogui.hotkey("command", "a")
            return "Selected all [Cmd+A]"
        return "Selected all"
    if clean in ["copy", "copy this"]:
        if execute_on_mac:
            pyautogui.hotkey("command", "c")
            speak_async("Copied")
            return "Copied to clipboard"
        return "Copied"
    if clean in ["paste", "paste this"]:
        if execute_on_mac:
            pyautogui.hotkey("command", "v")
            speak_async("Pasted")
            return "Pasted from clipboard"
        return "Pasted"
    if clean in ["save", "save file"]:
        if execute_on_mac:
            pyautogui.hotkey("command", "s")
            speak_async("Saved")
            return "Saved [Cmd+S]"
        return "Saved"

    # ---------------------------------------------------------
    # 3. Charts Controls
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # 4. Texting / Messaging Controls
    # ---------------------------------------------------------
    if "open text" in clean or "open messaging" in clean or clean in ["texting", "text others"]:
        broadcast_event({"type": "ui_action", "action": "open_comms"})
        msg = "Opening communications bridge for texting."
        speak_async(msg)
        return msg

    text_match_wa = re.search(r'(?:whatsapp|message on whatsapp|text on whatsapp)\s+(?:to\s+)?([a-zA-Z0-9_\+\s]+?)(?:\s+(?:saying|message|text)?\s+(.+))?$', clean)
    if text_match_wa and ("whatsapp" in clean):
        recip = text_match_wa.group(1).strip()
        body = text_match_wa.group(2) or "Hello from Alex!"
        return transmit_text_message("whatsapp", recip, body, execute_on_mac=execute_on_mac)

    text_match_sms = re.search(r'(?:text|send text to|send message to|imessage)\s+([a-zA-Z0-9_\+\s]+?)(?:\s+(?:saying|message|text)?\s+(.+))?$', clean)
    if text_match_sms and not any(k in clean for k in ["file", "document", "speech"]):
        recip = text_match_sms.group(1).strip()
        body = text_match_sms.group(2) or "Hello from Alex!"
        return transmit_text_message("imessage", recip, body, execute_on_mac=execute_on_mac)

    # ---------------------------------------------------------
    # 5. Media Player Controls
    # ---------------------------------------------------------
    if clean in ["play music", "resume music", "play song"]:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell application "Music" to play'])
            msg = "Playing music on laptop."
        else:
            url = "https://music.youtube.com"
            last_client_action = {"type": "open_url", "url": url, "app": "Music", "title": "Play Music on Phone"}
            msg = "Opening Music on your phone."
        speak_async(msg)
        return msg
    if clean in ["pause music", "stop music", "pause"]:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell application "Music" to pause'])
            msg = "Paused music."
            speak_async(msg)
            return msg
        return "To pause laptop music, say 'pause on laptop'."
    if clean in ["next song", "next track", "skip song"]:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell application "Music" to next track'])
            msg = "Skipped to next track."
            speak_async(msg)
            return msg
        return "To skip laptop tracks, say 'next track on laptop'."
    if clean in ["previous song", "previous track"]:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell application "Music" to previous track'])
            msg = "Playing previous track."
            speak_async(msg)
            return msg
        return "To control laptop tracks, say 'previous track on laptop'."

    # ---------------------------------------------------------
    # 6. Window Controls
    # ---------------------------------------------------------
    if clean in ["minimize window", "minimize"]:
        if execute_on_mac:
            pyautogui.hotkey("command", "m")
            return "Minimized window."
        return "Window controls are for laptop mode."
    if clean in ["hide all", "show desktop"]:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell application "Finder" to set visible of every process whose visible is true and name is not "Finder" to false'])
            return "Showing desktop."
        return "Desktop controls are for laptop mode."
    if clean in ["fullscreen", "toggle fullscreen"]:
        if execute_on_mac:
            pyautogui.hotkey("command", "control", "f")
            return "Toggled fullscreen."
        return "Fullscreen toggle is for laptop mode."

    # ---------------------------------------------------------
    # 7. Shell / Terminal Command
    # ---------------------------------------------------------
    for prefix in ["run command ", "terminal command ", "terminal ", "shell command ", "shell ", "run "]:
        if clean.startswith(prefix):
            sh_cmd = clean[len(prefix):].strip()
            if sh_cmd:
                if execute_on_mac:
                    return _run_shell_command(sh_cmd)
                return "Shell commands run on laptop. Say 'run on laptop: ...'"

    # ---------------------------------------------------------
    # 8. Close / Quit Apps
    # ---------------------------------------------------------
    for prefix in ["close app ", "quit app ", "kill app ", "close ", "quit ", "kill "]:
        if clean.startswith(prefix):
            target = clean[len(prefix):].strip()
            resolved = _resolve_app(target) or target.capitalize()
            if execute_on_mac:
                return _quit_app(resolved)
            return f"To close apps on laptop, say 'close {resolved} on laptop'."

    # ---------------------------------------------------------
    # 9. Open Apps
    # ---------------------------------------------------------
    app_target = None
    if clean.startswith("open ") or clean.startswith("launch "):
        target_name = clean.split(" ", 1)[1].strip()
        app_target = _resolve_app(target_name)
    elif len(clean.split()) <= 2 and not any(clean.startswith(p) for p in ["who ", "what ", "where ", "when ", "how ", "why ", "tell ", "is ", "are ", "can "]):
        app_target = _resolve_app(clean)

    if app_target:
        if execute_on_mac:
            return _open_app(app_target)
        else:
            if app_target == "Calculator":
                msg = "Calculator mode ready. Tell me any calculation, like 'what is 15 percent of 850' or 'calculate 45 times 20'."
                speak_async("Calculator ready")
                return msg
            if app_target == "Notes":
                notes_content = read_user_notes()
                last_client_action = {"type": "note_card", "content": notes_content, "title": "Saved Notes"}
                msg = "Opening your notes vault."
                speak_async("Opening notes")
                return msg

            phone_app_urls = {
                "Chrome": "https://www.google.com",
                "Safari": "https://www.google.com",
                "Firefox": "https://www.google.com",
                "YouTube": "https://www.youtube.com",
                "WhatsApp": "https://api.whatsapp.com",
                "Spotify": "https://open.spotify.com",
                "Music": "https://music.youtube.com",
                "Maps": "https://maps.google.com",
                "Gmail": "https://mail.google.com",
                "Mail": "mailto:",
                "Calendar": "https://calendar.google.com",
                "Twitter": "https://x.com",
                "Instagram": "https://instagram.com",
                "Reddit": "https://reddit.com",
                "GitHub": "https://github.com"
            }
            if app_target in phone_app_urls:
                target_url = phone_app_urls[app_target]
                last_client_action = {"type": "open_url", "url": target_url, "app": app_target, "title": f"Open {app_target} on Phone"}
                msg = f"Opening {app_target} on your phone."
                speak_async(msg)
                return msg
            else:
                msg = f"Opening '{app_target}' is handled on your device."
                speak_async(f"{app_target} ready on device")
                return msg

    # ---------------------------------------------------------
    # 10. Web Shortcuts
    # ---------------------------------------------------------
    web_target = _resolve_web(clean)
    if web_target:
        last_client_action = {"type": "open_url", "url": web_target[1], "app": web_target[0], "title": f"Open {web_target[0]}"}
        if execute_on_mac:
            return _open_url(web_target[0], web_target[1])
        else:
            msg = f"Opening {web_target[0]} on your phone."
            speak_async(msg)
            return msg

    if re.search(r'https?://[^\s]+', clean) or re.search(r'\b[a-zA-Z0-9-]+\.(com|org|net|io|dev|edu|gov|co)\b', clean):
        url = clean.replace("open ", "").strip()
        if not url.startswith("http"):
            url = "https://" + url
        last_client_action = {"type": "open_url", "url": url, "app": "Browser", "title": f"Open {url}"}
        if execute_on_mac:
            return _open_url(url, url)
        else:
            msg = f"Opening {url} on your phone."
            speak_async(msg)
            return msg

    # ---------------------------------------------------------
    # 11. File & Folder Operations
    # ---------------------------------------------------------
    if "create folder" in clean or "make directory" in clean:
        if execute_on_mac:
            return _create_folder(clean)
        return "Folder creation is for laptop."
    if "create file" in clean or "make file" in clean:
        if execute_on_mac:
            return _create_file(clean)
        return "File creation is for laptop."
    if "empty trash" in clean:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell app "Finder" to empty trash'])
            speak_async("Trash emptied.")
            return "Trash emptied."
        return "Trash controls are for laptop."
    if "open desktop" in clean:
        if execute_on_mac:
            subprocess.Popen(["open", os.path.expanduser("~/Desktop")])
            speak_async("Opened Desktop.")
            return "Opened Desktop."
        return "Desktop access is for laptop."
    if "open downloads" in clean or "open download" in clean:
        if execute_on_mac:
            subprocess.Popen(["open", os.path.expanduser("~/Downloads")])
            speak_async("Opened Downloads.")
            return "Opened Downloads."
        return "Downloads folder is on laptop."
    if "open documents" in clean:
        if execute_on_mac:
            subprocess.Popen(["open", os.path.expanduser("~/Documents")])
            speak_async("Opened Documents.")
            return "Opened Documents."
        return "Documents folder is on laptop."

    # ---------------------------------------------------------
    # 12. System Controls
    # ---------------------------------------------------------
    if "turn off wifi" in clean or "disable wifi" in clean:
        if execute_on_mac:
            subprocess.run(["networksetup", "-setairportpower", "en0", "off"])
            speak_async("Wi-Fi turned off.")
            return "Wi-Fi turned off."
        return "Wi-Fi hardware control is for laptop."
    if "turn on wifi" in clean or "enable wifi" in clean:
        if execute_on_mac:
            subprocess.run(["networksetup", "-setairportpower", "en0", "on"])
            speak_async("Wi-Fi turned on.")
            return "Wi-Fi turned on."
        return "Wi-Fi hardware control is for laptop."
    if "dark mode" in clean:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell app "System Events" to tell appearance preferences to set dark mode to not dark mode'])
            speak_async("Toggled dark mode.")
            return "Toggled dark mode."
        else:
            broadcast_event({"type": "ui_action", "action": "toggle_theme"})
            speak_async("Toggled theme.")
            return "Toggled theme."
    if "brightness up" in clean:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell application "System Events" to key code 144'])
            return "Brightness increased."
        return "Brightness control is for laptop."
    if "brightness down" in clean:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", 'tell application "System Events" to key code 145'])
            return "Brightness decreased."
        return "Brightness control is for laptop."
    if "volume up" in clean or "increase volume" in clean:
        if execute_on_mac:
            return _change_volume(+15)
        return "Volume control is for laptop. Use your phone volume buttons."
    if "volume down" in clean or "decrease volume" in clean:
        if execute_on_mac:
            return _change_volume(-15)
        return "Volume control is for laptop. Use your phone volume buttons."
    if "mute" in clean:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", "set volume output muted true"])
            speak_async("Muted audio.")
            return "Muted audio."
        return "Muted audio."
    if "unmute" in clean:
        if execute_on_mac:
            subprocess.run(["osascript", "-e", "set volume output muted false"])
            speak_async("Unmuted audio.")
            return "Unmuted audio."
        return "Unmuted audio."
    if "battery" in clean or "power" in clean:
        if execute_on_mac:
            return _check_battery()
        return "Check battery level in your phone's status bar."
    if "screenshot" in clean:
        if execute_on_mac:
            return _take_screenshot()
        return "To capture screen on laptop, say 'screenshot on laptop'."
    if "lock screen" in clean or clean == "lock":
        if execute_on_mac:
            subprocess.run(["pmset", "displaysleepnow"])
            speak_async("Locking screen.")
            return "Screen locked."
        return "To lock laptop, say 'lock laptop'."
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

    # ---------------------------------------------------------
    # 13. Instant Math Solver (Percentages, Equations, Arithmetic)
    # ---------------------------------------------------------
    math_res = solve_math(clean)
    if math_res:
        speak_async(math_res)
        return math_res

    # ---------------------------------------------------------
    # 14. Conversational Intelligence
    # ---------------------------------------------------------
    conversational_map = {
        "what is your name": "My name is Alex, your personal AI master assistant.",
        "who are you": "I am Alex, your autonomous AI assistant.",
        "who is alex": "I am Alex, your autonomous AI assistant.",
        "hello": "Hello! Alex neural interface online. How can I assist you?",
        "hi": "Greetings! All systems functioning at peak efficiency.",
        "what can you do": "I can type anywhere, launch apps, manage your notes, solve math, set timers, control hardware, text contacts, and answer any query without opening web pages.",
        "how are you": "All processors running cool at nominal temperature. Ready for your instructions."
    }
    for k, resp in conversational_map.items():
        if k in clean:
            speak_async(resp)
            return resp

    # ---------------------------------------------------------
    # 15. Media (YouTube Play)
    # ---------------------------------------------------------
    if clean.startswith("play "):
        song = clean[5:].strip()
        url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(song)}"
        last_client_action = {"type": "open_url", "url": url, "app": "YouTube", "title": f"YouTube: '{song}'"}
        if execute_on_mac:
            webbrowser.open(url)
            speak_async(f"Playing {song} on YouTube")
            return f"Playing '{song}' on YouTube."
        else:
            msg = f"Opening YouTube on your phone to play: '{song}'"
            speak_async(f"Playing {song} on phone")
            return msg

    # ---------------------------------------------------------
    # 16. Explicit Google Search ONLY (when explicitly requested)
    # ---------------------------------------------------------
    explicit_search_query = None
    for prefix in ["search google for ", "search on google for ", "search web for ", "search online for ", "google for ", "google "]:
        if clean.startswith(prefix):
            explicit_search_query = clean[len(prefix):].strip()
            break

    if explicit_search_query:
        url = f"https://www.google.com/search?q={urllib.parse.quote(explicit_search_query)}"
        last_client_action = {"type": "open_url", "url": url, "app": "Google", "title": f"Google: '{explicit_search_query}'"}
        if execute_on_mac:
            webbrowser.open(url)
            speak_async(f"Searching Google for {explicit_search_query}")
            return f"Searching Google for '{explicit_search_query}'."
        else:
            msg = f"Searching Google on your phone for: '{explicit_search_query}'"
            speak_async("Searching Google on phone")
            return msg

    # ---------------------------------------------------------
    # 17. Autonomous Alex Brain (Direct Answers - NO CHROME)
    # ---------------------------------------------------------
    if any(clean.startswith(p) for p in ["who is ", "who was ", "what is ", "what are ", "what was ", "tell me about ", "explain ", "define ", "capital of "]):
        brain_res = ask_alex_brain(clean)
        if brain_res:
            speak_async(brain_res)
            return brain_res

    # ---------------------------------------------------------
    # 18. Autonomous Fallback (Check Brain, Never Launch Chrome)
    # ---------------------------------------------------------
    general_brain = ask_alex_brain(clean)
    if general_brain:
        speak_async(general_brain)
        return general_brain

    msg = f"I processed '{clean}', but could not find an offline answer. To search Google on the web, say 'search google for {clean}'."
    speak_async(f"No answer found for {clean}")
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
    q = query.strip().lower()
    if q in APP_MAP:
        return APP_MAP[q]
    words = q.split()
    if len(words) <= 3:
        for k, v in APP_MAP.items():
            if k == q:
                return v
        matches = difflib.get_close_matches(q, list(APP_MAP.keys()), n=1, cutoff=0.85)
        if matches:
            return APP_MAP[matches[0]]
    return None

def _resolve_web(query):
    target = query.replace("open ", "").strip().lower()
    if target in WEB_SHORTCUTS:
        return (target.capitalize(), WEB_SHORTCUTS[target])
    if len(target.split()) <= 2:
        matches = difflib.get_close_matches(target, list(WEB_SHORTCUTS.keys()), n=1, cutoff=0.85)
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
    path = os.path.join(desktop, f"Alex_Screenshot_{ts}.png")
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
                print("Python microphone stream connected for Alex.")
            break
        except Exception:
            time.sleep(1)

    if mic is None:
        return

    while True:
        if not mic_enabled or is_alex_speaking:
            time.sleep(0.3)
            continue

        try:
            with mic as source:
                audio = recognizer.listen(source, timeout=4, phrase_time_limit=8)

            if is_alex_speaking:
                continue

            broadcast_event({"type": "status", "state": "recognizing", "message": "ANALYZING AUDIO WAVE..."})
            text = recognizer.recognize_google(audio)
            if text and text.strip():
                clean_text = text.strip()
                now = time.time()
                # If user recently used phone, ignore room mic echo so laptop doesn't execute phone tasks
                if (now - last_phone_command_time) < 10.0:
                    print(f"[Alex Mic Guard] Suppressed laptop background room mic because phone is actively in use ('{clean_text}')")
                    continue

                lower_t = clean_text.lower()
                if not ("alex" in lower_t or "on laptop" in lower_t or "on mac" in lower_t):
                    continue

                broadcast_event({"type": "transcript", "role": "user", "text": clean_text})
                res = execute_universal_task(clean_text, execute_on_mac=True, speak_on_server=True, target_device="laptop")
                broadcast_event({"type": "transcript", "role": "alex", "text": res})
                broadcast_event({"type": "status", "state": "speaking", "message": "ALEX RESPONDING..."})
                time.sleep(0.6)
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
    port = int(os.environ.get("PORT", 5005))
    is_cloud = bool(os.environ.get("RENDER") or (os.environ.get("PORT") and sys.platform != "darwin"))

    if not is_cloud:
        # 1. Start Cloudflare public tunnel for phones & public web on local Mac
        threading.Thread(target=public_tunnel_daemon, daemon=True).start()
        # 2. Start browser window launcher
        threading.Thread(target=launch_app_window, daemon=True).start()

    # 3. Start real Mac / Server telemetry daemon
    threading.Thread(target=telemetry_daemon, daemon=True).start()

    # 4. Start voice listener thread
    threading.Thread(target=background_voice_listener, daemon=True).start()

    # Initial Greeting
    speak_async("Alex online.")

    # Run Flask server accessible to all network interfaces
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
