module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo (SDK56) が expo-router / reanimated(worklets) の変換を内包する。
  return {
    presets: ['babel-preset-expo'],
  };
};
