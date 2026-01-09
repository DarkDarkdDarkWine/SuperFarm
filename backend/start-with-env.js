// 启动脚本 - 加载环境配置并启动服务
const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 加载环境配置
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

console.log('🔧 环境配置已加载:');
console.log('- DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✓ 已设置' : '❌ 未设置');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- PORT:', process.env.PORT || '3001');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000');
console.log('- LOG_LEVEL:', process.env.LOG_LEVEL || 'info');

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('💥 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器
console.log('🚀 正在启动服务器...');
require('./src/app.js'); 