// TODO 超时配置参数
'use strict';

var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var path = require('path');
var zlib = require('zlib');
var VError = require('verror');

var BrowserAdapter = require('../adapters/browser-adapter');



function Resource(adapter) {
    this.adapter = adapter || new BrowserAdapter();
}

Resource.prototype = {

    constructor: Resource,

    /**
     * 加载本地或远程资源
     * @param   {String}    路径
     * @return  {Promise}
     */
    get: function(file) {

        file = this.normalize(file);


        var resource;
        var adapter = this.adapter;
        var resourceCache = adapter.resourceCache();
        var that = this;

        file = adapter.resourceMap(file);

        if (adapter.resourceIgnore(file)) {
            return Promise.resolve('');
        }

        adapter.resourceBeforeLoad(file);

        if (resourceCache[file]) {
            resource = resourceCache[file];
            if (resource) {
                return resource;
            }
        }

        resource = new Promise(function(resolve, reject) {

            if (that.isRemoteFile(file)) {
                that.loadRemoteFile(file, onload);
            } else {
                that.loadLocalFile(file, onload);
            }

            function onload(errors, data) {
                if (errors) {
                    reject(errors);
                } else {
                    resolve(data.toString());
                }
            }

        });


        resource.catch(function(errors) {
            errors = new VError(errors, 'ENOENT, load "%s" failed', file);
            return Promise.reject(errors);
        });


        resourceCache[file] = resource;
        return resource;
    },

    /**
     * 加载本地资源
     * @param   {String}    路径
     * @param  {String}    回调
     */
    loadLocalFile: function(file, callback) {
        fs.readFile(file, 'utf8', callback);
    },


    /**
     * 加载远程资源
     * @param   {String}    路径
     * @param  {String}    回调
     */
    loadRemoteFile: function(file, callback) {
        var location = url.parse(file);
        var protocol = location.protocol === 'http:' ? http : https;

        var request = protocol.request({
                method: 'GET',
                host: location.host,
                hostname: location.hostname,
                path: location.path,
                port: location.port,
                headers: this.adapter.resourceRequestHeaders(file)
            }, function(res) {

                var encoding = res.headers['content-encoding'];
                var type = res.headers['content-type'];
                var errors = null;


                if (!/2\d\d/.test(res.statusCode)) {
                    errors = new Error(res.statusMessage);
                } else if (type.indexOf('text/') !== 0) {
                    errors = new Error('only supports `text/*` resources');
                }


                if (errors) {
                    callback(errors);
                } else {

                    var buffer = new Buffer([]);


                    if (encoding === 'undefined') {
                        res.setEncoding('utf-8');
                    }


                    res.on('data', function(chunk) {
                        buffer = Buffer.concat([buffer, chunk]);
                    });

                    res.on('end', function() {

                        if (encoding === 'gzip') {

                            zlib.unzip(buffer, function(errors, buffer) {
                                if (errors) {
                                    callback(errors);
                                } else {
                                    callback(null, buffer);
                                }
                            });

                        } else if (encoding == 'deflate') {

                            zlib.inflate(buffer, function(errors, decoded) {
                                if (errors) {
                                    callback(errors);
                                } else {
                                    callback(null, decoded);
                                }
                            });

                        } else {
                            callback(null, buffer);
                        }

                    });

                }

            })
            .on('error', callback);

        request.end();

    },

    /**
     * 标准化路径
     * @param   {String}    路径
     * @return  {String}    标准化路径
     */
    normalize: function(src) {

        if (!src) {
            return src;
        }

        if (this.isRemoteFile(src)) {
            // http://font/font?name=xxx#x
            // http://font/font?
            return src.replace(/#.*$/, '').replace(/\?$/, '');
        } else {
            // ../font/font.eot?#font-spider
            src = src.replace(/[#?].*$/g, '');
            return path.normalize(src);
        }
    },


    /**
     * 判断是否为远程 URL
     * @param   {String}     路径
     * @return  {Boolean}
     */
    isRemoteFile: function(src) {
        var RE_SERVER = /^https?\:\/\//i;
        return RE_SERVER.test(src);
    }
};


module.exports = Resource;