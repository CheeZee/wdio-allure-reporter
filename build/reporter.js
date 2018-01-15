'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _allureJsCommons = require('allure-js-commons');

var _allureJsCommons2 = _interopRequireDefault(_allureJsCommons);

var _step = require('allure-js-commons/beans/step');

var _step2 = _interopRequireDefault(_step);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isEmpty(object) {
    return !object || (0, _keys2.default)(object).length === 0;
}

var LOGGING_HOOKS = ['"before all" hook', '"after all" hook'];

/**
 * Initialize a new `Allure` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */

var AllureReporter = function (_events$EventEmitter) {
    (0, _inherits3.default)(AllureReporter, _events$EventEmitter);

    function AllureReporter(baseReporter, config) {
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        (0, _classCallCheck3.default)(this, AllureReporter);

        var _this = (0, _possibleConstructorReturn3.default)(this, (AllureReporter.__proto__ || (0, _getPrototypeOf2.default)(AllureReporter)).call(this));

        _this.baseReporter = baseReporter;
        _this.config = config;
        _this.options = options;
        _this.allures = {};

        var epilogue = _this.baseReporter.epilogue;


        _this.on('end', function () {
            epilogue.call(baseReporter);
        });

        _this.on('suite:start', function (suite) {
            var allure = _this.getAllure(suite.cid);
            var currentSuite = allure.getCurrentSuite();
            var prefix = currentSuite ? currentSuite.name + ' ' : '';
            allure.startSuite(prefix + suite.title);
        });

        _this.on('suite:end', function (suite) {
            _this.getAllure(suite.cid).endSuite();
        });

        _this.on('test:start', function (test) {
            var allure = _this.getAllure(test.cid);
            allure.startCase(test.title);

            var currentTest = allure.getCurrentTest();
            currentTest.addParameter('environment-variable', 'capabilities', (0, _stringify2.default)(test.runner[test.cid]));
            currentTest.addParameter('environment-variable', 'spec files', (0, _stringify2.default)(test.specs));
        });

        _this.on('test:pass', function (test) {
            _this.getAllure(test.cid).endCase('passed');
        });

        _this.on('test:fail', function (test) {
            var allure = _this.getAllure(test.cid);
            var status = test.err.type === 'AssertionError' ? 'failed' : 'broken';

            if (!allure.getCurrentTest()) {
                allure.startCase(test.title);
            } else {
                allure.getCurrentTest().name = test.title;
            }

            while (allure.getCurrentSuite().currentStep instanceof _step2.default) {
                allure.endStep(status);
            }

            allure.endCase(status, test.err);
        });

        _this.on('test:pending', function (test) {
            _this.getAllure(test.cid).pendingCase(test.title);
        });

        _this.on('runner:command', function (command) {
            var allure = _this.getAllure(command.cid);

            if (!_this.isAnyTestRunning(allure)) {
                return;
            }

            allure.startStep(command.method + ' ' + command.uri.path);

            if (!isEmpty(command.data)) {
                _this.dumpJSON(allure, 'Request', command.data);
            }
        });

        _this.on('runner:result', function (command) {
            var allure = _this.getAllure(command.cid);

            if (!_this.isAnyTestRunning(allure)) {
                return;
            }

            if (command.requestOptions.uri.path.match(/\/wd\/hub\/session\/[^/]*\/screenshot/) && command.body.value) {
                allure.addAttachment('Screenshot', Buffer.from(command.body.value, 'base64'));
            } else if (command.body) {
                _this.dumpJSON(allure, 'Response', command.body);
            }

            allure.endStep('passed');
        });

        _this.on('runner:screenshot', function (command) {
            var allure = _this.getAllure(command.cid);

            allure.addAttachment('screenshot-' + command.filename, Buffer.from(command.data, 'base64'));
        });

        _this.on('hook:start', function (hook) {
            var allure = _this.getAllure(hook.cid);

            if (!allure.getCurrentSuite() || LOGGING_HOOKS.indexOf(hook.title) === -1) {
                return;
            }

            allure.startCase(hook.title);
        });

        _this.on('hook:end', function (hook) {
            var allure = _this.getAllure(hook.cid);

            if (!allure.getCurrentSuite() || LOGGING_HOOKS.indexOf(hook.title) === -1) {
                return;
            }

            allure.endCase('passed');

            if (allure.getCurrentTest().steps.length === 0) {
                allure.getCurrentSuite().testcases.pop();
            }
        });
        return _this;
    }

    (0, _createClass3.default)(AllureReporter, [{
        key: 'getAllure',
        value: function getAllure(cid) {
            if (this.allures[cid]) {
                return this.allures[cid];
            }

            var allure = new _allureJsCommons2.default();
            allure.setOptions({ targetDir: this.options.outputDir || 'allure-results' });
            this.allures[cid] = allure;
            return this.allures[cid];
        }
    }, {
        key: 'isAnyTestRunning',
        value: function isAnyTestRunning(allure) {
            return allure.getCurrentSuite() && allure.getCurrentTest();
        }
    }, {
        key: 'dumpJSON',
        value: function dumpJSON(allure, name, json) {
            allure.addAttachment(name, (0, _stringify2.default)(json, null, '    '), 'application/json');
        }
    }]);
    return AllureReporter;
}(_events2.default.EventEmitter);

exports.default = AllureReporter;
module.exports = exports['default'];