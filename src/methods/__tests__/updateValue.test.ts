import 'jest'
import { updateValue } from '../updateValue'

describe('updateValue', () => {
  it('works', () => {
    const obj: { name?: string } = {}
    updateValue(obj, 'name', () => 'name')
    expect(obj.name).toBe('name')
  })
})
