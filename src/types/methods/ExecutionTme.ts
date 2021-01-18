export type ActionHookMethod =
  | 'run'
  | 'create'
  | 'set'
  | 'get'
  | 'update'
  | 'patch'
  | 'delete'
  | 'clone'

export type ActionHookTime = 'before' | 'after' | 'instead'

export const PossibleHookPerMethod = new Map<
  ActionHookMethod,
  Set<ActionHookTime>
>([
  ['create', new Set<ActionHookTime>(['instead', 'after'])],
  ['set', new Set<ActionHookTime>(['instead'])],
  ['get', new Set<ActionHookTime>(['instead'])],
  ['update', new Set<ActionHookTime>(['instead', 'after', 'before'])],
  ['patch', new Set<ActionHookTime>(['instead', 'before', 'after'])],
  ['delete', new Set<ActionHookTime>(['instead', 'before'])],
  ['clone', new Set<ActionHookTime>(['instead', 'after', 'before'])],
  ['run', new Set<ActionHookTime>(['instead'])],
])

export function ValidateHookPerMethod(
  event: ActionHookMethod,
  time: ActionHookTime,
) {
  return PossibleHookPerMethod.get(event)?.has(time)
}
