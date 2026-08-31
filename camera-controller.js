import {
  CALIBRATION_REGION,
  analyzeLeafSlots,
  calibrationSeparation,
  extractLeafFeatures,
} from "./leaf-vision.js";

const TARGET_WIDTH = 960;
const TARGET_HEIGHT = 720;

function drawCover(context, source, sourceWidth, sourceHeight) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }
  context.drawImage(source, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
}

export function setupLeafCamera({ onApply, onToast }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("cameraDialog");
  const video = $("cameraVideo");
  const canvas = $("cameraCanvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const status = $("cameraStatus");
  const captureButton = $("cameraCaptureButton");
  const applyButton = $("applyRecognitionButton");
  const resultList = $("cameraResultList");
  const fileInput = $("cameraFileInput");
  const stageButtons = Array.from(dialog.querySelectorAll("[data-camera-step]"));
  let stream = null;
  let stage = "front";
  let calibration = { front: null, back: null };
  let results = [];

  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;

  function setStatus(message, tone = "neutral") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function updateStage(nextStage) {
    stage = nextStage;
    dialog.dataset.cameraStage = stage;
    stageButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.cameraStep === stage);
      button.disabled = (button.dataset.cameraStep === "back" && !calibration.front)
        || (button.dataset.cameraStep === "six" && (!calibration.front || !calibration.back));
    });
    const labels = {
      front: ["采集正面样本", "正面样本等待采集"],
      back: ["采集反面样本", "反面样本等待采集"],
      six: [results.length ? "重新识别六叶" : "识别六片叶子", "六叶取景等待识别"],
    };
    captureButton.textContent = labels[stage][0];
    setStatus(labels[stage][1]);
  }

  function stopCamera() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("当前浏览器不可直接调用摄像头，可使用拍照导入", "warning");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      setStatus("摄像头已就绪", "success");
    } catch (error) {
      const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
      setStatus(denied ? "摄像头权限未开启，可授权后重试或使用拍照导入" : "摄像头启动失败，可使用拍照导入", "warning");
    }
  }

  function frameFromVideo() {
    if (!video.videoWidth || !video.videoHeight) throw new Error("摄像头画面尚未就绪");
    context.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    drawCover(context, video, video.videoWidth, video.videoHeight);
    return context.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  }

  async function frameFromFile(file) {
    let source;
    let sourceWidth;
    let sourceHeight;
    let dispose = () => {};
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      source = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      dispose = () => bitmap.close();
    } else {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      source = image;
      sourceWidth = image.naturalWidth;
      sourceHeight = image.naturalHeight;
      dispose = () => URL.revokeObjectURL(url);
    }
    context.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    drawCover(context, source, sourceWidth, sourceHeight);
    dispose();
    return context.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  }

  function renderResults() {
    resultList.innerHTML = results.map((result) => `
      <button class="camera-result ${result.front ? "is-front" : "is-back"} ${result.detected ? "" : "is-missing"}" type="button" data-camera-line="${result.line}">
        <span>第 ${result.line} 爻</span>
        <strong>${result.front ? "正面" : "反面"}</strong>
        <small>${result.detected ? `置信度 ${Math.round(result.confidence * 100)}%` : "待人工确认"}</small>
      </button>`).join("");
    resultList.querySelectorAll("[data-camera-line]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = results.findIndex((result) => result.line === Number(button.dataset.cameraLine));
        results[index] = { ...results[index], front: !results[index].front, manuallyCorrected: true };
        renderResults();
      });
    });
    applyButton.disabled = results.length !== 6;
  }

  function processFrame(imageData) {
    if (stage === "front" || stage === "back") {
      const sample = extractLeafFeatures(imageData, CALIBRATION_REGION);
      if (!sample.detected) {
        setStatus("未检测到清晰叶片，请调整背景或位置后重试", "warning");
        return;
      }
      calibration = { ...calibration, [stage]: sample };
      if (stage === "front") {
        updateStage("back");
        setStatus("正面样本已记录", "success");
      } else {
        const separation = calibrationSeparation(calibration);
        updateStage("six");
        setStatus(separation < 0.08 ? "两面特征接近，识别后请逐片确认" : "正反样本已完成", separation < 0.08 ? "warning" : "success");
      }
      return;
    }

    results = analyzeLeafSlots(imageData, calibration).map((result) => ({
      line: result.line,
      front: result.front,
      detected: result.detected,
      confidence: result.confidence,
      coverage: result.features.coverage,
      manuallyCorrected: false,
    }));
    renderResults();
    const missing = results.filter((result) => !result.detected).map((result) => result.line);
    setStatus(missing.length ? `第 ${missing.join("、")} 爻未清晰识别，请点按校正` : "六片叶子识别完成，请逐片确认", missing.length ? "warning" : "success");
    captureButton.textContent = "重新识别六叶";
  }

  async function openDialog() {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    updateStage(calibration.front ? (calibration.back ? "six" : "back") : "front");
    await startCamera();
  }

  function closeDialog() {
    stopCamera();
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  $("openCameraButton").addEventListener("click", openDialog);
  $("closeCameraButton").addEventListener("click", closeDialog);
  $("cameraImportButton").addEventListener("click", () => fileInput.click());
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
  stageButtons.forEach((button) => button.addEventListener("click", () => updateStage(button.dataset.cameraStep)));
  captureButton.addEventListener("click", () => {
    try { processFrame(frameFromVideo()); } catch (error) { setStatus(error.message, "warning"); }
  });
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files || [];
    if (!file) return;
    try { processFrame(await frameFromFile(file)); }
    catch { setStatus("图片读取失败，请重新拍摄", "warning"); }
    fileInput.value = "";
  });
  $("resetCalibrationButton").addEventListener("click", () => {
    calibration = { front: null, back: null };
    results = [];
    resultList.innerHTML = "";
    applyButton.disabled = true;
    updateStage("front");
  });
  applyButton.addEventListener("click", () => {
    const ordered = [...results].sort((left, right) => left.line - right.line);
    onApply({
      fronts: ordered.map((result) => result.front),
      recognition: {
        method: "dual-reference-vision-v1",
        capturedAt: new Date().toISOString(),
        lines: ordered.map(({ line, front, detected, confidence, coverage, manuallyCorrected }) => ({
          line, front, detected, confidence, coverage, manuallyCorrected,
        })),
      },
    });
    onToast?.("摄像头结果已写入六爻");
    closeDialog();
  });

  updateStage("front");
}
