import dotenv
import socket
import logging
from src.server import app

dotenv.load_dotenv(override=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    
    # Get local IP addresses for debugging
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    logger.info(f"Starting server on hostname: {hostname}")
    logger.info(f"Local IP: {local_ip}")
    logger.info(f"Server will be accessible at:")
    logger.info(f"  - Local: http://localhost:7860")
    logger.info(f"  - Network: http://{local_ip}:7860")
    logger.info(f"  - External: http://0.0.0.0:7860")
    
    # Start server binding to all interfaces
    uvicorn.run(
        app, 
        host="0.0.0.0",  # Bind to all interfaces
        port=7860,
        log_level="info"
    )