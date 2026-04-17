# 拼豆 AI 工作台 (Perler Workbench)

抖音精选「内容重构」赛道参赛作品。一句话：**把抖音刷到的拼豆视频 / 任意一张成品图，10 秒变成一个你能直接在网页里玩的铺豆关卡**。

```
抖音链接 / 成品图 → 抽帧 → AI 识别 → MARD-168 色卡量化
                 → 可玩的铺豆画布（点格子标进度）
                 → 珠子清单 + 图纸 PNG，想动手拼就带走
```

## 功能概览

- **两种接入**：粘贴抖音视频链接（短链自动解析 → ffmpeg 抽 10 帧）｜ 直接上传成品图片
- **三步向导**：AI 推荐帧 → 手动旋转 + 框选成品区域 → 一键生成图纸
- **AI Pipeline**：GLM-4V-Flash 估网格与标题 → median / gray-world 白平衡 / 饱和度增强 → **CIEDE2000 Lab 空间色量化** 到 MARD-168 官方色卡
- **铺豆游戏**：Canvas 渲染网格图纸，按色号逐格点击，进度存 SQLite
- **作品墙**：预置图鉴关卡 + 用户生成的图纸共用同一套组件与数据模型

## 本地运行

```bash
# 1. 装依赖
npm install

# 2. 配置环境变量（免费视觉模型 key 去 https://bigmodel.cn 领）
cp .env.example .env
# 编辑 .env 填入 ZHIPU_API_KEY

# 3. 建库 + 灌入 MARD-168 色卡 + 预置关卡
npx prisma migrate deploy
npx prisma db seed

# 4. 起 dev 服务
npm run dev
# → http://localhost:3000
```

## 技术栈

- Next.js 14 (App Router) + TypeScript
- Prisma + SQLite（可换 Turso 线上部署）
- Sharp（图像处理） + ffmpeg-static（抽帧）
- 智谱 GLM-4V-Flash（视觉识别，免费额度足够 demo）
- Tailwind CSS + 原生 Canvas 2D

## 目录结构速览

```
app/api/ingest/candidates   # 接入口：抽帧 + 评分 + 返回会话
app/api/ingest/finalize     # 收尾：旋转 + 裁剪 + 增强 + 量化 + 入库
app/play/[patternId]        # 铺豆游戏页（预置 & UGC 共用）
lib/bead-palette/mard-168   # 168 色卡常量 + Lab 预计算
lib/ai/color-quantizer      # CIEDE2000 最近色匹配
lib/ai/pattern-builder      # 成品图 → Pattern JSON
lib/ai/frame-extractor      # ffmpeg fps=1 抽帧 + mp4 magic 校验
lib/douyin/resolver         # 抖音短链解析
```

## 设计权衡

- **UGC 图纸 ≠ 附赠物**：用户生成的图纸也是一个"关卡实例"，与预置图鉴同一套 PatternCanvas + UserProgress 数据模型，避免双轨代码。
- **色量化必须 Lab 空间**：RGB 欧氏距离会把"橙红和纯红"搞混；CIEDE2000 是这个产品最硬的技术点。
- **旋转交给用户**：早期版本试过让 GLM-4V 回 4 角点 + 旋转角做透视矫正，识别不稳；改为前端 Canvas 所见即所得旋转 + 后端 `sharp.rotate` 完全复刻，更可控。

## 比赛背景

参加抖音精选"内容重构：让视频成为你的生活搭子"赛道。核心诉求是用 AI 把优质短视频从"被看到"变成"可学习、可直接应用的能力"。选择拼豆是因为它的"内容 → 能力"转化**具体可感** —— 一条视频最后真的能变成桌上一件作品。

## 许可与合规

- 仅生成图纸供个人手作参考，不转发 / 不存储原视频文件
- Demo 视频使用自录或 CC 授权素材
