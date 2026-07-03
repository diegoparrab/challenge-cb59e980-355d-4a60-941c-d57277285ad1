module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@core': './src/core',
          '@domain': './src/domain',
          '@data': './src/data',
          '@presentation': './src/presentation',
          '@di': './src/di',
        },
      },
    ],
  ],
};
