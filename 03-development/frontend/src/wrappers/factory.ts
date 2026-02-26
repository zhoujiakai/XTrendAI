import { MockWrapper } from './MockWrapper'
import { XApiWrapper } from './XApiWrapper'
import { MCPWrapper } from './MCPWrapper'

/**
 * 数据源类型
 */
export type DataSource = 'mock' | 'xapi' | 'mcp'

/**
 * 工厂函数：根据环境创建对应的数据源Wrapper
 *
 * 优先级：
 * 1. 如果设置了 USE_DATA_SOURCE 环境变量，使用指定的数据源
 * 2. 如果有 X_API_KEY，使用 XApiWrapper
 * 3. 如果有 MCP_SERVER_URL，使用 MCPWrapper
 * 4. 默认使用 MockWrapper (MVP阶段)
 */
export function createTrendWrapper() {
  const dataSource = process.env.USE_DATA_SOURCE as DataSource

  if (dataSource === 'mock') {
    return new MockWrapper()
  }

  if (dataSource === 'xapi') {
    const wrapper = new XApiWrapper()
    if (wrapper.isConfigured()) {
      return wrapper
    }
    console.warn('XApiWrapper 配置不完整，回退到 MockWrapper')
    return new MockWrapper()
  }

  if (dataSource === 'mcp') {
    return new MCPWrapper()
  }

  // 自动检测
  if (process.env.X_BEARER_TOKEN) {
    const wrapper = new XApiWrapper()
    if (wrapper.isConfigured()) {
      return wrapper
    }
  }

  if (process.env.MCP_SERVER_URL) {
    return new MCPWrapper()
  }

  // 默认使用 Mock 数据
  return new MockWrapper()
}

/**
 * 获取当前使用的数据源类型
 */
export function getCurrentDataSource(): DataSource {
  const dataSource = process.env.USE_DATA_SOURCE as DataSource

  if (dataSource === 'mock' || dataSource === 'xapi' || dataSource === 'mcp') {
    return dataSource
  }

  if (process.env.X_BEARER_TOKEN) return 'xapi'
  if (process.env.MCP_SERVER_URL) return 'mcp'

  return 'mock'
}
