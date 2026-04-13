#!/usr/bin/env python3
"""
Z.AI Vision MCP Server - Python wrapper
Вызывает Z.AI Vision MCP tools через subprocess + JSON-RPC over stdio.

Использование:
    python3 analyze.py <tool> <image_path> [prompt]

Примеры:
    python3 analyze.py analyze_image /path/to/screenshot.png "Что на картинке?"
    python3 analyze.py extract_text_from_screenshot /path/to/screenshot.png
"""
import subprocess, json, os, time, select, sys

# API key — читаем из переменной или из auth-profiles.json (только zai профиль)
ZAKEY = os.environ.get("Z_AI_API_KEY", "")
if not ZAKEY:
    try:
        import json as _json
        with open(os.path.expanduser("~/.openclaw/agents/main/agent/auth-profiles.json")) as f:
            profiles = _json.load(f)
        # Ищем конкретно zai профиль
        zai_profile = profiles.get("profiles", {}).get("zai:default", {})
        if "key" in zai_profile:
            ZAKEY = zai_profile["key"]
        else:
            # Fallback: ищем любой профиль содержащий zai
            for k, v in profiles.get("profiles", {}).items():
                if "zai" in k.lower() and "key" in v:
                    ZAKEY = v["key"]
                    break
    except:
        pass

TOOLS = {
    "analyze_image": "General-purpose image analysis",
    "extract_text_from_screenshot": "Extract and recognize text from screenshots using OCR",
    "diagnose_error_screenshot": "Diagnose and analyze error messages, stack traces",
    "understand_technical_diagram": "Analyze technical diagrams, flowcharts, UML",
    "analyze_data_visualization": "Analyze charts, graphs, and dashboards",
    "ui_diff_check": "Compare two UI screenshots to identify visual differences",
    "ui_to_artifact": "Convert UI screenshots into code, prompts, design specs, or descriptions",
    "analyze_video": "Analyze video content (use video_path argument instead of image_source)",
}


def call_zai_vision(tool_name: str, arguments: dict, timeout: int = 120) -> str:
    if not ZAKEY:
        return "ERROR: Z_AI_API_KEY not set and no key found in auth-profiles.json"
    
    env = dict(os.environ)
    env["Z_AI_API_KEY"] = ZAKEY
    env["Z_AI_MODE"] = "ZAI"
    
    try:
        proc = subprocess.Popen(
            ["npx", "-y", "@z_ai/mcp-server@latest"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env
        )
    except FileNotFoundError:
        return "ERROR: npx not found. Install Node.js and npm."
    
    try:
        init = json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                       "clientInfo": {"name": "zai-vision-skill", "version": "1.0"}}
        }).encode() + b"\n"
        proc.stdin.write(init); proc.stdin.flush(); time.sleep(3)
        
        drained = 0
        while drained < 10:
            if select.select([proc.stdout], [], [], 0.5)[0]:
                line = proc.stdout.readline()
                if not line: break
                drained += 1
            else: break
        
        call = json.dumps({
            "jsonrpc": "2.0", "id": 2, "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments}
        }).encode() + b"\n"
        proc.stdin.write(call); proc.stdin.flush()
        
        start = time.time()
        while time.time() - start < timeout:
            if select.select([proc.stdout], [], [], 2.0)[0]:
                line = proc.stdout.readline()
                if not line: break
                try:
                    resp = json.loads(line)
                    if resp.get("id") == 2 and "result" in resp:
                        if resp["result"].get("isError"):
                            return f"ERROR: {resp['result'].get('content', [{}])[0].get('text', 'Unknown error')}"
                        content = resp["result"].get("content", [])
                        texts = [c.get("text", "") for c in content if isinstance(c, dict)]
                        return "\n".join(texts)
                except json.JSONDecodeError: pass
            time.sleep(0.1)
        return "ERROR: Timeout"
    finally:
        try: proc.stdin.close()
        except: pass
        try: proc.wait(timeout=5)
        except: pass


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 analyze.py <tool> <image_path_or_url> [prompt]")
        print("\nTools:", ", ".join(TOOLS.keys()))
        sys.exit(1)
    
    tool = sys.argv[1]
    image = sys.argv[2]
    prompt = sys.argv[3] if len(sys.argv) > 3 else "Describe this image"
    
    if tool not in TOOLS:
        print(f"Unknown: {tool}. Available: {', '.join(TOOLS.keys())}")
        sys.exit(1)
    
    args = {"video_path": image, "prompt": prompt} if tool == "analyze_video" else {"image_source": image, "prompt": prompt}
    print(call_zai_vision(tool, args))
