import 'jest'
import { updateValue } from '../updateValue'

describe('updateValue', () => {
  it('it update value and give us feedback on it', () => {
    const obj: { name?: string } = {}
    const result = updateValue(obj, 'name', () => 'name')
    expect(result).toBe(1)
    expect(obj.name).toBe('name')
  })

  it("don't uddate existing value give us feedback on it", () => {
    const obj: { name?: string } = { name: 'name' }
    const result = updateValue(obj, 'name', () => 'name')
    expect(result).toBe(0)
    expect(obj.name).toBe('name')
  })
})
