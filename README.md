# 叶卦规则核心

## 规则约定

- 六片叶子按初爻到上爻排列，也就是数组第 1 项在最下方。
- `1` 表示阳爻，`0` 表示阴爻。
- 默认“正面为阳”；切换为“反面为阳”时，六爻模式整体取反。
- 前三位组成下卦，后三位组成上卦。
- 六十四卦使用文王序编号，编号从 1（乾为天）到 64（火水未济）。二进制模式不是自然数顺序。

## API

`hexagram-engine.js` 不依赖 DOM，可用于页面、相机识别或后端：

- `frontsToBits(fronts, { frontIsYang })`：六个布尔状态转六爻字符串。
- `bitsToTrigrams(bits)`：拆解上下卦。
- `lookupHexagram(bits)`：按文王序查找卦名、编号、符号和上下卦。
- `resolveHexagram(fronts, options)`：一次完成叶子到卦象的解析。
- `invertBits(bits)`：反转阴阳，便于验证映射。

`question-answer.js` 是独立的问题回应规则层：

- `classifyQuestion(question)`：识别感情、事业、财务、健康、选择、时机或综合问题。
- `answerQuestion(question, reading)`：输出问题类型、倾向结论、卦象依据、下一步行动和原文证据。

问题回应只对卦象解读作结构化归纳，不改变卦象结果，也不输出医疗、法律或投资确定性结论。

## 模块边界

- `hexagram-engine.js`：纯计算规则，仅负责六片叶子、阴阳、上下卦和文王序映射。
- `readings.js`：64 卦现代白话解读数据，不访问 DOM。
- `data/guaci.json`、`data/tuan.json`、`data/xiang.json`：卦辞、彖传、大象传三层古籍原文及来源定位信息。
- `reading-data.js`：按文王序合并现代解读与三层经典依据，不访问 DOM。
- `reading-view.js`：把已合并的数据渲染到页面，不参与起卦计算。
- `leaf-vision.js`：纯视觉分析模块，负责叶片特征提取、现场双样本比较和六个取景位映射，不访问摄像头或 DOM。
- `camera-controller.js`：摄像头权限、取景、拍照导入、人工校正和识别结果确认。
- `app.js`：用户操作、记录、导出与模块编排。

经典数据整理自 Wikisource 简体《周易》公开文本，JSON 内保留 `source_id`、`edition`、`source_locator` 和校验状态。本项目不复制第三方现代译文；感情、事业、健康及行动建议为本项目的现代归纳。

## 摄像头识别

识别采用现场双样本校准：依次采集一片已知正面、一片已知反面，再识别放置在六个取景位中的叶片。算法比较颜色、亮度、饱和度和局部纹理，输出候选正反与置信度；用户可以逐片点按修正，确认后才写入起卦计算。

- 实时摄像头依赖 `getUserMedia`，部署时必须使用 HTTPS；本地开发可使用 `http://localhost` 或 `http://127.0.0.1`。
- 建议使用无纹理、与叶色反差明显的背景，并保持正反样本和六叶照片的光线一致。
- 不同树种、枯叶、强反光、阴影和叶片重叠都会降低可靠性，因此识别结果始终保留人工确认步骤。
- 无法授权摄像头时，可以通过“拍照导入”完成同样的三步流程。
- JSON 历史记录会保存识别方法、每爻置信度、覆盖率、是否检测到叶片以及是否人工修正。

## 安装到 Android

线上版本通过 GitHub Pages 发布到 `https://chendongsen.github.io/leaf-yigua/`。首次联网打开后，Service Worker 会缓存应用代码、图标和古籍数据；随后可在 Android Chrome 菜单中选择“安装应用”或“添加到主屏幕”。摄像头仅能在 HTTPS 或本机开发地址下使用，并仍需用户授权。

## 应用图标

`assets/icon.svg` 是无文字矢量源文件，`assets/icon-192.png` 和 `assets/icon-512.png` 用于网页图标、iOS 主屏和 Android PWA 安装图标。

## 验证

在此目录运行：

```bash
npm test
```

测试会检查 8 个经卦、64 个唯一模式、乾坤边界、全量反查、上下卦切分、非法输入拒绝，以及 64 卦三层经典依据是否齐全并按文王序对齐。
