'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Matrix = _interopDefault(require('ml-matrix'));

class LogisticRegressionTwoClasses {
    constructor(options = {}) {
        this.numSteps = options.numSteps || 500000;
        this.learningRate = options.learningRate || 5e-4;
        this.weights = options.weights ? Matrix.checkMatrix(options.weights) : null;
    }

    train(features, target) {
        var weights = Matrix.zeros(1, features.columns);

        for (var step = 0; step < this.numSteps; step++) {
            var scores = features.mmul(weights.transpose());
            var predictions = sigmoid(scores);

            // Update weights with gradient
            var outputErrorSignal = Matrix.columnVector(predictions).neg().add(target);
            var gradient = features.transpose().mmul(outputErrorSignal);
            weights = weights.add(gradient.mul(this.learningRate).transpose());
        }

        this.weights = weights;
    }

    testScores(features) {
        var finalData = features.mmul(this.weights.transpose());
        var predictions = sigmoid(finalData);
        predictions = Matrix.columnVector(predictions);
        return predictions.to1DArray();
    }

    predict(features) {
        var finalData = features.mmul(this.weights.transpose());
        var predictions = sigmoid(finalData);
        predictions = Matrix.columnVector(predictions).round();
        return predictions.to1DArray();
    }

    predictProba(features) {
        var finalData = features.mmul(this.weights.transpose());
        var predictions = sigmoid(finalData);
        predictions = Matrix.columnVector(predictions);
        return predictions.to1DArray();
    }

    static load(model) {
        return new LogisticRegressionTwoClasses(model);
    }

    toJSON() {
        return {
            numSteps: this.numSteps,
            learningRate: this.learningRate,
            weights: this.weights
        };
    }
}

function sigmoid(scores) {
    scores = scores.to1DArray();
    var result = [];
    for (var i = 0; i < scores.length; i++) {
        result.push(1 / (1 + Math.exp(-scores[i])));
    }
    return result;
}

function transformClassesForOneVsAll(Y, oneClass) {
    var y = Y.to1DArray();
    for (var i = 0; i < y.length; i++) {
        if (y[i] === oneClass) {
            y[i] = 0;
        } else {
            y[i] = 1;
        }
    }
    return Matrix.columnVector(y);
}

class LogisticRegression {
    constructor(options = {}) {
        this.numSteps = options. numSteps || 500000;
        this.learningRate = options.learningRate || 5e-4;
        this.classifiers = options.classifiers || [];
        this.numberClasses = options.numberClasses || 0;
    }

    train(X, Y) {
        this.numberClasses = new Set(Y.to1DArray()).size;
        this.classifiers = new Array(this.numberClasses);

        // train the classifiers
        for (var i = 0; i < this.numberClasses; i++) {
            this.classifiers[i] = new LogisticRegressionTwoClasses({numSteps: this.numSteps, learningRate: this.learningRate});
            var y = Y.clone();
            y = transformClassesForOneVsAll(y, i);
            this.classifiers[i].train(X, y);
        }
    }

    predict(Xtest) {
        var resultsOneClass = new Array(this.numberClasses).fill(0);
        var i;
        for (i = 0; i < this.numberClasses; i++) {
            resultsOneClass[i] = this.classifiers[i].testScores(Xtest);
        }
        var finalResults = new Array(Xtest.rows).fill(0);
        for (i = 0; i < Xtest.rows; i++) {
            var minimum = 100000;
            for (var j = 0; j < this.numberClasses; j++) {
                if (resultsOneClass[j][i] < minimum) {
                    minimum = resultsOneClass[j][i];
                    finalResults[i] = j;
                }
            }
        }
        return finalResults;
    }
    predictProba(Xtest) {
        var resultsOneClass = new Array(this.numberClasses).fill(0);
        var i;
        for (i = 0; i < this.numberClasses; i++) {
            resultsOneClass[i] = this.classifiers[i].testScores(Xtest);
        }
        return resultsOneClass;
    }

    static load(model) {
        if (model.name !== 'LogisticRegression') {
            throw new Error('invalid model: ' + model.name);
        }
        const newClassifier = new LogisticRegression(model);
        for (let i = 0; i < newClassifier.numberClasses; i++) {
            newClassifier.classifiers[i] = LogisticRegressionTwoClasses.load(model.classifiers[i]);
        }
        return newClassifier;
    }

    toJSON() {
        return {
            name: 'LogisticRegression',
            numSteps: this.numSteps,
            learningRate: this.learningRate,
            numberClasses: this.numberClasses,
            classifiers: this.classifiers
        };
    }
}

module.exports = LogisticRegression;
