#!/bin/bash
set -e
echo "=== 三国志 服务器部署脚本 ==="

# 1. 确保 Docker 运行
echo "[1/5] 启动 Docker..."
systemctl start docker 2>/dev/null || true
systemctl is-active docker || { echo "Docker 启动失败"; exit 1; }

# 2. 配置国内镜像
echo "[2/5] 配置镜像加速..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com"
  ]
}
EOF
systemctl daemon-reload && systemctl restart docker
sleep 2

# 3. 拉取镜像
echo "[3/5] 拉取基础镜像..."
docker pull node:22-alpine 2>&1 | tail -3
docker pull mysql:8.4 2>&1 | tail -3

# 4. 构建并启动
echo "[4/5] 构建并启动..."
cd /opt/san-kingdoms
docker compose down --remove-orphans 2>/dev/null || true
docker compose build 2>&1
docker compose up -d 2>&1

# 5. 检查状态
echo "[5/5] 检查状态..."
sleep 5
docker compose ps
echo ""
echo "=== 部署完成 ==="
echo "访问: http://$(curl -s ifconfig.me):3001"
echo "查看日志: docker compose logs -f app"
