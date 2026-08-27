import cv2
import os

try:
    import mediapipe as mp
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
except (ImportError, AttributeError):
    mp = None
    mp_hands = None
    mp_drawing = None

# 프레임 샘플링 간격 (매 N프레임마다 분석)
FRAME_SAMPLE_INTERVAL = 3

# 최소/최대 단계 수
MIN_STEPS = 2
MAX_STEPS = 7

# 손바닥을 카메라 향해 이 시간(초) 이상 유지 시 단계 경계로 인식
PALM_HOLD_DURATION_SEC = 1.5

# 경계 감지 후 최소 대기 시간 (같은 동작 반복 방지)
BOUNDARY_COOLDOWN_SEC = 2.0

# 손바닥 감지 실패 시 폴백용 최소 단계 길이
MIN_STEP_DURATION_SEC = 2.0


def _seconds_to_mmss(seconds: float) -> str:
    """15.5 → '0:15'"""
    m = int(seconds) // 60
    s = int(seconds) % 60
    return f"{m}:{s:02d}"


def _is_palm_open_facing_camera(hand_landmarks, handedness_label: str) -> bool:
    """
    손바닥이 펼쳐져 카메라를 향하고 있는지 판단.

    조건 1: 손가락 3개 이상이 펴져 있어야 함 (주먹/구부린 손 오인식 방지)
    조건 2: 손바닥이 카메라를 향해야 함 (왼손/오른손 구분)
    """
    lm = hand_landmarks.landmark

    # 조건 1: 손가락 펴짐 체크 (tip.y < PIP.y 이면 펴짐)
    # y축: 위 = 0, 아래 = 1
    finger_extended = [
        lm[8].y < lm[6].y,    # 검지
        lm[12].y < lm[10].y,  # 중지
        lm[16].y < lm[14].y,  # 약지
        lm[20].y < lm[18].y,  # 소지
    ]
    if sum(finger_extended) < 3:
        return False

    # 조건 2: 손바닥 방향 (왼손/오른손 구분)
    # wrist(0) → index_MCP(5), wrist(0) → pinky_MCP(17)의 외적 z 성분
    v1 = (lm[5].x - lm[0].x, lm[5].y - lm[0].y)
    v2 = (lm[17].x - lm[0].x, lm[17].y - lm[0].y)
    cross_z = v1[0] * v2[1] - v1[1] * v2[0]

    if handedness_label == "Right":
        return cross_z < 0  # 오른손: 음수 = 손바닥
    else:  # "Left"
        return cross_z > 0  # 왼손: 양수 = 손바닥


def segment_steps_from_video(video_path: str, analysis_id: str = None) -> dict:
    """
    MediaPipe Hands로 손바닥 뒤집기(palm flip)를 감지하여 작업 단계를 분할.

    알고리즘:
    1. 프레임마다 손 랜드마크 추출
    2. 손바닥 방향 판단 (법선벡터 외적)
    3. 손바닥이 카메라를 향한 상태로 PALM_HOLD_DURATION_SEC 이상 유지 → 단계 경계
    4. 경계 기준으로 단계 배열 반환

    Returns:
        {
            "steps": [...],
            "stepBoundaries": [0.0, 5.2, 10.8, 15.0],
            "debugInfo": {"palmBoundaryCount": 2, "handDetectionRate": 72.0, "totalFramesSampled": 120, "detectionMethod": "palm_flip"}
        }
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        fallback = _make_fallback_steps(duration_sec=60, n_steps=3)
        return {
            "steps": fallback,
            "stepBoundaries": _steps_to_boundaries(fallback, 60),
            "debugInfo": {"palmBoundaryCount": 0, "handDetectionRate": 0.0, "totalFramesSampled": 0, "detectionMethod": "fallback"}
        }

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps

    # MediaPipe 미탑재/비활성 → 균등 분할 폴백 (손 감지 생략)
    if mp_hands is None:
        cap.release()
        n_steps = max(MIN_STEPS, min(MAX_STEPS, int(duration_sec / 10) or MIN_STEPS))
        fallback = _make_fallback_steps(duration_sec, n_steps)
        if analysis_id:
            step_len = duration_sec / n_steps
            for i, step in enumerate(fallback):
                step["thumbnailUrl"] = _create_thumbnail(video_path, i * step_len, i + 1, analysis_id)
        return {
            "steps": fallback,
            "stepBoundaries": _steps_to_boundaries(fallback, duration_sec),
            "debugInfo": {
                "palmBoundaryCount": 0,
                "handDetectionRate": 0.0,
                "totalFramesSampled": 0,
                "detectionMethod": "even_split",
            },
        }

    hand_detected_count = 0
    total_sampled_frames = 0

    # 손바닥 상태 추적
    in_palm_pose = False
    palm_facing_start = 0.0

    # 단계 경계 목록
    step_boundaries = [0.0]
    last_boundary_time = -BOUNDARY_COOLDOWN_SEC  # 첫 경계 바로 감지 가능하도록

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as hands:
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % FRAME_SAMPLE_INTERVAL == 0:
                total_sampled_frames += 1
                time_sec = frame_idx / fps
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = hands.process(rgb)

                if result.multi_hand_landmarks:
                    hand_detected_count += 1
                    # 첫 번째 손 사용
                    hand_lm = result.multi_hand_landmarks[0]
                    handedness = result.multi_handedness[0].classification[0].label  # "Left" or "Right"
                    palm_facing = _is_palm_open_facing_camera(hand_lm, handedness)

                    if palm_facing and not in_palm_pose:
                        # 손바닥이 카메라를 향하기 시작
                        in_palm_pose = True
                        palm_facing_start = time_sec

                    elif palm_facing and in_palm_pose:
                        # 손바닥 유지 중 → 충분히 오래 유지됐는지 체크
                        held_duration = time_sec - palm_facing_start
                        cooldown_ok = (time_sec - last_boundary_time) >= BOUNDARY_COOLDOWN_SEC

                        if held_duration >= PALM_HOLD_DURATION_SEC and cooldown_ok:
                            # 단계 경계 기록 (손바닥 시작 시점을 경계로 사용)
                            boundary_time = palm_facing_start
                            if boundary_time > step_boundaries[-1] + MIN_STEP_DURATION_SEC:
                                step_boundaries.append(boundary_time)
                                last_boundary_time = time_sec
                                in_palm_pose = False  # 한 번 감지 후 리셋 (cooldown 내 재감지 방지)

                    elif not palm_facing:
                        in_palm_pose = False

            frame_idx += 1

    cap.release()

    hand_detection_rate = (hand_detected_count / total_sampled_frames * 100) if total_sampled_frames > 0 else 0.0
    palm_boundary_count = len(step_boundaries) - 1  # 시작점(0.0) 제외

    step_boundaries.append(duration_sec)

    detection_method = "palm_flip"

    # 손이 거의 감지 안 된 경우 → 균등 분할 폴백
    if hand_detected_count < 5:
        n_steps = max(MIN_STEPS, min(MAX_STEPS, int(duration_sec / 10)))
        fallback = _make_fallback_steps(duration_sec, n_steps)
        return {
            "steps": fallback,
            "stepBoundaries": _steps_to_boundaries(fallback, duration_sec),
            "debugInfo": {
                "palmBoundaryCount": 0,
                "handDetectionRate": round(hand_detection_rate, 1),
                "totalFramesSampled": total_sampled_frames,
                "detectionMethod": "fallback"
            }
        }

    # 손이 감지됐지만 경계가 없는 경우 → 영상 전체를 단일 단계로 처리 후 균등 분할
    if len(step_boundaries) < MIN_STEPS + 1:
        # MIN_STEPS가 되도록 가장 긴 구간 반으로 나누기
        while len(step_boundaries) - 1 < MIN_STEPS:
            durations = [step_boundaries[i + 1] - step_boundaries[i] for i in range(len(step_boundaries) - 1)]
            max_idx = int(max(range(len(durations)), key=lambda i: durations[i]))
            mid = (step_boundaries[max_idx] + step_boundaries[max_idx + 1]) / 2
            step_boundaries.insert(max_idx + 1, mid)
        detection_method = "fallback"

    # 너무 많은 단계 → 짧은 구간 병합
    while len(step_boundaries) - 1 > MAX_STEPS:
        durations = [step_boundaries[i + 1] - step_boundaries[i] for i in range(len(step_boundaries) - 1)]
        min_idx = int(min(range(len(durations)), key=lambda i: durations[i]))
        step_boundaries.pop(min_idx + 1)

    # 결과 step 목록 생성
    steps = []
    n_steps = len(step_boundaries) - 1
    for i in range(n_steps):
        t_start = step_boundaries[i]
        t_end = step_boundaries[i + 1]

        # 단계 시작 시점 썸네일 생성
        thumbnail_url = None
        if analysis_id:
            thumbnail_url = _create_thumbnail(video_path, t_start, i + 1, analysis_id)

        steps.append({
            "stepNumber": i + 1,
            "name": f"단계 {i + 1}",
            "timeRange": f"{_seconds_to_mmss(t_start)} - {_seconds_to_mmss(t_end)}",
            "confidence": 88 if detection_method == "palm_flip" else 60,
            "thumbnailUrl": thumbnail_url,
        })

    return {
        "steps": steps,
        "stepBoundaries": step_boundaries,
        "debugInfo": {
            "palmBoundaryCount": palm_boundary_count,
            "handDetectionRate": round(hand_detection_rate, 1),
            "totalFramesSampled": total_sampled_frames,
            "detectionMethod": detection_method
        }
    }


def _steps_to_boundaries(steps: list[dict], duration_sec: float) -> list[float]:
    """step 목록에서 step_boundaries 추출 (폴백용)."""
    if not steps:
        return [0.0, duration_sec]
    boundaries = []
    for step in steps:
        time_range = step.get("timeRange", "")
        parts = time_range.split(" - ")
        if parts:
            start_str = parts[0].strip()
            try:
                m, s = start_str.split(":")
                boundaries.append(int(m) * 60 + int(s))
            except Exception:
                boundaries.append(0.0)
    boundaries.append(duration_sec)
    return boundaries


def _make_fallback_steps(duration_sec: float, n_steps: int) -> list[dict]:
    """손 감지 실패 시 균등 분할 폴백"""
    step_duration = duration_sec / n_steps
    steps = []
    for i in range(n_steps):
        t_start = i * step_duration
        t_end = (i + 1) * step_duration
        steps.append({
            "stepNumber": i + 1,
            "name": f"단계 {i + 1}",
            "timeRange": f"{_seconds_to_mmss(t_start)} - {_seconds_to_mmss(t_end)}",
            "confidence": 60,
            "thumbnailUrl": None,
        })
    return steps


def _create_thumbnail(video_path: str, target_time_sec: float, step_number: int, analysis_id: str) -> str:
    """
    지정된 시간의 프레임을 추출하여 손 랜드마크 오버레이 이미지 생성.

    Returns:
        URL path (예: "/uploads/thumb_abc123_step1.jpg") 또는 None (실패 시)
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        target_frame_idx = int(target_time_sec * fps)

        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame_idx)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            return None

        # 손 랜드마크 오버레이 (MediaPipe 사용 가능할 때만)
        if mp_hands is not None:
            with mp_hands.Hands(
                static_image_mode=True,
                max_num_hands=2,
                min_detection_confidence=0.5,
            ) as hands:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = hands.process(rgb)

                if result.multi_hand_landmarks:
                    for hand_landmarks in result.multi_hand_landmarks:
                        mp_drawing.draw_landmarks(
                            frame,
                            hand_landmarks,
                            mp_hands.HAND_CONNECTIONS,
                            mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                            mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2)
                        )

        os.makedirs("uploads", exist_ok=True)
        thumbnail_path = f"uploads/thumb_{analysis_id}_step{step_number}.jpg"
        cv2.imwrite(thumbnail_path, frame)

        return f"/uploads/thumb_{analysis_id}_step{step_number}.jpg"

    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return None
