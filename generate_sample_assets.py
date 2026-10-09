#!/usr/bin/env python3
import os
import subprocess
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, "static", "videos")
CLIPS_DIR = os.path.join(BASE_DIR, "static", "clips")
DB_PATH = os.path.join(BASE_DIR, "pitchstat.db")

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

def generate_video(filename, cam_type):
    target = os.path.join(VIDEOS_DIR, filename)
    if os.path.exists(target) and os.path.getsize(target) > 50000:
        print(f"[OK] {filename} already exists.")
        return target

    print(f"Generating realistic soccer test video: {filename} ({cam_type})...")
    # Camera 1 (Sideline) has green tone, Camera 2 (Behind Goal) has dark emerald tone
    bg = "0x1b4332" if cam_type == "cam1" else "0x081c15"
    badge_color = "red@0.8" if cam_type == "cam1" else "dodgerblue@0.8"
    
    # Use testsrc for synchronized digital clock timer + drawbox for soccer pitch
    filter_chain = (
        f"drawbox=x=40:y=40:w=1200:h=640:color=white@0.5:t=4,"
        f"drawbox=x=638:y=40:w=4:h=640:color=white@0.5:t=fill,"
        f"drawbox=x=40:y=220:w=180:h=280:color=white@0.5:t=3,"
        f"drawbox=x=1060:y=220:w=180:h=280:color=white@0.5:t=3,"
        f"drawbox=x=560:y=280:w=160:h=160:color=white@0.3:t=2,"
        f"drawbox=x=40:y=40:w=320:h=50:color={badge_color}:t=fill"
    )

    cmd = [
        "/opt/homebrew/bin/ffmpeg", "-y",
        "-f", "lavfi", "-i", f"testsrc=size=1280x720:rate=30",
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", "60",
        "-vf", filter_chain,
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "64k",
        "-movflags", "+faststart",
        target
    ]
    subprocess.run(cmd, check=True)
    print(f"[DONE] Created {target}")
    return target

def init_db():
    print("Initializing SQLite database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nickname TEXT,
        jersey_number INTEGER,
        position TEXT,
        team TEXT NOT NULL,
        avatar_color TEXT DEFAULT '#10b981',
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        season TEXT DEFAULT '2026',
        team_home TEXT NOT NULL,
        team_away TEXT NOT NULL,
        match_date TEXT NOT NULL,
        video_angle_a TEXT,
        video_angle_b TEXT,
        sync_offset REAL DEFAULT 0.0,
        status TEXT DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches (id),
        FOREIGN KEY (scorer_id) REFERENCES players (id),
        FOREIGN KEY (assist_id) REFERENCES players (id)
    )
    """)

    cursor.execute("SELECT COUNT(*) FROM players")
    if cursor.fetchone()[0] == 0:
        sample_players = [
            ("Mateo Rossi", "El Matador", 9, "Striker", "Sunday Rovers", "#ef4444"),
            ("Liam Gallagher", "Flash", 7, "Winger", "Sunday Rovers", "#f59e0b"),
            ("Carlos Mendez", "El Mago", 10, "Midfielder", "Sunday Rovers", "#10b981"),
            ("Sami Al-Mansoor", "The Rock", 4, "Defender", "Sunday Rovers", "#3b82f6"),
            ("Lucas Silva", "Pelezinho", 11, "Winger", "Dynamo FC", "#8b5cf6"),
            ("Noah Schmidt", "Der Bomber", 9, "Striker", "Dynamo FC", "#ec4899"),
            ("Julien Dubois", "Maestro", 8, "Midfielder", "Dynamo FC", "#06b6d4"),
            ("Alex Petrov", "The Wall", 1, "Goalkeeper", "Sunday Rovers", "#64748b")
        ]
        cursor.executemany("""
            INSERT INTO players (name, nickname, jersey_number, position, team, avatar_color)
            VALUES (?, ?, ?, ?, ?, ?)
        """, sample_players)
        print("Seeded sample players.")

    cursor.execute("SELECT COUNT(*) FROM matches")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO matches (title, season, team_home, team_away, match_date, video_angle_a, video_angle_b, sync_offset)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "Sunday Cup: Rovers vs Dynamo",
            "2026",
            "Sunday Rovers",
            "Dynamo FC",
            "2026-10-04",
            "/videos/match1_angle_a.mp4",
            "/videos/match1_angle_b.mp4",
            0.0
        ))
        match_id = cursor.lastrowid
        print(f"Seeded sample match (id={match_id}).")

        sample_goals = [
            (match_id, 15.2, "15'", 1, 3, "a", "Curled top right corner after through ball"),
            (match_id, 38.5, "39'", 2, None, "b", "Solo counter-attack finish across keeper")
        ]
        cursor.executemany("""
            INSERT INTO goals (match_id, timestamp_sec, minute_display, scorer_id, assist_id, primary_angle, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, sample_goals)
        print("Seeded sample goals.")

    conn.commit()
    conn.close()
    print("[DONE] Database ready.")

if __name__ == "__main__":
    generate_video("match1_angle_a.mp4", "cam1")
    generate_video("match1_angle_b.mp4", "cam2")
    init_db()
