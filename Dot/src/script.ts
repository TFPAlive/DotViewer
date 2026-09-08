import { ScriptedUserModel } from './model';

export type ScriptCommand = {
  name: string;
  args: string[];
  pauseSeconds?: number;
  motionDurationSeconds?: number;
};

export function isMessageCommand(command: ScriptCommand): boolean {
  return command.name === 'message' || command.name === 'l2dmessage';
}

export function getMessageDialogue(command: ScriptCommand): string {
  const audioIndex = command.args.findIndex((argument) => argument.trim().startsWith('vc_'));
  const dialogueEnd = audioIndex >= 0 ? audioIndex : command.args.length;
  const dialogueFields = command.args.slice(1, dialogueEnd);
  while (dialogueFields.at(-1)?.trim() === '') dialogueFields.pop();
  return dialogueFields.join(',').trim();
}

export function isThoughtMessage(command: ScriptCommand): boolean {
  const dialogue = getMessageDialogue(command);
  return (/^（[\s\S]*）$/).test(dialogue) || (/^\([\s\S]*\)$/).test(dialogue);
}

export function getMessagePauseSeconds(command: ScriptCommand): number {
  const visibleDialogue = getMessageDialogue(command).replace(/<br\s*\/?>/gi, '');
  return visibleDialogue.length / 16;
}

export function getVoiceTag(command: ScriptCommand): string | null {
  return command.args.find((argument) => argument.trim().startsWith('vc_'))?.trim() ?? null;
}

export function parseScript(source: string): ScriptCommand[] {
  return source.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':') || trimmed.startsWith('#')) return [];
    const fields = trimmed.split(',');
    const command = { name: fields[0], args: fields.slice(1) };
    if (command.name === 'asyncl2dmotion') {
      const stopIndex = command.args.findIndex((argument) => argument.trim().toUpperCase() === 'STOP');
      const motionDurationSeconds = Number(command.args[stopIndex + 1]);
      if (stopIndex >= 0 && Number.isFinite(motionDurationSeconds) && motionDurationSeconds >= 0) {
        return [{ ...command, motionDurationSeconds }];
      }
    }
    if (command.name === 'message') {
      return [{ ...command, pauseSeconds: getMessagePauseSeconds(command) }];
    }
    return [command];
  });
}

export function resolveMotionName(name: string, loadedMotionFiles: Map<string, ArrayBuffer>): string {
  const sceneMatch = /^Scene(\d+)$/.exec(name);
  if (!sceneMatch) return name;
  const sceneName = `scene${sceneMatch[1]}`;
  return loadedMotionFiles.has(`${sceneName}_loop`) ? `${sceneName}_loop` : sceneName;
}

export function isSceneResetMotion(name: string): boolean {
  return name.endsWith('Reset');
}

export async function playScriptMotion(
  name: string,
  asynchronous: boolean,
  model: ScriptedUserModel,
  loadedMotionFiles: Map<string, ArrayBuffer>,
  duration?: number
): Promise<void> {
  if (isSceneResetMotion(name)) {
    model.resetToScene();
    return;
  }
  const sceneMatch = /^Scene(\d+)$/.exec(name);
  const resolvedName = sceneMatch ? `scene${sceneMatch[1]}` : resolveMotionName(name, loadedMotionFiles);
  const loopName = sceneMatch ? `${resolvedName}_loop` : null;
  const buffer = loadedMotionFiles.get(resolvedName) ?? loadedMotionFiles.get(loopName ?? '');
  if (!buffer) {
    console.warn('[motion:missing] Script motion was not found in model3.json.', {
      name, resolvedName, available: [...loadedMotionFiles.keys()]
    });
    return;
  }
  const motion = model.loadMotion(buffer, buffer.byteLength, resolvedName, () => {
    if (sceneMatch) model.playSceneLoop();
  });
  if (!motion) return;
  if (sceneMatch) {
    const loopBuffer = loadedMotionFiles.get(loopName!);
    const loopMotion = loopBuffer ? model.loadMotion(loopBuffer, loopBuffer.byteLength, loopName!, undefined) : null;
    model.playSceneMotion(motion, loopMotion);
  } else if (/^scene\d+_loop$/.test(resolvedName)) {
    motion.setLoop(true);
    model.playSceneMotion(motion, null);
    model.playSceneLoop();
  } else if (asynchronous && duration !== undefined) {
    model.playAsyncMotion(name, motion, duration);
  } else {
    model.playMotion(motion);
  }
}

export async function loadScript(path: string): Promise<ScriptCommand[]> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return parseScript(await response.text());
}