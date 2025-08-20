import asyncio
import json
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import BackgroundTasks, FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection

from src.agents import( 
    run_gemini_agent, 
    # run_ollama_agent
)

app = FastAPI()

# Store active WebRTC connections by their unique ID
connections: Dict[str, SmallWebRTCConnection] = {}
websocket_connections: Dict[str, WebSocket] = {}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins="*",  # Client origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Configure ICE servers for NAT traversal - improved for external network access
ice_servers = [
    IceServer(urls="stun:stun.l.google.com:19302"),
    IceServer(urls="stun:stun1.l.google.com:19302"),
    IceServer(urls="stun:stun2.l.google.com:19302"),
    IceServer(urls="stun:stun3.l.google.com:19302"),
    IceServer(urls="stun:stun4.l.google.com:19302"),

    # Add your host machine as STUN server
    
]

# Add logging for WebRTC connections
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/api/offer")
async def handle_offer(request: dict, background_tasks: BackgroundTasks, request_obj: Request):
    """Handle WebRTC offer from client and return SDP answer."""
    try:
        # print(f"Received request: {request}")
        # Extract data from request body first, then URL parameters as fallback
        pc_id = request.get("pc_id")
        messages = request.get("messages", None)
        agent_type = request.get("agent_type", "ollama")
        bot_settings = request.get("bot_settings", None)
        database_id = request.get("database_id", None)
        token = request.get("token", None)
        session_id = request.get("session_id", None)
        user = request.get("user", None)
        
        
        sdp = request.get("sdp")
        type = request.get("type")
        
        # If not in request body, try URL parameters
        if not messages:
            query_params = request_obj.query_params
            if query_params.get("messages"):
                messages = json.loads(query_params.get("messages"))
        if agent_type == "ollama":
            agent_type = query_params.get("agent_type", "ollama")
        if not bot_settings:
            bot_settings = query_params.get("bot_settings")
            bot_settings = json.loads(bot_settings)
        
        if not database_id:
            database_id = query_params.get("database_id")
        if not token:
            token = query_params.get("token")
        if not session_id:
            session_id = query_params.get("session_id")
        if not user:
            user = query_params.get("user")
            user = json.loads(user)

        if not sdp or not type:
            return {"error": "Missing required SDP parameters"}

        if pc_id and pc_id in connections:
            # Handle reconnections
            logger.info(f"Reconnecting existing peer: {pc_id}")
            webrtc_connection = connections[pc_id]
            await webrtc_connection.renegotiate(sdp=sdp, type=type)
        else:
            # Create new WebRTC connection
            logger.info(f"Creating new peer connection")
            webrtc_connection = SmallWebRTCConnection(
                ice_servers=ice_servers,
                # Force external IP for SDP generation
               
            )
            
            # Add connection event handlers for debugging
            @webrtc_connection.event_handler("connected")
            async def on_connected(connection):
                logger.info(f"WebRTC connection established: {connection.pc_id}")
                
            @webrtc_connection.event_handler("ice_connection_state_changed")
            async def on_ice_state_changed(connection, state):
                logger.info(f"ICE connection state changed: {state} for {connection.pc_id}")
                
            @webrtc_connection.event_handler("ice_gathering_state_changed")
            async def on_ice_gathering_changed(connection, state):
                logger.info(f"ICE gathering state changed: {state} for {connection.pc_id}")
                
            await webrtc_connection.initialize(sdp=sdp, type=type)

            # Clean up when client disconnects
            @webrtc_connection.event_handler("closed")
            async def on_closed(connection):
                print(f"Peer disconnected: {connection.pc_id}")
                connections.pop(connection.pc_id, None)
                # Also clean up WebSocket if exists
                if connection.pc_id in websocket_connections:
                    websocket_connections.pop(connection.pc_id, None)

            # Start bot for this connection
            async def agent_task(webrtc_connection):
                try:
                    if agent_type == "gemini":
                        await run_gemini_agent(webrtc_connection, {
                            "messages": messages, 
                            "bot_settings": bot_settings,
                            "database_id": database_id,
                            "token": token,
                            "session_id": session_id,
                            "user": user
                        })
                    else:
                        # await run_ollama_agent(webrtc_connection, messages, system_instructions)
                        await run_gemini_agent(webrtc_connection, {
                            "messages": messages, 
                            "bot_settings": bot_settings,
                            "database_id": database_id,
                            "token": token,
                            "session_id": session_id,
                            "user": user
                        })
                except Exception as e:
                    print(f"Agent task error: {str(e)}")
                    # Clean up connection on error
                    if webrtc_connection.pc_id in connections:
                        await webrtc_connection.disconnect()
                        connections.pop(webrtc_connection.pc_id, None)

            background_tasks.add_task(agent_task, webrtc_connection)

        answer = webrtc_connection.get_answer()
        if not answer:
            return {"error": "Failed to create WebRTC answer"}

        print(f"Connection established with peer: {answer['pc_id']}")
        connections[answer["pc_id"]] = webrtc_connection
        return answer

    except Exception as e:
        print(f"Error handling offer: {str(e)}")
        return {"error": str(e)}



@asynccontextmanager
async def lifespan(app: FastAPI):
    yield  # Run app
    # Clean up connections on shutdown
    coros = [pc.disconnect() for pc in connections.values()]
    if coros:
        await asyncio.gather(*coros, return_exceptions=True)
    connections.clear()
    
    # Close WebSocket connections
    for ws in websocket_connections.values():
        try:
            await ws.close()
        except:
            pass
    websocket_connections.clear()

# Add lifespan to app
app.router.lifespan_context = lifespan