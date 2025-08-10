const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  context: path.resolve(__dirname, 'src'),
  entry: './main.jsx',
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  output: {
    filename: 'example.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // optional: cleans old build files
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'static/index.html'),
    }),
  ],
  devServer: {
    compress: true,
    port: 8080,
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, 'static'),
    },
    open: true, // automatically open in browser
  }
};
