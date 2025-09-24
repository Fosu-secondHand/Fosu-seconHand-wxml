// 简单的测试脚本，用于验证WXML修复是否有效
console.log('开始测试register.wxml修复...');

// 检查文件是否存在
const fs = require('fs');
const path = require('path');

const registerWxmlPath = path.join(__dirname, 'pages', 'register', 'register.wxml');

if (fs.existsSync(registerWxmlPath)) {
  console.log('register.wxml文件存在');
  
  // 读取文件内容
  const content = fs.readFileSync(registerWxmlPath, 'utf8');
  
  // 检查是否包含字符串模板语法
  const hasTemplateString = content.includes('`${');
  console.log('是否包含字符串模板语法:', hasTemplateString);
  
  // 检查是否正确使用了字符串拼接
  const hasStringConcatenation = content.includes('countdown + \'s后重发\'');
  console.log('是否正确使用了字符串拼接:', hasStringConcatenation);
  
  // 检查是否有多余的字符
  const hasUnexpectedChars = content.includes('```');
  console.log('是否有意外的```字符:', hasUnexpectedChars);
  
  if (!hasTemplateString && hasStringConcatenation && !hasUnexpectedChars) {
    console.log('修复看起来成功了！register.wxml文件现在应该可以正常编译了。');
  } else {
    console.log('仍然存在一些问题，可能需要进一步修复。');
  }
} else {
  console.log('register.wxml文件不存在，请检查路径。');
}

console.log('测试完成');