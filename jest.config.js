/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '/*.test.ts',
  roots: ['<rootDir>/tests'],
  transform: {},
  reporters: ['default', 'jest-junit']
};