# 🌌 Edge CyberLink Shortener

> 一个基于边缘计算（Edge Function）的高性能短链接生成系统。具备赛博朋克风格的 UI 界面，支持自定义 ID，利用 EdgeKV 实现毫秒级读取与跳转。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Edge_Runtime-purple.svg)
![Storage](https://img.shields.io/badge/storage-EdgeKV-cyan.svg)

## ✨ 项目亮点

* **⚡️ 边缘原生**：运行在边缘节点（Edge Worker），全球访问低延迟，无需源站服务器。
* **🎨 赛博朋克 UI**：内置由 HTML/CSS 构建的科技感前端界面，无需额外部署前端资源。
* **🔗 灵活生成**：
    * 支持**系统自动生成** 6 位随机短码。
    * 支持**用户自定义**短码（如 `/my-link`），并自动检测冲突。
* **🛡 鲁棒性设计**：
    * 自动处理 URL 结尾斜杠问题（Trailing Slash）。
    * 支持 URL 解码，防止特殊字符导致 404。
    * 内置简单的 API 错误反馈。
* **💾 高效存储**：使用 EdgeKV（Key-Value Store）进行持久化存储。

## 🛠 技术栈

* **Runtime**: Edge Worker / Edge Function (支持标准 Fetch API)
* **Database**: EdgeKV (Namespace: `ns`)
* **Frontend**: 原生 HTML5 + CSS3 (Grid/Flexbox) + Vanilla JS
* **Font**: Google Fonts (Orbitron)

## 🚀 快速开始

### 1. 环境准备
确保你的边缘计算平台（如 Akamai EdgeWorkers, Cloudflare Workers 等）已开启 **EdgeKV** 或同类 KV 存储服务。

### 2. 初始化 KV 命名空间
在你的控制台中创建一个命名空间。本项目默认配置如下：
* **Namespace**: `ns`
* **Group**: `default` (或根据平台配置)

> **注意**：如果你更改了命名空间名称，请在 `main.js` 中同步修改：
> ```javascript
> const edgeKV = new EdgeKV({ namespace: '你的命名空间' });
> ```

### 3. 部署代码
将 `main.js` (或 `index.js`) 上传至你的边缘函数服务，并发布版本。

## 📖 API 文档

### 1. 创建短链接
可以通过 UI 界面创建，也可以直接调用 API。

* **Endpoint**: `/create`
* **Method**: `GET` (或 POST)
* **Query Parameters**:

| 参数 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `url` | String | ✅ | 原始长链接 (需以 http/https 开头) |
| `id` | String | ❌ | 自定义短链 ID (4-32位，仅限字母数字-_) |

**请求示例**:
```http
GET /create?url=[https://www.google.com](https://www.google.com)&id=my-search
