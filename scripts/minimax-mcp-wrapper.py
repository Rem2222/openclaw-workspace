#!/usr/bin/env python3
"""MiniMax MCP client wrapper for web_search and understand_image"""

import subprocess
import json
import sys

MCP_CMD = [
    "/home/rem/.local/bin/uvx", "minimax-coding-plan-mcp"
]

ENV = {
    "MINIMAX_API_KEY": "sk-cp-JqkXlcj0NLALaq1zVJM33J4mwMs2U-Lj5lv3y3Ai2WTCDOB-JNwtjxAWeGSP8TL3jmsHVQ4aWS7u6j4uyVz8e9P_iX5gKm0fi1qUpx3npuwLXP1cQ9BQDzg",
    "MINIMAX_API_HOST": "https://api.minimax.io"
}

def send_jsonrpc(proc, req):
    proc.stdin.write(json.dumps(req) + "\n")
    proc.stdin.flush()

def read_jsonrpc(proc):
    line = proc.stdout.readline()
    return json.loads(line)

def main():
    if len(sys.argv) < 3:
        print("Usage: minimax-mcp-wrapper.py <tool> <args...>", file=sys.stderr)
        sys.exit(1)
    
    tool = sys.argv[1]
    if tool == "web_search":
        if len(sys.argv) < 3:
            print("Usage: minimax-mcp-wrapper.py web_search <query>", file=sys.stderr)
            sys.exit(1)
        query = sys.argv[2]
        params = {"query": query}
    elif tool == "understand_image":
        if len(sys.argv) < 4:
            print("Usage: minimax-mcp-wrapper.py understand_image <prompt> <image_source>", file=sys.stderr)
            sys.exit(1)
        prompt = sys.argv[2]
        image_source = sys.argv[3]
        params = {"prompt": prompt, "image_source": image_source}
    else:
        print(f"Unknown tool: {tool}", file=sys.stderr)
        sys.exit(1)
    
    proc = subprocess.Popen(
        MCP_CMD,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=ENV,
        text=True
    )
    
    # Initialize
    send_jsonrpc(proc, {
        "jsonrpc": "2.0",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "wrapper", "version": "1.0"}
        },
        "id": 0
    })
    resp = read_jsonrpc(proc)
    if "error" in resp:
        print(f"Init error: {resp['error']}", file=sys.stderr)
        proc.terminate()
        sys.exit(1)
    
    # Call tool
    send_jsonrpc(proc, {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": tool, "arguments": params},
        "id": 1
    })
    resp = read_jsonrpc(proc)
    
    proc.terminate()
    
    if "error" in resp:
        print(f"Tool error: {resp['error']}", file=sys.stderr)
        sys.exit(1)
    
    # Output result
    result = resp.get("result", {})
    if "content" in result:
        for item in result["content"]:
            if item.get("type") == "text":
                print(item["text"])
    else:
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
