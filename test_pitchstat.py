#!/usr/bin/env python3
import os
import sys
import json
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "pitchstat.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")

def run_tests():
    print("=== Testing PitchStat Core Database and Calculations ===")
    assert os.path.exists(DB_PATH), "Database does not exist"
    assert os.path.exists(os.path.join(STATIC_DIR, "videos", "match1_angle_a.mp4")), "Angle A video missing"
    assert os.path.exists(os.path.join(STATIC_DIR, "videos", "match1_angle_b.mp4")), "Angle B video missing"

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Test Player retrieval & cumulative stats
    cursor.execute("""
        SELECT p.*,
            COUNT(DISTINCT g.id) AS goals_count,
            COUNT(DISTINCT a.id) AS assists_count
        FROM players p
        LEFT JOIN goals g ON g.scorer_id = p.id
        LEFT JOIN goals a ON a.assist_id = p.id
        GROUP BY p.id
        ORDER BY goals_count DESC, assists_count DESC
    """)
    players = [dict(r) for r in cursor.fetchall()]
    print(f"[TEST 1] Loaded {len(players)} players.")
    assert len(players) >= 8, "Expected at least 8 players"
    
    top_scorer = players[0]
    print(f"Top Scorer: {top_scorer['name']} with {top_scorer['goals_count']} goals, {top_scorer['assists_count']} assists.")

    # 2. Test Match & Goals
    cursor.execute("SELECT * FROM matches WHERE id = 1")
    match = dict(cursor.fetchone())
    print(f"[TEST 2] Match loaded: {match['title']} ({match['match_date']})")

    cursor.execute("""
        SELECT g.*, s.name as scorer_name, a.name as assist_name
        FROM goals g
        JOIN players s ON g.scorer_id = s.id
        LEFT JOIN players a ON g.assist_id = a.id
        WHERE g.match_id = 1
        ORDER BY g.timestamp_sec ASC
    """)
    goals = [dict(r) for r in cursor.fetchall()]
    print(f"[TEST 3] Loaded {len(goals)} goals for Match 1:")
    for g in goals:
        print(f"  ⚽ Minute: {g['minute_display']} | Game: {g['game_name'] or 'Game 1'} | Scorer: {g['scorer_name']} | Assist: {g['assist_name'] or 'Solo'}")

    # 3. Test FFmpeg 15-second clipping
    print("[TEST 4] Testing 15s Highlight Clip Generation via FFmpeg...")
    import server
    clip_result = server.PitchStatHandler.generate_goal_clip(None, 1, 15.2, "a")
    print(f"Generated clip relative path: {clip_result}")
    full_clip_path = os.path.join(STATIC_DIR, clip_result.lstrip("/"))
    assert os.path.exists(full_clip_path), f"Clip file was not created: {full_clip_path}"
    clip_size = os.path.getsize(full_clip_path)
    print(f"Clip created successfully! File size: {clip_size} bytes ({round(clip_size/1024, 1)} KB)")

    # 4. Test Short Games & Game Names
    print("[TEST 5] Testing Short Games (Game 1, Game 2)...")
    cursor.execute("SELECT DISTINCT game_name FROM goals")
    game_names = [r[0] for r in cursor.fetchall() if r[0]]
    print(f"Active game rounds logged: {game_names}")

    conn.close()
    print("\n✅ ALL PITCHSTAT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
