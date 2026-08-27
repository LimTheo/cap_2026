"""
작업자 제공 타임라인 + Qwen 구간 묘사 → 세밀 SOP를 DB에 저장.

시간 경계는 사람이 제공(정확), 각 구간의 설명은 Qwen이 대표 프레임을 보고 생성.
VLM이 못 하는 세밀 분할(바퀴 1/2/3/4)을 사람 타임라인으로 해결.

사용법:
    ../../.venv-vlm/bin/python timeline_to_sop.py \
        --video <mp4> --timeline timeline_smartcar.json \
        --process-name "스마트 RC카 조립" --task-name "바퀴 결합" \
        --analysis-id <id> [--publish]
"""
import argparse, os, sys, json, uuid, shutil, cv2

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(BACKEND, "uploads")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(BACKEND, 'aims.db')}"
sys.path.insert(0, BACKEND)

from database import SessionLocal, engine, Base                         # noqa: E402
from models import SOP, Step, DetectedTool, Analysis, SOPStatus         # noqa: E402
import datetime                                                          # noqa: E402

MODEL = "mlx-community/Qwen2.5-VL-3B-Instruct-4bit"


def mmss(s):
    return f"{int(s)//60}:{int(s)%60:02d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--process-name", default="조립 공정")
    ap.add_argument("--task-name", default="작업")
    ap.add_argument("--analysis-id", default=None)
    ap.add_argument("--publish", action="store_true")
    args = ap.parse_args()

    os.makedirs(UPLOADS, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    tl = json.load(open(args.timeline, encoding="utf-8"))
    part_meta = {p["id"]: p for p in tl.get("parts", [])}
    tool_meta = {t["id"]: t for t in tl.get("tools", [])}
    item_meta = {**part_meta, **tool_meta}

    analysis_id = args.analysis_id or str(uuid.uuid4())[:8]
    ext = os.path.splitext(args.video)[1].lower() or ".mp4"
    dst = os.path.join(UPLOADS, f"{analysis_id}{ext}")
    if os.path.abspath(args.video) != os.path.abspath(dst):
        shutil.copy(args.video, dst)
    video_url = f"/uploads/{analysis_id}{ext}"

    cap = cv2.VideoCapture(args.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    duration = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) / fps
    cap.release()

    print(f"[i] Qwen 로딩...")
    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config
    model, processor = load(MODEL)
    config = load_config(MODEL)

    tmp = os.path.join(os.path.dirname(__file__), "_tl_tmp")
    os.makedirs(tmp, exist_ok=True)

    db = SessionLocal()
    try:
        sop_id = f"sop_{analysis_id}"
        db.add(SOP(
            id=sop_id, process_name=args.process_name, task_name=args.task_name,
            status=SOPStatus.PUBLISHED if args.publish else SOPStatus.DRAFT,
            duration=mmss(duration), confidence=92, video_url=video_url,
            published_at=datetime.datetime.utcnow() if args.publish else None,
        ))
        db.flush()

        item_steps = {}
        for seg in tl["segments"]:
            mid = (seg["start"] + seg["end"]) / 2
            cap = cv2.VideoCapture(args.video)
            cap.set(cv2.CAP_PROP_POS_MSEC, mid * 1000)
            ret, frame = cap.read()
            cap.release()

            # 구간 대표 프레임을 Qwen이 묘사 (근거)
            evidence = ""
            thumb_url = None
            if ret:
                fp = os.path.join(tmp, f"s{seg['step_number']}.jpg")
                cv2.imwrite(fp, cv2.resize(frame, (640, 360)), [cv2.IMWRITE_JPEG_QUALITY, 80])
                prompt = f"이 사진은 '{seg['name']}' 작업 장면이다. 작업자가 무엇을 하고 있는지 한국어로만 한 문장으로 설명하라. 한자·영어 금지."
                formatted = apply_chat_template(processor, config, prompt, num_images=1)
                out = generate(model, processor, formatted, [fp], max_tokens=80, temperature=0.2, verbose=False)
                evidence = (getattr(out, "text", None) or str(out)).strip()
                tp = os.path.join(UPLOADS, f"thumb_{analysis_id}_step{seg['step_number']}.jpg")
                cv2.imwrite(tp, frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
                thumb_url = f"/uploads/thumb_{analysis_id}_step{seg['step_number']}.jpg"

            desc = seg["description"]
            if seg.get("cautions"):
                desc += "\n\n[주의] " + " / ".join(seg["cautions"])
            if seg.get("hazards"):
                desc += "\n[위험] " + " / ".join(seg["hazards"])
            if evidence:
                desc += f"\n\n[영상 근거] {evidence}"

            db.add(Step(
                id=f"step_{analysis_id}_{seg['step_number']}", sop_id=sop_id,
                step_number=seg["step_number"], name=seg["name"],
                time_start=float(seg["start"]), time_end=float(seg["end"]),
                description=desc, confidence=92, thumbnail_url=thumb_url,
            ))
            for iid in seg.get("parts", []) + seg.get("tools", []):
                if iid in item_meta:
                    item_steps.setdefault(iid, []).append(seg["step_number"])
            print(f"   [{seg['step_number']}] {seg['name']} ({mmss(seg['start'])}~{mmss(seg['end'])}) : {evidence[:35]}")

        for iid, steps in item_steps.items():
            m = item_meta[iid]
            db.add(DetectedTool(
                id=f"item_{analysis_id}_{iid}", sop_id=sop_id, name=m["name"],
                icon=m.get("icon", "🔧"), confidence=95, steps_involved=sorted(set(steps)),
            ))

        db.add(Analysis(
            id=f"analysis_{analysis_id}", sop_id=sop_id,
            detection_method="timeline(human) + Qwen2.5-VL(구간묘사)",
            total_frames_sampled=len(tl["segments"]),
            debug_info={"timeline": tl.get("work_graph_id"), "model": MODEL},
        ))
        db.commit()
        print(f"\n[✓] 세밀 SOP 저장: {sop_id} ({len(tl['segments'])}단계, {'게시' if args.publish else '임시저장'})")
    except Exception as e:
        db.rollback()
        print(f"[!] 실패: {e}")
        raise
    finally:
        db.close()
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
