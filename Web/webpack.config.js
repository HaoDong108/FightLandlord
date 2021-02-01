const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "development",
  entry: {
    game: "./src/ts/GameMain.ts",
    home: "./src/ts/HomeMain.ts",
  },
  output: {
    filename: "[name].js",
    path: resolve(__dirname, "dist"),
    publicPath: "./",
  },
  module: {
    rules: [
      {
        test: /\.d\.ts$/,
        loader: "ignore-loader",
      },
      {
        test: /\.ts(x?)$/,
        loader: "ts-loader",
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "../",
            },
          },
          {
            loader: "css-loader",
          },
        ],
      },
      {
        test: /\.(jpg|png|jpeg|ico)$/,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 8192,
              name: "[hash:8].[ext]",
              esModule: false,
              outputPath: "img",
            },
          },
        ],
      },
      {
        test: /\.html$/,
        use: "html-loader",
      },
      {
        exclude: /\.(html|css|ts|jpg|png|ico|gif|js|jpeg)$/,
        use: {
          loader: "file-loader",
          options: {
            outputPath: "media",
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/home.html",
      favicon: "./favicon.ico",
      filename: "home.html",
      chunks: ["home"],
    }),
    new HtmlWebpackPlugin({
      template: "./src/game.html",
      favicon: "./favicon.ico",
      filename: "game.html",
      chunks: ["lib/linq", "game"],
    }),
    new MiniCssExtractPlugin({
      filename: "css/[name].css",
    }),
  ],
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".d.ts"],
  },
};
