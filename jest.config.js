module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@web3-vue-org/(.*)$': '<rootDir>/packages/$1/src',
  },
}
