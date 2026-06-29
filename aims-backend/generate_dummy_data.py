#!/usr/bin/env python3
"""
20개의 더미 SOP 데이터 생성 스크립트
각각 다른 공정과 이미지를 포함합니다.
"""
import cv2
import numpy as np
import os
from database import SessionLocal
from models import SOP, Step, DetectedTool, SOPStatus
from datetime import datetime, timedelta
import uuid

# 공정 데이터 (다양한 제조업)
PROCESSES = [
    ("전자제품 조립", "기판 납땜", "🔧"),
    ("자동차 부품", "부품 조립", "🚗"),
    ("식품 포장", "포장 작업", "📦"),
    ("섬유 제조", "원단 절단", "✂️"),
    ("플라스틱 성형", "금형 주입", "🏭"),
    ("금속 가공", "밀링 작업", "⚙️"),
    ("목재 가공", "목재 절단", "🪚"),
    ("유리 가공", "유리 절단", "🔨"),
    ("반도체 제조", "웨이퍼 처리", "💻"),
    ("화학 제조", "화학 혼합", "🧪"),
    ("의료용품", "제품 조립", "🏥"),
    ("전선 제조", "전선 감기", "⚡"),
    ("배터리 제조", "셀 조립", "🔋"),
    ("컨테이너 제조", "용기 성형", "📦"),
    ("펌프 제조", "펌프 조립", "💧"),
    ("밸브 제조", "밸브 조립", "🔒"),
    ("기어 제조", "기어 절삭", "⚙️"),
    ("로봇 조립", "부품 조립", "🤖"),
    ("태양광 패널", "셀 배치", "☀️"),
    ("풍력 부품", "블레이드 제조", "💨"),
]

COLORS = [
    ((30, 144, 255), (255, 255, 255)),    # Dodger Blue
    ((255, 69, 0), (255, 255, 255)),      # Red Orange
    ((50, 205, 50), (255, 255, 255)),     # Lime Green
    ((220, 20, 60), (255, 255, 255)),     # Crimson
    ((0, 191, 255), (255, 255, 255)),     # Deep Sky Blue
    ((255, 215, 0), (0, 0, 0)),            # Gold
    ((199, 21, 133), (255, 255, 255)),    # Medium Violet Red
    ((34, 139, 34), (255, 255, 255)),     # Forest Green
    ((255, 140, 0), (255, 255, 255)),     # Dark Orange
    ((72, 209, 204), (255, 255, 255)),    # Medium Turquoise
]


def create_dummy_image(process_name: str, task_name: str, sop_id: str, step_num: int, color_idx: int) -> str:
    """공정 이미지를 생성합니다."""
    try:
        os.makedirs("uploads", exist_ok=True)

        # 이미지 생성 (400x300)
        img = np.zeros((300, 400, 3), dtype=np.uint8)

        # 배경 색상
        bg_color, text_color = COLORS[color_idx % len(COLORS)]
        img[:] = bg_color

        # 그라데이션 추가
        for i in range(img.shape[0]):
            ratio = i / img.shape[0]
            img[i] = [int(c * (1 - ratio * 0.3)) for c in bg_color]

        # 공정명 텍스트
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 1.2
        thickness = 2

        # 공정명
        (text_width, text_height), baseline = cv2.getTextSize(
            process_name, font, font_scale, thickness
        )
        x = (img.shape[1] - text_width) // 2
        y = (img.shape[0] - text_height - 20)
        cv2.putText(img, process_name, (x, y), font, font_scale, text_color, thickness)

        # 작업명
        font_scale_sub = 0.8
        thickness_sub = 1
        (text_width2, text_height2), _ = cv2.getTextSize(
            task_name, font, font_scale_sub, thickness_sub
        )
        x2 = (img.shape[1] - text_width2) // 2
        y2 = y + text_height + 20
        cv2.putText(img, task_name, (x2, y2), font, font_scale_sub, text_color, thickness_sub)

        # 단계 표시
        step_text = f"Step {step_num}"
        (text_width3, text_height3), _ = cv2.getTextSize(
            step_text, font, 0.7, 1
        )
        x3 = (img.shape[1] - text_width3) // 2
        y3 = y2 + text_height2 + 15
        cv2.putText(img, step_text, (x3, y3), font, 0.7, text_color, 1)

        # 이미지 저장
        thumb_filename = f"thumb_{sop_id}_step{step_num}.jpg"
        thumb_path = os.path.join("uploads", thumb_filename)
        cv2.imwrite(thumb_path, img)

        return f"http://localhost:8000/uploads/{thumb_filename}"

    except Exception as e:
        print(f"Error creating image: {e}")
        return None


def create_dummy_sops():
    """20개의 더미 SOP 데이터를 생성합니다."""
    db = SessionLocal()
    try:
        print("\n🔨 Creating 20 dummy SOPs with images...")

        for idx, (process_name, task_name, icon) in enumerate(PROCESSES):
            sop_id = f"sop_dummy_{idx:02d}"

            # SOP 생성
            sop = SOP(
                id=sop_id,
                process_name=process_name,
                task_name=task_name,
                status=[SOPStatus.PUBLISHED, SOPStatus.PUBLISHED, SOPStatus.DRAFT][idx % 3],
                duration=f"0:{20 + (idx % 40):02d}",
                confidence=75 + (idx % 20),
                video_url=f"/uploads/dummy_{idx:02d}.mp4",
                transcript_text=f"{process_name} 작업 절차 {task_name}",
                transcript_language="ko",
                transcript_segments=[
                    {"start": 0.0, "end": 3.0, "text": f"{task_name}을(를) 시작합니다."},
                    {"start": 3.0, "end": 8.0, "text": f"먼저 준비 과정을 진행합니다."},
                ],
                created_at=datetime.utcnow() - timedelta(days=idx),
                published_at=datetime.utcnow() - timedelta(days=idx) if idx % 3 != 2 else None,
            )
            db.add(sop)
            db.flush()

            # 단계 추가 (2-4개)
            step_count = 2 + (idx % 3)
            step_duration = (20 + (idx % 40)) / step_count

            for step_num in range(1, step_count + 1):
                # 썸네일 이미지 생성
                thumbnail_url = create_dummy_image(
                    process_name, task_name, sop_id, step_num, idx
                )

                step = Step(
                    id=f"step_{sop_id}_{step_num}",
                    sop_id=sop_id,
                    step_number=step_num,
                    name=f"{task_name} - 단계 {step_num}",
                    time_start=(step_num - 1) * step_duration,
                    time_end=step_num * step_duration,
                    description=f"{process_name}의 {task_name} 단계 {step_num}입니다.",
                    confidence=75 + ((idx + step_num) % 20),
                    thumbnail_url=thumbnail_url,
                )
                db.add(step)

            # 공구 추가
            tools = [
                DetectedTool(
                    id=f"tool_{sop_id}_1",
                    sop_id=sop_id,
                    name=f"{process_name} 도구 1",
                    icon="🔧",
                    confidence=85 + (idx % 15),
                    steps_involved=list(range(1, step_count + 1)),
                    preview_url=None,
                ),
                DetectedTool(
                    id=f"tool_{sop_id}_2",
                    sop_id=sop_id,
                    name=f"{process_name} 도구 2",
                    icon="🛠️",
                    confidence=80 + (idx % 15),
                    steps_involved=list(range(1, step_count + 1)),
                    preview_url=None,
                ),
            ]
            for tool in tools:
                db.add(tool)

            print(f"  ✅ {idx + 1}. {process_name} - {task_name}")

        db.commit()
        print("\n✨ 20개의 더미 SOP가 생성되었습니다!")
        print("   - 각 SOP는 고유한 공정 이미지를 포함합니다")
        print("   - Published: 13개, Draft: 7개")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating dummy data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🎨 DUMMY DATA GENERATOR")
    print("=" * 60)
    create_dummy_sops()
    print("=" * 60)
