# MiniMax 讲述

复用新疆项目的 `speech-2.8-hd`、`Chinese (Mandarin)_Gentleman`、32 kHz 单声道 MP3。同步接口已按 [MiniMax 官方文档](https://platform.minimax.cn/docs/api-reference/speech-t2a-http) 核验。

Vite 服务端插件提供 `GET /api/narration` 状态及 `POST /api/narration`（`{id,text}`）音频生成。密钥从服务端环境变量 `MINIMAX_API_KEY` 或机器现有的 `F:/codex_project/.env.minimax` 读取；可以通过 `MINIMAX_ENV_FILE` 指定文件。密钥不写入客户端、日志、请求记录或音频清单。`MINIMAX_API_BASE` 只允许官方地址。

每个请求按完整参数的 SHA-256 缓存；重复请求合并，生成队列串行并至少间隔 6.3 秒，兼容保守的账户限流。预生成与 Vite 共用文件锁，避免同一段同时发起重复请求。失败保留已成功生成的素材；限流拒绝后批量脚本会等待 30 秒再试。音频和元数据保存到 `public/assets/audio/narration`。

`npm run narration:prepare` 从 `src/data/journey.ts` 的真实 cue 文本预生成全部讲述。可用 `-- --only G1` 或 `-- --limit 1` 缩小生成范围。`cue-manifest.json` 用 cue id 关联音频，并存原文；客户端必须文字完全吻合才复用。静态构建可直接播放这些预生成音频；动态生成只在具备凭据的本地服务上可用。

客户端 `NarrationController.start([{id,text}])` 播放一段；`subscribe`、`onCue`、`onProgress`、`onEnded` 提供真实音频时钟。暂停、继续、定位和停止会保持正确的 cue 身份；旧的异步生成完成后不会重新播放已经离开的场景。系统不会退回浏览器合成音冒充 MiniMax。

`npm run narration:verify` 逐段核对主线文本、cue 关联、文件 SHA-256，并通过 ffprobe 独立检查 MP3 格式、32 kHz 单声道及真实时长。结果保存到 `qa/narration-verification.json`。音频生命周期的针对性验证在 `tests/narration.test.ts`，覆盖取消、生成中暂停/继续、旧播放 Promise、音频时钟、文本更新与失败重试。


## 新音频的资源读取

开发服务禁用了音频目录文件监视，以免生成文件打断当前讲解。新生成的哈希音频由narration-assets.mjs直接提供，不依赖开发服务启动时的public文件索引；GET/HEAD返回audio/mpeg，支持单段Range请求，缺失音频返回404而非应用HTML。清单直接读取当前文件。测试：node --test tests/narration-assets.integration.mjs，覆盖服务启动后新增文件、HEAD、完整播放、区间读取、缺失与异常请求。正式静态包仍包含已准备音频；本地生成服务不包含在前端脚本中。
