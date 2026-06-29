import cv2
import os
from ultralytics import YOLO

# YOLOv8n 사전학습 모델 (COCO 80-class)
# 최초 실행 시 자동 다운로드 (~6MB)
_model = None

def _get_model():
    global _model
    if _model is None:
        _model = YOLO('yolov8n.pt')
    return _model


# COCO 클래스 중 제조 현장에서 사용 가능한 공구/물체 매핑
# 나중에 커스텀 학습 모델로 교체 가능
TOOL_CLASS_MAP = {
    "scissors": {"name": "가위", "icon": "✂️"},
    "knife": {"name": "칼/커터", "icon": "🔪"},
    "cell phone": {"name": "측정기기", "icon": "📱"},
    "bottle": {"name": "오일/세척제", "icon": "🧴"},
    "cup": {"name": "용기", "icon": "🥤"},
    "book": {"name": "매뉴얼", "icon": "📖"},
    "laptop": {"name": "노트북", "icon": "💻"},
    "mouse": {"name": "마우스", "icon": "🖱️"},
    "remote": {"name": "리모컨", "icon": "📟"},
    "toothbrush": {"name": "브러시", "icon": "🪥"},
    "baseball bat": {"name": "막대/봉", "icon": "🔧"},
    "tennis racket": {"name": "판/패드", "icon": "🔧"},
    "hammer": {"name": "해머", "icon": "🔨"},
    "wrench": {"name": "렌치", "icon": "🔩"},
    "screwdriver": {"name": "드라이버", "icon": "🔧"},
    "pliers": {"name": "플라이어", "icon": "🔧"},
    "drill": {"name": "드릴", "icon": "🔧"},
}

# YOLO가 감지하는 프레임 간격 (매 프레임마다 하면 너무 느림)
FRAME_SAMPLE_INTERVAL = 10


def _get_step_number(timestamp: float, step_boundaries: list[float]) -> int:
    """타임스탬프를 단계 번호로 변환."""
    for i in range(len(step_boundaries) - 1):
        if step_boundaries[i] <= timestamp < step_boundaries[i + 1]:
            return i + 1
    return len(step_boundaries) - 1


def detect_tools_from_video(video_path: str, analysis_id: str = None, step_boundaries: list[float] = None) -> list[dict]:
    """
    YOLO로 영상에서 공구를 감지하여 반환.

    Args:
        step_boundaries: MediaPipe 단계 경계 시간 목록 (없으면 균등 3분할 폴백)

    Returns:
        [{"name": "드라이버", "steps": [1, 2], "icon": "🔧", "confidence": 87, "previewUrl": "/uploads/tool_abc_드라이버.jpg"}, ...]
    """
    model = _get_model()
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps

    # step_boundaries가 없으면 균등 3분할 폴백
    if not step_boundaries or len(step_boundaries) < 2:
        step_boundaries = [duration_sec * i / 3 for i in range(4)]

    # 공구별 감지된 타임스탬프 및 정보 기록
    tool_data: dict[str, dict] = {}  # {tool_name: {"timestamps": [...], "confidences": [...], "frame": ...}}

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % FRAME_SAMPLE_INTERVAL == 0:
            results = model(frame, verbose=False)
            current_time_sec = frame_idx / fps

            for box in results[0].boxes:
                label = model.names[int(box.cls)]
                confidence = float(box.conf)

                if label in TOOL_CLASS_MAP and confidence >= 0.4:
                    tool_info = TOOL_CLASS_MAP[label]
                    tool_key = tool_info["name"]

                    if tool_key not in tool_data:
                        tool_data[tool_key] = {
                            "timestamps": [],
                            "confidences": [],
                            "frame": frame.copy(),  # 첫 감지 프레임 저장 (썸네일용)
                            "box": box,
                        }

                    tool_data[tool_key]["timestamps"].append(current_time_sec)
                    tool_data[tool_key]["confidences"].append(confidence)

        frame_idx += 1

    cap.release()

    if not tool_data:
        return []

    # uploads 폴더 생성
    os.makedirs("uploads", exist_ok=True)

    results_list = []
    for tool_name, data in tool_data.items():
        # 어느 단계에서 감지됐는지 계산 (실제 step_boundaries 사용)
        steps_detected = set()
        for t in data["timestamps"]:
            step_num = _get_step_number(t, step_boundaries)
            steps_detected.add(step_num)

        # 신뢰도 평균 계산
        avg_confidence = sum(data["confidences"]) / len(data["confidences"])
        avg_confidence_percent = int(avg_confidence * 100)

        # TOOL_CLASS_MAP에서 icon 찾기
        icon = "🔧"
        for coco_label, info in TOOL_CLASS_MAP.items():
            if info["name"] == tool_name:
                icon = info["icon"]
                break

        # 공구 감지 프레임에 바운딩박스 그려서 저장 (analysis_id 있을 때만)
        preview_url = None
        if analysis_id:
            preview_url = _create_tool_preview(data["frame"], data["box"], tool_name, analysis_id, model)

        results_list.append({
            "name": tool_name,
            "steps": sorted(steps_detected),
            "icon": icon,
            "confidence": avg_confidence_percent,
            "previewUrl": preview_url,
        })

    return results_list


def _create_tool_preview(frame, box, tool_name: str, analysis_id: str, model) -> str:
    """
    YOLO 감지 프레임에 바운딩박스를 그려 미리보기 이미지 생성.

    Returns:
        URL path (예: "/uploads/tool_abc123_드라이버.jpg") 또는 None (실패 시)
    """
    try:
        frame_copy = frame.copy()

        # 바운딩박스 좌표 추출
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        # 바운딩박스 그리기 (녹색)
        cv2.rectangle(frame_copy, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # 라벨 텍스트 추가
        cv2.putText(frame_copy, tool_name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # 이미지 저장
        preview_path = f"uploads/tool_{analysis_id}_{tool_name}.jpg"
        cv2.imwrite(preview_path, frame_copy)

        return f"/uploads/tool_{analysis_id}_{tool_name}.jpg"

    except Exception as e:
        print(f"Error creating tool preview: {e}")
        return None
