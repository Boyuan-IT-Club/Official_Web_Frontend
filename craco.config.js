//扩展webpack的配置
const path = require('path');

// 双构建：REACT_APP_MODE=admin 时 @routes 指向管理端路由，否则指向用户端路由。
// 未被选中的路由文件不进入模块依赖图，对应页面代码完全不会打进产物。
const isAdminBuild = process.env.REACT_APP_MODE === 'admin';

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@routes': path.resolve(
        __dirname,
        isAdminBuild ? 'src/router/admin.tsx' : 'src/router/user.tsx'
      ),
      // 主题同样按构建目标二选一：两端各自演进，互不牵连
      '@theme': path.resolve(
        __dirname,
        isAdminBuild ? 'src/theme/admin.ts' : 'src/theme/user.ts'
      )
    }
 }
}
