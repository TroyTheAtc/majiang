#!/bin/bash
cd "$(dirname "$0")"
PORT=8081

# 结束占用端口的进程
if lsof -ti :"$PORT" >/dev/null 2>&1; then
  echo "正在停止端口 ${PORT} 上的服务..."
  lsof -ti :"$PORT" | xargs kill 2>/dev/null
  sleep 1
fi

# 启动服务
exec ./start.sh
