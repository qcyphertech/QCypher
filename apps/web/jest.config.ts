import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Jest's default testMatch treats ANY file under a __tests__ directory
  // as a test suite, not just *.test.ts ones — that was silently failing
  // src/__tests__/isolation/_helpers.ts ("must contain at least one
  // test") once it existed. Explicit underscore-prefix convention for
  // shared test helpers, excluded here.
  testPathIgnorePatterns: ['/node_modules/', '/_[^/]+\\.ts$'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },
}
export default config
