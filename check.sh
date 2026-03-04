#!/bin/bash
cd "$(dirname "$0")"
PORT=8081

echo "=========================================="
echo "  手机访问诊断"
echo "=========================================="
echo ""

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
echo "1. 本机局域网 IP: ${LAN_IP:-（未获取到，请用 ifconfig 查看）}"
echo ""

echo "2. 端口 ${PORT} 监听情况:"
if lsof -i :"$PORT" 2>/dev/null | head -5; then
  echo ""
else
  echo "   无进程监听，请先执行 ./start.sh 或 ./restart.sh"
fi
echo ""

echo "3. 请按顺序自检:"
echo "   • 在【电脑】浏览器打开: http://${LAN_IP:-你的IP}:${PORT}"
echo "     若打不开 → 说明服务未对局域网开放，请用 ./restart.sh 重启后再试"
echo "   • 若电脑能打开、手机打不开 → 多半是路由器「终端隔离」或未连同一 WiFi"
echo "     可尝试: 手机开热点，电脑连手机热点，再在手机浏览器访问上面地址"
echo "=========================================="
