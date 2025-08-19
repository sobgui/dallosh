# Pipecat Quickstart

Run your first Pipecat bot in under 5 minutes. This example creates a voice AI bot that you can talk to in your browser.

## Prerequisites

### Python 3.10+

Pipecat requires Python 3.10 or newer. Check your version:

```bash
python --version
```

If you need to upgrade Python, we recommend using a version manager like `uv` or `pyenv`.

### AI Service API keys

Pipecat orchestrates different AI services in a pipeline, ensuring low latency communication. In this quickstart example, we'll use:

- [Gemini](https://aistudio.google.com/apikey) for Speech-to-Text transcriptions
- [Gemini](https://aistudio.google.com/apikey) for LLM inference
- [Rime](https://app.rime.ai/tokens/) for Text-to-Speech audio generation

Have your API keys ready. We'll add them to your `.env` shortly.

## Setup

1. Set up a virtual environment

From the `pipecat-quickstart` directory, run:

```bash
python -m venv venv
# Linux and Mac:
source venv/bin/activate  
# On Windows: 
venv\Scripts\activate
```

> Using `uv`? Create your venv using: `uv venv && source venv/bin/activate`.

2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Download models( local-turn )

```bash
cd models
git lfs install
git clone https://huggingface.co/pipecat-ai/smart-turn
```

> Using `uv`? Install requirements using: `uv pip install -r requirements.txt`.

4. Configure environment variables

Create a `.env` file:

```bash
cp env.example .env
```

Then, add your API keys:

```
GOOGLE_API_KEY=
RIME_API_KEY=
LOCAL_SMART_TURN_MODEL_PATH=D:\your\path\model\pipecat-quickstart\models\smart-turn-v2
```

5. Run the example

Run your bot using:

```bash
python bot.py
```

> Using `uv`? Run your bot using: `uv run bot.py`.

**Open http://localhost:7860 in your browser** and click `Connect` to start talking to your bot.

> 💡 First run note: The initial startup may take ~10 seconds as Pipecat downloads required models, like the Silero VAD model.

## Linux-Specific WebRTC Configuration

If you're running this on Linux and want external machines to connect via WebRTC, you need to configure your firewall to allow the required ports:

### Required Ports for WebRTC

```bash
# Main application port
sudo ufw allow 7860

# STUN/TURN server ports (required for WebRTC NAT traversal)
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
```

### Why These Ports?

- **Port 7860**: Main application server
- **Port 3478**: STUN/TURN protocol (UDP for media, TCP for signaling)
- **Port 5349**: STUN/TURN over TLS (secure WebRTC connections)

### Verify Firewall Status

```bash
sudo ufw status
```

You should see all the above ports listed as "ALLOW Anywhere".

### Test External Connectivity

To test if external machines can connect:

1. Find your Linux machine's IP address:
   ```bash
   hostname -I
   ```

2. From another machine on the same network, try accessing:
   ```
   http://YOUR_LINUX_IP:7860
   ```

3. If HTTP works but WebRTC doesn't, check that all the STUN/TURN ports are open.

## Troubleshooting

- **Browser permissions**: Make sure to allow microphone access when prompted by your browser.
- **Connection issues**: If the WebRTC connection fails, first try a different browser. If that fails, make sure you don't have a VPN or firewall rules blocking traffic. WebRTC uses UDP to communicate.
- **Audio issues**: Check that your microphone and speakers are working and not muted.
- **Linux external access**: Ensure all required WebRTC ports (7860, 3478, 5349) are open in your firewall. See the Linux-specific section above.

## Next Steps

- **Read the docs**: Check out [Pipecat's docs](https://docs.pipecat.ai/) for guides and reference information.
- **Join Discord**: Join [Pipecat's Discord server](https://discord.gg/pipecat) to get help and learn about what others are building.
