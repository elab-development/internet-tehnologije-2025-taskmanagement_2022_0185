declare global {
  type GoogleChartsLoadVersion = 'current'

  type GoogleChartsPackage = 'corechart'

  interface GoogleChartsLoadOptions {
    packages: GoogleChartsPackage[]
  }

  interface GooglePieChartOptions {
    backgroundColor: string
    chartArea: {
      left: number
      top: number
      width: string
      height: string
    }
    colors: string[]
    legend: {
      position: 'bottom'
      textStyle: {
        color: string
      }
    }
    pieSliceText: 'value'
    tooltip: {
      text: 'both'
    }
  }

  interface GoogleDataTable {}

  interface GoogleVisualizationPieChart {
    draw(dataTable: GoogleDataTable, options: GooglePieChartOptions): void
  }

  interface GoogleVisualizationNamespace {
    arrayToDataTable(data: (string | number)[][]): GoogleDataTable
    PieChart: new (element: Element) => GoogleVisualizationPieChart
  }

  interface GoogleChartsNamespace {
    load(version: GoogleChartsLoadVersion, options: GoogleChartsLoadOptions): void
    setOnLoadCallback(callback: () => void): void
  }

  interface GoogleChartsGlobal {
    charts: GoogleChartsNamespace
    visualization: GoogleVisualizationNamespace
  }

  interface Window {
    google?: GoogleChartsGlobal
  }
}

export {}
