const Plotly = require('./plotly-custom.js')

module.exports = class Render {
  constructor () {
    this.outputs = document.getElementById('outputs')
    this.divPlot = document.createElement('div')
    this.divPlot.style.width = '100%'
    this.divPlot.style.maxWidth = '900px'
    this.outputs.appendChild(this.divPlot)

    this.divProgress = document.createElement('div')
    this.divProgress.style.width = '100%'
    this.divProgress.style.marginTop = '30px'
    this.outputs.appendChild(this.divProgress)

    this.divConsole = document.createElement('log')
  }

  render (data) {
    const { imp, features, model } = data
    const mean = (x) => x.reduce((a, v) => a + v / x.length, 0)
    // console.log(imp)

    const traces = features
      .map((f, fi) => ({
        y: imp.impHistory.map(h => h.imp[fi]).filter(v => v > -Infinity),
        type: 'box',
        name: features[fi],
        marker: {
          color: imp.finalDecision[features[fi]] === 'Confirmed' ? '#12BB9B' : '#CA1653',
          size: 2
        },
        line: {
          width: 1
        }
      }))
      .sort((a, b) => mean(a.y) - mean(b.y))

    ;['shadowMin', 'shadowMax', 'shadowMean'].forEach(s => {
      traces.push({
        y: imp.impHistory.map(h => h[s]),
        type: 'box',
        name: s,
        marker: {
          color: '#AAAAAA',
          size: 2
        },
        line: {
          width: 1
        }
      })
    })

    var layout = {
      title: 'Boruta Feature Importance (' + model + ')',
      showlegend: false
    }
    Plotly.newPlot(this.divPlot, traces, layout)

    let table = ''
    table = '<table>\n<tr><th>Feature</th><th>Feature importance</th><th>Status</th></tr>\n'
    for (let i = traces.length - 4; i >= 0; i--) {
      const t = traces[i]
      table += `<tr><td>${t.name}</td><td>${mean(t.y)}</td><td class="${imp.finalDecision[t.name].toLowerCase()}">${imp.finalDecision[t.name]}</td></tr>\n`
    }
    table += '</table>'
    this.divProgress.innerHTML = table
  }
}
