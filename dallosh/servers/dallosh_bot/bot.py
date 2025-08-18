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

import os

from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.parallel_pipeline import ParallelPipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
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
)

from pipecat.processors.user_idle_processor import UserIdleProcessor
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection

from pipecat.processors.filters.stt_mute_filter import STTMuteConfig, STTMuteFilter, STTMuteStrategy

from pipecat.processors.transcript_processor import TranscriptProcessor

# function calling
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema

from mcp import StdioServerParameters
from pipecat.services.mcp_service import MCPClient

from pipecat.utils.text.markdown_text_filter import MarkdownTextFilter
from pipecat.processors.filters.function_filter import FunctionFilter

from pipecat.utils.text.pattern_pair_aggregator import PatternMatch, PatternPairAggregator

from pipecat.audio.interruptions.min_words_interruption_strategy import MinWordsInterruptionStrategy
# from pipecat.audio.interruptions.volume_interruption_strategy import VolumeInterruptionStrategy

from openai.types.chat import ChatCompletionToolParam

load_dotenv(override=True)

# Define a function using the standard schema
async def get_current_weather(params: FunctionCallParams, location: str, format: str):
    """Get the current weather.

    Args:
        location: The city and state, e.g. "San Francisco, CA".
        format: The temperature unit to use. Must be either "celsius" or "fahrenheit".
    """
    weather_data = {"conditions": "sunny", "temperature": "75"}
    await params.result_callback(weather_data)

# update tts settings
async def update_tts_settings(params: FunctionCallParams, language: str):
    """Update the TTS settings.

    Args:
        language: The language to use for the TTS Voice, values: ['fr', 'en'].
    """
    await task.queue_frame(STTUpdateSettingsFrame(
        voice='ff_siwis' if language == 'fr' else 'af_heart',
    ))
    

# Create a tools schema with your functions
# tools = ToolsSchema(standard_tools=[get_current_weather, update_tts_settings])


# Advanced handler with retry logic
async def handle_user_idle(processor, retry_count):
    if retry_count == 1:
        # First attempt - gentle reminder
        if current_language == "en_us":
            await processor.push_frame(TTSSpeakFrame("Are you still there?"))
        else:
            await processor.push_frame(TTSSpeakFrame("Êtes-vous toujours là?"))
        return True  # Continue monitoring
    elif retry_count == 2:
        # Second attempt - more direct prompt
        if current_language == "en_us":
            await processor.push_frame(TTSSpeakFrame("Would you like to continue our conversation?"))
        else:
            await processor.push_frame(TTSSpeakFrame("Voulez-vous continuer notre conversation?"))
        return True  # Continue monitoring
    else:
        # Third attempt - end conversation
        if current_language == "en_us":
            await processor.push_frame(TTSSpeakFrame("I'll leave you for now. Have a nice day!"))
        else:
            await processor.push_frame(TTSSpeakFrame("Ce fût un plaisir de vous aider. Bonne journée!"))
        await processor.push_frame(EndFrame(), FrameDirection.UPSTREAM)
        return False  # Stop monitoring

global pipeline
global tts
global task


async def custom_mute_logic(stt_filter: STTMuteFilter) -> bool:
        #  return boolean condtion
        if stt_filter.config.strategies.contains(STTMuteStrategy.CUSTOM):
             # Tell the user to wait
            if pipeline:
                if current_language == "en_us":
                    await pipeline.push_frame(TTSSpeakFrame(text="Please wait while I process your request."))
                else:
                    await pipeline.push_frame(TTSSpeakFrame(text="Veuillez patienter pendant que je traite votre demande."))
            return True
        
        return False

# log transcription
class TranscriptionLogger(FrameProcessor):
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame):
            print(f"Transcription: {frame.text}")


# Define voice IDs
VOICE_IDS = {
    "fr_fr": {
        "voice": "ff_siwis",
        "language": "French (France)"
    },
    "en_us": {
        "voice": "af_heart",
        "language": "English (United States)"
    },
}
current_language = "fr_fr"

async def switch_language(params: FunctionCallParams):
    global current_language
    if task and params.arguments["language"] in VOICE_IDS:
        current_language = params.arguments["language"]
        # Runtime voice switching via settings update
        await task.queue_frame(TTSUpdateSettingsFrame({
            "voice": VOICE_IDS[current_language]["voice"]
        }))

        await params.result_callback(
            {"voice": f"Your answers from now on should be in {VOICE_IDS[current_language]['language']}."}
        )
    else:
        current_language = "en_us"
        await params.result_callback(
            {"voice": f"Your answers from now on should be in {VOICE_IDS['en_us']['language']}."}
        )


async def english_filter(frame) -> bool:
    return current_language == 'en_us'


async def french_filter(frame) -> bool:
    return current_language == 'fr_fr'

def get_language_tool():
    return ChatCompletionToolParam(
        type="function",
        function={
            "name": "switch_language",
            "description": "Switch to another language code when interacting with the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "description": f"The language code that you will respond natively according to the user language. Eg: fr_fr for french native, en_us for english native",
                    },
                },
                "required": ["language"],
            },
        },
    )

async def run_bot(transport: BaseTransport):
    logger.info(f"Starting bot")

    stt = OpenAISTTService(
        api_key=os.getenv("OPENAI_API_KEY", "sk-proj-1234567890"),
        model="firelily/quick-listing",
        base_url="http://192.168.1.117:8000/v1",
        prompt="Transcribe technical terms accurately. Format numbers as digits rather than words. Don't try to translate the text, just transcribe it.",
        temperature=0.0,  # Deterministic output
    )

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

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY", "sk-proj-1234567890"),
        model="qwen3:1.7b-fp16",
        base_url="http://192.168.1.117:11434/v1",
        params=OpenAILLMService.InputParams(
            temperature=0.3,
            max_tokens=500
        )
    )

    # Create the filter
    md_filter = MarkdownTextFilter()

    # Create pattern aggregator
    pattern_aggregator = PatternPairAggregator()

    # Add pattern for voice tags
    pattern_aggregator.add_pattern_pair(
        pattern_id="voice_tag",
        start_pattern="<voice>",
        end_pattern="</voice>",
        remove_match=True # remove the voice tag from the text
    )

    pattern_aggregator.add_pattern_pair(
        pattern_id="think_tag",
        start_pattern="<think>",
        end_pattern="</think>",
        remove_match=True # remove the voice tag from the text
    )

    pattern_aggregator.add_pattern_pair(
        pattern_id="assistant_header_id",
        start_pattern="<|start_header_id|>",
        end_pattern="</|start_header_id|>",
        remove_match=True # remove the voice tag from the text
    )

    pattern_aggregator.add_pattern_pair(
        pattern_id="assistant_header_id2",
        start_pattern="<start_header_id>",
        end_pattern="</start_header_id>",
        remove_match=True # remove the voice tag from the text
    )


    # Register handler for voice switching
    async def on_voice_tag(match: PatternMatch):
        voice_name = match.content.strip().lower()
        if voice_name in VOICE_IDS:
            # First flush any existing audio to finish the current context
            # await tts.flush_audio()
            voice_id = VOICE_IDS[voice_name]
            tts.set_voice(voice_id)
            logger.info(f"Switched to {voice_name} voice")
        else:
            # await tts.flush_audio()
            tts.set_voice("af_heart")
            logger.info(f"Switched to default voice")

    pattern_aggregator.on_pattern_match("voice_tag", on_voice_tag)

    tts_english = OpenAITTSService(
        api_key=os.getenv("OPENAI_API_KEY", "sk-proj-1234567890"),
        model="speaches-ai/Kokoro-82M-v1.0-ONNX-fp16",
        base_url="http://192.168.1.117:8000/v1",
        instructions="Speak in a friendly and conversational tone. Use natural pauses, emotions and intonation to make your responses sound like a human.",
        voice=VOICE_IDS['en_us']["voice"],
        text_filter=md_filter,
        text_aggregator=pattern_aggregator
    )

    tts_french = OpenAITTSService(
        api_key=os.getenv("OPENAI_API_KEY", "sk-proj-1234567890"),
        model="speaches-ai/Kokoro-82M-v1.0-ONNX-fp16",
        base_url="http://192.168.1.117:8000/v1",
        voice=VOICE_IDS['fr_fr']["voice"],
        instructions="Parles amicalement et naturellement. Utilise des pauses naturelles, les émotions et des intonations pour que tes réponses sonnent comme un humain.",
        text_filter=md_filter,
        text_aggregator=pattern_aggregator
    )
    
    # For LLM context 

    # regiter the tool function according to their schema
    llm.register_function("switch_language", switch_language)

    # Initialize and configure MCPClient with server parameters
    # mcp = MCPClient(
    #         server_params=StdioServerParameters(
    #             command=shutil.which("npx"),
    #             args=["-y", "@name/mcp-server-name@latest"],
    #             env={"ENV_API_KEY": "<env_api_key>"},
    #         )
    #     )

    # # Create tools schema from the MCP server and register them with llm
    # tools = [*tools, *await mcp.register_tools(llm)] for later in OpenAILLMContext

    languages_list = "\n".join([f"- Code: {voice}, Language: {VOICE_IDS[voice]['language']}" for voice in VOICE_IDS])

    messages = [
        {
            "role": "system",
            "content" : f"""
                You are Ara, a friendly AI assistant. Respond naturally and keep your answers conversational and short. 
                Your output should not include non-alphanumeric characters
                You can switch language at any time according to the user interaction.

                You can speak the following languages: 
                {languages_list}

                You must respond natively from the language the user is speaking with, you will add natural tone, emotions, pauses(if needed like ',' '!', etc.) and intonation to your responses.
            """
        },
    ]

    context = OpenAILLMContext(
        messages,
        tools=[get_language_tool()],
    )


    context_aggregator = llm.create_context_aggregator(context)

    # For user idle
    user_idle = UserIdleProcessor(
        callback=handle_user_idle,  # Your callback function
        timeout=40.0,               # Seconds of inactivity before triggering
    )

    # For realtime using websocket event for client side
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    pipeline = Pipeline(
        [
            transport.input(),  # Transport user input
            rtvi,  # RTVI processor
            stt,
            stt_mute_processor,
            # transcription_logger,
            user_idle,
            transcript.user(),              # Captures user transcripts
            context_aggregator.user(),  # User responses
            llm,  # LLM
            # tts,  # TTS
            ParallelPipeline(  # TTS (bot will speak the chosen language)
                [FunctionFilter(english_filter), tts_english],  # English
                [FunctionFilter(french_filter), tts_french],  # Spanish
            ),
            transport.output(),  # Transport bot output
            transcript.assistant(),         # Captures assistant transcripts
            context_aggregator.assistant(),  # Assistant spoken responses
        ]
    )

    min_words_strategy = MinWordsInterruptionStrategy(min_words=3)
    # volume_strategy = VolumeInterruptionStrategy(min_volume=0.8)

    global task
    # Create the task
    task = PipelineTask(
        pipeline,
        idle_timeout_secs=90,  # 1.5 minute timeout, Timeout in seconds before considering the pipeline idle. 
        cancel_on_idle_timeout=True,  # Notify the pipeline that it should cancel itself when idle.
        params=PipelineParams(
            allow_interruption=True,
            interruption_strategy=[
                min_words_strategy, 
                # volume_strategy
            ],
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info(f"Client connected")
        # Kick off the conversation.
        messages.append({"role": "system", "content": f"Say hello and briefly introduce yourself. Your initial responses should be in  {VOICE_IDS[current_language]['language']}."})
        await task.queue_frames([context_aggregator.user().get_context_frame()])

    @transcript.event_handler("on_transcript_update")
    async def handle_transcript_update(processor, frame):
        # Each message contains role (user/assistant), content, and timestamp
        for message in frame.messages:
            print(f"[{message.timestamp}] {message.role}: {message.content}")
    
    # Optional: Add function call feedback
    @llm.event_handler("on_function_calls_started")
    async def on_function_calls_started(service, function_calls):
        if current_language == "en_us":
            await tts.queue_frame(TTSSpeakFrame("Let me check on that."))
        else:
            await tts.queue_frame(TTSSpeakFrame("Veuillez patienter pendant que je vérifie cela."))

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"Client disconnected")
        await task.cancel()

    @task.event_handler("on_idle_timeout")
    async def on_idle_timeout(task):
        logger.info("Pipeline has been idle for too long")
        # Perform any custom cleanup or logging
        # Note: If cancel_on_idle_timeout=True, the pipeline will be cancelled after this handler runs
        
        # Add a farewell message
        if current_language == "en_us":
            await task.queue_frame(TTSSpeakFrame("I haven't heard from you in a while. Goodbye!"))
        else:
            await task.queue_frame(TTSSpeakFrame("Je ne vous ai pas entendu depuis un moment. Au revoir!"))

        # Then end the conversation gracefully
        await task.stop_when_done()

    runner = PipelineRunner(handle_sigint=False)

    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point for the bot starter."""

    # later we will use fastapi websocket transport: https://docs.pipecat.ai/server/services/transport/fastapi-websocket
    transport = SmallWebRTCTransport(
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
        ),
        webrtc_connection=runner_args.webrtc_connection,
    )

    await run_bot(transport)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
