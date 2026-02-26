#!/usr/bin/env node

/**
 * X API Wrapper 测试脚本
 * 直接 import XApiWrapper 进行测试
 *
 * 使用: npx tsx scripts/test-x-api.js
 */

// 加载环境变量
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 .env.local 并设置到 process.env
const envPath = join(__dirname, '../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      process.env[match[1]] = match[2].trim();
    }
  });
} catch {
  console.log('⚠️  警告: .env.local 文件不存在\n');
}

import { XApiWrapper } from '../src/wrappers/XApiWrapper.ts';

// 打印结果
function printResult(result) {
  console.log('════════════════════════════════════════════════════════════');

  if (result.success) {
    console.log('✅ 测试通过!\n');
    console.log(`📍 地区: ${result.location}`);
    console.log(`📊 获取到 ${result.count} 条热点:\n`);

    result.trends.slice(0, 5).forEach((trend, i) => {
      const volume = trend.tweet_volume ? trend.tweet_volume.toLocaleString() : 'N/A';
      console.log(`   ${i + 1}. ${trend.name}`);
      console.log(`      推文量: ${volume}`);
      if (trend.url) console.log(`      链接: ${trend.url}`);
    });

    if (result.count > 5) {
      console.log(`   ... 还有 ${result.count - 5} 条\n`);
    }
  } else {
    console.log('❌ 测试失败!\n');
    console.log(`   错误: ${result.error}\n`);

    if (result.error.includes('403')) {
      console.log('💡 说明: 当前 API 访问级别不支持 Trends 端点');
      console.log('   Trends API 需要 Pro 计划 ($5,000/月)\n');
      console.log('   查看: https://developer.x.com/en/portal/product\n');
    } else if (result.error.includes('认证失败')) {
      console.log('💡 说明: Bearer Token 无效或已过期\n');
      console.log('   请访问: https://developer.x.com/en/portal/dashboard\n');
    }
  }

  console.log('════════════════════════════════════════════════════════════');
}

// 主函数
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         XTrendAI - XApiWrapper 测试脚本                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 创建 Wrapper 实例
  const wrapper = new XApiWrapper();

  console.log('📋 配置检查:');
  console.log(`   已配置: ${wrapper.isConfigured() ? '是' : '否'}\n`);

  if (!wrapper.isConfigured()) {
    console.log('❌ XApiWrapper 配置不完整\n');
    console.log('请设置 X_BEARER_TOKEN 环境变量\n');
    process.exit(1);
  }

  // 测试全球热点
  console.log('🔍 测试 XApiWrapper.getGlobalTrends()...\n');

  try {
    const trends = await wrapper.getGlobalTrends();
    printResult({
      success: true,
      location: 'Global',
      count: trends.length,
      trends: trends
    });
  } catch (error) {
    printResult({
      success: false,
      error: error.message
    });
  }
}

main();
