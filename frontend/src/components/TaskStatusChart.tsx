import { useEffect, useRef, useState } from 'react'
import type { Task } from '../api/types'
import { loadGoogleCharts } from '../lib/googleChartsLoader'

interface TaskStatusChartProps {
  tasks: Task[]
  hasActiveList: boolean
  isLoading: boolean
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      {message}
    </div>
  )
}

function buildChartData(tasks: Task[]) {
  const counts = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0
  }

  for (const task of tasks) {
    if (task.status in counts) {
      counts[task.status] += 1
    }
  }

  return [
    ['Status', 'Tasks'],
    ['TODO', counts.TODO],
    ['IN_PROGRESS', counts.IN_PROGRESS],
    ['DONE', counts.DONE]
  ]
}

const chartOptions = {
  backgroundColor: 'transparent',
  chartArea: { left: 16, top: 16, width: '92%', height: '72%' },
  colors: ['#64748b', '#0ea5e9', '#16a34a'],
  legend: { position: 'bottom', textStyle: { color: '#475569' } },
  pieSliceText: 'value',
  tooltip: { text: 'both' }
} satisfies GooglePieChartOptions

export default function TaskStatusChart({ tasks, hasActiveList, isLoading }: TaskStatusChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const [isChartLoading, setIsChartLoading] = useState(false)

  useEffect(() => {
    if (!hasActiveList || tasks.length === 0) {
      setChartError(null)
      setIsChartLoading(false)
      return
    }

    let isCancelled = false
    let cleanupResize = () => {}

    const run = async () => {
      setChartError(null)
      setIsChartLoading(true)

      try {
        const google = await loadGoogleCharts()
        if (isCancelled || !chartContainerRef.current) {
          return
        }

        const drawChart = () => {
          if (!chartContainerRef.current) {
            return
          }

          const data = google.visualization.arrayToDataTable(buildChartData(tasks))
          const chart = new google.visualization.PieChart(chartContainerRef.current)
          chart.draw(data, chartOptions)
        }

        drawChart()

        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => drawChart())
          observer.observe(chartContainerRef.current)
          cleanupResize = () => observer.disconnect()
        } else {
          const onWindowResize = () => drawChart()
          window.addEventListener('resize', onWindowResize)
          cleanupResize = () => window.removeEventListener('resize', onWindowResize)
        }
      } catch {
        if (!isCancelled) {
          setChartError('Unable to load chart.')
        }
      } finally {
        if (!isCancelled) {
          setIsChartLoading(false)
        }
      }
    }

    void run()

    return () => {
      isCancelled = true
      cleanupResize()
    }
  }, [hasActiveList, tasks])

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Task status overview</h3>
      <p className="mt-1 text-sm text-slate-600">Status distribution for the currently selected list.</p>

      {!hasActiveList ? <EmptyState message="Select a list to view task status distribution." /> : null}

      {hasActiveList && (isLoading || isChartLoading) && tasks.length === 0 ? (
        <EmptyState message="Loading task status chart..." />
      ) : null}

      {hasActiveList && !isLoading && tasks.length === 0 ? (
        <EmptyState message="No tasks in this list yet. Create a task to see the chart." />
      ) : null}

      {hasActiveList && chartError ? <EmptyState message={chartError} /> : null}

      {hasActiveList && tasks.length > 0 && !chartError ? <div className="mt-3 h-[280px] w-full" ref={chartContainerRef} /> : null}
    </section>
  )
}
