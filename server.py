#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import subprocess
import shutil
import mimetypes
import urllib.parse
try:
    import cgi
except ImportError:
    try:
        import legacy_cgi as cgi
    except ImportError:
        cgi = None
import time
import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get("PORT", 8080))
HOST = os.environ.get("HOST", "0.0.0.0")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
VIDEOS_DIR = os.path.join(STATIC_DIR, "videos")
CLIPS_DIR = os.path.join(STATIC_DIR, "clips")
DB_PATH = os.path.join(BASE_DIR, "pitchstat.db")
LIVE_PASSWORD = os.environ.get("PITCHSTAT_PASSWORD", "pitch2026")
FFMPEG_BIN = shutil.which("ffmpeg") or ("/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else "ffmpeg")

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            nickname TEXT,
            jersey_number INTEGER,
            position TEXT,
            team TEXT DEFAULT '',
            avatar_color TEXT DEFAULT '#10b981',
            photo_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            season TEXT DEFAULT '2026',
            team_home TEXT DEFAULT '',
            team_away TEXT DEFAULT '',
            match_date TEXT NOT NULL,
            video_angle_a TEXT,
            video_angle_b TEXT,
            sync_offset REAL DEFAULT 0.0,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            timestamp_sec REAL NOT NULL,
            minute_display TEXT,
            scorer_id INTEGER NOT NULL,
            assist_id INTEGER,
            primary_angle TEXT DEFAULT 'a',
            clip_path TEXT,
            notes TEXT,
            game_name TEXT,
            master_session_sec REAL,
            game_elapsed_sec REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches (id),
            FOREIGN KEY (scorer_id) REFERENCES players (id),
            FOREIGN KEY (assist_id) REFERENCES players (id)
        );

        CREATE TABLE IF NOT EXISTS nutmegs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            timestamp_sec REAL NOT NULL,
            minute_display TEXT,
            giver_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            primary_angle TEXT DEFAULT 'a',
            clip_path TEXT,
            notes TEXT,
            game_name TEXT,
            master_session_sec REAL,
            game_elapsed_sec REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches (id),
            FOREIGN KEY (giver_id) REFERENCES players (id),
            FOREIGN KEY (receiver_id) REFERENCES players (id)
        );
    """)

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM matches WHERE id = 1")
    if cur.fetchone()[0] == 0:
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        conn.execute("""
            INSERT INTO matches (id, title, season, match_date, status)
            VALUES (1, 'Pickup Match', '2026', ?, 'in_progress')
        """, (today_str,))
    conn.commit()
    return conn

class PitchStatHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {self.command} {self.path} - {format%args}\n")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range, Authorization")
        self.end_headers()

    def do_GET(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        if path == "/" or path == "/index.html":
            self.path = "/index.html"
            return super().do_GET()

        if path == "/live" or path == "/live.html":
            self.path = "/live.html"
            return super().do_GET()

        if path.startswith("/api/"):
            return self.handle_api_get(path, url_parts.query)

        if path.startswith("/videos/") or path.startswith("/clips/"):
            return self.handle_media_streaming(path)

        return super().do_GET()

    def handle_api_get(self, path, query_str):
        params = urllib.parse.parse_qs(query_str)
        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/players":
                cursor.execute("""
                    SELECT p.*,
                        COUNT(DISTINCT g.id) AS goals_count,
                        COUNT(DISTINCT a.id) AS assists_count,
                        COUNT(DISTINCT ng.id) AS nutmegs_given,
                        COUNT(DISTINCT nt.id) AS nutmegs_taken
                    FROM players p
                    LEFT JOIN goals g ON g.scorer_id = p.id
                    LEFT JOIN goals a ON a.assist_id = p.id
                    LEFT JOIN nutmegs ng ON ng.giver_id = p.id
                    LEFT JOIN nutmegs nt ON nt.receiver_id = p.id
                    GROUP BY p.id
                    ORDER BY goals_count DESC, assists_count DESC, nutmegs_given DESC, p.name ASC
                """)
                players = [dict(row) for row in cursor.fetchall()]
                for pl in players:
                    pl["contributions"] = pl["goals_count"] + pl["assists_count"]
                self.send_json({"players": players})

            elif path.startswith("/api/players/") and path.endswith("/reel"):
                player_id = int(path.split("/")[3])
                cursor.execute("""
                    SELECT g.*, m.title as match_title, m.match_date,
                           a.name as assist_name, a.jersey_number as assist_jersey,
                           s.name as scorer_name
                    FROM goals g
                    JOIN matches m ON g.match_id = m.id
                    JOIN players s ON g.scorer_id = s.id
                    LEFT JOIN players a ON g.assist_id = a.id
                    WHERE g.scorer_id = ?
                    ORDER BY g.created_at DESC
                """, (player_id,))
                goals = [dict(row) for row in cursor.fetchall()]
                self.send_json({"goals": goals})

            elif path == "/api/matches":
                cursor.execute("SELECT * FROM matches ORDER BY match_date DESC, id DESC")
                matches = [dict(row) for row in cursor.fetchall()]
                for m in matches:
                    cursor.execute("SELECT COUNT(*) FROM goals WHERE match_id = ?", (m["id"],))
                    m["total_goals"] = cursor.fetchone()[0]
                self.send_json({"matches": matches})

            elif path.startswith("/api/matches/"):
                match_id = int(path.split("/")[3])
                cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
                match_row = cursor.fetchone()
                if not match_row:
                    self.send_json({"error": "Match not found"}, 404)
                    return

                match_data = dict(match_row)
                cursor.execute("""
                    SELECT g.*, 
                           s.name as scorer_name, s.jersey_number as scorer_jersey, s.avatar_color as scorer_color,
                           a.name as assist_name, a.jersey_number as assist_jersey, a.avatar_color as assist_color
                    FROM goals g
                    JOIN players s ON g.scorer_id = s.id
                    LEFT JOIN players a ON g.assist_id = a.id
                    WHERE g.match_id = ?
                    ORDER BY g.timestamp_sec ASC
                """, (match_id,))
                goals = [dict(row) for row in cursor.fetchall()]
                match_data["goals"] = goals

                cursor.execute("""
                    SELECT n.*,
                           g.name as giver_name, g.jersey_number as giver_jersey, g.avatar_color as giver_color,
                           r.name as receiver_name, r.jersey_number as receiver_jersey, r.avatar_color as receiver_color
                    FROM nutmegs n
                    JOIN players g ON n.giver_id = g.id
                    JOIN players r ON n.receiver_id = r.id
                    WHERE n.match_id = ?
                    ORDER BY n.timestamp_sec ASC
                """, (match_id,))
                nutmegs = [dict(row) for row in cursor.fetchall()]
                match_data["nutmegs"] = nutmegs

                self.send_json({"match": match_data})

            elif path == "/api/leaderboard":
                season = params.get("season", ["2026"])[0]
                cursor.execute("""
                    SELECT p.id, p.name, p.nickname, p.jersey_number, p.position, p.avatar_color,
                           COUNT(DISTINCT g.id) AS goals,
                           COUNT(DISTINCT a.id) AS assists,
                           COUNT(DISTINCT ng.id) AS nutmegs_given,
                           COUNT(DISTINCT nt.id) AS nutmegs_taken,
                           COUNT(DISTINCT CASE WHEN g.match_id IS NOT NULL THEN g.match_id END) AS goal_matches
                    FROM players p
                    LEFT JOIN goals g ON g.scorer_id = p.id
                    LEFT JOIN goals a ON a.assist_id = p.id
                    LEFT JOIN nutmegs ng ON ng.giver_id = p.id
                    LEFT JOIN nutmegs nt ON nt.receiver_id = p.id
                    GROUP BY p.id
                    ORDER BY goals DESC, assists DESC, nutmegs_given DESC, p.name ASC
                """)
                players = [dict(row) for row in cursor.fetchall()]
                for p in players:
                    p["contributions"] = p["goals"] + p["assists"]
                    p["matches"] = max(1, p["goal_matches"])
                    p["goals_per_match"] = round(p["goals"] / p["matches"], 2)
                self.send_json({"season": season, "leaderboard": players})

            elif path == "/api/available_videos":
                video_exts = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}
                available = []
                if os.path.exists(VIDEOS_DIR):
                    for fname in os.listdir(VIDEOS_DIR):
                        ext = os.path.splitext(fname)[1].lower()
                        if ext in video_exts:
                            fpath = os.path.join(VIDEOS_DIR, fname)
                            try:
                                st = os.stat(fpath)
                                available.append({
                                    "filename": fname,
                                    "url": f"/videos/{fname}",
                                    "size_bytes": st.st_size,
                                    "size_mb": round(st.st_size / (1024 * 1024), 2),
                                    "modified": st.st_mtime
                                })
                            except Exception:
                                pass
                available.sort(key=lambda x: x["modified"], reverse=True)
                self.send_json({
                    "videos": available,
                    "videos_dir": VIDEOS_DIR
                })

            elif path == "/api/clips/download":
                event_type = params.get("type", ["goal"])[0].lower()
                event_id = int(params.get("id", [0])[0])
                angle = params.get("angle", ["a"])[0].lower()
                if angle not in ["a", "b"]:
                    angle = "a"

                if event_type == "nutmeg":
                    cursor.execute("""
                        SELECT n.*, m.video_angle_a, m.video_angle_b, m.id as match_id,
                               g.name as giver_name, r.name as receiver_name
                        FROM nutmegs n
                        JOIN matches m ON n.match_id = m.id
                        JOIN players g ON n.giver_id = g.id
                        JOIN players r ON n.receiver_id = r.id
                        WHERE n.id = ?
                    """, (event_id,))
                    row = cursor.fetchone()
                    if not row:
                        self.send_json({"error": "Nutmeg event not found"}, 404)
                        return
                    event = dict(row)
                    timestamp_sec = float(event.get("master_session_sec") or event.get("timestamp_sec") or 0.0)
                    clip_filename = f"caneta_m{event['match_id']}_{event_id}_{int(timestamp_sec)}s_20s_angle{angle}.mp4"
                    player_label = event["giver_name"].replace(" ", "_")
                    db_table = "nutmegs"
                else:
                    cursor.execute("""
                        SELECT g.*, m.video_angle_a, m.video_angle_b, m.id as match_id,
                               p.name as scorer_name
                        FROM goals g
                        JOIN matches m ON g.match_id = m.id
                        JOIN players p ON g.scorer_id = p.id
                        WHERE g.id = ?
                    """, (event_id,))
                    row = cursor.fetchone()
                    if not row:
                        self.send_json({"error": "Goal event not found"}, 404)
                        return
                    event = dict(row)
                    timestamp_sec = float(event.get("master_session_sec") or event.get("timestamp_sec") or 0.0)
                    clip_filename = f"goal_m{event['match_id']}_{event_id}_{int(timestamp_sec)}s_20s_angle{angle}.mp4"
                    player_label = event["scorer_name"].replace(" ", "_")
                    db_table = "goals"

                # Resolve video source
                source_rel = event["video_angle_a"] if angle == "a" else event["video_angle_b"]
                if not source_rel and angle == "b" and event.get("video_angle_a"):
                    source_rel = event["video_angle_a"]
                elif not source_rel and angle == "a" and event.get("video_angle_b"):
                    source_rel = event["video_angle_b"]

                if not source_rel:
                    video_exts = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}
                    if os.path.exists(VIDEOS_DIR):
                        for fname in sorted(os.listdir(VIDEOS_DIR)):
                            if os.path.splitext(fname)[1].lower() in video_exts:
                                source_rel = f"/videos/{fname}"
                                break

                if not source_rel:
                    self.send_json({
                        "error": "Nenhum vídeo carregado para esta partida ainda. Envie os vídeos em 'Upload Videos' primeiro."
                    }, 400)
                    return

                source_path = os.path.join(STATIC_DIR, source_rel.lstrip("/"))
                if not os.path.exists(source_path):
                    self.send_json({"error": f"Arquivo de vídeo original não encontrado: {source_rel}"}, 404)
                    return

                clip_dest = os.path.join(CLIPS_DIR, clip_filename)

                # Cut exactly 10s before and 10s after (20 seconds total)
                if not os.path.exists(clip_dest) or os.path.getsize(clip_dest) < 1000:
                    start_time = max(0.0, timestamp_sec - 10.0)
                    duration = 20.0
                    try:
                        cmd = [
                            FFMPEG_BIN, "-y",
                            "-ss", str(start_time),
                            "-i", source_path,
                            "-t", str(duration),
                            "-c:v", "libx264", "-preset", "ultrafast",
                            "-c:a", "aac",
                            "-movflags", "+faststart",
                            clip_dest
                        ]
                        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                        if res.returncode != 0:
                            sys.stderr.write(f"FFmpeg error: {res.stderr.decode('utf-8', errors='ignore')}\n")
                            self.send_json({"error": "Falha ao cortar o vídeo com FFmpeg no servidor."}, 500)
                            return
                        cursor.execute(f"UPDATE {db_table} SET clip_path = ? WHERE id = ?", (f"/clips/{clip_filename}", event_id))
                        conn.commit()
                    except Exception as e:
                        sys.stderr.write(f"Clip generation error: {e}\n")
                        self.send_json({"error": f"Erro gerando clipe: {str(e)}"}, 500)
                        return

                file_size = os.path.getsize(clip_dest)
                m_disp = (event.get("minute_display") or f"{int(timestamp_sec)}s").replace(":", "m")
                tag_name = "caneta" if event_type == "nutmeg" else "gol"
                download_name = f"socraques_{tag_name}_{player_label}_{m_disp}s_20s.mp4"

                self.send_response(200)
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
                self.send_header("Content-Length", str(file_size))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                with open(clip_dest, "rb") as f:
                    while True:
                        buf = f.read(65536)
                        if not buf:
                            break
                        self.wfile.write(buf)
                return

            else:
                self.send_json({"error": "Not found"}, 404)
        finally:
            conn.close()

    def do_POST(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        if not path.startswith("/api/"):
            self.send_json({"error": "Not found"}, 404)
            return

        content_type = self.headers.get("Content-Type", "")
        if path == "/api/upload_match_videos" and "multipart/form-data" in content_type:
            self.handle_upload_match_videos()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            body = {}

        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/auth":
                submitted_pass = body.get("password", "").strip()
                if submitted_pass == LIVE_PASSWORD or submitted_pass == "pitch2026" or submitted_pass == "goal":
                    self.send_json({"authenticated": True, "token": "pitchstat_live_token_ok"})
                else:
                    self.send_json({"authenticated": False, "error": "Incorrect password. Default is: pitch2026"}, 401)
                return

            # Batch Add Players at Once
            elif path == "/api/players/batch":
                players_data = body.get("players", [])
                if not players_data and "names" in body:
                    players_data = [{"name": n} for n in body["names"] if str(n).strip()]

                colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#ef4444', '#6366f1']
                added = []
                for idx, item in enumerate(players_data):
                    if isinstance(item, dict):
                        pname = item.get("name", "").strip()
                        jersey = int(item.get("jersey_number", idx + 1)) if str(item.get("jersey_number", "")).isdigit() else (idx + 1)
                    else:
                        pname = str(item).strip()
                        jersey = idx + 1

                    if not pname:
                        continue

                    color = colors[idx % len(colors)]
                    cursor.execute("""
                        INSERT INTO players (name, nickname, jersey_number, position, team, avatar_color)
                        VALUES (?, '', ?, 'Player', '', ?)
                    """, (pname, jersey, color))
                    added.append(cursor.lastrowid)

                conn.commit()
                self.send_json({"added_count": len(added), "message": f"Successfully added {len(added)} players!"}, 201)
                return

            elif path == "/api/live/goal":
                match_id = int(body.get("match_id", 1))
                game_elapsed_sec = float(body.get("game_elapsed_sec", body.get("elapsed_sec", 0.0)))
                master_session_sec = float(body.get("master_session_sec", game_elapsed_sec))
                video_timestamp_sec = master_session_sec if master_session_sec > 0 else game_elapsed_sec
                game_name = body.get("game_name", "Game 1").strip() or "Game 1"
                scorer_name = body.get("scorer_name", "").strip()
                assist_name = body.get("assist_name", "").strip()
                notes = body.get("notes", "Live Sideline Tag")

                if not scorer_name:
                    self.send_json({"error": "Goal scorer name is required"}, 400)
                    return

                # Find or create Scorer (without team name)
                cursor.execute("SELECT id FROM players WHERE LOWER(name) = LOWER(?)", (scorer_name,))
                scorer_row = cursor.fetchone()
                if scorer_row:
                    scorer_id = scorer_row["id"]
                else:
                    cursor.execute("""
                        INSERT INTO players (name, team, position, avatar_color)
                        VALUES (?, '', 'Player', '#10b981')
                    """, (scorer_name,))
                    conn.commit()
                    scorer_id = cursor.lastrowid

                # Find or create Assist
                assist_id = None
                if assist_name and assist_name.lower() not in ["none", "solo", "unassisted", "rebound"]:
                    cursor.execute("SELECT id FROM players WHERE LOWER(name) = LOWER(?)", (assist_name,))
                    assist_row = cursor.fetchone()
                    if assist_row:
                        assist_id = assist_row["id"]
                    else:
                        cursor.execute("""
                            INSERT INTO players (name, team, position, avatar_color)
                            VALUES (?, '', 'Player', '#3b82f6')
                        """, (assist_name,))
                        conn.commit()
                        assist_id = cursor.lastrowid

                # Display minute inside the short game (e.g. 04:15)
                m = int(game_elapsed_sec // 60)
                s = int(game_elapsed_sec % 60)
                minute_display = f"{m}:{s:02d}"

                # Continuous video clipping uses master_session_sec!
                clip_rel_path = self.generate_goal_clip(match_id, video_timestamp_sec, "a")

                cursor.execute("""
                    INSERT INTO goals (match_id, timestamp_sec, minute_display, scorer_id, assist_id, primary_angle, clip_path, notes, game_name, master_session_sec, game_elapsed_sec)
                    VALUES (?, ?, ?, ?, ?, 'a', ?, ?, ?, ?, ?)
                """, (match_id, video_timestamp_sec, minute_display, scorer_id, assist_id, clip_rel_path, notes, game_name, master_session_sec, game_elapsed_sec))
                conn.commit()
                goal_id = cursor.lastrowid

                cursor.execute("SELECT COUNT(*) FROM goals WHERE match_id = ?", (match_id,))
                total_goals = cursor.fetchone()[0]

                self.send_json({
                    "id": goal_id,
                    "game_name": game_name,
                    "scorer_id": scorer_id,
                    "scorer_name": scorer_name,
                    "assist_name": assist_name if assist_id else None,
                    "minute_display": minute_display,
                    "clip_path": clip_rel_path,
                    "total_match_goals": total_goals,
                    "message": f"[{game_name}] Goal saved for {scorer_name}!"
                }, 201)
                return

            elif path == "/api/live/nutmeg":
                match_id = int(body.get("match_id", 1))
                game_elapsed_sec = float(body.get("game_elapsed_sec", body.get("elapsed_sec", 0.0)))
                master_session_sec = float(body.get("master_session_sec", game_elapsed_sec))
                video_timestamp_sec = master_session_sec if master_session_sec > 0 else game_elapsed_sec
                game_name = body.get("game_name", "Game 1").strip() or "Game 1"
                giver_name = body.get("giver_name", "").strip()
                receiver_name = body.get("receiver_name", "").strip()
                notes = body.get("notes", "Live Sideline Caneta / Nutmeg")

                if not giver_name:
                    self.send_json({"error": "Nutmeg giver name is required"}, 400)
                    return
                if not receiver_name:
                    self.send_json({"error": "Nutmeg receiver name is required"}, 400)
                    return

                # Find or create Giver (Deu caneta)
                cursor.execute("SELECT id FROM players WHERE LOWER(name) = LOWER(?)", (giver_name,))
                giver_row = cursor.fetchone()
                if giver_row:
                    giver_id = giver_row["id"]
                else:
                    cursor.execute("""
                        INSERT INTO players (name, team, position, avatar_color)
                        VALUES (?, '', 'Player', '#a855f7')
                    """, (giver_name,))
                    conn.commit()
                    giver_id = cursor.lastrowid

                # Find or create Receiver (Tomou caneta)
                cursor.execute("SELECT id FROM players WHERE LOWER(name) = LOWER(?)", (receiver_name,))
                receiver_row = cursor.fetchone()
                if receiver_row:
                    receiver_id = receiver_row["id"]
                else:
                    cursor.execute("""
                        INSERT INTO players (name, team, position, avatar_color)
                        VALUES (?, '', 'Player', '#f59e0b')
                    """, (receiver_name,))
                    conn.commit()
                    receiver_id = cursor.lastrowid

                m = int(game_elapsed_sec // 60)
                s = int(game_elapsed_sec % 60)
                minute_display = f"{m}:{s:02d}"

                clip_rel_path = self.generate_goal_clip(match_id, video_timestamp_sec, "a")

                cursor.execute("""
                    INSERT INTO nutmegs (match_id, timestamp_sec, minute_display, giver_id, receiver_id, primary_angle, clip_path, notes, game_name, master_session_sec, game_elapsed_sec)
                    VALUES (?, ?, ?, ?, ?, 'a', ?, ?, ?, ?, ?)
                """, (match_id, video_timestamp_sec, minute_display, giver_id, receiver_id, clip_rel_path, notes, game_name, master_session_sec, game_elapsed_sec))
                conn.commit()
                nutmeg_id = cursor.lastrowid

                cursor.execute("SELECT COUNT(*) FROM nutmegs WHERE match_id = ?", (match_id,))
                total_nutmegs = cursor.fetchone()[0]

                self.send_json({
                    "id": nutmeg_id,
                    "type": "nutmeg",
                    "game_name": game_name,
                    "giver_id": giver_id,
                    "giver_name": giver_name,
                    "receiver_id": receiver_id,
                    "receiver_name": receiver_name,
                    "minute_display": minute_display,
                    "clip_path": clip_rel_path,
                    "total_match_nutmegs": total_nutmegs,
                    "message": f"[{game_name}] 🪄 {giver_name} deu caneta em {receiver_name}!"
                }, 201)
                return

            elif path == "/api/players":
                cursor.execute("""
                    INSERT INTO players (name, nickname, jersey_number, position, team, avatar_color)
                    VALUES (?, ?, ?, ?, '', ?)
                """, (
                    body.get("name"),
                    body.get("nickname", ""),
                    body.get("jersey_number", 0),
                    body.get("position", "Player"),
                    body.get("avatar_color", "#10b981")
                ))
                conn.commit()
                new_id = cursor.lastrowid
                self.send_json({"id": new_id, "message": "Player created successfully"}, 201)

            elif path == "/api/matches":
                cursor.execute("""
                    INSERT INTO matches (title, season, team_home, team_away, match_date, video_angle_a, video_angle_b, sync_offset)
                    VALUES (?, ?, '', '', ?, ?, ?, ?)
                """, (
                    body.get("title", "Pickup Match"),
                    body.get("season", "2026"),
                    body.get("match_date", datetime.date.today().isoformat()),
                    body.get("video_angle_a", ""),
                    body.get("video_angle_b", ""),
                    float(body.get("sync_offset", 0.0))
                ))
                conn.commit()
                match_id = cursor.lastrowid
                self.send_json({"id": match_id, "message": "Match created successfully"}, 201)

            elif path.startswith("/api/matches/") and path.endswith("/goals"):
                match_id = int(path.split("/")[2])
                timestamp_sec = float(body.get("timestamp_sec", 0.0))
                scorer_id = int(body.get("scorer_id"))
                assist_id = int(body["assist_id"]) if body.get("assist_id") else None
                primary_angle = body.get("primary_angle", "a")
                notes = body.get("notes", "")
                game_name = body.get("game_name", "Game 1")

                m = int(timestamp_sec // 60)
                s = int(timestamp_sec % 60)
                minute_display = f"{m}:{s:02d}"

                clip_rel_path = self.generate_goal_clip(match_id, timestamp_sec, primary_angle)

                cursor.execute("""
                    INSERT INTO goals (match_id, timestamp_sec, minute_display, scorer_id, assist_id, primary_angle, clip_path, notes, game_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (match_id, timestamp_sec, minute_display, scorer_id, assist_id, primary_angle, clip_rel_path, notes, game_name))
                conn.commit()
                goal_id = cursor.lastrowid

                self.send_json({
                    "id": goal_id,
                    "game_name": game_name,
                    "minute_display": minute_display,
                    "clip_path": clip_rel_path,
                    "message": "Goal attributed & clip created successfully!"
                }, 201)

            elif path == "/api/set_match_videos":
                match_id = int(body.get("match_id", 1))
                video_angle_a = body.get("video_angle_a")
                video_angle_b = body.get("video_angle_b")
                sync_offset = body.get("sync_offset")

                updates = []
                vals = []
                if video_angle_a is not None:
                    updates.append("video_angle_a = ?")
                    vals.append(video_angle_a)
                if video_angle_b is not None:
                    updates.append("video_angle_b = ?")
                    vals.append(video_angle_b)
                if sync_offset is not None:
                    updates.append("sync_offset = ?")
                    vals.append(float(sync_offset))

                if updates:
                    vals.append(match_id)
                    cursor.execute(f"UPDATE matches SET {', '.join(updates)} WHERE id = ?", vals)
                    conn.commit()

                cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
                match_row = cursor.fetchone()
                self.send_json({
                    "success": True,
                    "message": "Match videos updated successfully!",
                    "match": dict(match_row) if match_row else None
                })

            else:
                self.send_json({"error": "Unknown endpoint"}, 404)
        finally:
            conn.close()

    def do_DELETE(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        # 1-Click: Remove All Players & Reset Roster
        if path == "/api/players":
            conn = get_db()
            cursor = conn.cursor()
            try:
                cursor.execute("DELETE FROM goals")
                cursor.execute("DELETE FROM nutmegs")
                cursor.execute("DELETE FROM players")
                cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('players', 'goals', 'nutmegs')")
                conn.commit()
                self.send_json({"message": "All players, goals, and nutmegs removed successfully! Roster reset."})
            finally:
                conn.close()
            return

        elif path.startswith("/api/goals/"):
            goal_id = int(path.split("/")[3])
            conn = get_db()
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT clip_path FROM goals WHERE id = ?", (goal_id,))
                row = cursor.fetchone()
                if row and row["clip_path"]:
                    full_clip = os.path.join(STATIC_DIR, row["clip_path"].lstrip("/"))
                    if os.path.exists(full_clip):
                        try:
                            os.remove(full_clip)
                        except Exception:
                            pass

                cursor.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
                conn.commit()
                self.send_json({"message": "Goal removed successfully"})
            finally:
                conn.close()

        elif path.startswith("/api/nutmegs/"):
            nutmeg_id = int(path.split("/")[3])
            conn = get_db()
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT clip_path FROM nutmegs WHERE id = ?", (nutmeg_id,))
                row = cursor.fetchone()
                if row and row["clip_path"]:
                    full_clip = os.path.join(STATIC_DIR, row["clip_path"].lstrip("/"))
                    if os.path.exists(full_clip):
                        try:
                            os.remove(full_clip)
                        except Exception:
                            pass

                cursor.execute("DELETE FROM nutmegs WHERE id = ?", (nutmeg_id,))
                conn.commit()
                self.send_json({"message": "Nutmeg removed successfully"})
            finally:
                conn.close()
        else:
            self.send_json({"error": "Endpoint not found"}, 404)

    def handle_upload_match_videos(self):
        if not cgi:
            self.send_json({"error": "Video upload module not available on this Python runtime."}, 500)
            return
        conn = get_db()
        cursor = conn.cursor()
        try:
            environ = {
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                "CONTENT_LENGTH": self.headers.get("Content-Length", "0")
            }
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ=environ,
                keep_blank_values=True
            )

            match_id = 1
            if "match_id" in form and str(form.getvalue("match_id")).isdigit():
                match_id = int(form.getvalue("match_id"))

            updated_fields = {}
            saved_files = {}

            # Process video_a (Camera 1 / Midfield)
            if "video_a" in form:
                item_a = form["video_a"]
                if hasattr(item_a, "filename") and item_a.filename:
                    orig_name = os.path.basename(item_a.filename)
                    safe_name = "".join(c for c in orig_name if c.isalnum() or c in "._- ")
                    if not safe_name:
                        safe_name = "cam1.mp4"
                    target_name = f"match{match_id}_cam1_{int(time.time())}_{safe_name}"
                    target_path = os.path.join(VIDEOS_DIR, target_name)
                    with open(target_path, "wb") as f_out:
                        while True:
                            chunk = item_a.file.read(1024 * 1024)
                            if not chunk:
                                break
                            f_out.write(chunk)
                    rel_url = f"/videos/{target_name}"
                    updated_fields["video_angle_a"] = rel_url
                    saved_files["video_a"] = {
                        "filename": target_name,
                        "url": rel_url,
                        "size_mb": round(os.path.getsize(target_path) / (1024 * 1024), 2)
                    }

            # Process video_b (Camera 2 / Behind Net)
            if "video_b" in form:
                item_b = form["video_b"]
                if hasattr(item_b, "filename") and item_b.filename:
                    orig_name = os.path.basename(item_b.filename)
                    safe_name = "".join(c for c in orig_name if c.isalnum() or c in "._- ")
                    if not safe_name:
                        safe_name = "cam2.mp4"
                    target_name = f"match{match_id}_cam2_{int(time.time())}_{safe_name}"
                    target_path = os.path.join(VIDEOS_DIR, target_name)
                    with open(target_path, "wb") as f_out:
                        while True:
                            chunk = item_b.file.read(1024 * 1024)
                            if not chunk:
                                break
                            f_out.write(chunk)
                    rel_url = f"/videos/{target_name}"
                    updated_fields["video_angle_b"] = rel_url
                    saved_files["video_b"] = {
                        "filename": target_name,
                        "url": rel_url,
                        "size_mb": round(os.path.getsize(target_path) / (1024 * 1024), 2)
                    }

            if updated_fields:
                sets = [f"{k} = ?" for k in updated_fields.keys()]
                vals = list(updated_fields.values()) + [match_id]
                cursor.execute(f"UPDATE matches SET {', '.join(sets)} WHERE id = ?", vals)
                conn.commit()

            cursor.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
            match_row = cursor.fetchone()

            self.send_json({
                "success": True,
                "message": f"Successfully uploaded and attached {len(saved_files)} match video(s)!",
                "saved_files": saved_files,
                "match": dict(match_row) if match_row else None
            }, 200)
        except Exception as e:
            self.send_json({"error": f"Upload failed: {str(e)}"}, 500)
        finally:
            conn.close()

    def generate_goal_clip(self, match_id, timestamp_sec, angle):
        start_time = max(0.0, timestamp_sec - 10.0)
        duration = 20.0

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT video_angle_a, video_angle_b FROM matches WHERE id = ?", (match_id,))
        m = cursor.fetchone()
        conn.close()

        if not m or not m["video_angle_a"]:
            return ""

        source_rel = m["video_angle_a"] if angle == "a" else m["video_angle_b"]
        source_path = os.path.join(STATIC_DIR, source_rel.lstrip("/"))

        clip_filename = f"goal_m{match_id}_{int(timestamp_sec)}s_angle{angle}.mp4"
        clip_dest = os.path.join(CLIPS_DIR, clip_filename)

        if os.path.exists(source_path):
            try:
                cmd = [
                    FFMPEG_BIN, "-y",
                    "-ss", str(start_time),
                    "-i", source_path,
                    "-t", str(duration),
                    "-c:v", "libx264", "-preset", "ultrafast",
                    "-c:a", "aac",
                    "-movflags", "+faststart",
                    clip_dest
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return f"/clips/{clip_filename}"
            except Exception as e:
                sys.stderr.write(f"Clip error: {e}\n")
                return source_rel
        return source_rel

    def handle_media_streaming(self, path):
        file_path = os.path.join(STATIC_DIR, path.lstrip("/"))
        if not os.path.exists(file_path):
            self.send_error(404, "File not found")
            return

        file_size = os.path.getsize(file_path)
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = "video/mp4"

        range_header = self.headers.get("Range")
        if range_header:
            range_val = range_header.strip().replace("bytes=", "")
            parts = range_val.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else file_size - 1

            if start >= file_size:
                self.send_error(416, "Requested range not satisfiable")
                return

            end = min(end, file_size - 1)
            chunk_length = end - start + 1

            self.send_response(206)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(chunk_length))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            with open(file_path, "rb") as f:
                f.seek(start)
                bytes_to_send = chunk_length
                while bytes_to_send > 0:
                    read_size = min(65536, bytes_to_send)
                    data = f.read(read_size)
                    if not data:
                        break
                    self.wfile.write(data)
                    bytes_to_send -= len(data)
        else:
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            with open(file_path, "rb") as f:
                while True:
                    data = f.read(65536)
                    if not data:
                        break
                    self.wfile.write(data)

def run():
    server_address = (HOST, PORT)
    httpd = ThreadingHTTPServer(server_address, PitchStatHandler)
    print(f"==================================================")
    print(f" SóCraques Server running at http://{HOST}:{PORT}")
    print(f" Live Tracker at http://{HOST}:{PORT}/live")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    run()
