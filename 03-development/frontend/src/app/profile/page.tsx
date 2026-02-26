'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/hooks/useI18n'
import { useUser } from '@/hooks/useUser'
import { regionConfig, ageGroupConfig, ethnicityConfig, scenarioConfig } from '@/config/site'
import { Region, AgeGroup, Ethnicity, Scenario } from '@/types'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

function ProfileContent() {
  const { t } = useI18n()
  const { profile, updateProfile } = useUser()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedRegion, setSelectedRegion] = useState<Region>('global')
  const [selectedAge, setSelectedAge] = useState<AgeGroup>('25-34')
  const [selectedEthnicity, setSelectedEthnicity] = useState<Ethnicity | null>(null)
  const [selectedScenarios, setSelectedScenarios] = useState<Scenario[]>(['POD'])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setSelectedRegion(profile.region)
      setSelectedAge(profile.ageGroup)
      setSelectedEthnicity(profile.ethnicity || null)
      setSelectedScenarios(profile.scenarios)
    }
  }, [profile])

  const steps = [
    { title: t('profile.steps.region') },
    { title: t('profile.steps.age') },
    { title: t('profile.steps.ethnicity') },
    { title: t('profile.steps.scenarios') },
  ]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    updateProfile({
      region: selectedRegion,
      ageGroup: selectedAge,
      ethnicity: selectedEthnicity ?? undefined,
      scenarios: selectedScenarios,
    })

    setTimeout(() => {
      setIsSaving(false)
      router.push('/')
    }, 500)
  }

  const toggleScenario = (scenario: Scenario) => {
    const maxScenarios = 2 // Default max for free users
    if (selectedScenarios.includes(scenario)) {
      setSelectedScenarios(selectedScenarios.filter((s) => s !== scenario))
    } else if (selectedScenarios.length < maxScenarios) {
      setSelectedScenarios([...selectedScenarios, scenario])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <Header />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2 text-zinc-600 dark:text-zinc-400">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {t('profile.title')}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('profile.subtitle')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  i <= step
                    ? 'bg-violet-600 text-white'
                    : 'border border-zinc-300 text-zinc-400 dark:border-zinc-700'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-12 transition-colors ${
                    i < step ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-zinc-200/50 shadow-sm dark:border-zinc-800/50">
          <CardContent className="p-6">
            {/* Step 0: Region */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  选择您关注的地区
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {regionConfig.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => setSelectedRegion(region.id)}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                        selectedRegion === region.id
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'
                      }`}
                    >
                      <span className="text-2xl">{region.flag}</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {region.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Age */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  选择您的年龄段
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {ageGroupConfig.map((age) => (
                    <button
                      key={age.id}
                      onClick={() => setSelectedAge(age.id)}
                      className={`rounded-lg border p-4 text-center transition-colors ${
                        selectedAge === age.id
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {age.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Ethnicity (Optional) */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  选择您的族裔（可选）
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  此选项为可选项，用于更精准的个性化推荐
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button
                    onClick={() => setSelectedEthnicity(null)}
                    className={`rounded-lg border p-4 text-center transition-colors ${
                      selectedEthnicity === null
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'
                    }`}
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      跳过
                    </span>
                  </button>
                  {ethnicityConfig.map((ethnicity) => (
                    <button
                      key={ethnicity.id}
                      onClick={() => setSelectedEthnicity(ethnicity.id)}
                      className={`rounded-lg border p-4 text-center transition-colors ${
                        selectedEthnicity === ethnicity.id
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {ethnicity.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Scenarios */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  选择您想要的场景
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  最多选择 2 个场景
                </p>
                <div className="space-y-3">
                  {scenarioConfig.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => toggleScenario(scenario.id)}
                      disabled={!selectedScenarios.includes(scenario.id) && selectedScenarios.length >= 2}
                      className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                        selectedScenarios.includes(scenario.id)
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'
                      } ${!selectedScenarios.includes(scenario.id) && selectedScenarios.length >= 2 ? 'opacity-50' : ''}`}
                    >
                      <span className="text-2xl">{scenario.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {scenario.name}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {scenario.description}
                        </p>
                      </div>
                      {selectedScenarios.includes(scenario.id) && (
                        <Check className="h-5 w-5 text-violet-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="ghost"
            onClick={step === 0 ? () => router.push('/') : handleBack}
            className="text-zinc-600 dark:text-zinc-400"
          >
            {step === 0 ? '取消' : '上一步'}
          </Button>
          <Button
            onClick={step === steps.length - 1 ? handleSave : handleNext}
            disabled={isSaving || (step === 3 && selectedScenarios.length === 0)}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
          >
            {isSaving ? (
              '保存中...'
            ) : step === steps.length - 1 ? (
              '完成'
            ) : (
              '下一步'
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function ProfilePage() {
  return <ProfileContent />
}
