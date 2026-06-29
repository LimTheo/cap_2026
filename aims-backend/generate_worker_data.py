#!/usr/bin/env python3
"""
근로자 데이터 생성 스크립트
20명의 근로자와 각각의 수행 기록, 피드백을 생성합니다.
"""
from database import SessionLocal
from models import User, UserRole, WorkerPerformance, PerformanceStatus, WorkerFeedback, FeedbackType
from datetime import datetime, timedelta
import uuid
import random

# 다양한 근로자 데이터
WORKERS = [
    ("Kim Min-jun", "kim_minjun", "kim.minjun@factory.com", "ko"),
    ("Park Ji-ho", "park_jiho", "park.jiho@factory.com", "ko"),
    ("Lee Sung-ho", "lee_sungho", "lee.sungho@factory.com", "ko"),
    ("Choi Young-su", "choi_youngsu", "choi.youngsu@factory.com", "ko"),
    ("Jung Hye-jin", "jung_hyejin", "jung.hyejin@factory.com", "ko"),
    ("Nguyen Tuan Anh", "nguyen_tuananh", "nguyen.tuananh@factory.com", "vi"),
    ("Tran Minh Duc", "tran_minhduc", "tran.minhduc@factory.com", "vi"),
    ("Pham Thi Huong", "pham_thihuong", "pham.thihuong@factory.com", "vi"),
    ("Li Wei", "li_wei", "li.wei@factory.com", "zh"),
    ("Wang Jun", "wang_jun", "wang.jun@factory.com", "zh"),
    ("Zhang Mei", "zhang_mei", "zhang.mei@factory.com", "zh"),
    ("Ito Hiroshi", "ito_hiroshi", "ito.hiroshi@factory.com", "ja"),
    ("Tanaka Yuki", "tanaka_yuki", "tanaka.yuki@factory.com", "ja"),
    ("Mohammad Hassan", "mohammad_hassan", "mohammad.hassan@factory.com", "en"),
    ("Amira Ibrahim", "amira_ibrahim", "amira.ibrahim@factory.com", "en"),
    ("Carlos Rodriguez", "carlos_rodriguez", "carlos.rodriguez@factory.com", "es"),
    ("Maria Garcia", "maria_garcia", "maria.garcia@factory.com", "es"),
    ("Anna Kowalski", "anna_kowalski", "anna.kowalski@factory.com", "pl"),
    ("Dmitri Volkov", "dmitri_volkov", "dmitri.volkov@factory.com", "ru"),
    ("Fatima Ali", "fatima_ali", "fatima.ali@factory.com", "en"),
]

FEEDBACK_MESSAGES = {
    "positive": [
        "뛰어난 작업 능력을 보여주었습니다.",
        "모든 단계를 정확하게 완료했습니다.",
        "작업 속도가 개선되었습니다.",
        "안전 수칙을 잘 준수합니다.",
        "동료들을 도와주는 좋은 자세입니다.",
        "신속하고 정확한 작업을 수행합니다.",
        "높은 품질의 작업을 완성했습니다.",
    ],
    "neutral": [
        "작업이 기준에 충족합니다.",
        "일부 개선 영역이 있습니다.",
        "추가 교육이 권장됩니다.",
        "다음 단계로 진행할 수 있습니다.",
        "정기적인 모니터링이 필요합니다.",
    ],
    "negative": [
        "일부 단계에서 오류가 발견되었습니다.",
        "안전 절차를 다시 검토해야 합니다.",
        "속도와 정확성 개선이 필요합니다.",
        "추가 교육 후 재시도가 필요합니다.",
        "작업 절차를 다시 학습해주세요.",
    ],
}

def create_worker_data():
    """근로자 데이터를 생성합니다."""
    db = SessionLocal()
    try:
        print("\n👥 Creating worker data...")

        # 기존 사용자 삭제 (worker만)
        existing_workers = db.query(User).filter(User.role == UserRole.WORKER).all()
        for worker in existing_workers:
            db.delete(worker)
        db.commit()

        # 근로자 생성
        workers = []
        for idx, (name, username, email, language) in enumerate(WORKERS):
            worker = User(
                id=f"user_worker_{idx:02d}",
                username=username,
                name=name,
                email=email,
                role=UserRole.WORKER,
                language=language,
                created_at=datetime.utcnow() - timedelta(days=random.randint(10, 60)),
            )
            db.add(worker)
            workers.append(worker)
            print(f"  ✅ {idx+1:2d}. {name:20s} ({language:2s})")

        db.flush()

        # 수행 기록 생성 (각 근로자당 3-6개의 SOP에 대한 기록)
        print("\n📊 Creating performance records...")

        # 기존 데이터 검색
        from models import SOP
        existing_sops = db.query(SOP).filter(SOP.id.like("sop_dummy_%")).all()

        if not existing_sops:
            print("  ⚠️  더미 SOP가 없습니다. generate_dummy_data.py를 먼저 실행하세요.")
            db.close()
            return

        for worker_idx, worker in enumerate(workers):
            # 각 근로자가 3-6개의 SOP 학습
            num_sops = random.randint(3, 6)
            selected_sops = random.sample(existing_sops, min(num_sops, len(existing_sops)))

            for sop_idx, sop in enumerate(selected_sops):
                # 수행 상태 결정
                rand = random.random()
                if rand < 0.6:
                    status = PerformanceStatus.COMPLETED
                    accuracy = random.randint(75, 100)
                    feedback_type = "positive"
                elif rand < 0.8:
                    status = PerformanceStatus.COMPLETED
                    accuracy = random.randint(60, 75)
                    feedback_type = "neutral"
                elif rand < 0.95:
                    status = PerformanceStatus.IN_PROGRESS
                    accuracy = None
                    feedback_type = "neutral"
                else:
                    status = PerformanceStatus.FAILED
                    accuracy = random.randint(30, 60)
                    feedback_type = "negative"

                # 시간 계산
                started_at = datetime.utcnow() - timedelta(days=random.randint(0, 30))
                duration = random.randint(15, 120)
                completed_at = started_at + timedelta(minutes=duration) if status == PerformanceStatus.COMPLETED else None

                # 단계 데이터
                step_count = len(sop.steps)
                completed_steps = list(range(1, step_count + 1)) if status == PerformanceStatus.COMPLETED else list(range(1, random.randint(1, step_count)))
                step_durations = {i: random.uniform(5, 30) for i in range(1, step_count + 1)}

                performance = WorkerPerformance(
                    id=f"perf_{worker.id}_{sop.id}",
                    user_id=worker.id,
                    sop_id=sop.id,
                    status=status,
                    completed_steps=completed_steps,
                    total_duration=duration * 60,  # 초 단위
                    step_durations=step_durations,
                    accuracy_score=accuracy,
                    started_at=started_at,
                    completed_at=completed_at,
                    reviewed_at=completed_at if status == PerformanceStatus.COMPLETED and random.random() > 0.3 else None,
                    notes=f"{sop.process_name} - {sop.task_name} 학습 기록" if status == PerformanceStatus.COMPLETED else None,
                )
                db.add(performance)

            print(f"  ✅ Worker {worker_idx+1:2d}: {num_sops} SOPs")

        db.flush()

        # 피드백 생성 (일부 근로자에 대해)
        print("\n💬 Creating feedback...")

        for worker_idx, worker in enumerate(workers[:15]):  # 처음 15명의 근로자
            # 각 근로자당 1-3개의 피드백
            performances = db.query(WorkerPerformance).filter(
                WorkerPerformance.user_id == worker.id,
                WorkerPerformance.status == PerformanceStatus.COMPLETED
            ).all()

            for perf in random.sample(performances, min(random.randint(1, 3), len(performances))):
                rand = random.random()
                if rand < 0.4:
                    feedback_type = FeedbackType.UNCLEAR
                    messages = FEEDBACK_MESSAGES["neutral"]
                elif rand < 0.6:
                    feedback_type = FeedbackType.TIMING_ISSUE
                    messages = FEEDBACK_MESSAGES["neutral"]
                elif rand < 0.8:
                    feedback_type = FeedbackType.MISSING_STEP
                    messages = FEEDBACK_MESSAGES["positive"]
                elif rand < 0.9:
                    feedback_type = FeedbackType.INCORRECT_TOOL
                    messages = FEEDBACK_MESSAGES["negative"]
                else:
                    feedback_type = FeedbackType.OTHER
                    messages = FEEDBACK_MESSAGES["neutral"]

                feedback = WorkerFeedback(
                    id=f"fb_{worker.id}_{perf.sop_id}",
                    user_id=worker.id,
                    sop_id=perf.sop_id,
                    feedback_type=feedback_type,
                    step_number=random.randint(1, len(db.query(WorkerPerformance).filter(WorkerPerformance.id == perf.id).first().sop.steps) or 1),
                    message=random.choice(messages),
                    rating=random.randint(2, 5),
                    is_resolved=random.random() > 0.3,
                    created_at=perf.completed_at or datetime.utcnow(),
                )
                db.add(feedback)

        db.commit()
        print("  ✅ 피드백 생성 완료")

        # 통계 출력
        total_workers = db.query(User).filter(User.role == UserRole.WORKER).count()
        total_performances = db.query(WorkerPerformance).count()
        completed_performances = db.query(WorkerPerformance).filter(
            WorkerPerformance.status == PerformanceStatus.COMPLETED
        ).count()

        print("\n" + "=" * 60)
        print("✨ 근로자 데이터 생성 완료!")
        print(f"   - 근로자 수: {total_workers}명")
        print(f"   - 수행 기록: {total_performances}건")
        print(f"   - 완료율: {completed_performances}/{total_performances} ({completed_performances*100//total_performances if total_performances > 0 else 0}%)")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating worker data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("👥 WORKER DATA GENERATOR")
    print("=" * 60)
    create_worker_data()
