"""
영상 + 표준 작업 그래프 → Qwen2.5-VL(로컬) 매핑 → SOP를 DB에 저장.

데모 준비용 사전 계산 스크립트. 결과 SOP가 aims.db에 들어가면
관리자/근로자 UI가 기존 그대로 진짜 결과를 표시한다.

사용법 (.venv-vlm 로 실행):
    ../../.venv-vlm/bin/python precompute_sop.py \
        --video ../../drive-download-.../WIN_....mp4 \
        --graph work_graph_smartcar.json \
        --process-name "스마트 RC카 조립" \
        --task-name "바퀴 결합" \
        --frames 20 --publish
"""
import argparse
import os
import re
import sys
import json
import uuid
import shutil
import cv2

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # aims-backend
UPLOADS = os.path.join(BACKEND, "uploads")
# DB를 aims-backend/aims.db 절대경로로 고정 (실행 위치 무관)
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(BACKEND, 'aims.db')}"
sys.path.insert(0, BACKEND)

from database import SessionLocal, engine, Base       # noqa: E402
from models import SOP, Step, DetectedTool, Analysis, SOPStatus  # noqa: E402

MODEL = "mlx-community/Qwen2.5-VL-3B-Instruct-4bit"


def mmss(sec: float) -> str:
    return f"{int(sec)//60}:{int(sec)%60:02d}"


def extract_frames(video_path, n_frames):
    """균등 간격으로 n_frames 추출 → [(time_sec, bgr_frame), ...]"""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    out = []
    for i in range(n_frames):
        idx = int(total * i / n_frames)
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            out.append((idx / fps, frame))
    cap.release()
    return out, total / fps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--graph", required=True)
    ap.add_argument("--process-name", default="조립 공정")
    ap.add_argument("--task-name", default="작업")
    ap.add_argument("--frames", type=int, default=20)
    ap.add_argument("--publish", action="store_true", help="게시 상태로 저장 (근로자 UI 노출)")
    args = ap.parse_args()

    os.makedirs(UPLOADS, exist_ok=True)
    Base.metadata.create_all(bind=engine)

    graph = json.load(open(args.graph, encoding="utf-8"))
    nodes = {n["id"]: n for n in graph["nodes"]}
    valid = set(nodes)
    steps_txt = "\n".join(
        f"- {n['id']}: {n['name']} — {n['description']}" for n in graph["nodes"]
    )

    analysis_id = str(uuid.uuid4())[:8]
    print(f"[i] analysis_id = {analysis_id}")

    # 1) 영상 uploads로 복사 (UI 재생용)
    ext = os.path.splitext(args.video)[1].lower() or ".mp4"
    video_name = f"{analysis_id}{ext}"
    shutil.copy(args.video, os.path.join(UPLOADS, video_name))
    video_url = f"/uploads/{video_name}"

    # 2) 프레임 추출
    frames, duration = extract_frames(args.video, args.frames)
    print(f"[i] 프레임 {len(frames)}장, 길이 {duration:.1f}s")

    # 3) Qwen 로딩 + 프레임별 단계 매핑
    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config

    print("[i] Qwen 로딩...")
    model, processor = load(MODEL)
    config = load_config(MODEL)

    tmp_dir = os.path.join(os.path.dirname(__file__), "_frames_tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    per_frame = []
    for t, frame in frames:
        p = os.path.join(tmp_dir, f"t{t:07.2f}.jpg")
        cv2.imwrite(p, cv2.resize(frame, (640, 360)), [cv2.IMWRITE_JPEG_QUALITY, 80])
        prompt = f"""아래는 '{graph['product_name']}' 작업의 표준 단계 목록이다.

[표준 단계]
{steps_txt}

이 사진은 작업 영상의 {t:.0f}초 지점이다. 위 단계 중 어느 것인지 하나만 고르고 근거를 한국어로만 짧게 답하라.
반드시 형식만 출력: 단계ID | 근거"""
        formatted = apply_chat_template(processor, config, prompt, num_images=1)
        out = generate(model, processor, formatted, [p], max_tokens=100, temperature=0.1, verbose=False)
        text = (getattr(out, "text", None) or str(out)).strip()
        m = re.search(r"(S\d+)", text)
        sid = m.group(1) if m and m.group(1) in valid else None
        reason = text.split("|", 1)[1].strip() if "|" in text else text
        reason = re.sub(r"^근거\s*[:：]\s*", "", reason)  # 중복 접두어 제거
        per_frame.append({"time": t, "step_id": sid, "reason": reason})
        print(f"   {t:5.1f}s → {sid}  {reason[:35]}")

    # 4) 관측된 단계를 순서대로 시간 구간화 (연속 구간)
    observed = []
    for n in graph["nodes"]:
        times = [p["time"] for p in per_frame if p["step_id"] == n["id"]]
        if times:
            observed.append((n, min(times), next((p["reason"] for p in per_frame if p["step_id"] == n["id"]), "")))
    observed.sort(key=lambda x: x[0]["order"])

    # 5) DB 저장
    db = SessionLocal()
    try:
        sop_id = f"sop_{analysis_id}"
        sop = SOP(
            id=sop_id,
            process_name=args.process_name,
            task_name=args.task_name,
            status=SOPStatus.PUBLISHED if args.publish else SOPStatus.DRAFT,
            duration=mmss(duration),
            confidence=90,
            video_url=video_url,
            published_at=__import__("datetime").datetime.utcnow() if args.publish else None,
        )
        db.add(sop)
        db.flush()

        tool_steps = {}  # tool_name -> {icon, steps:[]}
        for i, (node, t_start, reason) in enumerate(observed):
            t_end = observed[i + 1][1] if i + 1 < len(observed) else duration
            # 단계 시작 프레임 썸네일
            thumb_url = None
            cap = cv2.VideoCapture(args.video)
            cap.set(cv2.CAP_PROP_POS_MSEC, t_start * 1000)
            ret, fr = cap.read()
            cap.release()
            if ret:
                tp = os.path.join(UPLOADS, f"thumb_{analysis_id}_step{node['order']}.jpg")
                cv2.imwrite(tp, fr, [cv2.IMWRITE_JPEG_QUALITY, 82])
                thumb_url = f"/uploads/thumb_{analysis_id}_step{node['order']}.jpg"

            desc = node["description"]
            if node.get("cautions"):
                desc += "\n\n[주의] " + " / ".join(node["cautions"])
            if node.get("hazards"):
                desc += "\n[위험] " + " / ".join(node["hazards"])
            if reason:
                desc += f"\n\n[영상 근거] {reason}"

            db.add(Step(
                id=f"step_{analysis_id}_{node['order']}",
                sop_id=sop_id,
                step_number=node["order"],
                name=node["name"],
                time_start=t_start,
                time_end=t_end,
                description=desc,
                confidence=90,
                thumbnail_url=thumb_url,
            ))
            # 공구 집계
            for tid in node.get("required_tools", []):
                tname = next((tt["name"] for tt in graph["tools"] if tt["id"] == tid), tid)
                tool_steps.setdefault(tname, []).append(node["order"])

        for tname, steps_involved in tool_steps.items():
            db.add(DetectedTool(
                id=f"tool_{analysis_id}_{tname}",
                sop_id=sop_id,
                name=tname,
                icon="🔧",
                confidence=95,
                steps_involved=sorted(set(steps_involved)),
            ))

        db.add(Analysis(
            id=f"analysis_{analysis_id}",
            sop_id=sop_id,
            detection_method="qwen2.5-vl + work_graph",
            total_frames_sampled=len(frames),
            debug_info={"work_graph_id": graph["work_graph_id"], "model": MODEL},
            raw_response={"frame_mapping": per_frame},
        ))
        db.commit()
        print(f"\n[✓] DB 저장 완료: {sop_id} ({'게시됨' if args.publish else '임시저장'})")
        print(f"    단계 {len(observed)}개, 공구 {len(tool_steps)}종")
        for node, t_start, _ in observed:
            print(f"    [{node['order']}] {node['name']}  ({mmss(t_start)}~)")
    except Exception as e:
        db.rollback()
        print(f"[!] DB 저장 실패: {e}")
        raise
    finally:
        db.close()
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
