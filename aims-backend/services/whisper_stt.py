import os

# openai-whisper는 최초 실행 시 모델 파일을 자동 다운로드 (~74MB for 'base')
_whisper_model = None


def _get_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model("base")
    return _whisper_model


def transcribe_video(video_path: str) -> dict:
    """
    영상에서 음성을 추출하여 Whisper로 전사.

    언어 자동 감지 (한국어, 동남아시아어 등 지원).
    openai-whisper 패키지를 사용하므로 로컬에서 무료로 실행.

    Returns:
        {
            "text": "전사된 텍스트...",
            "language": "ko",
            "segments": [{"start": 0.0, "end": 2.5, "text": "..."}]
        }
        오류 발생 시: {"text": "", "language": "", "segments": [], "error": "메시지"}
    """
    try:
        import whisper

        if not os.path.exists(video_path):
            return {"text": "", "language": "", "segments": [], "error": "파일 없음"}

        model = _get_model()

        # Whisper는 mp4/mp3/wav 등 다양한 포맷 직접 처리 가능 (ffmpeg 필요)
        result = model.transcribe(
            video_path,
            language=None,      # auto-detect
            task="transcribe",
            fp16=False,         # CPU 호환
            verbose=False,
        )

        segments = [
            {
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "text": seg["text"].strip()
            }
            for seg in result.get("segments", [])
        ]

        return {
            "text": result.get("text", "").strip(),
            "language": result.get("language", ""),
            "segments": segments,
        }

    except ImportError:
        return {
            "text": "",
            "language": "",
            "segments": [],
            "error": "openai-whisper 패키지가 설치되지 않았습니다. pip install openai-whisper"
        }
    except FileNotFoundError as e:
        if "ffmpeg" in str(e):
            return {
                "text": "",
                "language": "",
                "segments": [],
                "error": "ffmpeg이 설치되지 않았습니다. 'brew install ffmpeg' (macOS) 또는 'apt-get install ffmpeg' (Ubuntu)를 실행하세요."
            }
        return {
            "text": "",
            "language": "",
            "segments": [],
            "error": str(e)
        }
    except Exception as e:
        return {
            "text": "",
            "language": "",
            "segments": [],
            "error": str(e)
        }
