// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // 👇 이 줄이 반드시 있어야 하고, 꼭 "맨 마지막"에 있어야 합니다!
        'react-native-reanimated/plugin', 
      ],
    };
  };