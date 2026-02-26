/**
 * Wrappers 统一导出
 * 提供工厂函数根据环境创建对应的数据源Wrapper
 */

export { BaseWrapper } from './BaseWrapper'
export { MockWrapper, type MockTrend } from './MockWrapper'
export { XApiWrapper, type XApiConfig, type XApiTrend } from './XApiWrapper'
export { MCPWrapper, type MCPTrend } from './MCPWrapper'
export { createTrendWrapper, getCurrentDataSource, type DataSource } from './factory'
