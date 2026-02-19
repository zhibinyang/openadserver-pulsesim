# OpenAdServer PulseSim-2026

[English Documentation](./README.md)

**PulseSim-2026** 是为 OpenAdServer 设计的高级流量模拟引擎。它利用 LLM（大语言模型）生成的场景和确定性概率引擎，生成高度真实的、基于故事背景的广告流量模式。

## 🚀 核心功能

*   **LLM 驱动的场景生成**: 使用 Gemini AI 根据真实节日和事件生成每日流量脚本 (`daily_script.json`)。
*   **真实的流量分布**: 基于真实的市场份额数据（国家、操作系统、浏览器）编程生成用户池。
*   **动态 QPS**: 模拟自然的 24 小时流量曲线，包含昼夜循环和随机波动。
*   **事件模拟**:
    *   **广告请求**: 验证目标受众匹配。
    *   **点击与转化**: 真实的 CTR (2%) 和 CVR (5%)，支持长尾时间延迟（最长 24 小时）。
*   **热重载**: 自动检测并应用每日脚本的更改，无需重启服务。
*   **Docker 就绪**: 支持容器化的一键部署。

## 📦 安装与部署

### 前置要求
*   Node.js (v18+)
*   Docker & Docker Compose (可选)
*   OpenAdServer API 访问权限

### Docker 部署 (推荐)
1.  克隆代码仓库。
2.  配置环境变量：
    ```bash
    cp .env.example .env
    # 编辑 .env 文件，填入 GEMINI_API_KEY 和 OPENADSERVER_HOST
    ```
3.  启动服务：
    ```bash
    docker-compose up -d --build
    ```

### 手动部署
1.  安装依赖：
    ```bash
    npm install
    ```
2.  构建项目：
    ```bash
    npm run build
    ```
3.  启动引擎：
    ```bash
    npm run start:prod
    ```

## 🛠 使用与控制

### 监控统计 (Stats)
查看实时流量统计信息（按端点分组的 HTTP 状态码）：
```bash
curl http://localhost:3002/stats
```
*   `201`: 广告填充成功
*   `204`: 广告请求有效但未返回候选广告

### 手动触发脚本生成
强制 Director 立即生成新的每日场景脚本：
```bash
curl -X POST http://localhost:3002/script/generate
```

## 📂 项目结构

*   `src/director`: 生成每日流量脚本的 AI Agent。
*   `src/engine`: 核心模拟循环 (`Pulse`)、概率引擎和事件队列。
*   `src/registry`: 同步 OpenAdServer 的广告活动数据。
*   `src/tests`: 各个组件的独立测试脚本。
*   `scripts`: 存储生成的 `daily_script.json` 文件。

## 🧪 测试

运行独立组件测试：
```bash
# 测试 Director (生成脚本)
npx ts-node src/tests/test-director.ts

# 测试 Pulse 引擎 (运行循环)
npx ts-node src/tests/test-events.ts
```

## 许可证 (License)
MIT
