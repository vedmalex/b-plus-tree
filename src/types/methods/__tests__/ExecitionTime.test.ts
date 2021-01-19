import 'jest'
import { ValidateHookPerMethod as validator } from '../ExecutionTme'

describe('execution time applyance', () => {
  it('works', () => {
    expect(validator('set', 'before')).toBeTruthy()
    expect(validator('set', 'instead')).toBeFalsy()
    expect(validator('set', 'after')).toBeFalsy()

    expect(validator('get', 'before')).toBeTruthy()
    expect(validator('get', 'instead')).toBeFalsy()
    expect(validator('get', 'after')).toBeFalsy()

    expect(validator('create', 'before')).toBeTruthy()
    expect(validator('create', 'instead')).toBeTruthy()
    expect(validator('create', 'after')).toBeTruthy()

    expect(validator('update', 'before')).toBeTruthy()
    expect(validator('update', 'instead')).toBeTruthy()
    expect(validator('update', 'after')).toBeTruthy()

    expect(validator('patch', 'before')).toBeTruthy()
    expect(validator('patch', 'instead')).toBeTruthy()
    expect(validator('patch', 'after')).toBeTruthy()

    expect(validator('delete', 'instead')).toBeTruthy()
    expect(validator('delete', 'after')).toBeTruthy()
    expect(validator('delete', 'before')).toBeTruthy()

    expect(validator('clone', 'instead')).toBeTruthy()
    expect(validator('clone', 'after')).toBeTruthy()
    expect(validator('clone', 'before')).toBeTruthy()

    expect(validator('run', 'after')).toBeFalsy()
    expect(validator('run', 'instead')).toBeTruthy()
    expect(validator('run', 'before')).toBeFalsy()
  })
})
