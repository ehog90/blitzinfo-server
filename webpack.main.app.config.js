var fs = require('fs');
var nodeModules = {};
fs.readdirSync('node_modules')
   .filter(function (x) {
      return ['.bin'].indexOf(x) === -1;
   })
   .forEach(function (mod) {
      nodeModules[mod] = 'commonjs ' + mod;
   });

module.exports = {
   entry: './app.ts',
   mode: 'production',
   output: {
      path: __dirname + '/dist',
      filename: 'app-main.js',
   },
   resolve: {
      // Add '.ts' and '.tsx' as a resolvable extension.
      extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
   },
   module: {
      rules: [
         {
            test: /\.tsx?$/,
            loader: 'ts-loader',
         },
      ],
   },
   target: 'node',
   externals: nodeModules,
};
