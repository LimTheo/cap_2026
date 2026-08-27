"""
시드 SOP 생성 — Qwen 불필요, 어디서든 실행 가능.

seed/timelines/*.json (사람 검수 완료 SOP) + seed/videos/*.mp4 를 읽어
aims.db 에 SOP를 생성한다. opencv로 썸네일만 뽑고 나머지는 타임라인 그대로.
→ 애플맥이 아니어도, 모델 없어도, 인터넷 없어도 데모 SOP가 뜬다.

사용법 (백엔드 환경):
    python3 seed/seed_sops.py
"""
import os, sys, json, glob, shutil, cv2, datetime

SEED_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(SEED_DIR)
UPLOADS = os.path.join(BACKEND, "uploads")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(BACKEND, 'aims.db')}")
sys.path.insert(0, BACKEND)

from database import SessionLocal, engine, Base                         # noqa: E402
from models import SOP, Step, DetectedTool, Analysis, SOPStatus, User, UserRole  # noqa: E402

# 프론트엔드가 사용하는 데모 근로자 ID (worker HomePage의 CURRENT_USER_ID)
DEMO_WORKER_ID = "user_worker_00"


def ensure_demo_worker(db):
    """fresh clone에도 근로자 화면이 뜨도록 데모 근로자 계정 보장."""
    if not db.query(User).filter(User.id == DEMO_WORKER_ID).first():
        db.add(User(
            id=DEMO_WORKER_ID, username="demo_worker", name="데모 작업자",
            email="worker@aims.local", role=UserRole.WORKER, language="ko",
        ))
        db.flush()


def mmss(s):
    return f"{int(s)//60}:{int(s)%60:02d}"


def seed_one(db, tl):
    suffix = tl["sop_suffix"]
    sop_id = f"sop_seed_{suffix}"
    part_meta = {p["id"]: p for p in tl.get("parts", [])}
    tool_meta = {t["id"]: t for t in tl.get("tools", [])}
    item_meta = {**part_meta, **tool_meta}

    # 기존 시드 제거 후 재생성 (idempotent)
    old = db.query(SOP).filter(SOP.id == sop_id).first()
    if old:
        db.delete(old)
        db.flush()

    # 영상 → uploads 복사
    src_video = os.path.join(BACKEND, tl["video"])
    ext = os.path.splitext(src_video)[1].lower() or ".mp4"
    video_name = f"seed_{suffix}{ext}"
    os.makedirs(UPLOADS, exist_ok=True)
    shutil.copy(src_video, os.path.join(UPLOADS, video_name))
    video_url = f"/uploads/{video_name}"

    cap = cv2.VideoCapture(src_video)
    duration = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) / (cap.get(cv2.CAP_PROP_FPS) or 30)
    cap.release()

    db.add(SOP(
        id=sop_id, process_name=tl["process_name"], task_name=tl["task_name"],
        status=SOPStatus.PUBLISHED, duration=mmss(duration), confidence=92,
        video_url=video_url, published_at=datetime.datetime.utcnow(),
    ))
    db.flush()

    item_steps = {}
    for seg in tl["segments"]:
        # 단계 시작 프레임 썸네일
        thumb_url = None
        cap = cv2.VideoCapture(src_video)
        cap.set(cv2.CAP_PROP_POS_MSEC, ((seg["start"] + seg["end"]) / 2) * 1000)
        ret, frame = cap.read()
        cap.release()
        if ret:
            tp = os.path.join(UPLOADS, f"thumb_seed_{suffix}_step{seg['step_number']}.jpg")
            cv2.imwrite(tp, frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
            thumb_url = f"/uploads/thumb_seed_{suffix}_step{seg['step_number']}.jpg"

        desc = seg["description"]
        if seg.get("cautions"):
            desc += "\n\n[주의] " + " / ".join(seg["cautions"])
        if seg.get("hazards"):
            desc += "\n[위험] " + " / ".join(seg["hazards"])
        if seg.get("evidence"):
            desc += f"\n\n[영상 근거] {seg['evidence']}"

        db.add(Step(
            id=f"step_seed_{suffix}_{seg['step_number']}", sop_id=sop_id,
            step_number=seg["step_number"], name=seg["name"],
            time_start=float(seg["start"]), time_end=float(seg["end"]),
            description=desc, confidence=92, thumbnail_url=thumb_url,
        ))
        for iid in seg.get("parts", []) + seg.get("tools", []):
            if iid in item_meta:
                item_steps.setdefault(iid, []).append(seg["step_number"])

    for iid, steps in item_steps.items():
        m = item_meta[iid]
        db.add(DetectedTool(
            id=f"item_seed_{suffix}_{iid}", sop_id=sop_id, name=m["name"],
            icon=m.get("icon", "🔧"), confidence=95, steps_involved=sorted(set(steps)),
        ))

    db.add(Analysis(
        id=f"analysis_seed_{suffix}", sop_id=sop_id,
        detection_method="seed(작업자 타임라인)", total_frames_sampled=len(tl["segments"]),
    ))
    return sop_id, len(tl["segments"])


def main():
    Base.metadata.create_all(bind=engine)
    timelines = sorted(glob.glob(os.path.join(SEED_DIR, "timelines", "*.json")))
    if not timelines:
        print("[!] seed/timelines/ 에 타임라인 JSON이 없습니다.")
        return
    db = SessionLocal()
    try:
        ensure_demo_worker(db)
        for path in timelines:
            tl = json.load(open(path, encoding="utf-8"))
            sop_id, n = seed_one(db, tl)
            print(f"[✓] {sop_id} : {tl['task_name']} ({n}단계)")
        db.commit()
        print(f"\n시드 완료: {len(timelines)}개 SOP 게시됨")
    except Exception as e:
        db.rollback()
        print(f"[!] 실패: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
