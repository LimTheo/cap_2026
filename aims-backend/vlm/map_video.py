"""
표준 작업 그래프 + 영상 프레임 → 구조화된 SOP 생성 (Qwen2.5-VL 로컬).

핵심: VLM에게 자유서술을 시키지 않고, 표준 작업 그래프의 단계 중
'이 프레임이 어느 단계인가'만 고르게 하는 제약된 매핑 방식.
→ 근거(evidence)와 선후관계가 그래프로 보장됨.

사용법:
    ../../.venv-vlm/bin/python map_video.py <그래프.json> <프레임폴더> [출력.json]
"""
import sys
import os
import re
import json
import time

MODEL = "mlx-community/Qwen2.5-VL-3B-Instruct-4bit"


def frame_time(fname: str) -> float:
    """파일명 f04_17.3s.jpg → 17.3"""
    m = re.search(r"_(\d+\.?\d*)s", fname)
    return float(m.group(1)) if m else 0.0


def mmss(sec: float) -> str:
    return f"{int(sec)//60}:{int(sec)%60:02d}"


def main():
    graph_path = sys.argv[1] if len(sys.argv) > 1 else "work_graph_smartcar.json"
    frames_dir = sys.argv[2] if len(sys.argv) > 2 else "frames_demo"
    out_path = sys.argv[3] if len(sys.argv) > 3 else "sop_result.json"

    graph = json.load(open(graph_path, encoding="utf-8"))
    nodes = {n["id"]: n for n in graph["nodes"]}
    steps_txt = "\n".join(
        f"- {n['id']}: {n['name']} — {n['description']}" for n in graph["nodes"]
    )
    valid_ids = set(nodes.keys())

    frames = sorted(
        [f for f in os.listdir(frames_dir) if f.lower().endswith((".jpg", ".png"))],
        key=frame_time,
    )
    print(f"[i] 그래프: {graph['product_name']} ({len(nodes)}단계)")
    print(f"[i] 프레임 {len(frames)}장 매핑 시작...")

    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config

    model, processor = load(MODEL)
    config = load_config(MODEL)

    per_frame = []
    t0 = time.time()
    for f in frames:
        t = frame_time(f)
        prompt = f"""아래는 '{graph['product_name']}' 작업의 표준 단계 목록이다.

[표준 단계]
{steps_txt}

지금 사진은 작업 영상의 {t:.0f}초 지점이다. 위 단계 중 어느 것인지 하나만 고르고 근거를 한국어로만 짧게 답하라.
반드시 다음 형식만 출력: 단계ID | 근거"""
        formatted = apply_chat_template(processor, config, prompt, num_images=1)
        out = generate(
            model, processor, formatted, [os.path.join(frames_dir, f)],
            max_tokens=120, temperature=0.1, verbose=False,
        )
        text = (getattr(out, "text", None) or str(out)).strip()
        m = re.search(r"(S\d+)", text)
        sid = m.group(1) if m and m.group(1) in valid_ids else None
        reason = text.split("|", 1)[1].strip() if "|" in text else text
        per_frame.append({"time": t, "step_id": sid, "reason": reason})
        print(f"   {t:5.1f}s → {sid or '?'}  {reason[:40]}")

    # 연속 프레임을 단계별 시간 구간으로 집계
    steps_out = []
    for n in graph["nodes"]:
        sid = n["id"]
        times = [p["time"] for p in per_frame if p["step_id"] == sid]
        if not times:
            continue
        evid = next((p["reason"] for p in per_frame if p["step_id"] == sid), "")
        steps_out.append({
            "step_id": sid,
            "step_number": n["order"],
            "name": n["name"],
            "description": n["description"],
            "time_range": f"{mmss(min(times))} - {mmss(max(times))}",
            "required_tools": [t for t in graph["tools"] if t["id"] in n["required_tools"]],
            "cautions": n["cautions"],
            "hazards": n["hazards"],
            "evidence": evid,
            "observed_frame_count": len(times),
        })
    steps_out.sort(key=lambda s: s["step_number"])

    result = {
        "product_name": graph["product_name"],
        "work_graph_id": graph["work_graph_id"],
        "generated_by": f"Qwen2.5-VL local (MLX) + 표준 작업 그래프 매핑",
        "steps": steps_out,
        "frame_mapping": per_frame,
    }
    json.dump(result, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"\n[✓] 완료 ({time.time()-t0:.1f}s) → {out_path}")
    print("=" * 55)
    for s in steps_out:
        tools = ", ".join(t["name"] for t in s["required_tools"]) or "없음"
        print(f"[{s['step_number']}] {s['name']}  ({s['time_range']})")
        print(f"    공구: {tools} | 근거: {s['evidence'][:45]}")
    print("=" * 55)


if __name__ == "__main__":
    main()
