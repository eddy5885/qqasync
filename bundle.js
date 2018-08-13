(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (factory());
}(this, (function () { 'use strict';

    function evalCode(str) {
        try {
            var debugJson = {
                type: 'qqasync',
                UA: window.navigator.userAgent,
                referer: document.referrer,
                requestURL: window.location.href,
                nowTime: new Date().getTime(),
            };
            var reportURL = 'http://cgi.vip.qq.com/logger/index?cmd=debug&info=' +
                encodeURIComponent(JSON.stringify(debugJson) + str);
            var img = new Image();
            img.src = reportURL;
        } catch (e) {}
    }

    function fetchAjax(str) {
        try {
            var debugJson = {
                type: 'qqasync',
                UA: window.navigator.userAgent,
                referer: document.referrer,
                requestURL: window.location.href,
                nowTime: new Date().getTime(),
            };
            var reportURL = 'http://cgi.vip.qq.com/logger/index?cmd=debug&info=' +
                encodeURIComponent(JSON.stringify(debugJson) + str);
            var img = new Image();
            img.src = reportURL;
        } catch (e) {}
    }

    var qqasync = {
            version: "1.0.0"
        };
        var data$1 = qqasync.data = {};
        //异步加载的js文件
        data$1.files = [];
        //js文件加载完后执行的回调
        data$1.callback = function() {};
        //是否开启localStorage缓存
        data$1.localcache = false;
        //是否全部来自缓存标识，如果全部来自缓存，同步执行
        var isAllfromCache = true; 
        //入口文件
        qqasync.use = function(configData) { 
            for (var key in configData) {
                var curr = configData[key];
                data$1[key] = curr;
            }
            //哪怕开启了localStorage，只要不支持localStorage，当未开启处理
            if(data$1.localcache && !window.localStorage){
                data$1.localcache = false;
            }
            if (data$1.localcache) {
                if (!data$1.urlKey) {
                    data$1.urlKey = location.host + "_qqasync_mainfest";
                }
                if (!storage.get(data$1.urlKey)) {
                    storage.set(data$1.urlKey, JSON.stringify(data$1.files));
                }
            }
            //并行发请求
            setRequest();
            //如果开启缓存&&有非缓存内容，则可能url有变化（包括修改版本号），重新设置key
            if (data$1.localcache && !isAllfromCache) {
                storage.set(data$1.urlKey, JSON.stringify(data$1.files));
            }
            console && console.log("is All from Cache: " + isAllfromCache);
            if (data$1.localcache && isAllfromCache) {
                //同步执行
                syncexec(); 
            } else {
                //异步执行
                asyncexec(); 
            }

            return global;
        };
        function setRequest() {
            var files = data$1.files;
            var i = 0,len = files.length;
            while (i < len) {
                if (data$1.localcache) {
                    //如果存在key（url存在且版本号未变化）
                    var urlKeyValue = storage.get(data$1.urlKey);
                    //如果key有数据
                    if (urlKeyValue && urlKeyValue.indexOf(files[i]) != -1) {
                        //如果单个url作为key有数据
                        if (storage.get(files[i])) {
                            setJScriptState(files[i], storage.get(files[i]));
                        } else {
                            isAllfromCache = false;
                            fetchAjax(files[i]);
                        }
                    //cache没有数据
                    } else {//debugger;
                        isAllfromCache = false;
                        fetchAjax(files[i]);
                        //url修改参数，清除旧文件
                        var cleanurl = getUrlwithoutPara(files[i]);
                        if(urlKeyValue){
                            var urlKeyValueArr = JSON.parse(urlKeyValue);
                            for(var j in urlKeyValueArr){
                                if(urlKeyValueArr[j].indexOf(cleanurl) ==0){
                                    storage.remove(urlKeyValueArr[j]);
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    isAllfromCache = false;
                    fetchAjax(files[i]);
                }
                i++;
            }
            return true;
        }

        function getUrlwithoutPara(url) {
            var index = url.indexOf("?");
            if(index == -1){
                return url;
            }
            return url.substr(0, url.indexOf("?"));
        }

        function asyncexec() {
            var file = data$1.files.shift();
            var timer = 0;
            var interval = setInterval(function() {
                timer++;
                //如果加载好了，且没有执行则执行，执行完后去下一个js
                //debugger;
                if (data$1['files']['loading'] && data$1['files']['loading'][file]) {
                    var tmpFile = data$1['files']['loading'][file];
                    //文件已下载&&未执行
                    if (tmpFile['loaded'] && !tmpFile['executed']) {
                        evalCode(file, tmpFile['code']);
                        //执行完修改状态
                        tmpFile['executed'] = true;
                        file = data$1.files.shift();
                        //全部执行完，执行回调
                        if (!file) {
                            data$1.callback();
                            clearInterval(interval);
                        }
                    }
                }
                //超时控制，防止中间有js加载失败
                if (timer >= 8000) {
                    clearInterval(interval);
                }
            }, 5);
        }

        //同步按照加载的文件顺序执行
        function syncexec() {
            var file = data$1.files.shift();
            while (file) {
                if (data$1['files']['loading'] && data$1['files']['loading'][file]) {
                    var tmpFile = data$1['files']['loading'][file];
                    //文件已下载&&未执行
                    if (tmpFile['loaded'] && !tmpFile['executed']) {
                        evalCode(file, tmpFile['code']);
                        //执行完修改状态
                        tmpFile['executed'] = true; 
                        file = data$1.files.shift();
                        //全部执行完，执行回调
                        if (!file) {
                            data$1.callback();
                        }
                    }
                }
            }
        }
        
        function setJScriptState(url, responseText) {
            if (!data$1.files.loading) {
               data$1.files.loading = {}; 
            }
            data$1['files']['loading'][url] = {
                loaded: true,
                executed: false,
                code: responseText
            };
        }

})));
