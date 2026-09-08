import { CubismModelSettingJson } from '../../Framework/src/cubismmodelsettingjson';
import { CubismUserModel } from '../../Framework/src/model/cubismusermodel';
import { CubismRenderer_WebGL } from '../../Framework/src/rendering/cubismrenderer_webgl';
import { CubismMotion } from '../../Framework/src/motion/cubismmotion';
import { CubismMotionManager } from '../../Framework/src/motion/cubismmotionmanager';
import { CubismIdHandle } from '../../Framework/src/id/cubismid';

export type ModelOption = {
  label: string;
  path: string;
  script: string;
  audioPath: string;
  audioPrefix: string;
};

export type LoadedModel = {
  model: ScriptedUserModel;
  setting: CubismModelSettingJson;
  motions: Map<string, ArrayBuffer>;
};

export class ScriptedUserModel extends CubismUserModel {
  private asyncMotions: Array<{
    manager: CubismMotionManager;
    motion: CubismMotion;
    remaining: number;
    stopped: boolean;
    frozenParameters: Map<number, number>;
  }> = [];
  private sceneMotionManager: CubismMotionManager;
  private sceneLoopMotion: CubismMotion | null = null;
  private lipSyncParameters: Array<{ id: CubismIdHandle; baseline: number; maximum: number }> = [];

  public constructor() {
    super();
    this.sceneMotionManager = this.createMotionManager();
  }

  public playMotion(motion: CubismMotion): void {
    motion.setEffectIds([], []);
    this._motionManager.startMotionPriority(motion, true, 1);
  }

  public playAsyncMotion(motion: CubismMotion, duration: number): void {
    motion.setEffectIds([], []);
    const manager = this.createMotionManager();
    manager.startMotionPriority(motion, true, 1);
    this.asyncMotions.push({
      manager,
      motion,
      remaining: duration,
      stopped: false,
      frozenParameters: new Map()
    });
  }

  public playSceneMotion(motion: CubismMotion, loopMotion: CubismMotion | null): void {
    this.clearMotionLayers();
    motion.setEffectIds([], []);
    this.sceneMotionManager.startMotionPriority(motion, true, 1);
    if (loopMotion) {
      loopMotion.setLoop(true);
      this.sceneLoopMotion = loopMotion;
    }
  }

  public playSceneLoop(): void {
    if (!this.sceneLoopMotion) return;
    this.sceneLoopMotion.setEffectIds([], []);
    this.sceneLoopMotion.setLoop(true);
    this.sceneMotionManager.startMotionPriority(this.sceneLoopMotion, true, 1);
  }

  public updateMotions(deltaTimeSeconds: number): void {
    if (!this.getModel()) return;
    this._motionManager.updateMotion(this.getModel(), deltaTimeSeconds);
    this.sceneMotionManager.updateMotion(this.getModel(), deltaTimeSeconds);
    for (const activeMotion of this.asyncMotions) {
      if (activeMotion.stopped) {
        this.applyFrozenParameters(activeMotion.frozenParameters);
        continue;
      }
      activeMotion.manager.updateMotion(this.getModel(), deltaTimeSeconds);
      activeMotion.remaining -= deltaTimeSeconds;
      if (activeMotion.remaining <= 0 || activeMotion.manager.isFinished()) {
        this.freezeMotionParameters(activeMotion);
      }
    }
  }

  private freezeMotionParameters(activeMotion: {
    motion: CubismMotion;
    stopped: boolean;
    frozenParameters: Map<number, number>;
  }): void {
    const loadedModel = this.getModel();
    if (!loadedModel) return;
    for (const parameterId of activeMotion.motion.getParameterIds()) {
      const parameterIndex = loadedModel.getParameterIndex(parameterId);
      activeMotion.frozenParameters.set(parameterIndex, loadedModel.getParameterValueByIndex(parameterIndex));
    }
    activeMotion.stopped = true;
  }

  private applyFrozenParameters(parameters: Map<number, number>): void {
    const loadedModel = this.getModel();
    if (!loadedModel) return;
    for (const [parameterIndex, value] of parameters) {
      loadedModel.setParameterValueByIndex(parameterIndex, value);
    }
  }

  public setLipSyncParameters(ids: CubismIdHandle[], baselineMotion?: CubismMotion): void {
    const baselineValues = baselineMotion?.getParameterValuesAt(0) ?? new Map<CubismIdHandle, number>();
    const loadedModel = this.getModel();
    if (!loadedModel) return;
    this.lipSyncParameters = ids.map((id) => {
      const currentValue = loadedModel.getParameterValueById(id);
      return {
        id,
        baseline: baselineValues.get(id) ?? currentValue,
        maximum: loadedModel.getParameterMaximumValue(loadedModel.getParameterIndex(id))
      };
    });
  }

  public updateLipSync(level: number): void {
    const loadedModel = this.getModel();
    if (!loadedModel) return;
    const normalizedLevel = Math.max(0, Math.min(1, level));
    for (const parameter of this.lipSyncParameters) {
      const value = parameter.baseline + (parameter.maximum - parameter.baseline) * normalizedLevel;
      loadedModel.setParameterValueById(parameter.id, value);
    }
  }

  public clearAsyncMotions(): void {
    for (const activeMotion of this.asyncMotions) {
      activeMotion.manager.stopAllMotions();
      activeMotion.manager.release();
    }
    this.asyncMotions = [];
  }

  public resetToScene(): void {
    this._motionManager.stopAllMotions();
    this.clearAsyncMotions();
  }

  public clearSceneMotion(): void {
    this.sceneMotionManager.stopAllMotions();
    this.sceneLoopMotion = null;
  }

  public override release(): void {
    this.clearAsyncMotions();
    this.sceneMotionManager.release();
    super.release();
  }

  private clearMotionLayers(): void {
    this._motionManager.stopAllMotions();
    this.clearAsyncMotions();
    this.clearSceneMotion();
  }

  private createMotionManager(): CubismMotionManager {
    const manager = new CubismMotionManager();
    manager.setEventCallback(CubismUserModel.cubismDefaultMotionEventCallback, this);
    return manager;
  }
}

export async function discoverModels(): Promise<ModelOption[]> {
  const response = await fetch('/data/model-index.json');
  if (!response.ok) throw new Error('Could not load the model index from /data.');
  const modelPaths = await response.json() as string[];
  return modelPaths.sort().map((path) => {
    const match = /live2D_(.+?)\/[^/]+\.model3\.json$/i.exec(path);
    const id = match?.[1] ?? path.split('/').at(-2) ?? 'model';
    const compactId = id.replace(/^hmr_/i, '');
    const dataGroup = path.split('/')[2] ?? '';
    return {
      label: id,
      path,
      script: `/data/${dataGroup}/script/hmr_${compactId}.txt`,
      audioPath: `/data/${dataGroup}/audio/`,
      audioPrefix: `hmr_${compactId}_`
    };
  });
}

export async function loadModel(
  option: ModelOption,
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  opacity: number
): Promise<LoadedModel> {
  const settingResponse = await fetch(option.path);
  if (!settingResponse.ok) throw new Error(`Could not load ${option.path}`);
  const settingBuffer = await settingResponse.arrayBuffer();
  const setting = new CubismModelSettingJson(settingBuffer, settingBuffer.byteLength);
  const basePath = option.path.slice(0, option.path.lastIndexOf('/') + 1);
  const model = new ScriptedUserModel();
  model.setOpacity(opacity);
  model.loadModel(await fetchAsset(basePath + setting.getModelFileName()));
  const lipSyncIds: CubismIdHandle[] = [];
  for (let index = 0; index < setting.getLipSyncParameterCount(); index += 1) {
    lipSyncIds.push(setting.getLipSyncParameterId(index));
  }
  model.createRenderer(canvas.width, canvas.height);
  const renderer = model.getRenderer();
  renderer.startUp(gl);
  hideMosaicDrawables(model, renderer);
  renderer.loadShaders('/Shaders/WebGL/');
  renderer.setRenderTargetSize(canvas.width, canvas.height);

  for (let index = 0; index < setting.getTextureCount(); index += 1) {
    const image = await loadImage(basePath + setting.getTextureFileName(index));
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to create a WebGL texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    renderer.bindTexture(index, texture);
  }

  const motions = await preloadMotions(setting, basePath);
  const baselineBuffer = motions.get('MouthEmotion00');
  const baselineMotion = baselineBuffer
    ? model.loadMotion(baselineBuffer, baselineBuffer.byteLength, 'MouthEmotion00')
    : undefined;
  model.setLipSyncParameters(lipSyncIds, baselineMotion);
  return { model, setting, motions };
}

async function preloadMotions(setting: CubismModelSettingJson, basePath: string): Promise<Map<string, ArrayBuffer>> {
  const motions = new Map<string, ArrayBuffer>();
  for (let groupIndex = 0; groupIndex < setting.getMotionGroupCount(); groupIndex += 1) {
    const group = setting.getMotionGroupName(groupIndex);
    for (let motionIndex = 0; motionIndex < setting.getMotionCount(group); motionIndex += 1) {
      const fileName = setting.getMotionFileName(group, motionIndex);
      motions.set(group, await fetchAsset(basePath + fileName));
      console.log('[motion:loaded]', { name: group, fileName });
    }
  }
  return motions;
}

function hideMosaicDrawables(model: ScriptedUserModel, renderer: CubismRenderer_WebGL): void {
  const loadedModel = model.getModel();
  if (!loadedModel) return;
  for (let drawableIndex = 0; drawableIndex < loadedModel.getDrawableCount(); drawableIndex += 1) {
    if (loadedModel.getDrawableId(drawableIndex).getString().startsWith('Mosaic')) {
      renderer.setDrawableVisible(drawableIndex, false);
    }
  }
}

async function fetchAsset(path: string): Promise<ArrayBuffer> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.arrayBuffer();
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${path}`));
    image.src = path;
  });
}