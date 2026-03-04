#!/bin/bash
cd "$(dirname "$0")"
PORT=8081

# 获取本机局域网 IP（手机用同一 WiFi 访问此地址）
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

echo "=========================================="
echo "  麻将账本 - 本地预览"
echo "=========================================="
echo ""
echo "  本机浏览器:  http://localhost:${PORT}"
if [ -n "$LAN_IP" ]; then
  echo "  手机浏览器:  http://${LAN_IP}:${PORT}"
  echo "  （手机需与电脑连接同一 WiFi）"
else
  echo "  手机访问:    请在电脑终端执行 ifconfig 查看本机 IP，"
  echo "              手机浏览器打开 http://<你的IP>:${PORT}"
fi
echo ""
echo "  按 Ctrl+C 停止服务"
echo "=========================================="
echo ""

# 用 serve.py 明确绑定 0.0.0.0，确保手机能访问
python3 "$(dirname "$0")/serve.py"
