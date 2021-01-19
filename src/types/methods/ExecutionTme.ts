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

export type FullEventName =
  | 'before:create'
  | ':create'
  | 'after:create'
  //
  | 'before:update'
  | ':update'
  | 'after:update'
  //
  | 'before:patch'
  | ':patch'
  | 'after:patch'
  //
  | 'before:clone'
  | ':clone'
  | 'after:clone'
  //
  | 'before:delete'
  | ':delete'
  | 'after:delete'
  //
  | ':run'
  //
  | 'before:set'
  | 'after:set'
  //
  | 'before:get'
  | 'after:get'
//

export const PossibleHookPerMethod = new Map<
  ActionHookMethod,
  Set<ActionHookTime>
>([
  ['set', new Set<ActionHookTime>(['before'])],
  ['get', new Set<ActionHookTime>(['before'])],
  ['create', new Set<ActionHookTime>(['instead', 'before', 'after'])],
  ['update', new Set<ActionHookTime>(['instead', 'before', 'after'])],
  ['patch', new Set<ActionHookTime>(['instead', 'before', 'after'])],
  ['clone', new Set<ActionHookTime>(['instead', 'before', 'after'])],
  ['delete', new Set<ActionHookTime>(['instead', 'before', 'after'])],
  ['run', new Set<ActionHookTime>(['instead'])],
])

export function ValidateHookPerMethod(
  event: ActionHookMethod,
  time: ActionHookTime,
) {
  return PossibleHookPerMethod.get(event)?.has(time)
}
