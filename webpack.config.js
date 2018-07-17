module.exports = {
  entry: ['babel-polyfill', './src/index.js'],
  output: {
    path: __dirname + "/dist",
    filename: "main.js",
    sourcePrefix: "",
//    library: 'cfmml',
//    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
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
