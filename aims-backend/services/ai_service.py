import os
import base64
import json
import re
import cv2
from google import genai
from google.genai import types
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

# 모델 폴백 목록 (무료 할당량 순서대로)
GEMINI_MODELS = [
    "gemini-2.0-flash-lite",   # 경량, 별도 쿼터
    "gemini-1.5-flash",         # 구 모델, 다른 쿼터 풀
    "gemini-2.0-flash",         # 기존
]


class QuotaExceededError(Exception):
    """Raised when Gemini API encounters quota/auth errors."""
    pass


async def analyze_video_with_ai(
    video_path: str,
    analysis_id: str,
    process_name: Optional[str] = None,
    task_name: Optional[str] = None
) -> list[str]:
    """
    Gemini Vision으로 영상 프레임을 분석하여 각 단계별 동작 설명 생성.

    Returns:
        descriptions: list[str] - 각 단계 설명 텍스트 배열
    """
    frames = extract_frames_from_video(video_path, interval_sec=3)

    if not frames:
        raise ValueError("Could not extract frames from video")

    # generate_descriptions_with_gemini은 동기 함수이므로 asyncio.to_thread에서 실행
    import asyncio
    descriptions = await asyncio.to_thread(
        generate_descriptions_with_gemini, frames, process_name, task_name
    )
    return descriptions


def extract_frames_from_video(video_path: str, interval_sec: int = 3) -> list[dict]:
    """영상에서 일정 간격으로 프레임 추출. 최대 8프레임."""
    frames = []
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_interval = max(1, int(fps * interval_sec))

    current_frame = 0
    extracted = 0

    while current_frame < total_frames and extracted < 8:
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)
        ret, frame = cap.read()

        if not ret:
            break

        frame = cv2.resize(frame, (640, 480))
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frame_bytes = bytes(buffer)

        time_sec = current_frame / fps if fps > 0 else 0
        frames.append({
            "timestamp": format_time(time_sec),
            "frame_bytes": frame_bytes,
        })

        extracted += 1
        current_frame += frame_interval

    cap.release()
    return frames


def generate_descriptions_with_gemini(
    frames: list[dict],
    process_name: Optional[str],
    task_name: Optional[str]
) -> list[str]:
    """
    Gemini Vision으로 프레임 분석 후 단계별 설명 생성.
    모델 폴백: gemini-2.0-flash-lite → gemini-1.5-flash → gemini-2.0-flash
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise QuotaExceededError("GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.")

    client = genai.Client(api_key=api_key)

    prompt = f"""다음 제조 작업 영상 프레임들을 순서대로 분석해주세요.

프로세스: {process_name or 'N/A'}
작업명: {task_name or 'N/A'}

각 주요 작업 단계별로 **간결한 한국어 설명** 1~2문장을 작성해주세요.
단계 수는 영상 내용에 따라 2~7개로 자동 결정하세요.

응답은 반드시 아래 JSON 형식으로만 반환하세요 (JSON 외 텍스트 없이):
{{
  "descriptions": [
    "첫 번째 단계: 작업자가 부품을 꺼내 작업대에 배치합니다.",
    "두 번째 단계: 드라이버로 볼트를 조립합니다.",
    "세 번째 단계: 조립 완료 후 상태를 확인합니다."
  ]
}}"""

    # 이미지 파트 구성
    content_parts = []
    for frame in frames:
        # 이미지 파트 추가
        content_parts.append(
            types.Part.from_bytes(
                data=frame["frame_bytes"],
                mime_type="image/jpeg"
            )
        )
        # 타임스탐프 텍스트 추가
        content_parts.append(types.Part(text=f"[{frame['timestamp']}]"))

    # 프롬프트 추가
    content_parts.append(types.Part(text=prompt))

    # 모델 폴백 시도
    for model in GEMINI_MODELS:
        try:
            print(f"[Gemini] 모델 시도: {model}")
            response = client.models.generate_content(
                model=model,
                contents=content_parts,
            )
            response_text = response.text
            print(f"[Gemini] {model} 성공")

            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if not json_match:
                raise ValueError(f"Gemini response did not contain valid JSON: {response_text[:200]}")

            data = json.loads(json_match.group())
            return data.get("descriptions", [])

        except Exception as e:
            err_str = str(e).lower()
            is_quota_error = any(x in err_str for x in ["quota", "rate", "limit", "429", "resource_exhausted"])

            print(f"[Gemini] {model} 실패: {str(e)[:100]}")

            if is_quota_error and model != GEMINI_MODELS[-1]:
                # 할당량 에러 && 다음 모델이 있으면 계속
                continue

            # 마지막 모델이거나 할당량 아닌 오류
            if "api_key" in err_str or "api key" in err_str or "401" in err_str or "403" in err_str or "unauthorized" in err_str:
                raise QuotaExceededError(f"Gemini API 키 오류: {str(e)}")
            if "not found" in err_str or "404" in err_str:
                raise QuotaExceededError(f"Gemini 모델을 찾을 수 없습니다: {str(e)}")
            if is_quota_error:
                raise QuotaExceededError(f"Gemini API 할당량 초과: {str(e)}")

            raise

    # 모든 모델 실패
    raise QuotaExceededError("모든 Gemini 모델의 할당량이 초과되었습니다.")


def format_time(seconds: float) -> str:
    minutes = int(seconds) // 60
    secs = int(seconds) % 60
    return f"{minutes}:{secs:02d}"
