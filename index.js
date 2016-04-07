'use strict';

var parse5 = require('parse5');

var Resource = require('./src/utils/resource');
var ParserAdapter = require('./src/adapters/parser-adapter');
var BrowserAdapter = require('./src/adapters/browser-adapter');
var loadCssFiles = require('./src/style/load-css-files');



/**
 * @param   {Object}    选项 @see ./src/adapters/browser-adapter
 * @param   {Function}  回调函数（可选）
 * @param   {Promise}
 */
function browser(options, callback) {
    callback = callback || function() {};
    return new Promise(function(resolve, reject) {
        var window = browser.sync(options.html, options);
        window.onload = function() {
            resolve(window);
            callback(null, window);
        };
        window.onerror = function(errors) {
            reject(errors);
            callback(errors);
        };
    });
}


/**
 * @param   {String}    页面地址（本地或远程）
 * @param   {Object}    选项（可选）@see ./src/adapters/browser-adapter
 * @param   {Function}  回调函数（可选）
 * @param   {Promise}
 */
browser.open = function(url, options, callback) {
    options = new BrowserAdapter(options);
    options.baseURI = url;
    return (new Resource(options)).get(url).then(function(html) {
        options.html = html;
        return browser(options, callback);
    });
};


/**
 * @param   {String, Buffer}    HTML
 * @param   {Object}    选项（可选）@see ./src/adapters/browser-adapter
 * @param   {Window}
 */
browser.sync = function(html, options) {
    options = new BrowserAdapter(options);
    options.parserAdapter = {
        treeAdapter: new ParserAdapter(options)
    };

    var document = parse5.parse(html, options.parserAdapter);
    var window = document.defaultView;

    Object.defineProperty(window, 'onload', {
        get: function() {
            return this._onload;
        },
        set: function(onload) {
            this._onload = onload;

            if (options.loadCssFile) {
                loadCssFiles(document, new Resource(options)).then(function() {
                    process.nextTick(onload);
                }, function(errors) {
                    process.nextTick(function() {
                        if (typeof window.onerror === 'function') {
                            window.onerror(errors);
                        }
                    });
                    return Promise.reject(errors);
                });
            } else {
                process.nextTick(onload);
            }
        }
    });


    Object.defineProperty(window, 'onerror', {
        get: function() {
            return this._onerror;
        },
        set: function(onerror) {
            this._onerror = onerror;
        }
    });

    return window;
};


browser.BrowserAdapter = BrowserAdapter;


module.exports = browser;