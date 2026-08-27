"""
Qwen2.5-VL 로컬(MLX) 최소 동작 테스트.

목적: 네 맥(M2 Pro)에서 Qwen2.5-VL이 이미지를 이해하고 답하는지 확인.
사용법:
    ../../.venv-vlm/bin/python test_qwen.py <이미지경로>
    (이미지 생략 시 자동으로 테스트용 이미지 생성)

최초 실행 시 모델(~2-3GB, 3B 4bit)을 자동 다운로드한다.
"""
import sys
import os
import time

# 3B 4bit MLX 변환 모델 (커뮤니티 공식 변환본)
MODEL = "mlx-community/Qwen2.5-VL-3B-Instruct-4bit"


def make_test_image(path: str):
    """테스트용 간단 이미지 생성 (빨간 사각형 + 파란 원)."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        import numpy as np, cv2
        img = np.full((480, 640, 3), 240, dtype=np.uint8)
        cv2.rectangle(img, (100, 150), (250, 300), (0, 0, 200), -1)
        cv2.circle(img, (450, 240), 80, (200, 0, 0), -1)
        cv2.imwrite(path, img)
        return
    img = Image.new("RGB", (640, 480), (240, 240, 240))
    d = ImageDraw.Draw(img)
    d.rectangle([100, 150, 250, 300], fill=(200, 0, 0))
    d.ellipse([370, 160, 530, 320], fill=(0, 0, 200))
    img.save(path)


def main():
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        image_path = os.path.join(os.path.dirname(__file__), "_test_image.jpg")
        if not os.path.exists(image_path):
            print(f"[i] 테스트 이미지 생성: {image_path}")
            make_test_image(image_path)

    print(f"[i] 이미지: {image_path}")
    print(f"[i] 모델: {MODEL}")
    print("[i] 모델 로딩 중... (최초엔 다운로드로 수 분 걸릴 수 있음)")

    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config

    t0 = time.time()
    model, processor = load(MODEL)
    config = load_config(MODEL)
    print(f"[i] 로딩 완료 ({time.time() - t0:.1f}s)")

    prompt = "이 이미지에 어떤 도형들이 보이나요? 색깔과 함께 한국어로 간단히 설명해줘."

    formatted = apply_chat_template(processor, config, prompt, num_images=1)

    t1 = time.time()
    output = generate(
        model, processor, formatted, [image_path],
        max_tokens=200, temperature=0.2, verbose=False,
    )
    dt = time.time() - t1

    # mlx_vlm generate는 GenerationResult 객체를 반환 (.text 속성)
    if isinstance(output, str):
        text = output
    else:
        text = getattr(output, "text", None) or str(output)

    print("\n" + "=" * 50)
    print("Qwen2.5-VL 응답:")
    print("=" * 50)
    print(text)
    print("=" * 50)
    gen_tps = getattr(output, "generation_tps", None)
    print(f"\n[i] 추론 시간: {dt:.1f}s" + (f" ({gen_tps:.1f} tok/s)" if gen_tps else ""))
    print("[✓] 로컬 VLM 동작 확인 완료")


if __name__ == "__main__":
    main()
