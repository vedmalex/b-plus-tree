import { expect, test, describe, beforeEach, mock } from 'bun:test'
import { BPlusTree } from '../BPlusTree'
import { query } from '../types'
import { filter, map, reduce } from '../query'
import { sourceEach } from '../source'
import axios, { AxiosResponse } from 'axios'

// Mock axios globally
mock.module('axios', () => ({
  default: {
    get: mock(async (url: string): Promise<Partial<AxiosResponse>> => {
      // Simulate a network response
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate delay
      return {
        data: `Mock data for ${url}`,
        status: 200,
        statusText: 'OK',
        headers: {},
      };
    }),
  },
}));

type Person = {
  id: number
  name: string
  age: number
  ssn: string
  page?: string
}

// Type for the mapped data before reduction
type MappedPersonData = {
  name: string;
  asyncData: string;
}

// Type for the final reduced map
type ReducedResultMap = Map<string, string | undefined>;

describe('BPlusTree Demo Functionality', () => {
  let tree: BPlusTree<Person, number>;

  // Helper function to add data
  const addPerson = (inp: Person) => tree.insert(inp.id, inp);

  // Define the source function for tests
  const testSource = sourceEach<Person, number>(true);

  beforeEach(() => {
    // Initialize a new tree before each test
    tree = new BPlusTree<Person, number>(2, false);
    // Add initial data similar to demo files
    addPerson({
      id: 0,
      name: 'alex',
      age: 42,
      ssn: '000-0000-000001',
      page: 'https://ya.ru/',
    });
    addPerson({
      id: 1,
      name: 'jame',
      age: 45,
      ssn: '000-0000-000002',
      page: 'https://google.com/', // Different page for testing map
    });
    addPerson({
      id: 3,
      name: 'simon',
      age: 24,
      ssn: '000-0000-000004',
      page: 'https://duckduckgo.com/',
    });
    addPerson({
      id: 5, // Skipping ID 4 for range tests
      name: 'jim',
      age: 18,
      ssn: '000-0000-000006',
      page: 'https://yahoo.com/',
    });
    addPerson({
      id: 7,
      name: 'monika',
      age: 30,
      ssn: '000-0000-000008',
      page: 'https://github.com/',
    });
  });

  test('should insert and find elements', () => {
    const person1Result = tree.find(1);
    // Check based on observed test output: find returns an array
    expect(Array.isArray(person1Result)).toBe(true);
    expect(person1Result).toHaveLength(1);
    expect(person1Result?.[0]).toEqual({ // Check the first element of the array
      id: 1,
      name: 'jame',
      age: 45,
      ssn: '000-0000-000002',
      page: 'https://google.com/'
    });

    // Test finding a non-existent element
    const person4Result = tree.find(4);
    // Assuming find returns empty array or undefined for non-existent keys
    // Adjust based on actual behavior if needed. If it returns [], length check is good.
    expect(person4Result === undefined || (Array.isArray(person4Result) && person4Result.length === 0)).toBe(true);

    const person2Result = tree.find(2);
    expect(person2Result === undefined || (Array.isArray(person2Result) && person2Result.length === 0)).toBe(true);
  });

  test('should retrieve elements using a query pipeline (like includes)', async () => {
    // Use queryAsync with the source function and an includes filter
    const queryPipeline = query(
      testSource, // Use the defined source function
      // Assuming tree.includes was just a shorthand for a filter
      // We replicate its logic here using the filter operator
      filter<Person, number>((item: [number, Person]) => [1, 3, 5].includes(item[0]))
    );
    const results: [number, Person][] = [];
    const resultGenerator = queryPipeline(tree);

    for await (const item of resultGenerator) {
      // The item yielded by filter is still Cursor<Person, number, Person>
      // Extract key/value for the results array if needed
      if (item && typeof item.key === 'number') {
        results.push([item.key, item.value]);
      }
    }
    expect(results.length).toBe(3);
    expect(results.map(item => item[0])).toEqual([1, 3, 5]);
    expect(results.map(item => item[1].name)).toEqual(['jame', 'simon', 'jim']);
  });

  test('should process data using the query pipeline with filter', async () => {
    // Use queryAsync
    const queryPipeline = query(
      testSource, // Use the defined source function
      filter<Person, number>((item: [number, Person]) => item[1].age > 30)
    );

    const asyncResults = queryPipeline(tree);
    const results: [number, Person][] = [];
    for await (const item of asyncResults) {
      // item is Cursor<Person, number, Person>
      if (item && typeof item.key === 'number') {
        results.push([item.key, item.value]);
      }
    }
    expect(results.length).toBe(2);
    expect(results.map(item => item[0])).toEqual([0, 1]); // Should be 0 and 1 based on data
    expect(results.map(item => item[1].name)).toEqual(['alex', 'jame']);
  });

  test('should process data using the query pipeline with map (async) and reduce', async () => {
    // Use query (assuming the reverted sync query works)
    const queryPipeline = query(
      testSource, // Source: yields AsyncGenerator<Cursor<Person, number, Person>>
      filter<Person, number>((item: [number, Person]) => item[1].age > 20),
      // Map: Consumes Cursor<Person, number, Person>, yields Cursor<Person, number, MappedPersonData>
      // Provide all 4 generic arguments: T, K, R, V
      map(async (item) => {
        const [, person] = item;
        const asyncData = await new Promise<string>(resolve =>
          setTimeout(() => resolve(`Async data for ${person.name}`), 10)
        );
        // Map returns the new value for the cursor
        return {
          name: person.name,
          asyncData: asyncData
        }
      }),
      // Reduce: Consumes Cursor<Person, number, MappedPersonData>, yields ReducedResultMap
      // Provide all 4 generic arguments: T, K, D, V
      reduce(
        // Reducer operates on accumulator and cursor.value (MappedPersonData)
        (acc: ReducedResultMap, curValue: MappedPersonData) => {
          // Use curValue which is MappedPersonData
          acc.set(curValue.name, curValue.asyncData);
          return acc;
        },
        // Initial value for the accumulator
        new Map<string, string | undefined>() // No cast needed
      ),
    );

    // query(...) returns the composed operator function. Applying it yields the final generator.
    const resultGenerator = queryPipeline(tree); // Returns AsyncGenerator<ReducedResultMap>
    const results: ReducedResultMap[] = [];

    // Collect the single result yielded by the reduce generator
    for await (const finalMap of resultGenerator) {
      // finalMap should now be correctly inferred as ReducedResultMap
      results.push(finalMap);
    }

    expect(results.length).toBe(1); // Reduce yields one final value
    const finalResult = results[0];

    expect(finalResult instanceof Map).toBe(true);
    expect(finalResult.size).toBe(4);
    expect(finalResult.get('jame')).toBe('Async data for jame');
    expect(finalResult.get('simon')).toBe('Async data for simon');
    expect(finalResult.get('monika')).toBe('Async data for monika');
    expect(finalResult.get('alex')).toBe('Async data for alex');
  });

  // Add more tests for edge cases, deletion (if needed), etc.

});