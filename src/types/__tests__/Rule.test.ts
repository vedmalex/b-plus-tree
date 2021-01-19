import 'jest'
import { Rule } from '../Rule'

type DTO = {
  id: number
  name: string
  age: number
  birthDate: string
  fullName: string
  secondName: string
}
let idGen = 0
describe('Rule', () => {
  it('initialize action', () => {
    const condition = (obj: DTO) => !obj.id
    const run = (obj: DTO) => (obj.id = idGen++)
    const [rule] = Rule.createSetter<DTO>({
      field: 'age',
      condition,
      run,
    })
    expect(rule.condition).toBe(condition)
    expect(rule.run).toBe(run)
    expect(rule.name).toBe('setter for age')
    expect(rule.type).toBe('setter')
  })
  it('initialize action failed if name not provided', () => {
    const condition = (obj: DTO) => !obj.id
    const run = (obj: DTO) => (obj.id = idGen++)
    expect(() =>
      Rule.createAction<DTO>({
        on: ['after:clone', 'after:create'],
        condition,
        run,
      }),
    ).not.toThrowError()
  })

  it('initialize rules with arrays', () => {
    expect(() =>
      Rule.createSetter<DTO>({
        field: 'name',
        run: (obj) => `Mr. ${obj.name}`,
        subjectFor: 'fullName',
        subscribesTo: ['name'],
      }),
    ).not.toThrow()
  })

  it('initialize setter', () => {
    const condition = (obj: DTO) => !obj.id
    const run = (obj: DTO) => (obj.id = idGen++)
    const field = 'name'
    const [rule] = Rule.createSetter<DTO>({
      condition,
      run,
      field,
    })
    expect(rule.condition).toBe(condition)
    expect(rule.run).toBe(run)
    expect(rule.type).toBe('setter')
  })

  it('initialize name of setter', () => {
    const condition = (obj: DTO) => !obj.id
    const run = (obj: DTO) => (obj.id = idGen++)
    const field = 'name'
    const [rule] = Rule.createSetter<DTO>({
      field,
      condition,
      run,
    })
    expect(rule.condition).toBe(condition)
    expect(rule.run).toBe(run)
    expect(rule.name).toBe(`${rule.type} for ${rule.field}`)
    expect(rule.field).toBe(field)
    expect(rule.type).toBe('setter')
  })
})
