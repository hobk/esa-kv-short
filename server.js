export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // 初始化 EdgeKV (保持你原有的命名空间设置)
      // 请确保在你的平台上正确引入和初始化了 EdgeKV
      const edgeKV = new EdgeKV({ namespace: 'ns' });

      // =========================================================
      // 路由 1: API - 创建短链接
      // 请求: POST /create (body: { url: "...", id?: "..." }) 或 GET
      // 为了方便前端演示，这里使用 GET 参数，生产环境建议用 POST JSON body
      // 请求示例: /create?url=https://google.com&id=my-custom-link
      // =========================================================
      if (path === '/create') {
        const longUrl = url.searchParams.get('url');
        let customId = url.searchParams.get('id'); // 获取可选的自定义 ID

        // --- 1. 基础校验 ---
        if (!longUrl || !longUrl.startsWith('http')) {
          return jsonResponse({ error: '请输入合法的 URL (http/https)' }, 400);
        }

        let shortId;

        // --- 2. 处理自定义 ID ---
        if (customId && customId.trim() !== '') {
          customId = customId.trim();

          // 2.1 格式校验 (只允许字母、数字、下划线、中划线，长度4-32)
          const idRegex = /^[a-zA-Z0-9_-]{4,32}$/;
          if (!idRegex.test(customId)) {
            return jsonResponse({ error: '自定义 ID 格式错误 (4-32位, 仅限字母数字-_)' }, 400);
          }

          // 2.2 冲突校验 (检查 KV 中是否已存在)
          const existing = await edgeKV.get(customId, { type: "text" });
          if (existing) {
            return jsonResponse({ error: '该自定义 ID 已被占用，请换一个' }, 409); // 409 Conflict
          }
          
          shortId = customId;

        } else {
          // --- 3. 如果没有自定义 ID，则自动生成 ---
          // 生成 6 位随机码
          shortId = generateRandomString(6);
          // 注意：极高并发下这里理论上需要做碰撞检测，为简化代码此处省略
        }

        // --- 4. 存入 EdgeKV ---
        // Key=短ID, Value=长链接
        await edgeKV.put(shortId, longUrl);

        // 立即再读一次，确保当前 edge 有值
        await edgeKV.get(shortId);

        const shortLink = `${url.origin}/${shortId}`;

        return jsonResponse({ 
          success: true,
          shortId, 
          shortLink, 
          type: customId ? 'custom' : 'random'
        }, 200);
      }

      // =========================================================
      // 路由 2: 主页 - 展示科技风 UI
      // =========================================================
      if (path === '/' || path === '/index.html') {
        return new Response(htmlPage(), {
          status: 200,
          headers: { 'Content-Type': 'text/html;charset=UTF-8','Cache-Control': 'no-store' }
        });
      }

      // =========================================================
      // 路由 3: 跳转逻辑
      // 请求示例: /abc123 OR /my-custom-link
      // =========================================================
      const potentialId = path.substring(1); // 去掉开头的 "/"

      // 简单过滤掉明显不是短链的请求（比如浏览器请求图标）
      if (potentialId && potentialId !== 'favicon.ico') {
        // 从 KV 获取长链接
        const existingUrl = await edgeKV.get(potentialId, { type: "text" });

        if (existingUrl) {
          // 核心逻辑：302 重定向到长链接
          return new Response(null, {
            status: 302,
            headers: { 
              'Location': existingUrl,
            'Cache-Control': 'no-store'
            }
          });
        }
      }

      // =========================================================
      // 默认: 404 Not Found
      // =========================================================
      return new Response(html404(), { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' ,'Cache-Control': 'no-store'}});

    } catch (error) {
      return jsonResponse({ error: `System Error: ${error.message}` }, 500);
    }
  }
};

// --- 辅助函数 ---

// 生成 JSON 响应
function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*' // 方便测试
    }
  });
}

// 生成随机字符串
function generateRandomString(length) {
  // 去掉了容易混淆的字符 (比如 l, I, O, 0)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- HTML 页面 (科技风美化版) ---
function htmlPage() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edge CyberLink Shortener</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
  <!--1. 阿里云验证码配置 - 在引入验证码JS脚本之前添加全局配置-->
  <script>
    window.AliyunCaptchaConfig = {
      region: "cn",
      prefix: "{{IDENTITY}}"
    };
  </script>
  <!--2. 动态引入阿里云验证码JS-->
  <script type="text/javascript" src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"></script>
  <style>
    :root {
      --neon-blue: #00f3ff;
      --neon-purple: #bd00ff;
      --dark-bg: #050a14;
      --panel-bg: rgba(16, 24, 48, 0.8);
    }
    body {
      font-family: 'Orbitron', sans-serif; /* 使用科技字体 */
      background-color: var(--dark-bg);
      background-image: 
        radial-gradient(circle at 20% 30%, rgba(0, 243, 255, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(189, 0, 255, 0.1) 0%, transparent 50%);
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      position: relative;
    }
    /* 炫光背景层 */
    .container::before {
      content: '';
      position: absolute;
      top: -2px; left: -2px; right: -2px; bottom: -2px;
      background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple), var(--neon-blue));
      z-index: -1;
      filter: blur(10px);
      opacity: 0.7;
      border-radius: 12px;
      animation: glowing 3s linear infinite;
    }
    @keyframes glowing {
      0% { filter: blur(10px) hue-rotate(0deg); }
      100% { filter: blur(10px) hue-rotate(360deg); }
    }

    .card {
      background: var(--panel-bg);
      padding: 2.5rem;
      border-radius: 10px;
      border: 1px solid rgba(0, 243, 255, 0.3);
      box-shadow: 0 0 20px rgba(0, 243, 255, 0.2) inset;
      backdrop-filter: blur(10px);
      width: 100%;
      max-width: 450px;
      text-align: center;
    }
    h1 {
      margin-bottom: 1.5rem;
      font-weight: 700;
      letter-spacing: 2px;
      background: linear-gradient(90deg, var(--neon-blue), #fff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
    }
    .input-group {
      margin-bottom: 1.2rem;
      text-align: left;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: var(--neon-blue);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    input {
      width: 100%;
      padding: 12px;
      background: rgba(0,0,0,0.3);
      border: 2px solid rgba(0, 243, 255, 0.3);
      border-radius: 4px;
      color: var(--neon-blue);
      font-family: 'Courier New', monospace; /* 输入框使用等宽字体更好看 */
      font-size: 1rem;
      box-sizing: border-box;
      transition: all 0.3s ease;
    }
    input:focus {
      outline: none;
      border-color: var(--neon-blue);
      box-shadow: 0 0 15px rgba(0, 243, 255, 0.5);
    }
    input::placeholder {
      color: rgba(0, 243, 255, 0.4);
    }
    button {
      width: 100%;
      padding: 15px;
      margin-top: 1rem;
      background: linear-gradient(90deg, rgba(0,243,255,0.8), rgba(189,0,255,0.8));
      color: white;
      border: none;
      border-radius: 4px;
      font-family: 'Orbitron', sans-serif;
      font-size: 1.1rem;
      font-weight: bold;
      letter-spacing: 2px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.02);
      box-shadow: 0 0 20px rgba(189, 0, 255, 0.7);
    }
    button:active {
        transform: scale(0.98);
    }
    
    /* 结果显示区域 */
    #result-area {
      margin-top: 20px;
      display: none; /* 默认隐藏 */
    }
    .terminal-output {
      background: rgba(0,0,0,0.6);
      border-left: 4px solid var(--neon-blue);
      padding: 15px;
      text-align: left;
      font-family: 'Courier New', monospace;
      border-radius: 4px;
      word-break: break-all;
    }
    .success-text { color: #0f0; }
    .error-text { color: #ff3333; }
    .terminal-output a {
      color: var(--neon-blue);
      text-decoration: none;
      border-bottom: 1px dotted var(--neon-blue);
    }
    .loader {
        border: 3px solid rgba(0, 243, 255, 0.2);
        border-top: 3px solid var(--neon-blue);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
        display: inline-block;
        vertical-align: middle;
        margin-right: 10px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>>>> EDGE LINK SHORTENER</h1>
      
      <div class="input-group">
        <label for="longUrl">原始长链接 (Required)</label>
        <input type="url" id="longUrl" placeholder="https://example.com/very/long/url..." required>
      </div>

      <div class="input-group">
        <label for="customId">自定义短链 ID (Optional)</label>
        <input type="text" id="customId" placeholder="例如: my-cool-link (4-32位)">
      </div>

      <!--验证码元素容器-->
      <div id="captcha-element"></div>
      
      <button id="generateBtn">INITIALIZE SEQUENCE</button>

      <div id="result-area">
        <div class="terminal-output" id="terminalContent"></div>
      </div>

    </div>
  </div>

  <!--3. 验证码初始化脚本-->
  <script type="text/javascript">
    var captcha;
    
    // 验证前的输入校验
    function validateInput() {
      const urlInput = document.getElementById('longUrl');
      const url = urlInput.value;
      
      if (!url) {
        showError(">> ERROR: 长链接不能为空 (URL is required).");
        urlInput.focus();
        return false;
      }
      return true;
    }
    
    // 初始化阿里云验证码
    window.initAliyunCaptcha({
      SceneId: "{{SCENE_ID}}",  // 场景ID，需要替换为实际的场景ID
      mode: "popup",  // 验证码模式：popup弹出式
      element: "#captcha-element",  // 验证码元素容器
      button: "#generateBtn",  // 触发验证码弹窗的按钮
      // 验证码验证通过回调函数
      success: function (captchaVerifyParam) {
        // 先进行输入校验
        if (!validateInput()) {
          if (captcha) captcha.refresh();
          return;
        }
        
        // 获取输入值
        const urlInput = document.getElementById('longUrl');
        const customIdInput = document.getElementById('customId');
        const resultArea = document.getElementById('result-area');
        const btn = document.getElementById('generateBtn');
        
        const url = urlInput.value;
        const customId = customIdInput.value;
        
        // UI Loading State
        btn.disabled = true;
        btn.innerHTML = '<div class="loader"></div> PROCESSING...';
        resultArea.style.display = 'none';
        
        // 构建请求 URL
        let fetchUrl = '/create?url=' + encodeURIComponent(url);
        if (customId) {
          fetchUrl += '&id=' + encodeURIComponent(customId);
        }
        
        // 发起请求，携带验签参数在header中
        fetch(fetchUrl, {
          method: 'GET',
          headers: { 
            'captcha-verify-param': captchaVerifyParam
          },
          credentials: 'include'
        })
        .then(async function(res) {
          const verifyCode = res.headers.get('X-Captcha-Verify-Code');
          const data = await res.json();
          
          // 检查验证码验证结果
          if (verifyCode && verifyCode !== 'T001') {
            showError(">> CAPTCHA ERROR [" + verifyCode + "]: 验证码验证失败，请重试");
            if (captcha) captcha.refresh();
            return;
          }
          
          if (!res.ok) {
            // 处理后端返回的错误 (例如 400 格式错误, 409 ID冲突)
            showError(">> ERROR [" + res.status + "]: " + (data.error || 'Unknown Error'));
          } else {
            // 成功
            showSuccess(data.shortLink, data.type === 'custom');
            // 清空输入框
            urlInput.value = '';
            customIdInput.value = '';
          }
          if (captcha) captcha.refresh();
        })
        .catch(function(e) {
          showError(">> NETWORK ERROR: 连接失败，请检查网络.");
          if (captcha) captcha.refresh();
        })
        .finally(function() {
          // Reset Button State
          btn.disabled = false;
          btn.innerText = 'INITIALIZE SEQUENCE';
        });
      },
      // 验证码验证不通过回调函数
      fail: function (result) {
        console.error('Captcha verification failed:', result);
        showError(">> CAPTCHA ERROR: 验证失败，请重试");
      },
      // 绑定验证码实例回调函数
      getInstance: function (instance) {
        captcha = instance;
      },
      // 指定ESA的服务域名
      server: ['captcha-esa-open.aliyuncs.com', 'captcha-esa-open-b.aliyuncs.com'],
      // 滑块验证和一点即过的验证形态触发框体样式
      slideStyle: {
        width: 360,
        height: 40
      }
    });

    function showError(msg) {
      const resultArea = document.getElementById('result-area');
      const terminalContent = document.getElementById('terminalContent');
      resultArea.style.display = 'block';
      terminalContent.innerHTML = '<span class="error-text">' + msg + '</span>';
    }

    function showSuccess(shortLink, isCustom) {
      const resultArea = document.getElementById('result-area');
      const terminalContent = document.getElementById('terminalContent');
      resultArea.style.display = 'block';
      
      const prefix = isCustom ? ">> CUSTOM LINK ESTABLISHED:" : ">> RANDOM LINK GENERATED:";
      
      terminalContent.innerHTML = 
        '<span class="success-text">Done. Status: ACTIVE.</span><br><br>' +
        prefix + '<br>' +
        '[ <a href="' + shortLink + '" target="_blank" id="finalLink">' + shortLink + '</a> ]' +
        '<br><br><span style="font-size:0.8em;opacity:0.7">Click link to test redirection.</span>';
    }
  </script>
</body>
</html>
  `;
}

// 简单的 404 页面
function html404() {
  return `
  <!DOCTYPE html>
  <html style="background:#050a14;color:var(--neon-blue);font-family:'Orbitron',sans-serif;height:100%;display:flex;justify-content:center;align-items:center;">
  <head><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" rel="stylesheet">
  <style>:root{--neon-blue:#00f3ff;}</style></head>
  <body style="text-align:center;">
    <h1 style="font-size:3em;text-shadow:0 0 20px var(--neon-blue);">404 // NOT FOUND</h1>
    <p>LINK COORDINATES MISSING.</p>
    <a href="/" style="color:var(--neon-blue);margin-top:20px;display:inline-block;">[ RETURN TO BASE ]</a>
  </body>
  </html>
  `
}
