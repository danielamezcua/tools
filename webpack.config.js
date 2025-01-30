const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const getToolEntries = () => {
  const toolsDir = path.join(__dirname, 'src/tools');
  const entries = {};
  
  // Read all directories within tools
  const tools = fs.readdirSync(toolsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  // Create entry points for each tool
  tools.forEach(tool => {
    const entryFile = path.join(toolsDir, tool, 'index.tsx');
    // Only add entry if index.tsx exists
    if (fs.existsSync(entryFile)) {
      // Convert tool name to lowercase for consistency in URLs
      const entryName = tool.toLowerCase();
      entries[entryName] = `./${path.relative(__dirname, entryFile)}`;
    }
  });
  
  return entries;
};

// Create a function that generates config based on environment
module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const entries = getToolEntries();

  return {
    entry: entries,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name]/index.js', // Changed to output in subdirectories
      publicPath: '/',  // Added to ensure correct path resolution
      library: {
        type: 'umd',
        name: '[name]'
      },
      globalObject: 'this',
      clean: true,
    },
    mode: isDevelopment ? 'development' : 'production',
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
        watch: true,
      },
      hot: true,
      open: true,
      port: 3000,
      historyApiFallback: {
        rewrites: [
          // Handle direct tool access (e.g., /urls)
          ...Object.keys(entries).map(entryName => ({
            from: new RegExp(`^/${entryName}`),
            to: `/${entryName}/index.html`
          })),
          // Catch-all for the root
          { from: /^\//, to: '/index.html' }
        ]
      },
      devMiddleware: {
        writeToDisk: true,
      }
    },
    externals: {
      'react': 'React',
      'react-dom': 'ReactDOM'
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-react',
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    'tailwindcss',
                    'autoprefixer',
                  ],
                },
              },
            },
          ],
        }
      ]
    },
    plugins: [
      // Generate HTML files for each entry point
      ...Object.keys(entries).map(entryName => 
        new HtmlWebpackPlugin({
          template: './template.html',
          filename: `${entryName}/index.html`, // Changed to output in subdirectories
          chunks: [entryName],
          inject: true
        })
      )
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  };
};