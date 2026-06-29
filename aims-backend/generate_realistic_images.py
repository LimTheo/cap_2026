#!/usr/bin/env python3
"""
각 공정에 맞는 현실적인 이미지를 생성하는 스크립트
"""
import cv2
import numpy as np
import os
from random import randint, choice, random

os.makedirs("uploads", exist_ok=True)

def generate_electronics_assembly():
    """전자제품 조립 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 240

    # PCB 보드
    cv2.rectangle(img, (50, 60), (350, 260), (34, 139, 34), -1)
    cv2.rectangle(img, (50, 60), (350, 260), (0, 0, 0), 2)

    # 그리드 패턴
    for i in range(50, 350, 30):
        cv2.line(img, (i, 60), (i, 260), (50, 200, 50), 1)
    for j in range(60, 260, 30):
        cv2.line(img, (50, j), (350, j), (50, 200, 50), 1)

    # 칩/부품들
    positions = [(100, 100), (200, 120), (150, 180), (280, 160), (120, 220)]
    for x, y in positions:
        cv2.rectangle(img, (x-15, y-15), (x+15, y+15), (200, 200, 200), -1)
        cv2.rectangle(img, (x-15, y-15), (x+15, y+15), (0, 0, 0), 1)
        cv2.circle(img, (x, y), 3, (0, 0, 255), -1)

    # 전선/연결
    cv2.line(img, (85, 100), (85, 150), (255, 0, 0), 2)
    cv2.line(img, (185, 120), (140, 160), (0, 255, 0), 2)

    cv2.putText(img, "PCB Assembly", (120, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    return img

def generate_automotive_parts():
    """자동차 부품 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 220

    # 배경 텍스처
    for _ in range(200):
        x, y = randint(0, 400), randint(0, 300)
        cv2.circle(img, (x, y), randint(1, 3), (200, 200, 200), -1)

    # 기어
    center = (150, 150)
    cv2.circle(img, center, 50, (100, 100, 100), -1)
    cv2.circle(img, center, 50, (0, 0, 0), 2)
    for angle in range(0, 360, 45):
        rad = np.radians(angle)
        x1 = int(center[0] + 60 * np.cos(rad))
        y1 = int(center[1] + 60 * np.sin(rad))
        x2 = int(center[0] + 75 * np.cos(rad))
        y2 = int(center[1] + 75 * np.sin(rad))
        cv2.line(img, (x1, y1), (x2, y2), (0, 0, 0), 3)

    # 나사/볼트
    bolt_positions = [(250, 100), (250, 200), (80, 100), (80, 200)]
    for x, y in bolt_positions:
        cv2.circle(img, (x, y), 15, (150, 150, 150), -1)
        cv2.circle(img, (x, y), 15, (0, 0, 0), 2)
        cv2.line(img, (x-8, y), (x+8, y), (0, 0, 0), 1)

    cv2.putText(img, "Automotive Parts", (100, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_food_packaging():
    """식품 포장 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 245

    # 포장 상자
    cv2.rectangle(img, (60, 80), (340, 240), (210, 180, 140), -1)
    cv2.rectangle(img, (60, 80), (340, 240), (139, 69, 19), 3)

    # 포장 테이프
    cv2.rectangle(img, (60, 155), (340, 165), (200, 200, 200), -1)

    # 제품들
    product_colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)]
    positions = [(120, 120), (200, 120), (280, 120), (160, 200), (240, 200)]
    for idx, (x, y) in enumerate(positions):
        color = product_colors[idx % len(product_colors)]
        cv2.rectangle(img, (x-12, y-12), (x+12, y+12), color, -1)
        cv2.rectangle(img, (x-12, y-12), (x+12, y+12), (0, 0, 0), 1)

    cv2.putText(img, "Food Packaging", (110, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    return img

def generate_metal_processing():
    """금속 가공 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 200

    # 금속 질감
    for y in range(0, 300, 2):
        brightness = 180 + randint(-20, 20)
        cv2.line(img, (0, y), (400, y), (brightness, brightness, brightness), 1)

    # 가공 패턴 (밀링)
    center = (200, 150)
    for r in [30, 60, 90]:
        cv2.circle(img, center, r, (100, 100, 100), 1)

    # 톱니 패턴
    for angle in range(0, 360, 30):
        rad = np.radians(angle)
        x = int(center[0] + 100 * np.cos(rad))
        y = int(center[1] + 100 * np.sin(rad))
        cv2.line(img, center, (x, y), (50, 50, 50), 2)

    # 깊이 표시
    cv2.ellipse(img, center, (40, 40), 0, 0, 360, (80, 80, 80), 2)

    cv2.putText(img, "Metal Processing", (100, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_semiconductor():
    """반도체 제조 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 30

    # 칩 표면
    grid_size = 8
    cell_w = 35
    cell_h = 25
    start_x, start_y = 50, 80

    for i in range(grid_size):
        for j in range(grid_size):
            x = start_x + i * cell_w
            y = start_y + j * cell_h
            brightness = randint(100, 200) if random() > 0.3 else randint(40, 100)
            cv2.rectangle(img, (x, y), (x+cell_w-2, y+cell_h-2), (brightness, brightness//2, brightness), -1)

    # 연결선
    for _ in range(15):
        x1, y1 = randint(50, 350), randint(80, 280)
        x2, y2 = randint(50, 350), randint(80, 280)
        cv2.line(img, (x1, y1), (x2, y2), (0, 255, 255), 1)

    cv2.putText(img, "Semiconductor", (110, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
    return img

def generate_textile_manufacturing():
    """섬유 제조 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 200

    # 원단 패턴
    for i in range(0, 400, 3):
        cv2.line(img, (i, 0), (i, 300), (180, 140, 100), 1)
    for j in range(0, 300, 3):
        cv2.line(img, (0, j), (400, j), (180, 140, 100), 1)

    # 직조 패턴
    colors = [(150, 100, 200), (200, 100, 150), (100, 150, 200)]
    for y in range(80, 240, 20):
        for x in range(50, 350, 20):
            cv2.rectangle(img, (x, y), (x+15, y+15), choice(colors), -1)

    # 테두리
    cv2.rectangle(img, (40, 70), (360, 250), (0, 0, 0), 2)

    cv2.putText(img, "Textile Manufacturing", (80, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_plastic_molding():
    """플라스틱 성형 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 230

    # 금형
    cv2.rectangle(img, (80, 100), (320, 240), (120, 120, 120), -1)
    cv2.rectangle(img, (80, 100), (320, 240), (0, 0, 0), 3)

    # 성형된 제품들
    products = [(130, 130), (200, 130), (270, 130), (130, 190), (200, 190), (270, 190)]
    for x, y in products:
        cv2.rectangle(img, (x-20, y-15), (x+20, y+15), (100, 200, 255), -1)
        cv2.rectangle(img, (x-20, y-15), (x+20, y+15), (0, 0, 0), 1)

    # 열 표시
    cv2.putText(img, "HEAT", (170, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

    cv2.putText(img, "Plastic Molding", (110, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_chemical_mixing():
    """화학 제조 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 240

    # 혼합 탱크
    cv2.ellipse(img, (100, 120), (40, 30), 0, 0, 360, (150, 150, 150), -1)
    cv2.rectangle(img, (60, 120), (140, 200), (150, 150, 150), -1)
    cv2.ellipse(img, (100, 200), (40, 15), 0, 0, 360, (120, 120, 120), -1)

    # 화학 물질 색상
    cv2.rectangle(img, (70, 140), (130, 180), (100, 200, 255), -1)

    # 혼합 표시
    for angle in range(0, 360, 60):
        rad = np.radians(angle)
        x = int(100 + 25 * np.cos(rad))
        y = int(160 + 15 * np.sin(rad))
        cv2.circle(img, (x, y), 2, (200, 100, 100), -1)

    # 다른 탱크
    cv2.ellipse(img, (280, 140), (40, 30), 0, 0, 360, (150, 150, 150), -1)
    cv2.rectangle(img, (240, 140), (320, 200), (150, 150, 150), -1)
    cv2.ellipse(img, (280, 200), (40, 15), 0, 0, 360, (120, 120, 120), -1)
    cv2.rectangle(img, (250, 160), (310, 190), (200, 100, 100), -1)

    # 파이프
    cv2.line(img, (140, 160), (240, 160), (100, 100, 100), 3)

    cv2.putText(img, "Chemical Mixing", (110, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_medical_assembly():
    """의료용품 조립 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 245

    # 클린룸 환경 (밝음)
    cv2.rectangle(img, (0, 0), (400, 70), (220, 240, 255), -1)
    cv2.putText(img, "Clean Room", (150, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 200), 1)

    # 작업 표면
    cv2.rectangle(img, (40, 100), (360, 280), (200, 200, 200), -1)
    cv2.rectangle(img, (40, 100), (360, 280), (100, 100, 100), 2)

    # 의료 부품들
    components = [(100, 150), (200, 140), (300, 160), (120, 220), (200, 240), (300, 220)]
    for x, y in components:
        cv2.circle(img, (x, y), 15, (255, 200, 200), -1)
        cv2.circle(img, (x, y), 15, (200, 0, 0), 2)
        cv2.circle(img, (x, y), 8, (255, 100, 100), -1)

    cv2.putText(img, "Medical Assembly", (100, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_wire_manufacturing():
    """전선 제조 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 230

    # 드럼/릴
    cv2.circle(img, (100, 150), 50, (80, 80, 80), -1)
    cv2.circle(img, (100, 150), 50, (0, 0, 0), 2)
    cv2.circle(img, (100, 150), 10, (200, 200, 200), -1)

    # 전선 감기
    for i in range(8):
        radius = 30 + i * 2
        cv2.ellipse(img, (100, 150), (radius, radius//2), 0, 0, 360, (0, 100, 255), 1)

    # 공급 롤
    cv2.circle(img, (300, 150), 40, (100, 100, 100), -1)
    cv2.circle(img, (300, 150), 40, (0, 0, 0), 2)

    # 전선
    cv2.line(img, (60, 110), (260, 120), (0, 200, 0), 3)
    cv2.line(img, (60, 190), (260, 180), (255, 0, 0), 3)

    cv2.putText(img, "Wire Manufacturing", (100, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_battery_assembly():
    """배터리 제조 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 240

    # 배터리 셀들
    positions = [(80, 80), (160, 80), (240, 80), (320, 80),
                 (80, 170), (160, 170), (240, 170), (320, 170)]

    for x, y in positions:
        # 배터리 몸체
        cv2.rectangle(img, (x-20, y-30), (x+20, y+30), (100, 100, 100), -1)
        cv2.rectangle(img, (x-20, y-30), (x+20, y+30), (0, 0, 0), 2)
        # 양극
        cv2.circle(img, (x-8, y-35), 4, (255, 100, 0), -1)
        # 음극
        cv2.circle(img, (x+8, y-35), 4, (0, 0, 255), -1)

    # 연결선
    for i in range(len(positions)-1):
        x1, y1 = positions[i]
        x2, y2 = positions[i+1]
        if i < 3:
            cv2.line(img, (x1+20, y1), (x2-20, y2), (255, 0, 0), 2)

    cv2.putText(img, "Battery Assembly", (110, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

def generate_gear_manufacturing():
    """기어 제조 이미지"""
    img = np.ones((300, 400, 3), dtype=np.uint8) * 200

    # 여러 기어
    gears = [(120, 120, 40), (220, 120, 35), (170, 200, 30)]

    for cx, cy, radius in gears:
        # 기어 원
        cv2.circle(img, (cx, cy), radius, (100, 100, 100), -1)
        cv2.circle(img, (cx, cy), radius, (0, 0, 0), 2)

        # 톱니
        teeth = 12
        for i in range(teeth):
            angle = 360 / teeth * i
            rad = np.radians(angle)
            x1 = int(cx + (radius - 5) * np.cos(rad))
            y1 = int(cy + (radius - 5) * np.sin(rad))
            x2 = int(cx + (radius + 8) * np.cos(rad))
            y2 = int(cy + (radius + 8) * np.sin(rad))
            cv2.line(img, (x1, y1), (x2, y2), (0, 0, 0), 2)

        # 중심
        cv2.circle(img, (cx, cy), 8, (200, 200, 200), -1)

    # 연결 표시
    cv2.line(img, (160, 120), (190, 180), (0, 255, 0), 2)

    cv2.putText(img, "Gear Manufacturing", (100, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    return img

# 생성 함수 매핑
GENERATORS = {
    0: ("전자제품 조립", generate_electronics_assembly),
    1: ("자동차 부품", generate_automotive_parts),
    2: ("식품 포장", generate_food_packaging),
    3: ("섬유 제조", generate_textile_manufacturing),
    4: ("플라스틱 성형", generate_plastic_molding),
    5: ("금속 가공", generate_metal_processing),
    6: ("목재 가공", generate_wood_processing := lambda: generate_metal_processing()),  # 유사
    7: ("유리 가공", generate_semiconductor),  # 유사 (밝은 배경)
    8: ("반도체 제조", generate_semiconductor),
    9: ("화학 제조", generate_chemical_mixing),
    10: ("의료용품", generate_medical_assembly),
    11: ("전선 제조", generate_wire_manufacturing),
    12: ("배터리 제조", generate_battery_assembly),
    13: ("컨테이너 제조", generate_plastic_molding),  # 유사
    14: ("펌프 제조", generate_chemical_mixing),  # 유사
    15: ("밸브 제조", generate_metal_processing),  # 유사
    16: ("기어 제조", generate_gear_manufacturing),
    17: ("로봇 조립", generate_electronics_assembly),  # 유사
    18: ("태양광 패널", generate_semiconductor),  # 유사
    19: ("풍력 부품", generate_gear_manufacturing),  # 유사
}

def main():
    print("=" * 60)
    print("🎨 REALISTIC IMAGE GENERATOR")
    print("=" * 60)
    print("\n생성 중...")

    for idx in range(20):
        name, generator = GENERATORS[idx]
        img = generator()

        # 이미지 저장 (각 SOP마다 step1만 생성)
        filename = f"thumb_sop_dummy_{idx:02d}_step1.jpg"
        filepath = os.path.join("uploads", filename)

        # 기존 파일 삭제
        if os.path.exists(filepath):
            os.remove(filepath)

        cv2.imwrite(filepath, img)
        print(f"  ✅ {idx+1:2d}. {name:20s} -> {filename}")

    print("\n" + "=" * 60)
    print("✨ 현실적인 공정 이미지 생성 완료!")
    print("=" * 60)

if __name__ == "__main__":
    main()
