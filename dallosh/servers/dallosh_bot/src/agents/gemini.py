#
# Copyright (c) 2024–2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""Pipecat Quickstart Example.

The example runs a simple voice AI bot that you can connect to using your
browser and speak with it.

Required AI services:
- Deepgram (Speech-to-Text)
- OpenAI (LLM)
- Cartesia (Text-to-Speech)

The example connects between client and server using a P2P WebRTC connection.

Run the bot using::

    python bot.py
"""

import io
import os
import json

from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.parallel_pipeline import ParallelPipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frameworks.rtvi import (
    ActionResult,
    RTVIAction,
    RTVIActionArgument,
    RTVIConfig,
    RTVIObserver,
    RTVIProcessor,
    RTVIServerMessageFrame,
)
from pipecat.runner.types import RunnerArguments


from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport

from pipecat.services.llm_service import FunctionCallParams

from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    Frame,
    OutputImageRawFrame,
    TTSSpeakFrame,
    EndFrame,
    TranscriptionFrame,
    TextFrame,
    STTUpdateSettingsFrame,
    TTSUpdateSettingsFrame,
    LLMMessagesFrame,
    LLMMessagesAppendFrame,
    InputImageRawFrame
)

from pipecat.processors.user_idle_processor import UserIdleProcessor
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection

from pipecat.processors.filters.stt_mute_filter import STTMuteConfig, STTMuteFilter, STTMuteStrategy

from pipecat.processors.transcript_processor import TranscriptProcessor

# function calling
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import AdapterType, ToolsSchema

from mcp import StdioServerParameters
from pipecat.services.mcp_service import MCPClient

from pipecat.utils.text.markdown_text_filter import MarkdownTextFilter
from pipecat.processors.filters.function_filter import FunctionFilter

from pipecat.utils.text.pattern_pair_aggregator import PatternMatch, PatternPairAggregator

from pipecat.audio.interruptions.min_words_interruption_strategy import MinWordsInterruptionStrategy
# from pipecat.audio.interruptions.volume_interruption_strategy import VolumeInterruptionStrategy

from openai.types.chat import ChatCompletionToolParam


from pipecat.services.gemini_multimodal_live.gemini import (
    GeminiMultimodalLiveLLMService,
    GeminiMultimodalModalities,
    InputParams,
    GeminiMediaResolution,
)
from pipecat.services.google.llm import GoogleLLMService
from pipecat.services.google.tts import GoogleTTSService
from pipecat.services.google.llm_openai import GoogleLLMOpenAIBetaService
# from pipecat.transcriptions.language import Language


from pipecat.services.rime.tts import RimeTTSService
from pipecat.transcriptions.language import Language

from pipecat.audio.filters.noisereduce_filter import NoisereduceFilter

from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams
# from pipecat.audio.turn.smart_turn.local_smart_turn_v2 import LocalSmartTurnAnalyzerV2


from .tools import get_tools_schema, set_tools_functions


#Define voice IDs
VOICE_IDS = {
    "fr_fr": {
        "voice": 'juliette', # 'marguerite', 'juliette'
        "language": Language.FR
    },
    "en_us": {
        "voice": 'abbie',
        "language": Language.EN_US
    },
}
# VOICE_IDS = {
#     "fr_fr": {
#         "voice": "ff_siwis",
#         "language": "French (France)"
#     },
#     "en_us": {
#         "voice": "af_heart",
#         "language": "English (United States)"
#     },
# }

current_language = list(VOICE_IDS.keys())[0]

# Advanced handler with retry logic
async def handle_user_idle(processor, retry_count):
    if retry_count == 1:
        # First attempt - gentle reminder
        messages.append({"role": "system", "content": f"This is a First attempt - gentle reminder message, try to ask if the user is still there (max 10 words). Your responses should be in  {VOICE_IDS[current_language]['language']}."})
        await task.push_frames([context_aggregator.assistant().get_context_frame()])
        return True  # Continue monitoring
    elif retry_count == 2:
        # Second attempt - more direct prompt
        messages.append({"role": "system", "content": f"This is the Second attempt - more direct prompt message, try to ask if the user is still there (max 10 words). Your responses should be in  {VOICE_IDS[current_language]['language']}."})
        await task.push_frames([context_aggregator.assistant().get_context_frame()])
        return True  # Continue monitoring
    else:
        # Third attempt - end conversation
        messages.append({"role": "system", "content": f"This is theThird attempt - end conversation, say goodbye and end the conversation. Your response should be in  {VOICE_IDS[current_language]['language']}."})
        await task.push_frames([context_aggregator.assistant().get_context_frame()])
        
        await task.push_frame(EndFrame(), FrameDirection.UPSTREAM)
        
        return False  # Stop monitoring




# async def custom_mute_logic(stt_filter: STTMuteFilter) -> bool:
#         #  return boolean condtion
#         if stt_filter.config.strategies.contains(STTMuteStrategy.CUSTOM):
#              # Tell the user to wait
#             if pipeline is not None:
#                 if current_language == "en_us":
#                     await pipeline.push_frame(TTSSpeakFrame(text="Please wait while I process your request."))
#                 else:
#                     await pipeline.push_frame(TTSSpeakFrame(text="Veuillez patienter pendant que je traite votre demande."))
#             return True
        
#         return False

# log transcription
class TranscriptionLogger(FrameProcessor):
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame):
            print(f"Transcription: {frame.text}")



# languages_list = "\n".join([f"- Language Code: {voice}, Language: {VOICE_IDS[voice]['language']}" for voice in VOICE_IDS])

SYSTEM_INSTRUCTIONS = f"""
You are a helpful AI assistant.

The language response for you must absolutely speak fluenty with the user is:
- {VOICE_IDS[current_language]['language']}


IMPORTANT RULES:
1. Keep responses concise and natural for voice realtime conversation with a customer.
2. Be helpful, friendly, and engaging.
3. Avoid long responses, keep it short for voice realtime conversation and to the point, avoid using emojis, avoid using markdown or bullet point or numbered list, avoid using special characters, avoid using html tags, avoid using bold, italic, underline, etc.

"""

async def run_bot(transport: BaseTransport, data = {}):

    # Create the task
    global task

    try:
        session_messages = data.get("messages", None)
        bot_settings = data.get("bot_settings", None)
        system_instructions = bot_settings.get("system_instructions", None)

        user = data.get("user", None)


        logger.info(f"Starting bot")

        transcription_logger = TranscriptionLogger()

        # Create a single transcript processor instance
        transcript = TranscriptProcessor()

        # Configure with one or more strategies
        stt_mute_processor = STTMuteFilter(
            config=STTMuteConfig(
                strategies={
                    STTMuteStrategy.MUTE_UNTIL_FIRST_BOT_COMPLETE, # bot is not interupted for the first time
                    STTMuteStrategy.FUNCTION_CALL, # bot is not interupted when callinf functions tools
                    # STTMuteStrategy.CUSTOM,
                },
                # should_mute_callback=custom_mute_logic

            ),
        )

        # Create the filter
        md_filter = MarkdownTextFilter()

        # Create pattern aggregator
        pattern_aggregator = PatternPairAggregator()

        # Add pattern for voice tags
        # pattern_aggregator.add_pattern_pair(
        #     pattern_id="voice_tag",
        #     start_pattern="<voice>",
        #     end_pattern="</voice>",
        #     remove_match=True # remove the voice tag from the text
        # )

        pattern_aggregator.add_pattern_pair(
            pattern_id="think_tag",
            start_pattern="<think>",
            end_pattern="</think>",
            remove_match=True # remove the voice tag from the text
        )

        pattern_aggregator.add_pattern_pair(
            pattern_id="assistant_header_tag",
            start_pattern="<|start_header_id|>",
            end_pattern="</|start_header_id|>",
            remove_match=True # remove the voice tag from the text
        )

        pattern_aggregator.add_pattern_pair(
            pattern_id="assistant_header_tag2",
            start_pattern="<start_header_id>",
            end_pattern="</start_header_id>",
            remove_match=True # remove the voice tag from the text
        )

        pattern_aggregator.add_pattern_pair(
            pattern_id="comment_tag",
            start_pattern="(",
            end_pattern=")",
            remove_match=True # remove the voice tag from the text
        )

        pattern_aggregator.add_pattern_pair(
            pattern_id="comment_tag2",
            start_pattern="```",
            end_pattern=" ```",
            remove_match=True # remove the voice tag from the text
        )


        # Register handler for voice switching
        # async def on_voice_tag(match: PatternMatch):
        #     language_code = match.content.strip().lower()
        #     if language_code in VOICE_IDS:
        #         # First flush any existing audio to finish the current context
        #         # await tts.flush_audio()
        #         current_language = language_code
        #         voice_id = VOICE_IDS[language_code]["voice"]
        #         if current_language == "en_us":
        #             tts_english.set_voice(voice_id)
        #         else:
        #             tts_french.set_voice(voice_id)
        #         logger.info(f"Switched to {language_code} voice")
        #     else:
        #         # await tts.flush_audio()
        #         if current_language == "en_us":
        #             tts_english.set_voice(VOICE_IDS["en_us"]["voice"])
        #         else:
        #             tts_french.set_voice(VOICE_IDS["fr_fr"]["voice"])

        #         logger.info(f"Switched to default voice: {VOICE_IDS['en_us']['voice']}")

        # pattern_aggregator.on_pattern_match("voice_tag", on_voice_tag)
        
        global tts_french

        tts_french = RimeTTSService(
            api_key=os.getenv("RIME_API_KEY"),
            voice_id=VOICE_IDS['fr_fr']["voice"],
            model="mistv2",
            params=RimeTTSService.InputParams(
                language=VOICE_IDS['fr_fr']["language"],
                speed_alpha=1.4,
                reduce_latency=False,
                pause_between_brackets=True,
                phonemize_between_brackets=False
            ),
            text_filters=[md_filter],
            text_aggregator=pattern_aggregator
        )

        # tts_french = OpenAITTSService(
        #     api_key=os.getenv("OPENAI_API_KEY", "sk-proj-1234567890"),
        #     model="speaches-ai/Kokoro-82M-v1.0-ONNX-fp16",
        #     base_url="http://192.168.1.117:8000/v1",
        #     voice=VOICE_IDS['fr_fr']["voice"],
        #     instructions="Parles amicalement et naturellement. Utilise des pauses naturelles, les émotions et des intonations pour que tes réponses sonnent comme un humain.",
        #     text_filters=[md_filter],
        #     text_aggregator=pattern_aggregator
        # )
        
        

        # # Create tools schema from the MCP server and register them with llm
        # Initialize and configure MCPClient with server parameters
        # mcp = MCPClient(
        #         server_params=StdioServerParameters(
        #             command=shutil.which("npx"),
        #             args=["-y", "@name/mcp-server-name@latest"],
        #             env={"ENV_API_KEY": "<env_api_key>"},
        #         )
        #     )

        # # Create tools schema from the MCP server and register them with llm
        # tools = ToolsSchema(standard_tools=[*tools, *await mcp.register_tools(llm)]) for later in OpenAILLMContext

        # search_tool = {"google_search": {}}
        # tools = ToolsSchema(
        #     #standard_tools=[get_schema_language_tool()],
        #     standard_tools=[],
        #     custom_tools={
        #         # AdapterType.GEMINI:[search_tool]
        #     }
        # )

        gemini_api_key = os.getenv("GEMINI_API_KEY")

        system_instructions = system_instructions if system_instructions else SYSTEM_INSTRUCTIONS
        system_instructions += f"\n\nThe user information is: {user}"

        llm = GeminiMultimodalLiveLLMService(
            api_key=gemini_api_key,
            # voice_id="Zephyr",  # Aoede, Charon, Fenrir, Kore, Puck, Zephyr
            # visit: https://ai.google.dev/gemini-api/docs/models
            # model="gemini-2.0-flash-live-001", # 'gemini-live-2.5-flash-preview', 'gemini-2.0-flash-live-001'
            transcribe_user_audio=True,
            transcribe_model_audio=True,
            system_instruction=system_instructions,
            # system_instruction= "You are a helpful AI assistant. Be joyful and friendly.",
            params=InputParams(
                modalities=GeminiMultimodalModalities.TEXT,  # Changed from TEXT to AUDIO for voice responses
                # media_resolution=GeminiMediaResolution.MEDIUM,  # Enable medium resolution for image processing
                # temperature=0.7,
                # max_tokens=500
            ),
            tools=get_tools_schema(data),
        )

        

        # regiter the tool function according to their schema
        # llm.register_function("switch_language", switch_language)
        set_tools_functions(llm, data)


        # For LLM context 
        
        messages = []
        if len(session_messages) == 0:
            messages = [
                # {
                #     "role": "system",
                #     "content" : SYSTEM_INSTRUCTIONS
                # },
            ]
        else:
            messages = session_messages

        # messages = [
        #     {
        #         "role": "system",
        #         # "content" : SYSTEM_INSTRUCTIONS
        #         "content" : "You are a helpful AI assistant. Be joyful and friendly."
        #     },
        # ]

        context = OpenAILLMContext(
            messages,
            # tools=tools,
        )

        context_aggregator = llm.create_context_aggregator(context)

        # For user idle
        user_idle = UserIdleProcessor(
            callback=handle_user_idle,  # Your callback function
            timeout=40.0,               # Seconds of inactivity before triggering
        )

        global rtvi

        # For realtime using websocket event for client side
        rtvi = RTVIProcessor(config=RTVIConfig(config=[]))
    
        global pipeline

        pipeline = Pipeline(
            [
                transport.input(),  # Transport user input
                rtvi,  # RTVI processor
                # stt_mute_processor,
                # transcription_logger,
                # user_idle,
                transcript.user(),              # Captures user transcripts
                context_aggregator.user(),  # User responses
                llm,  # LLM Live Gemini API
                tts_french, # TTS with Rime API
                transport.output(),  # Transport bot output
                transcript.assistant(),         # Captures assistant transcripts
                context_aggregator.assistant(),  # Assistant spoken responses
            ]
        )    

        min_words_strategy = MinWordsInterruptionStrategy(min_words=3)
        # volume_strategy = VolumeInterruptionStrategy(min_volume=0.8)

        

        task = PipelineTask(
            pipeline,
            idle_timeout_secs=90,  # 1.5 minute timeout, Timeout in seconds before considering the pipeline idle. 
            cancel_on_idle_timeout=False,  # Notify the pipeline that it should cancel itself when idle.
            params=PipelineParams(
                allow_interruptions=True,
                interruption_strategy=[
                    min_words_strategy, 
                    # volume_strategy
                ],
                enable_metrics=True,
                enable_usage_metrics=True,
            ),
            
            enable_turn_tracking=True,
            observers=[RTVIObserver(rtvi)],
        )


        # Handle client connection
        # @rtvi.event_handler("on_client_ready")
        # async def on_client_ready(rtvi):
        #     # Signal bot is ready to receive messages
        #     await rtvi.set_bot_ready()
        #     # Initialize the conversation
        #     await task.queue_frames([context_aggregator.user().get_context_frame()])

        # We will register temporary the images from googel after the conversation is done
        temp_images = []

        
        # Handle custom message from client
        # @rtvi.event_handler("on_client_message")
        # async def on_client_message_local(rtvi_processor, msg):
        #     print("RTVI client message:", msg.type, msg.data)
        #     if msg.type == "image_input":
        #         print("🖼️ Processing image input...")
                
        #         try:
        #             # Extract data safely
        #             data = msg.data
        #             if not isinstance(data, dict):
        #                 print(f"❌ Data is not a dict, it's: {type(data)}")
        #                 return
                        
        #             content = data.get('content', '')
        #             file_info = data.get('file', {})
                    
        #             print(f"📝 User prompt: '{content}'")
        #             print(f"📁 File type: {file_info.get('type')}")
        #             print(f"📄 File name: {file_info.get('name')}")
                    
        #             if file_info.get('type') == 'image_url' and file_info.get('url'):
        #                 # Extract base64 image data
        #                 image_url = file_info['url']
        #                 if image_url.startswith('data:image/'):
        #                     # Parse data URL: data:image/jpeg;base64,<base64_data>
        #                     header, base64_data = image_url.split(',', 1)
        #                     mime_type = header.split(';')[0].split(':')[1]  # e.g., 'image/png'
                            
        #                     print(f"🎨 Processing {mime_type} image...")
                            
        #                     # Decode base64 image
        #                     import base64
        #                     from PIL import Image
                            
        #                     image_bytes = base64.b64decode(base64_data)
                            
        #                     # Open image to get dimensions and convert to JPEG for Gemini
        #                     with Image.open(io.BytesIO(image_bytes)) as img:
        #                         size = img.size  # (width, height)
                                
        #                         # Convert to RGB if necessary (for JPEG compatibility)
        #                         if img.mode != 'RGB':
        #                             img = img.convert('RGB')
                                
        #                         # Save as JPEG for Gemini
        #                         img_buffer = io.BytesIO()
        #                         img.save(img_buffer, format='JPEG')
        #                         raw_image_bytes = img_buffer.getvalue()
                            
        #                     # Visit: https://ai.google.dev/api/files#files_create_image-SHELL
        #                     # We upload temporary the image to gemini api storage
                            
        #                     import requests
                            
                            
        #                     # Get Gemini API key from environment
                        
        #                     if not gemini_api_key:
        #                         print("❌ GEMINI_API_KEY environment variable not set")
        #                         return
                            
        #                     # Extract image data from the request
        #                     image_data = file_info
        #                     if not image_data or "url" not in image_data:
        #                         print("❌ No image data found in request")
        #                         return
                            
        #                     # Parse the data URL to get base64 content and mime type
        #                     data_url = image_data["url"]
        #                     if not data_url.startswith("data:"):
        #                         print("❌ Invalid data URL format")
        #                         return
                            
        #                     # Extract mime type and base64 data
        #                     header, base64_data = data_url.split(",", 1)
        #                     mime_type = header.split(":")[1].split(";")[0]
                            
        #                     # Decode base64 to binary
        #                     import base64
        #                     image_bytes = base64.b64decode(base64_data)
                            
        #                     print(f"🖼️ Processing image: {mime_type}, size: {len(image_bytes)} bytes")
                            
        #                     # Step 1: Upload image to Gemini API storage
        #                     upload_url = f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={gemini_api_key}"
                            
        #                     # Initial resumable request to get upload URL
        #                     upload_headers = {
        #                         "X-Goog-Upload-Protocol": "resumable",
        #                         "X-Goog-Upload-Command": "start",
        #                         "X-Goog-Upload-Header-Content-Length": str(len(image_bytes)),
        #                         "X-Goog-Upload-Header-Content-Type": mime_type,
        #                         "Content-Type": "application/json"
        #                     }
                            
        #                     upload_metadata = {
        #                         "file": {
        #                             "display_name": "uploaded_image"
        #                         }
        #                     }
                            
        #                     print("📤 Starting file upload to Gemini API...")
        #                     upload_response = requests.post(
        #                         upload_url,
        #                         headers=upload_headers,
        #                         json=upload_metadata
        #                     )
                            
        #                     if upload_response.status_code != 200:
        #                         print(f"❌ Upload initialization failed: {upload_response.status_code}")
        #                         print(f"Response: {upload_response.text}")
        #                         return
                            
        #                     # Extract upload URL from response headers
        #                     upload_session_url = upload_response.headers.get("X-Goog-Upload-URL")
        #                     if not upload_session_url:
        #                         print("❌ No upload URL received from Gemini API")
        #                         return
                            
                            
        #                     # Step 2: Upload the actual image bytes
        #                     upload_data_headers = {
        #                         "Content-Length": str(len(image_bytes)),
        #                         "X-Goog-Upload-Offset": "0",
        #                         "X-Goog-Upload-Command": "upload, finalize"
        #                     }
                            
        #                     upload_data_response = requests.post(
        #                         upload_session_url,
        #                         headers=upload_data_headers,
        #                         data=image_bytes
        #                     )
                            
        #                     if upload_data_response.status_code != 200:
        #                         print(f"❌ Image upload failed: {upload_data_response.status_code}")
        #                         print(f"Response: {upload_data_response.text}")
        #                         return
                            
        #                     # Parse the uploaded file info
        #                     uploaded_file_info = upload_data_response.json()
        #                     file_uri = uploaded_file_info.get("file", {}).get("uri")
        #                     file_name = uploaded_file_info.get("file", {}).get("name")
        #                     # mime_type = uploaded_file_info.get("file", {}).get("mimeType")
                            
        #                     if not file_uri or not file_name:
        #                         print("❌ Failed to get file URI or name from upload response")
        #                         print(f"Response: {uploaded_file_info}")
        #                         return
                            
        #                     print(f"✅ Image uploaded successfully: {file_name}")
        #                     print(f"📁 File URI: {file_uri}")
        #                     print(f"✅ Created image frame: {size}, format: JPEG, size: {len(raw_image_bytes)} bytes")

                            
        #                     # Add text prompt to conversation context (NOW WE CAN ACCESS VARIABLES!)
        #                     prompt_text = content if content.strip() else "What do you see in this image?"
        #                     messages.append({
        #                         "role": "user", 
        #                         "content": [
        #                             {
        #                                 "type": "text",
        #                                 "text": prompt_text
        #                             },
        #                             {
        #                                 "type": "file_data",
        #                                 "file_data": {
        #                                     "mime_type": mime_type,
        #                                     "file_uri": file_uri
        #                                 }
        #                             }
        #                         ]
        #                     })
                            
        #                     print(f"📤 Sending to Gemini - Prompt: '{prompt_text}'")


        #                     # We send back the user message to the client
        #                     await rtvi.send_server_message({
        #                         "type": "image_input_response",
        #                         "data": {
        #                             "content": prompt_text,
        #                             "role": "user"
        #                         }
        #                     })
                            
        #                     # Push both image frame and context to pipeline
        #                     # await task.queue_frames([
        #                     #     image_frame,  # Send image frame first
        #                     #     context_aggregator.user().get_context_frame()  # Then text context
        #                     # ])
        #                     # await task.queue_frames([context_aggregator.user().get_context_frame()])

        #                     # Step 3: We save the image in a temporary list
        #                     temp_images.append(file_name)
                            
        #                     print("✅ Multimodal message sent to Gemini successfully!")
                            
        #                 else:
        #                     print("❌ Invalid image URL format")
        #             else:
        #                 print("❌ No valid image data found in message")
                        
        #         except Exception as e:
        #             print(f"❌ Error processing image input: {e}")
        #             import traceback
        #             traceback.print_exc()
        #     # Kick off the conversation
        #     # await task.queue_frames([context_aggregator.user().get_context_frame()])
                
                
                

        @transport.event_handler("on_client_connected")
        async def on_client_connected(transport, client):
            logger.info(f"Client connected")
            # Kick off the conversation.
            if task is not None:
                if len(messages) == 0:
                    messages.append({"role": "system", "content": f"Say hello and briefly introduce yourself. Your initial response should be in  {VOICE_IDS[current_language]['language']}."})
                    await task.queue_frames([context_aggregator.assistant().get_context_frame()])

        @transcript.event_handler("on_transcript_update")
        async def handle_transcript_update(processor, frame):
            # Each message contains role (user/assistant), content, and timestamp
            for message in frame.messages:
                print(f"[{message.timestamp}] {message.role}: {message.content}")
        
        # Optional: Add function call feedback
        @llm.event_handler("on_function_calls_started")
        async def on_function_calls_started(service, function_calls):
            # Check if any of the function calls are NOT switch_language
            if task is not None:
                did_speak = False
                for function_call in function_calls:
                    function_name = getattr(function_call, 'function_name', "")
                    logger.info(f"Processing function call: {function_name}")
                    
                    # if not did_speak:
                    #     messages.append({"role": "system", "content": f"You are doing background processing, say something short( max 5 words) to the user to wait for a moment. Your response should be in  {VOICE_IDS[current_language]['language']}."})
                    #     await task.queue_frames([context_aggregator.assistant().get_context_frame()])
                    #     did_speak = True
                    #     break
        
        @llm.event_handler("on_function_calls_completed")
        async def on_function_calls_completed(service, function_calls, results):
            logger.info(f"Function calls completed: {function_calls} with results: {results}")
            
            for i, function_call in enumerate(function_calls):
                function_name = getattr(function_call, 'function_name', "")
                if function_name == "switch_language":
                    logger.info(f"Language switching function completed")
                    if i < len(results):
                        logger.info(f"Switch result: {results[i]}")
                else:
                    logger.info(f"Other function completed: {function_name}")
            
                
        # Handle participant disconnection
        @transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            await task.cancel()
            
        @transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport, client):
            logger.info(f"Client disconnected")
            if task is not None:
                # We delete the images from the temporary list
                if len(temp_images) > 0:
                    for file_name in temp_images:
                        # Step 3: Clean up - delete the uploaded file
                        print(f"🗑️ Cleaning up uploaded file: {file_name}")
                        try:
                            await llm.file_api.delete_file(file_name)
                            print(f"✅ File deleted successfully: {file_name}")
                        except Exception as delete_error:
                            print(f"⚠️ Warning: Failed to delete file {file_name}: {delete_error}")
                        
                await task.cancel()

        @task.event_handler("on_idle_timeout")
        async def on_idle_timeout(task):
            logger.info("Pipeline has been idle for too long")
            # Perform any custom cleanup or logging
            # Note: If cancel_on_idle_timeout=True, the pipeline will be cancelled after this handler runs
            
            # Add a farewell message
            messages.append({"role": "system", "content": f"The client has been idle based on the timeout for the session. Say goodbye and end the conversation. Your response should be in  {VOICE_IDS[current_language]['language']}."})
            await task.queue_frame(context_aggregator.assistant().get_context_frame())

            # Then end the conversation gracefully
            await task.stop_when_done()

        runner = PipelineRunner(handle_sigint=False)

        await runner.run(task)
    except Exception as e:
        logger.error(f"Error in run_bot: {e}")
        if task is not None:
            await task.cancel()

    


async def run_agent(webrtc_connection, data = {}):
    """Main bot entry point for the bot starter."""

    # Optional: Path to the local Smart Turn model
    #smart_turn_model_path = os.getenv("LOCAL_SMART_TURN_MODEL_PATH")
    #model_path_exists = os.path.exists(smart_turn_model_path)

    transport = SmallWebRTCTransport(
        params=TransportParams(
            audio_in_filter=NoisereduceFilter(), # Enable noise reduction
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    stop_secs=0.2,
                    temperature=0.0
                )
            ),
            transcription_enabled=True,
            audio_out_10ms_chunks=3,
            # turn_analyzer=LocalSmartTurnAnalyzerV2(
            #     smart_turn_model_path=smart_turn_model_path if model_path_exists else None,
            #     params=SmartTurnParams(
            #         stop_secs=2.0,
            #         pre_speech_ms=0.0,
            #         max_duration_secs=8.0
            #     )
            # )
            
        ),
        webrtc_connection=webrtc_connection,
    )

    await run_bot(transport, data)

