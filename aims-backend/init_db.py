#!/usr/bin/env python3
"""
데이터베이스 초기화 및 샘플 데이터 생성 스크립트
"""
from database import engine, SessionLocal, Base, init_db
from models import User, SOP, Step, DetectedTool, UserRole, SOPStatus
import uuid
from datetime import datetime, timedelta


def create_tables():
    """테이블 생성"""
    print("📊 Creating database tables...")
    init_db()


def create_sample_data():
    """샘플 데이터 생성"""
    db = SessionLocal()
    try:
        # 1. 샘플 사용자 생성
        print("\n👥 Creating sample users...")

        manager = User(
            id=str(uuid.uuid4())[:8],
            username="manager1",
            name="Park Manager",
            email="manager@example.com",
            role=UserRole.MANAGER,
            language="ko",
        )

        workers = [
            User(
                id=str(uuid.uuid4())[:8],
                username=f"worker{i}",
                name=f"Worker {i} (한국인)" if i == 1 else f"Worker {i} (베트남)" if i == 2 else f"Worker {i}",
                email=f"worker{i}@example.com",
                role=UserRole.WORKER,
                language="ko" if i == 1 else "vi" if i == 2 else "en",
            )
            for i in range(1, 4)
        ]

        db.add(manager)
        for worker in workers:
            db.add(worker)

        # 2. 샘플 SOP 생성
        print("📋 Creating sample SOP...")

        sop = SOP(
            id="sop_001",
            process_name="전자제품_조립",
            task_name="기판 납땜",
            status=SOPStatus.PUBLISHED,
            duration="2:30",
            confidence=85,
            video_url="/uploads/sample.mp4",
            transcript_text="이제 기판 납땜을 시작하겠습니다...",
            transcript_language="ko",
            transcript_segments=[
                {"start": 0.0, "end": 3.0, "text": "이제 기판 납땜을 시작하겠습니다."},
                {"start": 3.0, "end": 8.0, "text": "먼저 기판을 고정합니다."},
            ],
            created_at=datetime.utcnow(),
            published_at=datetime.utcnow(),
        )
        db.add(sop)

        # 3. 단계 추가
        print("📍 Adding steps...")

        steps = [
            Step(
                id="step_001_1",
                sop_id="sop_001",
                step_number=1,
                name="기판 고정",
                time_start=0.0,
                time_end=30.0,
                description="기판을 작업대에 고정합니다.",
                confidence=88,
                thumbnail_url="/uploads/thumb_001_step1.jpg",
            ),
            Step(
                id="step_001_2",
                sop_id="sop_001",
                step_number=2,
                name="선입과 납땜",
                time_start=30.0,
                time_end=90.0,
                description="선입을 놓고 납땜합니다.",
                confidence=85,
                thumbnail_url="/uploads/thumb_001_step2.jpg",
            ),
            Step(
                id="step_001_3",
                sop_id="sop_001",
                step_number=3,
                name="검사 및 정리",
                time_start=90.0,
                time_end=150.0,
                description="납땜 상태를 검사하고 정리합니다.",
                confidence=82,
                thumbnail_url="/uploads/thumb_001_step3.jpg",
            ),
        ]
        for step in steps:
            db.add(step)

        # 4. 공구 정보 추가
        print("🔧 Adding tools...")

        tools = [
            DetectedTool(
                id="tool_001_1",
                sop_id="sop_001",
                name="납땜인",
                icon="🔧",
                confidence=92,
                steps_involved=[1, 2],
                preview_url="/uploads/tool_001_납땜인.jpg",
            ),
            DetectedTool(
                id="tool_001_2",
                sop_id="sop_001",
                name="선입",
                icon="📦",
                confidence=88,
                steps_involved=[2],
                preview_url="/uploads/tool_001_선입.jpg",
            ),
        ]
        for tool in tools:
            db.add(tool)

        # 5. 작업자 피드백 샘플
        print("💬 Adding worker feedbacks...")

        from models import WorkerFeedback, FeedbackType

        feedback = WorkerFeedback(
            id="fb_001",
            user_id=workers[0].id,
            sop_id="sop_001",
            feedback_type=FeedbackType.UNCLEAR,
            step_number=2,
            message="2번 단계의 납땜 온도가 명확하지 않습니다.",
            rating=3,
            created_at=datetime.utcnow(),
        )
        db.add(feedback)

        # 6. 작업자 수행 기록 샘플
        print("✅ Adding worker performance records...")

        from models import WorkerPerformance, PerformanceStatus

        performance = WorkerPerformance(
            id="perf_001",
            user_id=workers[1].id,
            sop_id="sop_001",
            status=PerformanceStatus.COMPLETED,
            completed_steps=[1, 2, 3],
            total_duration=148.5,
            step_durations={1: 29.2, 2: 59.8, 3: 59.5},
            accuracy_score=87.5,
            started_at=datetime.utcnow() - timedelta(hours=2),
            completed_at=datetime.utcnow() - timedelta(hours=1),
        )
        db.add(performance)

        db.commit()
        print("\n✅ Sample data created successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample data: {e}")
    finally:
        db.close()


def main():
    print("=" * 60)
    print("🗄️  DATABASE INITIALIZATION")
    print("=" * 60)

    create_tables()
    create_sample_data()

    print("\n" + "=" * 60)
    print("✨ Database ready!")
    print("📊 Database location: aims.db")
    print("=" * 60)


if __name__ == "__main__":
    main()
