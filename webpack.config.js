module.exports = {
  mode: 'development',
  entry: ['babel-polyfill', './src/index.js'],
  output: {
    path: __dirname + "/dist",
    filename: "main.js",
    sourcePrefix: "",
    library: 'fcmml',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules|fcsynth/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['env', {'modules': false}]
              ],
              plugins: [
                "transform-object-rest-spread"
              ]
            }
          }
        ]
      },
      {
        test: /\.sg$/,
        use: "snakeparser-loader"
      },
      {
        test: /\.uttr$/,
        use: "uttr-loader"
      }
    ]
  }
};
