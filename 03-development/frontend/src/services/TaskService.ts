import { Trend, Task, Scenario, ScenarioTasks, Locale } from '@/types'
import { scenarioConfig } from '@/config/site'
import zhCN from '@/locales/zh-CN.json'
import enUS from '@/locales/en-US.json'

const translations = { zhCN, enUS }

export class TaskService {
  /**
   * 根据热点和场景生成任务
   */
  static async generateTasks(params: {
    trend: Trend
    scenarios: Scenario[]
    locale: Locale
  }): Promise<ScenarioTasks[]> {
    const { trend, scenarios, locale } = params
    const results: ScenarioTasks[] = []

    for (const scenario of scenarios) {
      const scenarioInfo = scenarioConfig.find((s) => s.id === scenario)
      if (!scenarioInfo) continue

      const tasks = await this.generateTasksForScenario(trend, scenario, locale)
      results.push({
        scenario,
        scenarioName: locale === 'zh-CN' ? scenarioInfo.name : scenarioInfo.nameEn,
        tasks,
      })
    }

    return results
  }

  /**
   * 为特定场景生成任务
   */
  private static async generateTasksForScenario(
    trend: Trend,
    scenario: Scenario,
    locale: Locale
  ): Promise<Task[]> {
    const tasks: Task[] = []
    const trendName = trend.displayName || trend.name.replace(/^#/, '')
    const timestamp = new Date().toISOString()

    // 根据场景类型生成不同任务
    switch (scenario) {
      case 'POD':
        tasks.push(
          {
            id: `task-${trend.id}-tshirt-${Date.now()}`,
            trendId: trend.id,
            scenario: 'POD',
            type: 'tshirt',
            title: locale === 'zh-CN' ? 'T恤设计提示词' : 'T-Shirt Design Prompt',
            content: this.renderTemplate('templates.POD.tshirt', locale, {
              trendName,
              style: locale === 'zh-CN' ? '简约时尚风格' : 'Minimalist trendy style',
              specs: locale === 'zh-CN' ? '纯棉材质，多色可选，S-5XL' : '100% cotton, multiple colors, S-5XL',
            }),
            wordCount: 0,
            templateId: 'pod-tshirt-v1',
            createdAt: timestamp,
          },
          {
            id: `task-${trend.id}-tote-${Date.now()}`,
            trendId: trend.id,
            scenario: 'POD',
            type: 'tote',
            title: locale === 'zh-CN' ? '帆布袋设计提示词' : 'Tote Bag Design Prompt',
            content: this.renderTemplate('templates.POD.tote', locale, {
              trendName,
              style: locale === 'zh-CN' ? '潮流帆布袋' : 'Chic canvas tote',
              specs: locale === 'zh-CN' ? '环保材质，大容量' : 'Eco-friendly, large capacity',
            }),
            wordCount: 0,
            templateId: 'pod-tote-v1',
            createdAt: timestamp,
          },
          {
            id: `task-${trend.id}-mug-${Date.now()}`,
            trendId: trend.id,
            scenario: 'POD',
            type: 'mug',
            title: locale === 'zh-CN' ? '马克杯设计提示词' : 'Mug Design Prompt',
            content: this.renderTemplate('templates.POD.mug', locale, {
              trendName,
              style: locale === 'zh-CN' ? '陶瓷马克杯' : 'Ceramic coffee mug',
              specs: locale === 'zh-CN' ? '11盎司，微波炉安全' : '11oz, microwave safe',
            }),
            wordCount: 0,
            templateId: 'pod-mug-v1',
            createdAt: timestamp,
          },
          {
            id: `task-${trend.id}-phonecase-${Date.now()}`,
            trendId: trend.id,
            scenario: 'POD',
            type: 'phonecase',
            title: locale === 'zh-CN' ? '手机壳设计提示词' : 'Phone Case Design Prompt',
            content: this.renderTemplate('templates.POD.phonecase', locale, {
              trendName,
              style: locale === 'zh-CN' ? '防摔手机壳' : 'Protective phone case',
              specs: locale === 'zh-CN' ? '适用于iPhone/Android系列' : 'Fits iPhone/Android series',
            }),
            wordCount: 0,
            templateId: 'pod-phonecase-v1',
            createdAt: timestamp,
          }
        )
        break

      case 'CONTENT':
        tasks.push(
          {
            id: `task-${trend.id}-video-${Date.now()}`,
            trendId: trend.id,
            scenario: 'CONTENT',
            type: 'video-topic',
            title: locale === 'zh-CN' ? '视频选题' : 'Video Topic',
            content: this.renderTemplate('templates.CONTENT.videoTopic', locale, {
              trendName,
              outline: locale === 'zh-CN'
                ? `1. 开场：${trendName} 为什么火？\n2. 背景介绍：事件来龙去脉\n3. 深度分析：背后的原因\n4. 趋势预测：接下来会怎样？\n5. 互动：你如何看待 ${trendName}？`
                : `1. Intro: Why is ${trendName} trending?\n2. Background: The full story\n3. Analysis: What's behind it\n4. Prediction: What's next?\n5. Call to Action: What do you think about ${trendName}?`,
            }),
            wordCount: 0,
            templateId: 'content-video-v1',
            createdAt: timestamp,
          },
          {
            id: `task-${trend.id}-script-${Date.now()}`,
            trendId: trend.id,
            scenario: 'CONTENT',
            type: 'script-outline',
            title: locale === 'zh-CN' ? '脚本大纲' : 'Script Outline',
            content: this.renderTemplate('templates.CONTENT.scriptOutline', locale, {
              trendName,
              duration: locale === 'zh-CN' ? '3-5分钟' : '3-5 minutes',
              style: locale === 'zh-CN' ? '轻松幽默' : 'Light-hearted',
              sections: locale === 'zh-CN' ? '开场(30秒) → 主体(2-3分钟) → 结尾(30秒)' : 'Intro(30s) → Body(2-3min) → Outro(30s)',
            }),
            wordCount: 0,
            templateId: 'content-script-v1',
            createdAt: timestamp,
          }
        )
        break

      case 'MARKETING':
        tasks.push(
          {
            id: `task-${trend.id}-title-${Date.now()}`,
            trendId: trend.id,
            scenario: 'MARKETING',
            type: 'title',
            title: locale === 'zh-CN' ? '促销标题' : 'Promo Title',
            content: this.renderTemplate('templates.MARKETING.title', locale, {
              trendName,
              emoji: '🔥',
              headline: locale === 'zh-CN' ? `抓住 ${trendName} 潮流` : `Catch the ${trendName} Wave`,
              cta: locale === 'zh-CN' ? '限时优惠！' : 'Limited Time Offer!',
            }),
            wordCount: 0,
            templateId: 'marketing-title-v1',
            createdAt: timestamp,
          },
          {
            id: `task-${trend.id}-desc-${Date.now()}`,
            trendId: trend.id,
            scenario: 'MARKETING',
            type: 'description',
            title: locale === 'zh-CN' ? '商品描述' : 'Product Description',
            content: this.renderTemplate('templates.MARKETING.description', locale, {
              trendName,
              features: locale === 'zh-CN' ? '精选材质，舒适耐用' : 'Premium quality, comfort guaranteed',
              appeal: locale === 'zh-CN' ? '限量发售，售完即止' : 'Limited edition, while supplies last',
            }),
            wordCount: 0,
            templateId: 'marketing-desc-v1',
            createdAt: timestamp,
          },
          {
            id: `task-${trend.id}-tags-${Date.now()}`,
            trendId: trend.id,
            scenario: 'MARKETING',
            type: 'tags',
            title: locale === 'zh-CN' ? '推荐标签' : 'Recommended Tags',
            content: this.renderTemplate('templates.MARKETING.tags', locale, {
              trendName,
              relatedTags: locale === 'zh-CN' ? '热门,潮流,新品' : 'trending,viral,new',
            }),
            wordCount: 0,
            templateId: 'marketing-tags-v1',
            createdAt: timestamp,
          }
        )
        break

      case 'DEVELOPMENT':
        tasks.push(
          {
            id: `task-${trend.id}-req-${Date.now()}`,
            trendId: trend.id,
            scenario: 'DEVELOPMENT',
            type: 'requirement',
            title: locale === 'zh-CN' ? '功能需求' : 'Feature Requirements',
            content: this.renderTemplate('templates.DEVELOPMENT.requirement', locale, {
              trendName,
              goal: locale === 'zh-CN' ? `帮助用户快速获取 ${trendName} 相关信息` : `Help users quickly access ${trendName} information`,
              features: locale === 'zh-CN' ? '- 实时数据展示\n- 个性化推荐\n- 数据可视化' : '- Real-time data display\n- Personalized recommendations\n- Data visualization',
            }),
            wordCount: 0,
            templateId: 'dev-req-v1',
            createdAt: timestamp,
          },
          {
            id: `task-${trend.id}-tech-${Date.now()}`,
            trendId: trend.id,
            scenario: 'DEVELOPMENT',
            type: 'tech-stack',
            title: locale === 'zh-CN' ? '技术方向' : 'Tech Stack',
            content: this.renderTemplate('templates.DEVELOPMENT.techStack', locale, {
              trendName,
              frontend: 'Next.js + Tailwind CSS',
              backend: 'Node.js + Express',
              database: 'PostgreSQL',
              deployment: 'Vercel + Railway',
            }),
            wordCount: 0,
            templateId: 'dev-tech-v1',
            createdAt: timestamp,
          }
        )
        break
    }

    // 计算字数
    tasks.forEach((task) => {
      task.wordCount = task.content.length
    })

    return tasks
  }

  /**
   * 渲染模板
   */
  private static renderTemplate(
    templateKey: string,
    locale: Locale,
    params: Record<string, string>
  ): string {
    const keyParts = templateKey.split('.')
    const translationObj = translations[locale === 'zh-CN' ? 'zhCN' : 'enUS']
    const template = keyParts.reduce((obj: any, key) => obj?.[key], translationObj)

    if (!template || typeof template !== 'string') {
      // Return a fallback template
      if (templateKey.includes('tshirt')) {
        return locale === 'zh-CN'
          ? `一款适合${params.trendName}的潮流T恤设计`
          : `A trendy t-shirt design for ${params.trendName}`
      }
      return `Template: ${templateKey} - ${JSON.stringify(params)}`
    }

    // 替换模板变量
    return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || `{${key}}`)
  }
}
