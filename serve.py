#!/usr/bin/env python3
"""绑定 0.0.0.0 的简易 HTTP 服务，方便手机访问"""
import http.server
import socketserver
import os

PORT = 8081
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print("本机: http://localhost:%s" % PORT)
    print("手机: http://<本机IP>:%s  (同 WiFi)" % PORT)
    print("按 Ctrl+C 停止")
    httpd.serve_forever()
