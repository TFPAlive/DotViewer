import './style.css';
import { CubismFramework } from '../../Framework/src/live2dcubismframework';
import { AudioPlayer } from './audio';
import { discoverModels, loadModel, ModelOption, ScriptedUserModel } from './model';
import { getMessageDialogue, getMessagePauseSeconds, getMessageSpeaker, getVoiceTag, isMessageCommand, isThoughtMessage, loadScript, playScriptMotion, ScriptCommand } from './script';

const canvas = document.querySelector<HTMLCanvasElement>('#model-canvas')!;
const viewerPanel = document.querySelector<HTMLElement>('.viewer-panel')!;
const fullscreenToggle = document.querySelector<HTMLButtonElement>('#fullscreen-toggle')!;
const dialogueToggle = document.querySelector<HTMLButtonElement>('#dialogue-toggle')!;
const dialogueViewer = document.querySelector<HTMLDivElement>('#dialogue-viewer')!;
const dialogueSpeaker = document.querySelector<HTMLDivElement>('#dialogue-speaker')!;
const dialogueText = document.querySelector<HTMLDivElement>('#dialogue-text')!;
const select = document.querySelector<HTMLSelectElement>('#model-select')!;
const loading = document.querySelector<HTMLDivElement>('#loading')!;
const error = document.querySelector<HTMLDivElement>('#error')!;
const playToggle = document.querySelector<HTMLButtonElement>('#play-toggle')!;
const restartToggle = document.querySelector<HTMLButtonElement>('#restart-toggle')!;
const resetPositionToggle = document.querySelector<HTMLButtonElement>('#reset-position')!;
const scriptStatus = document.querySelector<HTMLSpanElement>('#script-status')!;
const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
const modelOpacity = 0.7;
const messageReadDelayMs = 2000;
const messageCharactersPerSecond = 16;

let models: ModelOption[] = [];
let model: ScriptedUserModel | null = null;
let initialModelMatrix: Float32Array | null = null;
let audioPlayer: AudioPlayer | null = null;
let scriptCommands: ScriptCommand[] = [];
let loadedMotionFiles = new Map<string, ArrayBuffer>();
let scriptIndex = 0;
let scriptWait = 0;
let scriptPlaying = false;
let pendingAudio: Promise<void> | null = null;
let lastFrameTime = performance.now();
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let dialogueVisible = true;
const delayedMotionTimers = new Set<number>();

if (!gl) throw new Error('WebGL is unavailable in this browser.');

CubismFramework.startUp();
CubismFramework.initialize();
select.addEventListener('change', () => void loadSelectedModel());
playToggle.addEventListener('click', () => {
  scriptPlaying = !scriptPlaying;
  playToggle.textContent = scriptPlaying ? 'Pause' : 'Play';
  scriptStatus.textContent = scriptPlaying ? 'Playing script' : 'Script paused';
});
restartToggle.addEventListener('click', () => {
  scriptIndex = 0;
  scriptWait = 0;
  scriptPlaying = true;
  clearDelayedMotionTimers();
  model?.clearAsyncMotions();
  model?.clearSceneMotion();
  void startScriptMotion('scene01_loop', false);
  audioPlayer?.stop();
  pendingAudio = null;
  playToggle.textContent = 'Pause';
  scriptStatus.textContent = 'Restarting script';
});
resetPositionToggle.addEventListener('click', () => {
  if (!model || !initialModelMatrix) return;
  model.getModelMatrix().setMatrix(initialModelMatrix);
  model.setDragging(0, 0);
});
fullscreenToggle.addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void viewerPanel.requestFullscreen();
});
dialogueToggle.addEventListener('click', () => {
  dialogueVisible = !dialogueVisible;
  dialogueToggle.setAttribute('aria-pressed', String(dialogueVisible));
  dialogueToggle.textContent = `Dialogue: ${dialogueVisible ? 'On' : 'Off'}`;
  dialogueViewer.hidden = !dialogueVisible || dialogueText.textContent === '';
});
document.addEventListener('fullscreenchange', () => {
  const isFullscreen = document.fullscreenElement === viewerPanel;
  fullscreenToggle.textContent = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  fullscreenToggle.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
  resizeCanvas();
});
canvas.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointerup', (event) => {
  dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointercancel', () => { dragging = false; });
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const bounds = canvas.getBoundingClientRect();
  const modelMatrix = model?.getModelMatrix();
  if (!modelMatrix) return;
  const deltaX = ((event.clientX - lastPointerX) / bounds.height) * 2 / modelMatrix.getScaleX();
  const deltaY = -((event.clientY - lastPointerY) / bounds.height) * 2 / modelMatrix.getScaleY();
  modelMatrix.translateRelative(deltaX, deltaY);
  model?.setDragging(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -(((event.clientY - bounds.top) / bounds.height) * 2 - 1));
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
});
canvas.addEventListener('wheel', (event) => {
  const bounds = canvas.getBoundingClientRect();
  const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
  model?.getModelMatrix().scaleRelative(scaleFactor, scaleFactor);
  model?.setDragging(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -(((event.clientY - bounds.top) / bounds.height) * 2 - 1));
});
window.addEventListener('resize', resizeCanvas);

void discoverModels().then((discoveredModels) => {
  models = discoveredModels;
  models.forEach((entry, index) => select.add(new Option(entry.label, String(index))));
  if (models.length === 0) throw new Error('No model3.json files were found.');
  select.value = '0';
  return loadSelectedModel();
}).catch(showError);

async function loadSelectedModel(): Promise<void> {
  const option = models[Number(select.value)];
  if (!option) return;
  loading.hidden = false;
  error.hidden = true;
  model?.release();
  audioPlayer?.stop();
  clearDelayedMotionTimers();
  model = null;
  initialModelMatrix = null;
  audioPlayer = new AudioPlayer(option.audioPath, option.audioPrefix);
  pendingAudio = null;
  scriptCommands = [];
  loadedMotionFiles = new Map();
  scriptIndex = 0;
  scriptWait = 0;
  scriptPlaying = false;

  try {
    const loaded = await loadModel(option, canvas, gl!, modelOpacity);
    model = loaded.model;
    initialModelMatrix = new Float32Array(model.getModelMatrix().getArray());
    loadedMotionFiles = loaded.motions;
    scriptCommands = await loadScript(option.script);
    void startScriptMotion('scene01_loop', false);
    resizeCanvas();
    playToggle.textContent = 'Play';
    scriptStatus.textContent = `${scriptCommands.length} script commands loaded`;
    loading.hidden = true;
  } catch (reason) {
    showError(reason);
  }
}

function advanceScript(deltaTimeSeconds: number): void {
  if (!scriptPlaying || !model || !audioPlayer) return;
  if (pendingAudio) return;
  if (scriptWait > 0) {
    scriptWait = Math.max(0, scriptWait - deltaTimeSeconds);
    return;
  }

  while (scriptIndex < scriptCommands.length) {
    const commandIndex = scriptIndex;
    const command = scriptCommands[scriptIndex++];
    console.log('[script:command]', {
      index: commandIndex,
      name: command.name,
      anim_name: command.args[0],
      pauseSeconds: command.pauseSeconds,
      motionDelaySeconds: command.motionDelaySeconds
    });
    if (command.name === 'wait') {
      scriptWait = Number(command.args[0]) || 0;
      return;
    }
    if (command.name === 'l2dmotion') {
      scheduleScriptMotion(command.args[0]);
    } else if (command.name === 'asyncl2dmotion') {
      scheduleScriptMotion(command.args[0], command.motionDelaySeconds ?? 0, true);
    } else if (isMessageCommand(command)) {
      dialogueSpeaker.textContent = getMessageSpeaker(command);
      dialogueText.textContent = getMessageDialogue(command).replace(/<br\s*\/?\s*>/gi, '\n');
      dialogueViewer.hidden = !dialogueVisible;
      console.log('[motion:list]', model.getMotionList());
      const thoughtMessage = isThoughtMessage(command);
      model.setLipSyncEnabled(!thoughtMessage);
      const voiceTag = getVoiceTag(command);
      const readDurationMs = command.pauseSeconds !== undefined
        ? command.pauseSeconds * 1000
        : command.name === 'message'
          ? getMessagePauseSeconds(command) * 1000
          : Math.max(
            messageReadDelayMs,
            getMessageDialogue(command).replace(/<br\s*\/?\s*>/gi, ' ').length / messageCharactersPerSecond * 1000
          );
      const reading = new Promise<void>((resolve) => window.setTimeout(resolve, readDurationMs));
      const audio = voiceTag
        ? audioPlayer.play(voiceTag)
        : Promise.resolve();
      if (voiceTag && !thoughtMessage) model.setLipSyncEnabled(true);
      if (voiceTag) {
        void audio.finally(() => {
          model?.releaseAsyncMotion('MouthEmotion00');
          model?.setLipSyncEnabled(false);
        });
      }
      pendingAudio = Promise.all([reading, audio])
        .then(() => {
          dialogueText.textContent = '';
          dialogueViewer.hidden = true;
        })
        .finally(() => { pendingAudio = null; });
      return;
    }
  }

  scriptPlaying = false;
  playToggle.textContent = 'Play';
  scriptStatus.textContent = 'Script complete';
}

function clearDelayedMotionTimers(): void {
  for (const timer of delayedMotionTimers) window.clearTimeout(timer);
  delayedMotionTimers.clear();
}

function scheduleScriptMotion(name: string, delaySeconds = 0, asynchronous = false): void {
  const delayMs = Math.max(0, delaySeconds * 1000);
  if (delayMs === 0) {
    void startScriptMotion(name, asynchronous);
    return;
  }
  const timer = window.setTimeout(() => {
    delayedMotionTimers.delete(timer);
    void startScriptMotion(name, asynchronous);
  }, delayMs);
  delayedMotionTimers.add(timer);
}

async function startScriptMotion(name: string, asynchronous: boolean): Promise<void> {
  if (!model) return;
  await playScriptMotion(name, asynchronous, model, loadedMotionFiles);
}

function showError(reason: unknown): void {
  error.textContent = reason instanceof Error ? reason.message : 'Unable to load this model.';
  error.hidden = false;
  loading.hidden = true;
}

function resizeCanvas(): void {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
  canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
  model?.setRenderTargetSize(canvas.width, canvas.height);
}

function render(): void {
  const now = performance.now();
  const deltaTimeSeconds = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;
  advanceScript(deltaTimeSeconds);
  if (model?.getModel() && model.getRenderer()) {
    const renderer = model.getRenderer();
    const aspectCorrectedMatrix = model.getModelMatrix().clone();
    const canvasAspect = canvas.width / canvas.height;
    if (canvasAspect > 0) aspectCorrectedMatrix.scaleRelative(1 / canvasAspect, 1);
    renderer.setMvpMatrix(aspectCorrectedMatrix);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    model.updateMotions(deltaTimeSeconds);
    model.updateLipSync(audioPlayer?.getLevel() ?? 0);
    model.getModel().update();
    renderer.drawModel();
  }
  requestAnimationFrame(render);
}

render();
