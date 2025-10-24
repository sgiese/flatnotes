#!/usr/bin/env python3
"""
Simple proxy server that serves the frontend and proxies API requests including WebSocket
This allows the entire app to work through a single Cloudflare tunnel port
"""

import asyncio
import websockets
import aiohttp
from aiohttp import web
import aiofiles
import os
import mimetypes

# Backend configuration
BACKEND_HOST = 'localhost'
BACKEND_PORT = 8003
FRONTEND_DIR = '/home/sgiese/coding/flatnotes/house-checklist/frontend'

async def serve_static(request):
    """Serve static frontend files"""
    path = request.path
    if path == '/':
        path = '/index.html'
    
    file_path = os.path.join(FRONTEND_DIR, path.lstrip('/'))
    
    # Security check
    if not os.path.abspath(file_path).startswith(os.path.abspath(FRONTEND_DIR)):
        return web.Response(status=403)
    
    if not os.path.exists(file_path):
        return web.Response(status=404)
    
    if os.path.isdir(file_path):
        file_path = os.path.join(file_path, 'index.html')
        if not os.path.exists(file_path):
            return web.Response(status=404)
    
    # Get content type
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = 'application/octet-stream'
    
    # Read and serve file
    try:
        async with aiofiles.open(file_path, 'rb') as f:
            content = await f.read()
            return web.Response(body=content, content_type=content_type)
    except Exception as e:
        return web.Response(status=500, text=str(e))

async def proxy_api(request):
    """Proxy API requests to backend"""
    # Remove /api prefix
    backend_path = request.path_qs[4:]  # Remove '/api' prefix
    backend_url = f'http://{BACKEND_HOST}:{BACKEND_PORT}{backend_path}'
    
    # Get request body
    body = await request.read()
    
    # Create headers (filter out some headers)
    headers = {}
    for key, value in request.headers.items():
        if key.lower() not in ['host', 'connection', 'content-length']:
            headers[key] = value
    
    # Make request to backend
    async with aiohttp.ClientSession() as session:
        try:
            async with session.request(
                method=request.method,
                url=backend_url,
                data=body,
                headers=headers,
                allow_redirects=False
            ) as response:
                # Get response body
                resp_body = await response.read()
                
                # Create response with backend's status and headers
                resp_headers = {}
                for key, value in response.headers.items():
                    if key.lower() not in ['connection', 'transfer-encoding', 'content-length']:
                        resp_headers[key] = value
                
                return web.Response(
                    body=resp_body,
                    status=response.status,
                    headers=resp_headers
                )
        except Exception as e:
            return web.Response(status=502, text=f"Backend error: {str(e)}")

async def websocket_handler(request):
    """Handle WebSocket connections and proxy to backend"""
    ws_client = web.WebSocketResponse()
    await ws_client.prepare(request)
    
    # Connect to backend WebSocket
    backend_ws_url = f'ws://{BACKEND_HOST}:{BACKEND_PORT}/ws'
    
    try:
        async with websockets.connect(backend_ws_url) as ws_backend:
            # Create tasks for bidirectional message forwarding
            async def forward_to_backend():
                async for msg in ws_client:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        await ws_backend.send(msg.data)
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        print(f'WebSocket error: {ws_client.exception()}')
                        break
            
            async def forward_to_client():
                async for message in ws_backend:
                    await ws_client.send_str(message)
            
            # Run both forwarding tasks concurrently
            await asyncio.gather(
                forward_to_backend(),
                forward_to_client()
            )
    except Exception as e:
        print(f"WebSocket proxy error: {e}")
    finally:
        await ws_client.close()
    
    return ws_client

def create_app():
    """Create the aiohttp application"""
    app = web.Application()
    
    # WebSocket endpoint
    app.router.add_get('/ws', websocket_handler)
    
    # API proxy (all methods)
    app.router.add_route('*', '/api/{path:.*}', proxy_api)
    
    # Static files (must be last)
    app.router.add_route('*', '/{path:.*}', serve_static)
    
    return app

def main():
    port = 8004
    app = create_app()
    
    print(f"Proxy server starting on port {port}")
    print(f"Serving frontend from {FRONTEND_DIR}")
    print(f"Proxying /api/* requests to {BACKEND_HOST}:{BACKEND_PORT}")
    print(f"Proxying WebSocket /ws to ws://{BACKEND_HOST}:{BACKEND_PORT}/ws")
    
    web.run_app(app, host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()