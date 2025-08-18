import dotenv
from src.server import app

dotenv.load_dotenv(override=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)