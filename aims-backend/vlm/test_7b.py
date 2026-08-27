"""7B vs 3B 비교: 그래프 매핑 품질 + 속도 + 피크 메모리."""
import json, time, os
import mlx.core as mx
from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template
from mlx_vlm.utils import load_config

MODEL = "mlx-community/Qwen2.5-VL-7B-Instruct-4bit"

graph = json.load(open("work_graph_smartcar.json", encoding="utf-8"))
steps_txt = "\n".join(f"- {n['id']}: {n['name']} — {n['description']}" for n in graph["nodes"])

print(f"[i] 로딩: {MODEL} (최초 다운로드 ~5GB)")
t0 = time.time()
model, processor = load(MODEL)
config = load_config(MODEL)
print(f"[i] 로딩 완료 {time.time()-t0:.1f}s")

for img in ["frames_demo/f00_00.0s.jpg", "frames_demo/f04_17.3s.jpg", "frames_demo/f10_43.3s.jpg"]:
    t = os.path.basename(img)
    prompt = f"""아래는 '{graph['product_name']}' 작업의 표준 단계 목록이다.

[표준 단계]
{steps_txt}

이 사진이 위 단계 중 어느 것인지 하나만 고르고 근거를 한국어로만 짧게 답하라.
반드시 형식만 출력: 단계ID | 근거"""
    formatted = apply_chat_template(processor, config, prompt, num_images=1)
    t1 = time.time()
    out = generate(model, processor, formatted, [img], max_tokens=120, temperature=0.1, verbose=False)
    dt = time.time() - t1
    text = (getattr(out, "text", None) or str(out)).strip()
    peak = mx.get_peak_memory() / 1e9
    tps = getattr(out, "generation_tps", 0)
    print(f"\n[{t}] ({dt:.1f}s, {tps:.0f} tok/s, 피크메모리 {peak:.1f}GB)")
    print("  →", text)

print(f"\n[✓] 7B 테스트 완료 · 피크 메모리 {mx.get_peak_memory()/1e9:.1f}GB / 32GB")
