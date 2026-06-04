//扩展webpack的配置
const path = require('path');
module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
 },
  devServer: {
    allowedHosts: "all",   // 修复 allowedHosts 报错
    proxy: {
      '/api': {
        target: 'http://8.159.153.140:8080',
        changeOrigin: true,
      }
    }
  }
}