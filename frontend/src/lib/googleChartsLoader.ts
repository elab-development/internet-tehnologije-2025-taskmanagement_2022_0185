const GOOGLE_CHARTS_SCRIPT_ID = 'google-charts-loader'
const GOOGLE_CHARTS_SCRIPT_URL = 'https://www.gstatic.com/charts/loader.js'
const GOOGLE_CHARTS_SCRIPT_LOADED_ATTR = 'data-google-charts-loaded'

let googleChartsPromise: Promise<GoogleChartsGlobal> | null = null

function getGoogleChartsBase(): Pick<GoogleChartsGlobal, 'charts'> | null {
  if (typeof window === 'undefined') {
    return null
  }

  const google = window.google
  if (!google?.charts) {
    return null
  }

  return google
}

function ensureLoaderScript() {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_CHARTS_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      if (existingScript.getAttribute(GOOGLE_CHARTS_SCRIPT_LOADED_ATTR) === 'true') {
        resolve()
        return
      }

      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Charts loader script.')),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_CHARTS_SCRIPT_ID
    script.src = GOOGLE_CHARTS_SCRIPT_URL
    script.async = true
    script.addEventListener(
      'load',
      () => {
        script.setAttribute(GOOGLE_CHARTS_SCRIPT_LOADED_ATTR, 'true')
        resolve()
      },
      { once: true }
    )
    script.addEventListener('error', () => reject(new Error('Failed to load Google Charts loader script.')), {
      once: true
    })
    document.head.appendChild(script)
  })
}

export function loadGoogleCharts(): Promise<GoogleChartsGlobal> {
  if (googleChartsPromise) {
    return googleChartsPromise
  }

  googleChartsPromise = (async () => {
    if (!getGoogleChartsBase()) {
      await ensureLoaderScript()
    }

    const google = getGoogleChartsBase()
    if (!google) {
      throw new Error('Google Charts base namespace is unavailable after loading script.')
    }

    await new Promise<void>((resolve) => {
      google.charts.load('current', { packages: ['corechart'] })
      google.charts.setOnLoadCallback(() => resolve())
    })

    const loadedGoogle = window.google
    if (!loadedGoogle?.charts || !loadedGoogle?.visualization) {
      throw new Error('Google Charts failed to initialize.')
    }

    return loadedGoogle
  })().catch((error) => {
    googleChartsPromise = null
    throw error
  })

  return googleChartsPromise
}
