import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./aims.db"  # 기본: SQLite (개발용)
)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """데이터베이스 테이블 생성 및 테스트 데이터 추가"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

    # 테스트 Worker 사용자 생성
    db = SessionLocal()
    try:
        from models import User, UserRole

        existing_user = db.query(User).filter(User.id == "user_001").first()
        if not existing_user:
            test_user = User(
                id="user_001",
                username="worker_test",
                name="Test Worker",
                email="worker@aims.local",
                role=UserRole.WORKER,
                language="vi"
            )
            db.add(test_user)
            db.commit()
            print("✅ Test worker user created: user_001")
        else:
            print("ℹ️ Test worker user already exists")
    except Exception as e:
        print(f"⚠️ Error creating test user: {e}")
    finally:
        db.close()
