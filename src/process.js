// const boruta = require('boruta')
const { Matrix } = require('ml-matrix')
const boruta = require('/home/anton/projects/boruta/index')
const parse = require('csv-parse/lib/sync')
const importance = require('importance')
const KNN = require('ml-knn')
const LinReg = require('ml-regression-multivariate-linear')
const LogReg = require('./logreg.js')

module.exports = class Process {
  constructor () {
    this.file = ''
    this.records = []
    this.keys = []
  }

  run (paramsRaw) {
    const params = {
      file: paramsRaw['File'],
      target: paramsRaw['Target variable'],
      model: paramsRaw['Base model'],
      maxRuns: paramsRaw['Max runs'],
      pValue: paramsRaw['P value'],
      nRepeats: paramsRaw['N repeats'],
      nEstimators: paramsRaw['N estimators'],
      maxDepth: paramsRaw['Max depth']
    }
    if (!params.file && !this.file.length) {
      console.log('No file provided')
      throw new Error('No file selected')
    } else if (params.file !== this.file) {
      this.file = params.file
      this.records = parse(params.file, {
        columns: true,
        skip_empty_lines: true
      })
      this.keys = Object.keys(this.records[0]).filter(key => key.length)
      console.log('New file. Return variable names:', this.keys)
      return {
        'Target variable': {
          options: this.keys
        }
      }
    } else {
      console.log('Starting with parameters:', params)
      const features = this.keys.filter(k => (k !== params.target) && k.length)
      const X = this.records.map(row => features.map(f => row[f]))
      const y = this.records.map(row => row[params.target])
      console.log('Data:', X, y, features)
      console.log('Target variable:', params.target ? params.target : 'None')

      if (params.model.includes('RF')) {
        // We pass raw data to the Random Forest
        let type
        switch (params.model) {
          case 'RF Auto':
            type = 'auto'; break
          case 'RF Classifier':
            type = 'classification'; break
          case 'RF Regressor':
            type = 'regression'; break
        }
        const imp = boruta(X, y, {
          names: features,
          pValue: params.pValue,
          maxRuns: params.maxRuns,
          nEstimators: params.nEstimators,
          nRepeats: params.nRepeats,
          maxDepth: params.maxDepth,
          type
        })
        return { imp, features, model: params.model }
      } else {
        // Preprocess data here
        const Xraw = new Matrix(X)
        const featuresFiltered = []

        // Remove columns with many NaNs
        const cols = []
        for (let i = 0; i < Xraw.columns; i++) {
          const col = Xraw.getColumn(i)
          const na = col.reduce((a, x) => a + isNaN(x), 0)
          if (na < X.length / 10) {
            cols.push(i)
            featuresFiltered.push(features[i])
          }
        }

        let Xt = Xraw.subMatrixColumn(cols)

        // Remove rows with NaN
        const rows = []
        for (let i = 0; i < X.length; i++) {
          const row = Xt.getRow(i)
          const na = row.reduce((a, x) => a + isNaN(x), 0)
          if (na === 0) {
            rows.push(i)
          }
        }

        Xt = Xt.subMatrixRow(rows).to2DArray()

        let yt = y.filter((v, i) => rows.includes(i))
        const uniques = Array.from(new Set(yt))

        /*
        if (uniques.length < yt.length / 5) {
          yt = yt.map(v => uniques.indexOf(v))
        } else {
          yt = yt.map(v => +v)
        }
        */

        console.log('Transformed data:', Xt, yt)

        switch (params.model) {
          case 'Logistic Regression': {
            yt = yt.map(v => uniques.indexOf(v))
            const getImpLogReg = (X, y, opts) => {
              const Xl = new Matrix(X)
              const yl = Matrix.columnVector(y)
              const logreg = new LogReg({ numSteps: 500, learningRate: 5e-3 })
              logreg.train(Xl, yl)
              const lr = {
                predict: (X) => {
                  const res = logreg.predict(new Matrix(X))
                  return res.to1DArray ? res.to1DArray() : res
                }
              }
              return importance(lr, X, y, {
                kind: 'acc',
                n: 5,
                means: true,
                verbose: false
              })
            }
            const imp = boruta(Xt, yt, {
              names: featuresFiltered,
              pValue: params.pValue,
              maxRuns: params.maxRuns,
              getImportance: getImpLogReg
            })
            console.log(imp)
            return { imp, features: featuresFiltered, model: params.model }
          }
          case 'Linear Regression': {
            yt = yt.map(v => +v)
            const getImpLinReg = (X, y, opts) => {
              const Xl = new Matrix(X)
              const yl = new Matrix(y.map(v => [v]))
              var linreg = new LinReg(Xl, yl)
              const lr = {
                predict: (X) => {
                  const res = linreg.predict(new Matrix(X)).to1DArray()
                  return res
                }
              }
              return importance(lr, X, y, {
                kind: 'mse',
                n: params.nRepeats,
                means: true,
                verbose: false
              })
            }
            const imp = boruta(Xt, yt, {
              names: featuresFiltered,
              getImportance: getImpLinReg,
              pValue: params.pValue,
              maxRuns: params.maxRuns
            })
            return { imp, features: featuresFiltered, model: params.model }
          }
          case 'KNN': {
            yt = yt.map(v => uniques.indexOf(v))
            const getImpKNN = (X, y, opts) => {
              const knn = new KNN(X, y)
              return importance(knn, X, y, {
                kind: 'acc',
                n: params.nRepeats,
                means: true,
                verbose: false
              })
            }
            const imp = boruta(Xt, yt, {
              names: featuresFiltered,
              getImportance: getImpKNN,
              pValue: params.pValue,
              maxRuns: params.maxRuns
            })
            return { imp, features: featuresFiltered, model: params.model }
          }
        } // *switch model
      } // *else - not random forest
    } // * got data
  }
}
