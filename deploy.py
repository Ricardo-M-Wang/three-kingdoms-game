"""部署脚本：将项目部署到 Linux 服务器"""
import paramiko
import os
import sys
import tarfile
import io
import time

SERVER_IP = "101.35.89.132"
SERVER_USER = "root"
SERVER_PASS = "!tbTr9~2c+eF"
REMOTE_DIR = "/opt/san-kingdoms"

# 需要上传的文件列表
FILES_TO_UPLOAD = [
    "Dockerfile",
    "docker-compose.yml",
    ".dockerignore",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "vite.config.ts",
    "index.html",
]


def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASS, timeout=15)
    return client


def run_cmd(ssh, cmd, desc=""):
    if desc:
        print(f"  [{desc}]")
    print(f"  $ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err and "WARNING" not in err:
        print(f"  STDERR: {err[:200]}")
    return out, err


def upload_files(ssh):
    """通过 SFTP 上传项目文件"""
    sftp = ssh.open_sftp()

    # 确保远程目录存在
    try:
        sftp.stat(REMOTE_DIR)
    except FileNotFoundError:
        sftp.mkdir(REMOTE_DIR)

    # 上传根目录关键文件
    for f in FILES_TO_UPLOAD:
        local = os.path.join(os.path.dirname(__file__), f)
        if os.path.exists(local):
            remote = f"{REMOTE_DIR}/{f}"
            print(f"  Uploading {f} -> {remote}")
            sftp.put(local, remote)

    # 上传 client/ 目录
    local_client = os.path.join(os.path.dirname(__file__), "client")
    remote_client = f"{REMOTE_DIR}/client"
    print(f"  Uploading client/ ...")

    # 上传 game/ 目录
    local_game = os.path.join(os.path.dirname(__file__), "game")
    remote_game = f"{REMOTE_DIR}/game"
    print(f"  Uploading game/ ...")

    def upload_dir(local_dir, remote_dir):
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            sftp.mkdir(remote_dir)
        for item in os.listdir(local_dir):
            local_path = os.path.join(local_dir, item)
            remote_path = f"{remote_dir}/{item}".replace("\\", "/")
            if os.path.isfile(local_path):
                try:
                    sftp.put(local_path, remote_path)
                except Exception as e:
                    print(f"    WARN: {item} - {e}")
            elif os.path.isdir(local_path):
                upload_dir(local_path, remote_path)

    upload_dir(local_client, remote_client)
    upload_dir(local_game, remote_game)

    # 上传 server/ 目录
    local_server = os.path.join(os.path.dirname(__file__), "server")
    remote_server = f"{REMOTE_DIR}/server"
    print(f"  Uploading server/ ...")
    upload_dir(local_server, remote_server)

    # 上传 public/ 目录
    local_public = os.path.join(os.path.dirname(__file__), "public")
    remote_public = f"{REMOTE_DIR}/public"
    print(f"  Uploading public/ ...")
    upload_dir(local_public, remote_public)

    sftp.close()


def main():
    print(f"=== 三国志 部署脚本 ===")
    print(f"目标: {SERVER_USER}@{SERVER_IP}:{REMOTE_DIR}\n")

    # 1. 连接并检查环境
    print("[1/4] 连接服务器并检查环境...")
    ssh = ssh_connect()
    run_cmd(ssh, "uname -a", "系统信息")
    run_cmd(ssh, "docker --version && docker compose version", "Docker 版本")
    run_cmd(ssh, f"mkdir -p {REMOTE_DIR}", "创建项目目录")

    # 2. 上传文件
    print("\n[2/4] 上传项目文件...")
    upload_files(ssh)

    # 3. 构建并启动
    print(f"\n[3/4] Docker Compose 构建并启动...")
    run_cmd(
        ssh,
        f"cd {REMOTE_DIR} && docker compose down --remove-orphans 2>/dev/null; docker compose build --no-cache && docker compose up -d",
        "构建并启动",
    )

    # 4. 验证
    print(f"\n[4/4] 验证服务...")
    time.sleep(5)
    run_cmd(ssh, "docker compose ps", "容器状态")
    run_cmd(ssh, "docker compose logs --tail=20 app", "应用日志")
    run_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/", "HTTP 状态码")

    ssh.close()
    print(f"\n=== 部署完成 ===")
    print(f"访问地址: http://{SERVER_IP}:3001")
    print(f"确保服务器防火墙开放 3001 端口")


if __name__ == "__main__":
    main()
